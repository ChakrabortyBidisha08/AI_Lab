// node tests/t_multi.js — checks the chapter 18 labs' game theory, voting and auction numbers
globalThis.window = globalThis;
const AI = globalThis.AI = { lab() {}, esc: s => s, range: n => Array.from({ length: n }, (_, i) => i), store: { get: (k, d) => d, set() {} } };
require('../assets/js/labs/multi.js');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
const { analyse, frac } = AI._games2;
const pd = analyse({ A: [[-5, 0], [-10, -1]], B: [[-5, -10], [0, -1]] });
ok(pd.domRow === 0 && pd.domCol === 0, 'PD: testify dominant for both');
ok(pd.pure.length === 1 && pd.pure[0][0] === 0 && pd.pure[0][1] === 0, 'PD: unique NE (testify, testify)');
ok(!pd.pareto.some(([i, j]) => i === 0 && j === 0) && pd.pareto.some(([i, j]) => i === 1 && j === 1), 'PD: NE not Pareto optimal; (refuse, refuse) is');
ok(!pd.mixed, 'PD: no fully mixed equilibrium');
const mo = analyse({ A: [[2, -3], [-3, 4]], B: [[-2, 3], [3, -4]] });
ok(mo.pure.length === 0 && mo.zeroSum, 'Morra: zero-sum, no pure NE');
ok(frac(mo.mixed.p) === '7/12' && frac(mo.mixed.q) === '7/12' && frac(mo.mixed.vr) === '−1/12', `Morra: p = q = 7/12, value −1/12 (${frac(mo.mixed.p)}, ${frac(mo.mixed.q)}, ${frac(mo.mixed.vr)})`);
const mp = analyse({ A: [[1, -1], [-1, 1]], B: [[-1, 1], [1, -1]] }); ok(frac(mp.mixed.p) === '1/2' && frac(mp.mixed.vr) === '0', 'matching pennies 1/2, value 0');
const co = analyse({ A: [[2, 0], [0, 1]], B: [[2, 0], [0, 1]] }); ok(co.pure.length === 2 && frac(co.mixed.p) === '1/3' && frac(co.mixed.q) === '1/3', 'coordination: two pure NE and mixed 1/3');
ok(co.pareto.length === 1 && co.pareto[0][0] === 0 && co.pareto[0][1] === 0, 'coordination: only (café, café) Pareto optimal');
// voting
const T = AI._vote;
const sp = T({ ABC: 4, ACB: 0, BAC: 0, BCA: 3, CAB: 0, CBA: 2 }); ok(sp.wPlur === 'A' && sp.wBorda === 'B' && sp.irv === 'B' && sp.condorcet === 'B', 'split preset: A / B / B, Condorcet B');
const ru = T({ ABC: 4, ACB: 0, BAC: 0, BCA: 2, CAB: 0, CBA: 3 }); ok(ru.wPlur === 'A' && ru.wBorda === 'B' && ru.irv === 'C' && ru.condorcet === 'B', 'three-winners preset: plurality A, Borda B, IRV C, Condorcet B');
const cy = T({ ABC: 1, ACB: 0, BAC: 0, BCA: 1, CAB: 1, CBA: 0 }); ok(!cy.condorcet && cy.pair.AB === 2 && cy.pair.BC === 2 && cy.pair.CA === 2, 'cycle preset: A>B, B>C, C>A each 2:1');
// auctions
const { euBid } = AI._auction;
for (const n of [2, 3, 5, 10]) for (const v of [20, 55, 90]) {
  let b2 = 0, b1 = 0; for (let b = 0; b <= 100; b += 0.01) { if (euBid('second', v, b, n) > euBid('second', v, b2, n) + 1e-12) b2 = b; if (euBid('first', v, b, n) > euBid('first', v, b1, n) + 1e-12) b1 = b; }
  ok(Math.abs(b2 - v) < 0.02 && Math.abs(b1 - (n - 1) / n * v) < 0.02, `n=${n}, v=${v}: best bids ${b2.toFixed(2)} (second) and ${b1.toFixed(2)} (first, expect ${((n - 1) / n * v).toFixed(2)})`);
}
// Monte Carlo check of the second-price formula and revenue equivalence
let r = 1; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
{ const n = 4, v = 70, b = 60; let s = 0; const N = 400000; for (let i = 0; i < N; i++) { const m = Math.max(rnd() * 100, rnd() * 100, rnd() * 100); if (b > m) s += v - m; } ok(Math.abs(s / N - euBid('second', v, b, n)) < 0.15, `second-price EU by simulation ${(s / N).toFixed(3)} vs formula ${euBid('second', v, b, n).toFixed(3)}`); }
{ const n = 5, N = 300000; let rev1 = 0, rev2 = 0; for (let i = 0; i < N; i++) { const vs = Array.from({ length: n }, () => rnd() * 100).sort((a, b) => b - a); rev2 += vs[1]; rev1 += (n - 1) / n * vs[0]; } ok(Math.abs(rev1 / N - 400 / 6) < 0.2 && Math.abs(rev2 / N - 400 / 6) < 0.2, `revenue equivalence n=5: ${(rev1 / N).toFixed(2)} vs ${(rev2 / N).toFixed(2)} vs ${(400 / 6).toFixed(2)}`); }
// repeated prisoner's dilemma
const { match } = AI._ipd; const m1 = match('tft', 'alld', 10, 0, Math.random); ok(m1.p1 === -55 && m1.p2 === -45, `TFT vs Always testify over 10 rounds: ${m1.p1}, ${m1.p2}`);
const m2 = match('tft', 'tft', 10, 0, Math.random); ok(m2.p1 === -10 && m2.p2 === -10, 'TFT vs TFT: mutual refusal, −10 each');
const m3 = match('wsls', 'alld', 4, 0, Math.random); ok(m3.a.join('') === 'CDCD', 'win-stay lose-shift alternates against Always testify: ' + m3.a.join(''));
const m4 = match('grim', 'tf2t', 6, 0, Math.random); ok(m4.a.join('') === 'CCCCCC', 'grim vs tit-for-two-tats cooperate throughout');
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
