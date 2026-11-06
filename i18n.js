/* 中／英／法界面切換
   - 語言存於瀏覽器（localStorage 'zhai-lang'）；網址加 ?lang=zh、?lang=en 或 ?lang=fr 可直接指定
   - 法文：L(zh, en, fr) 的第三個參數；沒給第三個參數時，按英文到 fr.js（window.ZHAI_FR，英文→法文對照表）裏查，查不到就顯示英文
   - I.en() 表示「西文界面」（英文或法文），專有名詞都顯示「拼音 漢字」；I.fr() 只在法文界面爲真
   - 專有名詞（人名、神名、地名、書名）不翻譯：英文界面顯示「拼音 漢字」，拼音由 build_data.py / build_ring_data.py 生成
   - 編碼取值（證據強度、時段、D/A/C/B 等）在 CODES 中給出英文
   - 研究筆記、摘要、原文等自由文本保持中文 */
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
  // 證據強度
  '明確': 'Explicit', '可推斷': 'Inferable', '僅日期巧合': 'Date coincidence only',
  // 實踐記錄與齋曆條目的對應關係（研究者覈定）
  '貼合': 'Fit', '存在偏差': 'With deviation', '存在偏差（無對應條目）': 'Deviation (no matching entry)', '不對應': 'No match',
  '待查': 'To check', '待確認刪除': 'Deletion to confirm',
  // 時段
  '晚明': 'Late Ming', '清代': 'Qing', '晚清民國': 'Late Qing & Republic', '明中期': 'Mid-Ming', '清': 'Qing', '民國': 'Republic', '明末': 'Late Ming', '明萬曆': 'Ming, Wanli 萬曆 era', '明萬曆': 'Ming, Wanli 萬曆 era',
  // 神明類型
  '佛': 'Buddhist', '道': 'Daoist', '地方': 'Local', '其他': 'Other', '未建檔': 'Not in deity register', '未分類': 'Unclassified', '儒': 'Confucian', '未定': 'Undetermined',
  // D 承諾途徑
  '誓願': 'Vow', '家庭慣例': 'Household custom', '社區': 'Community', '專業人員': 'Religious specialists', '不明': 'Unclear',
  // A 在場方式
  '紀念': 'Commemoration', '成就': 'Attainment', '聚會': 'Assembly', '巡察': 'Inspection', '經驗性顯靈': 'Experiential manifestation', '未說明': 'Not stated',
  // C 知識來源
  '援引書名': 'Cites a text', '降示': 'Revelation', '習俗': 'Custom',
  // B 關係形態
  '交換': 'Exchange', '專奉': 'Exclusive devotion', '社區義務': 'Communal obligation', '功德計算': 'Merit accounting', '混合': 'Mixed',
  // 形式
  '單日': 'Single day', '齋期': 'Fasting span', '月齋': 'Month-long fast', '長期': 'Long-term', '一日': 'One day', '三日': 'Three days',
  // 性別
  '女': 'Female', '男': 'Male', '男女': 'Male & female',
  // 史料類型
  '歲時記': 'Calendar of customs', '報刊': 'Newspaper', '風俗志': 'Customs record', '地方志': 'Local gazetteer', '地方志（鎮志）': 'Local gazetteer (town)',
  '靈驗記': 'Miracle tale', '善書證言/故事': 'Morality-book testimony', '善書': 'Morality book', '年譜': 'Chronological biography', '譜牒': 'Genealogy',
  '日記': 'Diary', '筆記': 'Miscellany (biji)', '寺志': 'Monastery gazetteer', '類書': 'Encyclopedia', '齋期表': 'Fasting calendar', '寶卷': 'Precious scroll',
  // 獲取狀態
  '已取得': 'Obtained', '未取得': 'Not obtained', '已取得（庫內閱讀）': 'Obtained (read in database)', '已取得（網絡電子文本）': 'Obtained (online e-text)',
  '只見檢索結果頁舉句': 'Search-result snippet only', '檢索結果頁摘句': 'Search-result snippet', '檢索結果頁摘句（原頁未開）': 'Search-result snippet (page not opened)',
  // 齋期表編碼
  '未比較': 'Not compared', '新增': 'Added', '沿襲': 'Retained', '刪除': 'Deleted', '節令': 'Seasonal festival',
  // 相關度
  '高': 'High', '中': 'Medium', '低': 'Low', '無': 'None',
  // 風俗志標籤
  '持齋（人茹素）': 'Fasting (people abstain)', '齋供（以素供神）': 'Vegetarian offering to gods', '齋會擺齋': 'Fasting assembly / meal',
  '齋僧': 'Feeding monks', '齋醮（僧道設醮）': 'Jiao rite by clergy', '月齋（非神誕）': 'Monthly fast (not a birthday)', '齋期飲食': 'Fasting-period food',
  '封齋開葷（齋期起訖）': 'Sealing and opening the fast', '規範性論述（齋）': 'Prescriptive discussion of zhai', '生命禮儀齋供': 'Life-cycle vegetarian offering',
  '喪葬中的素': 'Vegetarian food in funerals', '神誕節俗（未言齋）': 'Birthday festival (no fasting mentioned)', '進香（非神誕，未言齋）': 'Pilgrimage (not a birthday, no fasting)',
  '素食店業': 'Vegetarian food trade',
  // 諸本對照
  '正文': 'Main table', '表後附錄': 'Appendix after the table', '專項日表': 'Separate day list',
  '道藏': 'Daoist Canon', '專門單獨齋期': 'Standalone fast calendar', '專門單獨齋期（善書所收）': 'Standalone fast calendar (in a morality book)', '專門單獨齋期（二手轉述）': 'Standalone fast calendars (secondhand)', '寺院課誦本': 'Monastic liturgy book', '單行本': 'Separate edition', '單行本（通書）': 'Separate edition (almanac)', '通書': 'Almanac (tongshu)', '通書': 'Almanac (tongshu)',
  '通書（寫本）': 'Almanac (manuscript)', '通書（鉛印本）': 'Almanac (letterpress)', '日用類書': 'Daily-use encyclopedia', '善書': 'Morality book', '附刻（魯班經）': 'Appended to the Lu Ban jing 魯班經', '詞義噪音（素事等）': 'Lexical noise', '是': 'Yes', '否': 'No'
};

