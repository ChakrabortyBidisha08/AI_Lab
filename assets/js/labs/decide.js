/* Chapters 16–17 labs: lotteries and paradoxes, a decision network, value of information,
   value and policy iteration on the 4×3 world, designing policies, and multi-armed bandits. */
(function (G) {
  'use strict';
  const AI = G.AI, E = G.AIE, esc = AI.esc;
  const usd = v => (v < 0 ? '−$' : '$') + Math.abs(Math.round(v)).toLocaleString('en-US');
  const usdM = v => Math.abs(v) >= 1e6 ? (v < 0 ? '−$' : '$') + (Math.abs(v) / 1e6).toFixed(Math.abs(v) % 1e6 === 0 ? 0 : 2).replace(/\.?0+$/, '') + 'M' : usd(v);
  const Phi = x => { const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x / 2); return x >= 0 ? (1 + y) / 2 : (1 - y) / 2; };
  const phi = x => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);

  /* =====================================================================
     1. Lotteries: the game show, the Allais and Ellsberg paradoxes,
        and fitting a utility curve to your own certainty equivalent
     ===================================================================== */
  const CARDS = [
    { id: 'show', t: 'The game show', q: 'You have just won a television game show. The host offers you one last choice.', a: ['Keep the money', 'Take $1,000,000 for sure.'], b: ['Flip the coin', 'A fair coin: tails wins $2,500,000, heads wins nothing.'], after: 'The coin flip has the higher expected monetary value, $1,250,000, yet keeping the million is the usual choice. The book uses this example to show that utility is not the same as money.' },
    { id: 'al1', t: 'Two lotteries, pair 1', q: 'Which would you rather have?', a: ['A', '80% chance of $4,000, otherwise nothing.'], b: ['B', '$3,000 for sure.'], after: 'Expected monetary values: A $3,200, B $3,000.' },
    { id: 'al2', t: 'Two lotteries, pair 2', q: 'And which of these?', a: ['C', '20% chance of $4,000, otherwise nothing.'], b: ['D', '25% chance of $3,000, otherwise nothing.'], after: 'Expected monetary values: C $800, D $750.' },
    { id: 'el1', t: 'The urn, bet 1', q: 'An urn holds 90 balls. 30 are red; the other 60 are black or yellow, in a proportion you are not told. One ball will be drawn. Which bet do you prefer?', a: ['Red', '$100 if the ball is red.'], b: ['Black', '$100 if the ball is black.'] },
    { id: 'el2', t: 'The urn, bet 2', q: 'The same urn. Which bet do you prefer now?', a: ['Red or yellow', '$100 if the ball is red or yellow.'], b: ['Black or yellow', '$100 if the ball is black or yellow.'] }
  ];
  const LOT = [[0.5, 0], [0.5, 2.5e6]], EMV = 1.25e6, XMAX = 2.5e6;
  const ceOf = R => !isFinite(R) ? EMV : -R * Math.log(LOT.reduce((s, [p, x]) => s + p * Math.exp(-x / R), 0));
  function solveR(ce) {
    if (Math.abs(ce - EMV) < 6000) return Infinity;
    const sgn = ce < EMV ? 1 : -1; let lo = Math.log(1e4), hi = Math.log(1e12);
    for (let i = 0; i < 100; i++) { const mid = (lo + hi) / 2, c = ceOf(sgn * Math.exp(mid)); if ((sgn > 0 && c < ce) || (sgn < 0 && c > ce)) lo = mid; else hi = mid; }
    return sgn * Math.exp((lo + hi) / 2);
  }
  const uNorm = (x, R) => !isFinite(R) ? x / XMAX : (1 - Math.exp(-x / R)) / (1 - Math.exp(-XMAX / R));
  AI._decide = { ceOf, solveR, uNorm };

  AI.lab({
    id: 'lottery-choices', ch: 16, kind: 'game', title: 'Five choices that test expected utility',
    blurb: 'Choose between lotteries, then see whether any utility function could explain your choices. Includes the game show, the Allais paradox and the Ellsberg paradox, and fits a utility curve to you.',
    tags: ['utility theory', 'lotteries', 'certainty equivalent', 'Allais paradox', 'Ellsberg paradox', 'risk aversion'],
    how: [['What is being tested', '<p>An agent that obeys the axioms of utility theory behaves as if it maximises expected utility. Each pair of choices here is a check on that: some pairs of answers fit some utility function; others fit none.</p>'],
      ['Where the lotteries come from', '<p>The game show is the book’s illustration of the utility of money. The four lotteries A–D are from Kahneman and Tversky’s 1979 paper on prospect theory (their problems 3 and 4), a version of the Allais paradox. The urn is Ellsberg’s 1961 one-urn problem.</p>'],
      ['Certainty equivalent', '<p>The sure amount you would accept in place of a lottery is its <b>certainty equivalent</b>. The expected monetary value minus the certainty equivalent is the <b>insurance premium</b> (also called the risk premium). A risk-averse agent has a positive premium and a concave utility curve.</p>']],
    mount(root, ctx) {
      const Lc = AI.layout(root, { cls: 'full' });
      const body = AI.el('<div style="padding:clamp(16px,3vw,32px);max-width:880px;margin:0 auto;width:100%"></div>'); Lc.stage.appendChild(body); Lc.stage.classList.add('plain');
      let picks = {}, i = 0;
      function card() {
        if (i >= CARDS.length) return verdict();
        const c = CARDS[i];
        body.innerHTML = `<p class="small muted" style="margin:0 0 6px">Choice ${i + 1} of ${CARDS.length}</p><h3 style="font-family:var(--display);font-size:clamp(22px,2.6vw,30px);margin:0 0 10px">${esc(c.t)}</h3><p class="lede" style="margin:0 0 18px">${esc(c.q)}</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px">${[c.a, c.b].map((o, k) => `<button type="button" class="pick" data-k="${k}" style="min-height:110px"><b style="font-family:var(--display);font-size:20px">${esc(o[0])}</b><span>${esc(o[1])}</span></button>`).join('')}</div><div data-after style="min-height:72px;margin-top:14px"></div>`;
        body.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
          if (picks[c.id] != null) return; picks[c.id] = +b.dataset.k; b.setAttribute('aria-pressed', 'true');
          body.querySelectorAll('[data-k]').forEach(x => x.disabled = true);
          const a = body.querySelector('[data-after]'); a.innerHTML = `${c.after ? `<p class="small" style="margin:0 0 10px">${esc(c.after)}</p>` : ''}<button type="button" class="btn primary">${AI.icon.next}<span>${i === CARDS.length - 1 ? 'See what your choices imply' : 'Next choice'}</span></button>`;
          a.querySelector('button').onclick = () => { i++; card(); }; a.querySelector('button').focus();
        });
      }
      function verdict() {
        const al = (picks.al1 === 1 ? 'B' : 'A') + (picks.al2 === 0 ? 'C' : 'D'), el = (picks.el1 === 0 ? 'R' : 'K') + (picks.el2 === 0 ? 'RY' : 'KY');
        const alOk = al === 'AC' || al === 'BD', elOk = el === 'RRY' || el === 'KKY';
        const alTxt = alOk ? `<p>You chose <b>${al[0]}</b> and <b>${al[1]}</b>. That is consistent: ${al === 'AC' ? 'an agent that is close to risk-neutral prefers the higher expected value in both pairs' : 'an agent that is risk-averse enough takes the safer lottery in both pairs'}.</p>`
          : `<p>You chose <b>${al[0]}</b> and <b>${al[1]}</b>. ${al === 'BC' ? 'So did most people in Kahneman and Tversky’s study (80% chose B, and 65% chose C). ' : ''}No utility function gives this pair of preferences. Write U for utility:</p><p class="mono small">${al === 'BC' ? 'B ≻ A:  U($3,000) > 0.8 U($4,000) + 0.2 U($0)<br>C ≻ D:  0.2 U($4,000) + 0.8 U($0) > 0.25 U($3,000) + 0.75 U($0)<br>Multiply the second by 4 and simplify:  0.8 U($4,000) + 0.2 U($0) > U($3,000)' : 'A ≻ B:  0.8 U($4,000) + 0.2 U($0) > U($3,000)<br>D ≻ C:  0.25 U($3,000) + 0.75 U($0) > 0.2 U($4,000) + 0.8 U($0)<br>Multiply the second by 4 and simplify:  U($3,000) > 0.8 U($4,000) + 0.2 U($0)'}</p><p>The two lines contradict each other. C and D are just A and B with every chance of winning divided by 4, so an expected-utility maximiser must rank them the same way. This is the <b>Allais paradox</b>. A common explanation is the <b>certainty effect</b>: a sure gain is especially attractive.</p>`;
        const elTxt = elOk ? `<p>You chose <b>${el === 'RRY' ? 'Red' : 'Black'}</b> and <b>${el === 'RRY' ? 'Red or yellow' : 'Black or yellow'}</b>. That is consistent with believing there are ${el === 'RRY' ? 'fewer' : 'more'} than 30 black balls.</p>`
          : `<p>You chose <b>${el[0] === 'R' ? 'Red' : 'Black'}</b> and <b>${el.slice(1) === 'RY' ? 'Red or yellow' : 'Black or yellow'}</b>. Let b be the number of black balls you believe there are. ${el[0] === 'R' ? 'Red over Black needs b &lt; 30. Black-or-yellow (60 balls) over Red-or-yellow (90 − b balls) needs b &gt; 30.' : 'Black over Red needs b &gt; 30. Red-or-yellow (90 − b balls) over Black-or-yellow (60 balls) needs b &lt; 30.'} No single belief fits both. ${el === 'RKY' ? 'This pattern is the one Ellsberg described: in each pair it picks the bet whose probability is known. ' : ''}This is the <b>Ellsberg paradox</b>, and the preference for known probabilities is called <b>ambiguity aversion</b>.</p>`;
        const showTxt = picks.show === 0 ? '<p>You kept the million, so for you U(wealth + $1,000,000) &gt; ½ U(wealth) + ½ U(wealth + $2,500,000). Your utility for money is <b>concave</b> over this range: you are risk-averse.</p>' : '<p>You flipped the coin, so for you the gamble’s expected utility is higher. That is risk-seeking or risk-neutral over this range; it can be perfectly rational for someone who is already very rich.</p>';
        body.innerHTML = `<h3 style="font-family:var(--display);font-size:clamp(22px,2.6vw,30px);margin:0 0 14px">What your choices imply</h3>
          <div class="note-block"><h4>The game show</h4>${showTxt}</div><div class="note-block"><h4>Lotteries A–D ${alOk ? '<span class="chip ok-chip">consistent</span>' : '<span class="chip bad-chip">inconsistent</span>'}</h4>${alTxt}</div><div class="note-block"><h4>The urn ${elOk ? '<span class="chip ok-chip">consistent</span>' : '<span class="chip bad-chip">inconsistent</span>'}</h4>${elTxt}</div>
          <div class="note-block"><h4>Your utility curve for the game show</h4><p>What is the smallest sure amount you would accept instead of the coin flip?</p><div data-ce></div><div data-plot style="margin-top:10px"></div><p class="small muted" data-cap></p></div>
          <button type="button" class="btn" data-again>${AI.icon.reset}<span>Start again</span></button>`;
        body.querySelector('[data-again]').onclick = () => { picks = {}; i = 0; card(); };
        const st = { ce: picks.show === 0 ? 600000 : 1300000 };
        AI.controls(body.querySelector('[data-ce]'), [{ t: 'range', k: 'ce', label: 'Certainty equivalent', min: 20000, max: 2480000, step: 10000, fmt: v => usd(v), grow: true }], st, () => plot.redraw());
        const cap = body.querySelector('[data-cap]');
        const plot = AI.svgHost(AI.el('<div style="height:300px;position:relative"></div>'), ctx, (w, h) => {
          const R = solveR(st.ce), L = 52, Rm = 16, T = 14, B = 40, iw = w - L - Rm, ih = h - T - B, X = x => L + x / XMAX * iw, Y = u => T + (1 - u) * ih;
          let s = ''; for (let k = 0; k <= 4; k++) { const u = k / 4; s += `<line x1="${L}" x2="${L + iw}" y1="${Y(u)}" y2="${Y(u)}" stroke="var(--line)"/><text x="${L - 8}" y="${Y(u) + 4}" text-anchor="end" class="svg-s">${u}</text>`; }
          [0, 0.5e6, 1e6, 1.5e6, 2e6, 2.5e6].forEach(x => { s += `<text x="${X(x)}" y="${T + ih + 18}" text-anchor="middle" class="svg-s">${usdM(x)}</text>`; });
          s += `<text x="${L + iw / 2}" y="${h - 4}" text-anchor="middle" class="svg-s">prize</text><text x="14" y="${T + ih / 2}" transform="rotate(-90 14 ${T + ih / 2})" text-anchor="middle" class="svg-s">utility (scaled 0 to 1)</text>`;
          s += `<line x1="${X(0)}" y1="${Y(0)}" x2="${X(XMAX)}" y2="${Y(1)}" stroke="var(--muted)" stroke-dasharray="5 5"/>`;
          let p = ''; for (let k = 0; k <= 120; k++) { const x = XMAX * k / 120; p += `${X(x).toFixed(1)},${Y(uNorm(x, R)).toFixed(1)} `; } s += `<polyline points="${p}" fill="none" stroke="var(--v-path)" stroke-width="3"/>`;
          const ce = st.ce; s += `<line x1="${X(Math.min(ce, EMV))}" x2="${X(Math.max(ce, EMV))}" y1="${Y(0.5)}" y2="${Y(0.5)}" stroke="var(--accent)" stroke-width="4"/>`;
          s += `<line x1="${X(ce)}" x2="${X(ce)}" y1="${Y(0.5)}" y2="${Y(0)}" stroke="var(--v-path)" stroke-dasharray="3 4"/><circle cx="${X(ce)}" cy="${Y(0.5)}" r="6" fill="var(--v-path)"/><text x="${X(ce)}" y="${Y(0.5) - 12}" text-anchor="middle" class="svg-t halo-bg" style="font-weight:600">certainty equivalent</text>`;
          s += `<line x1="${X(EMV)}" x2="${X(EMV)}" y1="${Y(0.5)}" y2="${Y(0)}" stroke="var(--muted)" stroke-dasharray="3 4"/><circle cx="${X(EMV)}" cy="${Y(0.5)}" r="5" fill="var(--bg)" stroke="var(--ink)" stroke-width="2"/><text x="${X(EMV)}" y="${Y(0.5) + 22}" text-anchor="middle" class="svg-s halo-bg">expected value $1.25M</text>`;
          const prem = EMV - ce;
          cap.innerHTML = `Expected utility of the coin flip is ½ on this scale (½ × U($0) + ½ × U($2.5M)); the certainty equivalent is where the curve reaches ½. Insurance premium: <b>${usd(prem)}</b>. ${!isFinite(R) ? 'Your curve is a straight line: you are risk-neutral.' : R > 0 ? `This is the curve U(x) = 1 − e<sup>−x/R</sup> with risk tolerance R ≈ ${usd(R)}: concave, risk-averse.` : `This curve is convex (risk tolerance R ≈ ${usd(R)}, negative): risk-seeking.`} The exponential form is a common modelling choice in decision analysis, used here so a single number can describe you.`;
          return s;
        });
        body.querySelector('[data-plot]').appendChild(plot.svg.parentNode); plot.redraw();
      }
      card();
    }
  });

  /* =====================================================================
     2. A decision network: should you take an umbrella?
     ===================================================================== */
  function dnSolve(p) {
    const pR = p.pR, pS = 1 - pR, U = p.U; // U: {ls, lr, ts, tr}
    const eu = q => ({ take: (1 - q) * U.ts + q * U.tr, leave: (1 - q) * U.ls + q * U.lr });
    const best = e => e.take >= e.leave ? 'take' : 'leave';
    const e0 = eu(pR), meu0 = Math.max(e0.take, e0.leave);
    const pBad = pR * p.bR + pS * p.bS, pGood = 1 - pBad;
    const qBad = pBad > 0 ? pR * p.bR / pBad : 0, qGood = pGood > 0 ? pR * (1 - p.bR) / pGood : 0;
    const eB = eu(qBad), eG = eu(qGood);
    const meuF = (pBad > 0 ? pBad * Math.max(eB.take, eB.leave) : 0) + (pGood > 0 ? pGood * Math.max(eG.take, eG.leave) : 0);
    const meuW = pS * Math.max(U.ls, U.ts) + pR * Math.max(U.lr, U.tr);
    return { e0, best0: best(e0), meu0, pBad, pGood, qBad, qGood, eB, eG, bestB: best(eB), bestG: best(eG), meuF, vF: meuF - meu0, meuW, vW: meuW - meu0 };
  }
  AI._dn = dnSolve;
  AI.lab({
    id: 'decision-network', ch: 16, kind: 'demo', title: 'A decision network: take the umbrella?',
    blurb: 'A small decision network with a chance node, an observation, a decision and a utility node. Change the numbers and watch the best decision, the value of the forecast and the value of perfect information.',
    tags: ['decision network', 'influence diagram', 'maximum expected utility', 'value of information', 'information arc'],
    how: [['Reading the diagram', '<p>Ovals are <b>chance nodes</b>, the rectangle is a <b>decision node</b>, and the diamond is the <b>utility node</b>. An arc into the decision node is an information arc: what the agent sees before deciding.</p>'],
      ['Evaluating it', '<p>For each value of the evidence, compute the expected utility of each action from the posterior over Weather, and take the best. The expected value of that best utility, averaged over what the forecast might say, is the MEU with the forecast. Subtract the MEU without it to get the <b>value of the forecast</b>.</p>'],
      ['Things to notice', '<ul><li>The value of information is never negative.</li><li>It is zero when the forecast cannot change your decision, even if the forecast is accurate.</li><li>The forecast is never worth more than perfect knowledge of the weather.</li></ul><p class="small muted">The numbers are an illustrative example made for this lab.</p>']],
    mount(root, ctx) {
      const st = { pR: 0.3, bR: 0.9, bS: 0.2, ls: 100, lr: 0, ts: 20, tr: 70, see: true };
      const Ld = AI.layout(root);
      const sv = AI.svgHost(Ld.stage, ctx, (w, h) => drawDN(w, h));
      const pc = AI.panel(Ld.side, 'Probabilities');
      AI.controls(pc, [{ t: 'range', k: 'pR', label: 'P(rain)', min: 0, max: 1, step: 0.01, fmt: v => v.toFixed(2) }, { t: 'range', k: 'bR', label: 'P(forecast says rain | rain)', min: 0.5, max: 1, step: 0.01, fmt: v => v.toFixed(2) }, { t: 'range', k: 'bS', label: 'P(forecast says rain | sun)', min: 0, max: 0.5, step: 0.01, fmt: v => v.toFixed(2) }, { t: 'row' }, { t: 'check', k: 'see', label: 'Forecast seen before deciding' }], st, () => run());
      const pu = AI.panel(Ld.side, 'Utilities');
      AI.controls(pu, [{ t: 'num', k: 'ls', label: 'Leave it, sun', step: 5 }, { t: 'num', k: 'lr', label: 'Leave it, rain', step: 5 }, { t: 'row' }, { t: 'num', k: 'ts', label: 'Take it, sun', step: 5 }, { t: 'num', k: 'tr', label: 'Take it, rain', step: 5 }], st, () => run());
      const ps = AI.panel(Ld.side, 'Values'); const stats = AI.stats(ps, [['meu', 'MEU'], ['vf', 'value of forecast'], ['vw', 'value of knowing weather']]);
      const pb = AI.panel(Ld.below, 'The calculation'); const tab = AI.el('<div></div>'); pb.appendChild(tab);
      const pg = AI.panel(Ld.below, 'Information is worth most when you are unsure'); const gbox = AI.el('<div></div>'); pg.appendChild(gbox);
      const chart = AI.chart(gbox, ctx, { height: 230, xLabel: 'P(rain)', xs: i => (i / 50).toFixed(1), right: 150 });
      let S;
      function P() { return { pR: st.pR, bR: st.bR, bS: st.bS, U: { ls: st.ls, lr: st.lr, ts: st.ts, tr: st.tr } }; }
      function drawDN(w, h) {
        if (!S) return '';
        const nW = { x: w * 0.22, y: h * 0.26 }, nF = { x: w * 0.22, y: h * 0.74 }, nD = { x: w * 0.7, y: h * 0.74 }, nU = { x: w * 0.7, y: h * 0.26 };
        const rx = Math.min(92, w * 0.15), ry = 36, da = 70, db = 46;
        const ell = (ux, uy) => 1 / Math.sqrt((ux / rx) ** 2 + (uy / ry) ** 2), rect = (ux, uy) => Math.min(Math.abs(ux) > 1e-9 ? rx / Math.abs(ux) : 1e9, Math.abs(uy) > 1e-9 ? ry / Math.abs(uy) : 1e9), dia = (ux, uy) => 1 / (Math.abs(ux) / da + Math.abs(uy) / db);
        const ln = (a, b, fa, fb, dash) => { const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d, ta = fa(ux, uy) + 2, tb = fb(ux, uy) + 4; return `<line x1="${a.x + ux * ta}" y1="${a.y + uy * ta}" x2="${b.x - ux * tb}" y2="${b.y - uy * tb}" stroke="var(--ink2)" stroke-width="2" marker-end="url(#dnA)" ${dash ? 'stroke-dasharray="6 5"' : ''}/>`; };
        let s = AI.arrowDefs('dnA');
        s += ln(nW, nF, ell, ell) + ln(nW, nU, ell, dia) + ln(nD, nU, rect, dia);
        if (st.see) s += ln(nF, nD, ell, rect, true);
        const chance = (n, t, sub) => `<ellipse cx="${n.x}" cy="${n.y}" rx="${rx}" ry="${ry}" fill="var(--bg)" stroke="var(--v-chance)" stroke-width="2.5"/><text x="${n.x}" y="${n.y - 3}" text-anchor="middle" class="svg-b" style="font-size:15px">${t}</text><text x="${n.x}" y="${n.y + 15}" text-anchor="middle" class="svg-s">${sub}</text>`;
        s += chance(nW, 'Weather', `P(rain) = ${st.pR.toFixed(2)}`);
        s += chance(nF, 'Forecast', st.see ? 'seen before deciding' : 'not seen');
        const best = st.see ? `${S.bestG} if “sun”, ${S.bestB} if “rain”` : `best: ${S.best0}`;
        s += `<rect x="${nD.x - rx}" y="${nD.y - ry}" width="${rx * 2}" height="${ry * 2}" rx="4" fill="var(--bg)" stroke="var(--accent)" stroke-width="2.5"/><text x="${nD.x}" y="${nD.y - 3}" text-anchor="middle" class="svg-b" style="font-size:15px">Umbrella</text><text x="${nD.x}" y="${nD.y + 15}" text-anchor="middle" class="svg-s">${esc(best)}</text>`;
        s += `<polygon points="${nU.x},${nU.y - db} ${nU.x + da},${nU.y} ${nU.x},${nU.y + db} ${nU.x - da},${nU.y}" fill="var(--bg)" stroke="var(--v-goal)" stroke-width="2.5"/><text x="${nU.x}" y="${nU.y - 2}" text-anchor="middle" class="svg-b" style="font-size:15px">Utility</text><text x="${nU.x}" y="${nU.y + 15}" text-anchor="middle" class="svg-s">MEU ${(st.see ? S.meuF : S.meu0).toFixed(1)}</text>`;
        if (st.see) s += `<text x="${(nF.x + nD.x) / 2}" y="${nF.y - 10}" text-anchor="middle" class="svg-s halo-bg">information arc</text>`;
        return s;
      }
      function run() {
        S = dnSolve(P()); sv.redraw();
        stats.set('meu', (st.see ? S.meuF : S.meu0).toFixed(1)); stats.set('vf', S.vF.toFixed(2), S.vF > 1e-9 ? 'good' : ''); stats.set('vw', S.vW.toFixed(2));
        const f = v => v.toFixed(2), b = (x, y) => x >= y ? `<b>${f(x)}</b>` : f(x);
        tab.innerHTML = `<p class="small muted" style="margin:0 0 6px">Without the forecast, use P(rain) = ${f(st.pR)}.</p>` + AI.table(['Evidence', 'r:P(evidence)', 'r:P(rain | evidence)', 'r:EU(take)', 'r:EU(leave)', 'Best action'], [
          `<tr><td>none</td><td class="r">1.00</td><td class="r">${f(st.pR)}</td><td class="r">${b(S.e0.take, S.e0.leave)}</td><td class="r">${b(S.e0.leave, S.e0.take + 1e-12)}</td><td>${S.best0}</td></tr>`,
          `<tr><td>forecast says “sun”</td><td class="r">${f(S.pGood)}</td><td class="r">${f(S.qGood)}</td><td class="r">${b(S.eG.take, S.eG.leave)}</td><td class="r">${b(S.eG.leave, S.eG.take + 1e-12)}</td><td>${S.bestG}</td></tr>`,
          `<tr><td>forecast says “rain”</td><td class="r">${f(S.pBad)}</td><td class="r">${f(S.qBad)}</td><td class="r">${b(S.eB.take, S.eB.leave)}</td><td class="r">${b(S.eB.leave, S.eB.take + 1e-12)}</td><td>${S.bestB}</td></tr>`], 'compact') +
          `<div class="explain small" style="margin-top:10px">MEU with the forecast = ${f(S.pGood)} × ${f(Math.max(S.eG.take, S.eG.leave))} + ${f(S.pBad)} × ${f(Math.max(S.eB.take, S.eB.leave))} = <b>${f(S.meuF)}</b>. Without it, MEU = <b>${f(S.meu0)}</b>. Value of the forecast = ${f(S.meuF)} − ${f(S.meu0)} = <b>${f(S.vF)}</b>.${S.bestB === S.bestG ? ' Both forecasts lead to the same action, so the forecast is worth nothing here.' : ''}<br>Knowing the weather for certain: ${f(1 - st.pR)} × ${f(Math.max(st.ls, st.ts))} + ${f(st.pR)} × ${f(Math.max(st.lr, st.tr))} = ${f(S.meuW)}, so VPI(Weather) = <b>${f(S.vW)}</b>.</div>`;
        const xs = AI.range(51).map(k => k / 50), vf = [], vw = [];
        xs.forEach(q => { const r = dnSolve(Object.assign(P(), { pR: q })); vf.push(r.vF); vw.push(r.vW); });
        chart.set([{ name: 'VPI(Weather)', color: 'var(--v-chance)', values: vw }, { name: 'value of forecast', color: 'var(--accent)', values: vf }], (X, Y, g) => `<line x1="${X(Math.round(st.pR * 50))}" x2="${X(Math.round(st.pR * 50))}" y1="${g.T}" y2="${g.T + g.ih}" stroke="var(--ink)" stroke-dasharray="3 4"/>`);
      }
      run();
    }
  });

  /* =====================================================================
     3. Value of information: the book's oil survey, and two uncertain options
     ===================================================================== */
  AI.lab({
    id: 'value-of-info', ch: 16, kind: 'demo', title: 'What is information worth?',
    blurb: 'Two views of the value of perfect information: the book’s oil-drilling survey worked through exactly, and a picture of when knowing more would change your mind.',
    tags: ['value of perfect information', 'VPI', 'myopic information gathering', 'decision theory'],
    how: [['Definition', '<p>VPI(E) is the expected MEU after learning E, minus the MEU now. Information has value only because it might change what you do.</p>'],
      ['Properties (from the book)', '<ul><li>VPI is never negative.</li><li>It is not additive: two pieces of information together can be worth more or less than the sum of their separate values.</li><li>It does not depend on the order in which the pieces arrive.</li></ul>'],
      ['The oil survey', '<p>An oil company can buy one of n blocks; exactly one contains oil worth C, and each costs C/n. A survey of one block tells for certain whether it has oil. Working it out gives VPI = C/n: the survey is worth as much as a block.</p>']],
    mount(root, ctx) {
      const st = { mode: 'oil', n: 10, C: 1e6, m1: 10, s1: 2, m2: 9, s2: 2 };
      const Lv = AI.layout(root);
      const box = AI.el('<div style="padding:clamp(12px,2vw,24px)"></div>'); Lv.stage.appendChild(box); Lv.stage.classList.add('plain');
      const pm = AI.panel(Lv.side, 'Example');
      const refs = AI.controls(pm, [{ t: 'seg', k: 'mode', label: '', opts: [['oil', 'Oil survey'], ['two', 'Two options']] }, { t: 'row' }, { t: 'range', k: 'n', label: 'Number of blocks n', min: 2, max: 20, step: 1 }, { t: 'range', k: 'C', label: 'Value of the oil C', min: 1e5, max: 1e7, step: 1e5, fmt: v => usd(v) },
        { t: 'range', k: 'm1', label: 'Option 1: estimated utility', min: 0, max: 20, step: 0.1, fmt: v => v.toFixed(1) }, { t: 'range', k: 's1', label: 'Option 1: uncertainty (std. dev.)', min: 0.05, max: 6, step: 0.05, fmt: v => v.toFixed(2) }, { t: 'range', k: 'm2', label: 'Option 2: estimated utility', min: 0, max: 20, step: 0.1, fmt: v => v.toFixed(1) }, { t: 'range', k: 's2', label: 'Option 2: uncertainty (std. dev.)', min: 0.05, max: 6, step: 0.05, fmt: v => v.toFixed(2) }], st, () => run());
      const pp = AI.panel(Lv.side, 'Three typical cases'); const pre = AI.el('<div class="ctl"></div>'); pp.appendChild(pre);
      [['Clear choice', { m1: 14, s1: 1.2, m2: 6, s2: 1.2 }], ['Close, and it matters', { m1: 10.4, s1: 4, m2: 10, s2: 4 }], ['Close, but it hardly matters', { m1: 10.1, s1: 0.4, m2: 10, s2: 0.4 }]].forEach(([t, v]) => { const b = AI.el(`<button type="button" class="btn small">${t}</button>`); b.onclick = () => { Object.assign(st, v, { mode: 'two' }); refs.sync(); run(); }; pre.appendChild(b); });
      const ps = AI.panel(Lv.side, 'Result'); const stats = AI.stats(ps, [['vpi', 'VPI'], ['p', 'chance info changes your choice']]);
      const plot = AI.svgHost(AI.el('<div style="height:300px;position:relative"></div>'), ctx, (w, h) => twoPlot(w, h));
      function twoPlot(w, h) {
        const L = 20, R = 20, T = 16, B = 34, iw = w - L - R, ih = h - T - B; const lo = Math.min(st.m1 - 3.5 * st.s1, st.m2 - 3.5 * st.s2), hi = Math.max(st.m1 + 3.5 * st.s1, st.m2 + 3.5 * st.s2);
        const X = x => L + (x - lo) / (hi - lo) * iw, pk = Math.max(1 / st.s1, 1 / st.s2) * 0.4, Y = y => T + ih * (1 - y / pk);
        let s = `<line x1="${L}" x2="${L + iw}" y1="${T + ih}" y2="${T + ih}" stroke="var(--line2)"/>`;
        for (let k = 0; k <= 5; k++) { const x = lo + (hi - lo) * k / 5; s += `<text x="${X(x)}" y="${T + ih + 18}" text-anchor="middle" class="svg-s">${x.toFixed(1)}</text>`; }
        [[st.m1, st.s1, 'var(--v-path)', 'option 1'], [st.m2, st.s2, 'var(--accent)', 'option 2']].forEach(([m, sd, c, t]) => {
          let p = `${X(lo)},${Y(0)} `; for (let k = 0; k <= 160; k++) { const x = lo + (hi - lo) * k / 160; p += `${X(x).toFixed(1)},${Y(phi((x - m) / sd) / sd).toFixed(1)} `; } p += `${X(hi)},${Y(0)}`;
          s += `<polygon points="${p}" fill="${c}" fill-opacity=".14" stroke="${c}" stroke-width="2.4"/><line x1="${X(m)}" x2="${X(m)}" y1="${Y(0)}" y2="${Y(phi(0) / sd)}" stroke="${c}" stroke-dasharray="4 4"/><text x="${X(m)}" y="${Math.max(T + 10, Y(phi(0) / sd) - 8)}" text-anchor="middle" class="svg-t halo-bg" style="font-weight:600" fill="${c}">${t}</text>`;
        });
        return s + `<text x="${L + iw / 2}" y="${h - 4}" text-anchor="middle" class="svg-s">utility of the option (current belief)</text>`;
      }
      function run() {
        const oil = st.mode === 'oil';
        ['n', 'C'].forEach(k => refs[k + 'Field'].hidden = !oil); ['m1', 's1', 'm2', 's2'].forEach(k => refs[k + 'Field'].hidden = oil); pp.hidden = oil;
        if (oil) {
          const n = st.n, C = st.C, price = C / n, yes = 1 / n, no = (n - 1) / n, gYes = C - price, gNo = C / (n - 1) - price, withInfo = yes * gYes + no * gNo;
          box.innerHTML = `<h3 style="font-family:var(--display);margin:0 0 8px">The oil survey, worked through</h3><p class="lede" style="margin:0 0 14px">${n} blocks, one with oil worth ${usd(C)}; each block costs ${usd(price)}. A survey of block 3 says for certain whether it has oil.</p>` +
            AI.table(['Situation', 'r:Probability', 'What the company does', 'r:Expected profit'], [
              `<tr><td>No survey</td><td class="r">1</td><td>buys any block (each has oil with probability 1/${n})</td><td class="r">${usd(C / n)} − ${usd(price)} = <b>$0</b></td></tr>`,
              `<tr><td>Survey says block 3 has oil</td><td class="r">1/${n}</td><td>buys block 3</td><td class="r">${usd(C)} − ${usd(price)} = ${usd(gYes)}</td></tr>`,
              `<tr><td>Survey says block 3 is dry</td><td class="r">${n - 1}/${n}</td><td>buys another block (oil with probability 1/${n - 1})</td><td class="r">${usd(C / (n - 1))} − ${usd(price)} = ${usd(gNo)}</td></tr>`], 'compact') +
            `<div class="explain" style="margin-top:12px">Expected profit with the survey = (1/${n}) × ${usd(gYes)} + (${n - 1}/${n}) × ${usd(gNo)} = <b>${usd(withInfo)}</b>. Without it, $0. So the survey is worth <b>${usd(withInfo)}</b>, which is C/n, the price of one block.</div>`;
          stats.set('vpi', usd(withInfo)); stats.set('p', `${(100 / n).toFixed(1)}% (oil found)`);
        } else {
          const th = Math.hypot(st.s1, st.s2), a = (st.m1 - st.m2) / th, emax = st.m1 * Phi(a) + st.m2 * Phi(-a) + th * phi(a), vpi = Math.max(0, emax - Math.max(st.m1, st.m2)), pc = Phi(-Math.abs(a));
          box.innerHTML = '<h3 style="font-family:var(--display);margin:0 0 6px">Two options, each with an uncertain utility</h3><p class="lede" style="margin:0 0 6px">Right now you would pick the option with the higher estimate. Perfect information would reveal both true utilities first.</p>';
          box.appendChild(plot.svg.parentNode); plot.redraw();
          box.appendChild(AI.el(`<div class="explain small" style="margin-top:8px">VPI = E[max(U₁, U₂)] − max(E[U₁], E[U₂]) = ${emax.toFixed(3)} − ${Math.max(st.m1, st.m2).toFixed(3)} = <b>${vpi.toFixed(3)}</b>, treating the two utilities as independent and normally distributed (a closed form for the expected maximum of two Gaussians). It is large only when the choice is close <i>and</i> the uncertainty is large enough to matter.</div>`));
          stats.set('vpi', vpi.toFixed(3)); stats.set('p', (pc * 100).toFixed(1) + '%');
        }
      }
      run();
    }
  });

  /* =====================================================================
     Shared grid-world drawing for chapter 17
     ===================================================================== */
  const ARR = { U: [0, -1], R: [1, 0], D: [0, 1], L: [-1, 0] };
  function trapSet(m, pi) { // states that may never reach a terminal under pi (positive probability)
    const canReach = new Set(m.states.filter(k => m.isTerm(k))); let ch = true;
    while (ch) { ch = false; m.states.forEach(k => { if (canReach.has(k) || m.isTerm(k)) return; if (m.T(k, pi[k]).some(([p, s2]) => p > 0 && canReach.has(s2))) { canReach.add(k); ch = true; } }); }
    const trap = new Set(m.states.filter(k => !canReach.has(k))); ch = true;
    while (ch) { ch = false; m.states.forEach(k => { if (trap.has(k) || m.isTerm(k)) return; if (m.T(k, pi[k]).some(([p, s2]) => p > 0 && trap.has(s2))) { trap.add(k); ch = true; } }); }
    return trap;
  }
  function evalPolicy(m, pi) { const U = E.policyEval(m, pi, null, 4000); const bad = m.gamma >= 1 ? trapSet(m, pi) : new Set(); bad.forEach(k => { U[k] = m.r < 0 ? -Infinity : m.r > 0 ? Infinity : 0; }); return U; }
  const fu = v => v === -Infinity ? '−∞' : v === Infinity ? '+∞' : (v < 0 ? '−' : '') + Math.abs(v).toFixed(3);
  function gridSVG(w, h, m, o) {
    o = o || {}; const pad = 6, cs = Math.min((w - pad * 2) / m.W, (h - pad * 2) / m.H), ox = (w - cs * m.W) / 2, oy = (h - cs * m.H) / 2;
    const X = x => ox + (x - 1) * cs, Y = y => oy + (m.H - y) * cs; const U = o.U;
    const vals = U ? m.states.filter(k => !m.isTerm(k) && isFinite(U[k])).map(k => Math.abs(U[k])) : [];
    const mx = Math.max(1, ...vals);
    const mk = (id, c, sz) => `<defs><marker id="${id}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="${sz}" markerHeight="${sz}" orient="auto"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker></defs>`;
    let s = mk('gA' + (o.id || ''), o.piCol || 'var(--ink)', 2.6) + mk('gB' + (o.id || ''), 'var(--muted)', 3.4);
    for (let y = m.H; y >= 1; y--) for (let x = 1; x <= m.W; x++) {
      const k = x + ',' + y, x0 = X(x), y0 = Y(y);
      if (m.walls.includes(k)) { s += `<rect x="${x0 + 2}" y="${y0 + 2}" width="${cs - 4}" height="${cs - 4}" rx="6" fill="var(--wall)"/>`; continue; }
      if (m.isTerm(k)) { const v = m.terms[k]; s += `<rect x="${x0 + 2}" y="${y0 + 2}" width="${cs - 4}" height="${cs - 4}" rx="6" fill="${v > 0 ? 'var(--ok)' : 'var(--bad)'}"/><text x="${x0 + cs / 2}" y="${y0 + cs / 2 + 9}" text-anchor="middle" class="svg-b" style="font-size:${Math.min(30, cs * 0.3)}px" fill="#fff">${v > 0 ? '+1' : '−1'}</text>`; continue; }
      const v = U ? U[k] : 0, a = U ? Math.min(1, Math.abs(isFinite(v) ? v : mx) / mx) : 0;
      const fill = !U ? 'var(--bg)' : `color-mix(in srgb,${v >= 0 ? 'var(--ok)' : 'var(--bad)'} ${Math.round(a * 34)}%,var(--bg))`;
      s += `<rect x="${x0 + 2}" y="${y0 + 2}" width="${cs - 4}" height="${cs - 4}" rx="6" fill="${fill}" stroke="${o.hl && o.hl.has(k) ? 'var(--accent)' : 'var(--line2)'}" stroke-width="${o.hl && o.hl.has(k) ? 4 : 1.5}" ${o.edit ? `data-k="${k}" style="cursor:pointer"` : ''}/>`;
      s += `<text x="${x0 + 10}" y="${y0 + 20}" class="svg-s" style="font-size:11px" pointer-events="none">(${x},${y})</text>`;
      if (o.pi && o.pi[k]) { const [dx, dy] = ARR[o.pi[k]], cx = x0 + cs / 2, cy = y0 + cs / 2 - (U ? cs * 0.08 : 0), L = cs * 0.22; s += `<line x1="${cx - dx * L}" y1="${cy - dy * L}" x2="${cx + dx * L}" y2="${cy + dy * L}" stroke="${o.piCol || 'var(--ink)'}" stroke-width="${Math.max(3, cs * 0.04)}" stroke-linecap="round" marker-end="url(#gA${o.id || ''})" pointer-events="none"/>`; }
      if (o.ghost && o.ghost[k] && (!o.pi || o.ghost[k] !== o.pi[k])) { const [dx, dy] = ARR[o.ghost[k]], cx = x0 + cs / 2, cy = y0 + cs / 2 - (U ? cs * 0.08 : 0), L = cs * 0.3; s += `<line x1="${cx}" y1="${cy}" x2="${cx + dx * L}" y2="${cy + dy * L}" stroke="var(--muted)" stroke-width="2.5" stroke-dasharray="4 4" marker-end="url(#gB${o.id || ''})" pointer-events="none"/>`; }
      if (U) s += `<text x="${x0 + cs / 2}" y="${y0 + cs - 14}" text-anchor="middle" class="svg-m" style="font-size:${Math.max(12, Math.min(17, cs * 0.14))}px;font-weight:600" pointer-events="none">${fu(v)}</text>`;
      if (o.start === k) s += `<text x="${x0 + cs - 10}" y="${y0 + 20}" text-anchor="end" class="svg-s" style="font-size:11px" pointer-events="none">start</text>`;
    }
    return s;
  }

  /* =====================================================================
     4. Value iteration and policy iteration on the 4×3 world
     ===================================================================== */
  const PSEUDO_VI = conv => ['function VALUE-ITERATION(mdp, ε) returns U', '  U′ ← 0 for every state', '  repeat', '    U ← U′;  δ ← 0', '    for each state s do', conv === 'state' ? '      U′[s] ← R(s) + γ · max_a Σ P(s′|s,a) U[s′]' : '      U′[s] ← max_a Σ P(s′|s,a) [R(s,a,s′) + γ U[s′]]', '      δ ← max(δ, |U′[s] − U[s]|)', '  until δ ≤ ε(1 − γ)/γ   (δ ≤ ε when γ = 1)', '  return U'];
  const PSEUDO_PI = conv => ['function POLICY-ITERATION(mdp) returns π', '  π ← a starting policy (here: every arrow Right)', '  repeat', '    U ← POLICY-EVALUATION(π, mdp)   exact values of π', '    unchanged ← true', '    for each state s do', conv === 'state' ? '      a* ← argmax_a Σ P(s′|s,a) U[s′]' : '      a* ← argmax_a Σ P(s′|s,a) [R(s,a,s′) + γ U[s′]]', '      if a* is better than π[s] then π[s] ← a*;  unchanged ← false', '  until unchanged', '  return π'];
  AI.lab({
    id: 'gridworld-mdp', ch: 17, kind: 'demo', title: 'Value iteration and policy iteration on the 4×3 world',
    blurb: 'The book’s 4×3 world: moves succeed 80% of the time and slip sideways otherwise. Step through value iteration or policy iteration and watch utilities and the policy settle.',
    tags: ['MDP', 'Bellman equation', 'value iteration', 'policy iteration', 'discount factor', 'living reward'],
    how: [['The world', '<p>Start at (1,1). The cells (4,3) and (4,2) end the episode with +1 and −1; (2,2) is a wall. Each move goes the intended way with probability 0.8 and at right angles with probability 0.1 each; bumping into a wall leaves you where you are. Every step in a non-terminal state costs r (−0.04 in the book).</p>'],
      ['Two ways of writing the reward', '<p>The third edition attaches reward to states, R(s); the fourth edition attaches it to transitions, R(s, a, s′). With the same −0.04 per step and γ = 1 the optimal policy is identical, but every non-terminal utility in the transition form is higher by exactly 0.04, because it no longer counts the reward of the state you are standing in. Switch between them to see this.</p>'],
      ['What to try', '<ul><li>Default settings: value iteration converges to the familiar utilities 0.812, 0.868, 0.918 along the top row.</li><li>Change the living reward to −0.4 or −2 and watch the policy grow reckless, heading for an exit even past the −1 cell.</li><li>Policy iteration needs only a handful of iterations; value iteration needs many more.</li><li>Tick “Show each state” to see the backup at every single state, with the value of each action.</li></ul>']],
    mount(root, ctx) {
      const st = { algo: 'vi', r: -0.04, gamma: 1, pOk: 0.8, conv: 'state', detail: false };
      const Lg = AI.layout(root);
      Lg.stage.style.aspectRatio = '4 / 3.1'; Lg.stage.style.minHeight = '0';
      let frame = null, m = null;
      const sv = AI.svgHost(Lg.stage, ctx, (w, h) => frame ? gridSVG(w, h, m, { U: frame.U, pi: frame.pi, hl: frame.hl, start: '1,1', id: 'vi' }) : '');
      const banner = AI.banner(Lg.stage);
      const player = AI.Player(Lg.stageCol, ctx, f => { frame = f; sv.redraw(); pseudo.hl(f.line); ex.innerHTML = f.msg; stats.set('it', f.it); stats.set('d', f.delta == null ? '–' : f.delta.toFixed(4)); stats.set('u11', fu(f.U['1,1'])); }, { speed: 300 });
      const pc = AI.panel(Lg.side, 'Algorithm and world');
      const refs = AI.controls(pc, [{ t: 'seg', k: 'algo', label: '', opts: [['vi', 'Value iteration'], ['pi', 'Policy iteration']] }, { t: 'row' }, { t: 'range', k: 'r', label: 'Living reward r (per step)', min: -2, max: 0.2, step: 0.01, fmt: v => v.toFixed(2) }, { t: 'range', k: 'gamma', label: 'Discount γ', min: 0.5, max: 1, step: 0.01, fmt: v => v.toFixed(2) }, { t: 'range', k: 'pOk', label: 'P(move goes the intended way)', min: 0.4, max: 1, step: 0.05, fmt: v => v.toFixed(2) }, { t: 'row' }, { t: 'seg', k: 'conv', label: 'Reward written as', opts: [['state', 'R(s), 3rd ed.'], ['transition', 'R(s,a,s′), 4th ed.']] }, { t: 'row' }, { t: 'check', k: 'detail', label: 'Show each state (value iteration)' }, { t: 'row' }, { t: 'btn', label: 'Book settings', icon: 'reset', on: () => { Object.assign(st, { r: -0.04, gamma: 1, pOk: 0.8, conv: 'state' }); refs.sync(); build(); } }], st, () => build());
      const ppc = AI.panel(Lg.side, 'Pseudocode'); let pseudo = AI.pseudo(ppc, PSEUDO_VI('state'));
      const pe = AI.panel(Lg.side, 'This step'); const ex = AI.el('<div class="explain small"></div>'); pe.appendChild(ex);
      const ps = AI.panel(Lg.side, 'Progress'); const stats = AI.stats(ps, [['it', 'iteration'], ['d', 'max change δ'], ['u11', 'U(1,1)']]);
      const pch = AI.panel(Lg.below, 'Utility estimates as value iteration runs'); const cbox = AI.el('<div></div>'); pch.appendChild(cbox);
      const chart = AI.chart(cbox, ctx, { height: 240, xLabel: 'iteration', right: 64 });
      function rebuildPseudo() { ppc.querySelectorAll('.pseudo').forEach(e => e.remove()); pseudo = AI.pseudo(ppc, st.algo === 'vi' ? PSEUDO_VI(st.conv) : PSEUDO_PI(st.conv)); }
      function build() {
        rebuildPseudo();
        m = E.gridMDP({ r: st.r, gamma: st.gamma, pOk: st.pOk, conv: st.conv });
        const diverge = st.gamma >= 1 && st.r > 0;
        if (diverge) banner('With r &gt; 0 and γ = 1 the agent never wants to leave and utilities grow without bound. Lower γ.', 3600);
        const frames = [];
        if (st.algo === 'vi') {
          const hist = E.valueIteration(m, 1e-4, diverge ? 60 : 400);
          frames.push({ U: hist[0].U, pi: null, it: 0, delta: null, line: 2, msg: 'All non-terminal utilities start at 0' + (st.conv === 'state' ? '; terminal states are fixed at +1 and −1.' : '; the +1 and −1 are rewards for entering the exits, so exits have utility 0.') });
          for (let it = 1; it < hist.length; it++) {
            const prev = hist[it - 1].U, next = hist[it].U;
            if (st.detail) {
              const cur = Object.assign({}, prev); let d = 0;
              m.states.forEach(k => {
                if (m.isTerm(k)) return; const qs = ['U', 'R', 'D', 'L'].map(a => [a, m.Q(prev, k, a)]); const bq = Math.max(...qs.map(q => q[1]));
                cur[k] = next[k]; d = Math.max(d, Math.abs(next[k] - prev[k]));
                const name = { U: 'Up', R: 'Right', D: 'Down', L: 'Left' };
                frames.push({ U: Object.assign({}, cur), pi: null, hl: new Set([k]), it, delta: d, line: 6, msg: `Iteration ${it}, state (${k}). Expected value of each action using the previous utilities:<br>${qs.map(([a, q]) => `${Math.abs(q - bq) < 1e-12 ? '<b>' : ''}${name[a]} ${q.toFixed(4)}${Math.abs(q - bq) < 1e-12 ? '</b>' : ''}`).join(' · ')}<br>${st.conv === 'state' ? `U′ = R(s) + γ × best = ${st.r.toFixed(2)} + ${st.gamma.toFixed(2)} × ${bq.toFixed(4)} = <b>${next[k].toFixed(4)}</b>` : `U′ = best = <b>${next[k].toFixed(4)}</b>`}` });
              });
            }
            frames.push({ U: next, pi: hist[it].pi, it, delta: hist[it].delta, line: 8, msg: `Iteration ${it} complete. The largest change was δ = ${hist[it].delta.toFixed(5)}.` + (it === hist.length - 1 && !diverge ? ' That is below the threshold, so value iteration stops. The arrows are the policy that is greedy with respect to these utilities.' : '') });
          }
          frames.push(Object.assign({}, frames[frames.length - 1], { line: 9, msg: diverge ? 'Stopped after 60 iterations: with these settings the utilities do not converge.' : `Converged after ${hist.length - 1} iterations. U(1,1) = ${hist[hist.length - 1].U['1,1'].toFixed(3)}.` }));
          const keys = ['3,3', '1,3', '1,1', '3,1', '4,1'], cols = ['var(--v-path)', 'var(--v-chance)', 'var(--accent)', 'var(--v-goal)', 'var(--v-bad)'];
          chart.set(keys.map((k, i) => ({ name: `(${k})`, color: cols[i], values: hist.map(h => h.U[k]) })));
          pch.hidden = false;
        } else {
          const pi0 = {}; m.states.forEach(k => { if (!m.isTerm(k)) pi0[k] = 'R'; });
          const hist = E.policyIteration(m, pi0);
          hist.forEach((h, i) => {
            const U = Object.assign({}, h.U); if (st.gamma >= 1) trapSet(m, h.pi).forEach(k => { U[k] = st.r < 0 ? -Infinity : st.r > 0 ? Infinity : 0; });
            frames.push({ U, pi: h.pi, it: i + 1, delta: null, line: 4, msg: `Iteration ${i + 1}: evaluate the current policy exactly (solve its Bellman equations).${Object.values(U).some(v => v === -Infinity) ? ' Some states never reach an exit under this policy, so with γ = 1 their utility is −∞.' : ''}` });
            const changed = new Set(m.states.filter(k => !m.isTerm(k) && h.next[k] !== h.pi[k]));
            frames.push({ U, pi: h.next, hl: changed, it: i + 1, delta: null, line: changed.size ? 8 : 9, msg: changed.size ? `Improve: in ${changed.size} state${changed.size > 1 ? 's' : ''} (outlined) another action has a higher expected value, so the arrow changes.` : 'No action improves on the current policy anywhere, so it is optimal. Policy iteration stops.' });
          });
          frames.push(Object.assign({}, frames[frames.length - 1], { hl: null, line: 10, msg: `Optimal policy found after ${hist.length} evaluations.` }));
          pch.hidden = true;
        }
        player.set(frames, true);
      }
      build();
    }
  });

  /* =====================================================================
     5. Game: design the optimal policy yourself
     ===================================================================== */
  const LEVELS = [
    { r: -0.04, gamma: 1, name: 'The book’s world', hint: 'Each step costs 0.04. Is the short route past the −1 worth the risk of slipping into it?' },
    { r: -0.01, gamma: 1, name: 'Cheap steps', hint: 'Steps cost only 0.01. How much trouble is it worth to stay clear of the −1?' },
    { r: -0.4, gamma: 1, name: 'Painful steps', hint: 'Each step now costs 0.4, so a long route is expensive.' },
    { r: -2, gamma: 1, name: 'Unbearable', hint: 'Each step costs 2: more than the penalty of the −1 exit.' },
    { r: 0.1, gamma: 0.95, name: 'Life is good', hint: 'Each step earns 0.1 and the future is discounted by 0.95. Staying forever is worth 0.1 / (1 − 0.95) = 2.' }
  ];
  AI.lab({
    id: 'policy-game', ch: 17, kind: 'game', title: 'Design the optimal policy',
    blurb: 'Set an arrow in every square of the 4×3 world, then see the exact value of your policy and how close it is to optimal. Five levels with different living rewards.',
    tags: ['policy', 'MDP', 'utility of a policy', 'living reward', 'policy evaluation'],
    how: [['How to play', '<p>Click a square to turn its arrow. When you are happy, check the policy: every square shows the exact expected utility of following <i>your</i> policy from there, and squares where a better action exists show it as a dashed arrow.</p>'],
      ['Scoring', '<p>You score one point for each of the nine squares whose action is optimal. Where two actions are exactly as good, either one counts.</p>'],
      ['Why the levels differ', '<p>The living reward changes what is worth risking. The book describes how the optimal policy for the 4×3 world changes as r moves from very negative to positive; these levels let you discover it yourself.</p>']],
    mount(root, ctx) {
      const st = { lv: 0 };
      const Lp = AI.layout(root);
      Lp.stage.style.aspectRatio = '4 / 3.1'; Lp.stage.style.minHeight = '0';
      let m, pi, U = null, opt = null, checked = false;
      const sv = AI.svgHost(Lp.stage, ctx, (w, h) => m ? gridSVG(w, h, m, { U: checked ? U : null, pi, ghost: checked ? opt.ghost : null, hl: checked ? opt.wrong : null, edit: true, start: '1,1', id: 'pg' }) : '');
      const banner = AI.banner(Lp.stage);
      const bar = AI.el('<div class="player"></div>'); Lp.stageCol.appendChild(bar);
      const bCheck = AI.el(`<button type="button" class="btn primary">${AI.icon.trophy}<span>Check my policy</span></button>`), bSim = AI.el(`<button type="button" class="btn">${AI.icon.dice}<span>Run 1,000 episodes</span></button>`), bShow = AI.el(`<button type="button" class="btn">${AI.icon.bulb}<span>Show the optimal policy</span></button>`), bClear = AI.el(`<button type="button" class="btn">${AI.icon.reset}<span>Reset arrows</span></button>`);
      bar.append(bCheck, bSim, bShow, bClear);
      const pl = AI.panel(Lp.side, 'Level');
      AI.controls(pl, [{ t: 'select', k: 'lv', label: '', opts: LEVELS.map((l, i) => [i, `${i + 1}. ${l.name} (r = ${l.r}, γ = ${l.gamma})`]) }], st, () => load());
      const hint = AI.el('<p class="small" style="margin:8px 0 0"></p>'); pl.appendChild(hint);
      const ps = AI.panel(Lp.side, 'Your policy'); const stats = AI.stats(ps, [['score', 'optimal squares'], ['you', 'your U(1,1)'], ['best', 'optimal U(1,1)']]);
      const pr = AI.panel(Lp.side, 'Feedback'); const ex = AI.el('<div class="explain small">Click squares to set the arrows, then check.</div>'); pr.appendChild(ex);
      const cycle = { U: 'R', R: 'D', D: 'L', L: 'U' };
      function load() { const L = LEVELS[st.lv]; m = E.gridMDP({ r: L.r, gamma: L.gamma }); pi = {}; m.states.forEach(k => { if (!m.isTerm(k)) pi[k] = 'U'; }); checked = false; hint.textContent = L.hint; computeOpt(); stats.set('score', '–'); stats.set('you', '–'); const b = AI.progress.best('policy-lv' + st.lv); stats.set('best', fu(opt.U['1,1'])); ex.innerHTML = `Click squares to set the arrows, then check.${b != null ? ` Your best on this level: ${b} / 9.` : ''}`; sv.redraw(); }
      function computeOpt() {
        const h = E.valueIteration(m, 1e-10, 6000), Us = h[h.length - 1].U, good = {};
        m.states.forEach(k => { if (m.isTerm(k)) return; const qs = ['U', 'R', 'D', 'L'].map(a => [a, m.Q(Us, k, a)]); const b = Math.max(...qs.map(q => q[1])); good[k] = new Set(qs.filter(q => q[1] >= b - 1e-6 * Math.max(1, Math.abs(b))).map(q => q[0])); });
        opt = { U: Us, pi: m.policy(Us), good, ghost: null, wrong: null };
      }
      function check() {
        U = evalPolicy(m, pi); checked = true; const wrong = new Set(m.states.filter(k => !m.isTerm(k) && !opt.good[k].has(pi[k])));
        opt.wrong = wrong; opt.ghost = {}; wrong.forEach(k => opt.ghost[k] = opt.pi[k]);
        const score = 9 - wrong.size; stats.set('score', `${score} / 9`, score === 9 ? 'good' : ''); stats.set('you', fu(U['1,1']), U['1,1'] >= opt.U['1,1'] - 1e-6 ? 'good' : '');
        const better = AI.progress.best('policy-lv' + st.lv, score);
        ex.innerHTML = score === 9 ? `<b>Optimal.</b> Your policy is worth ${fu(U['1,1'])} from the start, the best possible.${better ? ' New best for this level.' : ''}` : `${score} of 9 squares are optimal. The outlined squares have a better action, shown dashed. Your policy is worth ${fu(U['1,1'])} from the start; the optimal one is worth ${fu(opt.U['1,1'])}.${U['1,1'] === -Infinity ? ' Some squares never reach an exit under your policy, so with γ = 1 their utility is −∞.' : ''}`;
        sv.redraw();
      }
      ctx.on(Lp.stage, 'click', e => { const c = e.target.closest('[data-k]'); if (!c) return; pi[c.dataset.k] = cycle[pi[c.dataset.k]]; checked = false; sv.redraw(); });
      bCheck.onclick = check; bClear.onclick = () => { m.states.forEach(k => { if (!m.isTerm(k)) pi[k] = 'U'; }); checked = false; ex.textContent = 'Arrows reset.'; stats.set('score', '–'); stats.set('you', '–'); sv.redraw(); };
      bShow.onclick = () => { pi = Object.assign({}, opt.pi); check(); ex.innerHTML = `This is an optimal policy, found by value iteration. Its value from the start is ${fu(opt.U['1,1'])}.`; };
      bSim.onclick = () => { const r = AI.rng((Math.random() * 1e9) | 0); let tot = 0, len = 0, cut = 0; for (let i = 0; i < 1000; i++) { const o = E.simulate(m, pi, '1,1', r, 400); tot += o.total; len += o.steps; if (!m.isTerm(o.path[o.path.length - 1])) cut++; } const Uk = evalPolicy(m, pi)['1,1']; banner(`Average return ${(tot / 1000).toFixed(3)} over 1,000 episodes<small>Exact value of this policy: ${fu(Uk)}. Average length ${(len / 1000).toFixed(1)} steps${cut ? `; ${cut} episodes were cut off at 400 steps` : ''}.</small>`, 4200); };
      load();
    }
  });

  /* =====================================================================
     6. Bandits: play the casino yourself, then compare with UCB and Thompson sampling
     ===================================================================== */
  function makeArms(k, r) { for (;;) { const p = AI.range(k).map(() => 0.1 + 0.8 * r()); const s = p.slice().sort((a, b) => b - a); if (s[0] - s[1] >= 0.06) return p.map(x => Math.round(x * 100) / 100); } }
  function avgRuns(probs, mk, T, runs, r) { const reg = new Float64Array(T); let rew = 0; for (let i = 0; i < runs; i++) { const o = E.bandit.run(probs, mk(), T, r); rew += o.reward; o.regret.forEach((v, t) => reg[t] += v); } return { reward: rew / runs, regret: Array.from(reg, v => v / runs) }; }
  Object.assign(AI._decide, { trapSet, evalPolicy, makeArms, avgRuns, LEVELS });
  const POLS = [['greedy', () => E.bandit.policies.greedy(), 'var(--muted)'], ['eps', () => E.bandit.policies.eps(0.1), 'var(--v-chance)'], ['ucb', () => E.bandit.policies.ucb(), 'var(--v-path)'], ['ts', () => E.bandit.policies.thompson(), 'var(--v-goal)']];
  AI.lab({
    id: 'bandits', ch: 17, kind: 'game', title: 'The bandit casino',
    blurb: 'Four slot machines pay out with hidden probabilities. Balance exploring and exploiting for a fixed number of pulls, then see how greedy, ε-greedy, UCB1 and Thompson sampling would have done.',
    tags: ['multi-armed bandit', 'exploration vs exploitation', 'regret', 'UCB', 'Thompson sampling'],
    how: [['The problem', '<p>Each machine pays a coin with its own fixed probability. You do not know the probabilities; you only see what happens when you pull. Pull the best machine too rarely and you never find out it is best; pull the others too often and you waste pulls.</p>'],
      ['Regret', '<p>Regret is the expected number of coins lost compared with always pulling the best machine: the sum over your pulls of (best probability − probability of the machine you pulled). Good strategies make regret grow only logarithmically with the number of pulls.</p>'],
      ['The strategies', '<ul><li><b>Greedy</b>: try each machine once, then always pull the one with the best average so far.</li><li><b>ε-greedy</b>: like greedy, but pull a random machine 10% of the time.</li><li><b>UCB1</b>: pull the machine with the highest average + √(2 ln t / n), an optimistic bound.</li><li><b>Thompson sampling</b>: sample a plausible probability for each machine from its Beta posterior and pull the best sample.</li></ul>']],
    mount(root, ctx) {
      const st = { mode: 'play', T: 60, K: 3, H: 1000, runs: 200 };
      const Lb = AI.layout(root);
      const stage = AI.el('<div style="padding:clamp(12px,2vw,22px);display:grid;gap:14px"></div>'); Lb.stage.appendChild(stage); Lb.stage.classList.add('plain');
      const banner = AI.banner(Lb.stage);
      const pm = AI.panel(Lb.side, 'Mode');
      const refs = AI.controls(pm, [{ t: 'seg', k: 'mode', label: '', opts: [['play', 'Play'], ['compare', 'Compare strategies']] }, { t: 'row' }, { t: 'seg', k: 'T', label: 'Pulls per game', opts: [[30, '30'], [60, '60'], [100, '100']] }, { t: 'range', k: 'K', label: 'Number of machines', min: 2, max: 10, step: 1 }, { t: 'range', k: 'H', label: 'Pulls per run', min: 100, max: 5000, step: 100 }, { t: 'range', k: 'runs', label: 'Runs to average', min: 20, max: 400, step: 20 }, { t: 'row' }, { t: 'btn', label: 'Run', icon: 'play', cls: 'primary', id: 'run', on: () => compare() }], st, k => { if (k === 'mode') layout(); else if (k === 'T') newGame(); });
      const ps = AI.panel(Lb.side, 'This game'); const stats = AI.stats(ps, [['left', 'pulls left'], ['coins', 'coins won'], ['best', 'best game']]);
      const pr = AI.panel(Lb.below, 'Results'); const res = AI.el('<div class="explain small">Finish a game to compare yourself with the four strategies on exactly the same machines.</div>'); pr.appendChild(res);
      const cbox = AI.el('<div></div>'); pr.appendChild(cbox); const chart = AI.chart(cbox, ctx, { height: 260, xLabel: 'pull', yLabel: 'regret', right: 150 });
      let arms, n, w, picks, coins, done;
      function layout() { const play = st.mode === 'play'; refs.TField.hidden = !play; ['K', 'H', 'runs'].forEach(k => refs[k + 'Field'].hidden = play); refs.run.hidden = play; ps.hidden = !play; if (play) newGame(); else { stage.innerHTML = '<p class="lede" style="margin:0">Each strategy plays many independent runs on machines whose probabilities are drawn at random. The curves show average regret.</p>'; res.textContent = 'Press Run.'; chart.set([]); } }
      function newGame() { const r = AI.rng((Math.random() * 1e9) | 0); arms = makeArms(4, r); n = [0, 0, 0, 0]; w = [0, 0, 0, 0]; picks = []; coins = 0; done = false; draw(); res.textContent = 'Finish a game to compare yourself with the four strategies on exactly the same machines.'; chart.set([]); }
      function draw(flash) {
        stage.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px">${arms.map((p, i) => `<button type="button" class="pick" data-a="${i}" ${done ? 'disabled' : ''} style="text-align:center;justify-items:center;padding:16px 10px;${flash && flash.i === i ? `background:color-mix(in srgb,${flash.win ? 'var(--ok)' : 'var(--line2)'} 22%,var(--bg))` : ''}"><span class="small muted">Machine ${i + 1} · key ${i + 1}</span><svg viewBox="0 0 60 60" width="56" height="56" aria-hidden="true"><rect x="8" y="6" width="44" height="48" rx="8" fill="none" stroke="var(--ink2)" stroke-width="3"/><rect x="15" y="15" width="30" height="16" rx="3" fill="${flash && flash.i === i ? (flash.win ? 'var(--ok)' : 'var(--bg3)') : 'var(--bg3)'}"/><circle cx="30" cy="43" r="5" fill="var(--accent)"/></svg><b style="font-family:var(--display);font-size:22px">${w[i]} / ${n[i]}</b><span class="small">${n[i] ? `rate ${(w[i] / n[i]).toFixed(2)}` : 'not tried'}</span>${done ? `<span class="small" style="color:${p === Math.max(...arms) ? 'var(--ok)' : 'var(--muted)'}"><b>true p = ${p.toFixed(2)}</b></span>` : ''}</button>`).join('')}</div>`;
        stage.querySelectorAll('[data-a]').forEach(b => b.onclick = () => pull(+b.dataset.a));
        const best = AI.progress.best('bandit-' + st.T); stats.set('left', st.T - picks.length); stats.set('coins', coins); stats.set('best', best == null ? '–' : best);
      }
      function pull(i) { if (done) return; const win = Math.random() < arms[i] ? 1 : 0; n[i]++; w[i] += win; coins += win; picks.push(i); if (picks.length >= st.T) { done = true; finish(); } draw({ i, win }); }
      ctx.key(e => { if (st.mode !== 'play') return; const k = +e.key; if (k >= 1 && k <= 4 && !/INPUT|SELECT|TEXTAREA/.test((document.activeElement || {}).tagName || '')) { e.preventDefault(); pull(k - 1); } });
      function finish() {
        const pbest = Math.max(...arms); let reg = 0; const mine = picks.map(i => (reg += pbest - arms[i]));
        AI.progress.best('bandit-' + st.T, coins);
        const r = AI.rng((Math.random() * 1e9) | 0); const out = POLS.map(([k, mk, c]) => [k, avgRuns(arms, mk, st.T, 1000, r), c, mk().name]);
        res.innerHTML = `<p style="margin:0 0 8px">You won <b>${coins}</b> coins. Always pulling the best machine (p = ${pbest.toFixed(2)}) would earn ${(pbest * st.T).toFixed(1)} on average, so your regret is <b>${reg.toFixed(1)}</b> coins.</p>` + AI.table(['Strategy', 'r:Average coins', 'r:Average regret'], [`<tr><td><b>You</b></td><td class="r">${coins}</td><td class="r"><b>${reg.toFixed(1)}</b></td></tr>`].concat(out.map(([k, o, c, nm]) => `<tr><td>${esc(nm)}</td><td class="r">${o.reward.toFixed(1)}</td><td class="r">${o.regret[st.T - 1].toFixed(1)}</td></tr>`)), 'compact') + '<p class="small muted" style="margin:8px 0 0">Strategies are averaged over 1,000 runs on the same four machines; your game is a single run, so luck plays a part.</p>';
        chart.set([{ name: 'you', color: 'var(--accent)', values: mine, width: 3 }].concat(out.map(([k, o, c, nm]) => ({ name: nm, color: c, values: o.regret }))));
        banner(`Game over: ${coins} coins<small>Scroll down to compare with the four strategies.</small>`, 2600);
      }
      function compare() {
        res.textContent = 'Running…'; refs.run.disabled = true;
        ctx.after(30, () => {
          const r = AI.rng(12345); const regs = POLS.map(() => new Float64Array(st.H));
          for (let i = 0; i < st.runs; i++) { const probs = AI.range(st.K).map(() => r()); POLS.forEach(([k, mk], j) => { const o = E.bandit.run(probs, mk(), st.H, r); o.regret.forEach((v, t) => regs[j][t] += v); }); }
          const series = POLS.map(([k, mk, c], j) => ({ name: mk().name, color: c, values: Array.from(regs[j], v => v / st.runs) }));
          chart.set(series); refs.run.disabled = false;
          const rank = series.slice().sort((a, b) => a.values[st.H - 1] - b.values[st.H - 1]);
          res.innerHTML = AI.table(['Strategy', 'r:Average regret after ' + st.H + ' pulls'], rank.map(sr => `<tr><td>${esc(sr.name)}</td><td class="r">${sr.values[st.H - 1].toFixed(1)}</td></tr>`), 'compact') + `<p class="small" style="margin:8px 0 0">Lowest regret in this experiment: <b>${esc(rank[0].name)}</b>. ${st.K} machines with probabilities drawn uniformly between 0 and 1, averaged over ${st.runs} runs.</p><p class="small muted" style="margin:6px 0 0">How to read the curves: a regret curve that keeps rising in a straight line belongs to a strategy that keeps making the same kind of mistake (greedy can lock onto a poor machine for good; ε-greedy never stops pulling at random). A curve that bends over is learning. UCB1 explores heavily early on, which costs a lot on short runs, especially with many machines; try 2 machines and 5,000 pulls to see it overtake the simpler strategies.</p>`;
        });
      }
      layout();
    }
  });
})(window);
