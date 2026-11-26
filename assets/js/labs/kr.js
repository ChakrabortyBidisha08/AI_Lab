/* Chapters 10–11 labs: time intervals, inheritance with defaults, blocks-world planning (demo + game), critical path. */
(function (G) {
  'use strict';
  const AI = G.AI, esc = AI.esc;

  /* ---------- Allen's interval relations ---------- */
  const REL = [
    ['before', (a, b) => a[1] < b[0], 'i ends before j begins: End(i) < Begin(j).'],
    ['meets', (a, b) => a[1] === b[0], 'i ends exactly when j begins: End(i) = Begin(j).'],
    ['overlaps', (a, b) => a[0] < b[0] && b[0] < a[1] && a[1] < b[1], 'i starts first, and they overlap: Begin(i) < Begin(j) < End(i) < End(j).'],
    ['starts', (a, b) => a[0] === b[0] && a[1] < b[1], 'They begin together and i ends first.'],
    ['during', (a, b) => b[0] < a[0] && a[1] < b[1], 'i lies strictly inside j: Begin(j) < Begin(i) and End(i) < End(j).'],
    ['finishes', (a, b) => a[1] === b[1] && b[0] < a[0], 'They end together and i begins later.'],
    ['equals', (a, b) => a[0] === b[0] && a[1] === b[1], 'Same beginning and same end.'],
    ['finished by', (a, b) => a[1] === b[1] && a[0] < b[0], 'They end together and j begins later (the inverse of finishes).'],
    ['contains', (a, b) => a[0] < b[0] && b[1] < a[1], 'j lies strictly inside i (the inverse of during).'],
    ['started by', (a, b) => a[0] === b[0] && b[1] < a[1], 'They begin together and j ends first (the inverse of starts).'],
    ['overlapped by', (a, b) => b[0] < a[0] && a[0] < b[1] && b[1] < a[1], 'j starts first, and they overlap (the inverse of overlaps).'],
    ['met by', (a, b) => b[1] === a[0], 'j ends exactly when i begins (the inverse of meets).'],
    ['after', (a, b) => b[1] < a[0], 'i begins after j ends (the inverse of before).']
  ];
  const relOf = (a, b) => REL.find(r => r[1](a, b));
  AI.lab({
    id: 'intervals', ch: 10, kind: 'demo', title: 'Time intervals: Allen’s relations',
    blurb: 'Drag two time intervals and see which of the thirteen interval relations holds between them. Then test yourself.',
    tags: ['events and time', 'interval algebra', 'Meet', 'Before', 'During', 'Overlap'],
    how: [['Why intervals', '<p>Events take time, so the book reasons about intervals using the functions Begin and End. Every relation is defined by comparing endpoints, for example Meet(i, j) ⇔ End(i) = Begin(j).</p>'],
      ['Thirteen relations', '<p>Allen’s interval algebra has seven relations (before, meets, overlaps, starts, during, finishes, equals) plus the inverses of all but equals. Exactly one holds for any two intervals. This demo uses Allen’s strict definitions; the book’s Starts and Finishes only require the shared endpoint.</p>']],
    mount(root, ctx) {
      const st = { i0: 2, i1: 9, j0: 6, j1: 15, quiz: false };
      const Li = AI.layout(root);
      const box = AI.el('<div style="position:relative;aspect-ratio:2.4;min-height:200px;touch-action:none"></div>'); Li.stage.appendChild(box);
      let quizAns = null, quizScore = AI.store.get('intervals-score', [0, 0]);
      const sv = AI.svgHost(box, ctx, (w, h) => {
        const X = t => 30 + (w - 60) * t / 20; let s = '';
        for (let t = 0; t <= 20; t++) s += `<line x1="${X(t)}" x2="${X(t)}" y1="${h - 34}" y2="${h - 28}" stroke="var(--muted)"/>${t % 5 === 0 ? `<text x="${X(t)}" y="${h - 12}" text-anchor="middle" class="svg-s">${t}</text>` : ''}`;
        s += `<line x1="${X(0)}" x2="${X(20)}" y1="${h - 31}" y2="${h - 31}" stroke="var(--line2)" stroke-width="2"/>`;
        const bar = (a, b, y, col, name) => `<rect x="${X(a)}" y="${y}" width="${Math.max(2, X(b) - X(a))}" height="34" rx="8" fill="${col}"/><text x="${X(a) + 10}" y="${y + 22}" class="svg-b" style="font-size:15px" fill="#fff">${name}</text><circle class="hd" data-h="${name}0" cx="${X(a)}" cy="${y + 17}" r="11" fill="var(--bg)" stroke="${col}" stroke-width="4" style="cursor:ew-resize"/><circle class="hd" data-h="${name}1" cx="${X(b)}" cy="${y + 17}" r="11" fill="var(--bg)" stroke="${col}" stroke-width="4" style="cursor:ew-resize"/>`;
        s += bar(st.i0, st.i1, h * 0.16, 'var(--v-path)', 'i') + bar(st.j0, st.j1, h * 0.16 + 52, 'var(--v-chance)', 'j');
        [st.i0, st.i1, st.j0, st.j1].forEach(t => { s += `<line x1="${X(t)}" x2="${X(t)}" y1="${h * 0.12}" y2="${h - 31}" stroke="var(--line2)" stroke-dasharray="3 4"/>`; });
        return s;
      });
      const pr = AI.panel(Li.side, 'Relation'); const out = AI.el('<div></div>'); pr.appendChild(out);
      const pq = AI.panel(Li.side, 'Test yourself'); const qbtn = AI.el(`<button type="button" class="btn primary">${AI.icon.dice}Random pair: name the relation</button>`); pq.appendChild(qbtn); const qbox = AI.el('<div style="margin-top:10px"></div>'); pq.appendChild(qbox);
      const pt = AI.panel(Li.below, 'All thirteen relations'); pt.insertAdjacentHTML('beforeend', AI.table(['i … j', 'Definition'], REL.map(r => `<tr><td><b>${r[0]}</b></td><td>${esc(r[2])}</td></tr>`), 'compact'));
      function show() { sv.redraw(); const r = relOf([st.i0, st.i1], [st.j0, st.j1]); if (st.quiz) { out.innerHTML = '<p class="muted" style="margin:0">Hidden until you answer.</p>'; return; } out.innerHTML = `<p style="font-family:var(--display);font-weight:800;font-size:26px;margin:0">i ${r[0]} j</p><p class="small" style="margin:6px 0 0">${esc(r[2])}</p><p class="mono small muted" style="margin:6px 0 0">i = [${st.i0}, ${st.i1}],  j = [${st.j0}, ${st.j1}]</p>`; }
      qbtn.onclick = () => { const r = Math.random; const pickPair = () => { const t = () => Math.floor(r() * 19); let a = t(), b = t(), c = t(), d = t(); if (r() < 0.45) c = AI.pick([a, b]); if (r() < 0.3) d = AI.pick([a, b]); return [[Math.min(a, b), Math.max(a, b) + (a === b ? 1 : 0)], [Math.min(c, d), Math.max(c, d) + (c === d ? 1 : 0)]]; }; const [a, b] = pickPair(); [st.i0, st.i1, st.j0, st.j1] = [a[0], a[1], b[0], b[1]]; st.quiz = true; quizAns = relOf(a, b)[0]; show(); qbox.innerHTML = `<div class="btns">${REL.map(x => `<button type="button" class="btn small" data-r="${x[0]}">${x[0]}</button>`).join('')}</div>`; qbox.querySelectorAll('[data-r]').forEach(b2 => b2.onclick = () => { const ok = b2.dataset.r === quizAns; quizScore = [quizScore[0] + (ok ? 1 : 0), quizScore[1] + 1]; AI.store.set('intervals-score', quizScore); st.quiz = false; show(); qbox.innerHTML = `<p style="margin:0"><b style="color:${ok ? 'var(--ok)' : 'var(--bad)'}">${ok ? 'Right.' : `It is “${quizAns}”.`}</b> Score so far: ${quizScore[0]} of ${quizScore[1]}.</p>`; }); };
      let drag = null;
      ctx.on(box, 'pointerdown', e => { const h = e.target.closest('.hd'); if (!h) return; drag = h.dataset.h; box.setPointerCapture(e.pointerId); e.preventDefault(); });
      ctx.on(box, 'pointermove', e => { if (!drag) return; const r = box.getBoundingClientRect(); const t = AI.clamp(Math.round((e.clientX - r.left - 30) / (r.width - 60) * 20), 0, 20); const k = { i0: 'i0', i1: 'i1', j0: 'j0', j1: 'j1' }[drag]; if (k[1] === '0') st[k] = Math.min(t, st[k[0] + '1'] - 1); else st[k] = Math.max(t, st[k[0] + '0'] + 1); st.quiz = false; show(); });
      ctx.on(window, 'pointerup', () => { drag = null; });
      show();
    }
  });

  /* ---------- inheritance with defaults ---------- */
  const NET = { cats: { Animal: { isa: [], props: {} }, Bird: { isa: ['Animal'], props: { flies: 'yes', legs: '2' } }, Mammal: { isa: ['Animal'], props: { flies: 'no', legs: '4' } }, Robin: { isa: ['Bird'], props: {} }, Penguin: { isa: ['Bird'], props: { flies: 'no' } }, Ostrich: { isa: ['Bird'], props: { flies: 'no' } }, Bat: { isa: ['Mammal'], props: { flies: 'yes' } }, Human: { isa: ['Mammal'], props: { legs: '2' } }, Quaker: { isa: [], props: { pacifist: 'yes' } }, Republican: { isa: [], props: { pacifist: 'no' } } },
    inds: { Tweety: ['Robin'], Opus: ['Penguin'], Ollie: ['Ostrich'], Batty: ['Bat'], Asha: ['Human'], Nixon: ['Quaker', 'Republican'] },
    pos: { Animal: [0.38, 0.1], Bird: [0.2, 0.36], Mammal: [0.58, 0.36], Robin: [0.07, 0.62], Penguin: [0.21, 0.62], Ostrich: [0.35, 0.62], Bat: [0.5, 0.62], Human: [0.65, 0.62], Quaker: [0.8, 0.36], Republican: [0.95, 0.36], Tweety: [0.07, 0.88], Opus: [0.21, 0.88], Ollie: [0.35, 0.88], Batty: [0.5, 0.88], Asha: [0.65, 0.88], Nixon: [0.875, 0.88] } };
  function inherit(ind, prop) {
    // breadth-first up the hierarchy; the most specific categories that define prop win; conflicts are reported
    const steps = []; let frontier = NET.inds[ind].slice(), seen = new Set(); const found = [];
    while (frontier.length && !found.length) { const next = []; frontier.forEach(c => { if (seen.has(c)) return; seen.add(c); steps.push(c); if (prop in NET.cats[c].props) found.push([c, NET.cats[c].props[prop]]); else next.push(...NET.cats[c].isa); }); frontier = next; }
    return { steps, found };
  }
  AI.lab({
    id: 'inheritance', ch: 10, kind: 'demo', title: 'Categories, inheritance and exceptions',
    blurb: 'Ask whether Tweety, Opus or Nixon can fly or is a pacifist. Properties are inherited from categories, the most specific one wins, and conflicts show up.',
    tags: ['categories', 'inheritance', 'default reasoning', 'exceptions', 'semantic networks'],
    how: [['How inheritance works here', '<p>Each individual is a member of one or more categories, and each category is a subset of others. To find a property, look in the individual’s own categories first, then climb the hierarchy level by level. The first category found that states the property gives the answer, so Penguin’s “flies: no” overrides Bird’s default “flies: yes”.</p>'],
      ['Defaults are non-monotonic', '<p>Learning that Tweety is a penguin, not a robin, would withdraw the conclusion that Tweety flies. Classical logic never withdraws conclusions, which is why the book discusses default logic and circumscription.</p>'],
      ['The Nixon diamond', '<p>Nixon is a Quaker (default: pacifist) and a Republican (default: not a pacifist). Neither category is more specific than the other, so plain inheritance has no single answer. This classic example shows why priorities between defaults matter.</p>']],
    mount(root, ctx) {
      const st = { ind: 'Opus', prop: 'flies' };
      const Ln = AI.layout(root);
      const box = AI.el('<div style="position:relative;aspect-ratio:1.9;min-height:260px"></div>'); Ln.stage.appendChild(box);
      let res = null;
      const sv = AI.svgHost(box, ctx, (w, h) => {
        const P = n => [NET.pos[n][0] * w, NET.pos[n][1] * h]; let s = AI.arrowDefs('ia', 'var(--v-edge)');
        const on = res ? new Set(res.steps) : new Set(), win = res ? new Set(res.found.map(f => f[0])) : new Set();
        Object.entries(NET.cats).forEach(([c, d]) => d.isa.forEach(p => { const [x1, y1] = P(c), [x2, y2] = P(p); s += `<line x1="${x1}" y1="${y1 - 16}" x2="${x2}" y2="${y2 + 18}" stroke="${on.has(c) && on.has(p) ? 'var(--v-path)' : 'var(--v-edge)'}" stroke-width="${on.has(c) && on.has(p) ? 3.5 : 1.6}" marker-end="url(#ia)"/>`; }));
        Object.entries(NET.inds).forEach(([i, cs]) => cs.forEach(c => { const [x1, y1] = P(i), [x2, y2] = P(c); s += `<line x1="${x1}" y1="${y1 - 14}" x2="${x2}" y2="${y2 + 18}" stroke="${i === st.ind ? 'var(--v-path)' : 'var(--v-edge)'}" stroke-width="${i === st.ind ? 3.5 : 1.4}" stroke-dasharray="${i === st.ind ? '' : '4 3'}" marker-end="url(#ia)"/>`; }));
        Object.entries(NET.cats).forEach(([c, d]) => { const [x, y] = P(c); const props = Object.entries(d.props).map(([k, v]) => `${k}: ${v}`).join(', '); const tw = Math.max(c.length * 8.5 + 20, 60); s += `<rect x="${x - tw / 2}" y="${y - 16}" width="${tw}" height="32" rx="9" fill="${win.has(c) ? 'var(--v-goal)' : on.has(c) ? 'var(--bg3)' : 'var(--bg)'}" stroke="var(--ink)" stroke-width="1.6"/><text x="${x}" y="${y + 5}" text-anchor="middle" class="svg-t" style="font-weight:700" fill="${win.has(c) ? '#fff' : 'var(--ink)'}">${c}</text>${props ? `<text x="${x}" y="${y + 30}" text-anchor="middle" class="svg-s halo">${esc(props)}</text>` : ''}`; });
        Object.keys(NET.inds).forEach(i => { const [x, y] = P(i); s += `<g class="ind" data-i="${i}" style="cursor:pointer"><ellipse cx="${x}" cy="${y}" rx="${i.length * 4.6 + 14}" ry="15" fill="${i === st.ind ? 'var(--v-current)' : 'var(--bg)'}" stroke="var(--ink)" stroke-width="1.6"/><text x="${x}" y="${y + 5}" text-anchor="middle" class="svg-t" style="font-style:italic;font-weight:600" fill="${i === st.ind ? '#fff' : 'var(--ink)'}">${i}</text></g>`; });
        return s;
      });
      const pc = AI.panel(Ln.side, 'Ask');
      AI.controls(pc, [{ t: 'select', k: 'ind', label: 'Individual', opts: Object.keys(NET.inds), str: true }, { t: 'select', k: 'prop', label: 'Property', opts: [['flies', 'flies'], ['legs', 'legs'], ['pacifist', 'pacifist']], str: true }], st, run);
      const pa = AI.panel(Ln.side, 'Answer'); const out = AI.el('<div class="explain"></div>'); pa.appendChild(out);
      AI.legend(Ln.stageCol, [['var(--v-current)', 'Individual asked about'], ['var(--bg3)', 'Categories searched'], ['var(--v-goal)', 'Where the answer came from']]);
      function run() {
        res = inherit(st.ind, st.prop); sv.redraw();
        const vals = [...new Set(res.found.map(f => f[1]))];
        out.innerHTML = !res.found.length ? `No category above ${st.ind} says anything about “${st.prop}”, so it is <b>unknown</b>.` : vals.length > 1 ? `<b style="color:var(--bad)">Conflict.</b> ${res.found.map(([c, v]) => `${c} says ${st.prop} = ${v}`).join('; ')}. Neither category is more specific, so inheritance alone cannot decide.` : `<b style="font-size:20px">${st.ind}: ${st.prop} = ${vals[0]}</b><br><span class="small">Searched ${res.steps.join(' → ')}; the value comes from <b>${res.found[0][0]}</b>, the most specific category that states it.</span>`;
      }
      ctx.on(box, 'click', e => { const g = e.target.closest('.ind'); if (!g) return; st.ind = g.dataset.i; pc.querySelector('select').value = st.ind; run(); });
      run();
    }
  });

  /* ---------- blocks world ---------- */
  const keyOf = s => s.map(t => t.join('')).filter(Boolean).sort().join('|');
  const clone = s => s.map(t => t.slice());
  function succ(s) { const out = []; s.forEach((t, i) => { if (!t.length) return; const b = t[t.length - 1]; if (t.length > 1) { const n = clone(s); n[i].pop(); n.push([b]); out.push([`MoveToTable(${b}, ${t[t.length - 2]})`, n.filter(x => x.length)]); } s.forEach((u, j) => { if (i === j || !u.length) return; const n = clone(s); n[i].pop(); n[j].push(b); out.push([`Move(${b}, ${t.length > 1 ? t[t.length - 2] : 'Table'}, ${u[u.length - 1]})`, n.filter(x => x.length)]); }); }); return out; }
  const onFacts = s => { const f = new Set(); s.forEach(t => t.forEach((b, i) => f.add(`${b}/${i ? t[i - 1] : 'Table'}`))); return f; };
  const hGoal = (s, goal) => { const g = onFacts(goal), f = onFacts(s); let n = 0; g.forEach(x => { if (!f.has(x)) n++; }); return n; };
  function plan(start, goal, algo) {
    const gk = keyOf(goal), q = [[start, null, null, 0]], seen = new Map([[keyOf(start), null]]); let expanded = 0;
    const open = [[hGoal(start, goal), 0, start]]; const par = new Map([[keyOf(start), null]]); const gcost = new Map([[keyOf(start), 0]]);
    if (algo === 'bfs') { let head = 0; while (head < q.length) { const [s] = q[head++]; const k = keyOf(s); if (k === gk) { const p = []; let c = k; while (seen.get(c)) { const [pk, a, st] = seen.get(c); p.unshift([a, st]); c = pk; } return { plan: p, expanded }; } expanded++; for (const [a, n] of succ(s)) { const nk = keyOf(n); if (!seen.has(nk)) { seen.set(nk, [k, a, n]); q.push([n]); } } } return { plan: null, expanded }; }
    while (open.length) { open.sort((a, b) => a[0] - b[0] || a[1] - b[1]); const [, g, s] = open.shift(); const k = keyOf(s); if (g > gcost.get(k)) continue; if (k === gk) { const p = []; let c = k; while (par.get(c)) { const [pk, a, st] = par.get(c); p.unshift([a, st]); c = pk; } return { plan: p, expanded }; } expanded++; for (const [a, n] of succ(s)) { const nk = keyOf(n), ng = g + 1; if (!gcost.has(nk) || ng < gcost.get(nk)) { gcost.set(nk, ng); par.set(nk, [k, a, n]); open.push([(algo === 'greedy' ? 0 : ng) + hGoal(n, goal), ng, n]); } } }
    return { plan: null, expanded };
  }
  const BCOL = { A: '#e8574e', B: '#4a86e8', C: '#3bb27a', D: '#f2a93a', E: '#9b6bd6', F: '#2bb6c4' };
  function drawBlocks(s, w, h, opts) {
    opts = opts || {}; const n = s.reduce((a, t) => a + t.length, 0); const cs = Math.min(64, (w - 40) / Math.max(4, n + 1), (h - 50) / Math.max(4, n + 0.5)); const slots = Math.max(n, 3); const gap = (w - 30) / slots;
    let out = `<rect x="10" y="${h - 22}" width="${w - 20}" height="12" rx="4" fill="var(--ink2)"/><text x="${w - 16}" y="${h - 28}" text-anchor="end" class="svg-s">Table</text>`;
    const order = opts.order || s.map((_, i) => i);
    s.forEach((t, i) => { const slot = order[i]; const x = 15 + gap * (slot + 0.5) - cs / 2; t.forEach((b, k) => { const y = h - 22 - (k + 1) * cs; const sel = opts.sel === b; out += `<g class="blk" data-b="${b}" style="cursor:${opts.play ? 'pointer' : 'default'}"><rect x="${x}" y="${y}" width="${cs - 4}" height="${cs - 4}" rx="8" fill="${BCOL[b]}" stroke="${sel ? 'var(--ink)' : 'rgba(0,0,0,.25)'}" stroke-width="${sel ? 4 : 2}"/><text x="${x + cs / 2 - 2}" y="${y + cs / 2 + 6}" text-anchor="middle" class="svg-b" style="font-size:${cs * 0.4}px" fill="#fff">${b}</text></g>`; }); });
    if (opts.play) out += `<rect class="tbl-hit" x="10" y="${h - 28}" width="${w - 20}" height="24" fill="transparent" style="cursor:pointer"/>`;
    return out;
  }
  const PROBLEMS = { sussman: { name: 'Sussman anomaly (book)', start: [['A', 'C'], ['B']], goal: [['C', 'B', 'A']] }, tower4: { name: 'Reverse a tower of 4', start: [['A', 'B', 'C', 'D']], goal: [['D', 'C', 'B', 'A']] }, mix5: { name: 'Five blocks, two towers', start: [['B', 'E'], ['A', 'D', 'C']], goal: [['E', 'A'], ['C', 'B', 'D']] } };
  function blocksLab(play) {
    return {
      id: play ? 'blocks-game' : 'blocks-planner', ch: 11, kind: play ? 'game' : 'demo', title: play ? 'Plan it yourself: blocks world' : 'Planning in the blocks world',
      blurb: play ? 'Reach the goal stack by moving one clear block at a time, then compare your plan with the shortest one.' : 'A forward state-space planner solves blocks-world problems, including the Sussman anomaly, with breadth-first search or A* using an ignore-preconditions style heuristic.',
      tags: play ? ['STRIPS actions', 'preconditions', 'Sussman anomaly'] : ['PDDL / STRIPS', 'forward search', 'heuristics', 'Sussman anomaly'],
      how: play ? [['How to play', '<ul><li>Click a block on top of a stack, then click another clear block to stack it there, or click the table.</li><li>Only clear blocks can move or be stacked on: those are the preconditions of the actions.</li><li>Match the goal picture with as few moves as you can.</li></ul>'], ['The Sussman anomaly', '<p>Start: C on A; A and B on the table. Goal: A on B and B on C. Working on one subgoal at a time fails: putting A on B first must be undone to build B on C, and building B on C first buries A. The shortest plan interleaves the subgoals.</p>']]
        : [['The actions', '<p class="mono small">Move(b, x, y)<br>  pre: On(b, x) ∧ Clear(b) ∧ Clear(y)<br>  eff: On(b, y) ∧ Clear(x) ∧ ¬On(b, x) ∧ ¬Clear(y)<br>MoveToTable(b, x)<br>  pre: On(b, x) ∧ Clear(b)<br>  eff: On(b, Table) ∧ Clear(x) ∧ ¬On(b, x)</p><p>The table is always clear.</p>'], ['The heuristic', '<p>h counts goal On(…) facts not yet true. Each action makes at most one On fact true, so h never overestimates: A* finds a shortest plan. Greedy best-first uses h alone and may not.</p>'], ['Sussman anomaly', '<p>The three-step plan MoveToTable(C, A), Move(B, Table, C), Move(A, Table, B) interleaves the two subgoals, which is exactly what early planners that solved one subgoal at a time could not do.</p>']],
      mount(root, ctx) {
        const st = { p: 'sussman', algo: 'astar', n: 5 };
        const Lb = AI.layout(root);
        const wrap = AI.el('<div style="display:grid;grid-template-columns:minmax(0,3fr) minmax(0,1.2fr);gap:0;min-height:318px"></div>'); Lb.stage.appendChild(wrap); Lb.stage.classList.add('plain');
        const box = AI.el('<div style="position:relative;aspect-ratio:1.45;min-height:240px;align-self:stretch"></div>'); wrap.appendChild(box);
        const gbox = AI.el('<div style="position:relative;display:flex;flex-direction:column;border-left:1px solid var(--line);background:var(--bg2)"><p class="small muted" style="margin:8px 10px 0">Goal</p><div style="position:relative;flex:1;min-height:180px"></div></div>'); wrap.appendChild(gbox);
        const banner = AI.banner(Lb.stage);
        let S, goal, frame = null, sel = null, moves = 0, best = 0, order = null;
        const sv = AI.svgHost(box, ctx, (w, h) => drawBlocks(frame ? frame.s : S, w, h, { sel, play, order }));
        const gv = AI.svgHost(gbox.lastElementChild, ctx, (w, h) => drawBlocks(goal, w, h));
        [sv, gv].forEach(v => { v.svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%'; }); // the drawings must not size their own boxes
        let narrow = null; // on narrow screens the goal goes below the problem, so its blocks stay a readable size
        ctx.resize(Lb.stage, w => { const nw = narrow ? w < 540 : w < 500; if (nw === narrow) return; narrow = nw;
          wrap.style.gridTemplateColumns = nw ? 'minmax(0,1fr)' : 'minmax(0,3fr) minmax(0,1.2fr)';
          gbox.style.borderLeft = nw ? '0' : '1px solid var(--line)'; gbox.style.borderTop = nw ? '1px solid var(--line)' : '0';
          gbox.lastElementChild.style.minHeight = nw ? '190px' : '180px'; });
        const pc = AI.panel(Lb.side, 'Problem');
        const spec = [{ t: 'select', k: 'p', label: 'Problem', opts: Object.entries(PROBLEMS).map(([k, v]) => [k, v.name]).concat([['random', 'Random problem']]), str: true, grow: true }, { t: 'row' }];
        if (!play) spec.push({ t: 'select', k: 'algo', label: 'Search', opts: [['bfs', 'Breadth-first (optimal)'], ['astar', 'A* with the heuristic'], ['greedy', 'Greedy best-first']], str: true, grow: true });
        spec.push({ t: 'select', k: 'n', label: 'Random size', opts: [[4, '4 blocks'], [5, '5 blocks'], [6, '6 blocks']] }, { t: 'row' }, { t: 'btn', label: play ? 'Restart' : 'New random problem', icon: play ? 'reset' : 'dice', on: () => { if (!play) st.p = 'random'; load(); } });
        AI.controls(pc, spec, st, () => load());
        const ps = AI.panel(Lb.side, play ? 'Score' : 'Plan'); const stats = AI.stats(ps, play ? [['m', 'your moves'], ['opt', 'shortest plan'], ['h', 'goal facts missing']] : [['len', 'plan length'], ['exp', 'states expanded'], ['h', 'goal facts missing']]);
        const out = AI.el('<ol class="small mono" style="margin:10px 0 0;padding-left:22px"></ol>'); ps.appendChild(out);
        let player = null; if (!play) player = AI.Player(Lb.stageCol, ctx, f => { frame = f; sv.redraw(); stats.set('h', hGoal(f.s, goal)); out.querySelectorAll('li').forEach((li, i) => li.style.fontWeight = i === f.i - 1 ? 700 : 400); });
        function randomStacks(n, r) { const bs = 'ABCDEF'.slice(0, n).split(''); AI.shuffle(bs, r); const st2 = []; bs.forEach(b => { if (!st2.length || r() < 0.45) st2.push([b]); else st2[(r() * st2.length) | 0].push(b); }); return st2; }
        function load() {
          if (st.p === 'random') { const r = AI.rng((Math.random() * 1e9) | 0); do { S = randomStacks(st.n, r); goal = randomStacks(st.n, r); } while (keyOf(S) === keyOf(goal)); }
          else { S = clone(PROBLEMS[st.p].start); goal = clone(PROBLEMS[st.p].goal); }
          sel = null; moves = 0; frame = null; order = null;
          const opt = plan(S, goal, 'bfs'); best = opt.plan.length;
          if (play) { stats.set('m', 0); stats.set('opt', best); stats.set('h', hGoal(S, goal)); out.innerHTML = ''; sv.redraw(); }
          else { const r = plan(S, goal, st.algo); stats.set('len', r.plan.length, r.plan.length === best ? 'good' : 'bad'); stats.set('exp', r.expanded); out.innerHTML = r.plan.map(([a]) => `<li>${esc(a)}</li>`).join(''); const fr = [{ s: S, i: 0 }].concat(r.plan.map(([, s], i) => ({ s, i: i + 1 }))); player.set(fr); }
          gv.redraw();
        }
        if (play) ctx.on(box, 'click', e => {
          const blk = e.target.closest('.blk'), tbl = e.target.closest('.tbl-hit');
          const top = b => S.some(t => t[t.length - 1] === b);
          if (blk) { const b = blk.dataset.b; if (!sel) { if (top(b)) sel = b; } else if (sel === b) sel = null; else if (top(b)) { const i = S.findIndex(t => t.includes(sel)), j = S.findIndex(t => t.includes(b)); const from = S[i].length > 1 ? S[i][S[i].length - 2] : 'Table'; S[i].pop(); S[j].push(sel); S = S.filter(t => t.length); out.insertAdjacentHTML('beforeend', `<li>Move(${sel}, ${from}, ${b})</li>`); sel = null; moves++; } }
          else if (tbl && sel) { const i = S.findIndex(t => t.includes(sel)); if (S[i].length > 1) { const from = S[i][S[i].length - 2]; S[i].pop(); S.push([sel]); out.insertAdjacentHTML('beforeend', `<li>MoveToTable(${sel}, ${from})</li>`); moves++; } sel = null; }
          stats.set('m', moves); stats.set('h', hGoal(S, goal)); sv.redraw();
          if (keyOf(S) === keyOf(goal)) { const better = AI.progress.best('blocks-' + st.p, moves - best, false); banner(`Goal reached in ${moves} moves<small>${moves === best ? 'That is the shortest plan.' : `The shortest plan has ${best}.`}${better ? ' New best.' : ''}</small>`, 2800); }
        });
        load();
      }
    };
  }
  AI.lab(blocksLab(false)); AI.lab(blocksLab(true));
  AI._blocks = { plan, keyOf, hGoal };

  /* ---------- critical path method ---------- */
  AI.lab({
    id: 'critical-path', ch: 11, kind: 'demo', title: 'Scheduling with the critical path',
    blurb: 'Change task durations on a small project and watch the earliest and latest start times, the slack and the critical path update.',
    tags: ['scheduling', 'critical path method', 'slack', 'partial-order plans'],
    how: [['The method', '<p>Each task’s earliest start ES is the latest earliest-finish among its predecessors (ES = 0 if it has none). Working backwards from the project end, its latest start LS is the earliest latest-start among its successors minus its own duration. Slack = LS − ES.</p>'],
      ['The critical path', '<p>Tasks with zero slack form the critical path: delay any of them and the whole project finishes later. Speeding up a task off the critical path does not shorten the project at all.</p>'],
      ['About this example', '<p>A made-up project of building a small shed, with durations in days. Edit any duration.</p>']],
    mount(root, ctx) {
      const T = [['Design', 3, []], ['Order materials', 2, ['Design']], ['Prepare site', 2, ['Design']], ['Foundation', 3, ['Prepare site']], ['Frame', 4, ['Foundation', 'Order materials']], ['Roof', 2, ['Frame']], ['Electrics', 3, ['Frame']], ['Paint', 2, ['Roof', 'Electrics']], ['Inspect', 1, ['Paint']]].map(([n, d, p]) => ({ n, d, p }));
      const Lc = AI.layout(root, { cls: 'full' });
      const box = AI.el('<div style="position:relative;min-height:340px"></div>'); Lc.stage.appendChild(box);
      const pt = AI.panel(Lc.below, 'Tasks <small>edit the durations</small>'); const tab = AI.el('<div></div>'); pt.appendChild(tab);
      const pr = AI.panel(Lc.below, 'Result'); const res = AI.el('<div></div>'); pr.appendChild(res);
      function compute() {
        const by = Object.fromEntries(T.map(t => [t.n, t])); T.forEach(t => { t.es = 0; });
        T.forEach(t => { t.es = Math.max(0, ...t.p.map(p => by[p].es + by[p].d)); });
        const end = Math.max(...T.map(t => t.es + t.d));
        [...T].reverse().forEach(t => { const succ = T.filter(s => s.p.includes(t.n)); t.ls = succ.length ? Math.min(...succ.map(s => s.ls)) - t.d : end - t.d; t.slack = t.ls - t.es; });
        return end;
      }
      function draw() {
        const end = compute(); const w = box.clientWidth || 800; const left = Math.min(170, w * 0.32), rowH = 34, H = T.length * rowH + 48; box.style.height = H + 'px'; const X = d => left + (w - left - 20) * d / Math.max(1, end);
        let s = `<svg viewBox="0 0 ${w} ${H}" width="${w}" height="${H}" style="position:absolute;inset:0">`;
        for (let d = 0; d <= end; d++) s += `<line x1="${X(d)}" x2="${X(d)}" y1="10" y2="${H - 26}" stroke="var(--line)"/>${end <= 30 || d % 2 === 0 ? `<text x="${X(d)}" y="${H - 8}" text-anchor="middle" class="svg-s">${d}</text>` : ''}`;
        T.forEach((t, i) => { const y = 14 + i * rowH; const crit = t.slack === 0; s += `<text x="${left - 10}" y="${y + 18}" text-anchor="end" class="svg-t" style="font-weight:${crit ? 700 : 500}">${esc(t.n)}</text>`; if (t.slack > 0) s += `<rect x="${X(t.es)}" y="${y + 4}" width="${X(t.ls + t.d) - X(t.es)}" height="20" rx="5" fill="var(--bg3)"/>`; s += `<rect x="${X(t.es)}" y="${y + 4}" width="${Math.max(2, X(t.es + t.d) - X(t.es))}" height="20" rx="5" fill="${crit ? 'var(--accent)' : 'var(--v-path)'}"/>`; });
        box.innerHTML = s + '</svg>';
        tab.innerHTML = AI.table(['Task', 'After', 'r:Days', 'r:ES', 'r:LS', 'r:Slack'], T.map((t, i) => `<tr class="${t.slack === 0 ? 'hl' : ''}"><td>${esc(t.n)}</td><td class="small">${esc(t.p.join(', ') || '—')}</td><td class="r"><input type="number" min="1" max="20" value="${t.d}" data-i="${i}" style="width:70px;height:34px" aria-label="Duration of ${esc(t.n)}"></td><td class="r">${t.es}</td><td class="r">${t.ls}</td><td class="r">${t.slack}</td></tr>`), 'compact');
        tab.querySelectorAll('input').forEach(inp => inp.onchange = () => { T[+inp.dataset.i].d = AI.clamp(Math.round(+inp.value) || 1, 1, 20); draw(); });
        res.innerHTML = `<p style="margin:0"><span class="score-big">${end}</span> days</p><p class="small" style="margin:8px 0 0">Critical path: <b>${T.filter(t => t.slack === 0).map(t => esc(t.n)).join(' → ')}</b>. Orange bars are critical; grey shows how far a task can slip.</p>`;
      }
      ctx.resize(box, draw); ctx.theme(draw); draw();
    }
  });
})(window);
