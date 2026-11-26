// node tests/t_decide.js — checks the numbers behind the chapter 16–17 labs
globalThis.window = globalThis;
require('../assets/js/engines/mdp.js');
const AI = globalThis.AI = { lab() {}, esc: s => s, range: n => Array.from({ length: n }, (_, i) => i), rng: seed => { let s = (seed >>> 0) || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; } };
require('../assets/js/labs/decide.js');
const E = globalThis.AIE, D = AI._decide; let fails = 0;
const ok = (c, msg) => { if (!c) { fails++; console.log('FAIL', msg); } else console.log('ok  ', msg); };
const near = (a, b, t, msg) => ok(Math.abs(a - b) <= (t || 1e-6), `${msg}: ${a} ≈ ${b}`);
// decision network defaults
const S = AI._dn({ pR: 0.3, bR: 0.9, bS: 0.2, U: { ls: 100, lr: 0, ts: 20, tr: 70 } });
near(S.e0.leave, 70, 1e-9, 'EU(leave) no evidence'); near(S.e0.take, 35, 1e-9, 'EU(take) no evidence');
near(S.pBad, 0.41, 1e-9, 'P(forecast rain)'); near(S.qBad, 0.27 / 0.41, 1e-9, 'P(rain | forecast rain)');
ok(S.bestB === 'take' && S.bestG === 'leave', 'forecast changes decision');
near(S.meuF, 0.59 * (0.7 * 0.8 / 0.59 * 100) + 0.41 * Math.max(0.14 / 0.41 * 100, 0.14 / 0.41 * 20 + 0.27 / 0.41 * 70), 1e-9, 'MEU with forecast');
ok(S.vF >= 0 && S.vF <= S.vW + 1e-12, `0 <= value of forecast (${S.vF.toFixed(3)}) <= VPI(W) (${S.vW.toFixed(3)})`);
near(S.vW, 0.7 * 100 + 0.3 * 70 - 70, 1e-9, 'VPI(Weather)');
for (let q = 0; q <= 1.0001; q += 0.05) { const r = AI._dn({ pR: q, bR: 0.9, bS: 0.2, U: { ls: 100, lr: 0, ts: 20, tr: 70 } }); if (r.vF < -1e-9 || r.vF > r.vW + 1e-9) ok(false, 'VOI bounds at pR=' + q); }
ok(true, 'value of forecast within [0, VPI(W)] for all P(rain)');
// certainty equivalent fit
[100000, 600000, 1000000, 1240000, 1300000, 2000000, 2400000].forEach(ce => { const R = D.solveR(ce); near(D.ceOf(R), ce, 2, 'CE round trip for ' + ce); near(D.uNorm(ce, R), 0.5, 1e-6, 'u(CE) = 1/2 for ' + ce); });
// Clark expected max vs Monte Carlo
const Phi = x => { const a = -9, n = 4000, h = (x - a) / n, f = t => Math.exp(-t * t / 2) / Math.sqrt(2 * Math.PI); let s = f(a) + f(x); for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2); return s * h / 3; };
const r = AI.rng(7); const g = () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
[[10.4, 4, 10, 4], [14, 1.2, 6, 1.2], [10.1, 0.4, 10, 0.4], [3, 2, 5, 0.5]].forEach(([m1, s1, m2, s2]) => { const th = Math.hypot(s1, s2), a = (m1 - m2) / th, pdf = Math.exp(-a * a / 2) / Math.sqrt(2 * Math.PI); const em = m1 * Phi(a) + m2 * Phi(-a) + th * pdf; let mc = 0; const N = 400000; for (let i = 0; i < N; i++) mc += Math.max(m1 + s1 * g(), m2 + s2 * g()); near(em, mc / N, 0.02, `E[max] closed form vs MC (${m1},${s1},${m2},${s2})`); });
// 4x3 world: trap detection and policy evaluation
const m = E.gridMDP({ r: -0.04 }); const piR = {}; m.states.forEach(k => { if (!m.isTerm(k)) piR[k] = 'R'; });
ok(D.trapSet(m, piR).size === 0, 'all-Right policy reaches an exit with probability 1 when pOk = 0.8');
const m1 = E.gridMDP({ r: -0.04, pOk: 1 }); ok(D.trapSet(m1, piR).has('1,2'), 'deterministic all-Right policy traps (1,2) against the wall');
const Ub = D.evalPolicy(m1, piR); ok(Ub['1,2'] === -Infinity && Ub['1,1'] === -Infinity && Math.abs(Ub['2,3'] - 0.92) < 1e-9, 'deterministic all-Right: (1,2) and (1,1) never exit (−∞), (2,3) reaches +1 in 2 steps: ' + Ub['2,3']);
// policy game: optimal scores 9, all-Up does not
D.LEVELS.forEach((L, i) => { const mm = E.gridMDP({ r: L.r, gamma: L.gamma }); const h = E.valueIteration(mm, 1e-10, 6000); const Us = h[h.length - 1].U; const pi = mm.policy(Us); const Up = D.evalPolicy(mm, pi); near(Up['1,1'], Us['1,1'], 1e-6, `level ${i + 1}: value of greedy policy equals U*(1,1) = ${Us['1,1'].toFixed(4)}`); });
const h0 = E.valueIteration(m, 1e-10, 6000).pop().U; near(h0['1,1'], 0.705, 5e-4, 'book U(1,1)'); near(h0['3,3'], 0.918, 5e-4, 'book U(3,3)'); near(h0['4,1'], 0.388, 5e-4, 'book U(4,1)');
// bandits: regret shapes
const rr = AI.rng(99); const res = {}; [['greedy', () => E.bandit.policies.greedy()], ['eps', () => E.bandit.policies.eps(0.1)], ['ucb', () => E.bandit.policies.ucb()], ['ts', () => E.bandit.policies.thompson()]].forEach(([k, mk]) => { const reg = new Float64Array(500); for (let i = 0; i < 200; i++) { const p = AI.range(5).map(() => rr()); E.bandit.run(p, mk(), 500, rr).regret.forEach((v, t) => reg[t] += v / 200); } res[k] = [reg[99], reg[249], reg[499]]; });
console.log(JSON.stringify(res));
const slope = a => [(a[1] - a[0]) / 150, (a[2] - a[1]) / 250];
['ucb', 'ts'].forEach(k => { const s = slope(res[k]); ok(s[1] < s[0], `${k}: regret grows more slowly later (${s.map(x => x.toFixed(4))})`); });
['greedy', 'eps'].forEach(k => { const s = slope(res[k]); ok(s[1] > 0.6 * s[0], `${k}: regret keeps growing at a steady rate (${s.map(x => x.toFixed(4))})`); });
ok(res.ts[2] < res.eps[2] && res.ts[2] < res.greedy[2], 'Thompson sampling has the lowest regret of the four at 500 pulls (5 machines)');
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
