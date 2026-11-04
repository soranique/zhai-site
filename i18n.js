/* 中／英／法界面切换
   - 语言存于浏览器（localStorage 'zhai-lang'）；网址加 ?lang=zh、?lang=en 或 ?lang=fr 可直接指定
   - 法文：L(zh, en, fr) 的第三个参数；没给第三个参数时，按英文到 fr.js（window.ZHAI_FR，英文→法文对照表）里查，查不到就显示英文
   - I.en() 表示「西文界面」（英文或法文），专有名词都显示「拼音 汉字」；I.fr() 只在法文界面为真
   - 专有名词（人名、神名、地名、书名）不翻译：英文界面显示「拼音 汉字」，拼音由 build_data.py / build_ring_data.py 生成
   - 编码取值（证据强度、时段、D/A/C/B 等）在 CODES 中给出英文
   - 研究笔记、摘要、原文等自由文本保持中文 */
(function () {
'use strict';
var KEY = 'zhai-lang', lang = 'zh';
try {
  var q = new URLSearchParams(location.search).get('lang');
  if (q === 'en' || q === 'zh' || q === 'fr') { lang = q; localStorage.setItem(KEY, q); }
  else { var s = localStorage.getItem(KEY); if (s === 'en' || s === 'zh' || s === 'fr') lang = s; }
} catch (e) {}

var PY = {}, TITLE = {};
function addPinyin(map, titles) {
  if (map) for (var k in map) PY[k] = map[k];
  if (titles) for (var t in titles) { PY[t] = titles[t]; TITLE[t] = 1; }
}

var CODES = {
  // 证据强度
  '明确': 'Explicit', '可推断': 'Inferable', '仅日期巧合': 'Date coincidence only',
  // 实践记录与斋历条目的对应关系（研究者核定）
  '贴合': 'Fit', '存在偏差': 'With deviation', '存在偏差（无对应条目）': 'Deviation (no matching entry)', '不对应': 'No match',
  '待查': 'To check', '待确认删除': 'Deletion to confirm',
  // 时段
  '晚明': 'Late Ming', '清代': 'Qing', '晚清民国': 'Late Qing & Republic', '明中期': 'Mid-Ming', '清': 'Qing', '民国': 'Republic', '明末': 'Late Ming', '明萬曆': 'Ming, Wanli 萬曆 era', '明万历': 'Ming, Wanli 萬曆 era',
  // 神明类型
  '佛': 'Buddhist', '道': 'Daoist', '地方': 'Local', '其他': 'Other', '未建档': 'Not in deity register', '未分类': 'Unclassified', '儒': 'Confucian', '未定': 'Undetermined',
  // D 承诺途径
  '誓愿': 'Vow', '家庭惯例': 'Household custom', '社区': 'Community', '专业人员': 'Religious specialists', '不明': 'Unclear',
  // A 在场方式
  '纪念': 'Commemoration', '成就': 'Attainment', '聚会': 'Assembly', '巡察': 'Inspection', '经验性显灵': 'Experiential manifestation', '未说明': 'Not stated',
  // C 知识来源
  '援引书名': 'Cites a text', '降示': 'Revelation', '习俗': 'Custom',
  // B 关系形态
  '交换': 'Exchange', '专奉': 'Exclusive devotion', '社区义务': 'Communal obligation', '功德计算': 'Merit accounting', '混合': 'Mixed',
  // 形式
  '单日': 'Single day', '斋期': 'Fasting span', '月斋': 'Month-long fast', '长期': 'Long-term', '一日': 'One day', '三日': 'Three days',
  // 性别
  '女': 'Female', '男': 'Male', '男女': 'Male & female',
  // 史料类型
  '岁时记': 'Calendar of customs', '报刊': 'Newspaper', '风俗志': 'Customs record', '地方志': 'Local gazetteer', '地方志（镇志）': 'Local gazetteer (town)',
  '灵验记': 'Miracle tale', '善书证言/故事': 'Morality-book testimony', '善书': 'Morality book', '年谱': 'Chronological biography', '谱牒': 'Genealogy',
  '日记': 'Diary', '笔记': 'Miscellany (biji)', '寺志': 'Monastery gazetteer', '类书': 'Encyclopedia', '斋期表': 'Fasting calendar', '宝卷': 'Precious scroll',
  // 获取状态
  '已取得': 'Obtained', '未取得': 'Not obtained', '已取得（库内阅读）': 'Obtained (read in database)', '已取得（网络电子文本）': 'Obtained (online e-text)',
  '只见检索结果页举句': 'Search-result snippet only', '检索结果页摘句': 'Search-result snippet', '检索结果页摘句（原页未开）': 'Search-result snippet (page not opened)',
  // 斋期表编码
  '未比较': 'Not compared', '新增': 'Added', '沿袭': 'Retained', '删除': 'Deleted', '节令': 'Seasonal festival',
  // 相关度
  '高': 'High', '中': 'Medium', '低': 'Low', '无': 'None',
  // 风俗志标签
  '持斋（人茹素）': 'Fasting (people abstain)', '斋供（以素供神）': 'Vegetarian offering to gods', '斋会摆斋': 'Fasting assembly / meal',
  '斋僧': 'Feeding monks', '斋醮（僧道设醮）': 'Jiao rite by clergy', '月斋（非神诞）': 'Monthly fast (not a birthday)', '斋期饮食': 'Fasting-period food',
  '封斋开荤（斋期起讫）': 'Sealing and opening the fast', '规范性论述（斋）': 'Prescriptive discussion of zhai', '生命礼仪斋供': 'Life-cycle vegetarian offering',
  '丧葬中的素': 'Vegetarian food in funerals', '神诞节俗（未言斋）': 'Birthday festival (no fasting mentioned)', '进香（非神诞，未言斋）': 'Pilgrimage (not a birthday, no fasting)',
  '素食店业': 'Vegetarian food trade',
  // 诸本对照
  '正文': 'Main table', '表后附录': 'Appendix after the table', '专项日表': 'Separate day list',
  '道藏': 'Daoist Canon', '單行本': 'Separate edition', '單行本（通書）': 'Separate edition (almanac)', '通書': 'Almanac (tongshu)', '通书': 'Almanac (tongshu)',
  '通書（寫本）': 'Almanac (manuscript)', '通書（鉛印本）': 'Almanac (letterpress)', '日用類書': 'Daily-use encyclopedia', '善書': 'Morality book', '附刻（魯班經）': 'Appended to the Lu Ban jing 魯班經', '词义噪音（素事等）': 'Lexical noise', '是': 'Yes', '否': 'No'
};

var MON = { '正': 1, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '十一': 11, '十二': 12, '冬': 11, '腊': 12, '臘': 12 };
var DIG = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 };
function cnDay(t) {
  if (t[0] === '初') return t[1] === '十' ? 10 : DIG[t[1]];
  if (t === '三十' || t === '卅') return 30;
  if (t.indexOf('二十') === 0) return 20 + (DIG[t[2]] || 0);
  if (t[0] === '廿') return 20 + (DIG[t[1]] || 0);
  if (t[0] === '十') return 10 + (DIG[t[1]] || 0);
  return DIG[t] || null;
}
var DAY_RE = '(初十|初[一二三四五六七八九]|二十[一二三四五六七八九]?|廿[一二三四五六七八九]?|三十|卅|十[一二三四五六七八九]?)日?';
var MON_RE = '(闰|閏)?(十一|十二|[正一二三四五六七八九十冬腊臘])月';
// 单独的日子只在「初X」「X日」或前面是「至」「、」「，」、开头时才算日期，避免把「四十天」读成日期
var LONE_DAY = new RegExp('(^|[至、，,；;：\\s（(]|every month )(初十|初[一二三四五六七八九]|二十[一二三四五六七八九]?|廿[一二三四五六七八九]?|三十|十[一二三四五六七八九])(日)?(?![天年岁歲人条條种種])', 'g');
var DW = {
  en: { ic: 'intercal. ', icm: 'intercalary ', every: 'every month ', day: 'day ', whole: 'whole month', unfixed: 'unfixed' },
  fr: { ic: 'interc. ', icm: 'intercalaire ', every: 'chaque mois ', day: 'jour ', whole: 'mois entier', unfixed: 'non fixe' }
};
function monName(n) { return lang === 'fr' ? (n === 1 ? '1er' : n + 'e') + ' mois' : ord(n) + ' month'; }
function dateSeg(s) {
  var W = DW[lang] || DW.en, dw = W.day.trim();
  s = s.replace(new RegExp(MON_RE + DAY_RE, 'g'), function (_, leap, m, d) { return (leap ? W.ic : '') + MON[m] + '/' + cnDay(d) + ' '; });
  s = s.replace(new RegExp(MON_RE, 'g'), function (_, leap, m) { return lang === 'fr' ? monName(MON[m]) + (leap ? ' intercalaire' : '') + ' ' : (leap ? W.icm : '') + monName(MON[m]) + ' '; });
  s = s.replace(/每月[：:]?/g, W.every);
  s = s.replace(LONE_DAY, function (_, pre, d) { return pre + W.day + cnDay(d) + ' '; });
  s = s.replace(new RegExp('(\\d+)\\/(\\d+)\\s*至\\s*' + dw + ' (\\d+)', 'g'), '$1/$2–$1/$3').replace(new RegExp(dw + ' (\\d+)\\s*至\\s*' + dw + ' (\\d+)', 'g'), dw + ' $1–$2');
  s = s.replace(/整月/g, W.whole).replace(/不定/g, W.unfixed)
    .replace(/至/g, '–').replace(/、/g, ', ').replace(/；/g, '; ').replace(/，/g, ', ').replace(/（/g, ' (').replace(/）/g, ')');
  return s.replace(/\s+/g, ' ').replace(/\s+([,;)–])/g, '$1').replace(/–\s+/g, '–').replace(/\(\s+/g, '(').trim();
}
function ord(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

function FR() { return window.ZHAI_FR || {}; }
/** 英文 → 当前西文（法文界面查 fr.js，查不到原样返回英文） */
function T(en) { if (lang !== 'fr' || en == null) return en; var f = FR()[en]; return f != null ? f : en; }
var I = {
  get lang() { return lang; },
  en: function () { return lang === 'en' || lang === 'fr'; },
  fr: function () { return lang === 'fr'; },
  set: function (l) {
    lang = l === 'en' || l === 'fr' ? l : 'zh';
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    I.apply();
  },
  /** 按当前语言取字串 */
  L: function (zh, en, fr) { return lang === 'zh' ? zh : lang === 'fr' ? (fr != null ? fr : T(en)) : en; },
  T: T,
  /** 月份名：「正月」/「1st month」/「1er mois」；带日：「1st month, day 8」/「1er mois, jour 8」 */
  mon: function (m) { return monName(m); },
  monDay: function (m, d) { return monName(m) + (lang === 'fr' ? ', jour ' : ', day ') + d; },
  /** 序数：1st / 1er */
  ordL: function (n) { return lang === 'fr' ? (n === 1 ? '1er' : n + 'e') : ord(n); },
  addPinyin: addPinyin,
  /** 拼音（无则空） */
  py: function (t) { return PY[t] || ''; },
  /** 专有名词，返回 HTML：中文界面原样；英文界面「拼音 汉字」，书名拼音为斜体 */
  N: function (t) {
    if (t == null || t === '') return '';
    if (lang === 'zh' || !PY[t]) return esc(t);
    return (TITLE[t] ? '<i>' + esc(PY[t]) + '</i>' : esc(PY[t])) + ' ' + esc(t);
  },
  /** 同上，纯文字（用于提示框、SVG） */
  NT: function (t) {
    if (t == null || t === '') return '';
    return lang !== 'zh' && PY[t] ? PY[t] + ' ' + t : String(t);
  },
  /** 编码取值 */
  C: function (v) {
    if (lang === 'zh' || v == null || v === '') return v == null ? '' : v;
    var e = CODES[v] || CODES[String(v).trim()];
    return e ? T(e) : v;
  },
  /** 农历日期文字转英文：「六月二十四」→「6/24」，「正月」→「1st month」，「初八」→「day 8」 */
  D: function (t) {
    if (lang === 'zh' || !t) return t || '';
    // 「」内是原文引文，不改
    return String(t).split(/(「[^」]*」)/).map(function (seg, i) { return i % 2 ? seg : dateSeg(seg); }).join('');
  },
  /** 月日数字 */
  MD: function (m, d) { return m + '/' + d; },
  ord: ord,
  /** 切换后：更新 <html lang>、静态文字（data-en 属性）与按钮 */
  apply: function () {
    document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : lang;
    document.querySelectorAll('[data-en]').forEach(function (el) {
      if (!el.hasAttribute('data-zh')) el.setAttribute('data-zh', el.innerHTML);
      el.innerHTML = lang === 'zh' ? el.getAttribute('data-zh') : T(el.getAttribute('data-en'));
    });
    document.querySelectorAll('#langs [data-lang]').forEach(function (b) { var on = b.getAttribute('data-lang') === lang; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    document.title = { zh: '神诞斋期版本对照', en: 'Deity-Day Fasting Calendars', fr: 'Calendriers de jeûne des fêtes divines' }[lang];
  }
};
window.ZhaiI18n = I;
})();
