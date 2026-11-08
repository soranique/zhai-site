# -*- coding: utf-8 -*-
"""補充拼音：版本親疏的短名、專門單獨齋期的短名等沒有收入 data.js／editions-data.js 拼音表的書名，
生成 tools/tx/py_extra.json，由 build_tx.cjs 一併寫進 tx.js（window.ZHAI_TX_PY）。
    python3 tools/tx/build_py.py && node tools/tx/build_tx.cjs
需要 pypinyin、opencc-python-reimplemented（見 README）。"""
import json, os, re, subprocess, sys
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.join(here, '..', '..')
sys.path.insert(0, root)
import pinyin_util
js = r"""
const vm=require('vm'),fs=require('fs');const c={window:{}};vm.createContext(c);
for(const f of ['data.js','editions-data.js','kinship-data.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
const D=c.window.ZHAI,E=c.window.ZHAI_ED,K=c.window.ZHAI_KIN;
const have=Object.assign({},D.py,D.pyTitle,E.py,E.pyTitle);
const t=new Set();
K.nodes.forEach(n=>t.add(n.sh));(E.solo||[]).forEach(v=>t.add(v.short));(E.soloUndated||[]).forEach(b=>t.add(b));t.add('許真君玉匣記');
console.log(JSON.stringify([...t].filter(x=>x&&!have[x])));
"""
titles = json.loads(subprocess.check_output(['node', '-e', js], cwd=root))
FIX = {'萬寶全書': 'Wanbao quanshu', '諸神聖誕日': 'Zhushen shengdanri', '西來妙諦': 'Xilai miaodi', '萬全(劉)重印': 'Wanquan (Liu) reprint'}
out = {}
for t in titles:
    if t in FIX: out[t] = FIX[t]; continue
    # 「萬全(劉)」「增廣(春明)」「增訂敬信錄·司命竈君日期」：括號、間隔號兩邊分別注音
    parts = re.split(r'([()（）·])', t)
    py = ''.join(pinyin_util.pinyin(p, 'title') if re.search(r'[㐀-鿿]', p) else {'·': ': ', '（': ' (', '）': ')', '(': ' (', ')': ')'}.get(p, p) for p in parts)
    out[t] = re.sub(r'\s+', ' ', py).strip()
json.dump(out, open(os.path.join(here, 'py_extra.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(out), '條')
for k, v in out.items(): print(k, '→', v)
