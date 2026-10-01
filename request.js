/* 拾光电台 FM89.1 — 在线点歌（纯点播版，电台台单已下架）
 * ============================================================================
 * 【这一版做什么】
 *  1. 多人同步点歌队列：每个客户端把自己看到的**全量**队列 retain 到
 *     fm891-radio/q/<cid>，同时订阅 fm891-radio/q/#，收到别人的快照后按
 *     条目 id 做并集合并。没有中心服务，但所有在线客户端会收敛到同一份
 *     队列；条目一旦被任何在线客户端复制进快照，提出者下线也不会丢歌。
 *     条目新增 to（送给谁）/ msg（祝福语）两个字段，云端会朗读播报。
 *  2. 云端找歌（**全在服务器主程序里**）：点歌后云端先查歌曲仓库，命中
 *     直接出片；没有才走电报下载。找歌/下载/转码/合成播报的实时进度走
 *     fm891-radio/p/<id>，标签按进度改写。
 *  3. 主播气泡：事件驱动的打字机播报。
 *  4. 音源 ready：fm891-radio/r/<id> 的 retain 里带「播报+歌」成片，
 *     点条目走 __radio.playVod() 播单曲。
 *  5. **云同步开播**：fm891-radio/air（retain）= 服务器此刻在放的歌，带
 *     startedAt；app.js 收到后对齐进度自动跟播 —— 所有人同一时刻听同一段，
 *     像真电台。AI 播报（谁点的、送给谁、祝福语）已拼在音频开头。
 *
 * 【隔离原则】
 *  本模块只通过 window.__radio 碰播放，入口只有 playVod（单曲/跟播都走它）。
 *  绝不直接操作 audio、不碰 playToken / switchUntil / 重连体系（v1.15 刚
 *  修完的换源防护）。整体 try/catch 降级，本模块挂了不影响播放器本身 ——
 *  但降级要 console.error 喊一声，静默兜底会把 ReferenceError 这类真 bug
 *  变成「点歌台悄悄没了」，日志里一个字都查不到。
 */
