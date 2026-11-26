/* Chapter 18 labs: two-player normal-form games, the iterated prisoner's dilemma, voting rules, auctions. */
(function (G) {
  'use strict';
  const AI = G.AI, esc = AI.esc;

  /* ---------- analysis of 2×2 games: A[i][j] row payoff, B[i][j] column payoff ---------- */
  function analyse(g) {
    const A = g.A, B = g.B, rows = [0, 1], cols = [0, 1];
    const brRow = cols.map(j => rows.filter(i => A[i][j] >= Math.max(A[0][j], A[1][j]))); // row best responses to column j
    const brCol = rows.map(i => cols.filter(j => B[i][j] >= Math.max(B[i][0], B[i][1])));
    const pure = []; rows.forEach(i => cols.forEach(j => { if (brRow[j].includes(i) && brCol[i].includes(j)) pure.push([i, j]); }));
    const domRow = rows.find(i => cols.every(j => A[i][j] > A[1 - i][j])), domCol = cols.find(j => rows.every(i => B[i][j] > B[i][1 - j]));
    const pareto = []; rows.forEach(i => cols.forEach(j => { const better = rows.some(a => cols.some(b => A[a][b] >= A[i][j] && B[a][b] >= B[i][j] && (A[a][b] > A[i][j] || B[a][b] > B[i][j]))); if (!better) pareto.push([i, j]); }));
    let mixed = null; const dp = B[0][0] - B[0][1] - B[1][0] + B[1][1], dq = A[0][0] - A[0][1] - A[1][0] + A[1][1];
    if (Math.abs(dp) > 1e-12 && Math.abs(dq) > 1e-12) { const p = (B[1][1] - B[1][0]) / dp, q = (A[1][1] - A[0][1]) / dq; if (p > 1e-12 && p < 1 - 1e-12 && q > 1e-12 && q < 1 - 1e-12) { const vr = q * A[0][0] + (1 - q) * A[0][1], vc = p * B[0][0] + (1 - p) * B[1][0]; mixed = { p, q, vr, vc }; } }
    const zeroSum = rows.every(i => cols.every(j => Math.abs(A[i][j] + B[i][j]) < 1e-12));
    return { brRow, brCol, pure, domRow, domCol, pareto, mixed, zeroSum };
  }
  const frac = x => { for (let d = 1; d <= 60; d++) { const n = Math.round(x * d); if (Math.abs(n / d - x) < 1e-9) return d === 1 ? String(n) : `${n < 0 ? '−' : ''}${Math.abs(n)}/${d}`; } return x.toFixed(3); };
  const num = x => (x < 0 ? '−' : '') + Math.abs(+x.toFixed(3));
  AI._games2 = { analyse, frac };
  const GAMES = {
    pd: { name: 'Prisoner’s dilemma', rowP: 'Ali', colP: 'Bo', ra: ['testify', 'refuse'], ca: ['testify', 'refuse'], A: [[-5, 0], [-10, -1]], B: [[-5, -10], [0, -1]], note: 'The book’s version: payoffs are minus the years in prison. Testifying is a dominant strategy for both, so (testify, testify) is the only equilibrium, yet both would be better off refusing. The equilibrium is not Pareto optimal.' },
    morra: { name: 'Two-finger Morra', rowP: 'E (even)', colP: 'O (odd)', ra: ['one', 'two'], ca: ['one', 'two'], A: [[2, -3], [-3, 4]], B: [[-2, 3], [3, -4]], note: 'The book’s zero-sum example. Each player shows one or two fingers; if the total f is even, O pays E f dollars, otherwise E pays O f. There is no pure equilibrium. Each should show one finger with probability 7/12, and the game is worth −1/12 to E.' },
    pennies: { name: 'Matching pennies', rowP: 'Row', colP: 'Column', ra: ['heads', 'tails'], ca: ['heads', 'tails'], A: [[1, -1], [-1, 1]], B: [[-1, 1], [1, -1]], note: 'Row wins if the coins match, Column if they differ. The only equilibrium is for both to randomise 50:50.' },
    meet: { name: 'Where shall we meet?', rowP: 'Row', colP: 'Column', ra: ['café', 'library'], ca: ['café', 'library'], A: [[2, 0], [0, 1]], B: [[2, 0], [0, 1]], note: 'A coordination game (illustrative numbers). Both pure outcomes where the players match are equilibria, and there is also a mixed one. (café, café) is better for both: it Pareto-dominates the other equilibrium.' }
  };

  AI.lab({
    id: 'normal-form', ch: 18, kind: 'demo', title: 'Two-player games: dominance, Nash equilibria, mixed strategies',
    blurb: 'Analyse a 2×2 game in normal form. Arrows show which way each player wants to move; equilibria are where no arrow leaves. Includes the book’s prisoner’s dilemma and two-finger Morra.',
    tags: ['game theory', 'normal form', 'dominant strategy', 'Nash equilibrium', 'mixed strategy', 'Pareto optimality', 'zero-sum game'],
    how: [['Reading the table', '<p>Each cell shows the payoff to the row player first and to the column player second. A vertical arrow in a cell means the row player would gain by switching rows; a horizontal one means the column player would gain by switching columns. A cell with no arrows leaving it is a pure-strategy <b>Nash equilibrium</b>: neither player can do better by changing alone.</p>'],
      ['Mixed strategies', '<p>When there is no pure equilibrium, players randomise. At a mixed equilibrium each player chooses probabilities that make the <i>other</i> player indifferent between their actions. The lower chart shows this: the row player’s two lines cross exactly at the column player’s equilibrium probability.</p>'],
      ['Edit the game', '<p>Change any payoff to build your own game. The analysis updates as you type.</p>']],
    mount(root, ctx) {
      const st = { g: 'pd' }; let g = JSON.parse(JSON.stringify(GAMES.pd)), An;
      const Ln = AI.layout(root);
      const sv = AI.svgHost(Ln.stage, ctx, (w, h) => draw(w, h));
      const pc = AI.panel(Ln.side, 'Game');
      AI.controls(pc, [{ t: 'select', k: 'g', label: '', opts: Object.keys(GAMES).map(k => [k, GAMES[k].name]), str: true }], st, () => { g = JSON.parse(JSON.stringify(GAMES[st.g])); edit(); run(); });
      const pe = AI.panel(Ln.side, 'Payoffs (row, column)'); const ed = AI.el('<div style="display:grid;grid-template-columns:auto 1fr 1fr;gap:6px;align-items:center;font-size:14px"></div>'); pe.appendChild(ed);
      const pa = AI.panel(Ln.side, 'Analysis'); const out = AI.el('<div class="explain small"></div>'); pa.appendChild(out);
      const pm = AI.panel(Ln.below, 'Finding the mixed equilibrium'); const mbox = AI.el('<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px"></div>'); pm.appendChild(mbox);
      const c1 = AI.el('<div></div>'), c2 = AI.el('<div></div>'); mbox.append(c1, c2);
      const ch1 = AI.chart(c1, ctx, { height: 220, xLabel: 'probability the column player plays its first action', xs: i => (i / 20).toFixed(1), right: 110 });
      const ch2 = AI.chart(c2, ctx, { height: 220, xLabel: 'probability the row player plays its first action', xs: i => (i / 20).toFixed(1), right: 110 });
      const mnote = AI.el('<p class="small muted" style="margin:8px 0 0"></p>'); pm.appendChild(mnote);
      function edit() {
        ed.innerHTML = `<span></span><b class="small">${esc(g.colP)}: ${esc(g.ca[0])}</b><b class="small">${esc(g.colP)}: ${esc(g.ca[1])}</b>` + [0, 1].map(i => `<b class="small">${esc(g.rowP)}: ${esc(g.ra[i])}</b>` + [0, 1].map(j => `<span style="display:flex;gap:4px"><input type="number" step="1" data-p="A${i}${j}" value="${g.A[i][j]}" style="width:100%;min-width:0" aria-label="row payoff"><input type="number" step="1" data-p="B${i}${j}" value="${g.B[i][j]}" style="width:100%;min-width:0" aria-label="column payoff"></span>`).join('')).join('');
        ed.querySelectorAll('input').forEach(inp => inp.oninput = () => { const v = parseFloat(inp.value); if (!isFinite(v)) return; const [M, i, j] = [inp.dataset.p[0], +inp.dataset.p[1], +inp.dataset.p[2]]; g[M][i][j] = v; g.note = ''; run(); });
      }
      function draw(w, h) {
        if (!An) return '';
        const L = Math.min(150, w * 0.22), T = 56, cw = (w - L - 16) / 2, chh = (h - T - 16) / 2;
        let s = AI.arrowDefs('nfA', 'var(--accent)');
        s += `<text x="${L + cw}" y="22" text-anchor="middle" class="svg-b" style="font-size:16px">${esc(g.colP)}</text>`;
        [0, 1].forEach(j => s += `<text x="${L + cw * (j + 0.5)}" y="${T - 10}" text-anchor="middle" class="svg-t">${esc(g.ca[j])}</text>`);
        s += `<text x="16" y="${T + chh}" class="svg-b" style="font-size:16px">${esc(g.rowP)}</text>`;
        [0, 1].forEach(i => s += `<text x="${L - 12}" y="${T + chh * (i + 0.5) + 5}" text-anchor="end" class="svg-t">${esc(g.ra[i])}</text>`);
        [0, 1].forEach(i => [0, 1].forEach(j => {
          const x = L + j * cw, y = T + i * chh, ne = An.pure.some(([a, b]) => a === i && b === j), par = An.pareto.some(([a, b]) => a === i && b === j);
          s += `<rect x="${x + 3}" y="${y + 3}" width="${cw - 6}" height="${chh - 6}" rx="10" fill="${ne ? 'color-mix(in srgb,var(--v-goal) 18%,var(--bg))' : 'var(--bg)'}" stroke="${ne ? 'var(--v-goal)' : 'var(--line2)'}" stroke-width="${ne ? 3 : 1.5}"/>`;
          s += `<text x="${x + cw / 2 - 8}" y="${y + chh / 2 + 9}" text-anchor="end" class="svg-b" style="font-size:${Math.min(28, cw * 0.12)}px" fill="var(--v-path)">${num(g.A[i][j])}</text><text x="${x + cw / 2}" y="${y + chh / 2 + 9}" text-anchor="middle" class="svg-t" style="font-size:20px">,</text><text x="${x + cw / 2 + 8}" y="${y + chh / 2 + 9}" class="svg-b" style="font-size:${Math.min(28, cw * 0.12)}px" fill="var(--accent)">${num(g.B[i][j])}</text>`;
          const tags = [ne ? 'Nash equilibrium' : '', par ? 'Pareto optimal' : ''].filter(Boolean).join(' · ');
          if (tags) s += `<text x="${x + cw / 2}" y="${y + chh - 16}" text-anchor="middle" class="svg-s">${tags}</text>`;
          if (g.A[1 - i][j] > g.A[i][j]) { const dy = (1 - i) - i; s += `<line x1="${x + 26}" y1="${y + chh / 2 - dy * 6}" x2="${x + 26}" y2="${y + chh / 2 + dy * chh * 0.34}" stroke="var(--accent)" stroke-width="3" marker-end="url(#nfA)"/>`; }
          if (g.B[i][1 - j] > g.B[i][j]) { const dx = (1 - j) - j; s += `<line x1="${x + cw / 2 - dx * 10}" y1="${y + 26}" x2="${x + cw / 2 + dx * cw * 0.36}" y2="${y + 26}" stroke="var(--accent)" stroke-width="3" marker-end="url(#nfA)"/>`; }
        }));
        return s;
      }
      function run() {
        An = analyse(g); sv.redraw();
        const cell = ([i, j]) => `(${esc(g.ra[i])}, ${esc(g.ca[j])})`;
        let t = '';
        t += `<p style="margin:0 0 8px"><b>Dominant strategies.</b> ${g.rowP}: ${An.domRow != null ? `<b>${esc(g.ra[An.domRow])}</b>` : 'none'}. ${g.colP}: ${An.domCol != null ? `<b>${esc(g.ca[An.domCol])}</b>` : 'none'}.</p>`;
        t += `<p style="margin:0 0 8px"><b>Pure Nash equilibria.</b> ${An.pure.length ? An.pure.map(cell).join(', ') : 'none'}.</p>`;
        t += `<p style="margin:0 0 8px"><b>Mixed equilibrium.</b> ${An.mixed ? `${esc(g.rowP)} plays ${esc(g.ra[0])} with probability ${frac(An.mixed.p)}, ${esc(g.colP)} plays ${esc(g.ca[0])} with probability ${frac(An.mixed.q)}. Expected payoffs ${frac(An.mixed.vr)} and ${frac(An.mixed.vc)}.` : 'none with both players randomising.'}</p>`;
        t += `<p style="margin:0 0 8px"><b>Pareto optimal outcomes.</b> ${An.pareto.map(cell).join(', ')}.</p>`;
        if (An.zeroSum) t += `<p style="margin:0 0 8px"><b>Zero-sum.</b> The payoffs always add to zero, so the maximin value is the value of the game${An.mixed ? `: ${frac(An.mixed.vr)} to ${esc(g.rowP)}` : ''}.</p>`;
        if (g.note) t += `<p class="muted" style="margin:0">${esc(g.note)}</p>`;
        out.innerHTML = t;
        const qs = AI.range(21).map(k => k / 20);
        ch1.set([{ name: `${g.rowP}: ${g.ra[0]}`, color: 'var(--v-path)', values: qs.map(q => q * g.A[0][0] + (1 - q) * g.A[0][1]) }, { name: `${g.rowP}: ${g.ra[1]}`, color: 'var(--v-chance)', values: qs.map(q => q * g.A[1][0] + (1 - q) * g.A[1][1]), dash: '6 4' }], An.mixed ? (X, Y, gg) => `<line x1="${X(An.mixed.q * 20)}" x2="${X(An.mixed.q * 20)}" y1="${gg.T}" y2="${gg.T + gg.ih}" stroke="var(--accent)" stroke-dasharray="3 4"/>` : null);
        ch2.set([{ name: `${g.colP}: ${g.ca[0]}`, color: 'var(--accent)', values: qs.map(p => p * g.B[0][0] + (1 - p) * g.B[1][0]) }, { name: `${g.colP}: ${g.ca[1]}`, color: 'var(--v-goal)', values: qs.map(p => p * g.B[0][1] + (1 - p) * g.B[1][1]), dash: '6 4' }], An.mixed ? (X, Y, gg) => `<line x1="${X(An.mixed.p * 20)}" x2="${X(An.mixed.p * 20)}" y1="${gg.T}" y2="${gg.T + gg.ih}" stroke="var(--accent)" stroke-dasharray="3 4"/>` : null);
        mnote.textContent = An.mixed ? `Left: the row player’s expected payoff for each action, as the column player’s mixing probability varies. The lines cross at ${frac(An.mixed.q)}, so at that probability the row player is indifferent and is willing to randomise. Right: the same for the column player, crossing at ${frac(An.mixed.p)}.` : 'Left: the row player’s expected payoff for each action as the column player mixes. Right: the same for the column player. Where one line is above the other everywhere, that action dominates and no mixing happens.';
      }
      edit(); run();
    }
  });

  /* =====================================================================
     The iterated prisoner's dilemma: identify the opponent, then run a tournament
     ===================================================================== */
  const PAY = { CC: [-1, -1], CD: [-10, 0], DC: [0, -10], DD: [-5, -5] }; // C = refuse (cooperate), D = testify (defect); [me, them]
  const STRATS = {
    tft: { s: 'TFT', name: 'Tit-for-tat', d: 'Refuses first, then copies your previous move.', f: (me, op) => op.length ? op[op.length - 1] : 'C' },
    alld: { s: 'All-T', name: 'Always testify', d: 'Testifies every round.', f: () => 'D' },
    allc: { s: 'All-R', name: 'Always refuse', d: 'Refuses every round.', f: () => 'C' },
    grim: { s: 'Grim', name: 'Grim trigger', d: 'Refuses until you testify once, then testifies for ever (perpetual punishment).', f: (me, op) => op.includes('D') ? 'D' : 'C' },
    tf2t: { s: 'TF2T', name: 'Tit-for-two-tats', d: 'Testifies only after you have testified twice in a row.', f: (me, op) => op.length >= 2 && op[op.length - 1] === 'D' && op[op.length - 2] === 'D' ? 'D' : 'C' },
    wsls: { s: 'WSLS', name: 'Win-stay, lose-shift', d: 'Refuses first. Repeats its last move after a good outcome (−1 or 0), switches after a bad one (−5 or −10).', f: (me, op) => { if (!me.length) return 'C'; const a = me[me.length - 1], b = op[op.length - 1]; const p = PAY[a + b][0]; return p >= -1 ? a : (a === 'C' ? 'D' : 'C'); } },
    rand: { s: 'Random', name: 'Random', d: 'Testifies or refuses with equal probability.', f: (me, op, r) => r() < 0.5 ? 'C' : 'D' }
  };
  function match(s1, s2, n, noise, r) { const a = [], b = []; let p1 = 0, p2 = 0; for (let t = 0; t < n; t++) { let x = STRATS[s1].f(a, b, r), y = STRATS[s2].f(b, a, r); if (noise && r() < noise) x = x === 'C' ? 'D' : 'C'; if (noise && r() < noise) y = y === 'C' ? 'D' : 'C'; a.push(x); b.push(y); p1 += PAY[x + y][0]; p2 += PAY[x + y][1]; } return { a, b, p1, p2 }; }
  AI._ipd = { match, STRATS, PAY };
  AI.lab({
    id: 'ipd', ch: 18, kind: 'game', title: 'The repeated prisoner’s dilemma',
    blurb: 'Play ten rounds of the prisoner’s dilemma against a hidden strategy and work out which one it is. Then run a round-robin tournament of classic strategies, with or without mistakes.',
    tags: ['repeated games', 'prisoner’s dilemma', 'tit-for-tat', 'perpetual punishment', 'tournament'],
    how: [['Payoffs', '<p>The book’s prisoner’s dilemma: both refuse −1 each; both testify −5 each; if one testifies and the other refuses, the testifier gets 0 and the other −10. Payoffs add up over the rounds, so higher (closer to zero) is better.</p>'],
      ['Why repetition matters', '<p>In a single round, testifying dominates. When the game repeats and future rounds matter, strategies that punish testifying, such as tit-for-tat or perpetual punishment, can make mutual refusal stable.</p>'],
      ['Noise', '<p>With noise, each intended move is flipped by mistake with the given probability. Strategies that never forgive suffer most from accidental testimony.</p>']],
    mount(root, ctx) {
      const st = { mode: 'play', rounds: 50, noise: 0 };
      const Li = AI.layout(root);
      const body = AI.el('<div style="padding:clamp(14px,2.4vw,26px);display:grid;gap:14px"></div>'); Li.stage.appendChild(body); Li.stage.classList.add('plain');
      const pm = AI.panel(Li.side, 'Mode');
      const refs = AI.controls(pm, [{ t: 'seg', k: 'mode', label: '', opts: [['play', 'Identify the opponent'], ['tour', 'Tournament']] }, { t: 'row' }, { t: 'range', k: 'rounds', label: 'Rounds per match', min: 5, max: 200, step: 5 }, { t: 'range', k: 'noise', label: 'Noise (chance a move is flipped)', min: 0, max: 0.2, step: 0.01, fmt: v => v.toFixed(2) }, { t: 'row' }, { t: 'btn', label: 'Run tournament', icon: 'play', cls: 'primary', id: 'go', on: () => tour() }], st, k => { if (k === 'mode') layout(); });
      const ps = AI.panel(Li.side, 'Score'); const stats = AI.stats(ps, [['you', 'your total'], ['them', 'opponent total'], ['id', 'identified']]);
      let opp, me, op, done, ident = AI.store.get('ipd-ident', [0, 0]);
      function layout() { const play = st.mode === 'play'; refs.roundsField.hidden = play; refs.noiseField.hidden = play; refs.go.hidden = play; ps.hidden = !play; if (play) newMatch(); else { body.innerHTML = '<p class="lede" style="margin:0">Every strategy plays every other strategy, and a copy of itself, for the chosen number of rounds. Press Run tournament.</p>'; } }
      function newMatch() { const ks = Object.keys(STRATS); opp = AI.pick(ks); me = []; op = []; done = false; draw(); }
      function draw() {
        const tot = me.reduce((s, x, i) => s + PAY[x + op[i]][0], 0), tt = me.reduce((s, x, i) => s + PAY[x + op[i]][1], 0);
        stats.set('you', tot); stats.set('them', tt); stats.set('id', `${ident[0]} / ${ident[1]}`);
        const row = (arr, who) => `<div style="display:grid;grid-template-columns:90px repeat(10,minmax(0,1fr));gap:4px;align-items:center"><b class="small">${who}</b>${AI.range(10).map(k => { const x = arr[k]; return `<span style="height:34px;border-radius:8px;display:grid;place-items:center;font-size:12px;font-weight:600;${x ? (x === 'C' ? 'background:color-mix(in srgb,var(--ok) 22%,var(--bg));' : 'background:color-mix(in srgb,var(--bad) 20%,var(--bg));') : 'border:1px dashed var(--line2);'}">${x ? (x === 'C' ? 'refuse' : 'testify') : k + 1}</span>`; }).join('')}</div>`;
        body.innerHTML = `<p class="lede" style="margin:0">Round ${Math.min(me.length + 1, 10)} of 10. You are Ali; Bo follows one of seven fixed strategies.</p>${row(me, 'You')}${row(op, 'Opponent')}` + (me.length < 10 ? `<div style="display:flex;gap:10px;flex-wrap:wrap"><button type="button" class="btn primary" data-m="C">Refuse</button><button type="button" class="btn" data-m="D">Testify</button></div>` : `<div class="note-block"><h4>Which strategy was the opponent playing?</h4><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px">${Object.keys(STRATS).map(k => `<button type="button" class="pick" data-g="${k}" style="padding:10px 12px"><b>${STRATS[k].name}</b><span class="small muted">${STRATS[k].d}</span></button>`).join('')}</div><div data-fb style="margin-top:10px"></div></div>`);
        body.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { const r = AI.rng((Math.random() * 1e9) | 0); const y = STRATS[opp].f(op, me, r); me.push(b.dataset.m); op.push(y); draw(); });
        body.querySelectorAll('[data-g]').forEach(b => b.onclick = () => {
          if (done) return; done = true; const ok = b.dataset.g === opp; ident = [ident[0] + (ok ? 1 : 0), ident[1] + 1]; AI.store.set('ipd-ident', ident); b.setAttribute('aria-pressed', 'true');
          body.querySelectorAll('[data-g]').forEach(x => { x.disabled = true; if (x.dataset.g === opp) x.style.borderColor = 'var(--ok)'; });
          // which strategies are consistent with the moves seen?
          const fits = Object.keys(STRATS).filter(k => k !== 'rand' && op.every((y, i) => STRATS[k].f(op.slice(0, i), me.slice(0, i)) === y));
          const fb = body.querySelector('[data-fb]'); fb.innerHTML = `<p style="margin:0 0 8px"><b>${ok ? 'Correct.' : 'Not quite.'}</b> The opponent was <b>${STRATS[opp].name}</b>. ${fits.length > 1 ? `Your moves could not tell apart: ${fits.map(k => STRATS[k].name).join(', ')}. Try moves that make them behave differently.` : fits.length === 1 && opp !== 'rand' ? 'Its moves matched only this deterministic strategy.' : ''}${opp === 'rand' && fits.length ? ' (A random player can, by chance, look like a fixed strategy.)' : ''}</p><button type="button" class="btn primary">${AI.icon.reset}<span>New opponent</span></button>`;
          fb.querySelector('button').onclick = newMatch; stats.set('id', `${ident[0]} / ${ident[1]}`);
        });
      }
      function tour() {
        const ks = Object.keys(STRATS), r = AI.rng(2024), tot = {}, wins = {}; ks.forEach(k => { tot[k] = 0; wins[k] = 0; });
        const grid = {}; ks.forEach(a => { grid[a] = {}; });
        ks.forEach((a, i) => ks.forEach((b, j) => { if (j < i) return; let s1 = 0, s2 = 0; const reps = 20; for (let k = 0; k < reps; k++) { const m = match(a, b, st.rounds, st.noise, r); s1 += m.p1; s2 += m.p2; } s1 /= reps; s2 /= reps; grid[a][b] = s1; grid[b][a] = s2; tot[a] += s1; if (a !== b) tot[b] += s2; }));
        const order = ks.slice().sort((a, b) => tot[b] - tot[a]);
        body.innerHTML = `<p class="small muted" style="margin:0">Average score per match over 20 repeats, ${st.rounds} rounds each, noise ${st.noise.toFixed(2)}. Each row is the score of that strategy against the column strategy. Higher is better. Column codes: ${order.map(k => `${STRATS[k].s} = ${STRATS[k].name}`).join('; ')}.</p>` + AI.table(['Strategy'].concat(order.map(k => 'r:' + STRATS[k].s)).concat(['r:Total']), order.map(a => `<tr><td><b>${STRATS[a].name}</b></td>${order.map(b => `<td class="r">${grid[a][b].toFixed(0)}</td>`).join('')}<td class="r"><b>${tot[a].toFixed(0)}</b></td></tr>`), 'compact') + `<p class="small" style="margin:8px 0 0">Ranking: ${order.map((k, i) => `${i + 1}. ${STRATS[k].name}`).join(' · ')}.</p><p class="small muted" style="margin:4px 0 0">Scores depend on who else is in the tournament: a strategy that does well here can do badly in a different population. Raise the noise to see which strategies cope with mistakes.</p>`;
      }
      layout();
    }
  });

  /* =====================================================================
     Voting: plurality, Borda, instant runoff and pairwise majority
     ===================================================================== */
  const RANKS = ['ABC', 'ACB', 'BAC', 'BCA', 'CAB', 'CBA'];
  function tally(cnt) {
    const C = ['A', 'B', 'C'], n = RANKS.reduce((s, r) => s + cnt[r], 0);
    const plur = {}, borda = {}; C.forEach(c => { plur[c] = 0; borda[c] = 0; });
    RANKS.forEach(r => { plur[r[0]] += cnt[r]; borda[r[0]] += 2 * cnt[r]; borda[r[1]] += cnt[r]; });
    const pair = {}; C.forEach(x => C.forEach(y => { if (x !== y) pair[x + y] = RANKS.reduce((s, r) => s + (r.indexOf(x) < r.indexOf(y) ? cnt[r] : 0), 0); }));
    const condorcet = C.find(x => C.every(y => y === x || pair[x + y] > pair[y + x])) || null;
    // instant runoff: eliminate the candidate with fewest first preferences (ties broken alphabetically last)
    let alive = C.slice(); const rounds = [];
    while (alive.length > 1) { const fp = {}; alive.forEach(c => fp[c] = 0); RANKS.forEach(r => { const top = r.split('').find(c => alive.includes(c)); fp[top] += cnt[r]; }); rounds.push(Object.assign({}, fp)); const maj = alive.find(c => fp[c] * 2 > n); if (maj) { alive = [maj]; break; } const lo = Math.min(...alive.map(c => fp[c])); const out = alive.filter(c => fp[c] === lo).sort().pop(); alive = alive.filter(c => c !== out); }
    const win = obj => { const m = Math.max(...C.map(c => obj[c])); const w = C.filter(c => obj[c] === m); return w.length === 1 ? w[0] : 'tie: ' + w.join(', '); };
    return { n, plur, borda, pair, condorcet, irv: alive[0], rounds, wPlur: win(plur), wBorda: win(borda) };
  }
  AI._vote = tally;
  const VPRE = {
    cycle: { name: 'Condorcet’s paradox', c: { ABC: 1, ACB: 0, BAC: 0, BCA: 1, CAB: 1, CBA: 0 }, note: 'Three voters. A beats B, B beats C, and C beats A by majority: the group’s preferences go round in a circle even though every voter is consistent.' },
    split: { name: 'Plurality disagrees', c: { ABC: 4, ACB: 0, BAC: 0, BCA: 3, CAB: 0, CBA: 2 }, note: 'Plurality elects A with 4 of 9 first places, yet a majority prefers B to A and B to C. Borda and instant runoff both elect B, the Condorcet winner.' },
    rules: { name: 'Three rules, three winners', c: { ABC: 4, ACB: 0, BAC: 0, BCA: 2, CAB: 0, CBA: 3 }, note: 'Plurality elects A, instant runoff elects C, and the Borda count elects B, who is also the Condorcet winner: B beats both A and C head to head. B has the fewest first places, which is exactly why instant runoff eliminates B first.' },
    custom: { name: 'Your own electorate', c: { ABC: 3, ACB: 1, BAC: 2, BCA: 3, CAB: 1, CBA: 2 }, note: '' }
  };
  AI.lab({
    id: 'voting', ch: 18, kind: 'demo', title: 'Voting rules can disagree',
    blurb: 'Set how many voters hold each ranking of three candidates and compare plurality, Borda count, instant runoff and pairwise majority. Find Condorcet’s paradox.',
    tags: ['social choice', 'voting', 'Borda count', 'instant runoff', 'Condorcet winner', 'Arrow’s theorem'],
    how: [['The rules', '<ul><li><b>Plurality</b>: most first places wins.</li><li><b>Borda count</b>: with three candidates, 2 points for first place, 1 for second, 0 for third.</li><li><b>Instant runoff</b>: repeatedly eliminate the candidate with the fewest first places, moving those ballots to their next choice, until someone has a majority.</li><li><b>Condorcet winner</b>: a candidate who beats every other in a head-to-head majority vote. There may not be one.</li></ul>'],
      ['Why they disagree', '<p>Arrow’s impossibility theorem says that no ranking rule for three or more candidates satisfies a small set of reasonable conditions at once, unless it is a dictatorship. Each rule here gives up something different.</p>']],
    mount(root, ctx) {
      const st = { p: 'split' }; let cnt = Object.assign({}, VPRE.split.c);
      const Lv = AI.layout(root);
      const body = AI.el('<div style="padding:clamp(14px,2.4vw,26px);display:grid;gap:14px"></div>'); Lv.stage.appendChild(body); Lv.stage.classList.add('plain');
      const pp = AI.panel(Lv.side, 'Electorate');
      AI.controls(pp, [{ t: 'select', k: 'p', label: '', opts: Object.keys(VPRE).map(k => [k, VPRE[k].name]), str: true }], st, () => { cnt = Object.assign({}, VPRE[st.p].c); edit(); run(); });
      const ed = AI.el('<div style="display:grid;grid-template-columns:1fr 90px;gap:6px;align-items:center;margin-top:8px"></div>'); pp.appendChild(ed);
      function edit() { ed.innerHTML = RANKS.map(r => `<span class="mono">${r.split('').join(' ≻ ')}</span><input type="number" min="0" max="999" step="1" value="${cnt[r]}" data-r="${r}" aria-label="voters ranking ${r}">`).join(''); ed.querySelectorAll('input').forEach(inp => inp.oninput = () => { const v = Math.max(0, Math.floor(+inp.value || 0)); cnt[inp.dataset.r] = v; run(); }); }
      function run() {
        const T = tally(cnt), C = ['A', 'B', 'C'];
        if (!T.n) { body.innerHTML = '<p class="lede">Add some voters.</p>'; return; }
        const bars = (obj, mx) => C.map(c => `<div style="display:grid;grid-template-columns:24px minmax(0,1fr) 48px;gap:8px;align-items:center"><b>${c}</b><span style="height:14px;background:var(--bg3);border-radius:7px;overflow:hidden"><i style="display:block;height:100%;width:${mx ? obj[c] / mx * 100 : 0}%;background:var(--v-path)"></i></span><span class="num" style="text-align:right">${obj[c]}</span></div>`).join('');
        const mp = Math.max(...C.map(c => T.plur[c])), mb = Math.max(...C.map(c => T.borda[c]));
        const pairRows = [['A', 'B'], ['A', 'C'], ['B', 'C']].map(([x, y]) => `<tr><td>${x} vs ${y}</td><td class="r">${T.pair[x + y]} : ${T.pair[y + x]}</td><td>${T.pair[x + y] > T.pair[y + x] ? x : T.pair[x + y] < T.pair[y + x] ? y : 'tie'}</td></tr>`);
        body.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px">
          <div class="note-block" style="border:0;padding:0"><h4>Plurality <span class="chip">${esc(T.wPlur)}</span></h4>${bars(T.plur, mp)}</div>
          <div class="note-block" style="border:0;padding:0"><h4>Borda count <span class="chip">${esc(T.wBorda)}</span></h4>${bars(T.borda, mb)}</div>
          <div class="note-block" style="border:0;padding:0"><h4>Instant runoff <span class="chip">${esc(T.irv)}</span></h4>${T.rounds.map((r, i) => `<p class="small" style="margin:0 0 4px">Round ${i + 1}: ${Object.keys(r).map(c => `${c} ${r[c]}`).join(', ')}</p>`).join('')}</div>
          <div class="note-block" style="border:0;padding:0"><h4>Head to head <span class="chip">${T.condorcet ? 'Condorcet winner ' + T.condorcet : 'no Condorcet winner'}</span></h4>${AI.table(['Pair', 'r:Votes', 'Majority'], pairRows, 'compact')}</div></div>
          <p class="small muted" style="margin:0">${T.n} voters. ${VPRE[st.p].note && JSON.stringify(cnt) === JSON.stringify(VPRE[st.p].c) ? esc(VPRE[st.p].note) : ''} ${!T.condorcet && C.every(x => C.some(y => y !== x && T.pair[y + x] > T.pair[x + y])) ? '<b>The majority preferences form a cycle.</b>' : ''} Ties in instant runoff are broken by eliminating the alphabetically last candidate.</p>`;
      }
      edit(); run();
    }
  });

  /* =====================================================================
     Auctions: first-price and second-price (Vickrey) sealed bids
     ===================================================================== */
  // Opponents' values are uniform on [0, 100]. Second price: opponents bid their values.
  // First price: opponents bid the symmetric equilibrium (n − 1)/n × value.
  function euBid(fmt, v, b, n) {
    const m = n - 1; if (b <= 0) return 0;
    if (fmt === 'second') { const x = Math.min(b, 100) / 100; return 100 * ((v / 100) * Math.pow(x, m) - (m / (m + 1)) * Math.pow(x, m + 1)); }
    const x = Math.min(1, b * n / (n - 1) / 100); return (v - b) * Math.pow(x, m);
  }
  AI._auction = { euBid };
  AI.lab({
    id: 'auctions', ch: 18, kind: 'game', title: 'Sealed-bid auctions: how much should you bid?',
    blurb: 'You value an item and bid against rivals. In a second-price auction your best bid is your true value; in a first-price auction you should shade it. Explore the expected payoff of every bid, then play ten rounds.',
    tags: ['mechanism design', 'auctions', 'Vickrey auction', 'truth-revealing', 'revenue equivalence'],
    how: [['The set-up', '<p>Each rival’s value for the item is uniform between 0 and 100 and known only to them. In the <b>second-price</b> (Vickrey) auction the highest bidder wins and pays the second-highest bid; rivals bid their true values. In the <b>first-price</b> auction the winner pays its own bid; rivals use the equilibrium bid (n − 1)/n × value. Your payoff is value minus price if you win, 0 otherwise.</p>'],
      ['What the curves show', '<p>Your expected payoff for every possible bid, worked out exactly. In the second-price auction it peaks at your true value whatever the number of rivals: bidding truthfully is a dominant strategy, which is why the Vickrey auction is called truth-revealing. In the first-price auction it peaks at (n − 1)/n × your value.</p>'],
      ['Revenue', '<p>With these assumptions both formats bring the seller the same expected revenue, (n − 1)/(n + 1) × 100, an instance of the revenue equivalence theorem.</p>']],
    mount(root, ctx) {
      const st = { mode: 'explore', v: 70, n: 4 };
      const La = AI.layout(root);
      const body = AI.el('<div style="padding:clamp(12px,2vw,22px)"></div>'); La.stage.appendChild(body); La.stage.classList.add('plain');
      const pm = AI.panel(La.side, 'Mode');
      const refs = AI.controls(pm, [{ t: 'seg', k: 'mode', label: '', opts: [['explore', 'Explore'], ['play', 'Play ten rounds']] }, { t: 'row' }, { t: 'range', k: 'v', label: 'Your value for the item', min: 1, max: 100, step: 1 }, { t: 'range', k: 'n', label: 'Bidders including you', min: 2, max: 10, step: 1 }], st, k => { if (k === 'mode') { refs.vField.hidden = st.mode === 'play'; ps.hidden = st.mode === 'play'; if (st.mode === 'play') newGame(); else explore(); } else if (st.mode === 'explore') explore(); else if (k === 'n' && game && game.k === 0) roundUI(); });
      const ps = AI.panel(La.side, 'Numbers'); const stats = AI.stats(ps, [['b2', 'best bid, second price'], ['b1', 'best bid, first price'], ['rev', 'expected revenue']]);
      const cbox = AI.el('<div></div>');
      const chart = AI.chart(cbox, ctx, { height: 300, xLabel: 'your bid', xs: i => i, right: 130 });
      function explore() {
        body.innerHTML = ''; body.appendChild(cbox);
        const bids = AI.range(101), e2 = bids.map(b => euBid('second', st.v, b, st.n)), e1 = bids.map(b => euBid('first', st.v, b, st.n));
        const a2 = bids.reduce((bi, b) => e2[b] > e2[bi] + 1e-12 ? b : bi, 0), a1 = bids.reduce((bi, b) => e1[b] > e1[bi] + 1e-12 ? b : bi, 0);
        chart.set([{ name: 'second price', color: 'var(--v-path)', values: e2 }, { name: 'first price', color: 'var(--accent)', values: e1 }], (X, Y, g) => `<line x1="${X(st.v)}" x2="${X(st.v)}" y1="${g.T}" y2="${g.T + g.ih}" stroke="var(--ink)" stroke-dasharray="3 4"/><text x="${X(st.v) + 6}" y="${g.T + 12}" class="svg-s">your value ${st.v}</text>`);
        stats.set('b2', `${a2} (= value)`); stats.set('b1', `${((st.n - 1) / st.n * st.v).toFixed(1)}`); stats.set('rev', ((st.n - 1) / (st.n + 1) * 100).toFixed(1));
        body.appendChild(AI.el(`<p class="small muted" style="margin:8px 4px 0">Expected payoff against ${st.n - 1} rival${st.n > 2 ? 's' : ''}. Bidding above your value in a second-price auction only adds the chance of winning at a price above what the item is worth to you; bidding below only adds the chance of losing an item you would have won at a good price.</p>`));
      }
      let game;
      function newGame() { game = { k: 0, total: 0, ideal: 0, log: [], r: AI.rng((Math.random() * 1e9) | 0) }; roundUI(); }
      function roundUI() {
        if (game.k >= 10) { const better = AI.progress.best('auction-play', Math.round(game.total)); body.innerHTML = `<div class="score-big">${game.total.toFixed(1)}</div><p class="lede" style="margin:8px 0 12px">Your total payoff over ten rounds. The textbook bids (truthful in second-price, (n − 1)/n × value in first-price) would have earned ${game.ideal.toFixed(1)} against the same rivals.${better ? ' New best.' : ''}</p>${AI.table(['Round', 'Format', 'r:Your value', 'r:Your bid', 'r:Highest rival bid', 'r:Payoff'], game.log, 'compact')}<button type="button" class="btn primary" style="margin-top:12px">${AI.icon.reset}<span>Play again</span></button>`; body.querySelector('button').onclick = newGame; return; }
        const fmt = game.k % 2 ? 'first' : 'second', v = Math.round(1 + game.r() * 99), n = st.n;
        body.innerHTML = `<p class="small muted" style="margin:0 0 4px">Round ${game.k + 1} of 10 · ${n - 1} rival${n > 2 ? 's' : ''}</p><h3 style="font-family:var(--display);margin:0 0 6px">${fmt === 'second' ? 'Second-price (Vickrey) auction' : 'First-price auction'}</h3><p class="lede" style="margin:0 0 14px">The item is worth <b>${v}</b> to you. ${fmt === 'second' ? 'If you win, you pay the highest rival bid.' : 'If you win, you pay your own bid.'}</p><div class="ctl"><label class="field"><span>Your bid</span><input type="number" min="0" max="200" step="1" value="${v}" data-bid></label><button type="button" class="btn primary" data-go>${AI.icon.next}<span>Place bid</span></button></div><div data-res style="margin-top:12px"></div>`;
        const go = body.querySelector('[data-go]'), inp = body.querySelector('[data-bid]');
        go.onclick = () => {
          const b = Math.max(0, +inp.value || 0); const vals = AI.range(n - 1).map(() => game.r() * 100); const rb = vals.map(x => fmt === 'second' ? x : (n - 1) / n * x); const top = Math.max(...rb);
          const pay = (bid) => bid > top ? v - (fmt === 'second' ? top : bid) : 0; const mine = pay(b), ideal = pay(fmt === 'second' ? v : (n - 1) / n * v);
          game.total += mine; game.ideal += ideal; game.log.push(`<tr><td>${game.k + 1}</td><td>${fmt}</td><td class="r">${v}</td><td class="r">${b}</td><td class="r">${top.toFixed(1)}</td><td class="r">${mine.toFixed(1)}</td></tr>`);
          body.querySelector('[data-res]').innerHTML = `<p style="margin:0 0 10px">${b > top ? `You win and pay ${(fmt === 'second' ? top : b).toFixed(1)}: payoff <b>${mine.toFixed(1)}</b>.` : `The highest rival bid was ${top.toFixed(1)}. You lose: payoff 0.`} ${Math.abs(mine - ideal) > 1e-9 ? `The textbook bid would have got ${ideal.toFixed(1)}.` : ''}</p><button type="button" class="btn">${AI.icon.next}<span>Next round</span></button>`;
          go.disabled = true; inp.disabled = true; body.querySelector('[data-res] button').onclick = () => { game.k++; roundUI(); };
        };
      }
      explore();
    }
  });
})(window);
