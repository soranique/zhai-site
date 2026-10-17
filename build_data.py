# -*- coding: utf-8 -*-
"""从「持斋研究数据库.xlsx」生成网站数据 data.js。

用法：python3 build_data.py 持斋研究数据库.xlsx
      python3 build_data.py 持斋研究数据库.xlsx --no-quotes   （公开版：去掉原文摘录）
（Excel 需在 Excel/WPS 里保存过一次，公式格子才有值。）
"""
import json
import re
import sys

import openpyxl

MONTHS = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']
MONTH_RE = re.compile(r'(闰)?(十一|十二|正|一|二|三|四|五|六|七|八|九|十|腊|臘)月')


def month_no(text):
    """取文字中第一个「某月」，返回 1–12；「每月」「整月」等返回 None。"""
    if not text:
        return None
    m = MONTH_RE.search(text)
    if not m:
        return None
    name = m.group(2)
    if name in ('腊', '臘'):
        return 12
    if name == '一':
        name = '正'
    return MONTHS.index(name) + 1


def sheet_rows(wb, name):
    ws = wb[name]
    rows = list(ws.iter_rows(values_only=True))
    head = [str(h).strip() if h is not None else '' for h in rows[0]]
    out = []
    for r in rows[1:]:
        if r[0] is None or str(r[0]).strip() == '':
            continue
        out.append({h: ('' if v is None else str(v).strip()) for h, v in zip(head, r) if h})
    return out


# 公开版只保留开放文本（Kanripo 道藏本、CBETA）的斋期表原文
OPEN_TEXT = {'W001', 'W014'}


