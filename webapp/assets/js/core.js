/* =========================================================
 * 云栖山景区预约购票系统 · 核心库
 * 数据层（localStorage 持久化）+ 通用组件 + 工具函数
 * 无第三方依赖，可直接在浏览器（含 file://）打开
 * ========================================================= */
window.CORE = (function () {
  'use strict';

  /* ---------------- 基础工具 ---------------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var pad = function (n) { return n < 10 ? '0' + n : '' + n; };

  function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function dstr(d, off) {
    var t = new Date(d.getTime());
    if (off) t.setDate(t.getDate() + off);
    return t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate());
  }
  function parseD(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  /** 距目标日期天数（今天=0） */
  function dayGap(dateStr) {
    return Math.round((parseD(dateStr) - today()) / 86400000);
  }
  var WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  function weekOf(dateStr) { return WEEK[parseD(dateStr).getDay()]; }
  function dateLabel(dateStr) {
    var g = dayGap(dateStr);
    if (g === 0) return '今天';
    if (g === 1) return '明天';
    if (g === 2) return '后天';
    return weekOf(dateStr);
  }
  function money(n) { return '¥' + (Number(n) || 0).toFixed(2); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function qs(name) {
    var m = location.search.match(new RegExp('[?&]' + name + '=([^&]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }
  function maskId(id) {
    id = String(id || '');
    return id.length >= 10 ? id.substr(0, 6) + '********' + id.substr(-4) : id;
  }
  function maskName(n) {
    n = String(n || '');
    return n.length >= 2 ? n[0] + '*'.repeat(n.length - 1) : n;
  }
  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function fmtTime(iso) {
    if (!iso) return '--';
    var d = new Date(iso);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function fmtDateTime(iso) {
    if (!iso) return '--';
    var d = new Date(iso);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  /* ---------------- 存储 ---------------- */
  var KEY = 'sab_db_v1';
  var UKEY = { visitor: 'sab_visitor', admin: 'sab_admin', checker: 'sab_checker' };
  var _mem = {};
  function ls() { try { return window.localStorage; } catch (e) { return null; } }
  function read(k, def) {
    var s;
    try { s = ls() ? ls().getItem(k) : _mem[k]; } catch (e) { s = _mem[k]; }
    if (s == null) return def;
    try { return JSON.parse(s); } catch (e) { return def; }
  }
  function write(k, v) {
    var s = JSON.stringify(v);
    _mem[k] = s;
    try { if (ls()) ls().setItem(k, s); } catch (e) { }
  }

  /* ---------------- 种子数据 ---------------- */
  var SCENIC = {
    name: '云栖山国家森林公园',
    shortName: '云栖山',
    level: '国家 4A 级旅游景区',
    city: '浙江 · 杭州',
    address: '杭州市西湖区云栖路 88 号',
    phone: '0571-8888 6688',
    open: '08:00 - 18:00',
    area: '12.6 平方公里',
    slogan: '城市近旁的天然氧吧，四季皆景',
    desc: '云栖山国家森林公园地处杭州市西南郊，主峰海拔 682 米，森林覆盖率达 96.4%。园内古木参天、溪涧纵横，四季景色各异：春赏山花、夏避酷暑、秋观红叶、冬看雾凇。景区内保存有始建于明代的云栖古径与观音禅院，是集自然观光、人文古迹、科普研学、休闲度假于一体的综合性山地景区。',
    tips: [
      '景区实行实名制分时段预约，请携带本人身份证原件入园',
      '每日最大承载量 8000 人次，达到上限将启动限流',
      '山区天气多变，建议携带雨具与防滑登山鞋',
      '园区内禁止明火、禁止携带宠物（导盲犬除外）'
    ]
  };

  var TIMES = ['08:00-10:00', '10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00'];

  function seed() {
    var t = today();
    var tickets = [
      {
        id: 't1', name: '成人票', cat: '全价票', price: 98, tag: '热销', hot: 1, status: 1,
        desc: '适用于 18 周岁（含）至 60 周岁（不含）游客', stock: 9999, limit: 5,
        times: TIMES.slice(), need: '身份证原件'
      },
      {
        id: 't2', name: '学生票', cat: '优惠票', price: 49, tag: '', hot: 0, status: 1,
        desc: '全日制大中小学生凭有效学生证购买', stock: 600, limit: 2,
        times: TIMES.slice(), need: '身份证 + 学生证'
      },
      {
        id: 't3', name: '亲子套票（1 大 1 小）', cat: '套票', price: 128, tag: '推荐', hot: 1, status: 1,
        desc: '含 1 名成人 + 1 名 1.2m 以下儿童，赠观光车车票', stock: 300, limit: 2,
        times: TIMES.slice(), need: '身份证原件'
      },
      {
        id: 't4', name: '长者 / 儿童票', cat: '优惠票', price: 30, tag: '', hot: 0, status: 1,
        desc: '60 周岁以上长者或身高 1.2-1.4m 儿童', stock: 400, limit: 2,
        times: TIMES.slice(), need: '身份证 / 户口本'
      },
      {
        id: 't5', name: '双人畅游套票', cat: '套票', price: 188, tag: '含观光车', hot: 1, status: 1,
        desc: '2 名成人同行，含景区观光车往返与导览手册', stock: 200, limit: 1,
        times: TIMES.slice(), need: '身份证原件'
      },
      {
        id: 't6', name: '年卡 · 无限次', cat: '年卡', price: 298, tag: '已下架', hot: 0, status: 0,
        desc: '全年不限次入园（法定节假日除外），需人脸录入', stock: 100, limit: 1,
        times: ['全天'], need: '身份证 + 人脸录入'
      }
    ];

    var capTotal = [3200, 4200, 4200, 3600, 5000, 6000, 6000];
    var capUsed = [1860, 3120, 2760, 1480, 2100, 1560, 980];
    var inventory = [];
    for (var i = 0; i < 7; i++) {
      inventory.push({ date: dstr(t, i), total: capTotal[i], used: capUsed[i] });
    }

    var od = [
      ['成人票', 0, '08:00-10:00', 2, 98, 'booked', [['张伟', '330106199203154217'], ['李娜', '330106199405203628']], '13812345678'],
      ['亲子套票（1 大 1 小）', 0, '10:00-12:00', 1, 128, 'verified', [['王强', '330106198801127755'], ['王小宝', '33010620150608331X']], '13912345678'],
      ['双人畅游套票', 1, '08:00-10:00', 1, 188, 'booked', [['陈静', '330106199507194426'], ['刘洋', '330106199306253317']], '13712345678'],
      ['学生票', 1, '12:00-14:00', 2, 49, 'pending', [['赵敏', '330106200203091245'], ['孙浩', '330106200111308213']], '13612345678'],
      ['成人票', 2, '16:00-18:00', 3, 98, 'booked', [['周涛', '330106198510206613'], ['吴芳', '330106199009123344'], ['郑凯', '330106199712054415']], '13512345678'],
      ['长者 / 儿童票', 0, '14:00-16:00', 2, 30, 'verified', [['李桂英', '330106195204183325'], ['马秀兰', '330106195511204426']], '13412345678'],
      ['成人票', 0, '10:00-12:00', 2, 98, 'verified', [['黄磊', '330106199311156617'], ['林巧', '330106199608297724']], '13312345678'],
      ['成人票', -1, '12:00-14:00', 1, 98, 'verified', [['徐鹏', '330106198902231138']], '13212345678'],
      ['亲子套票（1 大 1 小）', -1, '08:00-10:00', 1, 128, 'verified', [['何丽', '330106199109304428'], ['何小满', '330106201703154417']], '13112345678'],
      ['成人票', 3, '08:00-10:00', 2, 98, 'cancelled', [['罗成', '330106198706114415'], ['高圆', '330106199404062226']], '13012345678'],
      ['学生票', -2, '14:00-16:00', 2, 49, 'verified', [['谢宇', '330106200109082213'], ['邓萌', '330106200205173342']], '15912345678'],
      ['成人票', -2, '10:00-12:00', 4, 98, 'verified', [['曹阳', '330106198303056611'], ['彭丹', '330106198812094427'], ['袁华', '330106199205117713'], ['邹凯', '330106199610238814']], '15812345678']
    ];
    var orders = od.map(function (o, i) {
      var d = dstr(t, o[1]);
      return {
        no: 'YQ' + d.replace(/-/g, '') + pad(i + 1),
        scenic: SCENIC.name,
        ticketId: '',
        ticket: o[0],
        date: d,
        time: o[2],
        qty: o[3],
        price: o[4],
        amount: o[3] * o[4],
        status: o[5],
        visitors: o[6].map(function (v) { return { name: v[0], idcard: v[1] }; }),
        contact: { name: o[6][0][0], phone: o[7] },
        createdAt: new Date(Date.now() - (i * 5 + 1) * 3600000).toISOString(),
        paidAt: o[5] === 'pending' ? null : new Date(Date.now() - (i * 5) * 3600000).toISOString(),
        verifiedAt: o[5] === 'verified' ? new Date(Date.now() - (i * 4) * 3600000).toISOString() : null,
        verifier: o[5] === 'verified' ? '张检票' : '',
        gate: o[5] === 'verified' ? (i % 2 ? '北门' : '南门') : ''
      };
    });

    var spots = [
      {
        id: 's1', name: '云栖古径', cat: '人文古迹', x: 14, y: 60, k: 0, hot: 1,
        desc: '始建于明代万历年间，全长 1.8 公里的青石板古道。古径两侧古木参天，树龄多在二百年以上，沿途可见摩崖石刻七处。',
        audio: '各位游客您好，您现在所在的位置是云栖古径。这条古道始建于明代万历年间，全长一点八公里，是昔日香客前往山顶观音禅院的必经之路。脚下的青石板已被岁月磨得温润光滑，两侧的古树遮天蔽日，盛夏时节这里比市区低五到六摄氏度，是名副其实的天然氧吧。',
        tips: '雨后石板湿滑，建议穿防滑鞋；古道全程步行约 25 分钟。',
        duration: '约 25 分钟', open: '07:30 - 18:00'
      },
      {
        id: 's2', name: '飞云瀑布', cat: '自然景观', x: 30, y: 34, k: 1, hot: 1,
        desc: '落差 62 米的三叠瀑布，雨季水声如雷、气势磅礴，旱季则如银链垂空。瀑布下方形成深潭，常年水温 14℃。',
        audio: '前方传来阵阵水声，飞云瀑布到了。瀑布落差六十二米，分三级跌落，雨季时水量充沛，声如奔雷；枯水期则如一缕银链悬于崖壁。潭边负氧离子浓度每立方厘米高达三万个，请您在此深呼吸，感受一下山林的清新。',
        tips: '观景台地面湿滑，请勿翻越护栏下水。',
        duration: '约 20 分钟', open: '08:00 - 17:30'
      },
      {
        id: 's3', name: '望岳台', cat: '观景平台', x: 52, y: 18, k: 2, hot: 1,
        desc: '海拔 682 米的主峰观景台，可俯瞰整座城市与钱塘江。日出与云海的最佳观赏点。',
        audio: '欢迎登上海拔六百八十二米的望岳台。这里是云栖山的最高点，天气晴好时可以远眺钱塘江与城市天际线。清晨五点半到六点半之间，常能看到云海翻涌的奇观，许多摄影爱好者专程为此而来。',
        tips: '山顶风大温差明显，建议携带外套。',
        duration: '约 30 分钟', open: '全天'
      },
      {
        id: 's4', name: '竹海听风', cat: '自然景观', x: 38, y: 52, k: 3, hot: 0,
        desc: '占地 300 余亩的毛竹林，竹径通幽，风过如涛。设有竹林茶室与科普解说牌。',
        audio: '现在您步入的是三百亩毛竹林。风吹竹叶，沙沙作响，古人称之为竹涛。竹子的生长速度极快，旺季一昼夜可以长高八十厘米。竹林深处设有茶室，您可以坐下来，用山泉水泡一壶本地的云雾茶。',
        tips: '请勿攀折竹笋，竹林内禁止吸烟。',
        duration: '约 20 分钟', open: '08:00 - 18:00'
      },
      {
        id: 's5', name: '镜湖泛舟', cat: '游乐项目', x: 60, y: 46, k: 4, hot: 1,
        desc: '水面 4.6 万平方米的高山湖泊，提供脚踏船与电动游船。湖心亭可远望山影。',
        audio: '眼前这汪碧水就是镜湖，因水面平静如镜而得名。您可以选择脚踏船或电动游船，环湖一周大约二十分钟。秋季湖畔的红枫倒映水中，是景区最受欢迎的拍照点之一。',
        tips: '游船项目 60 元 / 30 分钟，儿童须由成人陪同。',
        duration: '约 30 分钟', open: '08:30 - 17:00'
      },
      {
        id: 's6', name: '石林奇观', cat: '地质景观', x: 72, y: 30, k: 5, hot: 0,
        desc: '典型的喀斯特石芽地貌，怪石嶙峋、形态各异，被誉为"城市边上的小石林"。',
        audio: '这片奇特的石头来自两亿年前的石灰岩地层，经过流水长期的溶蚀，形成了眼前石芽林立的景观。仔细看，这些石头有的像猛兽，有的像老僧入定，您可以发挥想象，为它们起个名字。',
        tips: '石林内道路狭窄，请照看好老人与儿童。',
        duration: '约 25 分钟', open: '08:00 - 17:30'
      },
      {
        id: 's7', name: '观音禅院', cat: '人文古迹', x: 46, y: 70, k: 0, hot: 0,
        desc: '始建于南宋的千年古刹，现存建筑为清光绪年间重修。院内有一株 800 年古银杏。',
        audio: '观音禅院始建于南宋淳熙年间，现存殿宇为清代光绪年间重修。院中这棵银杏树已有八百岁高龄，每到十一月中旬，满树金黄，落叶铺地，是景区秋季最动人的景致。',
        tips: '院内请保持安静，请勿在殿内拍照。',
        duration: '约 20 分钟', open: '06:30 - 17:00'
      },
      {
        id: 's8', name: '索道上站', cat: '服务设施', x: 86, y: 62, k: 2, hot: 0,
        desc: '全长 1480 米的观光索道，单程运行 12 分钟，可直达主峰望岳台。',
        audio: '这里是观光索道的上站。索道全长一千四百八十米，单程运行约十二分钟，沿途可以俯瞰整片竹海与山谷。缆车封闭运行，请您安心乘坐，不要向外抛掷物品。',
        tips: '索道往返 80 元 / 人，遇 6 级以上大风或雷雨天气停运。',
        duration: '约 15 分钟', open: '08:30 - 16:30'
      }
    ];

    var facilities = [
      { id: 'f1', type: 'wc', name: '卫生间', x: 24, y: 50 },
      { id: 'f2', type: 'wc', name: '卫生间', x: 66, y: 36 },
      { id: 'f3', type: 'wc', name: '卫生间', x: 48, y: 82 },
      { id: 'f4', type: 'park', name: '停车场', x: 8, y: 88 },
      { id: 'f5', type: 'park', name: '停车场', x: 90, y: 84 },
      { id: 'f6', type: 'center', name: '游客中心', x: 50, y: 92 },
      { id: 'f7', type: 'med', name: '医疗点', x: 34, y: 22 },
      { id: 'f8', type: 'food', name: '餐饮服务', x: 70, y: 56 }
    ];

    var route = ['s1', 's7', 's4', 's2', 's6', 's5', 's3'];

    var notices = [
      {
        id: 'n1', title: '关于 10 月 30 日景区客流管控的公告', type: '限流', top: 1,
        date: dstr(t, -1), author: '景区管理处',
        content: '根据预约数据预测，10 月 30 日（周六）预约人数已达 4200 人，接近景区瞬时承载量上限。为保障游览安全与体验，当日 10:00-14:00 时段将实行客流管控：园内人数达到 3000 人时暂停入园，采取"出一进一"措施。建议游客错峰选择 08:00-10:00 或 14:00 以后时段入园。'
      },
      {
        id: 'n2', title: '索道设备检修期间部分区域封闭的通知', type: '闭园', top: 1,
        date: dstr(t, -2), author: '工程设备部',
        content: '为保障运行安全，景区观光索道将于 11 月 5 日至 11 月 12 日进行年度检修，检修期间索道上下站及周边栈道封闭，游客可由云栖古径步行登山。由此带来的不便，敬请谅解。'
      },
      {
        id: 'n3', title: '2026 年冬季预约时段调整通知', type: '预约', top: 0,
        date: dstr(t, -4), author: '景区管理处',
        content: '自 11 月 1 日起，景区开放时间调整为 08:00-17:00，末班入园时段为 15:00-17:00。冬季日落较早，请游客合理安排行程，注意下山时间。'
      },
      {
        id: 'n4', title: '云栖红叶节将于 11 月中旬开幕', type: '活动', top: 0,
        date: dstr(t, -6), author: '市场营销部',
        content: '一年一度的云栖红叶节将于 11 月 15 日开幕，持续至 12 月 10 日。期间将举办古径寻宝、银杏摄影大赛、山货市集等系列活动，持景区门票即可参与，部分项目需提前在公众号预约。'
      },
      {
        id: 'n5', title: '入园实名核验须知', type: '须知', top: 0,
        date: dstr(t, -8), author: '景区管理处',
        content: '景区实行实名制预约入园。入园时请出示订单二维码或本人身份证，由检票员核验后入园。未带身份证的游客，可在游客中心办理临时核验手续。1.2 米以下儿童须由成人陪同，无需单独预约。'
      }
    ];

    var users = [
      { id: 'u1', username: 'admin', pwd: '123456', name: '陈管理', role: 'admin', phone: '13800000001', status: 1, gate: '-', perms: ['dashboard', 'ticket', 'inventory', 'order', 'reserve', 'spot', 'notice', 'user', 'setting'] },
      { id: 'u2', username: 'checker01', pwd: '123456', name: '张检票', role: 'checker', phone: '13800000002', status: 1, gate: '南门', perms: ['scan', 'manual', 'record'] },
      { id: 'u3', username: 'checker02', pwd: '123456', name: '李检票', role: 'checker', phone: '13800000003', status: 1, gate: '北门', perms: ['scan', 'manual', 'record'] },
      { id: 'u4', username: 'checker03', pwd: '123456', name: '王检票', role: 'checker', phone: '13800000004', status: 0, gate: '东门', perms: ['scan'] }
    ];

    var visitors = [
      { id: 'v1', username: '13812345678', pwd: '123456', name: '张伟', phone: '13812345678', idcard: '330106199203154217', real: 1 },
      { id: 'v2', username: '13912345678', pwd: '123456', name: '王强', phone: '13912345678', idcard: '330106198801127755', real: 1 }
    ];

    var settings = {
      scenicName: SCENIC.name, address: SCENIC.address, phone: SCENIC.phone,
      openTime: '08:00-18:00', closeTime: '18:00', maxPerDay: 8000,
      advanceDays: 7, maxPerOrder: 5,
      refundRule: '游玩日前一天 24:00 前可免费取消；游玩日当天取消收取 10% 手续费；已核销订单不可退。',
      refundFee: 10, noticeLimit: 3000, autoClose: 1
    };

    return {
      scenic: SCENIC, tickets: tickets, inventory: inventory, orders: orders,
      spots: spots, facilities: facilities, route: route, notices: notices,
      users: users, visitors: visitors, settings: settings,
      counters: { order: 100, notice: 100, ticket: 100 }
    };
  }

  /* ---------------- 数据访问 ---------------- */
  var DB = {
    get: function () {
      var d = read(KEY, null);
      if (!d || !d.orders) { d = seed(); write(KEY, d); }
      return d;
    },
    save: function (d) { write(KEY, d); },
    update: function (fn) { var d = DB.get(); fn(d); DB.save(d); return d; },
    reset: function () { var d = seed(); write(KEY, d); return d; },
    scenic: function () { return DB.get().scenic; },
    settings: function () { return DB.get().settings; },
    tickets: function (onlyOn) {
      var t = DB.get().tickets;
      return onlyOn ? t.filter(function (x) { return x.status; }) : t;
    },
    ticket: function (id) { return DB.get().tickets.filter(function (t) { return t.id === id; })[0]; },
    spots: function () { return DB.get().spots; },
    spot: function (id) { return DB.get().spots.filter(function (s) { return s.id === id; })[0]; },
    facilities: function () { return DB.get().facilities; },
    route: function () { return DB.get().route; },
    notices: function () { return DB.get().notices.slice().sort(function (a, b) { return (b.top - a.top) || (b.date < a.date ? -1 : 1); }); },
    notice: function (id) { return DB.get().notices.filter(function (n) { return n.id === id; })[0]; },
    users: function (role) {
      var u = DB.get().users;
      return role ? u.filter(function (x) { return x.role === role; }) : u;
    },
    visitors: function () { return DB.get().visitors; }
  };

  /* ---------------- 库存 ---------------- */
  var Inventory = {
    get: function (date) {
      return DB.get().inventory.filter(function (i) { return i.date === date; })[0] || null;
    },
    avail: function (date) {
      var iv = Inventory.get(date);
      return iv ? Math.max(0, iv.total - iv.used) : 0;
    },
    /** 占用库存 */
    use: function (date, n) {
      DB.update(function (d) {
        var iv = d.inventory.filter(function (i) { return i.date === date; })[0];
        if (!iv) { iv = { date: date, total: 3000, used: 0 }; d.inventory.push(iv); }
        iv.used = Math.min(iv.total, iv.used + n);
      });
    },
    /** 释放库存 */
    free: function (date, n) {
      DB.update(function (d) {
        var iv = d.inventory.filter(function (i) { return i.date === date; })[0];
        if (iv) iv.used = Math.max(0, iv.used - n);
      });
    }
  };

  /* ---------------- 订单 ---------------- */
  var STATUS = {
    pending: { text: '待支付', cls: 'orange' },
    booked: { text: '已预约', cls: 'green' },
    verified: { text: '已核销', cls: 'blue' },
    cancelled: { text: '已取消', cls: 'gray' }
  };
  function statusOf(s) { return STATUS[s] || { text: s, cls: 'gray' }; }

  var Orders = {
    all: function () {
      return DB.get().orders.slice().sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
    },
    byNo: function (no) {
      return DB.get().orders.filter(function (o) { return o.no === no; })[0] || null;
    },
    list: function (f) {
      f = f || {};
      var list = Orders.all();
      if (f.status && f.status !== 'all') list = list.filter(function (o) { return o.status === f.status; });
      if (f.date) list = list.filter(function (o) { return o.date === f.date; });
      if (f.ticket) list = list.filter(function (o) { return o.ticket.indexOf(f.ticket) >= 0; });
      if (f.kw) {
        var kw = f.kw.toLowerCase();
        list = list.filter(function (o) {
          if (o.no.toLowerCase().indexOf(kw) >= 0) return true;
          if (o.contact && o.contact.phone && o.contact.phone.indexOf(kw) >= 0) return true;
          if (o.contact && o.contact.name && o.contact.name.indexOf(kw) >= 0) return true;
          return o.visitors.some(function (v) {
            return (v.name && v.name.indexOf(kw) >= 0) || (v.idcard && v.idcard.toLowerCase().indexOf(kw) >= 0);
          });
        });
      }
      return list;
    },
    create: function (d) {
      var no = 'YQ' + d.date.replace(/-/g, '') + pad(DB.get().counters.order++ % 1000);
      var order = {
        no: no, scenic: DB.scenic().name, ticketId: d.ticketId || '', ticket: d.ticket,
        date: d.date, time: d.time, qty: d.qty, price: d.price, amount: d.qty * d.price,
        status: 'pending', visitors: d.visitors, contact: d.contact,
        createdAt: new Date().toISOString(), paidAt: null, verifiedAt: null, verifier: '', gate: ''
      };
      DB.update(function (db) { db.orders.unshift(order); });
      return order;
    },
    pay: function (no) {
      var ok = false;
      DB.update(function (db) {
        var o = db.orders.filter(function (x) { return x.no === no; })[0];
        if (o && o.status === 'pending') { o.status = 'booked'; o.paidAt = new Date().toISOString(); ok = true; }
      });
      return ok;
    },
    cancel: function (no) {
      var o = Orders.byNo(no);
      if (!o || o.status === 'cancelled' || o.status === 'verified') return false;
      Inventory.free(o.date, o.qty);
      DB.update(function (db) {
        var t = db.orders.filter(function (x) { return x.no === no; })[0];
        if (t) t.status = 'cancelled';
      });
      return true;
    },
    /** 核销：返回 {ok, reason, order} */
    verify: function (no, who, gate) {
      var res = { ok: false, reason: '', order: null };
      DB.update(function (db) {
        var o = db.orders.filter(function (x) { return x.no === no; })[0];
        if (!o) { res.reason = 'notfound'; return; }
        res.order = clone(o);
        if (o.status === 'verified') { res.reason = 'used'; return; }
        if (o.status === 'cancelled') { res.reason = 'cancelled'; return; }
        if (o.status === 'pending') { res.reason = 'unpaid'; return; }
        if (dayGap(o.date) < 0) { res.reason = 'expired'; return; }
        o.status = 'verified';
        o.verifiedAt = new Date().toISOString();
        o.verifier = who || '检票员';
        o.gate = gate || '';
        res.ok = true;
        res.order = clone(o);
      });
      return res;
    },
    /** 游客预约记录（实名明细） */
    records: function (f) {
      f = f || {};
      var out = [];
      Orders.list(f).forEach(function (o) {
        o.visitors.forEach(function (v) {
          out.push({
            no: o.no, name: v.name, idcard: v.idcard, ticket: o.ticket, date: o.date,
            time: o.time, status: o.status, createdAt: o.createdAt,
            phone: o.contact ? o.contact.phone : '', verifiedAt: o.verifiedAt, verifier: o.verifier, gate: o.gate
          });
        });
      });
      return out;
    }
  };

  /* ---------------- 登录态 ---------------- */
  function makeAuth(key, roleKey) {
    return {
      get: function () { return read(key, null); },
      set: function (u) { write(key, u); },
      clear: function () { write(key, null); },
      isLogin: function () { return !!read(key, null); }
    };
  }
  var Auth = {
    visitor: makeAuth(UKEY.visitor),
    admin: makeAuth(UKEY.admin),
    checker: makeAuth(UKEY.checker)
  };

  /* ---------------- Toast ---------------- */
  var toastTimer = [];
  function toast(msg, type, ms) {
    var wrap = $('#toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    var el = document.createElement('div');
    el.className = 'toast' + (type === 'ok' ? ' ok' : type === 'err' ? ' err' : '');
    el.textContent = msg;
    wrap.appendChild(el);
    var timer = setTimeout(function () {
      el.style.transition = 'opacity .25s';
      el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 260);
    }, ms || 1800);
    toastTimer.push(timer);
  }

  /* ---------------- Dialog ---------------- */
  function closeDialog() {
    var m = $('.mask');
    if (m) m.remove();
  }
  /**
   * opts: {title, text, okText, cancelText, danger, onOk}
   */
  function dialog(opts) {
    closeDialog();
    var mask = document.createElement('div');
    mask.className = 'mask';
    mask.innerHTML =
      '<div class="dialog">' +
      '<div class="d-body"><div class="d-title">' + esc(opts.title || '提示') + '</div>' +
      (opts.html || (opts.text ? '<div class="d-text">' + esc(opts.text) + '</div>' : '')) +
      '</div>' +
      '<div class="d-foot">' +
      (opts.cancelText === null ? '' : '<button class="cancel">' + esc(opts.cancelText || '取消') + '</button>') +
      '<button class="ok' + (opts.danger ? ' danger' : '') + '">' + esc(opts.okText || '确定') + '</button>' +
      '</div></div>';
    document.body.appendChild(mask);
    mask.addEventListener('click', function (e) {
      if (e.target === mask) { closeDialog(); return; }
      if (e.target.classList.contains('cancel')) { closeDialog(); return; }
      if (e.target.classList.contains('ok')) {
        var keep = opts.onOk && opts.onOk() === false;
        if (!keep) closeDialog();
      }
    });
    return mask;
  }

  /**
   * 表单弹窗
   * opts: {title, fields:[{k,label,type,value,options,ph,required}], onOk(data)}
   */
  function formDialog(opts) {
    closeDialog();
    var mask = document.createElement('div');
    mask.className = 'mask';
    var html = '<div class="dialog wide"><div class="d-body"><div class="d-title">' + esc(opts.title) + '</div></div><div class="d-form">';
    (opts.fields || []).forEach(function (f) {
      html += '<div class="field"><label>' + esc(f.label) + (f.required ? ' <span class="danger">*</span>' : '') + '</label>';
      if (f.type === 'select') {
        html += '<select class="select" data-k="' + f.k + '">' + f.options.map(function (o) {
          return '<option value="' + esc(o.v) + '"' + (String(o.v) === String(f.value) ? ' selected' : '') + '>' + esc(o.t) + '</option>';
        }).join('') + '</select>';
      } else if (f.type === 'textarea') {
        html += '<textarea class="textarea" data-k="' + f.k + '" placeholder="' + esc(f.ph || '') + '">' + esc(f.value || '') + '</textarea>';
      } else if (f.type === 'switch') {
        html += '<div><div class="switch' + (f.value ? ' on' : '') + '" data-switch="' + f.k + '"></div></div>';
      } else {
        html += '<input class="input" data-k="' + f.k + '" type="' + (f.type || 'text') + '" value="' + esc(f.value || '') + '" placeholder="' + esc(f.ph || '') + '">';
      }
      html += '</div>';
    });
    html += '</div><div class="d-foot"><button class="cancel">取消</button><button class="ok">保存</button></div></div>';
    mask.innerHTML = html;
    document.body.appendChild(mask);
    mask.addEventListener('click', function (e) {
      if (e.target === mask || e.target.classList.contains('cancel')) { closeDialog(); return; }
      if (e.target.classList.contains('switch')) {
        e.target.classList.toggle('on');
        return;
      }
      if (e.target.classList.contains('ok')) {
        var data = {};
        $$('[data-k]', mask).forEach(function (el) { data[el.getAttribute('data-k')] = el.value; });
        $$('[data-switch]', mask).forEach(function (el) { data[el.getAttribute('data-switch')] = el.classList.contains('on') ? 1 : 0; });
        if (opts.onOk && opts.onOk(data) === false) return;
        closeDialog();
      }
    });
    return mask;
  }

  function confirmBox(text, onOk, opts) {
    opts = opts || {};
    return dialog({
      title: opts.title || '确认操作',
      text: text,
      okText: opts.okText || '确定',
      danger: opts.danger,
      onOk: onOk
    });
  }

  /* ---------------- 图标 ---------------- */
  var ICONS = {
    home: 'M3 9.6 12 3l9 6.6V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
    calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
    ticket: 'M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1.5a2 2 0 0 0 0 5V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1.5a2 2 0 0 0 0-5zM10 6.5v11',
    map: 'M9 4 3 6.8V20l6-2.6 6 2.6 6-2.6V4l-6 2.8zM9 4v13.4M15 6.8V20',
    order: 'M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1zM6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM9 12h6M9 16h4',
    user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    scan: 'M3 8V5a2 2 0 0 1 2-2h3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M21 16v3a2 2 0 0 1-2 2h-3M3 12h18',
    qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2M18 14h2M14 18h2M18 18h2',
    search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3',
    bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
    back: 'M15 18l-6-6 6-6',
    right: 'M9 18l6-6-6-6',
    arrow: 'M5 12h14M13 6l6 6-6 6',
    location: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5V12l3 2',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    chart: 'M3 21h18M7 21V11M12 21V4M17 21v-8',
    settings: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
    users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.1a4 4 0 0 1 0 7.8',
    notice: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5',
    speaker: 'M11 5 6 9H2v6h4l5 4V5zM19.1 4.9a10 10 0 0 1 0 14.2M15.5 8.5a5 5 0 0 1 0 7',
    camera: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    lock: 'M6 11h12v10H6zM9 11V7a3 3 0 0 1 6 0v4',
    logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
    plus: 'M12 5v14M5 12h14',
    minus: 'M5 12h14',
    download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
    upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
    trash: 'M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
    edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.4 2.6a2.1 2.1 0 0 1 3 3L12 15.6 8 16.6l1-4z',
    check: 'M20 6 9 17l-5-5',
    close: 'M18 6 6 18M6 6l12 12',
    play: 'M6 4l14 8-14 8z',
    pause: 'M9 5v14M15 5v14',
    route: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7',
    car: 'M5 17h14M7 17a2 2 0 1 1 0-4h10a2 2 0 1 1 0 4M4 13V9l2-4h12l2 4v4',
    wc: 'M6 21V4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v4M11 7h6a2 2 0 0 1 2 2v2M6 21a2 2 0 0 1 2-2 2 2 0 0 1-2-2 2 2 0 1 1 4 0 2 2 0 0 1-2 2zM6 9h6',
    info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16v-4M12 8h.01',
    money: 'M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
    refresh: 'M22 4v6h-6M2 20v-6h6M4 9a8 8 0 0 1 13-3.4L22 10M2 14l5 4.4A8 8 0 0 0 20 15',
    star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.2 6.5 20.2l1-6.2L3 9.6l6.2-.9z',
    eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    filter: 'M21 3H3l8 9.5V19l4 2v-8.5z',
    printer: 'M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M6 14h12v7H6z',
    mountain: 'M8 3l5 9 4-5 5 14H2z',
    phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z',
    headphone: 'M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z',
    image: 'M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21',
    list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    bus: 'M4 17V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11M4 17h16M7 17a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM17 17a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM4 10h16M6 6v4M18 6v4',
    food: 'M6 3v9a3 3 0 0 0 6 0V3M9 12v9M18 3c-1.5 1.5-2 3.5-2 5.5V21M18 3c1 1 1.5 2.5 1.5 4',
    med: 'M12 6v12M6 12h12',
    grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    checkcircle: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8.5 12.2l2.4 2.4 4.6-4.8',
    xcircle: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15 9l-6 6M9 9l6 6'
  };
  function icon(name, cls, sw) {
    var d = ICONS[name] || '';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 1.8) +
      '" stroke-linecap="round" stroke-linejoin="round"' + (cls ? ' class="' + cls + '"' : '') + '>' +
      d.split(' M').map(function (p, i) { return '<path d="' + (i ? 'M' + p : p) + '"/>'; }).join('') + '</svg>';
  }

  /* ---------------- 矢量风景插画 ---------------- */
  var PAL = [
    { s1: '#bfe9ff', s2: '#8fd8ef', sun: '#fff2b8', far: '#9ecfbd', mid: '#4fa88a', near: '#2f7d63', water: '#a9dcea' },
    { s1: '#ffe9c9', s2: '#ffc9a3', sun: '#fff6d8', far: '#c2a99a', mid: '#8c7a6b', near: '#5d5147', water: '#e9c9a8' },
    { s1: '#dfeaff', s2: '#a9c3e8', sun: '#e9f1ff', far: '#aab9d6', mid: '#6d80a3', near: '#45566f', water: '#b9cdea' },
    { s1: '#e6f7f0', s2: '#b6e3d2', sun: '#fff8d8', far: '#a8d5c4', mid: '#5fae8f', near: '#377a60', water: '#bfe6dc' },
    { s1: '#ffe3ec', s2: '#ffb6c9', sun: '#fff0c2', far: '#e0b6c4', mid: '#b87f92', near: '#7d5566', water: '#f3c8d4' },
    { s1: '#e9f7ff', s2: '#b3e0f7', sun: '#fff7cf', far: '#b0d2c6', mid: '#6aa39b', near: '#3f6f6a', water: '#a5d8ea' }
  ];
  var _sid = 0;
  /** 生成风景 SVG（k=配色序号, h=viewBox 高度比例） */
  function scene(k, h) {
    var p = PAL[k % PAL.length];
    var id = 'sc' + (++_sid);
    var H = h || 200;
    return '<svg class="scene" viewBox="0 0 400 ' + H + '" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + p.s1 + '"/><stop offset="1" stop-color="' + p.s2 + '"/></linearGradient></defs>' +
      '<rect width="400" height="' + H + '" fill="url(#' + id + ')"/>' +
      '<circle cx="318" cy="' + (H * 0.2) + '" r="' + (H * 0.1) + '" fill="' + p.sun + '" opacity=".95"/>' +
      '<path d="M0 ' + (H * 0.72) + ' L60 ' + (H * 0.42) + ' L110 ' + (H * 0.6) + ' L168 ' + (H * 0.34) + ' L232 ' + (H * 0.64) + ' L300 ' + (H * 0.46) + ' L400 ' + (H * 0.7) + ' L400 ' + H + ' L0 ' + H + 'Z" fill="' + p.far + '"/>' +
      '<path d="M0 ' + (H * 0.8) + ' L70 ' + (H * 0.6) + ' L140 ' + (H * 0.78) + ' L206 ' + (H * 0.55) + ' L280 ' + (H * 0.78) + ' L346 ' + (H * 0.62) + ' L400 ' + (H * 0.76) + ' L400 ' + H + ' L0 ' + H + 'Z" fill="' + p.mid + '"/>' +
      '<path d="M0 ' + (H * 0.9) + ' Q100 ' + (H * 0.84) + ' 200 ' + (H * 0.92) + ' T400 ' + (H * 0.88) + ' L400 ' + H + ' L0 ' + H + 'Z" fill="' + p.near + '"/>' +
      '<g fill="' + p.near + '" opacity=".9">' +
      '<path d="M58 ' + (H * 0.9) + ' l6-16 l6 16z"/><path d="M76 ' + (H * 0.9) + ' l5-13 l5 13z"/>' +
      '<path d="M330 ' + (H * 0.9) + ' l6-15 l6 15z"/><path d="M348 ' + (H * 0.9) + ' l5-12 l5 12z"/></g>' +
      '</svg>';
  }
  /** 缩略图风景（用于列表/卡片） */
  function thumb(k, w, h) { return scene(k, 200); }

  /* ---------------- 伪二维码 ---------------- */
  function drawQR(canvas, text, scale) {
    if (!canvas) return;
    var n = 25, sc = scale || 8, size = (n + 2) * sc;
    canvas.width = size; canvas.height = size;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size);
    var h = 2166136261 >>> 0;
    for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    function rnd() { h = (Math.imul(h, 1103515245) + 12345) >>> 0; return h / 4294967296; }
    function inFinder(x, y) {
      return (x < 7 && y < 7) || (x > n - 8 && y < 7) || (x < 7 && y > n - 8);
    }
    ctx.fillStyle = '#101c20';
    for (var y = 0; y < n; y++) {
      for (var x = 0; x < n; x++) {
        if (inFinder(x, y)) continue;
        if (y === 6 || x === 6) { if ((x + y) % 2 === 0) ctx.fillRect((x + 1) * sc, (y + 1) * sc, sc, sc); continue; }
        if (rnd() < 0.47) ctx.fillRect((x + 1) * sc, (y + 1) * sc, sc, sc);
      }
    }
    function finder(ox, oy) {
      ctx.fillStyle = '#101c20';
      ctx.fillRect((ox + 1) * sc, (oy + 1) * sc, 7 * sc, 7 * sc);
      ctx.fillStyle = '#fff';
      ctx.fillRect((ox + 2) * sc, (oy + 2) * sc, 5 * sc, 5 * sc);
      ctx.fillStyle = '#101c20';
      ctx.fillRect((ox + 3) * sc, (oy + 3) * sc, 3 * sc, 3 * sc);
    }
    finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
  }

  /* ---------------- 语音导览（Web Speech） ---------------- */
  var speaking = false;
  function speak(text, onEnd) {
    stopSpeak();
    if (!('speechSynthesis' in window)) { toast('当前浏览器不支持语音朗读，已显示文字导览'); return false; }
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN'; u.rate = 0.95; u.pitch = 1;
    u.onend = function () { speaking = false; if (onEnd) onEnd(); };
    u.onerror = function () { speaking = false; if (onEnd) onEnd(); };
    speaking = true;
    speechSynthesis.speak(u);
    return true;
  }
  function stopSpeak() {
    speaking = false;
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { }
  }

  /* ---------------- 导出 CSV ---------------- */
  function exportCSV(filename, headers, rows) {
    var esc2 = function (v) {
      v = String(v == null ? '' : v);
      return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    };
    var csv = '\ufeff' + headers.map(esc2).join(',') + '\n' + rows.map(function (r) { return r.map(esc2).join(','); }).join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 300);
  }

  /* ---------------- 空状态 ---------------- */
  function emptyHtml(text, em) {
    return '<div class="empty"><div class="em">' + (em || '🎫') + '</div><div>' + esc(text) + '</div></div>';
  }

  return {
    $: $, $$: $$, pad: pad, today: today, dstr: dstr, dayGap: dayGap, weekOf: weekOf,
    dateLabel: dateLabel, money: money, esc: esc, qs: qs, maskId: maskId, maskName: maskName,
    uid: uid, clone: clone, fmtTime: fmtTime, fmtDateTime: fmtDateTime,
    DB: DB, Inventory: Inventory, Orders: Orders, Auth: Auth,
    statusOf: statusOf, STATUS: STATUS,
    toast: toast, dialog: dialog, formDialog: formDialog, confirmBox: confirmBox, closeDialog: closeDialog,
    icon: icon, scene: scene, thumb: thumb, drawQR: drawQR,
    speak: speak, stopSpeak: stopSpeak, isSpeaking: function () { return speaking; },
    exportCSV: exportCSV, emptyHtml: emptyHtml
  };
})();
