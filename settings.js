'use strict';
/* ═══════════════════════════════════════
   Small 3 个人领域 · 设置面板
   左分类导航 + 功能胶囊切换 + 自动保存
   ═══════════════════════════════════════ */

var App = window.App;
function cfg() { return App.CONFIG; }

var SECTIONS = [
  { id: 'bg', icon: '🎨', label: '背景与外观' },
  { id: 'comp', icon: '🧩', label: '组件开关' },
  { id: 'search', icon: '🔍', label: '搜索组件' },
  { id: 'tools', icon: '🧰', label: '小工具' },
  { id: 'links', icon: '🔗', label: '链接卡片' },
  { id: 'quote', icon: '💬', label: '每日一言' },
  { id: 'media', icon: '🎵', label: '音乐与彩蛋' },
  { id: 'data', icon: '💾', label: '数据管理' }
];

/* 每个分类下包含的功能：选中哪个功能，就只显示那个功能的设置 */
var FUNCS = {
  bg: [
    { id: 'bgtype', icon: '🖼', label: '背景类型', html: bgTypeHTML, bind: bindBgType },
    { id: 'bglist', icon: '📚', label: '背景图列表', html: bgListHTML, bind: bindBgList },
    { id: 'bgapi', icon: '🔁', label: '背景图 API', html: bgApiHTML, bind: bindBgApi },
    { id: 'bgvideo', icon: '🎬', label: '视频背景', html: bgVideoHTML, bind: bindBgVideo },
    { id: 'bgcolor', icon: '🎨', label: '纯色与渐变', html: bgColorHTML, bind: bindBgColor },
    { id: 'theme', icon: '✨', label: '外观主题', html: themeHTML, bind: bindTheme }
  ],
  comp: [{ id: 'all', icon: '🧩', label: '组件显示开关', html: compHTML, bind: bindComp }],
  search: [{ id: 'all', icon: '🔍', label: '搜索框管理', html: searchHTML, bind: bindSearch }],
  tools: [{ id: 'all', icon: '🧰', label: '小工具管理', html: toolsHTML, bind: bindTools }],
  links: [{ id: 'all', icon: '🔗', label: '链接卡片管理', html: linksHTML, bind: bindLinks }],
  quote: [
    { id: 'mode', icon: '💬', label: '来源与 API', html: quoteModeHTML, bind: bindQuoteMode },
    { id: 'list', icon: '📝', label: '本地名言列表', html: quoteListHTML, bind: bindQuoteList }
  ],
  media: [
    { id: 'music', icon: '🎵', label: '音乐歌单', html: mediaMusicHTML, bind: bindMediaMusic },
    { id: 'egg', icon: '🧊', label: '彩蛋弹窗', html: mediaEggHTML, bind: bindMediaEgg }
  ],
  data: [{ id: 'all', icon: '💾', label: '配置数据', html: dataHTML, bind: bindData }]
};
var currentSection = 'bg';
var currentFunc = {};

/* ═══════════════ 工具函数 ═══════════════ */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function resolvePath(obj, path) {
  return path.split('.').reduce(function (o, k) { return o[k]; }, obj);
}
function setPath(obj, path, val) {
  var ks = path.split('.');
  var o = obj;
  for (var i = 0; i < ks.length - 1; i++) o = o[ks[i]];
  o[ks[ks.length - 1]] = val;
}
function listItem(listName, id) {
  return cfg()[listName].find(function (x) { return x.id === id; });
}
function moveItem(arr, id, dir) {
  var i = arr.findIndex(function (x) { return x.id === id; });
  var j = i + dir;
  if (i < 0 || j < 0 || j >= arr.length) return;
  var item = arr.splice(i, 1)[0];
  arr.splice(j, 0, item);
}
/* 按需刷新：改什么只刷新什么，避免每次修改都重新请求背景/一言 */
function saveTargeted(fn) {
  App.saveConfig();
  if (fn) fn();
}
function saveTargetedRender(fn) {
  saveTargeted(fn);
  renderSection();
}
function applyForPath(path) {
  if (path.indexOf('background.') === 0) { App.applyBackground(); return; }
  if (path.indexOf('theme.') === 0) { App.applyTheme(); return; }
  if (path.indexOf('quotes.') === 0) { App.applyQuote(); return; }
  if (path.indexOf('music.') === 0 || path === 'skipOverlay') { App.applyComponentVisibility(); return; }
  if (path.indexOf('easterEgg.') === 0) { App.applyEasterEgg(); return; }
  App.applyConfig();
}
function applyForList(listName) {
  if (listName === 'searches') App.renderSearches();
  else if (listName === 'tools') App.renderTools();
  else if (listName === 'links') App.renderLinks();
}
function animateRemove(el, done) {
  if (el && el.classList) {
    el.classList.add('removing');
    setTimeout(done, 190);
  } else {
    done();
  }
}
function switchRowHTML(checked, key, label, desc) {
  return '<div class="set-row">' +
    '<div class="set-label">' + label + (desc ? '<div class="set-desc">' + desc + '</div>' : '') + '</div>' +
    '<label class="switch"><input type="checkbox" data-key="' + key + '" ' + (checked ? 'checked' : '') + '><span class="slider"></span></label>' +
    '</div>';
}
/* API 列表（背景图 API / 一言 API 共用） */
function apiListHTML(title, desc, list, inputId, addAct, delAct) {
  var items = list.map(function (u, i) {
    return '<div class="set-item"><div class="set-item-head">' +
      '<div class="set-item-title" style="font-weight:400;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(u) + '</div>' +
      '<button class="set-btn mini danger" data-act="' + delAct + '" data-idx="' + i + '">✕</button>' +
      '</div></div>';
  }).join('');
  return '<div class="set-group"><h3>' + title + '</h3>' +
    '<p class="set-group-desc">' + desc + '</p>' +
    '<div class="set-row" style="padding-top:0">' +
    '<input type="text" id="' + inputId + '" placeholder="https://..." style="flex:1">' +
    '<button class="set-btn primary" data-act="' + addAct + '">＋ 添加</button></div>' +
    '<div class="set-list">' + (items || '<div class="set-empty">列表为空</div>') + '</div></div>';
}
function bindApiList(listRef, inputId, addAct, delAct, applyFn) {
  var box = document.getElementById('settingsContent');
  box.querySelector('[data-act="' + addAct + '"]').addEventListener('click', function () {
    var v = document.getElementById(inputId).value.trim();
    if (!v) return;
    if (!/^https?:\/\//i.test(v)) { App.showToast('请输入以 http:// 或 https:// 开头的链接'); return; }
    listRef.push(v);
    saveTargetedRender(applyFn);
    App.showToast('已添加');
  });
  box.querySelectorAll('[data-act="' + delAct + '"]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var i = parseInt(btn.dataset.idx, 10);
      animateRemove(btn.closest('.set-item'), function () {
        listRef.splice(i, 1);
        saveTargetedRender(applyFn);
      });
    });
  });
}

