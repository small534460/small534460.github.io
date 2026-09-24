'use strict';
/* ═══════════════════════════════════════
   Small 3 个人领域 · 主页运行时
   配置系统 + 动态渲染 + 原有功能
   ═══════════════════════════════════════ */

/* ==================== 基础工具 ==================== */
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }
function uid() { return 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function show(el, visible) { if (el) el.style.display = visible ? '' : 'none'; }

var toastEl = null;
function showToast(msg) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(function () { toastEl.classList.remove('show'); }, 2000);
}

function hexToRgb(hex) {
  var h = String(hex).replace('#', '');
  if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
  var n = parseInt(h, 16);
  if (isNaN(n) || h.length !== 6) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function shadeColor(hex, pct) {
  var rgb = hexToRgb(hex);
  if (!rgb) return hex;
  var t = pct < 0 ? 0 : 255;
  var p = Math.abs(pct) / 100;
  var f = function (i) {
    return Math.round((t - rgb[i]) * p + rgb[i]).toString(16).padStart(2, '0');
  };
  return '#' + f(0) + f(1) + f(2);
}

/* ==================== 配置系统 ==================== */
var STORAGE_KEY = 'small3_config_v1';

var DEFAULT_CONFIG = {
  version: 1,
  theme: {
    accent: '#60a5fa',
    brightness: [0.55, 0.75, 1.0]   /* 三档背景遮罩透明度 */
  },
  background: {
    type: 'api',        /* api | upload | url | video | solid | gradient */
    apis: [
      'https://api.yppp.net/api.php',
      'https://picsum.photos/1920/1080',
      'https://api.btstu.cn/sjbz/api.php'
    ],
    urls: [],           /* 背景图列表（本地上传 dataURL 或链接），换背景时轮换 */
    videoUrl: '',
    color: '#101a30',
    c1: '#152a52',
    c2: '#0a1428',
    angle: 155
  },
  components: {
    blur: true,         /* 模糊度组件 */
    time: true,         /* 时间卡片 */
    date: true,         /* 日历卡片（彩蛋入口） */
    quote: true,        /* 每日一言卡片 */
    scrollHint: true,   /* 下滑提示 */
    linksSection: true, /* 链接组件（整节） */
    footer: true        /* 页脚 */
  },
  tools: [
    { id: 't_bg', name: '换背景', icon: '🖼', action: 'bg', url: '', visible: true },
    { id: 't_copy', name: '复制链接', icon: '🔗', action: 'copy', url: '', visible: true },
    { id: 't_email', name: 'Email', icon: '📧', action: 'email', url: 'https://126.com/', visible: true },
    { id: 't_bright', name: '亮度调节', icon: '🌓', action: 'brightness', url: '', visible: true },
    { id: 't_random', name: '随机访问', icon: '🎲', action: 'random', url: '', visible: true },
    { id: 't_bookmark', name: '加书签', icon: '⭐', action: 'bookmark', url: '', visible: true }
  ],
  searches: [
    { id: 's_bing', name: '必应搜索', placeholder: '必应搜索…', buttonText: '必应搜索',
      urlTemplate: 'https://www.bing.com/search?q={q}', color: '#60a5fa',
      position: 'both', mode: 'tab', visible: true },
    { id: 's_gequhai', name: '歌曲海搜索', placeholder: '搜索歌曲、歌手或专辑...', buttonText: '搜索歌曲',
      urlTemplate: 'https://www.gequhai.com/s/{q}', color: '#10B981',
      position: 'both', mode: 'embed', visible: true }
  ],
  links: [
    { id: 'l_tools', title: '实用工具', desc: '各种实用的在线工具和资源', icon: '🛠️', url: 'https://small534460.github.io/shiyoungongjui/', visible: true },
    { id: 'l_sig', title: 'Small Image Generation', desc: '图片处理', icon: '🧩', url: 'https://small534460.github.io/gonggao/', visible: true },
    { id: 'l_yandex', title: 'Yandex导航', desc: '俄罗斯搜索引擎', icon: '🔍', url: 'https://online.yandex.com/search?text=%E4%BF%84%E7%BD%97%E6%96%AF%E6%90%9C%E7%B4%A2%E5%BC%95%E6%93%8Eyandex&lr=21206', visible: true },
    { id: 'l_steam', title: 'Steam', desc: '游戏平台和社区', icon: '🎮', url: 'https://store.steampowered.com/', visible: true },
    { id: 'l_medialab', title: 'MediaLab · 媒体工具箱', desc: '你不想试一下吗？', icon: '🧪', url: 'https://534460.netlify.app/', visible: true },
    { id: 'l_files', title: 'GitHub 文件管理器', desc: '你可以把文件暂时存放在这里', icon: '📁', url: 'https://small534460.github.io/wenjiantuoguan/', visible: true }
  ],
  quotes: {
    mode: 'api',        /* api | local | fixed */
    apis: [
      'https://uapis.cn/api/v1/saying?mode=daily',
      'https://v1.hitokoto.cn/?encode=json&c=d'
    ],
    fixed: '保持热爱，奔赴山海。',
    list: [
      "生活不止眼前的苟且，还有诗和远方。",
      "每一天都是一个新的开始。",
      "保持热爱，奔赴山海。",
      "星光不问赶路人，时光不负有心人。",
      "与其临渊羡鱼，不如退而结网。",
      "路漫漫其修远兮，吾将上下而求索。",
      "世界上最快乐的事，莫过于为理想而奋斗。",
      "成功不是终点，失败也不是终结，唯有勇气才是永恒。",
      "生活就像一盒巧克力，你永远不知道下一颗是什么味道。",
      "种一棵树最好的时间是十年前，其次是现在。",
      "人生如逆旅，我亦是行人。",
      "且将新火试新茶，诗酒趁年华。",
      "长风破浪会有时，直挂云帆济沧海。",
      "世界那么大，我想去看看。"
    ]
  },
  music: { enabled: true, user: 'small534460', repo: 'LTS' },
  easterEgg: { enabled: true, image: 'https://s41.ax1x.com/2026/07/03/pmws2xH.png' },
  skipOverlay: false
};

function mergeConfig(base, over) {
  var out = {};
  Object.keys(base).forEach(function (k) {
    if (over && Object.prototype.hasOwnProperty.call(over, k)) {
      var bv = base[k], ov = over[k];
      if (bv && typeof bv === 'object' && !Array.isArray(bv) && ov && typeof ov === 'object' && !Array.isArray(ov)) {
        out[k] = mergeConfig(bv, ov);
      } else {
        out[k] = ov;
      }
    } else {
      out[k] = bv;
    }
  });
  return out;
}

var CONFIG = loadConfig();
function loadConfig() {
  var cfg = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  try {
    var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && typeof saved === 'object') cfg = mergeConfig(cfg, saved);
  } catch (e) { /* 忽略损坏配置 */ }
  return cfg;
}
function saveConfig() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(CONFIG));
    return true;
  } catch (e) {
    showToast('⚠️ 保存失败：浏览器存储空间不足');
    return false;
  }
}
function configChanged() {
  saveConfig();
  applyConfig();
}
function resetConfig() {
  /* 原地更新，保持 App.CONFIG 引用有效 */
  var fresh = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  Object.keys(fresh).forEach(function (k) { CONFIG[k] = fresh[k]; });
  saveConfig();
  applyConfig();
}

