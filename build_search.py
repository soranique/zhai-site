# -*- coding: utf-8 -*-
"""生成 search-data.js：全站搜索用的繁→简单字对照表（只收网站数据里出现过、且繁简不同的字）。

用法：python3 build_search.py   （在 data.js、editions-data.js 生成之后运行）
需要：pip install opencc-python-reimplemented
"""
import json
import re

from opencc import OpenCC

t2s = OpenCC('t2s').convert
chars = set()
for f in ('data.js', 'editions-data.js', 'kinship-data.js', 'spread-data.js'):
    try:
        chars.update(re.findall(r'[㐀-鿿]', open(f, encoding='utf-8').read()))
    except FileNotFoundError:
        pass
pairs = {}
for c in sorted(chars):
    s = t2s(c)
    if len(s) == 1 and s != c:
        pairs[c] = s
with open('search-data.js', 'w', encoding='utf-8') as f:
    f.write('// 由 build_search.py 自动生成，请勿手改：全站搜索的繁→简单字对照\nwindow.ZHAI_T2S = ')
    json.dump(''.join(k + v for k, v in pairs.items()), f, ensure_ascii=False)
    f.write(';\n')
print('繁→简 %d 字' % len(pairs))
