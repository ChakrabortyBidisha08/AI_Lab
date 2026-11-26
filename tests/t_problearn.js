// node tests/t_problearn.js — checks the chapter 20 numbers
globalThis.window = globalThis; require('../assets/js/engines/ml.js');
globalThis.AI = { lab() {}, esc: s => s, range: n => Array.from({ length: n }, (_, i) => i), _plane: {} };
require('../assets/js/labs/problearn.js');
const E = globalThis.AIE; let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
const p1 = E.candy.posterior(['L']); ok([0, 0.1, 0.4, 0.3, 0.2].every((v, i) => Math.abs(p1[i] - v) < 1e-12), 'posterior after one lime = ⟨0, 0.1, 0.4, 0.3, 0.2⟩');
ok(Math.abs(E.candy.predictLime(['L']) - 0.65) < 1e-12, 'P(next lime | one lime) = 0.65');
ok(Math.abs(E.candy.predictLime([]) - 0.5) < 1e-12, 'P(lime) with no data = 0.5');
const p10 = E.candy.posterior(Array(10).fill('L')); ok(Math.abs(p10[4] - 0.1 / (0.1 + 0.2 * 0.75 ** 10 + 0.4 * 0.5 ** 10 + 0.2 * 0.25 ** 10)) < 1e-12 && p10[0] === 0, `after 10 limes P(h5) = 0.1 / (0.1 + 0.2·0.75¹⁰ + 0.4·0.5¹⁰ + 0.2·0.25¹⁰) = ${p10[4].toFixed(4)}`);
// Beta density integrates to 1 and has the right mean
const { betaPdf } = AI._beta; for (const [a, b] of [[1, 1], [2, 2], [5, 3], [30, 12]]) { let s = 0, m = 0; const N = 20000; for (let k = 0; k < N; k++) { const x = (k + 0.5) / N; s += betaPdf(x, a, b) / N; m += x * betaPdf(x, a, b) / N; } ok(Math.abs(s - 1) < 1e-3 && Math.abs(m - a / (a + b)) < 1e-3, `Beta(${a},${b}) integrates to ${s.toFixed(4)}, mean ${m.toFixed(4)}`); }
// naive Bayes
const r1 = AI._nbScore('heavy snow and frost in the hills', 1); ok(r1.rows.slice().sort((a, b) => b.p - a.p)[0].c === 'weather', 'naive Bayes: snow and frost → weather');
const r2 = AI._nbScore('shares and bond yields climbed', 1); ok(r2.rows.slice().sort((a, b) => b.p - a.p)[0].c === 'business', 'naive Bayes: shares, bond yields → business');
const r3 = AI._nbScore('the captain lifted the trophy', 1); ok(r3.rows.slice().sort((a, b) => b.p - a.p)[0].c === 'sport', 'naive Bayes: captain, trophy → sport');
const r4 = AI._nbScore('snow and trophy', 0); ok(r4.rows.every(r => !isFinite(r.lp)), 'k = 0: snow (weather only) + trophy (sport only) zero out every class');
const r5 = AI._nbScore('Strong winds and rain forced the final to be postponed', 1); console.log('     default sentence:', r5.rows.map(r => r.c + ' ' + (r.p * 100).toFixed(1) + '%').join(', '), '| ignored:', r5.ignored.join(','));
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