/* ==================== 主题 ==================== */
function applyTheme() {
  var accent = CONFIG.theme.accent;
  document.documentElement.style.setProperty('--accent', accent);
  document.documentElement.style.setProperty('--accent-2', shadeColor(accent, -30));
}

/* ==================== 背景 ==================== */
var bgImageEl, bgVideoEl, bgOverlayEl;
var currentBgUrl = '';
var bgIndex = 0;
var bgApiRetryTimer = null;

function applyBackground() {
  var bg = CONFIG.background;
  clearTimeout(bgApiRetryTimer);
  hideVideo();
  switch (bg.type) {
    case 'api':
      loadApiBackground();
      break;
    case 'upload':
    case 'url':
      if (bg.urls.length) setBgImage(bg.urls[0]);
      else setBgSolid('#05070d');
      break;
    case 'video':
      if (bg.videoUrl) showVideo(bg.videoUrl);
      else if (bg.urls.length) setBgImage(bg.urls[0]);
      else setBgSolid('#05070d');
      break;
    case 'solid':
      setBgSolid(bg.color);
      break;
    case 'gradient':
      setBgGradient(bg.c1, bg.c2, bg.angle);
      break;
  }
}

function setBgImage(url) {
  currentBgUrl = url;
  /* 先清掉可能存在的纯色/渐变 background 简写，再单独设置背景图（避免简写互相覆盖） */
  bgImageEl.style.removeProperty('background');
  bgImageEl.style.backgroundImage = 'url("' + url + '")';
  bgImageEl.classList.add('loaded');
}
function setBgSolid(color) {
  currentBgUrl = '';
  bgImageEl.style.removeProperty('background-image');
  bgImageEl.style.background = color;
  bgImageEl.classList.add('loaded');
}
function setBgGradient(c1, c2, angle) {
  currentBgUrl = '';
  bgImageEl.style.removeProperty('background');
  bgImageEl.style.backgroundImage = 'linear-gradient(' + angle + 'deg, ' + c1 + ', ' + c2 + ')';
  bgImageEl.classList.add('loaded');
}
var apiTryIndex = 0, apiFailCount = 0;
function loadApiBackground(cb) {
  var apis = CONFIG.background.apis || [];
  if (!apis.length) { applyFallbackBg(); return; }
  var url = apis[apiTryIndex % apis.length];
  apiTryIndex++;
  var img = new Image();
  img.onload = function () {
    apiFailCount = 0;
    setBgImage(img.src);
    if (cb) cb();
  };
  img.onerror = function () {
    apiFailCount++;
    if (apiFailCount >= apis.length) {
      /* 全部 API 失败：若当前已有可见背景则保留（避免图片突然变纯色），否则显示兜底渐变；稍后自动重试 */
      if (!bgImageEl.classList.contains('loaded')) applyFallbackBg();
      bgApiRetryTimer = setTimeout(function () { apiFailCount = 0; loadApiBackground(); }, 8000);
    } else {
      /* 尝试下一个 API */
      loadApiBackground(cb);
    }
  };
  img.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 't=' + Date.now();
}
function applyFallbackBg() {
  setBgGradient('#0f1c3f', '#1c3a6e', 155);
}
function showVideo(url) {
  bgVideoEl.src = url;
  bgVideoEl.classList.add('loaded');
  bgImageEl.classList.remove('loaded');
}
function hideVideo() {
  bgVideoEl.classList.remove('loaded');
  bgVideoEl.removeAttribute('src');
  try { bgVideoEl.load(); } catch (e) { /* 忽略 */ }
}
function changeBackground() {
  var bg = CONFIG.background;
  if (bg.type === 'api') {
    loadApiBackground(function () { showToast('背景已更换 🖼'); });
    return;
  }
  if (bg.urls.length > 1) {
    bgIndex = (bgIndex + 1) % bg.urls.length;
    setBgImage(bg.urls[bgIndex]);
    showToast('背景已更换 🖼');
    return;
  }
  if (bg.type === 'video') { showToast('视频背景不支持更换，可在设置中修改链接'); return; }
  showToast('当前背景只有一张，可在设置中添加更多');
}

