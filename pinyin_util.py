# -*- coding: utf-8 -*-
"""为网站英文版生成专有名词的拼音（不带声调），供 build_data.py、build_ring_data.py 使用。

规则：
- 人名、神名、地名（kind='name'）：每个词首字母大写，如 Jiutian Yingyuan Leisheng Puhua Tianzun
- 书名、篇名（kind='title'）：只有第一个词首字母大写，如 Zengbu zhujia xuanze guang yuxiaji
- 分词：先转简体，再按 pypinyin 自带词典做最长匹配；常用词另列在 WORDS
- 多音字或分词出错时，在 FIX 里写死（原文写法 → 拼音）

需要：pip install pypinyin opencc-python-reimplemented jieba（jieba 可选，有则分词更准）
"""
import logging
import re
import warnings

try:
    from opencc import OpenCC
    from pypinyin import lazy_pinyin
    from pypinyin.phrases_dict import phrases_dict
    _t2s = OpenCC('t2s').convert
    AVAILABLE = True
except ImportError:  # 没装就不生成拼音，英文版只显示汉字
    AVAILABLE = False
try:
    with warnings.catch_warnings():
        warnings.simplefilter('ignore')
        import jieba
    jieba.setLogLevel(logging.ERROR)
except ImportError:
    jieba = None

# 补充词（简体），帮助分词
WORDS = set('''
玉匣记 玉匣 真君 真人 天尊 大帝 菩萨 娘娘 元帅 将军 天君 天王 帝君 星君 夫人 圣母 元君 老君 祖师 天师 仙翁
观音 地藏 准提 斗姆 斗姥 九皇 雷祖 三官 灶君 城隍 土地 关帝 关王 吕祖 文昌 梓潼 真武 东岳 天妃 妈祖 弥勒 释迦 牟尼
普化 应元 雷声 九天 太乙 救苦 紫微 朱天 五通 五显 猛将 刘猛 祠山 花神 蛇王 潮神 白龙 药王 药师 阿弥陀 燃灯 达摩 普庵
笔记 通书 全书 宝钞 宝卷 宝鉴 广集 集要 选择 增补 增广 诸家 万全 敬信录 同善录 圣经 汇纂 玉历 钞传 警世 不可录 恐惧 修省
报恩论 众喜 粗言 清嘉录 岁华 纪丽 吴郡 杭俗 遗风 茶余 客话 申报 事林 广记 朝修 吉辰 穹窿 山志 禅门 日诵 寿康 灶君全书
时宪书 古今 类传 文瑛阁 听琴 仙馆 敬信 玉皇 后土 天曹 五岳 五帝 日光 天子 华严 张仙 二郎 马神 火神 井龙王 先师 圣人
增福 财神 洪恩 萨祖 马元帅 温元帅 赵元帅 殷太岁 太岁 蒿里 葛仙翁 灵济 王母 普贤 文殊 大势至 定光 江东 狄梁公 朱太尉
炳灵公 子孙 顶上 护法 龙天 四天王 龙树 十王 阎王 北斗 王灵官 辛天君 三茅 五路 白龙 八字 荷花 利济侯 永福侯 上方山
苏州 杭州 嘉兴 湖州 松江 常州 镇江 江宁 应天 太仓 常熟 吴江 昆山 元和 长洲 吴县 平湖 海宁 南浔 震泽 盛泽 上海 南汇 嘉定
宝山 青浦 金山 华亭 娄县 无锡 金匮 江阴 宜兴 溧阳 丹徒 丹阳 金坛 仁和 钱塘 海盐 桐乡 石门 秀水 乌程 归安 德清 武康 长兴
徽州 休宁 歙县 婺源 汉阳 洞庭 崇明 富阳 绍兴 宁波 慈溪
南斗 六司 太上 主者 之神 使者 府君 道君 大道君 北阴 天帝 先师 至圣
诞 诞辰 降 生日 府城 县城 乡镇 五祖 自订 年谱 日记 文集 全集 诗集 杂记 丛书 县志 府志 镇志 宗论 必读 灵验 纪略 岁时 风俗
'''.split())

