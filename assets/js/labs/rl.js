/* Chapter 22 labs: passive RL on the 4×3 world, Q-learning versus SARSA on the cliff,
   learning Nim by self-play, and two co-evolving Q-learners in the Siege arena. */
(function (G) {
  'use strict';
  const AI = G.AI, E = G.AIE, esc = AI.esc;

  /* =====================================================================
     Passive reinforcement learning: direct estimation, ADP, TD
     ===================================================================== */
  const SHOW = ['1,1', '1,3', '2,1', '3,3'], SCOL = ['var(--accent)', 'var(--v-path)', 'var(--v-chance)', 'var(--v-goal)'];
  AI.lab({
    id: 'passive-rl', ch: 22, kind: 'demo', title: 'Passive learning: direct estimation, ADP and TD',
    blurb: 'An agent follows a fixed policy in the 4×3 world without knowing the transition model, and learns the utility of each state from experience. Compare three learners on the same trials.',
    tags: ['passive reinforcement learning', 'direct utility estimation', 'adaptive dynamic programming', 'temporal-difference learning'],
    how: [['The task', '<p>The policy is fixed: the optimal one for the 4×3 world with r = −0.04. The agent does not know that moves slip sideways 20% of the time; it only sees the states it passes through and the rewards it receives. Its goal is to learn U<sup>π</sup>(s).</p>'],
      ['Three learners', '<ul><li><b>Direct utility estimation</b> averages the observed reward-to-go from each visit. It ignores the fact that utilities of neighbouring states are linked.</li><li><b>Adaptive dynamic programming</b> learns the transition model from counts and solves the Bellman equations for the fixed policy.</li><li><b>Temporal-difference learning</b> nudges U(s) towards R(s) + γU(s′) after every transition, with learning rate α(n) = 60/(59 + n) for the n-th visit, as in the book.</li></ul>'],
      ['What to look for', '<p>ADP converges fastest per trial but does the most computation per step. TD needs no model but is noisier, especially for rarely visited states such as (3,2), which the agent reaches only by slipping. Direct estimation ignores the links between states, so it uses its experience less efficiently. The lower chart measures the root-mean-square error against the true utilities of the policy, over the states the policy can reach.</p>']],
    mount(root, ctx) {
      const st = { method: 'td', trials: 100, seed: 1 };
      const m = E.gridMDP({ r: -0.04 }), Ustar = (() => { const h = E.valueIteration(m, 1e-10, 6000); return h[h.length - 1].U; })(), pi = m.policy(Ustar), Utrue = E.policyEval(m, pi, null, 5000);
      const reach = new Set(['1,1']); let grew = true; while (grew) { grew = false; [...reach].forEach(k => { if (m.isTerm(k)) return; m.T(k, pi[k]).forEach(([p, s2]) => { if (p > 0 && !reach.has(s2)) { reach.add(s2); grew = true; } }); }); }
      const Lp = AI.layout(root);
      const c1 = AI.el('<div style="padding:10px 6px 0"></div>'), c2 = AI.el('<div style="padding:0 6px 8px"></div>'); Lp.stage.append(c1, c2); Lp.stage.classList.add('plain');
      const ch1 = AI.chart(c1, ctx, { height: 240, xLabel: 'number of trials', right: 64 });
      const ch2 = AI.chart(c2, ctx, { height: 170, yMin: 0, xLabel: 'number of trials', right: 120 });
      const pc = AI.panel(Lp.side, 'Learner');
      AI.controls(pc, [{ t: 'seg', k: 'method', label: '', opts: [['direct', 'Direct'], ['adp', 'ADP'], ['td', 'TD']] }, { t: 'row' }, { t: 'range', k: 'trials', label: 'Trials', min: 10, max: 500, step: 10 }, { t: 'row' }, { t: 'btn', label: 'Another run', icon: 'dice', on: () => { st.seed++; run(); } }], st, () => run());
      const pt = AI.panel(Lp.side, 'After the last trial'); const tab = AI.el('<div></div>'); pt.appendChild(tab);
      function run() {
        const hist = E.passive(m, pi, st.method, st.trials, AI.rng(st.seed * 977)), xs = hist.length;
        ch1.set(SHOW.map((k, i) => ({ name: `(${k})`, color: SCOL[i], values: hist.map(U => U[k]) })), (X, Y) => SHOW.map((k, i) => `<line x1="${X(0)}" x2="${X(xs - 1)}" y1="${Y(Utrue[k])}" y2="${Y(Utrue[k])}" stroke="${SCOL[i]}" stroke-dasharray="2 5" stroke-opacity=".8"/>`).join(''));
        const nonT = m.states.filter(k => !m.isTerm(k)), seen = nonT.filter(k => reach.has(k)); ch2.set([{ name: 'RMS error', color: 'var(--ink)', values: hist.map(U => Math.sqrt(seen.reduce((s, k) => s + (U[k] - Utrue[k]) ** 2, 0) / seen.length)) }]);
        const last = hist[hist.length - 1]; tab.innerHTML = AI.table(['State', 'r:Learned', 'r:True'], nonT.map(k => `<tr><td>(${k})</td><td class="r">${reach.has(k) ? last[k].toFixed(3) : '<span class="muted">never visited</span>'}</td><td class="r">${Utrue[k].toFixed(3)}</td></tr>`), 'compact') + '<p class="small muted" style="margin:6px 0 0">Dotted lines in the chart are the true utilities. Under this policy the agent can never reach (3,1) or (4,1) from (1,1), so it learns nothing about them; the RMS error is taken over the states it can reach.</p>';
      }
      run();
    }
  });

  /* =====================================================================
     Q-learning versus SARSA on the cliff
     ===================================================================== */
  const CW = 12, CH = 4, CLIFF = new Set(AI.range(10).map(i => (i + 1) + ',0'));
  const CENV = { W: CW, H: CH, start: '0,0', goal: '11,0', cliff: CLIFF, walls: new Set(), stepR: -1, cliffR: -100, goalR: -1, slip: 0 };
  function greedyPath(ag) { let s = CENV.start; const path = [s]; for (let n = 0; n < 60 && s !== CENV.goal; n++) { const a = ag.greedy(s), [x, y] = s.split(',').map(Number), d = E.ACT[a]; const nx = AI.clamp(x + d[0], 0, CW - 1), ny = AI.clamp(y + d[1], 0, CH - 1); s = nx + ',' + ny; path.push(s); if (CLIFF.has(s)) break; } return path; }
  AI.lab({
    id: 'cliff-walk', ch: 22, kind: 'demo', title: 'Q-learning versus SARSA on the cliff',
    blurb: 'Sutton and Barto’s cliff-walking task. Q-learning learns the shortest path along the cliff edge but keeps falling off while it explores; SARSA learns a safer path and earns more along the way.',
    tags: ['Q-learning', 'SARSA', 'off-policy', 'on-policy', 'ε-greedy exploration', 'temporal difference'],
    how: [['The task', '<p>Walk from S to G on a 4×12 grid. Every step costs 1. Stepping into the cliff costs 100 and sends you back to S. Both agents explore ε-greedily with ε = 0.1 and learn with α = 0.5 and γ = 1.</p>'],
      ['The only difference', '<p><b>Q-learning</b> updates towards r + γ max<sub>a′</sub> Q(s′, a′): the value of the best next action, whatever it actually does next. It is <b>off-policy</b>. <b>SARSA</b> updates towards r + γ Q(s′, a′) for the action a′ it actually takes next, exploration included. It is <b>on-policy</b>.</p>'],
      ['What to look for', '<p>Q-learning’s greedy path hugs the cliff, which is optimal if you never explore, but its exploratory slips send it over the edge, so its reward per episode during learning is worse. SARSA accounts for its own exploration and keeps away from the edge. The chart averages runs to smooth out luck.</p>']],
    mount(root, ctx) {
      const st = { eps: 0.1, episodes: 300, runs: 20 };
      const Lc = AI.layout(root);
      const gbox = AI.el('<div style="padding:10px;display:grid;gap:10px"></div>'); Lc.stage.appendChild(gbox); Lc.stage.classList.add('plain');
      const sv = AI.svgHost(AI.el('<div style="height:230px;position:relative"></div>'), ctx, (w, h) => draw(w, h)); gbox.appendChild(sv.svg.parentNode);
      const cbox = AI.el('<div></div>'); gbox.appendChild(cbox); const chart = AI.chart(cbox, ctx, { height: 220, xLabel: 'episode', right: 90, yMin: -120, yMax: 0 });
      const pc = AI.panel(Lc.side, 'Experiment');
      AI.controls(pc, [{ t: 'range', k: 'eps', label: 'Exploration ε', min: 0, max: 0.3, step: 0.01, fmt: v => v.toFixed(2) }, { t: 'range', k: 'episodes', label: 'Episodes', min: 50, max: 500, step: 50 }, { t: 'range', k: 'runs', label: 'Runs averaged', min: 1, max: 50, step: 1 }, { t: 'row' }, { t: 'btn', label: 'Run again', icon: 'dice', cls: 'primary', on: () => run() }], st, () => run());
      const ps = AI.panel(Lc.side, 'Average reward per episode'); const stats = AI.stats(ps, [['q', 'Q-learning (last 50)'], ['s', 'SARSA (last 50)']]);
      let paths = null;
      function draw(w, h) {
        const cs = Math.min((w - 20) / CW, (h - 20) / CH), ox = (w - cs * CW) / 2, oy = (h - cs * CH) / 2, X = x => ox + x * cs, Y = y => oy + (CH - 1 - y) * cs; let s = '';
        for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const k = x + ',' + y, cl = CLIFF.has(k); s += `<rect x="${X(x) + 1}" y="${Y(y) + 1}" width="${cs - 2}" height="${cs - 2}" rx="4" fill="${cl ? 'color-mix(in srgb,var(--bad) 30%,var(--bg))' : 'var(--bg)'}" stroke="var(--line2)"/>`; }
        s += `<text x="${X(5.5) + cs / 2}" y="${Y(0) + cs / 2 + 5}" text-anchor="middle" class="svg-b" style="font-size:14px">the cliff</text><text x="${X(0) + cs / 2}" y="${Y(0) + cs / 2 + 6}" text-anchor="middle" class="svg-b" style="font-size:17px">S</text><text x="${X(11) + cs / 2}" y="${Y(0) + cs / 2 + 6}" text-anchor="middle" class="svg-b" style="font-size:17px">G</text>`;
        if (paths) [['q', 'var(--accent)', -5], ['s', 'var(--v-path)', 5]].forEach(([k, col, off]) => { const p = paths[k]; if (!p) return; s += `<polyline points="${p.map(c => { const [x, y] = c.split(',').map(Number); return `${X(x) + cs / 2 + off},${Y(y) + cs / 2 + off}`; }).join(' ')}" fill="none" stroke="${col}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`; });
        return s + `<text x="${ox}" y="${h - 2}" class="svg-s"><tspan fill="var(--accent)">orange</tspan>: Q-learning’s greedy path · <tspan fill="var(--v-path)">blue</tspan>: SARSA’s greedy path (after the last run)</text>`;
      }
      function run() {
        const res = {}, pth = {};
        ['q', 'sarsa'].forEach(algo => { const sum = new Float64Array(st.episodes); let ag; for (let r = 0; r < st.runs; r++) { ag = E.tdControl.make(CENV, algo, 0.5, 1, st.eps, AI.rng(1000 * r + (algo === 'q' ? 1 : 2))); for (let e = 0; e < st.episodes; e++) sum[e] += Math.max(-1000, ag.episode(1000).total); } res[algo] = Array.from(sum, v => v / st.runs); pth[algo === 'q' ? 'q' : 's'] = greedyPath(ag); });
        const smooth = a => a.map((_, i) => { const lo = Math.max(0, i - 9); let s = 0; for (let k = lo; k <= i; k++) s += a[k]; return s / (i - lo + 1); });
        chart.set([{ name: 'Q-learning', color: 'var(--accent)', values: smooth(res.q) }, { name: 'SARSA', color: 'var(--v-path)', values: smooth(res.sarsa) }]);
        const tail = a => a.slice(-50).reduce((x, y) => x + y, 0) / Math.min(50, a.length); stats.set('q', tail(res.q).toFixed(1)); stats.set('s', tail(res.sarsa).toFixed(1));
        paths = { q: pth.q, s: pth.s.includes(CENV.goal) ? pth.s : null }; sv.redraw();
      }
      run();
    }
  });

  /* =====================================================================
     Game: Nim, learned by self-play
     ===================================================================== */
  const START = [1, 3, 5, 7];
  const nkey = h => h.join(''), moves = h => { const ms = []; h.forEach((n, i) => { for (let k = 1; k <= n; k++) ms.push([i, k]); }); return ms; };
  const apply = (h, [i, k]) => { const n = h.slice(); n[i] -= k; return n; };
  // exact misère values by memoised search: true if the player to move wins
  const WIN = {}; function wins(h) { const k = nkey(h); if (k in WIN) return WIN[k]; if (h.every(n => n === 0)) return (WIN[k] = true); /* previous player took the last object and lost */ let w = false; for (const m of moves(h)) { if (!wins(apply(h, m))) { w = true; break; } } return (WIN[k] = w); }
  function trainNim(n, r, Q) {
    Q = Q || {}; const q = (h, m) => Q[nkey(h) + ':' + m[0] + m[1]] || 0;
    const best = h => { let bm = null, bv = -Infinity; for (const m of moves(h)) { const v = q(h, m); if (v > bv) { bv = v; bm = m; } } return [bm, bv]; };
    for (let g = 0; g < n; g++) { let h = START.slice(); const eps = Math.max(0.05, 0.6 * (1 - g / n)); while (h.some(x => x)) { const ms = moves(h); const m = r() < eps ? ms[(r() * ms.length) | 0] : best(h)[0]; const h2 = apply(h, m); const target = h2.every(x => x === 0) ? -1 : -best(h2)[1]; const key = nkey(h) + ':' + m[0] + m[1]; Q[key] = q(h, m) + 0.3 * (target - q(h, m)); h = h2; } }
    return { Q, best, q };
  }
  function nimQuality(T) { let ok = 0, tot = 0; const seen = new Set(); (function walk(h) { const k = nkey(h); if (seen.has(k) || h.every(x => x === 0)) return; seen.add(k); if (wins(h)) { tot++; const [m] = T.best(h); if (m && !wins(apply(h, m))) ok++; } moves(h).forEach(m => walk(apply(h, m))); })(START); return { ok, tot }; }
  AI._nim = { wins, trainNim, nimQuality, START };
  AI.lab({
    id: 'nim-rl', ch: 22, kind: 'game', title: 'Nim against a self-taught agent',
    blurb: 'Rows of 1, 3, 5 and 7 matches; take any number from one row; whoever takes the last match loses. The agent learns only by playing itself. Train it a little or a lot, then try to beat it.',
    tags: ['self-play', 'Q-learning', 'game learning', 'exploration', 'misère Nim'],
    how: [['How it learns', '<p>Q(s, a) estimates the outcome (+1 win, −1 loss) of taking a from position s. After each move it updates Q(s, a) towards the negation of the opponent’s best value in the resulting position, or −1 if the move took the last match. Moves are chosen ε-greedily, with ε falling as training goes on.</p>'],
      ['How good is it?', '<p>Nim is solved: from every position it is known exactly whether the player to move can force a win. The panel reports, over all winning positions reachable from the start, the share in which the agent’s greedy move keeps the win.</p>'],
      ['Playing', '<p>Click a match to take it and every match to its right in that row. From 1, 3, 5, 7 the player to move loses against perfect play, so if you start, a fully trained agent should beat you; if it starts, you can win with care.</p>']],
    mount(root, ctx) {
      const st = { first: 'you', n: 2000 };
      const Ln = AI.layout(root);
      const body = AI.el('<div style="padding:clamp(14px,2.4vw,26px);display:grid;gap:16px"></div>'); Ln.stage.appendChild(body); Ln.stage.classList.add('plain');
      const banner = AI.banner(Ln.stage);
      const pt = AI.panel(Ln.side, 'Training');
      AI.controls(pt, [{ t: 'select', k: 'n', label: 'Self-play games per click', opts: [[200, '200'], [2000, '2,000'], [20000, '20,000']] }, { t: 'row' }, { t: 'btn', label: 'Train', icon: 'play', cls: 'primary', on: () => { T = trainNim(+st.n, rng, T.Q); games += +st.n; quality(); } }, { t: 'btn', label: 'Forget everything', icon: 'reset', on: () => { T = trainNim(0, rng); games = 0; quality(); } }], st, null);
      const ps = AI.panel(Ln.side, 'The agent'); const stats = AI.stats(ps, [['g', 'self-play games'], ['q', 'winning positions played right'], ['rec', 'you vs agent']]);
      const pg = AI.panel(Ln.side, 'Match'); AI.controls(pg, [{ t: 'seg', k: 'first', label: 'Who moves first', opts: [['you', 'You'], ['agent', 'Agent']] }, { t: 'row' }, { t: 'btn', label: 'New game', icon: 'reset', on: () => newGame() }], st, () => newGame());
      const rng = AI.rng(12345); let T = trainNim(0, rng), games = 0, h, turn, over, last = null, rec = AI.store.get('nim-rec', [0, 0]);
      function quality() { const qq = nimQuality(T); stats.set('g', games.toLocaleString('en-US')); stats.set('q', `${(100 * qq.ok / qq.tot).toFixed(0)}% of ${qq.tot}`, qq.ok === qq.tot ? 'good' : ''); stats.set('rec', `${rec[0]} – ${rec[1]}`); draw(); }
      function newGame() { h = START.slice(); turn = st.first; over = false; last = null; draw(); if (turn === 'agent') ctx.after(500, agentMove); }
      function agentMove() { if (over) return; const [m] = T.best(h); h = apply(h, m); last = { who: 'agent', m }; if (h.every(x => !x)) return end('you'); turn = 'you'; draw(); }
      function end(winner) { over = true; rec = winner === 'you' ? [rec[0] + 1, rec[1]] : [rec[0], rec[1] + 1]; AI.store.set('nim-rec', rec); stats.set('rec', `${rec[0]} – ${rec[1]}`); draw(); banner(winner === 'you' ? 'You win<small>The agent took the last match.</small>' : 'The agent wins<small>You took the last match.</small>', 2600); }
      function draw() {
        if (!h) return;
        body.innerHTML = `<p class="lede" style="margin:0">${over ? 'Game over.' : turn === 'you' ? 'Your move: click a match.' : 'The agent is thinking…'} ${last ? `The ${last.who === 'agent' ? 'agent' : 'you'} took ${last.m[1]} from row ${last.m[0] + 1}.` : ''}</p>` +
          h.map((n, i) => `<div style="display:flex;align-items:center;gap:10px;min-height:56px"><span class="small muted" style="width:52px">row ${i + 1}</span>${AI.range(START[i]).map(j => j < n ? `<button type="button" class="match" data-r="${i}" data-j="${j}" aria-label="take from match ${j + 1} of row ${i + 1}" ${over || turn !== 'you' ? 'disabled' : ''} style="width:20px;height:54px;border:0;background:none;padding:0;cursor:pointer"><svg viewBox="0 0 20 54" width="20" height="54"><rect x="7" y="12" width="6" height="40" rx="2" fill="#d9b382" stroke="#a07a4a"/><ellipse cx="10" cy="9" rx="6" ry="8" fill="var(--accent)"/></svg></button>` : `<span style="width:20px;height:54px;display:inline-block;opacity:.18"><svg viewBox="0 0 20 54" width="20" height="54"><rect x="7" y="12" width="6" height="40" rx="2" fill="none" stroke="var(--muted)" stroke-dasharray="2 2"/></svg></span>`).join('')}</div>`).join('') +
          `<p class="small muted" style="margin:0">Position ${h.join(', ')}: the player to move ${wins(h) ? '<b>can force a win</b>' : 'loses against perfect play'}.</p>${over ? `<button type="button" class="btn primary" data-new>${AI.icon.reset}<span>Play again</span></button>` : ''}`;
        body.querySelectorAll('.match').forEach(b => { b.onmouseenter = () => body.querySelectorAll(`.match[data-r="${b.dataset.r}"]`).forEach(x => { x.style.opacity = +x.dataset.j >= +b.dataset.j ? 0.45 : 1; }); b.onmouseleave = () => body.querySelectorAll('.match').forEach(x => { x.style.opacity = 1; }); b.onclick = () => { const i = +b.dataset.r, k = h[i] - +b.dataset.j; h = apply(h, [i, k]); last = { who: 'you', m: [i, k] }; if (h.every(x => !x)) return end('agent'); turn = 'agent'; draw(); ctx.after(600, agentMove); }; });
        const nb = body.querySelector('[data-new]'); if (nb) nb.onclick = newGame;
      }
      quality(); newGame();
    }
  });

  /* =====================================================================
     Siege: attacker against defender, two co-evolving Q-learners
     ===================================================================== */
  const MAP = ['..........', '.##...#...', '......#...', '..#.......', '..#..##...', '.....##..G', '..#.......', '..#...#...', '.##...#...', '..........'];
  AI.lab({
    id: 'siege', ch: 22, kind: 'demo', title: 'Siege: two Q-learners against each other',
    blurb: 'An attacker tries to reach the core; a defender tries to intercept it. Each is a tabular Q-learner whose environment is the other agent, so their strategies evolve together. Train fast, then watch.',
    tags: ['multiagent reinforcement learning', 'Q-learning', 'reward shaping', 'non-stationarity', 'exploration decay'],
    how: [['The game', '<p>Both agents move at once on a 10×10 grid with walls. The attacker wins by stepping onto the core; the defender wins by catching it (same square, swapping places, or adjacent when reach is set that way) or by holding out until the step limit. The defender may not stand on the core.</p>'],
      ['What each agent learns', '<p>The state is both positions, 10,000 combinations; each agent keeps a Q-table with 5 moves (stay, up, down, left, right) per state. Rewards: win +10, lose −10, ±4 for a timeout, plus small shaping rewards for getting closer to the core (attacker) or to the attacker (defender).</p>'],
      ['Non-stationarity', '<p>Each agent’s environment includes the other agent, which keeps changing. A trick that works today can stop working tomorrow, so the scores swing. Freeze one side’s learning to watch the other exploit it.</p>']],
    mount(root, ctx) {
      const W = 10, NS = 100, NA = 5, DIRS = [[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0]], walls = new Uint8Array(NS); let GOAL = 0;
      MAP.forEach((row, y) => [...row].forEach((ch, x) => { const i = y * W + x; if (ch === '#') walls[i] = 1; if (ch === 'G') GOAL = i; }));
      const X = i => i % W, Y = i => (i / W) | 0;
      const dist = new Uint8Array(NS * NS).fill(255);
      for (let s = 0; s < NS; s++) { if (walls[s]) continue; const q = [s]; dist[s * NS + s] = 0; for (let k = 0; k < q.length; k++) { const c = q[k]; for (let d = 1; d < 5; d++) { const nx = X(c) + DIRS[d][0], ny = Y(c) + DIRS[d][1]; if (nx < 0 || ny < 0 || nx >= W || ny >= W) continue; const n = ny * W + nx; if (walls[n] || dist[s * NS + n] !== 255) continue; dist[s * NS + n] = dist[s * NS + c] + 1; q.push(n); } } }
      const aSp = [], dSp = []; for (let i = 0; i < NS; i++) { if (walls[i] || i === GOAL) continue; if (X(i) <= 1) aSp.push(i); if (X(i) >= 6) dSp.push(i); }
      const st = { alpha: 0.2, gamma: 0.95, epsMin: 0.05, dsp: 0.75, reach: 1, max: 60, speed: 8, heat: true, exh: false, la: true, ld: true };
      let QA, QD, eps, S, recent, hist, bucket, ep = null, hold = 0, acc = 0, prog = 1, running = true, turbo = false, logItems = [];
      const rnd = a => a[(Math.random() * a.length) | 0];
      function reset() { QA = new Float32Array(NS * NS * NA); QD = new Float32Array(NS * NS * NA); eps = 1; S = { ep: 0, breach: 0, caught: 0, timeout: 0 }; recent = []; hist = []; bucket = { n: 0, breach: 0, caught: 0, timeout: 0 }; logItems = []; }
      const mv = (p, a, isD) => { const nx = X(p) + DIRS[a][0], ny = Y(p) + DIRS[a][1]; if (nx < 0 || ny < 0 || nx >= W || ny >= W) return p; const n = ny * W + nx; return walls[n] || (isD && n === GOAL) ? p : n; };
      const caught = (a, d, pa, pd) => a === d || (a === pd && d === pa) || (st.reach >= 1 && Math.abs(X(a) - X(d)) + Math.abs(Y(a) - Y(d)) <= 1);
      function pick(Q, s, e) { if (Math.random() < e) return (Math.random() * NA) | 0; const b = s * NA; let best = -Infinity, bi = 0, n = 0; for (let k = 0; k < NA; k++) { const v = Q[b + k]; if (v > best + 1e-9) { best = v; bi = k; n = 1; } else if (Math.abs(v - best) <= 1e-9) { n++; if (Math.random() * n < 1) bi = k; } } return bi; }
      const maxQ = (Q, s) => { const b = s * NA; let m = Q[b]; for (let k = 1; k < NA; k++) if (Q[b + k] > m) m = Q[b + k]; return m; };
      const upd = (Q, s, a, r, s2, done) => { const i = s * NA + a; Q[i] += st.alpha * ((done ? r : r + st.gamma * maxQ(Q, s2)) - Q[i]); };
      const newEp = trail => { const a = rnd(aSp), d = rnd(dSp); return { a, d, pa: a, pd: d, t: 0, out: null, tA: trail ? [a] : null, tD: trail ? [d] : null }; };
      function step(E2, e, lA, lD) {
        const a = E2.a, d = E2.d, s = a * NS + d, aa = pick(QA, s, e), ad = pick(QD, s, e), na = mv(a, aa, false), nd = Math.random() < st.dsp ? mv(d, ad, true) : d; E2.t++;
        let out = null; if (na === GOAL) out = 'breach'; else if (caught(na, nd, a, d)) out = 'caught'; else if (E2.t >= st.max) out = 'timeout';
        let rA = -0.01 + 0.25 * (dist[a * NS + GOAL] - dist[na * NS + GOAL]), rD = 0.2 * (dist[d * NS + na] - dist[nd * NS + na]);
        if (out === 'breach') { rA += 10; rD -= 10; } else if (out === 'caught') { rA -= 10; rD += 10; } else if (out === 'timeout') { rA -= 4; rD += 4; }
        const s2 = na * NS + nd; if (lA) upd(QA, s, aa, rA, s2, !!out); if (lD) upd(QD, s, ad, rD, s2, !!out);
        E2.pa = a; E2.pd = d; E2.a = na; E2.d = nd; E2.out = out; if (E2.tA) { E2.tA.push(na); E2.tD.push(nd); if (E2.tA.length > 14) { E2.tA.shift(); E2.tD.shift(); } }
        return out;
      }
      function record(out, len) { S.ep++; S[out]++; recent.push(out); if (recent.length > 200) recent.shift(); bucket.n++; bucket[out]++; if (bucket.n >= 100) { hist.push({ breach: bucket.breach / 100, caught: bucket.caught / 100, timeout: bucket.timeout / 100 }); if (hist.length > 400) hist.shift(); bucket = { n: 0, breach: 0, caught: 0, timeout: 0 }; chartDirty = true; } eps = Math.max(st.epsMin, eps * 0.9994); }
      const fast = () => { const E2 = newEp(false); let out; while (!(out = step(E2, eps, st.la, st.ld))); record(out, E2.t); };
      const Ls = AI.layout(root);
      const arena = AI.el('<div style="padding:10px;max-width:640px;margin:0 auto;width:100%"></div>'); Ls.stage.appendChild(arena); Ls.stage.classList.add('plain');
      const banner = AI.banner(Ls.stage);
      const cv = AI.canvas(arena, ctx, c => render(c), 1);
      const bar = AI.el('<div class="player"></div>'); Ls.stageCol.appendChild(bar);
      const bPlay = AI.el(`<button type="button" class="btn primary" style="min-width:100px">${AI.icon.pause}<span>Pause</span></button>`), bStep = AI.el(`<button type="button" class="btn">${AI.icon.next}<span>Step</span></button>`), bTurbo = AI.el('<button type="button" class="btn" aria-pressed="false"><span>Turbo train: off</span></button>'), hud = AI.el('<span class="count" style="margin-left:auto"></span>');
      bar.append(bPlay, bStep, bTurbo, hud);
      const pv = AI.panel(Ls.side, 'Watch');
      AI.controls(pv, [{ t: 'range', k: 'speed', label: 'Watch speed (steps per second)', min: 1, max: 60, step: 1 }, { t: 'row' }, { t: 'check', k: 'heat', label: 'Attacker’s heatmap' }, { t: 'check', k: 'exh', label: 'Exhibition (best moves, no learning)' }, { t: 'row' }, { t: 'check', k: 'la', label: 'Attacker keeps learning' }, { t: 'check', k: 'ld', label: 'Defender keeps learning' }], st, k => { if (k === 'exh') { ep = newEp(true); if (st.exh && turbo) setTurbo(false); } });
      const pscore = AI.panel(Ls.side, 'Last 200 episodes'); const stats = AI.stats(pscore, [['b', 'core breached'], ['c', 'caught'], ['t', 'held to time'], ['e', 'exploration ε']]);
      const pr = AI.panel(Ls.side, 'Rules and learning');
      AI.controls(pr, [{ t: 'range', k: 'alpha', label: 'Learning rate α', min: 0.02, max: 0.8, step: 0.01, fmt: v => v.toFixed(2) }, { t: 'range', k: 'gamma', label: 'Discount γ', min: 0.5, max: 0.99, step: 0.01, fmt: v => v.toFixed(2) }, { t: 'range', k: 'epsMin', label: 'Minimum exploration', min: 0, max: 0.4, step: 0.01, fmt: v => v.toFixed(2) }, { t: 'range', k: 'dsp', label: 'Defender speed', min: 0.3, max: 1, step: 0.05, fmt: v => Math.round(v * 100) + '%' }, { t: 'seg', k: 'reach', label: 'Capture reach', opts: [[1, 'Adjacent'], [0, 'Same square']] }, { t: 'range', k: 'max', label: 'Step limit', min: 25, max: 120, step: 5 }, { t: 'row' }, { t: 'btn', label: 'Reset both agents', icon: 'reset', on: () => { reset(); ep = newEp(true); chartDirty = true; addLog('timeout', 'Both agents’ memory wiped. Starting from random play.'); } }], st, null);
      const pc = AI.panel(Ls.below, 'Outcomes over training (each point averages 100 episodes)'); const cb = AI.el('<div></div>'); pc.appendChild(cb); const chart = AI.chart(cb, ctx, { height: 200, yMin: 0, yMax: 1, xLabel: 'episodes (hundreds)', right: 80 });
      const pl = AI.panel(Ls.below, 'Match log'); const logEl = AI.el('<div class="small" style="max-height:180px;overflow:auto"></div>'); pl.appendChild(logEl);
      let chartDirty = true;
      function addLog(out, text) { logItems.unshift([out, text]); if (logItems.length > 30) logItems.pop(); logEl.innerHTML = logItems.map(([o, t]) => `<div style="display:flex;gap:10px;padding:4px 0;border-bottom:1px dashed var(--line)"><b style="min-width:70px;color:${o === 'breach' ? 'var(--accent)' : o === 'caught' ? 'var(--v-goal)' : 'var(--muted)'}">${o === 'breach' ? 'Breach' : o === 'caught' ? 'Caught' : 'Timeout'}</b><span>${esc(t)}</span></div>`).join(''); }
      function watchStep() {
        if (!ep || (ep.out && hold <= 0)) { ep = newEp(true); prog = 1; return; } if (ep.out) { hold--; return; }
        const out = step(ep, st.exh ? 0 : eps, !st.exh && st.la, !st.exh && st.ld); prog = 0;
        if (out) { if (!st.exh) record(out, ep.t); hold = Math.max(2, Math.round(st.speed * 0.7)); banner(out === 'breach' ? 'Core breached' : out === 'caught' ? 'Intercepted' : 'Held until time', 900); addLog(out, `${st.exh ? 'Exhibition' : 'Episode ' + S.ep.toLocaleString('en-US')}: ${out === 'breach' ? 'reached the core' : out === 'caught' ? 'attacker caught' : 'attacker stalled'} after ${ep.t} steps`); }
      }
      function render(c) {
        const g = c.g, n = W, cs = c.w / n, pad = Math.max(1.5, cs * 0.06), C = k => AI.color(k);
        g.fillStyle = C('arena'); g.fillRect(0, 0, c.w, c.h);
        let hv = null, lo = 0, hi = 1; if (st.heat && ep) { hv = new Float32Array(NS); lo = Infinity; hi = -Infinity; for (let i = 0; i < NS; i++) { if (walls[i] || i === GOAL) continue; const v = maxQ(QA, i * NS + ep.d); hv[i] = v; if (v < lo) lo = v; if (v > hi) hi = v; } if (hi - lo < 1e-6) hv = null; }
        for (let i = 0; i < NS; i++) { const x = X(i) * cs, y = Y(i) * cs; g.beginPath(); g.roundRect ? g.roundRect(x + pad, y + pad, cs - 2 * pad, cs - 2 * pad, cs * 0.14) : g.rect(x + pad, y + pad, cs - 2 * pad, cs - 2 * pad); if (walls[i]) { g.fillStyle = C('arena-wall'); g.fill(); continue; } g.fillStyle = C((X(i) + Y(i)) % 2 ? 'arena-cell' : 'arena-cell2'); g.fill(); if (hv && i !== GOAL) { const t = (hv[i] - lo) / (hi - lo); g.fillStyle = AI.alpha(C('accent'), 0.6 * t * t); g.fill(); g.fillStyle = AI.alpha(C('v-goal'), 0.4 * (1 - t) * (1 - t)); g.fill(); } }
        const gx = (X(GOAL) + 0.5) * cs, gy = (Y(GOAL) + 0.5) * cs; g.fillStyle = C('warn'); g.beginPath(); for (let k = 0; k < 6; k++) { const an = Math.PI / 3 * k + Math.PI / 6; g.lineTo(gx + Math.cos(an) * cs * 0.3, gy + Math.sin(an) * cs * 0.3); } g.closePath(); g.fill();
        if (!ep) return; const t = Math.min(1, prog), ez = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, lerp = (a, b) => a + (b - a) * ez;
        const trail = (tr, col) => { if (!tr) return; for (let k = 0; k < tr.length - 1; k++) { const a = (k + 1) / tr.length; g.fillStyle = AI.alpha(col, a * 0.45); g.beginPath(); g.arc((X(tr[k]) + 0.5) * cs, (Y(tr[k]) + 0.5) * cs, cs * 0.08 * (0.5 + a), 0, Math.PI * 2); g.fill(); } };
        trail(ep.tA, C('accent')); trail(ep.tD, C('v-goal'));
        const ax = (lerp(X(ep.pa), X(ep.a)) + 0.5) * cs, ay = (lerp(Y(ep.pa), Y(ep.a)) + 0.5) * cs, dx = (lerp(X(ep.pd), X(ep.d)) + 0.5) * cs, dy = (lerp(Y(ep.pd), Y(ep.d)) + 0.5) * cs;
        if (st.reach >= 1) { g.strokeStyle = AI.alpha(C('v-goal'), 0.4); g.setLineDash([4, 5]); g.lineWidth = 1.5; g.beginPath(); g.arc(dx, dy, cs * 1.05, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); }
        const r = cs * 0.32; g.fillStyle = C('v-goal'); g.beginPath(); g.moveTo(dx, dy - r); g.lineTo(dx + r * 0.9, dy - r * 0.55); g.lineTo(dx + r * 0.75, dy + r * 0.35); g.quadraticCurveTo(dx + r * 0.4, dy + r * 0.85, dx, dy + r); g.quadraticCurveTo(dx - r * 0.4, dy + r * 0.85, dx - r * 0.75, dy + r * 0.35); g.lineTo(dx - r * 0.9, dy - r * 0.55); g.closePath(); g.fill();
        let an = Math.atan2(Y(ep.a) - Y(ep.pa), X(ep.a) - X(ep.pa)); if (ep.a === ep.pa) an = Math.atan2(gy - ay, gx - ax); g.save(); g.translate(ax, ay); g.rotate(an); g.fillStyle = C('accent'); const ra = cs * 0.34; g.beginPath(); g.moveTo(ra, 0); g.lineTo(-ra * 0.75, ra * 0.75); g.lineTo(-ra * 0.35, 0); g.lineTo(-ra * 0.75, -ra * 0.75); g.closePath(); g.fill(); g.restore();
        if (turbo) { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 0, c.w, c.h); g.fillStyle = '#fff'; g.font = `700 ${Math.round(c.w / 16)}px ${getComputedStyle(document.body).fontFamily}`; g.textAlign = 'center'; g.fillText(`${S.ep.toLocaleString('en-US')} episodes`, c.w / 2, c.h / 2); g.font = `${Math.round(c.w / 40)}px ${getComputedStyle(document.body).fontFamily}`; g.fillText('Training without drawing. Turn Turbo off to watch.', c.w / 2, c.h / 2 + c.w / 18); g.textAlign = 'start'; }
      }
      function ui() {
        const n = recent.length || 1, b = recent.filter(o => o === 'breach').length, ca = recent.filter(o => o === 'caught').length, ti = recent.filter(o => o === 'timeout').length;
        stats.set('b', Math.round(100 * b / n) + '%'); stats.set('c', Math.round(100 * ca / n) + '%'); stats.set('t', Math.round(100 * ti / n) + '%'); stats.set('e', (st.exh ? 0 : eps).toFixed(2));
        hud.textContent = `Episode ${S.ep.toLocaleString('en-US')} · step ${ep ? ep.t : 0}/${st.max}`;
        if (chartDirty) { chart.set(hist.length ? [{ name: 'breach', color: 'var(--accent)', values: hist.map(p => p.breach) }, { name: 'caught', color: 'var(--v-goal)', values: hist.map(p => p.caught) }, { name: 'timeout', color: 'var(--muted)', values: hist.map(p => p.timeout) }] : []); chartDirty = false; }
      }
      function setTurbo(on) { turbo = on; bTurbo.setAttribute('aria-pressed', String(on)); bTurbo.querySelector('span').textContent = on ? 'Turbo train: on' : 'Turbo train: off'; bTurbo.classList.toggle('primary', on); if (on) { running = true; bPlay.innerHTML = `${AI.icon.pause}<span>Pause</span>`; } else ep = newEp(true); }
      bPlay.onclick = () => { running = !running; bPlay.innerHTML = running ? `${AI.icon.pause}<span>Pause</span>` : `${AI.icon.play}<span>Play</span>`; };
      bStep.onclick = () => { if (turbo) setTurbo(false); running = false; bPlay.innerHTML = `${AI.icon.play}<span>Play</span>`; watchStep(); prog = 1; cv.redraw(); ui(); };
      bTurbo.onclick = () => setTurbo(!turbo);
      let uiClock = 0;
      ctx.raf(dt => {
        if (running && turbo) { const t0 = performance.now(); while (performance.now() - t0 < 14) for (let j = 0; j < 20; j++) fast(); }
        else if (running) { const iv = 1000 / st.speed; acc += dt; while (acc >= iv) { acc -= iv; watchStep(); } prog = acc / iv; }
        else prog = Math.min(1, prog + dt / (1000 / st.speed));
        cv.redraw(); uiClock += dt; if (uiClock > 150) { ui(); uiClock = 0; }
      });
      reset(); ep = newEp(true); addLog('timeout', 'Agents start knowing nothing and move at random.'); ui();
    }
  });
})(window);
