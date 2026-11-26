/* AI Lab app: router, pages (home, chapter, lab, practice, index pages), quiz engine, search. */
(function (G) {
  'use strict';
  const AI = G.AI, esc = AI.esc, I = AI.icon;
  const main = document.getElementById('main');
  let ctx = null;
  const labsOf = n => AI.labOrder.map(id => AI.labs[id]).filter(l => String(l.ch) === String(n));
  const qOf = n => (AI.Q && AI.Q[n]) || [];
  const partOf = c => AI.parts[c.part - 1];
  const chTag = c => typeof c.n === 'number' ? `Chapter ${c.n}` : 'Global Edition chapter 20';
  const kindPill = l => `<span class="pill ${l.kind}">${l.kind === 'game' ? 'Game' : 'Demo'}</span>`;
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const countLine = c => { const L = labsOf(c.n); const d = L.filter(l => l.kind === 'demo').length, g = L.length - d; return [d && plural(d, 'demo'), g && plural(g, 'game'), qOf(c.n).length && plural(qOf(c.n).length, 'question')].filter(Boolean).join(' · '); };
  const totals = () => { const L = AI.labOrder.map(id => AI.labs[id]); return { demos: L.filter(l => l.kind === 'demo').length, games: L.filter(l => l.kind === 'game').length, qs: AI.chapters.reduce((s, c) => s + qOf(c.n).length, 0) }; };

  /* ---------- rail ---------- */
  const rail = document.getElementById('rail');
  function buildRail(active) {
    rail.innerHTML = AI.parts.map(p => `<h4 style="--pc:var(--${p.c})"><i></i>${esc(p.title)}</h4>` + AI.chapters.filter(c => c.part === p.n).map(c => {
      const done = AI.progress.quiz(c.n) || labsOf(c.n).some(l => AI.progress.visited(l.id));
      return `<a href="#${c.id}" style="--pc:var(--${p.c})" class="${done ? 'done' : ''}" ${active === c.id ? 'aria-current="page"' : ''}><b>${typeof c.n === 'number' ? c.n : 'G20'}</b><span>${esc(c.title)}</span></a>`;
    }).join('')).join('');
  }
  const scrim = document.getElementById('scrim');
  const closeDrawer = () => { rail.classList.remove('drawer'); scrim.classList.remove('open'); };
  document.getElementById('menuBtn').addEventListener('click', () => { const open = !rail.classList.contains('drawer'); rail.classList.toggle('drawer', open); scrim.classList.toggle('open', open); });
  scrim.addEventListener('click', closeDrawer);

  /* ---------- router ---------- */
  const routes = [
    [/^$|^home$/, home], [/^ch-(\d+|g20)$/, m => chapter(m[1])], [/^lab-([a-z0-9-]+)$/, m => lab(m[1])],
    [/^quiz-(\d+|g20)$/, m => quiz(m[1])], [/^labs$/, labsIndex], [/^practice$/, practice], [/^papers$/, papers], [/^about$/, about]
  ];
  function route() {
    if (ctx) { ctx.destroy(); ctx = null; }
    closeDrawer();
    const h = decodeURIComponent(location.hash.replace(/^#/, ''));
    document.body.classList.remove('is-lab');
    let hit = false;
    for (const [re, fn] of routes) { const m = h.match(re); if (m) { hit = true; ctx = AI.makeCtx(); main.innerHTML = ''; try { fn(m); } catch (e) { console.error(e); main.innerHTML = `<div class="page"><h1>Something went wrong</h1><p class="lede">This page hit an error: ${esc(e.message)}. Try reloading.</p></div>`; } break; } }
    if (!hit) { main.innerHTML = `<div class="page"><h1>Page not found</h1><p class="lede">There is no page called “${esc(h)}”.</p><p><a class="btn primary" href="#home">Go to the home page</a></p></div>`; }
    const sec = /^lab-|^labs$/.test(h) ? 'labs' : /^quiz-|^practice$/.test(h) ? 'practice' : /^papers$/.test(h) ? 'papers' : /^about$/.test(h) ? 'about' : 'home';
    document.querySelectorAll('.topnav a').forEach(a => { if (a.getAttribute('href') === '#' + sec) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (!document.body.classList.contains('keep-scroll')) window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', route);

  /* ---------- home ---------- */
  function home() {
    document.title = 'AI Lab';
    buildRail('');
    const t = totals();
    main.innerHTML = `<div class="page">
      <div class="home-head">
        <div><h1>AI Lab</h1>
        <p class="lede">Every chapter of Russell and Norvig’s <i>Artificial Intelligence: A Modern Approach</i> as simulations you can step through, games you can play, and exam-style questions with worked answers.</p></div>
        <div class="home-stats"><div><b>28</b><span>chapters</span></div><div><b>${t.demos}</b><span>demos</span></div><div><b>${t.games}</b><span>games</span></div><div><b>${t.qs}</b><span>questions</span></div></div>
      </div>
      <div class="route-wrap"><div class="route" id="route"></div><div class="route-legend">${AI.parts.map(p => `<span style="--pc:var(--${p.c})"><i></i>${esc(p.title)}</span>`).join('')}</div></div>
      <section class="section"><h2>Start with something you can play</h2><p class="sub">Four favourites from different parts of the book.</p><div class="grid2" id="features" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,215px),1fr))"></div></section>
      <section class="section"><div class="steps4">
        <div><b>Read</b><p>Each chapter opens with its key ideas, terms and the exam traps students fall into.</p></div>
        <div><b>Step through</b><p>Demos run the book’s algorithms one step at a time and say what each step did, or recompute live as you change the inputs.</p></div>
        <div><b>Play</b><p>Games make you do the algorithm’s job, then compare you with the machine.</p></div>
        <div><b>Practise</b><p>Exam-style questions with answers, plus links to real MIT, Harvard and Berkeley papers.</p></div>
      </div></section>
      <section class="section" id="parts"><h2>All chapters</h2><p class="sub">Chapter numbers follow the 4th US edition. Each chapter page also gives its Global Edition number.</p>
      ${AI.parts.map(p => `<div class="part-block" style="--pc:var(--${p.c})"><div class="pt"><i></i><div>Part ${p.n}: ${esc(p.title)}<small>${esc(p.blurb)}</small></div></div><div class="chlist">${AI.chapters.filter(c => c.part === p.n).map(c => `<a href="#${c.id}"><b>${typeof c.n === 'number' ? c.n : 'G20'}</b><span>${esc(c.title)}</span><em>${esc(countLine(c) || 'Notes and questions')}</em></a>`).join('')}</div></div>`).join('')}
      </section></div>`;
    drawRoute(document.getElementById('route'));
    const F = [['romania-search', 'astar'], ['wumpus', 'wumpus'], ['tictactoe', 'ttt'], ['nn-playground', 'nn']];
    document.getElementById('features').innerHTML = F.filter(([id]) => AI.labs[id]).map(([id, art]) => { const l = AI.labs[id], c = AI.chapterBy(l.ch); return `<a class="feature" href="#lab-${id}"><div class="art">${miniArt(art)}</div><div class="tagrow">${kindPill(l)}<span class="pill ch ${c.pc}" style="--pc:var(--${c.pc})">${chTag(c)}</span></div><h3>${esc(l.title)}</h3><p>${esc(l.blurb)}</p></a>`; }).join('');
  }
  function wrapWords(s, max) { const w = s.split(' '); const lines = []; let cur = ''; w.forEach(x => { if ((cur + ' ' + x).trim().length > max && cur) { lines.push(cur); cur = x; } else cur = (cur + ' ' + x).trim(); }); if (cur) lines.push(cur); return lines; }
  function drawRoute(host) {
    const chs = AI.chapters.filter(c => typeof c.n === 'number');
    const firstOpen = chs.find(c => !(AI.progress.quiz(c.n) || labsOf(c.n).some(l => AI.progress.visited(l.id))));
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Route map of the chapters'); host.appendChild(svg);
    const draw = () => {
      const W = host.clientWidth; if (!W) return;
      const per = W >= 1120 ? 7 : W >= 900 ? 6 : W >= 700 ? 5 : W >= 500 ? 4 : 3;
      const rows = Math.ceil(chs.length / per), side = W < 500 ? 34 : 58, top = 34;
      const dx = (W - 2 * side) / (per - 1);
      const maxc = Math.max(9, Math.floor((dx - 18) / 6.9)), maxEdge = Math.max(8, Math.floor((dx / 2 + 4) / 6.9));
      const labels = chs.map((c, i) => { const k = i % per; return wrapWords(c.title, per > 1 && (k === 0 || k === per - 1) ? maxEdge : maxc); });
      const maxL = Math.max(1, ...labels.map(l => l.length)), dy = Math.max(W < 500 ? 96 : 108, 80 + (maxL - 1) * 15), H = top + (rows - 1) * dy + 46 + (maxL - 1) * 15;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.style.height = H + 'px';
      const pos = chs.map((c, i) => { const r = Math.floor(i / per), k = i % per; return { c, x: r % 2 ? W - side - k * dx : side + k * dx, y: top + r * dy, r }; });
      const col = c => `var(--${c.pc})`;
      let lines = '';
      for (let i = 0; i < pos.length - 1; i++) {
        const a = pos[i], b = pos[i + 1];
        if (a.r === b.r) { const mx = (a.x + b.x) / 2; lines += `<path d="M${a.x} ${a.y}H${mx}" stroke="${col(a.c)}"/><path d="M${mx} ${a.y}H${b.x}" stroke="${col(b.c)}"/>`; }
        else { const rad = dy / 2, rx = Math.min(rad, side - 8), dir = a.r % 2 ? -1 : 1, cx = a.x, cy = a.y + rad; lines += `<path d="M${a.x} ${a.y}A${rx} ${rad} 0 0 ${dir > 0 ? 1 : 0} ${cx + dir * rx} ${cy}" stroke="${col(a.c)}"/><path d="M${cx + dir * rx} ${cy}A${rx} ${rad} 0 0 ${dir > 0 ? 1 : 0} ${b.x} ${b.y}" stroke="${col(b.c)}"/>`; }
      }
      const st = pos.map((p, i) => {
        const done = AI.progress.quiz(p.c.n) || labsOf(p.c.n).some(l => AI.progress.visited(l.id));
        const lab = labels[i];
        const here = firstOpen === p.c;
        return `<a href="#${p.c.id}" class="st" aria-label="Chapter ${p.c.n}: ${esc(p.c.title)}">
          ${here ? `<circle cx="${p.x}" cy="${p.y}" r="24" fill="none" stroke="${col(p.c)}" stroke-width="2" class="pulse"/>` : ''}
          <circle class="ring" cx="${p.x}" cy="${p.y}" r="17" fill="${done ? col(p.c) : 'var(--bg)'}" stroke="${col(p.c)}" stroke-width="4"/>
          <text x="${p.x}" y="${p.y + 5}" text-anchor="middle" class="num" fill="${done ? (p.c.pc === 'p4' ? '#1d1400' : '#fff') : col(p.c)}">${p.c.n}</text>
          ${lab.map((ln, k) => { const edgeL = p.x < side + 4 && per > 1, edgeR = p.x > W - side - 4; return `<text x="${edgeL ? p.x - 14 : edgeR ? p.x + 14 : p.x}" y="${p.y + 36 + k * 15}" text-anchor="${edgeL ? 'start' : edgeR ? 'end' : 'middle'}" class="lbl halo">${esc(ln)}</text>`; }).join('')}
          <title>${esc(p.c.title)}</title></a>`;
      }).join('');
      svg.innerHTML = `<style>.pulse{transform-origin:center;transform-box:fill-box;animation:pulse 2.2s ease-out infinite}@keyframes pulse{0%{opacity:.9;transform:scale(.8)}100%{opacity:0;transform:scale(1.5)}}@media (prefers-reduced-motion:reduce){.pulse{animation:none}}</style><g fill="none" stroke-width="9" stroke-linecap="round">${lines}</g>${st}`;
    };
    ctx.resize(host, draw); draw();
  }
  function miniArt(kind) {
    if (kind === 'astar') { const P = [[30, 40], [80, 25], [70, 80], [130, 60], [150, 110], [200, 70], [230, 120], [260, 40]]; const E = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 6], [5, 6], [5, 7]]; const path = [0, 2, 3, 5, 7]; return `<svg viewBox="0 0 290 150" preserveAspectRatio="xMidYMid meet">${E.map(([a, b]) => `<line x1="${P[a][0]}" y1="${P[a][1]}" x2="${P[b][0]}" y2="${P[b][1]}" stroke="var(--v-edge)" stroke-width="2"/>`).join('')}${path.slice(1).map((b, i) => `<line x1="${P[path[i]][0]}" y1="${P[path[i]][1]}" x2="${P[b][0]}" y2="${P[b][1]}" stroke="var(--v-path)" stroke-width="5" stroke-linecap="round"/>`).join('')}${P.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="9" fill="${i === 7 ? 'var(--v-goal)' : i === 0 ? 'var(--ink)' : [1, 4].includes(i) ? 'var(--v-frontier)' : 'var(--v-explored)'}" stroke="var(--bg)" stroke-width="2"/>`).join('')}</svg>`; }
    if (kind === 'wumpus') { let s = ''; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) s += `<rect x="${55 + x * 46}" y="${6 + y * 34}" width="43" height="31" rx="5" fill="${(x + y) % 2 ? 'var(--bg3)' : 'var(--v-soft)'}"/>`; return `<svg viewBox="0 0 290 150">${s}<circle cx="${55 + 2 * 46 + 21}" cy="${6 + 34 + 15}" r="10" fill="var(--ink)"/><path d="M${55 + 3 * 46 + 10} ${6 + 2 * 34 + 23}l11-15 11 15z" fill="var(--v-frontier)"/><circle cx="${55 + 21}" cy="${6 + 3 * 34 + 15}" r="9" fill="var(--v-path)"/><text x="${55 + 46 + 21}" y="${6 + 3 * 34 + 20}" text-anchor="middle" class="svg-s">breeze</text><path d="M${55 + 2 * 46 + 8} ${6 + 2 * 34 + 8}l27 15M${55 + 2 * 46 + 35} ${6 + 2 * 34 + 8}l-27 15" stroke="var(--v-bad)" stroke-width="3"/></svg>`; }
    if (kind === 'ttt') { const b = 'XO.XXO.O.'; let s = ''; for (let i = 0; i < 9; i++) { const x = 100 + (i % 3) * 32, y = 22 + Math.floor(i / 3) * 36; if (b[i] === 'X') s += `<path d="M${x + 7} ${y + 8}l18 18M${x + 25} ${y + 8}l-18 18" stroke="var(--v-max)" stroke-width="4" stroke-linecap="round"/>`; else if (b[i] === 'O') s += `<circle cx="${x + 16}" cy="${y + 17}" r="10" fill="none" stroke="var(--v-min)" stroke-width="4"/>`; else s += `<text x="${x + 16}" y="${y + 22}" text-anchor="middle" class="svg-b" style="font-size:14px" fill="${i === 6 ? 'var(--ok)' : 'var(--muted)'}">${i === 6 ? '+1' : i === 2 ? '0' : '−1'}</text>`; } return `<svg viewBox="0 0 290 150"><path d="M132 22v106M164 22v106M100 58h96M100 94h96" stroke="var(--line2)" stroke-width="3"/>${s}</svg>`; }
    if (kind === 'nn') { const L = [[2, 40], [4, 125], [4, 210], [1, 270]]; let s = '', nodes = []; L.forEach(([k, x]) => { const col = []; for (let i = 0; i < k; i++) col.push([x, 75 + (i - (k - 1) / 2) * 30]); nodes.push(col); }); for (let l = 0; l < nodes.length - 1; l++) nodes[l].forEach(a => nodes[l + 1].forEach((b, j) => { s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${(j + l) % 3 ? 'var(--v-path)' : 'var(--v-bad)'}" stroke-opacity=".55" stroke-width="${1 + ((j * 7 + l * 3) % 3)}"/>`; })); nodes.flat().forEach(p => { s += `<circle cx="${p[0]}" cy="${p[1]}" r="9" fill="var(--bg)" stroke="var(--ink)" stroke-width="2"/>`; }); return `<svg viewBox="0 0 310 150">${s}</svg>`; }
    return '';
  }

  /* ---------- chapter ---------- */
  function chapter(key) {
    const c = AI.chapterBy(key); if (!c) { main.innerHTML = '<div class="page"><h1>No such chapter</h1></div>'; return; }
    const p = partOf(c); document.title = `${chTag(c)}: ${c.title} · AI Lab`; buildRail(c.id);
    const L = labsOf(c.n), Q = qOf(c.n), N = (AI.notes && AI.notes[c.n]) || null;
    const idx = AI.chapters.indexOf(c), prev = AI.chapters[idx - 1], next = AI.chapters[idx + 1];
    const qp = AI.progress.quiz(c.n);
    const papers = c.papers.map(([k, what]) => { const s = AI.sources[k]; return `<li><a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a><span class="src">${esc(s.s)} · ${esc(what)}</span></li>`; }).join('');
    const ex = c.ex.map(s => `<li><a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a><span class="src">${esc(s.s)}</span></li>`).join('');
    main.innerHTML = `<div class="ch-band ${p.c}" style="--pc:var(--${p.c})">
        <div class="crumbs"><a href="#home">Home</a><span>›</span><span>Part ${p.n}: ${esc(p.title)}</span></div>
        <div class="bignum">${typeof c.n === 'number' ? c.n : 'G20'}</div>
        <h1>${esc(c.title)}</h1><p class="lede">${esc(c.blurb)}</p>
        <div class="meta"><span>${c.global ? 'Only in the Global Edition (chapter 20)' : `Global Edition: chapter ${c.g}`}</span><span>${esc(countLine(c))}</span></div>
      </div>
      <div class="page" style="padding-top:0"><div class="ch-grid">
        <article class="notes" id="notes">${N ? renderNotes(N) : ''}</article>
        <aside class="aside">
          ${L.length ? `<div class="aside-box"><h3>Demos and games</h3><div class="board">${L.map(boardRow).join('')}</div></div>` : ''}
          ${Q.length ? `<div class="aside-box"><h3>Practise</h3><p class="small muted" style="margin:0 0 10px">${Q.length} exam-style questions with worked answers.${qp ? ` Your last score: <b>${qp.right} / ${qp.total}</b>.` : ''}</p><a class="btn primary" href="#quiz-${String(c.n).toLowerCase()}">${qp ? 'Continue practising' : 'Start the questions'}${I.arrow}</a></div>` : ''}
          ${papers ? `<div class="aside-box"><h3>Real exam papers on this topic</h3><ul class="linklist">${papers}</ul></div>` : ''}
          <div class="aside-box"><h3>Textbook exercises</h3><ul class="linklist">${ex}</ul></div>
          <div class="aside-box" style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">${prev ? `<a class="btn small" href="#${prev.id}">${I.back}${esc(chTag(prev).replace('Chapter', 'Ch.'))}</a>` : '<span></span>'}${next ? `<a class="btn small" href="#${next.id}">${esc(chTag(next).replace('Chapter', 'Ch.').replace('Global Edition chapter 20', 'G20'))}${I.arrow}</a>` : ''}</div>
        </aside></div></div>`;
  }
  const boardRow = l => `<a class="row ${AI.progress.visited(l.id) ? 'seen' : ''}" href="#lab-${l.id}"><span class="k">${kindPill(l)}</span><span class="t">${esc(l.title)}</span><span class="d">${esc(l.blurb)}</span><span class="go">${I.arrow}</span></a>`;
  function renderNotes(N) {
    let h = '';
    if (N.intro) h += `<p class="lede" style="font-size:17px">${N.intro}</p>`;
    if (N.ideas) h += `<h2>Key ideas</h2>` + N.ideas.map(([t, body]) => `<div class="idea"><h3>${esc(t)}</h3>${body}</div>`).join('');
    if (N.terms) h += `<h3>Terms to know</h3><dl class="glossary">${N.terms.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${d}</dd>`).join('')}</dl>`;
    if (N.traps) h += `<h3>Exam traps</h3><ul>${N.traps.map(t => `<li>${t}</li>`).join('')}</ul>`;
    return h;
  }

  /* ---------- lab page ---------- */
  function lab(id) {
    const l = AI.labs[id]; if (!l) { main.innerHTML = `<div class="page"><h1>No such lab</h1><p><a class="btn" href="#labs">See all demos and games</a></p></div>`; return; }
    const c = AI.chapterBy(l.ch), p = partOf(c);
    document.body.classList.add('is-lab'); document.title = `${l.title} · AI Lab`; buildRail(c.id);
    AI.progress.visit(id);
    const sib = labsOf(c.n), k = sib.indexOf(l), nx = sib[k + 1], pv = sib[k - 1];
    main.innerHTML = `<div class="page wide">
      <div class="crumbs"><a href="#home">Home</a><span>›</span><a href="#${c.id}">${esc(chTag(c))}: ${esc(c.title)}</a></div>
      <div class="lab-head"><div><h1>${esc(l.title)}</h1><p class="lede">${esc(l.blurb)}</p>
        <div class="tagline">${kindPill(l)}<span class="pill ch ${p.c}" style="--pc:var(--${p.c})">${esc(chTag(c))}</span>${(l.tags || []).map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div></div>
        <div class="nav2">${pv ? `<a class="btn small" href="#lab-${pv.id}" title="${esc(pv.title)}">${I.back}Previous</a>` : ''}${nx ? `<a class="btn small" href="#lab-${nx.id}" title="${esc(nx.title)}">Next${I.arrow}</a>` : `<a class="btn small" href="#quiz-${String(c.n).toLowerCase()}">Practise${I.arrow}</a>`}</div></div>
      <div id="labroot"></div>
      ${l.how ? `<div class="howto">${l.how.map(([t, b]) => `<div><h3>${esc(t)}</h3>${b}</div>`).join('')}</div>` : ''}
    </div>`;
    const root = document.getElementById('labroot');
    try { l.mount(root, ctx); } catch (e) { console.error(e); root.innerHTML = `<div class="panel"><b>This lab could not start.</b> ${esc(e.message)}</div>`; }
  }

  /* ---------- quiz engine ---------- */
  function renderQuiz(host, qs, opts) {
    opts = opts || {};
    const state = opts.saved || {}; // index -> {ok, v}
    const bar = AI.el(`<div class="qbar" style="--pc:${opts.color || 'var(--ink)'}"><span><b class="qa">0</b> of ${qs.length} answered</span><div class="meter"><i></i></div><span>Score <b class="qs">0</b></span><button type="button" class="btn small" data-act="reset">${I.reset}Start again</button></div>`);
    host.appendChild(bar);
    const list = AI.el('<div class="quiz"></div>'); host.appendChild(list);
    const upd = () => { const a = Object.keys(state).length, r = Object.values(state).filter(s => s.ok).length; bar.querySelector('.qa').textContent = a; bar.querySelector('.qs').textContent = `${r} / ${qs.length}`; bar.querySelector('.meter i').style.width = (a / qs.length * 100) + '%'; opts.onChange && opts.onChange({ answers: state, right: r, total: qs.length, answered: a }); };
    qs.forEach((q, i) => {
      const card = AI.el(`<div class="q" id="q${i + 1}"><div class="qh"><span class="qn">Question ${i + 1}${q.lvl ? ` · ${['', 'Warm-up', 'Exam level', 'Challenge'][q.lvl]}` : ''}</span>${q.src ? `<span class="pill">${esc(q.src)}</span>` : ''}</div><div class="qt">${q.q}</div>${q.fig ? `<div class="qfig">${q.fig}</div>` : ''}<div class="ans"></div><div class="fb"></div>${q.seen ? `<div class="seen">This topic is examined in: ${esc(q.seen)}</div>` : ''}</div>`);
      list.appendChild(card);
      const ans = card.querySelector('.ans'), fb = card.querySelector('.fb');
      const reveal = (ok, v) => { state[i] = { ok, v }; fb.innerHTML = `<b class="${ok ? 'ok' : 'no'}">${ok ? 'Correct.' : 'Not quite.'}</b> ${q.explain || ''}`; fb.classList.add('show'); upd(); };
      const type = q.type || (q.opts ? 'mcq' : 'num');
      if (type === 'mcq' || type === 'tf') {
        const opts2 = type === 'tf' ? ['True', 'False'] : q.opts; const correct = type === 'tf' ? (q.a ? 0 : 1) : q.a;
        ans.innerHTML = `<div class="opts">${opts2.map((o, k) => `<button type="button" class="opt" data-k="${k}"><span class="lt">${String.fromCharCode(65 + k)}</span><span>${o}</span></button>`).join('')}</div>`;
        const btns = [...ans.querySelectorAll('.opt')];
        const lock = (k) => { btns.forEach((b, j) => { b.disabled = true; if (j === correct) b.classList.add('right'); if (j === k && k !== correct) b.classList.add('wrong'); if (j === k) b.setAttribute('aria-pressed', 'true'); }); };
        btns.forEach((b, k) => b.addEventListener('click', () => { if (state[i]) return; lock(k); reveal(k === correct, k); }));
        if (state[i]) { lock(state[i].v); fb.innerHTML = `<b class="${state[i].ok ? 'ok' : 'no'}">${state[i].ok ? 'Correct.' : 'Not quite.'}</b> ${q.explain || ''}`; fb.classList.add('show'); }
      } else if (type === 'multi') {
        ans.innerHTML = `<p class="small muted" style="margin:0 0 8px">Select all that apply, then check.</p><div class="opts">${q.opts.map((o, k) => `<button type="button" class="opt" data-k="${k}" aria-pressed="false"><span class="lt">${String.fromCharCode(65 + k)}</span><span>${o}</span></button>`).join('')}</div><div class="btns" style="margin-top:10px"><button type="button" class="btn primary small">Check</button></div>`;
        const btns = [...ans.querySelectorAll('.opt')], chk = ans.querySelector('.btn.primary'); const sel = new Set();
        btns.forEach((b, k) => b.addEventListener('click', () => { if (state[i]) return; sel.has(k) ? sel.delete(k) : sel.add(k); b.setAttribute('aria-pressed', String(sel.has(k))); }));
        const lock = (chosen) => { btns.forEach((b, k) => { b.disabled = true; const isA = q.a.includes(k); if (isA) b.classList.add('right'); else if (chosen.includes(k)) b.classList.add('wrong'); b.setAttribute('aria-pressed', String(chosen.includes(k))); }); chk.disabled = true; };
        chk.addEventListener('click', () => { if (state[i]) return; const ch = [...sel].sort(); const ok = ch.length === q.a.length && q.a.every(x => sel.has(x)); lock(ch); reveal(ok, ch); });
        if (state[i]) { lock(state[i].v); fb.innerHTML = `<b class="${state[i].ok ? 'ok' : 'no'}">${state[i].ok ? 'Correct.' : 'Not quite.'}</b> ${q.explain || ''}`; fb.classList.add('show'); }
      } else {
        ans.innerHTML = `<div class="numrow"><input type="text" inputmode="decimal" aria-label="Your answer" placeholder="Your answer"><span class="muted">${esc(q.unit || '')}</span><button type="button" class="btn primary small">Check</button></div>`;
        const inp = ans.querySelector('input'), b = ans.querySelector('button');
        const tol = q.tol != null ? q.tol : (Math.abs(q.a) >= 10 ? 0.5 : 0.01);
        const parse = s => { s = String(s).trim().replace(/[−–]/g, '-').replace(/,/g, ''); if (/^-?\d+\s*\/\s*\d+$/.test(s)) { const [n, d] = s.split('/').map(Number); return n / d; } return parseFloat(s); };
        const check = () => { if (state[i]) return; const v = parse(inp.value); if (!isFinite(v)) { inp.focus(); return; } inp.disabled = true; b.disabled = true; reveal(Math.abs(v - q.a) <= tol, inp.value); fb.innerHTML += ` <span class="muted">(Answer: ${esc(q.show || q.a)}${q.unit ? ' ' + esc(q.unit) : ''})</span>`; };
        b.addEventListener('click', check); inp.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
        if (state[i]) { inp.value = state[i].v; inp.disabled = true; b.disabled = true; fb.innerHTML = `<b class="${state[i].ok ? 'ok' : 'no'}">${state[i].ok ? 'Correct.' : 'Not quite.'}</b> ${q.explain || ''} <span class="muted">(Answer: ${esc(q.show || q.a)}${q.unit ? ' ' + esc(q.unit) : ''})</span>`; fb.classList.add('show'); }
      }
    });
    bar.querySelector('[data-act="reset"]').addEventListener('click', () => { Object.keys(state).forEach(k => delete state[k]); opts.onReset ? opts.onReset() : null; });
    upd();
  }
  function quiz(key) {
    const c = AI.chapterBy(key); if (!c) return;
    const p = partOf(c), Q = qOf(c.n); buildRail(c.id);
    document.title = `${chTag(c)} practice · AI Lab`;
    const saved = AI.progress.quiz(c.n);
    main.innerHTML = `<div class="page"><div class="crumbs"><a href="#home">Home</a><span>›</span><a href="#${c.id}">${esc(chTag(c))}: ${esc(c.title)}</a></div>
      <h1 style="margin-bottom:8px">Practice: ${esc(c.title)}</h1>
      <p class="lede">Answer each question to see the worked solution. Your answers are kept in this browser.</p>
      <div id="qhost" style="margin-top:18px"></div>
      ${c.papers.length ? `<section class="section"><h2>Ready for real papers?</h2><p class="sub">These are the actual exams. Try them under time, then check the official solutions.</p><ul class="linklist" style="max-width:860px">${c.papers.map(([k, w]) => { const s = AI.sources[k]; return `<li><a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a><span class="src">${esc(s.s)} · ${esc(w)}</span></li>`; }).join('')}</ul></section>` : ''}</div>`;
    const host = document.getElementById('qhost');
    if (!Q.length) { host.innerHTML = '<p class="empty">No questions for this chapter yet.</p>'; return; }
    renderQuiz(host, Q, { color: `var(--${p.c})`, saved: saved ? saved.answers : {}, onChange: s => AI.progress.quiz(c.n, s), onReset: () => { AI.progress.quiz(c.n, null); route(); } });
  }

  /* ---------- index pages ---------- */
  function labsIndex() {
    document.title = 'Demos and games · AI Lab'; buildRail('');
    const st = { kind: 'all', part: 0 };
    main.innerHTML = `<div class="page"><h1>Demos and games</h1><p class="lede">Every demo and game in the lab, in book order. Demos show an algorithm at work; games put you in charge.</p><div class="filters" id="flt"></div><div id="lst"></div></div>`;
    const lst = document.getElementById('lst');
    const draw = () => { lst.innerHTML = AI.parts.filter(p => !st.part || p.n === st.part).map(p => { const rows = AI.chapters.filter(c => c.part === p.n).flatMap(c => labsOf(c.n).filter(l => st.kind === 'all' || l.kind === st.kind).map(l => [c, l])); if (!rows.length) return ''; return `<section class="section" style="--pc:var(--${p.c})"><h2 style="display:flex;gap:10px;align-items:center"><span style="width:14px;height:14px;border-radius:50%;background:var(--pc)"></span>Part ${p.n}: ${esc(p.title)}</h2><div class="board" style="margin-top:10px">${rows.map(([c, l]) => boardRow(l).replace('<span class="t">', `<span class="t"><span class="muted" style="font-weight:600">${typeof c.n === 'number' ? c.n : 'G20'} · </span>`)).join('')}</div></section>`; }).join('') || '<p class="empty">Nothing matches.</p>'; };
    AI.controls(document.getElementById('flt'), [{ t: 'seg', k: 'kind', opts: [['all', 'All'], ['demo', 'Demos'], ['game', 'Games']] }, { t: 'select', k: 'part', label: '', opts: [[0, 'All parts']].concat(AI.parts.map(p => [p.n, `Part ${p.n}: ${p.title}`])) }], st, draw);
    draw();
  }
  function practice() {
    document.title = 'Practice · AI Lab'; buildRail('');
    main.innerHTML = `<div class="page"><h1>Practice</h1><p class="lede">Questions written in the style of university AI exams, each with a worked answer. Work chapter by chapter, or build a mixed test.</p>
      <div class="grid2" style="margin-top:22px;align-items:start"><section><h2 style="margin-bottom:10px">By chapter</h2><div id="chp"></div></section>
      <section class="panel tint"><h3>Mixed test</h3><p class="small muted">A random set from the parts you choose. Good revision before an exam.</p><div id="mixc"></div><div id="mixq" style="margin-top:16px"></div></section></div></div>`;
    document.getElementById('chp').innerHTML = AI.chapters.filter(c => qOf(c.n).length).map(c => { const s = AI.progress.quiz(c.n), n = qOf(c.n).length; return `<a class="ch-progress" href="#quiz-${String(c.n).toLowerCase()}" style="--pc:var(--${c.pc})"><b>${typeof c.n === 'number' ? c.n : 'G20'}</b><span>${esc(c.title)}</span><span class="bar"><i style="width:${s ? s.answered / n * 100 : 0}%"></i></span><span class="sc">${s ? `${s.right} / ${n}` : `${n} questions`}</span></a>`; }).join('');
    const st = { part: 0, n: 15 };
    AI.controls(document.getElementById('mixc'), [{ t: 'select', k: 'part', label: 'From', opts: [[0, 'The whole book']].concat(AI.parts.map(p => [p.n, `Part ${p.n}: ${p.title}`])) }, { t: 'select', k: 'n', label: 'Questions', opts: [[10, '10'], [15, '15'], [25, '25'], [40, '40']] }, { t: 'btn', label: 'Build test', cls: 'primary', on: build }], st);
    function build() {
      const pool = AI.chapters.filter(c => !st.part || c.part === st.part).flatMap(c => qOf(c.n).map(q => Object.assign({}, q, { src: chTag(c).replace('Chapter', 'Ch.').replace('Global Edition chapter 20', 'G20') })));
      const pick = AI.shuffle(pool.slice()).slice(0, st.n); const h = document.getElementById('mixq'); h.innerHTML = '';
      renderQuiz(h, pick, { onReset: build });
    }
  }
  function papers() {
    document.title = 'Real exam papers · AI Lab'; buildRail('');
    const groups = [['MIT 6.034 Artificial Intelligence', ['mitQ1', 'mitQ2', 'mitQ3_08', 'mitQ3_09', 'mitQ4_08', 'mitQ4_10', 'mitF07', 'mitF08', 'mitF09', 'mitF10', 'mitSp', 'mitRev']], ['UC Berkeley CS188 Introduction to AI', ['bk', 'bkR', 'bkHKN', 'bkFa25m', 'bkFa25ms', 'bkFa25f', 'bkSp25f', 'bkSu25f', 'bkFa22f']], ['Harvard CS50’s Introduction to AI with Python', ['cs0', 'cs1', 'cs2', 'cs3', 'cs4', 'cs5', 'cs6', 'csN3', 'csKn']], ['Carnegie Mellon 15-281 AI: Representation and Problem Solving', ['cmuBN', 'cmuR10', 'cmuR10s']]];
    const used = {}; AI.chapters.forEach(c => c.papers.forEach(([k]) => { (used[k] = used[k] || []).push(c); }));
    main.innerHTML = `<div class="page"><h1>Real exam papers</h1><p class="lede">Past papers and quizzes published by top AI courses, mapped to the chapters they test. The links open the universities’ own pages. The questions inside AI Lab are original practice questions in the same style.</p>
      ${groups.map(([g, keys]) => `<section class="section"><h2>${esc(g)}</h2><ul class="linklist" style="max-width:900px;margin-top:8px">${keys.map(k => { const s = AI.sources[k]; const chs = (used[k] || []).map(c => `<a href="#${c.id}">${typeof c.n === 'number' ? 'Ch. ' + c.n : 'G20'}</a>`).join(', '); return `<li><a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a><span class="src">${chs ? 'Used for ' + chs : esc(s.s)}</span></li>`; }).join('')}</ul></section>`).join('')}
      <section class="section"><h2>Textbook exercises</h2><p class="sub">The 4th edition moved its exercises online. Each chapter page links to its exercise set on the official site, aimacode.github.io/aima-exercises.</p></section></div>`;
  }
  function about() {
    document.title = 'About · AI Lab'; buildRail('');
    main.innerHTML = `<div class="page prose"><h1>About AI Lab</h1>
      <p class="lede">AI Lab turns the algorithms of <i>Artificial Intelligence: A Modern Approach</i> (Stuart Russell and Peter Norvig, 4th edition) into things you can watch, play and practise.</p>
      <h2>How to use it</h2><ul><li>Open a chapter from the route map or the menu. Read the key ideas first.</li><li>In a step-through demo (one with a play bar), press <kbd>Space</kbd> to play or pause, <kbd>←</kbd> and <kbd>→</kbd> to step, <kbd>Home</kbd> and <kbd>End</kbd> to jump. Where pseudocode is shown, the highlighted line is the one being run.</li><li>Other demos recompute as you move a slider, click the picture or press a button.</li><li>Most games keep your best score in this browser.</li><li>Practice questions save your answers in this browser too. Nothing is sent anywhere.</li></ul>
      <h2>Edition numbers</h2><p>Chapters follow the 4th US edition. The Global Edition orders some chapters differently (Constraint Satisfaction comes before Adversarial Search, and Probabilistic Programming comes after Multiagent Decision Making) and adds a chapter, Knowledge in Learning. Every chapter page shows both numbers, and the Global Edition chapter has its own page.</p>
      <h2>Where the examples come from</h2><p>The classic worked examples (the Romania road map, the wumpus world, the vacuum world, the 4×3 grid world, the burglary alarm network, the umbrella world, the restaurant data and others) use the values printed in the book, cross-checked with the official companion code at github.com/aimacode. Every number shown in a demo is computed live by the algorithm on the page.</p>
      <h2>About the questions</h2><p>The practice questions are written for AI Lab in the style of university exams. Where a question’s topic appears on real papers, the question says so, and the <a href="#papers">Real exam papers</a> page links to those papers on the universities’ own sites.</p>
      <h2>Credits</h2><p>Fonts: Overpass, Inter and JetBrains Mono (Google Fonts). The siege game in Chapter 22 is adapted from the Siege reinforcement-learning arena. AI Lab is an independent study aid and is not affiliated with or endorsed by Pearson or the book’s authors.</p></div>`;
  }

  /* ---------- search ---------- */
  const sInput = document.getElementById('q'), sRes = document.getElementById('qres');
  let sIndex = null, sSel = -1;
  const buildIndex = () => { sIndex = AI.chapters.map(c => ({ href: '#' + c.id, kind: typeof c.n === 'number' ? 'Ch. ' + c.n : 'G20', t: c.title, d: c.blurb, k: (c.title + ' ' + c.blurb).toLowerCase() })).concat(AI.labOrder.map(id => { const l = AI.labs[id]; return { href: '#lab-' + id, kind: l.kind === 'game' ? 'Game' : 'Demo', t: l.title, d: l.blurb, k: (l.title + ' ' + l.blurb + ' ' + (l.tags || []).join(' ')).toLowerCase() }; })); };
  const doSearch = () => {
    if (!sIndex) buildIndex(); const q = sInput.value.trim().toLowerCase();
    if (!q) { sRes.classList.remove('open'); return; }
    const terms = q.split(/\s+/); const hits = sIndex.filter(x => terms.every(t => x.k.includes(t))).slice(0, 12); sSel = -1;
    sRes.innerHTML = hits.length ? hits.map(h => `<a href="${h.href}"><span class="pill">${esc(h.kind)}</span><span class="t">${esc(h.t)}</span><span class="d">${esc(h.d)}</span></a>`).join('') : '<div class="empty">No matches</div>';
    sRes.classList.add('open');
  };
  sInput.addEventListener('input', doSearch);
  sInput.addEventListener('focus', doSearch);
  sInput.addEventListener('keydown', e => { const a = [...sRes.querySelectorAll('a')]; if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sSel = AI.clamp(sSel + (e.key === 'ArrowDown' ? 1 : -1), 0, a.length - 1); a.forEach((x, i) => x.classList.toggle('sel', i === sSel)); } else if (e.key === 'Enter') { const t = a[sSel >= 0 ? sSel : 0]; if (t) { location.hash = t.getAttribute('href'); sInput.blur(); sRes.classList.remove('open'); } } else if (e.key === 'Escape') { sRes.classList.remove('open'); sInput.blur(); } });
  document.addEventListener('click', e => { if (!e.target.closest('.search')) sRes.classList.remove('open'); });
  sRes.addEventListener('click', () => { sRes.classList.remove('open'); sInput.value = ''; });
  document.addEventListener('keydown', e => { if (e.key === '/' && document.activeElement === document.body) { e.preventDefault(); sInput.focus(); } });

  AI.renderQuiz = renderQuiz;
  route();
})(window);
