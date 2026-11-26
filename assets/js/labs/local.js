/* Chapter 4 labs: local search on 8-queens (hill climbing, annealing, genetic algorithm), foggy hills game. */
(function (G) {
  'use strict';
  const AI = G.AI, E = G.AIE, esc = AI.esc, Q = E.queens;

  function board(W, st, opts) {
    opts = opts || {}; const n = st.length, cs = Math.min(W - 20, 520) / n, ox = (W - cs * n) / 2, oy = 10;
    let s = '';
    for (let c = 0; c < n; c++) for (let r = 0; r < n; r++) {
      const x = ox + c * cs, y = oy + (n - 1 - r) * cs;
      s += `<rect x="${x}" y="${y}" width="${cs}" height="${cs}" fill="${(c + r) % 2 ? 'var(--bg3)' : 'var(--bg)'}"/>`;
      if (opts.hvals && st[c] !== r) { const t = st.slice(); t[c] = r; const h = Q.h(t); const best = opts.best === h; s += `<text x="${x + cs / 2}" y="${y + cs / 2 + 5}" text-anchor="middle" class="svg-m" style="font-size:${Math.max(10, cs * 0.26)}px;font-weight:${best ? 700 : 400}" fill="${best ? 'var(--ok)' : 'var(--muted)'}">${h}</text>`; }
    }
    // attack lines
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (st[i] === st[j] || Math.abs(st[i] - st[j]) === j - i) { const x1 = ox + (i + 0.5) * cs, y1 = oy + (n - 1 - st[i] + 0.5) * cs, x2 = ox + (j + 0.5) * cs, y2 = oy + (n - 1 - st[j] + 0.5) * cs; s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--v-bad)" stroke-width="2" stroke-opacity=".45"/>`; }
    st.forEach((r, c) => { const x = ox + (c + 0.5) * cs, y = oy + (n - 1 - r + 0.5) * cs, k = cs * 0.34, hot = opts.move && opts.move[0] === c; s += queenGlyph(x, y, k, hot ? 'var(--accent)' : Q.attackers(st, c) ? 'var(--v-bad)' : 'var(--ink)'); });
    s += `<rect x="${ox}" y="${oy}" width="${cs * n}" height="${cs * n}" fill="none" stroke="var(--ink)" stroke-width="2"/>`;
    return { svg: s, h: oy * 2 + cs * n };
  }
  const queenGlyph = (x, y, k, col) => `<path d="M${x - k} ${y + k * 0.75}h${2 * k}l${-k * 0.18} ${-k * 0.42}l${k * 0.28} ${-k * 0.98}l${-k * 0.55} ${k * 0.55}l${-k * 0.55} ${-k * 0.85}l${-k * 0.55} ${k * 0.85}l${-k * 0.55} ${-k * 0.55}l${k * 0.28} ${k * 0.98}z" fill="${col}"/><circle cx="${x}" cy="${y - k * 0.95}" r="${k * 0.16}" fill="${col}"/>`;
  E.queenGlyph = queenGlyph;

  AI.lab({
    id: 'queens-local', ch: 4, kind: 'demo', title: 'Local search on 8 queens',
    blurb: 'Hill climbing, simulated annealing and a genetic algorithm try to place eight queens so none attacks another. Watch them get stuck, escape and evolve.',
    tags: ['hill climbing', 'local minimum', 'sideways moves', 'random restart', 'simulated annealing', 'genetic algorithm', 'min-conflicts'],
    how: [['The state space', '<p>Each state has one queen per column, so it is eight row numbers. The heuristic h is the number of pairs of queens attacking each other, directly or indirectly; a solution has h = 0. In hill-climbing mode, every empty square shows the h you would get by moving that column’s queen there, as in the book’s figure.</p>'],
      ['What to try', '<ul><li>Run plain hill climbing a few times: it often stops with h > 0 because no single move helps.</li><li>Allow 100 sideways moves and run again.</li><li>Open “Success rates” to measure how often each method succeeds over many random starts.</li></ul>'],
      ['Genetic algorithm', '<p>Strings are written the book’s way: the digit in position k is the row of the queen in column k, counted from the bottom. Fitness is the number of non-attacking pairs, 28 for a solution. The book’s example population (24748552, 32752411, 24415124, 32543213) has fitness 24, 23, 20 and 11.</p>']],
    mount(root, ctx) {
      const st = { mode: 'hc', side: 0, T0: 2, decay: 0.995, pm: 0.1, popn: 4 };
      const L = AI.layout(root);
      const box = AI.el('<div style="position:relative"></div>'); L.stage.classList.add('plain'); L.stage.appendChild(box);
      const pm = AI.panel(L.side, 'Method');
      const refs = AI.controls(pm, [{ t: 'seg', k: 'mode', opts: [['hc', 'Hill climbing'], ['sa', 'Annealing'], ['ga', 'Genetic'], ['exp', 'Success rates']] }, { t: 'row' },
        { t: 'select', k: 'side', label: 'Sideways moves allowed', opts: [[0, 'None (plain steepest ascent)'], [100, 'Up to 100']], grow: true },
        { t: 'range', k: 'T0', label: 'Start temperature T₀', min: 0.5, max: 6, step: 0.5, hide: true }, { t: 'range', k: 'decay', label: 'Cooling factor per step', min: 0.98, max: 0.999, step: 0.001, fmt: v => v.toFixed(3), hide: true },
        { t: 'select', k: 'popn', label: 'Population', opts: [[4, 'The book’s 4 strings'], [8, '8 random strings'], [20, '20 random strings']], hide: true }, { t: 'range', k: 'pm', label: 'Mutation probability', min: 0, max: 0.5, step: 0.05, hide: true },
        { t: 'row' }, { t: 'btn', label: 'New random start', icon: 'dice', cls: 'primary', on: () => run(true) }], st, () => { layoutMode(); run(false); });
      const pe = AI.panel(L.side, 'What happened'); const ex = AI.el('<div class="explain"></div>'); pe.appendChild(ex);
      const pstat = AI.panel(L.side, 'State'); const stats = AI.stats(pstat, [['h', 'attacking pairs h'], ['steps', 'moves so far'], ['t', 'temperature']]);
      const pc = AI.panel(L.below, 'h over time'); const chart = AI.chart(pc, ctx, { height: 180, yMin: 0, xLabel: 'step' });
      const pg = AI.panel(L.below, 'Population'); const popEl = AI.el('<div></div>'); pg.appendChild(popEl);
      const pexp = AI.panel(L.below, 'Success rates over 500 random starts'); const expBtn = AI.el('<button type="button" class="btn small">Run the experiment</button>'); pexp.appendChild(expBtn); const expOut = AI.el('<div style="margin-top:10px"></div>'); pexp.appendChild(expOut);
      const player = AI.Player(L.stageCol, ctx, (f, i) => show(f, i));
      let startState = Q.random(8, Math.random), frames = [], gaPop = [];
      function layoutMode() {
        refs.sideField.hidden = st.mode !== 'hc'; ['T0', 'decay'].forEach(k => refs[k + 'Field'].hidden = st.mode !== 'sa'); ['popn', 'pm'].forEach(k => refs[k + 'Field'].hidden = st.mode !== 'ga');
        pg.hidden = st.mode !== 'ga'; pexp.hidden = st.mode !== 'exp'; player.el.hidden = st.mode === 'exp';
      }
      function run(fresh) {
        if (fresh) startState = Q.random(8, Math.random);
        const r = AI.rng((Math.random() * 1e9) | 0);
        if (st.mode === 'hc') frames = Q.hillClimb(startState.slice(), r, st.side);
        else if (st.mode === 'sa') frames = Q.anneal(startState.slice(), r, st.T0, st.decay, 6000);
        else if (st.mode === 'ga') frames = gaFrames(r);
        else { frames = [{ st: startState, h: Q.h(startState), msg: 'Press “Run the experiment” to compare the methods.' }]; }
        player.set(frames); chart.set([{ name: st.mode === 'ga' ? 'best fitness' : 'h', color: 'var(--v-path)', values: frames.map(f => st.mode === 'ga' ? f.best : f.h) }], null);
      }
      function gaFrames(r) {
        const book = ['24748552', '32752411', '24415124', '32543213'];
        let pop = st.popn === 4 ? book.slice() : Array.from({ length: st.popn }, () => Array.from({ length: 8 }, () => 1 + ((r() * 8) | 0)).join(''));
        const out = []; const fit = p => p.map(E.ga.fitness);
        out.push({ pop: pop.slice(), fit: fit(pop), best: Math.max(...fit(pop)), gen: 0, msg: `Generation 0. ${st.popn === 4 ? 'The book’s four strings, with fitness 24, 23, 20 and 11.' : 'A random population.'} Selection picks parents with probability proportional to fitness.` });
        for (let g = 1; g <= 300; g++) {
          const { kids, log } = E.ga.step(pop, r, st.pm); pop = kids; const f = fit(pop), b = Math.max(...f);
          out.push({ pop: pop.slice(), fit: f, best: b, gen: g, log, msg: `Generation ${g}. Best fitness ${b} of 28.${b === 28 ? ' <b>A solution has evolved.</b>' : ''}` });
          if (b === 28) break;
        }
        return out;
      }
      function show(f, i) {
        let s; const W = box.clientWidth || 500;
        if (st.mode === 'ga') { const best = f.pop[f.fit.indexOf(f.best)]; s = board(W, best.split('').map(d => +d - 1)); ex.innerHTML = f.msg + ' The board shows the fittest string.'; stats.set('h', 28 - f.best); stats.set('steps', 'gen ' + f.gen); stats.set('t', '–'); renderPop(f); }
        else {
          const hv = st.mode === 'hc' && !f.done; const best = hv ? Math.min(...Q.neighbours(f.st).map(n => n.h)) : null;
          s = board(W, f.st, { hvals: hv, best, move: f.move }); ex.innerHTML = f.msg || '';
          stats.set('h', f.h, f.h === 0 ? 'good' : ''); stats.set('steps', i); stats.set('t', f.T != null ? f.T.toFixed(3) : '–');
        }
        box.innerHTML = `<svg viewBox="0 0 ${W} ${s.h}" width="${W}" height="${s.h}" style="display:block">${s.svg}</svg>`;
      }
      function renderPop(f) {
        popEl.innerHTML = AI.table(['String', 'r:Fitness', 'Fitness out of 28'], f.pop.map((p, k) => { const tot = f.fit.reduce((a, b) => a + b, 0); const lg = f.log && f.log[k]; return `<tr><td class="mono">${lg ? `${esc(p.slice(0, lg.c))}<span style="color:var(--v-path)">${esc(p.slice(lg.c))}</span>${lg.mut >= 0 ? ' <span class="muted small">mutated</span>' : ''}` : esc(p)}</td><td class="r">${f.fit[k]}</td><td style="min-width:110px"><span style="display:block;height:8px;border-radius:6px;background:var(--v-path);width:${(f.fit[k] / 28 * 100).toFixed(1)}%"></span><span class="small muted">${(f.fit[k] / tot * 100).toFixed(0)}% chance to be picked</span></td></tr>`; }), 'compact') + '<p class="tip" style="margin-top:6px">In each child, the part after the crossover point (in blue) came from the second parent.</p>';
      }
      expBtn.addEventListener('click', () => {
        expOut.innerHTML = '<p class="small muted">Running…</p>';
        ctx.after(30, () => {
          const r = AI.rng(31337), N = 500; const res = [];
          const trial = (name, fn) => { let ok = 0, steps = 0; for (let k = 0; k < N; k++) { const o = fn(); if (o.ok) ok++; steps += o.steps; } res.push([name, ok / N, steps / N]); };
          trial('Steepest-ascent hill climbing', () => { const f = Q.hillClimb(Q.random(8, r), r, 0); return { ok: f[f.length - 1].h === 0, steps: f.length - 2 }; });
          trial('… with up to 100 sideways moves', () => { const f = Q.hillClimb(Q.random(8, r), r, 100); return { ok: f[f.length - 1].h === 0, steps: f.length - 2 }; });
          trial('Random-restart hill climbing (up to 25 restarts)', () => { let steps = 0; for (let k = 0; k < 25; k++) { const f = Q.hillClimb(Q.random(8, r), r, 0); steps += f.length - 2; if (f[f.length - 1].h === 0) return { ok: true, steps }; } return { ok: false, steps }; });
          trial('Simulated annealing (T₀ = 2, ×0.995 per step)', () => { const f = Q.anneal(Q.random(8, r), r, 2, 0.995, 6000); return { ok: f[f.length - 1].h === 0, steps: f.length }; });
          trial('Min-conflicts (Chapter 6), up to 200 steps', () => { const o = E.minConflicts(8, r, 200); return { ok: o.ok, steps: o.steps }; });
          expOut.innerHTML = AI.table(['Method', 'r:Solved', 'r:Avg. moves'], res.map(([n, p, s]) => `<tr><td>${n}</td><td class="r">${(p * 100).toFixed(1)}%</td><td class="r">${s.toFixed(1)}</td></tr>`), 'compact') + '<p class="tip" style="margin-top:8px">Measured just now in your browser from random starting states, so the numbers vary a little each run. For annealing, moves counts recorded steps.</p>';
        });
      });
      ctx.resize(box, () => player.length && show(player.frame, player.index));
      layoutMode(); run(true);
    }
  });

  /* ---------- Foggy hills (game) ---------- */
  AI.lab({
    id: 'foggy-hills', ch: 4, kind: 'game', title: 'Foggy hills',
    blurb: 'Find the highest point of a landscape you cannot see, with 30 steps. Then compare yourself with hill climbing and simulated annealing on the same budget.',
    tags: ['state-space landscape', 'local maximum', 'random restart', 'simulated annealing'],
    how: [['How to play', '<ul><li>You see only the places you have visited. Step left or right with the buttons or arrow keys; each step reveals the height there.</li><li>“Jump” teleports you to a random spot, like a random restart. It also costs one step.</li><li>Your score is the highest point you found, as a share of the true summit.</li></ul>'],
      ['What it shows', '<p>This is the book’s state-space landscape in one dimension. Hill climbing only ever moves uphill, so it stops on whichever hill it started on. Annealing sometimes accepts downhill steps, and restarts sample new hills.</p>']],
    mount(root, ctx) {
      const N = 120, BUDGET = 30;
      const L = AI.layout(root);
      const box = AI.el('<div style="position:relative;aspect-ratio:2.4;min-height:220px"></div>'); L.stage.appendChild(box);
      const banner = AI.banner(L.stage);
      const bar = AI.el('<div class="player"></div>'); L.stageCol.appendChild(bar);
      const bL = AI.el(`<button type="button" class="btn">${AI.icon.back}<span>Step left</span></button>`), bR = AI.el(`<button type="button" class="btn">Step right${AI.icon.arrow}</button>`), bJ = AI.el(`<button type="button" class="btn">${AI.icon.dice}<span>Jump</span></button>`), bEnd = AI.el('<button type="button" class="btn primary">Finish and reveal</button>'), left = AI.el('<span class="count" style="margin-left:auto"></span>');
      bar.append(bL, bR, bJ, bEnd, left);
      const ps = AI.panel(L.side, 'Your climb'); const stats = AI.stats(ps, [['best', 'best height found'], ['left', 'steps left'], ['rec', 'best score']]);
      const pr = AI.panel(L.side, 'Results'); const res = AI.el('<div class="explain small">Finish to compare yourself with the algorithms.</div>'); pr.appendChild(res);
      const again = AI.el(`<button type="button" class="btn small" style="margin-top:10px">${AI.icon.dice}New landscape</button>`); pr.appendChild(again);
      let land, pos, seen, steps, over, trails;
      function start() { const seed = (Math.random() * 1e9) | 0; land = E.landscape(seed, N); pos = 10 + ((Math.random() * (N - 20)) | 0); seen = new Map([[pos, land[pos]]]); steps = 0; over = false; trails = null; res.innerHTML = 'Finish to compare yourself with the algorithms.'; draw(); }
      function move(to) { if (over || steps >= BUDGET) return; to = AI.clamp(to, 0, N - 1); steps++; pos = to; seen.set(pos, land[pos]); draw(); if (steps >= BUDGET) finish(); }
      function finish() {
        if (over) return; over = true; const mx = Math.max(...land), mine = Math.max(...seen.values());
        const r = AI.rng(7), start0 = [...seen.keys()][0];
        const hc = () => { let p = start0, best = land[p], used = 0, tr = [p]; while (used < BUDGET) { const nb = [p - 1, p + 1].filter(x => x >= 0 && x < N); const up = nb.filter(x => land[x] > land[p]); used += nb.length; if (!up.length) { p = (r() * N) | 0; used++; } else p = up.reduce((a, b) => land[a] > land[b] ? a : b); tr.push(p); best = Math.max(best, land[p]); } return { best, tr }; };
        const sa = () => { let p = start0, best = land[p], T = 20, tr = [p]; for (let k = 0; k < BUDGET; k++) { const q = AI.clamp(p + (r() < 0.5 ? -1 : 1) * (1 + ((r() * 3) | 0)), 0, N - 1); const d = land[q] - land[p]; if (d > 0 || r() < Math.exp(d / T)) p = q; T *= 0.9; tr.push(p); best = Math.max(best, land[p]); } return { best, tr }; };
        const H = hc(), S = sa(); trails = { hc: H.tr, sa: S.tr };
        const pct = x => Math.round(x / mx * 100);
        const better = AI.progress.best('foggy-hills', pct(mine));
        res.innerHTML = `<p style="margin:0 0 8px">The summit was <b>${mx.toFixed(1)}</b>.</p>` + AI.table(['Climber', 'r:Best found', 'r:Score'], [['You', mine], ['Hill climbing with restarts', H.best], ['Simulated annealing', S.best]].map(([n, v]) => `<tr><td>${n}</td><td class="r">${v.toFixed(1)}</td><td class="r">${pct(v)}%</td></tr>`), 'compact');
        banner(`${pct(mine)}% of the summit${better ? '<small>New personal best</small>' : ''}`, 2600); draw();
      }
      function draw() {
        const W = box.clientWidth, Hh = box.clientHeight; if (!W) return; const pad = 26, sx = (W - 2 * pad) / (N - 1), sy = v => Hh - 30 - v / 112 * (Hh - 60);
        let s = `<svg viewBox="0 0 ${W} ${Hh}" width="${W}" height="${Hh}" style="position:absolute;inset:0">`;
        s += `<rect x="0" y="0" width="${W}" height="${Hh}" fill="var(--bg2)"/>`;
        if (over) { s += `<path d="M${pad} ${Hh - 30}${land.map((v, i) => `L${pad + i * sx} ${sy(v)}`).join('')}L${pad + (N - 1) * sx} ${Hh - 30}Z" fill="var(--v-goal)" fill-opacity=".22" stroke="var(--v-goal)" stroke-width="2"/>`; const top = land.indexOf(Math.max(...land)); s += `<text x="${pad + top * sx}" y="${sy(land[top]) - 10}" text-anchor="middle" class="svg-t halo" style="font-weight:700">summit</text>`;
          [['hc', 'var(--v-path)'], ['sa', 'var(--v-chance)']].forEach(([k, c]) => { s += `<polyline points="${trails[k].map(i => `${pad + i * sx},${sy(land[i])}`).join(' ')}" fill="none" stroke="${c}" stroke-width="1.6" stroke-dasharray="4 3"/>`; }); }
        else { for (let k = 0; k < 18; k++) s += `<rect x="${(k * 97) % W}" y="${20 + (k * 53) % (Hh - 60)}" width="${80 + (k * 31) % 120}" height="14" rx="7" fill="var(--bg3)" opacity=".7"/>`; }
        for (const [i, v] of seen) s += `<line x1="${pad + i * sx}" x2="${pad + i * sx}" y1="${Hh - 30}" y2="${sy(v)}" stroke="var(--ink2)" stroke-width="${Math.max(2, sx * 0.7)}" stroke-linecap="round"/>`;
        const px = pad + pos * sx, py = sy(land[pos]);
        s += `<circle cx="${px}" cy="${py}" r="9" fill="var(--accent)" stroke="var(--bg)" stroke-width="3"/><text x="${px}" y="${py - 16}" text-anchor="middle" class="svg-t halo" style="font-weight:700">${land[pos].toFixed(1)}</text>`;
        s += `<line x1="${pad}" x2="${W - pad}" y1="${Hh - 30}" y2="${Hh - 30}" stroke="var(--line2)"/></svg>`;
        box.innerHTML = s;
        const best = Math.max(...seen.values()); stats.set('best', best.toFixed(1)); stats.set('left', BUDGET - steps); const b = AI.progress.best('foggy-hills'); stats.set('rec', b == null ? '–' : b + '%'); left.textContent = `${BUDGET - steps} steps left`;
      }
      bL.onclick = () => move(pos - 1); bR.onclick = () => move(pos + 1); bJ.onclick = () => move((Math.random() * N) | 0); bEnd.onclick = finish; again.onclick = start;
      ctx.key(e => { if (e.key === 'ArrowLeft') { e.preventDefault(); move(pos - 1); } else if (e.key === 'ArrowRight') { e.preventDefault(); move(pos + 1); } });
      ctx.resize(box, draw); ctx.theme(draw); start();
    }
  });
})(window);
