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
  A: { lab: '集會', c: '--zr-hui', pig: '紅色' }   // 只用於 kind 方案
};
var TR_EN = { T: ['Daoist', 'blue'], B: ['Buddhist', 'yellow'], L: ['Local', 'green'], C: ['Confucian', 'purple'], Q: ['Other', 'gray'], U: ['Undetermined', 'light gray'], A: ['Assembly', 'red'] };
// 着色方案：nat＝性質（道、佛、地方、儒），kind＝編碼日期類型（紀念、成就、巡察、集會、節令、其他）
// kind 方案沿用同一組顏色與代碼 T B L C Q U，只換名稱；另加 A＝集會（紅色），nat 方案不用
var CUR = null, LASTPT = '';
document.addEventListener('pointerdown', function (e) { LASTPT = e.pointerType; }, true);
var SCHEME = 'nat';
// 網站傳入的選項：focus = { names: [規範名…], label } 只突出這位神；onDay(m, d) 點放大月份中的某一天時調用
var OPT = {};
function focusOn() { return !!(OPT.focus && OPT.focus.names && OPT.focus.names.length); }
function isFocus(r) { return focusOn() && OPT.focus.names.indexOf(r.god) >= 0; }
var KIND_ZH = { T: '紀念', B: '成就', L: '巡察', A: '集會', C: '節令', Q: '其他', U: '未標' };
var KIND_EN = { T: 'Commemoration', B: 'Attainment', L: 'Inspection', A: 'Assembly', C: 'Seasonal festival', Q: 'Other', U: 'Unmarked' };
var KIND_CODE = { '紀念': 'T', '成就': 'B', '巡察': 'L', '集會': 'A', '節令': 'C', '其他': 'Q' };
function trLab(k) { return SCHEME === 'kind' ? (EN() ? TT(KIND_EN[k]) : KIND_ZH[k]) : EN() ? TT(TR_EN[k][0]) : TR[k].lab; }
function trPig(k) { return EN() ? TT(TR_EN[k][1]) : TR[k].pig; }
var ORDER_ALL = ['T', 'B', 'L', 'A', 'C', 'Q', 'U'];
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
    return '<div class="zr-legend"><div>' + ORDER.filter(function (k) { return k !== 'A' || SCHEME === 'kind'; }).map(function (k) { return '<span><i class="zr-sw" style="background:var(' + TR[k].c + ')"></i>' + trLab(k) + '<span class="zr-hint">' + trPig(k) + '</span></span>'; }).join('') +
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