(function requestStation() {
  try {
    if (typeof mqtt === 'undefined') return;
    const R = window.__radio;
    // v1.19 电台化：点即播（playVod）退场，点歌台只经 onAir 参与播放
    if (!R || typeof R.onAir !== 'function') return;

    // 关窗后异步链（自动开播/打字机）可能还在跑：document 没了要给 null，不许抛
    const $ = (id) => (typeof document !== 'undefined' && document ? document.getElementById(id) : null);

    /* ---------------- 常量 ---------------- */
    const Q_NS = 'fm891-radio/q';
    const BROKERS = [
      'wss://broker.emqx.io:8084/mqtt',
      'wss://test.mosquitto.org:8081/mqtt',
    ];
    const SNAP_EVERY = 30000;    // 周期性重发快照：晚加入的人靠 retain 一次拿全
    const GC_TOMB = 20 * 60000;  // 墓碑保留 20 分钟（够慢速的对端收到）
    const MAX_ITEMS = 40;        // 队列上限，超出淘汰最老的
    const MIN_GAP = 3000;        // 本地点歌冷却，防手抖连点
    /* 「歌已备好」的音源广播：阶段 2 的 worker 找到并下好歌后往这里发 retain。
     * 阶段 1 没有 worker，这条路径是**空的** —— 存在它不会改变现在的任何行为。 */
    const READY_NS = 'fm891-radio/r';
    const MAX_READY = 40;        // 备好的音源条数上限，和队列同量级
    const READY_FRESH = 10 * 60000;  // 超过 10 分钟的不再播报（重连回放会成堆）
    /* 阶段 2 的实时进度：worker 把「找歌 / 下载 / 转码」写进这个频道。
     * 没有它的时候，点歌到出声之间 5~8 分钟里条目只能显示「主播找歌中…」，
     * 而且阶段 1 的 2.5 分钟硬截止会先把它判成「暂无电台在放」，气泡还念
     * 一句「全网电台这会儿都没在放」—— 用户眼看着 App 说没戏，其实歌正
     * 下到一半。这就是那次「乱七八糟」的来处。 */
    const PROG_NS = 'fm891-radio/p';
    const PROG_FRESH = 6 * 60000;   // 进度 6 分钟没更新就不采信（worker 挂了/转码极慢）
    const MAX_PROG = 60;
    const prog = new Map();         // id -> {stage, done, total, eta, ts}
    /* 云同步开播：服务器 retain 的「此刻在放」，带 startedAt 对齐所有人进度 */
    const AIR_NS = 'fm891-radio/air';

    /* ---------------- 主播气泡（打字机 + 播报队列） ---------------- */
    const djText = $('djText');
    let sayQueue = [];
    let sayTimer = null;

    /* 打字机：逐字上屏，带 3.5 秒后自动轮到下一条。多条播报排队出，避免
     * 「点了三首歌只看见最后一条」。 */
    function say(text) {
      if (!text) return;
      sayQueue.push(String(text));
      if (!sayTimer) nextSay();
    }
    function nextSay() {
      const text = sayQueue.shift();
      if (text === undefined) { sayTimer = null; return; }
      if (!djText) { sayTimer = setTimeout(nextSay, 1200); return; }
      let i = 0;
      djText.classList.add('typing');
      clearInterval(sayTimer);
      sayTimer = setInterval(() => {
        i += 1;
        djText.textContent = text.slice(0, i);
        if (i >= text.length) {
          clearInterval(sayTimer);
          djText.classList.remove('typing');
          sayTimer = setTimeout(() => { sayTimer = null; nextSay(); }, 3500);
        }
      }, 45);
    }

    /* ---------------- 队列模型 ----------------
     * key = 条目 id（提出者 cid + 序号），value = 条目。
     * 合并规则：同 id 取 ver 大者。每次本地变更 ver+1 并重发快照，
     * 因此「谁的更新谁赢」，不需要中心仲裁。 */
    const items = new Map();
    /* 「歌已备好」的音源表，与队列分开存：队列是「大家点什么」，这张表是
     * 「哪首真的能播了」。两者来源不同、更新节奏不同，混进 items 会被
     * 快照合并互相盖掉 —— 音源丢了就等于歌白点。 */
    const ready = new Map();
    let lastReadySay = 0;
    /* 槽位序号必须**跨启动单调递增**（localStorage 持久化）。
     * 服务器按「这个 id 是不是已经就绪」判断一单办完没有，而 id = cid+序号：
     * 序号每次启动归零的话，重启后第一次点歌必然复用上一首用过的 `-1`，
     * 那个 id 上挂着旧歌的就绪记录 —— 新请求会被当成「早办完了」静默丢弃，
     * 界面永远停在「找歌中」（2026-09-30 真实故障：点了《小薇》一直没播）。
     * 每次出号前**都重读一遍** localStorage：自家 q/<cid> 的回放是有意忽略的
     * （重启不恢复条目、下线靠 LWT 清快照），这里就是恢复序号的唯一路径；
     * 出号时重读还能顺带认下别的标签页刚写进去的更大的号。 */
    let mySeq = 0;

    function nextSeq() {
      let n = 0;
      try { n = parseInt(localStorage.getItem('fm891-seq') || '0', 10) || 0; } catch (_) { n = 0; }
      if (n > mySeq) mySeq = n;      // 跨会话 / 跨标签页：认更大的号，绝不回退
      mySeq += 1;
      try { localStorage.setItem('fm891-seq', String(mySeq)); } catch (_) { /* 忽略 */ }
      return mySeq;
    }
    let lastSnap = '';          // 上次发布内容的指纹，用于打破合并回环
    let lastAddAt = 0;
    let synced = false;         // MQTT 是否已连上（决定气泡提示口径）

    function fingerprint() {
      const arr = [];
      items.forEach((it) => arr.push(it));
      arr.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
      return JSON.stringify(arr);
    }

    /* 清理：过期墓碑直接删；超限的最老条目写成墓碑（ver+1 才能盖过对端
     * 手里那份活的）。**必须在 publish 之前跑**，否则淘汰结果发不出去，
     * 对端过一会儿又把那条活的同步回来 —— v1 里这里就踩过。 */
    function prune() {
      const now = Date.now();
      let changed = false;
      items.forEach((it) => {
        if (it.del && now - it.del > GC_TOMB) { items.delete(it.id); }
      });
      const live = [];
      items.forEach((it) => { if (!it.del) live.push(it); });
      if (live.length > MAX_ITEMS) {
        live.sort((a, b) => a.ts - b.ts);
        live.slice(0, live.length - MAX_ITEMS).forEach((it) => {
          it.ver += 1;
          it.del = now;
          changed = true;
        });
      }
      return changed;
    }

    /* 纯读：新点的排前面。不许有副作用 —— 渲染会被高频调用。 */
    function visible() {
      const out = [];
      items.forEach((it) => { if (!it.del) out.push(it); });
      out.sort((a, b) => b.ts - a.ts);
      return out;
    }

    /* 收到一份对端快照 → 并集合并。返回是否真的发生了变化（用来决定要不要
     * 回发自己这份：条目必须被复制到**每个**在线客户端的快照里，提出者
     * 下线（LWT 清掉他的 retain）才不会连歌一起丢）。
     *
     * 不需要「跳过自己 cid」的特判：同 id 若本地 ver 更高或相等，下面的
     * `cur.ver >= ver` 会直接跳过，回环到此为止 —— 靠版本比较自然收敛。 */
    function merge(list) {
      let changed = false;
      if (!Array.isArray(list)) return false;
      for (let i = 0; i < list.length; i++) {
        const it = list[i];
        if (!it || typeof it !== 'object') continue;
        const id = typeof it.id === 'string' ? it.id : '';
        const title = typeof it.title === 'string' ? it.title.slice(0, 30) : '';
        if (!id || !title) continue;            // schema 不合格的一律丢弃
        const cur = items.get(id);
        const ver = Number(it.ver) || 0;
        if (cur && cur.ver >= ver) continue;
        const next = {
          id: id,
          cid: typeof it.cid === 'string' ? it.cid.slice(0, 40) : '',
          who: typeof it.who === 'string' ? it.who.slice(0, 16) : '听友',
          to: typeof it.to === 'string' ? it.to.slice(0, 16) : '',
          msg: typeof it.msg === 'string' ? it.msg.slice(0, 60) : '',
          title: title,
          ts: Number(it.ts) || Date.now(),
          ver: ver,
          st: ['waiting', 'searching', 'ready', 'playing', 'miss'].indexOf(it.st) >= 0
            ? it.st : 'waiting',
          gi: Number(it.gi) >= 0 ? Number(it.gi) : -1,
          stn: typeof it.stn === 'string' ? it.stn.slice(0, 40) : '',
          np: typeof it.np === 'string' ? it.np.slice(0, 60) : '',
          scanAt: Number(it.scanAt) || 0,
          del: Number(it.del) || 0,
          mine: false,
        };
        items.set(id, next);
        changed = true;
      }
      return changed;
    }

    /* ---------------- 点歌 ---------------- */
    function addRequest(title, to, msg) {
      const t = String(title || '').trim().slice(0, 30);
      if (!t) { R.toast('先输入歌名'); return; }
      const now = Date.now();
      if (now - lastAddAt < MIN_GAP) { R.toast('点太快啦，缓一缓～'); return; }
      lastAddAt = now;

      // 同一首还在队列里就别重复点（不同人点同一首 = 跟唱，允许）
      let dup = false;
      items.forEach((it) => {
        if (!it.del && it.mine && norm(it.title) === norm(t)) dup = true;
      });
      if (dup) { R.toast('你已经点过《' + t + '》啦'); return; }

      const sTo = String(to || '').trim().slice(0, 16);
      const sMsg = String(msg || '').trim().slice(0, 60);
      const it = {
        id: myId + '-' + nextSeq(),
        cid: myId,
        who: myName(),
        to: sTo,
        msg: sMsg,
        title: t,
        ts: now,
        ver: 1,
        st: 'searching',
        gi: -1,
        stn: '',
        np: '',
        scanAt: now,
        del: 0,
        mine: true,
      };
      items.set(it.id, it);
      prune();      // 先淘汰超限的再发，否则淘汰结果发不出去，对端一会儿又同步回来
      publish();
      render();
      // 电台台单已下架：找歌全部交给云端主程序（先查仓库，没有再电报下载）。
      // 客户端不再自己扫台 —— 进度与结果都从 p/* 和 r/* 频道来。
      say('收到 ' + it.who + ' 点的《' + t + '》' +
        (sTo ? '，送给 ' + sTo : '') + '，云端主播马上安排 🎵');
    }

    /* 归一化：配对「歌名」用（服务端仓库键 norm_key 同款规则） */
    function norm(s) {
      return String(s || '')
        .toLowerCase()
        .replace(/[（(\[【][^）)\]】]*[)）\]】]/g, '')  // 去 (Live)、【高清】这类注记
        .replace(/[^0-9a-z\u4e00-\u9fa5]+/g, '');       // 其余非中英数字全部剔除
    }

    /* （电台台单已下架：score / fetchNp / scan / hit / miss 随台单一并移除。
     *   找歌全部由云端主程序完成 —— 先查歌曲仓库，没有再电报下载；
     *   客户端只订阅进度 p/* 与音源 r/*，不再自己拉 nowplaying。） */

    /* ---------------- 云端进度 ---------------- */
    /* 云端在 search/download/transcode/merge 四阶段各发一条 retain；
     * 空载荷表示出结果了。 */
    function onProg(msg) {
      if (!msg || typeof msg !== 'object') return false;
      const id = typeof msg.id === 'string' ? msg.id : '';
      if (!id) return false;
      if (!msg.stage) { prog.delete(id); return true; }
      /* miss（云端没找到）也在白名单里：以前这一档不在，未知 stage 一律被当成
       * search，服务器如实报了「没找到」客户端照样显示「找歌中」—— 用户只
       * 知道自己点的歌永远在找，不知道是找不到、也不知道能换一首。 */
      const stages = ['search', 'download', 'transcode', 'merge', 'miss', 'cands'];
      const stage = stages.indexOf(msg.stage) >= 0 ? msg.stage : 'search';
      const rec = {
        stage: stage,
        done: Math.max(0, Number(msg.done) || 0),
        total: Math.max(0, Number(msg.total) || 0),
        eta: Math.max(0, Number(msg.eta) || 0),
        ts: Number(msg.ts) || Date.now(),
      };
      /* 候选版本（服务器把 bot 那一页原样下发）。挂到条目上，渲染时列出来
       * 让用户点 —— 机器猜不准哪条是原唱，那就让用户自己挑。 */
      if (Array.isArray(msg.cands)) {
        rec.cands = msg.cands
          .filter((c) => c && c.n)
          .slice(0, 8)
          .map((c) => ({ n: String(c.n), t: String(c.t || '').slice(0, 40), best: !!c.best }));
      }
      prog.set(id, rec);
      /* 候选挂到条目上（渲染要用）。挂完重画一次，列表里立刻能点版本。 */
      if (rec.cands && rec.cands.length > 1) {
        const ci = items.get(id);
        if (ci) {
          const sig = rec.cands.map((c) => c.n + ':' + c.t).join('|');
          if (String(ci.candsSig || '') !== sig) {
            ci.cands = rec.cands;
            ci.candsSig = sig;
            render();
          }
        }
      }
      /* 「没找到」是**结论**不是进度：进度只有 6 分钟新鲜度，过了就退回
       * 「云端还在找」。所以它要落进条目自己的状态里，才留得住。 */
      if (stage === 'miss') {
        const hit = items.get(id);
        if (hit && hit.st !== 'miss') {
          hit.st = 'miss';
          hit.ver = (hit.ver || 0) + 1;
          render();
        }
      }
      if (prog.size > MAX_PROG) {
        const arr = [];
        prog.forEach((v, k) => arr.push([k, v]));
        arr.sort((a, b) => a[1].ts - b[1].ts);
        for (let i = 0; i < arr.length - MAX_PROG; i++) prog.delete(arr[i][0]);
      }
      return true;
    }

    /* 陈旧 retain 不许再自称「下载中」：worker 中途挂掉后那条进度会一直留着，
     * 没有这道闸，用户会对着一条死掉的进度条等到天荒地老。 */
    function freshProg(id) {
      const p = id ? prog.get(id) : null;
      if (!p) return null;
      if (Date.now() - p.ts > PROG_FRESH) { prog.delete(id); return null; }
      return p;
    }

    /* worker 出结果了（发布 ready / 放弃 / 转码失败 / 异常）—— 撤掉进度。
     * 返回是否真的删了东西，让调用方决定要不要重渲染。 */
    function clearProg(id) {
      if (!id || !prog.has(id)) return false;
      prog.delete(id);
      return true;
    }

    function progLabel(p) {
      if (p.stage === 'cands') return { text: '选一个版本 ↓', cls: 'st-search' };
      if (p.stage === 'miss') return { text: '没找到这首歌 · 换一首吧', cls: 'st-miss' };
      if (p.stage === 'merge') return { text: '云端合成播报中…', cls: 'st-search' };
      if (p.stage === 'transcode') return { text: '转码中… 马上就好', cls: 'st-search' };
      if (p.stage !== 'download' || !p.total) return { text: '全网找歌中…', cls: 'st-search' };
      const mb = 1048576;
      const done = Math.min(Math.round(p.done / mb), Math.round(p.total / mb));
      let t = '下载中 ' + done + '/' + Math.round(p.total / mb) + ' MB';
      if (p.eta > 0 && p.eta < 3600) {
        t += ' · 约 ' + (p.eta < 60 ? p.eta + ' 秒' : Math.ceil(p.eta / 60) + ' 分钟');
      }
      return { text: t, cls: 'st-search' };
    }

    /* ---------------- 歌已备好（阶段 2 的落点） ---------------- */
    /* worker 找到歌并下好音源后发一条 retain，这里挂到对应的点歌条目上。
     * 电台化之后（v1.19）它不再意味着「可以点了」，而是「已入库、等轮播」——
     * 位次标签（第 N 位）照常展示，轮到就由云开播自动放。 */
    function onReady(msg) {
      if (!msg || typeof msg !== 'object') return false;
      const id = typeof msg.id === 'string' ? msg.id : '';
      const title = typeof msg.title === 'string' ? msg.title.slice(0, 30) : '';
      const url = typeof msg.url === 'string' ? msg.url : '';
      // schema 不合格的一律丢弃：音源地址是能直接拉起播放的东西，
      // 宁可不认，也不能让脏数据把播放器带去随便一个地方
      if (!id || !title || !/^https?:\/\//i.test(url)) return false;
      const dur = Number(msg.dur) || 0;
      if (dur && (dur < 1 || dur > 6 * 3600)) return false;
      const ver = Number(msg.ver) || 0;
      const ts = Number(msg.ts) || Date.now();
      const cur = ready.get(id);
      if (cur && cur.ver >= ver) return false;   // 同 id 取 ver 大者，断回环
      const entry = {
        id: id, url: url, dur: dur, ts: ts, ver: ver,
        title: title,
        from: typeof msg.from === 'string' ? msg.from.slice(0, 16) : '',
        to: typeof msg.to === 'string' ? msg.to.slice(0, 16) : '',
        ann: typeof msg.ann === 'string' ? msg.ann.slice(0, 80) : '',
      };
      ready.set(id, entry);
      pruneReady();
      const it = findItem(id, title);
      if (it) announceReady(it, entry);
      return true;
    }

    function pruneReady() {
      if (ready.size <= MAX_READY) return;
      const arr = [];
      ready.forEach((v, k) => arr.push([k, v]));
      arr.sort((a, b) => a[1].ts - b[1].ts);
      for (let i = 0; i < arr.length - MAX_READY; i++) ready.delete(arr[i][0]);
    }

    /* 这条点歌有没有直供音源：先按 id（worker 抄的就是原始 id），
     * 再按歌名精确匹配兜底（worker 若用了自己的 id 才认得出来）。 */
    function vodFor(it) {
      if (!it || it.del) return null;
      const direct = ready.get(it.id);
      if (direct) return direct;
      const a = norm(it.title);
      if (!a) return null;
      let out = null;
      ready.forEach((v) => { if (!out && norm(v.title) === a) out = v; });
      return out;
    }

    function findItem(id, title) {
      if (id && items.has(id)) return items.get(id);   // 主路径：worker 抄的就是这个 id
      const a = norm(title);                            // 兜底：worker 用了自己的 id
      if (!a) return null;
      let out = null;
      items.forEach((it) => { if (!out && !it.del && norm(it.title) === a) out = it; });
      return out;
    }

    /* 播报克制三道闸：老消息不翻旧账、播报不连珠炮、气泡不排长队。
     * 重连/刷新会把 retain 的备好消息**整批回放**，不设闸的话用户一开 App
     * 就对着十几条念完为止的气泡。 */
    function announceReady(it, e) {
      const now = Date.now();
      if (e.ts && now - e.ts > READY_FRESH) return;
      if (sayQueue.length >= 2) return;
      if (now - lastReadySay < 4000) return;
      lastReadySay = now;
      say('《' + it.title + '》备好了，马上轮到它 🎵');
    }

    /* ---------------- 云同步开播 ---------------- */
    /* 服务器 retain 的「此刻在放」：校验后交给 app.js 的 onAir ——
     * 正在跟播的人自动切到下一首，没在听的人露出「一起听」条。 */
    let airState = null;

    /* 服务器随 air 一起发的「接下来 N 首」（最多 5 首）。逐条校验：脏数据只丢
     * 自己那一条，不整包不带 —— onAirMsg 是白名单式校验，字段没显式放行就
     * 被吃掉，客户端歌单会永远空白（v1.20.2 第一版就踩了这个坑）。 */
    function normNext(arr) {
      if (!Array.isArray(arr)) return [];
      const out = [];
      for (const it of arr.slice(0, 5)) {
        if (!it || typeof it !== 'object') continue;
        const title = typeof it.title === 'string' ? it.title.trim().slice(0, 40) : '';
        if (!title) continue;
        out.push({
          id: typeof it.id === 'string' ? it.id.slice(0, 60) : '',
          title: title,
          artist: typeof it.artist === 'string' ? it.artist.slice(0, 24) : '',
          dur: Math.max(0, Number(it.dur) || 0),
          who: typeof it.who === 'string' ? it.who.slice(0, 16) : '',
          lib: !!it.lib,
        });
      }
      return out;
    }

    function onAirMsg(j) {
      if (!j || typeof j !== 'object') return false;
      const id = typeof j.id === 'string' ? j.id : '';
      const url = typeof j.url === 'string' ? j.url : '';
      const startedAt = Number(j.startedAt) || 0;
      // 音源地址是能直接拉起播放的东西，schema 不合格一律丢弃
      if (!id || !/^https?:\/\//i.test(url) || !startedAt) return false;
      const dur = Number(j.dur) || 0;
      if (dur && (dur < 1 || dur > 6 * 3600)) return false;
      airState = {
        id: id, url: url, dur: dur, startedAt: startedAt,
        ver: Number(j.ver) || 0,
        title: typeof j.title === 'string' ? j.title.slice(0, 60) : '',
        from: typeof j.from === 'string' ? j.from.slice(0, 16) : '',
        to: typeof j.to === 'string' ? j.to.slice(0, 16) : '',
        artist: typeof j.artist === 'string' ? j.artist.slice(0, 40) : '',
        // 台词是「点播归属+歌曲背景」的分层长句，80 字会截掉后半句
        ann: typeof j.ann === 'string' ? j.ann.slice(0, 240) : '',
        next: normNext(j.next),      // 「接下来」歌单（客户端那栏就靠它）
      };
      ensureCatalog();   // 音源地址到位 → 顺手拉曲库（联想/AI 祝福/速点要用）
      render();          // 「正在播」标签跟着换条目
      if (typeof R.onAir === 'function') {
        try { R.onAir(airState); } catch (_) { /* app 挂了不拖累点歌台 */ }
      }
      return true;
    }

    /* ---------------- MQTT 同步 ---------------- */
    let client = null;
    let brokerIdx = 0;
    let myTopic = '';
    let snapTimer = null;

    /* 用户挑版本：把编号写回条目并发布。服务器那边 find_and_download 正在
     * 等这个字段（见服务端 PICK_WAIT），所以点了哪条就下哪条；没人点就按推荐。 */
    function pickVersion(it, n) {
      if (!it || !n) return;
      const num = String(n);
      if (String(it.pick || '') === num) return;
      it.pick = num;
      it.ver = (it.ver || 0) + 1;      // ver 必须涨，否则对端手里那份会盖回来
      publish(true);
      render();
      say('好，就下第 ' + num + ' 版');
    }

    function publish(force) {
      const fp = fingerprint();
      // 内容没变就不回发：否则 A 发 → B 合并 → B 发 → A 再合并 …会打乒乓。
      // 连接建立/重连时 force=true，把本地这份（含从对端收回来的条目）补发
      // 出去，晚加入的人靠 retain 一次拿全。
      if (!force && fp === lastSnap) return;
      lastSnap = fp;
      if (!client || !myTopic) return;
      const arr = [];
      items.forEach((it) => arr.push(it));
      try {
        client.publish(myTopic, JSON.stringify(arr), { retain: true, qos: 0 });
      } catch (_) { /* 发失败下个周期会补 */ }
    }

    function connect() {
      let c;
      try {
        c = mqtt.connect(BROKERS[brokerIdx], {
          // 必须与 presence 那条连接（裸 myId）区分开：MQTT 规范里同 clientId
          // 的第二条连接会把第一条**踢下线**，在线人数和点歌就会互相踢到抖动。
          // 身份仍是同一个 fm891-cid，只是连接标识加后缀。
          clientId: myId + '-q',
          keepalive: 30,
          reconnectPeriod: 5000,
          connectTimeout: 8000,
          clean: true,
          will: { topic: myTopic, payload: '', retain: true, qos: 0 },
        });
      } catch (_) { nextBroker(); return; }
      const me = c;
      client = c;
      const guard = setTimeout(() => {
        if (client === me && !synced) nextBroker();
      }, 9000);

      c.on('connect', () => {
        if (client !== me) return;
        clearTimeout(guard);
        synced = true;
        try { c.subscribe(Q_NS + '/#', { qos: 0 }); } catch (_) { /* 忽略 */ }
        try { c.subscribe(READY_NS + '/#', { qos: 0 }); } catch (_) { /* 忽略 */ }
        try { c.subscribe(PROG_NS + '/#', { qos: 0 }); } catch (_) { /* 忽略 */ }
        try { c.subscribe(AIR_NS, { qos: 0 }); } catch (_) { /* 忽略 */ }
        publish(true);
        render();
        say('点歌台已上线，全网听友的点歌会同步到这里');
      });
      c.on('message', (topic, payload) => {
        if (client !== me || topic === myTopic) return;
        const raw = payload ? payload.toString() : '';
        /* 进度频道单独走，且必须排在下面那条通用规则**前面**：
         * worker 出结果时会发一条空载荷来清进度（clear_prog），而通用规则
         * 把空载荷当成「对端下线」直接 return —— 排在后面的话清理永远到不了，
         * 用户会对一条死掉的「下载中」看到底。id 从 topic 尾段取，不靠载荷。 */
        if (topic.indexOf(PROG_NS + '/') === 0) {
          if (!raw) { if (clearProg(topic.slice(PROG_NS.length + 1))) render(); return; }
          let g = null;
          try { g = JSON.parse(raw); } catch (_) { return; }   // 脏载荷直接丢，不清进度
          if (onProg(g)) render();
          return;
        }
        let j = null;
        try { j = JSON.parse(raw); } catch (_) { return; }
        // 空载荷 = 对端下线（LWT）。它的条目早已被我们合并进本地，不会丢。
        if (!j) { return; }
        if (Array.isArray(j)) {
          if (merge(j)) { prune(); publish(); render(); }
          return;
        }
        // 对象载荷 = 某首歌的音源备好了（队列快照是数组，两者天然可分）
        if (topic.indexOf(READY_NS + '/') === 0 && onReady(j)) render();
        // 云开播（retain 的「此刻在放」，单主题不是子树）
        if (topic === AIR_NS) onAirMsg(j);
      });
      c.on('error', () => { /* 静默，交给重连/换线 */ });
      c.on('close', () => { if (client === me) { synced = false; render(); } });
    }

    function nextBroker() {
      if (client) { try { client.end(true); } catch (_) { /* 忽略 */ } client = null; }
      synced = false;
      brokerIdx += 1;
      if (brokerIdx >= BROKERS.length) {
        brokerIdx = 0;
        render();
        say('点歌台线路不稳，当前为本机点歌（不同步）');
        setTimeout(connect, 45000);
        return;
      }
      connect();
    }

    /* ---------------- 渲染 ---------------- */
    const reqList = $('reqList');
    const reqHint = $('reqHint');

    function stLabel(it, i) {
      // 云开播正放到这条 → 正在播（air 的 id 就是点播条目的 id）
      if (airState && airState.id === it.id) return { text: '正在播', cls: 'st-play' };
      // 音源已入库 → 电台按队列轮播，位次就是「什么时候轮到你」；
      // 它优先于一切「找歌中/没找到」的旧状态（歌都备好了还喊没找到=撒谎）
      if (vodFor(it)) return { text: '第 ' + (i + 1) + ' 位', cls: 'st-wait' };
      // 云端进度（找歌/下载/转码/合成）比本地任何结论都新
      const p = freshProg(it.id);
      if (p && (it.st === 'searching' || it.st === 'miss')) return progLabel(p);
      // 卡死检测：发起者可能已下线，searching 太久别一直装作在找
      // （云端给每首 10 分钟的找歌窗口，超过这个量级才说没找到）
      if (it.st === 'searching' && it.scanAt && Date.now() - it.scanAt > 10 * 60000) {
        return { text: '云端还在找 · 请稍候', cls: 'st-miss' };
      }
      switch (it.st) {
        case 'searching': return { text: '云端找歌中…', cls: 'st-search' };
        case 'miss': return { text: '没找到这首歌 · 换一首吧', cls: 'st-miss' };
        // 电台化：没有「点一下立刻播」了，条目就是队列 —— 第几位 ≈ 什么时候轮到
        default: return { text: '第 ' + (i + 1) + ' 位', cls: 'st-wait' };
      }
    }

    function render() {
      // 关窗 / 文档不可用时直接退出：本模块的原则是「任何情况下都不许抛」，
      // 扫描的 await 链可能在窗口关闭后才 resume 并走到这里。
      if (!reqList || typeof document === 'undefined' || !document) return;
      const list = visible();
      const frag = document.createDocumentFragment();
      list.forEach((it, i) => {
        const li = document.createElement('li');
        li.className = 'req-item';
        if (it.cid && it.cid === myId) li.classList.add('mine');   // 自己点的标出来
        const lab = stLabel(it, i);
        /* 电台化：条目是队列，不再「点一下立刻播」—— 排进去就等电台轮到，
         * 位次标签（第 N 位）+ 摘要就是大家关心的「什么时候轮到我」。 */
        const num = document.createElement('b');
        num.className = 'req-no';
        num.textContent = '#' + (i + 1);
        const body = document.createElement('span');
        body.className = 'req-body';
        const t = document.createElement('em');
        t.className = 'req-title';
        t.textContent = it.title;
        const meta = document.createElement('small');
        meta.className = 'req-meta';
        meta.textContent = it.who + (it.to ? ' → ' + it.to : '');
        body.appendChild(t);
        body.appendChild(meta);
        if (it.msg) {
          const m = document.createElement('small');
          m.className = 'req-msg';
          m.textContent = '“' + it.msg + '”';
          body.appendChild(m);
        }
        const st = document.createElement('i');
        st.className = 'req-st ' + lab.cls;
        st.textContent = lab.text;
        li.appendChild(num);
        li.appendChild(body);
        li.appendChild(st);
        /* 候选版本：服务器把 bot 那一页原样下发，让用户自己挑哪一版。
         * 「点的歌没有一首是对的版本」—— 机器猜不准哪条是原唱，那就别猜了。 */
        if (it.cands && it.cands.length > 1 && !it.del && it.st !== 'ready') {
          const cbox = document.createElement('span');
          cbox.className = 'req-cands';
          const chint = document.createElement('small');
          chint.className = 'req-cands-h';
          chint.textContent = '挑一个版本（不挑就用推荐那版）';
          cbox.appendChild(chint);
          const strip = document.createElement('span');
          strip.className = 'req-cands-strip';
          it.cands.forEach((cd) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'req-cand'
              + (String(it.pick || '') === String(cd.n) ? ' on' : '')
              + (cd.best ? ' best' : '');
            btn.textContent = cd.n + '. ' + cd.t;
            btn.title = cd.t;
            btn.addEventListener('click', (ev) => {
              ev.stopPropagation();
              pickVersion(it, cd.n);
            });
            strip.appendChild(btn);
          });
          cbox.appendChild(strip);
          li.appendChild(cbox);
        }
        frag.appendChild(li);
      });
      reqList.innerHTML = '';
      reqList.appendChild(frag);
      renderSum(list);

      if (reqHint) {
        if (!list.length) {
          reqHint.textContent = synced
            ? '还没有人点歌，抢个沙发'
            : '未连上点歌台，当前仅本机生效';
        } else if (synced) {
          reqHint.textContent = '全网同步 · ' + list.length + ' 首在队';
        } else {
          reqHint.textContent = '未连上点歌台，当前仅本机生效 · ' + list.length + ' 首在队';
        }
      }
    }

    /* 排队摘要：全网几首 + 你的歌第几位（点歌人最想知道「什么时候轮到我」） */
    function renderSum(list) {
      const sum = $('reqSum');
      if (!sum) return;
      if (!list || !list.length) { sum.hidden = true; return; }
      let mineIdx = -1;
      for (let k = 0; k < list.length; k++) {
        if (list[k].cid === myId && !list[k].del) { mineIdx = k; break; }
      }
      sum.hidden = false;
      sum.textContent = mineIdx >= 0
        ? ('全网 ' + list.length + ' 首在队 · 你的歌第 ' + (mineIdx + 1) + ' 位' +
           (mineIdx === 0 ? '，马上开播' : ''))
        : ('全网 ' + list.length + ' 首在队 · 点一首排进去，DJ 会安排');
    }

    /* ---------------- 身份 ---------------- */
    let myId = '';
    try {
      myId = localStorage.getItem('fm891-cid') || '';
      if (!myId) {
        myId = 'fm891-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem('fm891-cid', myId);
      }
    } catch (_) {
      myId = 'fm891-' + Math.random().toString(36).slice(2, 12);
    }
    myTopic = Q_NS + '/' + myId;

    /* 昵称：阶段 1 本机生成，用户可在点歌台里改成自己认领的名字 */
    function defaultNick() {
      return '听友' + myId.slice(-4);
    }
    function myName() {
      let n = '';
      try { n = localStorage.getItem('fm891.nick') || ''; } catch (_) { /* 忽略 */ }
      n = n.trim().slice(0, 16);
      if (n) return n;
      n = defaultNick();
      try { localStorage.setItem('fm891.nick', n); } catch (_) { /* 忽略 */ }
      return n;
    }

    /* 改昵称：不仅存本地，还要**回改自己名下的历史条目**并升 ver ——
     * 否则之前点的歌还挂着旧名字，别人看到的是两个不同的人。 */
    function setNick(raw) {
      const n = String(raw || '').trim().slice(0, 16) || defaultNick();
      const prev = myName();
      try { localStorage.setItem('fm891.nick', n); } catch (_) { /* 忽略 */ }
      if (n === prev) return;
      let changed = false;
      items.forEach((it) => {
        if (it.cid === myId && it.who !== n) { it.who = n; it.ver += 1; changed = true; }
      });
      if (changed) { prune(); publish(); render(); say('好的，以后就叫你 ' + n); }
    }

    /* ---------------- UI 绑定 ---------------- */
    const djBubble = $('djBubble');
    const reqMask = $('reqMask');
    const reqForm = $('reqForm');
    const reqInput = $('reqInput');
    const reqTo = $('reqTo');       // 送给谁（选填，会进播报词）
    const reqMsg = $('reqMsg');     // 祝福语（选填，云端 AI 朗读拼在歌前面）
    const reqBless = $('reqBless'); // AI 帮写祝福（按歌名从词本挑）
    const reqClose = $('reqClose');
    const nickInput = $('nickInput');
    let nickTimer = null;

    function open() {
      if (!reqMask) return;
      reqMask.hidden = false;
      ensureCatalog();   // 打开就绪曲库：联想 / 速点 / AI 祝福都靠它
      render();
      renderChips();
      // 每次打开回填当前昵称：用户可能在别处改过，或本地被清过
      if (nickInput && !nickInput.value) { try { nickInput.value = myName(); } catch (_) { /* 忽略 */ } }
      setTimeout(() => { try { reqInput && reqInput.focus(); } catch (_) { /* 忽略 */ } }, 60);
    }
    function close() { if (reqMask) reqMask.hidden = true; }

    if (djBubble) djBubble.addEventListener('click', open);
    if (reqClose) reqClose.addEventListener('click', close);
    if (reqMask) {
      // 点遮罩关闭；点卡片内部不要关（否则输入到一半就没了）
      reqMask.addEventListener('click', (e) => { if (e.target === reqMask) close(); });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && reqMask && !reqMask.hidden) close();
    });
    if (reqForm) {
      reqForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const v = reqInput ? reqInput.value : '';
        const to = reqTo ? reqTo.value : '';
        const msg = reqMsg ? reqMsg.value : '';
        addRequest(v, to, msg);
        if (reqInput) reqInput.value = '';
        if (reqTo) reqTo.value = '';
        if (reqMsg) reqMsg.value = '';
      });
    }
    if (nickInput) {
      try { nickInput.value = myName(); } catch (_) { /* 忽略 */ }
      // 防抖 600ms：每敲一个字就回改历史条目 + 升 ver + 发快照，太吵
      nickInput.addEventListener('input', () => {
        clearTimeout(nickTimer);
        nickTimer = setTimeout(() => setNick(nickInput.value), 600);
      });
      nickInput.addEventListener('blur', () => {
        clearTimeout(nickTimer);
        setNick(nickInput.value);
        nickInput.value = myName();   // 回填成归一化后的结果（清空则回落默认）
      });
    }

    /* ---------------- 曲库：联想 / 速点 / AI 祝福 ----------------
     * 数据源 = 云端 /catalog.json（标题+歌手+时长+祝福词本）。
     * 地址从 app 的音源 origin 推导；还没入台时静默等待，功能降级不报错。 */
    let catalog = [];
    let catTimer = null;
    let lastOrigin = '';
    const GENERIC_BLESS = [   // 曲库没连上时的兜底祝福（与服务端词本同款语气）
      '愿你听到想听的歌，见到想见的人。',
      '这首歌，替我说声谢谢你。',
      '愿此刻的你，被音乐温柔以待。',
      '点一首歌，存一份好心情。',
      '愿你眼里有光，耳里有歌。',
    ];

    function catOrigin() {
      // 先问 air 消息自己（onAirMsg 里 airState 已就位，比等 app 转发更早）
      try {
        if (airState && /^https?:\/\//i.test(airState.url || '')) {
          return new URL(airState.url).origin;
        }
      } catch (_) { /* 忽略 */ }
      try { if (R.origin) return R.origin(); } catch (_) { /* 忽略 */ }
      return '';
    }

    function ensureCatalog() {
      const base = catOrigin();
      if (!base) return;
      if (catalog.length && base === lastOrigin) return;
      if (catTimer) return;            // 4 秒防抖，避免连打请求
      lastOrigin = base;
      catTimer = setTimeout(() => { catTimer = null; }, 4000);
      /* 老内核 / 测试环境可能没有 fetch：曲库是锦上添花，绝不许拖垮点歌台 */
      if (typeof fetch !== 'function') return;
      fetch(base + '/catalog.json', { cache: 'no-store' })
        .then((r) => (r && r.ok ? r.json() : null))
        .then((c) => {
          if (!Array.isArray(c)) return;
          catalog = c.filter((x) => x && typeof x.title === 'string' && x.title);
          const lc = $('libCount');
          if (lc) lc.textContent = String(catalog.length);
          const lp = $('libPill');
          if (lp && catalog.length) lp.hidden = false;
          renderChips();
        })
        .catch(() => { /* 拉不到曲库：联想/速点降级，点歌本身不受影响 */ });
    }

    /* 曲库速点 chips：打开点歌台一眼看到库里有什么，点一下直接填 */
    function renderChips() {
      const box = $('reqChips');
      if (!box) return;
      box.innerHTML = '';
      if (!catalog.length) { box.hidden = true; return; }
      catalog.slice(0, 8).forEach((c) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip';
        b.textContent = c.title;
        b.addEventListener('click', () => {
          if (reqInput) { reqInput.value = c.title; reqInput.focus(); }
          hideAc();
        });
        box.appendChild(b);
      });
      box.hidden = false;
    }

    /* 输入联动联想：打「你的」下拉弹《你的选择》 */
    function hideAc() {
      const ac = $('reqAc');
      if (ac) { ac.hidden = true; ac.innerHTML = ''; }
    }
    function showAc() {
      const ac = $('reqAc');
      if (!ac || !reqInput) return;
      const q = String(reqInput.value || '').trim();
      ac.innerHTML = '';
      if (!q || !catalog.length) { ac.hidden = true; return; }
      const hits = [];
      for (let k = 0; k < catalog.length && hits.length < 6; k++) {
        const c = catalog[k];
        if (c.title !== q && c.title.indexOf(q) >= 0) hits.push(c);
      }
      if (!hits.length) { ac.hidden = true; return; }
      hits.forEach((c) => {
        const li = document.createElement('li');
        li.className = 'ac-item';
        const em = document.createElement('em');
        em.textContent = c.title;
        li.appendChild(em);
        if (c.artist) {
          const sp = document.createElement('span');
          sp.className = 'ac-artist';
          sp.textContent = c.artist;
          li.appendChild(sp);
        }
        li.addEventListener('click', () => {
          if (reqInput) { reqInput.value = c.title; reqInput.focus(); }
          hideAc();
        });
        ac.appendChild(li);
      });
      ac.hidden = false;
    }

    /* AI 写祝福：按当前歌名从词本挑（贴这首歌的），没匹配就用通用祝福 */
    function blessFor(title) {
      const t = String(title || '').trim();
      let arr = [];
      if (t) {
        for (let k = 0; k < catalog.length; k++) {
          if (catalog[k].title === t) { arr = catalog[k].bless || []; break; }
        }
      }
      if (!arr.length) arr = GENERIC_BLESS;
      return arr[Math.floor(Math.random() * arr.length)];
    }

    // 联想：边打边出（120ms 防抖）；失焦 160ms 后收起（给点击留时间）
    if (reqInput) {
      let acTimer = null;
      reqInput.addEventListener('input', () => {
        ensureCatalog();
        clearTimeout(acTimer);
        acTimer = setTimeout(showAc, 120);
      });
      reqInput.addEventListener('blur', () => { setTimeout(hideAc, 160); });
    }
    if (reqBless) {
      reqBless.addEventListener('click', () => {
        ensureCatalog();
        const v = blessFor(reqInput ? reqInput.value : '');
        if (reqMsg) reqMsg.value = v;
        R.toast('祝福语写好了，可以直接用或改改 ✨');
      });
    }

    /* ---------------- 启动 ---------------- */
    render();
    connect();
    // 周期重发：内容有变才发（fingerprint 比对），纯心跳不占带宽
    snapTimer = setInterval(() => { if (synced) publish(); }, SNAP_EVERY);
    // 状态文案每 15 秒刷一次：searching 超时判定靠它变
    setInterval(render, 15000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && synced) publish();
    });

    /* 暴露给测试用（生产环境无副作用） */
    window.__req = {
      items: items, add: addRequest, merge: merge, prune: prune,
      norm: norm, visible: visible, render: render, say: say,
      publish: publish,
      myName: myName, setNick: setNick,
      /* 「歌已备好」这条链路：测试要能直接喂消息 */
      ready: ready, onReady: onReady, vodFor: vodFor, findItem: findItem,
      /* 云端实时进度：和 ready 一样要能被测试直接喂消息 */
      prog: prog, onProg: onProg, freshProg: freshProg, progLabel: progLabel,
      clearProg: clearProg,
      /* 云开播（fm891-radio/air）：验 schema 校验与向 app 转发 */
      air: () => airState, onAirMsg: onAirMsg,
      /* 播报闸门要看队列长度才能验（第一条会被立刻取走开始打字，长度变 0） */
      sayQueueLen: () => sayQueue.length,
      /* 曲库链路：联想/AI 祝福/速点的数据与行为 */
      catalog: () => catalog, ensureCatalog: ensureCatalog, blessFor: blessFor,
      showAc: showAc, hideAc: hideAc,
      /* 是否真的连上点歌台：mock 测试验不出来 retain 回放/遗嘱这些 broker 行为， */
      /* 真实 broker E2E 要靠它判断「可以开始断言了」，不靠猜时间。 */
      isSynced: () => synced,
    };
  } catch (err) {
    /* 点歌是可选功能，任何异常都不能影响电台本身 —— 这条不变。
     * 但不许无声：无声的兜底会把 ReferenceError 这类真 bug 变成
     * 「功能悄悄消失」，用户只看到点歌台没反应，日志里一个字都没有。 */
    try { console.error('[fm891] 点歌模块加载失败：', err); } catch (_) { /* 忽略 */ }
  }
})();
