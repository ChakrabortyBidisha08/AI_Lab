/* Chapter 21 labs: a neural-network playground, backpropagation by hand, convolution and pooling,
   and a gradient-descent golf game. */
(function (G) {
  'use strict';
  const AI = G.AI, E = G.AIE, esc = AI.esc, P = AI._plane;

  /* =====================================================================
     Neural network playground
     ===================================================================== */
  function nnData(kind, r, n) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      let x, y, c;
      if (kind === 'spiral') { c = i % 2; const t = (i >> 1) / (n / 2) * 3.2 + 0.25, a = t * 1.9 + c * Math.PI; x = 0.5 + Math.cos(a) * t * 0.13 + AI.gauss(r) * 0.012; y = 0.5 + Math.sin(a) * t * 0.13 + AI.gauss(r) * 0.012; }
      else if (kind === 'circle') { x = r(); y = r(); c = Math.hypot(x - 0.5, y - 0.5) < 0.3 ? 1 : 0; }
      else if (kind === 'xor') { x = r(); y = r(); c = (x > 0.5) !== (y > 0.5) ? 1 : 0; if (Math.abs(x - 0.5) < 0.03 || Math.abs(y - 0.5) < 0.03) { i--; continue; } }
      else { c = i % 2; x = (c ? 0.68 : 0.32) + AI.gauss(r) * 0.11; y = (c ? 0.66 : 0.34) + AI.gauss(r) * 0.11; }
      pts.push({ x: AI.clamp(x, 0.01, 0.99), y: AI.clamp(y, 0.01, 0.99), c });
    }
    return pts;
  }
  AI.lab({
    id: 'nn-playground', ch: 21, kind: 'demo', title: 'Neural network playground',
    blurb: 'Train a small multilayer network on two-dimensional data and watch the decision boundary bend. Change the depth, width, activation and learning rate, and see what each costs and buys.',
    tags: ['neural network', 'multilayer perceptron', 'activation function', 'stochastic gradient descent', 'cross-entropy loss', 'regularisation'],
    how: [['What you are watching', '<p>Every point of the plane is coloured by the network’s predicted probability of the circle class. The network diagram shows the weights: blue positive, orange negative, thicker for larger magnitude.</p>'],
      ['Training', '<p>Each update takes a minibatch of 10 random training points, runs them forwards, computes the cross-entropy loss, backpropagates the gradient and takes one gradient step. A fifth of the data is held out as a test set.</p>'],
      ['Experiments', '<ul><li>XOR cannot be learned without hidden units, or with just one: the boundary is still a single line. It needs at least two, and training finds a solution much more reliably with four.</li><li>The spiral needs depth and patience.</li><li>A large learning rate makes the loss jump about; a tiny one barely moves.</li><li>ReLU units train fast but can “die” and stop learning.</li></ul>']],
    mount(root, ctx) {
      const st = { data: 'xor', arch: '4', act: 'tanh', lr: -0.7, l2: 0 };
      const Ln = AI.layout(root);
      const host = AI.el('<div style="padding:10px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:10px;align-items:start"></div>'); Ln.stage.appendChild(host); Ln.stage.classList.add('plain');
      const left = AI.el('<div></div>'), right = AI.el('<div style="height:100%;min-height:260px;position:relative"></div>'); host.append(left, right);
      let net, train, test, rng, steps = 0, running = null, lossHist = [], accHist = [], frameN = 0;
      const pl = P.plane(left, ctx, c => { P.frame2d(c, net ? (x, y) => net.predict(2 * x - 1, 2 * y - 1) : null, 7); P.dots(c, train, { size: () => 4.5 }); P.dots(c, test, { size: () => 3.5 }); }, 0.92);
      const nsv = AI.svgHost(right, ctx, (w, h) => netSVG(w, h));
      const bar = AI.el('<div class="player"></div>'); Ln.stageCol.appendChild(bar);
      const bRun = AI.el(`<button type="button" class="btn primary" style="min-width:110px">${AI.icon.play}<span>Train</span></button>`), bStep = AI.el(`<button type="button" class="btn">${AI.icon.next}<span>One update</span></button>`), bReset = AI.el(`<button type="button" class="btn">${AI.icon.reset}<span>New weights</span></button>`), info = AI.el('<span class="count" style="margin-left:auto"></span>');
      bar.append(bRun, bStep, bReset, info);
      const pc = AI.panel(Ln.side, 'Network');
      AI.controls(pc, [{ t: 'select', k: 'data', label: 'Data', opts: [['xor', 'XOR (quadrants)'], ['circle', 'Disc'], ['blobs', 'Two clouds'], ['spiral', 'Two spirals']], str: true }, { t: 'select', k: 'arch', label: 'Hidden layers', opts: [['0', 'none (logistic regression)'], ['1', '1 unit'], ['2', '2 units'], ['4', '4 units'], ['8', '8 units'], ['4,4', '4 + 4 units'], ['8,8', '8 + 8 units'], ['8,8,8', '8 + 8 + 8 units']], str: true }, { t: 'row' }, { t: 'seg', k: 'act', label: 'Activation', opts: [['tanh', 'tanh'], ['relu', 'ReLU'], ['sigmoid', 'sigmoid']] }, { t: 'row' }, { t: 'range', k: 'lr', label: 'Learning rate', min: -3, max: 0.5, step: 0.1, fmt: v => (10 ** v).toPrecision(2) }, { t: 'select', k: 'l2', label: 'L2 regularisation', opts: [[0, 'none'], [0.0001, '0.0001'], [0.001, '0.001'], [0.01, '0.01']] }], st, k => { if (k === 'data') data(); else if (k === 'arch' || k === 'act') init(); });
      const ps = AI.panel(Ln.side, 'Progress'); const stats = AI.stats(ps, [['ep', 'epochs'], ['loss', 'training loss'], ['tr', 'train accuracy'], ['te', 'test accuracy']]);
      const pb = AI.panel(Ln.below, 'Loss and test accuracy'); const cb = AI.el('<div></div>'); pb.appendChild(cb); const chart = AI.chart(cb, ctx, { height: 210, yMin: 0, xLabel: 'training updates (×10)', right: 120 });
      function data() { const r = AI.rng({ xor: 3, circle: 4, blobs: 5, spiral: 6 }[st.data]); const all = nnData(st.data, r, st.data === 'spiral' ? 300 : 250); train = all.filter((_, i) => i % 5); test = all.filter((_, i) => i % 5 === 0); init(); }
      const M = pts => pts.map(p => ({ x: 2 * p.x - 1, y: 2 * p.y - 1, c: p.c }));
      function init() { stop(); rng = AI.rng((Math.random() * 1e9) | 0); const hid = st.arch === '0' ? [] : st.arch.split(',').map(Number); net = new E.MLP([2].concat(hid, [1]), st.act, rng); steps = 0; lossHist = []; accHist = []; upd(); }
      function evalLoss() { let L = 0; train.forEach(p => { const o = net.predict(2 * p.x - 1, 2 * p.y - 1); L += -(p.c ? Math.log(o + 1e-9) : Math.log(1 - o + 1e-9)); }); return L / train.length; }
      function stepN(n) { const tm = M(train); for (let i = 0; i < n; i++) { net.train(tm, Math.pow(10, st.lr), 10, +st.l2); steps++; if (steps % 10 === 0) { lossHist.push(evalLoss()); accHist.push(net.accuracy(M(test))); } } }
      function upd(light) { const L = evalLoss(); stats.set('ep', (steps * 10 / train.length).toFixed(1)); stats.set('loss', isFinite(L) ? L.toFixed(3) : '∞'); stats.set('tr', (net.accuracy(M(train)) * 100).toFixed(1) + '%'); stats.set('te', (net.accuracy(M(test)) * 100).toFixed(1) + '%'); info.textContent = `${steps.toLocaleString('en-US')} updates`; if (!light) { pl.redraw(); nsv.redraw(); } const k = Math.max(1, Math.ceil(lossHist.length / 300)); chart.set([{ name: 'training loss', color: 'var(--accent)', values: lossHist.filter((_, i) => i % k === 0) }, { name: 'test accuracy', color: 'var(--v-path)', values: accHist.filter((_, i) => i % k === 0) }]); }
      function start() { if (running) return; running = ctx.raf(() => { stepN(st.data === 'spiral' ? 40 : 20); frameN++; upd(frameN % 3 !== 0); if (steps > 200000) stop(); }); bRun.innerHTML = `${AI.icon.pause}<span>Pause</span>`; }
      function stop() { if (running) { running(); running = null; } bRun.innerHTML = `${AI.icon.play}<span>Train</span>`; if (net) upd(); }
      function netSVG(w, h) {
        if (!net) return ''; const sz = net.sizes, cols = sz.length, X = i => 18 + i * (w - 36) / (cols - 1), Y = (l, j) => { const n = sz[l]; const gap = Math.min(40, (h - 40) / Math.max(1, n)); return h / 2 + (j - (n - 1) / 2) * gap; };
        let s = '', mx = 1e-9; net.W.forEach(m => m.forEach(r => r.forEach(v => { mx = Math.max(mx, Math.abs(v)); })));
        net.W.forEach((m, l) => m.forEach((row, j) => row.forEach((v, i) => { s += `<line x1="${X(l)}" y1="${Y(l, i)}" x2="${X(l + 1)}" y2="${Y(l + 1, j)}" stroke="${v >= 0 ? 'var(--v-path)' : 'var(--accent)'}" stroke-width="${(0.4 + 4.6 * Math.abs(v) / mx).toFixed(2)}" stroke-opacity=".75"/>`; })));
        sz.forEach((n, l) => { for (let j = 0; j < n; j++) s += `<circle cx="${X(l)}" cy="${Y(l, j)}" r="9" fill="var(--bg)" stroke="var(--ink2)" stroke-width="2"/>`; });
        s += `<text x="${X(0)}" y="${h - 6}" text-anchor="middle" class="svg-s">x, y</text><text x="${X(cols - 1)}" y="${h - 6}" text-anchor="middle" class="svg-s">P(circle)</text>`;
        return s;
      }
      bRun.onclick = () => running ? stop() : start(); bStep.onclick = () => { stop(); stepN(1); upd(); }; bReset.onclick = init;
      data();
    }
  });

  /* =====================================================================
     Backpropagation, step by step, with a numerical gradient check
     ===================================================================== */
  const sg = z => 1 / (1 + Math.exp(-z));
  function bpForward(w, x1, x2) { const in3 = w.w03 + w.w13 * x1 + w.w23 * x2, a3 = sg(in3), in4 = w.w04 + w.w14 * x1 + w.w24 * x2, a4 = sg(in4), in5 = w.w05 + w.w35 * a3 + w.w45 * a4, a5 = sg(in5); return { in3, a3, in4, a4, in5, a5 }; }
  function bpGrad(w, x1, x2, y) { const f = bpForward(w, x1, x2), dA5 = -2 * (y - f.a5), d5 = dA5 * f.a5 * (1 - f.a5), d3 = d5 * w.w35 * f.a3 * (1 - f.a3), d4 = d5 * w.w45 * f.a4 * (1 - f.a4); return { f, dA5, d5, d3, d4, g: { w05: d5, w35: d5 * f.a3, w45: d5 * f.a4, w03: d3, w13: d3 * x1, w23: d3 * x2, w04: d4, w14: d4 * x1, w24: d4 * x2 } }; }
  const bpLoss = (w, x1, x2, y) => (y - bpForward(w, x1, x2).a5) ** 2;
  AI._bp = { bpForward, bpGrad, bpLoss };
  const WN = ['w13', 'w23', 'w03', 'w14', 'w24', 'w04', 'w35', 'w45', 'w05'], WL = { w13: 'w₁,₃', w23: 'w₂,₃', w03: 'w₀,₃', w14: 'w₁,₄', w24: 'w₂,₄', w04: 'w₀,₄', w35: 'w₃,₅', w45: 'w₄,₅', w05: 'w₀,₅' };
  AI.lab({
    id: 'backprop', ch: 21, kind: 'demo', title: 'Backpropagation by hand',
    blurb: 'One training example through a network with two inputs, two hidden units and one output. Step through the forward pass, the loss, and the backward pass, and check every gradient numerically.',
    tags: ['backpropagation', 'chain rule', 'gradient', 'sigmoid', 'computation graph', 'gradient check'],
    how: [['The network', '<p>It has the shape of the book’s simple example: inputs x₁, x₂; hidden units 3 and 4; output unit 5; all with sigmoid activation g(z) = 1/(1 + e<sup>−z</sup>), whose derivative is g(z)(1 − g(z)). Weight w<sub>i,j</sub> connects unit i to unit j, and w<sub>0,j</sub> is unit j’s bias. The loss is the squared error (y − ŷ)².</p>'],
      ['The backward pass', '<p>Write Δⱼ = ∂Loss/∂inⱼ. At the output, Δ₅ = −2(y − ŷ) · ŷ(1 − ŷ). For a hidden unit, Δⱼ = g′(inⱼ) · wⱼ,₅ · Δ₅. Every weight’s gradient is then ∂Loss/∂wᵢ,ⱼ = aᵢ Δⱼ, with a₀ = 1.</p>'],
      ['Gradient checking', '<p>The last column compares each analytic gradient with a central difference (Loss(w + h) − Loss(w − h)) / 2h, with h = 10⁻⁵. Agreement to many digits is how practitioners test a backpropagation implementation.</p>']],
    mount(root, ctx) {
      const st = { x1: 1, x2: 0, y: 1, alpha: 0.5 };
      const W0 = { w13: 0.5, w23: -0.4, w03: 0.1, w14: -0.3, w24: 0.8, w04: -0.2, w35: 0.7, w45: -0.6, w05: 0.05 };
      let w = Object.assign({}, W0), frame = null;
      const Lb = AI.layout(root);
      const sv = AI.svgHost(Lb.stage, ctx, (W, H) => draw(W, H));
      const player = AI.Player(Lb.stageCol, ctx, f => { frame = f; sv.redraw(); ex.innerHTML = f.msg; }, { speed: 1400 });
      const pc = AI.panel(Lb.side, 'Example and learning rate');
      AI.controls(pc, [{ t: 'seg', k: 'x1', label: 'x₁', opts: [[0, '0'], [1, '1']] }, { t: 'seg', k: 'x2', label: 'x₂', opts: [[0, '0'], [1, '1']] }, { t: 'seg', k: 'y', label: 'target y', opts: [[0, '0'], [1, '1']] }, { t: 'row' }, { t: 'range', k: 'alpha', label: 'Learning rate α', min: 0.1, max: 5, step: 0.1, fmt: v => v.toFixed(1) }, { t: 'row' }, { t: 'btn', label: 'Apply the update', icon: 'next', cls: 'primary', on: () => { const G2 = bpGrad(w, st.x1, st.x2, st.y).g; WN.forEach(k => { w[k] -= st.alpha * G2[k]; }); build(true); } }, { t: 'btn', label: 'Reset weights', icon: 'reset', on: () => { w = Object.assign({}, W0); build(); } }], st, () => build());
      const pe = AI.panel(Lb.side, 'This step'); const ex = AI.el('<div class="explain small"></div>'); pe.appendChild(ex);
      const pt = AI.panel(Lb.below, 'Gradients for this example'); const tab = AI.el('<div></div>'); pt.appendChild(tab);
      const f4 = v => (v < 0 ? '−' : '') + Math.abs(v).toFixed(4);
      function build(updated) {
        const B = bpGrad(w, st.x1, st.x2, st.y), f = B.f, L = bpLoss(w, st.x1, st.x2, st.y), fr = [];
        fr.push({ show: { in: 1 }, msg: `${updated ? 'Weights updated. ' : ''}Inputs x₁ = ${st.x1}, x₂ = ${st.x2}; target y = ${st.y}. Weights are shown on the edges.` });
        fr.push({ show: { in: 1, h3: 1 }, hl: 'h3', msg: `Unit 3: in₃ = w₀,₃ + w₁,₃x₁ + w₂,₃x₂ = ${f4(w.w03)} + ${f4(w.w13)}·${st.x1} + ${f4(w.w23)}·${st.x2} = ${f4(f.in3)}; a₃ = g(in₃) = ${f4(f.a3)}.` });
        fr.push({ show: { in: 1, h3: 1, h4: 1 }, hl: 'h4', msg: `Unit 4: in₄ = ${f4(w.w04)} + ${f4(w.w14)}·${st.x1} + ${f4(w.w24)}·${st.x2} = ${f4(f.in4)}; a₄ = g(in₄) = ${f4(f.a4)}.` });
        fr.push({ show: { in: 1, h3: 1, h4: 1, o: 1 }, hl: 'o', msg: `Unit 5: in₅ = w₀,₅ + w₃,₅a₃ + w₄,₅a₄ = ${f4(w.w05)} + ${f4(w.w35)}·${f4(f.a3)} + ${f4(w.w45)}·${f4(f.a4)} = ${f4(f.in5)}; ŷ = a₅ = ${f4(f.a5)}.` });
        fr.push({ show: { in: 1, h3: 1, h4: 1, o: 1, loss: 1 }, hl: 'loss', msg: `Loss = (y − ŷ)² = (${st.y} − ${f4(f.a5)})² = <b>${L.toFixed(5)}</b>.` });
        fr.push({ show: { in: 1, h3: 1, h4: 1, o: 1, loss: 1, d5: 1 }, hl: 'o', back: 1, msg: `Backward. ∂Loss/∂ŷ = −2(y − ŷ) = ${f4(B.dA5)}. Δ₅ = that × ŷ(1 − ŷ) = ${f4(B.dA5)} × ${f4(f.a5 * (1 - f.a5))} = <b>${f4(B.d5)}</b>. So ∂Loss/∂w₃,₅ = a₃Δ₅ = ${f4(B.g.w35)}, ∂Loss/∂w₄,₅ = a₄Δ₅ = ${f4(B.g.w45)}, ∂Loss/∂w₀,₅ = Δ₅.` });
        fr.push({ show: { in: 1, h3: 1, h4: 1, o: 1, loss: 1, d5: 1, d3: 1 }, hl: 'h3', back: 1, msg: `Δ₃ = a₃(1 − a₃) · w₃,₅ · Δ₅ = ${f4(f.a3 * (1 - f.a3))} × ${f4(w.w35)} × ${f4(B.d5)} = <b>${f4(B.d3)}</b>. So ∂Loss/∂w₁,₃ = x₁Δ₃ = ${f4(B.g.w13)} and ∂Loss/∂w₂,₃ = x₂Δ₃ = ${f4(B.g.w23)}.` });
        fr.push({ show: { in: 1, h3: 1, h4: 1, o: 1, loss: 1, d5: 1, d3: 1, d4: 1 }, hl: 'h4', back: 1, msg: `Δ₄ = a₄(1 − a₄) · w₄,₅ · Δ₅ = ${f4(f.a4 * (1 - f.a4))} × ${f4(w.w45)} × ${f4(B.d5)} = <b>${f4(B.d4)}</b>. Every gradient is now known; the table below checks them numerically.` });
        const nw = {}; WN.forEach(k => nw[k] = w[k] - st.alpha * B.g[k]); const L2 = bpLoss(nw, st.x1, st.x2, st.y);
        fr.push({ show: { in: 1, h3: 1, h4: 1, o: 1, loss: 1, d5: 1, d3: 1, d4: 1 }, back: 1, msg: `A gradient step with α = ${st.alpha.toFixed(1)} (wᵢ,ⱼ ← wᵢ,ⱼ − α ∂Loss/∂wᵢ,ⱼ) would ${L2 < L ? 'lower' : 'raise'} the loss on this example from ${L.toFixed(5)} to ${L2.toFixed(5)}.${L2 < L ? '' : ' The step is too large and overshoots.'} Press “Apply the update” to take it.` });
        player.set(fr);
        const hh = 1e-5; tab.innerHTML = AI.table(['Weight', 'r:Value', 'r:Backprop gradient', 'r:Numerical gradient', 'r:After the step'], WN.map(k => { const a = Object.assign({}, w), b = Object.assign({}, w); a[k] += hh; b[k] -= hh; const num = (bpLoss(a, st.x1, st.x2, st.y) - bpLoss(b, st.x1, st.x2, st.y)) / (2 * hh); return `<tr><td>${WL[k]}</td><td class="r">${f4(w[k])}</td><td class="r">${B.g[k].toFixed(7)}</td><td class="r">${num.toFixed(7)}</td><td class="r">${f4(nw[k])}</td></tr>`; }), 'compact');
      }
      function draw(W, H) {
        if (!frame) return ''; const sh = frame.show, B = bpGrad(w, st.x1, st.x2, st.y), f = B.f; const xs = [W * 0.12, W * 0.45, W * 0.78], N = { x1: [xs[0], H * 0.3], x2: [xs[0], H * 0.72], h3: [xs[1], H * 0.3], h4: [xs[1], H * 0.72], o: [xs[2], H * 0.51] };
        let s = AI.arrowDefs('bpA');
        const edge = (a, b, k, show) => { const [x1, y1] = N[a], [x2, y2] = N[b], mx = x1 + (x2 - x1) * 0.42, my = y1 + (y2 - y1) * 0.42; s += `<line x1="${x1 + 30}" y1="${y1}" x2="${x2 - 34}" y2="${y2}" stroke="var(--line2)" stroke-width="2.5" marker-end="url(#bpA)"/><text x="${mx}" y="${my - 8}" text-anchor="middle" class="svg-m halo-bg" style="font-size:12.5px">${WL[k]} = ${f4(w[k])}</text>`; if (show) s += `<text x="${mx}" y="${my + 14}" text-anchor="middle" class="svg-m halo-bg" style="font-size:12px" fill="var(--accent)">∂ ${f4(B.g[k])}</text>`; };
        edge('x1', 'h3', 'w13', sh.d3); edge('x2', 'h3', 'w23', sh.d3); edge('x1', 'h4', 'w14', sh.d4); edge('x2', 'h4', 'w24', sh.d4); edge('h3', 'o', 'w35', sh.d5); edge('h4', 'o', 'w45', sh.d5);
        const node = (k, label, val, sub, on) => { const [x, y] = N[k]; s += `<circle cx="${x}" cy="${y}" r="30" fill="${on ? 'color-mix(in srgb,var(--v-path) 12%,var(--bg))' : 'var(--bg)'}" stroke="${frame.hl === k ? 'var(--accent)' : 'var(--ink2)'}" stroke-width="${frame.hl === k ? 4 : 2}"/><text x="${x}" y="${y - 4}" text-anchor="middle" class="svg-b" style="font-size:14px">${label}</text>${val != null ? `<text x="${x}" y="${y + 14}" text-anchor="middle" class="svg-m" style="font-size:12px">${val}</text>` : ''}${sub ? `<text x="${x}" y="${y + 50}" text-anchor="middle" class="svg-s halo-bg" style="font-size:12px">${sub}</text>` : ''}`; };
        node('x1', 'x₁', String(st.x1), null, 1); node('x2', 'x₂', String(st.x2), null, 1);
        node('h3', 'unit 3', sh.h3 ? f4(f.a3) : null, `bias ${f4(w.w03)}${sh.d3 ? ` · Δ₃ ${f4(B.d3)}` : ''}`, sh.h3);
        node('h4', 'unit 4', sh.h4 ? f4(f.a4) : null, `bias ${f4(w.w04)}${sh.d4 ? ` · Δ₄ ${f4(B.d4)}` : ''}`, sh.h4);
        node('o', 'unit 5', sh.o ? f4(f.a5) : null, `bias ${f4(w.w05)}${sh.d5 ? ` · Δ₅ ${f4(B.d5)}` : ''}`, sh.o);
        if (sh.loss) s += `<text x="${N.o[0]}" y="${N.o[1] - 48}" text-anchor="middle" class="svg-t halo-bg" style="font-weight:600">loss ${bpLoss(w, st.x1, st.x2, st.y).toFixed(5)} (target ${st.y})</text>`;
        if (frame.back) s += `<text x="${W - 12}" y="${H - 10}" text-anchor="end" class="svg-s" fill="var(--accent)">orange: gradients flowing backwards</text>`;
        return s;
      }
      Lb.stage.style.minHeight = '360px';
      build();
    }
  });

  /* =====================================================================
     Convolution, ReLU and max-pooling on a small image
     ===================================================================== */
  const IMG = ['000000000', '011111100', '010000100', '010000100', '011111100', '000000100', '000000100', '011111100', '000000000'].map(r => r.split('').map(Number)); // a digit 9
  const KERN = { vert: [[1, 0, -1], [1, 0, -1], [1, 0, -1]], horiz: [[1, 1, 1], [0, 0, 0], [-1, -1, -1]], diag: [[0, 1, 1], [-1, 0, 1], [-1, -1, 0]], lap: [[0, 1, 0], [1, -4, 1], [0, 1, 0]], blur: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], ident: [[0, 0, 0], [0, 1, 0], [0, 0, 0]] };
  function conv(img, k, stride, pad) {
    const n = img.length, m = k.length, o = Math.floor((n + 2 * pad - m) / stride) + 1, out = [];
    const px = (i, j) => (i < 0 || j < 0 || i >= n || j >= n) ? 0 : img[i][j];
    for (let i = 0; i < o; i++) { const row = []; for (let j = 0; j < o; j++) { let s = 0; for (let a = 0; a < m; a++) for (let b = 0; b < m; b++) s += k[a][b] * px(i * stride - pad + a, j * stride - pad + b); row.push(s); } out.push(row); }
    return out;
  }
  function pool(fm) { const n = Math.floor(fm.length / 2), out = []; for (let i = 0; i < n; i++) { const r = []; for (let j = 0; j < n; j++) r.push(Math.max(fm[2 * i][2 * j], fm[2 * i][2 * j + 1], fm[2 * i + 1][2 * j], fm[2 * i + 1][2 * j + 1])); out.push(r); } return out; }
  AI._conv = { conv, pool, IMG, KERN };
  AI.lab({
    id: 'convolution', ch: 21, kind: 'demo', title: 'Convolution, ReLU and pooling',
    blurb: 'Slide a 3×3 kernel over a 9×9 image of a digit, one position at a time, and see each output value computed. Then apply ReLU and 2×2 max-pooling, as a convolutional layer does.',
    tags: ['convolutional neural network', 'kernel', 'feature map', 'stride', 'padding', 'max-pooling', 'ReLU'],
    how: [['One output value', '<p>Place the kernel over a 3×3 patch of the image, multiply corresponding numbers and add them up. Slide it by the stride and repeat. Like most deep-learning software, this does not flip the kernel, so strictly it computes a cross-correlation.</p>'],
      ['Size of the output', '<p>For an n×n image, a k×k kernel, padding p and stride s, the feature map has ⌊(n + 2p − k)/s⌋ + 1 rows and columns. Here n = 9 and k = 3.</p>'],
      ['ReLU and pooling', '<p>ReLU replaces negative values by 0. Max-pooling with a 2×2 window and stride 2 keeps the largest value in each window, halving the size and making the response less sensitive to small shifts.</p>']],
    mount(root, ctx) {
      const st = { k: 'vert', stride: 1, pad: 0, relu: true };
      let fr = null, out, act, pl;
      const Lc = AI.layout(root);
      const sv = AI.svgHost(Lc.stage, ctx, (w, h) => draw(w, h)); Lc.stage.style.minHeight = '400px';
      const player = AI.Player(Lc.stageCol, ctx, f => { fr = f; sv.redraw(); ex.innerHTML = f.msg; }, { speed: 300 });
      const pc = AI.panel(Lc.side, 'Layer');
      AI.controls(pc, [{ t: 'select', k: 'k', label: 'Kernel', opts: [['vert', 'Vertical edges'], ['horiz', 'Horizontal edges'], ['diag', 'Diagonal edges'], ['lap', 'Laplacian (spots)'], ['blur', 'Box (sum of 9)'], ['ident', 'Identity']], str: true }, { t: 'row' }, { t: 'seg', k: 'stride', label: 'Stride', opts: [[1, '1'], [2, '2']] }, { t: 'seg', k: 'pad', label: 'Zero padding', opts: [[0, 'none'], [1, '1 pixel']] }, { t: 'row' }, { t: 'check', k: 'relu', label: 'Apply ReLU before pooling' }], st, () => build());
      const pe = AI.panel(Lc.side, 'This step'); const ex = AI.el('<div class="explain small"></div>'); pe.appendChild(ex);
      function build() {
        const K = KERN[st.k]; out = conv(IMG, K, st.stride, st.pad); act = st.relu ? out.map(r => r.map(v => Math.max(0, v))) : out; pl = act.length >= 2 ? pool(act) : [];
        const frames = [], o = out.length; frames.push({ i: -1, j: -1, msg: `A ${o}×${o} feature map will be produced: ⌊(9 + 2·${st.pad} − 3)/${st.stride}⌋ + 1 = ${o}.` });
        for (let i = 0; i < o; i++) for (let j = 0; j < o; j++) { const terms = []; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { const r = i * st.stride - st.pad + a, c = j * st.stride - st.pad + b, v = (r < 0 || c < 0 || r > 8 || c > 8) ? 0 : IMG[r][c]; if (K[a][b] && v) terms.push(`${K[a][b] < 0 ? '−' : '+'} ${Math.abs(K[a][b])}×${v}`); } const sum = terms.join(' ').replace(/^\+ /, '').replace(/^− /, '−'); frames.push({ i, j, msg: `Output (${i + 1}, ${j + 1}): ${terms.length ? sum : 'every product is 0'} = <b>${String(out[i][j]).replace('-', '−')}</b>.` }); }
        frames.push({ i: o, j: o, msg: `Done. ${st.relu ? 'ReLU sets the negative values to 0, then ' : ''}2×2 max-pooling with stride 2 gives a ${pl.length}×${pl.length} map.${o % 2 ? ' (The odd last row and column are dropped.)' : ''}` });
        player.set(frames);
      }
      function grid(s, M, x0, y0, cs, o) {
        o = o || {}; const mx = Math.max(1, ...M.flat().map(Math.abs));
        M.forEach((row, i) => row.forEach((v, j) => { const vis = !o.upto || i < o.upto[0] || (i === o.upto[0] && j <= o.upto[1]); const a = Math.abs(v) / mx; const fill = !vis ? 'var(--bg)' : o.bin ? (v ? 'var(--ink2)' : 'var(--bg)') : v > 0 ? `color-mix(in srgb,var(--v-path) ${Math.round(a * 70)}%,var(--bg))` : v < 0 ? `color-mix(in srgb,var(--accent) ${Math.round(a * 70)}%,var(--bg))` : 'var(--bg)';
          s.push(`<rect x="${x0 + j * cs}" y="${y0 + i * cs}" width="${cs}" height="${cs}" fill="${fill}" stroke="var(--line2)"/>`); if (vis && cs >= 16) s.push(`<text x="${x0 + (j + 0.5) * cs}" y="${y0 + (i + 0.5) * cs + 4}" text-anchor="middle" class="svg-m" style="font-size:${Math.min(13, cs * 0.42)}px" fill="${o.bin && v ? '#fff' : 'var(--ink)'}">${v}</text>`); }));
      }
      function draw(w, h) {
        if (!fr) return ''; const s = []; const o = out.length, cs = Math.min(30, (w - 60) / (9 + 2 * st.pad + o + 4.5), (h - 60) / 11), padN = 9 + 2 * st.pad;
        const x0 = 16, y0 = 34; s.push(`<text x="${x0}" y="20" class="svg-s">input${st.pad ? ' (with zero padding)' : ''}</text>`);
        const P2 = IMG.map(r => r.slice()); const padded = st.pad ? [Array(11).fill(0)].concat(P2.map(r => [0].concat(r, [0]))).concat([Array(11).fill(0)]) : P2;
        grid(s, padded, x0, y0, cs, { bin: true });
        if (fr.i >= 0 && fr.i < o) { const r0 = fr.i * st.stride, c0 = fr.j * st.stride; s.push(`<rect x="${x0 + c0 * cs}" y="${y0 + r0 * cs}" width="${3 * cs}" height="${3 * cs}" fill="none" stroke="var(--accent)" stroke-width="3.5"/>`); }
        const kx = x0 + padN * cs + cs * 0.8; s.push(`<text x="${kx}" y="20" class="svg-s">kernel</text>`); grid(s, KERN[st.k], kx, y0, cs);
        const ox = kx, oy = y0 + 3 * cs + 34; s.push(`<text x="${ox}" y="${oy - 10}" class="svg-s">feature map ${o}×${o}</text>`); grid(s, out, ox, oy, cs, { upto: fr.i < 0 ? [-1, -1] : fr.i >= o ? null : [fr.i, fr.j] });
        if (fr.i >= 0 && fr.i < o) s.push(`<rect x="${ox + fr.j * cs}" y="${oy + fr.i * cs}" width="${cs}" height="${cs}" fill="none" stroke="var(--accent)" stroke-width="3.5"/>`);
        if (fr.i >= o && pl.length) { const px = ox + o * cs + cs * 0.8; s.push(`<text x="${px}" y="${oy - 10}" class="svg-s">${st.relu ? 'ReLU, then ' : ''}max-pool ${pl.length}×${pl.length}</text>`); grid(s, pl, px, oy, cs); }
        return s.join('');
      }
      build();
    }
  });

  /* =====================================================================
     Game: gradient-descent golf
     ===================================================================== */
  const HOLES = [
    { name: 'The round green', f: (x, y) => x * x + y * y, g: (x, y) => [2 * x, 2 * y], start: [1.6, 1.3], min: [0, 0], note: 'A perfectly round bowl. Almost any sensible learning rate gets there.' },
    { name: 'The long valley', f: (x, y) => 0.25 * x * x + 6 * y * y, g: (x, y) => [0.5 * x, 12 * y], start: [-1.8, 0.5], min: [0, 0], note: 'Steep across, shallow along. A learning rate big enough to make progress along the valley makes the ball bounce from side to side. Momentum helps.' },
    { name: 'The banana', f: (x, y) => (1 - x) ** 2 + 5 * (y - x * x) ** 2, g: (x, y) => [-2 * (1 - x) - 20 * x * (y - x * x), 10 * (y - x * x)], start: [-1.4, 1.6], min: [1, 1], note: 'A curved valley in the style of Rosenbrock’s function. The floor bends, so the downhill direction keeps changing.' },
    { name: 'Two hollows', f: (x, y) => (x * x - 1) ** 2 + 0.3 * x + y * y, g: (x, y) => [4 * x * (x * x - 1) + 0.3, 2 * y], start: [1.7, 1.1], min: null, note: 'There is a shallow hollow on the right and a deeper one, the hole, on the left. Small careful steps settle in the nearer, shallower hollow. Reaching the deeper one takes steps big enough, or momentum strong enough, to cross the ridge between them.' }
  ];
  (function () { const h = HOLES[3]; let x = -1; for (let i = 0; i < 200; i++) { const d = 4 * x * (x * x - 1) + 0.3, dd = 12 * x * x - 4; x -= d / dd; } h.min = [x, 0]; })();
  function putt(hole, a, beta, maxSteps) {
    let [x, y] = hole.start, vx = 0, vy = 0; const path = [[x, y]]; let rest = -1;
    for (let t = 1; t <= maxSteps; t++) { const [gx, gy] = hole.g(x, y); vx = beta * vx - a * gx; vy = beta * vy - a * gy; x += vx; y += vy; path.push([x, y]); if (!isFinite(x) || !isFinite(y) || Math.abs(x) > 1e3 || Math.abs(y) > 1e3) return { path, rest: -1, blew: true }; if (Math.hypot(x - hole.min[0], y - hole.min[1]) < 0.05 && Math.hypot(vx, vy) < 0.005) { rest = t; break; } }
    return { path, rest };
  }
  AI._golf = { HOLES, putt };
  AI.lab({
    id: 'gd-golf', ch: 21, kind: 'game', title: 'Gradient-descent golf',
    blurb: 'Choose a learning rate and a momentum, then putt. The ball follows gradient descent across the loss surface. Get it to come to rest in the hole in as few steps as possible.',
    tags: ['gradient descent', 'learning rate', 'momentum', 'loss surface', 'local minima', 'ill-conditioning'],
    how: [['The update', '<p>With momentum β the ball keeps a velocity: v ← βv − α∇f(x), then x ← x + v. With β = 0 this is plain gradient descent. The ball has come to rest in the hole when it is within 0.05 of the minimum and moving less than 0.005 per step.</p>'],
      ['Scoring', '<p>Your score for a hole is the number of steps to come to rest; fewer is better. A putt is cut off after 400 steps, and one that flies off the surface is a lost ball.</p>'],
      ['What each hole teaches', '<ul><li>Round green: the effect of α alone.</li><li>Long valley: ill-conditioning, where one α cannot suit both directions.</li><li>Banana: a curving valley floor.</li><li>Two hollows: local minima, and how big steps or momentum can escape a shallow one.</li></ul>']],
    mount(root, ctx) {
      const st = { hole: 0, a: -1.3, beta: 0 };
      const Lg = AI.layout(root);
      const host = AI.el('<div style="padding:10px"></div>'); Lg.stage.appendChild(host); Lg.stage.classList.add('plain');
      const banner = AI.banner(Lg.stage);
      let res = null, shown = 0, anim = null;
      const RANGE = 2.1, toU = v => (v + RANGE) / (2 * RANGE);
      const pl = P.plane(host, ctx, c => {
        const g = c.g, h = HOLES[st.hole], step = 5; g.fillStyle = AI.color('bg'); g.fillRect(0, 0, c.w, c.h); const base = AI.color('v-goal');
        let fmin = Infinity, fmax = -Infinity; const vals = []; for (let px = c.pad; px < c.w - c.pad; px += step) for (let py = c.pad; py < c.h - c.pad; py += step) { const x = c.ix(px + step / 2) * 2 * RANGE - RANGE, y = c.iy(py + step / 2) * 2 * RANGE - RANGE, v = h.f(x, y); vals.push([px, py, v]); fmin = Math.min(fmin, v); fmax = Math.max(fmax, v); }
        vals.forEach(([px, py, v]) => { const t = Math.log(1 + (v - fmin)) / Math.log(1 + (fmax - fmin)); const band = Math.floor(t * 14) % 2; g.fillStyle = AI.alpha(base, 0.08 + 0.5 * (1 - t) + (band ? 0.04 : 0)); g.fillRect(px, py, step, step); });
        const hx = c.X(toU(h.min[0])), hy = c.Y(toU(h.min[1])); g.fillStyle = AI.color('ink'); g.beginPath(); g.arc(hx, hy, 7, 0, Math.PI * 2); g.fill(); g.strokeStyle = AI.color('ink'); g.lineWidth = 2; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx, hy - 34); g.stroke(); g.fillStyle = AI.color('accent'); g.beginPath(); g.moveTo(hx, hy - 34); g.lineTo(hx + 18, hy - 28); g.lineTo(hx, hy - 22); g.fill();
        const path = res ? res.path.slice(0, shown + 1) : [h.start]; g.save(); g.beginPath(); g.rect(c.pad, c.pad, c.w - 2 * c.pad, c.h - 2 * c.pad); g.clip(); g.strokeStyle = AI.color('ink2'); g.lineWidth = 2; g.beginPath(); path.forEach(([x, y], i) => i ? g.lineTo(c.X(toU(x)), c.Y(toU(y))) : g.moveTo(c.X(toU(x)), c.Y(toU(y)))); g.stroke(); const [bx, by] = path[path.length - 1]; g.fillStyle = '#ffffff'; g.strokeStyle = AI.color('ink'); g.lineWidth = 2; g.beginPath(); g.arc(c.X(toU(bx)), c.Y(toU(by)), 8, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
      }, 0.82);
      const bar = AI.el('<div class="player"></div>'); Lg.stageCol.appendChild(bar); const bPutt = AI.el(`<button type="button" class="btn primary">${AI.icon.play}<span>Putt</span></button>`), info = AI.el('<span class="count" style="margin-left:auto"></span>'); bar.append(bPutt, info);
      const pc = AI.panel(Lg.side, 'Your shot');
      AI.controls(pc, [{ t: 'select', k: 'hole', label: 'Hole', opts: HOLES.map((h, i) => [i, `${i + 1}. ${h.name}`]) }, { t: 'row' }, { t: 'range', k: 'a', label: 'Learning rate α', min: -3, max: 0, step: 0.05, fmt: v => (10 ** v).toPrecision(2) }, { t: 'range', k: 'beta', label: 'Momentum β', min: 0, max: 0.95, step: 0.05, fmt: v => v.toFixed(2) }], st, k => { res = null; shown = 0; if (anim) { anim(); anim = null; } if (k === 'hole') note.textContent = HOLES[st.hole].note; pl.redraw(); score(); });
      const note = AI.el('<p class="small" style="margin:8px 0 0"></p>'); pc.appendChild(note); note.textContent = HOLES[0].note;
      const ps = AI.panel(Lg.side, 'Scorecard'); const card = AI.el('<div></div>'); ps.appendChild(card);
      function score() { card.innerHTML = AI.table(['Hole', 'r:Best'], HOLES.map((h, i) => { const b = AI.progress.best('golf-' + i); return `<tr${i === st.hole ? ' style="font-weight:700"' : ''}><td>${i + 1}. ${esc(h.name)}</td><td class="r">${b == null ? '–' : b + ' steps'}</td></tr>`; }), 'compact'); }
      bPutt.onclick = () => {
        if (anim) { anim(); anim = null; } res = putt(HOLES[st.hole], Math.pow(10, st.a), st.beta, 400); shown = 0;
        anim = ctx.every(16, () => { shown = Math.min(res.path.length - 1, shown + 2); pl.redraw(); info.textContent = `step ${shown}`; if (shown >= res.path.length - 1) { anim(); anim = null; finish(); } });
      };
      function finish() {
        const h = HOLES[st.hole]; if (res.blew) { banner('Lost ball<small>The steps grew until the ball flew off. Lower the learning rate.</small>', 3000); return; }
        if (res.rest > 0) { const better = AI.progress.best('golf-' + st.hole, res.rest, false); banner(`In the hole in ${res.rest} steps${better ? '<small>New best for this hole</small>' : ''}`, 3000); score(); return; }
        const [x, y] = res.path[res.path.length - 1], d = Math.hypot(x - h.min[0], y - h.min[1]); banner(d < 0.05 ? 'Still rolling after 400 steps<small>It reached the hole but never settled: try less momentum.</small>' : st.hole === 3 && x > 0 ? 'Stuck in the shallow hollow<small>Gradient descent found a local minimum. More momentum may carry it over the ridge.</small>' : `Missed: ${d.toFixed(2)} from the hole after 400 steps<small>${Math.pow(10, st.a) < 0.02 ? 'The learning rate is very small.' : 'Try a different learning rate or momentum.'}</small>`, 3600);
      };
      score();
    }
  });
})(window);
