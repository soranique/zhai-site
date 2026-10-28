# -*- coding: utf-8 -*-
"""从「玉匣記及其他斋历：版本横向对比」工作簿生成 editions-data.js（网站「诸本对照」分页用）。

用法：python3 build_editions.py 版本对比.xlsx [-o editions-data.js]

- 读「版本目录」登记的每个版本页（栏目：序号 | 月 | 日 | 原文 | 神明（照录原文）| 神明认定备注 | 编码日期类型 |
  原文所标 | 持斋/戒/修持要求 | 位置 | 页码/出处 | 总表核对 | 原表编号 | … | 建議規範名（對比用））
- 跨版本对齐用工作簿自己的「建議規範名（對比用）」，不与持斋研究数据库的 G 编号合并
- 不输出「神明认定备注」「总表核对」（内部批注）
- 资料来源含「識典／识典」的版本（授权数据库）不输出原文，只给日期、神名、编码
- 神明总表的「G编号」（已核）或「G编号（候选·待核）」把规范名接到持斋研究数据库的 G 编号；
  「性質」一并输出（目前网站未用）
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('xlsx')
    ap.add_argument('-o', '--out', default='editions-data.js')
    a = ap.parse_args()
    wb = openpyxl.load_workbook(a.xlsx, data_only=True)

    # 神明总表：规范名 → [G 编号, 是否待核, 性質]
    norms = {}
    tot = wb['神明总表']
    head = [clean(h) for h in next(tot.iter_rows(max_row=1, values_only=True))]
    hc = {h: i for i, h in enumerate(head)}
    for row in tot.iter_rows(min_row=2, values_only=True):
        k = clean(row[0])
        if not k:
            continue
        conf = clean(row[hc['G编号']]) if 'G编号' in hc else ''
        cand = clean(row[hc['G编号（候选·待核）']]) if 'G编号（候选·待核）' in hc else ''
        nat = clean(row[hc['性質']]) if '性質' in hc else ''
        if conf or cand or nat:
            norms[k] = [conf or cand, not conf and bool(cand), nat]

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
        }
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
                'pg': get(row, '页码/出处'), 'code': get(row, '原表编号'),
            })
            n += 1
        v['n'] = n
        versions.append(v)

    names = [(e['k'], 'name') for e in entries if e['k']] + [(e['g'], 'name') for e in entries if e['g']]
    py = pinyin_util.build_map(names)
    py_title = pinyin_util.build_map([(v['short'], 'title') for v in versions])

    with open(a.out, 'w', encoding='utf-8') as f:
        f.write('// 由 build_editions.py 自动生成，请勿手改\nwindow.ZHAI_ED = ')
        json.dump({'source': a.xlsx.split('/')[-1], 'versions': versions, 'entries': entries, 'norms': norms, 'cmap': cmap,
                   'py': py, 'pyTitle': py_title},
                  f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    undated = sum(1 for e in entries if not e['m'])
    print('版本 %d、条目 %d（无法按月日排的 %d 条）、规范名 %d；接到 G 编号的规范名 %d（待核 %d）；C 编号对照 %d' % (
        len(versions), len(entries), undated, len({e['k'] for e in entries if e['k']}),
        sum(1 for v in norms.values() if v[0]), sum(1 for v in norms.values() if v[1]), len(cmap)))


if __name__ == '__main__':
    main()
