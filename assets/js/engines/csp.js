/* Constraint satisfaction engines (AIMA ch. 6): backtracking with MRV/degree/LCV, forward checking, MAC/AC-3, min-conflicts. */
(function (G) {
  'use strict';
  const E = G.AIE = G.AIE || {};
  // csp: {vars:[...], dom:{v:[...]}, nb:{v:[...]}, ok(A,a,B,b) -> bool}
  E.australia = () => {
    const vars = ['WA', 'NT', 'SA', 'Q', 'NSW', 'V', 'T'];
    const edges = [['SA', 'WA'], ['SA', 'NT'], ['SA', 'Q'], ['SA', 'NSW'], ['SA', 'V'], ['NT', 'WA'], ['NT', 'Q'], ['NSW', 'Q'], ['NSW', 'V']];
    return E.mapCSP(vars, edges, ['red', 'green', 'blue']);
  };
  E.mapCSP = (vars, edges, colours) => {
    const nb = {}; vars.forEach(v => nb[v] = []);
    edges.forEach(([a, b]) => { if (!nb[a].includes(b)) { nb[a].push(b); nb[b].push(a); } });
    const dom = {}; vars.forEach(v => dom[v] = colours.slice());
    return { vars, dom, nb, edges, ok: (A, a, B, b) => a !== b };
  };
  const copyDom = d => { const o = {}; for (const k in d) o[k] = d[k].slice(); return o; };

  E.backtrack = (csp, opts) => {
    opts = opts || {}; const varOrd = opts.varOrd || 'static', valOrd = opts.valOrd || 'static', inf = opts.inf || 'none', maxFrames = opts.maxFrames || 4000;
    const frames = []; let backtracks = 0, assigns = 0, checks = 0;
    const A = {}; let D = copyDom(csp.dom);
    const snap = (line, msg, ex) => { if (frames.length < maxFrames) frames.push(Object.assign({ line, msg, A: Object.assign({}, A), D: copyDom(D), backtracks, assigns }, ex || {})); };
    const consistent = (v, x) => csp.nb[v].every(n => A[n] === undefined || (checks++, csp.ok(v, x, n, A[n])));
    const selectVar = () => {
      const un = csp.vars.filter(v => A[v] === undefined);
      if (varOrd === 'static') return un[0];
      let best = un[0];
      const deg = v => csp.nb[v].filter(n => A[n] === undefined).length;
      for (const v of un) { const a = D[v].length, b = D[best].length; if (a < b || (a === b && varOrd === 'mrvdeg' && deg(v) > deg(best))) best = v; }
      return best;
    };
    const orderVals = v => {
      if (valOrd === 'static') return D[v].slice();
      const cost = x => csp.nb[v].filter(n => A[n] === undefined).reduce((s, n) => s + D[n].filter(y => !csp.ok(v, x, n, y)).length, 0);
      return D[v].slice().sort((x, y) => cost(x) - cost(y));
    };
    const ac3 = (queue) => { // returns false on wipe-out; records removals
      const removed = [];
      while (queue.length) {
        const [Xi, Xj] = queue.shift();
        const before = D[Xi].length;
        D[Xi] = D[Xi].filter(x => D[Xj].some(y => (checks++, csp.ok(Xi, x, Xj, y))));
        if (D[Xi].length < before) { removed.push(Xi); if (!D[Xi].length) return { ok: false, removed, empty: Xi }; csp.nb[Xi].forEach(Xk => { if (Xk !== Xj) queue.push([Xk, Xi]); }); }
      }
      return { ok: true, removed };
    };
    const infer = (v, x) => {
      if (inf === 'fc') {
        const changed = [];
        for (const n of csp.nb[v]) if (A[n] === undefined) { const b = D[n].length; D[n] = D[n].filter(y => (checks++, csp.ok(v, x, n, y))); if (D[n].length < b) changed.push(n); if (!D[n].length) return { ok: false, removed: changed, empty: n }; }
        return { ok: true, removed: changed };
      }
      if (inf === 'mac') return ac3(csp.nb[v].filter(n => A[n] === undefined).map(n => [n, v]));
      return { ok: true, removed: [] };
    };
    snap(1, 'Start with nothing assigned. Every variable has its full domain.');
    const rec = () => {
      if (csp.vars.every(v => A[v] !== undefined)) { snap(3, '<b>Every variable is assigned and every constraint holds.</b> Solution found.', { done: true }); return true; }
      const v = selectVar();
      snap(4, `Choose variable <b>${v}</b>${varOrd !== 'static' ? ` (MRV: ${D[v].length} value${D[v].length === 1 ? '' : 's'} left${varOrd === 'mrvdeg' ? ', ties broken by degree' : ''})` : ' (next in fixed order)'}.`, { cur: v });
      for (const x of orderVals(v)) {
        if (!consistent(v, x)) { snap(6, `${v} = ${x} conflicts with an assigned neighbour. Try the next value.`, { cur: v, tryv: x, bad: true }); continue; }
        const saved = copyDom(D); A[v] = x; D[v] = [x]; assigns++;
        snap(7, `Assign <b>${v} = ${x}</b>.`, { cur: v, tryv: x });
        const r = infer(v, x);
        if (inf !== 'none') snap(8, r.ok ? (r.removed.length ? `${inf === 'fc' ? 'Forward checking' : 'Arc consistency'} shrinks the domains of ${[...new Set(r.removed)].join(', ')}.` : 'Inference removes nothing.') : `${inf === 'fc' ? 'Forward checking' : 'Arc consistency'} empties the domain of <b>${r.empty}</b>: this assignment cannot work.`, { cur: v, shrunk: [...new Set(r.removed)], wipe: r.ok ? null : r.empty });
        if (r.ok && rec()) return true;
        delete A[v]; D = saved; backtracks++;
        snap(10, `Undo ${v} = ${x} and restore the domains (backtrack #${backtracks}).`, { cur: v, undo: true });
      }
      snap(11, `No value works for ${v}: return failure to the level above.`, { cur: v, fail: true });
      return false;
    };
    const ok = rec();
    if (!ok) snap(12, 'Search finished: no solution exists.', { done: true, failed: true });
    return { frames, ok, A: Object.assign({}, A), backtracks, assigns, checks, truncated: frames.length >= maxFrames };
  };

  /* AC-3 alone, with a frame per revision */
  E.ac3Trace = (csp, initDom) => {
    const D = copyDom(initDom || csp.dom), frames = []; let revisions = 0;
    const queue = []; csp.vars.forEach(a => csp.nb[a].forEach(b => queue.push([a, b])));
    frames.push({ line: 1, msg: `Put all ${queue.length} arcs into the queue.`, D: copyDom(D), q: queue.length });
    while (queue.length) {
      const [Xi, Xj] = queue.shift(); revisions++;
      const del = D[Xi].filter(x => !D[Xj].some(y => csp.ok(Xi, x, Xj, y)));
      if (del.length) {
        D[Xi] = D[Xi].filter(x => !del.includes(x));
        if (!D[Xi].length) { frames.push({ line: 6, msg: `Revise (${Xi}, ${Xj}): ${Xi} loses ${del.join(', ')} and is now empty. <b>Inconsistent.</b>`, D: copyDom(D), arc: [Xi, Xj], q: queue.length, fail: true }); return { frames, D, ok: false, revisions }; }
        const add = csp.nb[Xi].filter(k => k !== Xj).map(k => [k, Xi]); add.forEach(a => queue.push(a));
        frames.push({ line: 7, msg: `Revise (${Xi}, ${Xj}): remove ${del.join(', ')} from ${Xi}, because no value of ${Xj} supports ${del.length > 1 ? 'them' : 'it'}. Re-check ${add.length} arc${add.length === 1 ? '' : 's'} into ${Xi}.`, D: copyDom(D), arc: [Xi, Xj], q: queue.length, changed: Xi });
      } else if (revisions <= 400 || queue.length < 3) frames.push({ line: 4, msg: `Revise (${Xi}, ${Xj}): every value of ${Xi} has support in ${Xj}. Nothing changes.`, D: copyDom(D), arc: [Xi, Xj], q: queue.length });
    }
    frames.push({ line: 9, msg: `The queue is empty: every arc is consistent. ${revisions} revisions.`, D: copyDom(D), q: 0, done: true });
    return { frames, D, ok: true, revisions };
  };

  /* Sudoku as a CSP: cells r0c0..r8c8, digits 1..9 */
  E.sudoku = (grid) => {
    const vars = [], dom = {}, nb = {};
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) { const v = r * 9 + c; vars.push(v); const g = +grid[v]; dom[v] = g ? [g] : [1, 2, 3, 4, 5, 6, 7, 8, 9]; }
    vars.forEach(v => { const r = (v / 9) | 0, c = v % 9, s = new Set(); for (let k = 0; k < 9; k++) { s.add(r * 9 + k); s.add(k * 9 + c); } const br = r - r % 3, bc = c - c % 3; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) s.add((br + i) * 9 + bc + j); s.delete(v); nb[v] = [...s]; });
    return { vars, dom, nb, ok: (A, a, B, b) => a !== b };
  };

  /* min-conflicts for n-queens (vars = columns, value = row) */
  E.minConflicts = (n, r, maxSteps) => {
    const st = Array.from({ length: n }, () => (r() * n) | 0);
    // incremental counts
    const rows = new Int32Array(n), d1 = new Int32Array(2 * n), d2 = new Int32Array(2 * n);
    const add = (c, v, s) => { rows[v] += s; d1[c + v] += s; d2[c - v + n] += s; };
    st.forEach((v, c) => add(c, v, 1));
    const conf = (c, v) => rows[v] + d1[c + v] + d2[c - v + n] - (st[c] === v ? 3 : 0);
    const hist = [];
    for (let step = 0; step < maxSteps; step++) {
      const bad = []; for (let c = 0; c < n; c++) if (conf(c, st[c]) > 0) bad.push(c);
      if (step % Math.max(1, Math.floor(maxSteps / 400)) === 0 || !bad.length) hist.push(bad.length);
      if (!bad.length) return { st, steps: step, ok: true, hist };
      const c = bad[(r() * bad.length) | 0]; let best = Infinity, cand = [];
      for (let v = 0; v < n; v++) { const k = conf(c, v); if (k < best) { best = k; cand = [v]; } else if (k === best) cand.push(v); }
      const v = cand[(r() * cand.length) | 0]; add(c, st[c], -1); st[c] = v; add(c, v, 1);
    }
    return { st, steps: maxSteps, ok: false, hist };
  };
})(typeof window !== 'undefined' ? window : globalThis);
