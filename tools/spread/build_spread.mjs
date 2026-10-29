// 生成「流通地图」的数据 spread-data.js：
//   cd tools/spread && npm install && node build_spread.mjs
// 地点、说明、连线都在 spread_sources.json；底图为 Natural Earth 1:50m 海岸线（world-atlas），不画政区界线。
import fs from 'fs';
import { geoConicConformal, geoPath, geoGraticule } from 'd3-geo';
import { feature } from 'topojson-client';
const W = 760, H = 860;
const land = feature(JSON.parse(fs.readFileSync(new URL('./node_modules/world-atlas/land-50m.json', import.meta.url))), 'land');
const proj = geoConicConformal().parallels([25, 40]).rotate([-120, 0])
  .fitExtent([[10, 10], [W - 10, H - 10]], { type: 'MultiPoint', coordinates: [[109, 21.5], [135.5, 21.5], [109, 41.5], [135.5, 41.5]] })
  .clipExtent([[0, 0], [W, H]]);
const path = geoPath(proj).digits(1);
const grat = geoGraticule().step([5, 5]).extent([[100, 15], [140, 45]]);
const SRC = JSON.parse(fs.readFileSync(new URL('./spread_sources.json', import.meta.url)));
const P = SRC.places;
// 江南放大图：放在右上角（日本海一带，无地点）
const IB = [[W - 296, 14], [W - 14, 246]];
const reg = { type: 'MultiPoint', coordinates: [[118.2, 29.7], [122.4, 29.7], [118.2, 32.7], [122.4, 32.7]] };
const projI = geoConicConformal().parallels([25, 40]).rotate([-120, 0]).fitExtent([[IB[0][0] + 10, IB[0][1] + 24], [IB[1][0] - 10, IB[1][1] - 10]], reg).clipExtent(IB);
const pathI = geoPath(projI).digits(1);
const box = [[118.2, 29.7], [122.4, 29.7], [122.4, 32.7], [118.2, 32.7]].map(c => proj(c).map(v => +v.toFixed(1)));
for (const p of P) { const [x, y] = proj([p.lon, p.lat]); p.x = +x.toFixed(1); p.y = +y.toFixed(1); if (p.jn) { const [a, b] = projI([p.lon, p.lat]); p.ix = +a.toFixed(1); p.iy = +b.toFixed(1); } }
const data = { W, H, land: path(land), grat: path(grat()), inset: { box: IB, land: pathI(land), reg: box }, places: P,
  info: SRC.INFO, fam: SRC.FAM, edges: SRC.EDGES, unk: SRC.UNK, lbl: SRC.LBL, ilbl: SRC.ILBL };
fs.writeFileSync(new URL('../../spread-data.js', import.meta.url), '// 由 tools/spread/build_spread.mjs 自动生成，请勿手改；资料改 spread_sources.json\nwindow.ZHAI_SPREAD = ' + JSON.stringify(data) + ';\n');
console.log('地点 %d、连线 %d', P.length, SRC.EDGES.length);
