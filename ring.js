/* 斋期神谱环形历 · 网站模块
   用法：ZhaiRing.mount(容器元素, window.ZHAI_RING, 选项)
   选项（都可省略）：
     sections: ['disc','treemap','dom','strips','table','notes']  要显示的部分及顺序
     title:    页面标题（默认「斋期神谱环形历」）；传 false 则不输出标题
   不依赖任何库；只读 window.ZHAI_RING，不改动网站的 window.ZHAI。 */
(function () {
'use strict';
var NS = 'http://www.w3.org/2000/svg';
var MN = ['', '正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
var MS = ['', '正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
var NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
function DN(d) { return d <= 10 ? '初' + NUM[d] : d < 20 ? '十' + NUM[d - 10] : d === 20 ? '二十' : d < 30 ? '廿' + NUM[d - 20] : '三十'; }
function lunar(m, d) { return MN[m] + DN(d); }
var TR = {
  T: { lab: '道', c: '--zr-dao', pig: '石青' }, B: { lab: '佛', c: '--zr-fo', pig: '藤黄' },
  L: { lab: '地方', c: '--zr-di', pig: '石绿' }, C: { lab: '儒', c: '--zr-ru', pig: '朱砂' },
  Q: { lab: '其他', c: '--zr-qi', pig: '赭石' }, U: { lab: '未定', c: '--zr-wei', pig: '铅灰' }
};
var ORDER = ['T', 'B', 'L', 'C', 'Q', 'U'];
var SUF = { A: '成道', B: '朝真', D: '下降', P: '出家', S: '讳辰' };
var MAIN_SRC = ['玉匣記', '古今類傳', '文瑛閣', '聽琴仙館筆記'];
function one(c) { return c === 'N' || c === 'O' ? 'Q' : (TR[c] ? c : 'U'); }
function parts(n) { n = (n || '').replace('？', '?').trim(); if (!n || n === '?') return ['U']; return n.split('&').map(one); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function swatchCss(p) { return p.length > 1 ? 'linear-gradient(135deg,var(' + TR[p[0]].c + ') 50%,var(' + TR[p[1]].c + ') 50%)' : 'var(' + TR[p[0]].c + ')'; }
function tradLabel(r) { return r.p.map(function (k) { return TR[k].lab; }).join('＋'); }
function rangeOf(r) { var a = r.range.split(/[;；]/)[0].split('-').map(function (x) { return x.split('/').map(Number); }); return a; }
function svgEl(t, a, p) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }

// 共用的悬停提示
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
      s: MAIN_SRC.indexOf(r.src) >= 0 ? r.src : '其他出处' };
  });
  var daily = all.filter(function (r) { return !r.range; });
  var ranges = all.filter(function (r) { return r.range; });
  var byDay = {};
  daily.forEach(function (r) { var k = r.m * 100 + r.d; (byDay[k] = byDay[k] || []).push(r); });
  Object.keys(byDay).forEach(function (k) { byDay[k].sort(function (a, b) { return ORDER.indexOf(a.p[0]) - ORDER.indexOf(b.p[0]); }); });
  return { all: all, daily: daily, ranges: ranges, byDay: byDay, notesOmitted: !!(data.meta && data.meta.notesOmitted), TEN: (data.meta && data.meta.fastDays10) || [1, 8, 14, 15, 18, 23, 24, 28, 29, 30] };
}