/* ═══════════════ 面板框架 ═══════════════ */
window.renderSettingsPanel = function () {
  renderNav();
  renderSection();
};

function renderNav() {
  var nav = document.getElementById('settingsNav');
  nav.innerHTML = SECTIONS.map(function (s) {
    return '<button class="settings-nav-item ' + (s.id === currentSection ? 'active' : '') + '" data-section="' + s.id + '">' +
      '<span>' + s.icon + '</span><span class="nav-text">' + s.label + '</span></button>';
  }).join('');
}

function activeFunc() {
  var funcs = FUNCS[currentSection];
  if (!currentFunc[currentSection] || !funcs.some(function (f) { return f.id === currentFunc[currentSection]; })) {
    currentFunc[currentSection] = funcs[0].id;
  }
  return funcs.find(function (f) { return f.id === currentFunc[currentSection]; });
}

function renderSection() {
  var box = document.getElementById('settingsContent');
  var funcs = FUNCS[currentSection];
  var active = activeFunc();
  var pills = funcs.length > 1
    ? '<div class="set-funcs">' + funcs.map(function (f) {
        return '<button class="set-func-pill' + (f.id === active.id ? ' active' : '') + '" data-func="' + f.id + '">' +
          f.icon + ' ' + f.label + '</button>';
      }).join('') + '</div>'
    : '';
  box.innerHTML = pills + active.html();
  box.classList.remove('anim-fade');
  void box.offsetWidth;
  box.classList.add('anim-fade');
  active.bind();
}

