# -*- coding: utf-8 -*-
"""从「玉匣記版本对比」工作簿生成「版本亲疏」分页的数据 kinship-data.js。

用法：python3 build_kinship.py 玉匣記版本对比.xlsx

方法（与工作簿「日期异文」页相同）：
- 只用 INCL 里的版本（已获完整文本）；每个版本取「位置」为正文、有具体月日的条目，
  以「建議規範名＋编码日期类型＋月＋日」为比较单位
- 重合度 = 两本共有单位数 ÷ 两本单位数的并集；另给两个方向的包含比例
- 少数日期：某神（同一日期类型）见于 3 个以上见证、某日期见于该神半数以下的见证者；
  同一本中同类日期超过 3 个者（如逐月下降）不判。同版本（WIT）合为一个见证
- 「共有的少数日期」：两本都作、而多数本子不作的日期
"""
import json
import re
import sys
from collections import defaultdict
from itertools import combinations

import openpyxl

# ---- 设定（随研究改） ----
INCL = [12, 13, 1, 14, 3, 15, 4, 5, 16, 17, 6, 8, 9, 10, 11, 18]   # 版本目录编号：已获完整文本
EXCL = {2: '无逐月神诞表，只有六十甲子日', 7: '两处缺页', 19: '无具体月日的神诞', 20: '只有十王立誓日'}
WIT = {9: 8}   # 1891 与 1882 同版，计为同一个见证
LANE = {1: '道藏本', 14: '道藏本', 15: '宮觀手冊', 12: '日用類書', 13: '日用類書', 3: '單行本', 4: '單行本', 8: '單行本',
        9: '單行本', 5: '通書', 6: '通書', 10: '通書', 11: '通書', 16: '善書', 17: '善書', 18: '未定'}
TENT = {13: '工作簿「文本类型」未填，按书名暂归日用類書', 15: '工作簿「文本类型」未填，按山志所收齋曆暂归宮觀手冊', 18: '书名不明'}
NOTE = {4: '截图解析度有限', 8: '与 1891 本同版', 9: '与 1882 本同版（1891 重印）'}
SHORT = {12: '事林廣記', 13: '萬寶全書', 1: '諸神聖誕日', 14: '朝修吉辰章', 3: '選擇集要', 15: '穹窿山志', 4: '玉匣記廣集', 5: '廣玉匣記',
         16: '修身立命', 17: '正心致福', 6: '新增廣', 8: '萬全(劉)', 9: '萬全(劉)重印', 10: '增廣通書', 11: '增廣(春明)', 18: 'Liste本'}
DIR = [dict(a=8, b=9, st='确定', d='同版重印：1891 年劉誠印据 1882 年原板重印一千部（跋）'),
       dict(a=6, b=8, st='候选', d='1827 本条目有九成见于 1882 本，1882 本另有增补；劉誠印跋称「逐月神佛聖誕未列者細心搜求重加增補」。1827 本只是工作簿中年代最近的同组本子，不一定是劉誠印所据之本'),
       dict(a=14, b=15, st='候选', d='《朝修吉辰章》条目绝大多数见于《穹窿山志》；按年代先后（1607 刊／1444 序 → 康熙初年）')]
BASE = 1   # 计算「条目保留」所用的基准本：1607 道藏本

