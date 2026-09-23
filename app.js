'use strict';

/* ============================================================
 * FM891 音乐电台 —— 频道配置
 * 想换成你自己的电台？把 url 改成你的直播地址即可，例如：
 *   { id: 'my', name: '我的电台', desc: '自定义频道', url: 'https://xxx.com/live.m3u8' }
 * 支持格式：.mp3 / .aac 直链，以及 .m3u8（HLS，自动加载 hls.js）
 * 注意：网页若部署在 https，直播源也必须是 https，
 *       否则浏览器会以“混合内容”为由拦截播放。
 * ============================================================ */
/* 注：所有频道均已实测可播（浏览器 UA + https）。SomaFM 源已失效（403），勿用。 */
const STATIONS = [
  {
    id: 'fm891',
    name: 'FM891 线上音乐台',
    desc: '华语流行 · 网络电台（蜻蜓FM）',
    url: 'https://lhttp.qtfm.cn/live/20500215/64k.mp3',
  },
  {
    id: 'main',
    name: 'Radio Paradise 主频道',
    desc: '美国 · 全球流行金曲，24 小时不断电',
    url: 'https://stream.radioparadise.com/mp3-192',
  },
  {
    id: 'mellow',
    name: 'Radio Paradise 轻音乐',
    desc: '柔缓轻音乐，适合放松与睡眠',
    url: 'https://stream.radioparadise.com/mellow-192',
  },
  {
    id: 'rock',
    name: 'Radio Paradise 摇滚',
    desc: '经典与独立摇滚连播',
    url: 'https://stream.radioparadise.com/rock-192',
  },
  {
    id: 'global',
    name: 'Radio Paradise 环球',
    desc: '世界各地音乐精选',
    url: 'https://stream.radioparadise.com/global-192',
  },
  {
    id: 'fip',
    name: 'FIP 法国音乐',
    desc: '法国公营台 · 爵士 / 放克 / 世界音乐精选',
    url: 'https://icecast.radiofrance.fr/fip-midfi.mp3',
  },
  {
    id: 'fip-jazz',
    name: 'FIP Jazz 法国爵士',
    desc: '法国公营台 · 精品爵士',
    url: 'https://icecast.radiofrance.fr/fipjazz-midfi.mp3',
  },
  {
    id: 'dance',
    name: 'Dance Wave! 舞曲',
    desc: '电子节拍与深夜舞曲混音',
    url: 'https://dancewave.online/dance.mp3',
  },
  {
    id: 'eu-pop',
    name: 'MANGORADIO',
    desc: '德国电台 · 流行金曲',
    url: 'https://mangoradio.stream.laut.fm/mangoradio',
  },
];

const HLS_LIB = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js';

