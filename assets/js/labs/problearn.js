/* Chapter 20 labs: Bayesian learning with the candy bags, a guessing game, Beta priors,
   naive Bayes text classification, and clustering with k-means and EM. */
(function (G) {
  'use strict';
  const AI = G.AI, E = G.AIE, esc = AI.esc, P = AI._plane;
  const C = E.candy, HN = ['h₁', 'h₂', 'h₃', 'h₄', 'h₅'], HD = ['100% cherry', '75% cherry, 25% lime', '50% cherry, 50% lime', '25% cherry, 75% lime', '100% lime'];
  const COLS = ['var(--accent)', 'var(--warn)', 'var(--v-chance)', 'var(--v-goal)', 'var(--v-path)'];
  const candySVG = (o, sz) => `<svg viewBox="0 0 40 24" width="${sz || 34}" height="${(sz || 34) * 0.6}" aria-label="${o === 'L' ? 'lime' : 'cherry'}"><path d="M2 6 L9 12 L2 18 Z M38 6 L31 12 L38 18 Z" fill="${o === 'L' ? '#4c9a2a' : '#c4314b'}"/><ellipse cx="20" cy="12" rx="12" ry="9" fill="${o === 'L' ? '#6cc04a' : '#e0475f'}" stroke="${o === 'L' ? '#3f7f22' : '#a3283c'}" stroke-width="1.5"/></svg>`;

  /* =====================================================================
     The candy bags: full Bayesian learning versus MAP
     ===================================================================== */
  AI.lab({
    id: 'candy-bags', ch: 20, kind: 'demo', title: 'Bayesian learning: which bag of sweets is it?',
    blurb: 'The book’s surprise-candy example. Five kinds of bag, a prior over them, and a stream of unwrapped sweets. Watch the posterior over hypotheses and the prediction for the next sweet.',
    tags: ['Bayesian learning', 'posterior', 'MAP hypothesis', 'maximum likelihood', 'prediction'],
    how: [['The hypotheses (from the book)', '<p>h₁: 100% cherry, h₂: 75% cherry and 25% lime, h₃: 50 : 50, h₄: 25% cherry and 75% lime, h₅: 100% lime, with prior probabilities 0.1, 0.2, 0.4, 0.2, 0.1. Sweets are drawn independently, so P(d | hᵢ) is a product.</p>'],
      ['Two ways to predict', '<p><b>Bayesian prediction</b> averages over all hypotheses: P(next = lime | d) = Σᵢ P(lime | hᵢ) P(hᵢ | d). <b>MAP prediction</b> uses only the single most probable hypothesis. They agree in the long run but can differ a lot early on.</p>'],
      ['Numbers to check', '<p>With the book’s all-lime sequence, one lime gives posterior ⟨0, 0.1, 0.4, 0.3, 0.2⟩ and predicts lime with probability 0.65.</p>']],
    mount(root, ctx) {
      const st = { truth: 4, mode: 'book' }; let obs = [];
      const Lc = AI.layout(root);
      const top = AI.el('<div style="padding:12px 14px 0;display:flex;flex-wrap:wrap;gap:4px;min-height:44px;align-items:center"></div>'); Lc.stage.appendChild(top); Lc.stage.classList.add('plain');
      const c1 = AI.el('<div style="padding:0 6px"></div>'), c2 = AI.el('<div style="padding:0 6px 8px"></div>'); Lc.stage.append(c1, c2);
      const ch1 = AI.chart(c1, ctx, { height: 220, yMin: 0, yMax: 1, xLabel: 'number of sweets observed', right: 60 });
      const ch2 = AI.chart(c2, ctx, { height: 170, yMin: 0, yMax: 1, xLabel: 'number of sweets observed', right: 140 });
      const pc = AI.panel(Lc.side, 'Sweets');
      AI.controls(pc, [{ t: 'seg', k: 'mode', label: 'Sequence', opts: [['book', 'All lime (book)'], ['draw', 'Draw from a bag']] }, { t: 'select', k: 'truth', label: 'True bag when drawing', opts: HN.map((h, i) => [i, `${h}: ${HD[i]}`]) }, { t: 'row' }, { t: 'btn', label: 'Next sweet', icon: 'next', cls: 'primary', on: () => more(1) }, { t: 'btn', label: '+10', on: () => more(10) }, { t: 'btn', label: 'Clear', icon: 'reset', on: () => { obs = []; run(); } }], st, () => { obs = []; run(); });
      const ps = AI.panel(Lc.side, 'Now'); const stats = AI.stats(ps, [['map', 'MAP hypothesis'], ['bay', 'P(next is lime)'], ['mapP', 'MAP’s P(next is lime)']]);
      const pt = AI.panel(Lc.below, 'Posterior after each sweet'); const tab = AI.el('<div></div>'); pt.appendChild(tab);
      function more(n) { const r = Math.random; for (let i = 0; i < n && obs.length < 40; i++) obs.push(st.mode === 'book' ? 'L' : (r() < C.lime[st.truth] ? 'L' : 'C')); run(); }
      function run() {
        top.innerHTML = obs.length ? obs.map(o => candySVG(o, 28)).join('') : '<span class="small muted">No sweets unwrapped yet: the posterior is the prior.</span>';
        const post = AI.range(obs.length + 1).map(k => C.posterior(obs.slice(0, k))), pred = post.map(p => p.reduce((s, x, i) => s + x * C.lime[i], 0));
        const mapIdx = p => p.reduce((bi, x, i) => x > p[bi] + 1e-12 ? i : bi, 0);
        ch1.set(HN.map((h, i) => ({ name: `P(${h} | d)`, color: COLS[i], values: post.map(p => p[i]) })));
        ch2.set([{ name: 'Bayesian', color: 'var(--v-path)', values: pred }, { name: 'MAP', color: 'var(--accent)', values: post.map(p => C.lime[mapIdx(p)]), dash: '6 4' }]);
        const last = post[post.length - 1], mi = mapIdx(last); stats.set('map', `${HN[mi]} (${last[mi].toFixed(2)})`); stats.set('bay', pred[pred.length - 1].toFixed(3)); stats.set('mapP', C.lime[mi].toFixed(2));
        tab.innerHTML = AI.table(['Sweets', 'Seen'].concat(HN.map(h => 'r:' + h)).concat(['r:P(next lime)']), post.slice(0, 13).map((p, k) => `<tr><td>${k}</td><td>${k ? (obs[k - 1] === 'L' ? 'lime' : 'cherry') : '–'}</td>${p.map((x, i) => `<td class="r"${i === mapIdx(p) ? ' style="font-weight:700"' : ''}>${x.toFixed(3)}</td>`).join('')}<td class="r">${pred[k].toFixed(3)}</td></tr>`), 'compact') + (post.length > 13 ? '<p class="small muted" style="margin:6px 0 0">First 12 sweets shown. Bold marks the MAP hypothesis.</p>' : '<p class="small muted" style="margin:6px 0 0">Bold marks the MAP hypothesis.</p>');
      }
      run();
    }
  });

  /* ---------- game: guess the bag ---------- */
  AI.lab({
    id: 'which-bag', ch: 20, kind: 'game', title: 'Guess the bag',
    blurb: 'A bag is chosen at random using the book’s prior. Unwrap sweets one at a time and name the bag when you are confident. Every sweet costs a point, every wrong guess costs ten.',
    tags: ['Bayesian learning', 'posterior', 'sequential decision', 'value of information'],
    how: [['Scoring', '<p>A correct guess earns 10 points minus one for each sweet you unwrapped. A wrong guess loses 10. Five rounds per game.</p>'],
      ['Strategy', '<p>The best moment to guess is when the posterior on one bag is high enough that another sweet is not worth its cost. After each round you see the exact posterior you could have computed.</p>']],
    mount(root, ctx) {
      const Lw = AI.layout(root);
      const body = AI.el('<div style="padding:clamp(14px,2.4vw,26px);display:grid;gap:14px"></div>'); Lw.stage.appendChild(body); Lw.stage.classList.add('plain');
      const ps = AI.panel(Lw.side, 'Game'); const stats = AI.stats(ps, [['round', 'round'], ['score', 'score'], ['best', 'best game']]);
      let g;
      function newGame() { g = { round: 0, score: 0, log: [] }; newRound(); }
      function newRound() { const u = Math.random(); let acc = 0, h = 4; for (let i = 0; i < 5; i++) { acc += C.prior[i]; if (u < acc) { h = i; break; } } g.h = h; g.obs = []; g.done = false; draw(); }
      function draw() {
        const b = AI.progress.best('which-bag'); stats.set('round', `${Math.min(g.round + 1, 5)} / 5`); stats.set('score', g.score); stats.set('best', b == null ? '–' : b);
        if (g.round >= 5) { const better = AI.progress.best('which-bag', g.score); body.innerHTML = `<div class="score-big">${g.score}</div><p class="lede" style="margin:8px 0 12px">Final score over five bags.${better ? ' New best.' : ''}</p>${AI.table(['Round', 'Bag', 'Sweets', 'Your guess', 'r:Points'], g.log, 'compact')}<button type="button" class="btn primary" style="margin-top:12px">${AI.icon.reset}<span>Play again</span></button>`; body.querySelector('button').onclick = newGame; return; }
        const post = C.posterior(g.obs);
        body.innerHTML = `<p class="lede" style="margin:0">Bag ${g.round + 1} of 5. Prior: h₁ 0.1, h₂ 0.2, h₃ 0.4, h₄ 0.2, h₅ 0.1.</p><div style="display:flex;flex-wrap:wrap;gap:4px;min-height:40px;align-items:center">${g.obs.length ? g.obs.map(o => candySVG(o, 30)).join('') : '<span class="small muted">No sweets unwrapped yet.</span>'}</div>
          ${g.done ? '' : `<div><button type="button" class="btn primary" data-more>${AI.icon.next}<span>Unwrap a sweet (−1)</span></button></div>`}
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px">${HN.map((h, i) => `<button type="button" class="pick" data-g="${i}" ${g.done ? 'disabled' : ''} style="padding:10px 12px;${g.done && i === g.h ? 'border-color:var(--ok);box-shadow:0 0 0 1px var(--ok)' : ''}"><b>${h}</b><span class="small muted">${HD[i]}</span>${g.done ? `<span class="small">posterior ${post[i].toFixed(3)}</span>` : ''}</button>`).join('')}</div><div data-fb></div>`;
        const m = body.querySelector('[data-more]'); if (m) m.onclick = () => { g.obs.push(Math.random() < C.lime[g.h] ? 'L' : 'C'); g.score -= 1; draw(); };
        body.querySelectorAll('[data-g]').forEach(b2 => b2.onclick = () => {
          if (g.done) return; const i = +b2.dataset.g, ok = i === g.h, pts = ok ? 10 : -10; g.score += pts; g.done = true; g.log.push(`<tr><td>${g.round + 1}</td><td>${HN[g.h]}</td><td>${g.obs.length}</td><td>${HN[i]}</td><td class="r">${pts - g.obs.length}</td></tr>`);
          const mi = post.reduce((bi, x, k) => x > post[bi] ? k : bi, 0); draw();
          body.querySelector('[data-fb]').innerHTML = `<p style="margin:0 0 10px"><b>${ok ? 'Correct.' : 'Wrong.'}</b> It was ${HN[g.h]} (${HD[g.h]}). Your guess had posterior probability ${post[i].toFixed(3)}; the most probable bag given what you saw was ${HN[mi]} (${post[mi].toFixed(3)}).</p><button type="button" class="btn primary">${AI.icon.next}<span>${g.round >= 4 ? 'See the final score' : 'Next bag'}</span></button>`;
          body.querySelector('[data-fb] button').onclick = () => { g.round++; if (g.round >= 5) draw(); else newRound(); };
        });
      }
      newGame();
    }
  });

  /* =====================================================================
     Beta priors for a coin (Bayesian parameter learning)
     ===================================================================== */
  const lgamma = z => { const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let x = z, y = z, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015; for (let j = 0; j < 6; j++) s += c[j] / ++y; return -t + Math.log(2.5066282746310005 * s / x); };
  const betaPdf = (x, a, b) => x <= 0 || x >= 1 ? 0 : Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - (lgamma(a) + lgamma(b) - lgamma(a + b)));
  AI._beta = { betaPdf, lgamma };
  AI.lab({
    id: 'beta-coin', ch: 20, kind: 'demo', title: 'Learning a probability with a Beta prior',
    blurb: 'Estimate the chance θ that a bent coin lands heads. Pick a Beta prior, flip, and watch the posterior sharpen. Compare the maximum-likelihood estimate with the Bayesian one.',
    tags: ['Bayesian parameter learning', 'Beta distribution', 'conjugate prior', 'maximum likelihood', 'virtual counts'],
    how: [['Conjugacy', '<p>If the prior over θ is Beta(a, b) and you then see h heads and t tails, the posterior is Beta(a + h, b + t). The hyperparameters behave like <b>virtual counts</b>: a prior of Beta(a, b) acts as though you had already seen a − 1 heads and b − 1 tails.</p>'],
      ['Estimates', '<ul><li>Maximum likelihood: h / (h + t). With no data it is undefined; after one head it jumps to 1.</li><li>Posterior mean: (a + h) / (a + b + h + t), which is pulled towards the prior mean a / (a + b) when data are scarce.</li></ul>']],
    mount(root, ctx) {
      const st = { a: 2, b: 2, theta: 0.7 }; let h = 0, t = 0;
      const Lb = AI.layout(root);
      const box = AI.el('<div style="padding:8px 6px"></div>'); Lb.stage.appendChild(box); Lb.stage.classList.add('plain');
      const sv = AI.svgHost(AI.el('<div style="height:320px;position:relative"></div>'), ctx, (w, hh) => plot(w, hh)); box.appendChild(sv.svg.parentNode);
      const pc = AI.panel(Lb.side, 'Prior and coin');
      AI.controls(pc, [{ t: 'range', k: 'a', label: 'Prior a', min: 1, max: 20, step: 1 }, { t: 'range', k: 'b', label: 'Prior b', min: 1, max: 20, step: 1 }, { t: 'range', k: 'theta', label: 'True θ (hidden from the learner)', min: 0.05, max: 0.95, step: 0.05, fmt: v => v.toFixed(2) }, { t: 'row' }, { t: 'btn', label: 'Flip', icon: 'next', cls: 'primary', on: () => flip(1) }, { t: 'btn', label: '+10', on: () => flip(10) }, { t: 'btn', label: '+100', on: () => flip(100) }, { t: 'btn', label: 'Clear', icon: 'reset', on: () => { h = 0; t = 0; upd(); } }], st, () => upd());
      const ps = AI.panel(Lb.side, 'Estimates'); const stats = AI.stats(ps, [['ht', 'heads : tails'], ['ml', 'maximum likelihood'], ['pm', 'posterior mean']]);
      function flip(n) { for (let i = 0; i < n; i++) { if (Math.random() < st.theta) h++; else t++; } upd(); }
      function plot(w, hh) {
        const L = 40, R = 16, T = 14, B = 34, iw = w - L - R, ih = hh - T - B, A = st.a + h, Bb = st.b + t, N = 300;
        const ys = AI.range(N + 1).map(k => betaPdf(k / N, A, Bb)), ys0 = AI.range(N + 1).map(k => betaPdf(k / N, st.a, st.b)), mx = Math.max(1e-9, ...ys, ...ys0) * 1.08;
        const X = x => L + x * iw, Y = v => T + ih * (1 - v / mx);
        let s = ''; for (let k = 0; k <= 5; k++) { const x = k / 5; s += `<line x1="${X(x)}" x2="${X(x)}" y1="${T}" y2="${T + ih}" stroke="var(--line)"/><text x="${X(x)}" y="${T + ih + 18}" text-anchor="middle" class="svg-s">${x.toFixed(1)}</text>`; }
        s += `<text x="${L + iw / 2}" y="${hh - 4}" text-anchor="middle" class="svg-s">θ, the probability of heads</text>`;
        s += `<polyline points="${ys0.map((v, k) => `${X(k / N).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}" fill="none" stroke="var(--muted)" stroke-width="2" stroke-dasharray="6 5"/>`;
        s += `<polygon points="${X(0)},${Y(0)} ${ys.map((v, k) => `${X(k / N).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')} ${X(1)},${Y(0)}" fill="var(--v-path)" fill-opacity=".16" stroke="var(--v-path)" stroke-width="2.6"/>`;
        s += `<line x1="${X(st.theta)}" x2="${X(st.theta)}" y1="${T}" y2="${T + ih}" stroke="var(--accent)" stroke-width="2"/><text x="${X(st.theta) + 6}" y="${T + 12}" class="svg-s" fill="var(--accent)">true θ</text>`;
        s += `<text x="${X(0.02)}" y="${T + 12}" class="svg-s">dashed: prior Beta(${st.a}, ${st.b}); filled: posterior Beta(${A}, ${Bb})</text>`;
        return s;
      }
      function upd() { stats.set('ht', `${h} : ${t}`); stats.set('ml', h + t ? (h / (h + t)).toFixed(3) : 'no data yet'); stats.set('pm', ((st.a + h) / (st.a + st.b + h + t)).toFixed(3)); sv.redraw(); }
      upd();
    }
  });

  /* =====================================================================
     Naive Bayes text classification (our own small corpus)
     ===================================================================== */
  const CORPUS = [
    ['weather', 'Heavy rain and strong winds are expected along the coast tonight.'], ['weather', 'Sunny skies will give way to clouds and light showers by the afternoon.'], ['weather', 'A cold front brings snow to the hills and frost in the valleys.'], ['weather', 'Temperatures will climb into the thirties with high humidity.'], ['weather', 'Thunderstorms may cause local flooding on low roads.'], ['weather', 'The forecast shows a dry and windy weekend with clear nights.'],
    ['sport', 'The striker scored twice as the home team won the final.'], ['sport', 'Rain stopped play after the opening batsman reached his century.'], ['sport', 'The coach praised the defence after a narrow win away from home.'], ['sport', 'She broke the national record in the hundred metres final.'], ['sport', 'The match was drawn after both goalkeepers made late saves.'], ['sport', 'Fans cheered as the captain lifted the trophy.'],
    ['business', 'Shares rose after the company reported strong quarterly profits.'], ['business', 'The central bank kept interest rates unchanged this month.'], ['business', 'Investors sold bank stocks as bond yields climbed.'], ['business', 'The startup raised new funding to expand into Asian markets.'], ['business', 'Oil prices fell on fears of weaker demand.'], ['business', 'The retailer cut its profit forecast after slow holiday sales.']
  ];
  function nbScore(m, text, k) {
    const ws = E.nb.tok(text).filter(w => m.vocab.has(w)), cls = Object.keys(m.classes);
    const rows = cls.map(c => { const cl = m.classes[c]; let lp = Math.log(cl.docs / m.N); const terms = ws.map(w => { const p = ((cl.cnt[w] || 0) + k) / (cl.words + k * m.vocab.size); lp += Math.log(p); return [w, p]; }); return { c, lp, terms }; });
    const mx = Math.max(...rows.map(r => r.lp)); if (!isFinite(mx)) rows.forEach(r => r.p = NaN); else { const z = rows.reduce((s, r) => s + Math.exp(r.lp - mx), 0); rows.forEach(r => r.p = Math.exp(r.lp - mx) / z); }
    return { rows, ws, ignored: E.nb.tok(text).filter(w => !m.vocab.has(w)) };
  }
  AI._nbScore = (text, k) => nbScore(E.nb.train(CORPUS, k), text, k);
  AI.lab({
    id: 'naive-bayes', ch: 20, kind: 'demo', title: 'Naive Bayes text classification',
    blurb: 'Train a naive Bayes classifier on eighteen short news sentences in three categories, then type your own sentence and see every word’s evidence.',
    tags: ['naive Bayes', 'text classification', 'bag of words', 'Laplace smoothing', 'conditional independence'],
    how: [['The model', '<p>Naive Bayes assumes the words of a document are independent given its category: P(c | w₁…wₙ) ∝ P(c) Πᵢ P(wᵢ | c). Each P(w | c) is the word’s share of all words in category c’s training sentences.</p>'],
      ['Smoothing', '<p>A word never seen in category c would get probability 0 and veto that category outright. Laplace (add-one) smoothing adds k to every count: P(w | c) = (count + k) / (words in c + k · vocabulary size). Set k = 0 to see the problem.</p>'],
      ['The data', '<p>The eighteen training sentences were written for this lab. Words that never occur in training are ignored. Sums of logarithms are used instead of products, to avoid underflow.</p>']],
    mount(root, ctx) {
      const st = { text: 'Strong winds and rain forced the final to be postponed', k: 1 };
      const Ln = AI.layout(root);
      const body = AI.el('<div style="padding:clamp(14px,2.2vw,24px);display:grid;gap:14px"></div>'); Ln.stage.appendChild(body); Ln.stage.classList.add('plain');
      const pc = AI.panel(Ln.side, 'Classify');
      AI.controls(pc, [{ t: 'text', k: 'text', label: 'Sentence', live: true, grow: true }, { t: 'row' }, { t: 'seg', k: 'k', label: 'Smoothing k', opts: [[1, 'k = 1 (Laplace)'], [0.1, 'k = 0.1'], [0, 'k = 0 (none)']] }], st, () => run());
      const ex = AI.panel(Ln.side, 'Try'); ['Shares fell as the storm hit oil prices', 'The captain scored in the snow', 'Clouds and showers ahead', 'Profit forecast for the final quarter'].forEach(t => { const b = AI.el(`<button type="button" class="btn small" style="margin:0 6px 6px 0">${esc(t)}</button>`); b.onclick = () => { st.text = t; pc.querySelector('input').value = t; run(); }; ex.appendChild(b); });
      const pt = AI.panel(Ln.below, 'Training sentences'); pt.appendChild(AI.el(AI.table(['Category', 'Sentence'], CORPUS.map(([c, t]) => `<tr><td>${c}</td><td>${esc(t)}</td></tr>`), 'compact')));
      function run() {
        const m = E.nb.train(CORPUS, st.k), R = nbScore(m, st.text, st.k), best = R.rows.slice().sort((a, b) => (b.p || 0) - (a.p || 0))[0];
        const allZero = R.rows.every(r => !isFinite(r.lp));
        body.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px">${R.rows.map(r => `<div style="border:1px solid ${r === best && !allZero ? 'var(--ink)' : 'var(--line2)'};border-radius:12px;padding:12px"><div class="small muted">${r.c}</div><div style="font-family:var(--display);font-weight:800;font-size:28px">${isNaN(r.p) ? '–' : (r.p * 100).toFixed(1) + '%'}</div><div class="small">log score ${isFinite(r.lp) ? r.lp.toFixed(2) : '−∞'}</div></div>`).join('')}</div>
          <p class="small" style="margin:0">${allZero ? '<b style="color:var(--bad)">Every category has probability zero:</b> each one is missing at least one of the words, and with k = 0 a single unseen word vetoes a category. This is why smoothing is needed.' : `Most probable category: <b>${best.c}</b>.`}${R.ignored.length ? ` Ignored (never seen in training): ${R.ignored.map(esc).join(', ')}.` : ''}</p>
          ${R.ws.length ? AI.table(['Word'].concat(R.rows.map(r => 'r:P(word | ' + r.c + ')')), R.ws.map((w, i) => { const ps = R.rows.map(r => r.terms[i][1]), mx = Math.max(...ps); return `<tr><td>${esc(w)}</td>${ps.map(p => `<td class="r"${p === mx && p > 0 ? ' style="font-weight:700"' : ''}>${p === 0 ? '0' : p.toFixed(4)}</td>`).join('')}</tr>`; }).concat([`<tr><td><i>prior</i></td>${R.rows.map(r => `<td class="r">${(m.classes[r.c].docs / m.N).toFixed(3)}</td>`).join('')}</tr>`]), 'compact') : '<p class="small muted">Type a sentence that uses some words from the training sentences.</p>'}`;
      }
      run();
    }
  });

  /* =====================================================================
     Clustering: k-means and EM for a mixture of Gaussians
     ===================================================================== */
  function clusterData(r) { const spec = [[0.27, 0.68, 0.07, 0.05, 0.3], [0.68, 0.7, 0.09, 0.06, -0.5], [0.52, 0.28, 0.06, 0.1, 0]]; const pts = []; spec.forEach(([mx, my, sx, sy, rho], k) => { for (let i = 0; i < 45; i++) { const a = AI.gauss(r), b = AI.gauss(r); pts.push({ x: AI.clamp(mx + sx * a, 0.01, 0.99), y: AI.clamp(my + sy * (rho * a + Math.sqrt(1 - rho * rho) * b), 0.01, 0.99), k }); } }); return pts; }
  const KCOL = ['--v-path', '--accent', '--v-goal', '--v-chance', '--warn'];
  AI.lab({
    id: 'kmeans-em', ch: 20, kind: 'demo', title: 'Clustering with k-means and EM',
    blurb: 'Unsupervised learning on unlabelled points. k-means makes hard assignments to the nearest centre; EM for a mixture of Gaussians makes soft ones and learns each cluster’s shape.',
    tags: ['unsupervised learning', 'clustering', 'k-means', 'EM algorithm', 'mixture of Gaussians', 'log likelihood'],
    how: [['k-means', '<p>Alternate two steps: assign every point to its nearest centre, then move every centre to the mean of its points. The sum of squared distances never increases, so it converges, but possibly to a poor local optimum.</p>'],
      ['EM for Gaussian mixtures', '<p>The <b>E-step</b> computes, for every point, the probability that each component generated it. The <b>M-step</b> re-estimates each component’s weight, mean and covariance from those soft counts. The log likelihood of the data never decreases.</p>'],
      ['Try', '<ul><li>Run k-means and EM from the same start and compare the ellipses EM learns.</li><li>Restart a few times: both can get stuck.</li><li>Choose the wrong number of clusters.</li></ul>']],
    mount(root, ctx) {
      const st = { algo: 'em', K: 3, seed: 1 };
      const Lk = AI.layout(root);
      const host = AI.el('<div style="padding:10px"></div>'); Lk.stage.appendChild(host); Lk.stage.classList.add('plain');
      const pts = clusterData(AI.rng(41)); let frame = null;
      const pl = P.plane(host, ctx, c => {
        P.frame2d(c); const g = c.g; if (!frame) return; const cols = KCOL.map(k => AI.color(k.slice(2)));
        pts.forEach((p, i) => { let rgb; if (frame.R) { const r = frame.R[i]; const mix = [0, 0, 0]; r.forEach((w, k) => { const h = cols[k].replace('#', ''); const n = parseInt(h, 16); mix[0] += w * (n >> 16); mix[1] += w * ((n >> 8) & 255); mix[2] += w * (n & 255); }); rgb = `rgb(${mix.map(Math.round).join(',')})`; } else rgb = cols[frame.asg ? frame.asg[i] : 0]; g.fillStyle = frame.asg || frame.R ? rgb : AI.color('muted'); g.beginPath(); g.arc(c.X(p.x), c.Y(p.y), 4.5, 0, Math.PI * 2); g.fill(); });
        frame.cents.forEach((m, k) => { const x = c.X(m.mx != null ? m.mx : m.x), y = c.Y(m.my != null ? m.my : m.y); if (m.sxx != null) { const a = m.sxx, b = m.sxy, d = m.syy, tr = (a + d) / 2, df = Math.sqrt(((a - d) / 2) ** 2 + b * b), l1 = tr + df, l2 = Math.max(1e-9, tr - df), th = 0.5 * Math.atan2(2 * b, a - d); const sx = (c.X(1) - c.X(0)), sy = (c.Y(0) - c.Y(1)); g.save(); g.translate(x, y); g.scale(sx, sy); g.rotate(-th); g.beginPath(); g.ellipse(0, 0, 2 * Math.sqrt(l1), 2 * Math.sqrt(l2), 0, 0, Math.PI * 2); g.restore(); g.strokeStyle = cols[k]; g.lineWidth = 2.5; g.stroke(); }
          g.fillStyle = AI.color('bg'); g.strokeStyle = cols[k]; g.lineWidth = 3.5; g.beginPath(); g.moveTo(x - 9, y - 9); g.lineTo(x + 9, y + 9); g.moveTo(x + 9, y - 9); g.lineTo(x - 9, y + 9); g.stroke(); });
      });
      const player = AI.Player(Lk.stageCol, ctx, f => { frame = f; pl.redraw(); ex.innerHTML = f.msg; stats.set('it', f.it); stats.set('obj', f.obj == null ? '–' : f.obj.toFixed(st.algo === 'em' ? 2 : 4)); }, { speed: 700 });
      const pc = AI.panel(Lk.side, 'Algorithm');
      AI.controls(pc, [{ t: 'seg', k: 'algo', label: '', opts: [['kmeans', 'k-means'], ['em', 'EM (Gaussian mixture)']] }, { t: 'row' }, { t: 'range', k: 'K', label: 'Number of clusters', min: 1, max: 5, step: 1 }, { t: 'row' }, { t: 'btn', label: 'New random start', icon: 'dice', on: () => { st.seed++; build(); } }], st, () => build());
      const pe = AI.panel(Lk.side, 'This step'); const ex = AI.el('<div class="explain small"></div>'); pe.appendChild(ex);
      const ps = AI.panel(Lk.side, 'Progress'); const stats = AI.stats(ps, [['it', 'iteration'], ['obj', 'objective']]);
      const pb = AI.panel(Lk.below, 'Objective by iteration'); const cb = AI.el('<div></div>'); pb.appendChild(cb); const chart = AI.chart(cb, ctx, { height: 200, xLabel: 'iteration', right: 140 });
      function build() {
        const r = AI.rng(st.seed * 7919), init = AI.range(st.K).map(() => pts[(r() * pts.length) | 0]).map(p => ({ x: p.x, y: p.y })); const frames = []; const objs = [];
        if (st.algo === 'kmeans') {
          let cents = init; frames.push({ cents, it: 0, obj: null, msg: `Start: ${st.K} centres placed on randomly chosen points.` });
          for (let it = 1; it <= 30; it++) { const o = E.kmeansStep(pts, cents); objs.push(o.sse); frames.push({ cents, asg: o.asg, it, obj: o.sse, msg: `Iteration ${it}, assignment step: each point joins its nearest centre. Sum of squared distances ${o.sse.toFixed(4)}.` }); const moved = o.cents.some((c2, k) => Math.hypot(c2.x - cents[k].x, c2.y - cents[k].y) > 1e-9); frames.push({ cents: o.cents, asg: o.asg, it, obj: o.sse, msg: moved ? `Iteration ${it}, update step: each centre moves to the mean of its points.` : 'No centre moved: k-means has converged.' }); cents = o.cents; if (!moved) break; }
          chart.set([{ name: 'sum of squared distances', color: 'var(--accent)', values: objs }]);
        } else {
          let comps = init.map(p => ({ w: 1 / st.K, mx: p.x, my: p.y, sxx: 0.02, sxy: 0, syy: 0.02 })); frames.push({ cents: comps, it: 0, obj: null, msg: `Start: ${st.K} round Gaussians centred on randomly chosen points, with equal weights.` });
          let prev = -Infinity;
          for (let it = 1; it <= 60; it++) { const o = E.emStep(pts, comps); objs.push(o.ll); frames.push({ cents: o.comps, R: o.R, it, obj: o.ll, msg: `Iteration ${it}: the E-step colours each point by its probabilities of belonging to each component; the M-step refits weights (${o.comps.map(c2 => c2.w.toFixed(2)).join(', ')}), means and covariances. Log likelihood ${o.ll.toFixed(2)}.` }); comps = o.comps; if (o.ll - prev < 1e-4) { frames[frames.length - 1].msg += ' The improvement is tiny now: EM has converged.'; break; } prev = o.ll; }
          chart.set([{ name: 'log likelihood', color: 'var(--v-path)', values: objs }]);
        }
        player.set(frames);
      }
      build();
    }
  });
})(window);
