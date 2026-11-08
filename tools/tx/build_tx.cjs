// 由譯文表生成 tx.js：
//   node tools/tx/build_tx.cjs
// 譯文表 tools/tx/tx_sources.json：{ "中文原文": { "en": "...", "fr": "..." } }，以中文原文對應，
// 數據庫或工作簿改了某條筆記，原文對不上時網站就照錄中文並標 [Chinese]；跑 extract.cjs 可列出缺譯的條目。
const fs = require('fs'), path = require('path');
const src = JSON.parse(fs.readFileSync(path.join(__dirname, 'tx_sources.json'), 'utf8'));
const out = {};
for (const zh of Object.keys(src).sort()) { const t = src[zh]; if (t && t.en) out[zh] = t.fr ? [t.en, t.fr] : [t.en]; }
fs.writeFileSync(path.join(__dirname, '..', '..', 'tx.js'),
  '// 由 tools/tx/build_tx.cjs 生成，請勿手改；譯文改 tools/tx/tx_sources.json\n' +
  '// 研究者文字（實踐記錄筆記、摘要、版本說明、版本線索圖說明等）的英文、法文譯文：中文原文 → [英文, 法文]\n' +
  'window.ZHAI_TX = ' + JSON.stringify(out) + ';\n' +
  '// 補充拼音（書名），由 tools/tx/build_py.py 生成\nwindow.ZHAI_TX_PY = ' + fs.readFileSync(path.join(__dirname, 'py_extra.json'), 'utf8').trim() + ';\n');
console.log('譯文 %d 條（其中有法文 %d 條）', Object.keys(out).length, Object.values(out).filter((x) => x[1]).length);