/* ═══════════════ 背景与外观 ═══════════════ */
function bgTypeHTML() {
  var bg = cfg().background;
  return '<div class="set-group"><h3>🖼 背景类型</h3>' +
    '<div class="set-row"><div class="set-label">当前背景来源</div>' +
    '<select data-bind="background.type">' +
    '<option value="api" ' + (bg.type === 'api' ? 'selected' : '') + '>随机图库（在线 API）</option>' +
    '<option value="upload" ' + (bg.type === 'upload' ? 'selected' : '') + '>本地图片</option>' +
    '<option value="url" ' + (bg.type === 'url' ? 'selected' : '') + '>图片链接</option>' +
    '<option value="video" ' + (bg.type === 'video' ? 'selected' : '') + '>视频链接</option>' +
    '<option value="solid" ' + (bg.type === 'solid' ? 'selected' : '') + '>纯色</option>' +
    '<option value="gradient" ' + (bg.type === 'gradient' ? 'selected' : '') + '>渐变</option>' +
    '</select></div>' +
    '<div class="set-row"><div class="set-label">上传本地图片<div class="set-desc">自动压缩到最长边 2000px 后保存在浏览器中</div></div>' +
    '<button class="set-btn primary" data-act="upload-bg">上传图片</button></div>' +
    '<div class="set-row"><div class="set-label">添加图片链接<div class="set-desc">以 http(s) 开头的图片直链</div></div>' +
    '<input type="text" id="bgUrlInput" placeholder="https://example.com/bg.jpg" style="max-width:280px">' +
    '<button class="set-btn" data-act="add-bg-url">添加</button></div></div>';
}
function bindBgType() {
  var box = document.getElementById('settingsContent');
  box.querySelector('[data-act="upload-bg"]').addEventListener('click', function () {
    document.getElementById('bgFileInput').click();
  });
  document.getElementById('bgFileInput').onchange = function () {
    var files = Array.prototype.slice.call(this.files || []);
    this.value = '';
    if (!files.length) return;
    var pending = files.length;
    var added = 0;
    files.forEach(function (f) {
      if (!f.type || f.type.indexOf('image/') !== 0) { pending--; return; }
      App.compressImageFile(f, 2000, function (dataUrl) {
        cfg().background.urls.push(dataUrl);
        added++;
        if (--pending === 0) {
          if (added) {
            cfg().background.type = 'upload';
            saveTargetedRender(App.applyBackground);
            App.showToast('已添加 ' + added + ' 张背景图');
          }
        }
      });
    });
  };
  box.querySelector('[data-act="add-bg-url"]').addEventListener('click', function () {
    var v = document.getElementById('bgUrlInput').value.trim();
    if (!v) return;
    if (!/^https?:\/\//i.test(v)) { App.showToast('请输入以 http:// 或 https:// 开头的链接'); return; }
    cfg().background.urls.push(v);
    cfg().background.type = 'url';
    saveTargetedRender(App.applyBackground);
    App.showToast('已添加背景链接');
  });
  bindInputs(box);
}

function bgListHTML() {
  var urls = cfg().background.urls;
  var list = urls.map(function (u, i) {
    var label = u.indexOf('data:') === 0 ? '🖼 本地图片 ' + (i + 1) : esc(u.length > 50 ? u.slice(0, 50) + '…' : u);
    return '<div class="set-item"><div class="set-item-head">' +
      '<div class="set-item-title" style="font-weight:400;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + label + '</div>' +
      '<button class="set-btn mini" data-act="use-bg" data-idx="' + i + '">应用</button>' +
      '<button class="set-btn mini danger" data-act="del-bg" data-idx="' + i + '">✕</button>' +
      '</div></div>';
  }).join('');
  return '<div class="set-group"><h3>📚 背景图列表</h3>' +
    '<p class="set-group-desc">「换背景」小工具在这个列表中轮换；点「应用」设为当前背景</p>' +
    '<div class="set-list">' + (list || '<div class="set-empty">还没有图片，上传或添加链接后可在这里管理</div>') + '</div></div>';
}
function bindBgList() {
  var box = document.getElementById('settingsContent');
  box.querySelectorAll('[data-act="use-bg"]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var i = parseInt(btn.dataset.idx, 10);
      if (i <= 0 || i >= cfg().background.urls.length) return;
      var u = cfg().background.urls.splice(i, 1)[0];
      cfg().background.urls.unshift(u);
      saveTargetedRender(App.applyBackground);
    });
  });
  box.querySelectorAll('[data-act="del-bg"]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var i = parseInt(btn.dataset.idx, 10);
      animateRemove(btn.closest('.set-item'), function () {
        cfg().background.urls.splice(i, 1);
        saveTargetedRender(App.applyBackground);
      });
    });
  });
}

function bgApiHTML() {
  return apiListHTML(
    '🔁 背景图 API 列表',
    '「随机图库」背景按顺序尝试这些接口（接口需直接返回图片，浏览器会自动跟随跳转）；全部失败时显示兜底渐变并自动重试。留空则直接使用兜底渐变',
    cfg().background.apis, 'newApiInput', 'add-bg-api', 'del-bg-api');
}
function bindBgApi() {
  bindApiList(cfg().background.apis, 'newApiInput', 'add-bg-api', 'del-bg-api', App.applyBackground);
}

function bgVideoHTML() {
  var v = cfg().background.videoUrl;
  return '<div class="set-group"><h3>🎬 视频背景</h3>' +
    '<div class="set-row"><div class="set-label">视频链接<div class="set-desc">mp4 / webm 直链，自动循环静音播放；填好点应用</div></div>' +
    '<input type="text" id="videoUrlInput" placeholder="https://example.com/bg.mp4" value="' + esc(v) + '" style="max-width:280px">' +
    '<button class="set-btn primary" data-act="apply-video">应用</button></div></div>';
}
function bindBgVideo() {
  var box = document.getElementById('settingsContent');
  box.querySelector('[data-act="apply-video"]').addEventListener('click', function () {
    var v = document.getElementById('videoUrlInput').value.trim();
    if (!v) { App.showToast('请先填写视频链接'); return; }
    cfg().background.videoUrl = v;
    cfg().background.type = 'video';
    saveTargetedRender(App.applyBackground);
    App.showToast('视频背景已应用');
  });
}

function bgColorHTML() {
  var bg = cfg().background;
  return '<div class="set-group"><h3>🎨 纯色 / 渐变背景</h3>' +
    '<div class="set-row"><div class="set-label">纯色（选择后自动切换）</div>' +
    '<input type="color" data-bind="background.color" value="' + esc(bg.color) + '" data-also-type="solid"></div>' +
    '<div class="set-row"><div class="set-label">渐变起始色</div>' +
    '<input type="color" data-bind="background.c1" value="' + esc(bg.c1) + '" data-also-type="gradient"></div>' +
    '<div class="set-row"><div class="set-label">渐变结束色</div>' +
    '<input type="color" data-bind="background.c2" value="' + esc(bg.c2) + '" data-also-type="gradient"></div>' +
    '<div class="set-row"><div class="set-label">渐变角度 <span id="bgAngleTag" style="color:var(--accent)">' + bg.angle + '°</span></div>' +
    '<input type="range" data-bind="background.angle" min="0" max="359" value="' + bg.angle + '" data-also-type="gradient" style="flex:1"></div>' +
    '</div>';
}
function bindBgColor() {
  bindInputs(document.getElementById('settingsContent'));
}