// ---------- 历盘 ----------
function disc(root, D) {
  var sec = document.createElement('section'); sec.className = 'zr-sec';
  sec.innerHTML = '<div class="zr-hero"><div class="zr-disc"><svg viewBox="0 0 800 800" role="img" aria-label="历盘：十二个月扇区乘三十日环，每格显示当日的神圣日条目"></svg><div class="zr-steps" role="group" aria-label="逐层显示"></div></div><aside class="zr-panel" aria-live="polite"></aside></div>' +
    '<p class="zr-hint">十二个月是十二个扇区，从内到外是初一到三十；一格是一天，格中每一色块是一条神圣日条目。泥金色底格是十齋日。移动或点按一格查看当日，下方按钮可逐层显示。</p>';
  root.appendChild(sec);
  var svg = sec.querySelector('svg'), panel = sec.querySelector('.zr-panel'), stepsEl = sec.querySelector('.zr-steps');
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
  for (var m = 1; m <= 12; m++) {
    var a0 = mStart(m), a1 = a0 + MW;
    for (var d = 1; d <= 30; d++) {
      var r1 = RI + (d - 1) * DR + 0.45, r2 = RI + d * DR - 0.45, k = m * 100 + d;
      cells[k] = svgEl('path', { d: wedge(r1, r2, a0, a1), fill: 'var(--zr-cell)', 'class': 'zr-cell' }, gC);
      var list = D.byDay[k]; if (!list) continue;
      var n = list.length, span = (MW - 0.4 * (n - 1)) / n;
      list.forEach(function (r, j) {
        var s0 = a0 + j * (span + 0.4), s1 = s0 + span;
        if (r.p.length > 1) {
          var rm = (r1 + r2) / 2;
          slices.push({ el: svgEl('path', { d: wedge(r1, rm, s0, s1), fill: 'var(' + TR[r.p[0]].c + ')', 'class': 'zr-slice' }, gS), r: r });
          slices.push({ el: svgEl('path', { d: wedge(rm, r2, s0, s1), fill: 'var(' + TR[r.p[1]].c + ')', 'class': 'zr-slice' }, gS), r: r });
        } else slices.push({ el: svgEl('path', { d: wedge(r1, r2, s0, s1), fill: 'var(' + TR[r.p[0]].c + ')', 'class': 'zr-slice' }, gS), r: r });
      });
    }
    var lp = P(RO + 26, a0 + MW / 2);
    svgEl('text', { x: lp[0], y: lp[1], 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 18, 'font-weight': 700, fill: 'var(--zr-ink)' }, svg).textContent = MS[m] + '月';
  }
  [1, 8, 15, 23, 30].forEach(function (d) {
    svgEl('text', { x: C, y: C - (RI + (d - 0.5) * DR), 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 7.5, fill: 'var(--zr-gold)' }, svg).textContent = d;
  });
  D.ranges.forEach(function (r) {
    var a = rangeOf(r), s = a[0], e = a[1] || a[0], st = mStart(s[0]);
    rngEls.push(svgEl('path', { d: wedge(RI + (s[1] - 1) * DR, RI + e[1] * DR, st - 0.82, st - 0.08), fill: 'var(--zr-gold)', opacity: 0, style: 'transition:opacity .5s' }, svg));
  });
  svgEl('circle', { cx: C, cy: C, r: RI - 10, fill: 'none', stroke: 'var(--zr-line)' }, svg);
  var c1 = svgEl('text', { x: C, y: C - 8, 'text-anchor': 'middle', 'font-size': 28, 'font-weight': 700, fill: 'var(--zr-ink)' }, svg);
  var c2 = svgEl('text', { x: C, y: C + 26, 'text-anchor': 'middle', 'font-size': 13, fill: 'var(--zr-muted)' }, svg);
  var hl = svgEl('path', { d: '', fill: 'none', stroke: 'var(--zr-ink)', 'stroke-width': 1.6, 'pointer-events': 'none' }, svg);

  var STEPS = [
    { lab: '空白之年', fast: false, show: [] }, { lab: '十斋日', fast: true, show: [] },
    { lab: '道', fast: true, show: ['T'] }, { lab: '＋佛', fast: true, show: ['T', 'B'] },
    { lab: '＋地方・儒', fast: true, show: ['T', 'B', 'L', 'C'] }, { lab: '全部', fast: true, show: ORDER }];
  var step = 5, sel = null;
  stepsEl.innerHTML = STEPS.map(function (s, i) { return '<button type="button" data-i="' + i + '" aria-pressed="' + (i === step) + '"><i>' + (i + 1) + '</i>' + s.lab + '</button>'; }).join('');
  stepsEl.querySelectorAll('button').forEach(function (b) {
    b.onclick = function () { step = +b.getAttribute('data-i'); stepsEl.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); apply(); };
  });
  function apply() {
    var S = STEPS[step];
    Object.keys(cells).forEach(function (k) { cells[k].setAttribute('fill', S.fast && D.TEN.indexOf(k % 100) >= 0 ? 'var(--zr-fast)' : 'var(--zr-cell)'); });
    slices.forEach(function (o) { o.el.style.opacity = step === 5 || o.r.p.every(function (p) { return S.show.indexOf(p) >= 0; }) ? 1 : 0; });
    rngEls.forEach(function (e) { e.setAttribute('opacity', step === 5 ? 1 : 0); });
    if (!sel) {
      var shown = D.daily.filter(function (r) { return r.p.every(function (p) { return S.show.indexOf(p) >= 0; }); }).length;
      c1.textContent = step === 0 ? '一岁' : step === 1 ? '十斋' : '一岁神圣时间';
      c1.setAttribute('font-size', step < 2 ? 40 : 28);
      c2.textContent = step === 0 ? '十二月 · 三百六十日' : step === 1 ? '每月十日 · 一岁一百二十日' : (step === 5 ? D.all.length : shown) + ' 条';
    }
  }
  function legend() {
    return '<div class="zr-legend"><div>' + ORDER.map(function (k) { return '<span><i class="zr-sw" style="background:var(' + TR[k].c + ')"></i>' + TR[k].lab + '<span class="zr-hint">' + TR[k].pig + '</span></span>'; }).join('') +
      '</div><div><span><i class="zr-sw" style="background:var(--zr-fast);outline:1px solid var(--zr-gold)"></i>十斋日</span><span><i class="zr-sw" style="background:linear-gradient(135deg,var(--zr-dao) 50%,var(--zr-di) 50%)"></i>复合（内外两半）</span></div></div>';
  }
  function item(r) {
    return '<li><i class="zr-sw" style="background:' + swatchCss(r.p) + '"></i><div><div class="zr-nm">' + esc(r.name) +
      (SUF[r.suf] ? '<span class="zr-chip">' + SUF[r.suf] + '</span>' : '') + (r.range ? '<span class="zr-chip">' + esc(r.range) + '</span>' : '') +
      '</div><div class="zr-sub">' + tradLabel(r) + ' · ' + esc(r.src || '—') + (r.code ? ' · ' + esc(r.code) : '') + '</div>' +
      (r.note ? '<div class="zr-note">' + esc(r.note) + '</div>' : '') + '</div></li>';
  }
  function renderPanel() {
    if (!sel) {
      var top = Object.keys(D.byDay).map(function (k) { return [+k, D.byDay[k]]; }).sort(function (a, b) { return b[1].length - a[1].length; }).slice(0, 4);
      panel.innerHTML = '<div class="zr-eyebrow">最拥挤的日子</div><ul>' + top.map(function (t) {
        return '<li><i class="zr-sw" style="background:var(--zr-gold)"></i><div><div class="zr-nm">' + lunar(Math.floor(t[0] / 100), t[0] % 100) + '<span class="zr-chip">' + t[1].length + ' 条</span></div><div class="zr-sub">' + t[1].map(function (r) { return esc(r.name); }).join('、') + '</div></div></li>';
      }).join('') + '</ul>' + legend();
      return;
    }
    var m = Math.floor(sel / 100), d = sel % 100, list = D.byDay[sel] || [];
    var inR = D.ranges.filter(function (r) { var a = rangeOf(r), s = a[0], e = a[1] || a[0]; return m === s[0] && d >= s[1] && d <= e[1]; });
    panel.innerHTML = '<div><div class="zr-pd">' + lunar(m, d) + '</div><div class="zr-pmeta">' + list.length + ' 条' + (D.TEN.indexOf(d) >= 0 ? ' · 十斋日' : '') + '</div></div>' +
      (list.length || inR.length ? '<ul>' + list.map(item).join('') + inR.map(item).join('') + '</ul>' : '<p class="zr-hint">此日没有条目。</p>') + legend();
  }
  function pick(ev) {
    var b = svg.getBoundingClientRect(), s = 800 / b.width, x = (ev.clientX - b.left) * s - C, y = (ev.clientY - b.top) * s - C, r = Math.hypot(x, y);
    if (r < RI || r > RO) return;
    var a = Math.atan2(y, x) * 180 / Math.PI; if (a < -90) a += 360;
    var m = 0; for (var i = 1; i <= 12; i++) { if (a >= mStart(i) - GAP / 2 && a <= mStart(i) + MW + GAP / 2) { m = i; break; } }
    if (!m) return;
    var d = Math.min(30, Math.max(1, Math.floor((r - RI) / DR) + 1)), k = m * 100 + d;
    if (k === sel) return; sel = k;
    hl.setAttribute('d', wedge(RI + (d - 1) * DR, RI + d * DR, mStart(m), mStart(m) + MW));
    c1.setAttribute('font-size', 28); c1.textContent = lunar(m, d);
    c2.textContent = (D.byDay[k] || []).length + ' 条' + (D.TEN.indexOf(d) >= 0 ? ' · 十斋日' : '');
    renderPanel();
  }
  svg.addEventListener('pointermove', pick); svg.addEventListener('click', pick);
  apply(); renderPanel();
}

