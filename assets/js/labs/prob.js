/* Chapters 12–13 labs: full joint distribution, wumpus pit probabilities, Bayes intuition game, Bayesian networks, d-separation game. */
(function (G) {
  'use strict';
  const AI = G.AI, E = G.AIE, esc = AI.esc;
  const f3 = x => x.toFixed(3), f4 = x => x.toFixed(4);

  AI.lab({
    id: 'joint-dist', ch: 12, kind: 'demo', title: 'Inference from the full joint distribution',
    blurb: 'Answer any query about Toothache, Catch and Cavity by summing entries of the book’s joint distribution and normalising.',
    tags: ['full joint distribution', 'marginalization', 'conditioning', 'normalization', 'conditional independence'],
    how: [['How a query is answered', '<p>To find P(X | e), add up the entries that match X = true and e, then those matching X = false and e. Dividing each sum by their total (multiplying by α) normalises them. Highlighted cells are the ones being added.</p>'],
      ['Numbers to check', '<ul><li>P(cavity) = 0.108 + 0.012 + 0.072 + 0.008 = 0.2.</li><li>P(cavity | toothache) = 0.12 / 0.2 = 0.6.</li><li>P(cavity | toothache, catch) ≈ 0.871.</li></ul>'],
      ['Conditional independence', '<p>Toothache and Catch are independent given Cavity: knowing the probe caught tells you nothing more about the toothache once you know whether there is a cavity. The panel below checks this from the table.</p>']],
    mount(root, ctx) {
      const st = { X: 'Cavity', Toothache: 'any', Catch: 'any', Cavity: 'any' };
      const J = { vars: E.dentist.vars, p: Object.assign({}, E.dentist.p) };
      const Lj = AI.layout(root, { cls: 'even' }); Lj.stage.classList.add('plain');
      const tbl = AI.el('<div style="padding:18px"></div>'); Lj.stage.appendChild(tbl);
      const pc = AI.panel(Lj.side, 'Query');
      const refs = AI.controls(pc, [{ t: 'select', k: 'X', label: 'Ask about', opts: J.vars, str: true }, { t: 'row' }].concat(J.vars.map(v => ({ t: 'seg', k: v, label: `Evidence on ${v}`, opts: [['any', 'unknown'], ['T', 'true'], ['F', 'false']] }))), st, () => run());
      const pr = AI.panel(Lj.side, 'Answer'); const out = AI.el('<div class="explain"></div>'); pr.appendChild(out);
      const pi = AI.panel(Lj.below, 'Independence check'); const ind = AI.el('<div></div>'); pi.appendChild(ind);
      function run() {
        if (st[st.X] !== 'any') { st[st.X] = 'any'; refs[st.X].set('any'); }
        const ev = {}; J.vars.forEach(v => { if (v !== st.X && st[v] !== 'any') ev[v] = st[v]; });
        const q = E.jointQuery(J, st.X, ev);
        const cellT = new Set(q.cells.T), cellF = new Set(q.cells.F);
        const cell = (t, c, cav) => { const k = `${t},${c},${cav}`; const col = cellT.has(k) ? 'color-mix(in srgb,var(--v-path) 26%,var(--bg))' : cellF.has(k) ? 'color-mix(in srgb,var(--v-frontier) 40%,var(--bg))' : 'var(--bg)'; return `<td class="r" style="background:${col};font-size:18px;font-weight:600;padding:12px">${J.p[k].toFixed(3)}</td>`; };
        tbl.innerHTML = `<div class="scroll"><table class="tbl" style="text-align:center"><thead><tr><th></th><th colspan="2" style="text-align:center">toothache</th><th colspan="2" style="text-align:center">¬toothache</th></tr><tr><th></th><th class="r">catch</th><th class="r">¬catch</th><th class="r">catch</th><th class="r">¬catch</th></tr></thead><tbody><tr><th>cavity</th>${cell('T', 'T', 'T')}${cell('T', 'F', 'T')}${cell('F', 'T', 'T')}${cell('F', 'F', 'T')}</tr><tr><th>¬cavity</th>${cell('T', 'T', 'F')}${cell('T', 'F', 'F')}${cell('F', 'T', 'F')}${cell('F', 'F', 'F')}</tr></tbody></table></div><div class="legend"><span><i style="background:color-mix(in srgb,var(--v-path) 26%,var(--bg))"></i>Summed for ${esc(st.X)} = true</span><span><i style="background:color-mix(in srgb,var(--v-frontier) 40%,var(--bg))"></i>Summed for ${esc(st.X)} = false</span></div>`;
        const evs = Object.keys(ev).map(k => `${k.toLowerCase()} = ${ev[k] === 'T'}`).join(', ');
        out.innerHTML = q.t + q.f === 0 ? 'That evidence has probability 0.' : `<p class="mono" style="margin:0 0 6px">P(${esc(st.X)}${evs ? ' | ' + esc(evs) : ''}) = α ⟨${f3(q.t)}, ${f3(q.f)}⟩</p><p style="margin:0">α = 1 / ${f3(q.t + q.f)}, so the answer is <b>⟨${f4(q.dist[0])}, ${f4(q.dist[1])}⟩</b>: true with probability <b>${f4(q.dist[0])}</b>.</p>`;
        const P = k => J.p[k]; const rows = ['T', 'F'].map(cv => { const pc2 = ['T,T', 'T,F', 'F,T', 'F,F'].reduce((s, a) => s + P(a + ',' + cv), 0); const tc = P('T,T,' + cv) / pc2, t = (P('T,T,' + cv) + P('T,F,' + cv)) / pc2, c = (P('T,T,' + cv) + P('F,T,' + cv)) / pc2; return `<tr><td>${cv === 'T' ? 'cavity' : '¬cavity'}</td><td class="r">${f4(tc)}</td><td class="r">${f4(t)} × ${f4(c)} = ${f4(t * c)}</td><td>${Math.abs(tc - t * c) < 1e-9 ? 'equal' : 'different'}</td></tr>`; });
        ind.innerHTML = AI.table(['Given', 'r:P(toothache, catch | ·)', 'r:P(toothache | ·) × P(catch | ·)', ''], rows, 'compact') + '<p class="tip" style="margin-top:6px">Equal in both rows, so Toothache and Catch are conditionally independent given Cavity. That is why the joint can be written as P(Toothache | Cavity) P(Catch | Cavity) P(Cavity): 5 numbers instead of 7.</p>';
      }
      run();
    }
  });

  AI.lab({
    id: 'wumpus-prob', ch: 12, kind: 'demo', title: 'Wumpus world: how likely is a pit?',
    blurb: 'Mark visited squares and breezes, and compute the exact probability of a pit in every square by enumerating the frontier, as the book does.',
    tags: ['probabilistic inference', 'frontier', 'conditional independence', 'wumpus world'],
    how: [['The book’s situation', '<p>The agent has visited [1,1], [1,2] and [2,1], felt a breeze in [1,2] and [2,1], and nowhere else. Logic cannot say which of [1,3], [2,2], [3,1] is safe. Probability can: P(pit in [1,3]) ≈ 0.31, P(pit in [2,2]) ≈ 0.86, P(pit in [3,1]) ≈ 0.31.</p>'],
      ['The trick that makes it fast', '<p>Only frontier squares (unvisited neighbours of visited squares) affect the breezes. Squares further away keep their prior probability, so the sum over models only needs to range over the frontier.</p>'],
      ['What to try', '<p>Click squares to cycle them between unvisited, visited without breeze, and visited with breeze. Change the pit prior and watch the posteriors move.</p>']],
    mount(root, ctx) {
      const st = { p: 0.2 };
      const known = { '1,1': { breeze: false }, '1,2': { breeze: true }, '2,1': { breeze: true } };
      const Lw = AI.layout(root);
      const box = AI.el('<div style="position:relative;width:min(100%,520px);aspect-ratio:1;margin:12px auto;cursor:pointer"></div>'); Lw.stage.appendChild(box); Lw.stage.classList.add('plain');
      let res;
      const sv = AI.svgHost(box, ctx, (w) => { const cs = w / 4; let s = ''; for (let x = 1; x <= 4; x++) for (let y = 1; y <= 4; y++) { const k = x + ',' + y, px = (x - 1) * cs, py = (4 - y) * cs, kn = known[k], fr = res.frontier.includes(k), p = res.prob[k]; s += `<g class="sq" data-k="${k}"><rect x="${px + 3}" y="${py + 3}" width="${cs - 6}" height="${cs - 6}" rx="12" fill="${kn ? 'var(--bg)' : fr ? 'color-mix(in srgb,var(--v-bad) ' + Math.round(p * 55) + '%,var(--bg3))' : 'var(--bg3)'}" stroke="${kn ? 'var(--ink)' : 'var(--line2)'}" stroke-width="${kn ? 2 : 1.5}"/><text x="${px + 10}" y="${py + 22}" class="svg-s">[${x},${y}]</text>${kn ? `<text x="${px + cs / 2}" y="${py + cs / 2 + 6}" text-anchor="middle" class="svg-t" style="font-weight:700">${kn.breeze ? 'Breeze' : 'OK'}</text><text x="${px + cs / 2}" y="${py + cs / 2 + 24}" text-anchor="middle" class="svg-s">visited</text>` : `<text x="${px + cs / 2}" y="${py + cs / 2 + 8}" text-anchor="middle" class="svg-b" style="font-size:${cs * 0.2}px" fill="${fr ? 'var(--ink)' : 'var(--muted)'}">${p.toFixed(2)}</text><text x="${px + cs / 2}" y="${py + cs / 2 + 26}" text-anchor="middle" class="svg-s">${fr ? 'frontier' : 'prior'}</text>`}</g>`; } return s; });
      const pc = AI.panel(Lw.side, 'Prior');
      AI.controls(pc, [{ t: 'range', k: 'p', label: 'P(pit) in any square', min: 0.05, max: 0.5, step: 0.01, fmt: v => v.toFixed(2) }, { t: 'row' }, { t: 'btn', label: 'Back to the book’s situation', icon: 'reset', on: () => { Object.keys(known).forEach(k => delete known[k]); Object.assign(known, { '1,1': { breeze: false }, '1,2': { breeze: true }, '2,1': { breeze: true } }); st.p = 0.2; pc.querySelector('input').value = 0.2; pc.querySelector('input')._show && pc.querySelector('input')._show(); run(); } }], st, () => run());
      const pm = AI.panel(Lw.side, 'Consistent frontier models'); const mt = AI.el('<div></div>'); pm.appendChild(mt);
      function run() {
        if (!known['1,1']) known['1,1'] = { breeze: false };
        res = E.wumpusPits(4, known, st.p); sv.redraw();
        mt.innerHTML = res.frontier.length > 8 ? `<p class="small muted">${res.models.length} consistent models over ${res.frontier.length} frontier squares.</p>` : AI.table(['Pits in frontier', 'r:Weight'], res.models.map(m => `<tr><td class="mono">${m.pits.length ? m.pits.map(k => `[${k}]`).join(' ') : 'none'}</td><td class="r">${m.w.toFixed(4)}</td></tr>`), 'compact') + `<p class="tip" style="margin-top:6px">Each model’s weight is the product of p for each pit and 1 − p for each pit-free frontier square. P(pit in a square) is the weight of models with a pit there divided by the total, ${res.Z.toFixed(4)}.</p>`;
      }
      ctx.on(box, 'click', e => { const g = e.target.closest('.sq'); if (!g) return; const k = g.dataset.k; if (k === '1,1') { known[k].breeze = !known[k].breeze; } else if (!known[k]) known[k] = { breeze: false }; else if (!known[k].breeze) known[k].breeze = true; else delete known[k]; run(); });
      run();
    }
  });

  /* ---------- Bayes intuition game ---------- */
  const SCEN = [
    (r) => { const prev = AI.pick([0.001, 0.005, 0.01, 0.02], r), sens = AI.pick([0.9, 0.95, 0.99], r), fp = AI.pick([0.01, 0.05, 0.1], r); return { text: `A disease affects ${pct(prev)} of people. A test detects it ${pct(sens)} of the time when it is present, and wrongly says “positive” for ${pct(fp)} of healthy people. Someone tests positive. How likely is it that they have the disease?`, prior: prev, tp: sens, fp, h: 'disease', e: 'a positive test' }; },
    (r) => { const prev = AI.pick([0.2, 0.3, 0.4], r), tp = AI.pick([0.6, 0.7, 0.8], r), fp = AI.pick([0.02, 0.05], r); return { text: `${pct(prev)} of emails are spam. The word “winner” appears in ${pct(tp)} of spam and in ${pct(fp)} of normal emails. An email contains “winner”. How likely is it to be spam?`, prior: prev, tp, fp, h: 'spam', e: '“winner”' }; },
    (r) => { const prev = AI.pick([0.02, 0.05], r), tp = AI.pick([0.9, 0.98], r), fp = AI.pick([0.03, 0.08], r); return { text: `A machine makes ${pct(prev)} faulty parts. An inspector flags ${pct(tp)} of faulty parts, and also flags ${pct(fp)} of good parts. A part is flagged. How likely is it to be faulty?`, prior: prev, tp, fp, h: 'faulty', e: 'a flag' }; },
    (r) => { const prev = AI.pick([0.3, 0.5], r), tp = AI.pick([0.7, 0.8], r), fp = AI.pick([0.2, 0.3], r); return { text: `It rains on ${pct(prev)} of days in this season. A forecaster says “rain” on ${pct(tp)} of rainy days and on ${pct(fp)} of dry days. The forecast says rain. How likely is rain?`, prior: prev, tp, fp, h: 'rain', e: 'a rain forecast' }; }
  ];
  function pct(x) { return (x * 100 >= 1 ? +(x * 100).toFixed(1) : +(x * 100).toFixed(2)) + '%'; }
  AI.lab({
    id: 'bayes-game', ch: 12, kind: 'game', title: 'Bayes’ rule by instinct',
    blurb: 'Estimate the probability after the evidence, then see Bayes’ rule work it out on a crowd of 1,000. Most people badly overestimate the rare cases.',
    tags: ['Bayes’ rule', 'base rate', 'prior', 'likelihood', 'posterior'],
    how: [['Bayes’ rule', '<p>P(h | e) = P(e | h) P(h) / P(e), where P(e) = P(e | h) P(h) + P(e | ¬h) P(¬h). When the prior P(h) is small, even a good test produces more false alarms than true hits.</p>'], ['Scoring', '<p>Each round scores up to 100 points: 100 minus the distance between your guess and the true answer, in percentage points. Six rounds per game.</p>']],
    mount(root, ctx) {
      const Lb = AI.layout(root, { cls: 'even' }); Lb.stage.classList.add('plain');
      const body = AI.el('<div style="padding:20px"></div>'); Lb.stage.appendChild(body);
      const ps = AI.panel(Lb.side, 'Score'); const stats = AI.stats(ps, [['pts', 'points'], ['round', 'round'], ['best', 'best game']]);
      const pe = AI.panel(Lb.side, 'Working'); const work = AI.el('<div class="explain small">Make a guess with the slider.</div>'); pe.appendChild(work);
      let round, pts, sc;
      const start = () => { round = 0; pts = 0; next(); };
      function next() {
        stats.set('pts', pts); stats.set('round', `${Math.min(round + 1, 6)} / 6`); const b = AI.progress.best('bayes-game'); stats.set('best', b == null ? '–' : b);
        if (round >= 6) { AI.progress.best('bayes-game', pts); body.innerHTML = `<div class="score-big">${pts}</div><p class="lede" style="margin:8px 0 14px">points out of 600.</p><button type="button" class="btn primary" data-a>${AI.icon.reset}Play again</button>`; body.querySelector('[data-a]').onclick = start; work.textContent = ''; return; }
        sc = AI.pick(SCEN)(Math.random);
        body.innerHTML = `<p class="small muted" style="margin:0">Round ${round + 1} of 6</p><p style="font-size:18px;line-height:1.5;margin:8px 0 16px">${esc(sc.text)}</p><label class="field"><span>Your estimate <output>50%</output></span><input type="range" min="0" max="100" step="1" value="50"></label><button type="button" class="btn primary" style="margin-top:12px" data-go>Lock in my guess</button><div data-viz style="margin-top:16px"></div>`;
        const rg = body.querySelector('input'), o = body.querySelector('output'); rg.oninput = () => o.textContent = rg.value + '%';
        body.querySelector('[data-go]').onclick = () => {
          const guess = +rg.value / 100, ph = sc.prior, pe2 = sc.tp * ph + sc.fp * (1 - ph), post = sc.tp * ph / pe2; const got = Math.max(0, Math.round(100 - Math.abs(guess - post) * 100)); pts += got;
          const N = 1000, H = Math.round(N * ph), TP = Math.round(H * sc.tp), FP = Math.round((N - H) * sc.fp);
          work.innerHTML = `<p class="mono" style="margin:0 0 6px">P(${sc.h} | ${esc(sc.e)}) = ${sc.tp} × ${ph} / (${sc.tp} × ${ph} + ${sc.fp} × ${(1 - ph).toFixed(3)})</p><p style="margin:0">= <b>${(post * 100).toFixed(1)}%</b>. You guessed ${Math.round(guess * 100)}%: <b>${got}</b> points.</p>`;
          const viz = body.querySelector('[data-viz]'); const cells = AI.range(1000).map(i => i < TP ? 'var(--v-bad)' : i < H ? 'color-mix(in srgb,var(--v-bad) 35%,var(--bg))' : i < H + FP ? 'var(--v-frontier)' : 'var(--bg3)');
          viz.innerHTML = `<p class="small" style="margin:0 0 6px">In a crowd of 1,000: about <b>${H}</b> have ${sc.h} (${TP} of them get ${esc(sc.e)}), and <b>${FP}</b> without ${sc.h} also get ${esc(sc.e)}. So ${TP} of the ${TP + FP} with ${esc(sc.e)} really have ${sc.h}.</p><div style="display:grid;grid-template-columns:repeat(50,1fr);gap:1px">${cells.map(c => `<i style="aspect-ratio:1;background:${c};border-radius:1px"></i>`).join('')}</div><div class="legend"><span><i style="background:var(--v-bad)"></i>${sc.h}, flagged</span><span><i style="background:var(--v-frontier)"></i>no ${sc.h}, flagged anyway</span></div>`;
          const nx = AI.el(`<button type="button" class="btn" style="margin-top:12px">${round === 5 ? 'Final score' : 'Next round'}${AI.icon.arrow}</button>`); body.appendChild(nx); nx.onclick = () => { round++; next(); }; body.querySelector('[data-go]').disabled = true; rg.disabled = true; stats.set('pts', pts);
        };
      }
      start();
    }
  });

  /* ---------- Bayesian network inference ---------- */
  function drawNet(net, w, h, ev, X, extra) {
    const P = n => [n.xy[0] * w, n.xy[1] * h]; let s = AI.arrowDefs('bn', 'var(--ink2)');
    net.nodes.forEach(n => n.par.forEach(p => { const a = net.nodes.find(m => m.n === p); const [x1, y1] = P(a), [x2, y2] = P(n); const d = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / d, uy = (y2 - y1) / d; const hl = extra && extra.edges && extra.edges.has(p + '>' + n.n); s += `<line x1="${x1 + ux * 30}" y1="${y1 + uy * 24}" x2="${x2 - ux * 34}" y2="${y2 - uy * 26}" stroke="${hl ? (extra.edgeCol || 'var(--v-path)') : 'var(--ink2)'}" stroke-width="${hl ? 5 : 2}" marker-end="url(#bn)"/>`; }));
    net.nodes.forEach(n => { const [x, y] = P(n); const e = ev[n.n]; const isX = n.n === X || !!(extra && extra.mark && extra.mark.has(n.n)); const fill = e === true ? 'var(--v-goal)' : e === false ? 'var(--v-bad)' : isX ? 'var(--v-frontier)' : 'var(--bg)'; const rw = Math.max(64, n.n.length * 8.2 + 18); s += `<g class="bnn" data-n="${n.n}" style="cursor:pointer"><rect x="${x - rw / 2}" y="${y - 20}" width="${rw}" height="40" rx="20" fill="${fill}" stroke="var(--ink)" stroke-width="${isX ? 3 : 1.8}"/><text x="${x}" y="${y + 5}" text-anchor="middle" class="svg-t" style="font-weight:700" fill="${e !== undefined ? '#fff' : 'var(--ink)'}">${esc(n.n)}</text>${e !== undefined ? `<text x="${x}" y="${y + 36}" text-anchor="middle" class="svg-s halo" style="font-weight:600">observed ${e}</text>` : ''}${extra && extra.post && e === undefined ? `<text x="${x}" y="${y + 36}" text-anchor="middle" class="svg-s halo" style="font-weight:600">P(true) = ${extra.post[n.n].toFixed(3)}</text>` : ''}</g>`; });
    return s;
  }
  const cptHTML = n => AI.table(n.par.length ? n.par.concat(['r:P(' + n.n + ')']) : ['r:P(' + n.n + ')'], Object.entries(n.cpt).map(([k, v]) => `<tr>${k ? k.split(',').map(x => `<td>${x === 'T' ? 'true' : 'false'}</td>`).join('') : ''}<td class="r">${v}</td></tr>`), 'compact');
  AI.lab({
    id: 'bayes-net', ch: 13, kind: 'demo', title: 'Bayesian network inference',
    blurb: 'Set evidence on the burglary or wet-grass network and compute any posterior exactly, by variable elimination, and by four sampling methods.',
    tags: ['Bayesian networks', 'enumeration', 'variable elimination', 'rejection sampling', 'likelihood weighting', 'Gibbs sampling'],
    how: [['The burglary network', '<p>A burglary or an earthquake can set off the alarm; John and Mary each may call when they hear it. With both calling, P(Burglary | j, m) ≈ 0.284: still unlikely, because burglaries are rare (prior 0.001) and the calls are noisy.</p>'],
      ['What to try', '<ul><li>Click nodes to set evidence (click again to cycle true, false, unknown). The ringed node is the query.</li><li>Observe Alarm = true and then Earthquake = true: the burglary probability drops. The earthquake explains the alarm away.</li><li>Draw samples: rejection sampling wastes samples that disagree with rare evidence; likelihood weighting keeps them all, with weights.</li></ul>'],
      ['The wet-grass network', '<p>Cloudy affects Sprinkler and Rain, which both affect WetGrass. The book uses it for sampling: for example P(Rain | Sprinkler = true) = 0.3 exactly.</p>']],
    mount(root, ctx) {
      const st = { net: 'burglary', X: 'Burglary', method: 'lw', n: 100 };
      const ev = { JohnCalls: true, MaryCalls: true };
      let net = E.nets[st.net], post = {};
      const Ln = AI.layout(root);
      const box = AI.el('<div style="position:relative;aspect-ratio:1.55;min-height:280px"></div>'); Ln.stage.appendChild(box);
      const sv = AI.svgHost(box, ctx, (w, h) => drawNet(net, w, h, ev, st.X, { post }));
      AI.legend(Ln.stageCol, [['var(--v-frontier)', 'Query'], ['var(--v-goal)', 'Observed true'], ['var(--v-bad)', 'Observed false']]);
      const pc = AI.panel(Ln.side, 'Network and query');
      const refs = AI.controls(pc, [{ t: 'select', k: 'net', label: 'Network', opts: [['burglary', 'Burglary alarm (book)'], ['sprinkler', 'Wet grass (book)']], str: true }, { t: 'select', k: 'X', label: 'Query', opts: net.nodes.map(n => n.n), str: true }], st, k => { if (k === 'net') { net = E.nets[st.net]; Object.keys(ev).forEach(x => delete ev[x]); if (st.net === 'sprinkler') { ev.Sprinkler = true; st.X = 'Rain'; } else { ev.JohnCalls = true; ev.MaryCalls = true; st.X = 'Burglary'; } refs.X.innerHTML = net.nodes.map(n => `<option>${n.n}</option>`).join(''); refs.X.value = st.X; } run(); });
      const pe = AI.panel(Ln.side, 'Exact answer'); const ex = AI.el('<div class="explain"></div>'); pe.appendChild(ex);
      const psm = AI.panel(Ln.below, 'Sampling'); const sctl = AI.el('<div></div>'); psm.appendChild(sctl);
      AI.controls(sctl, [{ t: 'select', k: 'method', label: 'Method', opts: [['prior', 'Prior sampling (ignores evidence)'], ['rejection', 'Rejection sampling'], ['lw', 'Likelihood weighting'], ['gibbs', 'Gibbs sampling (MCMC)']], str: true, grow: true }, { t: 'row' }, { t: 'btn', label: 'Draw 100', on: () => draw(100) }, { t: 'btn', label: 'Draw 1,000', on: () => draw(1000) }, { t: 'btn', label: 'Draw 10,000', cls: 'primary', on: () => draw(10000) }, { t: 'btn', label: 'Reset', icon: 'reset', on: () => resetS() }], st, () => resetS());
      const sstat = AI.stats(psm, [['est', 'estimate'], ['exact', 'exact'], ['used', 'samples drawn'], ['kept', 'samples kept']]);
      const chart = AI.chart(psm, ctx, { height: 170, yMin: 0, yMax: 1, xLabel: 'batches of samples' });
      const pv = AI.panel(Ln.below, 'Variable elimination'); const veOut = AI.el('<ol class="small" style="padding-left:20px;margin:0"></ol>'); pv.appendChild(veOut);
      const pt = AI.panel(Ln.below, 'Conditional probability tables'); const cpts = AI.el('<div class="grid2" style="gap:10px"></div>'); pt.appendChild(cpts);
      let sampler = null, hist = [], exact = 0;
      function resetS() { sampler = E.bn.sampler(net, st.method, st.X, st.method === 'prior' ? {} : ev, Math.random); hist = []; sstat.set('est', '–'); sstat.set('used', 0); sstat.set('kept', 0); chart.set([{ name: 'exact', color: 'var(--ok)', values: [exact, exact], dash: '5 4' }]); }
      function draw(n) { const steps = 20; let o; for (let k = 0; k < steps; k++) { o = sampler.draw(n / steps); hist.push(o.est); } sstat.set('est', isFinite(o.est) ? o.est.toFixed(3) : '–'); sstat.set('used', o.used.toLocaleString()); sstat.set('kept', o.kept.toLocaleString()); chart.set([{ name: 'exact', color: 'var(--ok)', values: hist.map(() => exact), dash: '5 4' }, { name: 'estimate', color: 'var(--v-path)', values: hist.slice() }]); }
      function run() {
        if (ev[st.X] !== undefined) delete ev[st.X];
        const r = E.bn.enumerate(net, st.X, ev); exact = r.p; post = {}; net.nodes.forEach(n => { if (ev[n.n] === undefined) post[n.n] = E.bn.enumerate(net, n.n, ev).p; }); sv.redraw();
        const evs = Object.keys(ev).map(k => `${k} = ${ev[k]}`).join(', ');
        ex.innerHTML = `<p class="mono" style="margin:0 0 6px">P(${esc(st.X)}${evs ? ' | ' + esc(evs) : ''})</p><p style="margin:0;font-size:28px;font-family:var(--display);font-weight:900">${r.p.toFixed(4)}</p><p class="small muted" style="margin:6px 0 0">By enumeration: ${r.mults} multiplications and ${r.adds} additions.${st.method === 'prior' ? '' : ''}</p>`;
        sstat.set('exact', r.p.toFixed(3));
        const ve = E.bn.eliminate(net, st.X, ev); veOut.innerHTML = ve.steps.map(s => `<li style="margin-bottom:6px">${s.msg}${s.factors.length ? `<br><span class="mono muted">${s.factors.map(f => esc(f.name)).join('  ')}</span>` : ''}</li>`).join('');
        cpts.innerHTML = net.nodes.map(n => `<div><b class="small">${esc(n.n)}</b>${cptHTML(n)}</div>`).join('');
        resetS();
      }
      ctx.on(box, 'click', e => { const g = e.target.closest('.bnn'); if (!g) return; const n = g.dataset.n; if (n === st.X) return; ev[n] = ev[n] === undefined ? true : ev[n] === true ? false : undefined; if (ev[n] === undefined) delete ev[n]; run(); });
      run();
    }
  });

  /* ---------- d-separation game ---------- */
  const DNETS = [E.nets.burglary, E.nets.sprinkler, { title: 'Six variables', nodes: [{ n: 'A', par: [], xy: [0.2, 0.12] }, { n: 'B', par: [], xy: [0.75, 0.12] }, { n: 'C', par: ['A', 'B'], xy: [0.48, 0.42] }, { n: 'D', par: ['A'], xy: [0.12, 0.62] }, { n: 'E', par: ['C'], xy: [0.42, 0.86] }, { n: 'F', par: ['C', 'D'], xy: [0.18, 0.92] }] }];
  AI.lab({
    id: 'dsep-game', ch: 13, kind: 'game', title: 'Independent or not? (d-separation)',
    blurb: 'Given a network and some evidence, decide whether two variables are conditionally independent. Then see every path checked triple by triple.',
    tags: ['d-separation', 'conditional independence', 'explaining away', 'Markov blanket'],
    how: [['Rules for one triple on a path', '<ul><li><b>Chain</b> A → B → C or <b>common cause</b> A ← B → C: the path is blocked if B is observed.</li><li><b>Common effect (collider)</b> A → B ← C: the path is blocked unless B, or one of B’s descendants, is observed.</li></ul><p>X and Y are independent given the evidence if every path between them is blocked.</p>'], ['Scoring', '<p>A point for each right answer; your best streak is kept in this browser.</p>']],
    mount(root, ctx) {
      const Ld = AI.layout(root);
      const box = AI.el('<div style="position:relative;aspect-ratio:1.6;min-height:260px"></div>'); Ld.stage.appendChild(box);
      const ask = AI.el('<div style="padding:12px;border-top:1px solid var(--line);background:var(--bg)"></div>'); Ld.stage.appendChild(ask);
      let net, X, Y, Z, paths, answered, hlEdges = new Set();
      const sv = AI.svgHost(box, ctx, (w, h) => net ? drawNet(net, w, h, Object.fromEntries(Z.map(z => [z, true])), null, { edges: hlEdges, edgeCol: 'var(--accent)', mark: new Set([X, Y]) }).replace(/observed true/g, 'observed') : '');
      const ps = AI.panel(Ld.side, 'Score'); const stats = AI.stats(ps, [['ok', 'correct'], ['n', 'answered'], ['streak', 'best streak']]);
      const pe = AI.panel(Ld.side, 'Every path'); const ex = AI.el('<div class="small"></div>'); pe.appendChild(ex);
      let ok = 0, n = 0, streak = 0;
      function fresh() {
        net = AI.pick(DNETS); const names = net.nodes.map(m => m.n); [X, Y] = AI.shuffle(names.slice()).slice(0, 2); const rest = names.filter(m => m !== X && m !== Y); Z = AI.shuffle(rest).slice(0, (Math.random() * Math.min(3, rest.length + 1)) | 0);
        paths = E.bn.paths(net, X, Y, Z); answered = false; hlEdges = new Set(); sv.redraw(); ex.innerHTML = 'Answer first, then the paths appear here.';
        ask.innerHTML = `<p style="margin:0 0 10px;font-size:17px">Given <b>${Z.length ? Z.map(esc).join(', ') : 'no evidence'}</b>, are <b>${esc(X)}</b> and <b>${esc(Y)}</b> independent?</p><div class="btns"><button type="button" class="btn primary" data-a="1">Independent</button><button type="button" class="btn" data-a="0">Dependent</button></div>`;
        ask.querySelectorAll('[data-a]').forEach(b => b.onclick = () => answer(b.dataset.a === '1'));
        stats.set('ok', ok); stats.set('n', n); stats.set('streak', AI.store.get('dsep-best', 0));
      }
      function answer(ind) {
        if (answered) return; answered = true; const truth = !paths.some(p => p.active); const right = ind === truth; n++; if (right) { ok++; streak++; } else streak = 0; if (streak > AI.store.get('dsep-best', 0)) AI.store.set('dsep-best', streak);
        const act = paths.find(p => p.active); if (act) for (let i = 1; i < act.path.length; i++) { const a = act.path[i - 1], b = act.path[i]; const na = net.nodes.find(m => m.n === b); hlEdges.add(na.par.includes(a) ? a + '>' + b : b + '>' + a); } sv.redraw();
        ask.innerHTML = `<p style="margin:0 0 10px;font-size:17px"><b style="color:${right ? 'var(--ok)' : 'var(--bad)'}">${right ? 'Right' : 'Not quite'}</b>: ${esc(X)} and ${esc(Y)} are <b>${truth ? 'independent' : 'dependent'}</b> given ${Z.length ? Z.map(esc).join(', ') : 'nothing'}.${act ? ' The highlighted path is active.' : ''}</p><button type="button" class="btn primary" data-n>Next question${AI.icon.arrow}</button>`; ask.querySelector('[data-n]').onclick = fresh;
        ex.innerHTML = paths.length ? paths.map(p => `<div style="padding:6px 0;border-bottom:1px dashed var(--line)"><b class="mono">${p.path.map(esc).join(' – ')}</b>: <span style="color:${p.active ? 'var(--bad)' : 'var(--ok)'}">${p.active ? 'active' : 'blocked'}</span><ul style="margin:4px 0 0;padding-left:18px">${p.triples.map(t => `<li>${esc(t.a)} ${t.kind === 'collider' ? '→' : t.kind === 'common cause' ? '←' : '–'} <b>${esc(t.b)}</b> ${t.kind === 'collider' ? '←' : t.kind === 'common cause' ? '→' : '–'} ${esc(t.c)}: ${t.kind}, ${t.ok ? 'passes' : 'blocks'}${t.kind === 'collider' ? (t.ok ? ' (it or a descendant is observed)' : ' (not observed)') : (t.ok ? ' (not observed)' : ' (observed)')}</li>`).join('') || '<li>Direct edge: always active.</li>'}</ul></div>`).join('') : 'No path connects them at all, so they are independent.';
        stats.set('ok', ok); stats.set('n', n); stats.set('streak', AI.store.get('dsep-best', 0));
      }
      fresh();
    }
  });
})(window);
