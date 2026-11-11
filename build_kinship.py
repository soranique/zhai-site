# -*- coding: utf-8 -*-
"""从「玉匣記版本对比」工作簿生成「版本亲疏」分页的数据 kinship-data.js。

用法：python3 build_kinship.py 玉匣記版本对比.xlsx

方法（与工作簿「日期异文」页相同）：
- 没有建議規範名的条目（天臘、月朔、九毒日等无神名日）不参与比较（INCLUDE_OTHER = False）；
  设为 True 时一律当作「其他」，按「其他＋类型＋月日」比较重合度，判定少数日期、通行日期时仍不计
- 只用 INCL 里的版本（已获完整文本）；每个版本取「位置」为正文、有具体月日的条目，
  以「建議規範名＋编码日期类型＋月＋日」为比较单位；兼标两类的条目（「下降、巡察」）在两类中各计一次
- 重合度 = 两本共有单位数 ÷ 两本单位数的并集；另给两个方向的包含比例
- 少数日期：某神（同一日期类型）见于 3 个以上见证、某日期见于该神半数以下的见证者；
  同一本中同类日期超过 3 个者（如逐月下降）不判。同版本（WIT）合为一个见证
- 「共有的少数日期」：两本都作、而多数本子不作的日期
- 另输出 minor（少数日期的条目ID）与 common（各神各日期类型的通行日期），「版本目录和内容对照」据此标红
- 重合度把「初一至初九」拆成逐日；判定少数日期、通行日期时与工作簿「日期异文」完全一致，只算写成单一月日的条目
  （strict_day；区间、连写日期及夏至、冬至不计），两者口径不同，所以 E 与 J 分开存
"""
import json
import re
import sys
from collections import defaultdict
from itertools import combinations

import openpyxl

# ---- 设定（随研究改） ----
SOURCE_NAME = '玉匣記版本對比'   # 网站显示的数据来源名称，与工作簿文件名无关
INCL = [12, 13, 1, 14, 3, 15, 4, 16, 17, 5, 22, 20, 6, 8, 9, 10, 21, 23, 11]   # 版本目录编号：已获完整文本，按年代（18 Liste本 年代版本未定，2026-11-11 起暂不计入，定了以后加回）
EXCL = {2: '无逐月神诞表，只有六十甲子日', 7: '两处缺页', 18: '年代、版本未定，暂不计入（保留在工作簿中，定了以后再用）', 19: '无具体月日的神诞', 24: '只有灶君、白衣两种专门单独斋期',
        25: '专门单独斋期汇集，据 Goossaert 2024 转述，未见原书'}
SKIP = {20: {'C0130', 'C0131', 'C0132', 'C0133', 'C0134', 'C0135', 'C0136'}}   # 《玉歷鈔傳警世》只取诸圣诞辰表，不取十王立誓日
WIT = {9: 8}   # 1891 与 1882 同版，计为同一个见证
LANE = {1: '道藏本', 14: '道藏本', 15: '宮觀手冊', 12: '日用類書', 13: '日用類書', 3: '單行本', 4: '單行本', 8: '單行本',
        9: '單行本', 5: '通書', 6: '通書', 10: '通書', 11: '通書', 16: '善書', 17: '善書', 22: '善書', 20: '善書', 21: '善書',
        23: '宮觀手冊', 18: '未定'}
TENT = {13: '工作簿「文本类型」未填，按书名暂归日用類書', 15: '工作簿「文本类型」未填，按山志所收齋曆暂归宮觀手冊', 23: '工作簿「文本类型」为寺院課誦本，暂归宮觀手冊', 18: '书名不明'}
NOTE = {4: '截图解析度有限', 8: '与 1891 本同版', 9: '与 1882 本同版（1891 重印）'}
SHORT = {12: '事林廣記', 13: '萬寶全書', 1: '諸神聖誕日', 14: '朝修吉辰章', 3: '選擇集要', 15: '穹窿山志', 4: '玉匣記廣集', 5: '廣玉匣記',
         16: '修身立命', 17: '正心致福', 6: '新增廣', 8: '萬全(劉)', 9: '萬全(劉)重印', 10: '增廣通書', 11: '增廣(春明)', 18: 'Liste本',
         22: '聖經彙纂', 20: '玉歷鈔傳', 21: '家庭寶筏', 23: '禪門日誦'}
DIR = [dict(a=8, b=9, st='确定', d='同版重印：1891 年劉誠印据 1882 年原板重印一千部（跋）'),
       dict(a=6, b=8, st='候选', d='1827 本条目有九成见于 1882 本，1882 本另有增补；劉誠印跋称「逐月神佛聖誕未列者細心搜求重加增補」。1827 本只是工作簿中年代最近的同组本子，不一定是劉誠印所据之本'),
       dict(a=14, b=15, st='候选', d='《朝修吉辰章》条目绝大多数见于《穹窿山志》；按年代先后（1607 刊／1444 序 → 康熙初年）')]
BASE = 1   # 计算「条目保留」所用的基准本：1607 道藏本
INCLUDE_OTHER = False   # 没有建議規範名的条目（无神名日）是否参与比较：False＝排除（2026-11-10 研究者决定）；True＝一律当作 OTHER_NAME
OTHER_NAME = '其他'

