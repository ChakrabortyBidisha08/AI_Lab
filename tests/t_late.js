// node tests/t_late.js — checks for the chapter 25–28 labs
globalThis.window = globalThis; require('../assets/js/engines/search.js');
const rng = seed => { let s = (seed >>> 0) || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const gauss = r => { r = r || Math.random; let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
globalThis.AI = { lab() {}, esc: s => s, range: n => Array.from({ length: n }, (_, i) => i), rng, gauss, clamp: (v, a, b) => Math.max(a, Math.min(b, v)) };
require('../assets/js/labs/percept.js'); require('../assets/js/labs/ethics.js');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
// PID claims
const { simPID, PLANTS } = AI._pid;
const p1 = simPID(PLANTS[0], 2, 0, 0); ok(Math.abs(p1.final - 1) < 0.02, `cart with friction, P only (Kp=2): settles at ${p1.final.toFixed(3)}`);
const p2 = simPID(PLANTS[1], 4, 0, 0); const tail = p2.xs.slice(-30); ok(Math.max(...tail) - Math.min(...tail) > 1, `frictionless cart, P only: still oscillating at 10 s (range ${(Math.max(...tail) - Math.min(...tail)).toFixed(2)})`);
const p2d = simPID(PLANTS[1], 4, 0, 3); ok(Math.abs(p2d.final - 1) < 0.02, `frictionless cart with D: settles at ${p2d.final.toFixed(3)}`);
const p3 = simPID(PLANTS[2], 10, 0, 2); ok(Math.abs(p3.final - 0.8) < 0.02, `slope, PD (Kp=10): stops short at ${p3.final.toFixed(3)} (expected 1 − 2/10 = 0.8)`);
const p3i = simPID(PLANTS[2], 10, 5, 3); ok(Math.abs(p3i.final - 1) < 0.02, `slope with I: reaches ${p3i.final.toFixed(3)}`);
// differential privacy: optimal guessing accuracy for Laplace(50,b) vs Laplace(51,b)
for (const eps of [0.1, 0.5, 1, 2]) { const b = 1 / eps; const cdf = x => x < 0 ? 0.5 * Math.exp(x / b) : 1 - 0.5 * Math.exp(-x / b); const acc = 0.5 * (cdf(0.5)) + 0.5 * (1 - cdf(-0.5)); ok(Math.abs(acc - (1 - 0.5 * Math.exp(-eps / 2))) < 1e-12 && acc <= Math.exp(eps) / (1 + Math.exp(eps)) + 1e-12, `ε=${eps}: best accuracy ${acc.toFixed(4)} = 1 − ½e^(−ε/2) ≤ e^ε/(1+e^ε) = ${(Math.exp(eps) / (1 + Math.exp(eps))).toFixed(4)}`); }
// off-switch: waiting dominates when the human is rational; advantage → 0 as σ → 0
const off = AI._off; let dom = true; for (const mu of [-1.5, -0.3, 0, 0.4, 1.2]) for (const s of [0.01, 0.3, 1, 2.5]) { const r = off(mu, s, 0); if (r.wait < Math.max(r.act, r.off) - 1e-12) dom = false; } ok(dom, 'rational human: waiting is never worse than acting or switching off');
ok(off(0.5, 1e-6, 0).wait - 0.5 < 1e-6, 'certain robot (σ → 0): no advantage in waiting'); ok(off(2, 0.5, 0.2).wait < 2, 'fallible human (20% errors) with a confident robot: waiting is worse than acting');
// Monte Carlo check of E[max(U,0)]
{ const r = rng(5); let s = 0; const N = 400000; for (let i = 0; i < N; i++) s += Math.max(0, 0.3 + 1.2 * gauss(r)); ok(Math.abs(s / N - off(0.3, 1.2, 0).wait) < 0.01, `E[max(U,0)] formula ${off(0.3, 1.2, 0).wait.toFixed(4)} vs simulation ${(s / N).toFixed(4)}`); }
// fairness: equal thresholds equalise TPR and FPR; predictive parity then fails when base rates differ
const { groupStats } = AI._fair; const A = groupStats(0.5, 0, 1, -1), B = groupStats(0.25, 0, 1, -1); ok(Math.abs(A.tpr - B.tpr) < 1e-12 && Math.abs(A.fpr - B.fpr) < 1e-12 && Math.abs(A.ppv - B.ppv) > 0.05, `equal thresholds: equal TPR/FPR, but precision ${A.ppv.toFixed(3)} vs ${B.ppv.toFixed(3)}`);
// anytime search: solutions improve and the last is optimal
for (const seed of [4, 5, 6, 7]) { const R = AI._anytime(seed); if (R.sols.length < 2) { console.log('     seed', seed, 'has no path; the lab moves to the next map'); continue; } const last = R.sols[R.sols.length - 1]; const opt = globalThis.AIE.gridSearch(R.grid, R.W, R.H, R.start, R.goal, 'ucs'); ok(last.w === 1 && last.cost === opt.cost && R.sols.every(s => s.cost >= opt.cost), `map ${seed}: costs ${R.sols.map(s => s.cost).join(' → ')}, last equals the optimal ${opt.cost}`); }
// vision: Gaussian kernel sums to 1
const k = AI._vision.gaussK(1.5); ok(Math.abs(k.flat().reduce((a, b) => a + b, 0) - 1) < 1e-12, 'Gaussian kernel is normalised');
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
