/* Chapter 6 labs: map colouring with backtracking, Sudoku with AC-3, colour-the-map game. */
(function (G) {
  'use strict';
  const AI = G.AI, E = G.AIE, esc = AI.esc;
  const COLS = { red: ['#e8574e', '#d1453c'], green: ['#3bb27a', '#2e9e69'], blue: ['#4a86e8', '#3a74d4'], yellow: ['#f2c23a', '#ddb02c'] };
  const colFill = c => c ? (AI.isDark() ? COLS[c][1] : COLS[c][0]) : 'var(--bg)';
  const INIT = { red: 'R', green: 'G', blue: 'B', yellow: 'Y' };

  // Schematic Australia (not to scale); polygons share edges exactly where states border.
  const AUS = { WA: [[2, 22], [18, 10], [38, 8], [38, 72], [20, 74], [6, 60], [2, 40]], NT: [[38, 8], [52, 4], [62, 10], [62, 40], [38, 40]], SA: [[38, 40], [62, 40], [70, 40], [70, 70], [60, 74], [50, 68], [38, 72]], Q: [[62, 10], [66, 2], [72, 16], [86, 30], [96, 46], [96, 52], [70, 52], [70, 40], [62, 40]], NSW: [[70, 52], [96, 52], [94, 62], [88, 70], [70, 66]], V: [[70, 66], [88, 70], [84, 76], [70, 74]], T: [[78, 80], [86, 80], [84, 88], [79, 87]] };
  const AUSL = { WA: [20, 42], NT: [50, 22], SA: [54, 55], Q: [80, 40], NSW: [84, 60], V: [78, 71], T: [93, 82] };

  /* random region maps grown on a grid */
  function regionMap(seed, nReg, W, H) {
    const r = AI.rng(seed), cell = new Int16Array(W * H).fill(-1), seeds = [];
    while (seeds.length < nReg) { const i = (r() * W * H) | 0; if (!seeds.includes(i)) seeds.push(i); }
    const q = seeds.map((s, k) => { cell[s] = k; return s; });
    while (q.length) { const k = (r() * Math.min(q.length, 6)) | 0; const i = q.splice(k, 1)[0]; const x = i % W, y = (i / W) | 0; const nb = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < W && b < H).map(([a, b]) => b * W + a); AI.shuffle(nb, r); for (const j of nb) if (cell[j] < 0) { cell[j] = cell[i]; q.push(j); } }
    const names = AI.range(nReg).map(k => String.fromCharCode(65 + k)); const edges = new Set();
    for (let i = 0; i < W * H; i++) { const x = i % W; if (x < W - 1 && cell[i] !== cell[i + 1]) edges.add([cell[i], cell[i + 1]].sort((a, b) => a - b).join(',')); if (i + W < W * H && cell[i] !== cell[i + W]) edges.add([cell[i], cell[i + W]].sort((a, b) => a - b).join(',')); }
    const lab = names.map((_, k) => { const cs = []; for (let i = 0; i < W * H; i++) if (cell[i] === k) cs.push(i); const mx = cs.reduce((s, i) => s + i % W, 0) / cs.length, my = cs.reduce((s, i) => s + ((i / W) | 0), 0) / cs.length; let best = cs[0], bd = Infinity; cs.forEach(i => { const d = (i % W - mx) ** 2 + (((i / W) | 0) - my) ** 2; if (d < bd) { bd = d; best = i; } }); return [best % W + 0.5, ((best / W) | 0) + 0.5]; });
    return { W, H, cell, names, edges: [...edges].map(e => e.split(',').map(k => names[+k])), lab };
  }
  function drawRegions(map, w, h, colourOf, opts) {
    opts = opts || {}; const cs = Math.min(w / map.W, h / map.H), ox = (w - cs * map.W) / 2, oy = (h - cs * map.H) / 2; let s = '';
    for (let i = 0; i < map.W * map.H; i++) { const x = ox + (i % map.W) * cs, y = oy + ((i / map.W) | 0) * cs; s += `<rect x="${x}" y="${y}" width="${cs + 0.6}" height="${cs + 0.6}" fill="${colFill(colourOf(map.names[map.cell[i]]))}" class="reg" data-r="${map.names[map.cell[i]]}"/>`; }
    let bd = '';
    for (let i = 0; i < map.W * map.H; i++) { const x = ox + (i % map.W) * cs, y = oy + ((i / map.W) | 0) * cs; const a = map.names[map.cell[i]];
      if (i % map.W < map.W - 1 && map.cell[i] !== map.cell[i + 1]) { const b = map.names[map.cell[i + 1]]; const bad = opts.conflict && opts.conflict(a, b); bd += `<line x1="${x + cs}" y1="${y}" x2="${x + cs}" y2="${y + cs}" stroke="${bad ? 'var(--v-bad)' : 'var(--ink)'}" stroke-width="${bad ? 5 : 2.2}" stroke-linecap="round"/>`; }
      if (i + map.W < map.W * map.H && map.cell[i] !== map.cell[i + map.W]) { const b = map.names[map.cell[i + map.W]]; const bad = opts.conflict && opts.conflict(a, b); bd += `<line x1="${x}" y1="${y + cs}" x2="${x + cs}" y2="${y + cs}" stroke="${bad ? 'var(--v-bad)' : 'var(--ink)'}" stroke-width="${bad ? 5 : 2.2}" stroke-linecap="round"/>`; } }
    s += bd + `<rect x="${ox}" y="${oy}" width="${cs * map.W}" height="${cs * map.H}" fill="none" stroke="var(--ink)" stroke-width="3" rx="2"/>`;
    map.names.forEach((n, k) => { const [lx, ly] = map.lab[k]; const x = ox + lx * cs, y = oy + ly * cs; s += labelChip(x, y, n, colourOf(n), opts.domains && opts.domains[n], opts.hot === n); });
    return s;
  }
  function labelChip(x, y, n, colour, dom, hot) {
    let s = `<g pointer-events="none"><circle cx="${x}" cy="${y}" r="15" fill="var(--bg)" stroke="${hot ? 'var(--accent)' : 'var(--ink)'}" stroke-width="${hot ? 4 : 1.5}"/><text x="${x}" y="${y + 5}" text-anchor="middle" class="svg-b" style="font-size:14px">${esc(n)}</text>`;
    if (dom && !colour) dom.forEach((c, i) => { s += `<circle cx="${x - (dom.length - 1) * 6 + i * 12}" cy="${y + 24}" r="5" fill="${colFill(c)}" stroke="var(--ink)" stroke-width="1"/>`; });
    if (colour) s += `<text x="${x}" y="${y + 30}" text-anchor="middle" class="svg-b halo" style="font-size:12px">${INIT[colour]}</text>`;
    return s + '</g>';
  }
  function drawAus(w, h, colourOf, opts) {
    opts = opts || {}; const sx = (w - 30) / 100, sy = (h - 20) / 96, sc = Math.min(sx, sy), ox = (w - 100 * sc) / 2, oy = 8; const P = ([x, y]) => [ox + x * sc, oy + y * sc];
    let s = ''; Object.keys(AUS).forEach(n => { s += `<path d="M${AUS[n].map(P).map(p => p.join(' ')).join('L')}Z" fill="${colFill(colourOf(n))}" stroke="var(--ink)" stroke-width="2.4" stroke-linejoin="round" class="reg" data-r="${n}"/>`; });
    if (opts.conflict) E.australia().edges.forEach(([a, b]) => { if (opts.conflict(a, b)) { const [x1, y1] = P(AUSL[a]), [x2, y2] = P(AUSL[b]); s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--v-bad)" stroke-width="4" stroke-dasharray="6 4"/>`; } });
    Object.keys(AUSL).forEach(n => { const [x, y] = P(AUSL[n]); s += labelChip(x, y, n, colourOf(n), opts.domains && opts.domains[n], opts.hot === n); });
    return s;
  }

  AI.lab({
    id: 'map-coloring', ch: 6, kind: 'demo', title: 'Map colouring with backtracking',
    blurb: 'Colour Australia, or a random map, by backtracking search. Switch on MRV, the degree heuristic, LCV, forward checking and arc consistency, and count the work saved.',
    tags: ['backtracking search', 'MRV', 'degree heuristic', 'LCV', 'forward checking', 'MAC'],
    how: [['The CSP', '<p>Variables are regions, each domain is the set of colours, and every pair of neighbouring regions must differ. The dots under an unassigned region are the colours still in its domain.</p>'],
      ['What to try', '<ul><li>On Australia, turn on forward checking and watch the domains of the neighbours shrink after each assignment.</li><li>Choose a random map with three colours and fixed ordering: count the backtracks. Then switch on MRV and forward checking.</li><li>Some random maps cannot be coloured with three colours; backtracking proves it by trying everything.</li></ul>'],
      ['Heuristics in one line each', '<p><b>MRV</b>: pick the variable with the fewest legal values left. <b>Degree</b>: among those, pick the one with most unassigned neighbours. <b>LCV</b>: try the value that rules out fewest choices for neighbours. <b>Forward checking</b>: after an assignment, delete conflicting values from neighbours. <b>MAC</b>: run AC-3 after each assignment.</p>']],
    mount(root, ctx) {
      const st = { map: 'aus', ncol: 3, varOrd: 'static', valOrd: 'static', inf: 'none', seed: 4 };
      const L = AI.layout(root);
      const box = AI.el('<div style="position:relative;aspect-ratio:1.35;min-height:280px"></div>'); L.stage.appendChild(box);
      let frame = null, map = null, csp = null;
      const sv = AI.svgHost(box, ctx, (w, h) => { const f = frame || {}; const col = n => f.A ? f.A[n] : undefined; const dom = f.D || null; const opts = { domains: dom, hot: f.cur, conflict: (a, b) => f.bad && f.cur && ((a === f.cur && f.A && f.A[b] === f.tryv) || (b === f.cur && f.A && f.A[a] === f.tryv)) }; return st.map === 'aus' ? drawAus(w, h, col, opts) : drawRegions(map, w, h, col, opts); });
      const pc = AI.panel(L.side, 'Problem and strategy');
      AI.controls(pc, [{ t: 'select', k: 'map', label: 'Map', opts: [['aus', 'Australia (book)'], ['r10', 'Random, 10 regions'], ['r16', 'Random, 16 regions']], str: true }, { t: 'select', k: 'ncol', label: 'Colours', opts: [[3, '3'], [4, '4']] }, { t: 'row' }, { t: 'select', k: 'varOrd', label: 'Variable order', opts: [['static', 'Fixed (alphabetical)'], ['mrv', 'MRV'], ['mrvdeg', 'MRV + degree']], str: true }, { t: 'select', k: 'valOrd', label: 'Value order', opts: [['static', 'Fixed'], ['lcv', 'LCV']], str: true }, { t: 'row' }, { t: 'select', k: 'inf', label: 'Inference', opts: [['none', 'None'], ['fc', 'Forward checking'], ['mac', 'Arc consistency (MAC)']], str: true, grow: true }, { t: 'row' }, { t: 'btn', label: 'New random map', icon: 'dice', on: () => { st.seed = (Math.random() * 1e6) | 0; if (st.map === 'aus') st.map = 'r16'; build(true); } }], st, () => build());
      const pp = AI.panel(L.side, 'Pseudocode'); const pseudo = AI.pseudo(pp, ['function BACKTRACK(assignment)', '  (start: empty assignment, full domains)', '  if assignment is complete then return it', '  var ← SELECT-UNASSIGNED-VARIABLE()', '  for each value in ORDER-DOMAIN-VALUES(var)', '    if value conflicts with assignment: skip', '    add {var = value} to assignment', '    inferences ← INFERENCE(var, value)', '    if no domain is empty: BACKTRACK(…)', '    remove {var = value} and inferences', '  return failure', '(top level: no solution exists)']);
      const pe = AI.panel(L.side, 'What just happened'); const ex = AI.el('<div class="explain"></div>'); pe.appendChild(ex);
      const player = AI.Player(L.stageCol, ctx, f => { frame = f; sv.redraw(); pseudo.hl(f.line); ex.innerHTML = f.msg; stats.set('assign', f.assigns); stats.set('bt', f.backtracks, f.backtracks ? 'bad' : ''); });
      const ps = AI.panel(L.below, 'Work done'); const stats = AI.stats(ps, [['assign', 'assignments'], ['bt', 'backtracks']]);
      const pcmp = AI.panel(L.below, 'All strategies on this map'); const cmp = AI.el('<div></div>'); pcmp.appendChild(cmp);
      function build(newMap) {
        const colours = ['red', 'green', 'blue', 'yellow'].slice(0, st.ncol);
        if (st.map === 'aus') csp = E.mapCSP(['WA', 'NT', 'SA', 'Q', 'NSW', 'V', 'T'], E.australia().edges, colours);
        else { if (newMap || !map || map.names.length !== (st.map === 'r10' ? 10 : 16)) map = regionMap(st.seed, st.map === 'r10' ? 10 : 16, 18, 12); csp = E.mapCSP(map.names.slice(), map.edges, colours); }
        const r = E.backtrack(csp, { varOrd: st.varOrd, valOrd: st.valOrd, inf: st.inf, maxFrames: 3000 }); player.set(r.frames);
        const rows = []; [['static', 'none'], ['static', 'fc'], ['mrv', 'fc'], ['mrvdeg', 'fc'], ['mrvdeg', 'mac']].forEach(([vo, inf]) => { const x = E.backtrack(csp, { varOrd: vo, inf, maxFrames: 1 }); rows.push(`<tr class="${vo === st.varOrd && inf === st.inf ? 'hl' : ''}"><td>${{ static: 'Fixed order', mrv: 'MRV', mrvdeg: 'MRV + degree' }[vo]}, ${{ none: 'no inference', fc: 'forward checking', mac: 'MAC' }[inf]}</td><td class="r">${x.assigns}</td><td class="r">${x.backtracks}</td><td>${x.ok ? 'solved' : 'no solution'}</td></tr>`); });
        cmp.innerHTML = AI.table(['Strategy', 'r:Assignments', 'r:Backtracks', 'Result'], rows, 'compact') + (r.truncated ? '<p class="tip">The step-through stops after 3,000 steps; the counts above are for the full search.</p>' : '');
      }
      build(true);
    }
  });

  AI.lab({
    id: 'sudoku-ac3', ch: 6, kind: 'demo', title: 'Sudoku with AC-3',
    blurb: 'Watch arc consistency remove candidates from a Sudoku, then let backtracking with MRV and MAC finish the job.',
    tags: ['AC-3', 'arc consistency', 'all-different', 'MRV', 'MAC'],
    how: [['Sudoku as a CSP', '<p>81 variables, domains 1 to 9, and an all-different constraint on every row, column and box, written here as binary ≠ constraints between cells that share a unit. Small digits are the values still in a cell’s domain.</p>'],
      ['What to try', '<ul><li>On the easy and medium puzzles, AC-3 alone solves everything: each domain shrinks to one value.</li><li>On the hard puzzles AC-3 gets stuck, and search has to guess. Count the backtracks.</li></ul>'],
      ['About these puzzles', '<p>The four puzzles were generated for AI Lab and checked to have exactly one solution.</p>']],
    mount(root, ctx) {
      const PUZ = [['Easy (40 clues)', '008206007000040863703508240009750100630001000471069008200083090906070302057902000'], ['Medium (32 clues)', '003816005070043080000520400000000076054700039600080214100609050300000007000400001'], ['Hard (27 clues)', '000000000750096000009004010304907000000000270020500800000009000006008431470030085'], ['Very hard (25 clues)', '003000040000206009500310600308000400059060002020000000012000570400007060000000900']];
      const st = { p: 0, mode: 'ac3' };
      const L = AI.layout(root, { cls: 'even' }); L.stage.classList.add('plain');
      const box = AI.el('<div style="position:relative;width:min(100%,480px);aspect-ratio:1;margin:14px auto"></div>'); L.stage.appendChild(box);
      let frame = null, given = '';
      const sv = AI.svgHost(box, ctx, (w) => {
        const f = frame || {}; const cs = w / 9; let s = '';
        for (let i = 0; i < 81; i++) {
          const x = (i % 9) * cs, y = ((i / 9) | 0) * cs, D = f.D ? f.D[i] : [1, 2, 3, 4, 5, 6, 7, 8, 9], v = f.A && f.A[i] !== undefined ? f.A[i] : D.length === 1 ? D[0] : null, isGiven = given[i] !== '0', arc = f.arc && (f.arc[0] === i || f.arc[1] === i), changed = f.changed === i || (f.shrunk && f.shrunk.includes(i)) || f.cur === i;
          s += `<rect x="${x}" y="${y}" width="${cs}" height="${cs}" fill="${changed ? 'color-mix(in srgb,var(--accent) 28%,var(--bg))' : arc ? 'var(--bg3)' : 'var(--bg)'}" stroke="var(--line2)" stroke-width="1"/>`;
          if (v) s += `<text x="${x + cs / 2}" y="${y + cs * 0.68}" text-anchor="middle" class="svg-b" style="font-size:${cs * 0.55}px" fill="${isGiven ? 'var(--ink)' : 'var(--v-path)'}">${v}</text>`;
          else if (D.length === 0) s += `<text x="${x + cs / 2}" y="${y + cs * 0.65}" text-anchor="middle" class="svg-b" style="font-size:${cs * 0.4}px" fill="var(--v-bad)">∅</text>`;
          else D.forEach(d => { s += `<text x="${x + ((d - 1) % 3 + 0.5) * cs / 3}" y="${y + (((d - 1) / 3 | 0) + 0.78) * cs / 3}" text-anchor="middle" class="svg-m" style="font-size:${cs * 0.22}px" fill="var(--muted)">${d}</text>`; });
        }
        for (let k = 0; k <= 3; k++) s += `<line x1="${k * 3 * cs}" y1="0" x2="${k * 3 * cs}" y2="${w}" stroke="var(--ink)" stroke-width="3"/><line x1="0" y1="${k * 3 * cs}" x2="${w}" y2="${k * 3 * cs}" stroke="var(--ink)" stroke-width="3"/>`;
        return s;
      });
      const pc = AI.panel(L.side, 'Puzzle and method');
      AI.controls(pc, [{ t: 'select', k: 'p', label: 'Puzzle', opts: PUZ.map((p, i) => [i, p[0]]), grow: true }, { t: 'row' }, { t: 'seg', k: 'mode', opts: [['ac3', 'AC-3 only'], ['bt', 'Backtracking + MRV + MAC']] }], st, () => build());
      const pp = AI.panel(L.side, 'Pseudocode'); let pseudo;
      const pe = AI.panel(L.side, 'What just happened'); const ex = AI.el('<div class="explain"></div>'); pe.appendChild(ex);
      const ps = AI.panel(L.side, 'Counts'); const stats = AI.stats(ps, [['a', 'revisions'], ['b', 'backtracks'], ['c', 'cells decided']]);
      const player = AI.Player(L.stageCol, ctx, f => { frame = f; sv.redraw(); pseudo.hl(f.line); ex.innerHTML = f.msg; const D = f.D || {}; stats.set('c', Object.keys(D).filter(k => D[k].length === 1).length + ' / 81'); if (st.mode === 'bt') stats.set('b', f.backtracks); }, { speed: 90 });
      const AC3 = ['function AC-3(csp)', '  queue ← all arcs (Xi, Xj)', '  while queue is not empty do', '    (Xi, Xj) ← POP(queue)', '    if REVISE(Xi, Xj) then', '      if Di is empty then return false', '      for each Xk in neighbours(Xi) − Xj', '        add (Xk, Xi) to queue', '  return true'];
      const BT = ['function BACKTRACK(assignment)', '  (start: empty assignment, full domains)', '  if assignment is complete then return it', '  var ← cell with fewest values (MRV)', '  for each value in its domain', '    if value conflicts: skip', '    add {var = value} to assignment', '    run AC-3 from var’s neighbours (MAC)', '    if no domain is empty: BACKTRACK(…)', '    undo the assignment and inferences', '  return failure', '(top level: no solution exists)'];
      function build() {
        given = PUZ[st.p][1]; const csp = E.sudoku(given);
        pp.querySelector('.pseudo') && pp.querySelector('.pseudo').remove();
        if (st.mode === 'ac3') { pseudo = AI.pseudo(pp, AC3); const r = E.ac3Trace(csp); const map = { 1: 2, 4: 5, 6: 6, 7: 8, 9: 9 }; player.set(r.frames.map(f => Object.assign({}, f, { line: map[f.line] || f.line }))); stats.set('a', r.revisions); stats.set('b', '–'); }
        else { pseudo = AI.pseudo(pp, BT); const r = E.backtrack(csp, { varOrd: 'mrv', inf: 'mac', maxFrames: 4000 }); player.set(r.frames); stats.set('a', '–'); }
      }
      build();
    }
  });

  AI.lab({
    id: 'color-map', ch: 6, kind: 'game', title: 'Colour the map',
    blurb: 'Colour every region so that no two neighbours match. Use forward checking and the MRV hint like a CSP solver would.',
    tags: ['map colouring', 'forward checking', 'MRV', 'four colour theorem'],
    how: [['How to play', '<ul><li>Click a region to cycle its colour (click until blank to clear). Red borders mark neighbours with the same colour.</li><li>“Show remaining colours” displays each blank region’s domain after forward checking. “MRV hint” rings the region with the fewest legal colours.</li><li>Win by colouring every region with no conflicts. Fewer clicks is better.</li></ul>'],
      ['Three or four colours?', '<p>Any flat map can be coloured with four colours (the four colour theorem). With three, a solution may not exist; this game only gives you three-colour maps that the solver has checked are solvable.</p>']],
    mount(root, ctx) {
      const st = { n: 12, k: 4, fc: true, hint: false };
      const L = AI.layout(root);
      const box = AI.el('<div style="position:relative;aspect-ratio:1.5;min-height:280px;cursor:pointer"></div>'); L.stage.appendChild(box);
      const banner = AI.banner(L.stage);
      let map, csp, A = {}, clicks = 0, won = false;
      const colours = () => ['red', 'green', 'blue', 'yellow'].slice(0, st.k);
      const legal = n => colours().filter(c => csp.nb[n].every(m => A[m] !== c));
      const sv = AI.svgHost(box, ctx, (w, h) => { if (!map) return ''; const doms = {}; map.names.forEach(n => doms[n] = legal(n)); let hot = null; if (st.hint) { const un = map.names.filter(n => !A[n]); hot = un.sort((a, b) => doms[a].length - doms[b].length || csp.nb[b].length - csp.nb[a].length)[0] || null; } return drawRegions(map, w, h, n => A[n], { domains: st.fc ? doms : null, hot, conflict: (a, b) => A[a] && A[a] === A[b] }); });
      const pc = AI.panel(L.side, 'Map');
      AI.controls(pc, [{ t: 'select', k: 'n', label: 'Regions', opts: [[8, '8'], [12, '12'], [18, '18'], [24, '24']] }, { t: 'select', k: 'k', label: 'Colours', opts: [[3, '3'], [4, '4']] }, { t: 'row' }, { t: 'check', k: 'fc', label: 'Show remaining colours' }, { t: 'check', k: 'hint', label: 'MRV hint' }, { t: 'row' }, { t: 'btn', label: 'New map', icon: 'dice', cls: 'primary', on: () => fresh() }, { t: 'btn', label: 'Clear', icon: 'reset', on: () => { A = {}; won = false; clicks = 0; update(); } }], st, k => { if (k === 'n' || k === 'k') fresh(); else sv.redraw(); });
      const ps = AI.panel(L.side, 'Progress'); const stats = AI.stats(ps, [['col', 'coloured'], ['bad', 'conflicts'], ['clicks', 'clicks'], ['solver', 'solver assignments']]);
      const pt = AI.panel(L.side, 'Tip'); pt.insertAdjacentHTML('beforeend', '<p class="tip" style="margin:0">Start with the region that touches the most others, then colour any region that has only one colour left. That is the degree heuristic followed by MRV.</p>');
      function fresh() {
        for (let tries = 0; tries < 40; tries++) { map = regionMap((Math.random() * 1e9) | 0, st.n, 18, 12); csp = E.mapCSP(map.names, map.edges, colours()); const r = E.backtrack(csp, { varOrd: 'mrvdeg', inf: 'fc', maxFrames: 1 }); if (r.ok) { stats.set('solver', r.assigns); break; } }
        A = {}; clicks = 0; won = false; update();
      }
      function update() { const bad = map.edges.filter(([a, b]) => A[a] && A[a] === A[b]).length; const n = Object.keys(A).length; stats.set('col', `${n} / ${map.names.length}`); stats.set('bad', bad, bad ? 'bad' : ''); stats.set('clicks', clicks); sv.redraw(); if (!won && n === map.names.length && !bad) { won = true; const better = AI.progress.best(`colormap-${st.n}-${st.k}`, clicks, false); banner(`Coloured with ${clicks} clicks${better ? '<small>New best for this size</small>' : ''}`, 2600); } }
      ctx.on(box, 'click', e => { const t = e.target.closest('.reg'); if (!t || won) return; const n = t.dataset.r; const cs = colours(); const cur = A[n]; const next = cur ? cs[cs.indexOf(cur) + 1] : cs[0]; if (next) A[n] = next; else delete A[n]; clicks++; update(); });
      fresh();
    }
  });
})(window);
