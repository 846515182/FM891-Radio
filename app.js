'use strict';

/* ============================================================
 * 时光电台 —— 频道配置
 * 品牌：时光电台 · 拾起耳朵里的好时光
 * 全国台单 v1.14：共 887 路，全部为国内直播源（lhttp.qtfm.cn 稳定平台），
 * 每一路都经过「手机 UA + 实收字节 + 有效码率 ≥ 40kbps」门禁实测后收录。
 * 境外台（radioparadise / radiofrance / dancewave / laut.fm）已按产品要求全部下架。
 * 分类 cat：music 音乐 / story 说书 / opera 戏曲 / news 新闻 /
 *           traffic 交通 / economy 财经 / life 生活 / local 地方
 * 支持格式：.mp3 / .aac 直链，以及 .m3u8（HLS，自动加载 hls.js）
 * 注意：网页若部署在 https，直播源也必须是 https，否则会被「混合内容」拦截。
 * 第 0–4 位为迁移锚点，顺序不可改动（老用户下标迁移依赖）。
 * ============================================================
 */
const STATIONS = [
  { id: 'hits', name: '华语流行热歌', desc: '华语热门金曲 · 24 小时连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/1110/64k.mp3' }, // 重点推荐 · 默认频道
  { id: 'huayu', name: '华语音乐台（备用线路）', desc: '华语流行 · 云端断线时的备用线路', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20500215/64k.mp3' },
  { id: 'classic-pop', name: '经典流行', desc: '华语经典流行 · 老歌情怀', cat: 'music', url: 'https://lhttp.qtfm.cn/live/4938/64k.mp3' },
  { id: 'bj-music', name: '音乐前线', desc: '华语乐坛新歌与经典并行', cat: 'music', url: 'https://lhttp.qtfm.cn/live/332/64k.mp3' },
  { id: 'years', name: '年代金曲', desc: '上世纪华语年代金曲重温', cat: 'music', url: 'https://lhttp-hw.qtfm.cn/live/1223/64k.mp3' },
  { id: 'news-15318317', name: '中国之声', desc: '中央台 · 全国覆盖', cat: 'news', url: 'https://lhttp.qtfm.cn/live/15318317/64k.mp3' },
  { id: 'news-20500172', name: '国际新闻', desc: '中央台 · 全国覆盖', cat: 'news', url: 'https://lhttp.qtfm.cn/live/20500172/64k.mp3' },
  { id: 'music-5022308', name: '500首华语经典', desc: '音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/5022308/64k.mp3' },
  { id: 'music-1947', name: '安徽音乐广播', desc: '安徽 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/1947/64k.mp3' },
  { id: 'music-20211621', name: '北海交通音乐广播 BTR FM99.1', desc: '北海 · FM99.1 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20211621/64k.mp3' },
  { id: 'music-20519', name: '滨州交通音乐广播', desc: '滨州 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20519/64k.mp3' },
  { id: 'music-3954', name: '沧州交通音乐广播', desc: '沧州 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/3954/64k.mp3' },
  { id: 'music-2799', name: '常州音乐广播', desc: '常州 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/2799/64k.mp3' },
  { id: 'music-4594', name: '潮州交通音乐广播', desc: '潮州 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/4594/64k.mp3' },
  { id: 'music-20211694', name: '成安综合广播久久金曲 FM99.9', desc: 'FM99.9 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20211694/64k.mp3' },
  { id: 'music-5022395', name: '达州交通音乐广播', desc: '达州 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/5022395/64k.mp3' },
  { id: 'music-1084', name: '大连音乐广播', desc: '大连 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/1084/64k.mp3' },
  { id: 'music-20500212', name: '大庆音乐广播', desc: '大庆 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20500212/64k.mp3' },
  { id: 'music-20142', name: '东营交通音乐广播', desc: '东营 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20142/64k.mp3' },
  { id: 'music-20500064', name: '动感调频FM94.3 沙湾人民广播电台综合广播', desc: 'FM94.3 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20500064/64k.mp3' },
  { id: 'music-5022107', name: '动听音乐台', desc: '音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/5022107/64k.mp3' },
  { id: 'music-5022719', name: '恩施交通音乐广播', desc: '音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/5022719/64k.mp3' },
  { id: 'music-20500015', name: '抚州交通音乐广播', desc: '音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20500015/64k.mp3' },
  { id: 'music-4942', name: '赣州交通音乐广播', desc: '赣州 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/4942/64k.mp3' },
  { id: 'music-20211619', name: '固安综合广播 1079音乐有话说', desc: '音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20211619/64k.mp3' },
  { id: 'music-1260', name: '广东广播 - 音乐之声', desc: '广东 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/1260/64k.mp3' },
  { id: 'music-4875', name: '广西文艺广播 FM950广西音乐台', desc: '广西 · FM950 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/4875/64k.mp3' },
  { id: 'music-20192', name: '广州金曲音乐广播', desc: '广州 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20192/64k.mp3' },
  { id: 'music-20067', name: '贵州音乐广播', desc: '贵州 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20067/64k.mp3' },
  { id: 'music-5022338', name: '哈尔滨古典音乐广播', desc: '哈尔滨 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/5022338/64k.mp3' },
  { id: 'music-5022640', name: '海门交通音乐台', desc: '音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/5022640/64k.mp3' },
  { id: 'music-3950', name: '邯郸交通音乐广播', desc: '邯郸 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/3950/64k.mp3' },
  { id: 'music-15318413', name: '韩城交通音乐广播', desc: '音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/15318413/64k.mp3' },
  { id: 'music-15318146', name: '杭州城市资讯广播 FM90.7杭州潮流音乐电台', desc: '杭州 · FM90.7 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/15318146/64k.mp3' },
  { id: 'music-1975', name: '合肥汽车音乐', desc: '合肥 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/1975/64k.mp3' },
  { id: 'music-20210755', name: '河南星河音乐广播', desc: '河南 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20210755/64k.mp3' },
  { id: 'music-20500163', name: '鹤山市湾区音乐台', desc: '音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20500163/64k.mp3' },
  { id: 'music-4969', name: '黑龙江音乐广播', desc: '黑龙江 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/4969/64k.mp3' },
  { id: 'music-1296', name: '湖北经典音乐广播', desc: '湖北 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/1296/64k.mp3' },
  { id: 'music-4979', name: '湖南音乐之声', desc: '湖南 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/4979/64k.mp3' },
  { id: 'music-4804', name: '怀集音乐之声', desc: '音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/4804/64k.mp3' },
  { id: 'music-20207776', name: '黄冈交通音乐广播', desc: '黄冈 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20207776/64k.mp3' },
  { id: 'music-20211679', name: '吉林市音乐广播', desc: '吉林 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20211679/64k.mp3' },
  { id: 'music-1671', name: '济南音乐广播', desc: '济南 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/1671/64k.mp3' },
  { id: 'music-4936', name: '江苏音乐广播 PlayFM897', desc: '江苏 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/4936/64k.mp3' },
  { id: 'music-1802', name: '江西广播电视台文艺音乐广播', desc: '江西 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/1802/64k.mp3' },
  { id: 'music-20500160', name: '金堂综合广播FM88.9 成都年代音乐怀旧好声音', desc: '成都 · FM88.9 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20500160/64k.mp3' },
  { id: 'music-267', name: '经典音乐广播', desc: '音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/267/64k.mp3' },
  { id: 'music-20212210', name: '九江年代音乐台', desc: '九江 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20212210/64k.mp3' },
  { id: 'music-4569', name: '开封音乐广播', desc: '开封 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/4569/64k.mp3' },
  { id: 'music-20211620', name: '涞水县流行音乐广播999正青春', desc: '音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20211620/64k.mp3' },
  { id: 'music-4864', name: '乐山音乐交通广播', desc: '乐山 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/4864/64k.mp3' },
  { id: 'music-20500149', name: '两广之声音乐台', desc: '音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20500149/64k.mp3' },
  { id: 'music-1101', name: '辽宁广播电视台音乐广播', desc: '辽宁 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/1101/64k.mp3' },
  { id: 'music-20021', name: '辽宁经典流行音乐广播', desc: '辽宁 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20021/64k.mp3' },
  { id: 'music-4017', name: '临沂音乐科教广播', desc: '临沂 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/4017/64k.mp3' },
  { id: 'music-5021559', name: '泸州交通音乐广播', desc: '泸州 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/5021559/64k.mp3' },
  { id: 'music-1226', name: '洛阳音乐广播', desc: '洛阳 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/1226/64k.mp3' },
  { id: 'music-20207781', name: '眉山交通音乐广播', desc: '眉山 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20207781/64k.mp3' },
  { id: 'music-21001', name: '米东广播电台（新疆990音乐广播）', desc: '新疆 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/21001/64k.mp3' },
  { id: 'music-4026', name: '绵阳交通音乐广播', desc: '绵阳 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/4026/64k.mp3' },
  { id: 'music-5022604', name: '南部交通音乐·南部人民广播电台', desc: '音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/5022604/64k.mp3' },
  { id: 'music-1804', name: '南昌交通音乐广播', desc: '南昌 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/1804/64k.mp3' },
  { id: 'music-20767', name: '南宁交通音乐广播', desc: '南宁 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20767/64k.mp3' },
  { id: 'music-1212', name: '南阳交通音乐广播', desc: '南阳 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/1212/64k.mp3' },
  { id: 'music-1886', name: '内蒙古音乐之声', desc: '内蒙古 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/1886/64k.mp3' },
  { id: 'music-15318294', name: '宁夏音乐广播', desc: '宁夏 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/15318294/64k.mp3' },
  { id: 'music-4905', name: '攀枝花交通音乐广播', desc: '攀枝花 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/4905/64k.mp3' },
  { id: 'music-20500137', name: '汽车音乐广播FM942（宜宾叙州电台）', desc: '宜宾 · FM942 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20500137/64k.mp3' },
  { id: 'music-1677', name: '青岛音乐•体育广播', desc: '青岛 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/1677/64k.mp3' },
  { id: 'music-5009', name: '青海交通音乐卫星广播', desc: '青海 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/5009/64k.mp3' },
  { id: 'music-4915', name: '清晨音乐电台', desc: '音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/4915/64k.mp3' },
  { id: 'music-1739', name: '厦门音乐 广播', desc: '厦门 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/1739/64k.mp3' },
  { id: 'music-1665', name: '山东音乐广播FM99.1', desc: '山东 · FM99.1 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/1665/64k.mp3' },
  { id: 'music-4873', name: '陕西音乐广播', desc: '陕西 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/4873/64k.mp3' },
  { id: 'music-273', name: '上海经典金曲广播 FM103.7', desc: '上海 · FM103.7 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/273/64k.mp3' },
  { id: 'music-20342', name: '十堰交通音乐广播', desc: '十堰 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20342/64k.mp3' },
  { id: 'music-1654', name: '石家庄音乐广播', desc: '音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/1654/64k.mp3' },
  { id: 'music-20500150', name: '顺德音乐之声', desc: '音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20500150/64k.mp3' },
  { id: 'music-2803', name: '苏州都市音乐广播', desc: '苏州 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/2803/64k.mp3' },
  { id: 'music-1144', name: '台州音乐广播', desc: '台州 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/1144/64k.mp3' },
  { id: 'music-1185', name: '太原音乐广播', desc: '太原 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/1185/64k.mp3' },
  { id: 'music-20207780', name: '托峰明珠交通音乐·温宿人民广播电台', desc: '音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20207780/64k.mp3' },
  { id: 'music-5022725', name: '宛城都市音乐广播', desc: '音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/5022725/64k.mp3' },
  { id: 'music-15318631', name: '潍坊新闻广播·88.1音乐之声', desc: '潍坊 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/15318631/64k.mp3' },
  { id: 'music-5022389', name: '渭南音乐广播', desc: '渭南 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/5022389/64k.mp3' },
  { id: 'music-1149', name: '温州私家车音乐广播', desc: '温州 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/1149/64k.mp3' },
  { id: 'music-15318704', name: '乌海交通音乐广播', desc: '音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/15318704/64k.mp3' },
  { id: 'music-1920', name: '乌鲁木齐旅游音乐广播', desc: '乌鲁木齐 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/1920/64k.mp3' },
  { id: 'music-2779', name: '无锡音乐广播', desc: '无锡 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/2779/64k.mp3' },
  { id: 'music-15318549', name: '湘潭新闻综合广播 私家车音乐广播FM88.2', desc: '湘潭 · FM88.2 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/15318549/64k.mp3' },
  { id: 'music-15318481', name: '邢台交通•音乐广播', desc: '邢台 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/15318481/64k.mp3' },
  { id: 'music-20500097', name: '烟台经典音乐广播', desc: '烟台 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20500097/64k.mp3' },
  { id: 'music-5022380', name: '盐城音乐广播', desc: '盐城 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/5022380/64k.mp3' },
  { id: 'music-2805', name: '扬州经济音乐广播', desc: '扬州 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/2805/64k.mp3' },
  { id: 'music-5022036', name: '鹰潭交通音乐广播', desc: '音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/5022036/64k.mp3' },
  { id: 'music-20500187', name: '云梦音乐台', desc: '音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20500187/64k.mp3' },
  { id: 'music-1929', name: '云南音乐广播', desc: '云南 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/1929/64k.mp3' },
  { id: 'music-1689', name: '枣庄音乐·人文广播', desc: '音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/1689/64k.mp3' },
  { id: 'music-4930', name: '长沙品味音乐广播', desc: '长沙 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/4930/64k.mp3' },
  { id: 'music-20847', name: '长沙BIG RADIO流行音乐广播', desc: '长沙 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20847/64k.mp3' },
  { id: 'music-4866', name: '浙江音乐广播', desc: '浙江 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/4866/64k.mp3' },
  { id: 'music-1223', name: '郑州经典音乐广播', desc: '郑州 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/1223/64k.mp3' },
  { id: 'music-4921', name: '郑州人民广播电台 音乐广播', desc: '郑州 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/4921/64k.mp3' },
  { id: 'music-20500148', name: '中江县年代音乐994', desc: '音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20500148/64k.mp3' },
  { id: 'music-1161', name: '舟山交通音乐广播 FM97', desc: 'FM97 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/1161/64k.mp3' },
  { id: 'music-5021381', name: '涿州综合广播年代音乐959', desc: '音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/5021381/64k.mp3' },
  { id: 'music-5022405', name: 'AsiaFM高清音乐台', desc: '音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/5022405/64k.mp3' },
  { id: 'music-4913', name: 'BIG BIG MIX – 乐享音乐 标清', desc: '音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/4913/64k.mp3' },
  { id: 'music-20500153', name: 'CityFM城市音乐台', desc: '音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20500153/64k.mp3' },
  { id: 'music-15318703', name: 'CRI劲曲调频 HIT FM（成都）', desc: '中央台 · 全国覆盖', cat: 'music', url: 'https://lhttp.qtfm.cn/live/15318703/64k.mp3' },
  { id: 'music-5022382', name: 'FM89.8烟台汽车音乐广播', desc: '烟台 · FM89.8 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/5022382/64k.mp3' },
  { id: 'music-20500196', name: 'FM98.6城市音乐广播·信都区融媒体中心', desc: 'FM98.6 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20500196/64k.mp3' },
  { id: 'music-20194', name: 'MY FM全国音乐频道·广州', desc: '广州 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/20194/64k.mp3' },
  { id: 'music-274', name: 'Shanghai FM 101 上海动感101', desc: '上海 · 音乐广播 · 经典与新歌连播', cat: 'music', url: 'https://lhttp.qtfm.cn/live/274/64k.mp3' },
  { id: 'story-1951', name: '安徽小说评书', desc: '安徽 · 故事评书 · 说书听书', cat: 'story', url: 'https://lhttp.qtfm.cn/live/1951/64k.mp3' },
  { id: 'story-1961', name: '合肥故事广播', desc: '合肥 · 故事评书 · 说书听书', cat: 'story', url: 'https://lhttp.qtfm.cn/live/1961/64k.mp3' },
  { id: 'story-5021940', name: '衡水交通评书广播', desc: '故事评书 · 说书听书', cat: 'story', url: 'https://lhttp.qtfm.cn/live/5021940/64k.mp3' },
  { id: 'story-1672', name: '济南故事广播', desc: '济南 · 故事评书 · 说书听书', cat: 'story', url: 'https://lhttp.qtfm.cn/live/1672/64k.mp3' },
  { id: 'story-20500092', name: '江西故事广播', desc: '江西 · 故事评书 · 说书听书', cat: 'story', url: 'https://lhttp.qtfm.cn/live/20500092/64k.mp3' },
  { id: 'story-5022511', name: '山西广播电视台故事广播', desc: '山西 · 故事评书 · 说书听书', cat: 'story', url: 'https://lhttp.qtfm.cn/live/5022511/64k.mp3' },
  { id: 'story-269', name: '上海戏剧曲艺广播 AM1197 FM97.2', desc: '上海 · AM1197 · 故事评书 · 说书听书', cat: 'story', url: 'https://lhttp.qtfm.cn/live/269/64k.mp3' },
  { id: 'story-5028', name: '芜湖音乐故事广播', desc: '芜湖 · 故事评书 · 说书听书', cat: 'story', url: 'https://lhttp.qtfm.cn/live/5028/64k.mp3' },
  { id: 'opera-1952', name: '安徽戏曲广播', desc: '安徽 · 戏曲曲艺 · 传统戏曲连播', cat: 'opera', url: 'https://lhttp.qtfm.cn/live/1952/64k.mp3' },
  { id: 'opera-4595', name: '潮州戏曲广播', desc: '潮州 · 戏曲曲艺 · 传统戏曲连播', cat: 'opera', url: 'https://lhttp.qtfm.cn/live/4595/64k.mp3' },
  { id: 'opera-20211678', name: '廊坊戏曲广播·飞扬105', desc: '廊坊 · 戏曲曲艺 · 传统戏曲连播', cat: 'opera', url: 'https://lhttp.qtfm.cn/live/20211678/64k.mp3' },
  { id: 'opera-20211622', name: '苏州戏曲广播', desc: '苏州 · 戏曲曲艺 · 传统戏曲连播', cat: 'opera', url: 'https://lhttp.qtfm.cn/live/20211622/64k.mp3' },
  { id: 'opera-20500178', name: '听·越剧', desc: '戏曲曲艺 · 传统戏曲连播', cat: 'opera', url: 'https://lhttp.qtfm.cn/live/20500178/64k.mp3' },
  { id: 'news-15318224', name: '安阳新闻综合广播', desc: '新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/15318224/64k.mp3' },
  { id: 'news-5022440', name: '保定新闻频道', desc: '保定 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/5022440/64k.mp3' },
  { id: 'news-20861', name: '北海广播电视台新闻综合广播', desc: '北海 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/20861/64k.mp3' },
  { id: 'news-339', name: '北京新闻广播', desc: '北京 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/339/64k.mp3' },
  { id: 'news-2798', name: '常州新闻综合广播', desc: '常州 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/2798/64k.mp3' },
  { id: 'news-20500052', name: '承德新闻综合广播', desc: '承德 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/20500052/64k.mp3' },
  { id: 'news-20207747', name: '大理州新闻综合广播', desc: '新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/20207747/64k.mp3' },
  { id: 'news-1089', name: '大连新闻综合广播', desc: '大连 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/1089/64k.mp3' },
  { id: 'news-20211690', name: '大同新闻综合广播', desc: '大同 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/20211690/64k.mp3' },
  { id: 'news-20500209', name: '第一师阿拉尔人民广播电台新闻综合广播', desc: '阿拉尔 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/20500209/64k.mp3' },
  { id: 'news-1731', name: '福建新闻广播', desc: '福建 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/1731/64k.mp3' },
  { id: 'news-5025', name: '福州新闻广播', desc: '福州 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/5025/64k.mp3' },
  { id: 'news-20500226', name: '抚州新闻综合广播', desc: '新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/20500226/64k.mp3' },
  { id: 'news-5022622', name: '甘肃新闻综合广播', desc: '甘肃 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/5022622/64k.mp3' },
  { id: 'news-1254', name: '广东广播 - 新闻广播', desc: '广东 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/1254/64k.mp3' },
  { id: 'news-1753', name: '广西综合广播 新闻910', desc: '广西 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/1753/64k.mp3' },
  { id: 'news-1861', name: '海南新闻广播', desc: '海南 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/1861/64k.mp3' },
  { id: 'news-5072', name: '邯郸新闻综合广播', desc: '邯郸 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/5072/64k.mp3' },
  { id: 'news-20212380', name: '合肥新闻广播 合肥新闻第一台', desc: '合肥 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/20212380/64k.mp3' },
  { id: 'news-4974', name: '黑龙江新闻广播', desc: '黑龙江 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/4974/64k.mp3' },
  { id: 'news-1301', name: '黄冈新闻综合广播', desc: '黄冈 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/1301/64k.mp3' },
  { id: 'news-3978', name: '吉林资讯广播', desc: '吉林 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/3978/64k.mp3' },
  { id: 'news-1667', name: '济南新闻综合广播', desc: '济南 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/1667/64k.mp3' },
  { id: 'news-1154', name: '嘉兴新闻广播', desc: '嘉兴 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/1154/64k.mp3' },
  { id: 'news-1809', name: '江西广播电视台新闻广播', desc: '江西 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/1809/64k.mp3' },
  { id: 'news-5022557', name: '焦作新闻综合广播', desc: '焦作 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/5022557/64k.mp3' },
  { id: 'news-5022018', name: '辽宁资讯广播', desc: '辽宁 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/5022018/64k.mp3' },
  { id: 'news-20709', name: '龙岩新闻综合广播', desc: '龙岩 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/20709/64k.mp3' },
  { id: 'news-20525', name: '南部新闻综合·南部人民广播电台', desc: '新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/20525/64k.mp3' },
  { id: 'news-1883', name: '内蒙古新闻综合广播', desc: '内蒙古 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/1883/64k.mp3' },
  { id: 'news-20212414', name: '普兰店区新闻综合广播', desc: '新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/20212414/64k.mp3' },
  { id: 'news-1673', name: '青岛新闻广播', desc: '青岛 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/1673/64k.mp3' },
  { id: 'news-20444', name: '衢州新闻广播', desc: '衢州 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/20444/64k.mp3' },
  { id: 'news-15318346', name: '泉州新闻综合广播', desc: '泉州 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/15318346/64k.mp3' },
  { id: 'news-1600', name: '陕西新闻广播', desc: '陕西 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/1600/64k.mp3' },
  { id: 'news-275', name: '上海东广新闻资讯广播', desc: '上海 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/275/64k.mp3' },
  { id: 'news-270', name: '上海新闻广播 FM93.4 AM990', desc: '上海 · FM93.4 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/270/64k.mp3' },
  { id: 'news-20024', name: '沈阳新闻广播', desc: '沈阳 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/20024/64k.mp3' },
  { id: 'news-2808', name: '苏州新闻广播', desc: '苏州 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/2808/64k.mp3' },
  { id: 'news-5022134', name: '天津新闻广播', desc: '天津 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/5022134/64k.mp3' },
  { id: 'news-21303', name: '铜陵新闻广播', desc: '铜陵 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/21303/64k.mp3' },
  { id: 'news-20669', name: '威海新闻综合广播', desc: '威海 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/20669/64k.mp3' },
  { id: 'news-20320', name: '潍坊新闻广播', desc: '潍坊 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/20320/64k.mp3' },
  { id: 'news-1918', name: '乌鲁木齐新闻广播', desc: '乌鲁木齐 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/1918/64k.mp3' },
  { id: 'news-2776', name: '无锡新闻综合广播AM1161', desc: '无锡 · AM1161 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/2776/64k.mp3' },
  { id: 'news-2777', name: '无锡新闻综合广播FM93.7', desc: '无锡 · FM93.7 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/2777/64k.mp3' },
  { id: 'news-20198', name: '武汉新闻广播', desc: '武汉 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/20198/64k.mp3' },
  { id: 'news-5022282', name: '西宁新闻综合广播', desc: '西宁 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/5022282/64k.mp3' },
  { id: 'news-5022064', name: '孝感新闻综合广播', desc: '孝感 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/5022064/64k.mp3' },
  { id: 'news-1902', name: '新疆汉语新闻广播', desc: '新疆 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/1902/64k.mp3' },
  { id: 'news-20211628', name: '邢台新闻广播', desc: '邢台 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/20211628/64k.mp3' },
  { id: 'news-4922', name: '徐州新闻综合广播', desc: '徐州 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/4922/64k.mp3' },
  { id: 'news-1682', name: '烟台新闻广播', desc: '烟台 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/1682/64k.mp3' },
  { id: 'news-5022488', name: '延边汉语新闻综合广播', desc: '延边 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/5022488/64k.mp3' },
  { id: 'news-5000', name: '扬州新闻广播', desc: '扬州 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/5000/64k.mp3' },
  { id: 'news-20565', name: '宜昌新闻综合广播', desc: '宜昌 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/20565/64k.mp3' },
  { id: 'news-20537', name: '义乌新闻', desc: '新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/20537/64k.mp3' },
  { id: 'news-15318594', name: '永州新闻综合广播', desc: '永州 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/15318594/64k.mp3' },
  { id: 'news-5022031', name: '玉溪新闻综合广播', desc: '玉溪 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/5022031/64k.mp3' },
  { id: 'news-1926', name: '云南新闻广播', desc: '云南 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/1926/64k.mp3' },
  { id: 'news-5022096', name: '张掖新闻综合广播', desc: '张掖 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/5022096/64k.mp3' },
  { id: 'news-4877', name: '长沙新闻广播', desc: '长沙 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/4877/64k.mp3' },
  { id: 'news-21249', name: '昭通乌蒙之声新闻综合广播', desc: '昭通 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/21249/64k.mp3' },
  { id: 'news-1220', name: '郑州人民广播电台 新闻广播', desc: '郑州 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/1220/64k.mp3' },
  { id: 'news-1160', name: '舟山新闻综合广播 FM998', desc: 'FM998 · 新闻广播 · 全天资讯', cat: 'news', url: 'https://lhttp.qtfm.cn/live/1160/64k.mp3' },
  { id: 'traffic-1909', name: '929新疆私家车广播', desc: '新疆 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1909/64k.mp3' },
  { id: 'traffic-1910', name: '949新疆交通广播', desc: '新疆 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1910/64k.mp3' },
  { id: 'traffic-1949', name: '安徽交通广播', desc: '安徽 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1949/64k.mp3' },
  { id: 'traffic-5021862', name: '安康交通广播', desc: '安康 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/5021862/64k.mp3' },
  { id: 'traffic-2138', name: '安阳交通广播', desc: '交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/2138/64k.mp3' },
  { id: 'traffic-1895', name: '巴彦淖尔交通广播', desc: '交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1895/64k.mp3' },
  { id: 'traffic-5022104', name: '巴音郭楞交通广播', desc: '交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/5022104/64k.mp3' },
  { id: 'traffic-20209340', name: '巴中交通旅游广播', desc: '巴中 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/20209340/64k.mp3' },
  { id: 'traffic-4577', name: '蚌埠交通文艺广播', desc: '蚌埠 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/4577/64k.mp3' },
  { id: 'traffic-1890', name: '包头交通广播', desc: '包头 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1890/64k.mp3' },
  { id: 'traffic-15318128', name: '宝鸡交通旅游广播', desc: '宝鸡 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/15318128/64k.mp3' },
  { id: 'traffic-20168', name: '保定交通频道', desc: '保定 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/20168/64k.mp3' },
  { id: 'traffic-336', name: '北京交通广播', desc: '北京 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/336/64k.mp3' },
  { id: 'traffic-20440', name: '昌吉交通广播', desc: '交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/20440/64k.mp3' },
  { id: 'traffic-15318209', name: '常德交通广播', desc: '常德 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/15318209/64k.mp3' },
  { id: 'traffic-2796', name: '常州交通广播', desc: '常州 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/2796/64k.mp3' },
  { id: 'traffic-20719', name: '朝阳交通广播', desc: '交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/20719/64k.mp3' },
  { id: 'traffic-20867', name: '郴州交通广播', desc: '郴州 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/20867/64k.mp3' },
  { id: 'traffic-15318216', name: '承德交通文艺广播', desc: '承德 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/15318216/64k.mp3' },
  { id: 'traffic-1899', name: '赤峰交通广播', desc: '交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1899/64k.mp3' },
  { id: 'traffic-20500061', name: '大庆交通广播', desc: '大庆 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/20500061/64k.mp3' },
  { id: 'traffic-5022548', name: '德宏交通旅游广播', desc: '交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/5022548/64k.mp3' },
  { id: 'traffic-20212230', name: '定西交通广播', desc: '交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/20212230/64k.mp3' },
  { id: 'traffic-20352', name: '鄂尔多斯交通文体广播', desc: '鄂尔多斯 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/20352/64k.mp3' },
  { id: 'traffic-1733', name: '福建交通广播', desc: '福建 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1733/64k.mp3' },
  { id: 'traffic-5026', name: '福州交通之声', desc: '福州 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/5026/64k.mp3' },
  { id: 'traffic-1971', name: '阜阳交通广播', desc: '阜阳 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1971/64k.mp3' },
  { id: 'traffic-3939', name: '甘肃交通广播', desc: '甘肃 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/3939/64k.mp3' },
  { id: 'traffic-20212386', name: '公主岭交通之声', desc: '交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/20212386/64k.mp3' },
  { id: 'traffic-1262', name: '广东广播 - 羊城交通之声', desc: '广东 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1262/64k.mp3' },
  { id: 'traffic-1756', name: '广西教育广播 私家车930', desc: '广西 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1756/64k.mp3' },
  { id: 'traffic-20057', name: '贵州交通广播', desc: '贵州 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/20057/64k.mp3' },
  { id: 'traffic-5022079', name: '海南交通广播', desc: '海南 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/5022079/64k.mp3' },
  { id: 'traffic-1960', name: '合肥交通广播', desc: '合肥 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1960/64k.mp3' },
  { id: 'traffic-4973', name: '黑龙江交通广播', desc: '黑龙江 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/4973/64k.mp3' },
  { id: 'traffic-15318385', name: '衡阳交通经济广播', desc: '衡阳 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/15318385/64k.mp3' },
  { id: 'traffic-5021545', name: '呼和浩特交通广播', desc: '呼和浩特 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/5021545/64k.mp3' },
  { id: 'traffic-1291', name: '湖北楚天交通广播', desc: '湖北 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1291/64k.mp3' },
  { id: 'traffic-4879', name: '湖南交通广播', desc: '湖南 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/4879/64k.mp3' },
  { id: 'traffic-2811', name: '湖州交通文艺广播', desc: '湖州 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/2811/64k.mp3' },
  { id: 'traffic-5022070', name: '怀化交通文艺广播', desc: '怀化 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/5022070/64k.mp3' },
  { id: 'traffic-4586', name: '淮安交通文艺', desc: '淮安 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/4586/64k.mp3' },
  { id: 'traffic-20211647', name: '淮北交通广播', desc: '淮北 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/20211647/64k.mp3' },
  { id: 'traffic-4924', name: '淮海网 - 徐州交通广播', desc: '徐州 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/4924/64k.mp3' },
  { id: 'traffic-4923', name: '淮海网 - 徐州私家车广播', desc: '徐州 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/4923/64k.mp3' },
  { id: 'traffic-1969', name: '黄山交通旅游之声广播', desc: '黄山 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1969/64k.mp3' },
  { id: 'traffic-1819', name: '吉林市交通广播', desc: '吉林 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1819/64k.mp3' },
  { id: 'traffic-1669', name: '济南交通广播', desc: '济南 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1669/64k.mp3' },
  { id: 'traffic-20087', name: '济宁交通文艺广播', desc: '济宁 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/20087/64k.mp3' },
  { id: 'traffic-1135', name: '嘉兴交通广播', desc: '嘉兴 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1135/64k.mp3' },
  { id: 'traffic-1811', name: '江西信息交通广播', desc: '江西 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1811/64k.mp3' },
  { id: 'traffic-20805', name: '焦作交通旅游广播', desc: '焦作 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/20805/64k.mp3' },
  { id: 'traffic-1189', name: '晋城交通广播', desc: '交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1189/64k.mp3' },
  { id: 'traffic-1312', name: '荆州交通广播', desc: '荆州 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1312/64k.mp3' },
  { id: 'traffic-5021918', name: '九江交通广播', desc: '九江 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/5021918/64k.mp3' },
  { id: 'traffic-1214', name: '开封交通广播', desc: '开封 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1214/64k.mp3' },
  { id: 'traffic-3948', name: '廊坊交通长书广播', desc: '廊坊 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/3948/64k.mp3' },
  { id: 'traffic-20025', name: '辽宁交通广播', desc: '辽宁 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/20025/64k.mp3' },
  { id: 'traffic-5022030', name: '辽阳交通文艺广播', desc: '交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/5022030/64k.mp3' },
  { id: 'traffic-5022263', name: '聊城交通广播', desc: '聊城 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/5022263/64k.mp3' },
  { id: 'traffic-3993', name: '临沂交通旅游广播', desc: '临沂 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/3993/64k.mp3' },
  { id: 'traffic-20571', name: '柳州交通广播', desc: '柳州 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/20571/64k.mp3' },
  { id: 'traffic-20507', name: '娄底交通广播', desc: '娄底 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/20507/64k.mp3' },
  { id: 'traffic-4899', name: '吕梁交通广播', desc: '交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/4899/64k.mp3' },
  { id: 'traffic-1227', name: '洛阳交通广播', desc: '洛阳 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1227/64k.mp3' },
  { id: 'traffic-5022452', name: '漯河交通广播', desc: '交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/5022452/64k.mp3' },
  { id: 'traffic-5021907', name: '内江交通广播', desc: '内江 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/5021907/64k.mp3' },
  { id: 'traffic-1884', name: '内蒙古交通之声', desc: '内蒙古 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1884/64k.mp3' },
  { id: 'traffic-5022421', name: '平顶山交通广播', desc: '平顶山 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/5022421/64k.mp3' },
  { id: 'traffic-5022409', name: '萍乡交通文艺广播', desc: '交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/5022409/64k.mp3' },
  { id: 'traffic-1233', name: '濮阳交通广播', desc: '交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1233/64k.mp3' },
  { id: 'traffic-20212429', name: '普洱交通广播', desc: '普洱 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/20212429/64k.mp3' },
  { id: 'traffic-5022285', name: '黔东南交通广播', desc: '交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/5022285/64k.mp3' },
  { id: 'traffic-5045', name: '黔西南交通旅游广播', desc: '交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/5045/64k.mp3' },
  { id: 'traffic-20849', name: '秦皇岛交通广播', desc: '交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/20849/64k.mp3' },
  { id: 'traffic-1676', name: '青岛交通广播', desc: '青岛 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1676/64k.mp3' },
  { id: 'traffic-20442', name: '衢州交通广播', desc: '衢州 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/20442/64k.mp3' },
  { id: 'traffic-15318189', name: '泉州交通广播', desc: '泉州 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/15318189/64k.mp3' },
  { id: 'traffic-4005', name: '日照交通生活广播 RZBC-2', desc: '日照 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/4005/64k.mp3' },
  { id: 'traffic-1738', name: '厦门经济交通广播', desc: '厦门 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1738/64k.mp3' },
  { id: 'traffic-1601', name: '陕西交通广播', desc: '陕西 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1601/64k.mp3' },
  { id: 'traffic-5021932', name: '商丘交通广播', desc: '商丘 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/5021932/64k.mp3' },
  { id: 'traffic-266', name: '上海交通广播 FM105.7', desc: '上海 · FM105.7 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/266/64k.mp3' },
  { id: 'traffic-1272', name: '深圳交通广播', desc: '深圳 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1272/64k.mp3' },
  { id: 'traffic-1655', name: '石家庄交通广播', desc: '交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1655/64k.mp3' },
  { id: 'traffic-4886', name: '四川交通广播', desc: '四川 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/4886/64k.mp3' },
  { id: 'traffic-2806', name: '苏州交通经济广播', desc: '苏州 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/2806/64k.mp3' },
  { id: 'traffic-5004', name: '宿迁交通广播', desc: '宿迁 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/5004/64k.mp3' },
  { id: 'traffic-20180', name: '遂宁交通旅游广播', desc: '遂宁 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/20180/64k.mp3' },
  { id: 'traffic-1146', name: '台州交通广播', desc: '台州 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1146/64k.mp3' },
  { id: 'traffic-4900', name: '太原交通广播', desc: '太原 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/4900/64k.mp3' },
  { id: 'traffic-1659', name: '唐山交通文艺广播', desc: '唐山 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1659/64k.mp3' },
  { id: 'traffic-20211613', name: '天水交通广播频道', desc: '天水 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/20211613/64k.mp3' },
  { id: 'traffic-20211615', name: '铜仁交通旅游广播', desc: '铜仁 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/20211615/64k.mp3' },
  { id: 'traffic-20671', name: '威海交通广播', desc: '威海 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/20671/64k.mp3' },
  { id: 'traffic-4014', name: '潍坊交通广播', desc: '潍坊 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/4014/64k.mp3' },
  { id: 'traffic-1156', name: '温州交通广播', desc: '温州 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1156/64k.mp3' },
  { id: 'traffic-1919', name: '乌鲁木齐交通广播', desc: '乌鲁木齐 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1919/64k.mp3' },
  { id: 'traffic-2780', name: '无锡交通广播', desc: '无锡 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/2780/64k.mp3' },
  { id: 'traffic-5022283', name: '西宁交通文艺广播', desc: '西宁 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/5022283/64k.mp3' },
  { id: 'traffic-21269', name: '湘潭交通广播', desc: '湘潭 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/21269/64k.mp3' },
  { id: 'traffic-1229', name: '新乡交通广播', desc: '新乡 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1229/64k.mp3' },
  { id: 'traffic-20093', name: '新余经济交通广播', desc: '交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/20093/64k.mp3' },
  { id: 'traffic-5022095', name: '许昌交通广播', desc: '许昌 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/5022095/64k.mp3' },
  { id: 'traffic-5023', name: '宣城交通文艺广播', desc: '宣城 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/5023/64k.mp3' },
  { id: 'traffic-1684', name: '烟台交通广播', desc: '烟台 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1684/64k.mp3' },
  { id: 'traffic-15318331', name: '延吉交通之声', desc: '交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/15318331/64k.mp3' },
  { id: 'traffic-2804', name: '扬州交通广播', desc: '扬州 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/2804/64k.mp3' },
  { id: 'traffic-15318165', name: '阳泉交通广播', desc: '交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/15318165/64k.mp3' },
  { id: 'traffic-5022689', name: '伊犁文艺交通广播', desc: '交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/5022689/64k.mp3' },
  { id: 'traffic-20563', name: '宜昌交通广播', desc: '宜昌 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/20563/64k.mp3' },
  { id: 'traffic-3982', name: '宜兴交通广播', desc: '交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/3982/64k.mp3' },
  { id: 'traffic-20533', name: '义乌交通', desc: '交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/20533/64k.mp3' },
  { id: 'traffic-15318153', name: '益阳交通广播', desc: '益阳 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/15318153/64k.mp3' },
  { id: 'traffic-20211563', name: '玉溪交通旅游广播', desc: '玉溪 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/20211563/64k.mp3' },
  { id: 'traffic-20987', name: '岳阳交通广播', desc: '岳阳 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/20987/64k.mp3' },
  { id: 'traffic-1928', name: '云南交通之声', desc: '云南 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1928/64k.mp3' },
  { id: 'traffic-1688', name: '枣庄交通·文艺广播', desc: '交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1688/64k.mp3' },
  { id: 'traffic-1743', name: '漳州交通广播', desc: '漳州 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1743/64k.mp3' },
  { id: 'traffic-4967', name: '长春交通之声', desc: '长春 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/4967/64k.mp3' },
  { id: 'traffic-3967', name: '长沙交通广播', desc: '长沙 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/3967/64k.mp3' },
  { id: 'traffic-5021851', name: '长治交通广播', desc: '长治 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/5021851/64k.mp3' },
  { id: 'traffic-21247', name: '昭通交通旅游广播', desc: '昭通 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/21247/64k.mp3' },
  { id: 'traffic-3985', name: '镇江交通广播', desc: '镇江 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/3985/64k.mp3' },
  { id: 'traffic-1211', name: '郑州交通广播', desc: '郑州 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1211/64k.mp3' },
  { id: 'traffic-15318700', name: '周口交通广播', desc: '周口 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/15318700/64k.mp3' },
  { id: 'traffic-3971', name: '株洲交通广播', desc: '株洲 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/3971/64k.mp3' },
  { id: 'traffic-1679', name: '淄博电台私家车广播', desc: '淄博 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/1679/64k.mp3' },
  { id: 'traffic-20741', name: '遵义交通文艺广播', desc: '遵义 · 交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/20741/64k.mp3' },
  { id: 'traffic-15318569', name: 'Auto FM汽车联播网', desc: '交通广播 · 路况与出行', cat: 'traffic', url: 'https://lhttp.qtfm.cn/live/15318569/64k.mp3' },
  { id: 'economy-4916', name: '安徽经济广播', desc: '安徽 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/4916/64k.mp3' },
  { id: 'economy-5021880', name: '朝阳经济广播 AM648', desc: 'AM648 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/5021880/64k.mp3' },
  { id: 'economy-1121', name: '成都经济广播', desc: '成都 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/1121/64k.mp3' },
  { id: 'economy-20211689', name: '大同经济文艺广播', desc: '大同 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/20211689/64k.mp3' },
  { id: 'economy-5022110', name: '德阳经济生活广播', desc: '德阳 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/5022110/64k.mp3' },
  { id: 'economy-276', name: '第一财经', desc: '经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/276/64k.mp3' },
  { id: 'economy-1732', name: '福建经济广播', desc: '福建 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/1732/64k.mp3' },
  { id: 'economy-5022571', name: '阜阳经济广播', desc: '阜阳 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/5022571/64k.mp3' },
  { id: 'economy-1259', name: '广东广播 - 珠江经济台', desc: '广东 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/1259/64k.mp3' },
  { id: 'economy-20065', name: '贵州经济广播', desc: '贵州 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/20065/64k.mp3' },
  { id: 'economy-20500170', name: '海上财经', desc: '经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/20500170/64k.mp3' },
  { id: 'economy-4601', name: '邯郸经济文艺广播', desc: '邯郸 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/4601/64k.mp3' },
  { id: 'economy-5022089', name: '鹤壁经济广播', desc: '经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/5022089/64k.mp3' },
  { id: 'economy-1295', name: '湖北经济广播', desc: '湖北 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/1295/64k.mp3' },
  { id: 'economy-2812', name: '湖州经济广播', desc: '湖州 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/2812/64k.mp3' },
  { id: 'economy-4587', name: '淮安经济广播', desc: '淮安 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/4587/64k.mp3' },
  { id: 'economy-3964', name: '黄石经济广播', desc: '黄石 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/3964/64k.mp3' },
  { id: 'economy-3976', name: '吉林经济广播', desc: '吉林 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/3976/64k.mp3' },
  { id: 'economy-1823', name: '吉林市广播电视台经济广播', desc: '吉林 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/1823/64k.mp3' },
  { id: 'economy-1668', name: '济南经济广播', desc: '济南 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/1668/64k.mp3' },
  { id: 'economy-5021665', name: '江西财经广播', desc: '江西 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/5021665/64k.mp3' },
  { id: 'economy-20019', name: '辽宁经济广播', desc: '辽宁 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/20019/64k.mp3' },
  { id: 'economy-5022262', name: '聊城经济广播', desc: '聊城 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/5022262/64k.mp3' },
  { id: 'economy-3995', name: '临沂经济广播', desc: '临沂 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/3995/64k.mp3' },
  { id: 'economy-5021565', name: '泸州对农经济生活广播', desc: '泸州 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/5021565/64k.mp3' },
  { id: 'economy-21327', name: '南通经济广播', desc: '南通 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/21327/64k.mp3' },
  { id: 'economy-1152', name: '宁波经济广播', desc: '宁波 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/1152/64k.mp3' },
  { id: 'economy-20859', name: '秦皇岛旅游经济广播', desc: '经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/20859/64k.mp3' },
  { id: 'economy-5008', name: '青海经济广播', desc: '青海 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/5008/64k.mp3' },
  { id: 'economy-20236', name: '山东经济广播', desc: '山东 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/20236/64k.mp3' },
  { id: 'economy-1603', name: '陕西经济广播', desc: '陕西 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/1603/64k.mp3' },
  { id: 'economy-20500058', name: '邵阳经济广播', desc: '邵阳 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/20500058/64k.mp3' },
  { id: 'economy-4018', name: '太原经济广播', desc: '太原 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/4018/64k.mp3' },
  { id: 'economy-15318431', name: '唐山经济广播', desc: '唐山 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/15318431/64k.mp3' },
  { id: 'economy-15318227', name: '天津经济广播', desc: '天津 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/15318227/64k.mp3' },
  { id: 'economy-20839', name: '潍坊经济广播', desc: '潍坊 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/20839/64k.mp3' },
  { id: 'economy-1157', name: '温州经济广播', desc: '温州 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/1157/64k.mp3' },
  { id: 'economy-2778', name: '无锡经济广播', desc: '无锡 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/2778/64k.mp3' },
  { id: 'economy-5022119', name: '心动FM102.4·驻马店经济广播', desc: '驻马店 · FM102.4 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/5022119/64k.mp3' },
  { id: 'economy-1683', name: '烟台经济广播', desc: '烟台 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/1683/64k.mp3' },
  { id: 'economy-20211652', name: '阳泉经济广播', desc: '经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/20211652/64k.mp3' },
  { id: 'economy-5022391', name: '岳阳经济广播', desc: '岳阳 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/5022391/64k.mp3' },
  { id: 'economy-1927', name: '云南经济广播', desc: '云南 · 经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/1927/64k.mp3' },
  { id: 'economy-1687', name: '枣庄经济生活广播', desc: '经济财经 · 财经与消费', cat: 'economy', url: 'https://lhttp.qtfm.cn/live/1687/64k.mp3' },
  { id: 'life-20500232', name: '阿基米德-健康电台', desc: '都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/20500232/64k.mp3' },
  { id: 'life-15318550', name: '阿克苏汉语综合广播城市之声 活力940', desc: '阿克苏 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/15318550/64k.mp3' },
  { id: 'life-15318219', name: '安徽旅游广播·高速之声', desc: '安徽 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/15318219/64k.mp3' },
  { id: 'life-1950', name: '安徽农村广播', desc: '安徽 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/1950/64k.mp3' },
  { id: 'life-1674', name: '安徽生活广播', desc: '安徽 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/1674/64k.mp3' },
  { id: 'life-1966', name: '安庆农村广播', desc: '安庆 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/1966/64k.mp3' },
  { id: 'life-2123', name: '安阳生活广播', desc: '都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/2123/64k.mp3' },
  { id: 'life-1894', name: '巴彦淖尔文艺生活广播', desc: '都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/1894/64k.mp3' },
  { id: 'life-333', name: '北京文艺广播', desc: '北京 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/333/64k.mp3' },
  { id: 'life-21341', name: '滨州文艺广播', desc: '滨州 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/21341/64k.mp3' },
  { id: 'life-5021902', name: '沧州长书文艺广播', desc: '沧州 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/5021902/64k.mp3' },
  { id: 'life-20715', name: '朝阳人民广播电台- 生活娱乐台', desc: '朝阳 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/20715/64k.mp3' },
  { id: 'life-15318158', name: '承德旅游生活广播', desc: '承德 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/15318158/64k.mp3' },
  { id: 'life-1898', name: '赤峰农村牧区广播', desc: '都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/1898/64k.mp3' },
  { id: 'life-1502', name: '重庆都市广播', desc: '重庆 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/1502/64k.mp3' },
  { id: 'life-1086', name: '大连都市广播', desc: '大连 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/1086/64k.mp3' },
  { id: 'life-5022506', name: '大连少儿广播', desc: '大连 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/5022506/64k.mp3' },
  { id: 'life-1085', name: '大连体育广播', desc: '大连 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/1085/64k.mp3' },
  { id: 'life-20211580', name: '东营生活广播', desc: '东营 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/20211580/64k.mp3' },
  { id: 'life-20207773', name: '都江堰935爱旅游', desc: '都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/20207773/64k.mp3' },
  { id: 'life-1736', name: '福建都市生活广播', desc: '福建 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/1736/64k.mp3' },
  { id: 'life-3941', name: '甘肃农村广播', desc: '甘肃 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/3941/64k.mp3' },
  { id: 'life-468', name: '广东广播 - 南方生活广播', desc: '广东 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/468/64k.mp3' },
  { id: 'life-1759', name: '桂林城市之声', desc: '桂林 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/1759/64k.mp3' },
  { id: 'life-4968', name: '黑龙江都市·女性广播', desc: '黑龙江 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/4968/64k.mp3' },
  { id: 'life-4972', name: '黑龙江老年·少儿广播', desc: '黑龙江 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/4972/64k.mp3' },
  { id: 'life-4970', name: '黑龙江生活广播', desc: '黑龙江 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/4970/64k.mp3' },
  { id: 'life-5021857', name: '衡水文艺广播', desc: '都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/5021857/64k.mp3' },
  { id: 'life-4588', name: '淮安农村广播', desc: '淮安 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/4588/64k.mp3' },
  { id: 'life-5021970', name: '淮阴区FM100.6淮安车生活', desc: '淮安 · FM100.6 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/5021970/64k.mp3' },
  { id: 'life-4952', name: '吉林健康娱乐广播', desc: '吉林 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/4952/64k.mp3' },
  { id: 'life-20487', name: '吉林旅游广播(2)', desc: '吉林 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/20487/64k.mp3' },
  { id: 'life-5022333', name: '济南都市广播', desc: '济南 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/5022333/64k.mp3' },
  { id: 'life-1670', name: '济南文艺广播', desc: '济南 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/1670/64k.mp3' },
  { id: 'life-4008', name: '济宁生活广播', desc: '济宁 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/4008/64k.mp3' },
  { id: 'life-1136', name: '嘉兴对农广播 FM88.2', desc: '嘉兴 · FM88.2 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/1136/64k.mp3' },
  { id: 'life-20470', name: '健康广播', desc: '都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/20470/64k.mp3' },
  { id: 'life-1283', name: '江门电台旅游之声', desc: '江门 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/1283/64k.mp3' },
  { id: 'life-20133', name: '江西旅游广播', desc: '江西 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/20133/64k.mp3' },
  { id: 'life-1937', name: '昆明老年广播', desc: '昆明 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/1937/64k.mp3' },
  { id: 'life-1099', name: '辽宁广播电视台都市广播', desc: '辽宁 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/1099/64k.mp3' },
  { id: 'life-1102', name: '辽宁广播电视台生活广播', desc: '辽宁 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/1102/64k.mp3' },
  { id: 'life-20018', name: '辽宁乡村广播', desc: '辽宁 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/20018/64k.mp3' },
  { id: 'life-20211321', name: '洛阳文艺广播', desc: '洛阳 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/20211321/64k.mp3' },
  { id: 'life-21275', name: '南通生活广播', desc: '南通 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/21275/64k.mp3' },
  { id: 'life-1888', name: '内蒙古农村牧区广播', desc: '内蒙古 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/1888/64k.mp3' },
  { id: 'life-5022341', name: '浦东文艺生活广播 城市沸点FM100.1', desc: 'FM100.1 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/5022341/64k.mp3' },
  { id: 'life-20835', name: '秦皇岛体育广播', desc: '都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/20835/64k.mp3' },
  { id: 'life-4956', name: '青岛老年广播', desc: '青岛 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/4956/64k.mp3' },
  { id: 'life-15318203', name: '三亚旅游之声103.8', desc: '三亚 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/15318203/64k.mp3' },
  { id: 'life-20238', name: '山东文艺广播', desc: '山东 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/20238/64k.mp3' },
  { id: 'life-1602', name: '陕西农村广播', desc: '陕西 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/1602/64k.mp3' },
  { id: 'life-15318332', name: '少爷生活', desc: '都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/15318332/64k.mp3' },
  { id: 'life-2807', name: '苏州儿童广播', desc: '苏州 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/2807/64k.mp3' },
  { id: 'life-2801', name: '苏州生活广播', desc: '苏州 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/2801/64k.mp3' },
  { id: 'life-21265', name: '宿迁新农村广播', desc: '宿迁 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/21265/64k.mp3' },
  { id: 'life-5022400', name: '宿州文艺广播（2）', desc: '宿州 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/5022400/64k.mp3' },
  { id: 'life-20211701', name: '太原老年之声', desc: '太原 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/20211701/64k.mp3' },
  { id: 'life-1158', name: '温州对农广播', desc: '温州 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/1158/64k.mp3' },
  { id: 'life-20639', name: '新疆维语文艺广播', desc: '新疆 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/20639/64k.mp3' },
  { id: 'life-20211623', name: '徐州农村广播', desc: '徐州 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/20211623/64k.mp3' },
  { id: 'life-5022438', name: '延边旅游广播', desc: '延边 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/5022438/64k.mp3' },
  { id: 'life-20332', name: '盐城农村广播·经典882', desc: '盐城 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/20332/64k.mp3' },
  { id: 'life-20567', name: '宜昌都市生活广播', desc: '宜昌 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/20567/64k.mp3' },
  { id: 'life-1191', name: '运城文艺广播', desc: '运城 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/1191/64k.mp3' },
  { id: 'life-5021801', name: '张家口城市生活广播', desc: '张家口 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/5021801/64k.mp3' },
  { id: 'life-5021507', name: '张家口旅游广播', desc: '张家口 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/5021507/64k.mp3' },
  { id: 'life-4605', name: '镇江文艺广播', desc: '镇江 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/4605/64k.mp3' },
  { id: 'life-1222', name: '郑州文化娱乐广播 FM91.8', desc: '郑州 · FM91.8 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/1222/64k.mp3' },
  { id: 'life-1278', name: '中山环保旅游之声·快乐888', desc: '中山 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/1278/64k.mp3' },
  { id: 'life-20529', name: '自贡文化旅游广播', desc: '自贡 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/20529/64k.mp3' },
  { id: 'life-20324', name: '연변문예생활방송·延边朝鲜语文艺生活广播', desc: '延边 · 都市生活 · 民生服务', cat: 'life', url: 'https://lhttp.qtfm.cn/live/20324/64k.mp3' },
  { id: 'local-20500234', name: '阿坝安多藏语综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500234/64k.mp3' },
  { id: 'local-20500041', name: '阿克苏市人民广播电台', desc: '阿克苏 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500041/64k.mp3' },
  { id: 'local-15318551', name: '阿克苏维语综合广播', desc: '阿克苏 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318551/64k.mp3' },
  { id: 'local-5022555', name: '阿拉善蒙语综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022555/64k.mp3' },
  { id: 'local-4919', name: '安徽综合广播', desc: '安徽 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/4919/64k.mp3' },
  { id: 'local-5021861', name: '安康综合广播', desc: '安康 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021861/64k.mp3' },
  { id: 'local-1965', name: '安庆综合广播', desc: '安庆 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1965/64k.mp3' },
  { id: 'local-20212216', name: '安丘924(FM92.4)', desc: 'FM92.4 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20212216/64k.mp3' },
  { id: 'local-5022203', name: '安顺综合广播', desc: '安顺 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022203/64k.mp3' },
  { id: 'local-5022135', name: '安溪FM946茶频率', desc: 'FM946 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022135/64k.mp3' },
  { id: 'local-20209339', name: '安阳县Top Radio 88.1', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20209339/64k.mp3' },
  { id: 'local-5022385', name: '巴南人民广播电台', desc: '巴南 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022385/64k.mp3' },
  { id: 'local-1893', name: '巴彦淖尔综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1893/64k.mp3' },
  { id: 'local-5022108', name: '巴音郭楞综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022108/64k.mp3' },
  { id: 'local-20210239', name: '巴中综合广播', desc: '巴中 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20210239/64k.mp3' },
  { id: 'local-20211658', name: '霸州人民广播电台', desc: '霸州 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20211658/64k.mp3' },
  { id: 'local-20154', name: '蚌埠综合广播', desc: '蚌埠 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20154/64k.mp3' },
  { id: 'local-5022668', name: '包河之声 FM100.8', desc: 'FM100.8 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022668/64k.mp3' },
  { id: 'local-1892', name: '包头城乡广播', desc: '包头 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1892/64k.mp3' },
  { id: 'local-1891', name: '包头蒙语广播', desc: '包头 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1891/64k.mp3' },
  { id: 'local-1889', name: '包头综合广播', desc: '包头 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1889/64k.mp3' },
  { id: 'local-15318125', name: '宝鸡综合广播', desc: '宝鸡 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318125/64k.mp3' },
  { id: 'local-5022446', name: '保山综合广播', desc: '保山 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022446/64k.mp3' },
  { id: 'local-20211692', name: '北碚人民广播电台', desc: '北碚 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20211692/64k.mp3' },
  { id: 'local-3977', name: '北京外语广播', desc: '北京 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/3977/64k.mp3' },
  { id: 'local-1153', name: '北仑电台', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1153/64k.mp3' },
  { id: 'local-20500168', name: '滨城广播电视台', desc: '滨城 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500168/64k.mp3' },
  { id: 'local-5021395', name: '滨州综合广播', desc: '滨州 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021395/64k.mp3' },
  { id: 'local-5022410', name: '兵团之声', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022410/64k.mp3' },
  { id: 'local-5021901', name: '沧州综合广播', desc: '沧州 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021901/64k.mp3' },
  { id: 'local-20500228', name: '苍溪人民广播电台', desc: '苍溪 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500228/64k.mp3' },
  { id: 'local-5022340', name: '曹县人民广播电台', desc: '曹县 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022340/64k.mp3' },
  { id: 'local-5022610', name: '察布查尔人民广播电台', desc: '察布查尔 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022610/64k.mp3' },
  { id: 'local-15318208', name: '常德综合广播', desc: '常德 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318208/64k.mp3' },
  { id: 'local-2792', name: '常熟人民广播电台', desc: '常熟 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/2792/64k.mp3' },
  { id: 'local-2791', name: '常熟市融媒体中心综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/2791/64k.mp3' },
  { id: 'local-20212211', name: '朝阳县人民广播电台', desc: '朝阳县 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20212211/64k.mp3' },
  { id: 'local-4596', name: '潮州综合广播', desc: '潮州 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/4596/64k.mp3' },
  { id: 'local-20489', name: '郴州综合广播', desc: '郴州 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20489/64k.mp3' },
  { id: 'local-20207769', name: '成都龙泉人民台', desc: '成都 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20207769/64k.mp3' },
  { id: 'local-4892', name: '成都文化休闲广播', desc: '成都 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/4892/64k.mp3' },
  { id: 'local-20211637', name: '成武人民广播电台', desc: '成武 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20211637/64k.mp3' },
  { id: 'local-5022537', name: '城阳综合广播 青岛广播爱车940', desc: '青岛 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022537/64k.mp3' },
  { id: 'local-5022439', name: '澄海电台FM100.5', desc: 'FM100.5 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022439/64k.mp3' },
  { id: 'local-5022373', name: '池州综合广播', desc: '池州 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022373/64k.mp3' },
  { id: 'local-1897', name: '赤峰蒙语广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1897/64k.mp3' },
  { id: 'local-1896', name: '赤峰综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1896/64k.mp3' },
  { id: 'local-1498', name: '重庆之声', desc: '重庆 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1498/64k.mp3' },
  { id: 'local-20500100', name: '崇礼综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500100/64k.mp3' },
  { id: 'local-20500066', name: '崇州人民广播电台', desc: '崇州 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500066/64k.mp3' },
  { id: 'local-20211575', name: '滁州南谯之声 经典983电台', desc: '滁州 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20211575/64k.mp3' },
  { id: 'local-4030', name: '楚雄综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/4030/64k.mp3' },
  { id: 'local-20210757', name: '传习广播·项城市融媒体中心', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20210757/64k.mp3' },
  { id: 'local-5021401', name: '慈溪人民广播电台', desc: '慈溪 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021401/64k.mp3' },
  { id: 'local-20500116', name: '磁县广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500116/64k.mp3' },
  { id: 'local-5022394', name: '达州综合广播', desc: '达州 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022394/64k.mp3' },
  { id: 'local-20211708', name: '大丰人民广播电台', desc: '大丰 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20211708/64k.mp3' },
  { id: 'local-1940', name: '大理市电台', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1940/64k.mp3' },
  { id: 'local-15318307', name: '大连金普新区FM104.3 综合广播', desc: '大连 · FM104.3 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318307/64k.mp3' },
  { id: 'local-5021905', name: '大连新城乡广播', desc: '大连 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021905/64k.mp3' },
  { id: 'local-20500060', name: '大庆综合广播', desc: '大庆 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500060/64k.mp3' },
  { id: 'local-20500057', name: '大兴安岭综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500057/64k.mp3' },
  { id: 'local-5021739', name: '大兴区人民广播电台', desc: '大兴区 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021739/64k.mp3' },
  { id: 'local-20211676', name: '大足人民广播电台—大足之声', desc: '大足 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20211676/64k.mp3' },
  { id: 'local-20207749', name: '丹阳人民广播电台', desc: '丹阳 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20207749/64k.mp3' },
  { id: 'local-5021849', name: '德宏综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021849/64k.mp3' },
  { id: 'local-5021850', name: '德宏综合广播（民族语）', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021850/64k.mp3' },
  { id: 'local-5022033', name: '德清广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022033/64k.mp3' },
  { id: 'local-4987', name: '德阳综合广播', desc: '德阳 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/4987/64k.mp3' },
  { id: 'local-5022077', name: '登封人民广播电台', desc: '登封 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022077/64k.mp3' },
  { id: 'local-20500198', name: '邓州综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500198/64k.mp3' },
  { id: 'local-20500135', name: '第三师图木舒克市人民广播电台', desc: '图木舒克 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500135/64k.mp3' },
  { id: 'local-5021860', name: '鼎城人民广播电台', desc: '鼎城 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021860/64k.mp3' },
  { id: 'local-20211680', name: '定陶人民广播电台', desc: '定陶 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20211680/64k.mp3' },
  { id: 'local-5022186', name: '东港电台综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022186/64k.mp3' },
  { id: 'local-20500220', name: '东海综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500220/64k.mp3' },
  { id: 'local-21181', name: '东阳综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/21181/64k.mp3' },
  { id: 'local-20144', name: '东营综合广播', desc: '东营 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20144/64k.mp3' },
  { id: 'local-20500124', name: '东源综合广播FM101.5', desc: 'FM101.5 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500124/64k.mp3' },
  { id: 'local-15318538', name: '动听913（宣化区融媒体中心综合广播）', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318538/64k.mp3' },
  { id: 'local-15318432', name: '斗门人民广播电台', desc: '斗门 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318432/64k.mp3' },
  { id: 'local-20350', name: '鄂尔多斯汉语综合广播', desc: '鄂尔多斯 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20350/64k.mp3' },
  { id: 'local-20348', name: '鄂尔多斯蒙语综合广播', desc: '鄂尔多斯 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20348/64k.mp3' },
  { id: 'local-21025', name: '鄂州综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/21025/64k.mp3' },
  { id: 'local-20701', name: '恩平人民广播电台', desc: '恩平 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20701/64k.mp3' },
  { id: 'local-5022718', name: '恩施综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022718/64k.mp3' },
  { id: 'local-20211703', name: '二师广播电视台广播节目', desc: '二师 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20211703/64k.mp3' },
  { id: 'local-20500104', name: '肥乡广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500104/64k.mp3' },
  { id: 'local-15318379', name: '佛冈电台', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318379/64k.mp3' },
  { id: 'local-1744', name: '福建海峡之声', desc: '福建 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1744/64k.mp3' },
  { id: 'local-3937', name: '福州左海之声', desc: '福州 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/3937/64k.mp3' },
  { id: 'local-20207753', name: '阜宁人民广播电台', desc: '阜宁 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20207753/64k.mp3' },
  { id: 'local-1970', name: '阜阳综合广播', desc: '阜阳 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1970/64k.mp3' },
  { id: 'local-20500216', name: '赣榆综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500216/64k.mp3' },
  { id: 'local-20266', name: '赣州综合广播（2）', desc: '赣州 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20266/64k.mp3' },
  { id: 'local-20500014', name: '高安人民广播电台', desc: '高安 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500014/64k.mp3' },
  { id: 'local-20212417', name: '高密广播电视台', desc: '高密 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20212417/64k.mp3' },
  { id: 'local-5021555', name: '高阳人民广播电台', desc: '高阳 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021555/64k.mp3' },
  { id: 'local-5063', name: '公安县综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5063/64k.mp3' },
  { id: 'local-5022551', name: '巩义综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022551/64k.mp3' },
  { id: 'local-20500225', name: '固安县融媒体中心综合广播 FM107.9', desc: 'FM107.9 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500225/64k.mp3' },
  { id: 'local-20500125', name: '固镇广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500125/64k.mp3' },
  { id: 'local-20212269', name: '故城人民广播电台', desc: '故城 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20212269/64k.mp3' },
  { id: 'local-1284', name: '广东电台遂溪台', desc: '广东 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1284/64k.mp3' },
  { id: 'local-471', name: '广东广播 - 文体广播', desc: '广东 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/471/64k.mp3' },
  { id: 'local-20212405', name: '广汉人民广播电台', desc: '广汉 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20212405/64k.mp3' },
  { id: 'local-20500036', name: '广饶广播电视台', desc: '广饶 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500036/64k.mp3' },
  { id: 'local-20697', name: '贵港综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20697/64k.mp3' },
  { id: 'local-1773', name: '贵阳综合广播', desc: '贵阳 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1773/64k.mp3' },
  { id: 'local-20063', name: '贵州综合广播', desc: '贵州 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20063/64k.mp3' },
  { id: 'local-1760', name: '桂林飞扬频率', desc: '桂林 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1760/64k.mp3' },
  { id: 'local-20212259', name: '哈尔滨融媒体', desc: '哈尔滨 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20212259/64k.mp3' },
  { id: 'local-5022015', name: '海口综合广播', desc: '海口 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022015/64k.mp3' },
  { id: 'local-21243', name: '海南民生广播', desc: '海南 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/21243/64k.mp3' },
  { id: 'local-5022556', name: '海宁大潮之声🌊', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022556/64k.mp3' },
  { id: 'local-3951', name: '邯郸1003大眼睛广播', desc: '邯郸 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/3951/64k.mp3' },
  { id: 'local-4865', name: '寒亭人民广播电台', desc: '寒亭 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/4865/64k.mp3' },
  { id: 'local-20005', name: '杭州临安广播', desc: '杭州 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20005/64k.mp3' },
  { id: 'local-1163', name: '杭州市广播电视台西湖之声', desc: '杭州 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1163/64k.mp3' },
  { id: 'local-15318503', name: '河间综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318503/64k.mp3' },
  { id: 'local-20500038', name: '河南卷卷猫电台', desc: '河南 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500038/64k.mp3' },
  { id: 'local-5043', name: '贺州综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5043/64k.mp3' },
  { id: 'local-5022055', name: '鹤壁综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022055/64k.mp3' },
  { id: 'local-4976', name: '黑龙江高校广播', desc: '黑龙江 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/4976/64k.mp3' },
  { id: 'local-20500119', name: '黑山综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500119/64k.mp3' },
  { id: 'local-5022040', name: '衡水综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022040/64k.mp3' },
  { id: 'local-15318386', name: '衡阳综合广播', desc: '衡阳 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318386/64k.mp3' },
  { id: 'local-5022729', name: '红调频·九江综合广播', desc: '九江 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022729/64k.mp3' },
  { id: 'local-4033', name: '红河综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/4033/64k.mp3' },
  { id: 'local-5021543', name: '呼和浩特综合广播', desc: '呼和浩特 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021543/64k.mp3' },
  { id: 'local-20500188', name: '呼图壁县5G智慧电台', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500188/64k.mp3' },
  { id: 'local-1303', name: '湖北之声（调频版）（2）', desc: '湖北 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1303/64k.mp3' },
  { id: 'local-4937', name: '湖南金鹰之声·金鹰955', desc: '湖南 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/4937/64k.mp3' },
  { id: 'local-2810', name: '湖州综合广播', desc: '湖州 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/2810/64k.mp3' },
  { id: 'local-1263', name: '花都人民广播电台', desc: '花都 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1263/64k.mp3' },
  { id: 'local-20505', name: '华语之声', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20505/64k.mp3' },
  { id: 'local-20500139', name: '華藝廣播公司', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500139/64k.mp3' },
  { id: 'local-15318689', name: '化州人民广播电台', desc: '化州 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318689/64k.mp3' },
  { id: 'local-5022069', name: '怀化综合广播', desc: '怀化 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022069/64k.mp3' },
  { id: 'local-5022643', name: '怀来人民广播电台', desc: '怀来 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022643/64k.mp3' },
  { id: 'local-5021993', name: '怀远电台', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021993/64k.mp3' },
  { id: 'local-15318398', name: '淮安区综合广播 淮安经典992', desc: '淮安 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318398/64k.mp3' },
  { id: 'local-4589', name: '淮安综合广播', desc: '淮安 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/4589/64k.mp3' },
  { id: 'local-20211648', name: '淮北综合广播', desc: '淮北 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20211648/64k.mp3' },
  { id: 'local-20176', name: '黄岛综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20176/64k.mp3' },
  { id: 'local-5022280', name: '黄梅县黄梅之声', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022280/64k.mp3' },
  { id: 'local-1968', name: '黄山综合广播', desc: '黄山 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1968/64k.mp3' },
  { id: 'local-5022671', name: '黄岩电台', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022671/64k.mp3' },
  { id: 'local-20211566', name: '辉南电台', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20211566/64k.mp3' },
  { id: 'local-20207782', name: '辉县经典916', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20207782/64k.mp3' },
  { id: 'local-5016', name: '惠州综合广播', desc: '惠州 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5016/64k.mp3' },
  { id: 'local-5021919', name: '获嘉人民广播电台', desc: '获嘉 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021919/64k.mp3' },
  { id: 'local-20807', name: '即墨人民广播电台', desc: '即墨 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20807/64k.mp3' },
  { id: 'local-5022479', name: '集美人民广播电台', desc: '集美 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022479/64k.mp3' },
  { id: 'local-4901', name: '济宁综合广播', desc: '济宁 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/4901/64k.mp3' },
  { id: 'local-5022142', name: '济源广播电台FM102.0', desc: '济源 · FM102.0 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022142/64k.mp3' },
  { id: 'local-20500203', name: '江陵广播电视台 综合广播', desc: '江陵 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500203/64k.mp3' },
  { id: 'local-1282', name: '江门电台综合广播', desc: '江门 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1282/64k.mp3' },
  { id: 'local-20500075', name: '江宁人民广播电台', desc: '江宁 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500075/64k.mp3' },
  { id: 'local-5022716', name: '江夏女主播电台', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022716/64k.mp3' },
  { id: 'local-2789', name: '江阴人民广播电台', desc: '江阴 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/2789/64k.mp3' },
  { id: 'local-20207785', name: '界首之声', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20207785/64k.mp3' },
  { id: 'local-15318464', name: '金湖综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318464/64k.mp3' },
  { id: 'local-4022', name: '金山人民广播电台', desc: '金山 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/4022/64k.mp3' },
  { id: 'local-20211686', name: '金堂人民广播电台', desc: '金堂 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20211686/64k.mp3' },
  { id: 'local-20500085', name: '金乡综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500085/64k.mp3' },
  { id: 'local-1188', name: '晋城综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1188/64k.mp3' },
  { id: 'local-5022520', name: '京哈高速沿线广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022520/64k.mp3' },
  { id: 'local-5022463', name: '京津冀之声', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022463/64k.mp3' },
  { id: 'local-5021933', name: '旌阳区综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021933/64k.mp3' },
  { id: 'local-5022025', name: '景德镇综合广播', desc: '景德镇 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022025/64k.mp3' },
  { id: 'local-20500192', name: '景县综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500192/64k.mp3' },
  { id: 'local-15318120', name: '靖江广播电台 FM102.4', desc: '靖江 · FM102.4 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318120/64k.mp3' },
  { id: 'local-20500011', name: '靖州综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500011/64k.mp3' },
  { id: 'local-5022648', name: '九江赣北之声广播', desc: '九江 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022648/64k.mp3' },
  { id: 'local-5022653', name: '开封综合广播', desc: '开封 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022653/64k.mp3' },
  { id: 'local-5037', name: '开平电台 飞扬956', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5037/64k.mp3' },
  { id: 'local-5022383', name: '开远人民广播电台', desc: '开远 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022383/64k.mp3' },
  { id: 'local-5022045', name: '凯里人民广播电台', desc: '凯里 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022045/64k.mp3' },
  { id: 'local-20500096', name: '抗大之声', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500096/64k.mp3' },
  { id: 'local-2422', name: '柯桥人民广播电台', desc: '柯桥 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/2422/64k.mp3' },
  { id: 'local-20212425', name: '库尔勒梨城之声', desc: '库尔勒 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20212425/64k.mp3' },
  { id: 'local-20500121', name: '奎屯综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500121/64k.mp3' },
  { id: 'local-1936', name: '昆明城市管理广播', desc: '昆明 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1936/64k.mp3' },
  { id: 'local-1934', name: '昆明综合广播', desc: '昆明 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1934/64k.mp3' },
  { id: 'local-20500128', name: '昆山人民广播电台', desc: '昆山 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500128/64k.mp3' },
  { id: 'local-5022138', name: '拉萨综合广播', desc: '拉萨 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022138/64k.mp3' },
  { id: 'local-20500167', name: '兰考县FM93.4', desc: 'FM93.4 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500167/64k.mp3' },
  { id: 'local-20500020', name: '阆中综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500020/64k.mp3' },
  { id: 'local-20212426', name: '崂山921 听见好时光', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20212426/64k.mp3' },
  { id: 'local-20204', name: '乐清人民广播电台', desc: '乐清 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20204/64k.mp3' },
  { id: 'local-1122', name: '乐山综合广播', desc: '乐山 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1122/64k.mp3' },
  { id: 'local-15318178', name: '澧县人民广播电台 FM104.7', desc: '澧县 · FM104.7 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318178/64k.mp3' },
  { id: 'local-20500194', name: '历城广播电视台', desc: '历城 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500194/64k.mp3' },
  { id: 'local-20500138', name: '利津县融媒体中心综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500138/64k.mp3' },
  { id: 'local-20211578', name: '廉江电台', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20211578/64k.mp3' },
  { id: 'local-5022143', name: '凉山州综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022143/64k.mp3' },
  { id: 'local-20211646', name: '梁平融媒体中心综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20211646/64k.mp3' },
  { id: 'local-20500235', name: '梁山广播电视台综合广播', desc: '梁山 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500235/64k.mp3' },
  { id: 'local-1103', name: '辽宁综合广播', desc: '辽宁 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1103/64k.mp3' },
  { id: 'local-5022447', name: '辽阳综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022447/64k.mp3' },
  { id: 'local-5022264', name: '聊城综合广播', desc: '聊城 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022264/64k.mp3' },
  { id: 'local-20211604', name: '林州人民广播电台', desc: '林州 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20211604/64k.mp3' },
  { id: 'local-5022437', name: '临海人民广播电台', desc: '临海 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022437/64k.mp3' },
  { id: 'local-3992', name: '临沂综合广播', desc: '临沂 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/3992/64k.mp3' },
  { id: 'local-20212204', name: '临淄广播·公信971', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20212204/64k.mp3' },
  { id: 'local-15318298', name: '凌源综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318298/64k.mp3' },
  { id: 'local-21043', name: '柳州综合广播', desc: '柳州 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/21043/64k.mp3' },
  { id: 'local-20211616', name: '六盘水综合广播', desc: '六盘水 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20211616/64k.mp3' },
  { id: 'local-15318359', name: '龙游人民广播电台FM95.4', desc: '龙游 · FM95.4 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318359/64k.mp3' },
  { id: 'local-21213', name: '娄底综合广播', desc: '娄底 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/21213/64k.mp3' },
  { id: 'local-5021557', name: '泸州综合广播', desc: '泸州 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021557/64k.mp3' },
  { id: 'local-20211668', name: '鹿泉人民广播电台', desc: '鹿泉 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20211668/64k.mp3' },
  { id: 'local-5022038', name: '栾城人民广播电台', desc: '栾城 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022038/64k.mp3' },
  { id: 'local-1225', name: '洛阳综合广播', desc: '洛阳 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1225/64k.mp3' },
  { id: 'local-5022660', name: '漯河综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022660/64k.mp3' },
  { id: 'local-20500088', name: '茂名综合广播', desc: '茂名 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500088/64k.mp3' },
  { id: 'local-4027', name: '眉山综合广播', desc: '眉山 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/4027/64k.mp3' },
  { id: 'local-20500115', name: '梅河口人民广播电台', desc: '梅河口 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500115/64k.mp3' },
  { id: 'local-5021942', name: '梅县客都之声', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021942/64k.mp3' },
  { id: 'local-15318571', name: '蒙阴广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318571/64k.mp3' },
  { id: 'local-5021599', name: '蒙自市广播电台', desc: '蒙自市 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021599/64k.mp3' },
  { id: 'local-5021914', name: '孟村回族自治县人民广播电台', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021914/64k.mp3' },
  { id: 'local-5022531', name: '弥勒人民广播电台', desc: '弥勒 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022531/64k.mp3' },
  { id: 'local-4024', name: '绵阳综合广播', desc: '绵阳 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/4024/64k.mp3' },
  { id: 'local-15318098', name: '绵竹综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318098/64k.mp3' },
  { id: 'local-20500236', name: '闽侯综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500236/64k.mp3' },
  { id: 'local-15318316', name: '牡丹广播电视台', desc: '牡丹 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318316/64k.mp3' },
  { id: 'local-5022434', name: '牡丹江综合广播', desc: '牡丹江 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022434/64k.mp3' },
  { id: 'local-5021731', name: '南安人民广播电台', desc: '南安 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021731/64k.mp3' },
  { id: 'local-20207778', name: '南江县广播电视台综合广播', desc: '南江县 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20207778/64k.mp3' },
  { id: 'local-5021869', name: '南康广播电台', desc: '南康 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021869/64k.mp3' },
  { id: 'local-20358', name: '南宁综合广播', desc: '南宁 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20358/64k.mp3' },
  { id: 'local-21277', name: '南通综合广播', desc: '南通 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/21277/64k.mp3' },
  { id: 'local-20973', name: '内蒙古草原之声', desc: '内蒙古 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20973/64k.mp3' },
  { id: 'local-1882', name: '内蒙古蒙语广播', desc: '内蒙古 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1882/64k.mp3' },
  { id: 'local-5022406', name: '宁海人民广播电台', desc: '宁海 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022406/64k.mp3' },
  { id: 'local-4904', name: '攀枝花综合广播', desc: '攀枝花 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/4904/64k.mp3' },
  { id: 'local-20500173', name: '沛县综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500173/64k.mp3' },
  { id: 'local-20500112', name: '蓬莱电台仙境之声', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500112/64k.mp3' },
  { id: 'local-2809', name: '邳州人民广播电台', desc: '邳州 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/2809/64k.mp3' },
  { id: 'local-20500159', name: '郫都综合广播·川味965', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500159/64k.mp3' },
  { id: 'local-5022420', name: '平顶山综合广播', desc: '平顶山 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022420/64k.mp3' },
  { id: 'local-20500164', name: '泊头市广播电视台广播节目', desc: '泊头市 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500164/64k.mp3' },
  { id: 'local-20206', name: '濮阳县FM1053快乐调频', desc: 'FM1053 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20206/64k.mp3' },
  { id: 'local-20207739', name: '濮阳综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20207739/64k.mp3' },
  { id: 'local-21355', name: '浦东综合广播 东上海之声FM106.5', desc: '上海 · FM106.5 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/21355/64k.mp3' },
  { id: 'local-5021924', name: '浦江人民广播电台', desc: '浦江 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021924/64k.mp3' },
  { id: 'local-1938', name: '普洱综合广播', desc: '普洱 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1938/64k.mp3' },
  { id: 'local-5022527', name: '普宁人民广播电台', desc: '普宁 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022527/64k.mp3' },
  { id: 'local-20500095', name: '七师人民广播电台', desc: '七师 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500095/64k.mp3' },
  { id: 'local-5021866', name: '七星关人民广播电台', desc: '七星关 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021866/64k.mp3' },
  { id: 'local-5022252', name: '蕲春综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022252/64k.mp3' },
  { id: 'local-20211704', name: '巧家电台', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20211704/64k.mp3' },
  { id: 'local-20855', name: '秦皇岛综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20855/64k.mp3' },
  { id: 'local-20211644', name: '青岛胶州广播', desc: '青岛 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20211644/64k.mp3' },
  { id: 'local-5021803', name: '清苑人民广播电台', desc: '清苑 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021803/64k.mp3' },
  { id: 'local-5022403', name: '庆云广播电视台', desc: '庆云 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022403/64k.mp3' },
  { id: 'local-5022287', name: '琼海市台', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022287/64k.mp3' },
  { id: 'local-5022360', name: '泉州刺桐之声', desc: '泉州 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022360/64k.mp3' },
  { id: 'local-5022470', name: '任丘人民广播电台', desc: '任丘 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022470/64k.mp3' },
  { id: 'local-20579', name: '如东综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20579/64k.mp3' },
  { id: 'local-5022650', name: '汝州之声', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022650/64k.mp3' },
  { id: 'local-1143', name: '瑞安电台', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1143/64k.mp3' },
  { id: 'local-15318638', name: '三门人民广播电台', desc: '三门 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318638/64k.mp3' },
  { id: 'local-5022100', name: '三明综合广播', desc: '三明 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022100/64k.mp3' },
  { id: 'local-15318544', name: '三台人民广播电台', desc: '三台 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318544/64k.mp3' },
  { id: 'local-20450', name: '三亚天涯之声', desc: '三亚 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20450/64k.mp3' },
  { id: 'local-1737', name: '厦门综合广播', desc: '厦门 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1737/64k.mp3' },
  { id: 'local-20500047', name: '山亭声动970', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500047/64k.mp3' },
  { id: 'local-20491', name: '山西综合广播FM', desc: '山西 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20491/64k.mp3' },
  { id: 'local-4885', name: '陕西青少广播', desc: '陕西 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/4885/64k.mp3' },
  { id: 'local-20500176', name: '上海天气台', desc: '上海 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500176/64k.mp3' },
  { id: 'local-5022074', name: '韶关综合广播', desc: '韶关 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022074/64k.mp3' },
  { id: 'local-20148', name: '邵阳综合广播', desc: '邵阳 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20148/64k.mp3' },
  { id: 'local-20160', name: '深圳龙岗频道', desc: '深圳 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20160/64k.mp3' },
  { id: 'local-5022535', name: '沈阳新民广播FM103.9', desc: '沈阳 · FM103.9 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022535/64k.mp3' },
  { id: 'local-15318519', name: '声音控电台', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318519/64k.mp3' },
  { id: 'local-20338', name: '十堰综合广播', desc: '十堰 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20338/64k.mp3' },
  { id: 'local-20500118', name: '石河子综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500118/64k.mp3' },
  { id: 'local-1652', name: '石家庄综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1652/64k.mp3' },
  { id: 'local-5022563', name: '石嘴山综合广播', desc: '石嘴山 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022563/64k.mp3' },
  { id: 'local-20500211', name: '寿光广播电视台', desc: '寿光 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500211/64k.mp3' },
  { id: 'local-20211587', name: '双流人民广播电台', desc: '双流 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20211587/64k.mp3' },
  { id: 'local-1111', name: '四川城市之音', desc: '四川 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1111/64k.mp3' },
  { id: 'local-1115', name: '四川民族广播', desc: '四川 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1115/64k.mp3' },
  { id: 'local-15318197', name: '四平综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318197/64k.mp3' },
  { id: 'local-20500054', name: '四师可克达拉人民广播电台', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500054/64k.mp3' },
  { id: 'local-20500183', name: '肃宁综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500183/64k.mp3' },
  { id: 'local-15318602', name: '肃州广播电视台FM106.6', desc: '肃州 · FM106.6 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318602/64k.mp3' },
  { id: 'local-5005', name: '宿豫人民广播电台', desc: '宿豫 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5005/64k.mp3' },
  { id: 'local-5022399', name: '宿州综合广播（2）', desc: '宿州 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022399/64k.mp3' },
  { id: 'local-20500191', name: '睢宁综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500191/64k.mp3' },
  { id: 'local-20211705', name: '绥中综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20211705/64k.mp3' },
  { id: 'local-20853', name: '随州综合广播', desc: '随州 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20853/64k.mp3' },
  { id: 'local-20182', name: '遂宁综合广播', desc: '遂宁 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20182/64k.mp3' },
  { id: 'local-20500031', name: '塔城汉语综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500031/64k.mp3' },
  { id: 'local-20500145', name: '塔城市综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500145/64k.mp3' },
  { id: 'local-5022062', name: '台山广播电台 90.4', desc: '台山 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022062/64k.mp3' },
  { id: 'local-1145', name: '台州综合广播', desc: '台州 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1145/64k.mp3' },
  { id: 'local-20207759', name: '太仓综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20207759/64k.mp3' },
  { id: 'local-15318579', name: '太和县综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318579/64k.mp3' },
  { id: 'local-4917', name: '态度电台', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/4917/64k.mp3' },
  { id: 'local-1660', name: '唐山曹妃甸之声', desc: '唐山 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1660/64k.mp3' },
  { id: 'local-1657', name: '唐山综合广播', desc: '唐山 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1657/64k.mp3' },
  { id: 'local-20500222', name: '唐县经典913', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500222/64k.mp3' },
  { id: 'local-20500086', name: '桃江电台', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500086/64k.mp3' },
  { id: 'local-5022611', name: '滕州广播电视台', desc: '滕州 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022611/64k.mp3' },
  { id: 'local-20500171', name: '体坛速听', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500171/64k.mp3' },
  { id: 'local-20212227', name: '天津静海区广播电台', desc: '天津 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20212227/64k.mp3' },
  { id: 'local-20500199', name: '天门综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500199/64k.mp3' },
  { id: 'local-20460', name: '天水综合频道', desc: '天水 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20460/64k.mp3' },
  { id: 'local-5022200', name: '天台人民广播电台', desc: '天台 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022200/64k.mp3' },
  { id: 'local-4854', name: '天长人民广播电台', desc: '天长 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/4854/64k.mp3' },
  { id: 'local-20211586', name: '通州人民广播电台-2 阳光广播', desc: '通州 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20211586/64k.mp3' },
  { id: 'local-5021791', name: '桐乡人民广播电台', desc: '桐乡 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021791/64k.mp3' },
  { id: 'local-20212410', name: '桐梓娄山之声', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20212410/64k.mp3' },
  { id: 'local-15318160', name: '铜山县人民广播电台FM94.2', desc: '铜山县 · FM94.2 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318160/64k.mp3' },
  { id: 'local-20500189', name: '团风县广播电视台', desc: '团风县 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500189/64k.mp3' },
  { id: 'local-20500094', name: '瓦房店人民广播电台', desc: '瓦房店 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500094/64k.mp3' },
  { id: 'local-15318480', name: '万盛融媒体中心综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318480/64k.mp3' },
  { id: 'local-15318612', name: '威海时尚广播', desc: '威海 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318612/64k.mp3' },
  { id: 'local-5022342', name: '威宁人民广播电台', desc: '威宁 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022342/64k.mp3' },
  { id: 'local-20500102', name: '威远综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500102/64k.mp3' },
  { id: 'local-20211696', name: '潍城广播电视台', desc: '潍城 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20211696/64k.mp3' },
  { id: 'local-5022388', name: '渭南综合广播', desc: '渭南 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022388/64k.mp3' },
  { id: 'local-20212412', name: '魏县人民广播电台', desc: '魏县 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20212412/64k.mp3' },
  { id: 'local-4567', name: '温岭1036·温岭人民广播电台', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/4567/64k.mp3' },
  { id: 'local-1155', name: '温州之声', desc: '温州 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1155/64k.mp3' },
  { id: 'local-20500113', name: '卧龙区台', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500113/64k.mp3' },
  { id: 'local-15318706', name: '乌海综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318706/64k.mp3' },
  { id: 'local-1923', name: '乌鲁木齐维语广播', desc: '乌鲁木齐 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1923/64k.mp3' },
  { id: 'local-5022198', name: '无棣人民广播电台', desc: '无棣 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022198/64k.mp3' },
  { id: 'local-2782', name: '无锡梁溪之声', desc: '无锡 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/2782/64k.mp3' },
  { id: 'local-20211643', name: '吴川综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20211643/64k.mp3' },
  { id: 'local-5022050', name: '吴江综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022050/64k.mp3' },
  { id: 'local-5029', name: '芜湖综合广播', desc: '芜湖 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5029/64k.mp3' },
  { id: 'local-20207772', name: '五师人民广播电台双河之声', desc: '五师 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20207772/64k.mp3' },
  { id: 'local-5022474', name: '武安人民广播电台', desc: '武安 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022474/64k.mp3' },
  { id: 'local-20150', name: '武进人民广播电台', desc: '武进 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20150/64k.mp3' },
  { id: 'local-5022071', name: '武穴人民广播电台', desc: '武穴 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022071/64k.mp3' },
  { id: 'local-5022379', name: '西江之声', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022379/64k.mp3' },
  { id: 'local-15318201', name: '习水人民广播电台', desc: '习水 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318201/64k.mp3' },
  { id: 'local-15318194', name: '夏县人民广播电台', desc: '夏县 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318194/64k.mp3' },
  { id: 'local-20211562', name: '仙桃电台', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20211562/64k.mp3' },
  { id: 'local-5022603', name: '献县人民广播电台', desc: '献县 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022603/64k.mp3' },
  { id: 'local-15318180', name: '湘乡广播电台龙城之声', desc: '湘乡 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318180/64k.mp3' },
  { id: 'local-5057', name: '襄阳文化教育广播', desc: '襄阳 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5057/64k.mp3' },
  { id: 'local-20500108', name: '襄州人民广播电台', desc: '襄州 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500108/64k.mp3' },
  { id: 'local-20500156', name: '祥符广播919', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500156/64k.mp3' },
  { id: 'local-15318335', name: '项城人民广播电台', desc: '项城 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318335/64k.mp3' },
  { id: 'local-15318546', name: '孝昌964电台', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318546/64k.mp3' },
  { id: 'local-5021959', name: '辛集综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021959/64k.mp3' },
  { id: 'local-20500141', name: '新安县乐享1007', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500141/64k.mp3' },
  { id: 'local-20212423', name: '新昌人民广播电台·天姥之声', desc: '新昌 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20212423/64k.mp3' },
  { id: 'local-20500221', name: '新都区广播电视台综合广播 新声905', desc: '新都区 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500221/64k.mp3' },
  { id: 'local-1908', name: '新疆哈语广播', desc: '新疆 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1908/64k.mp3' },
  { id: 'local-1903', name: '新疆蒙语广播', desc: '新疆 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1903/64k.mp3' },
  { id: 'local-1228', name: '新乡综合广播', desc: '新乡 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1228/64k.mp3' },
  { id: 'local-20211602', name: '新兴电台', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20211602/64k.mp3' },
  { id: 'local-20178', name: '新余综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20178/64k.mp3' },
  { id: 'local-15318156', name: '信阳广播二套', desc: '信阳 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318156/64k.mp3' },
  { id: 'local-5021977', name: '信阳综合广播', desc: '信阳 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021977/64k.mp3' },
  { id: 'local-20500218', name: '兴宁电台', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500218/64k.mp3' },
  { id: 'local-20500077', name: '兴仁广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500077/64k.mp3' },
  { id: 'local-20500110', name: '兴义综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500110/64k.mp3' },
  { id: 'local-20500051', name: '盱眙人民广播电台', desc: '盱眙 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500051/64k.mp3' },
  { id: 'local-5022092', name: '许昌综合广播', desc: '许昌 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022092/64k.mp3' },
  { id: 'local-5022', name: '宣城综合广播', desc: '宣城 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022/64k.mp3' },
  { id: 'local-20207779', name: '盐城滨海广播', desc: '盐城 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20207779/64k.mp3' },
  { id: 'local-20330', name: '盐城综合广播', desc: '盐城 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20330/64k.mp3' },
  { id: 'local-15318300', name: '郾城人民广播电台', desc: '郾城 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318300/64k.mp3' },
  { id: 'local-20211632', name: '扬州邗江广播FM96.7', desc: '扬州 · FM96.7 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20211632/64k.mp3' },
  { id: 'local-5022636', name: '扬州江都广播', desc: '扬州 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022636/64k.mp3' },
  { id: 'local-15318429', name: '阳江综合广播', desc: '阳江 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318429/64k.mp3' },
  { id: 'local-15318568', name: '阳泉综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318568/64k.mp3' },
  { id: 'local-5021991', name: '阳信广播电视台', desc: '阳信 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021991/64k.mp3' },
  { id: 'local-5022692', name: '伊犁哈语广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022692/64k.mp3' },
  { id: 'local-5022688', name: '伊犁维语广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022688/64k.mp3' },
  { id: 'local-20211711', name: '伊犁综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20211711/64k.mp3' },
  { id: 'local-20500154', name: '伊通综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500154/64k.mp3' },
  { id: 'local-15318182', name: '仪征人民广播电台', desc: '仪征 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318182/64k.mp3' },
  { id: 'local-15318691', name: '宜章综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318691/64k.mp3' },
  { id: 'local-5021979', name: '义安电台', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021979/64k.mp3' },
  { id: 'local-20314', name: '益阳综合广播', desc: '益阳 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20314/64k.mp3' },
  { id: 'local-5022061', name: '鄞州区1052LoveRadio', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022061/64k.mp3' },
  { id: 'local-5022392', name: '英德综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022392/64k.mp3' },
  { id: 'local-5022035', name: '鹰潭综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022035/64k.mp3' },
  { id: 'local-20500039', name: '颍上人民广播电台', desc: '颍上 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500039/64k.mp3' },
  { id: 'local-20210236', name: '永川之声100.7', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20210236/64k.mp3' },
  { id: 'local-5021975', name: '永吉县魅力FM1008', desc: 'FM1008 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021975/64k.mp3' },
  { id: 'local-15318231', name: '永嘉人民广播电台', desc: '永嘉 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318231/64k.mp3' },
  { id: 'local-5022570', name: '永康电台FM106.6', desc: 'FM106.6 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022570/64k.mp3' },
  { id: 'local-20212203', name: '永年人民广播电台', desc: '永年 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20212203/64k.mp3' },
  { id: 'local-5022498', name: '尤溪电台', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022498/64k.mp3' },
  { id: 'local-20212390', name: '玉环综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20212390/64k.mp3' },
  { id: 'local-1762', name: '玉林综合广播', desc: '玉林 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1762/64k.mp3' },
  { id: 'local-20500090', name: '垣曲人民广播电台', desc: '垣曲 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500090/64k.mp3' },
  { id: 'local-20500129', name: '岳阳县广播', desc: '岳阳 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500129/64k.mp3' },
  { id: 'local-20989', name: '岳阳综合广播', desc: '岳阳 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20989/64k.mp3' },
  { id: 'local-20500204', name: '云梦综合台', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500204/64k.mp3' },
  { id: 'local-1933', name: '云南民族广播', desc: '云南 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1933/64k.mp3' },
  { id: 'local-20500106', name: '云霄综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500106/64k.mp3' },
  { id: 'local-20500202', name: '枣强综合广播 年代995', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500202/64k.mp3' },
  { id: 'local-1686', name: '枣庄综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1686/64k.mp3' },
  { id: 'local-5021761', name: '泽州广播电视台综合广播', desc: '泽州 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021761/64k.mp3' },
  { id: 'local-20617', name: '湛江综合广播', desc: '湛江 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20617/64k.mp3' },
  { id: 'local-5021877', name: '张家港综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021877/64k.mp3' },
  { id: 'local-15318285', name: '张家口综合广播', desc: '张家口 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318285/64k.mp3' },
  { id: 'local-5021910', name: '张家口综艺广播', desc: '张家口 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021910/64k.mp3' },
  { id: 'local-20212207', name: '章丘广播电视台', desc: '章丘 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20212207/64k.mp3' },
  { id: 'local-5022658', name: '漳浦综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022658/64k.mp3' },
  { id: 'local-1742', name: '漳州综合广播', desc: '漳州 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1742/64k.mp3' },
  { id: 'local-4850', name: '长春MYFM880', desc: '长春 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/4850/64k.mp3' },
  { id: 'local-5021868', name: '长江水上安全信息台·长江之声', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021868/64k.mp3' },
  { id: 'local-4237', name: '长沙城市之音', desc: '长沙 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/4237/64k.mp3' },
  { id: 'local-5022076', name: '长沙市望城区人民广播电台', desc: '长沙 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022076/64k.mp3' },
  { id: 'local-5022311', name: '长兴电台', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022311/64k.mp3' },
  { id: 'local-15318663', name: '长垣人民广播电台', desc: '长垣 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318663/64k.mp3' },
  { id: 'local-5021874', name: '长治综合广播', desc: '长治 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021874/64k.mp3' },
  { id: 'local-20500186', name: '诏安广播电视台综合广播', desc: '诏安 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500186/64k.mp3' },
  { id: 'local-20500213', name: '肇庆高新之声', desc: '肇庆 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500213/64k.mp3' },
  { id: 'local-4518', name: '浙江之声（调频版）', desc: '浙江 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/4518/64k.mp3' },
  { id: 'local-20033', name: '镇海104.7 Nice FM', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20033/64k.mp3' },
  { id: 'local-3984', name: '镇江综合广播', desc: '镇江 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/3984/64k.mp3' },
  { id: 'local-20210752', name: '镇雄南广之声', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20210752/64k.mp3' },
  { id: 'local-20500037', name: '织金人民广播电台', desc: '织金 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500037/64k.mp3' },
  { id: 'local-1277', name: '中山综合广播·新锐967', desc: '中山 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1277/64k.mp3' },
  { id: 'local-20500132', name: '周村广播电视台', desc: '周村 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20500132/64k.mp3' },
  { id: 'local-20212215', name: '周口综合广播', desc: '周口 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20212215/64k.mp3' },
  { id: 'local-5022482', name: '诸暨人民广播电台', desc: '诸暨 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022482/64k.mp3' },
  { id: 'local-5022118', name: '驻马店综合广播', desc: '驻马店 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022118/64k.mp3' },
  { id: 'local-5022473', name: '庄河人民广播电台', desc: '庄河 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022473/64k.mp3' },
  { id: 'local-1678', name: '淄博综合广播', desc: '淄博 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/1678/64k.mp3' },
  { id: 'local-20211598', name: '淄川广播电视台', desc: '淄川 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20211598/64k.mp3' },
  { id: 'local-20207784', name: '自贡综合广播', desc: '自贡 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20207784/64k.mp3' },
  { id: 'local-20207732', name: '邹城人民广播电台', desc: '邹城 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20207732/64k.mp3' },
  { id: 'local-5022097', name: '邹平广播电视台', desc: '邹平 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022097/64k.mp3' },
  { id: 'local-20212394', name: '左云人民广播电台', desc: '左云 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20212394/64k.mp3' },
  { id: 'local-20071', name: 'Asia FM 亚洲天空台', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20071/64k.mp3' },
  { id: 'local-5022417', name: 'AsiaFM安岳综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022417/64k.mp3' },
  { id: 'local-4581', name: 'AsiaFM郫都区综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/4581/64k.mp3' },
  { id: 'local-5021912', name: 'AsiaFM亚洲经典台', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021912/64k.mp3' },
  { id: 'local-5021908', name: 'FM101仙居融媒体广播', desc: 'FM101 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5021908/64k.mp3' },
  { id: 'local-20212209', name: 'FM104.1北岳之声 浑源人民广播电台', desc: 'FM104.1 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20212209/64k.mp3' },
  { id: 'local-5022624', name: 'FM105平阳电台', desc: 'FM105 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/5022624/64k.mp3' },
  { id: 'local-20207734', name: 'FM98.3如皋人民广播电台', desc: 'FM98.3 · 地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/20207734/64k.mp3' },
  { id: 'local-15318388', name: 'Nice Radio 永安广播电视台综合广播', desc: '地方台 · 原声直播', cat: 'local', url: 'https://lhttp.qtfm.cn/live/15318388/64k.mp3' },
];


const HLS_LIB = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js';

/* 分类切换条：887 路频道用一条横向胶囊找起来不现实，按节目类型分栏。
 * 「全部」= 完整台单（老用户下标迁移按完整台单算，与分类无关）。 */
const CATS = [
  ['all', '全部'],
  ['music', '音乐'],
  ['story', '说书'],
  ['opera', '戏曲'],
  ['news', '新闻'],
  ['traffic', '交通'],
  ['economy', '财经'],
  ['life', '生活'],
  ['local', '地方'],
];

/* ---------------- 本地存储（兼容禁用 localStorage 的环境） ---------------- */
function safeGet(key) {
  try { return localStorage.getItem(key); } catch (_) { return null; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch (_) { /* 忽略 */ }
}

/* ---------------- 基础元素 ---------------- */
const $ = (id) => (typeof document !== 'undefined' && document ? document.getElementById(id) : null);
const audio = $('audio');
const playBtn = $('playBtn');
const statusEl = $('status');
const stationNameEl = $('stationName');
const stationDescEl = $('stationDesc');
const stationListEl = $('stationList');
const catListEl = $('catList');
const volumeEl = $('volume');
const toastEl = $('toast');

/* ---------------- 状态 ---------------- */
/* 播放列表 = 默认推荐频道 + 搜索添加的电台 */
let playlist = STATIONS.slice();

/* 当前分类（分类切换条），默认「全部」= 完整台单 */
let cat = safeGet('fm891.cat');
if (!cat || !CATS.some((c) => c[0] === cat)) cat = 'all';
let renderedCat = null;   // 上次渲染时的分类（用于判断能否走快路径）

let index = Number(safeGet('fm891.index'));
if (!Number.isInteger(index) || index < 0 || index >= playlist.length) index = 0;
// 顺序迁移（fm891.ord = 「存储下标属于哪个顺序版本」）：
//   无标记（≤v1.11）→ legacyV1，'2'（v1.12 / v1.13）→ legacyV2，'3'（v1.14 起）→ 直接读。
// 一次性把「旧顺序下标」换算成「频道 id」→ 再定位到新顺序下标并落盘、打标。
// 不打标的话每次启动都会再换算一遍，前两位会永久来回翻转（v1.12 踩过的坑）。
// v1.14 大改台单（境外台全部下架、全国台大批上新）：被下架的台找不到对应 id，
// 统一回落到首位「华语流行热歌」，不会错位到陌生频道。
if (safeGet('fm891.ord') !== '3') {
  try {
    const legacyV1 = ['huayu', 'hits', 'classic-pop', 'bj-music', 'years', 'main', 'rock', 'sleep', 'fip', 'fip-jazz', 'dance', 'eu-pop'];
    const legacyV2 = ['hits', 'huayu', 'classic-pop', 'bj-music', 'years', 'main', 'rock', 'sleep', 'fip', 'fip-jazz', 'dance', 'eu-pop'];
    const ord = safeGet('fm891.ord');
    const srcOrder = ord === '2' ? legacyV2 : (ord === null || ord === '' ? legacyV1 : null);
    const rawIdx = safeGet('fm891.index');
    if (srcOrder && rawIdx !== null && rawIdx !== '') {
      const n = Number(rawIdx);
      if (Number.isInteger(n) && n >= 0 && n < srcOrder.length) {
        const target = playlist.findIndex((s) => s.id === srcOrder[n]);
        index = target >= 0 ? target : 0; // 台已下架 → 回落首位推荐台
      }
      safeSet('fm891.index', String(index)); // 落盘新顺序下标，后续启动直读
    }
    safeSet('fm891.ord', '3');
  } catch (_) { /* 忽略 */ }
}

let attachedUrl = null;   // 当前 audio 已加载的地址

/* ---------------- v1.20 连续直播流（App = 纯收音机） ----------------
 * 服务器把点播、垫场歌、台呼按轮播顺序用 ffmpeg 实时拼成一条不断的 MP3 流
 * （/stream），全网听众收到的是**同一批字节**，切歌在服务端完成。App 侧
 * 因此不再需要：自己选曲、按 startedAt seek 对齐、播完接棒 —— 那套正是
 * 「间歇性」的根源（每首歌重新下载+定位，必然有缝）。App 只负责连上、
 * 出声、断了自动重连；air 消息降级为纯 UI（曲目 / 播报 / 点歌进度）。 */
const STREAM_DIRECT = 'http://177.3.32.94:8080/stream';   // 直连，不经隧道、最快最稳
let streamPrimary = STREAM_DIRECT;   // air.stream 回发时覆盖（服务器换 IP 不用发版）
let streamTunnel = '';                // 隧道备用地址，从 air.url 的 origin 推导
let streamFailover = 0;               // 自上次成功以来连着失败了几次（playing 时归零）
let streamLastGoodTunnel = false;     // 上次**成功出声**走的是哪条线（决定重连先试哪条）
let streamAttemptTunnel = false;      // 本次 liveUrl() 选中的线路，成功后回写成 lastGood

/* 点歌单曲（VOD）状态。null = 直播模式，**所有与直播的分叉都会走直播分支**，
 * 行为与加这个字段之前逐条一致 —— v1.15 刚把切换/重连修好，不能顺手改坏。
 * 真正需要分叉的只有四处：播什么地址、出声后说什么、走不走 ICY 读曲目、
 * 进度条露不露。其余（代际令牌、良性中断识别、换源窗口、重连去重）全部复用。 */
let vod = null;           // { url, title, from, dur } | null

let hls = null;           // hls.js 实例
let hlsRetried = false;
let shouldPlay = false;   // 用户的播放意图
let userPaused = false;   // 用户**主动**按过暂停（只此含义）：打开 App 的自动开播
                          // 看它让路；切台/换源这类内部 pause 不算，不许误伤。
let retries = 0;          // 失败重连次数
let retryTimer = null;    // 重连排队中的定时器句柄；非 null 即「已有一趟重连在排队」
let abortReissue = 0;     // 良性中断后的补发次数（有上限，防止自激循环）
let toastTimer = null;

/* 播放代际令牌：play / pause / 切台 各自 +1。
 * 切台时上一次尚未完成的 play() 会因换源被浏览器以
 * “The play() request was interrupted by a new load request” 拒绝，
 * 旧版没有令牌，catch 里直接把 shouldPlay 改成 false 并弹“播放失败”，
 * 新台刚连上就被自己掐断 —— 这就是「切换电台总是断流」的主因。
 * 令牌不匹配 = 请求已过期，静默丢弃，不写任何状态。 */
let playToken = 0;
/* 换源窗口：窗口内的 pause / error 事件是拆旧源的残留，不当成业务事件。 */
let switchUntil = 0;

function beginSwitch(ms) { switchUntil = Date.now() + (ms || 800); }
function inSwitch() { return Date.now() < switchUntil; }

/* 拆旧源后浏览器会补发一次 pause，而且时机不可控（有时晚于新源出声）。
 * 单靠时间窗挡不住：新源 35ms 就出声并把窗口关掉，60ms 才到的旧源 pause
 * 照样漏进来，把状态打成「缓冲中…」—— 看起来就像切台又断了。
 * 改用「配额」：换源时 +1，pause 监听消耗掉，1.5 秒后自动失效。
 * 只消费真正属于拆源的那几次，之后的 pause 全部照常处理。 */
let pauseQuota = 0;
let pauseQuotaUntil = 0;
function noteTeardownPause() {
  pauseQuota += 1;
  pauseQuotaUntil = Date.now() + 1500;
}
function consumeTeardownPause() {
  if (pauseQuota > 0 && Date.now() < pauseQuotaUntil) {
    pauseQuota -= 1;
    return true;
  }
  return false;
}

/* 「interrupted / AbortError」= 换源或暂停造成的正常中断，不是播放失败 */
function isBenignPlayAbort(err) {
  if (!err) return false;
  if (err.name === 'AbortError') return true;
  return /interrupted/i.test(String(err.message || err));
}

// 音量：safeGet 无记录时返回 null，而 Number(null) === 0 —— 直接判 isFinite 会把
// 新装机初始化成 0（静音）。必须显式判空走默认值；合法的 0（用户主动调静音）保留。
const rawVolume = safeGet('fm891.volume');
const savedVolume = rawVolume === null || rawVolume === '' ? NaN : Number(rawVolume);
audio.volume = Number.isFinite(savedVolume) && savedVolume >= 0 && savedVolume <= 1 ? savedVolume : 0.85;
volumeEl.value = String(audio.volume);

const current = () => playlist[index];

/* ---------------- UI 渲染 ---------------- */
/* 当前分类下可见的频道下标（分类只影响展示，playlist / index 始终是完整台单） */
function visibleIdx() {
  if (cat === 'all') return playlist.map((_, i) => i);
  const out = [];
  for (let i = 0; i < playlist.length; i++) if (playlist[i].cat === cat) out.push(i);
  return out;
}

function renderCats() {
  if (!catListEl) return;
  catListEl.innerHTML = '';
  const frag = document.createDocumentFragment();
  CATS.forEach(([key, label]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cat' + (key === cat ? ' active' : '');
    btn.dataset.cat = key;
    btn.innerHTML = '<b></b><small></small>';
    btn.querySelector('b').textContent = label;
    const count = key === 'all' ? playlist.length : playlist.filter((s) => s.cat === key).length;
    btn.querySelector('small').textContent = String(count);
    frag.appendChild(btn);
  });
  catListEl.appendChild(frag);
  const actCat = catListEl.querySelector('.cat.active');
  if (actCat && typeof actCat.scrollIntoView === 'function') {
    try { actCat.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (_) { /* 忽略 */ }
  }
}

function renderStations() {
  // 台单已下架：元素不存在时直接返回（渲染/选台路径全部幂等）
  if (!stationListEl) return;
  const vis = visibleIdx();
  // 快路径：分类没变且可见数量一致 → 只切换选中态，不重建 DOM。
  // 台单有 887 路，每次切台都重建就是肉眼可见的卡顿（用户反馈的「按下去半天才响」）。
  if (renderedCat === cat && stationListEl.children.length === vis.length && vis.length > 0) {
    const nodes = stationListEl.children;
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].classList.toggle('active', Number(nodes[i].dataset.i) === index);
    }
  } else {
    const frag = document.createDocumentFragment();
    vis.forEach((gi) => {
      const s = playlist[gi];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'station' + (gi === index ? ' active' : '');
      btn.dataset.i = String(gi);
      btn.innerHTML =
        '<span class="dot"></span>' +
        '<span class="info"><b></b><small></small></span>' +
        '<span class="tag">播出中</span>';
      btn.querySelector('b').textContent = s.name;
      btn.querySelector('small').textContent = s.desc;
      frag.appendChild(btn);
    });
    stationListEl.innerHTML = '';
    stationListEl.appendChild(frag);
    renderedCat = cat;
  }
  // 胶囊条：让选中频道始终在可视区内（仅横向容器滚动，不拉动页面）。
  // 初始渲染时第一个胶囊 offsetLeft≈0，目标值为负会被钳到 0，不会产生位移。
  const act = stationListEl.querySelector('.station.active');
  if (act) {
    const target = act.offsetLeft - (stationListEl.clientWidth - act.offsetWidth) / 2;
    stationListEl.scrollLeft = Math.max(0, target);
  } else {
    stationListEl.scrollLeft = 0;
  }
}

/* 事件委托：887 个按钮共用一个监听器（逐个 addEventListener 会白扔 887 个闭包）。
 * 台单已下架、元素被移除时跳过 —— 旧路径再点台就静默忽略。 */
if (stationListEl) stationListEl.addEventListener('click', (e) => {
  const btn = e.target && e.target.closest ? e.target.closest('.station') : null;
  if (!btn || btn.dataset.i === undefined) return;
  selectStation(Number(btn.dataset.i), true);
});

if (catListEl) {
  catListEl.addEventListener('click', (e) => {
    const btn = e.target && e.target.closest ? e.target.closest('.cat') : null;
    if (!btn || !btn.dataset.cat || btn.dataset.cat === cat) return;
    cat = btn.dataset.cat;
    safeSet('fm891.cat', cat);
    renderCats();
    renderStations();
  });
}

function updateNowPlaying() {
  // 电台台单已下架：启动/复位一律显示点播台的待机文案
  if (stationNameEl) stationNameEl.textContent = '时光点播台';
  if (stationDescEl) stationDescEl.textContent = '点一首歌，云端主播放给你听';
  document.title = '时光电台 · 拾起耳朵里的好时光';
  nowTitle = '';
  const nt = $('nowTitle');
  if (nt) nt.textContent = '';
  const na = $('nowArtist');
  if (na) { na.hidden = true; na.textContent = ''; }
  const sm = $('songMeta');
  if (sm) { sm.hidden = true; sm.innerHTML = ''; }
  if (window.AndroidIcy) {
    try { window.AndroidIcy.station('时光电台'); } catch (_) { /* 忽略 */ }
  }
  updateMediaSession();
}

function updatePlayUI() {
  const playing = !audio.paused && shouldPlay;
  document.body.classList.toggle('playing', playing);
  if (playBtn) {   // v1.20 直播没有播放/暂停键，元素已移除；网页版可能仍是旧 HTML
    playBtn.classList.toggle('is-playing', playing);
    playBtn.setAttribute('aria-label', playing ? '直播中' : '播放');
  }
  /* v1.21.4：「开播中」徽章撤了（用户：开播中也删掉）。元素已从 HTML 删掉，
   * 这里必须判空 —— 直接 $('liveDot').hidden 会 TypeError 把整个 UI 打断。 */
  const dot = $('liveDot');
  if (dot) dot.hidden = !playing;
  if ('mediaSession' in navigator) {
    try { navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'; } catch (_) { /* 忽略 */ }
  }
  if (playing && statusEl.dataset.kind !== 'loading') {
    setStatus('live', isVod() ? '播放中' : '直播中');
  }
}

function setStatus(kind, text) {
  statusEl.className = 'status' + (kind ? ' ' + kind : '');
  statusEl.dataset.kind = kind || '';
  statusEl.textContent = text;
}

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
}

/* ---------------- 直流源挂载（mp3 / m3u8） ---------------- */
function loadHlsLib() {
  return new Promise((resolve, reject) => {
    if (window.Hls) return resolve(window.Hls);
    const s = document.createElement('script');
    s.src = HLS_LIB;
    s.onload = () => resolve(window.Hls);
    s.onerror = () => reject(new Error('hls.js 加载失败'));
    document.head.appendChild(s);
  });
}

function destroyHls() {
  if (hls) {
    try { hls.destroy(); } catch (_) { /* 忽略 */ }
    hls = null;
  }
}

function detach() {
  if (attachedUrl) noteTeardownPause();
  destroyHls();
  if (attachedUrl) {
    audio.removeAttribute('src');
    try { audio.load(); } catch (_) { /* 忽略 */ }
  }
  attachedUrl = null;
}

async function attach(url, force) {
  if (attachedUrl === url && !force) return;
  if (attachedUrl) noteTeardownPause();   // 即将换源：旧源拆载可能补发一次 pause
  destroyHls();
  attachedUrl = null;

  const isHls = /\.m3u8(\?|#|$)/i.test(url);

  if (isHls) {
    // 旧源（mp3 直链）必须先真正卸载，否则 hls.attachMedia 会和旧 src 抢 media
    if (audio.getAttribute('src')) {
      audio.removeAttribute('src');
      try { audio.load(); } catch (_) { /* 忽略 */ }
    }
    // iOS / Safari 原生支持 HLS
    if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src = url;
      attachedUrl = url;
      return;
    }
    try {
      const Hls = await loadHlsLib();
      if (Hls.isSupported()) {
        hlsRetried = false;
        hls = new Hls({ enableWorker: true });
        hls.loadSource(url);
        hls.attachMedia(audio);
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (!data.fatal) return;
          if (!hlsRetried && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hlsRetried = true;
            hls.startLoad();
          } else if (!hlsRetried && data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hlsRetried = true;
            hls.recoverMediaError();
          } else {
            handleStreamError();
          }
        });
        attachedUrl = url;
        return;
      }
    } catch (_) {
      /* hls.js 加载失败，退回直接播放（多数浏览器不支持，会报错并提示） */
    }
  }

  /* 强制重挂（失败重试）且地址没变时：对 src 赋**同值**在浏览器里是 no-op，
   * 不会重跑加载算法，粘滞的 error 标记也就清不掉 —— 接着调 play() 必然
   * 再次被 NotSupportedError 拒绝，看起来就是「怎么点都是失败」。
   * 必须先摘掉再挂，让它真的重新拉一次流。 */
  if (force && audio.getAttribute('src') === url) {
    audio.removeAttribute('src');
    try { audio.load(); } catch (_) { /* 忽略 */ }
  }

  /* 关键优化：直接换 src。旧版先 removeAttribute('src') + load() 再 set src，
   * 一次切台要走两遍媒体卸载流程：① 多一次 teardown，期间连发 pause/error
   * 事件污染状态；② 若此刻有 play() 挂起必被 “interrupted by a new load
   * request” 拒绝。浏览器在 src 变更时本来就会自动释放旧资源。 */
  audio.src = url;
  attachedUrl = url;
}

/* ---------------- 播放控制 ---------------- */
/* 当前该连哪条直播流：直连优先；直连连不上（换过重试次数）就走隧道，
 * 两条都活着时永远优先直连 —— 隧道域名每天变，长连接最怕它。 */
function liveUrl() {
  /* 选线规则（实测：直连 15s 零空隙、均速 15.3KB/s；隧道偶发 8s 停顿 ——
   * 直连永远更好，隧道只在直连**真的不通**时才轮上）：
   *   · 上次成功用的哪条，下次重连就先试哪条（别在直连好好的时候跳去隧道）；
   *   · 连着失败就每失败一次换一条，保证直连被墙/被限速时也能很快兜到隧道。 */
  streamAttemptTunnel = !!(streamTunnel &&
    (streamLastGoodTunnel ? streamFailover % 2 === 0 : streamFailover % 2 === 1));
  return streamAttemptTunnel ? streamTunnel : (streamPrimary || STREAM_DIRECT);
}

/* 拉起原生前台媒体服务：锁屏卡片、系统播放器、熄屏续播（省电锁）全挂在它上面。
 * **不**用 start 桥方法 —— 那个入口会顺带开一路 ICY 读取器，把整条流读完直接
 * 丢掉（流是 ffmpeg 直出的裸 MP3，根本没有元数据可读），白耗一倍带宽。
 * media() 是 v1.20.1 给桥加的窄入口：只起服务 + 电源锁。 */
function startMediaCard() {
  if (window.AndroidIcy && typeof window.AndroidIcy.media === 'function') {
    try { window.AndroidIcy.media(); } catch (_) { /* 忽略 */ }
  }
}

async function play() {
  const token = ++playToken;   // 本次播放的代际；期间被新的 play/pause/切台 取代即作废
  shouldPlay = true;
  retries = 0;
  clearTimeout(retryTimer);
  retryTimer = null;           // 本次重新起播，之前排队的重连作废
  disarmStallWatchdog();
  beginSwitch(700);            // 换源窗口：本次 attach 产生的拆源事件先不处理
  try {
    // 上一次源报过错时，元素仍带着 error 标记，必须强制换一次 src 才能恢复
    // v1.20：直播模式永远连服务器的 /stream（不是 air.url 里的单曲文件）。
    // 单曲仍走 vod.url（手动点播保留这一路）。
    await attach(isVod() ? vod.url : liveUrl(), !!audio.error);
    if (token !== playToken) return;
    await audio.play();
    if (token !== playToken) return;
    abortReissue = 0;          // 已成功出声，良性中断补发计数归零
    /* 流里没有 ICY 单曲元数据（服务端 ffmpeg 直出裸 MP3），曲目标题一律由
     * air 消息给 —— 再开一路 ICY 只是白耗连接和带宽，故不再启动。
     * 但锁屏卡片 / 系统播放器 / 熄屏续播（省电锁）全挂在前台媒体服务上，
     * 必须在**出声这一刻**把它拉起 —— v1.20 漏了这步，安卓播放时系统播放器
     * 和锁屏什么都不显示（v1.20.1 补回）。 */
    startMediaCard();
  } catch (err) {
    // ⓪ 已被新的播放/暂停/切台请求顶掉 —— 静默退出，绝不改状态（旧版在这儿
    //    把 shouldPlay 置 false，导致切台时新台被自己掐断 = 断流）
    if (token !== playToken) return;

    // ① NotSupportedError = 源真的没拉起来。WebView/Chrome 会**同时**发 error
    //    事件并把 play() 拒绝掉，两条路都汇到这里。
    //    旧版把这当成「真失败」：shouldPlay=false + 弹「播放失败」，而
    //    handleStreamError() 第一行 `if (!shouldPlay) return` 立刻退出 ——
    //    5 次重连一次都跑不到。表现就是「切台总是失败，且再也救不回来」。
    if (err && err.name === 'NotSupportedError') { handleStreamError(); return; }

    // ② interrupted / AbortError = 换源、暂停造成的正常中断，同样不是失败
    if (isBenignPlayAbort(err)) {
      if (!shouldPlay) { updatePlayUI(); setStatus('', '已暂停'); return; }
      // token 没变 = 没人顶掉本次播放，中断来自换源自身。旧版在这儿静默 return，
      // 之后再没有任何代码会去调 play()，状态就永远卡在「连接中…」。
      if (abortReissue >= 3) { handleStreamError(); return; }   // 有上限，防自激
      abortReissue += 1;
      setStatus('loading', '继续连接…');
      setTimeout(() => { if (token !== playToken || !shouldPlay) return; play(); }, 300);
      return;
    }

    // ③ 自动播放被系统拒绝（桌面浏览器/无手势额度）：不是「源坏了」，
    //    是这一局还没有用户手势。保持跟播意图，点播放键就能续上。
    if (err && err.name === 'NotAllowedError') {
      shouldPlay = false;
      abortReissue = 0;
      playingAirId = '';
      exitVod();
      updatePlayUI();
      setStatus('', '点击接上直播');
      /* 直播没有播放键，这里必须给出一个可点的把手 —— 把开播条露出来当
       * 「点击收听」用，点一下（由 airBar 的 click 处理）重新接上。 */
      const ab = $('airBar');
      if (ab) {
        ab.hidden = false;
        const at = $('airText');
        if (at) at.textContent = '自动播放被拦了一下，点这里接上直播';
      }
      toast('自动播放被拦了一下，点「接上」就开始 🎧');
      return;
    }

    // ④ 真失败（地址根本拉不起来）→ 转重连通道：直播必须一直活着，
    //    不能像旧版那样停在「点击播放开始收听」等一个已经不存在的按钮。
    abortReissue = 0;
    updatePlayUI();
    handleStreamError();
  }
}

function pause() {
  ++playToken;                 // 让挂起的 play() 立即作废
  shouldPlay = false;
  switchUntil = 0;             // 用户主动暂停：结束换源窗口，pause 事件立即生效
  clearTimeout(retryTimer);
  retryTimer = null;           // 用户按了暂停，排队中的重连不再有意义
  abortReissue = 0;
  disarmStallWatchdog();
  clearTimeout(pauseRecover);  // 用户意图优先：掐掉锁屏自救定时器
  pauseRecover = null;
  audio.pause();
  updatePlayUI();              // 不等事件，UI 立刻回位（窗口内事件会被忽略）
  setStatus('', '已暂停');
  if (window.AndroidIcy) {
    try { window.AndroidIcy.stop(); } catch (_) { /* 忽略 */ }
  }
}

/* ---------------- 云同步开播（air 消息 = 纯 UI） ----------------
 * 服务器在 fm891-radio/air 上 retain 当前开播的歌（含 startedAt/dur/ann/stream）。
 * v1.20 起 air **不再驱动播放** —— 音频来自服务器连续推的 /stream，全网
 * 收到的本就是同一批字节。air 只负责四件事：
 *   ① 更新大标题 / 歌手 / 播报 / 锁屏；② 回发直连与隧道的流地址；
 *   ③ 驱动「当前这首播到哪」的只读进度；④ 点歌台的排位展示。
 * 旧版「按 startedAt seek 对齐 + 播完接棒」整段删除：那正是间歇性根源。 */
let airInfo = null;      // 最新一条云开播消息
let playingAirId = '';   // 最近一次展示过的 air id（同一首不重复刷界面）
let airProgress = null;  // {startedAt, dur} —— 只读进度条数据源（直播不可拖动）

function renderAirBar() {
  /* 我们一打开就连上流，「一起听」把手平时没用；只在**还没接上**时露出来，
   * 当「点一下接上直播」的救急入口（自动播放被拦 / 断线待救时才有意义）。
   * 判定用「播放意图 + 已挂源」而不是 audio.paused：后者在 jsdom / 缓冲
   * 瞬间都是 true，会把手该藏的时候露出来。 */
  const bar = $('airBar');
  if (!bar) return;
  bar.hidden = !!(shouldPlay && attachedUrl && !audio.error);
  const txt = $('airText');
  if (txt) {
    /* 单曲模式下绝不能顶着直播歌名 —— 此时把手点下去是**重播单曲**，
     * 文案必须对得上动作（否则用户以为点了会切回直播）。 */
    if (vod && !shouldPlay) txt.textContent = '单曲播完了 · 点这里再听一遍';
    else if (airInfo && airInfo.title) txt.textContent = '正在开播《' + String(airInfo.title) + '》';
  }
}

/* air → 纯 UI。刻意不碰 audio、不 attach、不 seek。 */
function onAir(body) {
  if (!body || typeof body !== 'object' || !body.url) return;
  airInfo = body;
  /* 服务器回发的流地址优先（换 IP / 换隧道都不用发版）：
   * - body.stream 是直连地址（首选）
   * - body.url 是成片地址，取其 origin 推导隧道备用流 */
  if (body.stream) streamPrimary = String(body.stream);
  try {
    if (body.url) streamTunnel = new URL(String(body.url)).origin + '/stream';
  } catch (_) { /* 地址不合法就沿用上一次的 */ }

  const id = String(body.id || '');
  if (playingAirId !== id) {
    playingAirId = id;
    renderNowPlaying(body);
  }
  /* 「接下来」跟歌单一起发过来，换不换歌都要刷 —— 刚被插到下一首的那首
   * 就是在这里冒出来的（服务器 promote_now）。 */
  renderUpNext(body.next);
  const dur = Number(body.dur) || 0;
  const st = Number(body.startedAt) || 0;
  airProgress = dur > 0 && st > 0 ? { startedAt: st, dur: dur } : null;
  const row = $('vodRow');
  if (row && !vod) row.hidden = !airProgress;
  if (airProgress) renderVodProgress();
  renderAirBar();
  /* 还没连上流就靠这条 air 兜底接上（启动即连是主路径，这里是保险）。
   * v1.20 没有暂停键，userPaused 恒为 false。 */
  if (!shouldPlay && !userPaused && !isVod()) startStream();
}

/* 接上直播流：**唯一**的播放入口，幂等（已在听就什么都不做）。
 * 直播没有暂停 —— 收音机拧开就一直听，断了由重连通道自己救回来。 */
function startStream() {
  userPaused = false;
  if (shouldPlay && !audio.paused && attachedUrl && !audio.error) {
    renderAirBar();
    return;
  }
  shouldPlay = true;
  setStatus('loading', '正在接通直播…');
  play().then(renderAirBar).catch(() => { /* play() 内部已接管失败处理 */ });
}

/* 旧名保留给 airBar 点击等入口：语义已从「seek 对齐加入云开播」简化为
 * 「接上直播」—— 字节本身全网同步，无需对齐。 */
async function playAirNow() { startStream(); }

function startAir() {
  if (!airInfo) {
    setStatus('loading', '正在接通直播…');
    toast('直播马上就来，正在连…');
  }
  startStream();
}

function rejoinAir() { startStream(); }

function togglePlay() {
  /* 直播没有暂停，这个入口现在只负责「（重新）接上直播」。
   * 锁屏播放键、mediaSession 的 play 都走它。 */
  startStream();
}

async function selectStation(i, autoplay) {
  // 选台 = 回到直播模式。单曲那一路只清状态和进度条，不停播 ——
  // 下面 attach() 会直接把 src 换成电台地址，中途不给断流的机会。
  exitVod();
  const changed = i !== index;
  ++playToken;      // 先作废上一次未完成的 play()，防止它回来改状态/弹错误提示
  index = i;
  safeSet('fm891.index', String(index));
  renderStations();
  updateNowPlaying();

  if (changed) {
    retries = 0;
    clearTimeout(retryTimer);
    retryTimer = null;
    abortReissue = 0;
    onStationChanged();    // 官方在线人数跟着换台重取（内部有代际校验防串台）
    disarmStallWatchdog();   // 旧台遗留的 20 秒看门狗会去重连新台，必须先撤
    beginSwitch(800);        // 800ms 换源窗口：期间的 pause / error 是拆旧源的残留
    if (window.AndroidIcy) {
      // 先掐掉旧台的原生读取：不停就还会拉旧地址，锁屏也一直显示旧台歌曲
      try { window.AndroidIcy.stop(); } catch (_) { /* 忽略 */ }
    }
    if (autoplay) {
      setStatus('loading', '连接中…');
      // 不 detach：attach() 会直接换 src（一次卸载搞定）。
      // 旧版这里先 removeAttribute+load()，一次切台走两遍卸载，既慢又会
      // 触发 pause/error 事件把状态冲掉，还会拒绝挂起的 play()。
    } else {
      pause();   // 不继续播 → 真正卸载旧源（内部已置 shouldPlay=false 并刷 UI）
      detach();
    }
  }

  if (autoplay) {
    await play();
  } else if (changed) {
    setStatus('', '已切台 · 点「接上」开始收听');   // 直播没有播放键，指向的必须是真存在的把手
    updatePlayUI();
  }
}

function step(delta) {
  // 在「当前分类可见范围」内上下切；分类是全部时等价于整表循环
  const vis = visibleIdx();
  if (!vis.length) return;
  const pos = vis.indexOf(index);
  const next = pos < 0 ? vis[0] : vis[(pos + delta + vis.length) % vis.length];
  selectStation(next, true);
}

/* ---------------- 点歌单曲（VOD） ---------------- */
/* 直播的源永远在那儿，单曲是一次性的有限文件。两者差异其实只有四处，其余
 * 一律复用直播那套已经验证过的防护 —— 代际令牌、良性中断识别、换源窗口、
 * 重连去重。绝不另起一套播放逻辑：v1.15 刚把这些坑填平，重写等于重新挖开。 */
function isVod() { return vod !== null; }

/* 当前在放什么 → 界面（air 与本地单曲**共用同一套展示**）。
 * 刻意不在此设 vod：vod 的语义是「本地加载的有限单曲」，而直播是一条
 * 无限流。一旦 isVod() 为真，进度 / 播完 / 接棒那套单曲逻辑全会被误触发。 */
/* —— 封面跟着歌「呼吸」：同一首歌永远同一个颜色 ——
   用户要的：电台要看起来是「活的」，翻到下一首要一眼看得出换歌了。
   做法：拿「歌名+歌手」算一个稳定哈希 → 色相 → 写进 CSS 变量 --cover-hue，
   光环、封面投影、播放器底色、背景光晕全都读它。CSS 里有 .8s 过渡，所以
   换歌时颜色是「化过去」的，不是硬切。
   色相锁在 190–340（青→蓝→紫→粉）：避开黄绿那片，怎么随机都不会刺眼。 */
function coverHue(title, artist) {
  const s = String(title || '') + '|' + String(artist || '');
  if (!s.replace(/\|/g, '')) return 265;          // 没歌名就固定紫，别乱跳
  let h = 2166136261 >>> 0;                        // FNV-1a：稳定、分布均匀
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return 190 + (h % 151);                           // 190..340
}

function setCoverHue(title, artist) {
  try {
    const hue = coverHue(title, artist);
    const root = document.documentElement;
    if (root.style.getPropertyValue('--cover-hue') === String(hue)) return;
    root.style.setProperty('--cover-hue', String(hue));
    /* 换歌瞬间给 body 打个标记，封面会轻微缩一下（「切了一刀」的动作感）。
     * **不用 setTimeout 收尾** —— 那会给 VOD 播放块凭空加一个定时器，
     * vod-test 有一条断言专门守「VOD 块里不许出现 setTimeout」（怕它另起重连）。
     * 标记由 CSS 动画自己结束：这里只加上不移掉，下一次换歌会再触发一次。 */
    document.body.classList.add('track-change');
  } catch (_) { /* 忽略 */ }
}

function renderNowPlaying(j) {
  const title = String((j && j.title) || '').trim().slice(0, 60) || '时光电台';
  const artist = String((j && j.artist) || '').trim().slice(0, 40);
  const ann = String((j && j.ann) || '').trim().slice(0, 240);
  const from = String((j && j.from) || '').trim().slice(0, 30);
  setCoverHue(title, artist);
  nowTitle = '';
  const nt = $('nowTitle');
  if (nt) nt.textContent = '';   // 歌名归大字（h1），这里再来一遍就是重复展示
  if (stationNameEl) stationNameEl.textContent = title;
  const na = $('nowArtist');
  if (na) { na.hidden = !artist; na.textContent = artist || ''; }
  if (stationDescEl) {
    stationDescEl.textContent = ann || (from ? from + ' 点的歌' : '正在直播');
  }
  document.title = title;
  renderSongMeta();
  if (window.AndroidIcy) {
    try { window.AndroidIcy.station('时光电台'); } catch (_) { /* 忽略 */ }
    /* 锁屏 / 系统播放器上的「歌名」也从这走：流里没有 ICY 元数据，原生读取器
     * 给不了标题，air 消息是唯一数据源 —— 每次换歌必须同步推给前台媒体服务，
     * 否则锁屏卡片永远停在开播时那一首。 */
    try { window.AndroidIcy.title(title || ''); } catch (_) { /* 忽略 */ }
  }
  updateMediaSession();
}

/* 「接下来」列表：服务器随 air 一起发 next（最多 5 首，按轮播顺序，点歌在前、
 * 垫场在后）。刚备好的点歌会被插到下一首 —— 就是在这里冒出来的。
 * 单曲模式下不显示：那会儿耳朵里是单曲，混着电台歌单只会更乱。 */
function renderUpNext(list) {
  /* v1.21.4：排队列表从底部那条横滑搬到左边一栏透明列表
   * （用户：中间左边透明显示排队列表，下面就不要显示了）。 */
  const box = $('queueRail');
  const strip = $('queueRailList');
  const empty = $('queueRailEmpty');
  if (!box || !strip) return;
  const arr = Array.isArray(list) ? list.filter((x) => x && x.title).slice(0, 7) : [];
  /* 正在播的那一首不该再出现在「排队」里 —— 截图里《秋天不回来》正在播，
     队列 #1 也是它，同一首歌占两格，看着就是 bug。左栏只放 4 条：
     放不下就该省略，也不要溢出到正文下面被盖住。
     v1.21.11：服务器 now 在 next 前面挂「找歌中」的点歌（wait=1，最多 2 条，
     备好即插到最前）—— 上面的窗口从 5 放宽到 7，别把后面已备好的歌挤没了。 */
  const cur = (airInfo && airInfo.id) || '';
  const queue = arr.filter((x) => !cur || String(x.id || '') !== String(cur)).slice(0, 4);
  if (!queue.length || vod) {
    box.hidden = true;
    return;
  }
  /* sig 必须带上 wait：同一条从「找歌中」变「已备好」时 id 不变，不带 wait
     就会被当成同一份歌单跳过重画，状态字永远停在旧的（回归盯这条）。 */
  const sig = queue.map((x) => String(x.id || x.title) + (x.wait ? '~w' : '')).join('|');
  if (strip.getAttribute('data-sig') === sig) return;   // 同一份别重画
  strip.setAttribute('data-sig', sig);
  strip.textContent = '';
  queue.forEach((it, i) => {
    const li = document.createElement('li');
    li.className = 'q-item' + (it.lib ? ' lib' : '') + (it.wait ? ' wait' : '');
    /* 把序号写进 --i：CSS 里 qIn 动画用它做级联延迟（每条晚 55ms 依次浮现）。
     * 之前 CSS 写了 var(--i) 但从没赋值 → 延迟恒为 0，排队条目是一起出现的，
     * 「丝滑」就少了一半。jsdom 不跑动画，所以要靠断言盯住这个接线。 */
    try { li.style.setProperty('--i', String(i)); } catch (_) { /* 忽略 */ }
    const no = document.createElement('span');
    no.className = 'q-no';
    no.textContent = String(i + 1);
    const main = document.createElement('span');
    main.className = 'q-main';
    const b = document.createElement('b');
    b.textContent = String(it.title || '').slice(0, 10);
    main.appendChild(b);
    if (it.artist) {
      const a = document.createElement('small');
      a.className = 'q-artist';
      a.textContent = String(it.artist).slice(0, 8);
      main.appendChild(a);
    }
    const s = document.createElement('small');
    s.className = 'q-state';
    /* 「找歌中」优先于点歌人：条目还没备好，最要紧的信息是「还在找」，
     * 谁点的排第二（太长也放不下）。 */
    s.textContent = it.wait
      ? (it.who ? String(it.who).slice(0, 4) + ' 找歌中' : '正在找歌')
      : it.lib ? '电台垫场'
      : (it.who ? String(it.who).slice(0, 6) + ' 点的' : '正在准备');
    main.appendChild(s);
    li.appendChild(no);
    li.appendChild(main);
    strip.appendChild(li);
  });
  if (empty) empty.hidden = arr.length > 0;
  box.hidden = false;
}

/* 进入单曲模式：只改地址和展示，不动 shouldPlay、不改 playToken ——
 * 紧接着那次 play() 会照常走完它已有的全部防抖/恢复路径。 */
function enterVod(info) {
  vod = {
    url: String(info.url || ''),
    title: String(info.title || '点播曲目').trim().slice(0, 60),
    from: String(info.from || '').trim().slice(0, 30),
    artist: String(info.artist || '').trim().slice(0, 40),
    to: String(info.to || '').trim().slice(0, 30),
    ann: String(info.ann || '').trim().slice(0, 240),   // 台词是分层长句，80 会截半句
    dur: Number(info.dur) > 0 ? Number(info.dur) : 0,
  };
  disarmStallWatchdog();
  const row = $('vodRow');
  if (row) row.hidden = false;
  /* 进单曲先把原生那一路停干净：锁屏卡片不能继续挂着**旧的直播**歌名
   * （「进单曲后原生已停」是回归套件守着的行为）。v1.20 的 ICY 读取器本就
   * 不启动，这句 stop() 实际停掉的是旧台遗留状态 + 电源锁；卡片紧接着由
   * play() 出声后的 startMediaCard() 原样接回来 —— 单曲标题已在下面
   * renderNowPlaying 里先一步推给前台服务，重启后显示的正是新歌。 */
  if (window.AndroidIcy) {
    try { window.AndroidIcy.stop(); } catch (_) { /* 忽略 */ }
  }
  renderNowPlaying(vod);
  renderVodProgress();
}

/* 歌曲信息 chips：谁点的 / 送给谁 / 歌手 / 时长 —— 一眼看全，界面不空。
 * 数据源统一：手动单曲优先，否则展示当前 air 那首（两者字段同构）。 */
function renderSongMeta() {
  const el = $('songMeta');
  if (!el) return;
  const src = vod || airInfo;
  const bits = [];
  if (src) {
    const from = String(src.from || '').trim();
    const to = String(src.to || '').trim();
    const artist = String(src.artist || '').trim();
    const dur = Number(src.dur) || 0;
    if (from) bits.push('💌 ' + from + ' 点的');
    if (to) bits.push('🎁 送给 ' + to);
    if (artist) bits.push('🎤 ' + artist);
    if (dur) bits.push('⏱ ' + fmtTime(dur));
  }
  el.innerHTML = '';
  if (!bits.length) { el.hidden = true; return; }
  bits.forEach((b) => {
    const s = document.createElement('span');
    s.className = 'meta-chip';
    s.textContent = b;
    el.appendChild(s);
  });
  el.hidden = false;
}

/* 退出单曲模式：只清状态和进度条，**不停播** —— 调用方（选台）马上会
 * attach() 到电台地址，中间不断开，用户听不到断层。 */
function exitVod() {
  if (!vod) return;
  vod = null;
  const row = $('vodRow');
  // 进度条不能跟着藏：air 还有「当前这首播到哪」要继续显示
  if (row) row.hidden = !airProgress;
  // 「接下来」在单曲模式里是藏着的，回来了要接着显示
  renderUpNext(airInfo && airInfo.next);
}

/* 对外入口：点歌模块 / 阶段2 worker 播一首"已经就绪"的单曲 */
async function playVod(info) {
  if (!info || !info.url) {
    toast('这首还没有可播的音源，先让 DJ 找找');
    return;
  }
  // 手动点播 = 单曲模式：这轮不跟 air 展示走，云开播换歌不会把它冲掉
  playingAirId = '';
  renderAirBar();
  enterVod(info);
  await play();
}

function fmtTime(sec) {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const s = Math.floor(sec % 60);
  const m = Math.floor(sec / 60) % 60;
  const h = Math.floor(sec / 3600);
  const mm = h ? String(h) + ':' + String(m).padStart(2, '0') : String(m);
  return mm + ':' + String(s).padStart(2, '0');
}

function renderVodProgress() {
  const pct = $('vodPct');
  const cur = $('vodCur');
  const durEl = $('vodDur');
  if (!pct || !cur || !durEl) return;
  let t = 0;
  let d = 0;
  if (vod) {
    // 手动单曲：真实时长优先（刚加载完 metadata 就有），拿不到退回上报估计值
    const total = audio.duration;
    d = isFinite(total) && total > 0 ? total : vod.dur;
    t = isFinite(audio.currentTime) ? audio.currentTime : 0;
  } else if (airProgress) {
    /* 直播：进度由服务端 air.startedAt 驱动 —— 全网同一首同一位置，
     * 所以这条进度条是**只读**的（wireVodSeek 里 isVod() 挡住拖动）。 */
    d = airProgress.dur;
    t = Math.max(0, (Date.now() - airProgress.startedAt) / 1000);
    if (d > 0 && t > d) t = d;
  }
  pct.style.width = (d > 0 ? Math.min(100, (t / d) * 100) : 0) + '%';
  cur.textContent = fmtTime(t);
  durEl.textContent = d > 0 ? fmtTime(d) : '--:--';
}

/* 点进度条跳转：jsdom 里 getBoundingClientRect 恒为 0，直接返回，
 * 不会让测试里的 seek 去除以 0 */
function wireVodSeek() {
  const track = $('vodTrack');
  if (!track) return;
  track.addEventListener('click', (e) => {
    if (!isVod()) return;
    const total = audio.duration;
    if (!isFinite(total) || total <= 0) return;
    const r = track.getBoundingClientRect();
    if (!r.width) return;
    const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    audio.currentTime = ratio * total;
    renderVodProgress();
  });
}

/* ---------------- 错误与自动重连 ---------------- */
/* 退避表：0.5~4.4 秒，5 次约 10 秒 —— 既有退避，又不把人吊着。
 * 5 次之后**不放弃**，转 8 秒长间隔无限重试（见函数末尾）。 */
const RETRY_DELAYS = [500, 900, 1600, 2700, 4400];
const RETRY_FOREVER_MS = 8000;

function handleStreamError() {
  if (!shouldPlay) return;
  if (retryTimer) return;   // 已有一趟重连在排队：error 事件与 play() 拒绝会**同时**
                            // 打进来，不挡住就会把 5 次配额在一瞬之间耗光
  const token = playToken;   // 记住发起时的代际，重连前若用户已切台/暂停就放弃

  /* 每次重连换一条线路：奇数次走隧道、偶数次回直连。直连被限速/被拦、
   * 隧道域名每天换，两条路轮流试才能自愈 —— 这是「不卡顿」的关键保险。 */
  if (!isVod()) streamFailover += 1;

  if (retries < 5) {
    retries += 1;
    setStatus('loading', '重连中 ' + retries + '/5 …');
    retryTimer = setTimeout(async () => {
      retryTimer = null;
      if (!shouldPlay || token !== playToken) return;
      const url = isVod() ? vod.url : liveUrl();
      const bust = url + (url.includes('?') ? '&' : '?') + 'r=' + Date.now();
      beginSwitch(700);
      await attach(bust, true);
      if (!shouldPlay || token !== playToken) return; // 等待期间被切台 → 放弃
      try {
        await audio.play();
      } catch (err) {
        if (token !== playToken) return;
        // 良性中断同样回到重连通道（内部有 shouldPlay + 排队去重兜底）
        handleStreamError();
        return;
      }
      /* 直播不再启动 ICY 曲目读取：流是服务端 ffmpeg 直出的裸 MP3，没有
       * ICY 元数据，曲目一律由 air 消息给。 */
    }, RETRY_DELAYS[retries - 1]);
    return;
  }

  /* 手动点播的单曲可能已经失效：5 次仍失败就如实停住，别无限耗着弹重连。
   * 直播相反 —— 见下面的分支，永不放弃。 */
  if (isVod()) {
    shouldPlay = false;
    retries = 0;
    updatePlayUI();
    setStatus('error', '点播连接失败 · 点按重试');
    toast('点播连接失败：可能是网络问题或音源已失效');
    return;
  }

  /* 5 次快速重连都没救回来：**直播不能停**。转长间隔继续试，服务器重启
   * 完 / 隧道重新建好就会自己接上。旧版在这儿把 shouldPlay 置 false 并停住，
   * 表现就是「断了再也没声，还得手动去点」。 */
  retries = 0;
  updatePlayUI();
  setStatus('error', '直播暂时不通 · 自动重试中');
  retryTimer = setTimeout(() => {
    retryTimer = null;
    if (!shouldPlay || token !== playToken) return;
    handleStreamError();
  }, RETRY_FOREVER_MS);
}

/* ---------------- 锁屏 / 蓝牙控制 ---------------- */
/* 当前曲目：APK 原生层直连直播流解析 ICY 元数据后回调（网页版无此桥接，自动跳过） */
let nowTitle = '';

function updateMediaSession() {
  if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
  const s = current();
  try {
    const artwork = [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ];
    // 锁屏显示「正在放的这首」：手动单曲优先，否则 air 里那首
    const now = vod || (airInfo && airInfo.title ? airInfo : null);
    navigator.mediaSession.metadata = new MediaMetadata(now ? {
      title: now.title,
      artist: now.artist || (now.from ? now.from + ' 点播' : '时光电台 DJ'),
      album: '时光电台' + (now.from
        ? ' · ' + now.from + '点的' + (now.to ? '，送给' + now.to : '')
        : ' · 直播中'),
      artwork: artwork,
    } : {
      title: nowTitle || s.name,
      artist: nowTitle ? s.name : s.desc,
      album: nowTitle ? '时光电台 · ' + s.name : '时光电台',
      artwork: artwork,
    });
    navigator.mediaSession.setActionHandler('play', () => { startStream(); });
    /* 直播没有暂停：把 pause 动作整个摘掉（而不是留个 no-op），
     * 这样锁屏/耳机上不会出现「有暂停键却按了没反应」的假象。 */
    try { navigator.mediaSession.setActionHandler('pause', null); } catch (_) { /* 忽略 */ }
    // 上一首/下一首：云开播不支持手动切歌
    navigator.mediaSession.setActionHandler('previoustrack', null);
    navigator.mediaSession.setActionHandler('nexttrack', null);
  } catch (_) {
    /* 部分浏览器不支持某个 action，忽略 */
  }
}

window.__onIcyTitle = function (title) {
  if (isVod()) return;   // 换进单曲后，原生 ICY 读取可能还有一条迟到的旧曲目回来，
                         // 不挡掉会把刚显示的点歌标题冲掉
  const t = String(title || '').trim();
  if (!t || t === nowTitle) return;
  nowTitle = t;
  const el = $('nowTitle');
  if (el) el.textContent = '♪ ' + t;
  if (window.AndroidIcy) {
    try { window.AndroidIcy.title(t); } catch (_) { /* 忽略 */ }
  }
  updateMediaSession();
};

/* 锁屏通知 / 蓝牙耳机的控制键 → 原生 MediaSession 回调进入这里。
 * v1.20 直播没有暂停：暂停一律忽略（音频照常播），播放 = 接上直播。 */
window.__svcResume = function () { startStream(); };
window.__svcPause = function () {
  /* 故意留空：直播不可暂停。若这里调 pause()，用户切歌/来电话一打断，
   * 电台就再也不出声了 —— 正是这次要根治的「间歇性」。 */
};

/* ---------------- 事件绑定 ---------------- */
if (playBtn) playBtn.addEventListener('click', togglePlay);   // 旧版 HTML 才有播放键
wireVodSeek();
// 直播接入条：正常连上时隐藏；露出来（自动播放被拦 / 断线待救）时点它接上
const airBarEl = $('airBar');
if (airBarEl) {
  airBarEl.addEventListener('click', () => {
    toast('正在接上直播…');
    startStream();
  });
}

volumeEl.addEventListener('input', () => {
  audio.volume = Number(volumeEl.value);
  safeSet('fm891.volume', String(audio.volume));
});

/* 卡死看门狗：缓冲超过 20 秒无进展 → 强制重连（治"断流卡住不报错"） */
let stallTimer = null;

function armStallWatchdog() {
  clearTimeout(stallTimer);
  const token = playToken;   // 切台/暂停后代际变化 → 旧看门狗即便没被撤也自动作废
  stallTimer = setTimeout(() => {
    if (!shouldPlay || token !== playToken) return;
    setStatus('loading', '重新连接…');
    handleStreamError();
  }, 20000);
}

function disarmStallWatchdog() {
  clearTimeout(stallTimer);
  stallTimer = null;
}

/* 曲目读取器让路：音频卡顿时断开第二路连接，把带宽全让给播放 */
function icyYield(yieldNow) {
  if (!window.AndroidIcy) return;
  try {
    window.AndroidIcy.yieldFeed(Boolean(yieldNow));
  } catch (_) { /* 忽略 */ }
}

/* 「锁屏被系统掐停」的自救定时器（v1.21.10）：熄屏时 WebView 偶尔会把
 * audio 直接按停 —— pause 事件不是用户动作，光刷成「缓冲中…」没人再拉它，
 * 锁屏就再也没声。1.5 秒还没自己起来就走重连通道接回。 */
let pauseRecover = null;

audio.addEventListener('playing', () => {
  retries = 0;
  clearTimeout(pauseRecover);
  pauseRecover = null;
  /* 这条线出声了 → 记住它，并把失败计数归零：下一次重连**先试刚成功的这条**，
   * 不要从计数残值里挑一条（直连好好的却被丢去有 8s 停顿的隧道，就是这么来的）。 */
  if (!isVod()) {
    streamFailover = 0;
    streamLastGoodTunnel = streamAttemptTunnel;
  }
  switchUntil = 0;        // 新源已出声 → 换源窗口结束，后续事件正常处理
  disarmStallWatchdog();
  setStatus('live', isVod() ? '播放中' : '直播中');
  if (isVod()) renderVodProgress();
  updatePlayUI();
  icyYield(false);
});

audio.addEventListener('pause', () => {
  // 换源时旧源补发的 pause：用配额识别并消耗，不改任何状态。
  // 用户主动暂停会在 pause() 里自己刷 UI，不依赖这条事件。
  if (consumeTeardownPause()) return;
  disarmStallWatchdog();
  updatePlayUI();
  if (shouldPlay) {
    setStatus('loading', '缓冲中…');
    clearTimeout(pauseRecover);
    pauseRecover = setTimeout(() => {
      pauseRecover = null;
      if (shouldPlay && audio.paused && !inSwitch()) {
        setStatus('loading', '接回直播…');
        handleStreamError();
      }
    }, 1500);
  } else {
    setStatus('', '已暂停');
  }
});

/* 回前台发现「该在播却没在播」（熄屏期间被系统停掉、重连定时器被节流）：
 * 立刻走重连通道接上，别等用户自己发现没声 —— 「锁屏还会停」的另一半。 */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (shouldPlay && audio.paused && !retryTimer && !inSwitch()) {
    setStatus('loading', '接回直播…');
    handleStreamError();
  }
});

audio.addEventListener('waiting', () => {
  if (shouldPlay) {
    setStatus('loading', '缓冲中…');
    armStallWatchdog();
    icyYield(true);
  }
});

audio.addEventListener('error', () => {
  if (inSwitch()) {
    // 换源窗口内的 error 多半是旧源残留；若新源其实也挂了，窗口一过再补一次判断，
    // 避免「静默卡在连接中」。
    setTimeout(() => {
      if (shouldPlay && audio.error) {
        disarmStallWatchdog();
        handleStreamError();
      }
    }, Math.max(0, switchUntil - Date.now()) + 60);
    return;
  }
  disarmStallWatchdog();
  handleStreamError();
});

audio.addEventListener('stalled', () => {
  if (shouldPlay) {
    setStatus('loading', '缓冲中…');
    armStallWatchdog();
    icyYield(true);
  }
});

/* ---------------- 单曲（VOD）专属事件 ----------------
 * 直播台不关心这三个：直播没有进度、不会播完。挂在监听区末尾，
 * 不改任何既有监听器，直播路径逐行不动。 */
audio.addEventListener('timeupdate', () => { if (isVod()) renderVodProgress(); });

audio.addEventListener('loadedmetadata', () => { if (isVod()) renderVodProgress(); });

audio.addEventListener('ended', () => {
  /* v1.20：直播流正常情况下永远播不完。真触发了 ended = 服务端把连接
   * 关了（重启 / 换隧道域名 / 流被代理掐断）—— 必须自动接上，否则就停在
   * 没声的状态。这就是「断流自动重连」的最后一环（error 走 handleStreamError，
   * 干净的 EOF 只会走到这里）。 */
  if (!isVod()) {
    if (shouldPlay) {
      setStatus('loading', '重新接通直播…');
      handleStreamError();
    }
    return;
  }

  // 手动单曲：维持「播完了」语义。
  // 不清 vod：还留在单曲模式，按播放键可以从头再放一遍。
  // 必须把 shouldPlay 置 false —— 否则再点一下 togglePlay 会走成重连，
  // 用户点了播放反而不是他要的。
  shouldPlay = false;
  retries = 0;
  clearTimeout(retryTimer);
  retryTimer = null;
  disarmStallWatchdog();
  updatePlayUI();
  setStatus('', '播完了 · 点「接上」再听一遍');
  renderVodProgress();
});

/* ---------------- 官方在线人数（蜻蜓FM 官方接口 rapi.qingting.fm） ----------------
 * 产品要求：在线人数接入「官方的数据」。徽章数字改用蜻蜓FM 官方
 * channels 接口返回的 audience_count（该频道实时收听人数），不再只数
 * 连上公共 broker 的自己人；拿不到官方数据时才降级回 MQTT 在线感知。
 *  - 频道 id 直接从线路地址取：https://lhttp.qtfm.cn/live/<id>/64k.mp3
 *  - 该接口对 Origin 完全开放（含 file:// 的 Origin: null 也会被回显），
 *    所以 WebView 的 file:///android_asset 源也能直接跨域取到
 *  - 5 分钟刷新（实测 audience_count 按节目档期更新，15 分钟内不变，
 *    60 秒空刷纯属浪费）；换台先把徽章置「加载中…」，8 秒超时 + 代际校验，
 *    保证上一台的迟到响应不会把数字写到新台上
 */
const AUDIENCE_API = 'https://rapi.qingting.fm/channels/';
const AUDIENCE_TTL = 300000;
let officialCount = null;    // 官方 audience_count（数字）
let officialState = 'idle';  // idle | loading | ok | fail
let audienceToken = 0;       // 代际：换台即作废在途请求
let audienceTimer = null;
let pillRender = null;       // 由下方徽章渲染模块注册，两个数据源合起来只 render 一次

function qtChannelId(url) {
  const m = /\/live\/(\d+)\//.exec(url || '');
  return m ? m[1] : '';
}

function fmtAudience(n) {
  if (typeof n !== 'number' || !isFinite(n) || n < 0) return '–';
  if (n < 10000) return String(Math.round(n));
  return (n / 10000).toFixed(1) + '万';
}

function renderPill() {
  /* 页面可能正在卸载（关窗/PWA 回收）→ 渲染整块容错，绝不让晚到的响应抛出去 */
  try {
    if (typeof pillRender === 'function') { pillRender(); return; }
    /* 徽章渲染模块未就绪（mqtt.min.js 加载失败等）→ 自己把官方数据画出来，
     * 保证在线人数不因为兜底模块挂了就整块消失 */
    const p = $('onlinePill');
    const el = $('onlineCount');
    const src = $('onlineSrc');
    if (!p || !el) return;
    if (src) src.hidden = officialState !== 'ok';
    if (officialState === 'ok') {
      el.textContent = fmtAudience(officialCount);
      p.title = '在线人数来自蜻蜓FM 官方接口（该频道实时收听人数）';
    } else if (officialState === 'loading') {
      el.textContent = '…';
    } else {
      el.textContent = '–';
      p.classList.add('dim');
    }
    p.hidden = false;
  } catch (_) { /* 文档不可用，忽略 */ }
}

async function refreshAudience() {
  /* 电台台单已下架：不再拉取蜻蜓官方频道人数 —— 在线徽章交给
   * presence 数据源（本机感知的真实听友数）。下面的旧逻辑原样留档。 */
  officialState = 'fail';
  officialCount = null;
  renderPill();
  return;
  const st = current();
  const cid = st ? qtChannelId(st.url) : '';
  if (!cid) { officialState = 'fail'; officialCount = null; renderPill(); return; }

  const token = ++audienceToken;
  if (officialState !== 'ok') { officialState = 'loading'; renderPill(); }

  try {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const to = ctrl ? setTimeout(() => { try { ctrl.abort(); } catch (_) { /* 忽略 */ } }, 8000) : null;
    const res = await fetch(AUDIENCE_API + cid, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: ctrl ? ctrl.signal : undefined,
    });
    if (to) clearTimeout(to);
    if (!res || !res.ok) throw new Error('http ' + (res ? res.status : '?'));
    const j = await res.json();
    const n = j && j.Data ? j.Data.audience_count : null;
    if (typeof n !== 'number') throw new Error('no audience_count');
    if (token !== audienceToken) return;   // 等待期间已换台 → 丢弃旧台的响应
    officialCount = n;
    officialState = 'ok';
    renderPill();
  } catch (_) {
    if (token !== audienceToken) return;
    officialCount = null;
    officialState = 'fail';
    renderPill();
  }
}

function scheduleAudience() {
  clearTimeout(audienceTimer);
  audienceTimer = setTimeout(audienceTick, AUDIENCE_TTL);
}

function audienceTick() {
  // 切到后台不空刷，回到前台时由 visibilitychange 立刻补一次
  if (document.visibilityState !== 'hidden') refreshAudience();
  scheduleAudience();
}

function onStationChanged() {
  officialCount = null;      // 换台必须清空，否则会把上一台的官方人数显示在新台上
  officialState = 'loading';
  refreshAudience();
  scheduleAudience();
}

try {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshAudience();
  });
} catch (_) { /* 忽略 */ }

/* ---------------- 启动 ---------------- */
if (cat !== 'all' && visibleIdx().indexOf(index) < 0) {
  // 记住的分类里看不到当前在听的台（换过分类后又升级等）→ 回「全部」保证选中项可见
  cat = 'all';
  safeSet('fm891.cat', cat);
}
renderCats();          // 台单已下架：元素不存在时直接返回
renderStations();      // 同上，保留调用不报错
updateNowPlaying();    // 品牌待机文案：时光点播台
updatePlayUI();
/* v1.20：打开就接上直播（收音机拧开就有声）。旧版要等首条 air 消息来才
 * 自动加入 —— 现在音频是服务器连续推的流，连上就在播，air 只负责改界面。
 * 首连走直连地址；连不上由 handleStreamError 轮换到隧道重试。 */
startStream();
// 不再拉取蜻蜓官方频道人数（onStationChanged 已随台单停用）
// 1 秒一跳：直播进度按 air.startedAt 自己走；开播条跟着「连没连上」露/藏
setInterval(() => {
  renderAirBar();
  if (airProgress && !vod) renderVodProgress();
}, 1000);

/* ---------------- Service Worker（网页版自动热更新） ---------------- */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* 部分环境（如 http 局域网访问）不支持 SW，忽略即可 */
    });
  });

  // 新版 SW 接管后自动刷新拿新资源；正在听歌时推迟到暂停再刷，避免断播。
  // 注意：切台瞬间 audio 短暂为 paused 是常态，绝不能据此 reload —— 旧版
  // 「audio.paused 就刷」会在切台中途整页重载，表现就是「一切台就断流」。
  let hadController = !!navigator.serviceWorker.controller;
  let swUpdatePending = false;
  function doSwReload() {
    if (window.__swReloaded) return;
    window.__swReloaded = true;
    location.reload();
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return; } // 首次安装的 claim 不触发
    if (!shouldPlay) doSwReload();
    else swUpdatePending = true;
  });
  audio.addEventListener('pause', () => {
    if (swUpdatePending && !shouldPlay && !window.__swReloaded) setTimeout(doSwReload, 400);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    navigator.serviceWorker.getRegistration()
      .then((r) => r && r.update())
      .catch(() => { /* 忽略 */ });
  });
}

/* ---------------- 在线更新（GitHub Release） ---------------- */
window.__toast = toast; // 供原生层回传提示（下载中 / 安装结果）

const UPDATE_REPO = '846515182/TimeRadio'; // 公开仓库，App 内免登录访问
const UPDATE_API = 'https://api.github.com/repos/' + UPDATE_REPO + '/releases/latest';

function parseVer(v) {
  const parts = String(v || '').replace(/^v/i, '').split('.');
  return [parseInt(parts[0], 10) || 0, parseInt(parts[1], 10) || 0, parseInt(parts[2], 10) || 0];
}

function isNewer(remote, local) {
  const a = parseVer(remote);
  const b = parseVer(local);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}

function currentVersion() {
  try {
    if (window.AndroidIcy && window.AndroidIcy.appVersion) {
      const v = window.AndroidIcy.appVersion();
      if (v) return v;
    }
  } catch (_) { /* 忽略 */ }
  return '1.21.20'; // 网页版：与 manifest versionName 同步维护
}

let updateUrl = '';

async function checkUpdate(silent) {
  if (!silent) toast('正在检查更新…');
  try {
    const res = await fetch(UPDATE_API, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rel = await res.json();
    const remote = String(rel.tag_name || '');
    const cur = currentVersion();
    if (!remote || !isNewer(remote, cur)) {
      if (!silent) toast('已是最新版本 v' + cur + ' 🎉');
      return;
    }

    let apkUrl = '';
    try {
      const a = (rel.assets || []).find((x) =>
        /\.apk$/i.test(x.name || x.browser_download_url || ''));
      if (a) apkUrl = a.browser_download_url;
    } catch (_) { /* 忽略 */ }
    updateUrl = apkUrl || ('https://github.com/' + UPDATE_REPO + '/releases/latest');

    const mask = $('updateMask');
    if (mask) {
      $('updVer').textContent = 'v' + cur + ' → ' + remote;
      $('updBody').textContent = String(rel.body || rel.name || '').slice(0, 300);
      setUpdateState('idle');
      mask.hidden = false;
    } else if (!silent) {
      toast('发现新版本 ' + remote);
    }
  } catch (e) {
    if (!silent) toast('检查更新失败：' + (e && e.message ? e.message : '网络问题'));
  }
}

/* 更新进度：原生下载器 / 安装回调 */
function setUpdateState(mode, text) {
  const prog = $('updProgress');
  if (prog) prog.hidden = mode === 'idle';
  const go = $('updGo');
  const later = $('updLater');
  if (go) go.disabled = mode !== 'idle';
  if (later) later.disabled = mode !== 'idle';
  if (mode === 'downloading') {
    const bar = $('updBar');
    if (bar) bar.style.width = '0%';
    const pct = $('updPct');
    if (pct) pct.textContent = text || '准备下载…';
  }
}

window.__onUpdateProgress = function (p) {
  const prog = $('updProgress');
  if (!prog || prog.hidden) return;
  const n = Math.max(0, Math.min(100, Math.round(Number(p) || 0)));
  const bar = $('updBar');
  if (bar) bar.style.width = n + '%';
  const pct = $('updPct');
  if (pct) pct.textContent = '下载中 ' + n + '%';
};

window.__onUpdateState = function (state, msg) {
  const prog = $('updProgress');
  const bar = $('updBar');
  const pct = $('updPct');
  const mask = $('updateMask');
  if (state === 'ready') {
    if (bar) bar.style.width = '100%';
    if (pct) pct.textContent = msg || '下载完成，等待安装…';
    // 系统安装界面已盖到前台，几秒后自动收起弹窗
    setTimeout(() => { setUpdateState('idle'); if (mask) mask.hidden = true; }, 3500);
  } else if (state === 'success') {
    setUpdateState('idle');
    if (mask) mask.hidden = true;
    toast('新版本安装成功，重启应用后生效');
  } else if (state === 'failed' || state === 'aborted') {
    setUpdateState('idle');
    if (prog) prog.hidden = true;
    toast(msg || '更新未完成，可点“立即更新”重试');
  }
};

function wireUpdate() {
  const mask = $('updateMask');
  if (!mask) return;
  const label = $('verLabel');
  if (label) label.textContent = 'v' + currentVersion();

  $('updLater').addEventListener('click', () => {
    if ($('updLater').disabled) return;
    mask.hidden = true;
  });
  $('updGo').addEventListener('click', () => {
    if (!window.AndroidIcy || !window.AndroidIcy.applyUpdate) {
      location.href = updateUrl; // 网页版：直接跳转下载
      return;
    }
    setUpdateState('downloading', '准备下载…');
    try { window.AndroidIcy.applyUpdate(updateUrl); }
    catch (_) { setUpdateState('idle'); toast('调起更新失败，请稍后重试'); }
  });
  const btn = $('checkUpdateBtn');
  if (btn) btn.addEventListener('click', () => checkUpdate(false));

  // APK 内：启动后静默检查一次
  if (window.AndroidIcy) setTimeout(() => checkUpdate(true), 6000);
}
wireUpdate();

/* ---------------- 徽章渲染 + 实时在线人数（官方数据优先，MQTT 感知兜底） ----------------
 * 数据源一（优先）：蜻蜓FM 官方 channels 接口的 audience_count，见上方
 *   AUDIENCE_API 模块。取到就显示，并点亮徽章上的「官方」角标。
 * 数据源二（兜底）：公共 MQTT 在线感知，零服务器 ——
 * 原理：每个客户端用稳定 clientId 连上 broker，向 fm891-radio/online/<cid>
 * 发布 retain 心跳；全体订阅 fm891-radio/online/#，收到的 retained 条目数
 * 即当前在线人数。断线时 broker 用遗嘱（LWT，空载荷）自动删除自己的条目，
 * 对端收到空载荷转发 → 立刻从计数中移除。
 * 时间戳一律用本地接收时间（peer 时钟不可信）；120 秒未见心跳视为过期。
 * 主用 EMQX（国内快），失败降级 Mosquitto 公共 WSS，一轮全败 45 秒后重试。
 * 徽章状态自见即显：… 加载中 / 数字在线 / – 线路暂不可用（绝不整体隐藏）。
 * 关键防护：所有事件回调校验 client !== c，杜绝旧连接迟到事件误杀新连接
 *（v1.10 的 offline+close 双事件竞态导致切换后彻底静默，此为根因修复）。
 */
(function onlinePresence() {
  try {
    if (typeof mqtt === 'undefined') return;

    const NS = 'fm891-radio/online';
    const HEARTBEAT = 30000;
    const STALE = 120000;
    // 排序即优先级：mosquitto 放第一 —— 实测它在被 fake-IP 污染的网络里
    // 仍能建立 TCP，而 emqx 一旦被本地 DNS 漏掉就是「秒拒连」，等满 9 秒才切线太亏。
    // **必须与 server.py 的 BROKERS 完全同集**（服务器是 emqx+mosquitto 两条）：
    // 少一条服务器不在的线路 —— 客户端连上它会显示「已上线」，却永远收不到
    // 服务器发的队列/进度，比直接连不上还难查。
    const BROKERS = [
      'wss://test.mosquitto.org:8081/mqtt',
      'wss://broker.emqx.io:8084/mqtt',
    ];

    let cid = '';
    try {
      cid = localStorage.getItem('fm891-cid') || '';
      if (!cid) {
        cid = 'fm891-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem('fm891-cid', cid);
      }
    } catch (_) {
      cid = 'fm891-' + Math.random().toString(36).slice(2, 12);
    }

    const myTopic = NS + '/' + cid;
    const peers = {};
    const pill = $('onlinePill');
    const countEl = $('onlineCount');
    const srcEl = $('onlineSrc');   // 启动时取一次：晚到的渲染不再碰 document（关窗后它已不可用）
    let client = null;
    let brokerIdx = 0;
    let lastSwitchAt = 0;   // 换线冷却：两条线路同时秒拒时，别把 CPU 烧在建连上
    let gotConnect = false;
    let switching = false;
    let attempt = 0;
    let failTimer = null;
    let state = 'connecting'; // connecting | online | failed

    /* v1.21.12：点歌台头部要显示「N 人一起点歌」—— 协同这件事得让人看得见，
     * 否则一个人孤零零地对着输入框，不知道还有没有别人在点。数据源就是本模块
     * 的 presence 感知（连着同一个点歌台的客户端，含本机）；没连上返回 0，
     * 由调用方显示「正在数人…」，绝不显示 0 人。 */
    window.__fmPresence = () => {
      if (state !== 'online') return 0;
      const now = Date.now();
      let n = 1;                       // 本机也在里面
      Object.keys(peers).forEach((k) => { if (now - peers[k] <= STALE) n++; });
      return n;
    };

    function render() {
      if (!pill || !countEl) return;
      const src = srcEl;

      /* ① 官方数据：蜻蜓FM 官方 audience_count，带「官方」角标 */
      if (officialState === 'ok') {
        countEl.textContent = fmtAudience(officialCount);
        if (src) src.hidden = false;
        pill.hidden = false;
        pill.classList.remove('dim');
        pill.title = '在线人数来自蜻蜓FM 官方接口（该频道实时收听人数）';
        return;
      }
      if (src) src.hidden = true;
      pill.removeAttribute('title');

      /* ② 正在取官方数据：先显示加载态，绝不拿旧台的数字或本机计数充数 */
      if (officialState === 'loading') {
        countEl.textContent = '…';
        pill.hidden = false;
        pill.classList.remove('dim');
        return;
      }

      /* ③ 官方数据取不到 → 降级回本机 MQTT 在线感知 */
      if (state === 'online') {
        const now = Date.now();
        let n = 0;
        Object.keys(peers).forEach((k) => {
          if (now - peers[k] <= STALE) n++;
        });
        countEl.textContent = String(n);
        if (officialState === 'fail') pill.title = '在线听友数（本机实时感知）';
      } else if (state === 'connecting') {
        countEl.textContent = '…';
      } else {
        countEl.textContent = '–';
      }
      pill.hidden = false;
      try { pill.classList.toggle('dim', state === 'failed'); } catch (_) { /* 忽略 */ }
    }
    pillRender = render;   // 官方数据模块换台后也走同一次渲染，两个源不会互相覆盖

    function publishPresence() {
      peers[myTopic] = Date.now();
      if (client && gotConnect) {
        try {
          client.publish(myTopic, JSON.stringify({ t: peers[myTopic] }), { retain: true, qos: 0 });
        } catch (_) { /* 忽略 */ }
      }
      render();
    }

    function clearFailTimer() {
      if (failTimer) { clearTimeout(failTimer); failTimer = null; }
    }

    function switchBroker() {
      if (switching) return;
      // 换线冷却 700ms：错误风暴下（多条线路一起拒）不至于疯狂重建连接
      const _now = Date.now();
      if (_now - lastSwitchAt < 700) return;
      lastSwitchAt = _now;
      switching = true;
      clearFailTimer();
      const prev = client;
      client = null;
      gotConnect = false;
      attempt = 0;
      try { if (prev) prev.end(true); } catch (_) { /* 忽略 */ }
      const next = brokerIdx + 1;
      if (next >= BROKERS.length) {
        // 本轮线路全部失败 → 显示 –，45 秒后从头轮换重试
        state = 'failed';
        render();
        setTimeout(() => {
          brokerIdx = 0;
          switching = false;
          state = 'connecting';
          render();
          connectAt();
        }, 45000);
      } else {
        brokerIdx = next;
        connectAt();
      }
    }

    function connectAt() {
      let c;
      try {
        c = mqtt.connect(BROKERS[brokerIdx], {
          clientId: cid,
          keepalive: 30,
          reconnectPeriod: 5000,
          connectTimeout: 8000,
          clean: true,
          will: { topic: myTopic, payload: '', retain: true, qos: 0 },
        });
      } catch (_) {
        switchBroker();
        return;
      }
      client = c;
      switching = false;
      render();

      // 静默黑洞兜底：9 秒连不上换线路（身份校验防误伤新连接）
      failTimer = setTimeout(() => {
        if (client === c && !gotConnect) switchBroker();
      }, 9000);

      c.on('connect', () => {
        if (client !== c) return; // 过期连接，忽略
        clearFailTimer();
        gotConnect = true;
        attempt = 0;
        state = 'online';
        try { c.subscribe(NS + '/#', { qos: 0 }); } catch (_) { /* 忽略 */ }
        publishPresence();
      });
      c.on('message', (topic, payload, packet) => {
        if (client !== c || topic === myTopic) return;
        try {
          const s = payload ? payload.toString() : '';
          if (!s) { delete peers[topic]; render(); return; }   // 空载荷 = 对方已下线
          let t = Date.now();
          if (packet && packet.retain) {
            // retained 回放：信远端时间戳 → 历史残留条目按时过期，不会永续计数
            try {
              const o = JSON.parse(s);
              if (o && typeof o.t === 'number') t = o.t;
            } catch (_) { /* 解析失败则按收到处理 */ }
          }
          // 实时心跳用本地时间（发送方时钟不可信时也不误伤）
          peers[topic] = t;
          render();
        } catch (_) { /* 忽略 */ }
      });
      c.on('close', () => {
        if (client !== c) return; // ★ 根因修复：旧连接迟到事件不得触发光换
        if (gotConnect) { state = 'connecting'; render(); } // 自动重连中
        else switchBroker();
      });
      c.on('offline', () => {
        if (client !== c) return; // ★ 同上（offline 与 close 常连发）
        if (gotConnect) { state = 'connecting'; render(); }
        else switchBroker();
      });
      c.on('reconnect', () => {
        if (client !== c) return;
        attempt++;
        if (attempt >= 6) switchBroker(); // 同一线路反复失败 → 轮换
      });
      c.on('error', () => {
        // 秒切：压根没建立起来的连接（DNS 被 fake-IP 污染 = 秒拒/秒超时）
        // 没必要等满 9 秒黑洞超时才换线 —— 那 9 秒里用户看到的是「点歌台线路不稳」。
        // 连上过（gotConnect）才交给 reconnect 自己恢复，不抢它的重试。
        if (client !== c || gotConnect) return;
        switchBroker();
      });
    }

    // 启动即显示徽章（连接中 …），状态由 render 驱动，永不整体隐藏
    render();
    connectAt();
    setInterval(publishPresence, HEARTBEAT);
    setInterval(render, 10000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) publishPresence();
    });
  } catch (_) { /* 可选功能，失败静默 */ }
})();

/* ---------------- 对外接口：在线点歌模块（request.js） ----------------
 * 只暴露「读状态 + 走既有通道」，刻意**不**把 audio / playToken / 重连体系
 * 交出去。点歌命中后必须走 selectStation() 这一个入口：它会顺带做台单重绘、
 * nowPlaying 更新、原生桥同步、官方在线人数刷新、以及 play() 的代际校验。
 * 让点歌模块自己去碰 audio，就等于绕开 v1.15 刚修完的那套换源防护。
 * （所有成员都是箭头函数，读的是届时的最新值，不存在启动顺序问题。） */
window.__radio = {
  /* 迁移后的完整台单 —— 不是原始 STATIONS，legacy 台和被下架台的替换都在里面 */
  stations: () => playlist,
  index: () => index,
  select: (i) => selectStation(i, true),
  toast: (msg) => toast(msg),
  setStatus: (kind, text) => setStatus(kind, text),
  /* 蜻蜓官方接口：点歌模块拉 nowplaying 复用同一个地址，不要另开一份常量 */
  api: AUDIENCE_API,
  /* 从直播 url 解析蜻蜓频道 id，解析不出返回空串 */
  qtId: (url) => qtChannelId(url),
  /* 播一首「已经就绪」的单曲：进 VOD 模式后走的是同一套 play()，
   * 代际/重连/换源防护一条不绕。返回 Promise，失败不抛给调用方。 */
  playVod: (info) => playVod(info),
  exitVod: () => exitVod(),
  isVod: () => isVod(),
  /* 云同步开播：request.js 校验过 schema 的 air 消息转进来，app 决定
   * 是否自动跟播/露出「一起听」条 */
  onAir: (body) => onAir(body),
  airInfo: () => airInfo,
  /* 「是否正在跟播」的对外读数：v1.20 没有跟播开关了，
   * 只要直播流连着就算在听。 */
  following: () => shouldPlay,
  /* 云端音源地址的 origin：点歌台用它拉 /catalog.json（曲库联想 + 常听速点） */
  origin: () => {
    try {
      const u = (vod && vod.url) || (airInfo && airInfo.url) || '';
      return u ? new URL(u).origin : '';
    } catch (_) { return ''; }
  },
};
