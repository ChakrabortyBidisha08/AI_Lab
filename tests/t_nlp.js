// node tests/t_nlp.js — checks for the chapter 23–24 labs
globalThis.window = globalThis; globalThis.AI = { lab() {}, esc: s => s, range: n => Array.from({ length: n }, (_, i) => i) };
require('../assets/js/labs/nlp.js');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
ok(AI._ngram.SENTS.length === 30, 'corpus has 30 sentences (' + AI._ngram.SENTS.length + ')');
const M2 = AI._ngram.ngramModel(2), d = AI._ngram.nextDist(M2, ['the', 'robot'], 0); const tot = d.dist.reduce((s, x) => s + x[1], 0); ok(Math.abs(tot - 1) < 1e-9, 'bigram next-word distribution sums to 1');
const d1 = AI._ngram.nextDist(AI._ngram.ngramModel(2), ['robot'], 1); ok(Math.abs(d1.dist.reduce((s, x) => s + x[1], 0) - 1) < 1e-9, 'add-one smoothed distribution sums to 1');
const C = AI._cyk; const w = 'the agent shoots the wumpus with the arrow'.split(' '); const R = C.cyk(w); const S = R.T['0,' + w.length].S;
ok(C.allParses(w) === 2, 'PP-attachment sentence has exactly 2 parses');
const tr = C.tree(R.T, 0, w.length, 'S'); ok(tr.kids[1].kids[0].X === 'VP' && tr.kids[1].kids[1].X === 'PP', 'most probable parse attaches the PP to the VP');
// exact probability of the VP-attachment parse
const NPd = (n) => 0.75 * 0.7 * n; const pA = 1.0 * NPd(0.25) * (0.3 * (0.6 * 0.4 * NPd(0.25)) * (1.0 * 0.5 * NPd(0.2)));
ok(Math.abs(S.p - pA) < 1e-15, `P(best parse) = ${S.p.toExponential(4)} matches the hand calculation ${pA.toExponential(4)}`);
const pB = 1.0 * NPd(0.25) * (0.6 * 0.4 * (0.25 * NPd(0.25) * (1.0 * 0.5 * NPd(0.2)))); ok(Math.abs(pA / pB - 0.18 / 0.15) < 1e-12, `ratio of the two parses = 0.18 / 0.15 (${(pA / pB).toFixed(4)})`);
ok(C.allParses('the wumpus sleeps in the cave'.split(' ')) === 1, 'the wumpus sleeps in the cave: 1 parse');
const n4 = C.allParses('a wumpus sees the agent with the gold in the cave'.split(' ')); console.log('     two-PP sentence parses:', n4);
const B = AI._beam; const g = B.beam(1).best, b2 = B.beam(2).best, all = B.beam(99).best;
ok(g.s.join(' ') === 'a dog barks', 'greedy decodes “a dog barks” (' + g.s.join(' ') + ', p = ' + Math.exp(g.lp).toFixed(4) + ')');
ok(b2.s.join(' ') === all.s.join(' ') && all.s.join(' ') === 'the dog runs', 'beam width 2 finds the overall best “the dog runs” (p = ' + Math.exp(all.lp).toFixed(4) + ')');
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
