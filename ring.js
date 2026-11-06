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
  Q: { lab: '其他', c: '--zr-qi', pig: '灰色' }, U: { lab: '未定', c: '--zr-wei', pig: '淺灰' }
};
var TR_EN = { T: ['Daoist', 'blue'], B: ['Buddhist', 'yellow'], L: ['Local', 'green'], C: ['Confucian', 'purple'], Q: ['Other', 'gray'], U: ['Undetermined', 'light gray'] };
// 着色方案：nat＝性質（道、佛、地方、儒），kind＝編碼日期類型（紀念、成就、巡察、節令、其他）
// kind 方案沿用同一組顏色與代碼 T B L C Q U，只換名稱
var CUR = null, LASTPT = '';
document.addEventListener('pointerdown', function (e) { LASTPT = e.pointerType; }, true);
var SCHEME = 'nat';
// 網站傳入的選項：focus = { names: [規範名…], label } 只突出這位神；onDay(m, d) 點放大月份中的某一天時調用
var OPT = {};
function focusOn() { return !!(OPT.focus && OPT.focus.names && OPT.focus.names.length); }
function isFocus(r) { return focusOn() && OPT.focus.names.indexOf(r.god) >= 0; }
var KIND_ZH = { T: '紀念', B: '成就', L: '巡察', C: '節令', Q: '其他', U: '未標' };
var KIND_EN = { T: 'Commemoration', B: 'Attainment', L: 'Inspection', C: 'Seasonal festival', Q: 'Other', U: 'Unmarked' };
var KIND_CODE = { '紀念': 'T', '成就': 'B', '巡察': 'L', '節令': 'C', '其他': 'Q' };
function trLab(k) { return SCHEME === 'kind' ? (EN() ? TT(KIND_EN[k]) : KIND_ZH[k]) : EN() ? TT(TR_EN[k][0]) : TR[k].lab; }
function trPig(k) { return EN() ? TT(TR_EN[k][1]) : TR[k].pig; }
var ORDER = ['T', 'B', 'L', 'C', 'Q', 'U'];
var SUF_ZH = { A: '成道', B: '朝真', D: '下降', P: '出家', S: '諱辰' };
var SUF_EN = { A: 'attaining the Way', B: 'audience with the Perfected', D: 'descent', P: 'leaving home', S: 'death day' };
var SUF = {};
['A', 'B', 'D', 'P', 'S'].forEach(function (k) { Object.defineProperty(SUF, k, { get: function () { return EN() ? TT(SUF_EN[k]) : SUF_ZH[k]; }, enumerable: true }); });
var OTHER_SRC = '其他出處';
function srcName(s) { return s === OTHER_SRC ? L(OTHER_SRC, 'Other sources') : NH(s); }
function srcText(s) { return s === OTHER_SRC ? L(OTHER_SRC, 'Other sources') : NTX(s); }
function nEntries(n) { return L(n + ' 條', n + (n === 1 ? ' entry' : ' entries'), n + (n === 1 ? ' entrée' : ' entrées')); }
var TEN_LAB = function () { return L('十齋日', 'ten fast days'); };
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
  return { all: all, daily: daily, ranges: ranges, byDay: byDay, srcMain: srcMain, notesOmitted: !!(data.meta && data.meta.notesOmitted), TEN: (data.meta && data.meta.fastDays10) || [1, 8, 14, 15, 18, 23, 24, 28, 29, 30] };
}

