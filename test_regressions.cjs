const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const ring = fs.readFileSync(path.join(__dirname, 'ring.js'), 'utf8');
const part = (s, start, end) => s.slice(s.indexOf(start), s.indexOf(end, s.indexOf(start)));
new vm.Script(ring);
for (const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
  if (m[1].trim()) new vm.Script(m[1]);
}
const ctx = vm.createContext({});
vm.runInContext(part(html, 'function safeDecode(', 'function qsBuild('), ctx);
for (const text of ['%', '%E0%A4%A', '%FF', '%2']) assert.equal(ctx.safeDecode(text), text);
assert.equal(ctx.safeDecode('%E7%A5%9E'), '神');
assert.equal(ctx.qsParse('q=hello+world').q, 'hello world');
assert.equal(ctx.qsParse('q=%2B').q, '+');
assert.equal(ctx.qsParse('q=%').q, '%');
assert.equal((html.match(/decodeURIComponent\(/g) || []).length, 1);
vm.runInContext(part(html, 'var KCN =', 'function cmpBox('), ctx);
for (const [day, value] of [['初日', 1], ['初一日', 1], ['元日', 1], ['初十', 10], ['廿一', 21]]) {
  assert.equal(JSON.stringify(ctx.kDays({mo:'七月', dy:day})), JSON.stringify([7,[value]]));
}
assert.equal(JSON.stringify(ctx.kDays({mo:'九月',dy:'初一日至初九日；初十日'})), JSON.stringify([9,[1,2,3,4,5,6,7,8,9,10]]));
vm.runInContext(part(ring, 'function rangesOf(', 'function svgEl('), ctx);
const multi = {range:'9/1-9/9；9/10'};
assert.equal(ctx.rangesOf(multi).length, 2);
assert.equal(ctx.rangeHas(multi,9,10), true);
assert.equal(ctx.rangeHas(multi,9,11), false);
assert.equal(ctx.rangeHas(multi,8,10), false);
assert.equal(ctx.rangesOf({range:'1/8-1/15'}).length, 1);
assert.equal(ctx.rangeHas({range:'1/8-1/15'},1,15), true);
assert.equal(ctx.rangeHas({range:'1/8-1/15'},1,16), false);
assert.equal(ctx.rangesOf({range:'9/10;9/10'}).length, 1);
for (const range of ['bad','0/1','13/1','1/0','1/31','1/9-1/2','1.5/2']) assert.equal(ctx.rangesOf({range}).length,0);
// Exercise the actual rendering and filtering loops with a tiny SVG stand-in.
const entries = [multi, {range:'10/2-10/4'}];
Object.assign(ctx, {D:{ranges:entries},rngEls:[],MG:Array.from({length:13},()=>[]),RI:10,DR:2,svg:{},
  mStart:m=>m, wedge:()=>'', svgEl:()=>({attrs:{},setAttribute(k,v){this.attrs[k]=v;}})});
vm.runInContext(part(ring, '  D.ranges.forEach(function (r)', "  svgEl('circle'"), ctx);
assert.equal(ctx.rngEls.length,3);
assert.equal(ctx.rngEls[0].r,entries[0]);
assert.equal(ctx.rngEls[1].r,entries[0]);
assert.equal(ctx.rngEls[2].r,entries[1]);
Object.assign(ctx,{t:[],F:true,visible:()=>true,isFocus:r=>r===entries[1]});
vm.runInContext(ring.split('\n').find(s=>s.includes('rngEls.forEach')),ctx);
assert.equal(ctx.rngEls[0].el.attrs.opacity,0.1);
assert.equal(ctx.rngEls[1].el.attrs.opacity,0.1);
assert.equal(ctx.rngEls[2].el.attrs.opacity,1);
assert.equal(entries.filter(r=>ctx.rangeHas(r,9,10)).length,1);
assert.equal([{range:'9/1-9/10;9/5-9/12'}].filter(r=>ctx.rangeHas(r,9,7)).length,1);
console.log('PASS: URL decoding, day parsers, range membership, rendering-to-record mapping and focus; JavaScript syntax');