function themeHTML() {
  var t = cfg().theme;
  return '<div class="set-group"><h3>✨ 外观主题</h3>' +
    '<div class="set-row"><div class="set-label">主题色<div class="set-desc">全局强调色（按钮、高亮、进度条）</div></div>' +
    '<input type="color" data-bind="theme.accent" value="' + esc(t.accent) + '"></div>' +
    '<div class="set-row"><div class="set-label">亮度三档（背景遮罩不透明度）<div class="set-desc">「亮度调节」小工具三档循环值（0 最暗 ～ 1 最亮）</div></div>' +
    '<div style="display:flex;gap:6px">' +
    '<input type="number" data-bind="theme.brightness.0" min="0" max="1" step="0.05" value="' + t.brightness[0] + '" style="width:70px">' +
    '<input type="number" data-bind="theme.brightness.1" min="0" max="1" step="0.05" value="' + t.brightness[1] + '" style="width:70px">' +
    '<input type="number" data-bind="theme.brightness.2" min="0" max="1" step="0.05" value="' + t.brightness[2] + '" style="width:70px">' +
    '</div></div>' +
    switchRowHTML(cfg().skipOverlay, 'skipOverlay', '跳过首屏简洁模式', '打开网页直接进入完整模式（下次打开页面生效）') +
    '</div>';
}
function bindTheme() {
  bindInputs(document.getElementById('settingsContent'));
}

/* data-bind 通用绑定（input / select / checkbox / range） */
function bindInputs(box) {
  box.querySelectorAll('input[data-bind]').forEach(function (el) {
    var evt = el.type === 'checkbox' ? 'change' : 'input';
    el.addEventListener(evt, function () {
      var v = el.type === 'checkbox' ? el.checked : (el.type === 'number' ? parseFloat(el.value) : el.value);
      setPath(cfg(), el.dataset.bind, v);
      if (el.dataset.alsoType) cfg().background.type = el.dataset.alsoType;
      if (el.dataset.bind === 'background.angle') {
        var tag = document.getElementById('bgAngleTag');
        if (tag) tag.textContent = Math.round(cfg().background.angle) + '°';
      }
      if (el.dataset.bind === 'skipOverlay') {
        saveTargeted(function () { App.applyComponentVisibility(); });
        App.showToast('已保存，下次打开页面生效');
        return;
      }
      saveTargeted(function () { applyForPath(el.dataset.bind); });
    });
  });
  box.querySelectorAll('select[data-bind]').forEach(function (el) {
    el.addEventListener('change', function () {
      setPath(cfg(), el.dataset.bind, el.value);
      saveTargeted(function () { applyForPath(el.dataset.bind); });
    });
  });
}

/* ═══════════════ 组件开关 ═══════════════ */
function compHTML() {
  var c = cfg().components;
  return '<div class="set-group"><h3>🧩 组件显示开关</h3>' +
    '<p class="set-group-desc">每个组件独立控制，互不影响</p>' +
    switchRowHTML(c.blur, 'components.blur', '模糊度组件', '背景模糊调节滑杆') +
    switchRowHTML(c.time, 'components.time', '时间组件', '🕐 当前时间卡片') +
    switchRowHTML(c.date, 'components.date', '日历组件', '📅 今天日期卡片（隐藏后彩蛋入口移到页脚 🎁）') +
    switchRowHTML(c.quote, 'components.quote', '每日一言组件', '💡 每日一言卡片') +
    switchRowHTML(c.scrollHint, 'components.scrollHint', '下滑提示', '首屏底部的「下滑探索」提示') +
    switchRowHTML(c.linksSection, 'components.linksSection', '链接组件（整节）', '每张卡片可在「链接卡片」中单独设置') +
    switchRowHTML(c.footer, 'components.footer', '页脚', '隐藏后设置入口变为右上角悬浮按钮') +
    switchRowHTML(cfg().music.enabled, 'music.enabled', '音乐播放器', '右下角 🎵 按钮与播放面板') +
    switchRowHTML(cfg().easterEgg.enabled, 'easterEgg.enabled', '彩蛋弹窗', '点日期卡片或 🎁 打开') +
    '</div>';
}
function bindComp() {
  var box = document.getElementById('settingsContent');
  box.querySelectorAll('input[data-key]').forEach(function (el) {
    el.addEventListener('change', function () {
      setPath(cfg(), el.dataset.key, el.checked);
      saveTargeted(App.applyComponentVisibility);
    });
  });
}