# 直接指定（原文或简体写法 → 拼音，空格分词）
FIX = {
    '重阳': 'chongyang', '王重阳': 'Wang Chongyang', '长春': 'Changchun', '长春真人': 'Changchun zhenren',
    '酆都': 'Fengdu', '酆都大帝': 'Fengdu dadi', '曾氏': 'Zengshi', '单氏': 'Shanshi', '古今类传': 'Gujin leizhuan',
    '长斋': 'changzhai', '吃斋': 'chizhai', '茹素': 'rusu', '持斋': 'chizhai', '三长斋月': 'sanchang zhaiyue',
    '玉匣记': 'Yuxiaji', '许真君玉匣记': 'Xu zhenjun yuxiaji', '五杂组': 'Wu zazu', '茶余客话': 'Chayu kehua',
    '吴郡岁华纪丽': 'Wujun suihua jili', '清嘉录': 'Qingjia lu', '杭俗遗风': 'Hangsu yifeng', '申报': 'Shenbao',
    '众喜粗言': 'Zhongxi cuyan', '报恩论': "Bao'en lun", '同善录': 'Tongshan lu', '事林广记': 'Shilin guangji',
    '敬信录': 'Jingxin lu', '敬信录全书': 'Jingxin lu quanshu', '增订敬信录': 'Zengding jingxin lu',
    '圣经汇纂': 'Shengjing huizuan', '玉历宝钞': 'Yuli baochao', '玉历钞传警世': 'Yuli chaozhuan jingshi',
    '不可录': 'Buke lu', '恐惧修省录': 'Kongju xiusheng lu', '灶君全书': 'Zaojun quanshu', '寿康宝鉴': 'Shoukang baojian',
    '禅门日诵': 'Chanmen risong', '万全玉匣记': 'Wanquan yuxiaji', '增补诸家选择广玉匣记': 'Zengbu zhujia xuanze guang yuxiaji',
    '时宪书': 'Shixian shu', '听琴仙馆笔记': 'Tingqin xianguan biji', '文瑛阁': 'Wenying ge',
    '朝修吉辰章': 'Chaoxiu jichen zhang', '天皇至道太清玉册': 'Tianhuang zhidao taiqing yuce',
    '高王观音经注释': 'Gaowang guanyin jing zhushi', '净土资粮全集': 'Jingtu ziliang quanji',
    '地藏': 'Dizang', '观音': 'Guanyin', '释迦牟尼': 'Shijiamouni', '朱天大帝': 'Zhutian dadi',
    '九天应元雷声普化天尊': 'Jiutian Yingyuan Leisheng Puhua Tianzun', '雷祖': 'Leizu', '斗姆': 'Doumu', '斗姥': 'Doumu',
    '北斗': 'Beidou', '斗斋': 'douzhai', '星君': 'xingjun', '太岁': 'Taisui', '殷太岁': 'Yin Taisui',
    '灶君': 'Zaojun', '灶神': 'Zaoshen', '灶司': 'Zaosi', '刘猛将军': 'Liu Meng jiangjun', '刘猛将': 'Liu Meng jiang',
    '朝真': 'chaozhen', '圣降': 'shengjiang', '下降': 'xiajiang', '降魔': 'xiangmo',
    '阿弥陀佛': 'Amituofo', '阿弥陀': 'Amituo', '太上老君': 'Taishang Laojun', '王灵官': 'Wang Lingguan',
    '赵元帅': 'Zhao Yuanshuai', '温元帅': 'Wen Yuanshuai', '马元帅': 'Ma Yuanshuai', '狄梁公': 'Di Lianggong',
    '张仙': 'Zhang Xian', '朱太尉': 'Zhu Taiwei', '葛仙翁': 'Ge Xianweng', '萨祖师': 'Sa Zushi', '汪公': 'Wang Gong',
    '辛天君': 'Xin Tianjun', '关王': 'Guan Wang', '万历': 'Wanli', '乐园': 'Leyuan', '长洲': 'Changzhou', '长兴': 'Changxing', '石门': 'Shimen', '吴县': 'Wuxian',
    '常熟人家': 'Changshu renjia', '吴江人家': 'Wujiang renjia', '长生': 'changsheng',
    # 2026-10-29 拼音核对：统一分词与多音字
    '主者': 'Zhuzhe', '之神': 'Zhishen', '南斗': 'Nandou', '六司': 'Liusi', '太上': 'Taishang',
    '至圣先师': 'Zhisheng Xianshi', '道君': 'Daojun', '大道君': 'Da Daojun', '北阴': 'Beiyin', '天帝': 'Tiandi',
    '都元帅': 'Du Yuanshuai', '都水': 'Dushui', '都佥押': 'Du Qianya', '都城隍': 'Du Chenghuang', '都督': 'Dudu',
    '长素': 'changsu', '智藏': 'Zhizang', '徐来勒': 'Xu Laile', '太姥': 'Taimu', '天姥': 'Tianmu', '浔州': 'Xunzhou', '血湖': 'Xuehu', '索命': 'Suoming', '善报': 'Shanbao',
    '下元': 'Xiayuan', '解厄': "Jie'e", '水官': 'Shuiguan', '门丞户尉': 'Mencheng Huwei', '户尉': 'Huwei', '门神': 'Menshen',
    '和合': 'Hehe', '曾真人': 'Zeng Zhenren', '汪华': 'Wang Hua', '掠剩': 'Lüesheng', '道明和尚': 'Daoming Heshang',
    '冲和': 'Chonghe', '上圣': 'Shangsheng', '高真': 'Gaozhen', '妙行': 'Miaoxing', '七宿': 'Qixiu', '列宿': 'Liexiu',
    '七宿星': 'Qixiu xing', '和靖': 'Hejing', '尹大和': 'Yin Dahe', '尹太和': 'Yin Taihe', '行瘟': 'Xingwen',
}
# 官署、职司的前后缀：分词后若粘在别的字上就拆开（嶽府管…案主者、地府掌…獄主者、…州府）
SPLIT_SUFFIX = ('主者', '之神', '州府')
SPLIT_PREFIX = ('管', '掌')
# 词典里有、但会把神名拆错的词
BLOCK = {'佛诞', '神诞', '圣诞', '真人诞'}