CN = {'一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10}
MON = {'正': 1, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '十一': 11, '十二': 12,
       '冬': 11, '腊': 12, '臘': 12}
DAYRE = r'(?:初[一二三四五六七八九十]|廿[一二三四五六七八九]?|卅|三十|二十[一二三四五六七八九]?|十[一二三四五六七八九]?|朔|望|晦|元日)'
MN = ['', '正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
DN = '初一 初二 初三 初四 初五 初六 初七 初八 初九 初十 十一 十二 十三 十四 十五 十六 十七 十八 十九 二十 廿一 廿二 廿三 廿四 廿五 廿六 廿七 廿八 廿九 三十'.split()


def dnum(s):
    s = s.replace('日', '')
    if s in ('朔', '元', '初日'):
        return 1
    if s == '望':
        return 15
    if s in ('晦', '卅', '三十'):
        return 30
    if s.startswith('初'):
        return 10 if s[1:] == '十' else CN.get(s[1:])
    if s.startswith('廿'):
        return 20 + CN.get(s[1:], 0)
    if s.startswith('二十'):
        return 20 + CN.get(s[2:], 0)
    if s.startswith('十'):
        return 10 + CN.get(s[1:], 0)
    return CN.get(s)


def days_of(mo, dy):
    """「月」「日」两栏 → (月, {日})；不是具体月日的返回 None。"""
    m = re.fullmatch(r'(十一|十二|正|冬|腊|臘|[一二三四五六七八九十])月', mo or '')
    if not m or not dy:
        return None
    ds = set()
    for a, b in re.findall('(' + DAYRE + r')日?至(' + DAYRE + ')', dy):
        x, y = dnum(a), dnum(b)
        if x and y:
            ds |= set(range(x, y + 1))
    small = re.sub(r'（月小.*?）', '', dy)
    for x in re.findall(DAYRE, small):
        if dnum(x):
            ds.add(dnum(x))
    for x in re.findall(r'(?<![初十廿])([一二三四五六七八九])日', small):
        ds.add(CN[x])
    return (MON[m.group(1)], ds) if ds else None


def main(path):
    wb = openpyxl.load_workbook(path, read_only=True)
    vers = {r[0]: r[1] for r in wb['版本目录'].iter_rows(min_row=2, values_only=True) if r[1]}
    E = defaultdict(lambda: defaultdict(set))   # (规范名, 类型) → 版本 → {(月, 日)}
    for no in INCL:
        for r in wb[vers[no]].iter_rows(min_row=2, values_only=True):
            if not r[15] or not r[16] or r[9] not in (None, '正文'):
                continue
            md = days_of(r[1], r[2])
            if md:
                for d in md[1]:
                    E[(r[15], r[6] or '其他')][no].add((md[0], d))
    S = {v: set() for v in INCL}
    for (k, ty), byv in E.items():
        for v, ds in byv.items():
            S[v] |= {(k, ty, m, d) for m, d in ds}
    wit = lambda v: WIT.get(v, v)
    MINOR = defaultdict(set)
    for (k, ty), byv in E.items():
        ws = {wit(v) for v in byv}
        if len(ws) < 3 or max(len(ds) for ds in byv.values()) > 3:
            continue
        sup = defaultdict(set)
        for v, ds in byv.items():
            for md in ds:
                sup[md].add(wit(v))
        for v, ds in byv.items():
            for md in ds:
                if len(sup[md]) / len(ws) < 0.5:
                    MINOR[v].add((k, ty, md))
    pairs = []
    for a, b in combinations(INCL, 2):
        i, u = len(S[a] & S[b]), len(S[a] | S[b])
        if not u:
            continue
        sh = sorted(MINOR[a] & MINOR[b])
        pairs.append(dict(a=a, b=b, j=round(i / u, 3), ca=round(i / len(S[a]), 3) if S[a] else 0,
                          cb=round(i / len(S[b]), 3) if S[b] else 0, sv=len(sh),
                          ex=['%s（%s）%s%s' % (k, t, MN[m], DN[d - 1]) for k, t, (m, d) in sh[:8]]))
    nodes = []
    for v in INCL:
        seg = vers[v].split('_')
        y = re.match(r'(\d{4})', seg[0])
        nodes.append(dict(no=v, name=seg[0] + ' ' + seg[2], yr=seg[0], year=int(y.group(1)) if y else None, sh=SHORT.get(v, seg[2]),
                          lane=LANE.get(v, '未定'), tent=TENT.get(v, ''), note=NOTE.get(v, ''), n=len(S[v]), nmin=len(MINOR[v])))
    ret = {}
    for p in pairs:
        if BASE in (p['a'], p['b']):
            ret[p['b'] if p['a'] == BASE else p['a']] = p['ca'] if p['a'] == BASE else p['cb']
    excl = ['%s（编号%d）：%s' % (vers[k].split('_')[0] + ' ' + vers[k].split('_')[2], k, why) for k, why in EXCL.items() if k in vers]
    out = dict(source=path.split('/')[-1], nodes=nodes, pairs=pairs, dir=DIR, ret=ret, base=BASE, excl=excl)
    with open('kinship-data.js', 'w', encoding='utf-8') as f:
        f.write('// 由 build_kinship.py 自动生成，请勿手改\nwindow.ZHAI_KIN = ')
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    print('版本 %d、版本对 %d；少数日期 %d 处' % (len(nodes), len(pairs), sum(len(x) for x in MINOR.values())))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '玉匣記版本对比.xlsx')
