require('../assets/js/engines/search.js'); const E = globalThis.AIE, R = E.romania;
const h = s => R.sld[s];
const run = (a) => { const r = E.graphSearch(R, 'Arad', 'Bucharest', a, { h }); return r; };
for (const a of ['bfs','dfs','ucs','greedy','astar']) { const r = run(a); console.log(a.padEnd(7), 'cost', r.cost, 'path', r.path.join('>'), 'expanded', r.expanded); }
const as = run('astar'); console.log('A* expansion order:', as.frames[as.frames.length-1].expanded.join(', '));
const ids = E.iterativeDeepening(R, 'Arad', 'Bucharest', 10); console.log('IDS cost', ids.cost, ids.path.join('>'), 'limit', ids.limit);
const bi = E.bidirectional(R, 'Arad', 'Bucharest'); console.log('Bidir cost', bi.cost, bi.path.join('>'));
// check UCS optimal for all pairs vs Dijkstra (floyd)
const C = R.cities; const D = {}; C.forEach(a => { D[a] = {}; C.forEach(b => D[a][b] = a===b?0:Infinity); }); R.roads.forEach(([a,b,d]) => { D[a][b]=D[b][a]=d; });
C.forEach(k => C.forEach(i => C.forEach(j => { if (D[i][k]+D[k][j] < D[i][j]) D[i][j] = D[i][k]+D[k][j]; })));
let bad = 0; C.forEach(a => C.forEach(b => { const u = E.graphSearch(R, a, b, 'ucs').cost; const bb = E.bidirectional(R, a, b).cost; if (u !== D[a][b] || bb !== D[a][b]) { bad++; console.log('MISMATCH', a, b, u, bb, D[a][b]); } }));
console.log('UCS & bidirectional optimal on all', C.length*C.length, 'pairs; mismatches:', bad);
// A* with SLD admissible & consistent? check h(n) <= c(n,n') + h(n')
let inc = 0; R.roads.forEach(([a,b,d]) => { if (h(a) > d + h(b) || h(b) > d + h(a)) { inc++; console.log('inconsistent', a, b); } });
C.forEach(c => { if (h(c) > D[c]['Bucharest']) console.log('inadmissible', c); });
console.log('SLD consistency violations:', inc, ' true dist Arad->Bucharest', D.Arad.Bucharest);
const P = E.puzzle; const s0 = '724506831'; console.log('8-puzzle 724506831 h1', P.h1(s0), 'h2', P.h2(s0), 'solvable', P.solvable(s0));
for (const hn of ['h2','h1']) { const t = Date.now(); const r = P.solve(s0, hn, 2000000); console.log('A*', hn, 'len', r.path && r.path.length-1, 'expanded', r.expanded, 'ms', Date.now()-t); }
const tb = Date.now(); const rb = P.solve(s0,'bfs'); console.log('BFS len', rb.path && rb.path.length-1, 'expanded', rb.expanded, 'ms', Date.now()-tb);
for (const s of ['24748552','32752411','24415124','32543213']) console.log('GA fitness', s, E.ga.fitness(s));