// ---------- 每月各日 ----------
// 默認不顯示十齋日、六齋日（六齋日都在十齋日之內），只比較其餘二十天；可切換爲含全部三十天。選擇在切換版本後保留
var DOM_ALL = false;
function dom(root, D) {
  var sec = document.createElement('section'); sec.className = 'zr-sec'; sec.id = 'r-dom';
  sec.innerHTML = '<div class="zr-eyebrow">' + L('檢驗 · 週期齋戒的底層節奏', 'Test · the underlying rhythm of periodic fasting') + '</div><h2 style="margin:0">' + L('每月第幾日最擁擠', 'Which day of the month is most crowded') + '</h2><p class="zr-lede"></p>' +
    '<div class="zr-steps zr-domopt" role="group" aria-label="' + L('十齋日、六齋日', 'Ten and six fast days', 'Dix et six jours de jeûne') + '" style="justify-content:flex-start;margin:0">' +
    '<button type="button" data-all="0">' + L('不含十齋日、六齋日', 'Without the ten and six fast days', 'Sans les dix et six jours de jeûne') + '</button>' +
    '<button type="button" data-all="1">' + L('含十齋日、六齋日', 'With the ten and six fast days', 'Avec les dix et six jours de jeûne') + '</button></div>' +
    '<div class="zr-chart"><svg viewBox="0 0 960 300" role="img"></svg></div><p class="zr-finding"></p>';
  root.appendChild(sec);
  var S = sec.querySelector('svg'), lede = sec.querySelector('.zr-lede'), fd = sec.querySelector('.zr-finding'), cnt = []; for (var i = 0; i <= 30; i++) cnt[i] = 0;
  D.daily.forEach(function (r) { cnt[r.d]++; });
  function isFast(d) { return D.TEN.indexOf(d) >= 0 || D.SIX.indexOf(d) >= 0; }
  function draw() {
    sec.querySelectorAll('.zr-domopt button').forEach(function (b) { b.setAttribute('aria-pressed', String((b.getAttribute('data-all') === '1') === DOM_ALL)); });
    while (S.firstChild) S.removeChild(S.firstChild);
    var BARB = fastGrad(S, '--zr-gold', '--zr-six-ink', true);
    // 始終是一月三十日；「不含」時十齋日、六齋日計作 0，平均值按三十日計
    var days = []; for (var d = 1; d <= 30; d++) days.push(d);
    var val = function (d) { return !DOM_ALL && isFast(d) ? 0 : cnt[d]; };
    var tot = days.reduce(function (s, d) { return s + val(d); }, 0), avg = tot / 30;
    var mx = Math.max.apply(null, days.map(val)), max = Math.ceil((mx + 2) / 5) * 5;
    var W = 960, H = 300, ml = 36, mr = 8, mt = 28, mb = 44, bw = (W - ml - mr) / 30;
    function y(v) { return mt + (H - mt - mb) * (1 - v / max); }
    lede.textContent = DOM_ALL ? L('三十根柱子是一月三十日，泥金色是十齋日，石青色是六齋日（日期下另有短線），兩者重合的柱子各佔一半；其餘日子中高於平均的是朱色；虛線是平均值。', 'Thirty bars for the thirty days of a lunar month; gold marks the ten fast days and blue the six fast days (also underlined below the date); bars on days in both are half of each. Among the other days, those above average are in vermilion. The dashed line is the average.', 'Trente barres pour les trente jours du mois lunaire ; l’or marque les dix jours de jeûne et le bleu les six jours de jeûne (aussi soulignés sous la date) ; les barres des jours communs aux deux sont mi-partie. Parmi les autres jours, ceux au-dessus de la moyenne sont en vermillon. La ligne pointillée est la moyenne.')
      : L('不含十齋日、六齋日：這十天（六齋日都在十齋日之內）計作 0，平均值仍按一月三十日計算；朱色是高於平均的日子，虛線是平均值。', 'Without the ten and six fast days: those ten days (the six all fall within the ten) are counted as 0, and the average is still taken over all thirty days. Days above average are in vermilion; the dashed line is the average.', 'Sans les dix et six jours de jeûne : ces dix jours (les six sont tous compris dans les dix) comptent pour 0, et la moyenne est toujours calculée sur les trente jours. Les jours au-dessus de la moyenne sont en vermillon ; la ligne pointillée est la moyenne.');
    S.setAttribute('aria-label', DOM_ALL ? L('每月各日的條目數，十齋日以金色、六齋日以石青色標出', 'Entries per day of the month, ten fast days in gold, six fast days in blue', 'Entrées par jour du mois, dix jours de jeûne en or, six jours de jeûne en bleu') : L('十齋日、六齋日以外各日的條目數', 'Entries per day of the month, fast days left out', 'Entrées par jour du mois, hors jours de jeûne'));
    for (var v = 0; v <= max; v += max > 20 ? 10 : 5) {
      svgEl('line', { x1: ml, x2: W - mr, y1: y(v), y2: y(v), stroke: 'var(--zr-line)' }, S);
      svgEl('text', { x: ml - 8, y: y(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--zr-muted)' }, S).textContent = v;
    }
    for (var dd = 1; dd <= 30; dd++) (function (d) {
      var k = d - 1, on = D.TEN.indexOf(d) >= 0, six = D.SIX.indexOf(d) >= 0;
      var n = val(d), up = !on && !six && n > avg, x = ml + k * bw + 3, w = bw - 6, top = y(n), rr = Math.min(3, w / 2, y(0) - top);
      svgEl('path', { d: 'M' + x + ',' + y(0) + 'V' + (top + rr) + 'Q' + x + ',' + top + ' ' + (x + rr) + ',' + top + 'H' + (x + w - rr) + 'Q' + (x + w) + ',' + top + ' ' + (x + w) + ',' + (top + rr) + 'V' + y(0) + 'Z', fill: on && six ? BARB : on ? 'var(--zr-gold)' : six ? 'var(--zr-six-ink)' : up ? 'var(--zr-hi)' : 'var(--zr-wei)' }, S);
      var hit = svgEl('rect', { x: ml + k * bw, y: mt, width: bw, height: H - mt - mb, fill: 'transparent' }, S);
      hit.addEventListener('pointermove', function (ev) { showTip(ev, '<b>' + L(DN(d), 'Day ' + d, 'Jour ' + d) + '</b> · ' + (!DOM_ALL && (on || six) ? fastLab(D, d) + L(' · 計作 0（原有 ' + cnt[d] + ' 條）', ' · counted as 0 (' + cnt[d] + ' in the edition)', ' · compté 0 (' + cnt[d] + ' dans l’édition)') : nEntries(n) + (on || six ? ' · ' + fastLab(D, d) : up ? L(' · 高於平均', ' · above average', ' · au-dessus de la moyenne') : ''))); });
      hit.addEventListener('pointerleave', hideTip);
      svgEl('text', { x: ml + (k + 0.5) * bw, y: H - mb + 18, 'text-anchor': 'middle', 'font-size': 12, fill: on ? 'var(--zr-gold)' : six ? 'var(--zr-six-ink)' : up ? 'var(--zr-hi)' : 'var(--zr-muted)', 'font-weight': on || six || up ? 700 : 400 }, S).textContent = DN(d).replace('初', '');
      if (six) svgEl('rect', { x: ml + (k + 0.5) * bw - 7, y: H - mb + 25, width: 14, height: 3, rx: 1.5, fill: 'var(--zr-six-ink)' }, S);
      if (!DOM_ALL || on || cnt[d] >= 13) svgEl('text', { x: ml + (k + 0.5) * bw, y: top - 7, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--zr-ink)' }, S).textContent = n;
    })(dd);
    svgEl('line', { x1: ml, x2: W - mr, y1: y(avg), y2: y(avg), stroke: 'var(--zr-muted)', 'stroke-dasharray': '3 4' }, S);
    svgEl('text', { x: W - mr, y: y(avg) - 6, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--zr-muted)' }, S).textContent = L('平均 ', 'average ', 'moyenne ') + avg.toFixed(1);
    if (!DOM_ALL) {
      // 結論文字按數據自動生成：非齋日中最擁擠的三天，以及遠高於平均的日子
      var rest = days.filter(function (d) { return !isFast(d); }), ord = rest.slice().sort(function (a, b) { return cnt[b] - cnt[a] || a - b; }), top3 = ord.slice(0, 3), hi = rest.filter(function (d) { return cnt[d] > avg * 1.3; });
      fd.textContent = L('十齋日、六齋日計作 0，全月共 ' + tot + ' 條，平均每天 ' + avg.toFixed(1) + ' 條。最擁擠的是' + top3.map(function (d) { return DN(d) + '（' + cnt[d] + ' 條）'; }).join('、') + '。' + (hi.length ? '遠高於平均（超過平均 1.3 倍）的有 ' + hi.length + ' 天：' + hi.map(DN).join('、') + '。' : '沒有遠高於平均的日子。'),
        'With the fast days counted as 0, the month carries ' + tot + ' entries, ' + avg.toFixed(1) + ' a day on average. The most crowded are days ' + top3.map(function (d) { return d + ' (' + cnt[d] + ')'; }).join(', ') + '. ' + (hi.length ? hi.length + ' days are well above average (over 1.3 times): ' + hi.join(', ') + '.' : 'No day is well above average.'),
        'Les jours de jeûne comptant pour 0, le mois porte ' + tot + ' entrées, soit ' + avg.toFixed(1) + ' par jour en moyenne. Les plus chargés sont les jours ' + top3.map(function (d) { return d + ' (' + cnt[d] + ')'; }).join(', ') + '. ' + (hi.length ? hi.length + ' jours sont nettement au-dessus de la moyenne (plus de 1,3 fois) : ' + hi.join(', ') + '.' : 'Aucun jour n’est nettement au-dessus de la moyenne.'));
      return;
    }
    // 結論文字按數據自動生成：十齋日中高於／低於平均的日子
    var hi = D.TEN.filter(function (d) { return cnt[d] > avg * 1.3; }), lo = D.TEN.filter(function (d) { return cnt[d] < avg * 0.75; });
    var tenE = D.TEN.reduce(function (s, d) { return s + cnt[d]; }, 0), sixE = D.SIX.reduce(function (s, d) { return s + cnt[d]; }, 0), sixPct = Math.round(sixE / tot * 100);
  fd.textContent = L('十齋日佔一月的三分之一，承載了 ' + Math.round(tenE / tot * 100) + '% 的條目，但並不均勻：' +
    hi.map(DN).join('、') + ' 遠高於平均，' + lo.map(DN).join('、') + ' 卻低於平均。神誕曆貼合的是其中幾個節點，而不是整套十齋。',
    'The ten fast days are a third of the month and carry ' + Math.round(tenE / tot * 100) + '% of the entries, but unevenly: days ' +
    hi.join(', ') + ' are well above average, while days ' + lo.join(', ') + ' fall below it. The birthday calendar follows a few of these points, not the whole set of ten fasts.', 'Les dix jours de jeûne forment un tiers du mois et portent ' + Math.round(tenE / tot * 100) + ' % des entrées, mais inégalement : les jours ' + hi.join(', ') + ' sont nettement au-dessus de la moyenne, tandis que les jours ' + lo.join(', ') + ' sont en dessous. Le calendrier des anniversaires suit quelques-uns de ces points, non l’ensemble des dix jeûnes.') + ' ' + L('六齋日佔一月的五分之一，承載了 ' + sixPct + '% 的條目。', 'The six fast days are a fifth of the month and carry ' + sixPct + '% of the entries.', 'Les six jours de jeûne forment un cinquième du mois et portent ' + sixPct + ' % des entrées.');
  }
  sec.querySelectorAll('.zr-domopt button').forEach(function (b) { b.onclick = function () { DOM_ALL = b.getAttribute('data-all') === '1'; hideTip(); draw(); }; });
  draw();
}

// ---------- 齋期總長：每年、每月有多少神聖日 ----------
// 齋曆整體就是持齋日程，凡能排入月日的神聖日都計入；每月週期、多日齋期展開到 12 個月 × 30 日，同一天多條只算一天
// 按編碼日期類型分色；每天只算一次，同一天兼有幾類的合成一段「兼類」（斜線紋），懸停列出各組合（如「紀念/巡察」）的天數。數據由頁面傳入：meta.rules（本版本）、meta.ruleAll（各版本彙總）
var RK = ['T', 'B', 'L', 'A', 'C', 'Q', 'U'];
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
  var used = RK.filter(function (k) { return all.some(function (x) { return Object.keys(x.seg).some(function (c) { return c.split('/').indexOf(k) >= 0; }); }); });
  var sec = document.createElement('section'); sec.className = 'zr-sec'; sec.id = 'r-total';
  var mdays = cur.mon.map(function (o) { return Object.keys(o).reduce(function (s, k) { return s + o[k]; }, 0); });
  var top = mdays.indexOf(Math.max.apply(null, mdays)) + 1, nNone = rules.filter(function (x) { return x.type === 'none'; }).length;
  var tile = function (n, a, b) { return '<div><b>' + n + '</b><span>' + a + (b ? '<br>' + b : '') + '</span></div>'; };
  var key = '<div class="zr-legend zr-rulekey">' + used.map(function (k) { return '<span><i class="zr-sw" style="background:' + rkCss(k) + '"></i>' + rkLab(k) + '</span>'; }).join('') +
    '<span><i class="zr-sw" style="background:' + MIX_CSS + '"></i>' + L('兼類：一天兼有幾類（懸停看組合）', 'Several types on one day (hover for the combinations)', 'Plusieurs types le même jour (survoler pour les combinaisons)') + '</span></div>';
  sec.innerHTML = '<div class="zr-eyebrow">' + L('齋期總長', 'Total fasting time', 'Durée totale du jeûne') + '</div><h2 style="margin:0">' + L('每月、每年有多少神聖日：各版本對比', 'How many sacred days a month and a year: editions compared', 'Combien de jours sacrés par mois et par an : comparaison des éditions') + '</h2>' +
    '<p class="zr-lede">' + L('齋曆整體是一份持齋日程，推薦持齋常寫在序言裏，不逐日標註，所以這裏凡能排入月日的神聖日都計入。每月週期（如十齋日）和多日齋期（如九皇齋）展開到十二個月、每月三十日上；同一天有幾條也只算一天。顏色是工作簿編碼的日期類型；同一天兼有幾類的，如既是某神誕辰（紀念）又是十齋日（其他），記作「紀念/其他」；這類日子在圖上合成一段「兼類」（斜線紋），懸停可見各組合的天數，仍只算一天。六十甲子日、八節等日期隨年份或節氣而變，不計入。',
      'A fasting calendar as a whole is a schedule for fasting; the recommendation to fast usually sits in the preface rather than under each day, so every sacred day that can be placed on a month-day is counted here. Monthly cycles (such as the ten fast days) and multi-day fasts (such as the Nine Emperors fast) are laid out over twelve thirty-day months, and a day with several entries counts once. Colours are the workbook’s coded day types. A day of several types, say both a deity’s birthday (commemoration) and one of the ten fast days (other), is labelled “commemoration/other”; such days are drawn together as one hatched “several types” segment, with the combinations listed on hover, and each still counts once. The sixty-day jiazi cycle, the eight nodal days and the like shift with the year or solar terms and are not counted.',
      'Un calendrier de jeûne est dans son ensemble un programme de jeûne ; la recommandation de jeûner figure d’ordinaire dans la préface plutôt que sous chaque jour, si bien que tout jour sacré plaçable sur un jour du mois est compté. Les cycles mensuels (dix jours de jeûne, par ex.) et les jeûnes de plusieurs jours (Neuf Empereurs, par ex.) sont reportés sur douze mois de trente jours ; un jour portant plusieurs entrées ne compte qu’une fois. Les couleurs sont les types de jour codés du classeur. Un jour de plusieurs types, par exemple anniversaire d’une divinité (commémoration) et l’un des dix jours de jeûne (autre), est noté « commémoration/autre » ; ces jours forment ensemble un segment hachuré « plusieurs types », les combinaisons s’affichant au survol, et chacun ne compte qu’une fois. Le cycle sexagésimal, les huit nœuds, etc., varient selon l’année ou les termes solaires et ne sont pas comptés.') + '</p>' +
    '<div class="zr-stats">' + tile(cur.tot, L('天', 'days', 'jours'), L('全年 360 天中的 ' + Math.round(cur.tot / 3.6) + '%', Math.round(cur.tot / 3.6) + '% of 360 days', Math.round(cur.tot / 3.6) + ' % de 360 jours')) +
      tile((cur.tot / 12).toFixed(1), L('天／月', 'days a month', 'jours par mois'), L('平均', 'on average', 'en moyenne')) +
      tile(mdays[top - 1], L('天', 'days', 'jours'), L('最多的是' + monthLabel(top), 'most in month ' + top, 'le plus : mois ' + top)) +
      tile(nNone, L('條不能排入月日', 'entries not placeable', 'entrées non plaçables'), L('不計入', 'not counted', 'non comptées')) + '</div>' + key +
    '<div class="zr-tabs" role="tablist">' + [['sm', L('小倍數：各版本的一年', 'Small multiples: each edition’s year', 'Petits multiples : l’année de chaque édition')], ['upset', L('類型組合：本版本', 'Type combinations: this edition', 'Combinaisons de types : cette édition')], ['bars', L('全年天數：各版本', 'Days a year: all editions', 'Jours par an : toutes les éditions')]].map(function (t) { return '<button type="button" role="tab" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
    '<div class="zr-tabp" data-p="sm"></div><div class="zr-tabp" data-p="upset"></div><div class="zr-tabp" data-p="bars"><p class="zr-muted-s" style="margin:0 0 6px">' + L('點一個版本換到它的環形曆。', 'Click an edition to switch to its ring calendar.', 'Cliquer une édition pour afficher son calendrier circulaire.') + '</p><div class="zr-edbars"></div></div>' +
    '<h3 class="zr-subh">' + L('每月：本版本', 'Per month: this edition', 'Par mois : cette édition') + '</h3><p class="zr-muted-s" style="margin:0 0 6px">' + L('橫線是各版本該月天數的中位數。', 'The short line marks the median across editions for that month.', 'Le trait marque la médiane des éditions pour ce mois.') + '</p>' +
    '<div class="zr-chart"><svg viewBox="0 0 960 280" role="img" aria-label="' + L('本版本每月神聖日天數，按日期類型分段', 'Sacred days per month in this edition, by day type', 'Jours sacrés par mois dans cette édition, par type de jour') + '"></svg></div>' +
    '<div class="zr-rulelist"></div>';
  root.appendChild(sec);
  // 標籤：小倍數／類型組合（UpSet）／全年天數；選擇在切換版本後保留
  function showTab(t) { RTAB = t; sec.querySelectorAll('.zr-tabs button').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-tab') === t)); }); sec.querySelectorAll('.zr-tabp').forEach(function (p) { p.hidden = p.getAttribute('data-p') !== t; }); hideTip(); }
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
  // 類型組合：UpSet 圖（本版本）
  (function () {
    var box = sec.querySelector('[data-p="upset"]'), KS = ['T', 'B', 'L', 'A', 'C', 'Q', 'U'], C = cur.seg, LIM = 14;
    var keys = Object.keys(C).sort(function (a, b) { return C[b] - C[a] || a.split('/').length - b.split('/').length; }), shown = keys.slice(0, LIM), rest = keys.slice(LIM);
    var single = keys.filter(function (k) { return k.indexOf('/') < 0; }).reduce(function (s, k) { return s + C[k]; }, 0), tk = {};
    KS.forEach(function (k) { tk[k] = keys.reduce(function (s, c) { return s + (c.split('/').indexOf(k) >= 0 ? C[c] : 0); }, 0); });
    var rows = KS.filter(function (k) { return tk[k]; });
    var cols = shown.map(function (k) { return [k, C[k]]; }); if (rest.length) cols.push(['…', rest.reduce(function (s, k) { return s + C[k]; }, 0)]);
    box.innerHTML = '<p class="zr-muted-s" style="margin:0 0 8px">' + L('本版本全年 ' + cur.tot + ' 天：單類 ' + single + ' 天，兼類 ' + (cur.tot - single) + ' 天，共 ' + keys.length + ' 種組合。下方點陣的每一列是一種組合，連起來的點是這一天兼有的類型；柱高是天數；左側是每類出現的天數。',
      'This edition: ' + cur.tot + ' days a year, ' + single + ' of a single type and ' + (cur.tot - single) + ' of several, in ' + keys.length + ' combinations. Each column of the dot matrix is one combination, with joined dots for the types that share the day; bar height is the number of days; the left bars give the days on which each type occurs.',
      'Cette édition : ' + cur.tot + ' jours par an, ' + single + ' d’un seul type et ' + (cur.tot - single) + ' de plusieurs, en ' + keys.length + ' combinaisons. Chaque colonne de la matrice est une combinaison, les points reliés étant les types qui partagent le jour ; la hauteur donne le nombre de jours ; à gauche, les jours où chaque type apparaît.') + '</p>' +
      '<div class="zr-chart"><svg viewBox="0 0 960 ' + (190 + rows.length * 26) + '" role="img" aria-label="' + L('本版本日期類型組合的天數', 'Days per combination of day types in this edition', 'Jours par combinaison de types dans cette édition') + '"></svg></div>';
    var S2 = box.querySelector('svg'), x0 = 230, cw = (950 - x0) / Math.max(cols.length, 8), y0 = 160, rh = 26, mx2 = Math.max.apply(null, cols.map(function (c) { return c[1]; })) || 1;
    var step = mx2 > 100 ? 50 : mx2 > 40 ? 20 : mx2 > 15 ? 10 : 5;
    for (var v = 0; v <= mx2; v += step) { var yy = y0 - v / mx2 * 130; svgEl('line', { x1: x0, x2: 950, y1: yy, y2: yy, stroke: 'var(--zr-line)' }, S2); svgEl('text', { x: x0 - 8, y: yy + 4, 'text-anchor': 'end', 'font-size': 12, fill: 'var(--zr-muted)' }, S2).textContent = v; }
    rows.forEach(function (k, ri) { if (ri % 2 === 0) svgEl('rect', { x: x0, y: y0 + 16 + ri * rh, width: 950 - x0, height: rh, fill: 'var(--zr-cell)' }, S2); });
    cols.forEach(function (cc, i) {
      var k = cc[0], x = x0 + i * cw + cw * 0.2, w = cw * 0.6, hh = cc[1] / mx2 * 130, ks = k === '…' ? [] : k.split('/');
      svgEl('rect', { x: x, y: y0 - hh, width: w, height: hh, rx: 2, fill: k === '…' ? 'var(--zr-wei)' : ks.length > 1 ? 'var(--zr-ink-2)' : 'var(' + TR[k].c + ')' }, S2);
      svgEl('text', { x: x + w / 2, y: y0 - hh - 5, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--zr-ink)' }, S2).textContent = cc[1];
      var hit = svgEl('rect', { x: x0 + i * cw, y: 10, width: cw, height: y0 + 16 + rows.length * rh - 10, fill: 'transparent' }, S2);
      hit.addEventListener('pointermove', function (ev) { showTip(ev, k === '…' ? L('其餘 ' + rest.length + ' 種組合', rest.length + ' other combinations', rest.length + ' autres combinaisons') + rest.map(function (c) { return '<br>' + rkLab(c) + ' ' + C[c]; }).join('') : '<b>' + rkLab(k) + '</b> · ' + L(cc[1] + ' 天', cc[1] + ' days', cc[1] + ' jours')); });
      hit.addEventListener('pointerleave', hideTip);
      if (k === '…') { svgEl('text', { x: x + w / 2, y: y0 + 16 + rh * rows.length / 2 + 4, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--zr-muted)' }, S2).textContent = L('其餘 ' + rest.length, '+' + rest.length, '+' + rest.length); return; }
      var ys = [];
      rows.forEach(function (rk, ri) { var cy = y0 + 16 + ri * rh + rh / 2, on = ks.indexOf(rk) >= 0; svgEl('circle', { cx: x + w / 2, cy: cy, r: 5, fill: on ? 'var(' + TR[rk].c + ')' : 'var(--zr-line)' }, S2); if (on) ys.push(cy); });
      if (ys.length > 1) svgEl('line', { x1: x + w / 2, x2: x + w / 2, y1: ys[0], y2: ys[ys.length - 1], stroke: 'var(--zr-ink-2)', 'stroke-width': 2 }, S2);
    });
    var tm = Math.max.apply(null, rows.map(function (k) { return tk[k]; })) || 1;
    rows.forEach(function (k, ri) {
      var cy = y0 + 16 + ri * rh + rh / 2, w = tk[k] / tm * 110;
      svgEl('rect', { x: x0 - 70 - w, y: cy - 7, width: w, height: 14, rx: 2, fill: 'var(' + TR[k].c + ')' }, S2);
      svgEl('text', { x: x0 - 76 - w, y: cy + 4, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--zr-muted)' }, S2).textContent = tk[k];
      svgEl('text', { x: x0 - 8, y: cy + 5, 'text-anchor': 'end', 'font-size': 13, fill: 'var(--zr-ink-2)' }, S2).textContent = trLab(k);
    });
  })();
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
  var S = sec.querySelector('svg'), HATCH = 'zr-hatch-' + (++FAST_UID), defs = svgEl('defs', {}, S), pat = svgEl('pattern', { id: HATCH, width: 4.5, height: 4.5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
  svgEl('rect', { width: 4.5, height: 4.5, fill: 'var(--zr-cell)' }, pat); svgEl('rect', { width: 1.5, height: 4.5, fill: 'var(--zr-ink-2)' }, pat);
  var W = 960, H = 280, ml = 36, mr = 8, mt = 22, mb = 34, bw = (W - ml - mr) / 12;
  var med = []; for (var m = 0; m < 12; m++) { var vs = all.map(function (x) { return Object.keys(x.mon[m]).reduce(function (s, k) { return s + x.mon[m][k]; }, 0); }).sort(function (a, b) { return a - b; }); med.push(vs.length % 2 ? vs[(vs.length - 1) / 2] : (vs[vs.length / 2 - 1] + vs[vs.length / 2]) / 2); }
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
  var sec = document.createElement('section'); sec.className = 'zr-sec';
  sec.innerHTML = '<div class="zr-eyebrow">' + L('一神多日', 'One deity, many days') + '</div><h2 style="margin:0">' + L('同一位神，散落在一年中', 'The same deity, scattered across the year') + '</h2><p class="zr-lede">' +
    (SCHEME === 'kind' ? L('每一行是一位神明（按「建議規範名」歸組）在這一年中的全部日子：誕、成道、下降、朝真等。', 'Each row gathers all the days of one deity (grouped by the suggested normalized name) across the year: birthday, attaining the Way, descent, audience with the Perfected, etc.') : '') +
    (SCHEME === 'kind' ? '' : L('每一行是一位神明（按神明編號歸組）在這一年中的全部日子：誕、成道、下降、朝真。版本比較時，比較單位應是「神明＋事件」。',
      'Each row gathers all the days of one deity (grouped by deity code) across the year: birthday, attaining the Way, descent, audience with the Perfected. When comparing editions, the unit of comparison should be “deity + event”.')) + '</p><div class="zr-strips"></div>';
  root.appendChild(sec);
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
      L('<li>顏色按工作簿的「編碼日期類型」：紀念（聖誕、聖降）、成就（出家、成道、涅槃等）、巡察（下降）、集會（神仙集會、朝元、朝真、三元三會等，參 Goossaert 2024）、節令（臘與節辰）、其他；未填者爲「未標」。</li>' +
        '<li>跨日齋期（如正月初八至十五）畫成該月左側的泥金細條，不計入每日條數。</li>',
        '<li>Colours follow the workbook’s coded type of day: commemoration (birthdays, sacred descents), attainment (leaving home, attaining the Way, nirvana, etc.), inspection (descents), assembly (divine meetings, audiences such as chaoyuan 朝元, the three assemblies, etc.; cf. Goossaert 2024), seasonal festivals (la 臘 and festival days), and other; blank codes are “unmarked”.</li>' +
        '<li>Multi-day fasts (e.g. 1/8–1/15) are drawn as thin gold bars on the left of their month and are not counted in the daily totals.</li>', '<li>Les couleurs suivent le type de jour codé du classeur : commémoration (anniversaires, descentes sacrées), accomplissement (sortie du monde, obtention de la Voie, nirvana, etc.), inspection (descentes), assemblée (réunions divines, audiences comme le chaoyuan 朝元, les trois assemblées, etc. ; cf. Goossaert 2024), fêtes saisonnières (la 臘 et jours de fête), et autres ; les codes vides sont « non marqués ».</li>' + '<li>Les jeûnes de plusieurs jours (p. ex. 1/8–1/15) sont dessinés en fines barres dorées à gauche de leur mois et ne sont pas comptés dans les totaux journaliers.</li>') +
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
    var fns = { disc: disc, treemap: treemap, dom: dom, rules: function (r) { fastRules(r, D, data); }, strips: strips, table: table, notes: function (r) { notes(r, data); } };
    (opt.sections || ['disc', 'treemap', 'dom', 'rules', 'strips', 'table', 'notes']).forEach(function (s) { if (fns[s]) fns[s](root, D); });
    return root;
  },
  hideTip: hideTip,
  cur: function () { return CUR ? CUR.get() : null; },
  // 演示和可分享鏈接用：「齋期總長」的標籤（sm／upset／bars）、「每月第幾日最擁擠」是否含十齋日、六齋日
  prefs: function (o) { if (o) { if (o.tab) RTAB = o.tab; if (o.dom != null) DOM_ALL = !!o.dom; } return { tab: RTAB, dom: DOM_ALL }; },
  set: function (o) { if (CUR) CUR.set(o || {}); }
};
})();