/* ==================== 模糊度 ==================== */
var blurSliderEl, blurValueEl;
var BLUR_DEFAULT = window.innerWidth <= 768 ? 3 : 6;
var currentBlur = BLUR_DEFAULT;

function applyBlur(v) {
  currentBlur = v;
  if (v > 0) {
    var filter = 'blur(' + v + 'px)';
    bgImageEl.style.filter = filter;
    bgImageEl.style.webkitFilter = filter;
    bgImageEl.style.transform = 'scale(' + (1.05 + v * 0.006) + ')';
    bgVideoEl.style.filter = filter;
    bgVideoEl.style.webkitFilter = filter;
  } else {
    bgImageEl.style.filter = 'none';
    bgImageEl.style.webkitFilter = 'none';
    bgImageEl.style.transform = 'scale(1)';
    bgVideoEl.style.filter = 'none';
    bgVideoEl.style.webkitFilter = 'none';
  }
  var cardBlur = Math.min(v, 12);
  document.documentElement.style.setProperty('--card-blur', cardBlur + 'px');
  if (blurSliderEl) {
    blurSliderEl.value = v;
    blurValueEl.textContent = v + 'px';
  }
  try { localStorage.setItem('blur_strength', v); } catch (e) { /* 忽略 */ }
}

function initBlur() {
  var saved = null;
  try { saved = localStorage.getItem('blur_strength'); } catch (e) { /* 忽略 */ }
  applyBlur(saved !== null ? parseInt(saved, 10) : BLUR_DEFAULT);
  blurSliderEl.addEventListener('input', function () {
    applyBlur(parseInt(this.value, 10));
  });
  $('#blurResetBtn').addEventListener('click', function () {
    applyBlur(BLUR_DEFAULT);
  });
}

/* ==================== 简洁模式 → 完整模式 ==================== */
var overlay, page, entered = false;

function enterFull() {
  if (entered) return;
  entered = true;

  document.documentElement.classList.remove('locked');
  document.body.classList.remove('locked');

  var ovAvatar = $('#ovAvatar');
  var ovSearch = $('#ovSearch');
  var ovTitle = $('.ov-title');
  var mainAvatar = $('#mainAvatar');
  var mainSearch = $('#mainSearch');

  var flights = [
    { from: ovAvatar, to: mainAvatar },
    { from: ovSearch, to: mainSearch }
  ];

  flights.forEach(function (f) { f.fromRect = f.from.getBoundingClientRect(); });

  page.classList.add('show');
  void page.offsetHeight;

  flights.forEach(function (f) { f.toRect = f.to.getBoundingClientRect(); });

  flights.forEach(function (f) {
    var dx = f.fromRect.left - f.toRect.left;
    var dy = f.fromRect.top - f.toRect.top;
    var sx = f.fromRect.width / f.toRect.width;
    var sy = f.fromRect.height / f.toRect.height;
    f.to.style.transition = 'none';
    f.to.style.transformOrigin = 'top left';
    f.to.style.transform = 'translate(' + dx + 'px, ' + dy + 'px) scale(' + sx + ', ' + sy + ')';
    f.to.style.willChange = 'transform';
  });

  [ovAvatar, ovSearch, ovTitle].forEach(function (el) {
    el.style.transition = 'none';
    el.style.opacity = '0';
  });

  requestAnimationFrame(function () {
    flights.forEach(function (f) {
      f.to.style.transition = 'transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)';
      f.to.style.transform = 'none';
    });
    overlay.classList.add('hide');
  });

  setTimeout(function () {
    $$('.page .anim').forEach(function (el, i) {
      el.style.transitionDelay = (i * 0.07) + 's';
      el.classList.add('in');
    });
  }, 250);

  setTimeout(function () {
    flights.forEach(function (f) {
      f.to.style.transition = '';
      f.to.style.transform = '';
      f.to.style.transformOrigin = '';
      f.to.style.willChange = '';
    });
    overlay.style.display = 'none';
  }, 1200);
}

function initPageMode() {
  if (CONFIG.skipOverlay) {
    /* 跳过首屏：直接完整模式 */
    entered = true;
    document.documentElement.classList.remove('locked');
    document.body.classList.remove('locked');
    overlay.style.display = 'none';
    page.classList.add('show');
    $$('.page .anim').forEach(function (el, i) {
      el.style.transitionDelay = (i * 0.06) + 's';
      el.classList.add('in');
    });
    return;
  }
  /* 首屏展示 */
  var touchStartY = 0;
  function onWheel(e) { if (e.deltaY > 8) enterFull(); }
  function onTouchStart(e) { touchStartY = e.touches[0].clientY; }
  function onTouchMove(e) { if (touchStartY - e.touches[0].clientY > 24) enterFull(); }
  function onKeyDown(e) {
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ' || e.key === 'Enter') enterFull();
  }
  window.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('keydown', onKeyDown);
  $('#scrollHint').addEventListener('click', enterFull);

  window.addEventListener('load', function () {
    requestAnimationFrame(function () { overlay.classList.add('entered'); });
  });
  setTimeout(function () { overlay.classList.add('entered'); }, 300);
}

