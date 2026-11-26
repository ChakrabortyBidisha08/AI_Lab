/* Search engines (AIMA ch. 3–4). Pure functions; each records frames for the step player. */
(function (G) {
  'use strict';
  const E = G.AIE = G.AIE || {};

  /* Romania road map: distances from the book (same as aimacode/aima-python search.py).
     h = straight-line distance to Bucharest (the book's table). Coordinates from aima-python, used for drawing only. */
  const R = E.romania = {
    roads: [['Arad', 'Zerind', 75], ['Arad', 'Sibiu', 140], ['Arad', 'Timisoara', 118], ['Bucharest', 'Urziceni', 85], ['Bucharest', 'Pitesti', 101], ['Bucharest', 'Giurgiu', 90], ['Bucharest', 'Fagaras', 211], ['Craiova', 'Drobeta', 120], ['Craiova', 'Rimnicu Vilcea', 146], ['Craiova', 'Pitesti', 138], ['Drobeta', 'Mehadia', 75], ['Eforie', 'Hirsova', 86], ['Fagaras', 'Sibiu', 99], ['Hirsova', 'Urziceni', 98], ['Iasi', 'Vaslui', 92], ['Iasi', 'Neamt', 87], ['Lugoj', 'Timisoara', 111], ['Lugoj', 'Mehadia', 70], ['Oradea', 'Zerind', 71], ['Oradea', 'Sibiu', 151], ['Pitesti', 'Rimnicu Vilcea', 97], ['Rimnicu Vilcea', 'Sibiu', 80], ['Urziceni', 'Vaslui', 142]],
    sld: { Arad: 366, Bucharest: 0, Craiova: 160, Drobeta: 242, Eforie: 161, Fagaras: 176, Giurgiu: 77, Hirsova: 151, Iasi: 226, Lugoj: 244, Mehadia: 241, Neamt: 234, Oradea: 380, Pitesti: 100, 'Rimnicu Vilcea': 193, Sibiu: 253, Timisoara: 329, Urziceni: 80, Vaslui: 199, Zerind: 374 },
    xy: { Arad: [91, 492], Bucharest: [400, 327], Craiova: [253, 288], Drobeta: [165, 299], Eforie: [562, 293], Fagaras: [305, 449], Giurgiu: [375, 270], Hirsova: [534, 350], Iasi: [473, 506], Lugoj: [165, 379], Mehadia: [168, 339], Neamt: [406, 537], Oradea: [131, 571], Pitesti: [320, 368], 'Rimnicu Vilcea': [233, 410], Sibiu: [207, 457], Timisoara: [94, 410], Urziceni: [456, 350], Vaslui: [509, 444], Zerind: [108, 531] }
  };
  R.cities = Object.keys(R.sld).sort();
  R.adj = {}; R.cities.forEach(c => R.adj[c] = []);
  R.roads.forEach(([a, b, d]) => { R.adj[a].push([b, d]); R.adj[b].push([a, d]); });
  R.cities.forEach(c => R.adj[c].sort((p, q) => p[0] < q[0] ? -1 : 1)); // successors in alphabetical order

  const pathTo = (parent, s) => { const p = []; while (s != null) { p.unshift(s); s = parent[s]; } return p; };
  const pathCost = (graph, p) => { let c = 0; for (let i = 1; i < p.length; i++) c += graph.adj[p[i - 1]].find(e => e[0] === p[i])[1]; return c; };
  E.pathCost = pathCost;

  /* Graph search on a weighted graph. algo: bfs | dfs | ucs | greedy | astar | wastar
     Conventions (shown in the demo): successors in alphabetical order; BFS tests the goal when a node is generated;
     priority-queue searches test when a node is popped; ties are broken first-in first-out. */
  E.graphSearch = (graph, start, goal, algo, opts) => {
    opts = opts || {};
    const h = opts.h || (() => 0), w = opts.w || 1.5;
    const fOf = (g, s, depth) => algo === 'ucs' ? g : algo === 'greedy' ? h(s) : algo === 'astar' ? g + h(s) : algo === 'wastar' ? g + w * h(s) : algo === 'dfs' ? -depth : depth;
    const frames = []; let seq = 0;
    const frontier = []; // {s,g,f,d,seq,parent}
    const reached = {}; const parent = {}; const expanded = []; const treeEdges = []; const stale = [];
    let generated = 1, maxF = 1;
    const snap = (line, msg, extra) => frames.push(Object.assign({ line, msg, frontier: frontier.map(n => Object.assign({}, n)).sort((a, b) => a.f - b.f || a.seq - b.seq), reached: Object.assign({}, reached), expanded: expanded.slice(), tree: treeEdges.slice(), stats: { expanded: expanded.length, generated, maxF } }, extra || {}));
    const push = n => { frontier.push(n); maxF = Math.max(maxF, frontier.length); };
    const popBest = () => { let bi = 0; for (let i = 1; i < frontier.length; i++) { const a = frontier[i], b = frontier[bi]; if (a.f < b.f || (a.f === b.f && a.seq < b.seq)) bi = i; } return frontier.splice(bi, 1)[0]; };
    const popFor = () => algo === 'bfs' ? frontier.shift() : algo === 'dfs' ? frontier.pop() : popBest();
    const root = { s: start, g: 0, d: 0, f: fOf(0, start, 0), seq: seq++, parent: null };
    reached[start] = 0; parent[start] = null; push(root);
    const solution = (node, line, msg) => { const p = pathTo(parent, node.s); snap(line, msg, { current: node.s, path: p, done: true, cost: node.g }); return { frames, path: p, cost: node.g, expanded: expanded.length, generated }; };
    snap(1, `Start at <b>${start}</b>. The frontier holds just the start node.`, { current: null });
    if (algo === 'bfs' && start === goal) return solution(root, 2, 'The start is already the goal.');
    const exp = algo === 'dfs' ? new Set() : null;
    while (frontier.length) {
      const node = popFor();
      if (algo !== 'bfs' && algo !== 'dfs' && reached[node.s] !== undefined && node.g > reached[node.s]) { stale.push(node.s); snap(4, `Pop <b>${node.s}</b> (g = ${node.g}), but a cheaper path to it (g = ${reached[node.s]}) was found later. Skip this stale entry.`, { current: node.s }); continue; }
      if (exp && exp.has(node.s)) { snap(4, `Pop <b>${node.s}</b>: already expanded, skip it.`, { current: node.s }); continue; }
      parent[node.s] = node.parent;
      const fx = algo === 'bfs' || algo === 'dfs' ? '' : ` (f = ${fmtF(node.f)})`;
      if (algo !== 'bfs' && node.s === goal) return solution(node, 5, `Pop <b>${node.s}</b>${fx}. It is the goal, so stop. Path cost = <b>${node.g}</b>.`);
      expanded.push(node.s); if (exp) exp.add(node.s);
      snap(6, `Pop <b>${node.s}</b>${fx} and expand it.`, { current: node.s });
      const kids = graph.adj[node.s].slice();
      if (algo === 'dfs') kids.reverse(); // push in reverse so the alphabetically first child is popped first
      const added = [], skipped = [];
      for (const [t, cst] of kids) {
        const g = node.g + cst;
        if (algo === 'bfs') {
          if (t === goal) { parent[t] = node.s; reached[t] = g; treeEdges.push([node.s, t]); generated++; const p = pathTo(parent, t); snap(9, `Generate <b>${t}</b>: it is the goal. BFS tests the goal as soon as a node is generated, so stop. Path cost = <b>${g}</b>.`, { current: node.s, path: p, done: true, cost: g }); return { frames, path: p, cost: g, expanded: expanded.length, generated }; }
          if (reached[t] === undefined) { reached[t] = g; parent[t] = node.s; treeEdges.push([node.s, t]); push({ s: t, g, d: node.d + 1, f: node.d + 1, seq: seq++, parent: node.s }); generated++; added.push(t); } else skipped.push(t);
        } else if (algo === 'dfs') {
          const onPath = pathTo(parent, node.s).includes(t);
          if (!onPath && !exp.has(t)) { treeEdges.push([node.s, t]); push({ s: t, g, d: node.d + 1, f: -(node.d + 1), seq: seq++, parent: node.s }); generated++; added.push(t); if (reached[t] === undefined || g < reached[t]) reached[t] = g; } else skipped.push(t);
        } else {
          if (reached[t] === undefined || g < reached[t]) { reached[t] = g; treeEdges.push([node.s, t]); push({ s: t, g, d: node.d + 1, f: fOf(g, t, node.d + 1), seq: seq++, parent: node.s }); generated++; added.push(t); } else skipped.push(t);
        }
      }
      snap(algo === 'bfs' ? 10 : 9, (added.length ? `Add ${added.map(a => `<b>${a}</b>`).join(', ')} to the frontier.` : 'No new nodes added.') + (skipped.length ? ` Skip ${skipped.join(', ')} (${algo === 'dfs' ? 'already expanded or on the current path' : 'already reached at equal or lower cost'}).` : ''), { current: node.s });
    }
    snap(11, 'The frontier is empty: no solution.', { done: true, failed: true });
    return { frames, path: null, cost: Infinity, expanded: expanded.length, generated };
  };
  const fmtF = f => Number.isInteger(f) ? String(f) : f.toFixed(1);

  /* Depth-limited and iterative deepening search, recursive, with cycle check along the path (AIMA 4th ed). */
  E.iterativeDeepening = (graph, start, goal, maxDepth, onlyLimit) => {
    const frames = []; let expandedTotal = 0, generated = 0;
    const limits = onlyLimit != null ? [onlyLimit] : Array.from({ length: maxDepth + 1 }, (_, i) => i);
    for (const L of limits) {
      const visitedThis = []; let cutoff = false;
      frames.push({ line: 2, msg: `Start a depth-limited search with limit <b>ℓ = ${L}</b>.`, stack: [start], limit: L, visited: [], current: start });
      const rec = (path, depth) => {
        const s = path[path.length - 1]; generated++;
        if (s === goal) { frames.push({ line: 5, msg: `<b>${s}</b> is the goal (depth ${depth}).`, stack: path.slice(), limit: L, visited: visitedThis.slice(), current: s, path: path.slice(), done: true }); return 'found'; }
        if (depth === L) { cutoff = true; frames.push({ line: 7, msg: `<b>${s}</b> is at the depth limit ${L}: cut off here.`, stack: path.slice(), limit: L, visited: visitedThis.slice(), current: s, cut: s }); return 'cutoff'; }
        visitedThis.push(s); expandedTotal++;
        frames.push({ line: 8, msg: `Expand <b>${s}</b> at depth ${depth}.`, stack: path.slice(), limit: L, visited: visitedThis.slice(), current: s });
        for (const [t] of graph.adj[s]) {
          if (path.includes(t)) continue; // cycle check
          const r = rec(path.concat(t), depth + 1);
          if (r === 'found') return r;
        }
        return 'fail';
      };
      const r = rec([start], 0);
      if (r === 'found') { const p = frames[frames.length - 1].path; return { frames, path: p, cost: pathCost(graph, p), expanded: expandedTotal, generated, limit: L }; }
      frames.push({ line: 11, msg: cutoff ? `Limit ${L} cut off some paths without finding the goal, so try a deeper limit.` : `Limit ${L} explored everything reachable: no solution exists.`, stack: [], limit: L, visited: visitedThis.slice() });
      if (!cutoff) break;
    }
    return { frames, path: null, cost: Infinity, expanded: expandedTotal, generated };
  };

  /* Bidirectional uniform-cost search. Stops when the best meeting cost <= min g forward + min g backward. */
  E.bidirectional = (graph, start, goal) => {
    const frames = [];
    const side = () => ({ fr: [], g: {}, parent: {}, closed: new Set() });
    const F = side(), B = side(); F.g[start] = 0; F.parent[start] = null; F.fr.push({ s: start, g: 0 }); B.g[goal] = 0; B.parent[goal] = null; B.fr.push({ s: goal, g: 0 });
    let best = Infinity, meet = null, expanded = 0, generated = 2;
    const top = X => X.fr.reduce((m, n) => Math.min(m, n.g), Infinity);
    const snap = (line, msg, ex) => frames.push(Object.assign({ line, msg, fwd: { frontier: F.fr.map(n => n.s), g: Object.assign({}, F.g), closed: [...F.closed] }, bwd: { frontier: B.fr.map(n => n.s), g: Object.assign({}, B.g), closed: [...B.closed] }, best, meet }, ex || {}));
    snap(1, `Search forward from <b>${start}</b> and backward from <b>${goal}</b> at the same time.`);
    if (start === goal) return { frames, path: [start], cost: 0, expanded, generated };
    let turn = 0;
    while (F.fr.length && B.fr.length) {
      if (best <= top(F) + top(B)) break;
      const X = (top(F) <= top(B)) ? F : B, Y = X === F ? B : F, name = X === F ? 'forward' : 'backward';
      turn++;
      let bi = 0; X.fr.forEach((n, i) => { if (n.g < X.fr[bi].g) bi = i; });
      const node = X.fr.splice(bi, 1)[0];
      if (X.closed.has(node.s) || node.g > X.g[node.s]) continue;
      X.closed.add(node.s); expanded++;
      const notes = [];
      for (const [t, c] of graph.adj[node.s]) {
        const g = node.g + c;
        if (X.g[t] === undefined || g < X.g[t]) { X.g[t] = g; X.parent[t] = node.s; X.fr.push({ s: t, g }); generated++; }
        if (Y.g[t] !== undefined && X.g[t] + Y.g[t] < best) { best = X.g[t] + Y.g[t]; meet = t; notes.push(`the two searches meet at <b>${t}</b> with total cost ${best}`); }
      }
      snap(5, `Expand <b>${node.s}</b> on the ${name} side (g = ${node.g}).` + (notes.length ? ' Now ' + notes.join('; ') + '.' : ''), { current: node.s, dir: name });
    }
    if (meet == null) { snap(9, 'The searches never met: no solution.', { done: true }); return { frames, path: null, cost: Infinity, expanded, generated }; }
    const p1 = pathTo(F.parent, meet), p2 = []; let s = B.parent[meet]; while (s != null) { p2.push(s); s = B.parent[s]; }
    const path = p1.concat(p2);
    snap(8, `Stop: no unexplored pair of frontier nodes can beat the meeting cost <b>${best}</b>. Path cost = <b>${best}</b>.`, { path, done: true, cost: best });
    return { frames, path, cost: best, expanded, generated };
  };

  /* ---------- grid pathfinding (for the race) ---------- */
  E.gridSearch = (grid, W, H, start, goal, algo, w) => {
    // grid[i]: 0 free, 1 wall, 2 mud (cost 5). Returns order of expansion & path.
    const N = W * H, cost = i => grid[i] === 2 ? 5 : 1;
    const hx = i => Math.abs(i % W - goal % W) + Math.abs(((i / W) | 0) - ((goal / W) | 0));
    const g = new Float64Array(N).fill(Infinity), par = new Int32Array(N).fill(-1), expAt = new Int32Array(N).fill(-1), frAt = new Int32Array(N).fill(-1);
    const nb = i => { const x = i % W, y = (i / W) | 0, r = []; if (y > 0) r.push(i - W); if (x < W - 1) r.push(i + 1); if (y < H - 1) r.push(i + W); if (x > 0) r.push(i - 1); return r.filter(j => grid[j] !== 1); };
    const f = (i, gi, d) => algo === 'ucs' ? gi : algo === 'greedy' ? hx(i) : algo === 'astar' ? gi + hx(i) : algo === 'wastar' ? gi + (w || 2) * hx(i) : 0;
    // binary heap keyed by [f, seq]
    const heap = []; let seq = 0;
    const hpush = (k, i, gi) => { heap.push([k, seq++, i, gi]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] < heap[c][0] || (heap[p][0] === heap[c][0] && heap[p][1] < heap[c][1])) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
    const hpop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = 2 * c + 1, r = l + 1; let m = c; const lt = (a, b) => heap[a][0] < heap[b][0] || (heap[a][0] === heap[b][0] && heap[a][1] < heap[b][1]); if (l < heap.length && lt(l, m)) m = l; if (r < heap.length && lt(r, m)) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
    let step = 0, found = false;
    g[start] = 0; frAt[start] = 0;
    if (algo === 'bfs' || algo === 'dfs') {
      const list = [start]; const seen = new Uint8Array(N); seen[start] = 1;
      while (list.length) {
        const i = algo === 'bfs' ? list.shift() : list.pop();
        if (expAt[i] >= 0) continue;
        expAt[i] = step++;
        if (i === goal) { found = true; break; }
        const ns = nb(i); if (algo === 'dfs') ns.reverse();
        for (const j of ns) { if (algo === 'bfs' ? seen[j] : expAt[j] >= 0) continue; if (algo === 'bfs') seen[j] = 1; if (algo === 'dfs' && expAt[j] < 0) { par[j] = i; g[j] = g[i] + cost(j); } else if (algo === 'bfs') { par[j] = i; g[j] = g[i] + cost(j); } frAt[j] = frAt[j] < 0 ? step : frAt[j]; list.push(j); }
      }
    } else {
      hpush(f(start, 0), start, 0);
      while (heap.length) {
        const [, , i, gi] = hpop();
        if (gi > g[i] || expAt[i] >= 0) continue;
        expAt[i] = step++;
        if (i === goal) { found = true; break; }
        for (const j of nb(i)) { const gj = gi + cost(j); if (gj < g[j]) { g[j] = gj; par[j] = i; if (frAt[j] < 0) frAt[j] = step; hpush(f(j, gj), j, gj); } }
      }
    }
    const path = []; if (found) { let s = goal; while (s >= 0) { path.unshift(s); s = par[s]; } }
    let pc = 0; for (let k = 1; k < path.length; k++) pc += cost(path[k]);
    return { expAt, frAt, steps: step, path, cost: found ? pc : Infinity, found };
  };

  /* ---------- 8-puzzle ---------- */
  const P8 = E.puzzle = {
    goal: '012345678', // 0 = blank; blank in the top-left, as in the book
    moves(s) { const i = s.indexOf('0'), x = i % 3, y = (i / 3) | 0, r = []; if (y > 0) r.push(['Up', i - 3]); if (y < 2) r.push(['Down', i + 3]); if (x > 0) r.push(['Left', i - 1]); if (x < 2) r.push(['Right', i + 1]); return r.map(([m, j]) => { const a = s.split(''); [a[i], a[j]] = [a[j], a[i]]; return [m, a.join('')]; }); },
    h1(s, goal) { goal = goal || P8.goal; let n = 0; for (let i = 0; i < 9; i++) if (s[i] !== '0' && s[i] !== goal[i]) n++; return n; },
    h2(s, goal) { goal = goal || P8.goal; let d = 0; for (let i = 0; i < 9; i++) { const t = s[i]; if (t === '0') continue; const j = goal.indexOf(t); d += Math.abs(i % 3 - j % 3) + Math.abs(((i / 3) | 0) - ((j / 3) | 0)); } return d; },
    solvable(s) { const a = s.replace('0', '').split('').map(Number); let inv = 0; for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i] > a[j]) inv++; return inv % 2 === 0; },
    solve(start, hname, limit) {
      // A* (or BFS when hname==='bfs'); returns {path, expanded, generated}
      limit = limit || 400000; const goal = P8.goal;
      const h = hname === 'h1' ? P8.h1 : hname === 'h2' ? P8.h2 : () => 0;
      const g = new Map([[start, 0]]), par = new Map([[start, null]]); let expanded = 0, generated = 1;
      if (hname === 'bfs') {
        const q = [start]; let head = 0;
        if (start === goal) return { path: [start], expanded: 0, generated: 1 };
        while (head < q.length) { const s = q[head++]; expanded++; for (const [, t] of P8.moves(s)) { if (g.has(t)) continue; g.set(t, g.get(s) + 1); par.set(t, s); generated++; if (t === goal) { const p = []; let u = t; while (u) { p.unshift(u); u = par.get(u); } return { path: p, expanded, generated }; } q.push(t); } if (expanded > limit) break; }
        return { path: null, expanded, generated };
      }
      const heap = []; let seq = 0;
      const push = (f, s) => { heap.push([f, seq++, s]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] < heap[c][0] || (heap[p][0] === heap[c][0] && heap[p][1] < heap[c][1])) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
      const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = 2 * c + 1, r = l + 1; let m = c; const lt = (a, b) => heap[a][0] < heap[b][0] || (heap[a][0] === heap[b][0] && heap[a][1] < heap[b][1]); if (l < heap.length && lt(l, m)) m = l; if (r < heap.length && lt(r, m)) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
      push(h(start), start); const done = new Set();
      while (heap.length) {
        const [, , s] = pop(); if (done.has(s)) continue;
        if (s === goal) { const p = []; let u = s; while (u) { p.unshift(u); u = par.get(u); } return { path: p, expanded, generated }; }
        done.add(s); expanded++; if (expanded > limit) break;
        const gs = g.get(s) + 1;
        for (const [, t] of P8.moves(s)) { if (!g.has(t) || gs < g.get(t)) { g.set(t, gs); par.set(t, s); generated++; push(gs + h(t), t); } }
      }
      return { path: null, expanded, generated };
    },
    scramble(n, r) { let s = P8.goal, prev = null; for (let k = 0; k < n; k++) { const ms = P8.moves(s).filter(([, t]) => t !== prev); prev = s; s = ms[(r() * ms.length) | 0][1]; } return s; }
  };

  /* ---------- n-queens local search ---------- */
  const Q = E.queens = {
    h(st) { let n = 0; for (let i = 0; i < st.length; i++) for (let j = i + 1; j < st.length; j++) if (st[i] === st[j] || Math.abs(st[i] - st[j]) === j - i) n++; return n; },
    attackers(st, c) { let n = 0; for (let j = 0; j < st.length; j++) if (j !== c && (st[j] === st[c] || Math.abs(st[j] - st[c]) === Math.abs(j - c))) n++; return n; },
    random(n, r) { return Array.from({ length: n }, () => (r() * n) | 0); },
    neighbours(st) { const out = []; for (let c = 0; c < st.length; c++) for (let row = 0; row < st.length; row++) if (row !== st[c]) { const t = st.slice(); t[c] = row; out.push({ c, row, st: t, h: Q.h(t) }); } return out; },
    hillClimb(st, r, maxSide) {
      // steepest-ascent on -h. Returns frames {st,h,move,line,msg}
      maxSide = maxSide || 0; let side = 0; const frames = [{ st: st.slice(), h: Q.h(st), line: 1, msg: `Start in a random state with <b>h = ${Q.h(st)}</b> attacking pairs.` }];
      for (let it = 0; it < 500; it++) {
        const ns = Q.neighbours(st); const best = Math.min(...ns.map(n => n.h)); const cur = Q.h(st);
        const ties = ns.filter(n => n.h === best); const pick = ties[(r() * ties.length) | 0];
        if (best > cur || (best === cur && side >= maxSide)) { frames.push({ st: st.slice(), h: cur, line: 4, msg: cur === 0 ? 'h = 0: a solution.' : `Stuck: the best neighbour has h = ${best}, ${best > cur ? 'worse than' : 'no better than'} the current h = ${cur}. This is a ${best === cur ? 'plateau' : 'local minimum'}.`, done: true, stuck: cur > 0 }); return frames; }
        if (best === cur) side++; else side = 0;
        st = pick.st;
        frames.push({ st: st.slice(), h: best, move: [pick.c, pick.row], line: 5, msg: `Move the queen in column ${pick.c + 1} to row ${pick.row + 1}: best of ${ns.length} neighbours, h = <b>${best}</b>${best === cur ? ' (sideways move)' : ''}.` });
        if (best === 0) { frames.push({ st: st.slice(), h: 0, line: 3, msg: '<b>h = 0</b>: no queen attacks another. Solved.', done: true }); return frames; }
      }
      return frames;
    },
    anneal(st, r, T0, decay, steps) {
      const frames = [{ st: st.slice(), h: Q.h(st), T: T0, line: 1, msg: `Start with h = ${Q.h(st)} at temperature T = ${T0}.` }];
      let T = T0, h = Q.h(st);
      for (let t = 0; t < steps && h > 0; t++) {
        T = T0 * Math.pow(decay, t); if (T < 1e-4) break;
        const c = (r() * st.length) | 0; let row = (r() * (st.length - 1)) | 0; if (row >= st[c]) row++;
        const nx = st.slice(); nx[c] = row; const hn = Q.h(nx), dE = h - hn; // improvement = positive
        const p = dE > 0 ? 1 : Math.exp(dE / T); const acc = r() < p;
        if (acc) { st = nx; h = hn; }
        if (acc || t % 10 === 0) frames.push({ st: st.slice(), h, T, line: acc ? 7 : 6, msg: `T = ${T.toFixed(3)}. Try column ${c + 1} → row ${row + 1}: ΔE = ${dE}. ${dE > 0 ? 'Better, accept.' : `Worse; accept with probability e^(ΔE/T) = ${p.toFixed(3)}: ${acc ? 'accepted' : 'rejected'}.`}` });
      }
      frames.push({ st: st.slice(), h, T, line: 3, done: true, msg: h === 0 ? '<b>Solved</b> (h = 0).' : `Stopped with h = ${h}.` });
      return frames;
    }
  };

  /* ---------- genetic algorithm on 8-queens strings (digits = row of the queen in each column, 1–8) ---------- */
  E.ga = {
    fitness(s) { return 28 - Q.h(s.split('').map(d => +d - 1)); },
    step(pop, r, pm) {
      const fit = pop.map(E.ga.fitness), tot = AI_sum(fit);
      const sel = () => { let x = r() * tot; for (let i = 0; i < pop.length; i++) { x -= fit[i]; if (x <= 0) return i; } return pop.length - 1; };
      const kids = [], log = [];
      for (let k = 0; k < pop.length; k++) {
        const a = sel(), b = sel(), c = 1 + ((r() * 7) | 0);
        let child = pop[a].slice(0, c) + pop[b].slice(c); let mut = -1;
        if (r() < pm) { mut = (r() * 8) | 0; child = child.slice(0, mut) + (1 + ((r() * 8) | 0)) + child.slice(mut + 1); }
        kids.push(child); log.push({ a, b, c, child, mut });
      }
      return { kids, log, fit };
    }
  };
  const AI_sum = a => a.reduce((s, x) => s + x, 0);

  /* ---------- 1-D landscape for the foggy hills game ---------- */
  E.landscape = (seed, n) => {
    const r = mulberry(seed); const peaks = []; const k = 6 + ((r() * 3) | 0);
    for (let i = 0; i < k; i++) peaks.push({ c: r() * n, w: n * (0.025 + r() * 0.06), a: 0.25 + r() * 0.75 });
    peaks[(r() * k) | 0].a = 1.12;
    const v = Array.from({ length: n }, (_, x) => peaks.reduce((s, p) => s + p.a * Math.exp(-(((x - p.c) / p.w) ** 2)), 0) + 0.04 * Math.sin(x * 0.9 + seed));
    const mx = Math.max(...v); return v.map(x => Math.round((x / mx) * 1000) / 10);
  };
  function mulberry(seed) { let s = (seed >>> 0) || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  E.mulberry = mulberry;
})(typeof window !== 'undefined' ? window : globalThis);
