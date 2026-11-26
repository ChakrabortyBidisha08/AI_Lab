/* Adversarial search engines (AIMA ch. 5): game trees, minimax, alpha-beta, expectiminimax, tic-tac-toe, Connect Four, MCTS. */
(function (G) {
  'use strict';
  const E = G.AIE = G.AIE || {};

  /* ---------- explicit game trees ---------- */
  // node: {id, type: 'max'|'min'|'chance'|'leaf', v (leaf), kids:[], p:[...] for chance, label}
  let uid = 0;
  const leaf = (v, label) => ({ id: uid++, type: 'leaf', v, kids: [], label });
  const inner = (type, kids, label, p) => ({ id: uid++, type, kids, label, p });
  E.tree = {
    book() { // the 2-ply tree used throughout Chapter 5
      uid = 0;
      const B = inner('min', [leaf(3, 'b1'), leaf(12, 'b2'), leaf(8, 'b3')], 'B'), C = inner('min', [leaf(2, 'c1'), leaf(4, 'c2'), leaf(6, 'c3')], 'C'), D = inner('min', [leaf(14, 'd1'), leaf(5, 'd2'), leaf(2, 'd3')], 'D');
      return inner('max', [B, C, D], 'A');
    },
    random(seed, depth, bmin, bmax, vmin, vmax, pattern) {
      uid = 0; const r = E.mulberry(seed); pattern = pattern || ['max', 'min'];
      const build = (d) => {
        if (d === depth) return leaf(vmin + Math.floor(r() * (vmax - vmin + 1)));
        const type = pattern[d % pattern.length], k = bmin + Math.floor(r() * (bmax - bmin + 1));
        const kids = Array.from({ length: type === 'chance' ? 2 : k }, () => build(d + 1));
        let p; if (type === 'chance') { const a = [0.5, 0.5, 0.25, 0.75, 0.75, 0.25, 0.4, 0.6, 0.6, 0.4][Math.floor(r() * 5) * 2]; p = [a, 1 - a]; }
        return inner(type, kids, null, p);
      };
      const t = build(0); label(t); return t;
    },
    leaves(t) { const out = []; const rec = n => { if (n.type === 'leaf') out.push(n); else n.kids.forEach(rec); }; rec(t); return out; },
    all(t) { const out = []; const rec = n => { out.push(n); n.kids.forEach(rec); }; rec(t); return out; },
    depth(t) { return t.type === 'leaf' ? 0 : 1 + Math.max(...t.kids.map(E.tree.depth)); }
  };
  function label(t) { const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; let i = 0; const q = [t]; while (q.length) { const n = q.shift(); if (n.type !== 'leaf') { n.label = i < 26 ? L[i] : 'N' + i; i++; } n.kids.forEach(k => q.push(k)); } }

  /* minimax / alpha-beta / expectiminimax with frames.
     frame: {line, msg, cur, vals:{id:v}, ab:{id:[a,b]}, pruned:[ids], visited:[ids], best:{id:childId}} */
  E.searchTree = (root, mode, order) => {
    const frames = [], vals = {}, ab = {}, pruned = new Set(), visited = new Set(), best = {};
    let leavesSeen = 0;
    const snap = (line, msg, cur, extra) => frames.push(Object.assign({ line, msg, cur, vals: Object.assign({}, vals), ab: JSON.parse(JSON.stringify(ab)), pruned: [...pruned], visited: [...visited], best: Object.assign({}, best), leavesSeen }, extra || {}));
    const fmt = v => v === Infinity ? '+∞' : v === -Infinity ? '−∞' : (Number.isInteger(v) ? String(v) : v.toFixed(2));
    const kidsOf = n => { if (!order || n.type === 'chance') return n.kids; const k = n.kids.slice(); const est = x => staticEst(x, n.type); k.sort((a, b) => n.type === 'max' ? est(b) - est(a) : est(a) - est(b)); return order === 'worst' ? k.reverse() : k; };
    const staticEst = (x) => { const L = E.tree.leaves(x); return L.reduce((s, l) => s + l.v, 0) / L.length; };
    const markPruned = n => { const rec = m => { if (!visited.has(m.id)) pruned.add(m.id); m.kids.forEach(rec); }; rec(n); };
    const name = n => n.label || (n.type === 'leaf' ? 'leaf' : 'node');
    const rec = (n, a, b) => {
      visited.add(n.id);
      if (n.type === 'leaf') { leavesSeen++; vals[n.id] = n.v; snap(2, `Reach a terminal state worth <b>${n.v}</b>.`, n.id); return n.v; }
      if (n.type === 'chance') {
        let v = 0; ab[n.id] = mode === 'ab' ? [a, b] : null; snap(9, `Chance node ${name(n)}: its value is the probability-weighted average of its children.`, n.id);
        n.kids.forEach((k, i) => { const kv = rec(k, -Infinity, Infinity); v += n.p[i] * kv; vals[n.id] = v; snap(10, `${name(n)} adds ${n.p[i]} × ${fmt(kv)}. Running total = ${fmt(v)}.`, n.id); });
        vals[n.id] = v; snap(11, `${name(n)} = <b>${fmt(v)}</b> (expected value).`, n.id); return v;
      }
      const isMax = n.type === 'max'; let v = isMax ? -Infinity : Infinity;
      vals[n.id] = v; if (mode === 'ab') ab[n.id] = [a, b];
      snap(isMax ? 3 : 6, `${isMax ? 'MAX' : 'MIN'} node <b>${name(n)}</b>: start with v = ${fmt(v)}${mode === 'ab' ? `, α = ${fmt(a)}, β = ${fmt(b)}` : ''}.`, n.id);
      const kids = kidsOf(n);
      for (let i = 0; i < kids.length; i++) {
        const k = kids[i]; const kv = rec(k, a, b);
        if (isMax ? kv > v : kv < v) { v = kv; best[n.id] = k.id; }
        vals[n.id] = v;
        if (mode === 'ab') { if (isMax) a = Math.max(a, v); else b = Math.min(b, v); ab[n.id] = [a, b]; }
        snap(isMax ? 4 : 7, `${name(n)} sees ${fmt(kv)}, so v = <b>${fmt(v)}</b>${mode === 'ab' ? `, α = ${fmt(a)}, β = ${fmt(b)}` : ''}.`, n.id);
        if (mode === 'ab' && (isMax ? v >= b : v <= a) && i < kids.length - 1) {
          kids.slice(i + 1).forEach(markPruned);
          snap(isMax ? 5 : 8, `<b>Prune.</b> At ${name(n)}, v = ${fmt(v)} ${isMax ? '≥ β' : '≤ α'} = ${fmt(isMax ? b : a)}. ${isMax ? 'MIN above will never let play reach here' : 'MAX above already has a better option'}, so the remaining ${kids.length - 1 - i} ${kids.length - 1 - i === 1 ? 'child is' : 'children are'} never examined.`, n.id, { cut: n.id });
          return v;
        }
      }
      return v;
    };
    snap(1, 'Start at the root.', root.id);
    const v = rec(root, -Infinity, Infinity);
    snap(12, `Done. The root’s value is <b>${fmt(v)}</b>. ${mode === 'ab' ? `Alpha–beta looked at ${leavesSeen} of ${E.tree.leaves(root).length} leaves.` : `Minimax looked at all ${leavesSeen} leaves.`}`, root.id, { done: true, value: v });
    return { frames, value: v, leavesSeen, pruned: [...pruned], best };
  };

  /* ---------- tic-tac-toe ---------- */
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const T = E.ttt = {
    LINES,
    winner(b) { for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a]; return b.every(Boolean) ? 'draw' : null; },
    winLine(b) { for (const L of LINES) if (b[L[0]] && b[L[0]] === b[L[1]] && b[L[0]] === b[L[2]]) return L; return null; },
    toMove(b) { const x = b.filter(c => c === 'X').length, o = b.filter(c => c === 'O').length; return x === o ? 'X' : 'O'; },
    memo: new Map(),
    // value from X's point of view (+1 X wins, -1 O wins, 0 draw) with perfect play
    value(b) {
      const key = b.map(c => c || '.').join(''); if (T.memo.has(key)) return T.memo.get(key);
      const w = T.winner(b); let v;
      if (w === 'X') v = 1; else if (w === 'O') v = -1; else if (w === 'draw') v = 0;
      else { const p = T.toMove(b); const vs = []; for (let i = 0; i < 9; i++) if (!b[i]) { b[i] = p; vs.push(T.value(b)); b[i] = null; } v = p === 'X' ? Math.max(...vs) : Math.min(...vs); }
      T.memo.set(key, v); return v;
    },
    moveValues(b) { const p = T.toMove(b), out = []; for (let i = 0; i < 9; i++) if (!b[i]) { b[i] = p; out.push([i, T.value(b)]); b[i] = null; } return out; },
    // count nodes visited by plain minimax and by alpha-beta from this position (no memo)
    count(b, ab) {
      let n = 0;
      const rec = (alpha, beta) => {
        n++; const w = T.winner(b); if (w) return w === 'X' ? 1 : w === 'O' ? -1 : 0;
        const p = T.toMove(b); let v = p === 'X' ? -Infinity : Infinity;
        for (let i = 0; i < 9; i++) if (!b[i]) {
          b[i] = p; const c = rec(alpha, beta); b[i] = null;
          if (p === 'X') { v = Math.max(v, c); if (ab) { alpha = Math.max(alpha, v); if (v >= beta) return v; } }
          else { v = Math.min(v, c); if (ab) { beta = Math.min(beta, v); if (v <= alpha) return v; } }
        }
        return v;
      };
      rec(-Infinity, Infinity); return n;
    },
    mcts(b, iters, r, C) {
      C = C == null ? Math.SQRT2 : C; r = r || Math.random;
      const me = T.toMove(b);
      const root = { b: b.slice(), p: null, kids: [], untried: b.map((c, i) => c ? -1 : i).filter(i => i >= 0), n: 0, w: 0, mv: -1, who: null };
      for (let it = 0; it < iters; it++) {
        let node = root; const bb = root.b.slice();
        while (!node.untried.length && node.kids.length) { // select by UCB1
          const lnN = Math.log(node.n); let best = null, bs = -Infinity;
          for (const k of node.kids) { const s = k.w / k.n + C * Math.sqrt(lnN / k.n); if (s > bs) { bs = s; best = k; } }
          node = best; bb[node.mv] = node.who;
        }
        if (node.untried.length && !T.winner(bb)) { // expand
          const i = (r() * node.untried.length) | 0, mv = node.untried.splice(i, 1)[0]; const who = T.toMove(bb); bb[mv] = who;
          const k = { p: node, kids: [], untried: T.winner(bb) ? [] : bb.map((c, j) => c ? -1 : j).filter(j => j >= 0), n: 0, w: 0, mv, who }; node.kids.push(k); node = k;
        }
        let w = T.winner(bb); while (!w) { const free = bb.map((c, j) => c ? -1 : j).filter(j => j >= 0); bb[free[(r() * free.length) | 0]] = T.toMove(bb); w = T.winner(bb); } // playout
        while (node) { node.n++; if (node.who) node.w += w === 'draw' ? 0.5 : (w === node.who ? 1 : 0); node = node.p; } // back-propagate
      }
      return { stats: root.kids.map(k => ({ mv: k.mv, n: k.n, w: k.w, rate: k.w / k.n })).sort((a, b) => b.n - a.n), me };
    }
  };

  /* ---------- Connect Four: 7 columns x 6 rows, board[c*6+r], r=0 is the bottom ---------- */
  const C4 = E.c4 = {
    W: 7, H: 6,
    empty() { return new Int8Array(42); },
    height(b, c) { let r = 0; while (r < 6 && b[c * 6 + r]) r++; return r; },
    legal(b) { const m = []; for (const c of [3, 2, 4, 1, 5, 0, 6]) if (C4.height(b, c) < 6) m.push(c); return m; },
    play(b, c, p) { const r = C4.height(b, c); b[c * 6 + r] = p; return r; },
    undo(b, c) { const r = C4.height(b, c) - 1; b[c * 6 + r] = 0; },
    winAt(b, c, r) { const p = b[c * 6 + r]; if (!p) return false; for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [1, -1]]) { let n = 1; for (const s of [1, -1]) { let cc = c + dc * s, rr = r + dr * s; while (cc >= 0 && cc < 7 && rr >= 0 && rr < 6 && b[cc * 6 + rr] === p) { n++; cc += dc * s; rr += dr * s; } } if (n >= 4) return true; } return false; },
    winner(b) { for (let c = 0; c < 7; c++) for (let r = 0; r < 6; r++) if (b[c * 6 + r] && C4.winAt(b, c, r)) return b[c * 6 + r]; return 0; },
    full(b) { for (let c = 0; c < 7; c++) if (C4.height(b, c) < 6) return false; return true; },
    // heuristic evaluation from player 1's view: score every window of four
    evaluate(b) {
      let s = 0; const win = (cells) => { let a = 0, o = 0; for (const [c, r] of cells) { const v = b[c * 6 + r]; if (v === 1) a++; else if (v === 2) o++; } if (a && o) return 0; if (a === 3) return 50; if (a === 2) return 10; if (a === 1) return 1; if (o === 3) return -50; if (o === 2) return -10; if (o === 1) return -1; return 0; };
      for (let c = 0; c < 7; c++) for (let r = 0; r < 6; r++) for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [1, -1]]) { const ec = c + 3 * dc, er = r + 3 * dr; if (ec < 0 || ec > 6 || er < 0 || er > 5) continue; s += win([0, 1, 2, 3].map(k => [c + k * dc, r + k * dr])); }
      for (let r = 0; r < 6; r++) { if (b[18 + r] === 1) s += 4; else if (b[18 + r] === 2) s -= 4; }
      return s;
    },
    // alpha-beta from the viewpoint of player `me` (1 or 2); returns {move, value, nodes, scores}
    search(b, me, depth) {
      let nodes = 0; const opp = 3 - me;
      const ab = (d, alpha, beta, turn, lastC, lastR) => {
        nodes++;
        if (lastC >= 0 && C4.winAt(b, lastC, lastR)) return (b[lastC * 6 + lastR] === me ? 1 : -1) * (100000 + d);
        if (C4.full(b)) return 0;
        if (d === 0) return (me === 1 ? 1 : -1) * C4.evaluate(b);
        const moves = C4.legal(b);
        if (turn === me) { let v = -Infinity; for (const c of moves) { const r = C4.play(b, c, me); v = Math.max(v, ab(d - 1, alpha, beta, opp, c, r)); C4.undo(b, c); alpha = Math.max(alpha, v); if (alpha >= beta) break; } return v; }
        let v = Infinity; for (const c of moves) { const r = C4.play(b, c, opp); v = Math.min(v, ab(d - 1, alpha, beta, me, c, r)); C4.undo(b, c); beta = Math.min(beta, v); if (alpha >= beta) break; } return v;
      };
      const scores = {}; let bestC = -1, bestV = -Infinity;
      for (const c of C4.legal(b)) { const r = C4.play(b, c, me); const v = ab(depth - 1, -Infinity, Infinity, opp, c, r); C4.undo(b, c); scores[c] = v; if (v > bestV) { bestV = v; bestC = c; } }
      return { move: bestC, value: bestV, nodes, scores };
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