/* ==================== 时间 / 日期 ==================== */
function updateDateTime() {
  var n = new Date();
  $('#currentTime').textContent = n.toLocaleTimeString('zh-CN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  var w = ['日', '一', '二', '三', '四', '五', '六'];
  $('#currentDate').textContent =
    n.getFullYear() + '年' + (n.getMonth() + 1) + '月' + n.getDate() + '日 星期' + w[n.getDay()];
}
function initDateTime() {
  updateDateTime();
  setInterval(updateDateTime, 1000);
}

/* ==================== 每日一言 ==================== */
function dayIndexOfYear() {
  var t = new Date();
  return Math.floor((t - new Date(t.getFullYear(), 0, 0)) / 86400000);
}
function setDailyQuote(text) {
  var el = $('#dailyQuote');
  if (el && text) el.textContent = text;
}
var quoteFetching = false;
function applyQuote() {
  var q = CONFIG.quotes;
  if (q.mode === 'fixed') {
    setDailyQuote(q.fixed || '');
    return;
  }
  if (q.mode === 'local') {
    if (q.list && q.list.length) setDailyQuote(q.list[dayIndexOfYear() % q.list.length]);
    else setDailyQuote('');
    return;
  }
  /* api 模式：先用本地列表兜底，再按顺序请求在线 API（防止并发重复请求） */
  if (q.list && q.list.length) setDailyQuote(q.list[dayIndexOfYear() % q.list.length]);
  if (quoteFetching) return;
  quoteFetching = true;
  fetchQuoteFromChain(0);
}
function fetchQuoteFromChain(i) {
  var apis = CONFIG.quotes.apis || [];
  if (i >= apis.length) { quoteFetching = false; return; }
  fetch(apis[i])
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var quote = data.hitokoto || data.text || data.content || (data.item && (data.item.text || data.item.content));
      if (quote) {
        setDailyQuote(quote + (data.from ? ' —— ' + data.from : ''));
        quoteFetching = false;
      } else {
        fetchQuoteFromChain(i + 1);
      }
    })
    .catch(function () { fetchQuoteFromChain(i + 1); });
}

/* ==================== 组件显隐 ==================== */
function applyComponentVisibility() {
  var c = CONFIG.components;
  show($('#blurControl'), c.blur);
  show($('#timeCard'), c.time);
  show($('#dateInfoCard'), c.date);
  show($('#quoteCard'), c.quote);
  show($('#infoBar'), c.time || c.date || c.quote);
  show($('#scrollHint'), c.scrollHint && !CONFIG.skipOverlay);
  show($('#siteFooter'), c.footer);
  show($('#settingsFab'), !c.footer);       /* 页脚隐藏时的兜底设置入口 */
  show($('#linksList'), c.linksSection);
  show($('#musicToggleBtn'), CONFIG.music.enabled);
  if (!CONFIG.music.enabled) $('#musicPanel').classList.remove('show');
  /* 彩蛋入口：日历卡片隐藏但彩蛋开启时，页脚提供 🎁 入口 */
  show($('#easterEntryBtn'), CONFIG.easterEgg.enabled && !c.date);
}

/* ==================== 小工具 ==================== */
var funWebsites = [
  { url: 'https://www.bilibili.com', name: '哔哩哔哩' },
  { url: 'https://www.youtube.com', name: 'YouTube' },
  { url: 'https://music.163.com', name: '网易云音乐' },
  { url: 'https://y.qq.com', name: 'QQ音乐' },
  { url: 'https://chat.deepseek.com', name: 'DeepSeek' },
  { url: 'https://kimi.moonshot.cn', name: 'Kimi' },
  { url: 'https://www.douyin.com', name: '抖音' },
  { url: 'https://weibo.com', name: '微博' },
  { url: 'https://www.zhihu.com', name: '知乎' },
  { url: 'https://store.steampowered.com', name: 'Steam' },
  { url: 'https://github.com', name: 'GitHub' }
];

function renderTools() {
  var box = $('#quickActions');
  box.innerHTML = CONFIG.tools
    .filter(function (t) { return t.visible; })
    .map(function (t) {
      return '<button class="quick-action-btn" data-id="' + escapeHtml(t.id) + '">' +
        '<span>' + escapeHtml(t.icon) + '</span> ' + escapeHtml(t.name) + '</button>';
    }).join('');
  show(box, box.innerHTML !== '');
}
function runTool(id) {
  var t = CONFIG.tools.find(function (x) { return x.id === id; });
  if (!t) return;
  switch (t.action) {
    case 'bg': changeBackground(); break;
    case 'copy': copyToClipboard(window.location.href); break;
    case 'email': window.open(t.url || 'https://126.com/', '_blank'); break;
    case 'brightness': toggleBrightness(); break;
    case 'random': randomWebsite(); break;
    case 'bookmark': showBookmarkPrompt(); break;
    case 'url': window.open(t.url || 'https://', '_blank'); break;
  }
}

function copyToClipboard(t) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(t).then(
      function () { showToast('链接已复制！📋'); },
      function () { fallbackCopy(t); }
    );
  } else { fallbackCopy(t); }
}
function fallbackCopy(t) {
  var a = document.createElement('textarea');
  a.value = t;
  document.body.appendChild(a);
  a.select();
  try { document.execCommand('copy'); showToast('链接已复制！📋'); } catch (e) { /* 忽略 */ }
  document.body.removeChild(a);
}