// ---------- 出处树图 ----------
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
  var sec = document.createElement('section'); sec.className = 'zr-sec';
  sec.innerHTML = '<div class="zr-eyebrow">这个版本由什么拼成</div><h2 style="margin:0">出处与性质</h2>' +
    '<p class="zr-lede">每一大块是一个出处，面积是条目数；块内按宗教性质再分。若某个出处专门提供某一传统的日子，它内部就只会有一种颜色。</p><div class="zr-tm"></div><p class="zr-finding"></p>';
  root.appendChild(sec);
  var box = sec.querySelector('.zr-tm');
  var srcs = MAIN_SRC.concat(['其他出处']).map(function (s) { return { k: s, v: D.all.filter(function (r) { return r.s === s; }).length }; }).filter(function (s) { return s.v; });
  function draw() {
    var W = box.clientWidth, H = box.clientHeight; if (!W || !H) return; box.innerHTML = '';
    squarify(srcs, 0, 0, W, H).forEach(function (S) {
      var rows = D.all.filter(function (r) { return r.s === S.k; });
      var groups = ORDER.concat(['MIX']).map(function (t) { return { k: t, v: rows.filter(function (r) { return r.t === t; }).length }; }).filter(function (g) { return g.v; });
      squarify(groups, S.x + 4, S.y + 4, S.w - 8, S.h - 8).forEach(function (g) {
        var dv = document.createElement('div'); dv.className = 'zr-blk';
        var lab = g.k === 'MIX' ? '复合' : TR[g.k].lab;
        dv.style.cssText = 'left:' + g.x + 'px;top:' + g.y + 'px;width:' + g.w + 'px;height:' + g.h + 'px;background:' +
          (g.k === 'MIX' ? 'repeating-linear-gradient(135deg,var(--zr-dao) 0 6px,var(--zr-di) 6px 12px)' : 'var(' + TR[g.k].c + ')');
        if (g.w > 34 && g.h > 22) dv.innerHTML = '<em>' + (g.w > 70 ? lab + ' ' : '') + g.v + '</em>';
        dv.addEventListener('pointermove', function (ev) { showTip(ev, '<b>' + esc(S.k) + '</b> · ' + lab + '<br>' + g.v + ' 条，占该出处 ' + Math.round(g.v / S.v * 100) + '%'); });
        dv.addEventListener('pointerleave', hideTip);
        box.appendChild(dv);
      });
      var o = document.createElement('div'); o.className = 'zr-src';
      o.style.cssText = 'left:' + S.x + 'px;top:' + S.y + 'px;width:' + S.w + 'px;height:' + S.h + 'px';
      if (S.w > 60 && S.h > 40) o.innerHTML = '<span style="font-size:' + Math.max(13, Math.min(24, S.w / (S.k.length + 1))) + 'px">' + esc(S.k) + '<small>' + S.v + ' 条</small></span>';
      box.appendChild(o);
    });
  }
  draw();
  var t; function onResize() { if (!box.isConnected) { removeEventListener('resize', onResize); return; } clearTimeout(t); t = setTimeout(draw, 120); }
  addEventListener('resize', onResize);
  function pct(s, k) { var n = D.all.filter(function (r) { return r.s === s; }).length; return n ? Math.round(D.all.filter(function (r) { return r.s === s && r.t === k; }).length / n * 100) : 0; }
  sec.querySelector('.zr-finding').textContent = '两大出处的内部构成几乎一样：玉匣記中道教占 ' + pct('玉匣記', 'T') + '%、佛教 ' + pct('玉匣記', 'B') + '%，古今類傳中道教占 ' + pct('古今類傳', 'T') + '%、佛教 ' + pct('古今類傳', 'B') + '%。没有哪个出处是「佛教的来源」或「道教的来源」。';
}

