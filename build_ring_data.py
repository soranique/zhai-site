# -*- coding: utf-8 -*-
"""从环形历的 Excel 源表生成 ring-data.js。

用法一（环形历源表）：
  python3 build_ring_data.py ring_source.xlsx [--edition "版本名"] [--no-notes] [-o ring-data.js]
  源表格式（第一个工作表，第一行为表头）：
    標號 | 時間 | 名稱 | 性質 | 出處 | 附錄
    - 標號：如 M1D3G0542；后缀 A/B/D/P/S/L/H 见 ring-data.js 的 meta.suffix
    - 時間：Excel 日期（只取月、日，年份无意义），或「1/8-1/15」这类跨日文字
    - 性質：T B C L N O ?，可用 & 组合（如 L&T）

用法二（「玉匣記版本对比」工作簿中的一个版本页）：
  python3 build_ring_data.py 版本对比.xlsx --sheet "页名" --nature-from ring_source.xlsx \\
      [--edition "版本名"] [--no-notes]
  版本页栏目：序号 | 月 | 日 | 原文 | 神明（照录原文）| 神明认定备注 | … | 页码/出处 | … | 原表编号 …
    - 「页码/出处」形如「原表第2行｜原表出處：玉匣記」，取行号和出处
    - 「神明认定备注」中以「原表附錄：」开头的才作附錄；其余批注不输出
    - 版本页没有「性質」，按原表行号从 --nature-from 指定的源表补上（同时核对標號一致）

--no-notes：附錄一律清空（公开版用）。
"""
import argparse
import datetime
import json
import re

import openpyxl

import pinyin_util


def clean(v):
    return '' if v is None else str(v).strip()


MONTHS = {'正': 1, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8,
          '九': 9, '十': 10, '十一': 11, '十二': 12, '冬': 11, '臘': 12, '腊': 12}