var brightnessLevel = 0;
function toggleBrightness() {
  var levels = CONFIG.theme.brightness || [0.55, 0.75, 1.0];
  brightnessLevel = (brightnessLevel + 1) % levels.length;
  var labels = ['明亮 ✨', '适中 🌤️', '暗色 🌙'];
  bgOverlayEl.style.opacity = levels[brightnessLevel];
  showToast('亮度：' + labels[brightnessLevel] + ' ' + Math.round(levels[brightnessLevel] * 100) + '%');
}

function randomWebsite() {
  var w = funWebsites[Math.floor(Math.random() * funWebsites.length)];
  showToast('🚀 前往：' + w.name);
  setTimeout(function () { window.open(w.url, '_blank'); }, 500);
}
function showBookmarkPrompt() {
  showToast(navigator.userAgent.indexOf('Mac') !== -1 ? '按 Cmd+D 添加书签 ⭐' : '按 Ctrl+D 添加书签 ⭐');
}
function showAvatarFallback() {
  $('#avatarImg').style.display = 'none';
  $('#avatarFallback').style.display = 'flex';
}

/* ==================== 搜索 ==================== */
function searchFormHTML(s) {
  var color = s.color || '#60a5fa';
  var btnStyle = 'background:linear-gradient(135deg,' + color + ',' + shadeColor(color, -25) + ')';
  return '<form class="search-form" data-id="' + escapeHtml(s.id) + '">' +
    '<input type="text" class="search-input" placeholder="' + escapeHtml(s.placeholder) + '">' +
    '<button type="submit" class="search-button" style="' + btnStyle + '">' + escapeHtml(s.buttonText) + '</button>' +
    '</form>';
}
function renderSearches() {
  var engines = CONFIG.searches.filter(function (s) { return s.visible; });

  var ovBox = $('#ovSearch');
  var ovBoth = engines.filter(function (s) { return s.position === 'both'; });
  ovBox.innerHTML = ovBoth.map(searchFormHTML).join('');
  show(ovBox, ovBoth.length > 0);

  var mainBox = $('#mainSearch');
  mainBox.innerHTML = engines.map(searchFormHTML).join('');
  show(mainBox, engines.length > 0);

  var hasEmbed = engines.some(function (s) { return s.mode === 'embed'; });
  show($('#searchContainer'), hasEmbed);
}
function findSearch(id) {
  return CONFIG.searches.find(function (s) { return s.id === id; });
}
function handleSearchSubmit(s, kw, fromOverlay) {
  var url = s.urlTemplate.replace(/\{q\}/g, encodeURIComponent(kw));
  if (s.mode === 'embed') {
    if (fromOverlay) {
      enterFull();
      setTimeout(function () { openEmbedResults(s, kw, url); }, 1150);
    } else {
      openEmbedResults(s, kw, url);
    }
  } else {
    window.open(url, '_blank');
  }
}
function openEmbedResults(s, kw, url) {
  var rc = $('#searchResults');
  rc.classList.add('active');
  $('#resultsHeader').classList.add('show');
  $('#loading').classList.add('show');
  $('#initialMessage').style.display = 'none';
  $('#embedHint').classList.add('show');
  $('#embedOpenLink').href = url;
  var iframe = $('#resultsFrame');
  iframe.style.display = 'none';
  iframe.src = url;
  iframe.onload = function () {
    $('#loading').classList.remove('show');
    iframe.style.display = 'block';
    $('#resultsTitle').textContent = '搜索结果: ' + kw;
  };
}
function closeResults() {
  $('#searchResults').classList.remove('active');
  $('#resultsHeader').classList.remove('show');
  $('#resultsFrame').style.display = 'none';
  $('#embedHint').classList.remove('show');
  $('#initialMessage').style.display = 'block';
}

/* ==================== 链接卡片 ==================== */
function renderLinks() {
  var list = $('#linksList');
  var items = CONFIG.links.filter(function (l) { return l.visible; });
  list.innerHTML = items.map(function (l) {
    return '<li><a class="card" href="' + escapeHtml(l.url) + '" target="_blank">' +
      '<div class="title">' + escapeHtml(l.icon) + ' ' + escapeHtml(l.title) + '</div>' +
      '<div class="desc">' + escapeHtml(l.desc) + '</div></a></li>';
  }).join('');
  show(list, items.length > 0);
}

/* ==================== 音乐播放器 ==================== */
var ENC_MUSIC_TOKEN = 'Amd/XHtEE5/KY2ljKDPSBs6zUYi1dYMwGmW05jlKanGy07Br7r5DD+GGU8U4pY6psGOComeLQpA/LoAfXNgn0PcJiKU=';
var musicToken = '';
var playlist = [];
var currentTrack = -1;
var isPlaying = false;
var loopMode = 0;
var musicListLoaded = false;