// ---------- 每月各日 ----------
function dom(root, D) {
  var sec = document.createElement('section'); sec.className = 'zr-sec';
  sec.innerHTML = '<div class="zr-eyebrow">检验 · 周期斋戒的底层节奏</div><h2 style="margin:0">每月第几日最拥挤</h2><p class="zr-lede">三十根柱子是一月三十日，泥金色是十斋日，虚线是平均值。</p><div class="zr-chart"><svg viewBox="0 0 960 300" role="img" aria-label="每月各日的条目数，十斋日以金色标出"></svg></div><p class="zr-finding"></p>';
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
    hit.addEventListener('pointermove', function (ev) { showTip(ev, '<b>' + DN(d) + '</b> · ' + cnt[d] + ' 条' + (on ? ' · 十斋日' : '')); });
    hit.addEventListener('pointerleave', hideTip);
    svgEl('text', { x: ml + (d - 0.5) * bw, y: H - mb + 18, 'text-anchor': 'middle', 'font-size': 12, fill: on ? 'var(--zr-gold)' : 'var(--zr-muted)', 'font-weight': on ? 700 : 400 }, S).textContent = DN(d).replace('初', '');
    if (on || cnt[d] >= 13) svgEl('text', { x: ml + (d - 0.5) * bw, y: top - 7, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--zr-ink)' }, S).textContent = cnt[d];
  })(d);
  var avg = D.daily.length / 30;
  svgEl('line', { x1: ml, x2: W - mr, y1: y(avg), y2: y(avg), stroke: 'var(--zr-muted)', 'stroke-dasharray': '3 4' }, S);
  svgEl('text', { x: W - mr, y: y(avg) - 6, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--zr-muted)' }, S).textContent = '平均 ' + avg.toFixed(1);
  // 结论文字按数据自动生成：十斋日中高于／低于平均的日子
  var hi = D.TEN.filter(function (d) { return cnt[d] > avg * 1.3; }), lo = D.TEN.filter(function (d) { return cnt[d] < avg * 0.75; });
  var tenE = D.TEN.reduce(function (s, d) { return s + cnt[d]; }, 0);
  sec.querySelector('.zr-finding').textContent = '十斋日占一月的三分之一，承载了 ' + Math.round(tenE / D.daily.length * 100) + '% 的条目，但并不均匀：' +
    hi.map(DN).join('、') + ' 远高于平均，' + lo.map(DN).join('、') + ' 却低于平均。神诞历贴合的是其中几个节点，而不是整套十斋。';
}

