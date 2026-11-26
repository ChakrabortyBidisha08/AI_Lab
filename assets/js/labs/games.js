/* Chapter 5 labs: game trees (minimax, alpha-beta, expectiminimax), Prune it, tic-tac-toe, Connect Four. */
(function (G) {
  'use strict';
  const AI = G.AI, E = G.AIE, esc = AI.esc;
  const fv = v => v === Infinity ? '+∞' : v === -Infinity ? '−∞' : v == null ? '' : Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0$/, '');

  // layout: leaves spread evenly, parents centred over children
  function layoutTree(root, W, H) {
    const pos = {}; const depth = E.tree.depth(root); const leaves = E.tree.leaves(root); const lw = (W - 40) / Math.max(1, leaves.length);
    let k = 0; const dy = (H - 70) / Math.max(1, depth);
    const rec = (n, d) => { if (n.type === 'leaf') { pos[n.id] = [20 + lw * (k++ + 0.5), 30 + d * dy]; return; } n.kids.forEach(c => rec(c, d + 1)); const xs = n.kids.map(c => pos[c.id][0]); pos[n.id] = [(Math.min(...xs) + Math.max(...xs)) / 2, 30 + d * dy]; };
    rec(root, 0); return { pos, lw };
  }
  function drawTree(root, W, H, f, opts) {
    opts = opts || {}; const { pos, lw } = layoutTree(root, W, H); const r = Math.max(10, Math.min(20, lw * 0.34));
    const pr = new Set((f && f.pruned) || []), vis = new Set((f && f.visited) || []); const marks = opts.marks || {};
    let s = '';
    const bestEdges = new Set(); if (f && f.done && f.best) { let n = root; while (n && f.best[n.id] != null) { bestEdges.add(n.id + '>' + f.best[n.id]); n = n.kids.find(k => k.id === f.best[n.id]); } }
    E.tree.all(root).forEach(n => n.kids.forEach((c, i) => { const [x1, y1] = pos[n.id], [x2, y2] = pos[c.id]; const pruned = pr.has(c.id), best = bestEdges.has(n.id + '>' + c.id); s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${best ? 'var(--v-path)' : pruned ? 'var(--line2)' : 'var(--v-edge)'}" stroke-width="${best ? 5 : 1.8}" ${pruned ? 'stroke-dasharray="4 4"' : ''}/>`; if (n.type === 'chance') s += `<text x="${(x1 + x2) / 2 + (i ? 8 : -8)}" y="${(y1 + y2) / 2}" text-anchor="${i ? 'start' : 'end'}" class="svg-s halo">${n.p[i]}</text>`; }));
    E.tree.all(root).forEach(n => {
      const [x, y] = pos[n.id]; const cur = f && f.cur === n.id, pruned = pr.has(n.id); const val = f && f.vals ? f.vals[n.id] : undefined; const col = n.type === 'max' ? 'var(--v-max)' : n.type === 'min' ? 'var(--v-min)' : n.type === 'chance' ? 'var(--v-chance)' : 'var(--ink2)';
      const fill = cur ? 'var(--v-current)' : pruned ? 'var(--bg2)' : 'var(--v-node)';
      if (n.type === 'max') s += `<path d="M${x} ${y - r}L${x + r * 1.05} ${y + r * 0.75}H${x - r * 1.05}Z" fill="${fill}" stroke="${col}" stroke-width="2.5"/>`;
      else if (n.type === 'min') s += `<path d="M${x} ${y + r}L${x + r * 1.05} ${y - r * 0.75}H${x - r * 1.05}Z" fill="${fill}" stroke="${col}" stroke-width="2.5"/>`;
      else if (n.type === 'chance') s += `<circle cx="${x}" cy="${y}" r="${r * 0.85}" fill="${fill}" stroke="${col}" stroke-width="2.5"/>`;
      else { const m = marks[n.id]; const stroke = m === 'right' ? 'var(--ok)' : m === 'wrong' ? 'var(--bad)' : m === 'missed' ? 'var(--accent)' : m === 'sel' ? 'var(--ink)' : pruned ? 'var(--line2)' : vis.has(n.id) ? 'var(--ink2)' : 'var(--line2)'; s += `<g class="leaf" data-id="${n.id}" style="${opts.clickLeaves ? 'cursor:pointer' : ''}"><rect x="${x - r * 0.9}" y="${y - r * 0.8}" width="${r * 1.8}" height="${r * 1.6}" rx="4" fill="${m === 'sel' ? 'var(--bg3)' : cur ? 'var(--v-current)' : pruned ? 'var(--bg2)' : 'var(--v-node)'}" stroke="${stroke}" stroke-width="${m ? 3 : 1.5}" ${pruned && !m ? 'stroke-dasharray="3 3"' : ''}/><text x="${x}" y="${y + 5}" text-anchor="middle" class="svg-b" style="font-size:${Math.max(11, r * 0.8)}px" fill="${pruned && !opts.reveal ? 'var(--muted)' : 'var(--ink)'}">${n.v}</text></g>`; }
      if (n.type !== 'leaf') {
        s += `<text x="${x}" y="${y + (n.type === 'min' ? -r * 0.05 : r * 0.42)}" text-anchor="middle" class="svg-b" style="font-size:${Math.max(10, r * 0.62)}px" fill="${cur ? '#fff' : 'var(--ink)'}">${val !== undefined && isFinite(val) ? fv(val) : ''}</text>`;
        if (n.label && r > 12) s += `<text x="${x - r * 1.25}" y="${y + 4}" text-anchor="end" class="svg-s halo">${esc(n.label)}</text>`;
        const ab = f && f.ab && f.ab[n.id]; if (ab) s += `<text x="${x + r * 1.25}" y="${y + 4}" class="svg-m halo" style="font-size:11px">α ${fv(ab[0])} β ${fv(ab[1])}</text>`;
      }
    });
    return s;
  }
  E.drawTree = drawTree;
  const PSEUDO = ['ALPHA-BETA-SEARCH(state): start at the root', '  if TERMINAL(s): return UTILITY(s)', 'MAX-VALUE(s, α, β): v ← −∞', '  for each a: v ← max(v, MIN-VALUE(a))', '    α ← max(α, v); if v ≥ β: return v', 'MIN-VALUE(s, α, β): v ← +∞', '  for each a: v ← min(v, MAX-VALUE(a))', '    β ← min(β, v); if v ≤ α: return v', 'CHANCE-VALUE(s): v ← 0', '  each outcome r: v ← v + P(r) · VALUE(r)', '  return v', 'return the best action at the root'];

  AI.lab({
    id: 'game-tree', ch: 5, kind: 'demo', title: 'Minimax and alpha–beta pruning',
    blurb: 'Step through minimax, alpha–beta and expectiminimax on the book’s two-ply tree or on random trees, with α and β shown at every node.',
    tags: ['minimax', 'alpha–beta', 'move ordering', 'expectiminimax', 'chance nodes'],
    how: [['Reading the tree', '<p>▲ is a MAX node, ▼ is a MIN node, ● is a chance node, and squares are terminal states with their utility for MAX. Values appear inside nodes as they are computed. Dashed parts were pruned: alpha–beta never looked at them.</p>'],
      ['The book’s tree', '<p>MAX at A chooses between B, C and D. B’s leaves are 3, 12, 8; C’s are 2, 4, 6; D’s are 14, 5, 2. The minimax value is 3. Alpha–beta skips C’s second and third leaves: once C can be forced down to 2, MAX already has 3 from B.</p>'],
      ['What to try', '<ul><li>Generate a random tree and compare leaves examined with and without pruning.</li><li>Change move ordering to “best first”: alpha–beta prunes much more. With perfect ordering it needs about O(b^(m/2)) nodes instead of O(b^m).</li><li>Add chance nodes: alpha–beta no longer applies directly, and values become averages.</li></ul>']],
    mount(root, ctx) {
      const st = { tree: 'book', algo: 'ab', order: 'none', seed: 7 };
      const L = AI.layout(root);
      const box = AI.el('<div style="position:relative;aspect-ratio:1.8;min-height:300px"></div>'); L.stage.appendChild(box);
      let tree = E.tree.book(), frame = null;
      const sv = AI.svgHost(box, ctx, (W, H) => drawTree(tree, W, H, frame));
      AI.legend(L.stageCol, [['var(--v-max)', 'MAX ▲'], ['var(--v-min)', 'MIN ▼'], ['var(--v-chance)', 'Chance ●'], ['var(--v-current)', 'Current'], ['var(--v-path)', 'Best move']]);
      const pc = AI.panel(L.side, 'Tree and algorithm');
      const refs = AI.controls(pc, [{ t: 'select', k: 'tree', label: 'Tree', opts: [['book', 'The book’s two-ply tree'], ['r2', 'Random, depth 2'], ['r3', 'Random, depth 3'], ['r4', 'Random binary, depth 4'], ['chance', 'With chance nodes']], str: true, grow: true }, { t: 'row' }, { t: 'seg', k: 'algo', opts: [['mm', 'Minimax'], ['ab', 'Alpha–beta']] }, { t: 'select', k: 'order', label: 'Move ordering', opts: [['none', 'As generated'], ['best', 'Best first'], ['worst', 'Worst first']], str: true }, { t: 'row' }, { t: 'btn', label: 'New random tree', icon: 'dice', on: () => { st.seed = (Math.random() * 1e6) | 0; if (st.tree === 'book') { st.tree = 'r3'; refs.tree.value = 'r3'; } build(); } }], st, () => build());
      const pp = AI.panel(L.side, 'Pseudocode'); const pseudo = AI.pseudo(pp, PSEUDO);
      const pe = AI.panel(L.side, 'What just happened'); const ex = AI.el('<div class="explain"></div>'); pe.appendChild(ex);
      const player = AI.Player(L.stageCol, ctx, f => { frame = f; sv.redraw(); pseudo.hl(f.line); ex.innerHTML = f.msg; stats.set('leaves', f.leavesSeen + ' / ' + E.tree.leaves(tree).length); stats.set('pruned', f.pruned.filter(id => E.tree.leaves(tree).some(l => l.id === id)).length); stats.set('root', f.done ? fv(f.value) : '…'); });
      const ps = AI.panel(L.below, 'Counts'); const stats = AI.stats(ps, [['leaves', 'leaves examined'], ['pruned', 'leaves pruned'], ['root', 'root value']]);
      const pcmp = AI.panel(L.below, 'Same tree, three ways'); const cmp = AI.el('<div></div>'); pcmp.appendChild(cmp);
      function build() {
        refs.order.disabled = st.algo !== 'ab'; if (st.tree === 'chance') { st.algo = 'mm'; refs.algo.set('mm'); }
        tree = st.tree === 'book' ? E.tree.book() : st.tree === 'r2' ? E.tree.random(st.seed, 2, 3, 3, 1, 20) : st.tree === 'r3' ? E.tree.random(st.seed, 3, 2, 3, 1, 20) : st.tree === 'r4' ? E.tree.random(st.seed, 4, 2, 2, 1, 20) : E.tree.random(st.seed, 3, 2, 2, 0, 10, ['max', 'chance', 'min']);
        const r = E.searchTree(tree, st.algo, st.algo === 'ab' && st.order !== 'none' ? st.order : null); player.set(r.frames);
        if (st.tree === 'chance') cmp.innerHTML = '<p class="small muted" style="margin:0">With chance nodes the value is an expectation. Alpha–beta needs bounds on the utilities before it can prune below chance nodes, so this demo runs expectiminimax in full.</p>';
        else { const L2 = E.tree.leaves(tree).length; const rows = [['Minimax', E.searchTree(tree, 'mm')], ['Alpha–beta, as generated', E.searchTree(tree, 'ab')], ['Alpha–beta, best first', E.searchTree(tree, 'ab', 'best')], ['Alpha–beta, worst first', E.searchTree(tree, 'ab', 'worst')]]; cmp.innerHTML = AI.table(['Method', 'r:Leaves examined', 'r:Value'], rows.map(([n, x]) => `<tr><td>${n}</td><td class="r">${x.leavesSeen} / ${L2}</td><td class="r">${fv(x.value)}</td></tr>`), 'compact') + '<p class="tip" style="margin-top:6px">Pruning never changes the root value, only the work done.</p>'; }
      }
      build();
    }
  });

  AI.lab({
    id: 'prune-it', ch: 5, kind: 'game', title: 'Prune it',
    blurb: 'Mark every leaf that alpha–beta would never look at, and give the root’s minimax value. Then check against the algorithm.',
    tags: ['alpha–beta', 'minimax value', 'exam practice'],
    how: [['How to play', '<ul><li>Alpha–beta explores children from left to right.</li><li>Click the leaves it would never evaluate (click again to unmark), type the root value, then press Check.</li><li>Green: correctly marked. Red: marked but actually evaluated. Orange: pruned but you missed it.</li></ul>'], ['Exam tip', '<p>Track α (best for MAX so far on the path) and β (best for MIN so far). A MIN node stops as soon as its value falls to α or below; a MAX node stops when its value reaches β or above.</p>']],
    mount(root, ctx) {
      const st = { level: 3 };
      const L = AI.layout(root);
      const box = AI.el('<div style="position:relative;aspect-ratio:1.9;min-height:280px"></div>'); L.stage.appendChild(box);
      const banner = AI.banner(L.stage);
      let tree, marks = {}, revealed = null, result;
      const sv = AI.svgHost(box, ctx, (W, H) => tree ? drawTree(tree, W, H, revealed ? Object.assign({}, result.frames[result.frames.length - 1]) : { vals: {} }, { marks, clickLeaves: !revealed, reveal: !!revealed }) : '');
      const pc = AI.panel(L.side, 'Round');
      AI.controls(pc, [{ t: 'select', k: 'level', label: 'Difficulty', opts: [[2, 'Warm-up: depth 2'], [3, 'Exam: depth 3'], [4, 'Hard: binary depth 4']], grow: true }, { t: 'row' }, { t: 'btn', label: 'New tree', icon: 'dice', on: () => fresh() }], st, () => fresh());
      const ans = AI.el('<label class="field" style="margin-top:12px"><span>Root minimax value</span><input type="text" inputmode="numeric" placeholder="e.g. 7"></label>'); pc.appendChild(ans); const inp = ans.querySelector('input');
      const chk = AI.el('<button type="button" class="btn primary" style="margin-top:10px">Check</button>'); pc.appendChild(chk);
      const ps = AI.panel(L.side, 'Score'); const stats = AI.stats(ps, [['acc', 'leaves right'], ['val', 'root value'], ['streak', 'perfect rounds']]);
      const pe = AI.panel(L.side, 'Explanation'); const ex = AI.el('<div class="explain small">Mark the leaves, then check.</div>'); pe.appendChild(ex);
      let streak = AI.store.get('prune-streak', 0);
      function fresh() { const seed = (Math.random() * 1e9) | 0; tree = st.level === 2 ? E.tree.random(seed, 2, 3, 3, 1, 15) : st.level === 3 ? E.tree.random(seed, 3, 2, 3, 1, 15) : E.tree.random(seed, 4, 2, 2, 1, 15); result = E.searchTree(tree, 'ab'); marks = {}; revealed = null; inp.value = ''; inp.disabled = false; chk.textContent = 'Check'; ex.innerHTML = 'Mark the leaves, then check.'; stats.set('acc', '–'); stats.set('val', '–'); stats.set('streak', streak); sv.redraw(); }
      ctx.on(box, 'click', e => { if (revealed) return; const g = e.target.closest('.leaf'); if (!g) return; const id = +g.dataset.id; if (marks[id]) delete marks[id]; else marks[id] = 'sel'; sv.redraw(); });
      chk.addEventListener('click', () => {
        if (revealed) { fresh(); return; }
        const pruned = new Set(result.pruned); const leaves = E.tree.leaves(tree); let right = 0; const nm = {};
        leaves.forEach(l => { const sel = !!marks[l.id], pr = pruned.has(l.id); if (sel && pr) { nm[l.id] = 'right'; right++; } else if (sel && !pr) nm[l.id] = 'wrong'; else if (!sel && pr) nm[l.id] = 'missed'; else right++; });
        marks = nm; revealed = true; const v = parseFloat(String(inp.value).replace('−', '-')); const vOk = v === result.value;
        stats.set('acc', `${right} / ${leaves.length}`, right === leaves.length ? 'good' : 'bad'); stats.set('val', vOk ? 'right' : `was ${result.value}`, vOk ? 'good' : 'bad');
        const perfect = right === leaves.length && vOk; streak = perfect ? streak + 1 : 0; AI.store.set('prune-streak', streak); stats.set('streak', streak);
        ex.innerHTML = `Alpha–beta examined ${result.leavesSeen} of ${leaves.length} leaves; the root value is <b>${result.value}</b>. ${result.frames.filter(f => f.cut != null).map(f => f.msg.replace(/<[^>]+>/g, '')).slice(0, 3).map(m => '<br>• ' + esc(m)).join('')}`;
        banner(perfect ? 'Perfect round' : `${right} of ${leaves.length} leaves right`, 1600); inp.disabled = true; chk.textContent = 'Next tree'; sv.redraw();
      });
      fresh();
    }
  });

  /* ---------- tic-tac-toe ---------- */
  AI.lab({
    id: 'tictactoe', ch: 5, kind: 'game', title: 'Tic-tac-toe against minimax',
    blurb: 'Play a perfect minimax opponent or a Monte Carlo tree search player, with the value of every move shown if you want it.',
    tags: ['minimax', 'alpha–beta', 'Monte Carlo tree search', 'UCB1'],
    how: [['What the numbers mean', '<p>With “Show move values” on, each empty square shows its minimax value for the player to move: +1 means that move wins with best play, 0 draws, −1 loses. Against the minimax player, the best you can do is a draw.</p>'],
      ['Search effort', '<p>Before each of its moves the minimax player reports how many positions plain minimax and alpha–beta visit from that position. From the empty board, the full game tree has 549,946 nodes; alpha–beta with this move order visits 18,297.</p>'],
      ['Monte Carlo tree search', '<p>The MCTS player runs random playouts and uses UCB1 to balance trying promising moves against exploring others. After its move it shows how many playouts went through each square and the win rate. With few playouts it makes mistakes you can exploit.</p>']],
    mount(root, ctx) {
      const T = E.ttt; const st = { ai: 'minimax', you: 'X', iters: 1000, vals: false };
      const L = AI.layout(root, { cls: 'even' }); L.stage.classList.add('plain');
      const board = AI.el('<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:min(100%,400px);margin:20px auto;aspect-ratio:1"></div>'); L.stage.appendChild(board);
      const msg = AI.el('<p class="lede" style="text-align:center;margin:0 0 18px;font-weight:600"></p>'); L.stage.appendChild(msg);
      const cells = AI.range(9).map(i => { const c = AI.el(`<button type="button" aria-label="Square ${i + 1}" style="position:relative;border:0;border-radius:14px;background:var(--bg2);cursor:pointer;font-family:var(--display);font-weight:900;font-size:clamp(40px,9vw,68px);display:grid;place-items:center"></button>`); board.appendChild(c); c.addEventListener('click', () => human(i)); return c; });
      const pc = AI.panel(L.side, 'Game');
      AI.controls(pc, [{ t: 'select', k: 'ai', label: 'Opponent', opts: [['minimax', 'Perfect minimax'], ['mcts', 'Monte Carlo tree search'], ['random', 'Random moves']], str: true }, { t: 'seg', k: 'you', label: 'You play', opts: [['X', 'X (first)'], ['O', 'O (second)']] }, { t: 'row' }, { t: 'range', k: 'iters', label: 'MCTS playouts per move', min: 50, max: 5000, step: 50 }, { t: 'row' }, { t: 'check', k: 'vals', label: 'Show move values' }, { t: 'row' }, { t: 'btn', label: 'New game', icon: 'reset', cls: 'primary', on: () => reset() }], st, k => { if (k === 'you' || k === 'ai') reset(); else draw(); });
      const ps = AI.panel(L.side, 'Your record'); const rec = AI.stats(ps, [['w', 'wins'], ['d', 'draws'], ['l', 'losses']]);
      const pt = AI.panel(L.side, 'What the computer thought'); const thought = AI.el('<div class="explain small">It will report here after its first move.</div>'); pt.appendChild(thought);
      let b, over, mcStats = null;
      const tally = () => { const r = AI.store.get('ttt-' + st.ai, { w: 0, d: 0, l: 0 }); rec.set('w', r.w); rec.set('d', r.d); rec.set('l', r.l); return r; };
      function reset() { b = Array(9).fill(null); over = false; mcStats = null; thought.innerHTML = 'It will report here after its first move.'; draw(); if (st.you === 'O') ctx.after(350, aiMove); }
      function draw() {
        const win = T.winLine(b), vals = st.vals && !over ? new Map(T.moveValues(b).map(([i, v]) => [i, T.toMove(b) === 'X' ? v : -v])) : null;
        cells.forEach((c, i) => { const v = b[i]; c.innerHTML = v ? `<span style="color:${v === 'X' ? 'var(--v-max)' : 'var(--v-min)'}">${v}</span>` : ''; c.style.background = win && win.includes(i) ? 'color-mix(in srgb,var(--v-goal) 30%,var(--bg2))' : 'var(--bg2)';
          if (!v && vals && vals.has(i)) { const x = vals.get(i); c.innerHTML = `<span style="font-size:22px;color:${x > 0 ? 'var(--ok)' : x < 0 ? 'var(--bad)' : 'var(--muted)'}">${x > 0 ? '+1' : x < 0 ? '−1' : '0'}</span>`; }
          if (!v && mcStats && !over) { const m = mcStats.find(s => s.mv === i); if (m) c.insertAdjacentHTML('beforeend', `<span style="position:absolute;bottom:6px;left:0;right:0;font:500 11.5px var(--text);color:var(--muted)">${m.n} playouts</span>`); } });
        const w = T.winner(b); msg.textContent = w === 'draw' ? 'Draw.' : w ? (w === st.you ? 'You win!' : 'The computer wins.') : T.toMove(b) === st.you ? `Your move (${st.you}).` : 'Thinking…';
        tally();
      }
      function end() { const w = T.winner(b); if (!w || over) return; over = true; const r = tally(); if (w === 'draw') r.d++; else if (w === st.you) r.w++; else r.l++; AI.store.set('ttt-' + st.ai, r); draw(); }
      function human(i) { if (over || b[i] || T.toMove(b) !== st.you) return; b[i] = st.you; mcStats = null; draw(); end(); if (!over) ctx.after(320, aiMove); }
      function aiMove() {
        if (over) return; const me = T.toMove(b); let mv;
        if (st.ai === 'random') { const free = b.map((c, i) => c ? -1 : i).filter(i => i >= 0); mv = AI.pick(free); thought.innerHTML = 'The random player picks any empty square. It does not search at all.'; }
        else if (st.ai === 'minimax') {
          const vals = T.moveValues(b).map(([i, v]) => [i, me === 'X' ? v : -v]); const best = Math.max(...vals.map(v => v[1])); const opts = vals.filter(v => v[1] === best); mv = opts[0][0];
          const n1 = T.count(b.slice(), false), n2 = T.count(b.slice(), true);
          thought.innerHTML = `Best value for ${me}: <b>${best > 0 ? 'win (+1)' : best < 0 ? 'loss (−1)' : 'draw (0)'}</b>. ${opts.length > 1 ? `${opts.length} moves share it; it takes the first.` : ''}<br>Plain minimax visits <b>${n1.toLocaleString()}</b> positions from here; alpha–beta visits <b>${n2.toLocaleString()}</b>.`;
        } else {
          const r = T.mcts(b.slice(), st.iters, Math.random); mcStats = r.stats; mv = r.stats[0].mv;
          thought.innerHTML = `${st.iters.toLocaleString()} playouts. It picks the most visited square.` + AI.table(['Square', 'r:Playouts', 'r:Win rate'], r.stats.slice(0, 5).map(s => `<tr><td>${['top-left', 'top', 'top-right', 'left', 'centre', 'right', 'bottom-left', 'bottom', 'bottom-right'][s.mv]}</td><td class="r">${s.n}</td><td class="r">${(s.rate * 100).toFixed(0)}%</td></tr>`), 'compact');
        }
        b[mv] = me; draw(); end();
      }
      reset();
    }
  });

  /* ---------- Connect Four ---------- */
  AI.lab({
    id: 'connect4', ch: 5, kind: 'game', title: 'Connect Four against alpha–beta',
    blurb: 'Drop discs against a depth-limited alpha–beta player with a heuristic evaluation function. Raise its depth and feel it get stronger.',
    tags: ['depth-limited search', 'evaluation function', 'alpha–beta', 'move ordering'],
    how: [['The computer’s evaluation', '<p>The full game is too big to search to the end, so the computer cuts off at a fixed depth and scores positions with a heuristic. For every line of four cells it adds points for its own discs when the opponent has none there (1 for one disc, 10 for two, 50 for three), subtracts the same for yours, and prefers the centre column. Wins are scored far above anything else, and sooner wins higher.</p>'],
      ['What to try', '<ul><li>At depth 2 the computer misses simple traps. At depth 6 it rarely does.</li><li>Look at the scores it gives each column after its move: these are backed-up evaluations, not certainties.</li><li>Moves are tried centre-first, which helps alpha–beta prune.</li></ul>']],
    mount(root, ctx) {
      const C4 = E.c4; const st = { depth: 4, first: 'you' };
      const L = AI.layout(root, { cls: 'even' }); L.stage.classList.add('plain');
      const box = AI.el('<div style="position:relative;width:min(100%,520px);margin:16px auto;aspect-ratio:7/6.4;cursor:pointer"></div>'); L.stage.appendChild(box);
      const msg = AI.el('<p class="lede" style="text-align:center;margin:0 0 16px;font-weight:600"></p>'); L.stage.appendChild(msg);
      const pc = AI.panel(L.side, 'Game');
      AI.controls(pc, [{ t: 'select', k: 'depth', label: 'Computer search depth', opts: [[2, '2 (weak)'], [4, '4'], [6, '6 (strong)'], [7, '7 (slow, strongest)']] }, { t: 'seg', k: 'first', label: 'First move', opts: [['you', 'You'], ['ai', 'Computer']] }, { t: 'row' }, { t: 'btn', label: 'New game', icon: 'reset', cls: 'primary', on: () => reset() }], st, () => reset());
      const ps = AI.panel(L.side, 'Your record at this depth'); const rec = AI.stats(ps, [['w', 'wins'], ['d', 'draws'], ['l', 'losses']]);
      const pt = AI.panel(L.side, 'What the computer thought'); const th = AI.el('<div class="explain small">It reports after each move.</div>'); pt.appendChild(th);
      let b, over, last = -1, hover = -1, winCells = null;
      const YOU = 1, AIP = 2;
      const record = () => { const r = AI.store.get('c4-' + st.depth, { w: 0, d: 0, l: 0 }); rec.set('w', r.w); rec.set('d', r.d); rec.set('l', r.l); return r; };
      function reset() { b = C4.empty(); over = false; last = -1; winCells = null; th.innerHTML = 'It reports after each move.'; draw(); if (st.first === 'ai') ctx.after(300, aiMove); }
      function draw() {
        const W = box.clientWidth, H = box.clientHeight; if (!W) return; const cs = W / 7, top = H - cs * 6;
        let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0"><rect x="0" y="${top}" width="${W}" height="${cs * 6}" rx="16" fill="var(--v-path)"/>`;
        if (hover >= 0 && !over) s += `<circle cx="${(hover + 0.5) * cs}" cy="${top / 2}" r="${cs * 0.3}" fill="var(--v-frontier)" opacity=".8"/>`;
        for (let c = 0; c < 7; c++) for (let r = 0; r < 6; r++) { const v = b[c * 6 + r], x = (c + 0.5) * cs, y = top + (5 - r + 0.5) * cs; const win = winCells && winCells.some(([wc, wr]) => wc === c && wr === r); s += `<circle cx="${x}" cy="${y}" r="${cs * 0.38}" fill="${v === YOU ? 'var(--v-frontier)' : v === AIP ? 'var(--v-bad)' : 'var(--bg)'}" stroke="${win ? 'var(--ink)' : 'rgba(0,0,0,.18)'}" stroke-width="${win ? 4 : 2}"/>`; if (c === last && r === C4.height(b, c) - 1 && v) s += `<circle cx="${x}" cy="${y}" r="${cs * 0.1}" fill="rgba(255,255,255,.8)"/>`; }
        box.innerHTML = s + '</svg>';
        const w = C4.winner(b); msg.textContent = w === YOU ? 'You win!' : w === AIP ? 'The computer wins.' : C4.full(b) ? 'Draw.' : over ? '' : 'Your move: click a column.';
        record();
      }
      function finish() { const w = C4.winner(b); if (!w && !C4.full(b)) return false; over = true; const r = record(); if (w === YOU) r.w++; else if (w === AIP) r.l++; else r.d++; AI.store.set('c4-' + st.depth, r); if (w) { for (let c = 0; c < 7; c++) for (let rr = 0; rr < 6; rr++) if (b[c * 6 + rr] === w && C4.winAt(b, c, rr)) { for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [1, -1]]) { const cells = [[c, rr]]; let cc = c + dc, r2 = rr + dr; while (cc >= 0 && cc < 7 && r2 >= 0 && r2 < 6 && b[cc * 6 + r2] === w) { cells.push([cc, r2]); cc += dc; r2 += dr; } if (cells.length >= 4) winCells = cells; } } } draw(); return true; }
      function aiMove() {
        if (over) return; msg.textContent = 'Thinking…';
        ctx.after(30, () => { const t0 = performance.now(); const r = C4.search(b, AIP, st.depth); const ms = Math.round(performance.now() - t0); C4.play(b, r.move, AIP); last = r.move;
          const sc = v => Math.abs(v) >= 100000 ? (v > 0 ? 'forced win' : 'forced loss') : String(v);
          th.innerHTML = `Searched ${r.nodes.toLocaleString()} positions in ${ms} ms and chose column <b>${r.move + 1}</b>.` + AI.table(['Column', 'r:Backed-up score'], Object.keys(r.scores).sort((a, b) => a - b).map(c => `<tr class="${+c === r.move ? 'hl' : ''}"><td>${+c + 1}</td><td class="r">${sc(r.scores[c])}</td></tr>`), 'compact');
          if (!finish()) draw(); });
      }
      ctx.on(box, 'mousemove', e => { const r = box.getBoundingClientRect(); const c = Math.floor((e.clientX - r.left) / r.width * 7); if (c !== hover) { hover = c; draw(); } });
      ctx.on(box, 'mouseleave', () => { hover = -1; draw(); });
      ctx.on(box, 'click', e => { if (over) return; const r = box.getBoundingClientRect(); const c = Math.floor((e.clientX - r.left) / r.width * 7); if (c < 0 || c > 6 || C4.height(b, c) >= 6) return; if (msg.textContent === 'Thinking…') return; C4.play(b, c, YOU); last = c; draw(); if (!finish()) aiMove(); });
      ctx.resize(box, draw); ctx.theme(draw); reset();
    }
  });
})(window);