/* ═══════════════ 搜索组件 ═══════════════ */
var SEARCH_PRESETS = [
  { name: '必应搜索', placeholder: '必应搜索…', buttonText: '必应搜索', urlTemplate: 'https://www.bing.com/search?q={q}', color: '#60a5fa', position: 'both', mode: 'tab' },
  { name: '歌曲海搜索', placeholder: '搜索歌曲、歌手或专辑...', buttonText: '搜索歌曲', urlTemplate: 'https://www.gequhai.com/s/{q}', color: '#10B981', position: 'both', mode: 'embed' },
  { name: '百度', placeholder: '百度一下…', buttonText: '百度', urlTemplate: 'https://www.baidu.com/s?wd={q}', color: '#3b82f6', position: 'main', mode: 'tab' },
  { name: 'Google', placeholder: 'Google 搜索…', buttonText: 'Google', urlTemplate: 'https://www.google.com/search?q={q}', color: '#f59e0b', position: 'main', mode: 'tab' },
  { name: '哔哩哔哩', placeholder: '搜索 B 站视频…', buttonText: 'B站搜索', urlTemplate: 'https://search.bilibili.com/all?keyword={q}', color: '#fb7299', position: 'main', mode: 'tab' }
];
function searchItemHTML(s, idx) {
  return '<div class="set-item">' +
    '<div class="set-item-head">' +
    '<div class="set-item-title">' + esc(s.name) + '</div>' +
    '<label class="switch"><input type="checkbox" data-list="searches" data-id="' + s.id + '" data-field="visible" ' + (s.visible ? 'checked' : '') + '><span class="slider"></span></label>' +
    '<button class="set-btn mini" data-act="up" data-list="searches" data-id="' + s.id + '" ' + (idx === 0 ? 'disabled' : '') + '>↑</button>' +
    '<button class="set-btn mini" data-act="down" data-list="searches" data-id="' + s.id + '" ' + (idx === cfg().searches.length - 1 ? 'disabled' : '') + '>↓</button>' +
    '<button class="set-btn mini danger" data-act="del" data-list="searches" data-id="' + s.id + '">✕</button>' +
    '</div>' +
    '<div class="set-item-fields">' +
    '<div><label>名称</label><input type="text" data-list="searches" data-id="' + s.id + '" data-field="name" value="' + esc(s.name) + '"></div>' +
    '<div><label>按钮文字</label><input type="text" data-list="searches" data-id="' + s.id + '" data-field="buttonText" value="' + esc(s.buttonText) + '"></div>' +
    '<div><label>输入提示</label><input type="text" data-list="searches" data-id="' + s.id + '" data-field="placeholder" value="' + esc(s.placeholder) + '"></div>' +
    '<div><label>按钮颜色</label><input type="color" data-list="searches" data-id="' + s.id + '" data-field="color" value="' + esc(s.color) + '"></div>' +
    '<div><label>显示位置</label><select data-list="searches" data-id="' + s.id + '" data-field="position">' +
    '<option value="both" ' + (s.position === 'both' ? 'selected' : '') + '>首屏 + 完整模式</option>' +
    '<option value="main" ' + (s.position === 'main' ? 'selected' : '') + '>仅完整模式</option>' +
    '</select></div>' +
    '<div><label>打开方式</label><select data-list="searches" data-id="' + s.id + '" data-field="mode">' +
    '<option value="tab" ' + (s.mode === 'tab' ? 'selected' : '') + '>新标签页打开</option>' +
    '<option value="embed" ' + (s.mode === 'embed' ? 'selected' : '') + '>本页嵌入（iframe）</option>' +
    '</select></div>' +
    '</div>' +
    '<div><label style="font-size:11px;color:rgba(200,210,225,0.6)">搜索链接模板（{q} 代表搜索词）</label>' +
    '<input type="text" data-list="searches" data-id="' + s.id + '" data-field="urlTemplate" value="' + esc(s.urlTemplate) + '" style="width:100%"></div>' +
    '</div>';
}
function searchHTML() {
  var list = cfg().searches.map(searchItemHTML).join('');
  var presetOpts = SEARCH_PRESETS.map(function (p, i) {
    return '<option value="' + i + '">' + esc(p.name) + '</option>';
  }).join('');
  return '<div class="set-group"><h3>🔍 自定义搜索组件</h3>' +
    '<p class="set-group-desc">自由增删搜索框：可自定义文字、颜色、链接模板、显示位置与打开方式。提示：百度 / Google 等站点禁止被 iframe 嵌入，请用「新标签页打开」</p>' +
    '<div class="set-row" style="padding-top:0">' +
    '<div class="set-label">从预设添加</div>' +
    '<select id="presetSelect">' + presetOpts + '</select>' +
    '<button class="set-btn primary" data-act="add-search-preset">＋ 添加</button>' +
    '<button class="set-btn" data-act="add-search-blank">＋ 空白</button></div>' +
    '<div class="set-list">' + (list || '<div class="set-empty">暂无搜索框</div>') + '</div></div>';
}
function bindSearch() {
  var box = document.getElementById('settingsContent');
  box.querySelector('[data-act="add-search-preset"]').addEventListener('click', function () {
    var p = SEARCH_PRESETS[parseInt(document.getElementById('presetSelect').value, 10)];
    var copy = JSON.parse(JSON.stringify(p));
    copy.id = App.uid();
    copy.visible = true;
    cfg().searches.push(copy);
    saveTargetedRender(function () { App.renderSearches(); });
  });
  box.querySelector('[data-act="add-search-blank"]').addEventListener('click', function () {
    cfg().searches.push({
      id: App.uid(), name: '新搜索', placeholder: '输入搜索词…', buttonText: '搜索',
      urlTemplate: 'https://www.bing.com/search?q={q}', color: '#60a5fa',
      position: 'main', mode: 'tab', visible: true
    });
    saveTargetedRender(function () { App.renderSearches(); });
  });
  bindListControls(box, 'searches');
}

