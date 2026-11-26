/* Chapters 14–15 labs: umbrella HMM, grid localisation, Kalman filter, urn-and-balls (open-universe) model. */
(function (G) {
  'use strict';
  const AI = G.AI, E = G.AIE, esc = AI.esc;

  AI.lab({
    id: 'umbrella-hmm', ch: 14, kind: 'demo', title: 'The umbrella world: filtering, smoothing, Viterbi',
    blurb: 'A guard who never goes outside infers whether it is raining from whether the director brings an umbrella. Toggle each day’s observation and watch all three inference tasks.',
    tags: ['hidden Markov model', 'filtering', 'forward–backward smoothing', 'Viterbi', 'most likely explanation'],
    how: [['The model (from the book)', '<p>P(Rain₀) = 0.5. Rain persists with probability 0.7: P(Rainₜ | Rainₜ₋₁) = 0.7 and P(Rainₜ | ¬Rainₜ₋₁) = 0.3. The director brings an umbrella on 90% of rainy days and 20% of dry ones.</p>'],
      ['Numbers to check', '<ul><li>Umbrella on day 1: filtered P(Rain₁) = 0.818.</li><li>Umbrella on days 1 and 2: filtered P(Rain₂) = 0.883, and the smoothed P(Rain₁ | u₁, u₂) is also 0.883, higher than the 0.818 known on day 1.</li><li>For umbrella, umbrella, none, umbrella, umbrella, the most likely sequence is rain, rain, dry, rain, rain.</li></ul>'],
      ['Three questions, three algorithms', '<p><b>Filtering</b> P(Xₜ | e₁:ₜ): what is the weather now? Forward messages. <b>Smoothing</b> P(Xₖ | e₁:ₜ) for k &lt; t: what was it then, given later evidence too? Forward–backward. <b>Most likely explanation</b>: the single most probable weather sequence. Viterbi, which replaces the sum in the forward pass by a max.</p>']],
    mount(root, ctx) {
      const st = { pr: 0.7, pu: 0.9, pn: 0.2 };
      let obs = [0, 0, 1, 0, 0];
      const Lu = AI.layout(root);
      const days = AI.el('<div style="display:grid;gap:8px;padding:14px"></div>'); Lu.stage.appendChild(days); Lu.stage.classList.add('plain');
      const chartBox = AI.el('<div style="padding:0 6px 10px"></div>'); Lu.stage.appendChild(chartBox);
      const chart = AI.chart(chartBox, ctx, { height: 210, yMin: 0, yMax: 1, xLabel: 'day (0 = before any evidence)', right: 92 });
      const pc = AI.panel(Lu.side, 'Model');
      const refs = AI.controls(pc, [{ t: 'range', k: 'pr', label: 'P(rain | rain the day before)', min: 0.5, max: 0.95, step: 0.05, fmt: v => v.toFixed(2) }, { t: 'range', k: 'pu', label: 'P(umbrella | rain)', min: 0.5, max: 1, step: 0.05, fmt: v => v.toFixed(2) }, { t: 'range', k: 'pn', label: 'P(umbrella | no rain)', min: 0, max: 0.5, step: 0.05, fmt: v => v.toFixed(2) }, { t: 'row' }, { t: 'btn', label: 'Add a day', on: () => { if (obs.length < 12) obs.push(0); run(); } }, { t: 'btn', label: 'Remove a day', on: () => { if (obs.length > 1) obs.pop(); run(); } }, { t: 'btn', label: 'Book values', icon: 'reset', on: () => { Object.assign(st, { pr: 0.7, pu: 0.9, pn: 0.2 }); refs.sync(); run(); } }], st, () => run());
      const pt = AI.panel(Lu.below, 'Messages'); const tab = AI.el('<div></div>'); pt.appendChild(tab);
      function run() {
        const m = { states: ['Rain', 'Dry'], prior: [0.5, 0.5], T: [[st.pr, 1 - st.pr], [1 - st.pr, st.pr]], O: [[st.pu, 1 - st.pu], [st.pn, 1 - st.pn]] };
        const sm = E.hmm.smooth(m, obs), vit = E.hmm.viterbi(m, obs);
        days.style.gridTemplateColumns = `repeat(${obs.length},minmax(0,1fr))`;
        days.innerHTML = obs.map((o, i) => `<button type="button" class="btn" data-d="${i}" style="flex-direction:column;min-height:96px;padding:8px 4px;gap:4px;white-space:normal;${o === 0 ? 'background:color-mix(in srgb,var(--v-path) 14%,var(--bg))' : ''}"><span class="small muted">Day ${i + 1}</span>${o === 0 ? '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="var(--v-path)" stroke-width="2"><path d="M3 12a9 9 0 0 1 18 0H3zM12 12v6a2 2 0 0 1-4 0"/></svg>' : '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="var(--muted)" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/></svg>'}<span class="small">${o === 0 ? 'umbrella' : 'no umbrella'}</span><b class="small" style="color:${vit.path[i] === 0 ? 'var(--v-path)' : 'var(--warn)'}">${vit.path[i] === 0 ? 'rain' : 'dry'}</b></button>`).join('');
        days.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { obs[+b.dataset.d] ^= 1; run(); });
        const f = sm.f.slice(1).map(x => x[0]), s = sm.s.slice(1).map(x => x[0]);
        chart.set([{ name: 'filtered', color: 'var(--v-path)', values: sm.f.map(x => x[0]) }, { name: 'smoothed', color: 'var(--accent)', values: sm.s.map(x => x[0]), dash: '6 4' }]);
        tab.innerHTML = '<p class="small muted" style="margin:0 0 6px">The bold word under each day is the Viterbi most likely sequence.</p>' + AI.table(['Day', 'r:Predicted P(rain)', 'r:Filtered P(rain)', 'r:Smoothed P(rain)', 'r:Backward b'], obs.map((o, i) => { const pr = E.hmm.forward(m, obs.slice(0, i + 1)).pred[i + 1][0]; return `<tr><td>${i + 1}</td><td class="r">${pr.toFixed(3)}</td><td class="r"><b>${f[i].toFixed(3)}</b></td><td class="r">${s[i].toFixed(3)}</td><td class="r">⟨${sm.b[i + 1].map(x => x.toFixed(3)).join(', ')}⟩</td></tr>`; }), 'compact');
      }
      run();
    }
  });

  /* ---------- HMM localisation on a grid ---------- */
  const MAZE = ['##############', '#....#.......#', '#.##.#.##.##.#', '#.#........#.#', '#...##.#.#...#', '#.#....#...#.#', '##############'];
  AI.lab({
    id: 'hmm-localize', ch: 14, kind: 'demo', title: 'Where is the robot? HMM localisation',
    blurb: 'A robot wanders a maze and senses walls with noisy sensors. Exact HMM filtering narrows down where it is, step by step. Guess before you look.',
    tags: ['HMM', 'localisation', 'sensor model', 'filtering', 'belief state'],
    how: [['The model, as in the book’s example', '<p>The robot moves to a random neighbouring free square at each step. It has four sensors that report whether there is a wall to the north, south, east and west; each one is wrong with probability ε, independently. So a square whose true wall pattern differs from the reading in d places has likelihood (1 − ε)<sup>4−d</sup> ε<sup>d</sup>. The maze layout here is our own.</p><p>Each blue disc’s area is proportional to the probability that the robot is in that square.</p>'],
      ['What to try', '<ul><li>Take a few steps with ε = 0.2: the belief collapses onto a few squares, then onto one.</li><li>Raise ε to 0.4 and it takes far longer.</li><li>Switch on “Guess first” and click where you think the robot is before each reveal.</li></ul>']],
    mount(root, ctx) {
      const st = { eps: 0.2, guess: false };
      const H = MAZE.length, W = MAZE[0].length, free = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (MAZE[y][x] === '.') free.push(y * W + x);
      const isFree = (x, y) => MAZE[y] && MAZE[y][x] === '.';
      const walls = i => { const x = i % W, y = (i / W) | 0; return [!isFree(x, y - 1), !isFree(x, y + 1), !isFree(x + 1, y), !isFree(x - 1, y)]; };
      const nbr = i => { const x = i % W, y = (i / W) | 0; return [[x, y - 1], [x, y + 1], [x + 1, y], [x - 1, y]].filter(([a, b]) => isFree(a, b)).map(([a, b]) => b * W + a); };
      const Lh = AI.layout(root);
      const box = AI.el(`<div style="position:relative;aspect-ratio:${W}/${H};cursor:crosshair"></div>`); Lh.stage.appendChild(box);
      const banner = AI.banner(Lh.stage);
      const bar = AI.el('<div class="player"></div>'); Lh.stageCol.appendChild(bar);
      const bStep = AI.el(`<button type="button" class="btn primary">${AI.icon.next}<span>Move and sense</span></button>`), bReset = AI.el(`<button type="button" class="btn">${AI.icon.reset}<span>New run</span></button>`), info = AI.el('<span class="count" style="margin-left:auto"></span>');
      bar.append(bStep, bReset, info);
      const pc = AI.panel(Lh.side, 'Sensors');
      AI.controls(pc, [{ t: 'range', k: 'eps', label: 'Sensor error rate ε', min: 0, max: 0.45, step: 0.05, fmt: v => v.toFixed(2) }, { t: 'row' }, { t: 'check', k: 'guess', label: 'Guess first (hide the robot)' }], st, k => { if (k === 'guess' && !st.guess) { waiting = false; guessAt = -1; } draw(); });
      const pr = AI.panel(Lh.side, 'Last reading'); const rd = AI.el('<div class="explain small"></div>'); pr.appendChild(rd);
      const ps = AI.panel(Lh.side, 'Belief'); const stats = AI.stats(ps, [['top', 'top square prob.'], ['hit', 'robot’s square prob.'], ['score', 'guesses right']]);
      let bel, robot, t, reading, guessAt = -1, waiting = false, score = AI.store.get('hmm-guess', [0, 0]);
      function reset() { robot = AI.pick(free); bel = new Float64Array(W * H); free.forEach(i => bel[i] = 1 / free.length); t = 0; reading = null; waiting = false; guessAt = -1; rd.textContent = 'No reading yet. The belief is uniform over all free squares.'; draw(); }
      function step() {
        if (waiting) {
          if (guessAt < 0) { banner('Click the square where you think the robot is', 1600); return; }
          const ok = guessAt === robot; score = [score[0] + (ok ? 1 : 0), score[1] + 1]; AI.store.set('hmm-guess', score);
          banner(ok ? 'Right square' : `Not there. Your square had probability ${bel[guessAt].toFixed(2)}`, 1600); waiting = false; draw(); return;
        }
        guessAt = -1; robot = AI.pick(nbr(robot));
        const pred = new Float64Array(W * H); free.forEach(i => { const n = nbr(i); n.forEach(j => pred[j] += bel[i] / n.length); });
        const w = walls(robot); reading = w.map(b => Math.random() < st.eps ? !b : b);
        let z = 0; free.forEach(i => { const ww = walls(i); const d = ww.reduce((s2, b, k) => s2 + (b !== reading[k] ? 1 : 0), 0); pred[i] *= Math.pow(1 - st.eps, 4 - d) * Math.pow(st.eps, d); z += pred[i]; });
        if (z > 0) { free.forEach(i => pred[i] /= z); bel = pred; } t++;
        rd.innerHTML = `Walls sensed: ${['north', 'south', 'east', 'west'].map((d, k) => `<b>${d}</b> ${reading[k] ? 'yes' : 'no'}`).join(', ')}.` + (st.guess ? '' : reading.some((b, k) => b !== w[k]) ? ' <span style="color:var(--bad)">At least one sensor was wrong this time.</span>' : ' All four sensors were right this time.');
        if (st.guess) waiting = true; draw();
      }
      function draw() {
        const w = box.clientWidth, h = box.clientHeight; if (!w) return; const cs = w / W; let s = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="position:absolute;inset:0">`; 
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (MAZE[y][x] === '#') { s += `<rect x="${x * cs}" y="${y * cs}" width="${cs + 0.5}" height="${cs + 0.5}" fill="var(--wall)"/>`; continue; } s += `<rect x="${x * cs + 1}" y="${y * cs + 1}" width="${cs - 2}" height="${cs - 2}" rx="4" fill="var(--bg)" class="cell" data-i="${i}"/>`; const p = bel[i]; if (p > 1e-4) s += `<circle cx="${(x + 0.5) * cs}" cy="${(y + 0.5) * cs}" r="${(0.47 * cs * Math.sqrt(p)).toFixed(2)}" fill="var(--v-path)" fill-opacity=".85" pointer-events="none"/>`; if (cs > 34 && p >= 0.05) s += `<text x="${(x + 1) * cs - 5}" y="${(y + 1) * cs - 5}" text-anchor="end" class="svg-s" style="font-size:10.5px" pointer-events="none">${p >= 0.995 ? '1.00' : p.toFixed(2).replace(/^0/, '')}</text>`; }
        if (guessAt >= 0) s += `<rect x="${(guessAt % W) * cs + 3}" y="${((guessAt / W) | 0) * cs + 3}" width="${cs - 6}" height="${cs - 6}" rx="6" fill="none" stroke="var(--accent)" stroke-width="4" pointer-events="none"/>`;
        if (!(st.guess && waiting)) { const x = (robot % W + 0.5) * cs, y = (((robot / W) | 0) + 0.5) * cs; s += `<circle cx="${x}" cy="${y}" r="${cs * 0.28}" fill="var(--accent)" stroke="var(--bg)" stroke-width="3" pointer-events="none"/>`; }
        box.innerHTML = s + '</svg>';
        let top = free[0]; free.forEach(i => { if (bel[i] > bel[top]) top = i; }); stats.set('top', bel[top].toFixed(2)); stats.set('hit', st.guess && waiting ? 'hidden' : bel[robot].toFixed(2)); stats.set('score', `${score[0]} / ${score[1]}`);
        info.textContent = `Step ${t}`; bStep.querySelector('span').textContent = waiting ? 'Reveal the robot' : 'Move and sense';
      }
      ctx.on(box, 'click', e => { if (!st.guess || !waiting) return; const c = e.target.closest('.cell'); if (!c) return; guessAt = +c.dataset.i; draw(); });
      bStep.onclick = step; bReset.onclick = reset; ctx.resize(box, draw); ctx.theme(draw); reset();
    }
  });

  /* ---------- 1-D Kalman filter ---------- */
  AI.lab({
    id: 'kalman', ch: 14, kind: 'demo', title: 'A Kalman filter in one dimension',
    blurb: 'Track an object that drifts randomly from noisy position readings. The estimate and its uncertainty band follow the book’s one-dimensional update equations.',
    tags: ['Kalman filter', 'Gaussian', 'random walk', 'measurement noise', 'Kalman gain'],
    how: [['The update', '<p>With prior mean μₜ and variance σₜ², motion noise σₓ² and sensor noise σ_z², the new reading zₜ₊₁ gives<br><span class="mono">μₜ₊₁ = ((σₜ² + σₓ²) zₜ₊₁ + σ_z² μₜ) / (σₜ² + σₓ² + σ_z²)</span><br><span class="mono">σₜ₊₁² = (σₜ² + σₓ²) σ_z² / (σₜ² + σₓ² + σ_z²)</span><br>The new mean is a weighted average of the reading and the old mean.</p>'],
      ['What to try', '<ul><li>Large sensor noise: the estimate trusts readings less and moves smoothly.</li><li>Large motion noise: it trusts readings more and follows them closely.</li><li>The variance settles to a fixed value that does not depend on the readings at all.</li></ul>']],
    mount(root, ctx) {
      const st = { sx: 1, sz: 3, T: 60 };
      const Lk = AI.layout(root);
      const cbox = AI.el('<div style="padding:8px 6px"></div>'); Lk.stage.appendChild(cbox); Lk.stage.classList.add('plain');
      const chart = AI.chart(cbox, ctx, { height: 320, xLabel: 'time step', right: 84 });
      const gbox = AI.el('<div style="padding:0 6px 8px"></div>'); Lk.stage.appendChild(gbox);
      const gchart = AI.chart(gbox, ctx, { height: 150, yMin: 0, yMax: 1, xLabel: 'time step', right: 84 });
      const pc = AI.panel(Lk.side, 'Noise');
      AI.controls(pc, [{ t: 'range', k: 'sx', label: 'Motion noise σₓ', min: 0.2, max: 4, step: 0.1, fmt: v => v.toFixed(1) }, { t: 'range', k: 'sz', label: 'Sensor noise σ_z', min: 0.2, max: 8, step: 0.1, fmt: v => v.toFixed(1) }, { t: 'row' }, { t: 'btn', label: 'New run', icon: 'dice', cls: 'primary', on: () => { seed = (Math.random() * 1e9) | 0; run(); } }], st, () => run());
      const ps = AI.panel(Lk.side, 'Result'); const stats = AI.stats(ps, [['rmsZ', 'error of raw readings'], ['rmsK', 'error of the filter'], ['sig', 'final σ']]);
      let seed = 42;
      function run() {
        const r = AI.rng(seed); let x = 0; const X = [], Z = [], M = [], S = [], K = []; let mu = 0, v = 4;
        for (let t = 0; t < st.T; t++) { x += AI.gauss(r) * st.sx; const z = x + AI.gauss(r) * st.sz; const p = v + st.sx * st.sx; const k = p / (p + st.sz * st.sz); mu = mu + k * (z - mu); v = p * st.sz * st.sz / (p + st.sz * st.sz); X.push(x); Z.push(z); M.push(mu); S.push(Math.sqrt(v)); K.push(k); }
        const rms = a => Math.sqrt(a.reduce((s, v2, i) => s + (v2 - X[i]) ** 2, 0) / a.length);
        stats.set('rmsZ', rms(Z).toFixed(2)); stats.set('rmsK', rms(M).toFixed(2), rms(M) < rms(Z) ? 'good' : ''); stats.set('sig', S[S.length - 1].toFixed(2));
        chart.set([{ name: 'true position', color: 'var(--ink)', values: X, width: 2.4 }, { name: 'estimate μ', color: 'var(--v-path)', values: M, width: 2.6 }, { name: 'readings', color: 'var(--accent)', values: Z, width: 1, dash: '1 5' }], (Xs, Y, g) => { const c = v => Y(AI.clamp(v, g.y0, g.y1)); let up = '', lo = ''; M.forEach((m, i) => { up += `${Xs(i)},${c(m + 2 * S[i])} `; }); for (let i = M.length - 1; i >= 0; i--) lo += `${Xs(i)},${c(M[i] - 2 * S[i])} `; return `<polygon points="${up}${lo}" fill="var(--v-path)" fill-opacity=".14"/>`; });
        gchart.set([{ name: 'Kalman gain', color: 'var(--v-chance)', values: K }]);
      }
      run();
    }
  });

  /* ---------- urn and balls: an open-universe model ---------- */
  AI.lab({
    id: 'urn-model', ch: 15, kind: 'demo', title: 'How many balls are in the urn?',
    blurb: 'A probabilistic program with an unknown number of objects. Draw balls, see colours through a noisy sensor, and infer how many balls there are.',
    tags: ['probabilistic programming', 'open-universe models', 'likelihood weighting', 'generative model'],
    how: [['The generative program', '<p class="mono small" style="white-space:pre-wrap">N ~ Poisson(6)<br>for each ball b: Colour(b) ~ blue or green, 50 : 50<br>for each draw d:<br>  BallDrawn(d) ~ uniform over the N balls<br>  ObsColour(d) = Colour(BallDrawn(d)) with prob. 0.8,<br>                 the other colour with prob. 0.2</p><p>This is the urn-and-balls example used to introduce the BLOG language (Milch, Marthi, Russell, Sontag, Ong and Kolobov, IJCAI 2005), with the same numbers. Draws are made with replacement. The number of objects, and which object each observation came from, are both unknown. (Any observation rules out N = 0, so the chart starts at 1; values above 20 have negligible probability.)</p>'],
      ['Two ways to infer', '<p><b>Exact</b>: for each N, add up over how many balls are blue. <b>Likelihood weighting</b>: run the program forwards many times, fixing the observed colours and weighting each run by how likely those observations were. Programs in general only allow the second.</p>'],
      ['What to try', '<ul><li>Clear the draws and add only “blue”: the posterior moves towards fewer balls, because a run of one colour is more likely when there are few balls.</li><li>Set the sensor accuracy to 1 and add one green draw among blues: N = 1 becomes impossible. With a noisy sensor it is only less likely.</li></ul>']],
    mount(root, ctx) {
      const st = { acc: 0.8 };
      let obs = ['blue', 'blue', 'green', 'blue'];
      const Lr = AI.layout(root);
      const cbox = AI.el('<div style="padding:10px 6px"></div>'); Lr.stage.appendChild(cbox); Lr.stage.classList.add('plain');
      const bars = AI.el('<div style="padding:4px 14px 14px"></div>'); Lr.stage.appendChild(bars);
      const pc = AI.panel(Lr.side, 'Observations');
      const ob = AI.el('<div class="chips" style="margin-bottom:10px"></div>'); pc.appendChild(ob);
      AI.controls(pc, [{ t: 'btn', label: 'Saw blue', on: () => { obs.push('blue'); run(); } }, { t: 'btn', label: 'Saw green', on: () => { obs.push('green'); run(); } }, { t: 'btn', label: 'Clear', icon: 'reset', on: () => { obs = []; run(); } }, { t: 'row' }, { t: 'range', k: 'acc', label: 'Sensor accuracy', min: 0.5, max: 1, step: 0.05, fmt: v => v.toFixed(2) }], st, () => run());
      const pl = AI.panel(Lr.side, 'Likelihood weighting'); const lbtn = AI.el('<button type="button" class="btn small">Run 20,000 weighted samples</button>'); pl.appendChild(lbtn); const lout = AI.el('<div class="explain small" style="margin-top:8px"></div>'); pl.appendChild(lout);
      const NMAX = 20; const pois = AI.range(NMAX + 1).map(n => { if (n === 0) return 0; let p = Math.exp(-6); for (let k = 1; k <= n; k++) p *= 6 / k; return p; });
      let exact = [];
      const choose = (n, k) => { let c = 1; for (let i = 1; i <= k; i++) c = c * (n - k + i) / i; return c; };
      function posterior() { const a = st.acc; const post = AI.range(NMAX + 1).map(n => { if (!n) return 0; let s = 0; for (let k = 0; k <= n; k++) { const pb = k / n; let l = 1; obs.forEach(o => { l *= o === 'blue' ? pb * a + (1 - pb) * (1 - a) : pb * (1 - a) + (1 - pb) * a; }); s += choose(n, k) * Math.pow(0.5, n) * l; } return pois[n] * s; }); const z = post.reduce((x, y) => x + y, 0); return post.map(p => p / z); }
      function drawBars(lw) { const mx = Math.max(...exact, ...(lw || [0])); bars.innerHTML = `<div style="display:grid;grid-template-columns:repeat(${NMAX},minmax(0,1fr));gap:3px;align-items:end;height:200px">${AI.range(NMAX).map(i => { const n = i + 1; return `<div style="position:relative;height:100%;display:flex;align-items:flex-end"><i style="display:block;width:100%;height:${exact[n] / mx * 100}%;background:var(--v-path);border-radius:4px 4px 0 0"></i>${lw ? `<i style="position:absolute;left:20%;right:20%;bottom:${lw[n] / mx * 100}%;height:3px;background:var(--accent)"></i>` : ''}</div>`; }).join('')}</div><div style="display:grid;grid-template-columns:repeat(${NMAX},minmax(0,1fr));gap:3px;margin-top:4px">${AI.range(NMAX).map(i => `<span class="small muted" style="text-align:center">${i + 1}</span>`).join('')}</div><p class="small muted" style="margin:6px 0 0;text-align:center">Number of balls N. Bars: exact posterior.${lw ? ' Orange ticks: likelihood-weighting estimate.' : ''}</p>`; }
      function run() {
        ob.innerHTML = obs.length ? obs.map(o => `<span class="chip" style="background:${o === 'blue' ? 'var(--v-path)' : 'var(--ok)'};color:#fff;border-color:transparent">${o}</span>`).join('') : '<span class="small muted">No draws yet: the posterior is the prior.</span>';
        exact = posterior(); let mode = 1; exact.forEach((p, n) => { if (p > exact[mode]) mode = n; }); const mean = exact.reduce((s, p, n) => s + p * n, 0);
        cbox.innerHTML = `<p style="margin:0 6px"><span class="score-big">${mode}</span> <span class="lede">most likely number of balls</span></p><p class="small muted" style="margin:4px 6px 0">Posterior mean ${mean.toFixed(2)} after ${obs.length} draw${obs.length === 1 ? '' : 's'}.</p>`;
        drawBars(null); lout.textContent = '';
      }
      lbtn.onclick = () => { const r = AI.rng((Math.random() * 1e9) | 0), a = st.acc; const w = new Float64Array(NMAX + 1); let tot = 0; for (let s = 0; s < 20000; s++) { let u = r(), n = 1, c = pois[1]; const z = pois.reduce((x, y) => x + y, 0); u *= z; while (u > c && n < NMAX) { n++; c += pois[n]; } const col = AI.range(n).map(() => r() < 0.5); let wt = 1; obs.forEach(o => { const b = col[(r() * n) | 0]; wt *= (o === 'blue') === b ? a : 1 - a; }); w[n] += wt; tot += wt; } const lw = Array.from(w).map(x => x / tot); drawBars(lw); const err = Math.max(...AI.range(NMAX + 1).map(n => Math.abs(lw[n] - exact[n]))); lout.innerHTML = `Largest difference from the exact posterior: <b>${err.toFixed(3)}</b>. More samples shrink it.`; };
      run();
    }
  });
})(window);