// ---------- 曆盤 ----------
function disc(root, D) {
  var sec = document.createElement('section'); sec.className = 'zr-sec';
  sec.innerHTML = '<div class="zr-hero"><div class="zr-disc"><svg viewBox="0 0 800 800" role="img" aria-label="' + L('曆盤：十二個月扇區乘三十日環，每格顯示當日的神聖日條目', 'Calendar disc: twelve month sectors by thirty day rings; each cell shows that day’s sacred-day entries') + '"></svg><button type="button" class="zr-back" hidden>' + L('← 返回全年', '← Whole year') + '</button><div class="zr-steps" role="group" aria-label="' + L('選擇顯示的日子', 'Choose which days to show') + '"></div></div><aside class="zr-panel" aria-live="polite"></aside></div>' +
    '<p class="zr-hint">' + L('十二個月是十二個扇區，從內到外是初一到三十；一格是一天，格中每一色塊是一條神聖日條目。泥金色底格是十齋日。移動或點按一格查看當日；點擊某個月可放大該月，再點其他月份切換，點盤外或按 Esc 返回全年。下方按鈕可單獨開關各類日子並任意疊加：「空白之年」全部關閉，「全部」全部打開。',
      'The twelve lunar months are twelve sectors; days 1 to 30 run from the inside out. Each cell is a day, and each coloured block in it is one sacred-day entry. Cells with a gold ground are the ten fast days (shizhai ri 十齋日). Hover over or tap a cell to see that day; click a month to zoom in on it, click another month to switch, and click outside the disc or press Esc to return to the whole year. The buttons below switch each kind of day on or off and can be combined; “An empty year” turns everything off and “All” turns everything on.') + '</p>';
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
    { k: 'T', lab: trLab('T'), show: ['T'] }, { k: 'B', lab: trLab('B'), show: ['B'] },
    { k: 'L', lab: trLab('L'), show: ['L'] }, { k: 'C', lab: trLab('C'), show: ['C'] },
    { k: 'QU', lab: L('其他・未標', 'Other · unmarked'), show: ['Q', 'U'] }] : [
    { k: 'fast', lab: L('十齋日', 'Ten fast days') },
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
    Object.keys(cells).forEach(function (k) { cells[k].setAttribute('fill', on.fast && D.TEN.indexOf(k % 100) >= 0 ? 'var(--zr-fast)' : 'var(--zr-cell)'); });
    var F = focusOn();
    slices.forEach(function (o) { var v = t.indexOf(o.t) >= 0; o.el.style.opacity = !v ? 0 : !F || isFocus(o.r) ? 1 : 0.1; });
    rngEls.forEach(function (o) { var v = visible(o.r, t); o.el.setAttribute('opacity', !v ? 0 : !F || isFocus(o.r) ? 1 : 0.1); });
    // 聚焦神明所在的格子加描邊
    Object.keys(cells).forEach(function (k) { var on = F && (D.byDay[k] || []).some(isFocus); cells[k].setAttribute('stroke', on ? 'var(--zr-ink)' : 'none'); cells[k].setAttribute('stroke-width', on ? 1.2 : 0); });
    if (!sel) {
      var shown = D.all.filter(function (r) { return visible(r, t); }).length;
      var idle = !t.length;
      c1.textContent = idle ? (on.fast ? L('十齋', 'Ten fasts') : L('一歲', 'One year')) : L('一歲神聖時間', 'A year of sacred time');
      c1.setAttribute('font-size', idle ? (EN() ? 32 : 40) : (EN() ? 22 : 28));
      c2.textContent = idle ? (on.fast ? L('每月十日 · 一歲一百二十日', '10 days a month · 120 a year') : L('十二月 · 三百六十日', '12 months · 360 days')) : nEntries(shown);
    }
  }
  function legend() {
    return '<div class="zr-legend"><div>' + ORDER.map(function (k) { return '<span><i class="zr-sw" style="background:var(' + TR[k].c + ')"></i>' + trLab(k) + '<span class="zr-hint">' + trPig(k) + '</span></span>'; }).join('') +
      '</div><div><span><i class="zr-sw" style="background:var(--zr-fast);outline:1px solid var(--zr-gold)"></i>' + L('十齋日', 'Ten fast days') + '</span>' + (SCHEME === 'kind' ? '' : '<span><i class="zr-sw" style="background:linear-gradient(135deg,var(--zr-dao) 50%,var(--zr-di) 50%)"></i>' + L('複合（內外兩半）', 'Composite (inner / outer half)') + '</span>') + '</div></div>';
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
          return '<li><i class="zr-sw" style="background:' + (D.TEN.indexOf(x) >= 0 ? 'var(--zr-gold)' : 'var(--zr-wei)') + '"></i><div><div class="zr-nm">' + lunarLong(zoom, x) + '<span class="zr-chip">' + nEntries(l.length) + '</span></div><div class="zr-sub">' + l.map(function (r) { return NH(r.name); }).join(L('、', '; ')) + '</div></div></li>';
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
    panel.innerHTML = '<div><div class="zr-pd">' + lunarLong(m, d) + '</div><div class="zr-pmeta">' + nEntries(list.length) + (D.TEN.indexOf(d) >= 0 ? ' · ' + TEN_LAB() : '') + '</div></div>' +
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
        style: 'font-size:' + fs.toFixed(2) + 'px;fill:' + (ten ? 'var(--zr-gold)' : 'var(--zr-ink-2)') + ';font-weight:' + (ten ? 700 : 400) }, dayLabs).textContent = d;
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
    c2.textContent = nEntries((D.byDay[k] || []).length) + (D.TEN.indexOf(d) >= 0 ? ' · ' + TEN_LAB() : '');
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
function dom(root, D) {
  var sec = document.createElement('section'); sec.className = 'zr-sec';
  sec.innerHTML = '<div class="zr-eyebrow">' + L('檢驗 · 週期齋戒的底層節奏', 'Test · the underlying rhythm of periodic fasting') + '</div><h2 style="margin:0">' + L('每月第幾日最擁擠', 'Which day of the month is most crowded') + '</h2><p class="zr-lede">' +
    L('三十根柱子是一月三十日，泥金色是十齋日，虛線是平均值。', 'Thirty bars for the thirty days of a lunar month; gold bars are the ten fast days; the dashed line is the average.') +
    '</p><div class="zr-chart"><svg viewBox="0 0 960 300" role="img" aria-label="' + L('每月各日的條目數，十齋日以金色標出', 'Entries per day of the month, ten fast days in gold') + '"></svg></div><p class="zr-finding"></p>';
  root.appendChild(sec);
  var S = sec.querySelector('svg'), cnt = []; for (var i = 0; i <= 30; i++) cnt[i] = 0;
  D.daily.forEach(function (r) { cnt[r.d]++; });
  var mx = Math.max.apply(null, cnt), max = Math.ceil((mx + 2) / 5) * 5;
  var W = 960, H = 300, ml = 36, mr = 8, mt = 28, mb = 44, bw = (W - ml - mr) / 30;
  function y(v) { return mt + (H - mt - mb) * (1 - v / max); }
  for (var v = 0; v <= max; v += max > 20 ? 10 : 5) {
    svgEl('line', { x1: ml, x2: W - mr, y1: y(v), y2: y(v), stroke: 'var(--zr-line)' }, S);
    svgEl('text', { x: ml - 8, y: y(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--zr-muted)' }, S).textContent = v;
  }
  for (var d = 1; d <= 30; d++) (function (d) {
    var on = D.TEN.indexOf(d) >= 0, x = ml + (d - 1) * bw + 3, w = bw - 6, top = y(cnt[d]), rr = Math.min(3, w / 2, y(0) - top);
    svgEl('path', { d: 'M' + x + ',' + y(0) + 'V' + (top + rr) + 'Q' + x + ',' + top + ' ' + (x + rr) + ',' + top + 'H' + (x + w - rr) + 'Q' + (x + w) + ',' + top + ' ' + (x + w) + ',' + (top + rr) + 'V' + y(0) + 'Z', fill: on ? 'var(--zr-gold)' : 'var(--zr-wei)' }, S);
    var hit = svgEl('rect', { x: ml + (d - 1) * bw, y: mt, width: bw, height: H - mt - mb, fill: 'transparent' }, S);
    hit.addEventListener('pointermove', function (ev) { showTip(ev, '<b>' + L(DN(d), 'Day ' + d, 'Jour ' + d) + '</b> · ' + nEntries(cnt[d]) + (on ? ' · ' + TEN_LAB() : '')); });
    hit.addEventListener('pointerleave', hideTip);
    svgEl('text', { x: ml + (d - 0.5) * bw, y: H - mb + 18, 'text-anchor': 'middle', 'font-size': 12, fill: on ? 'var(--zr-gold)' : 'var(--zr-muted)', 'font-weight': on ? 700 : 400 }, S).textContent = DN(d).replace('初', '');
    if (on || cnt[d] >= 13) svgEl('text', { x: ml + (d - 0.5) * bw, y: top - 7, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--zr-ink)' }, S).textContent = cnt[d];
  })(d);
  var avg = D.daily.length / 30;
  svgEl('line', { x1: ml, x2: W - mr, y1: y(avg), y2: y(avg), stroke: 'var(--zr-muted)', 'stroke-dasharray': '3 4' }, S);
  svgEl('text', { x: W - mr, y: y(avg) - 6, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--zr-muted)' }, S).textContent = L('平均 ', 'average ') + avg.toFixed(1);
  // 結論文字按數據自動生成：十齋日中高於／低於平均的日子
  var hi = D.TEN.filter(function (d) { return cnt[d] > avg * 1.3; }), lo = D.TEN.filter(function (d) { return cnt[d] < avg * 0.75; });
  var tenE = D.TEN.reduce(function (s, d) { return s + cnt[d]; }, 0);
  sec.querySelector('.zr-finding').textContent = L('十齋日佔一月的三分之一，承載了 ' + Math.round(tenE / D.daily.length * 100) + '% 的條目，但並不均勻：' +
    hi.map(DN).join('、') + ' 遠高於平均，' + lo.map(DN).join('、') + ' 卻低於平均。神誕曆貼合的是其中幾個節點，而不是整套十齋。',
    'The ten fast days are a third of the month and carry ' + Math.round(tenE / D.daily.length * 100) + '% of the entries, but unevenly: days ' +
    hi.join(', ') + ' are well above average, while days ' + lo.join(', ') + ' fall below it. The birthday calendar follows a few of these points, not the whole set of ten fasts.', 'Les dix jours de jeûne forment un tiers du mois et portent ' + Math.round(tenE / D.daily.length * 100) + ' % des entrées, mais inégalement : les jours ' + hi.join(', ') + ' sont nettement au-dessus de la moyenne, tandis que les jours ' + lo.join(', ') + ' sont en dessous. Le calendrier des anniversaires suit quelques-uns de ces points, non l’ensemble des dix jeûnes.');
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
      L('<li>顏色按工作簿的「編碼日期類型」：紀念（聖誕、聖降）、成就（出家、成道、涅槃等）、巡察（下降）、節令（臘與節辰）、其他；未填者爲「未標」。</li>' +
        '<li>跨日齋期（如正月初八至十五）畫成該月左側的泥金細條，不計入每日條數。</li>',
        '<li>Colours follow the workbook’s coded type of day: commemoration (birthdays, sacred descents), attainment (leaving home, attaining the Way, nirvana, etc.), inspection (descents), seasonal festivals (la 臘 and festival days), and other; blank codes are “unmarked”.</li>' +
        '<li>Multi-day fasts (e.g. 1/8–1/15) are drawn as thin gold bars on the left of their month and are not counted in the daily totals.</li>', '<li>Les couleurs suivent le type de jour codé du classeur : commémoration (anniversaires, descentes sacrées), accomplissement (sortie du monde, obtention de la Voie, nirvana, etc.), inspection (descentes), fêtes saisonnières (la 臘 et jours de fête), et autres ; les codes vides sont « non marqués ».</li>' + '<li>Les jeûnes de plusieurs jours (p. ex. 1/8–1/15) sont dessinés en fines barres dorées à gauche de leur mois et ne sont pas comptés dans les totaux journaliers.</li>') +
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
      var on = Object.keys(D.byDay).filter(function (k) { return D.TEN.indexOf(k % 100) >= 0; }).length;
      var head = document.createElement('section'); head.className = 'zr-sec';
      var ed = data.meta && data.meta.edition;
      head.innerHTML = '<div><h1>' + esc(opt.title || L('齋期神譜環形曆', 'Ring calendar of sacred days')) + '</h1><p class="zr-lede">' + L('一個版本的全部神聖日，排成一個農曆年。', 'All the sacred days of one edition, laid out as a lunar year.') + (data.meta && data.meta.editionHtml ? ' ' + data.meta.editionHtml : EN() && ed ? ' ' + (data.meta.editionEn || NH(ed)) : '') + '</p></div>' +
        '<div class="zr-stats"><div><b>' + D.all.length + '</b><span>' + L('條目', 'entries') + '</span></div><div><b>' + days + '</b><span>' + L('個神聖日', 'sacred days') + '</span></div><div><b>' + Object.keys(gods).length + '</b><span>' + L('位神明', 'deities') + '</span></div><div><b>' + (days ? Math.round(on / days * 100) : 0) + '%</b><span>' + L('神聖日落在十齋日', 'of sacred days fall on the ten fast days') + '</span></div></div>';
      if (opt.headExtra) head.appendChild(opt.headExtra);
      if (opt.focus && opt.focus.note) { var fn = document.createElement('div'); fn.innerHTML = opt.focus.note; head.appendChild(fn.firstChild); }
      root.appendChild(head);
    }
    el.appendChild(root);
    var fns = { disc: disc, treemap: treemap, dom: dom, strips: strips, table: table, notes: function (r) { notes(r, data); } };
    (opt.sections || ['disc', 'treemap', 'dom', 'strips', 'table', 'notes']).forEach(function (s) { if (fns[s]) fns[s](root, D); });
    return root;
  },
  hideTip: hideTip,
  cur: function () { return CUR ? CUR.get() : null; },
  set: function (o) { if (CUR) CUR.set(o || {}); }
};
})();