CN = {'一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10}
MON = {'正': 1, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '十一': 11, '十二': 12,
       '冬': 11, '腊': 12, '臘': 12}
DAYRE = r'(?:初日|初[一二三四五六七八九十]|廿[一二三四五六七八九]?|卅|三十|二十[一二三四五六七八九]?|十[一二三四五六七八九]?|朔|望|晦|元日)'
MN = ['', '正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
DN = '初一 初二 初三 初四 初五 初六 初七 初八 初九 初十 十一 十二 十三 十四 十五 十六 十七 十八 十九 二十 廿一 廿二 廿三 廿四 廿五 廿六 廿七 廿八 廿九 三十'.split()


def dnum(s):
    s = s.replace('日', '')
    if s in ('朔', '元', '初'):
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


def strict_day(mo, dy):
    """与「日期异文」相同的取法：只认单一具体月日，返回 (月, 日)，否则 None。"""
    mo, dy = (mo or '').strip(), (dy or '').strip().replace('元日', '初一日').replace('初日', '初一日')
    if not re.fullmatch(r'(正|二|三|四|五|六|七|八|九|十|十一|十二)月', mo):
        return None
    if not re.fullmatch(r'[初十廿二三]?[一二三四五六七八九十廿]+日?', dy):
        return None
    x = dy.rstrip('日')
    d = dnum(x) if x != '二十' else 20
    return (MON[mo[:-1]], d) if d else None


def main(path):
    wb = openpyxl.load_workbook(path, read_only=True)
    vers = {r[0]: r[1] for r in wb['版本目录'].iter_rows(min_row=2, values_only=True) if r[1]}
    E = defaultdict(lambda: defaultdict(set))   # (规范名, 类型) → 版本 → {(月, 日)}
    J = defaultdict(lambda: defaultdict(set))   # 同上，但只含单一月日（判定通行、少数日期用，与「日期异文」同）
    EID = defaultdict(list)                     # (规范名, 类型, 版本, 月, 日) → [条目ID]
    OMIT = []                                   # 条目ID：不计入比较的条目（在 SKIP 里，或没有建議規範名而 INCLUDE_OTHER 为 False）
    OTHER = []                                  # 条目ID：没有建議規範名、比较时当作「其他」的条目
    for no in INCL:
        for r in wb[vers[no]].iter_rows(min_row=2, values_only=True):
            r = tuple(r) + (None,) * (20 - len(r))   # 只读模式下行尾空格可能被省略
            if r[16] and r[9] in (None, '正文') and r[12] in SKIP.get(no, ()):
                OMIT.append(r[16])
            if not r[16] or r[9] not in (None, '正文'):
                continue
            if r[12] in SKIP.get(no, ()):
                continue
            if not r[15]:   # 没有建議規範名的条目（天臘、月朔、九毒日等无神名日）
                if not INCLUDE_OTHER:
                    OMIT.append(r[16])
                    continue
                OTHER.append(r[16])
            name = r[15] or OTHER_NAME
            tys = [t for t in (r[6] or '其他').split('、') if t]   # 兼标两类（如「下降、巡察」）的条目在两类中各计一次
            md = days_of(r[1], r[2])
            sd = strict_day(r[1], r[2])
            for ty in tys:
                if md:
                    for d in md[1]:
                        E[(name, ty)][no].add((md[0], d))
                if sd and r[15]:   # 少数日期、通行日期只看有规范名的条目，与「日期异文」相同
                    J[(r[15], ty)][no].add(sd)
                    EID[(r[15], ty, no) + sd].append(r[16])
    S = {v: set() for v in INCL}
    for (k, ty), byv in E.items():
        for v, ds in byv.items():
            S[v] |= {(k, ty, m, d) for m, d in ds}
    wit = lambda v: WIT.get(v, v)
    MINOR = defaultdict(set)
    minor_e = {}      # 条目ID → [异文类型, 少数/独有, 持此日期的见证数, 该神见证数, 通行日期]
    common = {}       # 规范名 → {类型: '通行日期（见证数/总数）' 或 '多日期神' 或 '见证不足'}
    for (k, ty), byv in J.items():
        ws = {wit(v) for v in byv}
        if len(ws) < 3:
            common.setdefault(k, {})[ty] = '见证少于 3 个，不判'
            continue
        if max(len(ds) for ds in byv.values()) > 3:
            common.setdefault(k, {})[ty] = '多日期神，不判'
            continue
        sup = defaultdict(set)
        for v, ds in byv.items():
            for md in ds:
                sup[md].add(wit(v))
        com = sorted((md for md in sup if len(sup[md]) / len(ws) >= 0.5), key=lambda x: (-len(sup[x]), x))
        ctext = '、'.join('%s%s（%d/%d）' % (MN[m], DN[d - 1], len(sup[(m, d)]), len(ws)) for m, d in com)
        common.setdefault(k, {})[ty] = ctext or '无通行日期'
        cm = {m for m, _ in com}
        for v, ds in byv.items():
            for md in ds:
                if len(sup[md]) / len(ws) < 0.5:
                    MINOR[v].add((k, ty, md))
                    for eid in EID[(k, ty, v, md[0], md[1])]:
                        minor_e[eid] = [('同月异日' if md[0] in cm else '异月') if com else '无通行日期',
                                        '独有' if len(sup[md]) == 1 else '少数', len(sup[md]), len(ws), ctext]
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
    excl = ['%s（编号%d）：%s' % (' '.join((vers[k].split('_') + [''])[i] for i in (0, 2)).strip(), k, why) for k, why in EXCL.items() if k in vers]
    out = dict(source=SOURCE_NAME, omit=OMIT, other=OTHER, otherName=OTHER_NAME, includeOther=INCLUDE_OTHER, nodes=nodes, pairs=pairs, dir=DIR, ret=ret, base=BASE, excl=excl,
               incl=INCL, minor=minor_e, common=common)
    with open('kinship-data.js', 'w', encoding='utf-8') as f:
        f.write('// 由 build_kinship.py 自动生成，请勿手改\nwindow.ZHAI_KIN = ')
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    print('版本 %d、版本对 %d；少数日期 %d 处（条目 %d 条）' % (len(nodes), len(pairs), sum(len(x) for x in MINOR.values()), len(minor_e)))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '玉匣記版本对比.xlsx')
