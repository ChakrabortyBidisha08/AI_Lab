require('../assets/js/engines/search.js'); require('../assets/js/engines/ml.js'); const E = globalThis.AIE; const R = E.restaurant;
const g = E.dt.gainTable(R.rows, R.attrs, R.values, 'WillWait'); console.log('root H', g[0].H.toFixed(3)); g.forEach(x => console.log('  gain', x.a.padEnd(13), x.gain.toFixed(4)));
const full = R.rows.filter(r => r.Patrons === 'Full'); console.log('Full node gains:', E.dt.gainTable(full, R.attrs.filter(a=>a!=='Patrons'), R.values, 'WillWait').map(x => x.a+':'+x.gain.toFixed(3)).join(' '));
const tr = []; const t = E.dt.learn(R.rows, R.attrs, R.values, 'WillWait', R.rows, tr);
const show = (n, ind) => n.leaf ? ind + '→ ' + n.leaf + (n.empty ? ' (no examples)' : '') : Object.entries(n.kids).map(([v, k]) => ind + n.attr + ' = ' + v + '\n' + show(k, ind + '   ')).join('\n');
console.log(show(t, '')); console.log('tree size', E.dt.size(t), 'training accuracy', R.rows.filter(r => E.dt.classify(t, r) === r.WillWait).length + '/12');
console.log('candy posterior after 10 limes', E.candy.posterior(Array(10).fill('L')).map(x=>x.toFixed(4)).join(' '), ' P(next lime | 1 lime)', E.candy.predictLime(['L']).toFixed(3));
const m = E.nb.train([['sport','the team won the match'],['sport','a great goal in the final match'],['tech','the new phone has a fast chip'],['tech','software update for the phone']]);
console.log('NB:', E.nb.classify(m, 'the phone won').map(o => o.c + ' ' + o.p.toFixed(3)).join(' | '));
const rnd = E.mulberry(1); const pts = []; for (let i=0;i<120;i++){ const x=rnd()*2-1,y=rnd()*2-1; pts.push({x,y,c: (x*y>0)?1:0}); }
const net = new E.MLP([2,8,8,1],'tanh',rnd); for (let k=0;k<3000;k++) net.train(pts, 0.3, 10); console.log('MLP XOR-like accuracy', net.accuracy(pts).toFixed(3));
const ab = E.adaboost(pts.map(p=>({x:p.x,y:p.y,c:p.c?1:-1})), 30); console.log('AdaBoost rounds', ab.hist.length, 'train errors after last', ab.hist[ab.hist.length-1].trainErr, 'of', pts.length);
const lr = E.linreg.exact([{x:0,y:1},{x:1,y:3},{x:2,y:5}]); console.log('linreg exact', lr.map(v=>v.toFixed(3)));
const vs = E.versionSpace(['Sky','Wind'], [['Sunny','Cloudy'],['Strong','Calm']], [[['Sunny','Strong'],true],[['Cloudy','Calm'],false],[['Sunny','Calm'],true]]); vs.forEach(s => console.log('VS', s.x, s.pos, 'S=', JSON.stringify(s.S), 'G=', JSON.stringify(s.G)));
// ---- appended: version space (Mitchell's EnjoySport) and SVM margin checks ----
{
  const E2 = globalThis.AIE; let f2 = 0; const ok2 = (c, m) => { if (!c) { f2++; console.log('FAIL', m); } else console.log('ok  ', m); };
  const attrs = ['Sky', 'AirTemp', 'Humidity', 'Wind', 'Water', 'Forecast'], dom = [['Sunny', 'Cloudy', 'Rainy'], ['Warm', 'Cold'], ['Normal', 'High'], ['Strong', 'Weak'], ['Warm', 'Cool'], ['Same', 'Change']];
  const ex = [[['Sunny', 'Warm', 'Normal', 'Strong', 'Warm', 'Same'], true], [['Sunny', 'Warm', 'High', 'Strong', 'Warm', 'Same'], true], [['Rainy', 'Cold', 'High', 'Strong', 'Warm', 'Change'], false], [['Sunny', 'Warm', 'High', 'Strong', 'Cool', 'Change'], true]];
  const st = E2.versionSpace(attrs, dom, ex), L = st[3];
  ok2(L.S.length === 1 && L.S[0].join() === 'Sunny,Warm,?,Strong,?,?', 'version space S4 = <Sunny, Warm, ?, Strong, ?, ?>');
  ok2(L.G.length === 2 && L.G.map(g => g.join()).sort().join('|') === '?,Warm,?,?,?,?|Sunny,?,?,?,?,?', 'version space G4 = {<Sunny,?...>, <?,Warm,...>}');
  ok2(st[2].G.length === 3, 'after the negative example G has three members');
  let seed = 3; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pts = []; for (let i = 0; i < 30; i++) { const c = i % 2 ? 1 : -1; pts.push({ x: 0.3 + 0.35 * (c > 0) + 0.15 * (r() - 0.5) * 2, y: 0.3 + 0.35 * (c > 0) + 0.15 * (r() - 0.5) * 2, c }); }
  const m = E2.svm(pts, 'linear', 1e6, 0, r); const yf = pts.map(p => p.c * m.dec(p.x, p.y));
  let best = 0; for (let a = 0; a < Math.PI; a += 0.0005) { const u = [Math.cos(a), Math.sin(a)]; const pr = pts.map(p => [p.c, u[0] * p.x + u[1] * p.y]); const lo = Math.min(...pr.filter(q => q[0] > 0).map(q => q[1])), hi = Math.max(...pr.filter(q => q[0] < 0).map(q => q[1])); const lo2 = Math.min(...pr.filter(q => q[0] < 0).map(q => q[1])), hi2 = Math.max(...pr.filter(q => q[0] > 0).map(q => q[1])); best = Math.max(best, lo - hi, lo2 - hi2); }
  ok2(Math.min(...yf) > 0.999 && Math.abs(2 / Math.hypot(...m.w) - best) < 1e-3, `SVM hard margin ${(2 / Math.hypot(...m.w)).toFixed(4)} equals brute-force max margin ${best.toFixed(4)}`);
  const ring = []; for (let i = 0; i < 60; i++) { const x = r(), y = r(); ring.push({ x, y, c: Math.hypot(x - 0.5, y - 0.5) < 0.25 ? 1 : -1 }); }
  const q = E2.svm(ring, 'poly2', 1000, 0, r), lin = E2.svm(ring, 'linear', 1000, 0, r);
  const errs = mm => ring.filter(p => Math.sign(mm.dec(p.x, p.y)) !== p.c).length;
  ok2(errs(q) === 0 && errs(lin) > 5, `disc data: quadratic kernel separates it (${errs(q)} errors), linear cannot (${errs(lin)} errors)`);
  if (f2) { console.log(f2 + ' FAILED (appended checks)'); process.exitCode = 1; }
}