function base64ToBytes(b64) {
  var str = atob(b64);
  var bytes = new Uint8Array(str.length);
  for (var i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}
async function initMusicToken() {
  if (musicToken) return musicToken;
  try {
    var k = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('534460'));
    var key = await crypto.subtle.importKey('raw', k, { name: 'AES-GCM' }, false, ['decrypt']);
    var bytes = base64ToBytes(ENC_MUSIC_TOKEN);
    var iv = bytes.slice(0, 12);
    var ct = bytes.slice(12);
    var dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ct);
    musicToken = new TextDecoder().decode(dec);
  } catch (e) {
    console.log('令牌解密失败');
  }
  return musicToken;
}
async function loadMusicList() {
  if (musicListLoaded) return;
  musicListLoaded = true;
  if (!musicToken) await initMusicToken();
  if (!musicToken) { musicListLoaded = false; return; }
  try {
    var url = 'https://api.github.com/repos/' + CONFIG.music.user + '/' + CONFIG.music.repo + '/contents/';
    var r = await fetch(url, { headers: { 'Authorization': 'token ' + musicToken } });
    var files = await r.json();
    if (!Array.isArray(files)) { musicListLoaded = false; return; }
    playlist = [];
    files.forEach(function (f) {
      if (f.name.match(/\.(mp3|m4a|wav|ogg|flac)$/i)) {
        playlist.push({
          name: f.name.replace(/\.(mp3|m4a|wav|ogg|flac)$/i, ''),
          ext: f.name.split('.').pop()
        });
      }
    });
    renderSongList();
  } catch (e) {
    musicListLoaded = false;
    console.log('加载失败:', e);
  }
}
function reloadMusic() {
  musicListLoaded = false;
  musicToken = '';
  playlist = [];
  currentTrack = -1;
  isPlaying = false;
  renderSongList();
  $('#musicToggleBtn').classList.remove('playing');
  $('#nowPlaying').textContent = '未在播放';
  var audio = $('#bgMusic');
  try { audio.pause(); } catch (e) { /* 忽略 */ }
  audio.removeAttribute('src');
  if ($('#musicPanel').classList.contains('show')) loadMusicList();
}
function renderSongList() {
  var list = $('#songList');
  if (playlist.length === 0) {
    list.innerHTML = '<div style="opacity:0.5;text-align:center;padding:12px">暂无音乐</div>';
    return;
  }
  list.innerHTML = '';
  playlist.forEach(function (s, i) {
    var div = document.createElement('div');
    div.className = 'song-item';
    if (i === currentTrack) div.classList.add('active');
    div.innerHTML = '<span class="song-num">' + (i + 1) +
      '</span><span class="song-icon">🎵</span><span class="song-name">' + escapeHtml(s.name) + '</span>';
    div.onclick = function () { playTrack(i); };
    list.appendChild(div);
  });
  updateNowPlaying();
}
function playTrack(i) {
  currentTrack = i;
  var s = playlist[i];
  var audio = $('#bgMusic');
  var apiUrl = 'https://api.github.com/repos/' + CONFIG.music.user + '/' + CONFIG.music.repo + '/contents/' +
    encodeURIComponent(s.name + '.' + s.ext);
  fetch(apiUrl, { headers: { 'Authorization': 'token ' + musicToken } })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data && data.download_url) {
        audio.src = data.download_url;
        audio.load();
        audio.play().catch(function (e) { console.log('播放失败:', e); });
      }
    })
    .catch(function (e) { console.log('获取失败:', e); });
  isPlaying = true;
  $('#musicToggleBtn').classList.add('playing');
  renderSongList();
}
function updateNowPlaying() {
  var np = $('#nowPlaying');
  np.textContent = currentTrack >= 0 ? '正在播放: ' + playlist[currentTrack].name : '未在播放';
}
function playNext() {
  if (playlist.length === 0) return;
  if (loopMode === 1) { playTrack(currentTrack); }
  else if (loopMode === 2) { playTrack((currentTrack + 1) % playlist.length); }
  else {
    if (currentTrack < playlist.length - 1) { playTrack(currentTrack + 1); }
    else {
      isPlaying = false;
      $('#musicToggleBtn').classList.remove('playing');
      $('#nowPlaying').textContent = '播放完毕';
      renderSongList();
    }
  }
}
function playPrev() { if (currentTrack > 0) playTrack(currentTrack - 1); }
function toggleLoop() {
  loopMode = (loopMode + 1) % 3;
  var btn = $('#loopBtn');
  btn.textContent = ['🔁', '🔂', '🔁'][loopMode];
  btn.classList.toggle('active', loopMode > 0);
}
function togglePlay() {
  var audio = $('#bgMusic');
  if (!audio.src || currentTrack < 0) return;
  if (isPlaying) audio.pause(); else audio.play();
}
function toggleMusicPanel() {
  var p = $('#musicPanel');
  p.classList.toggle('show');
  if (p.classList.contains('show') && playlist.length === 0) loadMusicList();
}
function formatTime(s) {
  var m = Math.floor(s / 60);
  var sec = Math.floor(s % 60);
  return m + ':' + (sec < 10 ? '0' : '') + sec;
}
function seekMusic(e) {
  var a = $('#bgMusic');
  if (!a || !a.duration) return;
  var r = e.currentTarget.getBoundingClientRect();
  a.currentTime = ((e.clientX - r.left) / r.width) * a.duration;
}
function initMusic() {
  $('#musicToggleBtn').addEventListener('click', toggleMusicPanel);
  $('#prevBtn').addEventListener('click', playPrev);
  $('#playBtn').addEventListener('click', togglePlay);
  $('#nextBtn').addEventListener('click', playNext);
  $('#loopBtn').addEventListener('click', toggleLoop);
  $('#musicProgressBar').addEventListener('click', seekMusic);

  setInterval(function () {
    var a = $('#bgMusic');
    if (!a || !a.duration) return;
    $('#musicProgressFill').style.width = (a.currentTime / a.duration) * 100 + '%';
    $('#musicCurrentTime').textContent = formatTime(a.currentTime);
    $('#musicTotalTime').textContent = formatTime(a.duration);
  }, 500);

  var audioEl = $('#bgMusic');
  audioEl.onended = function () { playNext(); };
  audioEl.onplay = function () {
    isPlaying = true;
    $('#playBtn').textContent = '⏸️';
    $('#musicToggleBtn').classList.add('playing');
  };
  audioEl.onpause = function () {
    isPlaying = false;
    $('#playBtn').textContent = '▶️';
    $('#musicToggleBtn').classList.remove('playing');
  };
}

