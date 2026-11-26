// node tests/t_questions.js — structural checks on every question, and recomputation of numeric answers
globalThis.window = globalThis; globalThis.AI = {}; require('../assets/js/questions.js'); require('../assets/js/notes.js');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const Q = AI.Q, chs = Object.keys(Q); let n = 0;
chs.forEach(ch => Q[ch].forEach((q, i) => { n++; const id = `ch ${ch} q${i + 1}`; const t = q.type || (q.opts ? 'mcq' : 'num');
  ok(typeof q.q === 'string' && q.q.length > 10, id + ' has text'); ok(q.explain && q.explain.length > 10, id + ' has an explanation');
  if (t === 'mcq') ok(Array.isArray(q.opts) && Number.isInteger(q.a) && q.a >= 0 && q.a < q.opts.length, id + ' mcq answer index');
  if (t === 'multi') ok(Array.isArray(q.a) && q.a.every(k => k >= 0 && k < q.opts.length), id + ' multi answers');
  if (t === 'tf') ok(typeof q.a === 'boolean', id + ' tf answer');
  if (t === 'num') ok(typeof q.a === 'number' && isFinite(q.a), id + ' numeric answer');
  ok([1, 2, 3].includes(q.lvl), id + ' level'); }));
console.log(`${n} questions in ${chs.length} chapters; notes for ${Object.keys(AI.notes).length} chapters`);
const all = ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','G20','20','21','22','23','24','25','26','27','28'];
all.forEach(c => { ok(Q[c] && Q[c].length >= 5, 'questions for chapter ' + c); ok(AI.notes[c] && AI.notes[c].ideas && AI.notes[c].ideas.length >= 3, 'notes for chapter ' + c); });
// recompute numeric answers
const near = (a, b, t, m) => ok(Math.abs(a - b) <= t, `${m}: ${a} vs ${b}`);
const goal = [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]]; // position of tile k (0 = blank)
const st = [[7, 2, 4], [5, 0, 6], [8, 3, 1]]; let h1 = 0, h2 = 0; st.forEach((r, i) => r.forEach((t, j) => { if (!t) return; const [gi, gj] = goal[t]; if (gi !== i || gj !== j) h1++; h2 += Math.abs(gi - i) + Math.abs(gj - j); }));
near(h1, 8, 0, 'h1'); near(h2, Q[3][7].a, 0, 'h2');
let lo = 1, hi = 3; for (let k = 0; k < 100; k++) { const b = (lo + hi) / 2, s = [0, 1, 2, 3, 4, 5].reduce((a, d) => a + b ** d, 0); if (s < 53) lo = b; else hi = b; } near(lo, Q[3][8].a, 0.005, 'effective branching factor');
near(Math.exp(-0.5), Q[4][1].a, 0.0005, 'annealing acceptance');
near(60 / 79 + 1.4 * Math.sqrt(Math.log(100) / 79), Q[5][7].a, 0.005, 'UCB1');
near((0.5 * Math.sqrt(1000)) ** 2, Q[16][4].a, 1e-9, 'certainty equivalent');
near(0.009 / (0.009 + 0.05 * 0.99), Q[12][3].a, 0.0005, 'disease posterior');
near(0.7 * (1 / 50000) / 0.01, Q[12][2].a, 1e-9, 'meningitis');
near(0.9 * 0.7 * 0.001 * 0.999 * 0.998, Q[13][1].a, 0.0000005, 'burglary joint entry');
near(-(0.25 * Math.log2(0.25) + 0.75 * Math.log2(0.75)), Q[19][1].a, 0.0005, 'entropy');
near(Math.pow(1e-5, 1 / 17), Q[19][8].a, 0.005, 'curse of dimensionality');
near(Math.E / (Math.E + 1), Q[24][1].a, 0.0005, 'attention weight');
near(3 * 3 * 16 * 32 + 32, Q[21][1].a, 0, 'conv parameters');
near(Math.floor((9 + 2 - 3) / 2) + 1, Q[21][2].a, 0, 'conv output size');
const nets = [[94, 71], [94, 166], [90, 361], [84, 682], [82, 1653], [82, 2772]].map(([c, t]) => -c - 0.01 * t); near(nets.indexOf(Math.max(...nets)) + 1, Q[28][2].a, 0, 'anytime stopping run');
const p = [0, 0.25, 0.5, 0.75, 1], pr = [0.1, 0.2, 0.4, 0.2, 0.1]; const post = pr.map((x, i) => x * p[i]); const z = post.reduce((a, b) => a + b, 0); near(post.reduce((a, x, i) => a + x / z * p[i], 0), Q[20][0].a, 1e-12, 'candy prediction');
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
