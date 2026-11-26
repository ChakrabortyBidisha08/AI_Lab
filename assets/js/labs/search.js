/* Chapter 3 labs: Romania route-finding, Be the frontier, Pathfinding race, 8-puzzle. */
(function (G) {
  'use strict';
  const AI = G.AI, E = G.AIE, esc = AI.esc, R = E.romania;

  /* ---------- shared Romania map drawing ---------- */
  const LBL = { Arad: [-12, 4, 'end'], Zerind: [-12, 4, 'end'], Oradea: [-12, 4, 'end'], Timisoara: [-12, 4, 'end'], Lugoj: [12, 4, 'start'], Mehadia: [12, 4, 'start'], Drobeta: [-12, 4, 'end'], Craiova: [0, 22, 'middle'], Sibiu: [6, -12, 'start'], 'Rimnicu Vilcea': [-12, 4, 'end'], Fagaras: [0, -12, 'middle'], Pitesti: [10, -9, 'start'], Bucharest: [8, 21, 'start'], Giurgiu: [0, 22, 'middle'], Urziceni: [-6, -12, 'end'], Hirsova: [0, -12, 'middle'], Eforie: [0, 22, 'middle'], Vaslui: [12, 4, 'start'], Iasi: [12, 4, 'start'], Neamt: [-12, 4, 'end'] };
  const proj = (W, H) => { const pl = W < 520 ? 64 : 96, pr = W < 520 ? 52 : 72, pt = 30, pb = 34; return c => { const [x, y] = R.xy[c]; return [pl + (x - 91) / (562 - 91) * (W - pl - pr), pt + (571 - y) / (571 - 270) * (H - pt - pb)]; }; };
  // st: {status:{city:'frontier'|'explored'|'current'|'path'}, path:[...], tree:[[a,b]], start, goal, badge:{city:text}, showDist}
  function drawRomania(W, H, st) {
    const P = proj(W, H); const onPath = new Set(); (st.path || []).forEach((c, i, a) => { if (i) onPath.add([a[i - 1], c].sort().join('|')); });
    const tree = new Set((st.tree || []).map(([a, b]) => [a, b].sort().join('|')));
    let s = '';
    R.roads.forEach(([a, b, d]) => {
      const [x1, y1] = P(a), [x2, y2] = P(b), k = [a, b].sort().join('|');
      const on = onPath.has(k), tr = tree.has(k);
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${on ? 'var(--v-path)' : tr ? 'var(--ink2)' : 'var(--v-edge)'}" stroke-width="${on ? 6 : tr ? 2.6 : 1.6}" stroke-linecap="round" ${tr && !on ? 'stroke-opacity=".55"' : ''}/>`;
      if (st.showDist !== false && W > 420) { const mx = (x1 + x2) / 2, my = (y1 + y2) / 2; s += `<text x="${mx}" y="${my + 4}" text-anchor="middle" class="svg-s halo" style="font-size:11.5px">${d}</text>`; }
    });
    R.cities.forEach(c => {
      const [x, y] = P(c), status = (st.status || {})[c];
      const fill = status === 'current' ? 'var(--v-current)' : status === 'frontier' ? 'var(--v-frontier)' : status === 'explored' ? 'var(--v-explored)' : status === 'path' ? 'var(--v-path)' : 'var(--v-node)';
      const ring = c === st.goal ? 'var(--v-goal)' : c === st.start ? 'var(--ink)' : 'var(--ink2)';
      const rw = c === st.goal || c === st.start ? 3.5 : 1.6;
      s += `<g class="city" data-c="${esc(c)}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="${status === 'current' ? 11 : 9}" fill="${fill}" stroke="${ring}" stroke-width="${rw}"/>`;
      const [dx, dy, an] = LBL[c]; s += `<text x="${x + dx}" y="${y + dy}" text-anchor="${an}" class="svg-t halo" style="font-weight:${c === st.start || c === st.goal ? 700 : 500}">${esc(c)}</text>`;
      const bd = (st.badge || {})[c]; if (bd) s += `<text x="${x + dx}" y="${y + dy + (dy < 0 ? -14 : 14)}" text-anchor="${an}" class="svg-m halo" style="font-size:11.5px" fill="var(--muted)">${esc(bd)}</text>`;
      s += '</g>';
    });
    return s;
  }
  const mapLegend = host => AI.legend(host, [['var(--v-node)', 'Not reached', 1], ['var(--v-frontier)', 'Frontier', 1], ['var(--v-current)', 'Being expanded', 1], ['var(--v-explored)', 'Expanded', 1], ['var(--v-path)', 'Solution path', 1]]);

  const ALGOS = [['bfs', 'Breadth-first search'], ['dfs', 'Depth-first search'], ['ucs', 'Uniform-cost search'], ['ids', 'Iterative deepening'], ['dls', 'Depth-limited search'], ['bidi', 'Bidirectional (uniform-cost)'], ['greedy', 'Greedy best-first'], ['astar', 'A* search'], ['wastar', 'Weighted A* (W = 1.5)']];
  const PSEUDO = {
    best: ['function BEST-FIRST-SEARCH(problem, f)', '  frontier ← queue ordered by f: {start}', '  reached ← {start}', '  while frontier is not empty do', '    node ← POP(frontier)  // lowest f', '    if IS-GOAL(node) then return node', '    for each child in EXPAND(node) do', '      s ← child.STATE', '      if s new or child.g < reached[s].g', '        reached[s] ← child; PUSH(child)', '  return failure'],
    bfs: ['function BREADTH-FIRST-SEARCH(problem)', '  if IS-GOAL(start) then return start', '  frontier ← FIFO {start}; reached ← {start}', '  while frontier is not empty do', '    node ← POP(frontier)  // oldest', '    for each child in EXPAND(node) do', '      s ← child.STATE', '      if s is not in reached then', '        if IS-GOAL(s) then return child', '        add s to reached; PUSH(child)', '  return failure'],
    dfs: ['function DEPTH-FIRST-SEARCH(problem)', '  frontier ← LIFO stack {start}', '  while frontier is not empty do', '    node ← POP(frontier)  // newest', '    if IS-GOAL(node) then return node', '    if node was expanded then skip it', '    for each child in EXPAND(node) do', '      s ← child.STATE', '      if s not expanded, not on path', '        PUSH(child)', '  return failure'],
    ids: ['function ITERATIVE-DEEPENING(problem)', '  for ℓ = 0, 1, 2, … do', '    if DLS(start, ℓ) ≠ cutoff: return it', 'function DLS(node, ℓ)', '  if IS-GOAL(node) then return node', '  if DEPTH(node) = ℓ then', '    return cutoff', '  for each child not on the path do', '    result ← DLS(child, ℓ)', '    if result is a solution: return it', '  return cutoff (or failure)'],
    bidi: ['function BIDIRECTIONAL-UCS(problem)', '  F ← {start}; B ← {goal}; best ← ∞', '  while F and B are non-empty do', '    if best ≤ min g(F) + min g(B): stop', '    expand the side with the lower min g', '    for each child: keep its lowest g', '      if the other side reached it then', '        best ← min(best, gF + gB)', '  return the path through the best meet', '  (never met: failure)']
  };
  const LMAP = { best: { 1: 2, 4: 5, 5: 6, 6: 7, 9: 10, 11: 11 }, dfs: { 1: 2, 4: 6, 5: 5, 6: 7, 9: 10, 11: 11 }, bfs: { 1: 3, 2: 2, 6: 6, 9: 9, 10: 10, 11: 11 }, ids: { 2: 2, 5: 5, 7: 7, 8: 8, 11: 11 }, bidi: { 1: 2, 5: 5, 8: 9, 9: 10 } };
  const pKey = a => ['ucs', 'greedy', 'astar', 'wastar'].includes(a) ? 'best' : a === 'dls' ? 'ids' : a;
  const informed = a => ['greedy', 'astar', 'wastar'].includes(a);
  const runAlgo = (algo, start, goal, limit) => {
    const h = goal === 'Bucharest' ? c => R.sld[c] : () => 0;
    if (algo === 'ids') return E.iterativeDeepening(R, start, goal, 12);
    if (algo === 'dls') return E.iterativeDeepening(R, start, goal, 12, limit);
    if (algo === 'bidi') return E.bidirectional(R, start, goal);
    return E.graphSearch(R, start, goal, algo, { h, w: 1.5 });
  };

  AI.lab({
    id: 'romania-search', ch: 3, kind: 'demo', title: 'Route-finding in Romania',
    blurb: 'Watch nine search algorithms look for a route from Arad to Bucharest on the book’s road map, one node at a time.',
    tags: ['BFS', 'DFS', 'UCS', 'IDS', 'bidirectional', 'greedy', 'A*'],
    how: [['What to try', '<ul><li>Run A* from Arad and check the expansion order: Arad, Sibiu, Rimnicu Vilcea, Fagaras, Pitesti, then Bucharest at cost 418.</li><li>Switch to greedy best-first: it heads for Fagaras and pays 450.</li><li>Breadth-first finds the route with fewest roads, which is not the cheapest.</li><li>Click any city on the map to start from it.</li></ul>'],
      ['Conventions used here', '<p>Successors are generated in alphabetical order. Breadth-first tests for the goal when a node is generated, as in the 4th edition; the priority-queue searches test when a node is popped, which is what makes uniform-cost and A* optimal. Ties go to the node added first.</p>'],
      ['The heuristic', '<p>h(n) is the straight-line distance to Bucharest from the book’s table. It never overestimates the road distance, so A* is optimal, and it is consistent: for every road, h(n) ≤ cost + h(n′). It exists only for Bucharest, so the informed searches need Bucharest as the goal.</p>']],
    mount(root, ctx) {
      const st = { algo: 'astar', start: 'Arad', goal: 'Bucharest', limit: 3 };
      const L = AI.layout(root); const box = AI.el('<div style="position:relative;aspect-ratio:1.5;min-height:300px"></div>'); L.stage.appendChild(box);
      let frame = null, result = null;
      const sv = AI.svgHost(box, ctx, (W, H) => drawRomania(W, H, mapState()));
      mapLegend(L.stageCol);
      const pc = AI.panel(L.side, 'Search');
      const refs = AI.controls(pc, [{ t: 'select', k: 'algo', label: 'Algorithm', opts: ALGOS, grow: true, str: true }, { t: 'row' }, { t: 'select', k: 'start', label: 'Start', opts: R.cities, str: true }, { t: 'select', k: 'goal', label: 'Goal', opts: R.cities, str: true }, { t: 'range', k: 'limit', label: 'Depth limit ℓ', min: 0, max: 9, hide: true }], st, () => rebuild());
      const note = AI.el('<p class="tip" style="margin:8px 0 0"></p>'); pc.appendChild(note);
      const pp = AI.panel(L.side, 'Pseudocode'); let pseudo;
      const pe = AI.panel(L.side, 'What just happened'); const expl = AI.el('<div class="explain"></div>'); pe.appendChild(expl);
      const player = AI.Player(L.stageCol, ctx, f => { frame = f; show(); });
      const pf = AI.panel(L.below, 'Frontier <small>next to be expanded is on top</small>'); const ftab = AI.el('<div></div>'); pf.appendChild(ftab);
      const ps = AI.panel(L.below, 'Progress'); const stats = AI.stats(ps, [['exp', 'nodes expanded'], ['gen', 'nodes generated'], ['cost', 'path cost'], ['len', 'roads on path']]);
      const cmpBtn = AI.el(`<button type="button" class="btn small" style="margin-top:10px">Compare all algorithms from ${esc(st.start)}</button>`); ps.appendChild(cmpBtn); const cmp = AI.el('<div style="margin-top:10px"></div>'); ps.appendChild(cmp);
      const ph = AI.panel(L.below, 'h(n): straight-line distance to Bucharest'); ph.insertAdjacentHTML('beforeend', `<div class="scroll"><table class="tbl compact"><tbody>${(() => { const c = R.cities; const rows = []; for (let i = 0; i < c.length; i += 2) rows.push(`<tr><td>${c[i]}</td><td class="r">${R.sld[c[i]]}</td><td>${c[i + 1] || ''}</td><td class="r">${c[i + 1] ? R.sld[c[i + 1]] : ''}</td></tr>`); return rows.join(''); })()}</tbody></table></div>`);
      function mapState() {
        const f = frame || {}; const status = {}; const badge = {};
        if (f.fwd) { f.fwd.closed.forEach(c => status[c] = 'explored'); f.bwd.closed.forEach(c => status[c] = 'explored'); f.fwd.frontier.concat(f.bwd.frontier).forEach(c => { if (!status[c]) status[c] = 'frontier'; }); Object.keys(f.fwd.g).forEach(c => badge[c] = 'gF ' + f.fwd.g[c]); Object.keys(f.bwd.g).forEach(c => badge[c] = (badge[c] ? badge[c] + ' ' : '') + 'gB ' + f.bwd.g[c]); }
        else if (f.stack) { (f.visited || []).forEach(c => status[c] = 'explored'); (f.stack || []).forEach(c => status[c] = 'frontier'); }
        else { (f.expanded || []).forEach(c => status[c] = 'explored'); (f.frontier || []).forEach(n => { if (!status[n.s]) status[n.s] = 'frontier'; const v = st.algo === 'ucs' ? `g ${n.g}` : st.algo === 'greedy' ? `h ${R.sld[n.s]}` : ['astar', 'wastar'].includes(st.algo) ? `f ${fmt(n.f)}` : ''; if (v && !badge[n.s]) badge[n.s] = v; }); }
        if (f.current) status[f.current] = 'current';
        (f.path || []).forEach(c => status[c] = 'path');
        return { status, path: f.path, tree: f.tree || (f.stack ? f.stack.map((c, i, a) => i ? [a[i - 1], c] : null).filter(Boolean) : []), start: st.start, goal: st.goal, badge: f.done ? {} : badge };
      }
      const fmt = v => Number.isInteger(v) ? v : v.toFixed(1);
      function show() {
        const f = frame || {}; sv.redraw();
        pseudo.hl(LMAP[pKey(st.algo)][f.line] || 0);
        expl.innerHTML = f.msg || '';
        if (f.fwd) ftab.innerHTML = `<p class="small" style="margin:0 0 6px"><b>Forward frontier:</b> ${f.fwd.frontier.map(c => `${esc(c)} (${f.fwd.g[c]})`).join(', ') || '—'}</p><p class="small" style="margin:0"><b>Backward frontier:</b> ${f.bwd.frontier.map(c => `${esc(c)} (${f.bwd.g[c]})`).join(', ') || '—'}</p><p class="small muted" style="margin:6px 0 0">Best meeting cost so far: ${f.best === Infinity ? '∞' : f.best}${f.meet ? ' via ' + esc(f.meet) : ''}</p>`;
        else if (f.stack) ftab.innerHTML = `<p class="small" style="margin:0 0 6px"><b>Current path (the recursion stack):</b> ${f.stack.map(esc).join(' → ') || '—'}</p><p class="small muted" style="margin:0">Depth limit ℓ = ${f.limit}. Depth-first search with a limit keeps only this path in memory.</p>`;
        else {
          const fr = (f.frontier || []).slice(); if (st.algo === 'bfs') fr.sort((a, b) => a.seq - b.seq); else if (st.algo === 'dfs') fr.sort((a, b) => b.seq - a.seq);
          const head = st.algo === 'bfs' || st.algo === 'dfs' ? ['City', 'r:Depth', 'r:g (km)'] : ['City', 'r:g', 'r:h', 'r:f'];
          ftab.innerHTML = fr.length ? AI.table(head, fr.map((n, i) => `<tr class="${i === 0 ? 'hl' : ''}"><td>${esc(n.s)}</td>${st.algo === 'bfs' || st.algo === 'dfs' ? `<td class="r">${n.d}</td><td class="r">${n.g}</td>` : `<td class="r">${n.g}</td><td class="r">${informed(st.algo) || st.algo === 'ucs' ? (st.goal === 'Bucharest' ? R.sld[n.s] : 0) : ''}</td><td class="r"><b>${fmt(n.f)}</b></td>`}</tr>`), 'compact') : '<p class="muted small">Empty.</p>';
        }
        const n = player.length, last = player.index === n - 1;
        stats.set('exp', f.stats ? f.stats.expanded : (f.visited ? f.visited.length : '–'));
        stats.set('gen', f.stats ? f.stats.generated : '–');
        stats.set('cost', last && result ? (result.path ? result.cost : 'none') : '–', last && result && result.path ? (result.cost === shortest() ? 'good' : 'bad') : '');
        stats.set('len', last && result && result.path ? result.path.length - 1 : '–');
      }
      const shortest = () => E.graphSearch(R, st.start, st.goal, 'ucs').cost;
      function rebuild() {
        if (informed(st.algo) && st.goal !== 'Bucharest') { st.goal = 'Bucharest'; refs.goal.value = 'Bucharest'; }
        refs.limitField.hidden = st.algo !== 'dls';
        note.innerHTML = informed(st.algo) ? 'The straight-line table only gives distances to Bucharest, so the goal is fixed to Bucharest.' : st.algo === 'ucs' || st.algo === 'bfs' || st.algo === 'dfs' ? 'Any goal works for the uninformed searches.' : st.algo === 'bidi' ? 'Runs two uniform-cost searches, one from each end.' : 'Re-runs depth-limited search with ℓ = 0, 1, 2, … until it finds the goal.';
        pp.querySelector('.pseudo') && pp.querySelector('.pseudo').remove(); pseudo = AI.pseudo(pp, PSEUDO[pKey(st.algo)]);
        result = runAlgo(st.algo, st.start, st.goal, st.limit); player.set(result.frames); cmp.innerHTML = ''; cmpBtn.textContent = `Compare all algorithms from ${st.start}`;
      }
      cmpBtn.addEventListener('click', () => {
        const rows = ALGOS.filter(([a]) => !(informed(a) && st.goal !== 'Bucharest')).map(([a, name]) => { const r = runAlgo(a, st.start, st.goal, st.limit); return `<tr><td>${esc(name)}</td><td class="r">${r.path ? r.cost : '—'}</td><td class="r">${r.expanded}</td></tr>`; });
        cmp.innerHTML = `<p class="small muted" style="margin:0 0 6px">${esc(st.start)} to ${esc(st.goal)}. The cheapest route costs ${shortest()} km.</p>` + AI.table(['Algorithm', 'r:Cost', 'r:Expanded'], rows, 'compact');
      });
      ctx.on(box, 'click', e => { const g = e.target.closest('.city'); if (!g) return; st.start = g.dataset.c; refs.start.value = st.start; rebuild(); });
      rebuild();
    }
  });

  /* ---------- Be the frontier (game) ---------- */
  AI.lab({
    id: 'frontier-game', ch: 3, kind: 'game', title: 'Be the frontier',
    blurb: 'You are the search algorithm. Pick the node it would expand next, and see how far you get without a mistake.',
    tags: ['BFS', 'DFS', 'UCS', 'greedy', 'A*'],
    how: [['How to play', '<ul><li>Pick an algorithm. The chips under the map are the frontier.</li><li>Click the node the algorithm expands next. Breadth-first takes the oldest node, depth-first the newest, uniform-cost the lowest g, greedy the lowest h, and A* the lowest g + h.</li><li>Ties go to the node that was added first, shown by its # number.</li></ul>'],
      ['Scoring', '<p>Every correct pick earns a point; a wrong pick costs a life (you have three). Your best clean run for each algorithm is kept in this browser.</p>'],
      ['Why it helps', '<p>Exam questions often ask for the order in which nodes are expanded. Doing it by hand, with the frontier in front of you, is exactly that skill.</p>']],
    mount(root, ctx) {
      const st = { algo: 'astar' };
      const L = AI.layout(root); const box = AI.el('<div style="position:relative;aspect-ratio:1.5;min-height:300px"></div>'); L.stage.appendChild(box);
      const chips = AI.el('<div style="display:flex;flex-wrap:wrap;gap:8px;padding:12px;border-top:1px solid var(--line);background:var(--bg)"></div>'); L.stage.appendChild(chips);
      const banner = AI.banner(L.stage);
      let G0 = null;
      const sv = AI.svgHost(box, ctx, (W, H) => G0 ? drawRomania(W, H, G0.view()) : '');
      const pc = AI.panel(L.side, 'Game');
      AI.controls(pc, [{ t: 'select', k: 'algo', label: 'Algorithm', opts: [['bfs', 'Breadth-first'], ['dfs', 'Depth-first'], ['ucs', 'Uniform-cost'], ['greedy', 'Greedy best-first'], ['astar', 'A*']], grow: true, str: true }, { t: 'row' }, { t: 'btn', label: 'New game', icon: 'dice', cls: 'primary', on: () => start() }], st, () => start());
      const sc = AI.stats(pc, [['score', 'correct picks'], ['lives', 'lives left'], ['best', 'best run']]); sc.el.style.marginTop = '12px';
      const rule = AI.el('<p class="tip" style="margin:10px 0 0"></p>'); pc.appendChild(rule);
      const pl = AI.panel(L.side, 'Log'); const log = AI.el('<ul class="log"></ul>'); pl.appendChild(log);
      const RULES = { bfs: 'Breadth-first expands the <b>oldest</b> node in the frontier (smallest #).', dfs: 'Depth-first expands the <b>newest</b> node (largest #).', ucs: 'Uniform-cost expands the node with the <b>lowest g</b>, the cost so far.', greedy: 'Greedy best-first expands the node with the <b>lowest h</b>, the straight-line distance to Bucharest.', astar: 'A* expands the node with the <b>lowest f = g + h</b>. You have to add them up.' };
      const addLog = (t, ok) => { log.insertAdjacentHTML('afterbegin', `<li><b style="color:${ok ? 'var(--ok)' : 'var(--bad)'}">${ok ? 'Right' : 'Wrong'}</b><span>${t}</span></li>`); while (log.children.length > 30) log.lastChild.remove(); };
      function start() {
        const goal = 'Bucharest'; const startCity = AI.pick(R.cities.filter(c => c !== goal && R.adj[c].length > 1 && !['Giurgiu', 'Urziceni', 'Pitesti', 'Fagaras'].includes(c)));
        let seq = 0; const g = { score: 0, lives: 3, over: false, start: startCity, goal, expanded: [], frontier: [{ s: startCity, g: 0, d: 0, n: seq++, par: null }], reached: { [startCity]: 0 }, parent: { [startCity]: null }, path: null, current: null };
        g.view = () => { const status = {}; g.expanded.forEach(c => status[c] = 'explored'); g.frontier.forEach(n => status[n.s] = 'frontier'); if (g.current) status[g.current] = 'current'; if (g.path) g.path.forEach(c => status[c] = 'path'); return { status, path: g.path, start: g.start, goal: g.goal, tree: Object.keys(g.parent).filter(c => g.parent[c]).map(c => [g.parent[c], c]) }; };
        const key = n => st.algo === 'bfs' ? [n.n] : st.algo === 'dfs' ? [-n.n] : st.algo === 'ucs' ? [n.g, n.n] : st.algo === 'greedy' ? [R.sld[n.s], n.n] : [n.g + R.sld[n.s], n.n];
        g.correct = () => g.frontier.slice().sort((a, b) => { const x = key(a), y = key(b); return x[0] - y[0] || (x[1] || 0) - (y[1] || 0); })[0];
        const pathTo = c => { const p = []; while (c) { p.unshift(c); c = g.parent[c]; } return p; };
        g.expand = node => {
          g.frontier = g.frontier.filter(n => n !== node); g.current = node.s;
          if (st.algo !== 'bfs' && node.s === goal) { g.path = pathTo(goal); return 'goal'; }
          g.expanded.push(node.s);
          const onPath = pathTo(node.s);
          for (const [t, c] of R.adj[node.s]) {
            const gg = node.g + c;
            if (st.algo === 'bfs') { if (g.reached[t] !== undefined) continue; g.reached[t] = gg; g.parent[t] = node.s; if (t === goal) { g.path = pathTo(goal); return 'goal-gen'; } g.frontier.push({ s: t, g: gg, d: node.d + 1, n: seq++ }); }
            else if (st.algo === 'dfs') { if (g.expanded.includes(t) || onPath.includes(t)) continue; g.frontier = g.frontier.filter(n => n.s !== t); g.parent[t] = node.s; g.frontier.push({ s: t, g: gg, d: node.d + 1, n: seq++ }); }
            else { if (g.reached[t] !== undefined && gg >= g.reached[t]) continue; g.reached[t] = gg; g.parent[t] = node.s; g.frontier = g.frontier.filter(n => n.s !== t); g.frontier.push({ s: t, g: gg, d: node.d + 1, n: seq++ }); }
          }
          return 'ok';
        };
        G0 = g; log.innerHTML = ''; rule.innerHTML = RULES[st.algo] + ` Find a route from <b>${esc(startCity)}</b> to Bucharest.`; render();
      }
      function render() {
        const g = G0; sv.redraw();
        sc.set('score', g.score); sc.set('lives', g.lives, g.lives <= 1 ? 'bad' : ''); const b = AI.progress.best('frontier-' + st.algo); sc.set('best', b == null ? '–' : b);
        if (g.over) { chips.innerHTML = `<button type="button" class="btn primary" data-new>${AI.icon.dice}Play again</button>`; chips.querySelector('[data-new]').onclick = start; return; }
        const fr = g.frontier.slice().sort((a, b) => a.s < b.s ? -1 : 1);
        chips.innerHTML = '<span class="small muted" style="align-self:center;margin-right:4px">Frontier:</span>' + fr.map(n => `<button type="button" class="btn small" data-s="${esc(n.s)}"><b>${esc(n.s)}</b><span class="muted" style="font-weight:500">#${n.n}${st.algo === 'bfs' || st.algo === 'dfs' ? ` · depth ${n.d}` : ''}${['ucs', 'astar'].includes(st.algo) ? ` · g ${n.g}` : ''}${['greedy', 'astar'].includes(st.algo) ? ` · h ${R.sld[n.s]}` : ''}</span></button>`).join('');
        chips.querySelectorAll('[data-s]').forEach(btn => btn.onclick = () => pick(btn.dataset.s));
      }
      function pick(s) {
        const g = G0, want = g.correct();
        if (s === want.s) {
          g.score++; const r = g.expand(want);
          addLog(`Expand ${esc(s)}.`, true);
          if (r !== 'ok') { g.over = true; const cost = E.pathCost(R, g.path); const opt = E.graphSearch(R, g.start, g.goal, 'ucs').cost; banner(`${r === 'goal-gen' ? 'Bucharest generated: BFS stops' : 'Bucharest reached'}<small>${g.score} correct · path cost ${cost} km${cost === opt ? ' (cheapest)' : `, cheapest is ${opt}`}</small>`, 3200); if (AI.progress.best('frontier-' + st.algo, g.score)) addLog('New best run for this algorithm.', true); }
        } else {
          g.lives--; const n = g.frontier.find(x => x.s === s);
          const why = st.algo === 'bfs' ? `${want.s} (#${want.n}) was added before ${s} (#${n.n}).` : st.algo === 'dfs' ? `${want.s} (#${want.n}) was added after ${s} (#${n.n}).` : st.algo === 'ucs' ? `${want.s} has g = ${want.g}, lower than ${s}’s ${n.g}${want.g === n.g ? ' (tie, so the one added first wins)' : ''}.` : st.algo === 'greedy' ? `${want.s} has h = ${R.sld[want.s]}, lower than ${s}’s ${R.sld[s]}.` : `${want.s} has f = ${want.g} + ${R.sld[want.s]} = ${want.g + R.sld[want.s]}, lower than ${s}’s ${n.g} + ${R.sld[s]} = ${n.g + R.sld[s]}.`;
          addLog(`Not ${esc(s)}: ${esc(why)}`, false);
          if (g.lives <= 0) { g.over = true; banner(`Out of lives<small>${g.score} correct picks</small>`, 2600); AI.progress.best('frontier-' + st.algo, g.score); }
        }
        render();
      }
      start();
    }
  });

  /* ---------- Pathfinding race (grid) ---------- */
  AI.lab({
    id: 'grid-race', ch: 3, kind: 'demo', title: 'Pathfinding race',
    blurb: 'Six searches race across the same grid. Draw walls and mud, then see which ones explore least and which find the cheapest path.',
    tags: ['BFS', 'DFS', 'UCS', 'greedy', 'A*', 'weighted A*'],
    how: [['What to try', '<ul><li>On the empty grid, A* with the Manhattan heuristic expands a narrow band; breadth-first floods everything.</li><li>Paint a patch of mud (cost 5 per step). Uniform-cost and A* walk round it; breadth-first ploughs straight through because it only counts steps.</li><li>Build a wall in front of the goal. Greedy rushes into the dead end, then has to back out.</li></ul>'],
      ['What the colours mean', '<p>Amber cells are on the frontier, grey cells have been expanded, and the blue line is the path found. Each panel reports how many nodes it expanded and the cost of its path.</p>'],
      ['Heuristic', '<p>All informed searches use Manhattan distance, which is admissible on a 4-connected grid where every step costs at least 1. Weighted A* multiplies it by 2, which explores less but can return a longer path.</p>']],
    mount(root, ctx) {
      const W = 25, H = 15; const st = { tool: 'wall', speed: 3, preset: 'blank' };
      let grid = new Uint8Array(W * H), S = 7 * W + 2, Gl = 7 * W + 22;
      const algos = [['bfs', 'Breadth-first'], ['dfs', 'Depth-first'], ['ucs', 'Uniform-cost'], ['greedy', 'Greedy'], ['astar', 'A*'], ['wastar', 'Weighted A* (×2)']];
      const wrap = AI.el('<div class="grid3" style="gap:12px"></div>'); root.appendChild(AI.el('<div></div>')).appendChild(wrap);
      const ctlP = AI.el('<div class="panel" style="margin-bottom:12px"></div>'); root.insertBefore(ctlP, root.firstChild);
      let t = 0, runs = [], playing = false;
      const panels = algos.map(([k, name]) => {
        const p = AI.el(`<div class="stage" style="min-height:0"><div style="position:relative;aspect-ratio:${W}/${H}"></div><div class="legend" style="justify-content:space-between"><b>${esc(name)}</b><span class="num" data-s></span></div></div>`); wrap.appendChild(p);
        const host = p.firstElementChild; const cv = AI.canvas(host, ctx, () => drawPanel(k)); return { k, name, cv, stat: p.querySelector('[data-s]'), host };
      });
      AI.controls(ctlP, [{ t: 'seg', k: 'tool', label: 'Paint', opts: [['wall', 'Wall'], ['mud', 'Mud (cost 5)'], ['erase', 'Erase'], ['start', 'Move start'], ['goal', 'Move goal']] }, { t: 'select', k: 'preset', label: 'Map', opts: [['blank', 'Empty'], ['maze', 'Maze'], ['walls', 'Random walls'], ['mud', 'Mud field'], ['trap', 'Dead end']], str: true }, { t: 'range', k: 'speed', label: 'Speed', min: 1, max: 10, fmt: v => v + '×' }, { t: 'btn', label: 'Race', icon: 'play', cls: 'primary', id: 'race', on: () => { compute(); t = 0; playing = true; } }, { t: 'btn', label: 'Show results', on: () => { compute(); t = 1e9; playing = false; draw(); } }], st, k => { if (k === 'preset') { preset(st.preset); compute(); t = 0; playing = false; draw(); } });
      function preset(p) {
        grid = new Uint8Array(W * H); const r = AI.rng(Date.now() & 0xffff); S = 7 * W + 2; Gl = 7 * W + 22;
        if (p === 'walls') for (let i = 0; i < W * H; i++) if (r() < 0.28) grid[i] = 1;
        if (p === 'mud') for (let y = 2; y < 13; y++) for (let x = 8; x < 17; x++) grid[y * W + x] = 2;
        if (p === 'trap') { for (let y = 3; y < 12; y++) grid[y * W + 18] = 1; for (let x = 12; x < 19; x++) { grid[3 * W + x] = 1; grid[11 * W + x] = 1; } }
        if (p === 'maze') { grid.fill(1); const vis = new Uint8Array(W * H); const stack = [[1, 1]]; grid[W + 1] = 0; vis[W + 1] = 1; while (stack.length) { const [x, y] = stack[stack.length - 1]; const nb = [[2, 0], [-2, 0], [0, 2], [0, -2]].map(([dx, dy]) => [x + dx, y + dy, x + dx / 2, y + dy / 2]).filter(([a, b]) => a > 0 && b > 0 && a < W - 1 && b < H - 1 && !vis[b * W + a]); if (!nb.length) { stack.pop(); continue; } const [a, b, mx, my] = nb[(r() * nb.length) | 0]; vis[b * W + a] = 1; grid[b * W + a] = 0; grid[my * W + mx] = 0; stack.push([a, b]); } S = W + 1; Gl = (H - 2) * W + (W - 2); for (let k = 0; k < 18; k++) { const x = 1 + ((r() * (W - 2)) | 0), y = 1 + ((r() * (H - 2)) | 0); grid[y * W + x] = 0; } }
        grid[S] = 0; grid[Gl] = 0;
      }
      function compute() { runs = algos.map(([k]) => E.gridSearch(grid, W, H, S, Gl, k, 2)); }
      const C = n => AI.color(n);
      function drawPanel(k) {
        const p = panels.find(x => x.k === k); if (!p) return; const { g, w, h } = p.cv; if (!w) return;
        const cs = w / W; g.clearRect(0, 0, w, h); const run = runs[algos.findIndex(a => a[0] === k)];
        const cFree = C('bg'), cWall = C('wall'), cMud = AI.isDark() ? '#5a4524' : '#e6d3b0', cExp = C('v-explored'), cFr = C('v-frontier');
        for (let i = 0; i < W * H; i++) {
          const x = (i % W) * cs, y = ((i / W) | 0) * cs; let col = grid[i] === 1 ? cWall : grid[i] === 2 ? cMud : cFree;
          if (run && grid[i] !== 1) { if (run.expAt[i] >= 0 && run.expAt[i] <= t) col = grid[i] === 2 ? AI.alpha(cExp.length === 7 ? cExp : '#999999', 0.85) : cExp; else if (run.frAt[i] >= 0 && run.frAt[i] <= t) col = cFr; }
          g.fillStyle = col; g.fillRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
          if (grid[i] === 2 && cs > 9) { g.fillStyle = AI.isDark() ? '#8a6a35' : '#b88d4a'; g.fillRect(x + cs * 0.3, y + cs * 0.55, cs * 0.18, cs * 0.12); g.fillRect(x + cs * 0.58, y + cs * 0.3, cs * 0.14, cs * 0.1); }
        }
        if (run && run.found && t >= run.steps) { g.strokeStyle = C('v-path'); g.lineWidth = Math.max(2.5, cs * 0.28); g.lineJoin = 'round'; g.lineCap = 'round'; g.beginPath(); run.path.forEach((i, j) => { const x = (i % W + 0.5) * cs, y = (((i / W) | 0) + 0.5) * cs; j ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }
        const dot = (i, col, txt) => { const x = (i % W + 0.5) * cs, y = (((i / W) | 0) + 0.5) * cs; g.fillStyle = col; g.beginPath(); g.arc(x, y, cs * 0.42, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = `700 ${Math.max(8, cs * 0.55)}px Overpass, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, x, y + 1); };
        dot(S, C('ink'), 'S'); dot(Gl, C('v-goal'), 'G');
        if (run) { const done = t >= run.steps; p.stat.textContent = done ? (run.found ? `expanded ${run.steps} · cost ${run.cost}` : 'no path') : `expanded ${Math.min(t, run.steps)}…`; }
      }
      const draw = () => panels.forEach(p => drawPanel(p.k));
      let painting = false;
      panels.forEach(p => {
        const cellAt = e => { const r = p.host.getBoundingClientRect(); const x = Math.floor((e.clientX - r.left) / r.width * W), y = Math.floor((e.clientY - r.top) / r.height * H); return x >= 0 && y >= 0 && x < W && y < H ? y * W + x : -1; };
        const paint = i => { if (i < 0) return; if (st.tool === 'start') { if (i !== Gl) { S = i; grid[i] = 0; } } else if (st.tool === 'goal') { if (i !== S) { Gl = i; grid[i] = 0; } } else if (i !== S && i !== Gl) grid[i] = st.tool === 'wall' ? 1 : st.tool === 'mud' ? 2 : 0; runs = []; playing = false; draw(); };
        ctx.on(p.host, 'pointerdown', e => { painting = true; p.host.setPointerCapture && p.host.setPointerCapture(e.pointerId); paint(cellAt(e)); e.preventDefault(); });
        ctx.on(p.host, 'pointermove', e => { if (painting && !['start', 'goal'].includes(st.tool)) paint(cellAt(e)); });
        p.host.style.touchAction = 'none'; p.host.style.cursor = 'crosshair';
      });
      ctx.on(window, 'pointerup', () => { painting = false; });
      ctx.raf(dt => { if (playing && runs.length) { t += dt / 1000 * 14 * st.speed * st.speed; const mx = Math.max(...runs.map(r => r.steps)); if (t >= mx) { t = mx; playing = false; } draw(); } });
      ctx.theme(draw);
      preset('blank'); compute(); t = 1e9; draw();
    }
  });

  /* ---------- 8-puzzle (game) ---------- */
  AI.lab({
    id: 'eight-puzzle', ch: 3, kind: 'game', title: '8-puzzle with A*',
    blurb: 'Slide the tiles home, compare your moves with the optimal solution, and see how much a better heuristic saves A*.',
    tags: ['8-puzzle', 'A*', 'misplaced tiles h₁', 'Manhattan distance h₂', 'effective branching factor'],
    how: [['How to play', '<ul><li>Click a tile next to the gap, or use the arrow keys (the arrow moves the gap).</li><li>The goal has the gap in the top-left corner and tiles 1 to 8 in reading order, as in the book.</li><li>Ask for a hint, or let A* show the optimal solution.</li></ul>'],
      ['Two heuristics', '<p>h₁ counts misplaced tiles. h₂ adds up each tile’s Manhattan distance from its home. Both are admissible, and h₂ ≥ h₁ in every state, so h₂ dominates: A* with h₂ never expands more nodes than with h₁.</p>'],
      ['The book’s example', '<p>The start state 7 2 4 / 5 _ 6 / 8 3 1 has h₁ = 8 and h₂ = 18, and its optimal solution is 26 moves. Load it with “Book example” and run the comparison.</p>']],
    mount(root, ctx) {
      const P = E.puzzle; const st = { level: 20 };
      const L = AI.layout(root, { cls: 'even' }); L.stage.classList.add('plain');
      const board = AI.el('<div style="position:relative;width:min(100%,420px);aspect-ratio:1;margin:18px auto"></div>'); L.stage.appendChild(board);
      const banner = AI.banner(L.stage);
      let s = P.goal, moves = 0, startS = P.goal, optimal = 0, solving = false, hintIdx = -1;
      const tiles = {}; for (let k = 1; k <= 8; k++) { const t = AI.el(`<button type="button" class="tile" aria-label="Tile ${k}" style="position:absolute;width:31.3%;height:31.3%;border-radius:14px;border:0;background:var(--ink);color:var(--bg);font-family:var(--display);font-weight:900;font-size:clamp(26px,6vw,46px);cursor:pointer;transition:left .16s,top .16s;box-shadow:inset 0 -6px 0 rgba(0,0,0,.25)">${k}</button>`); board.appendChild(t); tiles[k] = t; t.addEventListener('click', () => clickTile(k)); }
      const pc = AI.panel(L.side, 'Puzzle');
      AI.controls(pc, [{ t: 'select', k: 'level', label: 'Scramble', opts: [[10, 'Easy (10 random moves)'], [20, 'Medium (20)'], [40, 'Hard (40)'], [0, 'Book example (26 to solve)']], grow: true }, { t: 'row' }, { t: 'btn', label: 'New puzzle', icon: 'dice', cls: 'primary', on: () => newGame() }, { t: 'btn', label: 'Hint', icon: 'bulb', on: () => hint() }, { t: 'btn', label: 'Solve with A*', icon: 'play', on: () => solve() }], st, () => newGame());
      const stats = AI.stats(pc, [['moves', 'your moves'], ['opt', 'optimal from start'], ['h1', 'h₁ now'], ['h2', 'h₂ now']]); stats.el.style.marginTop = '12px';
      const pcmp = AI.panel(L.side, 'How hard did A* work? <small>for the starting state</small>');
      const cmpBtn = AI.el('<button type="button" class="btn small">Run BFS, A*(h₁) and A*(h₂)</button>'); pcmp.appendChild(cmpBtn); const cmpOut = AI.el('<div style="margin-top:10px"></div>'); pcmp.appendChild(cmpOut);
      function place() { for (let i = 0; i < 9; i++) { const c = s[i]; if (c === '0') continue; const t = tiles[c]; t.style.left = (i % 3) * 34.35 + '%'; t.style.top = Math.floor(i / 3) * 34.35 + '%'; t.style.background = i === P.goal.indexOf(c) ? 'var(--v-path)' : i === hintIdx ? 'var(--accent)' : 'var(--ink)'; } stats.set('moves', moves); stats.set('opt', optimal); stats.set('h1', P.h1(s)); stats.set('h2', P.h2(s)); }
      function newGame() { solving = false; hintIdx = -1; const r = AI.rng(Date.now()); s = st.level ? P.scramble(st.level, r) : '724506831'; if (s === P.goal) s = P.scramble(st.level + 2, r); startS = s; moves = 0; optimal = P.solve(s, 'h2').path.length - 1; cmpOut.innerHTML = ''; place(); }
      function moveTo(t) { s = t; moves++; hintIdx = -1; place(); if (s === P.goal) { const ok = moves === optimal; banner(`Solved in ${moves} moves<small>${ok ? 'That is optimal.' : `Optimal was ${optimal}.`}</small>`, 3000); if (!solving) AI.progress.best('8puzzle-' + st.level, moves - optimal, false); } }
      function clickTile(k) { if (solving) return; const i = s.indexOf(String(k)), z = s.indexOf('0'); const adj = Math.abs(i - z) === 3 || (Math.abs(i - z) === 1 && Math.floor(i / 3) === Math.floor(z / 3)); if (!adj || s === P.goal) return; const a = s.split(''); [a[i], a[z]] = [a[z], a[i]]; moveTo(a.join('')); }
      function hint() { if (s === P.goal) return; const p = P.solve(s, 'h2').path; const nx = p[1]; hintIdx = nx.indexOf('0') === s.indexOf('0') ? -1 : s.indexOf(nx[s.indexOf('0')]); place(); }
      function solve() { if (s === P.goal) return; solving = true; const p = P.solve(s, 'h2').path; let k = 1; const step = () => { if (!solving || k >= p.length) { solving = false; return; } moveTo(p[k++]); ctx.after(330, step); }; step(); }
      ctx.key(e => { if (solving) return; const z = s.indexOf('0'); const d = { ArrowUp: -3, ArrowDown: 3, ArrowLeft: -1, ArrowRight: 1 }[e.key]; if (d === undefined) return; const j = z + d; if (j < 0 || j > 8 || (Math.abs(d) === 1 && Math.floor(j / 3) !== Math.floor(z / 3))) return; e.preventDefault(); const a = s.split(''); [a[z], a[j]] = [a[j], a[z]]; moveTo(a.join('')); });
      cmpBtn.addEventListener('click', () => {
        cmpOut.innerHTML = '<p class="small muted">Searching…</p>';
        ctx.after(30, () => { const rows = [['bfs', 'Breadth-first'], ['h1', 'A* with h₁'], ['h2', 'A* with h₂']].map(([k, n]) => { const t0 = performance.now(); const r = P.solve(startS, k, 300000); const d = r.path ? r.path.length - 1 : null; const bstar = d ? ebf(r.generated + 1, d) : null; return `<tr><td>${n}</td><td class="r">${d == null ? 'gave up' : d}</td><td class="r">${r.generated.toLocaleString()}</td><td class="r">${bstar ? bstar.toFixed(2) : '–'}</td><td class="r">${Math.round(performance.now() - t0)} ms</td></tr>`; }); cmpOut.innerHTML = AI.table(['Search', 'r:Moves', 'r:Generated', 'r:b*', 'r:Time'], rows, 'compact') + '<p class="tip" style="margin-top:8px">b* is the effective branching factor: if the search generated N nodes for a solution at depth d, then N + 1 = 1 + b* + (b*)² + … + (b*)^d.</p>'; });
      });
      function ebf(N, d) { let lo = 1, hi = 10; for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; let s2 = 0, p = 1; for (let i = 0; i <= d; i++) { s2 += p; p *= m; } if (s2 > N) hi = m; else lo = m; } return (lo + hi) / 2; }
      newGame();
    }
  });
})(window);