/* ═══════════════ 小工具 ═══════════════ */
var TOOL_ACTION_LABELS = {
  bg: '换背景', copy: '复制链接', email: 'Email 链接', brightness: '亮度调节',
  random: '随机访问', bookmark: '加书签提示', url: '打开网页链接'
};
function toolsHTML() {
  var list = cfg().tools.map(function (t, idx) {
    var actionOpts = Object.keys(TOOL_ACTION_LABELS).map(function (a) {
      return '<option value="' + a + '" ' + (t.action === a ? 'selected' : '') + '>' + TOOL_ACTION_LABELS[a] + '</option>';
    }).join('');
    return '<div class="set-item">' +
      '<div class="set-item-head">' +
      '<div class="set-item-title">' + esc(t.name) + '</div>' +
      '<label class="switch"><input type="checkbox" data-list="tools" data-id="' + t.id + '" data-field="visible" ' + (t.visible ? 'checked' : '') + '><span class="slider"></span></label>' +
      '<button class="set-btn mini" data-act="up" data-list="tools" data-id="' + t.id + '" ' + (idx === 0 ? 'disabled' : '') + '>↑</button>' +
      '<button class="set-btn mini" data-act="down" data-list="tools" data-id="' + t.id + '" ' + (idx === cfg().tools.length - 1 ? 'disabled' : '') + '>↓</button>' +
      '<button class="set-btn mini danger" data-act="del" data-list="tools" data-id="' + t.id + '">✕</button>' +
      '</div>' +
      '<div class="set-item-fields">' +
      '<div><label>图标（emoji）</label><input type="text" data-list="tools" data-id="' + t.id + '" data-field="icon" value="' + esc(t.icon) + '"></div>' +
      '<div><label>名称</label><input type="text" data-list="tools" data-id="' + t.id + '" data-field="name" value="' + esc(t.name) + '"></div>' +
      '<div><label>动作类型</label><select data-list="tools" data-id="' + t.id + '" data-field="action">' + actionOpts + '</select></div>' +
      '<div><label>链接（动作=打开网页链接 时生效）</label><input type="text" data-list="tools" data-id="' + t.id + '" data-field="url" value="' + esc(t.url) + '"></div>' +
      '</div></div>';
  }).join('');
  return '<div class="set-group"><h3>🧰 小工具（快捷按钮）</h3>' +
    '<p class="set-group-desc">每个按钮独立开关、可改名换图标；自定义工具可打开任意网页</p>' +
    '<div class="set-row" style="padding-top:0">' +
    '<div class="set-label">添加自定义小工具</div>' +
    '<button class="set-btn primary" data-act="add-tool">＋ 添加网页工具</button></div>' +
    '<div class="set-list">' + (list || '<div class="set-empty">暂无小工具</div>') + '</div></div>';
}
function bindTools() {
  var box = document.getElementById('settingsContent');
  box.querySelector('[data-act="add-tool"]').addEventListener('click', function () {
    cfg().tools.push({ id: App.uid(), name: '新工具', icon: '🔗', action: 'url', url: 'https://', visible: true });
    saveTargetedRender(function () { App.renderTools(); });
  });
  bindListControls(box, 'tools');
}

/* ═══════════════ 链接卡片 ═══════════════ */
function linksHTML() {
  var list = cfg().links.map(function (l, idx) {
    return '<div class="set-item">' +
      '<div class="set-item-head">' +
      '<div class="set-item-title">' + esc(l.title) + '</div>' +
      '<label class="switch"><input type="checkbox" data-list="links" data-id="' + l.id + '" data-field="visible" ' + (l.visible ? 'checked' : '') + '><span class="slider"></span></label>' +
      '<button class="set-btn mini" data-act="up" data-list="links" data-id="' + l.id + '" ' + (idx === 0 ? 'disabled' : '') + '>↑</button>' +
      '<button class="set-btn mini" data-act="down" data-list="links" data-id="' + l.id + '" ' + (idx === cfg().links.length - 1 ? 'disabled' : '') + '>↓</button>' +
      '<button class="set-btn mini danger" data-act="del" data-list="links" data-id="' + l.id + '">✕</button>' +
      '</div>' +
      '<div class="set-item-fields">' +
      '<div><label>图标（emoji）</label><input type="text" data-list="links" data-id="' + l.id + '" data-field="icon" value="' + esc(l.icon) + '"></div>' +
      '<div><label>标题</label><input type="text" data-list="links" data-id="' + l.id + '" data-field="title" value="' + esc(l.title) + '"></div>' +
      '<div><label>描述</label><input type="text" data-list="links" data-id="' + l.id + '" data-field="desc" value="' + esc(l.desc) + '"></div>' +
      '<div><label>链接</label><input type="text" data-list="links" data-id="' + l.id + '" data-field="url" value="' + esc(l.url) + '"></div>' +
      '</div></div>';
  }).join('');
  return '<div class="set-group"><h3>🔗 自定义链接卡片</h3>' +
    '<p class="set-group-desc">图标填入 emoji（会显示在标题前）；标题、描述、链接自由修改</p>' +
    '<div class="set-row" style="padding-top:0">' +
    '<div class="set-label">添加自定义链接</div>' +
    '<button class="set-btn primary" data-act="add-link">＋ 添加链接</button></div>' +
    '<div class="set-list">' + (list || '<div class="set-empty">暂无链接卡片</div>') + '</div></div>';
}
function bindLinks() {
  var box = document.getElementById('settingsContent');
  box.querySelector('[data-act="add-link"]').addEventListener('click', function () {
    cfg().links.push({ id: App.uid(), title: '新链接', desc: '描述', icon: '🌐', url: 'https://', visible: true });
    saveTargetedRender(function () { App.renderLinks(); });
  });
  bindListControls(box, 'links');
}

