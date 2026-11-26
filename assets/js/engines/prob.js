/* Probability engines (AIMA ch. 12–14): joint distributions, Bayesian networks (exact and approximate),
   d-separation, hidden Markov models, wumpus pit probabilities. */
(function (G) {
  'use strict';
  const E = G.AIE = G.AIE || {};

  /* ---------- the dentist example (full joint over Toothache, Catch, Cavity), values from the book ---------- */
  E.dentist = { vars: ['Toothache', 'Catch', 'Cavity'], // p[toothache][catch][cavity]
    p: { 'T,T,T': 0.108, 'T,T,F': 0.016, 'T,F,T': 0.012, 'T,F,F': 0.064, 'F,T,T': 0.072, 'F,T,F': 0.144, 'F,F,T': 0.008, 'F,F,F': 0.576 } };
  // query P(X | e) by enumerating the joint: returns {dist, terms, alpha}
  E.jointQuery = (J, X, ev) => {
    const keys = Object.keys(J.p); const match = (k, extra) => { const v = k.split(','); return J.vars.every((n, i) => { const want = n === X ? extra : ev[n]; return want === undefined || v[i] === want; }); };
    const sum = x => keys.filter(k => match(k, x)).reduce((s, k) => s + J.p[k], 0);
    const pt = sum('T'), pf = sum('F'), z = pt + pf;
    return { t: pt, f: pf, alpha: z ? 1 / z : 0, dist: z ? [pt / z, pf / z] : [0, 0], cells: { T: keys.filter(k => match(k, 'T')), F: keys.filter(k => match(k, 'F')) } };
  };

  /* ---------- Bayesian networks over Boolean variables ----------
     net: {nodes:[{n, par:[], cpt:{key:P(true)}}]} where key is parent values joined, e.g. 'T,F' ('' for roots). */
  E.nets = {
    burglary: { title: 'Burglary alarm', nodes: [
      { n: 'Burglary', par: [], cpt: { '': 0.001 }, xy: [0.2, 0.12] },
      { n: 'Earthquake', par: [], cpt: { '': 0.002 }, xy: [0.8, 0.12] },
      { n: 'Alarm', par: ['Burglary', 'Earthquake'], cpt: { 'T,T': 0.95, 'T,F': 0.94, 'F,T': 0.29, 'F,F': 0.001 }, xy: [0.5, 0.48] },
      { n: 'JohnCalls', par: ['Alarm'], cpt: { T: 0.90, F: 0.05 }, xy: [0.2, 0.86] },
      { n: 'MaryCalls', par: ['Alarm'], cpt: { T: 0.70, F: 0.01 }, xy: [0.8, 0.86] }] },
    sprinkler: { title: 'Wet grass', nodes: [
      { n: 'Cloudy', par: [], cpt: { '': 0.5 }, xy: [0.5, 0.12] },
      { n: 'Sprinkler', par: ['Cloudy'], cpt: { T: 0.10, F: 0.50 }, xy: [0.2, 0.48] },
      { n: 'Rain', par: ['Cloudy'], cpt: { T: 0.80, F: 0.20 }, xy: [0.8, 0.48] },
      { n: 'WetGrass', par: ['Sprinkler', 'Rain'], cpt: { 'T,T': 0.99, 'T,F': 0.90, 'F,T': 0.90, 'F,F': 0.00 }, xy: [0.5, 0.86] }] }
  };
  const node = (net, n) => net.nodes.find(x => x.n === n);
  const pTrue = (net, nd, a) => nd.cpt[nd.par.map(p => a[p] ? 'T' : 'F').join(',')];
  const pVal = (net, nd, v, a) => { const p = pTrue(net, nd, a); return v ? p : 1 - p; };
  E.bn = {
    pTrue, pVal,
    // ENUMERATION-ASK: returns P(X=true|e) and the number of multiplications/additions
    enumerate(net, X, ev) {
      const order = net.nodes.map(n => n.n); let mults = 0, adds = 0;
      const all = (vars, e) => {
        if (!vars.length) return 1;
        const [Y, ...rest] = vars, nd = node(net, Y);
        if (Y in e) { mults++; return pVal(net, nd, e[Y], e) * all(rest, e); }
        adds++; mults += 2;
        return pVal(net, nd, true, e) * all(rest, Object.assign({}, e, { [Y]: true })) + pVal(net, nd, false, e) * all(rest, Object.assign({}, e, { [Y]: false }));
      };
      const t = all(order, Object.assign({}, ev, { [X]: true })), f = all(order, Object.assign({}, ev, { [X]: false }));
      return { p: t / (t + f), t, f, mults, adds };
    },
    // variable elimination with a readable trace of factors
    eliminate(net, X, ev) {
      const fac = []; const steps = [];
      const name = f => 'f(' + f.vars.join(', ') + ')';
      net.nodes.forEach(nd => { const vars = [nd.n, ...nd.par].filter(v => !(v in ev)); const tab = new Map(); const asg = Object.assign({}, ev); const rec = k => { if (k === vars.length) { tab.set(vars.map(v => asg[v] ? 'T' : 'F').join(','), pVal(net, nd, asg[nd.n], asg)); return; } for (const b of [true, false]) { asg[vars[k]] = b; rec(k + 1); } }; rec(0); fac.push({ vars, tab, from: `P(${nd.n}${nd.par.length ? ' | ' + nd.par.join(', ') : ''})` }); });
      steps.push({ msg: `Make one factor per CPT, with the evidence ${Object.keys(ev).length ? Object.keys(ev).map(k => `${k} = ${ev[k]}`).join(', ') : '(none)'} plugged in.`, factors: fac.map(f => ({ name: name(f), from: f.from, size: f.tab.size })) });
      const hidden = net.nodes.map(n => n.n).filter(v => v !== X && !(v in ev)).reverse();
      let live = fac.slice();
      for (const h of hidden) {
        const use = live.filter(f => f.vars.includes(h)), keep = live.filter(f => !f.vars.includes(h));
        const vars = [...new Set(use.flatMap(f => f.vars))].filter(v => v !== h);
        const tab = new Map(); const asg = {};
        const rec = k => { if (k === vars.length) { let s = 0; for (const b of [true, false]) { asg[h] = b; let p = 1; use.forEach(f => { p *= f.tab.get(f.vars.map(v => asg[v] ? 'T' : 'F').join(',')); }); s += p; } tab.set(vars.map(v => asg[v] ? 'T' : 'F').join(','), s); return; } for (const b of [true, false]) { asg[vars[k]] = b; rec(k + 1); } };
        rec(0); const nf = { vars, tab, from: 'sum over ' + h };
        steps.push({ msg: `Eliminate <b>${h}</b>: multiply ${use.map(name).join(' × ')} and sum ${h} out, giving ${name(nf)} with ${tab.size} entr${tab.size === 1 ? 'y' : 'ies'}.`, factors: keep.concat(nf).map(f => ({ name: name(f), from: f.from, size: f.tab.size })) });
        live = keep.concat(nf);
      }
      let t = 1, f = 1; live.forEach(fc => { const kt = fc.vars.map(v => v === X ? 'T' : '').join(','), kf = fc.vars.map(v => v === X ? 'F' : '').join(','); if (fc.vars.length === 0) { const v = fc.tab.get(''); t *= v; f *= v; } else { t *= fc.tab.get(kt); f *= fc.tab.get(kf); } });
      steps.push({ msg: `Multiply what is left and normalise: P(${X} = true | e) = <b>${(t / (t + f)).toFixed(4)}</b>.`, factors: [] });
      return { p: t / (t + f), steps };
    },
    sampler(net, method, X, ev, r) {
      // returns a function that draws n more samples and reports the running estimate
      const order = net.nodes; let nT = 0, nAll = 0, wT = 0, wAll = 0, rejected = 0; let state = null, used = 0;
      const prior = () => { const a = {}; order.forEach(nd => { a[nd.n] = r() < pTrue(net, nd, a); }); return a; };
      const markov = (a, v) => { const nd = node(net, v); const ch = order.filter(c => c.par.includes(v)); const score = b => { const a2 = Object.assign({}, a, { [v]: b }); let p = pVal(net, nd, b, a2); ch.forEach(c => { p *= pVal(net, c, a2[c.n], a2); }); return p; }; const t = score(true), f = score(false); return t / (t + f); };
      return {
        draw(n) {
          for (let k = 0; k < n; k++) {
            used++;
            if (method === 'prior') { const a = prior(); nAll++; if (a[X]) nT++; }
            else if (method === 'rejection') { const a = prior(); if (Object.keys(ev).every(e => a[e] === ev[e])) { nAll++; if (a[X]) nT++; } else rejected++; }
            else if (method === 'lw') { const a = {}; let w = 1; order.forEach(nd => { if (nd.n in ev) { a[nd.n] = ev[nd.n]; w *= pVal(net, nd, ev[nd.n], a); } else a[nd.n] = r() < pTrue(net, nd, a); }); wAll += w; if (a[X]) wT += w; nAll++; }
            else if (method === 'gibbs') { if (!state) { state = {}; order.forEach(nd => state[nd.n] = nd.n in ev ? ev[nd.n] : r() < 0.5); } const hid = order.map(o => o.n).filter(v => !(v in ev)); const v = hid[(r() * hid.length) | 0]; state[v] = r() < markov(state, v); nAll++; if (state[X]) nT++; }
          }
          const est = method === 'lw' ? (wAll ? wT / wAll : NaN) : (nAll ? nT / nAll : NaN);
          return { est, kept: nAll, rejected, used };
        }
      };
    },
    // d-separation: list every undirected path between X and Y and say whether it is active given Z
    paths(net, X, Y, Z) {
      const par = {}, ch = {}; net.nodes.forEach(n => { par[n.n] = n.par.slice(); ch[n.n] = []; }); net.nodes.forEach(n => n.par.forEach(p => ch[p].push(n.n)));
      const desc = v => { const out = new Set(); const st = [v]; while (st.length) { const u = st.pop(); ch[u].forEach(c => { if (!out.has(c)) { out.add(c); st.push(c); } }); } return out; };
      const zs = new Set(Z); const res = [];
      const dfs = (path) => {
        const u = path[path.length - 1]; if (u === Y) { res.push(path.slice()); return; }
        for (const w of par[u].concat(ch[u])) if (!path.includes(w)) { path.push(w); dfs(path); path.pop(); }
      };
      dfs([X]);
      return res.map(p => {
        const triples = []; let active = true;
        for (let i = 1; i < p.length - 1; i++) {
          const a = p[i - 1], b = p[i], c = p[i + 1];
          const intoB = par[b].includes(a), outOfB = par[b].includes(c); // edge a→b ? edge c→b ?
          let kind, ok;
          if (intoB && outOfB) { kind = 'collider'; ok = zs.has(b) || [...desc(b)].some(d => zs.has(d)); }
          else if (!intoB && !outOfB) { kind = 'common cause'; ok = !zs.has(b); }
          else { kind = 'chain'; ok = !zs.has(b); }
          triples.push({ a, b, c, kind, ok }); if (!ok) active = false;
        }
        return { path: p, triples, active };
      });
    }
  };

  /* ---------- HMMs: T[i][j] = P(X_t = j | X_{t-1} = i), O[j][e] = P(E = e | X = j) ---------- */
  E.hmm = {
    umbrella: { states: ['Rain', 'No rain'], prior: [0.5, 0.5], T: [[0.7, 0.3], [0.3, 0.7]], O: [[0.9, 0.1], [0.2, 0.8]], evNames: ['Umbrella', 'No umbrella'] },
    forward(m, ev) { // ev: array of observation indices; returns filtered distributions f[0..t]
      const n = m.states.length; const f = [m.prior.slice()]; const pred = [null];
      ev.forEach((e, t) => { const prev = f[t]; const p = Array.from({ length: n }, (_, j) => prev.reduce((s, pi, i) => s + pi * m.T[i][j], 0)); const u = p.map((pj, j) => pj * m.O[j][e]); const z = u.reduce((s, x) => s + x, 0); pred.push(p); f.push(u.map(x => x / z)); });
      return { f, pred };
    },
    smooth(m, ev) {
      const n = m.states.length, t = ev.length; const { f } = E.hmm.forward(m, ev); const b = Array(t + 1); b[t] = Array(n).fill(1); const s = Array(t + 1);
      for (let k = t; k >= 1; k--) { b[k - 1] = Array.from({ length: n }, (_, i) => m.T[i].reduce((acc, tij, j) => acc + tij * m.O[j][ev[k - 1]] * b[k][j], 0)); }
      for (let k = 0; k <= t; k++) { const u = f[k].map((x, i) => x * b[k][i]); const z = u.reduce((a, x) => a + x, 0); s[k] = u.map(x => x / z); }
      return { f, b, s };
    },
    viterbi(m, ev) {
      const n = m.states.length; if (!ev.length) return { path: [], m: [] };
      const first = Array.from({ length: n }, (_, j) => m.prior.reduce((s, pi, i) => s + pi * m.T[i][j], 0) * m.O[j][ev[0]]);
      const M = [first], back = [null];
      for (let t = 1; t < ev.length; t++) { const prev = M[t - 1]; const row = [], bk = []; for (let j = 0; j < n; j++) { let best = -1, bi = 0; for (let i = 0; i < n; i++) { const v = prev[i] * m.T[i][j]; if (v > best) { best = v; bi = i; } } row.push(best * m.O[j][ev[t]]); bk.push(bi); } M.push(row); back.push(bk); }
      let last = 0; M[M.length - 1].forEach((v, i) => { if (v > M[M.length - 1][last]) last = i; }); const path = [last];
      for (let t = ev.length - 1; t > 0; t--) { last = back[t][last]; path.unshift(last); }
      return { path, m: M, back };
    }
  };

  /* ---------- wumpus pit probabilities (book, section 12.7): pits independent with prior p ---------- */
  E.wumpusPits = (N, known, p) => {
    // known: map "x,y" -> {breeze: bool} for visited squares (no pit there). Returns {prob:{"x,y": P(pit)}, frontier, models}
    const key = (x, y) => x + ',' + y; const nbrs = (x, y) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].filter(([a, b]) => a >= 1 && b >= 1 && a <= N && b <= N);
    const frontier = []; for (const k in known) { const [x, y] = k.split(',').map(Number); nbrs(x, y).forEach(([a, b]) => { const kk = key(a, b); if (!(kk in known) && !frontier.includes(kk)) frontier.push(kk); }); }
    frontier.sort();
    const models = []; let Z = 0; const acc = Object.fromEntries(frontier.map(f => [f, 0]));
    for (let m = 0; m < (1 << frontier.length); m++) {
      const pit = new Set(frontier.filter((f, i) => m & (1 << i)));
      const ok = Object.keys(known).every(k => { const [x, y] = k.split(',').map(Number); const has = nbrs(x, y).some(([a, b]) => pit.has(key(a, b))); return has === !!known[k].breeze; });
      if (!ok) continue;
      const w = frontier.reduce((s, f) => s * (pit.has(f) ? p : 1 - p), 1); Z += w; frontier.forEach(f => { if (pit.has(f)) acc[f] += w; }); models.push({ pits: [...pit], w });
    }
    const prob = {}; for (let x = 1; x <= N; x++) for (let y = 1; y <= N; y++) { const k = key(x, y); if (k in known) prob[k] = 0; else if (frontier.includes(k)) prob[k] = Z ? acc[k] / Z : NaN; else prob[k] = p; }
    return { prob, frontier, models, Z };
  };
})(typeof window !== 'undefined' ? window : globalThis);
