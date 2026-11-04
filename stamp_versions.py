# -*- coding: utf-8 -*-
"""给 index.html 里引用的本地文件加上版本号（?v=文件内容的前 8 位哈希）。

浏览器会缓存 ring.js、data.js 等文件；改了文件却沿用旧地址，读者可能一直看到旧版。
每次改动这些文件后运行一次：python3 stamp_versions.py
"""
import hashlib
import re

FILES = ['ring.css', 'fr.js', 'i18n.js', 'data.js', 'editions-data.js', 'spread-data.js', 'kinship-data.js', 'search-data.js', 'ring.js']

html = open('index.html', encoding='utf-8').read()
for f in FILES:
    h = hashlib.sha1(open(f, 'rb').read()).hexdigest()[:8]
    html, n = re.subn(r'((?:src|href)="%s)(\?v=[0-9a-f]+)?"' % re.escape(f), r'\1?v=%s"' % h, html)
    print('%-12s ?v=%s（%d 处）' % (f, h, n))
open('index.html', 'w', encoding='utf-8').write(html)