/* 列表通用控件（排序 / 删除[带动画] / 字段绑定） */
function bindListControls(box, listName) {
  var arr = cfg()[listName];
  box.querySelectorAll('[data-act="up"][data-list="' + listName + '"]').forEach(function (btn) {
    btn.addEventListener('click', function () { moveItem(arr, btn.dataset.id, -1); saveTargetedRender(function () { applyForList(listName); }); });
  });
  box.querySelectorAll('[data-act="down"][data-list="' + listName + '"]').forEach(function (btn) {
    btn.addEventListener('click', function () { moveItem(arr, btn.dataset.id, 1); saveTargetedRender(function () { applyForList(listName); }); });
  });
  box.querySelectorAll('[data-act="del"][data-list="' + listName + '"]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.dataset.id;
      animateRemove(btn.closest('.set-item'), function () {
        var i = arr.findIndex(function (x) { return x.id === id; });
        if (i >= 0) {
          arr.splice(i, 1);
          saveTargetedRender(function () { applyForList(listName); });
        }
      });
    });
  });
  box.querySelectorAll('input[data-list="' + listName + '"], select[data-list="' + listName + '"]').forEach(function (el) {
    var evt = el.type === 'checkbox' ? 'change' : 'input';
    el.addEventListener(evt, function () {
      var item = listItem(listName, el.dataset.id);
      if (!item) return;
      item[el.dataset.field] = el.type === 'checkbox' ? el.checked : el.value;
      saveTargeted(function () { applyForList(listName); });
    });
  });
}

/* ═══════════════ 每日一言 ═══════════════ */
function quoteModeHTML() {
  var q = cfg().quotes;
  return '<div class="set-group"><h3>💬 来源模式</h3>' +
    '<div class="set-row"><div class="set-label">来源模式</div>' +
    '<select data-bind="quotes.mode">' +
    '<option value="api" ' + (q.mode === 'api' ? 'selected' : '') + '>在线 API（下方列表按顺序尝试）</option>' +
    '<option value="local" ' + (q.mode === 'local' ? 'selected' : '') + '>本地列表（按日期轮换）</option>' +
    '<option value="fixed" ' + (q.mode === 'fixed' ? 'selected' : '') + '>固定文字</option>' +
    '</select></div>' +
    '<div class="set-row"><div class="set-label">固定文字（固定模式生效）</div>' +
    '<input type="text" data-bind="quotes.fixed" value="' + esc(q.fixed) + '"></div></div>' +
    apiListHTML(
      '🔁 一言 API 列表',
      '在线模式按顺序尝试这些接口，全部失败自动使用本地名言列表。接口需返回 JSON，字段支持 hitokoto / text / content',
      q.apis, 'newQuoteApiInput', 'add-quote-api', 'del-quote-api');
}
function bindQuoteMode() {
  bindInputs(document.getElementById('settingsContent'));
  bindApiList(cfg().quotes.apis, 'newQuoteApiInput', 'add-quote-api', 'del-quote-api', App.applyQuote);
}
function quoteListHTML() {
  var q = cfg().quotes;
  var list = q.list.map(function (line, i) {
    return '<div class="set-item"><div class="set-item-head">' +
      '<div class="set-item-title" style="font-weight:400;overflow:hidden;text-overflow:ellipsis">' + esc(line) + '</div>' +
      '<button class="set-btn mini danger" data-act="del-quote" data-idx="' + i + '">✕</button>' +
      '</div></div>';
  }).join('');
  return '<div class="set-group"><h3>📝 本地名言列表</h3>' +
    '<p class="set-group-desc">本地模式每天按日期轮换一条；在线模式请求失败时也使用这个列表</p>' +
    '<div class="set-row" style="padding-top:0">' +
    '<input type="text" id="newQuoteInput" placeholder="输入一句名言…" style="flex:1">' +
    '<button class="set-btn primary" data-act="add-quote">＋ 添加</button></div>' +
    '<div class="set-list">' + (list || '<div class="set-empty">列表为空</div>') + '</div></div>';
}
function bindQuoteList() {
  var box = document.getElementById('settingsContent');
  box.querySelector('[data-act="add-quote"]').addEventListener('click', function () {
    var v = document.getElementById('newQuoteInput').value.trim();
    if (!v) return;
    cfg().quotes.list.push(v);
    saveTargetedRender(App.applyQuote);
  });
  box.querySelectorAll('[data-act="del-quote"]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var i = parseInt(btn.dataset.idx, 10);
      animateRemove(btn.closest('.set-item'), function () {
        cfg().quotes.list.splice(i, 1);
        saveTargetedRender(App.applyQuote);
      });
    });
  });
}

