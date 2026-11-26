/* Logic engines (AIMA ch. 7–9): propositional parser, model checking, CNF, resolution, DPLL, WalkSAT,
   Horn-clause chaining, unification and first-order forward/backward chaining. */
(function (G) {
  'use strict';
  const E = G.AIE = G.AIE || {};
  const L = E.logic = {};

  /* ---------- propositional parser ----------
     Accepts ¬ ~ ! not | ∧ & ^ and | ∨ | or | ⇒ => -> | ⇔ <=> <-> | True False. Precedence: ¬ ∧ ∨ ⇒ ⇔ (⇒ right-associative). */
  L.tokenize = s => {
    const out = []; let i = 0; s = String(s);
    const W = { not: '¬', and: '∧', or: '∨', implies: '⇒', iff: '⇔', true: 'T', false: 'F' };
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      const two = s.slice(i, i + 3);
      if (two === '<=>' || two === '<->') { out.push('⇔'); i += 3; continue; }
      if (s.slice(i, i + 2) === '=>' || s.slice(i, i + 2) === '->') { out.push('⇒'); i += 2; continue; }
      if ('¬~!'.includes(c)) { out.push('¬'); i++; continue; }
      if ('∧&^'.includes(c)) { out.push('∧'); i++; continue; }
      if ('∨|'.includes(c)) { out.push('∨'); i++; continue; }
      if (c === '⇒' || c === '→') { out.push('⇒'); i++; continue; }
      if (c === '⇔' || c === '↔') { out.push('⇔'); i++; continue; }
      if (c === '(' || c === ')') { out.push(c); i++; continue; }
      if (c === '⊤') { out.push('T'); i++; continue; }
      if (c === '⊥') { out.push('F'); i++; continue; }
      const m = s.slice(i).match(/^[A-Za-z_][A-Za-z0-9_,]*/);
      if (m) { const w = m[0].toLowerCase(); out.push(W[w] || ('$' + m[0])); i += m[0].length; continue; }
      throw new Error(`Unexpected character “${c}”`);
    }
    return out;
  };
  L.parse = s => {
    const t = L.tokenize(s); let i = 0;
    const peek = () => t[i], eat = x => { if (t[i] !== x) throw new Error(`Expected “${x}”${t[i] ? ` but found “${t[i].replace('$', '')}”` : ' at the end'}`); i++; };
    const prim = () => {
      const k = t[i];
      if (k === undefined) throw new Error('The sentence ends too early');
      if (k === '¬') { i++; return { t: 'not', a: prim() }; }
      if (k === '(') { i++; const e = iff(); eat(')'); return e; }
      if (k === 'T' || k === 'F') { i++; return { t: 'const', v: k === 'T' }; }
      if (k[0] === '$') { i++; return { t: 'sym', n: k.slice(1) }; }
      throw new Error(`Unexpected “${k}”`);
    };
    const and = () => { let a = prim(); while (peek() === '∧') { i++; a = { t: 'and', a, b: prim() }; } return a; };
    const or = () => { let a = and(); while (peek() === '∨') { i++; a = { t: 'or', a, b: and() }; } return a; };
    const imp = () => { const a = or(); if (peek() === '⇒') { i++; return { t: 'imp', a, b: imp() }; } return a; };
    const iff = () => { let a = imp(); while (peek() === '⇔') { i++; a = { t: 'iff', a, b: imp() }; } return a; };
    const e = iff(); if (i < t.length) throw new Error(`Unexpected “${t[i].replace('$', '')}”`); return e;
  };
  const PREC = { iff: 1, imp: 2, or: 3, and: 4, not: 5, sym: 6, const: 6 };
  const SYM = { and: ' ∧ ', or: ' ∨ ', imp: ' ⇒ ', iff: ' ⇔ ' };
  // Printing keeps brackets whenever operators mix, so students never have to recall precedence.
  L.str = (e, parent) => {
    if (e.t === 'sym') return e.n;
    if (e.t === 'const') return e.v ? 'True' : 'False';
    if (e.t === 'not') return '¬' + L.str(e.a, 'not');
    const s = L.str(e.a, e.t) + SYM[e.t] + L.str(e.b, e.t);
    const need = parent && (parent === 'not' || parent !== e.t || e.t === 'imp' || e.t === 'iff');
    return need ? '(' + s + ')' : s;
  };
  void PREC;
  L.symbols = (e, set) => { set = set || new Set(); if (e.t === 'sym') set.add(e.n); else if (e.a) { L.symbols(e.a, set); if (e.b) L.symbols(e.b, set); } return set; };
  L.ev = (e, m) => { switch (e.t) { case 'sym': return !!m[e.n]; case 'const': return e.v; case 'not': return !L.ev(e.a, m); case 'and': return L.ev(e.a, m) && L.ev(e.b, m); case 'or': return L.ev(e.a, m) || L.ev(e.b, m); case 'imp': return !L.ev(e.a, m) || L.ev(e.b, m); case 'iff': return L.ev(e.a, m) === L.ev(e.b, m); } };
  L.models = syms => { const out = [], n = syms.length; for (let k = 0; k < (1 << n); k++) { const m = {}; syms.forEach((s, i) => m[s] = !!(k & (1 << (n - 1 - i)))); out.push(m); } return out; };
  // TT-ENTAILS: KB ⊨ α iff α is true in every model where KB is true
  L.entails = (kb, alpha) => { const syms = [...new Set([...L.symbols(kb), ...L.symbols(alpha)])].sort(); let kbModels = 0, counter = null; for (const m of L.models(syms)) { if (L.ev(kb, m)) { kbModels++; if (!L.ev(alpha, m) && !counter) counter = m; } } return { entails: !counter, counter, kbModels, total: 1 << syms.length, syms }; };
  L.conj = list => list.reduce((a, b) => a ? { t: 'and', a, b } : b, null);

  /* ---------- CNF with recorded steps ---------- */
  const elimIff = e => e.t === 'iff' ? { t: 'and', a: { t: 'imp', a: elimIff(e.a), b: elimIff(e.b) }, b: { t: 'imp', a: elimIff(e.b), b: elimIff(e.a) } } : e.a ? Object.assign({}, e, { a: elimIff(e.a), b: e.b && elimIff(e.b) }) : e;
  const elimImp = e => e.t === 'imp' ? { t: 'or', a: { t: 'not', a: elimImp(e.a) }, b: elimImp(e.b) } : e.a ? Object.assign({}, e, { a: elimImp(e.a), b: e.b && elimImp(e.b) }) : e;
  const pushNot = e => {
    if (e.t === 'not') { const a = e.a; if (a.t === 'not') return pushNot(a.a); if (a.t === 'and') return { t: 'or', a: pushNot({ t: 'not', a: a.a }), b: pushNot({ t: 'not', a: a.b }) }; if (a.t === 'or') return { t: 'and', a: pushNot({ t: 'not', a: a.a }), b: pushNot({ t: 'not', a: a.b }) }; if (a.t === 'const') return { t: 'const', v: !a.v }; return e; }
    return e.a ? Object.assign({}, e, { a: pushNot(e.a), b: e.b && pushNot(e.b) }) : e;
  };
  const dist = e => {
    if (e.t === 'and') return { t: 'and', a: dist(e.a), b: dist(e.b) };
    if (e.t === 'or') { const a = dist(e.a), b = dist(e.b); if (a.t === 'and') return dist({ t: 'and', a: { t: 'or', a: a.a, b }, b: { t: 'or', a: a.b, b } }); if (b.t === 'and') return dist({ t: 'and', a: { t: 'or', a, b: b.a }, b: { t: 'or', a, b: b.b } }); return { t: 'or', a, b }; }
    return e;
  };
  L.cnfSteps = e => { const s1 = elimIff(e), s2 = elimImp(s1), s3 = pushNot(s2), s4 = dist(s3); return [['Original', e], ['Eliminate ⇔: α ⇔ β becomes (α ⇒ β) ∧ (β ⇒ α)', s1], ['Eliminate ⇒: α ⇒ β becomes ¬α ∨ β', s2], ['Move ¬ inwards (De Morgan, double negation)', s3], ['Distribute ∨ over ∧', s4]]; };
  const lit = e => e.t === 'sym' ? e.n : e.t === 'not' && e.a.t === 'sym' ? '¬' + e.a.n : e.t === 'const' ? (e.v ? 'True' : 'False') : null;
  L.clauses = e => {
    const c = dist(pushNot(elimImp(elimIff(e)))); const conj = [], gather = (x, arr, op) => { if (x.t === op) { gather(x.a, arr, op); gather(x.b, arr, op); } else arr.push(x); };
    gather(c, conj, 'and'); const out = [];
    for (const d of conj) { const ds = []; gather(d, ds, 'or'); let lits = ds.map(lit); if (lits.includes('True')) continue; lits = lits.filter(x => x !== 'False'); const set = [...new Set(lits)].sort(cmpLit); if (set.some(l => set.includes(neg(l)))) continue; out.push(set); }
    const seen = new Set(); return out.filter(cl => { const k = cl.join('|'); if (seen.has(k)) return false; seen.add(k); return true; });
  };
  const neg = l => l[0] === '¬' ? l.slice(1) : '¬' + l;
  const cmpLit = (a, b) => { const x = a.replace('¬', ''), y = b.replace('¬', ''); return x < y ? -1 : x > y ? 1 : a.length - b.length; };
  L.neg = neg;
  L.clauseStr = c => c.length ? c.join(' ∨ ') : '□ (empty clause)';

  /* ---------- PL-RESOLUTION with proof extraction ---------- */
  L.resolution = (kbClauses, alphaNegClauses, limit) => {
    limit = limit || 1500;
    const all = []; const key = c => c.join('|'); const idx = new Map();
    const add = (c, from, parents) => { const k = key(c); if (idx.has(k)) return -1; idx.set(k, all.length); all.push({ c, from, parents }); return all.length - 1; };
    kbClauses.forEach(c => add(c, 'KB')); alphaNegClauses.forEach(c => add(c, '¬α'));
    const steps = []; const tried = new Set();
    for (let round = 0; round < 50; round++) {
      const n = all.length; let added = 0;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const pk = i + ',' + j; if (tried.has(pk)) continue; tried.add(pk);
        const ci = all[i].c, cj = all[j].c;
        for (const l of ci) if (cj.includes(neg(l))) {
          const r = [...new Set(ci.filter(x => x !== l).concat(cj.filter(x => x !== neg(l))))].sort(cmpLit);
          if (r.some(x => r.includes(neg(x)))) continue;
          const id = add(r, 'resolvent', [i, j]);
          if (id >= 0) { added++; steps.push({ id, i, j, on: l.replace('¬', '') }); if (!r.length) return { proved: true, all, steps, proof: extract(all, id) }; if (all.length > limit) return { proved: null, all, steps, gaveUp: true }; }
        }
      }
      if (!added) return { proved: false, all, steps };
    }
    return { proved: null, all, steps, gaveUp: true };
  };
  function extract(all, id) { const keep = new Set(); const rec = k => { if (keep.has(k)) return; keep.add(k); const p = all[k].parents; if (p) { rec(p[0]); rec(p[1]); } }; rec(id); return [...keep].sort((a, b) => a - b); }

  /* ---------- DPLL with frames ---------- */
  L.dpll = (clauses, opts) => {
    opts = opts || {}; const frames = []; let calls = 0; const maxF = opts.maxFrames || 1500;
    const symbols = [...new Set(clauses.flat().map(l => l.replace('¬', '')))].sort();
    const val = (l, m) => { const s = l.replace('¬', ''); if (!(s in m)) return undefined; return l[0] === '¬' ? !m[s] : m[s]; };
    const snap = (line, msg, m, ex) => { if (frames.length < maxF) frames.push(Object.assign({ line, msg, m: Object.assign({}, m), calls }, ex || {})); };
    const rec = (syms, m, depth) => {
      calls++;
      let allTrue = true;
      for (const c of clauses) { const vs = c.map(l => val(l, m)); if (vs.some(v => v === true)) continue; if (vs.every(v => v === false)) { snap(3, `Clause (${L.clauseStr(c)}) is false under this partial model: backtrack.`, m, { depth, bad: c }); return null; } allTrue = false; }
      if (allTrue) { snap(2, 'Every clause is already true: <b>satisfiable</b>.', m, { depth, sat: true }); return m; }
      if (opts.pure !== false) {
        for (const s of syms) { let pos = false, ng = false; for (const c of clauses) { if (c.some(l => val(l, m) === true)) continue; if (c.includes(s)) pos = true; if (c.includes('¬' + s)) ng = true; } if (pos !== ng) { const m2 = Object.assign({}, m, { [s]: pos }); snap(4, `Pure symbol: <b>${s}</b> appears only ${pos ? 'positively' : 'negatively'} in the remaining clauses, so set ${s} = ${pos}.`, m2, { depth, set: s }); return rec(syms.filter(x => x !== s), m2, depth + 1); } }
      }
      if (opts.unit !== false) {
        for (const c of clauses) { const open = c.filter(l => val(l, m) === undefined); if (open.length === 1 && c.every(l => val(l, m) !== true)) { const l = open[0], s = l.replace('¬', ''), v = l[0] !== '¬'; const m2 = Object.assign({}, m, { [s]: v }); snap(5, `Unit clause (${L.clauseStr(c)}): only ${l} can make it true, so set ${s} = ${v}.`, m2, { depth, set: s }); return rec(syms.filter(x => x !== s), m2, depth + 1); } }
      }
      const s = syms[0];
      const mT = Object.assign({}, m, { [s]: true }); snap(6, `Branch: try <b>${s} = true</b>.`, mT, { depth, set: s, branch: true });
      const r = rec(syms.slice(1), mT, depth + 1); if (r) return r;
      const mF = Object.assign({}, m, { [s]: false }); snap(7, `${s} = true failed. Try <b>${s} = false</b>.`, mF, { depth, set: s, branch: true });
      return rec(syms.slice(1), mF, depth + 1);
    };
    snap(1, `Start with ${clauses.length} clauses over ${symbols.length} symbols and an empty model.`, {});
    const m = rec(symbols, {}, 0);
    if (!m) snap(8, 'Every branch failed: <b>unsatisfiable</b>.', {}, { unsat: true });
    return { frames, model: m, calls, symbols };
  };
  L.walksat = (clauses, p, maxFlips, r) => {
    const symbols = [...new Set(clauses.flat().map(l => l.replace('¬', '')))];
    const m = {}; symbols.forEach(s => m[s] = r() < 0.5);
    const sat = c => c.some(l => l[0] === '¬' ? !m[l.slice(1)] : m[l]);
    for (let f = 0; f < maxFlips; f++) {
      const bad = clauses.filter(c => !sat(c)); if (!bad.length) return { model: m, flips: f };
      const c = bad[(r() * bad.length) | 0]; let s;
      if (r() < p) s = c[(r() * c.length) | 0].replace('¬', '');
      else { let best = Infinity; for (const l of c) { const x = l.replace('¬', ''); m[x] = !m[x]; const k = clauses.filter(cc => !sat(cc)).length; m[x] = !m[x]; if (k < best) { best = k; s = x; } } }
      m[s] = !m[s];
    }
    return { model: null, flips: maxFlips };
  };
  L.random3SAT = (n, m, r) => Array.from({ length: m }, () => { const vs = new Set(); while (vs.size < 3) vs.add(1 + ((r() * n) | 0)); return [...vs].map(v => (r() < 0.5 ? '¬' : '') + 'x' + v); });
  L.dpllFast = (clauses) => { // compact DPLL with unit propagation; returns {sat, calls}
    let calls = 0; const syms = [...new Set(clauses.flat().map(l => l.replace('¬', '')))];
    const rec = (cls, m) => { calls++; if (calls > 200000) return null;
      for (;;) { let unit = null; const next = []; for (const c of cls) { let sat = false; const rest = []; for (const l of c) { const s = l.replace('¬', ''); if (s in m) { if ((l[0] !== '¬') === m[s]) { sat = true; break; } } else rest.push(l); } if (sat) continue; if (!rest.length) return false; if (rest.length === 1 && !unit) unit = rest[0]; next.push(rest); } if (!next.length) return true; cls = next; if (!unit) break; m[unit.replace('¬', '')] = unit[0] !== '¬'; }
      const s = cls[0][0].replace('¬', ''); return rec(cls, Object.assign({}, m, { [s]: true })) || rec(cls, Object.assign({}, m, { [s]: false })); };
    const sat = rec(clauses, {}); void syms; return { sat, calls };
  };

  /* ---------- Horn clauses: forward and backward chaining ---------- */
  L.parseHorn = text => text.split(/\n|;/).map(s => s.trim()).filter(Boolean).map(s => {
    const m = s.split(/⇒|=>|->/); if (m.length === 1) return { prem: [], concl: m[0].trim() };
    return { prem: m[0].split(/∧|&|\^|,/).map(x => x.trim()).filter(Boolean), concl: m[1].trim() };
  });
  L.hornStr = c => c.prem.length ? c.prem.join(' ∧ ') + ' ⇒ ' + c.concl : c.concl;
  L.forwardChain = (kb, q) => {
    const count = kb.map(c => c.prem.length), inferred = {}, agenda = kb.filter(c => !c.prem.length).map(c => c.concl), frames = [];
    const snap = (line, msg, ex) => frames.push(Object.assign({ line, msg, count: count.slice(), inferred: Object.assign({}, inferred), agenda: agenda.slice() }, ex || {}));
    snap(1, `The agenda starts with the known facts: ${agenda.join(', ') || 'none'}.`);
    while (agenda.length) {
      const p = agenda.shift();
      if (p === q) { snap(4, `Pop <b>${p}</b>: it is the query. <b>${q} is entailed.</b>`, { p, done: true, ok: true }); return { frames, ok: true }; }
      if (inferred[p]) { snap(5, `Pop ${p}: already inferred, skip.`, { p }); continue; }
      inferred[p] = true; const fired = [];
      kb.forEach((c, i) => { if (c.prem.includes(p)) { count[i]--; if (count[i] === 0) { agenda.push(c.concl); fired.push(i); } } });
      snap(7, `Pop <b>${p}</b> and mark it true. Decrease the count of every rule with ${p} in its premise.` + (fired.length ? ` ${fired.map(i => `Rule “${L.hornStr(kb[i])}” now has count 0, so add <b>${kb[i].concl}</b> to the agenda.`).join(' ')}` : ''), { p, fired });
    }
    snap(9, `The agenda is empty. <b>${q} is not entailed.</b>`, { done: true, ok: false });
    return { frames, ok: false };
  };
  L.backwardChain = (kb, q) => {
    const frames = [], proved = {}, nodes = []; // nodes: {id, goal, parent, status, rule}
    const snap = (line, msg, ex) => frames.push(Object.assign({ line, msg, nodes: nodes.map(n => Object.assign({}, n)) }, ex || {}));
    const prove = (goal, stack, parent) => {
      const node = { id: nodes.length, goal, parent, status: 'open' }; nodes.push(node);
      if (proved[goal]) { node.status = 'yes'; node.note = 'already proved'; snap(2, `${goal} was proved earlier.`, { cur: node.id }); return true; }
      if (stack.includes(goal)) { node.status = 'loop'; snap(3, `${goal} is already being proved further up: following it again would loop. This branch fails.`, { cur: node.id }); return false; }
      snap(4, `Goal: prove <b>${goal}</b>.`, { cur: node.id });
      for (const c of kb.filter(c => c.concl === goal)) {
        if (!c.prem.length) { node.status = 'yes'; node.rule = 'fact'; proved[goal] = true; snap(5, `<b>${goal}</b> is a fact in the KB.`, { cur: node.id }); return true; }
        node.rule = L.hornStr(c); snap(6, `Use rule “${L.hornStr(c)}”: prove ${c.prem.join(' and ')}.`, { cur: node.id });
        let ok = true; for (const p of c.prem) if (!prove(p, stack.concat(goal), node.id)) { ok = false; break; }
        if (ok) { node.status = 'yes'; proved[goal] = true; snap(8, `All premises hold, so <b>${goal}</b> is proved.`, { cur: node.id }); return true; }
        snap(9, `Rule “${L.hornStr(c)}” failed for ${goal}; try another rule.`, { cur: node.id });
      }
      node.status = 'no'; snap(10, `No rule proves ${goal}.`, { cur: node.id }); return false;
    };
    const ok = prove(q, [], null); snap(11, ok ? `<b>${q} is entailed.</b>` : `<b>${q} cannot be proved.</b>`, { done: true, ok });
    return { frames, ok };
  };

  /* ---------- first-order terms ---------- */
  const F = E.fol = {};
  // term: {v:'x'} variable | {c:'John'} constant | {f:'Mother', args:[...]} compound (also used for atoms)
  F.parseTerm = s => {
    let i = 0; s = String(s).trim();
    const ws = () => { while (/\s/.test(s[i])) i++; };
    const term = () => {
      ws(); const m = s.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/); if (!m) throw new Error(`Expected a name at “${s.slice(i, i + 8) || 'end'}”`);
      const name = m[0]; i += name.length; ws();
      if (s[i] === '(') { i++; const args = []; ws(); if (s[i] === ')') throw new Error(`${name}( ) needs at least one argument`); for (;;) { args.push(term()); ws(); if (s[i] === ',') { i++; continue; } if (s[i] === ')') { i++; break; } throw new Error(`Expected “,” or “)” after an argument of ${name}`); } return { f: name, args }; }
      return /^[a-z]/.test(name) ? { v: name } : { c: name };
    };
    const t = term(); ws(); if (i < s.length) throw new Error(`Unexpected “${s.slice(i)}”`); return t;
  };
  F.str = t => t.v ? t.v : t.c ? t.c : `${t.f}(${t.args.map(F.str).join(', ')})`;
  F.isVar = t => !!t.v;
  F.subst = (th, t) => { if (t.v) return th[t.v] ? F.subst(th, th[t.v]) : t; if (t.c) return t; return { f: t.f, args: t.args.map(a => F.subst(th, a)) }; };
  F.substStr = th => '{' + Object.keys(th).map(k => `${k}/${F.str(th[k])}`).join(', ') + '}';
  const occurs = (v, t, th) => { if (t.v === v) return true; if (t.v && th[t.v]) return occurs(v, th[t.v], th); if (t.args) return t.args.some(a => occurs(v, a, th)); return false; };
  // UNIFY with recorded steps (AIMA Fig. 9.1 structure)
  F.unify = (x, y, occurCheck) => {
    occurCheck = occurCheck !== false; const steps = [];
    const S = (line, msg, th) => steps.push({ line, msg, th: th ? Object.assign({}, th) : null });
    const uni = (x, y, th, d) => {
      if (th === null) return null;
      const xs = F.str(x), ys = F.str(y);
      if (xs === ys) { S(2, `${xs} and ${ys} are identical: nothing to do.`, th); return th; }
      if (x.v) return uniVar(x, y, th, d);
      if (y.v) return uniVar(y, x, th, d);
      if (x.f && y.f) {
        if (x.f !== y.f || x.args.length !== y.args.length) { S(6, `${xs} and ${ys} have different ${x.f !== y.f ? 'symbols (' + x.f + ' vs ' + y.f + ')' : 'numbers of arguments'}: <b>fail</b>.`, th); return null; }
        S(5, `Both are ${x.f}(…): unify the arguments pairwise.`, th);
        for (let k = 0; k < x.args.length; k++) { th = uni(x.args[k], y.args[k], th, d + 1); if (th === null) return null; }
        return th;
      }
      S(6, `${xs} and ${ys} are different constants or kinds: <b>fail</b>.`, th); return null;
    };
    const uniVar = (v, t, th, d) => {
      if (th[v.v]) { S(8, `${v.v} is already bound to ${F.str(th[v.v])}: unify that with ${F.str(t)}.`, th); return uni(th[v.v], t, th, d + 1); }
      if (t.v && th[t.v]) { S(9, `${t.v} is already bound to ${F.str(th[t.v])}: unify ${v.v} with that.`, th); return uni(v, th[t.v], th, d + 1); }
      if (occurCheck && occurs(v.v, t, th)) { S(10, `Occur check: ${v.v} appears inside ${F.str(t)}, so binding it would build an infinite term. <b>Fail.</b>`, th); return null; }
      const th2 = Object.assign({}, th, { [v.v]: t }); S(11, `Bind <b>${v.v}/${F.str(t)}</b>.`, th2); return th2;
    };
    S(1, `Unify ${F.str(x)} with ${F.str(y)}, starting from θ = {}.`, {});
    const th = uni(x, y, {}, 0);
    S(12, th ? `Most general unifier θ = <b>${F.substStr(F.resolveAll(th))}</b>.` : '<b>No unifier exists.</b>', th ? F.resolveAll(th) : null);
    return { th: th ? F.resolveAll(th) : null, steps };
  };
  F.resolveAll = th => { const o = {}; for (const k in th) o[k] = F.subst(th, th[k]); return o; };
  F.unifyQuiet = (x, y, th) => { // no steps; returns substitution or null
    const uni = (x, y, th) => { if (th === null) return null; if (F.str(x) === F.str(y)) return th; if (x.v) return uv(x, y, th); if (y.v) return uv(y, x, th); if (x.f && y.f && x.f === y.f && x.args.length === y.args.length) { for (let k = 0; k < x.args.length; k++) { th = uni(x.args[k], y.args[k], th); if (!th) return null; } return th; } return null; };
    const uv = (v, t, th) => { if (th[v.v]) return uni(th[v.v], t, th); if (t.v && th[t.v]) return uni(v, th[t.v], th); if (occurs(v.v, t, th)) return null; return Object.assign({}, th, { [v.v]: t }); };
    return uni(x, y, th || {});
  };
  // definite clauses: "A(x) ∧ B(x) ⇒ C(x)" or facts "C(John)"
  F.parseRule = s => { const parts = s.split(/⇒|=>/); if (parts.length === 1) return { prem: [], concl: F.parseTerm(parts[0]) }; return { prem: splitTop(parts[0]).map(F.parseTerm), concl: F.parseTerm(parts[1]) }; };
  function splitTop(s) { const out = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (d === 0 && (ch === '∧' || ch === '&' || ch === '^')) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map(x => x.trim()).filter(Boolean); }
  F.ruleStr = r => r.prem.length ? r.prem.map(F.str).join(' ∧ ') + ' ⇒ ' + F.str(r.concl) : F.str(r.concl);
  let stdN = 0;
  const standardize = r => { stdN++; const map = {}; const ren = t => t.v ? (map[t.v] = map[t.v] || { v: t.v + '_' + stdN }) : t.c ? t : { f: t.f, args: t.args.map(ren) }; return { prem: r.prem.map(ren), concl: ren(r.concl), src: r }; };
  // FOL-FC-ASK: returns rounds of new facts with the substitution that produced each
  F.forwardChain = (rules, query) => {
    const facts = rules.filter(r => !r.prem.length).map(r => r.concl), rounds = [];
    const known = new Set(facts.map(F.str));
    for (let round = 1; round <= 12; round++) {
      const added = [];
      for (const r0 of rules.filter(r => r.prem.length)) {
        const r = standardize(r0);
        const match = (k, th) => {
          if (k === r.prem.length) { const q = F.subst(th, r.concl), qs = F.str(q); if (!known.has(qs) && !added.some(a => F.str(a.fact) === qs)) added.push({ fact: q, rule: r0, th: Object.fromEntries(Object.entries(th).filter(([v]) => /_\d+$/.test(v)).map(([v, t]) => [v.replace(/_\d+$/, ''), F.subst(th, t)])) }); return; }
          for (const f of facts) { const t2 = F.unifyQuiet(r.prem[k], f, th); if (t2) match(k + 1, t2); }
        };
        match(0, {});
      }
      if (!added.length) { rounds.push({ round, added: [], done: true }); break; }
      added.forEach(a => { facts.push(a.fact); known.add(F.str(a.fact)); });
      const hit = query ? added.find(a => F.unifyQuiet(query, a.fact, {})) : null;
      rounds.push({ round, added, hit: hit ? F.str(hit.fact) : null });
      if (hit) break;
    }
    return { rounds, facts };
  };
  // FOL-BC-ASK (depth-first, like Prolog) recording the proof tree
  F.backwardChain = (rules, goal, maxNodes) => {
    maxNodes = maxNodes || 400; const tree = []; const frames = []; let n = 0;
    const snap = (msg, cur) => frames.push({ msg, cur, tree: tree.map(x => Object.assign({}, x)) });
    function* bcOr(g, th, parent, depth) {
      const id = tree.length; tree.push({ id, parent, goal: F.str(F.subst(th, g)), status: 'open' }); snap(`Goal <b>${F.str(F.subst(th, g))}</b>.`, id);
      if (depth > 12 || ++n > maxNodes) { tree[id].status = 'no'; snap('Depth limit reached.', id); return; }
      for (const r0 of rules) {
        const r = standardize(r0); const t2 = F.unifyQuiet(r.concl, F.subst(th, g), th); if (!t2) continue;
        tree[id].rule = F.ruleStr(r0);
        snap(r.prem.length ? `Match rule “${F.ruleStr(r0)}”. Prove its premises.` : `Matches the fact <b>${F.str(r0.concl)}</b>.`, id);
        for (const t3 of bcAnd(r.prem, t2, id, depth + 1)) { tree[id].status = 'yes'; snap(`Proved <b>${F.str(F.subst(t3, g))}</b>.`, id); yield t3; }
      }
      if (tree[id].status !== 'yes') { tree[id].status = 'no'; snap(`No more ways to prove ${F.str(F.subst(th, g))}.`, id); }
    }
    function* bcAnd(goals, th, parent, depth) { if (!goals.length) { yield th; return; } for (const t1 of bcOr(goals[0], th, parent, depth)) yield* bcAnd(goals.slice(1), t1, parent, depth); }
    const answers = [];
    for (const th of bcOr(goal, {}, null, 0)) { const vars = {}; const rec = t => { if (t.v) vars[t.v] = F.subst(th, t); else if (t.args) t.args.forEach(rec); }; rec(goal); answers.push(vars); snap(`<b>Answer:</b> ${Object.keys(vars).length ? F.substStr(vars) : 'yes'}.`, 0); break; }
    if (!answers.length) snap('<b>No proof found.</b>', 0);
    return { frames, answers, tree };
  };

  /* ---------- minesweeper inference over the frontier ---------- */
  E.mines = {
    // cells: array of {open, n (if open), flag}; W,H; total mines M. Returns {safe:[], mine:[], prob:{i:p}}
    infer(cells, W, H, M) {
      const nb = i => { const x = i % W, y = (i / W) | 0, r = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < W && Y < H) r.push(Y * W + X); } return r; };
      const cons = []; const front = new Set();
      cells.forEach((c, i) => { if (!c.open) return; const u = nb(i).filter(j => !cells[j].open); if (!u.length) return; cons.push({ cells: u, n: c.n }); u.forEach(j => front.add(j)); });
      const F = [...front]; const unknownAll = cells.map((c, i) => c.open ? -1 : i).filter(i => i >= 0); const other = unknownAll.filter(i => !front.has(i)).length;
      if (!F.length) { const p = M / Math.max(1, unknownAll.length); const prob = {}; unknownAll.forEach(i => prob[i] = p); return { safe: [], mine: [], prob, exact: true }; }
      if (F.length > 44) return { safe: [], mine: [], prob: {}, exact: false };
      const pos = new Map(F.map((c, k) => [c, k])); const C = cons.map(c => ({ v: c.cells.map(j => pos.get(j)), n: c.n }));
      const byVar = F.map(() => []); C.forEach((c, k) => c.v.forEach(v => byVar[v].push(k)));
      const asg = new Int8Array(F.length).fill(-1); const cnt = C.map(() => 0), und = C.map(c => c.v.length);
      const tally = new Map(); // k mines -> {ways, perCell}
      let budget = 3e6;
      const rec = (k, mines) => {
        if (--budget < 0) return;
        if (k === F.length) { let t = tally.get(mines); if (!t) { t = { ways: 0, per: new Float64Array(F.length) }; tally.set(mines, t); } t.ways++; for (let v = 0; v < F.length; v++) if (asg[v] === 1) t.per[v]++; return; }
        for (const val of [0, 1]) {
          let ok = true; asg[k] = val;
          for (const ci of byVar[k]) { cnt[ci] += val; und[ci]--; if (cnt[ci] > C[ci].n || cnt[ci] + und[ci] < C[ci].n) ok = false; }
          if (ok && mines + val <= M) rec(k + 1, mines + val);
          for (const ci of byVar[k]) { cnt[ci] -= val; und[ci]++; }
          asg[k] = -1;
        }
      };
      rec(0, 0);
      if (budget < 0) return { safe: [], mine: [], prob: {}, exact: false };
      // weight each frontier arrangement by the number of ways to place the remaining mines elsewhere
      const lchoose = (n, k) => { if (k < 0 || k > n) return -Infinity; let s = 0; for (let i = 1; i <= k; i++) s += Math.log((n - k + i) / i); return s; };
      let Z = 0; const per = new Float64Array(F.length); let otherMines = 0; const ws = [];
      for (const [k, t] of tally) { const lw = lchoose(other, M - k); if (lw === -Infinity) continue; ws.push([k, t, lw]); }
      const mx = Math.max(...ws.map(w => w[2]));
      for (const [k, t, lw] of ws) { const w = Math.exp(lw - mx); Z += w * t.ways; for (let v = 0; v < F.length; v++) per[v] += w * t.per[v]; otherMines += w * t.ways * (M - k); }
      const prob = {}, safe = [], mine = [];
      F.forEach((c, v) => { const p = Z ? per[v] / Z : 0; prob[c] = p; if (p < 1e-12) safe.push(c); else if (p > 1 - 1e-12) mine.push(c); });
      if (other) { const po = Z ? otherMines / Z / other : 0; unknownAll.forEach(i => { if (!front.has(i)) { prob[i] = po; if (po < 1e-12) safe.push(i); else if (po > 1 - 1e-12) mine.push(i); } }); }
      return { safe, mine, prob, exact: true };
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
