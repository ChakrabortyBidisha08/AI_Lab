/* Machine learning engines (AIMA ch. 19–21): decision trees, linear models, k-NN, polynomial fitting,
   AdaBoost, Bayesian learning, naive Bayes, k-means, EM, multilayer perceptrons, version spaces. */
(function (G) {
  'use strict';
  const E = G.AIE = G.AIE || {};

  /* ---------- restaurant data: the book's 12 examples, as in the authors' data files (aimacode/aima-data restaurant.csv, the original AIMA Lisp code) ---------- */
  const RA = ['Alternate', 'Bar', 'Fri/Sat', 'Hungry', 'Patrons', 'Price', 'Raining', 'Reservation', 'Type', 'WaitEstimate'];
  const RD = `Yes,No,No,Yes,Some,$$$,No,Yes,French,0–10,Yes
Yes,No,No,Yes,Full,$,No,No,Thai,30–60,No
No,Yes,No,No,Some,$,No,No,Burger,0–10,Yes
Yes,No,Yes,Yes,Full,$,No,No,Thai,10–30,Yes
Yes,No,Yes,No,Full,$$$,No,Yes,French,>60,No
No,Yes,No,Yes,Some,$$,Yes,Yes,Italian,0–10,Yes
No,Yes,No,No,None,$,Yes,No,Burger,0–10,No
No,No,No,Yes,Some,$$,Yes,Yes,Thai,0–10,Yes
No,Yes,Yes,No,Full,$,Yes,No,Burger,>60,No
Yes,Yes,Yes,Yes,Full,$$$,No,Yes,Italian,10–30,No
No,No,No,No,None,$,No,No,Thai,0–10,No
Yes,Yes,Yes,Yes,Full,$,No,No,Burger,30–60,Yes`;
  E.restaurant = {
    attrs: RA, target: 'WillWait',
    values: { Alternate: ['Yes', 'No'], Bar: ['Yes', 'No'], 'Fri/Sat': ['Yes', 'No'], Hungry: ['Yes', 'No'], Patrons: ['None', 'Some', 'Full'], Price: ['$', '$$', '$$$'], Raining: ['Yes', 'No'], Reservation: ['Yes', 'No'], Type: ['French', 'Italian', 'Thai', 'Burger'], WaitEstimate: ['0–10', '10–30', '30–60', '>60'] },
    rows: RD.split('\n').map((line, i) => { const v = line.split(','); const o = { id: 'x' + (i + 1) }; RA.forEach((a, k) => o[a] = v[k]); o.WillWait = v[10]; return o; })
  };
  const B = q => (q <= 0 || q >= 1) ? 0 : -(q * Math.log2(q) + (1 - q) * Math.log2(1 - q));
  E.entropyB = B;
  E.dt = {
    gainTable(rows, attrs, values, target) {
      const p = rows.filter(r => r[target] === 'Yes').length, n = rows.length - p, H = B(p / (p + n));
      return attrs.map(a => { const parts = values[a].map(v => { const s = rows.filter(r => r[a] === v); const pk = s.filter(r => r[target] === 'Yes').length; return { v, pk, nk: s.length - pk }; }); const rem = parts.reduce((s, q) => s + (q.pk + q.nk) / rows.length * B(q.pk + q.nk ? q.pk / (q.pk + q.nk) : 0), 0); return { a, gain: H - rem, rem, parts }; }).concat([]).map(x => Object.assign(x, { H }));
    },
    plurality(rows, target) { const y = rows.filter(r => r[target] === 'Yes').length; return y >= rows.length - y ? 'Yes' : 'No'; },
    learn(rows, attrs, values, target, parentRows, trace, depth) {
      depth = depth || 0; trace = trace || [];
      if (!rows.length) { const v = E.dt.plurality(parentRows, target); trace.push({ depth, kind: 'empty', msg: `No examples here, so use the majority of the parent node: <b>${v}</b>.` }); return { leaf: v, n: 0, empty: true }; }
      const ys = new Set(rows.map(r => r[target]));
      if (ys.size === 1) { const v = rows[0][target]; trace.push({ depth, kind: 'pure', msg: `All ${rows.length} example${rows.length > 1 ? 's' : ''} (${rows.map(r => r.id).join(', ')}) say ${v}: make a leaf.` }); return { leaf: v, n: rows.length, ids: rows.map(r => r.id) }; }
      if (!attrs.length) { const v = E.dt.plurality(rows, target); trace.push({ depth, kind: 'noattr', msg: `No attributes left: use the majority, ${v}.` }); return { leaf: v, n: rows.length, ids: rows.map(r => r.id), mixed: true }; }
      const gains = E.dt.gainTable(rows, attrs, values, target); let best = gains[0]; gains.forEach(g => { if (g.gain > best.gain + 1e-12) best = g; });
      trace.push({ depth, kind: 'split', attr: best.a, gains: gains.map(g => [g.a, g.gain]), ids: rows.map(r => r.id), msg: `Examples ${rows.map(r => r.id).join(', ')}: the most informative attribute is <b>${best.a}</b> (gain ${best.gain.toFixed(3)} bits).` });
      const node = { attr: best.a, kids: {}, n: rows.length, ids: rows.map(r => r.id), gain: best.gain };
      for (const v of values[best.a]) node.kids[v] = E.dt.learn(rows.filter(r => r[best.a] === v), attrs.filter(a => a !== best.a), values, target, rows, trace, depth + 1);
      return node;
    },
    classify(tree, row) { while (!tree.leaf) tree = tree.kids[row[tree.attr]]; return tree.leaf; },
    size(t) { return t.leaf ? 1 : 1 + Object.values(t.kids).reduce((s, k) => s + E.dt.size(k), 0); }
  };

  /* ---------- linear models on 2-D points {x,y,c} ---------- */
  E.linreg = {
    loss(pts, w0, w1) { return pts.reduce((s, p) => s + (p.y - (w0 + w1 * p.x)) ** 2, 0) / pts.length; },
    step(pts, w0, w1, a) { let g0 = 0, g1 = 0; pts.forEach(p => { const e = p.y - (w0 + w1 * p.x); g0 += e; g1 += e * p.x; }); const n = pts.length; return [w0 + a * 2 * g0 / n, w1 + a * 2 * g1 / n]; },
    exact(pts) { const n = pts.length, mx = pts.reduce((s, p) => s + p.x, 0) / n, my = pts.reduce((s, p) => s + p.y, 0) / n; let sxy = 0, sxx = 0; pts.forEach(p => { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) ** 2; }); const w1 = sxx ? sxy / sxx : 0; return [my - w1 * mx, w1]; }
  };
  E.clf = {
    sig: z => 1 / (1 + Math.exp(-z)),
    // perceptron rule with a hard threshold; labels c in {0,1}; w = [w0 (bias), w1, w2]
    perceptronStep(pts, w, a, r) { const p = pts[(r() * pts.length) | 0]; const h = (w[0] + w[1] * p.x + w[2] * p.y) >= 0 ? 1 : 0; const d = p.c - h; return { w: [w[0] + a * d, w[1] + a * d * p.x, w[2] + a * d * p.y], p, h, d }; },
    logisticEpoch(pts, w, a) { let g = [0, 0, 0]; pts.forEach(p => { const h = E.clf.sig(w[0] + w[1] * p.x + w[2] * p.y), e = p.c - h; g[0] += e; g[1] += e * p.x; g[2] += e * p.y; }); const n = pts.length; return [w[0] + a * g[0] / n, w[1] + a * g[1] / n, w[2] + a * g[2] / n]; },
    logLoss(pts, w) { return -pts.reduce((s, p) => { const h = Math.min(1 - 1e-9, Math.max(1e-9, E.clf.sig(w[0] + w[1] * p.x + w[2] * p.y))); return s + (p.c ? Math.log(h) : Math.log(1 - h)); }, 0) / pts.length; },
    errors(pts, f) { return pts.filter(p => f(p.x, p.y) !== p.c).length; },
    knn(pts, k, x, y, metric) { const d = pts.map(p => ({ p, d: metric === 'L1' ? Math.abs(p.x - x) + Math.abs(p.y - y) : Math.hypot(p.x - x, p.y - y) })).sort((a, b) => a.d - b.d).slice(0, k); const votes = {}; d.forEach(q => votes[q.p.c] = (votes[q.p.c] || 0) + 1); let best = null; for (const c in votes) if (best === null || votes[c] > votes[best] || (votes[c] === votes[best] && d.find(q => String(q.p.c) === c).d < d.find(q => String(q.p.c) === best).d)) best = c; return { c: +best, near: d }; }
  };

  /* polynomial least squares (ridge for stability) */
  E.polyfit = (xs, ys, deg, lambda) => {
    const n = deg + 1, A = Array.from({ length: n }, () => new Float64Array(n)), b = new Float64Array(n);
    xs.forEach((x, i) => { const p = []; for (let k = 0; k < n; k++) p.push(x ** k); for (let r = 0; r < n; r++) { b[r] += p[r] * ys[i]; for (let c = 0; c < n; c++) A[r][c] += p[r] * p[c]; } });
    for (let r = 0; r < n; r++) A[r][r] += (lambda || 1e-9);
    for (let c = 0; c < n; c++) { let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r; [A[c], A[piv]] = [A[piv], A[c]]; [b[c], b[piv]] = [b[piv], b[c]]; for (let r = c + 1; r < n; r++) { const f = A[r][c] / A[c][c]; for (let k = c; k < n; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; } }
    const w = new Float64Array(n); for (let r = n - 1; r >= 0; r--) { let s = b[r]; for (let k = r + 1; k < n; k++) s -= A[r][k] * w[k]; w[r] = s / A[r][r]; }
    return Array.from(w);
  };
  E.polyval = (w, x) => w.reduce((s, c, k) => s + c * x ** k, 0);

  /* ---------- AdaBoost with decision stumps on 2-D points, labels ±1 ---------- */
  E.adaboost = (pts, rounds) => {
    const n = pts.length; let w = Array(n).fill(1 / n); const H = []; const hist = [];
    const cands = []; ['x', 'y'].forEach(f => { const vs = [...new Set(pts.map(p => p[f]))].sort((a, b) => a - b); for (let i = 0; i <= vs.length; i++) { const t = i === 0 ? vs[0] - 0.05 : i === vs.length ? vs[vs.length - 1] + 0.05 : (vs[i - 1] + vs[i]) / 2; cands.push({ f, t, s: 1 }, { f, t, s: -1 }); } });
    const pred = (h, p) => (p[h.f] > h.t ? h.s : -h.s);
    for (let k = 0; k < rounds; k++) {
      let best = null, be = Infinity; for (const h of cands) { let e = 0; pts.forEach((p, i) => { if (pred(h, p) !== p.c) e += w[i]; }); if (e < be) { be = e; best = h; } }
      const eps = Math.max(1e-10, be); if (eps >= 0.5) break;
      const alpha = 0.5 * Math.log((1 - eps) / eps); const h = Object.assign({}, best, { alpha, eps });
      H.push(h); const before = w.slice();
      w = w.map((wi, i) => wi * Math.exp(-alpha * pts[i].c * pred(h, pts[i]))); const z = w.reduce((s, x) => s + x, 0); w = w.map(x => x / z);
      const F = p => H.reduce((s, hh) => s + hh.alpha * pred(hh, p), 0);
      hist.push({ H: H.slice(), w: w.slice(), before, h, trainErr: pts.filter(p => Math.sign(F(p)) !== p.c).length });
    }
    return { hist, pred, score: (Hs, p) => Hs.reduce((s, hh) => s + hh.alpha * pred(hh, p), 0) };
  };

  /* ---------- Bayesian learning: the candy bags ---------- */
  E.candy = { names: ['h1', 'h2', 'h3', 'h4', 'h5'], lime: [0, 0.25, 0.5, 0.75, 1], prior: [0.1, 0.2, 0.4, 0.2, 0.1],
    posterior(obs) { const like = E.candy.lime.map(q => obs.reduce((p, o) => p * (o === 'L' ? q : 1 - q), 1)); const u = like.map((l, i) => l * E.candy.prior[i]); const z = u.reduce((s, x) => s + x, 0); return u.map(x => z ? x / z : 0); },
    predictLime(obs) { const post = E.candy.posterior(obs); return post.reduce((s, p, i) => s + p * E.candy.lime[i], 0); } };

  /* ---------- naive Bayes for short texts (multinomial, Laplace smoothing) ---------- */
  E.nb = {
    tok: s => String(s).toLowerCase().match(/[a-z']+/g) || [],
    train(docs, k) { const m = { classes: {}, vocab: new Set(), k: k == null ? 1 : k }; docs.forEach(([c, t]) => { const cl = m.classes[c] = m.classes[c] || { docs: 0, words: 0, cnt: {} }; cl.docs++; E.nb.tok(t).forEach(w => { cl.cnt[w] = (cl.cnt[w] || 0) + 1; cl.words++; m.vocab.add(w); }); }); m.N = docs.length; return m; },
    pw(m, c, w) { const cl = m.classes[c]; return ((cl.cnt[w] || 0) + m.k) / (cl.words + m.k * m.vocab.size); },
    classify(m, text) { const ws = E.nb.tok(text); const out = Object.keys(m.classes).map(c => { const cl = m.classes[c]; let lp = Math.log(cl.docs / m.N); const terms = ws.map(w => { const p = E.nb.pw(m, c, w); lp += Math.log(p); return [w, p, !!cl.cnt[w], m.vocab.has(w)]; }); return { c, lp, terms }; }); const mx = Math.max(...out.map(o => o.lp)); const z = out.reduce((s, o) => s + Math.exp(o.lp - mx), 0); out.forEach(o => o.p = Math.exp(o.lp - mx) / z); return out.sort((a, b) => b.p - a.p); }
  };

  /* ---------- k-means and EM for a 2-D Gaussian mixture ---------- */
  E.kmeansStep = (pts, cents) => { const asg = pts.map(p => { let bi = 0, bd = Infinity; cents.forEach((c, i) => { const d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2; if (d < bd) { bd = d; bi = i; } }); return bi; }); const nc = cents.map((c, i) => { const m = pts.filter((p, j) => asg[j] === i); return m.length ? { x: m.reduce((s, p) => s + p.x, 0) / m.length, y: m.reduce((s, p) => s + p.y, 0) / m.length } : c; }); const sse = pts.reduce((s, p, j) => s + (p.x - cents[asg[j]].x) ** 2 + (p.y - cents[asg[j]].y) ** 2, 0); return { asg, cents: nc, sse }; };
  E.emStep = (pts, comps) => {
    const K = comps.length; const pdf = (p, c) => { const [a, b, d] = [c.sxx, c.sxy, c.syy]; const det = a * d - b * b; if (det <= 1e-12) return 0; const dx = p.x - c.mx, dy = p.y - c.my; const q = (d * dx * dx - 2 * b * dx * dy + a * dy * dy) / det; return Math.exp(-0.5 * q) / (2 * Math.PI * Math.sqrt(det)); };
    let ll = 0; const R = pts.map(p => { const u = comps.map(c => c.w * pdf(p, c)); const z = u.reduce((s, x) => s + x, 0) || 1e-300; ll += Math.log(z); return u.map(x => x / z); });
    const nc = comps.map((c, k) => { const Nk = R.reduce((s, r) => s + r[k], 0) || 1e-9; const mx = R.reduce((s, r, i) => s + r[k] * pts[i].x, 0) / Nk, my = R.reduce((s, r, i) => s + r[k] * pts[i].y, 0) / Nk; let sxx = 0, sxy = 0, syy = 0; R.forEach((r, i) => { const dx = pts[i].x - mx, dy = pts[i].y - my; sxx += r[k] * dx * dx; sxy += r[k] * dx * dy; syy += r[k] * dy * dy; }); return { w: Nk / pts.length, mx, my, sxx: sxx / Nk + 1e-4, sxy: sxy / Nk, syy: syy / Nk + 1e-4 }; });
    return { comps: nc, R, ll };
  };

  /* ---------- multilayer perceptron for 2-D binary classification ---------- */
  E.MLP = function (sizes, act, r) {
    const A = { tanh: [Math.tanh, y => 1 - y * y], relu: [x => x > 0 ? x : 0, y => y > 0 ? 1 : 0], sigmoid: [x => 1 / (1 + Math.exp(-x)), y => y * (1 - y)] }[act];
    const W = [], b = [];
    for (let l = 1; l < sizes.length; l++) { const s = Math.sqrt(2 / (sizes[l - 1] + sizes[l])); W.push(Array.from({ length: sizes[l] }, () => Array.from({ length: sizes[l - 1] }, () => (r() * 2 - 1) * s * 1.7))); b.push(Array(sizes[l]).fill(0)); }
    const fwd = x => { const as = [x]; for (let l = 0; l < W.length; l++) { const last = l === W.length - 1; const a = W[l].map((row, j) => { const z = row.reduce((s, w, i) => s + w * as[l][i], b[l][j]); return last ? 1 / (1 + Math.exp(-z)) : A[0](z); }); as.push(a); } return as; };
    this.W = W; this.b = b; this.sizes = sizes;
    this.predict = (x, y) => fwd([x, y])[W.length][0];
    this.train = (pts, lr, batch, l2) => {
      const gW = W.map(m => m.map(row => row.map(() => 0))), gb = b.map(v => v.map(() => 0)); let loss = 0;
      for (let k = 0; k < batch; k++) {
        const p = pts[(r() * pts.length) | 0]; const as = fwd([p.x, p.y]); const out = as[W.length][0];
        loss += -(p.c ? Math.log(out + 1e-9) : Math.log(1 - out + 1e-9));
        let delta = [out - p.c];
        for (let l = W.length - 1; l >= 0; l--) {
          for (let j = 0; j < W[l].length; j++) { gb[l][j] += delta[j]; for (let i = 0; i < W[l][j].length; i++) gW[l][j][i] += delta[j] * as[l][i]; }
          if (l > 0) { const nd = as[l].map((a, i) => W[l].reduce((s, row, j) => s + row[i] * delta[j], 0) * A[1](a)); delta = nd; }
        }
      }
      for (let l = 0; l < W.length; l++) for (let j = 0; j < W[l].length; j++) { b[l][j] -= lr * gb[l][j] / batch; for (let i = 0; i < W[l][j].length; i++) W[l][j][i] -= lr * (gW[l][j][i] / batch + (l2 || 0) * W[l][j][i]); }
      return loss / batch;
    };
    this.accuracy = pts => pts.filter(p => (this.predict(p.x, p.y) >= 0.5 ? 1 : 0) === p.c).length / pts.length;
  };

  /* ---------- version space (candidate elimination) over conjunctive hypotheses ---------- */
  E.versionSpace = (attrs, domains, examples) => {
    // hypothesis: array of values, '?' (any) or '∅' (none)
    const covers = (h, x) => h.every((v, i) => v === '?' || v === x[i]);
    const moreGeneral = (a, b) => a.every((v, i) => v === '?' || (v === b[i]) || b[i] === '∅');
    let S = [attrs.map(() => '∅')], Gs = [attrs.map(() => '?')]; const steps = [];
    examples.forEach(([x, pos]) => {
      if (pos) {
        Gs = Gs.filter(g => covers(g, x));
        S = S.map(s => s.map((v, i) => v === '∅' ? x[i] : v === x[i] ? v : '?')).filter(s => Gs.some(g => moreGeneral(g, s)));
      } else {
        S = S.filter(s => !covers(s, x));
        const ng = [];
        Gs.forEach(g => { if (!covers(g, x)) { ng.push(g); return; } g.forEach((v, i) => { if (v !== '?') return; domains[i].forEach(val => { if (val === x[i]) return; const h = g.slice(); h[i] = val; if (S.some(s => moreGeneral(h, s))) ng.push(h); }); }); });
        Gs = ng.filter((g, i) => !ng.some((h, j) => j !== i && moreGeneral(h, g) && !(moreGeneral(g, h) && j > i)));
      }
      steps.push({ x, pos, S: S.map(h => h.slice()), G: Gs.map(h => h.slice()) });
    });
    return steps;
  };

  /* ---------- support vector machine by simplified SMO (Platt 1998; the simplified variant of CS229 notes) ----------
     pts: [{x, y, c}] with c in {-1, +1}; kernel: 'linear' | 'poly2' | 'rbf'; returns decision function and support vectors */
  E.svm = (pts, kernel, C, gamma, r, maxPasses) => {
    const K = kernel === 'linear' ? (a, b) => a.x * b.x + a.y * b.y : kernel === 'poly2' ? (a, b) => (1 + (2 * a.x - 1) * (2 * b.x - 1) + (2 * a.y - 1) * (2 * b.y - 1)) ** 2 : (a, b) => Math.exp(-gamma * ((a.x - b.x) ** 2 + (a.y - b.y) ** 2));
    const n = pts.length, al = new Float64Array(n); let b = 0; const tol = 1e-4; let passes = 0, iters = 0; maxPasses = maxPasses || 20;
    const Kc = pts.map(a => pts.map(q => K(a, q)));
    const f = i => { let s = b; for (let k = 0; k < n; k++) if (al[k]) s += al[k] * pts[k].c * Kc[k][i]; return s; };
    while (passes < maxPasses && iters < 20000) {
      let changed = 0; iters++;
      for (let i = 0; i < n; i++) {
        const Ei = f(i) - pts[i].c, yi = pts[i].c;
        if ((yi * Ei < -tol && al[i] < C) || (yi * Ei > tol && al[i] > 0)) {
          let j = (r() * (n - 1)) | 0; if (j >= i) j++;
          const Ej = f(j) - pts[j].c, yj = pts[j].c, ai = al[i], aj = al[j];
          const L = yi !== yj ? Math.max(0, aj - ai) : Math.max(0, ai + aj - C), H = yi !== yj ? Math.min(C, C + aj - ai) : Math.min(C, ai + aj);
          if (H - L < 1e-12) continue;
          const eta = 2 * Kc[i][j] - Kc[i][i] - Kc[j][j]; if (eta >= 0) continue;
          let nj = aj - yj * (Ei - Ej) / eta; nj = Math.min(H, Math.max(L, nj)); if (Math.abs(nj - aj) < 1e-7) continue;
          const ni = ai + yi * yj * (aj - nj); al[i] = ni; al[j] = nj;
          const b1 = b - Ei - yi * (ni - ai) * Kc[i][i] - yj * (nj - aj) * Kc[i][j], b2 = b - Ej - yi * (ni - ai) * Kc[i][j] - yj * (nj - aj) * Kc[j][j];
          b = ni > 0 && ni < C ? b1 : nj > 0 && nj < C ? b2 : (b1 + b2) / 2; changed++;
        }
      }
      passes = changed ? 0 : passes + 1;
    }
    const sv = []; for (let i = 0; i < n; i++) if (al[i] > 1e-6) sv.push(i);
    const dec = (x, y) => { let s = b; const q = { x, y }; for (const k of sv) s += al[k] * pts[k].c * K(pts[k], q); return s; };
    let w = null; if (kernel === 'linear') { w = [0, 0]; sv.forEach(k => { w[0] += al[k] * pts[k].c * pts[k].x; w[1] += al[k] * pts[k].c * pts[k].y; }); }
    return { alpha: Array.from(al), b, sv, dec, w, iters };
  };
})(typeof window !== 'undefined' ? window : globalThis);