DIGITS = {'一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9}


def cn_month(s):
    m = re.match(r'(十一|十二|[正一二三四五六七八九十冬臘腊])月', s)
    return MONTHS[m.group(1)] if m else None


def cn_day(s):
    """「初八日」「二十九日」「廿四」「三十日」→ 数字；取第一个日子。"""
    m = re.match(r'(初[一二三四五六七八九十]|二十[一二三四五六七八九]?|廿[一二三四五六七八九]?|'
                 r'三十|卅|十[一二三四五六七八九]?|[一二三四五六七八九])', s)
    if not m:
        return None
    t = m.group(1)
    if t.startswith('初'):
        return 10 if t[1] == '十' else DIGITS[t[1]]
    if t in ('三十', '卅'):
        return 30
    if t.startswith('二十') or t.startswith('廿'):
        rest = t[2:] if t.startswith('二十') else t[1:]
        return 20 + (DIGITS[rest] if rest else 0)
    if t.startswith('十'):
        return 10 + (DIGITS[t[1]] if len(t) > 1 else 0)
    return DIGITS[t]


def code_parts(code):
    g = re.search(r'G+(\d{4})([A-Z]?)', code)
    return (g.group(1), g.group(2)) if g else ('', '')


def read_ring_source(path):
    ws = openpyxl.load_workbook(path, data_only=True).worksheets[0]
    entries, skipped = [], []
    for n, r in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        code, t, name, nat, src, note = (list(r) + [None] * 6)[:6]
        name = clean(name)
        if not name:
            continue
        rng = ''
        if isinstance(t, (datetime.datetime, datetime.date)):
            m, d = t.month, t.day
        else:
            s = clean(t)
            mm = re.match(r'(\d{1,2})/(\d{1,2})', s)
            if not mm:
                skipped.append((n, name, s))
                continue
            m, d, rng = int(mm.group(1)), int(mm.group(2)), s
        code = clean(code)
        if code in ('?', '？'):
            code = ''
        god, suf = code_parts(code)
        nat = clean(nat).replace('？', '?')
        entries.append({
            'm': m, 'd': d, 'range': rng, 'name': name,
            'nat': nat or '?', 'src': clean(src), 'note': clean(note),
            'code': code, 'god': god, 'suf': suf, 'row': n,
        })
    return entries, skipped


def read_version_sheet(path, sheet, nature_path):
    ws = openpyxl.load_workbook(path, data_only=True)[sheet]
    rows = list(ws.iter_rows(values_only=True))
    head = [clean(h) for h in rows[0]]
    col = {h: i for i, h in enumerate(head)}
    for need in ('月', '日', '原文', '神明认定备注', '页码/出处', '原表编号'):
        if need not in col:
            raise SystemExit('版本页缺少栏目「%s」，现有栏目：%s' % (need, '、'.join(h for h in head if h)))

    nature = {}
    if nature_path:
        for e in read_ring_source(nature_path)[0]:
            nature[e['row']] = (e['code'], e['nat'])

    entries, skipped, mismatch = [], [], []
    for r in rows[1:]:
        get = lambda h: clean(r[col[h]]) if col[h] < len(r) else ''
        name = get('原文')
        if not name:
            continue
        mo, dy = get('月'), get('日')
        m, d = cn_month(mo), cn_day(dy)
        where = get('页码/出处')
        rown = re.search(r'原表第(\d+)行', where)
        rown = int(rown.group(1)) if rown else None
        if not m or not d:
            skipped.append((rown, name, mo + dy))
            continue
        rng = ''
        if re.search(r'至|；|;', dy):
            # 「初一日至初九日；初十日」→「9/1-9/9；9/10」（与环形历源表的写法一致，ring.js 按此画细条）
            segs = []
            for seg in re.split(r'[；;]', dy):
                ds = [cn_day(x.strip()) for x in seg.split('至')]
                if ds[-1] is None and len(ds) > 1:  # 「至十五日」省略了「初」等字
                    ds[-1] = cn_day(seg.split('至')[-1].strip())
                segs.append('-'.join('%d/%d' % (m, x) for x in ds if x))
            rng = '；'.join(s for s in segs if s)
        src = re.search(r'原表出處：(.*)', where)
        src = src.group(1).strip() if src else ''
        memo = get('神明认定备注')
        note = memo[len('原表附錄：'):].strip() if memo.startswith('原表附錄：') else ''
        code = get('原表编号')
        if code in ('?', '？'):
            code = ''
        god, suf = code_parts(code)
        nat = '?'
        if rown in nature:
            ncode, nat = nature[rown]
            if ncode != code:
                mismatch.append((rown, code, ncode))
        entries.append({
            'm': m, 'd': d, 'range': rng, 'name': name, 'nat': nat or '?', 'src': src, 'note': note,
            'code': code, 'god': god, 'suf': suf, 'row': rown,
        })
    return entries, skipped, mismatch


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('xlsx')
    ap.add_argument('--sheet', help='版本对比工作簿中的页名；不填则按环形历源表读取第一个工作表')
    ap.add_argument('--nature-from', help='用版本页时，从这个环形历源表按原表行号补「性質」')
    ap.add_argument('--edition', default='待确认')
    ap.add_argument('--edition-en', default='', help='英文界面显示的版本名（书名写成「拼音 汉字」）')
    ap.add_argument('--no-notes', action='store_true', help='清空「附錄」（公开版用）')
    ap.add_argument('-o', '--out', default='ring-data.js')
    a = ap.parse_args()

    mismatch = []
    if a.sheet:
        entries, skipped, mismatch = read_version_sheet(a.xlsx, a.sheet, a.nature_from)
        source = '%s ／ %s' % (a.xlsx.split('/')[-1], a.sheet)
    else:
        entries, skipped = read_ring_source(a.xlsx)
        source = a.xlsx.split('/')[-1]
    if a.no_notes:
        for e in entries:
            e['note'] = ''

    meta = {
        'edition': a.edition,
        'editionEn': a.edition_en,
        'sourceFile': source,
        'generated': datetime.date.today().isoformat(),
        'count': len(entries),
        'nature': {'T': '道', 'B': '佛', 'C': '儒', 'L': '地方', 'N': '其他（推测：自然神，待确认）',
                   'O': '其他（推测：祀典／官方，待确认）', '?': '未定', '&': '复合，如 L&T'},
        'suffix': {'': '诞', 'A': '成道（推测）', 'B': '朝真（推测）', 'D': '下降（推测）',
                   'P': '出家（推测）', 'S': '讳辰（推测）'},
        'fastDays10': [1, 8, 14, 15, 18, 23, 24, 28, 29, 30],
        'notesOmitted': a.no_notes,
    }
    # 英文版用的拼音：神圣日名称（及去掉「誕」「降」等后的神名，供「一神多日」用）、出处书名
    strip_ev = re.compile(r'(誕辰|誕|成道|下降|降|朝真|得道|飛昇|出家|成佛|諱辰|降神)$')
    names = []
    for e in entries:
        names += [(e['name'], 'name'), (re.sub(r'^各戶', '', strip_ev.sub('', e['name'])), 'name')]
    py = pinyin_util.build_map(names)
    py_title = pinyin_util.build_map([(e['src'], 'title') for e in entries])

    with open(a.out, 'w', encoding='utf-8') as f:
        f.write('// 由 build_ring_data.py 自动生成，请勿手改\n')
        f.write('window.ZHAI_RING = ')
        json.dump({'meta': meta, 'entries': entries, 'py': py, 'pyTitle': py_title}, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    print('写出 %d 条到 %s' % (len(entries), a.out))
    for n, name, s in skipped:
        print('  跳过第 %s 行「%s」：时间「%s」无法解析' % (n, name, s))
    for n, c1, c2 in mismatch:
        print('  注意：原表第 %s 行標號不一致（版本页 %s，性質源表 %s）' % (n, c1, c2))
    if a.sheet and a.nature_from:
        print('  性質为「未定」(?) 的条目：%d（源表本身如此）' % sum(1 for e in entries if e['nat'] == '?'))


if __name__ == '__main__':
    main()
