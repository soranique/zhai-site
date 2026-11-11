/* 齋期神譜環形曆 · 網站模塊
   用法：ZhaiRing.mount(容器元素, window.ZHAI_RING, 選項)
   選項（都可省略）：
     sections: ['disc','treemap','dom','strips','table','notes']  要顯示的部分及順序
     title:    頁面標題（默認「齋期神譜環形曆」）；傳 false 則不輸出標題
   不依賴任何庫；只讀 window.ZHAI_RING，不改動網站的 window.ZHAI。 */
(function () {
'use strict';
var NS = 'http://www.w3.org/2000/svg';
var MN = ['', '正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
var MS = ['', '正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
var NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
// 中／英／法：語言由網站的 i18n.js（window.ZhaiI18n）決定；單獨使用本模塊時一律中文；法文沒寫第三個參數時按英文查 fr.js
var I18 = window.ZhaiI18n;
function EN() { return !!(I18 && I18.en()); }
function L(zh, en, fr) { return I18 ? I18.L(zh, en, fr) : zh; }
function TT(en) { return I18 ? I18.T(en) : en; }   // 英文 → 當前西文
function NH(t) { return I18 ? I18.N(t) : esc(t); }   // 專名（HTML）：英文界面爲「拼音 漢字」
function NTX(t) { return I18 ? I18.NT(t) : String(t); }
function ORD(n) { return I18 ? I18.ord(n) : String(n); }
function DN(d) { if (EN()) return String(d); return d <= 10 ? '初' + NUM[d] : d < 20 ? '十' + NUM[d - 10] : d === 20 ? '二十' : d < 30 ? '廿' + NUM[d - 20] : '三十'; }
function lunar(m, d) { return EN() ? m + '/' + d : MN[m] + DN(d); }
function lunarLong(m, d) { return EN() ? I18.monDay(m, d) : lunar(m, d); }
function monthLabel(m) { return EN() ? I18.ordL(m) : MS[m] + '月'; }
var TR = {
  T: { lab: '道', c: '--zr-dao', pig: '藍色' }, B: { lab: '佛', c: '--zr-fo', pig: '黃色' },
  L: { lab: '地方', c: '--zr-di', pig: '綠色' }, C: { lab: '儒', c: '--zr-ru', pig: '紫色' },
  Q: { lab: '其他', c: '--zr-qi', pig: '灰色' }, U: { lab: '未定', c: '--zr-wei', pig: '淺灰' },
  A: { lab: '集會', c: '--zr-hui', pig: '紅色' },   // 以下四類只用於 kind 方案
  D: { lab: '下降', c: '--zr-jiang', pig: '天藍' }, H: { lab: '諱辰', c: '--zr-huichen', pig: '橄欖綠' }, V: { lab: '誓願', c: '--zr-shiyuan', pig: '胭脂' }
};
var TR_EN = { T: ['Daoist', 'blue'], B: ['Buddhist', 'yellow'], L: ['Local', 'green'], C: ['Confucian', 'purple'], Q: ['Other', 'gray'], U: ['Undetermined', 'light gray'], A: ['Assembly', 'red'],
  D: ['Descent', 'sky blue'], H: ['Death anniversary', 'olive'], V: ['Vow', 'rose'] };
// 着色方案：nat＝性質（道、佛、地方、儒），kind＝編碼日期類型（誕辰、成就、下降、巡察、集會、節令、諱辰、誓願、其他）
// kind 方案沿用同一組顏色與代碼 T B L C Q U，只換名稱；另加 A＝集會（紅色）、D＝下降（天藍）、H＝諱辰（橄欖綠）、V＝誓願（胭脂），nat 方案不用
// 一條兼標兩類的（如「下降、巡察」）記作 D&L，曆盤上兩色各半
var CUR = null, LASTPT = '';
document.addEventListener('pointerdown', function (e) { LASTPT = e.pointerType; }, true);
var SCHEME = 'nat';
// 網站傳入的選項：focus = { names: [規範名…], label } 只突出這位神；onDay(m, d) 點放大月份中的某一天時調用
var OPT = {};
function focusOn() { return !!(OPT.focus && OPT.focus.names && OPT.focus.names.length); }
function isFocus(r) { return focusOn() && OPT.focus.names.indexOf(r.god) >= 0; }
var KIND_ZH = { T: '誕辰', B: '成就', D: '下降', L: '巡察', A: '集會', C: '節令', H: '諱辰', V: '誓願', Q: '其他', U: '未標' };
var KIND_EN = { T: 'Birthday', B: 'Attainment', D: 'Descent', L: 'Inspection', A: 'Assembly', C: 'Seasonal festival', H: 'Death anniversary', V: 'Vow', Q: 'Other', U: 'Unmarked' };
var KIND_CODE = { '誕辰': 'T', '成就': 'B', '下降': 'D', '巡察': 'L', '集會': 'A', '節令': 'C', '諱辰': 'H', '誓願': 'V', '其他': 'Q' };
var KIND_ONLY = ['A', 'D', 'H', 'V'];   // 只在 kind 方案出現的類
function trLab(k) { return SCHEME === 'kind' ? (EN() ? TT(KIND_EN[k]) : KIND_ZH[k]) : EN() ? TT(TR_EN[k][0]) : TR[k].lab; }
function trPig(k) { return EN() ? TT(TR_EN[k][1]) : TR[k].pig; }
var ORDER_ALL = ['T', 'B', 'D', 'L', 'A', 'C', 'H', 'V', 'Q', 'U'];
var ORDER = ORDER_ALL;   // 圖例、排序用；nat 方案沒有 A，圖例只列有條目的類（見 legendKeys）
var SUF_ZH = { A: '成道', B: '朝真', D: '下降', P: '出家', S: '諱辰' };
var SUF_EN = { A: 'attaining the Way', B: 'audience with the Perfected', D: 'descent', P: 'leaving home', S: 'death day' };
var SUF = {};
['A', 'B', 'D', 'P', 'S'].forEach(function (k) { Object.defineProperty(SUF, k, { get: function () { return EN() ? TT(SUF_EN[k]) : SUF_ZH[k]; }, enumerable: true }); });
var OTHER_SRC = '其他出處';
function srcName(s) { return s === OTHER_SRC ? L(OTHER_SRC, 'Other sources') : NH(s); }
function srcText(s) { return s === OTHER_SRC ? L(OTHER_SRC, 'Other sources') : NTX(s); }
function nEntries(n) { return L(n + ' 條', n + (n === 1 ? ' entry' : ' entries'), n + (n === 1 ? ' entrée' : ' entrées')); }
var TEN_LAB = function () { return L('十齋日', 'ten fast days'); };
var SIX_LAB = function () { return L('六齋日', 'six fast days', 'six jours de jeûne'); };
// 某日屬於哪種齋日的標籤；六齋日的六天都在十齋日之內
// 十齋日、六齋日並列：各用一色，兩者重合的日子各佔一半
var FAST_UID = 0;
function fastCss(D, d, a, b) { var t = D.TEN.indexOf(d) >= 0, s = D.SIX.indexOf(d) >= 0; return t && s ? 'linear-gradient(135deg,var(' + a + ') 50%,var(' + b + ') 50%)' : t ? 'var(' + a + ')' : s ? 'var(' + b + ')' : ''; }
function fastGrad(svg, a, b, side) { var id = 'zr-both-' + (++FAST_UID), defs = svgEl('defs', {}, svg), g = svgEl('linearGradient', { id: id, x1: 0, y1: 0, x2: 1, y2: side ? 0 : 1 }, defs);
  [[0, a], [0.5, a], [0.5, b], [1, b]].forEach(function (s) { svgEl('stop', { offset: s[0], 'stop-color': 'var(' + s[1] + ')' }, g); }); return 'url(#' + id + ')'; }
function fastLab(D, d) { var t = D.TEN.indexOf(d) >= 0, s = D.SIX.indexOf(d) >= 0; return t && s ? L('十齋日・六齋日', 'ten and six fast days', 'dix et six jours de jeûne') : t ? TEN_LAB() : s ? SIX_LAB() : ''; }
function one(c) { return c === 'N' || c === 'O' ? 'Q' : (TR[c] ? c : 'U'); }
function parts(n) { n = (n || '').replace('？', '?').trim(); if (!n || n === '?') return ['U']; return n.split('&').map(one); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function swatchCss(p) { return p.length > 1 ? 'linear-gradient(135deg,var(' + TR[p[0]].c + ') 50%,var(' + TR[p[1]].c + ') 50%)' : 'var(' + TR[p[0]].c + ')'; }
function tradLabel(r) { return r.p.map(trLab).join(L('＋', ' + ')); }
function rangesOf(r) {
  var seen = {};
  return r.range.split(/[;；]/).map(function (seg) {
    var a = seg.trim().split('-').map(function (x) { return x.split('/').map(Number); });
    var s = a[0], e = a[1] || s;
    if (a.length > 2 || s.length !== 2 || e.length !== 2 || s[0] !== e[0] ||
        !Number.isInteger(s[0]) || s[0] < 1 || s[0] > 12 ||
        !Number.isInteger(s[1]) || !Number.isInteger(e[1]) || s[1] < 1 || e[1] > 30 || s[1] > e[1]) return null;
    var key = s.join('/') + '-' + e.join('/');
    if (seen[key]) return null;
    seen[key] = true;
    return [s, e];
  }).filter(Boolean);
}
function rangeHas(r, m, d) {
  return rangesOf(r).some(function (a) { return m === a[0][0] && d >= a[0][1] && d <= a[1][1]; });
}
function svgEl(t, a, p) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }

// 共用的懸停提示
var tip;
function showTip(ev, h) {
  if (!tip) { tip = document.createElement('div'); tip.className = 'zr-tip'; tip.hidden = true; document.body.appendChild(tip); }
  tip.innerHTML = h; tip.hidden = false;
  var w = tip.offsetWidth, x = ev.clientX + 12; if (x + w > innerWidth - 8) x = ev.clientX - w - 12;
  tip.style.left = x + 'px'; tip.style.top = (ev.clientY + 14) + 'px';
}
function hideTip() { if (tip) tip.hidden = true; }

function prepare(data) {
  var all = data.entries.map(function (r, i) {
    var p = parts(r.nat);
    return { i: i, m: r.m, d: r.d, range: r.range || '', name: r.name, nat: r.nat || '', src: r.src || '', note: r.note || '',
      code: r.code || '', god: r.god || '', suf: r.suf || '', p: p, t: p.length > 1 ? 'MIX' : p[0],
      s: '' };
  });
  // 出處：條數最多的四個單列，其餘合爲「其他出處」；沒有出處的條目不計入樹圖
  var sc = {}; all.forEach(function (r) { if (r.src) sc[r.src] = (sc[r.src] || 0) + 1; });
  var srcMain = Object.keys(sc).sort(function (a, b) { return sc[b] - sc[a]; }).slice(0, 4);
  all.forEach(function (r) { r.s = !r.src ? '' : srcMain.indexOf(r.src) >= 0 ? r.src : OTHER_SRC; });
  var daily = all.filter(function (r) { return !r.range; });
  var ranges = all.filter(function (r) { return r.range; });
  var byDay = {};
  daily.forEach(function (r) { var k = r.m * 100 + r.d; (byDay[k] = byDay[k] || []).push(r); });
  Object.keys(byDay).forEach(function (k) { byDay[k].sort(function (a, b) { return ORDER.indexOf(a.p[0]) - ORDER.indexOf(b.p[0]); }); });
  return { all: all, daily: daily, ranges: ranges, byDay: byDay, srcMain: srcMain, notesOmitted: !!(data.meta && data.meta.notesOmitted), TEN: (data.meta && data.meta.fastDays10) || [1, 8, 14, 15, 18, 23, 24, 28, 29, 30], SIX: (data.meta && data.meta.fastDays6) || [8, 14, 15, 23, 29, 30] };
}

// ---------- 曆盤 ----------
function disc(root, D) {
  var sec = document.createElement('section'); sec.className = 'zr-sec';
  sec.innerHTML = '<div class="zr-hero"><div class="zr-disc"><svg viewBox="0 0 800 800" role="img" aria-label="' + L('曆盤：十二個月扇區乘三十日環，每格顯示當日的神聖日條目', 'Calendar disc: twelve month sectors by thirty day rings; each cell shows that day’s sacred-day entries') + '"></svg><button type="button" class="zr-back" hidden>' + L('← 返回全年', '← Whole year') + '</button><div class="zr-steps" role="group" aria-label="' + L('選擇顯示的日子', 'Choose which days to show') + '"></div></div><aside class="zr-panel" aria-live="polite"></aside></div>' +
    '<p class="zr-hint">' + L('十二個月是十二個扇區，從內到外是初一到三十；一格是一天，格中每一色塊是一條神聖日條目。泥金色底格是十齋日，石青色底格是六齋日；兩者重合的格子各佔一半。移動或點按一格查看當日；點擊某個月可放大該月，再點其他月份切換，點盤外或按 Esc 返回全年。下方按鈕可單獨開關各類日子並任意疊加：「空白之年」全部關閉，「全部」全部打開。',
      'The twelve lunar months are twelve sectors; days 1 to 30 run from the inside out. Each cell is a day, and each coloured block in it is one sacred-day entry. Cells with a gold ground are the ten fast days (shizhai ri 十齋日) and cells with a blue ground the six fast days (liuzhai ri 六齋日); where they coincide, each takes half the cell. Hover over or tap a cell to see that day; click a month to zoom in on it, click another month to switch, and click outside the disc or press Esc to return to the whole year. The buttons below switch each kind of day on or off and can be combined; “An empty year” turns everything off and “All” turns everything on.') + '</p>';
  root.appendChild(sec);
  var svg = sec.querySelector('svg'), panel = sec.querySelector('.zr-panel'), stepsEl = sec.querySelector('.zr-steps'), backBtn = sec.querySelector('.zr-back');
  var C = 400, RI = 122, RO = 352, DR = (RO - RI) / 30, TOPGAP = 5.5, GAP = 0.9, MW = (360 - TOPGAP - 11 * GAP) / 12;
  function rad(a) { return a * Math.PI / 180; }
  function mStart(m) { return -90 + TOPGAP / 2 + (m - 1) * (MW + GAP); }
  function P(r, a) { return [C + r * Math.cos(rad(a)), C + r * Math.sin(rad(a))]; }
  function wedge(r1, r2, a1, a2) {
    var p1 = P(r2, a1), p2 = P(r2, a2), p3 = P(r1, a2), p4 = P(r1, a1), lg = a2 - a1 > 180 ? 1 : 0, f = function (v) { return v.toFixed(2); };
    return 'M' + f(p1[0]) + ',' + f(p1[1]) + 'A' + r2 + ',' + r2 + ' 0 ' + lg + ' 1 ' + f(p2[0]) + ',' + f(p2[1]) + 'L' + f(p3[0]) + ',' + f(p3[1]) + 'A' + r1 + ',' + r1 + ' 0 ' + lg + ' 0 ' + f(p4[0]) + ',' + f(p4[1]) + 'Z';
  }
  var cells = {}, slices = [], rngEls = [];
  var BOTH = fastGrad(svg, '--zr-fast', '--zr-six');
  var gC = svgEl('g', {}, svg), gS = svgEl('g', {}, svg);
  // 每個月的格子、色塊、月名、跨日細條各放一組，懸停／放大時按月變灰
  var MG = [[]];
  for (var m = 1; m <= 12; m++) {
    var a0 = mStart(m), a1 = a0 + MW;
    var gCm = svgEl('g', { 'class': 'zr-mg' }, gC), gSm = svgEl('g', { 'class': 'zr-mg' }, gS);
    MG[m] = [gCm, gSm];
    for (var d = 1; d <= 30; d++) {
      var r1 = RI + (d - 1) * DR + 0.45, r2 = RI + d * DR - 0.45, k = m * 100 + d;
      cells[k] = svgEl('path', { d: wedge(r1, r2, a0, a1), fill: 'var(--zr-cell)', 'class': 'zr-cell' }, gCm);
      var list = D.byDay[k]; if (!list) continue;
      var n = list.length, span = (MW - 0.4 * (n - 1)) / n;
      list.forEach(function (r, j) {
        var s0 = a0 + j * (span + 0.4), s1 = s0 + span;
        if (r.p.length > 1) {
          var rm = (r1 + r2) / 2;
          slices.push({ el: svgEl('path', { d: wedge(r1, rm, s0, s1), fill: 'var(' + TR[r.p[0]].c + ')', 'class': 'zr-slice' }, gSm), r: r, t: r.p[0] });
          slices.push({ el: svgEl('path', { d: wedge(rm, r2, s0, s1), fill: 'var(' + TR[r.p[1]].c + ')', 'class': 'zr-slice' }, gSm), r: r, t: r.p[1] });
        } else slices.push({ el: svgEl('path', { d: wedge(r1, r2, s0, s1), fill: 'var(' + TR[r.p[0]].c + ')', 'class': 'zr-slice' }, gSm), r: r, t: r.p[0] });
      });
    }
    var lp = P(RO + 26, a0 + MW / 2);
    var lab = svgEl('text', { x: lp[0], y: lp[1], 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 18, 'font-weight': 700, fill: 'var(--zr-ink)', 'class': 'zr-mg' }, svg);
    lab.textContent = monthLabel(m);
    MG[m].push(lab);
  }
  var topDays = svgEl('g', { 'class': 'zr-mg' }, svg);
  [1, 8, 15, 23, 30].forEach(function (d) {
    svgEl('text', { x: C, y: C - (RI + (d - 0.5) * DR), 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 11, 'font-weight': 600, fill: 'var(--zr-ink-2)' }, topDays).textContent = d;
  });
  D.ranges.forEach(function (r) {
    rangesOf(r).forEach(function (a) {
      var s = a[0], e = a[1], st = mStart(s[0]);
      var el = svgEl('path', { d: wedge(RI + (s[1] - 1) * DR, RI + e[1] * DR, st - 0.82, st - 0.08), fill: 'var(--zr-gold)', opacity: 0, 'class': 'zr-mg', style: 'transition:opacity .5s' }, svg);
      rngEls.push({ el: el, r: r }); MG[s[0]].push(el);
    });
  });
  svgEl('circle', { cx: C, cy: C, r: RI - 10, fill: 'none', stroke: 'var(--zr-line)' }, svg);
  var c1 = svgEl('text', { x: C, y: C - 8, 'text-anchor': 'middle', 'font-size': 28, 'font-weight': 700, fill: 'var(--zr-ink)' }, svg);
  var c2 = svgEl('text', { x: C, y: C + 26, 'text-anchor': 'middle', 'font-size': 13, fill: 'var(--zr-muted)' }, svg);
  var hl = svgEl('path', { d: '', fill: 'none', stroke: 'var(--zr-ink)', 'stroke-width': 1.8, 'vector-effect': 'non-scaling-stroke', 'pointer-events': 'none' }, svg);
  var dayLabs = svgEl('g', { 'pointer-events': 'none' }, svg);

  // 圖層按鈕：「空白之年」全部關閉，「全部」全部打開；中間各項可單獨開關、任意疊加
  var LAYERS = SCHEME === 'kind' ? [
    { k: 'fast', lab: L('十齋日', 'Ten fast days') },
    { k: 'six', lab: L('六齋日', 'Six fast days', 'Six jours de jeûne') },
    { k: 'T', lab: trLab('T'), show: ['T'] }, { k: 'B', lab: trLab('B'), show: ['B'] },
    { k: 'L', lab: trLab('L'), show: ['L'] }, { k: 'A', lab: trLab('A'), show: ['A'] }, { k: 'C', lab: trLab('C'), show: ['C'] },
    { k: 'QU', lab: L('其他・未標', 'Other · unmarked'), show: ['Q', 'U'] }] : [
    { k: 'fast', lab: L('十齋日', 'Ten fast days') },
    { k: 'six', lab: L('六齋日', 'Six fast days', 'Six jours de jeûne') },
    { k: 'T', lab: L('道', 'Daoist'), show: ['T'] },
    { k: 'B', lab: L('佛', 'Buddhist'), show: ['B'] },
    { k: 'LC', lab: L('地方・儒', 'Local · Confucian'), show: ['L', 'C'] },
    { k: 'QU', lab: L('其他・未定', 'Other · undetermined'), show: ['Q', 'U'] }];
  var on = {}, sel = null;
  LAYERS.forEach(function (x) { on[x.k] = true; });
  function allOn() { return LAYERS.every(function (x) { return on[x.k]; }); }
  function noneOn() { return LAYERS.every(function (x) { return !on[x.k]; }); }
  function shownTrad() { var t = []; LAYERS.forEach(function (x) { if (x.show && on[x.k]) t = t.concat(x.show); }); return t; }
  // 複合條目（如 L&T）：只要其中一種性質被選中就計入條數；曆盤上只顯示被選中性質的那一半
  function visible(r, t) { return r.p.some(function (p) { return t.indexOf(p) >= 0; }); }
  var BTNS = [{ k: 'none', lab: L('空白之年', 'An empty year') }].concat(LAYERS).concat([{ k: 'all', lab: L('全部', 'All') }]);
  stepsEl.innerHTML = BTNS.map(function (x, i) { return '<button type="button" data-k="' + x.k + '"><i>' + (i + 1) + '</i>' + x.lab + '</button>'; }).join('');
  stepsEl.querySelectorAll('button').forEach(function (b) {
    b.onclick = function () {
      var k = b.getAttribute('data-k');
      if (k === 'none' || k === 'all') LAYERS.forEach(function (x) { on[x.k] = k === 'all'; });
      else on[k] = !on[k];
      apply();
    };
  });
  function apply() {
    var t = shownTrad();
    stepsEl.querySelectorAll('button').forEach(function (b) {
      var k = b.getAttribute('data-k');
      b.setAttribute('aria-pressed', k === 'none' ? noneOn() : k === 'all' ? allOn() : !!on[k]);
    });
    Object.keys(cells).forEach(function (k) { var t10 = on.fast && D.TEN.indexOf(k % 100) >= 0, t6 = on.six && D.SIX.indexOf(k % 100) >= 0; cells[k].setAttribute('fill', t10 && t6 ? BOTH : t6 ? 'var(--zr-six)' : t10 ? 'var(--zr-fast)' : 'var(--zr-cell)'); });
    var F = focusOn();
    slices.forEach(function (o) { var v = t.indexOf(o.t) >= 0; o.el.style.opacity = !v ? 0 : !F || isFocus(o.r) ? 1 : 0.1; });
    rngEls.forEach(function (o) { var v = visible(o.r, t); o.el.setAttribute('opacity', !v ? 0 : !F || isFocus(o.r) ? 1 : 0.1); });
    // 聚焦神明所在的格子加描邊
    Object.keys(cells).forEach(function (k) { var on = F && (D.byDay[k] || []).some(isFocus); cells[k].setAttribute('stroke', on ? 'var(--zr-ink)' : 'none'); cells[k].setAttribute('stroke-width', on ? 1.2 : 0); });
    if (!sel) {
      var shown = D.all.filter(function (r) { return visible(r, t); }).length;
      var idle = !t.length;
      c1.textContent = idle ? (on.fast && on.six ? L('十齋・六齋', 'Ten and six fasts', 'Dix et six jeûnes') : on.fast ? L('十齋', 'Ten fasts') : on.six ? L('六齋', 'Six fasts', 'Six jeûnes') : L('一歲', 'One year')) : L('一歲神聖時間', 'A year of sacred time');
      c1.setAttribute('font-size', idle ? (EN() ? 32 : 40) : (EN() ? 22 : 28));
      c2.textContent = idle ? (on.fast && on.six ? L('每月十日、六日', '10 and 6 days a month', '10 et 6 jours par mois') : on.fast ? L('每月十日 · 一歲一百二十日', '10 days a month · 120 a year') : on.six ? L('每月六日 · 一歲七十二日', '6 days a month · 72 a year', '6 jours par mois · 72 par an') : L('十二月 · 三百六十日', '12 months · 360 days')) : nEntries(shown);
    }
  }
  function legend() {
    return '<div class="zr-legend"><div>' + ORDER.filter(function (k) { return KIND_ONLY.indexOf(k) < 0 || SCHEME === 'kind'; }).map(function (k) { return '<span><i class="zr-sw" style="background:var(' + TR[k].c + ')"></i>' + trLab(k) + '<span class="zr-hint">' + trPig(k) + '</span></span>'; }).join('') +
      '</div><div><span><i class="zr-sw" style="background:var(--zr-fast);outline:1px solid var(--zr-gold)"></i>' + L('十齋日', 'Ten fast days') + '</span><span><i class="zr-sw" style="background:var(--zr-six);outline:1px solid var(--zr-six-ink)"></i>' + L('六齋日', 'Six fast days', 'Six jours de jeûne') + '</span><span><i class="zr-sw" style="background:linear-gradient(135deg,var(--zr-fast) 50%,var(--zr-six) 50%)"></i>' + L('兩者重合（各半）', 'Both (half each)', 'Les deux (moitié chacun)') + '</span>' + (SCHEME === 'kind' ? '' : '<span><i class="zr-sw" style="background:linear-gradient(135deg,var(--zr-dao) 50%,var(--zr-di) 50%)"></i>' + L('複合（內外兩半）', 'Composite (inner / outer half)') + '</span>') + '</div></div>';
  }
  function item(r) {
    return '<li><i class="zr-sw" style="background:' + swatchCss(r.p) + '"></i><div><div class="zr-nm">' + NH(r.name) +
      (SUF[r.suf] ? '<span class="zr-chip">' + SUF[r.suf] + '</span>' : '') + (r.range ? '<span class="zr-chip">' + esc(r.range) + '</span>' : '') +
      '</div><div class="zr-sub">' + tradLabel(r) + ' · ' + (r.src ? NH(r.src) : '—') + (r.code ? ' · ' + esc(r.code) : '') + '</div>' +
      (r.note ? '<div class="zr-note">' + esc(r.note) + '</div>' : '') + '</div></li>';
  }
  function renderPanel() {
    if (zoom && !sel) {
      var days = [];
      for (var dd = 1; dd <= 30; dd++) if (D.byDay[zoom * 100 + dd]) days.push(dd);
      var total = days.reduce(function (t, x) { return t + D.byDay[zoom * 100 + x].length; }, 0);
      panel.innerHTML = '<div><div class="zr-pd">' + (EN() ? I18.mon(zoom) : MN[zoom]) + '</div><div class="zr-pmeta">' +
        L(nEntries(total) + ' · ' + days.length + ' 個神聖日', nEntries(total) + ' · ' + days.length + ' sacred days', nEntries(total) + ' · ' + days.length + ' jours sacrés') + '</div></div>' +
        '<ul class="zr-mlist">' + days.map(function (x) {
          var l = D.byDay[zoom * 100 + x];
          return '<li><i class="zr-sw" style="background:' + (fastCss(D, x, '--zr-gold', '--zr-six-ink') || 'var(--zr-wei)') + '"></i><div><div class="zr-nm">' + lunarLong(zoom, x) + '<span class="zr-chip">' + nEntries(l.length) + '</span></div><div class="zr-sub">' + l.map(function (r) { return NH(r.name); }).join(L('、', '; ')) + '</div></div></li>';
        }).join('') + '</ul><p class="zr-hint">' + L('移到某一格看當日詳情；點盤外或按 Esc 返回全年。', 'Hover over a cell for that day; click outside the disc or press Esc to return.') + '</p>' + legend();
      return;
    }
    if (!sel && focusOn()) {
      var fd = Object.keys(D.byDay).map(Number).filter(function (k) { return D.byDay[k].some(isFocus); }).sort(function (a, b) { return a - b; });
      var fr = D.ranges.filter(isFocus);
      panel.innerHTML = '<div class="zr-eyebrow">' + L('聚焦：', 'Focused: ') + esc(OPT.focus.label || '') + '</div>' +
        (fd.length || fr.length ? '<ul>' + fd.map(function (k) {
          var l = D.byDay[k].filter(isFocus), m = Math.floor(k / 100), d = k % 100;
          return '<li><i class="zr-sw" style="background:var(--zr-gold)"></i><div><div class="zr-nm"><a href="javascript:void 0" class="zr-day" data-m="' + m + '" data-d="' + d + '">' + lunarLong(m, d) + '</a></div><div class="zr-sub">' + l.map(function (r) { return NH(r.name); }).join(L('、', '; ')) + '</div></div></li>';
        }).join('') + fr.map(item).join('') + '</ul>' : '<p class="zr-hint">' + L('本版本沒有這位神的條目。', 'This edition has no entry for this deity.') + '</p>') +
        '<p class="zr-hint">' + L('點日期打開「這一天」，對照各版本與實踐記錄。', 'Click a date to open “this day”, comparing editions and practice.') + '</p>' + legend();
      panel.querySelectorAll('.zr-day').forEach(function (a) { a.onclick = function (e) { e.preventDefault(); if (OPT.onDay) OPT.onDay(+a.getAttribute('data-m'), +a.getAttribute('data-d')); }; });
      return;
    }
    if (!sel) {
      var top = Object.keys(D.byDay).map(function (k) { return [+k, D.byDay[k]]; }).sort(function (a, b) { return b[1].length - a[1].length; }).slice(0, 4);
      panel.innerHTML = '<div class="zr-eyebrow">' + L('最擁擠的日子', 'The most crowded days') + '</div><ul>' + top.map(function (t) {
        return '<li><i class="zr-sw" style="background:var(--zr-gold)"></i><div><div class="zr-nm">' + lunarLong(Math.floor(t[0] / 100), t[0] % 100) + '<span class="zr-chip">' + nEntries(t[1].length) + '</span></div><div class="zr-sub">' + t[1].map(function (r) { return NH(r.name); }).join(L('、', '; ')) + '</div></div></li>';
      }).join('') + '</ul>' + legend();
      return;
    }
    var m = Math.floor(sel / 100), d = sel % 100, list = D.byDay[sel] || [];
    var inR = D.ranges.filter(function (r) { return rangeHas(r, m, d); });
    panel.innerHTML = '<div><div class="zr-pd">' + lunarLong(m, d) + '</div><div class="zr-pmeta">' + nEntries(list.length) + (fastLab(D, d) ? ' · ' + fastLab(D, d) : '') + '</div></div>' +
      (list.length || inR.length ? '<ul>' + list.map(item).join('') + inR.map(item).join('') + '</ul>' : '<p class="zr-hint">' + L('此日沒有條目。', 'No entries on this day.') + '</p>') +
      (OPT.onDay ? '<p><button type="button" class="zr-openday">' + L('打開「這一天」：各版本對照實踐記錄', 'Open “this day”: editions beside practice') + '</button></p>' : '') + legend();
    var ob = panel.querySelector('.zr-openday'); if (ob) ob.onclick = function () { OPT.onDay(m, d); };
  }
  // 屏幕座標 → 曆盤上的月、日（放大後 viewBox 改變，用 CTM 換算）
  function locate(ev) {
    var pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    var q = pt.matrixTransform(svg.getScreenCTM().inverse()), x = q.x - C, y = q.y - C, r = Math.hypot(x, y);
    if (r < RI || r > RO + 40) return { m: 0, d: 0 };
    var a = Math.atan2(y, x) * 180 / Math.PI; if (a < -90) a += 360;
    var m = 0; for (var i = 1; i <= 12; i++) { if (a >= mStart(i) - GAP / 2 && a <= mStart(i) + MW + GAP / 2) { m = i; break; } }
    return { m: m, d: m && r <= RO ? Math.min(30, Math.max(1, Math.floor((r - RI) / DR) + 1)) : 0 };
  }
  // ---- 按月變灰與放大 ----
  var zoom = 0, hover = 0, VB0 = [0, 0, 800, 800], vb = VB0.slice(), anim = 0;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function shade() {
    var focus = zoom || hover;
    for (var i = 1; i <= 12; i++) MG[i].forEach(function (el) {
      el.classList.toggle('zr-dim', !!focus && i !== focus && !zoom);
      el.classList.toggle('zr-bg', !!zoom && i !== zoom);
    });
    // 放大時，本月月名與頂部日數改由 dayLabs 顯示
    for (var j = 1; j <= 12; j++) MG[j][2].classList.toggle('zr-hide', j === zoom);
    topDays.classList.toggle('zr-hide', !!zoom);
    svg.classList.toggle('zr-zoomed', !!zoom);
  }
  function setVB(v) { vb = v; svg.setAttribute('viewBox', v.map(function (x) { return x.toFixed(2); }).join(' ')); }
  function animateTo(to, done) {
    cancelAnimationFrame(anim);
    var from = vb.slice(), t0 = performance.now(), dur = reduce ? 0 : 480;
    (function step(now) {
      var t = dur ? Math.min(1, (now - t0) / dur) : 1, e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      setVB(from.map(function (f, i) { return f + (to[i] - f) * e; }));
      if (t < 1) anim = requestAnimationFrame(step); else if (done) done();
    })(t0);
  }
  function monthBox(m) {
    var a0 = mStart(m), a1 = a0 + MW, xs = [], ys = [];
    for (var i = 0; i <= 8; i++) [RI, RO].forEach(function (rr) { var p = P(rr, a0 + (a1 - a0) * i / 8); xs.push(p[0]); ys.push(p[1]); });
    var pad = 16, x0 = Math.min.apply(null, xs) - pad, y0 = Math.min.apply(null, ys) - pad, w = Math.max.apply(null, xs) + pad - x0, h = Math.max.apply(null, ys) + pad - y0;
    var side = Math.max(w, h);  // 取正方形，放大倍數對各月一致
    return [x0 - (side - w) / 2, y0 - (side - h) / 2, side, side];
  }
  function drawDayLabels(m, box) {
    dayLabs.innerHTML = '';
    var px = svg.getBoundingClientRect().width / box[2], fs = 11 / px, every = DR * px >= 15 ? 1 : 5;
    var a = mStart(m) - 2.2, ae = mStart(m) + MW / 2;
    for (var d = 1; d <= 30; d++) {
      if (every > 1 && d !== 1 && d % every) continue;
      var p = P(RI + (d - 0.5) * DR, a), ten = D.TEN.indexOf(d) >= 0;
      // 用 style 而非屬性：網站的全局 CSS「svg text」會蓋過 font-size、fill 屬性
      svgEl('text', { x: p[0], y: p[1], 'text-anchor': 'middle', 'dominant-baseline': 'central', 'class': 'zr-daylab',
        style: 'font-size:' + fs.toFixed(2) + 'px;fill:' + (ten ? 'var(--zr-gold)' : D.SIX.indexOf(d) >= 0 ? 'var(--zr-six-ink)' : 'var(--zr-ink-2)') + ';font-weight:' + (ten || D.SIX.indexOf(d) >= 0 ? 700 : 400) }, dayLabs).textContent = d;
    }
    var lp = P(RO + 8 / px + fs, ae);
    svgEl('text', { x: lp[0], y: lp[1], 'text-anchor': 'middle', 'dominant-baseline': 'central', 'class': 'zr-daylab',
      style: 'font-size:' + (fs * 1.5).toFixed(2) + 'px;fill:var(--zr-ink);font-weight:700' }, dayLabs).textContent = EN() ? I18.mon(m) : MN[m];
  }
  function zoomTo(m) {
    zoom = m; hover = 0; sel = null; hl.setAttribute('d', ''); dayLabs.innerHTML = '';
    shade(); backBtn.hidden = false; renderPanel();
    var box = monthBox(m);
    animateTo(box, function () { if (zoom === m) drawDayLabels(m, box); });
  }
  CUR = {   // 給網站的「可分享鏈接」讀寫：放大的月份、打開的圖層
    get: function () { return { zoom: zoom, layers: allOn() ? '' : noneOn() ? 'none' : LAYERS.filter(function (x) { return on[x.k]; }).map(function (x) { return x.k; }).join(',') }; },
    set: function (o) {
      if (o.layers) { var ks = o.layers.split(','); LAYERS.forEach(function (x) { on[x.k] = ks.indexOf(x.k) >= 0; }); apply(); }
      if (o.month >= 1 && o.month <= 12) zoomTo(o.month);
    }
  };
  function zoomOut() {
    if (!zoom) return;
    zoom = 0; sel = null; hl.setAttribute('d', ''); dayLabs.innerHTML = '';
    shade(); backBtn.hidden = true; apply(); renderPanel();
    animateTo(VB0);
  }
  backBtn.onclick = zoomOut;
  function onKey(e) { if (!svg.isConnected) { removeEventListener('keydown', onKey); return; } if (e.key === 'Escape') zoomOut(); }
  addEventListener('keydown', onKey);

  function pick(ev) {
    var loc = locate(ev), m = loc.m, d = loc.d;
    if (!zoom && m !== hover) { hover = m; shade(); }
    if (!m || !d || (zoom && m !== zoom)) return;
    var k = m * 100 + d;
    if (k === sel) return; sel = k;
    hl.setAttribute('d', wedge(RI + (d - 1) * DR, RI + d * DR, mStart(m), mStart(m) + MW));
    c1.setAttribute('font-size', EN() ? 26 : 28); c1.textContent = lunar(m, d);
    c2.textContent = nEntries((D.byDay[k] || []).length) + (fastLab(D, d) ? ' · ' + fastLab(D, d) : '');
    renderPanel();
  }
  svg.addEventListener('pointermove', pick);
  svg.addEventListener('pointerleave', function () { if (!zoom && hover) { hover = 0; shade(); } });
  svg.addEventListener('click', function (ev) {
    var m = locate(ev).m;
    if (!zoom) { if (m) zoomTo(m); return; }
    if (m === zoom) { pick(ev); var l = locate(ev); if (l.d && OPT.onDay && LASTPT !== 'touch') OPT.onDay(m, l.d); }   // 觸屏：點一天先在旁邊的面板裏看，面板上有「打開這一天」 else if (m) zoomTo(m); else zoomOut();
  });
  apply(); renderPanel();
}

// ---------- 出處樹圖 ----------
function squarify(items, x, y, w, h) {
  var out = [], total = items.reduce(function (s, i) { return s + i.v; }, 0), scale = w * h / total;
  var rest = items.slice().sort(function (a, b) { return b.v - a.v; }).map(function (i) { return { k: i.k, v: i.v, a: i.v * scale }; });
  function worst(row, side) { var s = 0, mx = 0, mn = Infinity; row.forEach(function (i) { s += i.a; mx = Math.max(mx, i.a); mn = Math.min(mn, i.a); }); return Math.max(side * side * mx / (s * s), s * s / (side * side * mn)); }
  while (rest.length) {
    var side = Math.min(w, h), row = [rest[0]], i = 1;
    while (i < rest.length && worst(row.concat(rest[i]), side) <= worst(row, side)) { row.push(rest[i]); i++; }
    rest = rest.slice(i);
    var s = row.reduce(function (t, r) { return t + r.a; }, 0);
    if (w >= h) { var cw = s / h, cy = y; row.forEach(function (r) { var ch = r.a / cw; out.push({ k: r.k, v: r.v, x: x, y: cy, w: cw, h: ch }); cy += ch; }); x += cw; w -= cw; }
    else { var rh = s / w, cx = x; row.forEach(function (r) { var c = r.a / rh; out.push({ k: r.k, v: r.v, x: cx, y: y, w: c, h: rh }); cx += c; }); y += rh; h -= rh; }
  }
  return out;
}
function treemap(root, D) {
  if (!D.srcMain.length) return;  // 該版本沒有記出處
  var K = SCHEME === 'kind';
  var sec = document.createElement('section'); sec.className = 'zr-sec';
  sec.innerHTML = '<div class="zr-eyebrow">' + L('這個版本由什麼拼成', 'What this edition is made of') + '</div><h2 style="margin:0">' + (K ? L('出處與日期類型', 'Sources and types of day') : L('出處與性質', 'Sources and traditions')) + '</h2>' +
    '<p class="zr-lede">' + (K ? L('每一大塊是一個出處，面積是條目數；塊內按編碼日期類型再分。', 'Each large block is a cited source, sized by its number of entries, and subdivided by the coded type of day.') :
      L('每一大塊是一個出處，面積是條目數；塊內按宗教性質再分。若某個出處專門提供某一傳統的日子，它內部就只會有一種顏色。',
      'Each large block is a cited source, sized by its number of entries, and subdivided by religious tradition. A source that supplied only one tradition’s days would show a single colour.')) + '</p><div class="zr-tm"></div><p class="zr-finding"></p>';
  root.appendChild(sec);
  var box = sec.querySelector('.zr-tm');
  var srcs = D.srcMain.concat([OTHER_SRC]).map(function (s) { return { k: s, v: D.all.filter(function (r) { return r.s === s; }).length }; }).filter(function (s) { return s.v; });
  function draw() {
    var W = box.clientWidth, H = box.clientHeight; if (!W || !H) return; box.innerHTML = '';
    squarify(srcs, 0, 0, W, H).forEach(function (S) {
      var rows = D.all.filter(function (r) { return r.s === S.k; });
      var groups = ORDER.concat(['MIX']).map(function (t) { return { k: t, v: rows.filter(function (r) { return r.t === t; }).length }; }).filter(function (g) { return g.v; });
      squarify(groups, S.x + 4, S.y + 4, S.w - 8, S.h - 8).forEach(function (g) {
        var dv = document.createElement('div'); dv.className = 'zr-blk';
        var lab = g.k === 'MIX' ? L('複合', 'Composite') : trLab(g.k);
        dv.style.cssText = 'left:' + g.x + 'px;top:' + g.y + 'px;width:' + g.w + 'px;height:' + g.h + 'px;background:' +
          (g.k === 'MIX' ? 'repeating-linear-gradient(135deg,var(--zr-dao) 0 6px,var(--zr-di) 6px 12px)' : 'var(' + TR[g.k].c + ')');
        if (g.w > 34 && g.h > 22) dv.innerHTML = '<em>' + (g.w > 70 ? lab + ' ' : '') + g.v + '</em>';
        dv.addEventListener('pointermove', function (ev) { showTip(ev, '<b>' + srcName(S.k) + '</b> · ' + lab + '<br>' + L(g.v + ' 條，佔該出處 ' + Math.round(g.v / S.v * 100) + '%', nEntries(g.v) + ', ' + Math.round(g.v / S.v * 100) + '% of this source', nEntries(g.v) + ', ' + Math.round(g.v / S.v * 100) + ' % de cette source')); });
        dv.addEventListener('pointerleave', hideTip);
        box.appendChild(dv);
      });
      var o = document.createElement('div'); o.className = 'zr-src';
      o.style.cssText = 'left:' + S.x + 'px;top:' + S.y + 'px;width:' + S.w + 'px;height:' + S.h + 'px';
      var sl = EN() ? srcText(S.k).length * 0.55 : S.k.length;
      if (S.w > 60 && S.h > 40) o.innerHTML = '<span style="font-size:' + Math.max(EN() ? 11 : 13, Math.min(24, S.w / (sl + 1))) + 'px">' + srcName(S.k) + '<small>' + nEntries(S.v) + '</small></span>';
      box.appendChild(o);
    });
  }
  draw();
  var t; function onResize() { if (!box.isConnected) { removeEventListener('resize', onResize); return; } clearTimeout(t); t = setTimeout(draw, 120); }
  addEventListener('resize', onResize);
  function pct(s, k) { var n = D.all.filter(function (r) { return r.s === s; }).length; return n ? Math.round(D.all.filter(function (r) { return r.s === s && r.t === k; }).length / n * 100) : 0; }
  if (K) {
    var top = function (s) { var c = {}; D.all.forEach(function (r) { if (r.s === s) c[r.t] = (c[r.t] || 0) + 1; }); var k = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; })[0]; return k ? [k, pct(s, k)] : null; };
    sec.querySelector('.zr-finding').textContent = L('各出處中最多的日期類型：', 'Most frequent type of day in each source: ') + D.srcMain.map(function (s) { var t = top(s); return srcText(s) + ' ' + (t ? (t[0] === 'MIX' ? '' : trLab(t[0])) + ' ' + t[1] + '%' : ''); }).join(L('；', '; ')) + L('。', '.');
    return;
  }
  sec.querySelector('.zr-finding').textContent = L('兩大出處的內部構成幾乎一樣：玉匣記中道教佔 ' + pct('玉匣記', 'T') + '%、佛教 ' + pct('玉匣記', 'B') + '%，古今類傳中道教佔 ' + pct('古今類傳', 'T') + '%、佛教 ' + pct('古今類傳', 'B') + '%。沒有哪個出處是「佛教的來源」或「道教的來源」。',
    'The two main sources are made up almost identically: in the ' + NTX('玉匣記') + ', Daoist entries are ' + pct('玉匣記', 'T') + '% and Buddhist ' + pct('玉匣記', 'B') + '%; in the ' + NTX('古今類傳') + ', Daoist ' + pct('古今類傳', 'T') + '% and Buddhist ' + pct('古今類傳', 'B') + '%. No source is “the Buddhist source” or “the Daoist source”.', 'Les deux principales sources ont une composition presque identique : dans le ' + NTX('玉匣記') + ', les entrées taoïstes font ' + pct('玉匣記', 'T') + ' % et les bouddhiques ' + pct('玉匣記', 'B') + ' % ; dans le ' + NTX('古今類傳') + ', taoïstes ' + pct('古今類傳', 'T') + ' % et bouddhiques ' + pct('古今類傳', 'B') + ' %. Aucune source n’est « la source bouddhique » ou « la source taoïste ».');
}

// ---------- 逐月統計：本版本每個月有多少個日期條目 ----------
// 「條目」指原書以農曆日期為單位列出的記載，一個日期可能包含多項宗教事件；同一日期幾條只算一個。只數有具體月日的條目，「每月」「六十甲子日」等不計
function monthCount(root, D, data) {
  var meta = (data && data.meta) || {}, seen = {}, cnt = []; for (var i = 0; i < 12; i++) cnt[i] = 0;
  (D.all || []).forEach(function (e) { if (!(e.m >= 1 && e.m <= 12 && e.d >= 1)) return; var k = e.range || (e.m + '/' + e.d); if (seen[k]) return; seen[k] = 1; cnt[e.m - 1]++; });   // 多日齋期（如正月初八至十五）按一條計，記在起始月
  var tot = cnt.reduce(function (a, b) { return a + b; }, 0);
  if (!tot) return;
  var sec = document.createElement('section'); sec.className = 'zr-sec'; sec.id = 'r-month';
  sec.innerHTML = '<div class="zr-eyebrow">' + L('逐月統計', 'Month by month', 'Mois par mois') + '</div><h2 style="margin:0">' + L('每個月有多少個日期條目', 'How many dated entries in each month', 'Combien d’entrées datées par mois') + '</h2>' +
    '<p class="zr-lede">' + L('本版本逐月核算，共有 ' + tot + ' 個日期條目。這裡的「條目」指原書以農曆日期為單位列出的記載，一個日期可能包含多項宗教事件；同一日期幾條只算一個，多日齋期按一條計。「每月」「六十甲子日」等沒有具體月日的不計' + (meta.undated ? '（本版本有 ' + meta.undated + ' 條）' : '') + '。',
      'Counted month by month, this edition has ' + tot + ' dated entries. An “entry” is a record the original lists under a lunar date; one date may carry several religious events, and several records on the same date count once, and a multi-day fast counts as one. Entries without a specific month and day (“every month”, the sixty jiazi days) are not counted' + (meta.undated ? ' (' + meta.undated + ' in this edition)' : '') + '.',
      'Comptée mois par mois, cette édition compte ' + tot + ' entrées datées. Une « entrée » est un article que l’original place sous une date lunaire ; une date peut porter plusieurs événements religieux, et plusieurs articles à la même date comptent une fois, et un jeûne de plusieurs jours compte pour un. Les entrées sans mois ni jour précis (« chaque mois », les soixante jours du cycle) ne sont pas comptées' + (meta.undated ? ' (' + meta.undated + ' dans cette édition)' : '') + '.') + '</p>' +
    '<div class="zr-sharew"><table class="zr-sharet zr-monthc"><thead><tr><th class="l">' + L('月份', 'Month', 'Mois') + '</th><th>' + L('日期條目數', 'Dated entries', 'Entrées datées') + '</th></tr></thead><tbody>' +
    cnt.map(function (n, i) { return '<tr><td class="l">' + monthLabel(i + 1) + '</td><td>' + n + '</td></tr>'; }).join('') +
    '<tr class="med"><td class="l">' + L('合計', 'Total', 'Total') + '</td><td>' + tot + '</td></tr></tbody></table></div>' +
    '<p class="zr-muted-s">' + L('資料來源：', 'Source: ', 'Source : ') + (meta.editionHtml || esc(meta.edition || '')) + (meta.sourceFile ? L('；源表 ', '; table ', ' ; table ') + esc(meta.sourceFile) : '') + '。</p>';
  root.appendChild(sec);
}
// ---------- 每月各日 ----------
// 默認不顯示十齋日、六齋日（六齋日都在十齋日之內），只比較其餘二十天；可切換爲含全部三十天。選擇在切換版本後保留
var DOM_ALL = false;
function dom(root, D) {
  var sec = document.createElement('section'); sec.className = 'zr-sec'; sec.id = 'r-dom';
  sec.innerHTML = '<div class="zr-eyebrow">' + L('檢驗 · 週期齋戒的底層節奏', 'Test · the underlying rhythm of periodic fasting') + '</div><h2 style="margin:0">' + L('每月第幾日最擁擠', 'Which day of the month is most crowded') + '</h2><p class="zr-lede"></p>' +
    '<div class="zr-chart"><svg viewBox="0 0 960 300" role="img"></svg></div><p class="zr-finding"></p>';
  root.appendChild(sec);
  var S = sec.querySelector('svg'), lede = sec.querySelector('.zr-lede'), fd = sec.querySelector('.zr-finding'), cnt = []; for (var i = 0; i <= 30; i++) cnt[i] = 0;
  // 只數有具體月日的神聖日條目（神誕、下降、成道等）；十齋日、六齋日這類「每月某日」的週期齋規則沒有具體月份，本來就不計入，
  // 所以十齋日當天的神誕照常計入，不清零。跨多日的齋期（如九皇齋）也不計入。
  D.daily.forEach(function (r) { cnt[r.d]++; });
  function draw() {
    while (S.firstChild) S.removeChild(S.firstChild);
    var days = []; for (var d = 1; d <= 30; d++) days.push(d);
    var tot = days.reduce(function (s, d) { return s + cnt[d]; }, 0), avg = tot / 30;
    var mx = Math.max.apply(null, days.map(function (d) { return cnt[d]; })), max = Math.ceil((mx + 2) / 5) * 5;
    var W = 960, H = 300, ml = 36, mr = 8, mt = 28, mb = 44, bw = (W - ml - mr) / 30;
    function y(v) { return mt + (H - mt - mb) * (1 - v / max); }
    lede.textContent = L('三十根柱子是一月三十日，柱高是這一天有具體月日的神聖日條目數（十二個月合計）。十齋日、六齋日是每月重複的週期齋，不屬於任何神聖日，本身不計入；落在這些日子的神誕照常計入。日期用泥金標十齋日、石青短線標六齋日；朱色是高於平均的日子，虛線是平均值。',
      'Thirty bars for the thirty days of a lunar month; each bar counts the sacred-day entries with a specific month and day on that day (twelve months together). The ten and six fast days are monthly periodic fasts, not sacred days of any deity, so they are not counted themselves; deity days falling on them are counted as usual. Ten fast days are marked in gold on the date axis and six fast days with a blue underline; days above average are in vermilion; the dashed line is the average.',
      'Trente barres pour les trente jours du mois lunaire ; chaque barre compte les entrées de jours sacrés datées au mois et au jour près ce jour-là (les douze mois ensemble). Les dix et six jours de jeûne sont des jeûnes périodiques mensuels, non des jours sacrés d’une divinité : ils ne sont pas comptés eux-mêmes ; les jours divins qui y tombent sont comptés normalement. Les dix jours de jeûne sont marqués en or sur l’axe des dates et les six jours d’un trait bleu ; les jours au-dessus de la moyenne sont en vermillon ; la ligne pointillée est la moyenne.');
    S.setAttribute('aria-label', L('每月各日的神聖日條目數', 'Sacred-day entries per day of the month', 'Entrées de jours sacrés par jour du mois'));
    for (var v = 0; v <= max; v += max > 20 ? 10 : 5) {
      svgEl('line', { x1: ml, x2: W - mr, y1: y(v), y2: y(v), stroke: 'var(--zr-line)' }, S);
      svgEl('text', { x: ml - 8, y: y(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--zr-muted)' }, S).textContent = v;
    }
    for (var dd = 1; dd <= 30; dd++) (function (d) {
      var k = d - 1, on = D.TEN.indexOf(d) >= 0, six = D.SIX.indexOf(d) >= 0;
      var n = cnt[d], up = n > avg, x = ml + k * bw + 3, w = bw - 6, top = y(n), rr = Math.min(3, w / 2, y(0) - top);
      svgEl('path', { d: 'M' + x + ',' + y(0) + 'V' + (top + rr) + 'Q' + x + ',' + top + ' ' + (x + rr) + ',' + top + 'H' + (x + w - rr) + 'Q' + (x + w) + ',' + top + ' ' + (x + w) + ',' + (top + rr) + 'V' + y(0) + 'Z', fill: up ? 'var(--zr-hi)' : 'var(--zr-wei)' }, S);
      var hit = svgEl('rect', { x: ml + k * bw, y: mt, width: bw, height: H - mt - mb, fill: 'transparent' }, S);
      hit.addEventListener('pointermove', function (ev) { showTip(ev, '<b>' + L(DN(d), 'Day ' + d, 'Jour ' + d) + '</b> · ' + nEntries(n) + (up ? L(' · 高於平均', ' · above average', ' · au-dessus de la moyenne') : '') + (on || six ? ' · ' + fastLab(D, d) : '')); });
      hit.addEventListener('pointerleave', hideTip);
      svgEl('text', { x: ml + (k + 0.5) * bw, y: H - mb + 18, 'text-anchor': 'middle', 'font-size': 12, fill: on ? 'var(--zr-gold)' : 'var(--zr-muted)', 'font-weight': on ? 700 : 400 }, S).textContent = DN(d).replace('初', '');
      if (six) svgEl('rect', { x: ml + (k + 0.5) * bw - 7, y: H - mb + 25, width: 14, height: 3, rx: 1.5, fill: 'var(--zr-six-ink)' }, S);
      svgEl('text', { x: ml + (k + 0.5) * bw, y: top - 7, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--zr-ink)' }, S).textContent = n;
    })(dd);
    svgEl('line', { x1: ml, x2: W - mr, y1: y(avg), y2: y(avg), stroke: 'var(--zr-muted)', 'stroke-dasharray': '3 4' }, S);
    svgEl('text', { x: W - mr, y: y(avg) - 6, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--zr-muted)' }, S).textContent = L('平均 ', 'average ', 'moyenne ') + avg.toFixed(1);
    // 結論文字按數據自動生成：最擁擠的三天、遠高於平均的日子，以及其中有幾天是十齋日
    var ord = days.slice().sort(function (a, b) { return cnt[b] - cnt[a] || a - b; }), top3 = ord.slice(0, 3), hi = days.filter(function (d) { return cnt[d] > avg * 1.3; });
    var hiTen = hi.filter(function (d) { return D.TEN.indexOf(d) >= 0; });
    fd.textContent = L('全月共 ' + tot + ' 條，平均每天 ' + avg.toFixed(1) + ' 條。最擁擠的是' + top3.map(function (d) { return DN(d) + '（' + cnt[d] + ' 條）'; }).join('、') + '。' + (hi.length ? '遠高於平均（超過平均 1.3 倍）的有 ' + hi.length + ' 天：' + hi.map(DN).join('、') + '；其中 ' + hiTen.length + ' 天是十齋日。' : '沒有遠高於平均的日子。'),
      'The month carries ' + tot + ' entries, ' + avg.toFixed(1) + ' a day on average. The most crowded are days ' + top3.map(function (d) { return d + ' (' + cnt[d] + ')'; }).join(', ') + '. ' + (hi.length ? hi.length + ' days are well above average (over 1.3 times): ' + hi.join(', ') + '; ' + hiTen.length + ' of them are ten fast days.' : 'No day is well above average.'),
      'Le mois porte ' + tot + ' entrées, soit ' + avg.toFixed(1) + ' par jour en moyenne. Les plus chargés sont les jours ' + top3.map(function (d) { return d + ' (' + cnt[d] + ')'; }).join(', ') + '. ' + (hi.length ? hi.length + ' jours sont nettement au-dessus de la moyenne (plus de 1,3 fois) : ' + hi.join(', ') + ' ; ' + hiTen.length + ' d’entre eux sont des dix jours de jeûne.' : 'Aucun jour n’est nettement au-dessus de la moyenne.'));
  }
  draw();
}

// ---------- 齋期總長：每年、每月有多少神聖日 ----------
// 齋曆整體就是持齋日程，凡能排入月日的神聖日都計入；每月週期、多日齋期展開到 12 個月 × 30 日，同一天多條只算一天
// 按編碼日期類型分色；每天只算一次，同一天兼有幾類的合成一段「兼類」（斜線紋），懸停列出各組合（如「誕辰/下降」）的天數。數據由頁面傳入：meta.rules（本版本）、meta.ruleAll（各版本彙總）
var RK = ['T', 'B', 'D', 'L', 'A', 'C', 'H', 'V', 'Q', 'U'];
var RTAB = 'sm';
// 數據裏的鍵是單一類型（T）或組合（T/L）；畫圖時單一類型各成一段，組合全部併入「兼類」MIX
var MIX_CSS = 'repeating-linear-gradient(135deg,var(--zr-ink-2) 0 1.5px,var(--zr-cell) 1.5px 4.5px)';
function rkLab(k) { return k === 'MIX' ? L('兼類', 'Several types', 'Plusieurs types') : k.split('/').map(trLab).join('/'); }
function rkCss(k) { return k === 'MIX' ? MIX_CSS : 'var(' + TR[k].c + ')'; }
function rkAgg(o) {   // → { keys: [單類…, 'MIX'], v: {鍵: 天數}, combos: [[組合, 天數]…] }
  var v = {}, combos = [];
  Object.keys(o).forEach(function (k) { if (!o[k]) return; if (k.indexOf('/') < 0) v[k] = (v[k] || 0) + o[k]; else { v.MIX = (v.MIX || 0) + o[k]; combos.push([k, o[k]]); } });
  combos.sort(function (a, b) { return b[1] - a[1]; });
  return { keys: RK.filter(function (k) { return v[k]; }).concat(v.MIX ? ['MIX'] : []), v: v, combos: combos };
}
function rkTip(a, k) { return k !== 'MIX' ? rkLab(k) + L('：' + a.v[k] + ' 天', ': ' + a.v[k] + ' days', ' : ' + a.v[k] + ' jours') :
  rkLab('MIX') + L('：' + a.v.MIX + ' 天', ': ' + a.v.MIX + ' days', ' : ' + a.v.MIX + ' jours') + a.combos.map(function (c) { return '<br>' + rkLab(c[0]) + ' ' + c[1]; }).join(''); }
function rtLab(t) { return t === 'month' ? L('每月週期', 'Monthly cycles', 'Cycles mensuels') : t === 'range' ? L('多日齋期', 'Multi-day fasts', 'Jeûnes de plusieurs jours') : t === 'year' ? L('年度定日', 'Fixed annual days', 'Jours annuels fixes') : L('不能排入月日', 'Not placeable on a month-day', 'Non plaçables sur un jour du mois'); }
function fastRules(root, D, data) {
  var meta = data.meta || {}, rules = meta.rules || [], all = meta.ruleAll || [];
  if (!rules.length || !all.length) return;
  var cur = all.filter(function (x) { return x.no === meta.no; })[0];
  if (!cur) return;
  all = all.filter(function (x) { return !x.excl || x === cur; });   // 暫不計入計算的版本（excl）不參與比較；只在看它自己時列出，並不計入中位數
  var pool = all.filter(function (x) { return !x.excl; });
  var used = RK.filter(function (k) { return all.some(function (x) { return Object.keys(x.seg).some(function (c) { return c.split('/').indexOf(k) >= 0; }); }); });
  var sec = document.createElement('section'); sec.className = 'zr-sec'; sec.id = 'r-total';
  var mdays = cur.mon.map(function (o) { return Object.keys(o).reduce(function (s, k) { return s + o[k]; }, 0); });
  var top = mdays.indexOf(Math.max.apply(null, mdays)) + 1, nNone = rules.filter(function (x) { return x.type === 'none'; }).length;
  var tile = function (n, a, b) { return '<div><b>' + n + '</b><span>' + a + (b ? '<br>' + b : '') + '</span></div>'; };
  var key = '<div class="zr-legend zr-rulekey">' + used.map(function (k) { return '<span><i class="zr-sw" style="background:' + rkCss(k) + '"></i>' + rkLab(k) + '</span>'; }).join('') +
    '<span><i class="zr-sw" style="background:' + MIX_CSS + '"></i>' + L('兼類：一天兼有幾類（懸停看組合）', 'Several types on one day (hover for the combinations)', 'Plusieurs types le même jour (survoler pour les combinaisons)') + '</span></div>';
  sec.innerHTML = '<div class="zr-eyebrow">' + L('齋期總長', 'Total fasting time', 'Durée totale du jeûne') + '</div><h2 style="margin:0">' + L('每月、每年有多少神聖日：各版本對比', 'How many sacred days a month and a year: editions compared', 'Combien de jours sacrés par mois et par an : comparaison des éditions') + '</h2>' +
    '<p class="zr-lede">' + L('齋曆整體是一份持齋日程，推薦持齋常寫在序言裏，不逐日標註，所以這裏凡能排入月日的神聖日都計入。每月週期（如十齋日）和多日齋期（如九皇齋）展開到十二個月、每月三十日上；同一天有幾條也只算一天。十齋日・六齋日性質相同，合爲一類；它們是不針對神明的週期齋日，不算神聖日，單獨列出（「北斗下降之辰」雖落在六齋日上，工作簿編爲下降，仍算神聖日）。環形圖把全年 360 天按類型分段，每天只算一次：只有一類神聖日的歸該類，兩類以上同日的歸「兼類」，再加只有十齋日・六齋日、都沒有的日子。下面的橫條是各類型單獨計算佔全年多少（可重疊）。下面各標籤頁的顏色是工作簿編碼的日期類型；同一天兼有幾類的合成一段「兼類」（斜線紋），懸停可見各組合的天數。六十甲子日、八節等日期隨年份或節氣而變，不計入。',
      'A fasting calendar as a whole is a schedule for fasting; the recommendation to fast usually sits in the preface rather than under each day, so every sacred day that can be placed on a month-day is counted here. Monthly cycles (such as the ten fast days) and multi-day fasts (such as the Nine Emperors fast) are laid out over twelve thirty-day months, and a day with several entries counts once. The ten and six fast days are of the same nature and form one group; they are periodic fasts not addressed to a deity, so they are not counted as sacred days and are listed separately (the “descent of the Northern Dipper”, though it falls on the six fast days, is coded as descent in the workbook and stays a sacred day). The ring chart divides the 360-day year by type, each day counted once: a day with one type of sacred day goes to that type, a day with two or more to “several types”, plus days with only ten/six fast days and days with neither. The bars below show how much of the year each type covers on its own (overlapping). In the tabs below, colours are the workbook’s coded day types; days of several types are drawn together as one hatched “several types” segment, with the combinations listed on hover. The sixty-day jiazi cycle, the eight nodal days and the like shift with the year or solar terms and are not counted.',
      'Un calendrier de jeûne est dans son ensemble un programme de jeûne ; la recommandation de jeûner figure d’ordinaire dans la préface plutôt que sous chaque jour, si bien que tout jour sacré plaçable sur un jour du mois est compté. Les cycles mensuels (dix jours de jeûne, par ex.) et les jeûnes de plusieurs jours (Neuf Empereurs, par ex.) sont reportés sur douze mois de trente jours ; un jour portant plusieurs entrées ne compte qu’une fois. Les dix et six jours de jeûne sont de même nature et forment un seul groupe ; jeûnes périodiques qui ne s’adressent à aucune divinité, ils ne sont pas comptés comme jours sacrés et sont donnés à part (la « descente de la Grande Ourse », bien que tombant sur les six jours de jeûne, est codée descente dans le classeur et reste un jour sacré). L’anneau divise les 360 jours par type, chaque jour compté une fois : un jour portant un seul type de jour sacré va à ce type, un jour de deux types ou plus à « plusieurs types », plus les jours de seuls dix/six jours de jeûne et les jours sans rien. Les barres ci-dessous montrent la part de l’année couverte par chaque type pris à part (avec recouvrements). Dans les onglets ci-dessous, les couleurs sont les types de jour codés du classeur ; les jours de plusieurs types forment un segment hachuré « plusieurs types », les combinaisons s’affichant au survol. Le cycle sexagésimal, les huit nœuds, etc., varient selon l’année ou les termes solaires et ne sont pas comptés.') + '</p>' +
    '<div class="zr-pie"><svg viewBox="0 0 240 240" role="img" aria-label="' + L('全年 360 天按日期類型劃分', 'The 360-day year by day type', 'Les 360 jours de l’année par type de jour') + '"></svg><div class="zr-piekey"></div></div><div class="zr-cov"></div>' + key +
    '<div class="zr-tabs" role="tablist">' + [['sm', L('小倍數：各版本的一年', 'Small multiples: each edition’s year', 'Petits multiples : l’année de chaque édition')], ['bars', L('全年天數：各版本', 'Days a year: all editions', 'Jours par an : toutes les éditions')], ['month', L('每月：本版本', 'Per month: this edition', 'Par mois : cette édition')], ['share', L('類型佔比：各版本', 'Type shares: all editions', 'Parts des types : toutes les éditions')], ['many', L('一神多日', 'One deity, many days', 'Une divinité, plusieurs jours')]].map(function (t) { return '<button type="button" role="tab" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
    '<div class="zr-tabp" data-p="sm"></div><div class="zr-tabp" data-p="bars"><p class="zr-muted-s" style="margin:0 0 6px">' + L('點一個版本換到它的環形曆。', 'Click an edition to switch to its ring calendar.', 'Cliquer une édition pour afficher son calendrier circulaire.') + '</p><div class="zr-edbars"></div></div>' +
    '<div class="zr-tabp" data-p="month">' + '<p class="zr-muted-s" style="margin:0 0 6px">' + L('橫線是各版本該月天數的中位數。', 'The short line marks the median across editions for that month.', 'Le trait marque la médiane des éditions pour ce mois.') + '</p>' +
    '<div class="zr-chart"><svg viewBox="0 0 960 280" role="img" aria-label="' + L('本版本每月神聖日天數，按日期類型分段', 'Sacred days per month in this edition, by day type', 'Jours sacrés par mois dans cette édition, par type de jour') + '"></svg></div></div><div class="zr-tabp" data-p="share"></div><div class="zr-tabp" data-p="many"></div>' +
    '<div class="zr-rulelist"></div>';
  root.appendChild(sec);
  // 環形圖：全年 360 天按類型劃分，每天只算一次 = 各類「只有此類」的天數 + 兼類（一天有兩類以上）+ 只有十齋日・六齋日 + 兩者皆無；中間是全年有神聖日或十齋日・六齋日的天數
  // （2026-11-11 研究者要求：環形圖畫各類型佔全年多少，不再畫「只有神聖日／只有十齋六齋」）
  // 右側列出各段天數與比例；下方「各類型佔全年多少」每類單獨計算（可重疊），十齋日・六齋日單列一行
  var SH = cur.share, TSL = L('十齋日・六齋日', 'Ten/six fast days', 'Dix/six jours de jeûne');
  (function () {
    var P = sec.querySelector('.zr-pie svg');
    var nOnly = 0, segs = RK.filter(function (k) { return SH.only[k]; }).map(function (k) { nOnly += SH.only[k]; return [k, SH.only[k]]; });
    segs = segs.concat([['MIX', SH.sac - nOnly], ['F', SH.f - SH.fs], ['NONE', Math.max(0, 360 - cur.tot)]]).filter(function (x) { return x[1] > 0; });
    var pd = svgEl('defs', {}, P), pid = 'zr-phatch-' + (++FAST_UID), pp = svgEl('pattern', { id: pid, width: 4.5, height: 4.5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, pd);
    svgEl('rect', { width: 4.5, height: 4.5, fill: 'var(--zr-cell)' }, pp); svgEl('rect', { width: 1.5, height: 4.5, fill: 'var(--zr-ink-2)' }, pp);   // 兼類：與圖例 MIX_CSS 同樣的斜紋
    var fill = function (k) { return k === 'MIX' ? 'url(#' + pid + ')' : k === 'F' ? 'var(--zr-gold)' : k === 'NONE' ? 'var(--zr-line)' : rkCss(k); };
    var css = function (k) { return k === 'MIX' ? MIX_CSS : fill(k); };
    var lab = function (k) {
      return k === 'MIX' ? L('兼類：一天有兩類以上', 'Several types on one day', 'Plusieurs types le même jour') : k === 'F' ? L('只有十齋日・六齋日', 'Ten/six fast days only', 'Dix/six jours de jeûne seulement') :
        k === 'NONE' ? L('都沒有', 'None', 'Aucun') : L('只有', '', '') + rkLab(k) + L('', ' only', ' seulement');
    };
    var mixTip = function () {   // 兼類的組合：哪幾類同一天
      var c = {}, M = SH.mix || {}; Object.keys(M).forEach(function (k) { c[k.split('/').map(rkLab).join('＋')] = M[k]; });
      var ks = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; });
      return ks.length ? '<br>' + ks.slice(0, 8).map(function (k) { return esc(k) + ' ' + c[k]; }).join('<br>') + (ks.length > 8 ? '<br>…' : '') : '';
    };
    var tipOf = function (k, n) { return '<b>' + lab(k) + L('：' + n + ' 天', ': ' + n + ' days', ' : ' + n + ' jours') + '</b>' + L('（全年 ' + Math.round(n / 3.6) + '%）', ' (' + Math.round(n / 3.6) + '% of the year)', ' (' + Math.round(n / 3.6) + ' % de l’année)') +
      (k !== 'F' && k !== 'NONE' && SH.sac ? '<br>' + L('佔神聖日 ' + Math.round(n * 100 / SH.sac) + '%', Math.round(n * 100 / SH.sac) + '% of the sacred days', Math.round(n * 100 / SH.sac) + ' % des jours sacrés') : '') + (k === 'MIX' ? mixTip() : ''); };
    var cx = 120, cy = 120, R = 112, r0 = 70, ang = -Math.PI / 2;
    segs.forEach(function (sg) {
      var k = sg[0], n = sg[1], t = n / 360 * Math.PI * 2, a1 = ang, a2 = ang + t, big = t > Math.PI ? 1 : 0;
      var pt = function (rr, q) { return (cx + rr * Math.cos(q)).toFixed(2) + ',' + (cy + rr * Math.sin(q)).toFixed(2); };
      var d = t >= Math.PI * 2 - 1e-6 ? 'M' + pt(R, 0) + 'A' + R + ',' + R + ' 0 1,1 ' + pt(R, Math.PI) + 'A' + R + ',' + R + ' 0 1,1 ' + pt(R, 0) + 'M' + pt(r0, 0) + 'A' + r0 + ',' + r0 + ' 0 1,0 ' + pt(r0, Math.PI) + 'A' + r0 + ',' + r0 + ' 0 1,0 ' + pt(r0, 0) + 'Z'
        : 'M' + pt(R, a1) + 'A' + R + ',' + R + ' 0 ' + big + ',1 ' + pt(R, a2) + 'L' + pt(r0, a2) + 'A' + r0 + ',' + r0 + ' 0 ' + big + ',0 ' + pt(r0, a1) + 'Z';
      var el = svgEl('path', { d: d, fill: fill(k), stroke: 'var(--zr-bg, var(--page))', 'stroke-width': 1.5 }, P);
      el.addEventListener('pointermove', function (ev) { showTip(ev, tipOf(k, n)); });
      el.addEventListener('pointerleave', hideTip);
      ang = a2;
    });
    svgEl('text', { x: cx, y: cy + 4, 'text-anchor': 'middle', 'font-size': 34, 'font-weight': 700, fill: 'var(--zr-ink)' }, P).textContent = cur.tot;
    svgEl('text', { x: cx, y: cy + 26, 'text-anchor': 'middle', 'font-size': 13, fill: 'var(--zr-muted)' }, P).textContent = L('天 · 全年 ' + Math.round(cur.tot / 3.6) + '%', 'days · ' + Math.round(cur.tot / 3.6) + '% of 360', 'jours · ' + Math.round(cur.tot / 3.6) + ' % de 360');
    var kb = sec.querySelector('.zr-piekey');
    kb.innerHTML = '<ul>' + segs.map(function (sg) {
      return '<li data-k="' + sg[0] + '"><i class="zr-sw" style="background:' + css(sg[0]) + '"></i><span class="zr-pk">' + lab(sg[0]) + '</span><b>' + sg[1] + '</b><span class="zr-pp">' + Math.round(sg[1] / 3.6) + '%</span></li>';
    }).join('') + '</ul><p class="zr-muted-s">' + L('全年 360 天每天只算一次：只有一類神聖日的歸該類，兩類以上同日的歸「兼類」（懸停看組合）；神聖日落在十齋日・六齋日上的照神聖日的類型算。神聖日共 ' + SH.sac + ' 天，十齋日・六齋日共 ' + SH.f + ' 天，其中 ' + SH.fs + ' 天重合，合計 ' + cur.tot + ' 天。平均每月 ' + (cur.tot / 12).toFixed(1) + ' 天；最多的是' + monthLabel(top) + '（' + mdays[top - 1] + ' 天）；另有 ' + nNone + ' 條不能排入月日，不計入。',
      'Each of the 360 days counts once: a day with one type of sacred day goes to that type, a day with two or more to “several types” (hover for the combinations); sacred days falling on ten/six fast days count under their own type. ' + SH.sac + ' sacred days and ' + SH.f + ' ten/six fast days, ' + SH.fs + ' of them on the same day: ' + cur.tot + ' days in all. ' + (cur.tot / 12).toFixed(1) + ' days a month on average; most in month ' + top + ' (' + mdays[top - 1] + ' days); ' + nNone + ' entries cannot be placed on a month-day and are not counted.',
      'Chacun des 360 jours compte une fois : un jour portant un seul type de jour sacré va à ce type, un jour de deux types ou plus à « plusieurs types » (survoler pour les combinaisons) ; les jours sacrés tombant sur les dix/six jours de jeûne comptent sous leur propre type. ' + SH.sac + ' jours sacrés et ' + SH.f + ' dix/six jours de jeûne, dont ' + SH.fs + ' le même jour : ' + cur.tot + ' jours en tout. ' + (cur.tot / 12).toFixed(1) + ' jours par mois en moyenne ; le plus au mois ' + top + ' (' + mdays[top - 1] + ' jours) ; ' + nNone + ' entrées non plaçables sur un jour du mois, non comptées.') + '</p>';
    kb.querySelectorAll('li').forEach(function (li) {
      var k = li.getAttribute('data-k'), n = segs.filter(function (x) { return x[0] === k; })[0][1];
      li.addEventListener('pointermove', function (ev) { showTip(ev, tipOf(k, n)); });
      li.addEventListener('pointerleave', hideTip);
    });
  })();
  // 各類型佔全年多少：每類單獨計算有此類神聖日的天數，橫條按 360 天；實心＝只有此類，淺色＝與其他類同日。十齋日・六齋日單列，淺色＝同時是神聖日
  var pc = function (n, d) { return d ? Math.round(n * 100 / d) + '%' : '—'; };
  (function () {
    var box = sec.querySelector('.zr-cov'), ks = RK.filter(function (k) { return SH.cov[k]; });
    var row = function (lab, sw, n, solo, tip, extra, cls) {
      return '<div class="zr-covrow' + (cls ? ' ' + cls : '') + '" data-tip="' + esc(tip) + '"><span class="zr-covl"><i class="zr-sw" style="background:' + sw + '"></i>' + lab + '</span>' +
        '<span class="zr-covt"><span class="zr-covb" style="width:' + (n / 360 * 100).toFixed(2) + '%"><i style="flex:' + solo + ';background:' + sw + '"></i><i class="sh" style="flex:' + (n - solo) + ';background:' + sw + '"></i></span></span>' +
        '<span class="zr-covn"><b>' + n + '</b>' + L(' 天', ' d', ' j') + ' · ' + L('全年 ', '', '') + pc(n, 360) + extra + '</span></div>';
    };
    var h = ks.map(function (k) {
      var n = SH.cov[k], o = SH.only[k] || 0, f = SH.tf[k] || 0;
      return row(rkLab(k), rkCss(k), n, o, '<b>' + rkLab(k) + L('：' + n + ' 天', ': ' + n + ' days', ' : ' + n + ' jours') + '</b><br>' +
        L('佔全年 ' + pc(n, 360) + '；佔神聖日 ' + pc(n, SH.sac), pc(n, 360) + ' of the year; ' + pc(n, SH.sac) + ' of the sacred days', pc(n, 360) + ' de l’année ; ' + pc(n, SH.sac) + ' des jours sacrés') + '<br>' +
        L('只有此類 ' + o + ' 天；與其他類同日 ' + (n - o) + ' 天', 'this type only: ' + o + ' days; shared with other types: ' + (n - o) + ' days', 'ce type seul : ' + o + ' jours ; partagés avec d’autres types : ' + (n - o) + ' jours') + '<br>' +
        L('其中 ' + f + ' 天同時是十齋日・六齋日', f + ' of them are also ten/six fast days', 'dont ' + f + ' sont aussi des dix/six jours de jeûne'),
        ' · ' + L('神聖日的 ', '', '') + pc(n, SH.sac) + L('', ' of sacred', ' des jours sacrés'));
    }).join('');
    if (!ks.length) h = '<p class="zr-muted-s">' + L('本版本沒有十齋日・六齋日以外的神聖日。', 'This edition has no sacred days besides the ten/six fast days.', 'Cette édition n’a pas de jours sacrés en dehors des dix/six jours de jeûne.') + '</p>';
    if (SH.f) h += row(TSL, 'var(--zr-gold)', SH.f, SH.f - SH.fs, '<b>' + TSL + L('：' + SH.f + ' 天', ': ' + SH.f + ' days', ' : ' + SH.f + ' jours') + '</b><br>' + L('佔全年 ' + pc(SH.f, 360) + '；不算神聖日', pc(SH.f, 360) + ' of the year; not counted as sacred days', pc(SH.f, 360) + ' de l’année ; non comptés comme jours sacrés') + '<br>' +
      L('只有十齋日・六齋日 ' + (SH.f - SH.fs) + ' 天；同時是神聖日 ' + SH.fs + ' 天', 'ten/six fast days only: ' + (SH.f - SH.fs) + ' days; also sacred days: ' + SH.fs + ' days', 'dix/six jours seulement : ' + (SH.f - SH.fs) + ' jours ; aussi jours sacrés : ' + SH.fs + ' jours'),
      ' · ' + L('其中 ' + SH.fs + ' 天同時是神聖日', SH.fs + ' also sacred', 'dont ' + SH.fs + ' aussi sacrés'), 'ts');
    box.innerHTML = '<h3 class="zr-subh">' + L('各類型佔全年多少', 'How much of the year each type covers', 'Part de l’année couverte par chaque type') + '</h3>' +
      '<p class="zr-muted-s" style="margin:0 0 6px">' + L('每類單獨計算有這類神聖日的天數，橫條長度按全年 360 天。一天兼有幾類時各類都算，所以各行相加會超過神聖日總數（' + SH.sac + ' 天）；總數本身每天只算一次。實心是只有這一類的日子，淺色是與其他類同一天的日子。十齋日・六齋日不算神聖日，列在最後一行，淺色是同時是神聖日的日子。',
        'Each type is counted on its own: the days carrying a sacred day of that type, with bars scaled to the 360-day year. A day of several types counts for each, so the rows add up to more than the ' + SH.sac + ' sacred days; that total counts each day once. The solid part is days of this type only, the light part days shared with other types. The ten/six fast days are not sacred days and come last; their light part is days that are also sacred days.',
        'Chaque type est compté à part : les jours portant un jour sacré de ce type, barres à l’échelle des 360 jours. Un jour de plusieurs types compte pour chacun, si bien que les lignes dépassent ensemble les ' + SH.sac + ' jours sacrés ; ce total compte chaque jour une fois. La partie pleine correspond aux jours de ce seul type, la partie claire aux jours partagés avec d’autres types. Les dix/six jours de jeûne ne sont pas des jours sacrés et viennent en dernier ; leur partie claire correspond aux jours qui sont aussi des jours sacrés.') + '</p>' + h;
    box.addEventListener('pointermove', function (ev) { var i = ev.target.closest('[data-tip]'); if (i) showTip(ev, i.getAttribute('data-tip')); else hideTip(); });
    box.addEventListener('pointerleave', hideTip);
  })();
  // 類型佔比：各版本。每格是有此類神聖日的天數與佔全年的比例（可重疊）；十齋日・六齋日單列
  (function () {
    var ks = RK.filter(function (k) { return all.some(function (x) { return x.share.cov[k]; }); }), prev = false;
    var th = '<th class="l">' + L('版本', 'Edition', 'Édition') + '</th><th>' + L('神聖日', 'Sacred days', 'Jours sacrés') + '</th>' + ks.map(function (k) { return '<th><i class="zr-sw" style="background:' + rkCss(k) + '"></i>' + rkLab(k) + '</th>'; }).join('') + '<th><i class="zr-sw" style="background:var(--zr-gold)"></i>' + TSL + '</th>';
    var cell = function (n) { return n ? n + '<small>' + pc(n, 360) + '</small>' : '<span class="zr-muted-s">–</span>'; };
    var rows = all.map(function (x) {
      var sep = x.solo && !prev ? '<tr class="sep"><td colspan="' + (ks.length + 3) + '">' + L('專門單獨齋期', 'Standalone fast calendars', 'Calendriers de jeûne autonomes') + '</td></tr>' : '';
      prev = x.solo;
      return sep + '<tr' + (x === cur ? ' class="on"' : '') + '><td class="l"><a href="#ring/' + esc(x.no) + '">' + (x.labelHtml || NH(x.label)) + '</a></td><td>' + cell(x.share.sac) + '</td>' + ks.map(function (k) { return '<td>' + cell(x.share.cov[k] || 0) + '</td>'; }).join('') + '<td>' + cell(x.share.f) + '</td></tr>';
    }).join('');
    sec.querySelector('[data-p="share"]').innerHTML = '<p class="zr-muted-s" style="margin:0 0 6px">' + L('每格是有這類神聖日的天數，小字是佔全年 360 天的比例。一天兼有幾類時各類都算，所以一行中各類相加會超過「神聖日」一欄；「神聖日」本身每天只算一次，不含十齋日・六齋日。點版本名換到它的環形曆。',
      'Each cell gives the days carrying a sacred day of that type, with the share of the 360-day year in small type. A day of several types counts for each, so a row adds up to more than the “sacred days” column, which counts each day once and leaves out the ten/six fast days. Click an edition to switch to its ring calendar.',
      'Chaque case donne les jours portant un jour sacré de ce type, avec en petit la part des 360 jours. Un jour de plusieurs types compte pour chacun, si bien qu’une ligne dépasse la colonne « jours sacrés », qui compte chaque jour une fois et exclut les dix/six jours de jeûne. Cliquer une édition pour afficher son calendrier circulaire.') + '</p><div class="zr-sharew"><table class="zr-sharet"><thead><tr>' + th + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  })();
  // 標籤：小倍數／類型組合（UpSet）／全年天數；選擇在切換版本後保留
  function showTab(t) { if (['sm', 'bars', 'month', 'share', 'many'].indexOf(t) < 0) t = 'sm'; RTAB = t; sec.querySelectorAll('.zr-tabs button').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-tab') === t)); }); sec.querySelectorAll('.zr-tabp').forEach(function (p) { p.hidden = p.getAttribute('data-p') !== t; }); hideTip(); }
  sec.querySelectorAll('.zr-tabs button').forEach(function (b) { b.onclick = function () { showTab(b.getAttribute('data-tab')); }; });
  // 小倍數：每個版本一張 12 × 30 的小年格
  var smh = '', smSolo = false;
  all.forEach(function (x) {
    if (x.solo && !smSolo) smh += '<div class="zr-smsep">' + L('專門單獨齋期', 'Standalone fast calendars', 'Calendriers de jeûne autonomes') + '</div>';
    smSolo = x.solo;
    var cells = x.cells.map(function (c) { var m = Math.floor(c / 100), d = c % 100; return '<rect x="' + ((d - 1) * 4) + '" y="' + ((m - 1) * 4) + '" width="3.4" height="3.4"/>'; }).join('');
    smh += '<a class="zr-sm' + (x === cur ? ' on' : '') + '" href="#ring/' + esc(x.no) + '" title="' + esc(I18 && I18.en() ? x.label.split(' ')[0] + ' ' + I18.NT(x.label.split(' ').slice(1).join(' ')) : x.label) + '"><svg viewBox="-1 -1 122 50" aria-hidden="true"><rect x="-1" y="-1" width="122" height="50" class="zr-smbg"/><g class="zr-smc">' + cells + '</g></svg><span>' + (x.labelHtml || NH(x.label)) + ' · ' + L(x.tot + ' 天', x.tot + ' days', x.tot + ' jours') + '</span></a>';
  });
  sec.querySelector('[data-p="sm"]').innerHTML = '<p class="zr-muted-s" style="margin:0 0 8px">' + L('每張小圖是一個版本的一年：12 行是月，30 列是日，有神聖日的格子著色。十齋日這類每月週期在圖上是縱紋，多日齋期是橫條。點一張換到該版本。', 'Each tile is one edition’s year: 12 rows of months, 30 columns of days, with sacred days filled. Monthly cycles such as the ten fast days show as vertical stripes, multi-day fasts as horizontal runs. Click a tile to switch to that edition.', 'Chaque vignette est l’année d’une édition : 12 lignes de mois, 30 colonnes de jours, jours sacrés remplis. Les cycles mensuels comme les dix jours de jeûne forment des bandes verticales, les jeûnes de plusieurs jours des segments horizontaux. Cliquer une vignette pour passer à cette édition.') + '</p><div class="zr-smgrid">' + smh + '</div>';
  showTab(RTAB);
  // 每年：各版本橫條
  var mx = Math.max.apply(null, all.map(function (x) { return x.tot; })), prevSolo = false, h = '';
  all.forEach(function (x) {
    if (x.solo && !prevSolo) h += '<div class="zr-edsep">' + L('專門單獨齋期', 'Standalone fast calendars', 'Calendriers de jeûne autonomes') + '</div>';
    prevSolo = x.solo;
    var on = x === cur;
    h += '<a class="zr-edrow' + (on ? ' on' : '') + '" href="#ring/' + esc(x.no) + '"><span class="zr-edn">' + (x.labelHtml || NH(x.label)) + '</span><span class="zr-edb"><span class="zr-edbar" style="width:' + (x.tot / mx * 88).toFixed(1) + '%">' +
      (function (a) { return a.keys.map(function (k) { return '<i style="flex:' + a.v[k] + ';background:' + rkCss(k) + '" data-tip="' + esc(rkTip(a, k)) + '"></i>'; }).join(''); })(rkAgg(x.seg)) + '</span><span class="zr-edt">' + x.tot + '</span></span></a>';
  });
  var eb = sec.querySelector('.zr-edbars'); eb.innerHTML = h;
  eb.addEventListener('pointermove', function (ev) { var i = ev.target.closest('[data-tip]'); if (i) showTip(ev, i.getAttribute('data-tip')); else hideTip(); });
  eb.addEventListener('pointerleave', hideTip);
  // 每月：本版本堆疊柱 + 各版本中位數
  var S = sec.querySelector('.zr-chart svg'), HATCH = 'zr-hatch-' + (++FAST_UID), defs = svgEl('defs', {}, S), pat = svgEl('pattern', { id: HATCH, width: 4.5, height: 4.5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
  svgEl('rect', { width: 4.5, height: 4.5, fill: 'var(--zr-cell)' }, pat); svgEl('rect', { width: 1.5, height: 4.5, fill: 'var(--zr-ink-2)' }, pat);
  var W = 960, H = 280, ml = 36, mr = 8, mt = 22, mb = 34, bw = (W - ml - mr) / 12;
  var med = []; for (var m = 0; m < 12; m++) { var vs = pool.map(function (x) { return Object.keys(x.mon[m]).reduce(function (s, k) { return s + x.mon[m][k]; }, 0); }).sort(function (a, b) { return a - b; }); med.push(vs.length % 2 ? vs[(vs.length - 1) / 2] : (vs[vs.length / 2 - 1] + vs[vs.length / 2]) / 2); }
  var vmax = Math.max(30, Math.max.apply(null, mdays.concat(med))), max = Math.ceil(vmax / 5) * 5;
  function y(v) { return mt + (H - mt - mb) * (1 - v / max); }
  for (var v = 0; v <= max; v += 10) { svgEl('line', { x1: ml, x2: W - mr, y1: y(v), y2: y(v), stroke: 'var(--zr-line)' }, S); svgEl('text', { x: ml - 8, y: y(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--zr-muted)' }, S).textContent = v; }
  cur.mon.forEach(function (o, i) {
    var x = ml + i * bw + bw * 0.2, w = bw * 0.6, base = 0;
    var a = rkAgg(o);
    a.keys.forEach(function (k) { svgEl('rect', { x: x, y: y(base + a.v[k]), width: w, height: Math.max(0, y(base) - y(base + a.v[k]) - 1.5), fill: k === 'MIX' ? 'url(#' + HATCH + ')' : rkCss(k), rx: 1.5 }, S); base += a.v[k]; });
    svgEl('text', { x: x + w / 2, y: y(base) - 6, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--zr-ink)' }, S).textContent = base;
    svgEl('line', { x1: x - 6, x2: x + w + 6, y1: y(med[i]), y2: y(med[i]), stroke: 'var(--zr-ink)', 'stroke-width': 2, 'stroke-dasharray': '4 3' }, S);
    var hit = svgEl('rect', { x: ml + i * bw, y: mt, width: bw, height: H - mt - mb, fill: 'transparent' }, S);
    hit.addEventListener('pointermove', function (ev) { showTip(ev, '<b>' + monthLabel(i + 1) + '</b> · ' + L(base + ' 天', base + ' days', base + ' jours') + a.keys.map(function (k) { return '<br>' + rkTip(a, k); }).join('') + '<br>' + L('各版本中位數 ', 'Median across editions ', 'Médiane des éditions ') + med[i]); });
    hit.addEventListener('pointerleave', hideTip);
    svgEl('text', { x: ml + (i + 0.5) * bw, y: H - mb + 20, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--zr-muted)' }, S).textContent = monthLabel(i + 1);
  });
  // 規則清單：按規則形式
  function groups(type) {
    var g = {}, ord = [];
    rules.forEach(function (x) {
      if (x.type !== type) return;
      var k = x.name + '|' + (type === 'month' ? x.dy : x.id);
      if (!g[k]) { g[k] = { name: x.name, dy: x.dy, kind: x.kind, cells: {} }; ord.push(k); }
      x.cells.forEach(function (c) { g[k].cells[c] = 1; });
    });
    return ord.map(function (k) { return g[k]; });
  }
  var li = function (g) { return '<li><i class="zr-sw" style="background:' + rkCss(g.kind) + '"></i>' + NH(g.name) + (g.dy ? ' <span class="zr-muted-s">' + esc(I18 ? I18.D(g.dy) : g.dy) + '</span>' : '') + ' · ' + L(Object.keys(g.cells).length + ' 天', Object.keys(g.cells).length + ' days', Object.keys(g.cells).length + ' jours') + '</li>'; };
  var nYear = rules.filter(function (x) { return x.type === 'year'; }).length;
  sec.querySelector('.zr-rulelist').innerHTML = '<h3 class="zr-subh">' + L('本版本的規則形式', 'Rule forms in this edition', 'Formes de règle dans cette édition') + '</h3><div class="zr-rulecols">' +
    ['month', 'range'].map(function (t) { var gs = groups(t); return '<div><h4>' + rtLab(t) + ' <span class="zr-muted-s">' + L(gs.length + ' 條規則', gs.length + ' rules', gs.length + ' règles') + '</span></h4>' + (gs.length ? '<ul>' + gs.map(li).join('') + '</ul>' : '<p class="zr-muted-s">' + L('本版本沒有。', 'None in this edition.', 'Aucune dans cette édition.') + '</p>'); }).join('') +
    '<div><h4>' + rtLab('year') + ' <span class="zr-muted-s">' + L(nYear + ' 條', nYear + ' entries', nYear + ' entrées') + '</span></h4><p class="zr-muted-s" style="margin:0">' + L('逐條見上方環形曆和下方條目表。', 'See the ring above and the table below for each entry.', 'Voir le cercle ci-dessus et la table ci-dessous pour chaque entrée.') + '</p></div>' +
    '<div><h4>' + rtLab('none') + ' <span class="zr-muted-s">' + L(nNone + ' 條', nNone + ' entries', nNone + ' entrées') + '</span></h4><p class="zr-muted-s" style="margin:0">' + L('如六十甲子日、八節、三元等。', 'Such as the sixty-day jiazi cycle, the eight nodal days and the Three Primes.', 'Cycle sexagésimal, huit nœuds, Trois Origines, etc.') + '</p></div></div>';
}

// ---------- 一神多日 ----------
function strips(root, D) {
  var tab = root.querySelector('#r-total [data-p="many"]');   // 有「齋期總長」時放進它的「一神多日」標籤頁
  var sec = document.createElement(tab ? 'div' : 'section'); sec.className = tab ? 'zr-manytab' : 'zr-sec';
  sec.innerHTML = '<div class="zr-eyebrow">' + L('一神多日', 'One deity, many days') + '</div><h2 style="margin:0">' + L('同一位神，散落在一年中', 'The same deity, scattered across the year') + '</h2><p class="zr-lede">' +
    (SCHEME === 'kind' ? L('每一行是一位神明（按「建議規範名」歸組）在這一年中的全部日子：誕、成道、下降、朝真等。', 'Each row gathers all the days of one deity (grouped by the suggested normalized name) across the year: birthday, attaining the Way, descent, audience with the Perfected, etc.') : '') +
    (SCHEME === 'kind' ? '' : L('每一行是一位神明（按神明編號歸組）在這一年中的全部日子：誕、成道、下降、朝真。版本比較時，比較單位應是「神明＋事件」。',
      'Each row gathers all the days of one deity (grouped by deity code) across the year: birthday, attaining the Way, descent, audience with the Perfected. When comparing editions, the unit of comparison should be “deity + event”.')) + '</p><div class="zr-strips"></div>';
  if (tab) { sec.querySelector('.zr-eyebrow').remove(); sec.querySelector('h2').remove(); tab.appendChild(sec); } else root.appendChild(sec);
  var box = sec.querySelector('.zr-strips'), M = {};
  D.all.forEach(function (r) { if (r.god) (M[r.god] = M[r.god] || []).push(r); });
  var rows = Object.keys(M).map(function (g) { return [g, M[g]]; }).filter(function (x) { return x[1].length > 1; })
    .sort(function (a, b) { return b[1].length - a[1].length || a[1][0].m - b[1][0].m; }).slice(0, 12);
  function clean(n) { return n.replace(/(誕辰|誕|成道|下降|降|朝真|得道|飛昇|出家|成佛|諱辰|降神)$/, '').replace(/^各戶/, ''); }
  rows.forEach(function (x) {
    var g = x[0], l = x[1], row = document.createElement('div'); row.className = 'zr-strip';
    row.innerHTML = '<div class="zr-g">' + (SCHEME === 'kind' ? NH(g) + '<small>' + L(l.length + ' 日', l.length + ' days', l.length + ' jours') + '</small>' : NH(clean(l[0].name)) + '<small>' + L(l.length + ' 日', l.length + ' days', l.length + ' jours') + ' · G' + g + '</small>') + '</div>';
    var s = svgEl('svg', { viewBox: '0 0 720 30', preserveAspectRatio: 'none' }, row); box.appendChild(row);
    svgEl('line', { x1: 0, x2: 720, y1: 15, y2: 15, stroke: 'var(--zr-line)', 'vector-effect': 'non-scaling-stroke' }, s);
    for (var m = 0; m <= 12; m++) svgEl('line', { x1: m * 60, x2: m * 60, y1: 9, y2: 21, stroke: 'var(--zr-line)', 'vector-effect': 'non-scaling-stroke' }, s);
    l.forEach(function (r) {
      var px = (r.m - 1) * 60 + (r.d - 0.5) * 2;
      svgEl('rect', { x: px - 3, y: 5, width: 6, height: 20, rx: 1.5, fill: 'var(' + TR[r.p[0]].c + ')' }, s);
      var hit = svgEl('rect', { x: px - 9, y: 0, width: 18, height: 30, fill: 'transparent' }, s);
      hit.addEventListener('pointermove', function (ev) { showTip(ev, '<b>' + lunarLong(r.m, r.d) + '</b><br>' + NH(r.name) + (SUF[r.suf] ? ' · ' + SUF[r.suf] : '')); });
      hit.addEventListener('pointerleave', hideTip);
    });
  });
  var ax = document.createElement('div'); ax.className = 'zr-strip'; ax.innerHTML = '<div></div>';
  var s = svgEl('svg', { viewBox: '0 0 720 18', preserveAspectRatio: 'none', style: 'height:18px' }, ax);
  for (var m = 1; m <= 12; m++) svgEl('text', { x: (m - 0.5) * 60, y: 13, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--zr-muted)' }, s).textContent = EN() ? String(m) : MS[m];
  box.appendChild(ax);
}

// ---------- 全部條目 ----------
function table(root, D) {
  var sec = document.createElement('section'); sec.className = 'zr-sec';
  var withNotes = !D.notesOmitted;
  sec.innerHTML = '<details><summary>' + L('全部條目', 'All entries') + '</summary><div class="zr-tools"><input type="search" placeholder="' + L('搜索名稱、出處' + (withNotes ? '、附錄' : '') + '…', 'Search name, source' + (withNotes ? ', notes' : '') + ' (Chinese or pinyin)…', 'Chercher nom, source' + (withNotes ? ', notes' : '') + ' (chinois ou pinyin)…') + '" aria-label="' + L('搜索條目', 'Search entries') + '"><span class="zr-hint"></span></div>' +
    '<div class="zr-tbl"><table><thead><tr><th>' + L('日期', 'Date') + '</th><th>' + L('名稱', 'Name') + '</th><th>' + L('性質', 'Tradition') + '</th><th>' + L('出處', 'Source') + '</th><th>' + L('編號', 'Code') + '</th>' + (withNotes ? '<th>' + L('附錄', 'Notes') + '</th>' : '') + '</tr></thead><tbody></tbody></table></div></details>';
  root.appendChild(sec);
  var tb = sec.querySelector('tbody'), q = sec.querySelector('input'), qn = sec.querySelector('.zr-tools .zr-hint');
  function render() {
    var s = q.value.trim().toLowerCase(), rows = D.all.filter(function (r) { return !s || [r.name, r.src, r.note, r.code, r.nat, NTX(r.name), NTX(r.src)].join(' ').toLowerCase().indexOf(s) >= 0; });
    qn.textContent = rows.length + ' / ' + nEntries(D.all.length);
    tb.innerHTML = rows.map(function (r) { return '<tr><td>' + (r.range ? esc(r.range) : lunar(r.m, r.d)) + '</td><td>' + NH(r.name) + '</td><td>' + tradLabel(r) + '</td><td>' + (r.src ? NH(r.src) : '—') + '</td><td class="zr-mono">' + esc(r.code) + '</td>' + (withNotes ? '<td class="zr-nt">' + esc(r.note) + '</td>' : '') + '</tr>'; }).join('');
  }
  q.addEventListener('input', render); render();
}

function notes(root, data) {
  var sec = document.createElement('section'); sec.className = 'zr-sec';
  var meta = data.meta || {};
  if (SCHEME === 'kind') {
    sec.innerHTML = '<div><div class="zr-eyebrow">' + L('讀圖前提', 'Reading notes') + '</div><ul class="zr-notes">' +
      L('<li>顏色按工作簿的「編碼日期類型」：誕辰（聖誕）、成就（出家、成道、涅槃等）、下降（下降、降現、聖降等）、巡察（巡行、出遊、檢察善惡等；原文兼寫下降與考察者兩類兼標，曆盤上兩色各半）、集會（神仙集會、朝元、朝真、三元三會等，參 Goossaert 2024）、節令（臘與節辰）、諱辰、誓願（《玉歷鈔傳警世》十王立誓日）、其他；未填者爲「未標」。</li>' +
        '<li>跨日齋期（如正月初八至十五）畫成該月左側的泥金細條，不計入每日條數。</li>',
        '<li>Colours follow the workbook’s coded type of day: birthday, attainment (leaving home, attaining the Way, nirvana, etc.), descent (descents and appearances of deities), inspection (tours, outings, examining good and evil; entries that name both a descent and an inspection carry both codes and are drawn half in each colour), assembly (divine meetings, audiences such as chaoyuan 朝元, the three assemblies, etc.; cf. Goossaert 2024), seasonal festivals (la 臘 and festival days), death anniversary, vow (the vow days of the Ten Kings in the <i>Yuli chaozhuan jingshi</i>), and other; blank codes are “unmarked”.</li>' +
        '<li>Multi-day fasts (e.g. 1/8–1/15) are drawn as thin gold bars on the left of their month and are not counted in the daily totals.</li>', '<li>Les couleurs suivent le type de jour codé du classeur : anniversaire de naissance, accomplissement (sortie du monde, obtention de la Voie, nirvana, etc.), descente (descentes et apparitions des divinités), inspection (tournées, sorties, examen du bien et du mal ; les entrées qui nomment à la fois une descente et une inspection portent les deux codes et sont dessinées moitié dans chaque couleur), assemblée (réunions divines, audiences comme le chaoyuan 朝元, les trois assemblées, etc. ; cf. Goossaert 2024), fêtes saisonnières (la 臘 et jours de fête), anniversaire de la mort, vœu (jours de vœu des Dix Rois du <i>Yuli chaozhuan jingshi</i>), et autres ; les codes vides sont « non marqués ».</li>' + '<li>Les jeûnes de plusieurs jours (p. ex. 1/8–1/15) sont dessinés en fines barres dorées à gauche de leur mois et ne sont pas comptés dans les totaux journaliers.</li>') +
      (meta.undated ? L('<li>另有 ' + meta.undated + ' 條日期不是具體月日（如「每月」「六十甲子日」），未畫入曆盤，見「版本目錄和內容對照」。</li>', '<li>' + meta.undated + ' further entries have no specific month and day (e.g. “every month”, the sixty jiazi days) and are not drawn; see Editions and contents.</li>', '<li>' + meta.undated + ' autres entrées n’ont pas de mois ni de jour précis (p. ex. « chaque mois », les soixante jours du cycle) et ne sont pas dessinées ; voir Éditions et contenus.</li>') : '') +
      (meta.noText ? L('<li>此版本錄自授權數據庫，公開版不顯示原文，條目以神名或原文所標代替。</li>', '<li>This edition was transcribed from a licensed database; the public version omits the original text and shows the deity name or label instead.</li>') : '') +
      L('<li>數據：', '<li>Data: ') + (meta.editionHtml || esc(meta.edition || '')) + L('；源表 ', '; source ') + esc(meta.sourceFile || '') + L('。</li>', '.</li>') + '</ul></div>';
    root.appendChild(sec);
    return;
  }
  sec.innerHTML = '<div><div class="zr-eyebrow">' + L('讀圖前提', 'Reading notes') + '</div><ul class="zr-notes">' +
    L('<li>性質代碼 T、B、L、C 讀作道、佛、地方、儒；N、O 合爲「其他」（含義待確認）。帶 &amp; 的複合條目在曆盤上一格分內外兩半。</li>' +
      '<li>跨日齋期（如正月初八至十五、九月初一至初十）畫成該月左側的泥金細條，不計入每日條數。</li>' +
      '<li>編號後綴 A、B、D、P、S 依名稱推斷爲成道、朝真、下降、出家、諱辰。</li>',
      '<li>Tradition codes T, B, L, C are read as Daoist, Buddhist, local and Confucian; N and O are merged as “other” (meaning to be confirmed). Composite entries marked &amp; are split into an inner and an outer half on the disc.</li>' +
      '<li>Multi-day fasts (e.g. 1/8–1/15, 9/1–9/10) are drawn as thin gold bars on the left of their month and are not counted in the daily totals.</li>' +
      '<li>Code suffixes A, B, D, P, S are inferred from the names as attaining the Way (chengdao 成道), audience with the Perfected (chaozhen 朝真), descent (xiajiang 下降), leaving home (chujia 出家) and death day (huichen 諱辰); to be confirmed.</li>' +
      '<li>Dates are lunar month/day. Names of deities and sources are given in pinyin (generated automatically) with Chinese characters.</li>', '<li>Les codes de tradition T, B, L, C sont lus comme taoïste, bouddhiste, local et confucéen ; N et O sont fusionnés en « autre » (sens à confirmer). Les entrées composites marquées &amp; sont partagées en une moitié intérieure et une moitié extérieure sur le disque.</li>' + '<li>Les jeûnes de plusieurs jours (p. ex. 1/8–1/15, 9/1–9/10) sont dessinés en fines barres dorées à gauche de leur mois et ne sont pas comptés dans les totaux journaliers.</li>' + '<li>Les suffixes de code A, B, D, P, S sont déduits des noms comme obtention de la Voie (chengdao 成道), audience auprès des Parfaits (chaozhen 朝真), descente (xiajiang 下降), sortie du monde (chujia 出家) et jour de la mort (huichen 諱辰) ; à confirmer.</li>' + '<li>Les dates sont lunaires, au format mois/jour. Les noms des divinités et des sources sont donnés en pinyin (généré automatiquement) avec les caractères chinois.</li>') +
    (meta.notesOmitted ? L('<li>公開版不收源表的「附錄」欄。</li>', '<li>The public version omits the source table’s notes column (fulu 附錄).</li>') : '') +
    L('<li>數據：' + esc(meta.edition || '待確認') + '；源表 ' + esc(meta.sourceFile || '') + '，生成於 ' + esc(meta.generated || '') + '。</li></ul></div>',
      '<li>Data: ' + (meta.editionEn || NH(meta.edition || '待確認')) + '; source table ' + esc(meta.sourceFile || '') + ', generated ' + esc(meta.generated || '') + '.</li></ul></div>', '<li>Données : ' + (meta.editionEn || NH(meta.edition || '待確認')) + ' ; table source ' + esc(meta.sourceFile || '') + ', générée le ' + esc(meta.generated || '') + '.</li></ul></div>');
  root.appendChild(sec);
}

window.ZhaiRing = {
  mount: function (el, data, opt) {
    opt = opt || {};
    data = data || window.ZHAI_RING;
    if (!data || !data.entries) { el.innerHTML = '<p>' + L('環形曆數據未載入。', 'Ring calendar data not loaded.') + '</p>'; return; }
    SCHEME = (data.meta && data.meta.scheme) || 'nat';
    OPT = opt;
    var D = prepare(data); CUR = null;
    var root = document.createElement('div'); root.className = 'zr';
    if (opt.title !== false) {
      var days = Object.keys(D.byDay).length, gods = {}; D.all.forEach(function (r) { if (r.god) gods[r.god] = 1; });
      var on = Object.keys(D.byDay).filter(function (k) { return D.TEN.indexOf(k % 100) >= 0; }).length, onSix = Object.keys(D.byDay).filter(function (k) { return D.SIX.indexOf(k % 100) >= 0; }).length;
      var head = document.createElement('section'); head.className = 'zr-sec';
      var ed = data.meta && data.meta.edition;
      head.innerHTML = '<div><h1>' + esc(opt.title || L('齋期神譜環形曆', 'Ring calendar of sacred days')) + '</h1><p class="zr-lede">' + L('一個版本的全部神聖日，排成一個農曆年。', 'All the sacred days of one edition, laid out as a lunar year.') + (data.meta && data.meta.editionHtml ? ' ' + data.meta.editionHtml : EN() && ed ? ' ' + (data.meta.editionEn || NH(ed)) : '') + '</p></div>' +
        '<div class="zr-stats"><div><b>' + D.all.length + '</b><span>' + L('條目', 'entries') + '</span></div><div><b>' + days + '</b><span>' + L('個神聖日', 'sacred days') + '</span></div><div><b>' + Object.keys(gods).length + '</b><span>' + L('位神明', 'deities') + '</span></div><div><b>' + (days ? Math.round(on / days * 100) : 0) + '%</b><span>' + L('神聖日落在十齋日', 'of sacred days fall on the ten fast days') + '</span></div><div><b>' + (days ? Math.round(onSix / days * 100) : 0) + '%</b><span>' + L('神聖日落在六齋日', 'of sacred days fall on the six fast days', 'des jours sacrés tombent sur les six jours de jeûne') + '</span></div></div>';
      if (opt.headExtra) head.appendChild(opt.headExtra);
      if (opt.focus && opt.focus.note) { var fn = document.createElement('div'); fn.innerHTML = opt.focus.note; head.appendChild(fn.firstChild); }
      root.appendChild(head);
    }
    el.appendChild(root);
    var fns = { disc: disc, treemap: treemap, month: function (r) { monthCount(r, D, data); }, dom: dom, rules: function (r) { fastRules(r, D, data); }, strips: strips, table: table, notes: function (r) { notes(r, data); } };
    (opt.sections || ['disc', 'treemap', 'month', 'dom', 'rules', 'strips', 'table', 'notes']).forEach(function (s) { if (fns[s]) fns[s](root, D); });
    return root;
  },
  hideTip: hideTip,
  cur: function () { return CUR ? CUR.get() : null; },
  // 演示和可分享鏈接用：「齋期總長」的標籤（sm／bars／month／many）、「每月第幾日最擁擠」是否含十齋日、六齋日
  prefs: function (o) { if (o) { if (o.tab) RTAB = o.tab; if (o.dom != null) DOM_ALL = !!o.dom; } return { tab: RTAB, dom: DOM_ALL }; },
  set: function (o) { if (CUR) CUR.set(o || {}); }
};
})();
