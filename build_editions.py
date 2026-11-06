# -*- coding: utf-8 -*-
"""从「玉匣記及其他斋历：版本横向对比」工作簿生成 editions-data.js（网站「诸本对照」分页用）。

用法：python3 build_editions.py 版本对比.xlsx [-o editions-data.js]

- 读「版本目录」登记的每个版本页（栏目：序号 | 月 | 日 | 原文 | 神明（照录原文）| 神明认定备注 | 编码日期类型 |
  原文所标 | 持斋/戒/修持要求 | 位置 | 页码/出处 | 总表核对 | 原表编号 | … | 建議規範名（對比用））
- 跨版本对齐用工作簿自己的「建議規範名（對比用）」，不与持斋研究数据库的 G 编号合并
- 不输出「神明认定备注」「总表核对」（内部批注）
- 资料来源含「識典／识典」的版本（授权数据库）不输出原文，只给日期、神名、编码
- 神明总表的「斋库神明ID（ZS）」（已核）或「斋库神明ID（候选·待核）」把规范名接到持斋研究数据库的神明 ID
  （2026-10-29 起由 G### 改为 ZS###，号码不变；旧栏名「G编号」「G编号（候选·待核）」仍可读）；
  「性質」「神明编码（G####）」（研究者自己的神明编码，与斋库神明 ID 是两套）一并输出
"""
import argparse
import json
import re

import openpyxl

import pinyin_util

MONTHS = {'正': 1, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
          '十一': 11, '十二': 12, '冬': 11, '臘': 12, '腊': 12}
