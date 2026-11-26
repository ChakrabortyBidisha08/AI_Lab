/* Chapters 27–28 labs: fairness criteria, differential privacy, the off-switch game, and anytime search. */
(function (G) {
  'use strict';
  const AI = G.AI, E = G.AIE, esc = AI.esc;
  const Phi = x => { const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x / 2); return x >= 0 ? (1 + y) / 2 : (1 - y) / 2; };
  const phi = x => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);

  /* =====================================================================
     Fairness: one score, two groups, several definitions of "fair"
     ===================================================================== */
  function groupStats(base, t, mPos, mNeg) { const tpr = 1 - Phi(t - mPos), fpr = 1 - Phi(t - mNeg), sel = base * tpr + (1 - base) * fpr, ppv = sel > 0 ? base * tpr / sel : NaN; return { tpr, fpr, sel, ppv, acc: base * tpr + (1 - base) * (1 - fpr) }; }
  AI._fair = { groupStats };
  AI.lab({
    id: 'fairness', ch: 27, kind: 'demo', title: 'Fairness criteria and their trade-offs',
    blurb: 'A classifier scores applicants from two groups with different base rates. Choose a decision threshold for each group and compare demographic parity, equal opportunity, equalized odds and predictive parity.',
    tags: ['algorithmic fairness', 'demographic parity', 'equal opportunity', 'equalized odds', 'predictive parity', 'base rates'],
    how: [['The set-up', '<p>Each applicant either would (positive) or would not (negative) repay a loan. The classifier’s score is normally distributed with standard deviation 1: mean 1 for positives and −1 for negatives, the same in both groups. What differs is the <b>base rate</b>: the share of positives in each group. Applicants scoring above their group’s threshold are accepted.</p>'],
      ['Four criteria', '<ul><li><b>Demographic parity</b>: equal acceptance rates.</li><li><b>Equal opportunity</b>: equal true-positive rates.</li><li><b>Equalized odds</b>: equal true-positive and false-positive rates.</li><li><b>Predictive parity</b>: equal precision, the share of accepted applicants who are positive.</li></ul>'],
      ['The trade-off', '<p>When base rates differ and the classifier is imperfect, equal error rates and equal precision cannot both hold, a result shown by Chouldechova (2017) and by Kleinberg, Mullainathan and Raghavan (2016). Try it: the buttons set thresholds that satisfy one criterion at a time, and the table shows what happens to the others.</p>']],
    mount(root, ctx) {
      const st = { bA: 0.5, bB: 0.25, tA: 0, tB: 0 };
      const Lf = AI.layout(root);
      const grid = AI.el('<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px;padding:10px"></div>'); Lf.stage.appendChild(grid); Lf.stage.classList.add('plain');
      const gA = AI.el('<div></div>'), gB = AI.el('<div></div>'); grid.append(gA, gB);
      const mk = (host, key) => AI.svgHost(AI.el('<div style="height:230px;position:relative"></div>'), ctx, (w, h) => dens(w, h, key));
      const sA = mk(gA, 'A'), sB = mk(gB, 'B'); gA.appendChild(sA.svg.parentNode); gB.appendChild(sB.svg.parentNode);
      const pc = AI.panel(Lf.side, 'Groups and thresholds');
      const refs = AI.controls(pc, [{ t: 'range', k: 'bA', label: 'Base rate, group A', min: 0.05, max: 0.95, step: 0.05, fmt: v => Math.round(v * 100) + '%' }, { t: 'range', k: 'bB', label: 'Base rate, group B', min: 0.05, max: 0.95, step: 0.05, fmt: v => Math.round(v * 100) + '%' }, { t: 'row' }, { t: 'range', k: 'tA', label: 'Threshold, group A', min: -3, max: 3, step: 0.01, fmt: v => v.toFixed(2) }, { t: 'range', k: 'tB', label: 'Threshold, group B', min: -3, max: 3, step: 0.01, fmt: v => v.toFixed(2) }], st, () => run());
      const pp = AI.panel(Lf.side, 'Make it fair by…'); const pre = AI.el('<div style="display:grid;gap:6px"></div>'); pp.appendChild(pre);
      const solve = (f, target) => { let lo = -6, hi = 6; for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (f(m) > target) lo = m; else hi = m; } return (lo + hi) / 2; };
      [['Same threshold for both', () => { st.tB = st.tA; }], ['Demographic parity', () => { const s = groupStats(st.bA, st.tA, 1, -1).sel; st.tB = solve(t => groupStats(st.bB, t, 1, -1).sel, s); }], ['Equal opportunity (and odds)', () => { st.tB = st.tA; }], ['Predictive parity', () => { const p = groupStats(st.bA, st.tA, 1, -1).ppv; st.tB = solve(t => -groupStats(st.bB, t, 1, -1).ppv, -p); }]].forEach(([t, f]) => { const b = AI.el(`<button type="button" class="btn small" style="justify-content:flex-start">${t}</button>`); b.onclick = () => { f(); st.tB = Math.max(-3, Math.min(3, st.tB)); refs.sync(); run(); }; pre.appendChild(b); });
      const note = AI.el('<p class="small muted" style="margin:6px 0 0">Group B’s threshold is adjusted to match group A’s. Because both groups share the same score distributions here, equal thresholds equalise both error rates, so equal opportunity and equalized odds coincide.</p>'); pp.appendChild(note);
      const pt = AI.panel(Lf.below, 'The criteria, group by group'); const tab = AI.el('<div></div>'); pt.appendChild(tab);
      function dens(w, h, key) {
        const base = key === 'A' ? st.bA : st.bB, t = key === 'A' ? st.tA : st.tB, L = 12, R = 12, T = 26, B = 26, iw = w - L - R, ih = h - T - B, X = v => L + (v + 4) / 8 * iw, mx = 0.4, Y = v => T + ih * (1 - v / mx);
        let s = `<text x="${L}" y="16" class="svg-b" style="font-size:14px">Group ${key} · base rate ${Math.round(base * 100)}%</text>`;
        const curve = (m, wgt, col) => { let p = `${X(-4)},${Y(0)} `; for (let k = 0; k <= 160; k++) { const v = -4 + 8 * k / 160; p += `${X(v).toFixed(1)},${Y(wgt * phi(v - m)).toFixed(1)} `; } p += `${X(4)},${Y(0)}`; let a = `${X(t)},${Y(0)} `; for (let k = 0; k <= 80; k++) { const v = t + (4 - t) * k / 80; a += `${X(v).toFixed(1)},${Y(wgt * phi(v - m)).toFixed(1)} `; } a += `${X(4)},${Y(0)}`; return `<polygon points="${a}" fill="${col}" fill-opacity=".28"/><polyline points="${p}" fill="none" stroke="${col}" stroke-width="2.2"/>`; };
        s += curve(-1, 1 - base, 'var(--accent)') + curve(1, base, 'var(--v-path)');
        s += `<line x1="${X(t)}" x2="${X(t)}" y1="${T - 4}" y2="${T + ih}" stroke="var(--ink)" stroke-width="2.5"/><text x="${X(t) + 6}" y="${T + 8}" class="svg-s">accept →</text><line x1="${L}" x2="${L + iw}" y1="${T + ih}" y2="${T + ih}" stroke="var(--line2)"/><text x="${L + iw}" y="${h - 6}" text-anchor="end" class="svg-s">score</text><text x="${L}" y="${h - 6}" class="svg-s"><tspan fill="var(--v-path)">positives</tspan> · <tspan fill="var(--accent)">negatives</tspan></text>`;
        return s;
      }
      function run() {
        sA.redraw(); sB.redraw(); const A = groupStats(st.bA, st.tA, 1, -1), B = groupStats(st.bB, st.tB, 1, -1), p = v => isNaN(v) ? '–' : (v * 100).toFixed(1) + '%';
        const row = (name, a, b, tol) => { const d = Math.abs(a - b); return `<tr><td>${name}</td><td class="r">${p(a)}</td><td class="r">${p(b)}</td><td class="r">${(d * 100).toFixed(1)}</td><td>${d <= tol ? '<span class="chip ok-chip">equal</span>' : '<span class="chip bad-chip">unequal</span>'}</td></tr>`; };
        tab.innerHTML = AI.table(['Quantity', 'r:Group A', 'r:Group B', 'r:Gap (points)', 'Criterion'], [row('Acceptance rate (demographic parity)', A.sel, B.sel, 0.005), row('True-positive rate (equal opportunity)', A.tpr, B.tpr, 0.005), row('False-positive rate (with TPR: equalized odds)', A.fpr, B.fpr, 0.005), row('Precision among the accepted (predictive parity)', A.ppv, B.ppv, 0.005), `<tr><td>Accuracy</td><td class="r">${p(A.acc)}</td><td class="r">${p(B.acc)}</td><td></td><td></td></tr>`], 'compact');
      }
      run();
    }
  });

  /* =====================================================================
     Differential privacy: the Laplace mechanism
     ===================================================================== */
  const lap = (x, mu, b) => Math.exp(-Math.abs(x - mu) / b) / (2 * b);
  AI.lab({
    id: 'diff-privacy', ch: 27, kind: 'demo', title: 'Differential privacy and the Laplace mechanism',
    blurb: 'Answer a counting query with calibrated noise. Compare the answer distributions with and without one person, see the e^ε bound on how much any answer can reveal, then try to guess whether someone is in the data.',
    tags: ['differential privacy', 'Laplace mechanism', 'sensitivity', 'privacy budget', 'privacy–accuracy trade-off'],
    how: [['The definition', '<p>A randomised algorithm A is ε-differentially private if, for any two databases D and D′ that differ in one person and any set S of outputs, P(A(D) ∈ S) ≤ e<sup>ε</sup> P(A(D′) ∈ S). Whatever an attacker already knows, one person’s data changes the odds of any conclusion by at most a factor e<sup>ε</sup>.</p>'],
      ['The Laplace mechanism', '<p>A count changes by at most 1 when one person is added or removed (its <b>sensitivity</b> is 1). Adding noise from a Laplace distribution with scale 1/ε gives ε-differential privacy. Smaller ε means more privacy and more noise: the expected absolute error is 1/ε.</p>'],
      ['The guessing game', '<p>You see one noisy answer and guess whether it came from D (true count 50) or D′ (51), each equally likely. The definition guarantees that no strategy is right more than e<sup>ε</sup>/(1 + e<sup>ε</sup>) of the time. For this mechanism the best strategy (guess D′ when the answer is above 50.5) is right with probability 1 − ½e<sup>−ε/2</sup>, a little lower.</p>']],
    mount(root, ctx) {
      const st = { eps: 0.5 }; const n0 = 50;
      const Ld = AI.layout(root);
      const sv = AI.svgHost(Ld.stage, ctx, (w, h) => draw(w, h)); Ld.stage.style.minHeight = '340px';
      const pc = AI.panel(Ld.side, 'Privacy budget'); AI.controls(pc, [{ t: 'range', k: 'eps', label: 'ε', min: 0.05, max: 3, step: 0.05, fmt: v => v.toFixed(2) }], st, () => upd());
      const ps = AI.panel(Ld.side, 'What ε means'); const stats = AI.stats(ps, [['ratio', 'max odds ratio e^ε'], ['err', 'expected |error|'], ['guess', 'best guessing accuracy here'], ['bound', 'guarantee from ε']]);
      const pg = AI.panel(Ld.below, 'Was the extra person in the database?'); const gbox = AI.el('<div></div>'); pg.appendChild(gbox);
      let rec = [0, 0], cur = null;
      function draw(w, h) {
        const b = 1 / st.eps, lo = n0 - 6 - 3 * b, hi = n0 + 7 + 3 * b, L = 16, R = 16, T = 20, B = 34, iw = w - L - R, ih = h - T - B, X = x => L + (x - lo) / (hi - lo) * iw, mx = lap(0, 0, b) * 1.1, Y = v => T + ih * (1 - v / mx);
        let s = ''; [[n0, 'var(--v-path)', 'D: true count 50'], [n0 + 1, 'var(--accent)', 'D′: true count 51']].forEach(([mu, col, t], j) => { let p = ''; for (let k = 0; k <= 300; k++) { const x = lo + (hi - lo) * k / 300; p += `${X(x).toFixed(1)},${Y(lap(x, mu, b)).toFixed(1)} `; } s += `<polyline points="${p}" fill="none" stroke="${col}" stroke-width="2.6"/><line x1="${X(mu)}" x2="${X(mu)}" y1="${T + ih}" y2="${Y(lap(mu, mu, b))}" stroke="${col}" stroke-dasharray="3 4"/><text x="${X(mu) + (j ? 8 : -8)}" y="${T + 12 + j * 16}" text-anchor="${j ? 'start' : 'end'}" class="svg-s" fill="${col}">${t}</text>`; });
        if (cur) s += `<line x1="${X(cur.y)}" x2="${X(cur.y)}" y1="${T}" y2="${T + ih}" stroke="var(--ink)" stroke-width="2.5"/><text x="${X(cur.y)}" y="${T + ih + 16}" text-anchor="middle" class="svg-b" style="font-size:13px">released ${cur.y.toFixed(1)}</text>`;
        for (let k = Math.ceil(lo / 5) * 5; k <= hi; k += 5) s += `<text x="${X(k)}" y="${h - 4}" text-anchor="middle" class="svg-s">${k}</text>`;
        return s + `<line x1="${L}" x2="${L + iw}" y1="${T + ih}" y2="${T + ih}" stroke="var(--line2)"/>`;
      }
      function sampleLap(b) { const u = Math.random() - 0.5; return -b * Math.sign(u) * Math.log(1 - 2 * Math.abs(u)); }
      function round() { const inD2 = Math.random() < 0.5; cur = { inD2, y: (inD2 ? n0 + 1 : n0) + sampleLap(1 / st.eps), done: false }; gameUI(); sv.redraw(); }
      function gameUI() {
        gbox.innerHTML = `<p style="margin:0 0 10px">A count was released: <b>${cur.y.toFixed(2)}</b>. Did it come from D (50 people) or D′ (51, the extra person included)?</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn" data-g="0">D: not included</button><button type="button" class="btn" data-g="1">D′: included</button></div><p class="small" data-fb style="margin:10px 0 0">Your record: ${rec[0]} right out of ${rec[1]}${rec[1] ? ` (${Math.round(100 * rec[0] / rec[1])}%)` : ''}. The best possible strategy is right ${(100 * (1 - 0.5 * Math.exp(-st.eps / 2))).toFixed(0)}% of the time.</p>`;
        gbox.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { if (cur.done) return; cur.done = true; const ok = (b.dataset.g === '1') === cur.inD2; rec = [rec[0] + (ok ? 1 : 0), rec[1] + 1]; const fb = gbox.querySelector('[data-fb]'); fb.innerHTML = `<b>${ok ? 'Right' : 'Wrong'}</b>: it came from ${cur.inD2 ? 'D′' : 'D'}. Record ${rec[0]} / ${rec[1]} (${Math.round(100 * rec[0] / rec[1])}%); the best possible strategy is right ${(100 * (1 - 0.5 * Math.exp(-st.eps / 2))).toFixed(0)}% of the time. <button type="button" class="btn small" style="margin-left:8px">Another release</button>`; fb.querySelector('button').onclick = round; });
      }
      function upd() { stats.set('ratio', Math.exp(st.eps).toFixed(2)); stats.set('err', (1 / st.eps).toFixed(2)); stats.set('guess', (100 * (1 - 0.5 * Math.exp(-st.eps / 2))).toFixed(1) + '%'); stats.set('bound', '≤ ' + (100 * Math.exp(st.eps) / (1 + Math.exp(st.eps))).toFixed(1) + '%'); sv.redraw(); if (cur && !cur.done) gameUI(); }
      upd(); round();
    }
  });

  /* =====================================================================
     The off-switch game (Hadfield-Menell, Dragan, Abbeel and Russell, 2017)
     ===================================================================== */
  function offSwitch(mu, sig, err) { const z = sig > 0 ? mu / sig : (mu >= 0 ? Infinity : -Infinity); const Ep = sig > 0 ? mu * Phi(z) + sig * phi(z) : Math.max(mu, 0), En = mu - Ep; return { act: mu, off: 0, wait: (1 - err) * Ep + err * En }; }
  AI._off = offSwitch;
  AI.lab({
    id: 'off-switch', ch: 27, kind: 'demo', title: 'The off-switch game',
    blurb: 'A robot is unsure how much its human values the action it is about to take. Should it act, switch itself off, or let the human decide? Uncertainty about human preferences gives it a reason to keep the off switch working.',
    tags: ['value alignment', 'AI safety', 'off switch', 'uncertainty about preferences', 'assistance games'],
    how: [['The game', '<p>From Hadfield-Menell, Dragan, Abbeel and Russell (2017). The robot can <b>act</b> now, getting the human utility U; <b>switch itself off</b>, getting 0; or <b>wait</b> and let the human, who knows U, switch it off or let it proceed. The robot’s belief about U is a normal distribution with mean μ and standard deviation σ.</p>'],
      ['The result', '<p>If the human is rational, waiting is worth E[max(U, 0)], which is never less than max(μ, 0): deferring to the human is always at least as good as acting or switching off. The advantage shrinks to zero as σ → 0. A robot certain of its objective has no incentive to let itself be switched off.</p>'],
      ['A fallible human', '<p>If the human makes the wrong call with some probability, waiting can become worse than acting. The robot’s incentive to defer then depends on how its uncertainty compares with the human’s reliability.</p>']],
    mount(root, ctx) {
      const st = { mu: 0.5, sig: 1, err: 0 };
      const Lo = AI.layout(root);
      const box = AI.el('<div style="padding:12px;display:grid;gap:12px"></div>'); Lo.stage.appendChild(box); Lo.stage.classList.add('plain');
      const top = AI.el('<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px"></div>'); box.appendChild(top);
      const cb = AI.el('<div></div>'); box.appendChild(cb); const chart = AI.chart(cb, ctx, { height: 250, xLabel: 'robot’s uncertainty σ about the human’s utility', xs: i => (i / 10).toFixed(1), right: 120 });
      const pc = AI.panel(Lo.side, 'Robot’s belief and the human'); AI.controls(pc, [{ t: 'range', k: 'mu', label: 'Mean μ of U', min: -2, max: 2, step: 0.05, fmt: v => v.toFixed(2) }, { t: 'range', k: 'sig', label: 'Uncertainty σ', min: 0, max: 3, step: 0.05, fmt: v => v.toFixed(2) }, { t: 'range', k: 'err', label: 'Chance the human decides wrongly', min: 0, max: 0.5, step: 0.01, fmt: v => Math.round(v * 100) + '%' }], st, () => run());
      function run() {
        const r = offSwitch(st.mu, st.sig, st.err), best = Math.max(r.act, r.off, r.wait), card = (t, v, d) => `<div style="border:1px solid ${Math.abs(v - best) < 1e-12 ? 'var(--ink)' : 'var(--line2)'};border-radius:12px;padding:12px"><div class="small muted">${t}</div><div style="font-family:var(--display);font-weight:800;font-size:26px">${v.toFixed(3)}</div><div class="small">${d}</div></div>`;
        top.innerHTML = card('Act now', r.act, 'expected utility μ') + card('Switch off', r.off, 'always 0') + card('Wait for the human', r.wait, st.err ? `(1 − e)E[max(U,0)] + e·E[min(U,0)]` : 'E[max(U, 0)]');
        const sg = AI.range(31).map(k => k / 10); chart.set([{ name: 'wait', color: 'var(--v-goal)', values: sg.map(s => offSwitch(st.mu, s, st.err).wait) }, { name: 'act', color: 'var(--accent)', values: sg.map(() => st.mu), dash: '6 4' }, { name: 'switch off', color: 'var(--muted)', values: sg.map(() => 0), dash: '2 4' }], (X, Y, g) => `<line x1="${X(st.sig * 10)}" x2="${X(st.sig * 10)}" y1="${g.T}" y2="${g.T + g.ih}" stroke="var(--ink)" stroke-dasharray="3 4"/>`);
      }
      run();
    }
  });

  /* =====================================================================
     Anytime search and the value of computation
     ===================================================================== */
  function anytimeRuns(seed) {
    const W = 46, H = 30, r = AI.rng(seed), grid = new Uint8Array(W * H);
    for (let k = 0; k < 9; k++) { const x0 = (r() * (W - 10)) | 0, y0 = (r() * (H - 8)) | 0, w = 3 + ((r() * 8) | 0), h = 3 + ((r() * 6) | 0); for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) grid[y * W + x] = 2; }
    for (let k = 0; k < 7; k++) { const vert = r() < 0.5, x0 = 3 + ((r() * (W - 6)) | 0), y0 = 2 + ((r() * (H - 4)) | 0), len = 6 + ((r() * 12) | 0); for (let i = 0; i < len; i++) { const x = vert ? x0 : x0 + i, y = vert ? y0 + i : y0; if (x < W && y < H) grid[y * W + x] = 1; } }
    const start = (H - 2) * W + 1, goal = 1 * W + (W - 2); grid[start] = 0; grid[goal] = 0;
    const ws = [5, 3, 2, 1.5, 1.2, 1]; let t = 0; const sols = [];
    ws.forEach(w => { const res = E.gridSearch(grid, W, H, start, goal, w === 1 ? 'astar' : 'wastar', w); t += res.steps; if (res.found) sols.push({ w, t, cost: res.cost, path: res.path, steps: res.steps }); });
    return { W, H, grid, start, goal, sols };
  }
  AI._anytime = anytimeRuns;
  AI.lab({
    id: 'anytime-search', ch: 28, kind: 'demo', title: 'Anytime algorithms: when to stop thinking',
    blurb: 'An anytime planner returns a usable answer quickly and better ones the longer it runs. If thinking time costs something, when should the agent stop and act? A small exercise in metareasoning.',
    tags: ['anytime algorithm', 'metareasoning', 'value of computation', 'weighted A*', 'bounded rationality'],
    how: [['The planner', '<p>Weighted A* with weight w finds a path whose cost is at most w times optimal, usually after far fewer expansions than A*. Running it with w = 5, 3, 2, 1.5, 1.2 and finally 1 (plain A*) gives an anytime planner: each run returns a path at least as good as before, and the last is optimal.</p>'],
      ['Value of computation', '<p>Suppose each node expansion costs λ units of utility. The agent’s net utility if it stops after a given run is −(cost of the best path so far) − λ × (expansions so far). The best stopping point depends on λ; deciding it is a problem of <b>metareasoning</b>, reasoning about what computation to do.</p>'],
      ['Try', '<p>With λ near zero, run to the end and take the optimal path. As thinking gets dearer, stopping earlier with a slightly worse path wins.</p>']],
    mount(root, ctx) {
      const st = { lam: 0.01, seed: 4, show: 6 };
      const La = AI.layout(root);
      const host = AI.el('<div style="padding:10px"></div>'); La.stage.appendChild(host); La.stage.classList.add('plain');
      let A;
      const cv = AI.canvas(host, ctx, c => { if (!A) return; const g = c.g, cs = Math.min(c.w / A.W, c.h / A.H), ox = (c.w - cs * A.W) / 2, oy = (c.h - cs * A.H) / 2; g.fillStyle = AI.color('bg'); g.fillRect(0, 0, c.w, c.h); for (let i = 0; i < A.W * A.H; i++) { const x = i % A.W, y = (i / A.W) | 0; g.fillStyle = A.grid[i] === 1 ? AI.color('wall') : A.grid[i] === 2 ? AI.alpha(AI.color('warn'), 0.35) : AI.color('bg2'); g.fillRect(ox + x * cs + 0.5, oy + y * cs + 0.5, cs - 1, cs - 1); }
        const sols = A.sols.slice(0, st.show); sols.forEach((s, k) => { const last = k === sols.length - 1; g.strokeStyle = last ? AI.color('accent') : AI.alpha(AI.color('v-path'), 0.35); g.lineWidth = last ? 3.5 : 2; g.beginPath(); s.path.forEach((i, j) => { const x = ox + (i % A.W + 0.5) * cs, y = oy + (((i / A.W) | 0) + 0.5) * cs; j ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); });
        [[A.start, 'v-goal'], [A.goal, 'accent']].forEach(([i, col]) => { g.fillStyle = AI.color(col); g.beginPath(); g.arc(ox + (i % A.W + 0.5) * cs, oy + (((i / A.W) | 0) + 0.5) * cs, cs * 0.55, 0, Math.PI * 2); g.fill(); }); }, 0.66);
      const pc = AI.panel(La.side, 'Settings'); const refs = AI.controls(pc, [{ t: 'range', k: 'show', label: 'Stop after run', min: 1, max: 6, step: 1, fmt: v => `${v} (w = ${[5, 3, 2, 1.5, 1.2, 1][v - 1]})` }, { t: 'range', k: 'lam', label: 'Cost per expansion λ', min: 0, max: 0.2, step: 0.001, fmt: v => v.toFixed(3) }, { t: 'row' }, { t: 'btn', label: 'New map', icon: 'dice', on: () => { st.seed++; build(); } }], st, () => upd());
      const ps = AI.panel(La.side, 'This stopping point'); const stats = AI.stats(ps, [['cost', 'path cost'], ['exp', 'expansions so far'], ['net', 'net utility']]);
      const pt = AI.panel(La.below, 'Runs of the anytime planner'); const tab = AI.el('<div></div>'); pt.appendChild(tab);
      function build() { A = anytimeRuns(st.seed); for (let k = 0; k < 30 && A.sols.length < 2; k++) A = anytimeRuns(++st.seed); upd(); }
      function upd() {
        if (st.show > A.sols.length) st.show = A.sols.length; let best = Infinity; const rows = A.sols.map((s, k) => { best = Math.min(best, s.cost); return { k, w: s.w, cost: best, t: s.t, net: -best - st.lam * s.t, steps: s.steps }; });
        const opt = rows.reduce((b, r) => r.net > b.net ? r : b, rows[0]), cur = rows[st.show - 1];
        stats.set('cost', String(cur.cost)); stats.set('exp', cur.t.toLocaleString('en-US')); stats.set('net', cur.net.toFixed(2), cur === opt ? 'good' : '');
        tab.innerHTML = AI.table(['Run', 'r:Weight w', 'r:Expansions this run', 'r:Total expansions', 'r:Best path cost so far', 'r:Net utility'], rows.map(r => `<tr${r === cur ? ' style="font-weight:700"' : ''}><td>${r.k + 1}${r === opt ? ' <span class="chip ok-chip">best place to stop</span>' : ''}</td><td class="r">${r.w}</td><td class="r">${r.steps.toLocaleString('en-US')}</td><td class="r">${r.t.toLocaleString('en-US')}</td><td class="r">${r.cost}</td><td class="r">${r.net.toFixed(2)}</td></tr>`), 'compact') + '<p class="small muted" style="margin:6px 0 0">Mud (amber) costs 5 per step; walls are dark. Earlier paths are faint; the path at the chosen stopping point is orange.</p>';
        cv.redraw();
      }
      build();
    }
  });
})(window);
