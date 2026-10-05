/* 时光电台 — 在线点播（纯点播版，电台台单已下架）
 * ============================================================================
 * 【这一版做什么】
 *  1. 多人同步点歌队列：每个客户端把自己看到的**全量**队列 retain 到
 *     fm891-radio/q/<cid>，同时订阅 fm891-radio/q/#，收到别人的快照后按
 *     条目 id 做并集合并。没有中心服务，但所有在线客户端会收敛到同一份
 *     队列；条目一旦被任何在线客户端复制进快照，提出者下线也不会丢歌。
 *     v1.21.12：条目**带归属 cid** —— 服务端据此做协同闸：撤单/选版/改署名
 *     只认本人（别人拿你的 id 挂自己的 cid 也进不来）。
 *  2. 云端找歌（**全在服务器主程序里**）：点歌后云端先查歌曲仓库，命中
 *     直接出片；没有才走电报下载。找歌/下载/转码/合成播报的实时进度走
 *     fm891-radio/p/<id>，标签按进度改写。
 *  3. 主播气泡：事件驱动的打字机播报。
 *  4. 音源 ready：fm891-radio/r/<id> 的 retain 里带「播报+歌」成片，
 *     点条目走 __radio.playVod() 播单曲。
 *  5. **云同步开播**：fm891-radio/air（retain）= 服务器此刻在放的歌，带
 *     startedAt；app.js 收到后对齐进度自动跟播 —— 所有人同一时刻听同一段，
 *     像真电台。AI 播报（谁点的哪首 + 串场词）已拼在音频开头。
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
    // 与 app.js 的在线通道保持同一批（顺序也要一致，否则两边可能停在不同线路上）；
    // 同样必须与 server.py 的 BROKERS 完全同集，原因见 app.js 那处注释。
    const BROKERS = [
      'wss://test.mosquitto.org:8081/mqtt',
      'wss://broker.emqx.io:8084/mqtt',
    ];
    const SNAP_EVERY = 30000;    // 周期性重发快照：晚加入的人靠 retain 一次拿全
    const GC_TOMB = 20 * 60000;  // 墓碑保留 20 分钟（够慢速的对端收到）
    const MAX_ITEMS = 40;        // 队列上限，超出淘汰最老的
    /* 本地点歌冷却：只挡手抖双击，不挡「连点两首」。
       v1.21.17 从 3000 降到 1000 —— 选中即点歌之后，从曲库连挑两首是主路径，
       3 秒必被「点太快啦」拒一次，观感就是点歌失败（同名重复另有 dup 兜着）。 */
    const MIN_GAP = 1000;
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
    /* v1.21.15：搜索问答通道（请求与响应同一 topic）。
       以前 App 只能看本地 catalog.json 的头几条，库外的歌压根搜不到，
       用户原话「bot 能翻页，App 只能看到一页，必须联动」。 */
    const SEARCH_NS = 'fm891-radio/s';

    /* ---------------- 点歌结果 = 一次性提醒（v1.21.9） ----------------
     * 用户原话：「失败了也一直显示、成功也一直显示，不能一次提醒就好了吗，
     * 为啥会有历史记录」—— 结果只 toast 说一遍，条目随后从队列撤下；
     * 队列里从此只留「还没出结果」的条目。miss 条目多留 20 秒宽限：
     * 既够看完那条提示，也远大于回归套件在 merge 后断言渲染的窗口。 */
    const MISS_GRACE = 20000;
    const _said = Object.create(null);   // 一单只提醒一次（重连回放不许刷屏）
    function sayOnce(key, text) {
      if (_said[key]) return;
      _said[key] = true;
      try { R.toast(text); } catch (_) { /* 没有 toast 的测试沙箱：跳过 */ }
    }
    /* 撤单 = 打墓碑（del + ver+1）并靠快照同步让全网一起清 —— 和 prune()
     * 淘汰超限条目走的是同一套契约，不新增协议。 */
    function tombstone(it) {
      if (!it || it.del) return false;
      it.del = Date.now();
      it.ver = (it.ver || 0) + 1;
      return true;
    }
    /* 「没找到」= 结论：toast 只说一次，条目起表等宽限期满由 sweepDone 撤。 */
    function noteMiss(it) {
      if (!it || it.del) return;
      if (!it.missAt) it.missAt = Date.now();
      if (it.cid === myId || it.mine) {
        sayOnce('miss:' + it.id, '《' + String(it.title || '这首歌') + '》没找到，换一首吧');
      }
    }

    /* ---------------- 选版弹窗 + 中途撤单（v1.21.11） ----------------
     * 用户原话：「点歌流程弄成弹窗选择，中途不想点 可以取消」。
     * 候选版本不再铺在条目里 —— 自己的单有**新**候选到达就自动弹一次
     * （同一轮只弹一次，手动关过就不再骚扰）；行内只留「选版本」把手
     * 随时重开；别人点的歌只给把手、不弹到人家屏幕上。
     * 「取消点歌」= 撤单：del 墓碑 + ver 递增 → 快照推给云端 —— 服务端
     * handle_queue 记 canceled，找歌/选版/下载/出片各环节的 _canceled
     * 断点闸当场停手；已备好的连轮播一起下架（drop_id，文件保留）。 */
    const candMask = $('candMask');
    const candX = $('candX');
    const candTitleEl = $('candTitle');
    const candHint = $('candHint');
    const candList = $('candList');
    const candOk = $('candOk');
    const candLater = $('candLater');
    const candCancel = $('candCancel');
    let candFor = '';            // 弹窗正对着的条目 id（'' = 没开）
    let candShownSig = '';       // 已自动弹过的候选签名（一轮弹一次）
    let candDismissed = '';      // 被手动关掉的那轮签名（同轮不再自动弹）

    function candSigOf(it) {
      return it && it.candsSig ? String(it.candsSig) : '';
    }
    function isOwnReq(it) {
      return !!(it && (it.cid === myId || it.mine));
    }
    function renderCandModal() {
      if (!candMask || !candList) return;
      const it = items.get(candFor);
      if (!it || !it.cands || !it.cands.length || it.del) { closeCandModal(); return; }
      if (candTitleEl) {
        candTitleEl.textContent = '🎵 给《' + String(it.title || '').slice(0, 14) + '》挑版本';
      }
      const cur = String(picking[it.id] || it.pick || '');
      if (candHint) {
        candHint.textContent = it.pick
          ? ('已确认第 ' + it.pick + ' 版 · 正按这版下')
          : (cur
            ? ('挑好了：第 ' + cur + ' 版 · 点「确认」下这一版')
            : '挑一个版本再点「确认」（没人替你选，不点就一直等你）');
      }
      candList.textContent = '';
      it.cands.forEach((cd) => {
        const on = cur === String(cd.n);
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'req-cand' + (on ? ' on' : '') + (cd.best ? ' best' : '');
        const dot = document.createElement('i');
        dot.className = 'req-cand-dot';
        dot.textContent = on ? '●' : '○';
        const nm = document.createElement('b');
        nm.textContent = String(cd.s || cd.t || '').slice(0, 18);
        row.appendChild(dot);
        row.appendChild(nm);
        if (cd.a) {
          const ar = document.createElement('em');
          ar.textContent = String(cd.a).slice(0, 12);
          row.appendChild(ar);
        }
        row.addEventListener('click', (ev) => {
          ev.stopPropagation();
          picking[it.id] = String(cd.n);   // 只是本地选中，点确定才发出去
          renderCandModal();
        });
        candList.appendChild(row);
      });
      if (candOk) {
        candOk.disabled = !cur || String(it.pick || '') === cur;
        /* v1.21.12：按钮只写「确认」。以前写「就下第 2 版」信息更足，但用户
           反馈「感觉没点确认它自己会选」—— 版本号挪到上面那行提示里，
           按钮只回答一件事：你点不点确认。 */
        candOk.textContent = '确认';
      }
      /* 撤单按钮只对自己的单亮：别人的歌你替人家撤了算怎么回事 */
      if (candCancel) candCancel.hidden = !isOwnReq(it);
      /* 换一批要知道给哪一单换 */
      try { const cm = $('candMore'); if (cm) cm.dataset.id = it.id || ''; } catch (_) { /* 忽略 */ }
    }
    function openCandModal(it) {
      if (!candMask || !it || !it.cands || !it.cands.length || it.del) return false;
      candFor = String(it.id || '');
      candMask.hidden = false;
      renderCandModal();
      return true;
    }
    /* dismiss=true：手动关的（✕/稍后/遮罩/返回键）→ 这一轮不再自动弹 */
    function closeCandModal(dismiss) {
      if (dismiss && candFor) {
        const it = items.get(candFor);
        if (it) candDismissed = candSigOf(it);
      }
      if (candMask) candMask.hidden = true;
      candFor = '';
    }
    /* onProg 挂完**新**一轮候选时自动弹（同轮 by candsSig 去重）。 */
    function maybeOpenCand(it) {
      if (!isOwnReq(it)) return;
      const sig = candSigOf(it);
      if (!sig || !it.cands || it.del) return;
      if (sig === candDismissed) return;
      if (sig === candShownSig && candMask && !candMask.hidden) return;
      candShownSig = sig;
      openCandModal(it);
    }
    /* 中途撤单：这就是用户说的「可以取消」。 */
    function cancelRequest(it) {
      if (!it || it.del) return false;
      const title = String(it.title || '这首歌');
      if (isOwnReq(it)) histNote(title, '已取消');
      tombstone(it);                      // del 墓碑 + ver 递增
      prog.delete(it.id);                 // 陈旧进度跟着撤，别再画找歌中
      delete picking[it.id];
      if (candFor === String(it.id)) closeCandModal();
      publish(true);                      // 立刻把撤单快照推出去
      render();
      say('已取消《' + title.slice(0, 12) + '》的点歌');
      return true;
    }

    /* ---------------- 主播气泡（打字机 + 播报队列） ---------------- */
    const djText = $('djText');
    let sayQueue = [];
    let sayTimer = null;
    /* 最近一条播报文本。只为了测试能断言「离线时到底说了什么」—— 打字机要
     * 按 45ms/字逐字上屏，等它敲完再读既慢又会被上一条的排队节奏带偏。 */
    let lastSay = '';

    /* 打字机：逐字上屏，带 3.5 秒后自动轮到下一条。多条播报排队出，避免
     * 「点了三首歌只看见最后一条」。 */
    function say(text) {
      if (!text) return;
      lastSay = String(text);
      sayQueue.push(lastSay);
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
      /* v1.21.14：改成**先点的在前**（升序）。原来 newest-first，导致
         「你的歌第 1 位」其实是**最后**播的那首 —— 位次与真实播出顺序反了，
         用户看着当然觉得「排队不一致」。云端台单 next 就是播出顺序，这里跟它对齐。 */
      out.sort((a, b) => (a.ts || 0) - (b.ts || 0));
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
        // 对端的「没找到」结论也按一次性提醒走（toast 只说一次、20 秒后撤）
        if (next.st === 'miss') noteMiss(next);
        changed = true;
      }
      return changed;
    }

    /* ---------------- 点歌 ---------------- */
    function addRequest(title) {
      const t = String(title || '').trim().slice(0, 30);
      if (!t) { R.toast('先输入歌名'); return false; }
      const now = Date.now();
      if (now - lastAddAt < MIN_GAP) { R.toast('点太快啦，缓一缓～'); return false; }

      /* 同一首还在队列里就别重复点（不同人点同一首 = 跟唱，允许）。
         v1.21.17：**没找到的不算「你点过」** —— 上次云端没搜到，换个写法再试
         一次是正常动作，挡回去只会让人觉得「点歌一直失败」。 */
      let dup = false;
      items.forEach((it) => {
        if (!it.del && it.mine && it.st !== 'miss'
            && norm(it.title) === norm(t)) dup = true;
      });
      if (dup) { R.toast('你已经点过《' + t + '》啦'); return false; }
      /* 冷却只在**真入队**时消耗。以前这行紧跟在冷却判定后面、排在重复判定
         之前：被「点过啦」拒一次就把冷却吃掉，换首歌再点又吃「点太快啦」——
         一连两次拒绝，用户看到的就是「点歌怎么老失败」。 */
      lastAddAt = now;

      /* 主播性格：你在点歌台里选的那个，跟着这一单发到云端。选「自动」就空着，
         服务器按时段挑（见 server.py 的 mood_of）。 */
      const sMood = curMood();
      const it = {
        id: myId + '-' + nextSeq(),
        cid: myId,
        who: myName(),
        to: '',
        msg: '',
        mood: sMood,
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
      /* 连没连上必须说实话：离线时 publish() 走 `if (!client || !myTopic) return`
         静默不出去，单子只在本机。以前这里一律发「云端主播马上安排 🎵」是**假
         承诺** —— 输入框清了、气泡说马上安排，单子却永远停在找歌中，用户看到
         的就是「点歌失败」。连上后 publish(true) 会把本机这份补发出去。 */
      say(synced
        ? ('收到 ' + it.who + ' 点的《' + t + '》，云端主播马上安排 🎵')
        : ('《' + t + '》先记在本机 · 连上点歌台自动补发'));
      return true;   // 真的入队了，调用方才可以清空输入框
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
      /* pickwait（v1.21.12）：云端等到窗口结束也没人点「确认」，于是停下不替 TA
       * 选，把条目挂成「等你确认版本」。用户什么时候点了确认，下一轮就按那版下。 */
      const stages = ['search', 'download', 'transcode', 'merge', 'miss', 'cands',
                       'pickwait'];
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
          .slice(0, 6)
          .map((c) => ({
            n: String(c.n),
            t: String(c.t || '').slice(0, 40),
            s: String(c.s || '').slice(0, 20),   // 歌名
            a: String(c.a || '').slice(0, 20),   // 歌手（单独一列，便于一眼认原唱）
            best: !!c.best,
          }));
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
            /* 换了一轮**新**候选 → 上一轮的 pick 作废：bot 轮失败会落
             * YouTube 轮，两轮编号会撞车，拿着旧选择直接开新一轮是错的。
             * ver 必须涨，否则服务端手里那份旧 pick 会盖回来。 */
            if (ci.pick) {
              ci.pick = '';
              ci.ver = (ci.ver || 0) + 1;
            }
            delete picking[ci.id];   // 待确认的行选择同样作废，别在新列表里高亮旧编号
            render();
            maybeOpenCand(ci);   // v1.21.11：新候选自动弹窗（自己的单，一轮一次）
          }
        }
      }
      /* 「没找到」是**结论**不是进度：进度只有 6 分钟新鲜度，过了就退回
       * 「云端还在找」。所以它要落进条目自己的状态里，才留得住。
       * v1.21.9：结论只提醒一次（toast），条目 20 秒后由 sweepDone 撤下。 */
      if (stage === 'miss') {
        const hit = items.get(id);
        if (hit && hit.st !== 'miss') {
          hit.st = 'miss';
          hit.ver = (hit.ver || 0) + 1;
          noteMiss(hit);
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
     * 返回是否真的删了东西，让调用方决定要不要重渲染。
     * 顺手把候选列表也撤掉：服务端候选窗口结束（选完/超时）发的就是这个
     * 空载荷。不撤的话「选一个版本」会永远挂在已经备好的条目上 —— 用户点了
     * 没反应（2026-10-03 实锤的换版失败 UI 就卡成这样）。 */
    function clearProg(id) {
      let hit = false;
      if (id && prog.has(id)) {
        prog.delete(id);
        hit = true;
      }
      const it = id ? items.get(id) : null;
      if (it && it.cands) {
        it.cands = null;
        it.candsSig = '';
        /* 候选窗口结束（选完/超时）→ 弹窗跟着收，别留一个点「确定」没反应
         * 的空壳（和 2026-10-03 那次「换了没生效」同性质的坑）。 */
        if (candFor && String(id) === String(candFor)) closeCandModal();
        hit = true;
      }
      return hit;
    }

    /* v1.20.8：点歌的**每个环节**都要看得见（用户：「点歌每个环节显示进度」）。
 * 以前只有一行文字（「下载中 3/5 MB」），用户不知道现在卡在哪一步、还剩几步。
 * 这里把进度拆成固定的几步，每步有名字，条目里渲染成一条带节点的小进度条，
 * 走到哪一步哪一步就亮 —— 点完歌之后不用猜，能盯着它一步步走完。 */
    const STEP_NAMES = ['已提交', '全网找歌', '选版本', '下载', '云端合成', '备好'];
    const STAGE_STEP = {
      search: 1, cands: 2, download: 3, merge: 4, transcode: 4, ready: 5,
    };

    function stepOf(it) {
      if (it.st === 'ready' || it.st === 'onair') return 5;
      /* 步骤条必须和徽章说同一句话（用户：「点歌看不到进度在哪个环节」）：
       * 正在被云开播放、或音源已入库（vodFor）→ 直接走到头；进度一律过
       * 新鲜度闸，过期的跟徽章一起撤；还在搜但进度被服务端撤了（出结果
       * 的瞬间）→ 亮到「全网找歌」，不许退回「已提交」跟「云端找歌中…」
       * 的徽章打架。 */
      if (airState && airState.id === it.id) return 5;
      if (vodFor(it)) return 5;
      const p = freshProg(it.id);
      const s = p && p.stage;
      if (s) return STAGE_STEP[s] != null ? STAGE_STEP[s] : 1;
      if (it.st === 'searching') return 1;
      return 0;   // 刚提交，还没亮到「全网找歌」
    }

    function progLabel(p) {
      if (p.stage === 'cands') return { text: '选一个版本 ↓', cls: 'st-search' };
      if (p.stage === 'pickwait') {
        return { text: '等你确认版本 · 没替你选', cls: 'st-wait' };
      }
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
      const firstTime = !cur;   // 该 id **第一次**备好；换版重发/隧道全量重发 ver+1 不算
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
      if (it) {
        /* 只有**第一次**备好才播报道喜：换版出片、隧道换域名全量重发都是
         * ver+1，每次都喊一嗓子 =「备好了」一天被重复说几遍（用户原话
         * 「播报有时候还会重复播报」的根）。 */
        if (firstTime) announceReady(it, entry);
        /* v1.21.10：这里**不再**抢撤候选列表 —— 云端的「选版本」窗口还开着
         * （等选/超时由服务端 end_cands 显式关闭），备好后 45 秒内照样能挑、
         * 挑了照样换版。抢撤的话挑到一半列表消失，选版流程直接断掉。 */
      }
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
    /* picking 是**本地**的待确认选择：点一行只是选中，要再点「确定」才发出去。
     * 分两步是为了让人能看见、能改 —— 以前点一下就发出去，界面上完全看不出
     * 到底选没选中（用户原话：手点了也没反应、没提示）。 */
    let picking = {};
    let airState = null;

    /* 服务器随 air 一起发的「接下来 N 首」（最多 5 首）。逐条校验：脏数据只丢
     * 自己那一条，不整包不带 —— onAirMsg 是白名单式校验，字段没显式放行就
     * 被吃掉，客户端歌单会永远空白（v1.20.2 第一版就踩了这个坑）。 */
    function normNext(arr) {
      if (!Array.isArray(arr)) return [];
      const out = [];
      /* v1.21.11：服务器会在 next 前面挂最多 2 条「找歌中」（wait=1），
       * 窗口从 5 放宽到 7 —— 卡 5 的话备好的歌会被找歌中的挤出白名单。 */
      for (const it of arr.slice(0, 7)) {
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
          wait: !!it.wait,   // 还没备好（找歌中）—— 排队栏压暗 + 状态字要认它
        });
      }
      return out;
    }

    /* =====================================================================
   创意②（补）：主播性格由**听友自己选**
   我第一版做成了按时段自动切，那是我替他决定 —— 用户原话：「用户自己选 DJ
   的性格，比我们替他决定好得多」。所以点歌台里给三选一 + 一个「自动」，
   选择记在 localStorage，跟着每一单发给云端；服务器优先照你选的来。
   ===================================================================== */
    const MOODS = [
      { id: '', label: '自动', hint: '按时段自己挑' },
      { id: 'announce', label: '报幕', hint: '白天那种，一本正经' },
      { id: 'chat', label: '闲聊', hint: '像朋友说话' },
      { id: 'night', label: '深夜', hint: '慢半拍，气口长' },
    ];

    function curMood() {
      try { return String(localStorage.getItem('fm891.mood') || ''); } catch (_) { return ''; }
    }

    function setMood(v) {
      try {
        if (v) localStorage.setItem('fm891.mood', v);
        else localStorage.removeItem('fm891.mood');
      } catch (_) { /* 忽略 */ }
      renderMood();
    }

    function renderMood() {
      const row = $('moodRow');
      if (!row || typeof row.querySelectorAll !== 'function') return;
      const list = row.querySelectorAll('.mood');
      if (typeof list.forEach !== 'function') return;
      const cur = curMood();
      list.forEach((b) => {
        if (!b || typeof b.getAttribute !== 'function') return;
        const on = (b.getAttribute('data-mood') || '') === cur;
        if (b.classList && typeof b.classList.toggle === 'function') b.classList.toggle('on', on);
        if (typeof b.setAttribute === 'function') b.setAttribute('aria-checked', on ? 'true' : 'false');
      });
    }

    /* =====================================================================
       创意④：等待变成内容 —— 电台给的是一个承诺，不是一段沉默
       「你那首《童话》前面还有 2 首」/「你的歌准备好了，马上到」。
       以前只能盯着队列里的「第 N 位」自己算，播完也没人告诉你轮到没有。
       这里每次 air 更新都算一次「我的歌前面还有几首」，**只在变化时说**，
       同一状态不刷屏；轮到自己时给一条更明确的话。
       ===================================================================== */
    let _waitSeen = {};   // 我点的每一单上次算出来的位次
    let _waitDone = {};   // 已经提示过「轮到你了」的单

    function queuePromise() {
      if (typeof myId !== 'string' || !myId || !airState) return;
      const now = airState.id;
      const nxt = airState.next || [];
      visible().forEach((it) => {
        if (!it || it.del || !it.cid || it.cid !== myId) return;
        if (it.st === 'ready' || it.st === 'onair') return;   // 备好了 = 快了
        const myIdHere = it.id;
        const title = String(it.title || '你那首');
        // 正在播的这一首位置算 -1；接下来歌单里的第几首就算它前面还有几首
        let pos = -2;
        if (myIdHere === now) pos = -1;
        else {
          const k = nxt.findIndex((x) => x && String(x.id) === String(myIdHere));
          if (k >= 0) pos = k;
        }
        const prev = _waitSeen[myIdHere];
        _waitSeen[myIdHere] = pos;
        if (pos === -1 && prev !== -1) {
          // 一次性提醒：轮到我了 —— **首见即在播**（刚打开 / 刚重连拿到 retain
          // 回放）也喊这一声，这是成功那一下唯一的告知；sayOnce 保证同一只喊
          // 一次，重连回放不会复读。实测 03:41 晴天开播时恰好断线重连，首见
          // 即 -1，被下面「见过了才说话」的闸吃掉 —— 成功提醒不许吃。
          sayOnce('onair:' + myIdHere, '《' + title + '》开播啦 ♪');
          return;
        }
        if (prev === undefined || prev === pos) return;   // 没变化不说话
        if (pos === -2) {
          // 从队里消失了：已经备好（正常）或被别人删了
          if (!_waitDone[myIdHere]) {
            _waitDone[myIdHere] = true;
            try { R.toast('《' + title + '》备好了，马上到 ♪'); } catch (_) { /* 忽略 */ }
          }
          return;
        }
        if (pos === 0 && prev !== 0) {
          try { R.toast('下一首就是《' + title + '》，准备耳朵'); } catch (_) { /* 忽略 */ }
          return;
        }
        if (pos > 0) {
          try {
            R.toast('你那首《' + title + '》前面还有 ' + pos + ' 首');
          } catch (_) { /* 忽略 */ }
        }
      });
    }

    /* ---------------- 撤单清扫（v1.21.9 一次性提醒的后一半） ----------------
     * 两条撤单线：
     *  ① miss 条目 20 秒宽限到点 → 墓碑撤下（noteMiss 已把 toast 说过了）；
     *     宽限期内若又来了新鲜进度 = 结论翻案，不起表不撤。
     *  ② 播过的条目 → air 台账（wall 的 id 集合，服务端仍下发）里有、又
     *     不是正在播的这首 → 墓碑撤下。air 消息到达时实时走这条；离线期间
     *     播掉的，下一条 air 的台账兜住 → 静默清（都播完一阵了，不补提醒）。
     * 墓碑靠快照同步全网一起清 —— 队列里永远只剩「还没出结果」的。 */
    function sweepDone() {
      if (!items.size) return false;
      const now = Date.now();
      const cur = airState ? airState.id : '';
      const wallIds = Object.create(null);
      if (airState && Array.isArray(airState.wall)) {
        airState.wall.forEach((w) => { if (w && w.id) wallIds[String(w.id)] = true; });
      }
      let changed = false;
      items.forEach((it) => {
        if (!it || it.del) return;
        if (it.st === 'miss') {
          // 只有**新的**进度（阶段不是 miss）才算翻案；miss 自己那条进度就是
          // 结论本身，拿它挡撤单会让条目赖到进度过期（6 分钟）才走 —— 实测
          // 「没找到」147 秒后还挂在列表上，正是这个坑。
          const mp = freshProg(it.id);
          if (mp && mp.stage !== 'miss') { it.missAt = 0; return; }   // 翻案：别撤
          if (!it.missAt) {
            it.missAt = now;
            if (isOwnReq(it)) histNote(it.title, '没找到');   // 留底，别无声消失
            return;
          }
          if (now - it.missAt > MISS_GRACE) changed = tombstone(it) || changed;
          return;
        }
        if (cur && it.id !== cur && wallIds[it.id]) {
          if (isOwnReq(it)) histNote(it.title, '播过了');     // 播过也要记账
          changed = tombstone(it) || changed;
        }
      });
      if (changed) { publish(); render(); }
      return changed;
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
      const prevId = airState ? airState.id : '';
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
        wall: Array.isArray(j.wall) ? j.wall : [],   // 播出台账（撤单清扫用）
      };
      /* 一次性提醒（v1.21.9）：上一首播完了 —— 我点的那单立刻撤下，不留在
       * 队列里当历史；别人的同理（队列只放「还没轮到」的）。撤在
       * queuePromise 之前，免得它把「播完」误报成「备好了，马上到」。 */
      if (prevId && prevId !== id) {
        const pi = items.get(prevId);
        if (pi && !pi.del && tombstone(pi)) publish();
      }
      sweepDone();     // wall 台账兜底：离线期间播过的一并静默撤下
      ensureCatalog();   // 音源地址到位 → 顺手拉曲库（联想/AI 祝福/速点要用）
      render();          // 「正在播」标签跟着换条目
      queuePromise();    // ④ 等待变成内容：轮到我之前就告诉我
      if (typeof R.onAir === 'function') {
        try { R.onAir(airState); } catch (_) { /* app 挂了不拖累点歌台 */ }
      }
      return true;
    }

    /* ---------------- MQTT 同步 ---------------- */
    let client = null;
    let brokerIdx = 0;
    let lastSwitchAt = 0;   // 换线冷却（同 app.js）：错误风暴时别疯狂重建连接
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
      delete picking[it.id];           // 已经发出去了，别再留着当「待确认」
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
        try { c.subscribe(SEARCH_NS + '/#', { qos: 0 }); } catch (_) { /* 忽略 */ }
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
        if (topic.indexOf(SEARCH_NS + '/') === 0) onSearchMsg(j);
      });
      c.on('error', () => {
        // 秒切：没建立起来的连接（DNS 被 fake-IP 污染 = 秒拒）不等 9 秒 guard。
        // 已同步过（synced）的交给 close/reconnect 自己恢复，不抢重试。
        if (client !== me || synced) return;
        nextBroker();
      });
      c.on('close', () => { if (client === me) { synced = false; render(); } });
    }

    function nextBroker() {
      const _now = Date.now();
      if (_now - lastSwitchAt < 700) return;   // 冷却：多条线一起秒拒时防连接风暴
      lastSwitchAt = _now;
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

    /* ETA：云端台单 v1.21.14 起给每条带 eta（秒）—— 「大约还有 6 分钟」比
     * 光一个「第 3 位」有用得多（用户原话：想知道什么时候轮到我）。 */
    function airEtaOf(it) {
      try {
        if (!airState || !Array.isArray(airState.next)) return -1;
        for (let k = 0; k < airState.next.length; k++) {
          const e = airState.next[k];
          if (e && e.id === it.id) return Number(e.eta) || 0;
        }
      } catch (_) { /* 忽略 */ }
      return -1;
    }

    function fmtEta(sec) {
      if (sec < 0) return '';
      if (sec < 45) return '马上就到';
      const m = Math.round(sec / 60);
      return '大约还有 ' + (m <= 1 ? '1' : m) + ' 分钟';
    }

    /* ---------------- 我今天点过的（本地台账） ----------------
     * 以前播过/没找到/已撤的单 20 秒后直接从列表消失，用户完全不知道自己点过
     * 什么、结果如何 —— 现在留一份底，还能一键再点一次。 */
    const HIST_KEY = 'fm891.myhist';
    let myHist = [];
    try {
      const raw = localStorage.getItem(HIST_KEY);
      if (raw) {
        const a = JSON.parse(raw);
        if (Array.isArray(a)) myHist = a.slice(0, 20);
      }
    } catch (_) { myHist = []; }

    function histNote(title, how) {
      const t = String(title || '').trim();
      if (!t) return;
      myHist.unshift({ t: t.slice(0, 30), k: how, at: Date.now() });
      if (myHist.length > 20) myHist.length = 20;
      try { localStorage.setItem(HIST_KEY, JSON.stringify(myHist)); } catch (_) { /* 忽略 */ }
    }

    function renderHist() {
      const box = $('reqHist');
      const ul = $('reqHistList');
      if (!box || !ul) return;
      box.hidden = !myHist.length;
      if (!myHist.length) return;
      ul.textContent = '';
      myHist.slice(0, 8).forEach((h) => {
        const li = document.createElement('li');
        li.className = 'hist-item';
        const em = document.createElement('em');
        em.textContent = h.t;
        const k = document.createElement('span');
        k.className = 'hist-k';
        k.textContent = h.k || '播过';
        const again = document.createElement('button');
        again.type = 'button';
        again.className = 'hist-again';
        again.textContent = '再点一次';
        again.addEventListener('click', (ev) => { ev.stopPropagation(); retryOwn(h.t); });
        li.appendChild(em);
        li.appendChild(k);
        li.appendChild(again);
        ul.appendChild(li);
      });
    }

    function retryOwn(title) {
      const t = String(title || '').trim();
      if (!t) return;
      if (reqInput) reqInput.value = t;
      addRequest(t);
    }

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

    /* 一行条目（v1.21.12 紧凑版）：歌名 + 「谁 · 状态」，右侧状态徽章，
     * 底下压一条 2px 进度线。原来每行 6 格步骤条 + 两块 chip + 状态字，
     * 一条能占 3~4 行高，列表一长，点歌前得先滚过去。 */
    function buildRow(it, i) {
      const li = document.createElement('li');
      li.className = 'req-item' + (isOwnReq(it) ? ' mine' : '');
      const lab = stLabel(it, i);
      const body = document.createElement('span');
      body.className = 'req-body';
      const t = document.createElement('em');
      t.className = 'req-title';
      t.textContent = it.title;
      body.appendChild(t);
      /* 第二行：「谁点的 · 状态」和选版把手并排 —— 以前它们各占一行，
         一条歌能撑到 3~4 行，列表一长就得先滚。 */
      const line2 = document.createElement('span');
      line2.className = 'req-line2';
      const meta = document.createElement('small');
      meta.className = 'req-meta';
      /* 只写「谁点的」：状态由右侧胶囊负责，同一个信息不出现两遍
         （v1.21.12 遗留：meta 与胶囊都写状态，一行里同一句话看两遍）。 */
      meta.textContent = it.who;
      line2.appendChild(meta);
      body.appendChild(line2);
      li.appendChild(body);
      const st = document.createElement('i');
      st.className = 'req-st ' + lab.cls;
      st.textContent = lab.text;
      li.appendChild(st);
      /* 进度：6 格步骤条 → 一条按阶段走的细线 */
      if (!it.del && it.st !== 'ready' && !vodFor(it) &&
          (it.st !== 'miss' || freshProg(it.id))) {
        const bar = document.createElement('span');
        bar.className = 'req-pbar';
        const fillI = document.createElement('i');
        const stg = stepOf(it);
        const pct = Math.min(100, Math.max(8, ((stg + 1) / STEP_NAMES.length) * 100));
        fillI.style.width = pct.toFixed(0) + '%';
        bar.appendChild(fillI);
        li.appendChild(bar);   /* 绝对定位压在行底，不占额外高度 */
      }
      /* 选版本：**只给自己的单**把手。协同收紧（v1.21.12）：版本必须本人确认，
         别人的单只显示「等 TA 确认版本」，不留越权操作的口子。 */
      if (it.cands && it.cands.length > 1 && !it.del && it.st !== 'ready' &&
          it.st !== 'onair' && !(airState && airState.id === it.id)) {
        if (isOwnReq(it)) {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'req-candchip' + (it.pick ? ' picked' : '');
          chip.textContent = it.pick
            ? ('已确认第 ' + it.pick + ' 版')
            : ('选版本 · ' + it.cands.length + ' 版');
          chip.addEventListener('click', (ev) => {
            ev.stopPropagation();
            openCandModal(it);
          });
          line2.appendChild(chip);
        } else {
          const w = document.createElement('span');
          w.className = 'req-waitpick';
          w.textContent = it.pick
            ? ('TA 已确认第 ' + it.pick + ' 版')
            : '等 TA 确认版本';
          line2.appendChild(w);
        }
      }
      /* 中途撤单 ✕：自己的单、还没开播才有 */
      if (!it.del && isOwnReq(it) && !(airState && airState.id === it.id)) {
        const xb = document.createElement('button');
        xb.type = 'button';
        xb.className = 'req-x';
        xb.textContent = '✕';
        xb.setAttribute('aria-label', '取消点歌');
        xb.addEventListener('click', (ev) => {
          ev.stopPropagation();
          cancelRequest(it);
        });
        li.appendChild(xb);
      }
      return li;
    }

    /* 头部协同读数：一起点歌的有几个人。数据源是 app.js 的 presence 感知
     * （连着同一个点歌台的客户端数，含本机）—— 拿不到就写「暂不可数」，
     * 绝不显示 0 人（那等于当着用户说没人听）。 */
    function paintLive() {
      if (!reqLive) return;
      let n = 0;
      try {
        n = (window.__fmPresence && Number(window.__fmPresence())) || 0;
      } catch (_) { /* 忽略 */ }
      reqLive.textContent = n > 0 ? (n + ' 人一起点歌') : '正在数人…';
    }

    function render() {
      // 关窗 / 文档不可用时直接退出：本模块的原则是「任何情况下都不许抛」，
      // 扫描的 await 链可能在窗口关闭后才 resume 并走到这里。
      if (!reqList || typeof document === 'undefined' || !document) return;
      /* 选版弹窗对不上号就收：条目被撤 / 候选被 clearProg 撤掉之后还挂着
       * 弹窗，点「确定」等于空操作 —— 用户原话「点了没反应」。 */
      if (candFor) {
        const cm = items.get(candFor);
        if (!cm || cm.del || !cm.cands) closeCandModal();
      }
      const list = visible();
      const frag = document.createDocumentFragment();
      /* v1.21.12：分组。自己的单永远在最上面，别人的在下面 —— 以前两类混排，
         找自己那条得逐行扫（用户：「点歌那个页面很烂」）。 */
      const mineRows = [];
      const otherRows = [];
      list.forEach((it, i) => { (isOwnReq(it) ? mineRows : otherRows).push([it, i]); });
      const putGroup = (label, rows) => {
        if (!rows.length) return;
        const h = document.createElement('li');
        h.className = 'req-group';
        h.textContent = label;
        frag.appendChild(h);
        rows.forEach((pair) => { frag.appendChild(buildRow(pair[0], pair[1])); });
      };
      /* ---- 我的歌卡（v1.21.14）：自己的单里最靠前的那首（也就是最快轮到的）
         单独拎出来做大卡片，列表里不再重复它。 ---- */
      const mineAll = list.filter((x) => isOwnReq(x));
      const topMine = mineAll[0] || null;
      const myCard = $('reqMyCard');
      if (myCard) {
        myCard.textContent = '';
        if (!topMine) {
          myCard.hidden = true;
        } else {
          myCard.hidden = false;
          const pos = list.indexOf(topMine);
          const lab = stLabel(topMine, pos);
          const etaTxt = fmtEta(airEtaOf(topMine));
          const head = document.createElement('div');
          head.className = 'my-card-h';
          head.textContent = '🎤 我的歌 · 第 ' + (pos + 1) + ' 位';
          const nm = document.createElement('b');
          nm.className = 'my-card-t';
          nm.textContent = topMine.title;
          const sub = document.createElement('small');
          sub.className = 'my-card-s';
          /* 副行只留「状态 + 预计时间」：位次已经在标题里了，
             「第 2 位」在同一张卡上出现两遍就是废话。 */
          const labTxt = /^第\s*\d+\s*位$/.test(lab.text) ? '' : lab.text;
          /* 状态与 ETA 都空（已进台单、云端还没算预计时间）时也给一句人话，
             别留一块空白让人以为这张卡没内容。 */
          sub.textContent = [labTxt, etaTxt].filter(Boolean).join(' · ')
            || '已进台单 · 等候播出';
          const acts = document.createElement('div');
          acts.className = 'my-card-acts';
          if (topMine.cands && topMine.cands.length > 1 && !topMine.del) {
            const cb = document.createElement('button');
            cb.type = 'button';
            cb.className = 'req-candchip' + (topMine.pick ? ' picked' : '');
            cb.textContent = topMine.pick
              ? ('已确认第 ' + topMine.pick + ' 版')
              : ('选版本 · ' + topMine.cands.length + ' 版');
            cb.addEventListener('click', (ev) => { ev.stopPropagation(); openCandModal(topMine); });
            acts.appendChild(cb);
          }
          if (!topMine.del && !(airState && airState.id === topMine.id)) {
            const xb = document.createElement('button');
            xb.type = 'button';
            xb.className = 'req-x';
            xb.textContent = '✕';
            xb.setAttribute('aria-label', '取消点歌');
            xb.addEventListener('click', (ev) => { ev.stopPropagation(); cancelRequest(topMine); });
            acts.appendChild(xb);
          }
          myCard.appendChild(head);
          myCard.appendChild(nm);
          myCard.appendChild(sub);
          myCard.appendChild(acts);
        }
      }
      const restMine = mineRows.filter((pair) => pair[0] !== topMine);
      putGroup('我的其它点歌', restMine);
      putGroup('大家在点', otherRows);
      // 整表重建先存滚动位置：不存的话，每次 MQTT/定时刷新都把列表甩回顶部，
      // 刚点完版本就「看着像没反应」。
      // v1.21.5：点歌台改成「单层滚动」—— 滚动容器从 reqList 上移到整个抽屉，
      // reqList 自己不再滚（它恒为 scrollTop 0），所以必须连外层抽屉的位置
      // 一起存一起还，否则重建那一刻抽屉仍会跳回顶部。
      const _dlg = (typeof reqList.closest === 'function') ? reqList.closest('.dialog') : null;
      const _st = reqList.scrollTop;
      const _dST = _dlg ? _dlg.scrollTop : 0;
      reqList.innerHTML = '';
      reqList.appendChild(frag);
      reqList.scrollTop = _st;   // 还原（用户正在看的位置）
      if (_dlg) _dlg.scrollTop = _dST;
      renderSum(list);
      renderHist();
      paintLive();

      if (reqHint) {
        const qn = list.filter((x) => x && x.st !== 'miss').length;   // 出结论的不算在队
        if (!list.length) {
          reqHint.textContent = synced
            ? '现在还没人点歌 · 电台放的是电台垫场，你点第一首'
            : '未连上点歌台，当前仅本机生效';
        } else if (synced) {
          reqHint.textContent = '全网同步 · ' + qn + ' 首在队';
        } else {
          /* 离线时别再报一遍「N 首在队」：上面 reqSum 已经说了，
             这里只讲连接状态（用户要判断的是「我的单发出去没有」）。 */
          reqHint.textContent = '未连上点歌台 · 连上后自动补发你的点歌';
        }
      }
    }

    /* 排队摘要：全网几首 + 你的歌第几位（点歌人最想知道「什么时候轮到我」）。
     * v1.21.9：已出结论（没找到）的**不算在队** —— 它不会再播，拿它报
     * 「第几位 / 马上开播」是骗人；位次也要把这类条目让开才算准。 */
    function renderSum(list) {
      const sum = $('reqSum');
      if (!sum) return;
      if (!list || !list.length) { sum.hidden = true; return; }
      const q = list.filter((x) => x && x.st !== 'miss');
      if (!q.length) { sum.hidden = true; return; }
      let mineIdx = -1;
      for (let k = 0; k < q.length; k++) {
        if (q[k].cid === myId && !q[k].del) { mineIdx = k; break; }
      }
      sum.hidden = false;
      sum.textContent = mineIdx >= 0
        ? ('全网 ' + q.length + ' 首在队 · 你的歌第 ' + (mineIdx + 1) + ' 位' +
           (mineIdx === 0 ? '，马上开播' : ''))
        : ('全网 ' + q.length + ' 首在队 · 点一首排进去，DJ 会安排');
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
    const reqClose = $('reqClose');
    const reqX = $('reqX');           // 标题行常驻 ✕（用户反馈「返回按钮都没有」加的）
    /* v1.21.12：reqTo / reqMsg / reqBless（送给谁 / 祝福语 / AI 写祝福）连同
       GENERIC_BLESS、blessFor()、曲库 bless 词本一起删了 —— 用户原话「加一句
       想说的有啥用，没用就删掉相关的代码」。曲库保留，只服务联想与速点。
       头部新增：协同在线人数 + 昵称入口（昵称编辑从队列底部挪到这里）。 */
    const nickBtn = $('nickBtn');
    const reqNickBox = $('reqNickBox');
    const reqLive = $('reqLive');
    const nickInput = $('nickInput');
    let nickTimer = null;

    function open() {
      if (!reqMask) return;
      reqMask.hidden = false;
      ensureCatalog(true);   // 强制重拉：祝福候选是服务端随机摇的（见 ensureCatalog 说明）
      renderMood();         // 主播性格选中态
      sweepDone();          // 开窗先清一遍账：播过的/过期的 miss 不该出现在眼前
      render();
      renderChips();
      // 二次打开回顶：上次滚到底部看队列，重开还停在那儿的话，输入框和常听
      // chips 全在屏幕外 —— 看着就像「抽屉是空的 / 打不开」。
      try { const d = reqMask.firstElementChild; if (d) d.scrollTop = 0; } catch (_) { /* 忽略 */ }
      // 联想下拉别带着上次的状态闪进来（关抽屉时也可能没来得及收）
      try { const p = document.getElementById('acPanel'); if (p) p.hidden = true; } catch (_) { /* 忽略 */ }
      // 每次打开回填当前昵称：用户可能在别处改过，或本地被清过
      if (nickInput && !nickInput.value) { try { nickInput.value = myName(); } catch (_) { /* 忽略 */ } }
      /* 打开就摊开服务器曲库（输入框空着时），用户能自己核对「服务器上都有啥」 */
      setTimeout(() => {
        try {
          /* 空输入时**不抢焦点**：一抢就把软键盘顶起来，正好盖住下面刚摊开的
             曲库（打开抽屉通常就是为了翻库挑歌）。有字才聚焦 —— 那是接着改
             上次没发出去的歌名。选中即点歌之后也不再依赖键盘够得着「点歌」。 */
          const hasText = !!(reqInput && String(reqInput.value || '').trim());
          if (hasText) reqInput.focus();
          if (reqInput && !hasText) showLibrary();
        } catch (_) { /* 忽略 */ }
      }, 60);
    }
    function close() {
      if (reqMask) reqMask.hidden = true;
      // 关的时候把联想收掉：留着的话，遮罩透明度变化会把它「印」在背景上一帧
      try { const p = document.getElementById('acPanel'); if (p) p.hidden = true; } catch (_) { /* 忽略 */ }
    }
    /* 安卓返回键要能先关弹窗。以前 MainActivity 里 canGoBack() 恒为 false（只有一个
     * file:// 页面），返回键直接 super.onBackPressed() 把 App 关了 —— 点歌台开着
     * 的时候按返回＝退出，用户以为按钮坏了。MainActivity 通过 evaluateJavascript
     * 调这两个函数，true 表示「我处理了，你别退」。 */
    function hasOpenDialog() {
      try {
        // 选版弹窗先判：backPressed 要按「先关最里层」的顺序收
        if (candMask && !candMask.hidden) return true;
        if (reqMask && !reqMask.hidden) return true;
        // id 是 updateMask 不是 updMask —— 写错的话这里永远取到 null，
        // 更新弹窗开着时按返回键会直接退出 App（判空兜住了崩溃，兜不住逻辑）
        const upd = document.getElementById('updateMask');
        if (upd && !upd.hidden) return true;
      } catch (_) { /* 忽略 */ }
      return false;
    }
    function backPressed() {
      // 选版弹窗开着 → 返回先关它（同轮手动关过，之后就只给把手不自动弹）
      try {
        if (candMask && !candMask.hidden) { closeCandModal(true); return true; }
      } catch (_) { /* 忽略 */ }
      // 有联想下拉先收下拉，再收弹窗：跟系统返回的逐层收一致
      try {
        const ac = document.getElementById('reqAc');
        if (ac && !ac.hidden) { ac.hidden = true; return true; }
      } catch (_) { /* 忽略 */ }
      if (!hasOpenDialog()) return false;
      close();
      return true;
    }
    window.__fm891BackPressed = backPressed;
    window.__fm891HasOpenDialog = hasOpenDialog;

    /* 选版弹窗的按钮：确定=发 pick；稍后/✕/遮罩=关（同轮不再自动弹）；
     * 取消点歌=撤单。 */
    if (candX) candX.addEventListener('click', () => closeCandModal(true));
    if (candLater) candLater.addEventListener('click', () => closeCandModal(true));
    /* v1.21.15：版本不对就换一批 —— 服务器重新搜更深的候选、去掉已给过的那些，
       重发候选列表（走原有 cands 进度通道，弹窗照旧刷新）。 */
    const candMore = $('candMore');
    if (candMore) candMore.addEventListener('click', () => {
      if (!candMore.dataset.id || !client || !synced) return;
      candMore.disabled = true;
      candMore.textContent = '正在换…';
      try {
        client.publish(SEARCH_NS + '/' + myId, JSON.stringify({
          op: 'more', id: candMore.dataset.id,
        }), { qos: 0 });
        say('正在换一批版本…');
      } catch (_) { /* 忽略 */ }
      setTimeout(() => {
        candMore.disabled = false;
        candMore.textContent = '换一批版本';
      }, 8000);
    });
    if (candOk) candOk.addEventListener('click', () => {
      const it = items.get(candFor);
      const cur = it ? String(picking[it.id] || '') : '';
      if (it && cur) { pickVersion(it, cur); closeCandModal(); }
    });
    if (candCancel) candCancel.addEventListener('click', () => {
      const it = items.get(candFor);
      if (it && isOwnReq(it)) cancelRequest(it);
      else closeCandModal(true);
    });
    if (candMask) candMask.addEventListener('click', (ev) => {
      if (ev.target === candMask) closeCandModal(true);   // 点遮罩 = 稍后再说
    });

    if (djBubble) djBubble.addEventListener('click', open);
    if (reqClose) reqClose.addEventListener('click', close);
    if (reqX) reqX.addEventListener('click', close);

    /* 主播性格四选一：点一下就换，选中态立刻高亮（点选要有反馈）。
       四个按钮直接写在 HTML 里（含「自动」），不在运行时造元素。
       **能力探测**：精简的测试沙箱里元素可能没有 querySelectorAll/addEventListener
       —— 那就让这一小段功能跳过，绝不能因为它把整个点歌模块搞挂（加载期抛异常
       会让所有点歌能力一起消失）。 */
    const moodRow = $('moodRow');
    if (moodRow && typeof moodRow.querySelectorAll === 'function') {
      const moods = moodRow.querySelectorAll('.mood');
      if (typeof moods.forEach === 'function') {
        moods.forEach((b) => {
          if (!b || typeof b.addEventListener !== 'function') return;
          b.addEventListener('click', (ev) => {
            if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
            setMood(typeof b.getAttribute === 'function' ? (b.getAttribute('data-mood') || '') : '');
            try {
              R.toast(curMood() ? ('主播：' + b.textContent) : '主播：按时段自动');
            } catch (_) { /* 忽略 */ }
          });
        });
      }
    }

    /* 抽屉往下滑就关（用户反馈「不要那个框很烦人」—— 既然是抽屉，就得能用
     * 甩手势退出去，不能逼用户去找 ✕）。手势绑在抓手和遮罩空白处：抽屉内部
     * 不绑，否则跟队列列表的纵向滚动打架。 */
    (function bindSheetSwipe() {
      const grip = $('reqGrip');
      if (!grip || !reqMask) return;
      let y0 = 0; let on = false; let moved = false;
      const start = (e) => {
        const t = (e.touches && e.touches[0]) || e;
        y0 = t.clientY; on = true; moved = false;
      };
      const move = (e) => {
        if (!on) return;
        const t = (e.touches && e.touches[0]) || e;
        const dy = t.clientY - y0;
        if (dy <= 0) return;
        moved = true;
        // 跟手：往下拖多少就跟着走多少（最多 120px），松手过了 64px 就关
        try { reqMask.firstElementChild.style.transform = 'translateY(' + Math.min(dy, 120) + 'px)'; } catch (_) { /* 忽略 */ }
        if (e.cancelable) e.preventDefault();
      };
      const end = (e) => {
        if (!on) return;
        on = false;
        const t = (e.changedTouches && e.changedTouches[0]) || e;
        const dy = (t ? t.clientY : y0) - y0;
        try { reqMask.firstElementChild.style.transform = ''; } catch (_) { /* 忽略 */ }
        if (moved && dy > 64) close();
      };
      grip.addEventListener('touchstart', start, { passive: true });
      grip.addEventListener('touchmove', move, { passive: false });
      grip.addEventListener('touchend', end);
      // 抓手也能点一下就关（等价于「这玩意儿可以拖走」的提示）
      grip.addEventListener('click', () => { if (!moved) close(); });
    }());
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
        // 只有真的入队了才清空：addRequest 有三条拒绝路径（空歌名 / 3 秒冷却 /
        // 已点过同一首），以前不管拒没拒都清 —— 连点两首时第二首的歌名刚敲完
        // 就被吞掉，用户只看到一句 toast，输入框却空了。
        if (addRequest(v)) {
          if (reqInput) reqInput.value = '';
        }
      });
    }
    /* 昵称：v1.21.12 从「队列底部的输入框」改成「头部一个小按钮 + 折叠编辑框」。
     * 以前那个框永远摊在列表下面，改一次名字要滑过整张队列；而昵称恰恰是
     * 协同里最该一眼看到、也最容易改的东西。 */
    if (nickBtn) {
      const paintNick = () => {
        try { nickBtn.textContent = '昵称 · ' + myName(); } catch (_) { /* 忽略 */ }
      };
      paintNick();
      nickBtn.addEventListener('click', () => {
        if (!reqNickBox) return;
        const open = !!reqNickBox.hidden;
        reqNickBox.hidden = !open;
        nickBtn.classList.toggle('on', open);
        if (open && nickInput) {
          try { nickInput.value = myName(); } catch (_) { /* 忽略 */ }
          setTimeout(() => { try { nickInput.focus(); } catch (_) { /* 忽略 */ } }, 30);
        }
      });
      R.onNick = paintNick;      // 改名后头部跟着更新
    }
    if (nickInput) {
      try { nickInput.value = myName(); } catch (_) { /* 忽略 */ }
      // 防抖 600ms：每敲一个字就回改历史条目 + 升 ver + 发快照，太吵
      nickInput.addEventListener('input', () => {
        clearTimeout(nickTimer);
        nickTimer = setTimeout(() => {
          setNick(nickInput.value);
          if (R.onNick) { try { R.onNick(); } catch (_) { /* 忽略 */ } }
        }, 600);
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

    function ensureCatalog(force) {
      const base = catOrigin();
      if (!base) return;
      /* force：每次打开点歌台都重新拉一次。原因：catalog.json 里的清单是
       * 服务端**随机摇**的（每 20 分钟重摇一遍），而这里以前只要 catalog 非空
       * 就直接 return —— 结果整晚都吃同一份缓存，用户连点几首每首的「AI 写祝福」
       * 都一样，原话「咋每首歌都一样」。重拉一份几十 KB，值。 */
      if (catalog.length && base === lastOrigin && !force) return;
      /* 防抖只挡「随手补拉」，不挡 force：force 的语义就是「我现在就要新的」。
         以前两者一起 return，结果 4 秒内第二次打开点歌台时曲库压根没刷新
         （联想与速点一直吃旧清单，测试里换曲库也被它悄悄拦掉）。 */
      if (catTimer && !force) return;
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
        b.addEventListener('click', () => pickSong(c.title));
        box.appendChild(b);
      });
      box.hidden = false;
    }

    /* 输入联动联想：打「你的」下拉弹《你的选择》 */
    function hideAc() {
      const ac = $('reqAc');
      const panel = $('acPanel');
      if (ac) ac.textContent = '';
      if (panel) panel.hidden = true;
      clearTimeout(acAutoTimer);
    }

    /* v1.21.17：点联想项 / 曲库行 / 速点 chip = **一步点歌**。
       原来三处都只把歌名填进输入框再 focus()，于是「点了没反应」，还得再按
       一次「点歌」；focus() 在手机上还会把软键盘顶起来，正好挡住那个按钮 ——
       用户要先关键盘再找按钮，流程当然乱七八糟。歌名本来就是完整的一首、意图
       明确，选中即提交；点错了撤单即可。不 blur：blur 会挂一条 160ms 后的
       hideAc，紧接着重摊曲库会被它一把收掉。 */
    function pickSong(title) {
      const t = String(title || '').trim();
      if (!t) return;
      if (reqInput) reqInput.value = t;
      hideAc();
      if (addRequest(t)) {
        if (reqInput) reqInput.value = '';
        showLibrary();   // 还想接着点？曲库重新摊开，一首接一首
      }
    }
    /* ---------------- 搜索分页（v1.21.15）----------------
     * 本地曲库命中 → 本地切页（毫秒级）；库外 → 问服务器（yt-dlp，带缓存）。
     * 面板结构：.ac-panel > .ac-list + .ac-foot（页脚常驻，不随列表滚动）。 */
    const AC_PER = 8;
    /* hits = 本地命中的全集（按页切片渲染）；pageItems = 当前这一页要显示的条目。
       两者必须分开：云端返回的**就是当页条目**，再按页码切一次会把末页切成空
       （实测 3/3 页只有 1 条时列表空了）。 */
    const acSt = { q: '', hits: [], pageItems: [], page: 1, pages: 1,
                   src: '', rid: '', loading: false };
    let acAutoTimer = null;

    function acLocalHits(q) {
      const lq = String(q).toLowerCase();
      const out = [];
      for (let k = 0; k < catalog.length; k++) {
        const c = catalog[k];
        const t = String(c.title || '');
        if (!t) continue;
        /* 歌名、歌手都认 —— 用户脑子里记的是「周杰伦的晴天」 */
        const a = String(c.artist || '').toLowerCase();
        if (t === q || t.indexOf(q) >= 0 || (a && a.indexOf(lq) >= 0)) {
          out.push({ t: t, a: c.artist || '', d: c.dur || 0 });
        }
      }
      out.sort((x, y) => (x.t === q ? 0 : 1) - (y.t === q ? 0 : 1) || x.t.length - y.t.length);
      return out;
    }

    function searchAsk(q, page) {
      if (!client || !synced || !q) return false;
      const rid = 'r' + (Date.now() % 1000000);
      acSt.rid = rid; acSt.q = q; acSt.page = page || 1; acSt.loading = true;
      try {
        client.publish(SEARCH_NS + '/' + myId,
          JSON.stringify({ op: 'q', q: q, page: acSt.page, per: AC_PER, rid: rid }),
          { qos: 0 });
      } catch (_) { return false; }
      renderAc();
      return true;
    }

    function onSearchMsg(j) {
      if (!j || j.op !== 'res') return;
      if (acSt.rid && j.rid && String(j.rid) !== acSt.rid) return;   // 不是这次问的
      acSt.loading = false;
      if (j.loading) { renderAc(); return; }                          // 「云端在搜…」
      acSt.hits = [];                       // 云端结果不并进本地全集
      acSt.pageItems = Array.isArray(j.items) ? j.items : [];
      acSt.page = Number(j.page) || 1;
      acSt.pages = Number(j.pages) || 1;
      acSt.src = j.src || 'yt';
      renderAc();
    }

    function renderAc() {
      const panel = $('acPanel');
      const ul = $('reqAc');
      if (!panel || !ul || !reqInput) return;
      const q = String(reqInput.value || '').trim();
      ul.textContent = '';
      /* 只有「不是浏览曲库、而且输入框空了」才收面板。
         浏览曲库（src='lib'）时输入框本来就是空的 —— 以前这里无条件 return，
         刚摊开的曲库立刻被自己收回去，面板根本不显示（截图实锤）。 */
      if (!q && acSt.src !== 'lib') { panel.hidden = true; return; }
      if (acSt.loading) {
        const li = document.createElement('li');
        li.className = 'ac-src';
        li.textContent = '云端搜索中…（第一次要等几秒）';
        ul.appendChild(li);
        panel.hidden = false;
        paintAcFoot();
        return;
      }
      if (!acSt.pageItems.length) {
        const li = document.createElement('li');
        li.className = 'ac-src';
        li.textContent = acSt.src === 'yt'
          ? '云端也没搜到《' + q + '》，换个写法或只写歌名试试'
          : '本地曲库没有《' + q + '》· 点「云端搜」全网找';
        ul.appendChild(li);
        panel.hidden = false;
        paintAcFoot();
        return;
      }
      acSt.pageItems.forEach((c) => {
        const li = document.createElement('li');
        li.className = 'ac-item';
        const em = document.createElement('em');
        em.textContent = c.t;
        li.appendChild(em);
        if (c.a) {
          const sp = document.createElement('span');
          sp.className = 'ac-artist';
          sp.textContent = c.a;
          li.appendChild(sp);
        }
        li.addEventListener('click', () => pickSong(c.t));
        ul.appendChild(li);
      });
      panel.hidden = false;
      paintAcFoot();
    }

    function paintAcFoot() {
      const prev = $('acPrev');
      const next = $('acNext');
      const page = $('acPage');
      const cloud = $('acCloud');
      if (!prev || !next || !page || !cloud) return;
      const multi = acSt.pages > 1;
      prev.disabled = !multi || acSt.page <= 1;
      next.disabled = !multi || acSt.page >= acSt.pages;
      page.textContent = multi ? (acSt.page + '/' + acSt.pages)
        : (acSt.src === 'yt' ? (acSt.pageItems.length + ' 首') : (acSt.hits.length + ' 首'));
      /* 文案别再拼书名号：浏览曲库时输入框是空的，拼出来是「云端搜《》」，
         窄按钮里直接被压成「云端搜 0」（截图实锤）。 */
      const isCloud = acSt.src === 'yt';
      cloud.textContent = acSt.loading ? '搜索中…' : (isCloud ? '重新搜云端' : '云端搜');
      /* 也别再按输入框是否为空禁用 —— 浏览曲库时正是想「拿当前列表去云端搜一遍」。 */
      cloud.disabled = !!acSt.loading;
    }

    function acGo(delta) {
      const p = acSt.page + delta;
      if (p < 1 || p > acSt.pages) return;
      acSt.page = p;
      if (acSt.src !== 'yt') {                 // 本地全集自己切页
        acSt.pageItems = acSt.hits.slice((p - 1) * AC_PER, p * AC_PER);
      }
      renderAc();
      /* 云端结果翻页要问服务器（本地页随便切） */
      if (acSt.src === 'yt' && acSt.q) searchAsk(acSt.q, p);
    }

    /* v1.21.15：输入框空着时也把**服务器曲库**摊开可翻。
       审查发现的缺口：以前必须先打字才出列表，「服务器上有的歌都还在」这件事
       用户没法自己核对 —— 现在打开点歌台就能一页页翻，点哪首点哪首。 */
    function showLibrary() {
      if (!catalog.length) { hideAc(); return; }
      const hits = catalog.map((c) => ({
        t: String(c.title || ''), a: String(c.artist || ''), d: c.dur || 0,
      }));
      acSt.q = ''; acSt.hits = hits; acSt.src = 'lib'; acSt.loading = false;
      acSt.rid = '';
      acSt.pages = Math.max(1, Math.ceil(hits.length / AC_PER));
      if (acSt.page > acSt.pages) acSt.page = 1;
      acSt.pageItems = hits.slice((acSt.page - 1) * AC_PER, acSt.page * AC_PER);
      renderAc();
    }

    function showAc() {
      if (!reqInput) return;
      const q = String(reqInput.value || '').trim();
      if (!q) { showLibrary(); return; }
      if (acSt.q !== q) {
        acSt.q = q; acSt.page = 1; acSt.loading = false; acSt.rid = '';
        const hits = acLocalHits(q);
        acSt.hits = hits;
        acSt.pages = Math.max(1, Math.ceil(hits.length / AC_PER));
        acSt.pageItems = hits.slice(0, AC_PER);
        acSt.src = hits.length ? 'repo' : '';
      }
      renderAc();
      /* 本地没有 → 停 0.8 秒自动问一次云端（只问一次；改字才再问） */
      if (!acSt.hits.length && !acSt.pageItems.length && !acSt.loading
          && acSt.src !== 'yt' && q.length >= 2) {
        clearTimeout(acAutoTimer);
        acAutoTimer = setTimeout(() => {
          if (acSt.q === q && !acSt.hits.length && !acSt.pageItems.length
            && !acSt.loading) searchAsk(q, 1);
        }, 800);
      }
    }


    /* 页脚：上一页 / 下一页 / 云端搜 */
    (function wireAcFoot() {
      const prev = $('acPrev');
      const next = $('acNext');
      const cloud = $('acCloud');
      if (prev) prev.addEventListener('click', () => acGo(-1));
      if (next) next.addEventListener('click', () => acGo(1));
      if (cloud) cloud.addEventListener('click', () => {
        const q = String(reqInput && reqInput.value || '').trim();
        if (!q) {
          /* v1.21.16 把这颗按钮从「按空输入禁用」改成可点（浏览曲库时正是想拿
             当前列表去云端搜一遍），却没给空输入的行为 —— 点了没反应，比禁用
             还让人困惑。不许再一声不吭，如实说缺什么。 */
          try { R.toast('先输入歌名，我才知道要全网找什么'); }
          catch (_) { /* 忽略 */ }
          return;
        }
        acSt.page = 1;
        searchAsk(q, 1);
      });
    }());

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

    /* ---------------- 启动 ---------------- */
    render();
    connect();
    // 周期重发：内容有变才发（fingerprint 比对），纯心跳不占带宽
    snapTimer = setInterval(() => { if (synced) publish(); }, SNAP_EVERY);
    // 状态文案每 15 秒刷一次：searching 超时判定靠它变
    setInterval(render, 15000);
    // 撤单清扫每 15 秒一遍：miss 宽限到点撤下、播过的条目清账（见 sweepDone）
    setInterval(sweepDone, 15000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && synced) publish();
    });

    /* 暴露给测试用（生产环境无副作用） */
    window.__req = {
      items: items, add: addRequest, merge: merge, prune: prune,
      norm: norm, visible: visible, render: render, say: say,
      publish: publish,
      myName: myName, setNick: setNick,
      /* 搜索分页：测试要能直接喂搜索响应 */
      acState: acSt, showAc: showAc, showLibrary: showLibrary,
      onSearchMsg: onSearchMsg,
      searchAsk: searchAsk, renderAc: renderAc,
      SEARCH_NS: SEARCH_NS,
      /* 「歌已备好」这条链路：测试要能直接喂消息 */
      ready: ready, onReady: onReady, vodFor: vodFor, findItem: findItem,
      /* 云端实时进度：和 ready 一样要能被测试直接喂消息 */
      prog: prog, onProg: onProg, freshProg: freshProg, progLabel: progLabel,
      clearProg: clearProg,
      /* 云开播（fm891-radio/air）：验 schema 校验与向 app 转发 */
      air: () => airState, onAirMsg: onAirMsg,
      /* 一次性提醒（v1.21.9）：miss 提醒 / 撤单清扫要能被测试直接驱动 */
      sweepDone: sweepDone, noteMiss: noteMiss, tombstone: tombstone,
      /* v1.21.11 选版弹窗 + 中途撤单：要能被测试直接驱动 */
      cancelRequest: cancelRequest, openCandModal: openCandModal,
      closeCandModal: closeCandModal, maybeOpenCand: maybeOpenCand,
      /* 播报闸门要看队列长度才能验（第一条会被立刻取走开始打字，长度变 0） */
      sayQueueLen: () => sayQueue.length,
      /* 最近一条播报的原文：离线时**不许**再说「云端主播马上安排」这种
       * 承诺（单子当时根本没发出去），测试要能直接读到这句。 */
      lastSay: () => lastSay,
      /* 曲库链路：联想/AI 祝福/速点的数据与行为 */
      catalog: () => catalog, ensureCatalog: ensureCatalog, 
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
