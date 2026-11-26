/* Chapters 23–24 labs: n-gram language models, the Shannon guessing game, CYK parsing with a PCFG,
   attention as a soft lookup with positional encodings, and beam search. */
(function (G) {
  'use strict';
  const AI = G.AI, esc = AI.esc;

  /* ---------- a small corpus written for this site ---------- */
  const CORPUS = `the robot picks up the red cup. the robot puts the red cup on the table. the robot picks up the blue cup. the robot washes the blue cup. the robot puts the blue cup in the sink. the cat sits on the table. the cat sleeps on the red mat. the cat sleeps in the sun. the robot sees the cat on the table. the cat sees the robot. the robot gives the cat some milk. the cat drinks the milk. the cat jumps off the table. the robot wipes the table. the robot puts the cup on the shelf. a dog runs into the kitchen. the dog sees the cat. the cat jumps on the shelf. the dog barks at the cat. the robot gives the dog some water. the dog drinks the water. the dog sleeps on the blue mat. the robot opens the window. the sun shines on the table. the cat sits in the sun. the robot closes the window. the robot picks up the red mat. the robot puts the red mat in the sink. the dog runs out of the kitchen. the cat sleeps on the shelf.`;
  const SENTS = CORPUS.split('.').map(s => s.trim()).filter(Boolean).map(s => ['<s>'].concat(s.split(/\s+/), ['</s>']));
  function ngramModel(n) { const cnt = {}, ctx = {}; SENTS.forEach(ws => { const pad = Array(Math.max(0, n - 2)).fill('<s>').concat(ws); for (let i = n - 1; i < pad.length; i++) { const c = pad.slice(i - n + 1, i).join(' '), w = pad[i]; cnt[c] = cnt[c] || {}; cnt[c][w] = (cnt[c][w] || 0) + 1; ctx[c] = (ctx[c] || 0) + 1; } }); return { n, cnt, ctx }; }
  const VOCAB = [...new Set(SENTS.flat().filter(w => w !== '<s>'))];
  function nextDist(M, hist, k) { const c = (M.n > 1 ? Array(Math.max(0, M.n - 1 - hist.length)).fill('<s>').concat(hist.slice(-(M.n - 1))) : []).join(' '); const row = M.cnt[c] || {}, tot = M.ctx[c] || 0; return { c, tot, dist: VOCAB.map(w => [w, ((row[w] || 0) + k) / (tot + k * VOCAB.length), row[w] || 0]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]) }; }
  AI._ngram = { ngramModel, nextDist, SENTS, VOCAB };
  AI.lab({
    id: 'ngram', ch: 23, kind: 'demo', title: 'n-gram language models',
    blurb: 'Count word sequences in a small corpus and use the counts to predict the next word and to generate text. See how the order of the model trades fluency against copying.',
    tags: ['language model', 'n-gram', 'maximum likelihood', 'add-one smoothing', 'text generation'],
    how: [['The model', '<p>An n-gram model predicts each word from the n − 1 words before it: P(wᵢ | wᵢ₋ₙ₊₁ … wᵢ₋₁) = count(wᵢ₋ₙ₊₁ … wᵢ) / count(wᵢ₋ₙ₊₁ … wᵢ₋₁). The special symbols &lt;s&gt; and &lt;/s&gt; mark the start and end of a sentence.</p>'],
      ['What to look for', '<ul><li>A unigram model ignores context: its output is a bag of common words.</li><li>A bigram model is locally plausible but wanders.</li><li>With only thirty training sentences a trigram model mostly reproduces sentences it has seen: it has too little data for its many contexts.</li><li>Without smoothing, any unseen word in a context gets probability zero.</li></ul>'],
      ['The corpus', '<p>Thirty short sentences about a robot, a cat and a dog, written for this lab and shown below.</p>']],
    mount(root, ctx) {
      const st = { n: 2, k: 0, prefix: 'the robot' };
      const Lg = AI.layout(root);
      const body = AI.el('<div style="padding:clamp(14px,2.2vw,24px);display:grid;gap:14px"></div>'); Lg.stage.appendChild(body); Lg.stage.classList.add('plain');
      const pc = AI.panel(Lg.side, 'Model');
      AI.controls(pc, [{ t: 'seg', k: 'n', label: 'Order', opts: [[1, 'unigram'], [2, 'bigram'], [3, 'trigram']] }, { t: 'row' }, { t: 'seg', k: 'k', label: 'Smoothing', opts: [[0, 'none'], [1, 'add-one']] }, { t: 'row' }, { t: 'text', k: 'prefix', label: 'Context (words so far)', live: true, grow: true }, { t: 'row' }, { t: 'btn', label: 'Generate 5 sentences', icon: 'dice', cls: 'primary', on: () => gen() }], st, () => run());
      const pt = AI.panel(Lg.below, 'Training corpus'); pt.appendChild(AI.el(`<p class="small" style="margin:0;color:var(--ink2)">${esc(CORPUS)}</p>`));
      let samples = '';
      function sample(M) { const out = []; for (let t = 0; t < 30; t++) { const D = nextDist(M, out, st.k).dist; let u = Math.random(), w = D[D.length - 1][0]; for (const [x, p] of D) { u -= p; if (u <= 0) { w = x; break; } } if (w === '</s>') break; if (w === '<s>') continue; out.push(w); } return out.join(' '); }
      function gen() { const M = ngramModel(st.n); const ss = AI.range(5).map(() => sample(M)); samples = ss.map(s => `<li>${esc(s)}.${SENTS.some(x => x.slice(1, -1).join(' ') === s) ? ' <span class="chip">copied from the corpus</span>' : ''}</li>`).join(''); run(); }
      function run() {
        const M = ngramModel(st.n), hist = st.prefix.toLowerCase().match(/[a-z]+/g) || [], D = nextDist(M, hist, st.k);
        const top = D.dist.slice(0, 12), mx = top.length ? top[0][1] : 1;
        body.innerHTML = `<div><h4 style="font-family:var(--display);margin:0 0 4px">P(next word | ${st.n === 1 ? 'nothing' : `“${esc(D.c.replace(/<s>/g, '&lt;s&gt;'))}”`})</h4><p class="small muted" style="margin:0 0 8px">${st.n === 1 ? 'A unigram model uses no context at all.' : D.tot ? `This context occurs ${D.tot} time${D.tot > 1 ? 's' : ''} in the corpus.` : 'This context never occurs in the corpus, so the counts give no information.'}${st.k ? ' Add-one smoothing gives every vocabulary word a count of at least 1.' : ''}</p>
          ${top.length ? `<div style="display:grid;gap:4px">${top.map(([w, p, c]) => `<div style="display:grid;grid-template-columns:90px minmax(0,1fr) 110px;gap:8px;align-items:center;font-size:14px"><span class="mono">${esc(w === '</s>' ? '</s>' : w)}</span><span style="height:12px;background:var(--bg3);border-radius:6px;overflow:hidden"><i style="display:block;height:100%;width:${p / mx * 100}%;background:var(--v-path)"></i></span><span class="num" style="text-align:right">${p.toFixed(3)} (${c})</span></div>`).join('')}</div>${D.dist.length > 12 ? `<p class="small muted" style="margin:6px 0 0">${D.dist.length - 12} more words have smaller probabilities.</p>` : ''}` : '<p class="small" style="color:var(--bad)">Every next word has probability zero. Switch on smoothing, or use a shorter context.</p>'}</div>
          <div class="note-block"><h4>Generated sentences</h4>${samples ? `<ol style="margin:0;padding-left:20px">${samples}</ol>` : '<p class="small muted">Press “Generate 5 sentences”.</p>'}</div>`;
      }
      gen();
    }
  });

  /* =====================================================================
     The Shannon game: guess the next letter
     ===================================================================== */
  const SH_SENT = ['the cat sleeps in the warm sun', 'rain is expected later in the day', 'she opened the door and walked in', 'a robot can learn from its mistakes', 'the train leaves at nine every morning', 'please close the window when you leave'];
  const FREQ = ' etaoinshrdlcumwfgypbvkjxqz';
  AI.lab({
    id: 'shannon-game', ch: 23, kind: 'game', title: 'The Shannon game: guess the next letter',
    blurb: 'Guess a hidden sentence one letter at a time. Your guesses per letter measure how predictable English is to you, the idea behind Claude Shannon’s 1951 experiment on the entropy of English.',
    tags: ['language model', 'entropy', 'predictability', 'character model', 'Shannon'],
    how: [['How to play', '<p>Type a letter (or space) to guess the next character. Wrong guesses are listed; when you get it right the character is revealed and the next one starts. Fewer guesses per character means you are predicting well.</p>'],
      ['The baselines', '<p>Guessing uniformly at random among 27 symbols needs 14 guesses per character on average. Always guessing in order of English letter frequency (space, e, t, a, o, i, n, …) is the unigram strategy; its count for the same sentence is shown at the end. People do far better because they use context, just as higher-order language models do.</p>']],
    mount(root, ctx) {
      const Ls = AI.layout(root);
      const body = AI.el('<div style="padding:clamp(14px,2.4vw,26px);display:grid;gap:14px"></div>'); Ls.stage.appendChild(body); Ls.stage.classList.add('plain');
      const ps = AI.panel(Ls.side, 'Score'); const stats = AI.stats(ps, [['g', 'guesses so far'], ['avg', 'guesses per character'], ['best', 'best average']]);
      let sent, pos, guesses, wrong, perChar, idx = (Math.random() * SH_SENT.length) | 0;
      function start() { sent = SH_SENT[idx % SH_SENT.length]; idx++; pos = 0; guesses = 0; wrong = []; perChar = []; draw(); }
      function draw() {
        const done = pos >= sent.length, b = AI.progress.best('shannon'); stats.set('g', guesses); stats.set('avg', perChar.length ? (perChar.reduce((a, x) => a + x, 0) / perChar.length).toFixed(2) : '–'); stats.set('best', b == null ? '–' : (b / 100).toFixed(2));
        body.innerHTML = `<div class="mono" style="font-size:clamp(20px,3vw,30px);letter-spacing:.06em;display:flex;flex-wrap:wrap;gap:2px">${sent.split('').map((c, i) => `<span style="min-width:.8em;text-align:center;border-bottom:3px solid ${i === pos ? 'var(--accent)' : i < pos ? 'transparent' : 'var(--line2)'}">${i < pos ? (c === ' ' ? '·' : c) : '&nbsp;'}</span>`).join('')}</div>
          ${done ? '' : `<p class="small" style="margin:0">Character ${pos + 1} of ${sent.length}. Wrong so far: <span class="mono">${wrong.map(c => c === ' ' ? 'space' : c).join(' ') || 'none'}</span></p><div style="display:flex;flex-wrap:wrap;gap:6px">${FREQ.split('').map(c => `<button type="button" class="btn small" data-c="${c}" ${wrong.includes(c) ? 'disabled' : ''} style="min-width:42px">${c === ' ' ? 'space' : c}</button>`).join('')}</div>`}
          <div data-res></div>`;
        body.querySelectorAll('[data-c]').forEach(bn => bn.onclick = () => guess(bn.dataset.c));
        if (done) finish();
      }
      function guess(c) { if (pos >= sent.length || wrong.includes(c)) return; guesses++; if (c === sent[pos]) { perChar.push(wrong.length + 1); wrong = []; pos++; } else wrong.push(c); draw(); }
      function finish() {
        const avg = perChar.reduce((a, x) => a + x, 0) / perChar.length, uni = sent.split('').map(c => FREQ.indexOf(c) + 1), ua = uni.reduce((a, x) => a + x, 0) / uni.length;
        const better = AI.progress.best('shannon', Math.round(avg * 100), false);
        body.querySelector('[data-res]').innerHTML = `<div class="note-block"><h4>${avg.toFixed(2)} guesses per character</h4><p>Letter-frequency order would need ${ua.toFixed(2)} per character on this sentence; random guessing about 14.${better ? ' New best.' : ''}</p><button type="button" class="btn primary">${AI.icon.next}<span>Next sentence</span></button></div>`;
        body.querySelector('[data-res] button').onclick = start;
      }
      ctx.key(e => { if (/INPUT|SELECT|TEXTAREA/.test((document.activeElement || {}).tagName || '')) return; const k = e.key === ' ' ? ' ' : e.key.toLowerCase(); if (FREQ.includes(k) && k.length === 1) { e.preventDefault(); guess(k); } });
      start();
    }
  });

  /* =====================================================================
     CYK parsing with a probabilistic grammar (Chomsky normal form)
     ===================================================================== */
  const GR = {
    bin: [['S', 'NP', 'VP', 1.0], ['NP', 'Det', 'N', 0.75], ['NP', 'NP', 'PP', 0.25], ['VP', 'V', 'NP', 0.6], ['VP', 'VP', 'PP', 0.3], ['PP', 'P', 'NP', 1.0]],
    lex: { the: [['Det', 0.7]], a: [['Det', 0.3]], agent: [['N', 0.25]], wumpus: [['N', 0.25]], arrow: [['N', 0.2]], cave: [['N', 0.15]], gold: [['N', 0.15]], shoots: [['V', 0.4]], sees: [['V', 0.4]], grabs: [['V', 0.2]], with: [['P', 0.5]], in: [['P', 0.5]], sleeps: [['VP', 0.1]] }
  };
  function cyk(words) {
    const n = words.length, T = {}, frames = []; const cell = (i, l) => (T[i + ',' + l] = T[i + ',' + l] || {});
    words.forEach((w, i) => { (GR.lex[w] || []).forEach(([X, p]) => { cell(i, 1)[X] = { p, w }; }); frames.push({ i, l: 1, msg: `Word ${i + 1}, “${w}”: ${GR.lex[w] ? GR.lex[w].map(([X, p]) => `${X} with probability ${p}`).join(', ') : 'not in the lexicon'}.` }); });
    for (let l = 2; l <= n; l++) for (let i = 0; i + l <= n; i++) {
      const c = cell(i, l), notes = [];
      for (let k = 1; k < l; k++) { const A = cell(i, k), B = cell(i + k, l - k); GR.bin.forEach(([X, Y, Z, p]) => { if (A[Y] && B[Z]) { const q = p * A[Y].p * B[Z].p; notes.push(`${X} → ${Y} ${Z} (split after word ${i + k}): ${q.toExponential(2)}`); if (!c[X] || q > c[X].p) c[X] = { p: q, k, Y, Z, alt: c[X] ? (c[X].alt || []).concat([[c[X].p, c[X].k]]) : [] }; else c[X].alt = (c[X].alt || []).concat([[q, k]]); } }); }
      frames.push({ i, l, msg: `Words ${i + 1}–${i + l} (“${words.slice(i, i + l).join(' ')}”): ${notes.length ? notes.join('; ') + '. The cell keeps the most probable way to build each category.' : 'no rule combines any split, so the cell stays empty.'}` });
    }
    return { T, frames, n };
  }
  function tree(T, i, l, X) { const e = T[i + ',' + l][X]; if (e.w) return { X, w: e.w }; return { X, kids: [tree(T, i, e.k, e.Y), tree(T, i + e.k, l - e.k, e.Z)] }; }
  function allParses(words) { // inside sums to count parses
    const n = words.length, N = {}; const c = (i, l) => (N[i + ',' + l] = N[i + ',' + l] || {});
    words.forEach((w, i) => (GR.lex[w] || []).forEach(([X]) => { c(i, 1)[X] = 1; }));
    for (let l = 2; l <= n; l++) for (let i = 0; i + l <= n; i++) for (let k = 1; k < l; k++) GR.bin.forEach(([X, Y, Z]) => { const a = c(i, k)[Y], b = c(i + k, l - k)[Z]; if (a && b) c(i, l)[X] = (c(i, l)[X] || 0) + a * b; });
    return (N['0,' + n] || {}).S || 0;
  }
  AI._cyk = { cyk, tree, allParses, GR };
  AI.lab({
    id: 'cyk', ch: 23, kind: 'demo', title: 'Parsing with CYK and a probabilistic grammar',
    blurb: 'Fill the CYK chart bottom-up for a sentence about the wumpus world, keeping the most probable way to build each phrase. See how a PCFG resolves the attachment of “with the arrow”.',
    tags: ['parsing', 'CYK algorithm', 'PCFG', 'Chomsky normal form', 'attachment ambiguity', 'dynamic programming'],
    how: [['The grammar', '<p>A small probabilistic context-free grammar in Chomsky normal form, written for this lab:</p><p class="mono small" style="white-space:pre-line">S → NP VP [1.0]\nNP → Det N [0.75] | NP PP [0.25]\nVP → V NP [0.6] | VP PP [0.3] | sleeps [0.1]\nPP → P NP [1.0]\nDet → the [0.7] | a [0.3]\nN → agent [0.25] | wumpus [0.25] | arrow [0.2] | cave [0.15] | gold [0.15]\nV → shoots [0.4] | sees [0.4] | grabs [0.2]\nP → with [0.5] | in [0.5]</p>'],
      ['The algorithm', '<p>Cell (i, ℓ) holds, for each category X, the probability of the most likely way X can produce the ℓ words starting at word i. Cells for longer spans are built from pairs of shorter ones, so the work is O(n³) in the sentence length. The answer is the S entry for the whole sentence.</p>'],
      ['Ambiguity', '<p>“the agent shoots the wumpus with the arrow” has two parses: the arrow is either the instrument of the shooting (VP → VP PP) or something the wumpus has (NP → NP PP). This grammar prefers the first, 0.3 × 0.6 against 0.6 × 0.25, whatever the words are. That is a known weakness of plain PCFGs; lexicalised grammars fix it by conditioning on the words.</p>']],
    mount(root, ctx) {
      const PRE = ['the agent shoots the wumpus with the arrow', 'the wumpus sleeps in the cave', 'the agent grabs the gold in the cave', 'a wumpus sees the agent with the gold in the cave'];
      const st = { s: PRE[0] };
      const Lc = AI.layout(root);
      let R, frame = null, words;
      const sv = AI.svgHost(Lc.stage, ctx, (w, h) => draw(w, h)); Lc.stage.style.minHeight = '420px';
      const player = AI.Player(Lc.stageCol, ctx, f => { frame = f; sv.redraw(); ex.innerHTML = f.msg; }, { speed: 1400 });
      const pc = AI.panel(Lc.side, 'Sentence'); AI.controls(pc, [{ t: 'select', k: 's', label: '', opts: PRE.map(s => [s, s]), str: true }], st, () => build());
      const pe = AI.panel(Lc.side, 'This step'); const ex = AI.el('<div class="explain small"></div>'); pe.appendChild(ex);
      const pt = AI.panel(Lc.below, 'The most probable parse'); const tb = AI.el('<div></div>'); pt.appendChild(tb);
      const tsv = AI.svgHost(AI.el('<div style="height:300px;position:relative"></div>'), ctx, (w, h) => drawTree(w, h)); tb.appendChild(tsv.svg.parentNode); const tnote = AI.el('<p class="small muted" style="margin:6px 0 0"></p>'); pt.appendChild(tnote);
      function build() { words = st.s.split(' '); R = cyk(words); const top = (R.T['0,' + words.length] || {}).S; R.frames.push({ i: 0, l: words.length, done: true, msg: top ? `The S entry for the whole sentence has probability ${top.p.toExponential(3)}: that is the most probable parse, drawn below.` : 'No S covers the whole sentence: it is not in the language of this grammar.' }); player.set(R.frames); const np = allParses(words); tnote.textContent = top ? `This sentence has ${np} parse${np > 1 ? 's' : ''} under the grammar; the tree shows the most probable, with probability ${top.p.toExponential(3)}.` : ''; tsv.redraw(); }
      function draw(w, h) {
        if (!frame) return ''; const n = words.length, cw = (w - 20) / n, ch = Math.min(64, (h - 40) / n); let s = '';
        const done = (i, l) => R.frames.indexOf(frame) >= R.frames.findIndex(f => f.i === i && f.l === l);
        for (let l = 1; l <= n; l++) for (let i = 0; i + l <= n; i++) { const x = 10 + i * cw + (l - 1) * cw / 2, y = h - 30 - l * ch, cur = frame.i === i && frame.l === l && !frame.done; const c = R.T[i + ',' + l] || {}, vis = done(i, l); s += `<rect x="${x + 2}" y="${y + 2}" width="${cw - 4}" height="${ch - 4}" rx="6" fill="${cur ? 'color-mix(in srgb,var(--accent) 16%,var(--bg))' : 'var(--bg)'}" stroke="${cur ? 'var(--accent)' : 'var(--line2)'}" stroke-width="${cur ? 3 : 1.2}"/>`; if (vis) { const ks = Object.keys(c); s += ks.map((X, j) => `<text x="${x + cw / 2}" y="${y + 18 + j * 15}" text-anchor="middle" class="svg-s" style="font-size:12px"><tspan class="svg-b" style="font-size:12.5px" fill="${X === 'S' ? 'var(--v-goal)' : 'var(--ink)'}">${X}</tspan> ${c[X].p.toExponential(1)}</text>`).join(''); } }
        words.forEach((wd, i) => { s += `<text x="${10 + (i + 0.5) * cw}" y="${h - 10}" text-anchor="middle" class="svg-t" style="font-weight:600">${esc(wd)}</text>`; });
        return s;
      }
      function drawTree(w, h) {
        if (!R) return ''; const top = (R.T['0,' + words.length] || {}).S; if (!top) return `<text x="${w / 2}" y="${h / 2}" text-anchor="middle" class="svg-t">No parse.</text>`;
        const t = tree(R.T, 0, words.length, 'S'); let leaf = 0, depth = 0; const pos = new Map();
        (function walk(nd, d) { depth = Math.max(depth, d); if (nd.w) { pos.set(nd, { x: leaf++, d }); return; } nd.kids.forEach(k => walk(k, d + 1)); const xs = nd.kids.map(k => pos.get(k).x); pos.set(nd, { x: (Math.min(...xs) + Math.max(...xs)) / 2, d }); })(t, 0);
        const X = x => 30 + x * (w - 60) / Math.max(1, leaf - 1), Y = d => 20 + d * (h - 70) / Math.max(1, depth); let s = '';
        (function edges(nd) { if (!nd.kids) { const p = pos.get(nd); s += `<line x1="${X(p.x)}" y1="${Y(p.d) + 8}" x2="${X(p.x)}" y2="${h - 34}" stroke="var(--line2)" stroke-dasharray="3 3"/>`; return; } nd.kids.forEach(k => { const a = pos.get(nd), b = pos.get(k); s += `<line x1="${X(a.x)}" y1="${Y(a.d) + 8}" x2="${X(b.x)}" y2="${Y(b.d) - 12}" stroke="var(--line2)" stroke-width="2"/>`; edges(k); }); })(t);
        pos.forEach((p, nd) => { s += `<text x="${X(p.x)}" y="${Y(p.d) + 4}" text-anchor="middle" class="svg-b halo-bg" style="font-size:14px" fill="${nd.X === 'PP' ? 'var(--accent)' : 'var(--ink)'}">${nd.X}</text>`; if (nd.w) s += `<text x="${X(p.x)}" y="${h - 16}" text-anchor="middle" class="svg-t">${esc(nd.w)}</text>`; });
        return s;
      }
      build();
    }
  });

  /* =====================================================================
     Attention as a soft lookup, and sinusoidal positional encodings
     ===================================================================== */
  AI.lab({
    id: 'attention', ch: 24, kind: 'demo', title: 'Attention: a soft dictionary lookup',
    blurb: 'Drag the query vector and watch the attention weights over six keys change. The output is the weighted average of the values. Then look at the sinusoidal positional encodings a transformer adds to its inputs.',
    tags: ['attention', 'transformer', 'query, key, value', 'softmax', 'scaled dot product', 'positional encoding'],
    how: [['Scaled dot-product attention', '<p>For a query q and keys k₁ … kₙ with values v₁ … vₙ, the weights are aᵢ = softmax(q · kᵢ / √d), where d is the vector length (here 2), and the output is Σᵢ aᵢvᵢ. A transformer computes q, k and v from each word’s embedding with learned matrices; here you set them directly to see the arithmetic.</p>'],
      ['Sharp or soft', '<p>Lengthen the query and the dot products grow, so the softmax concentrates on the best-matching key: a near-hard lookup. A short query spreads the weight evenly.</p>'],
      ['Positional encoding', '<p>Attention by itself ignores word order, so transformers add a position vector to each input. In the original transformer (Vaswani et al., 2017), PE(pos, 2i) = sin(pos / 10000<sup>2i/d</sup>) and PE(pos, 2i + 1) = cos(pos / 10000<sup>2i/d</sup>). Each dimension oscillates at a different frequency, so every position gets a distinct pattern.</p>']],
    mount(root, ctx) {
      const KEYS = [{ n: 'cat', x: 0.75, y: 0.55, v: '#0a64d8' }, { n: 'dog', x: 0.62, y: 0.78, v: '#7a3cc1' }, { n: 'cup', x: -0.7, y: 0.45, v: '#ff5a1f' }, { n: 'table', x: -0.55, y: -0.6, v: '#b36b00' }, { n: 'runs', x: 0.2, y: -0.85, v: '#0b8a69' }, { n: 'red', x: -0.9, y: -0.1, v: '#c8102e' }];
      const st = { qx: 1.6, qy: 1.2 }; let drag = false;
      const La = AI.layout(root);
      const grid = AI.el('<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;padding:12px"></div>'); La.stage.appendChild(grid); La.stage.classList.add('plain');
      const left = AI.el('<div style="position:relative;aspect-ratio:1;touch-action:none;cursor:crosshair"></div>'), right = AI.el('<div></div>'); grid.append(left, right);
      const R = 2.4; let W = 1;
      const sv = AI.svgHost(left, ctx, (w, h) => { W = w; const c = v => w / 2 + v / R * w / 2, cy = v => h / 2 - v / R * h / 2; const at = weights(); let s = AI.arrowDefs('atA', 'var(--accent)'); s += `<line x1="0" x2="${w}" y1="${h / 2}" y2="${h / 2}" stroke="var(--line)"/><line y1="0" y2="${h}" x1="${w / 2}" x2="${w / 2}" stroke="var(--line)"/><circle cx="${w / 2}" cy="${h / 2}" r="${w / 2 / R}" fill="none" stroke="var(--line2)" stroke-dasharray="4 4"/>`;
        KEYS.forEach((k, i) => { s += `<line x1="${w / 2}" y1="${h / 2}" x2="${c(k.x)}" y2="${cy(k.y)}" stroke="var(--line2)" stroke-width="1.5"/><circle cx="${c(k.x)}" cy="${cy(k.y)}" r="${6 + 22 * at[i]}" fill="${k.v}" fill-opacity="${0.15 + 0.6 * at[i]}" stroke="${k.v}" stroke-width="2"/><text x="${c(k.x)}" y="${cy(k.y) - 12 - 22 * at[i]}" text-anchor="middle" class="svg-t halo-bg" style="font-weight:600">${k.n} ${(at[i] * 100).toFixed(0)}%</text>`; });
        s += `<line x1="${w / 2}" y1="${h / 2}" x2="${c(st.qx)}" y2="${cy(st.qy)}" stroke="var(--accent)" stroke-width="4" marker-end="url(#atA)"/><circle cx="${c(st.qx)}" cy="${cy(st.qy)}" r="11" fill="var(--accent)" fill-opacity=".25" stroke="var(--accent)" stroke-width="2"/><text x="${c(st.qx) + 14}" y="${cy(st.qy) + 4}" class="svg-b" fill="var(--accent)">query</text>`;
        return s; });
      const pc = AI.panel(La.side, 'Query'); AI.controls(pc, [{ t: 'range', k: 'qx', label: 'q, first component', min: -2.4, max: 2.4, step: 0.05, fmt: v => v.toFixed(2) }, { t: 'range', k: 'qy', label: 'q, second component', min: -2.4, max: 2.4, step: 0.05, fmt: v => v.toFixed(2) }], st, () => upd());
      const pp = AI.panel(La.below, 'Sinusoidal positional encodings (d = 64)'); const pbox = AI.el('<div></div>'); pp.appendChild(pbox);
      const pe = AI.canvas(pbox, ctx, c => { const g = c.g, P = 50, D = 64, cw = c.w / D, ch = c.h / P, A = AI.color('v-path'), B = AI.color('accent'); for (let p = 0; p < P; p++) for (let d = 0; d < D; d++) { const i = Math.floor(d / 2), v = d % 2 === 0 ? Math.sin(p / Math.pow(10000, 2 * i / D)) : Math.cos(p / Math.pow(10000, 2 * i / D)); g.fillStyle = AI.alpha(v >= 0 ? A : B, Math.abs(v) * 0.9); g.fillRect(d * cw, p * ch, cw + 0.5, ch + 0.5); } }, 0.42);
      pp.appendChild(AI.el('<p class="small muted" style="margin:8px 0 0">Rows are positions 0 to 49, columns the 64 dimensions; blue is positive and orange negative. Low dimensions change quickly with position, high ones slowly, like the digits of a clock.</p>'));
      function weights() { const s = KEYS.map(k => (st.qx * k.x + st.qy * k.y) / Math.SQRT2), m = Math.max(...s), e = s.map(v => Math.exp(v - m)), z = e.reduce((a, b) => a + b, 0); return e.map(v => v / z); }
      function upd() { sv.redraw(); const at = weights(), sc = KEYS.map(k => (st.qx * k.x + st.qy * k.y) / Math.SQRT2); right.innerHTML = AI.table(['Key', 'r:q · k / √2', 'r:Weight'], KEYS.map((k, i) => `<tr><td><span style="display:inline-block;width:10px;height:10px;border-radius:5px;background:${k.v};margin-right:6px"></span>${k.n}</td><td class="r">${sc[i].toFixed(3)}</td><td class="r"><b>${at[i].toFixed(3)}</b></td></tr>`), 'compact') + `<p class="small" style="margin:10px 0 0">Here each value is shown as a colour; the output is the mixture of the six values in proportion to the weights:</p><div style="height:28px;border-radius:8px;margin-top:6px;background:linear-gradient(90deg,${(() => { let acc = 0; return KEYS.map((k, i) => { const a = acc; acc += at[i] * 100; return `${k.v} ${a}% ${acc}%`; }).join(','); })()})"></div><p class="small muted" style="margin:8px 0 0">Drag the query on the plot, or use the sliders. Entropy of the weights: ${(-at.reduce((s, a) => s + (a > 0 ? a * Math.log2(a) : 0), 0)).toFixed(2)} bits (maximum ${Math.log2(6).toFixed(2)}).</p>`; }
      const setQ = e => { const r = left.getBoundingClientRect(); st.qx = AI.clamp(((e.clientX - r.left) / r.width * 2 - 1) * R, -R, R); st.qy = AI.clamp(-((e.clientY - r.top) / r.height * 2 - 1) * R, -R, R); pc.querySelectorAll('input[type=range]').forEach((inp, i) => { inp.value = i ? st.qy : st.qx; inp.dispatchEvent(new Event('input')); }); };
      ctx.on(left, 'pointerdown', e => { drag = true; left.setPointerCapture(e.pointerId); setQ(e); }); ctx.on(left, 'pointermove', e => { if (drag) setQ(e); }); ctx.on(left, 'pointerup', () => { drag = false; });
      upd();
    }
  });

  /* =====================================================================
     Beam search for decoding
     ===================================================================== */
  const LM = { '': { a: 0.5, the: 0.4, one: 0.1 }, a: { dog: 0.36, cat: 0.34, man: 0.3 }, the: { dog: 0.9, cat: 0.05, man: 0.05 }, one: { dog: 0.4, cat: 0.4, man: 0.2 }, 'a dog': { runs: 0.3, sleeps: 0.3, barks: 0.4 }, 'a cat': { runs: 0.2, sleeps: 0.7, barks: 0.1 }, 'a man': { runs: 0.6, sleeps: 0.3, barks: 0.1 }, 'the dog': { runs: 0.5, sleeps: 0.1, barks: 0.4 }, 'the cat': { runs: 0.2, sleeps: 0.6, barks: 0.2 }, 'the man': { runs: 0.5, sleeps: 0.4, barks: 0.1 }, 'one dog': { runs: 0.3, sleeps: 0.3, barks: 0.4 }, 'one cat': { runs: 0.3, sleeps: 0.5, barks: 0.2 }, 'one man': { runs: 0.4, sleeps: 0.5, barks: 0.1 } };
  function beam(k) { let B = [{ s: [], lp: 0 }]; const steps = []; for (let t = 0; t < 3; t++) { const cand = []; B.forEach(h => { const d = LM[h.s.join(' ')]; Object.keys(d).forEach(w => cand.push({ s: h.s.concat([w]), lp: h.lp + Math.log(d[w]), from: h.s.join(' ') })); }); cand.sort((a, b) => b.lp - a.lp); steps.push({ cand, keep: cand.slice(0, k) }); B = cand.slice(0, k); } return { steps, best: B[0] }; }
  AI._beam = { beam, LM };
  AI.lab({
    id: 'beam-search', ch: 24, kind: 'demo', title: 'Greedy decoding versus beam search',
    blurb: 'Generate a three-word caption from a tiny language model. Greedy decoding commits to the single best word each time; beam search keeps the k best partial sentences and can find a more probable whole.',
    tags: ['decoding', 'beam search', 'greedy search', 'sequence-to-sequence', 'log probability'],
    how: [['The model', '<p>A toy model gives the probability of each next word given the words so far. A sentence’s probability is the product of its word probabilities; we add log probabilities instead.</p>'],
      ['Greedy versus beam', '<p>With beam width k = 1, decoding is greedy. It takes “a” (0.5) over “the” (0.4) and never recovers, although “the dog” (0.4 × 0.9 = 0.36) is twice as likely as “a dog” (0.5 × 0.36 = 0.18). With k = 2 the beam keeps “the” alive long enough to find it.</p>'],
      ['Reading the tree', '<p>Every candidate extension at each step is shown with its total log probability. Kept hypotheses are solid; pruned ones are faded.</p>']],
    mount(root, ctx) {
      const st = { k: 1 };
      const Lb = AI.layout(root);
      const sv = AI.svgHost(Lb.stage, ctx, (w, h) => draw(w, h)); Lb.stage.style.minHeight = '440px';
      const pc = AI.panel(Lb.side, 'Beam'); AI.controls(pc, [{ t: 'seg', k: 'k', label: 'Beam width k', opts: [[1, '1 (greedy)'], [2, '2'], [3, '3']] }], st, () => run());
      const ps = AI.panel(Lb.side, 'Result'); const out = AI.el('<div class="explain small"></div>'); ps.appendChild(out);
      let Rb;
      function draw(w, h) {
        if (!Rb) return ''; const cols = 4, X = c => 40 + c * (w - 120) / (cols - 1); let s = `<text x="${X(0)}" y="${h / 2 + 4}" text-anchor="middle" class="svg-b">start</text>`;
        const kept = new Set(); Rb.steps.forEach(stp => stp.keep.forEach(c => kept.add(c.s.join(' '))));
        Rb.steps.forEach((stp, t) => { const n = stp.cand.length, gap = Math.min(30, (h - 30) / n); stp.cand.forEach((c, j) => { const y = h / 2 + (j - (n - 1) / 2) * gap, on = kept.has(c.s.join(' ')) && stp.keep.includes(c); const fromIdx = t ? Rb.steps[t - 1].cand.findIndex(x => x.s.join(' ') === c.from) : -1; const py = t ? h / 2 + (fromIdx - (Rb.steps[t - 1].cand.length - 1) / 2) * Math.min(30, (h - 30) / Rb.steps[t - 1].cand.length) : h / 2; s += `<line x1="${X(t) + 26}" y1="${py}" x2="${X(t + 1) - 62}" y2="${y}" stroke="${on ? 'var(--v-path)' : 'var(--line)'}" stroke-width="${on ? 2.2 : 1}"/><text x="${X(t + 1) - 58}" y="${y + 4}" class="svg-t" style="font-size:12.5px;${on ? 'font-weight:700' : ''}" fill="${on ? 'var(--ink)' : 'var(--muted)'}">${c.s[c.s.length - 1]} <tspan class="svg-m" style="font-size:11px" fill="var(--muted)">${c.lp.toFixed(2)}</tspan></text>`; }); });
        return s;
      }
      function run() {
        Rb = beam(st.k); sv.redraw(); const all = beam(99).best, b = Rb.best, P = x => Math.exp(x).toFixed(4);
        out.innerHTML = `Beam width ${st.k} finds “<b>${b.s.join(' ')}</b>” with probability ${P(b.lp)} (log ${b.lp.toFixed(3)}). The most probable sentence overall is “${all.s.join(' ')}” with probability ${P(all.lp)}.${b.s.join(' ') === all.s.join(' ') ? ' This beam found it.' : ' This beam missed it.'}`;
      }
      run();
    }
  });
})(window);
