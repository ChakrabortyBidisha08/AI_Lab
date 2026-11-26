// node tests/t_rl.js — checks for the chapter 22 labs
globalThis.window = globalThis; require('../assets/js/engines/mdp.js');
const rng = seed => { let s = (seed >>> 0) || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
globalThis.AI = { lab() {}, esc: s => s, range: n => Array.from({ length: n }, (_, i) => i), clamp: (v, a, b) => Math.max(a, Math.min(b, v)), rng };
require('../assets/js/labs/rl.js');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
const N = AI._nim; ok(N.wins(N.START) === false, 'misère Nim 1,3,5,7: player to move loses with perfect play');
ok(N.wins([1, 0, 0, 0]) === false && N.wins([2, 0, 0, 0]) === true && N.wins([1, 1, 0, 0]) === true && N.wins([1, 1, 1, 0]) === false, 'small misère positions (1: lose, 2: win, 1+1: win, 1+1+1: lose)');
// nim-sum rule for misère: P-position iff (xor == 0 and some heap > 1) or (xor == 1 and all heaps <= 1)
let agree = 0, total = 0; for (let a = 0; a <= 1; a++) for (let b = 0; b <= 3; b++) for (let c = 0; c <= 5; c++) for (let d = 0; d <= 7; d++) { const h = [a, b, c, d]; if (!h.some(x => x)) continue; const x = a ^ b ^ c ^ d, big = h.some(v => v > 1); const P = big ? x === 0 : x === 1; total++; if (N.wins(h) === !P) agree++; }
ok(agree === total, `exact search agrees with the misère nim-sum rule on all ${total} positions`);
for (const n of [2000, 20000, 60000]) { const T = N.trainNim(n, rng(7)); const q = N.nimQuality(T); console.log(`     after ${n} self-play games: ${q.ok}/${q.tot} winning positions played right (${(100 * q.ok / q.tot).toFixed(1)}%)`); }
// passive RL converges towards the true utilities
const E = globalThis.AIE, m = E.gridMDP({ r: -0.04 }); const h = E.valueIteration(m, 1e-10, 6000), pi = m.policy(h[h.length - 1].U), Ut = E.policyEval(m, pi, null, 5000);
const reach = new Set(['1,1']); let grew = true; while (grew) { grew = false; [...reach].forEach(k => { if (m.isTerm(k)) return; m.T(k, pi[k]).forEach(([p, s2]) => { if (p > 0 && !reach.has(s2)) { reach.add(s2); grew = true; } }); }); }
ok(!reach.has('3,1') && !reach.has('4,1') && reach.has('3,2') && reach.has('2,1'), 'under the optimal policy (3,1) and (4,1) are unreachable from (1,1); (2,1) and (3,2) are reachable');
for (const meth of ['direct', 'adp', 'td']) { const hist = E.passive(m, pi, meth, 500, rng(3)); const U = hist[hist.length - 1]; const nonT = m.states.filter(k => !m.isTerm(k) && reach.has(k)); const rms = Math.sqrt(nonT.reduce((s, k) => s + (U[k] - Ut[k]) ** 2, 0) / nonT.length); if (meth !== 'td') ok(rms < 0.05, `${meth}: RMS error after 500 trials ${rms.toFixed(3)}`); else { const h2 = E.passive(m, pi, 'td', 3000, rng(3)), U2 = h2[h2.length - 1]; ok(Math.abs(U2['1,1'] - Ut['1,1']) < 0.04 && Math.abs(U2['1,3'] - Ut['1,3']) < 0.04, `td: U(1,1) ${U2['1,1'].toFixed(3)} vs ${Ut['1,1'].toFixed(3)}, U(1,3) ${U2['1,3'].toFixed(3)} vs ${Ut['1,3'].toFixed(3)} after 3000 trials (rarely visited (3,2) stays noisy: ${U2['3,2'].toFixed(3)} vs ${Ut['3,2'].toFixed(3)})`); } }
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