/* ═══════════════ 音乐与彩蛋 ═══════════════ */
function mediaMusicHTML() {
  var m = cfg().music;
  return '<div class="set-group"><h3>🎵 音乐歌单源</h3>' +
    '<p class="set-group-desc">歌单来自 GitHub 公开仓库，修改后点「重新加载歌单」</p>' +
    '<div class="set-row"><div class="set-label">GitHub 用户名</div>' +
    '<input type="text" data-bind="music.user" value="' + esc(m.user) + '"></div>' +
    '<div class="set-row"><div class="set-label">仓库名</div>' +
    '<input type="text" data-bind="music.repo" value="' + esc(m.repo) + '"></div>' +
    '<div class="set-row"><div class="set-label"></div>' +
    '<button class="set-btn primary" data-act="reload-music">重新加载歌单</button></div></div>';
}
function bindMediaMusic() {
  var box = document.getElementById('settingsContent');
  box.querySelector('[data-act="reload-music"]').addEventListener('click', function () {
    App.saveConfig();
    App.reloadMusic();
    App.showToast('歌单已重新加载');
  });
  bindInputs(box);
}
function mediaEggHTML() {
  var e = cfg().easterEgg;
  return '<div class="set-group"><h3>🧊 彩蛋弹窗</h3>' +
    '<p class="set-group-desc">彩蛋开关在「组件开关」中设置；这里可以换彩蛋图片</p>' +
    '<div class="set-row"><div class="set-label">彩蛋图片链接</div>' +
    '<input type="text" data-bind="easterEgg.image" value="' + esc(e.image) + '"></div>' +
    '<div class="set-row"><div class="set-label"></div>' +
    '<button class="set-btn" data-act="preview-egg">预览彩蛋</button></div></div>';
}
function bindMediaEgg() {
  var box = document.getElementById('settingsContent');
  box.querySelector('[data-act="preview-egg"]').addEventListener('click', function () {
    App.saveConfig();
    document.getElementById('settingsPanel').classList.remove('open');
    App.openEasterEgg();
  });
  bindInputs(box);
}

/* ═══════════════ 数据管理 ═══════════════ */
function dataHTML() {
  var size = 0;
  try { size = (JSON.stringify(cfg()).length / 1024).toFixed(1); } catch (e) { /* 忽略 */ }
  return '<div class="set-group"><h3>💾 配置数据</h3>' +
    '<p class="set-group-desc">当前配置约 ' + size + ' KB，保存在本浏览器 localStorage 中</p>' +
    '<div class="set-row"><div class="set-label">导出配置<div class="set-desc">下载 JSON 文件，可备份或迁移到其他设备</div></div>' +
    '<button class="set-btn primary" data-act="export">⬇ 导出配置</button></div>' +
    '<div class="set-row"><div class="set-label">导入配置<div class="set-desc">选择之前导出的 JSON 文件覆盖当前设置</div></div>' +
    '<button class="set-btn" data-act="import">⬆ 导入配置</button></div>' +
    '<div class="set-row"><div class="set-label">恢复默认设置<div class="set-desc">清空所有自定义，回到初始状态（不可撤销）</div></div>' +
    '<button class="set-btn danger" data-act="reset">🗑 恢复默认</button></div></div>';
}
function bindData() {
  var box = document.getElementById('settingsContent');
  box.querySelector('[data-act="export"]').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify(cfg(), null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    var d = new Date();
    a.href = URL.createObjectURL(blob);
    a.download = 'small3-config-' + d.getFullYear() + (d.getMonth() + 1) + d.getDate() + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
    App.showToast('配置已导出');
  });
  box.querySelector('[data-act="import"]').addEventListener('click', function () {
    document.getElementById('configFileInput').click();
  });
  document.getElementById('configFileInput').onchange = function () {
    var f = this.files[0];
    this.value = '';
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var obj = JSON.parse(reader.result);
        if (!obj || typeof obj !== 'object' || !obj.components) {
          App.showToast('文件格式不正确');
          return;
        }
        var merged = App.mergeConfig(cfg(), obj);
        Object.keys(merged).forEach(function (k) { cfg()[k] = merged[k]; });
        saveTargetedRender(App.applyConfig);
        App.showToast('配置导入成功 ✔');
      } catch (e) {
        App.showToast('导入失败：文件解析错误');
      }
    };
    reader.readAsText(f);
  };
  box.querySelector('[data-act="reset"]').addEventListener('click', function () {
    if (!confirm('确定恢复默认设置吗？所有自定义内容将被清除。')) return;
    App.resetConfig();
    renderSection();
    App.showToast('已恢复默认设置');
  });
}

/* ═══════════════ 导航 / 胶囊事件 ═══════════════ */
document.getElementById('settingsNav').addEventListener('click', function (e) {
  var item = e.target.closest('[data-section]');
  if (!item) return;
  currentSection = item.dataset.section;
  currentFunc[currentSection] = null; /* 切分类回到该分类第一个功能 */
  renderNav();
  renderSection();
});
document.getElementById('settingsContent').addEventListener('click', function (e) {
  var pill = e.target.closest('[data-func]');
  if (!pill) return;
  currentFunc[currentSection] = pill.dataset.func;
  renderSection();
});