/* ==================== 刘德华彩蛋弹窗 ==================== */
var chineseNums = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
function toChineseNum(n) {
  if (n <= 10) return chineseNums[n];
  if (n < 20) return '十' + (n % 10 === 0 ? '' : chineseNums[n % 10]);
  if (n < 100) {
    var tens = Math.floor(n / 10), ones = n % 10;
    return chineseNums[tens] + '十' + (ones === 0 ? '' : chineseNums[ones]);
  }
  return n.toString();
}
function formatChineseDate(date) {
  var y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  var dayNames = ['日', '一', '二', '三', '四', '五', '六'];
  var yearStr = y.toString().split('').map(function (digit) { return chineseNums[parseInt(digit, 10)]; }).join('');
  return yearStr + '年' + toChineseNum(m) + '月' + toChineseNum(d) + '日 星期' + dayNames[date.getDay()];
}
function formatChineseTime(date) {
  var h = date.getHours(), min = date.getMinutes(), sec = date.getSeconds();
  var period = h < 12 ? '上午' : '下午';
  var hour12 = h % 12; if (hour12 === 0) hour12 = 12;
  var minStr = min < 10 ? '零' + toChineseNum(min) : toChineseNum(min);
  var secStr = sec < 10 ? '零' + toChineseNum(sec) : toChineseNum(sec);
  return period + toChineseNum(hour12) + '点' + minStr + '分' + secStr + '秒';
}
function getFestivalsOfYear(year) {
  var result = [];
  var solarFixed = [
    { name: '元旦', month: 1, day: 1 },
    { name: '劳动节', month: 5, day: 1 },
    { name: '国庆节', month: 10, day: 1 }
  ];
  solarFixed.forEach(function (f) {
    result.push({ name: f.name, dateObj: new Date(year, f.month - 1, f.day) });
  });
  if (typeof Solar !== 'undefined' && typeof Lunar !== 'undefined') {
    var wanted = ['春节', '清明', '端午', '中秋'];
    var d = new Date(year, 0, 1);
    var end = new Date(year, 11, 31);
    while (d <= end) {
      try {
        var solar = Solar.fromDate(new Date(d));
        var lunar = solar.getLunar();
        var lunarFests = lunar.getFestivals() || [];
        var solarFests = solar.getFestivals() || [];
        var all = lunarFests.concat(solarFests);
        for (var i = 0; i < all.length; i++) {
          var raw = all[i];
          for (var j = 0; j < wanted.length; j++) {
            if (raw.indexOf(wanted[j]) !== -1) {
              var exists = result.some(function (r) {
                return r.name === raw && r.dateObj.getFullYear() === year;
              });
              if (!exists) result.push({ name: raw, dateObj: new Date(d) });
            }
          }
        }
      } catch (e) { /* 跳过异常日期 */ }
      d.setDate(d.getDate() + 1);
    }
  }
  return result;
}
function getNextFestival(today) {
  var todayTime = today.getTime();
  var year = today.getFullYear();
  var candidates = getFestivalsOfYear(year);
  var upcoming = candidates.filter(function (f) { return f.dateObj.getTime() >= todayTime; });
  if (upcoming.length === 0) {
    candidates = getFestivalsOfYear(year + 1);
    upcoming = candidates.filter(function (f) { return f.dateObj.getTime() >= todayTime; });
  }
  upcoming.sort(function (a, b) { return a.dateObj - b.dateObj; });
  return upcoming[0] || { name: '元旦', dateObj: new Date(year + 1, 0, 1) };
}
function updateEasterEggPanel() {
  var now = new Date();
  $('#eeCnDate').textContent = formatChineseDate(now);
  $('#eeCnTime').textContent = formatChineseTime(now);

  var startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var dayPct = Math.min(100, Math.floor(((now - startOfDay) / 86400000) * 100));
  $('#eeDayPercent').textContent = dayPct + '%';
  $('#eeDayFill').style.width = dayPct + '%';

  var dow = now.getDay();
  var adjustedDay = dow === 0 ? 7 : dow;
  var weekPct = Math.floor(((adjustedDay - 1) / 7) * 100);
  $('#eeWeekPercent').textContent = weekPct + '%';
  $('#eeWeekFill').style.width = weekPct + '%';

  var year = now.getFullYear(), month = now.getMonth();
  var daysInMonth = new Date(year, month + 1, 0).getDate();
  var monthPct = Math.floor(((now.getDate() - 1) / daysInMonth) * 100);
  $('#eeMonthPercent').textContent = monthPct + '%';
  $('#eeMonthFill').style.width = monthPct + '%';

  var nextFestival = getNextFestival(now);
  $('#eeNextFestivalName').textContent = nextFestival.name;
  var startOfYear = new Date(year, 0, 1);
  var totalDays = (nextFestival.dateObj - startOfYear) / 86400000;
  var elapsedDays = (now - startOfYear) / 86400000;
  var festPct = totalDays <= 0 ? 100 : Math.min(100, Math.floor((elapsedDays / totalDays) * 100));
  $('#eeFestivalPercent').textContent = festPct + '%';
  $('#eeFestivalFill').style.width = festPct + '%';

  var isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  var totalDaysInYear = isLeap ? 366 : 365;
  var dayOfYear = Math.floor((now - startOfYear) / 86400000) + 1;
  var thawPct = Math.min(100, Math.floor((dayOfYear / totalDaysInYear) * 100));
  $('#eeThawText').textContent = '解冻 ' + thawPct + '%';
  $('#iceLayer').style.height = (100 - thawPct) + '%';
}
function openEasterEgg() {
  if (!CONFIG.easterEgg.enabled) return;
  $('#easterEggOverlay').classList.add('active');
  updateEasterEggPanel();
}
function applyEasterEgg() {
  $('#thawImg').src = CONFIG.easterEgg.image;
}
function initEasterEgg() {
  var eggOverlay = $('#easterEggOverlay');
  $('#dateInfoCard').addEventListener('click', openEasterEgg);
  $('#easterEntryBtn').addEventListener('click', openEasterEgg);
  $('#easterEggCloseBtn').addEventListener('click', function () { eggOverlay.classList.remove('active'); });
  eggOverlay.addEventListener('click', function (e) {
    if (e.target === eggOverlay) eggOverlay.classList.remove('active');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && eggOverlay.classList.contains('active')) eggOverlay.classList.remove('active');
  });
  var panelTimer = null;
  var observer = new MutationObserver(function () {
    if (eggOverlay.classList.contains('active')) {
      if (!panelTimer) { panelTimer = setInterval(updateEasterEggPanel, 1000); updateEasterEggPanel(); }
    } else {
      if (panelTimer) { clearInterval(panelTimer); panelTimer = null; }
    }
  });
  observer.observe(eggOverlay, { attributes: true, attributeFilter: ['class'] });
  updateEasterEggPanel();
}

