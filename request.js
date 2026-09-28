/* 拾光电台 FM89.1 — 在线点歌（阶段 1）
 * ============================================================================
 * 【这一版做什么】
 *  1. 多人同步点歌队列：每个客户端把自己看到的**全量**队列 retain 到
 *     fm891-radio/q/<cid>，同时订阅 fm891-radio/q/#，收到别人的快照后按
 *     条目 id 做并集合并。没有中心服务，但所有在线客户端会收敛到同一份
 *     队列；条目一旦被任何在线客户端复制进快照，提出者下线也不会丢歌。
 *  2. 全网找台（**这就是"主播找歌"**）：点歌后并发拉各台的 nowplaying
 *     （蜻蜓官方接口，app.js 的在线人数用的同一个），谁**正在放**这首歌就
 *     走 selectStation() 正式切台。真出声、零后端、零版权风险。
 *  3. 主播气泡：事件驱动的打字机播报。
 *
 * 【为什么阶段 1 不接电报】
 *  @music_v1bot 的协议已逆向清楚（/search → 编号列表 + inline 键盘 →
 *  getCallbackQueryAnswer → messageAudio），但它回的是**电报音频文件**而不
 *  是 HTTP 直链，下载必须走 MTProto，因此绕不开一台常驻后端。阶段 1 刻意
 *  零后端；阶段 2 接入后，电报只是给这里**多加一个音源**，队列/气泡/切台
 *  全部复用，不用重做。
 *
 * 【隔离原则】
 *  本模块只通过 window.__radio 走 selectStation() 这一个入口碰播放，
 *  绝不直接操作 audio、不碰 playToken / switchUntil / 重连体系（v1.15 刚
 *  修完的换源防护）。整体 try/catch 静默降级，本模块挂了不影响电台本身。
 */
