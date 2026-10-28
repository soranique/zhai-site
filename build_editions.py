# -*- coding: utf-8 -*-
"""从「玉匣記及其他斋历：版本横向对比」工作簿生成 editions-data.js（网站「诸本对照」分页用）。

用法：python3 build_editions.py 版本对比.xlsx [-o editions-data.js]

- 读「版本目录」登记的每个版本页（栏目：序号 | 月 | 日 | 原文 | 神明（照录原文）| 神明认定备注 | 编码日期类型 |
  原文所标 | 持斋/戒/修持要求 | 位置 | 页码/出处 | 总表核对 | 原表编号 | … | 建議規範名（對比用））
- 跨版本对齐用工作簿自己的「建議規範名（對比用）」，不与持斋研究数据库的 G 编号合并
- 不输出「神明认定备注」「总表核对」（内部批注）
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

    versions, entries = [], []
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
            entries.append({
                'v': v['i'], 'n': get(row, '序号'), 'mo': mo, 'dy': dy, 'm': month_no(mo), 'd': day_no(dy) if month_no(mo) else None,
                't': text, 'g': god, 'k': get(row, '建議規範名（對比用）') or god, 'c': get(row, '编码日期类型'),
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
        json.dump({'source': a.xlsx.split('/')[-1], 'versions': versions, 'entries': entries, 'py': py, 'pyTitle': py_title},
                  f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    undated = sum(1 for e in entries if not e['m'])
    print('版本 %d、条目 %d（无法按月日排的 %d 条）、规范名 %d' % (
        len(versions), len(entries), undated, len({e['k'] for e in entries if e['k']})))


if __name__ == '__main__':
    main()