/* ==================== 配置应用总入口 ==================== */
function applyConfig() {
  applyTheme();
  applyBackground();
  applyComponentVisibility();
  renderTools();
  renderSearches();
  renderLinks();
  applyQuote();
  applyEasterEgg();
}

/* ==================== 设置面板（开合由 settings.js 负责渲染） ==================== */
function openSettings() {
  $('#settingsPanel').classList.add('open');
  if (window.renderSettingsPanel) window.renderSettingsPanel();
}
function closeSettings() {
  $('#settingsPanel').classList.remove('open');
}
function bindSettingsButtons() {
  $('#settingsBtn').addEventListener('click', openSettings);
  $('#settingsFab').addEventListener('click', openSettings);
  $('#settingsBackBtn').addEventListener('click', closeSettings);
}

/* ==================== 图片压缩（设置面板上传背景用） ==================== */
function compressImageFile(file, maxSide, cb) {
  var reader = new FileReader();
  reader.onload = function () {
    var img = new Image();
    img.onload = function () {
      var w = img.naturalWidth || img.width;
      var h = img.naturalHeight || img.height;
      var scale = Math.min(1, maxSide / Math.max(w, h));
      var cw = Math.max(1, Math.round(w * scale));
      var ch = Math.max(1, Math.round(h * scale));
      var cv = document.createElement('canvas');
      cv.width = cw; cv.height = ch;
      var ctx = cv.getContext('2d');
      try {
        ctx.drawImage(img, 0, 0, cw, ch);
        var dataUrl = cv.toDataURL('image/jpeg', 0.85);
        cb(dataUrl);
      } catch (e) {
        cb(reader.result); /* 压缩失败退回原图 */
      }
    };
    img.onerror = function () { showToast('图片读取失败'); };
    img.src = reader.result;
  };
  reader.onerror = function () { showToast('图片读取失败'); };
  reader.readAsDataURL(file);
}

/* ==================== 初始化 ==================== */
function bindMainEvents() {
  /* 小工具容器事件代理 */
  $('#quickActions').addEventListener('click', function (e) {
    var btn = e.target.closest('.quick-action-btn');
    if (btn) runTool(btn.dataset.id);
  });
  /* 搜索表单提交代理 */
  $('#mainSearch').addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.target.closest('.search-form');
    var s = findSearch(form.dataset.id);
    var kw = form.querySelector('.search-input').value.trim();
    if (s && kw) handleSearchSubmit(s, kw, false);
  });
  $('#ovSearch').addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.target.closest('.search-form');
    var s = findSearch(form.dataset.id);
    var kw = form.querySelector('.search-input').value.trim();
    if (s && kw) handleSearchSubmit(s, kw, true);
  });
  $('#closeResultsBtn').addEventListener('click', closeResults);
}

function init() {
  bgImageEl = $('#bgImage');
  bgVideoEl = $('#bgVideo');
  bgOverlayEl = $('#bgOverlay');
  overlay = $('#overlay');
  page = $('#page');
  blurSliderEl = $('#blurSlider');
  blurValueEl = $('#blurValue');

  initPageMode();
  applyConfig();
  initBlur();
  initDateTime();
  initMusic();
  initEasterEgg();
  bindMainEvents();
  bindSettingsButtons();

  document.addEventListener('DOMContentLoaded', function () {
    initMusicToken();
  });
}

/* 暴露给 settings.js */
window.App = {
  CONFIG: CONFIG,
  saveConfig: saveConfig,
  configChanged: configChanged,
  resetConfig: resetConfig,
  mergeConfig: mergeConfig,
  applyConfig: applyConfig,
  applyBackground: applyBackground,
  applyComponentVisibility: applyComponentVisibility,
  applyTheme: applyTheme,
  applyQuote: applyQuote,
  applyEasterEgg: applyEasterEgg,
  renderTools: renderTools,
  renderSearches: renderSearches,
  renderLinks: renderLinks,
  reloadMusic: reloadMusic,
  openEasterEgg: openEasterEgg,
  shadeColor: shadeColor,
  compressImageFile: compressImageFile,
  showToast: showToast,
  uid: uid
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