var MON = { '正': 1, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '十一': 11, '十二': 12, '冬': 11, '臘': 12, '臘': 12 };
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
var MON_RE = '(閏|閏)?(十一|十二|[正一二三四五六七八九十冬臘臘])月';
// 單獨的日子只在「初X」「X日」或前面是「至」「、」「，」、開頭時才算日期，避免把「四十天」讀成日期
var LONE_DAY = new RegExp('(^|[至、，,；;：\\s（(]|every month )(初十|初[一二三四五六七八九]|二十[一二三四五六七八九]?|廿[一二三四五六七八九]?|三十|十[一二三四五六七八九])(日)?(?![天年歲歲人條條種種])', 'g');
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
/** 英文 → 當前西文（法文界面查 fr.js，查不到原樣返回英文） */
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
  /** 按當前語言取字串 */
  L: function (zh, en, fr) { return lang === 'zh' ? zh : lang === 'fr' ? (fr != null ? fr : T(en)) : en; },
  T: T,
  /** 月份名：「正月」/「1st month」/「1er mois」；帶日：「1st month, day 8」/「1er mois, jour 8」 */
  mon: function (m) { return monName(m); },
  monDay: function (m, d) { return monName(m) + (lang === 'fr' ? ', jour ' : ', day ') + d; },
  /** 序數：1st / 1er */
  ordL: function (n) { return lang === 'fr' ? (n === 1 ? '1er' : n + 'e') : ord(n); },
  addPinyin: addPinyin,
  /** 拼音（無則空） */
  py: function (t) { return PY[t] || ''; },
  /** 專有名詞，返回 HTML：中文界面原樣；英文界面「拼音 漢字」，書名拼音爲斜體 */
  N: function (t) {
    if (t == null || t === '') return '';
    if (lang === 'zh' || !PY[t]) return esc(t);
    return (TITLE[t] ? '<i>' + esc(PY[t]) + '</i>' : esc(PY[t])) + ' ' + esc(t);
  },
  /** 同上，純文字（用於提示框、SVG） */
  NT: function (t) {
    if (t == null || t === '') return '';
    return lang !== 'zh' && PY[t] ? PY[t] + ' ' + t : String(t);
  },
  /** 編碼取值 */
  C: function (v) {
    if (lang === 'zh' || v == null || v === '') return v == null ? '' : v;
    var e = CODES[v] || CODES[String(v).trim()];
    return e ? T(e) : v;
  },
  /** 農曆日期文字轉英文：「六月二十四」→「6/24」，「正月」→「1st month」，「初八」→「day 8」 */
  D: function (t) {
    if (lang === 'zh' || !t) return t || '';
    // 「」內是原文引文，不改
    return String(t).split(/(「[^」]*」)/).map(function (seg, i) { return i % 2 ? seg : dateSeg(seg); }).join('');
  },
  /** 月日數字 */
  MD: function (m, d) { return m + '/' + d; },
  ord: ord,
  /** 切換後：更新 <html lang>、靜態文字（data-en 屬性）與按鈕 */
  apply: function () {
    document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : lang;
    document.querySelectorAll('[data-en]').forEach(function (el) {
      if (!el.hasAttribute('data-zh')) el.setAttribute('data-zh', el.innerHTML);
      el.innerHTML = lang === 'zh' ? el.getAttribute('data-zh') : T(el.getAttribute('data-en'));
    });
    document.querySelectorAll('.top .hbtn:not(#menu), #theme').forEach(function (el) { var t = el.textContent.replace(/^[^\w\u4e00-\u9fff]+/, ''); el.title = t; el.setAttribute('aria-label', t); });
    document.querySelectorAll('#langs [data-lang]').forEach(function (b) { var on = b.getAttribute('data-lang') === lang; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    document.title = { zh: '神誕齋期版本對照', en: 'Deity-Day Fasting Calendars', fr: 'Calendriers de jeûne des fêtes divines' }[lang];
  }
};
window.ZhaiI18n = I;
})();
