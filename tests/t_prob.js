require('../assets/js/engines/search.js'); require('../assets/js/engines/prob.js'); const E = globalThis.AIE;
let q = E.jointQuery(E.dentist, 'Cavity', { Toothache: 'T' }); console.log('P(cavity|toothache)=', q.dist[0].toFixed(3), 'P(toothache)=', (q.t+q.f).toFixed(3));
q = E.jointQuery(E.dentist, 'Cavity', {}); console.log('P(cavity)=', q.dist[0].toFixed(3)); q = E.jointQuery(E.dentist, 'Cavity', { Toothache: 'T', Catch: 'T' }); console.log('P(cavity|toothache,catch)=', q.dist[0].toFixed(4));
const B = E.nets.burglary; const en = E.bn.enumerate(B, 'Burglary', { JohnCalls: true, MaryCalls: true }); const ve = E.bn.eliminate(B, 'Burglary', { JohnCalls: true, MaryCalls: true });
console.log('P(B|j,m) enumeration', en.p.toFixed(4), 'VE', ve.p.toFixed(4)); ve.steps.forEach(s => console.log('  VE:', s.msg.replace(/<[^>]+>/g,'')));
console.log('P(B|j) ', E.bn.enumerate(B, 'Burglary', { JohnCalls: true }).p.toFixed(4), ' P(A|b)', E.bn.enumerate(B,'Alarm',{Burglary:true}).p.toFixed(4), ' P(j)', E.bn.enumerate(B,'JohnCalls',{}).p.toFixed(5));
const S = E.nets.sprinkler; console.log('P(R|s)=', E.bn.enumerate(S, 'Rain', { Sprinkler: true }).p.toFixed(4), ' P(R|s,w)=', E.bn.enumerate(S, 'Rain', { Sprinkler: true, WetGrass: true }).p.toFixed(4), ' P(R|w)=', E.bn.enumerate(S,'Rain',{WetGrass:true}).p.toFixed(4));
const r = E.mulberry(9); for (const m of ['prior','rejection','lw','gibbs']) { const s = E.bn.sampler(S, m, 'Rain', m==='prior'?{}:{ Sprinkler: true, WetGrass: true }, r); const o = s.draw(20000); console.log('sampler', m.padEnd(9), 'est', o.est.toFixed(3), 'kept', o.kept); }
const U = E.hmm.umbrella; const f = E.hmm.forward(U, [0, 0]); console.log('filter day1', f.f[1][0].toFixed(3), 'day2', f.f[2][0].toFixed(3), ' predicted day2', f.pred[2][0].toFixed(3));
const sm = E.hmm.smooth(U, [0, 0]); console.log('smooth P(R1|u1,u2)', sm.s[1][0].toFixed(3), ' backward b2(1) =', sm.b[1].map(x=>x.toFixed(2)).join(','));
console.log('viterbi TTFTT ->', E.hmm.viterbi(U, [0,0,1,0,0]).path.map(i => i===0?'R':'-').join(''));
const w = E.wumpusPits(4, { '1,1': { breeze: false }, '1,2': { breeze: true }, '2,1': { breeze: true } }, 0.2);
console.log('wumpus P(1,3)=', w.prob['1,3'].toFixed(3), 'P(2,2)=', w.prob['2,2'].toFixed(3), 'P(3,1)=', w.prob['3,1'].toFixed(3), 'P(4,4)=', w.prob['4,4'], 'models', w.models.length);
const dsep = (X,Y,Z) => E.bn.paths(B, X, Y, Z).some(p => p.active) ? 'dependent' : 'independent';
console.log('B,E | {}:', dsep('Burglary','Earthquake',[]), ' B,E | A:', dsep('Burglary','Earthquake',['Alarm']), ' B,E | J:', dsep('Burglary','Earthquake',['JohnCalls']), ' J,M | A:', dsep('JohnCalls','MaryCalls',['Alarm']), ' J,M | {}:', dsep('JohnCalls','MaryCalls',[]));