/* ---------------- 本地存储（兼容禁用 localStorage 的环境） ---------------- */
function safeGet(key) {
  try { return localStorage.getItem(key); } catch (_) { return null; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch (_) { /* 忽略 */ }
}

/* ---------------- 基础元素 ---------------- */
const $ = (id) => document.getElementById(id);
const audio = $('audio');
const playBtn = $('playBtn');
const statusEl = $('status');
const stationNameEl = $('stationName');
const stationDescEl = $('stationDesc');
const stationListEl = $('stationList');
const volumeEl = $('volume');
const toastEl = $('toast');

/* ---------------- 状态 ---------------- */
/* 播放列表 = 默认推荐频道 + 搜索添加的电台 */
let playlist = STATIONS.slice();

let index = Number(safeGet('fm891.index'));
if (!Number.isInteger(index) || index < 0 || index >= playlist.length) index = 0;

let attachedUrl = null;   // 当前 audio 已加载的地址
let hls = null;           // hls.js 实例
let hlsRetried = false;
let shouldPlay = false;   // 用户的播放意图
let retries = 0;          // 失败重连次数
let retryTimer = null;
let toastTimer = null;

const savedVolume = Number(safeGet('fm891.volume'));
audio.volume = Number.isFinite(savedVolume) ? savedVolume : 0.85;
volumeEl.value = String(audio.volume);

const current = () => playlist[index];

/* ---------------- UI 渲染 ---------------- */
function renderStations() {
  stationListEl.innerHTML = '';
  playlist.forEach((s, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'station' + (i === index ? ' active' : '');
    btn.innerHTML =
      '<span class="dot"></span>' +
      '<span class="info"><b></b><small></small></span>' +
      '<span class="tag">播出中</span>';
    btn.querySelector('b').textContent = s.name;
    btn.querySelector('small').textContent = s.desc;
    btn.addEventListener('click', () => selectStation(i, true));
    stationListEl.appendChild(btn);
  });
}

function updateNowPlaying() {
  const s = current();
  stationNameEl.textContent = s.name;
  stationDescEl.textContent = s.desc;
  document.title = s.name;
  nowTitle = '';
  const nt = $('nowTitle');
  if (nt) nt.textContent = '';
  if (window.AndroidIcy) {
    try { window.AndroidIcy.station(s.name); } catch (_) { /* 忽略 */ }
  }
  updateMediaSession();
}

function updatePlayUI() {
  const playing = !audio.paused && shouldPlay;
  document.body.classList.toggle('playing', playing);
  playBtn.classList.toggle('is-playing', playing);
  playBtn.setAttribute('aria-label', playing ? '暂停' : '播放');
  $('liveDot').hidden = !playing;
  if ('mediaSession' in navigator) {
    try { navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'; } catch (_) { /* 忽略 */ }
  }
  if (playing && statusEl.dataset.kind !== 'loading') {
    setStatus('live', '直播中');
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

function detach() {
  if (hls) {
    try { hls.destroy(); } catch (_) { /* 忽略 */ }
    hls = null;
  }
  if (attachedUrl) {
    audio.removeAttribute('src');
    try { audio.load(); } catch (_) { /* 忽略 */ }
  }
  attachedUrl = null;
}

async function attach(url) {
  if (attachedUrl === url) return;
  detach();

  const isHls = /\.m3u8(\?|#|$)/i.test(url);

  if (isHls) {
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

  audio.src = url;
  attachedUrl = url;
}

/* ---------------- 播放控制 ---------------- */
async function play() {
  shouldPlay = true;
  retries = 0;
  clearTimeout(retryTimer);
  try {
    await attach(current().url);
    await audio.play();
    if (window.AndroidIcy) {
      try { window.AndroidIcy.start(current().url); } catch (_) { /* 忽略 */ }
    }
  } catch (_) {
    shouldPlay = false;
    updatePlayUI();
    setStatus('', '点击播放开始收听');
    toast('播放失败：请检查网络，或在 app.js 中更换直播地址');
    if (window.AndroidIcy) {
      try { window.AndroidIcy.stop(); } catch (_) { /* 忽略 */ }
    }
  }
}

function pause() {
  shouldPlay = false;
  clearTimeout(retryTimer);
  audio.pause();
  if (window.AndroidIcy) {
    try { window.AndroidIcy.stop(); } catch (_) { /* 忽略 */ }
  }
}

function togglePlay() {
  if (shouldPlay && !audio.paused) pause();
  else play();
}

async function selectStation(i, autoplay) {
  const changed = i !== index;
  index = i;
  safeSet('fm891.index', String(index));
  renderStations();
  updateNowPlaying();

  if (changed) {
    setStatus('loading', '连接中…');
    retries = 0;
    clearTimeout(retryTimer);
    detach();
  }

  if (autoplay) {
    await play();
  } else if (changed) {
    setStatus('', '点击播放开始收听');
    updatePlayUI();
  }
}

function step(delta) {
  const next = (index + delta + playlist.length) % playlist.length;
  selectStation(next, true);
}

/* ---------------- 错误与自动重连 ---------------- */
function handleStreamError() {
  if (!shouldPlay) return;

  if (retries < 5) {
    retries += 1;
    setStatus('loading', '重连中 ' + retries + '/5 …');
    retryTimer = setTimeout(async () => {
      if (!shouldPlay) return;
      const url = current().url;
      const bust = url + (url.includes('?') ? '&' : '?') + 'r=' + Date.now();
      detach();
      try {
        await attach(bust);
        await audio.play();
      } catch (_) {
        handleStreamError();
      }
    }, 2500 * retries);
    return;
  }

  shouldPlay = false;
  retries = 0;
  updatePlayUI();
  setStatus('error', '连接失败 · 点按重试');
  toast('直播连接失败：可能是网络问题或地址已失效');
}

/* ---------------- 锁屏 / 蓝牙控制 ---------------- */
/* 当前曲目：APK 原生层直连直播流解析 ICY 元数据后回调（网页版无此桥接，自动跳过） */
let nowTitle = '';

function updateMediaSession() {
  if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
  const s = current();
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: nowTitle || s.name,
      artist: nowTitle ? s.name : s.desc,
      album: nowTitle ? 'FM891 音乐电台 · ' + s.name : 'FM891 音乐电台',
      artwork: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    });
    navigator.mediaSession.setActionHandler('play', () => play());
    navigator.mediaSession.setActionHandler('pause', () => pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => step(-1));
    navigator.mediaSession.setActionHandler('nexttrack', () => step(1));
  } catch (_) {
    /* 部分浏览器不支持某个 action，忽略 */
  }
}

window.__onIcyTitle = function (title) {
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

/* 锁屏通知的播放/暂停按钮 → 原生 MediaSession 回调进入这里 */
window.__svcResume = function () { play(); };
window.__svcPause = function () { pause(); };

/* ---------------- 事件绑定 ---------------- */
playBtn.addEventListener('click', togglePlay);
$('prevBtn').addEventListener('click', () => step(-1));
$('nextBtn').addEventListener('click', () => step(1));

volumeEl.addEventListener('input', () => {
  audio.volume = Number(volumeEl.value);
  safeSet('fm891.volume', String(audio.volume));
});

/* 卡死看门狗：缓冲超过 20 秒无进展 → 强制重连（治"断流卡住不报错"） */
let stallTimer = null;

function armStallWatchdog() {
  clearTimeout(stallTimer);
  stallTimer = setTimeout(() => {
    if (!shouldPlay) return;
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

audio.addEventListener('playing', () => {
  retries = 0;
  disarmStallWatchdog();
  setStatus('live', '直播中');
  updatePlayUI();
  icyYield(false);
});

audio.addEventListener('pause', () => {
  disarmStallWatchdog();
  updatePlayUI();
  if (shouldPlay) setStatus('loading', '缓冲中…');
  else setStatus('', '已暂停');
});

audio.addEventListener('waiting', () => {
  if (shouldPlay) {
    setStatus('loading', '缓冲中…');
    armStallWatchdog();
    icyYield(true);
  }
});

audio.addEventListener('error', () => {
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

/* ---------------- 启动 ---------------- */
renderStations();
updateNowPlaying();
setStatus('', '点击播放开始收听');
updatePlayUI();

/* ---------------- Service Worker（网页版自动热更新） ---------------- */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* 部分环境（如 http 局域网访问）不支持 SW，忽略即可 */
    });
  });

  // 新版 SW 接管后自动刷新拿新资源；正在听歌时推迟到暂停再刷，避免断播
  let hadController = !!navigator.serviceWorker.controller;
  let swUpdatePending = false;
  function doSwReload() {
    if (window.__swReloaded) return;
    window.__swReloaded = true;
    location.reload();
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return; } // 首次安装的 claim 不触发
    if (audio.paused || !shouldPlay) doSwReload();
    else swUpdatePending = true;
  });
  audio.addEventListener('pause', () => {
    if (swUpdatePending && !window.__swReloaded) setTimeout(doSwReload, 400);
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

const UPDATE_REPO = '846515182/FM891-Radio'; // 公开仓库，App 内免登录访问
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
  return '1.3'; // 网页版：与 manifest versionName 同步维护
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