// ---------- 一神多日 ----------
function strips(root, D) {
  var sec = document.createElement('section'); sec.className = 'zr-sec';
  sec.innerHTML = '<div class="zr-eyebrow">一神多日</div><h2 style="margin:0">同一位神，散落在一年中</h2><p class="zr-lede">每一行是一位神明（按神明编号归组）在这一年中的全部日子：诞、成道、下降、朝真。版本比较时，比较单位应是「神明＋事件」。</p><div class="zr-strips"></div>';
  root.appendChild(sec);
  var box = sec.querySelector('.zr-strips'), M = {};
  D.all.forEach(function (r) { if (r.god) (M[r.god] = M[r.god] || []).push(r); });
  var rows = Object.keys(M).map(function (g) { return [g, M[g]]; }).filter(function (x) { return x[1].length > 1; })
    .sort(function (a, b) { return b[1].length - a[1].length || a[1][0].m - b[1][0].m; }).slice(0, 12);
  function clean(n) { return n.replace(/(誕辰|誕|成道|下降|降|朝真|得道|飛昇|出家|成佛|諱辰|降神)$/, '').replace(/^各戶/, ''); }
  rows.forEach(function (x) {
    var g = x[0], l = x[1], row = document.createElement('div'); row.className = 'zr-strip';
    row.innerHTML = '<div class="zr-g">' + esc(clean(l[0].name)) + '<small>' + l.length + ' 日 · G' + g + '</small></div>';
    var s = svgEl('svg', { viewBox: '0 0 720 30', preserveAspectRatio: 'none' }, row); box.appendChild(row);
    svgEl('line', { x1: 0, x2: 720, y1: 15, y2: 15, stroke: 'var(--zr-line)', 'vector-effect': 'non-scaling-stroke' }, s);
    for (var m = 0; m <= 12; m++) svgEl('line', { x1: m * 60, x2: m * 60, y1: 9, y2: 21, stroke: 'var(--zr-line)', 'vector-effect': 'non-scaling-stroke' }, s);
    l.forEach(function (r) {
      var px = (r.m - 1) * 60 + (r.d - 0.5) * 2;
      svgEl('rect', { x: px - 3, y: 5, width: 6, height: 20, rx: 1.5, fill: 'var(' + TR[r.p[0]].c + ')' }, s);
      var hit = svgEl('rect', { x: px - 9, y: 0, width: 18, height: 30, fill: 'transparent' }, s);
      hit.addEventListener('pointermove', function (ev) { showTip(ev, '<b>' + lunar(r.m, r.d) + '</b><br>' + esc(r.name) + (SUF[r.suf] ? ' · ' + SUF[r.suf] : '')); });
      hit.addEventListener('pointerleave', hideTip);
    });
  });
  var ax = document.createElement('div'); ax.className = 'zr-strip'; ax.innerHTML = '<div></div>';
  var s = svgEl('svg', { viewBox: '0 0 720 18', preserveAspectRatio: 'none', style: 'height:18px' }, ax);
  for (var m = 1; m <= 12; m++) svgEl('text', { x: (m - 0.5) * 60, y: 13, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--zr-muted)' }, s).textContent = MS[m];
  box.appendChild(ax);
}

// ---------- 全部条目 ----------
function table(root, D) {
  var sec = document.createElement('section'); sec.className = 'zr-sec';
  var withNotes = !D.notesOmitted;
  sec.innerHTML = '<details><summary>全部条目</summary><div class="zr-tools"><input type="search" placeholder="搜索名称、出处' + (withNotes ? '、附录' : '') + '…" aria-label="搜索条目"><span class="zr-hint"></span></div>' +
    '<div class="zr-tbl"><table><thead><tr><th>日期</th><th>名称</th><th>性质</th><th>出处</th><th>编号</th>' + (withNotes ? '<th>附录</th>' : '') + '</tr></thead><tbody></tbody></table></div></details>';
  root.appendChild(sec);
  var tb = sec.querySelector('tbody'), q = sec.querySelector('input'), qn = sec.querySelector('.zr-tools .zr-hint');
  function render() {
    var s = q.value.trim(), rows = D.all.filter(function (r) { return !s || [r.name, r.src, r.note, r.code, r.nat].join(' ').indexOf(s) >= 0; });
    qn.textContent = rows.length + ' / ' + D.all.length + ' 条';
    tb.innerHTML = rows.map(function (r) { return '<tr><td>' + (r.range ? esc(r.range) : lunar(r.m, r.d)) + '</td><td>' + esc(r.name) + '</td><td>' + tradLabel(r) + '</td><td>' + esc(r.src || '—') + '</td><td class="zr-mono">' + esc(r.code) + '</td>' + (withNotes ? '<td class="zr-nt">' + esc(r.note) + '</td>' : '') + '</tr>'; }).join('');
  }
  q.addEventListener('input', render); render();
}

function notes(root, data) {
  var sec = document.createElement('section'); sec.className = 'zr-sec';
  sec.innerHTML = '<div><div class="zr-eyebrow">读图前提</div><ul class="zr-notes">' +
    '<li>性质代码 T、B、L、C 读作道、佛、地方、儒；N、O 合为「其他」（含义待确认）。带 &amp; 的复合条目在历盘上一格分内外两半。</li>' +
    '<li>跨日斋期（如正月初八至十五、九月初一至初十）画成该月左侧的泥金细条，不计入每日条数。</li>' +
    '<li>编号后缀 A、B、D、P、S 依名称推断为成道、朝真、下降、出家、讳辰。</li>' +
    (data.meta && data.meta.notesOmitted ? '<li>公开版不收源表的「附錄」栏。</li>' : '') +
    '<li>数据：' + esc((data.meta && data.meta.edition) || '待确认') + '；源表 ' + esc((data.meta && data.meta.sourceFile) || '') + '，生成于 ' + esc((data.meta && data.meta.generated) || '') + '。</li></ul></div>';
  root.appendChild(sec);
}

window.ZhaiRing = {
  mount: function (el, data, opt) {
    opt = opt || {};
    data = data || window.ZHAI_RING;
    if (!data || !data.entries) { el.innerHTML = '<p>环形历数据未载入（缺少 ring-data.js）。</p>'; return; }
    var D = prepare(data);
    var root = document.createElement('div'); root.className = 'zr';
    if (opt.title !== false) {
      var days = Object.keys(D.byDay).length, gods = {}; D.all.forEach(function (r) { if (r.god) gods[r.god] = 1; });
      var on = Object.keys(D.byDay).filter(function (k) { return D.TEN.indexOf(k % 100) >= 0; }).length;
      var head = document.createElement('section'); head.className = 'zr-sec';
      head.innerHTML = '<div><h1>' + esc(opt.title || '斋期神谱环形历') + '</h1><p class="zr-lede">一个版本的全部神圣日，排成一个农历年。</p></div>' +
        '<div class="zr-stats"><div><b>' + D.all.length + '</b><span>条目</span></div><div><b>' + days + '</b><span>个神圣日</span></div><div><b>' + Object.keys(gods).length + '</b><span>位神明</span></div><div><b>' + Math.round(on / days * 100) + '%</b><span>神圣日落在十斋日</span></div></div>';
      root.appendChild(head);
    }
    el.appendChild(root);
    var fns = { disc: disc, treemap: treemap, dom: dom, strips: strips, table: table, notes: function (r) { notes(r, data); } };
    (opt.sections || ['disc', 'treemap', 'dom', 'strips', 'table', 'notes']).forEach(function (s) { if (fns[s]) fns[s](root, D); });
    return root;
  },
  hideTip: hideTip
};
})();