DIG = {'一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9}


def clean(v):
    if isinstance(v, float) and v.is_integer():   # Google 表格导出的整数带 .0
        v = int(v)
    return '' if v is None else str(v).strip()


def month_no(s):
    m = re.match(r'(閏|闰)?(十一|十二|[正一二三四五六七八九十冬臘腊])月', s)
    return MONTHS[m.group(2)] if m else None


def day_no(s):
    s = s.strip()
    if s in ('元日', '朔', '朔日'):
        return 1
    if s in ('望', '望日'):
        return 15
    if s in ('晦', '晦日'):
        return 30
    m = re.match(r'(初十|初[一二三四五六七八九]|二十[一二三四五六七八九]?|廿[一二三四五六七八九]?|三十|卅|十[一二三四五六七八九]?|[一二三四五六七八九])', s)
    if not m:
        return None
    t = m.group(1)
    if t[0] == '初':
        return 10 if t[1] == '十' else DIG[t[1]]
    if t in ('三十', '卅'):
        return 30
    if t.startswith('二十'):
        return 20 + DIG.get(t[2:], 0)
    if t[0] == '廿':
        return 20 + DIG.get(t[1:], 0)
    if t[0] == '十':
        return 10 + DIG.get(t[1:], 0)
    return DIG[t]


# 專門單獨齋期：照常作为版本进各页，另在环形历选单末尾按「一种斋期一盘」列出（build_rings）。
# 一页默认一盘；汇集页有「文獻」栏，每种文献一盘，编号 = 版本目录编号 ×10 + 出现次序（新文献加在表末即可，编号不变）。
# 一页里有几种斋期又没有「文獻」栏的，在这里写明分界（从哪条条目ID起算下一盘）
SOLO_SPLIT = {'24': [('增訂敬信錄·司命竈君日期', ''), ('增訂敬信錄·白衣齋期', '24-0064')]}


def book_year(pub, default=''):
    m = re.search(r'(\d{4}) 年', pub) or re.search(r'（(\d{4})）', pub) or re.search(r'(\d{4})', pub)
    return m.group(1) if m else default


def build_rings(versions, entries):
    """返回 (环形历用的盘, 没有具体日期、画不进去的文献)。"""
    rings, undated = [], []

    def ring(v, no, when, short, es):
        rs = []
        for e in es:
            d = day_no(e['dy']) if e['mo'].startswith('每月') else None
            rs += [dict(e, m=m, d=d) for m in range(1, 13)] if d else [dict(e)]   # 「每月初六」排进十二个月
        if not any(e['m'] and e['d'] for e in rs):
            undated.append(short)
            return
        rings.append({'no': str(no), 'sheet': v['sheet'], 'when': when, 'short': short, 'pub': '', 'noText': False, 'solo': True,
                      'second': v['when'] == '彙集', 'src': v['src'], 'n': len(es), 'es': rs})

    for v in versions:
        if not v['solo']:
            continue
        es = [e for e in entries if e['v'] == v['i']]
        books = {}
        for e in es:
            b = e['pg'].split('｜')
            if len(b) == 3:              # 文獻｜出处｜出版信息
                books.setdefault(b[0], []).append(e)
        if books:
            for i, (b, xs) in enumerate(books.items()):
                ring(v, int(v['no']) * 10 + i + 1, book_year(xs[0]['pg'].split('｜')[2], v['when']), b, xs)
        elif v['no'] in SOLO_SPLIT:
            cuts = SOLO_SPLIT[v['no']]
            for i, (name, start) in enumerate(cuts):
                end = cuts[i + 1][1] if i + 1 < len(cuts) else '~'
                ring(v, int(v['no']) * 10 + i + 1, v['when'], name, [e for e in es if start <= e['id'] < end])
        else:
            ring(v, int(v['no']) * 10 + 1, v['when'], v['short'], es)
    rings.sort(key=lambda r: r['when'])
    return rings, undated


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('xlsx')
    ap.add_argument('-o', '--out', default='editions-data.js')
    a = ap.parse_args()
    wb = openpyxl.load_workbook(a.xlsx, data_only=True)

    # 神明总表：规范名 → [斋库神明 ID（ZS###，多个用 / 或 + 连接）, 是否待核, 性質, 神明编码（G####）]
    norms = {}
    tot = wb['神明总表']
    head = [clean(h) for h in next(tot.iter_rows(max_row=1, values_only=True))]
    hc = {h: i for i, h in enumerate(head)}
    for row in tot.iter_rows(min_row=2, values_only=True):
        k = clean(row[0])
        if not k:
            continue
        pick = lambda *names: next((clean(row[hc[n]]) for n in names if n in hc), '')
        conf = pick('斋库神明ID（ZS）', 'G编号')
        cand = pick('斋库神明ID（候选·待核）', 'G编号（候选·待核）')
        nat = pick('性質')
        gcode = pick('神明编码（G####）')
        if conf or cand or nat or gcode:
            norms[k] = [conf or cand, not conf and bool(cand), nat, gcode]

    versions, entries, cmap = [], [], {}
    for r in wb['版本目录'].iter_rows(min_row=2, values_only=True):
        sheet = clean(r[1])
        if not sheet or sheet not in wb.sheetnames:
            continue
        parts = sheet.split('_')
        yr = re.match(r'(\d{4})', parts[0])
        v = {
            'i': len(versions), 'sheet': sheet, 'when': parts[0], 'era': parts[1] if len(parts) > 1 else '',
            'short': parts[2] if len(parts) > 2 else sheet, 'pub': parts[3] if len(parts) > 3 else '',
            'title': clean(r[3]), 'type': clean(r[4]), 'date': clean(r[5]), 'src': clean(r[6]),
            'year': int(yr.group(1)) if yr else None, 'yuxia': '玉匣記' in sheet,
            'no': clean(r[0]), 'noText': bool(re.search(r'[識识]典', clean(r[6]))),
            'solo': '專門單獨齋期' in clean(r[4]),   # 專門單獨齋期：环形历里另列（见 build_rings）
        }
        if sheet.startswith('專門單獨齋期'):          # 汇集页不是单一版本，页名没有年代段
            v.update(when='彙集', era='據 Goossaert 2024', short='專門單獨齋期彙集', pub='')
        ws = wb[sheet]
        rows = list(ws.iter_rows(values_only=True))
        col = {clean(h): i for i, h in enumerate(rows[0])}
        get = lambda row, h: clean(row[col[h]]) if h in col and col[h] < len(row) else ''
        n = 0
        for row in rows[1:]:
            text, god = get(row, '原文'), get(row, '神明（照录原文）')
            if not (text or god):
                continue
            mo, dy = get(row, '月'), get(row, '日')
            mm = month_no(mo)
            rng = ''
            if mm and re.search(r'至', dy):
                # 「初八日至十五日」「初一日至初九日；初十日」→「1/8-1/15」（环形历画成细条）
                segs = []
                for seg in re.split(r'[；;]', dy):
                    ds = [day_no(x) for x in seg.split('至')]
                    segs.append('-'.join('%d/%d' % (mm, x) for x in ds if x))
                rng = '；'.join(x for x in segs if x)
            eid = get(row, '条目ID')
            code = get(row, '原表编号')
            if re.match(r'^C\d{4}$', code) and eid:
                cmap[code] = eid
            entries.append({
                'id': eid, 'r': rng,
                'v': v['i'], 'n': get(row, '序号'), 'mo': mo, 'dy': dy, 'm': month_no(mo), 'd': day_no(dy) if month_no(mo) else None,
                't': '' if v['noText'] else text, 'g': god, 'k': get(row, '建議規範名（對比用）') or god, 'c': get(row, '编码日期类型'),
                'l': get(row, '原文所标'), 'q': get(row, '持斋/戒/修持要求'), 'p': get(row, '位置'),
                'pg': '｜'.join(x for x in (get(row, '文獻'), get(row, '页码/出处'),
                                           next((get(row, h) for h in col if h.startswith('出版信息')), '')) if x),
                'code': get(row, '原表编号'),
            })
            n += 1
        v['n'] = n
        versions.append(v)

    solo, solo_undated = build_rings(versions, entries)

    names = [(e['k'], 'name') for e in entries if e['k']] + [(e['g'], 'name') for e in entries if e['g']]
    py = pinyin_util.build_map(names)
    py_title = pinyin_util.build_map([(v['short'], 'title') for v in versions])

    with open(a.out, 'w', encoding='utf-8') as f:
        f.write('// 由 build_editions.py 自动生成，请勿手改\nwindow.ZHAI_ED = ')
        json.dump({'source': a.xlsx.split('/')[-1], 'versions': versions, 'entries': entries, 'solo': solo,
                   'soloUndated': solo_undated, 'norms': norms, 'cmap': cmap,
                   'py': py, 'pyTitle': py_title},
                  f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    undated = sum(1 for e in entries if not e['m'])
    print('專門單獨齋期 %d 盘（环形历）；无具体日期 %s' % (len(solo), '、'.join(solo_undated)))
    print('版本 %d、条目 %d（无法按月日排的 %d 条）、规范名 %d；接到斋库神明 ID 的规范名 %d（待核 %d）；C 编号对照 %d' % (
        len(versions), len(entries), undated, len({e['k'] for e in entries if e['k']}),
        sum(1 for v in norms.values() if v[0]), sum(1 for v in norms.values() if v[1]), len(cmap)))


if __name__ == '__main__':
    main()
