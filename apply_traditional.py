# -*- coding: utf-8 -*-
"""把生成的数据文件转成繁体（在 build_data / build_editions / build_kinship 之后、build_search 之前运行）。

用法：python3 apply_traditional.py

不转的栏目（史料原文、照录）：
- 斋历条目：原文 t、神明照录 g、原文所标 l、修持要求 q、原书月日 mo / dy
- 实践记录 text；《申报》title、text；风俗志 text；经典摘录 ex
说明文字里「」『』内多是引文：提到三浦的整段不转（三浦用日本新字体）；其余只转没有歧义的简体字，余、云、后、里等字照旧，
以免改动引文（如第一人称的「余」）。
"""
import json
import re

from zh_trad import T

SKIP = {'ZHAI_ED.entries': {'t', 'g', 'l', 'q', 'mo', 'dy'}, 'ZHAI.practice': {'text'}, 'ZHAI.shenbao': {'title', 'text'},
        'ZHAI.fengsu': {'text'}, 'ZHAI.classics': {'ex'}}
QUOTE = re.compile(r'(「[^」]*」|『[^』]*』)')
AMBIG = set('余云后里干于发面只台谷斗历系制征松范注采卷板划困咸丑冲胡郁须吁岳钟并复周群托辟准尸')


def quoted(p):
    return ''.join(c if c in AMBIG else T(c) for c in p)


def S(s):
    if not isinstance(s, str):
        return s
    keep = '三浦' in s
    return ''.join((p if keep else quoted(p)) if QUOTE.fullmatch(p) else T(p) for p in QUOTE.split(s))


def conv(o, skip=()):
    if isinstance(o, str):
        return S(o)
    if isinstance(o, list):
        return [conv(x) for x in o]
    if isinstance(o, dict):
        out = {}
        for k, v in o.items():
            out[S(k)] = v if k in skip else conv(v)
        return out
    return o


for fn, var in (('data.js', 'ZHAI'), ('editions-data.js', 'ZHAI_ED'), ('kinship-data.js', 'ZHAI_KIN')):
    src = open(fn, encoding='utf-8').read()
    m = re.search(r'window\.%s\s*=\s*' % var, src)
    head, body = src[:m.end()], src[m.end():].rstrip().rstrip(';')
    d = json.loads(body)
    new = {}
    for k, v in d.items():
        key = var + '.' + k
        if key in SKIP:
            new[k] = [conv(r, SKIP[key]) for r in v]
        elif key == 'ZHAI_ED.solo':
            new[k] = [dict(conv(r, ('es',)), es=[conv(x, SKIP['ZHAI_ED.entries']) for x in r['es']]) for r in v]
        elif k in ('py', 'pyTitle'):   # 拼音表：简体、繁体两种写法都留，原文写法也查得到
            new[k] = {**v, **{S(a): b for a, b in v.items()}}
        else:
            new[k] = conv(v)
    open(fn, 'w', encoding='utf-8').write(head + json.dumps(new, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print(fn, 'OK')