def main(path, no_quotes=False):
    wb = openpyxl.load_workbook(path, data_only=True)

    gods = sheet_rows(wb, '神明')
    texts = {r['文献ID']: r for r in sheet_rows(wb, '文献')}
    cal = sheet_rows(wb, '斋期表条目')
    prac = sheet_rows(wb, '实践记录')
    places = {r['地点ID']: r for r in sheet_rows(wb, '地点')}
    shenbao = sheet_rows(wb, '申报检索结果')
    fengsu = sheet_rows(wb, '风俗志阅读记录')
    classics = sheet_rows(wb, '经典核查')

    god_by_name = {g['标准名']: g['神明ID'] for g in gods}
    deities = [{
        'id': g['神明ID'], 'name': g['标准名'], 'alias': g['异名'], 'type': g['类型'],
        'dates': g['主要日期（农历）'], 'dateSrc': g['日期出处'], 'note': g['备注'],
    } for g in gods]

    # 斋期表里没有神明ID、但有神名的条目：用 X 开头的临时编号归组（不写回数据库）
    extra = {}

    def god_key(gid, name):
        if gid:
            return gid
        if not name:
            return ''
        if name not in extra:
            extra[name] = 'X%02d' % (len(extra) + 1)
            deities.append({'id': extra[name], 'name': name, 'alias': '', 'type': '未建档',
                            'dates': '', 'dateSrc': '', 'note': '神明表中尚无此条，只见于斋期表'})
        return extra[name]

    calendar = []
    for c in cal:
        calendar.append({
            'id': c['条目ID'], 'w': c['文献ID'], 'loc': c['卷叶'], 'm': c['月'], 'd': c['日'],
            'mn': month_no(c['月']), 'g': god_key(c['神明ID'], c['神明']), 'zhai': c['斋名'],
            'label': c['原文所标类型'], 'kind': c['编码日期类型'], 'req': c['节制要求'],
            'cmp': c['与前一版本相比'], 'text': c['原文'], 'note': c['备注'],
        })

    used_w = {c['w'] for c in calendar}
    versions = []
    for wid, t in texts.items():
        if wid in used_w or t.get('含斋期表') == '是' or t.get('史料类型') == '斋期表':
            yr = re.search(r'1[3-9]\d\d', t['成书/刊刻时间'])
            versions.append({
                'id': wid, 'title': t['题名'], 'ed': t['版本'], 'author': t['编者/作者'],
                'date': t['成书/刊刻时间'], 'year': int(yr.group()) if yr else None,
                'status': t['获取状态'], 'note': t['备注'],
                'n': sum(1 for c in calendar if c['w'] == wid),
            })
    versions.sort(key=lambda v: (v['year'] or 9999, v['id']))

    practice = []
    for p in prac:
        pl = places.get(p['地点ID'], {})
        practice.append({
            'id': p['记录ID'], 'w': p['文献ID'], 'wt': p['文献题名'], 'loc': p['卷叶/行号'],
            'genre': p['史料类型'], 'when': p['事件时间'], 'period': p['时段'],
            'year': p['约略年份（排序用）'], 'who': p['持斋者'], 'sex': p['性别'],
            'place': p['地点'] or pl.get('名称', ''), 'pref': pl.get('所属府州（明清）', ''),
            'jn': p['狭义江南'], 'g': p['神明ID'], 'zhai': p['斋名'], 'date': p['日期（农历）'],
            'mn': month_no(p['日期（农历）']), 'form': p['形式'], 'D': p['D 承诺途径'],
            'A': p['A 在场方式'], 'C': p['C 知识来源'], 'B': p['B 关系形态'],
            'ev': p['证据强度'], 'cal': p['对应斋期表条目ID'], 'text': p['原文摘录'],
            'note': p['备注'],
        })

    # 《申报》：按「涉及神明」文字对应到神明（标准名或异名出现在文字中）
    alias_map = []
    for g in gods:
        names = [g['标准名']] + [a for a in re.split(r'[、，,；;]', g['异名']) if len(a) >= 2]
        for n in names:
            alias_map.append((n, g['神明ID']))
    alias_map += [('释迦', 'G018'), ('佛（释迦）', 'G018'), ('斗', 'G003'), ('雷', 'G005'),
                  ('九王', 'G004'), ('文昌', 'G028')]
    alias_map.sort(key=lambda x: -len(x[0]))

    def match_gods(s):
        found = []
        for n, gid in alias_map:
            if n in s and gid not in found:
                found.append(gid)
                s = s.replace(n, '')
        return found

    sb = []
    for r in shenbao:
        gs = match_gods(r['涉及神明'])
        if not gs:
            continue
        sb.append({'date': r['日期'], 'title': r['题名'], 'place': r['地点'], 'jn': r['狭义江南'],
                   'kind': r['斋的种类'], 'rel': r['相关度'], 'sum': r['摘要'],
                   'text': r['关键原文（资料库全文，未核版面）'], 'rec': r['已录入ID'], 'gs': gs})

    fs = []
    for r in fengsu:
        gs = [r['神明ID']] if r['神明ID'] else match_gods(r['涉及神明'])
        if not gs:
            continue
        fs.append({'id': r['命中ID'], 'book': r['书名'], 'item': r['类目·条目'], 'when': r['所记时间'],
                   'place': r['地点'], 'date': r['日期（农历）'], 'tag': r['标签'],
                   'sum': r['摘要'], 'text': r['关键原文'], 'rec': r['已录入ID'], 'gs': gs})

    cl = []
    for r in classics:
        gs = match_gods(r['神明'])
        if gs:
            cl.append({'gs': gs, 'jing': r['经典'], 'ed': r['版本／编号'], 'has': r['有无具体斋日规定'],
                       'ex': r['相关摘录'], 'sig': r['对本研究的意义']})

    if no_quotes:
        for c in calendar:
            if c['w'] not in OPEN_TEXT:
                c['text'] = ''
        for r in practice + sb + fs:
            r['text'] = ''

    data = {'deities': deities, 'versions': versions, 'calendar': calendar, 'practice': practice,
            'shenbao': sb, 'fengsu': fs, 'classics': cl,
            'source': path.split('/')[-1], 'noQuotes': no_quotes}
    with open('data.js', 'w', encoding='utf-8') as f:
        f.write('// 由 build_data.py 自动生成，请勿手改\nwindow.ZHAI = ')
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    print('神明 %d、版本 %d、斋期表条目 %d、实践记录 %d、申报 %d、风俗志 %d' % (
        len(deities), len(versions), len(calendar), len(practice), len(sb), len(fs)))


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    main(args[0] if args else '持斋研究数据库.xlsx', '--no-quotes' in sys.argv)