# 单字读音（佛教语境中「佛」读 fo）
CHAR_FIX = {'佛': 'fo'}
_FIX = {}
_MAXW = 1


def _init():
    global _MAXW
    if _FIX or not AVAILABLE:
        return
    for k, v in FIX.items():
        _FIX[_t2s(k)] = v
    _MAXW = 12
    if jieba:
        for w in list(WORDS) + list(_FIX):
            if len(w) > 1:
                jieba.add_word(w, freq=200000)
        for w in ('案主', '狱主', '主者', '府管', '府掌'):
            jieba.del_word(w)
        jieba.add_word('主者', freq=500000)


def _segments(s):
    """简体字串做最长匹配分词；返回 [(词, 是否词典词)]。"""
    out, i = [], 0
    while i < len(s):
        for L in range(min(_MAXW, len(s) - i), 0, -1):
            w = s[i:i + L]
            known = w in _FIX or w in WORDS or (L > 1 and w in phrases_dict and w not in BLOCK)
            if known or L == 1:
                out.append((w, known))
                i += L
                break
    if jieba:
        out = []
        prev = ''
        for w in jieba.cut(s, HMM=True):
            pieces = [w]
            # 「宝胜佛诞」：把结尾的「诞」「降」分开
            if len(w) > 1 and w[-1] in '诞降' and w not in _FIX:
                pieces = [w[:-1], w[-1]]
            res = []
            for x in pieces:
                # 「府」「都」之后的「管」「掌」是动词，单独成词
                if len(x) > 1 and x[0] in SPLIT_PREFIX and (prev.endswith('府') or prev.endswith('都')) and x not in _FIX:
                    res += [x[0]]; x = x[1:]
                for suf in SPLIT_SUFFIX:
                    if len(x) > len(suf) and x.endswith(suf) and x not in _FIX:
                        head = x[:-len(suf)]
                        if suf == '州府':
                            res += [head + '州', '府']
                        else:
                            res += [head, suf]
                        break
                else:
                    res.append(x)
                prev = res[-1]
            out += [(x, True) for x in res if x]
        # 「…案」「…獄」接「主者」时，「案」「獄」单独成词（避免「命案」「报案」「河狱」粘连）
        fixed = []
        for j, (x, kn) in enumerate(out):
            nxt = out[j + 1][0] if j + 1 < len(out) else ''
            if nxt == '主者' and len(x) > 1 and x[-1] in '案狱' and x not in _FIX:
                fixed += [(x[:-1], True), (x[-1], True)]
            else:
                fixed.append((x, kn))
        return fixed
    # 连续的单字（未登录）两两合成一词；剩一个就并入前一组
    merged, run = [], []

    def flush():
        while run:
            take = 3 if len(run) == 3 else 2 if len(run) >= 2 else 1
            merged.append((''.join(run[:take]), False))
            del run[:take]

    for w, known in out:
        if not known and len(w) == 1:
            run.append(w)
        else:
            flush()
            merged.append((w, known))
    flush()
    return merged


