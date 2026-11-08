// 列出英文、法文界面需要翻譯、但 tx.js 裏還沒有譯文的研究者文字（筆記、摘要、說明）
//   node tools/tx/extract.cjs          → 印出缺譯條數；寫出 tools/tx/todo.json（每條：類別、中文）
// 原文（斋曆條目、引文）不翻譯，不在這裏列出。
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..', '..');
const ctx = { window: {} }; vm.createContext(ctx);
ctx.location = { search: '?lang=en' }; ctx.localStorage = { getItem() { return 'en'; }, setItem() {} }; ctx.URLSearchParams = URLSearchParams;
vm.runInContext(fs.readFileSync(path.join(root, 'i18n.js'), 'utf8'), ctx);
for (const f of ['data.js', 'editions-data.js', 'kinship-data.js', 'spread-data.js', 'tx.js']) {
  const p = path.join(root, f); if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), ctx);
}
const W = ctx.window, D = W.ZHAI, E = W.ZHAI_ED, K = W.ZHAI_KIN, S = W.ZHAI_SPREAD, TX = W.ZHAI_TX || {};
const han = (s) => typeof s === 'string' && /[㐀-鿿]/.test(s);
const out = new Map();
const I = W.ZhaiI18n;
// 日期欄：程序轉成「月/日」以後仍剩漢字（括注）的，整條譯
const addDate = (cat, s) => { if (!han(s)) return; const d = I.D(s).replace(/「[^」]*」/g, ''); if (han(d)) add(cat, s); };
const add = (cat, s) => { if (!han(s)) return; s = s.trim(); if (!out.has(s)) out.set(s, cat); };
const each = (cat, arr, ...fs) => (arr || []).forEach((x) => fs.forEach((f) => add(cat + '.' + f, x[f])));
// 持齋研究數據庫
each('deity', D.deities, 'note', 'dateSrc');
D.deities.forEach((g) => addDate('deity.dates', g.dates));
D.practice.forEach((p) => addDate('practice.date', p.date));
D.fengsu.forEach((p) => addDate('fengsu.date', p.date));
each('practice', D.practice, 'relNote', 'note', 'when', 'loc', 'who');
each('shenbao', D.shenbao, 'sum', 'kind', 'rec');
each('fengsu', D.fengsu, 'rec');
const PYALL = Object.assign({}, D.py, D.pyTitle);
D.practice.forEach((p) => { if (!PYALL[p.zhai]) add('practice.zhai', p.zhai); });
D.shenbao.forEach((p) => { if (!PYALL[p.title]) add('shenbao.title', p.title); });
each('fengsu', D.fengsu, 'sum', 'when', 'item');
each('classics', D.classics, 'sig', 'ed');
(D.versions || []).forEach((w) => { add('text.ed', w.ed); add('text.date', w.date); if (!PYALL[w.author]) add('text.author', w.author); });
(D.versions || []).filter((v) => /未取得/.test(v.status)).forEach((v) => add('dbversion.title', v.title));
// 版本目錄
each('version', E.versions.concat(E.solo || []), 'era', 'pub', 'title', 'date', 'src');
// 版本親疏
(K.excl || []).forEach((x) => add('kin.excl', x));
(K.dir || []).forEach((r) => add('kin.dir', r.d));
each('kin.node', K.nodes, 'tent', 'note');
// 版本線索圖
Object.values(S.info).forEach((ls) => ls.forEach((x) => add('spread.info', x)));
S.edges.forEach((e) => { add('spread.edge', e.d); add('spread.year', e.y); });
S.unk.forEach((x) => add('spread.unk', x));
const todo = [...out].filter(([zh]) => !TX[zh]).map(([zh, cat]) => ({ cat, zh }));
fs.writeFileSync(path.join(__dirname, 'todo.json'), JSON.stringify(todo, null, 1));
const by = {}; todo.forEach((t) => { by[t.cat] = (by[t.cat] || 0) + 1; });
console.log('缺譯 %d 條（已有譯文 %d 條）', todo.length, Object.keys(TX).length); console.log(by);
console.log('字數', todo.reduce((a, t) => a + t.zh.length, 0));