(function requestStation() {
  try {
    if (typeof mqtt === 'undefined') return;
    const R = window.__radio;
    if (!R || !R.stations || !R.select) return;

    const $ = (id) => document.getElementById(id);

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
    /* 扫描节流参数单独成表，并从 __req 暴露出去：测试要把 deadline 压到几十
     * 毫秒才能验证「硬截止真的会停」。光读源码断言等于赌它没被改坏。 */
    const TUNING = {
      npTimeout: 7000,      // 单台 nowplaying 拉取超时
      concurrency: 10,      // 并发数：公共接口，别打太猛
      interBatch: 80,       // 轮次之间的喘息，别把公共接口当压测目标
      deadline: 150000,     // 找歌 2.5 分钟硬停（见 scan 内的说明）
    };

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
    let mySeq = 0;
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
    function addRequest(title) {
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

      const it = {
        id: myId + '-' + (++mySeq),
        cid: myId,
        who: myName(),
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
      say('收到 ' + it.who + ' 点的《' + t + '》，主播全网找歌中…');
      scan(it);
    }

    /* ---------------- 全网找台 ----------------
     * 拉每台的 nowplaying → 归一化匹配 → 命中就正式切台。
     * 音乐类台在前（命中率最高），先扫 108 个音乐台通常几秒内就有结果。 */
    let scanToken = 0;

    function buildOrder() {
      const st = R.stations();
      const music = [];
      const rest = [];
      for (let i = 0; i < st.length; i++) {
        (st[i] && st[i].cat === 'music' ? music : rest).push(i);
      }
      return music.concat(rest);
    }

    function norm(s) {
      return String(s || '')
        .toLowerCase()
        .replace(/[（(\[【][^）)\]】]*[)）\]】]/g, '')  // 去 (Live)、【高清】这类注记
        .replace(/[^0-9a-z\u4e00-\u9fa5]+/g, '');       // 其余非中英数字全部剔除
    }

    /* 打分：完全相等 3 > 前缀 2 > 包含 1。短歌名只认等值/前缀，防止
     * 「江南」匹配上「江南皮革厂」之外的长串误伤（前缀仍可能命中，
     * 但那是 nowplaying 真以该歌名开头，可接受）。 */
    function score(title, np) {
      const a = norm(title);
      const b = norm(np);
      if (!a || !b) return 0;
      if (a === b) return 3;
      if (a.length >= 2 && b.indexOf(a) === 0) return 2;
      if (a.length >= 3 && b.indexOf(a) > 0) return 1;
      return 0;
    }

    async function fetchNp(url) {
      const cid = R.qtId(url);
      if (!cid) return '';
      const ctl = typeof AbortController === 'function' ? new AbortController() : null;
      const timer = setTimeout(() => { try { ctl && ctl.abort(); } catch (_) {} }, TUNING.npTimeout);
      try {
        const opt = { cache: 'no-store' };
        if (ctl) opt.signal = ctl.signal;
        const res = await fetch(R.api + cid, opt);
        if (!res.ok) return '';
        const j = await res.json();
        const np = j && j.Data && j.Data.nowplaying;
        return typeof np === 'string' ? np : '';
      } catch (_) {
        return '';          // 单台失败不算失败，下一批继续
      } finally {
        clearTimeout(timer);
      }
    }

    async function scan(item) {
      const token = ++scanToken;
      const started = Date.now();
      const order = buildOrder();
      const st = R.stations();
      let nextReport = 100;   // 每扫约 100 台播报一次进度，别刷屏
      for (let i = 0; i < order.length; i += TUNING.concurrency) {
        if (token !== scanToken || items.get(item.id) !== item || item.del) return;
        // 硬截止：stLabel 只负责把文案改成「找歌超时」，真正停止必须在这里做。
        // 否则 887 台全超时就是 887 次请求连着发十几分钟，既费电又会把
        // 同一个官方接口（在线人数角标也走它）一起拖下水。
        if (Date.now() - started > TUNING.deadline) { miss(item); return; }
        const batch = order.slice(i, i + TUNING.concurrency);
        const got = await Promise.all(batch.map((gi) => fetchNp(st[gi].url)));
        let best = null;
        let bestScore = 0;
        for (let k = 0; k < batch.length; k++) {
          if (!got[k]) continue;
          const s = score(item.title, got[k]);
          if (s > bestScore) { bestScore = s; best = { gi: batch[k], np: got[k] }; }
        }
        if (best) { hit(item, best); return; }
        if (i >= nextReport) {
          say('还在找《' + item.title + '》…已扫 ' + i + ' 个台');
          nextReport += 100;
        }
        // 轮次之间喘口气：公共接口不该被当成压测目标
        await sleep(TUNING.interBatch);
      }
      miss(item);
    }

    function hit(item, best) {
      if (item.del || items.get(item.id) !== item) return;
      const stn = (R.stations()[best.gi] || {}).name || '电台';
      item.st = 'ready';
      item.gi = best.gi;
      item.stn = stn;
      item.np = best.np;
      item.ver += 1;
      publish();
      render();
      // 自己点的歌：直接走正式切台入口（会顺带刷台单/原生桥/在线人数/代际）
      if (item.mine) {
        item.st = 'playing';
        item.ver += 1;
        publish();
        render();
        R.select(best.gi);
        say('主播在「' + stn + '」找到了《' + item.title + '》，切过去啦 🎵');
      } else {
        say(item.who + ' 点的《' + item.title + '》来了，在「' + stn + '」，点一下一起听');
      }
    }

    function miss(item) {
      if (item.del || items.get(item.id) !== item) return;
      item.st = 'miss';
      item.ver += 1;
      publish();
      render();
      say('全网电台这会儿都没在放《' + item.title + '》，先记进点歌池了');
    }

    /* ---------------- MQTT 同步 ---------------- */
    let client = null;
    let brokerIdx = 0;
    let myTopic = '';
    let snapTimer = null;

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
        publish(true);
        render();
        say('点歌台已上线，全网听友的点歌会同步到这里');
      });
      c.on('message', (topic, payload) => {
        if (client !== me || topic === myTopic) return;
        let list = null;
        try { list = JSON.parse(payload ? payload.toString() : ''); } catch (_) { return; }
        // 空载荷 = 对端下线（LWT）。它的条目早已被我们合并进本地，不会丢。
        if (!list) { return; }
        if (merge(list)) { prune(); publish(); render(); }
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

    function stLabel(it) {
      // 卡死检测：发起者可能已经下线，searching 超时就别一直装作在找
      if (it.st === 'searching' && it.scanAt && Date.now() - it.scanAt > TUNING.deadline) {
        return { text: '找歌超时', cls: 'st-miss' };
      }
      switch (it.st) {
        case 'searching': return { text: '主播找歌中…', cls: 'st-search' };
        case 'ready': return { text: '可播放 · 一起听', cls: 'st-ready' };
        case 'playing': return { text: '正在播', cls: 'st-play' };
        case 'miss': return { text: '暂无电台在放', cls: 'st-miss' };
        default: return { text: '排队中', cls: 'st-wait' };
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
        const lab = stLabel(it);
        // 只有「找到台」的条目可点（点它 = 一起听），其余是纯状态展示
        const canPlay = it.gi >= 0 && (it.st === 'ready' || it.st === 'playing');
        if (canPlay) li.classList.add('can-play');
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
        meta.textContent = it.who + (it.stn ? ' · ' + it.stn : '');
        body.appendChild(t);
        body.appendChild(meta);
        const st = document.createElement('i');
        st.className = 'req-st ' + lab.cls;
        st.textContent = lab.text;
        li.appendChild(num);
        li.appendChild(body);
        li.appendChild(st);
        if (canPlay) {
          li.addEventListener('click', () => {
            R.select(it.gi);
            say('切到「' + it.stn + '」一起听《' + it.title + '》');
          });
        }
        frag.appendChild(li);
      });
      reqList.innerHTML = '';
      reqList.appendChild(frag);

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
    const nickInput = $('nickInput');
    let nickTimer = null;

    function open() {
      if (!reqMask) return;
      reqMask.hidden = false;
      render();
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
        addRequest(v);
        if (reqInput) reqInput.value = '';
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
      score: score, norm: norm, visible: visible, render: render, say: say,
      publish: publish, scan: scan, buildOrder: buildOrder,
      myName: myName, setNick: setNick, tuning: TUNING,
      /* 是否真的连上点歌台：mock 测试验不出来 retain 回放/遗嘱这些 broker 行为， */
      /* 真实 broker E2E 要靠它判断「可以开始断言了」，不靠猜时间。 */
      isSynced: () => synced,
    };
  } catch (_) {
    /* 点歌是可选功能，任何异常都不能影响电台本身 */
  }
})();