def _join(sylls):
    """一词之内连写；a、e、o 开头的音节前加隔音符号（Hong'en、Pu'an）。"""
    out = ''
    for y in sylls:
        if out and y[:1] in 'aeo':
            out += "'"
        out += y
    return out


def _chunk_pinyin(chunk, kind):
    syl = lazy_pinyin(chunk, v_to_u=True)  # 整串转写，多音字按词语判断
    syl = [CHAR_FIX.get(c, y) for c, y in zip(chunk, syl)]
    words, pos = [], 0
    for w, known in _segments(chunk):
        if w in _FIX:
            words.append(_FIX[w])
        else:
            words.append(_join(syl[pos:pos + len(w)]))
        pos += len(w)
    if kind == 'term' and len(chunk) <= 3 and not any(w in _FIX for w, _ in _segments(chunk)):
        return [''.join(syl)]
    if kind == 'person' and '氏' in chunk[1:]:
        k = chunk.index('氏') + 1
        return [''.join(syl[:k])] + ([''.join(syl[k:])] if chunk[k:] else [])
    if kind == 'person' and len(chunk) <= 4 and len(words) <= 2:
        # 人名：姓与名分开（复姓不处理）
        whole = ''.join(syl)
        first = syl[0]
        words = [first, whole[len(first):]] if len(chunk) > 1 else [first]
    return words


def pinyin(text, kind='name'):
    """返回拼音；kind 为 name（神名、地名）、person（人名）、title（书名、篇名）、term（斋名等用语）。
    text 中括号及其后的注释不转写。"""
    if not AVAILABLE or not text:
        return ''
    _init()
    head = re.split(r'[（(［\[〔【「『〈《]', text, 1)[0].strip()
    head = head.strip('　 ，,；;：:、')
    if not re.search(r'[\u3400-\u9fff]', head):
        return ''
    s = _t2s(head)
    if s in _FIX and kind != 'name':
        res = _FIX[s]
        return res if kind == 'term' else res[0].upper() + res[1:]
    parts = []
    for chunk in re.split(r'([\u3400-\u9fff]+)', s):
        if not chunk:
            continue
        if re.match(r'[\u3400-\u9fff]', chunk):
            parts.extend(_chunk_pinyin(chunk, kind))
        else:
            c = chunk.replace('、', ', ').replace('，', ', ').replace('；', '; ').replace('：', ': ').replace('・', ' ').replace('·', ' ').replace('／', ' / ').strip()
            if c:
                parts.append(c)
    words = ' '.join(p for p in parts if p).split()
    if not words:
        return ''
    if kind in ('name', 'person'):
        words = [w[0].upper() + w[1:] if w[:1].isalpha() and w.islower() else w for w in words]
    elif kind == 'title':
        words[0] = words[0][0].upper() + words[0][1:]
    return ' '.join(words).replace(' ,', ',').replace(' ;', ';').replace(' :', ':')


# 不是专名、而是描述性称谓的「持斋者」，不注拼音
DESCRIPTIVE = re.compile(r'人家|者|众|男女|集体|泛指|某|兄弟|子孙|妇孺|信徒|居民|里民|乡民|善信|老少|诸|们|等')


def is_proper_person(text):
    head = re.split(r'[（(]', text, 1)[0]
    return bool(head) and len(head) <= 6 and not DESCRIPTIVE.search(head)


def build_map(items):
    """items: [(文字, kind)] → {文字: 拼音}，跳过无汉字或无法转写的。"""
    out = {}
    for text, kind in items:
        if kind == 'person' and text and not is_proper_person(text):
            continue
        if text and text not in out:
            p = pinyin(text, kind)
            if p:
                out[text] = p
    return out
