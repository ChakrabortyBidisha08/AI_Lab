require('../assets/js/engines/search.js'); require('../assets/js/engines/logic.js'); const E = globalThis.AIE, L = E.logic, F = E.fol;
const KB = L.parse('¬P11 ∧ (B11 ⇔ (P12 ∨ P21)) ∧ (B21 ⇔ (P11 ∨ P22 ∨ P31)) ∧ ¬B11 ∧ B21');
let r = L.entails(KB, L.parse('¬P12')); console.log('KB |= ¬P12:', r.entails, 'KB models', r.kbModels, 'of', r.total);
r = L.entails(KB, L.parse('P22')); console.log('KB |= P22:', r.entails, ' KB |= ¬P22:', L.entails(KB, L.parse('¬P22')).entails);
console.log('CNF of B11 <=> (P12 v P21):', L.clauses(L.parse('B11 <=> (P12 | P21)')).map(L.clauseStr).join('  ∧  '));
L.cnfSteps(L.parse('B11 <=> (P12 | P21)')).forEach(([t,e]) => console.log('   ', t, ':', L.str(e)));
const kbc = L.clauses(L.parse('(B11 <=> (P12 | P21)) & ~B11')); const res = L.resolution(kbc, L.clauses(L.parse('~~P12')));
console.log('resolution proves ¬P12:', res.proved, 'clauses', res.all.length, 'proof', res.proof.map(i => L.clauseStr(res.all[i].c)).join(' | '));
const d = L.dpll(L.clauses(L.parse('¬P11 ∧ (B11 ⇔ (P12 ∨ P21)) ∧ (B21 ⇔ (P11 ∨ P22 ∨ P31)) ∧ ¬B11 ∧ B21 ∧ P12'))); console.log('DPLL KB ∧ P12 sat?', !!d.model, 'calls', d.calls);
const d2 = L.dpll(L.clauses(KB)); console.log('DPLL KB sat?', JSON.stringify(d2.model));
console.log('parse/str roundtrip:', L.str(L.parse('A => B => C')), '|', L.str(L.parse('(A => B) => C')), '|', L.str(L.parse('~(A & B) | C <=> D')));
const horn = L.parseHorn('P => Q\nL & M => P\nB & L => M\nA & P => L\nA & B => L\nA\nB');
const fc = L.forwardChain(horn, 'Q'); console.log('FC Q:', fc.ok, 'frames', fc.frames.length); const bc = L.backwardChain(horn, 'Q'); console.log('BC Q:', bc.ok, 'nodes', bc.frames[bc.frames.length-1].nodes.map(n=>n.goal+':'+n.status).join(' '));
const U = (a,b) => { const u = F.unify(F.parseTerm(a), F.parseTerm(b)); return u.th ? F.substStr(u.th) : 'fail'; };
[['Knows(John, x)','Knows(John, Jane)'],['Knows(John, x)','Knows(y, Bill)'],['Knows(John, x)','Knows(y, Mother(y))'],['Knows(John, x)','Knows(x, Elizabeth)'],['P(x)','P(F(x))']].forEach(([a,b]) => console.log('UNIFY', a, '|', b, '=>', U(a,b)));
const crime = ['American(x) ∧ Weapon(y) ∧ Sells(x, y, z) ∧ Hostile(z) ⇒ Criminal(x)','Owns(Nono, M1)','Missile(M1)','Missile(x) ∧ Owns(Nono, x) ⇒ Sells(West, x, Nono)','Missile(x) ⇒ Weapon(x)','Enemy(x, America) ⇒ Hostile(x)','American(West)','Enemy(Nono, America)'].map(F.parseRule);
const ff = F.forwardChain(crime, F.parseTerm('Criminal(x)')); ff.rounds.forEach(rd => console.log('FC round', rd.round, rd.added.map(a => F.str(a.fact)).join(', '), rd.hit ? ' HIT '+rd.hit : ''));
const bb = F.backwardChain(crime, F.parseTerm('Criminal(x)')); console.log('BC answers', bb.answers.map(F.substStr), 'tree nodes', bb.tree.length);
// phase transition sanity: n=20
const rnd = E.mulberry(3); for (const ratio of [3, 4.26, 6]) { let sat=0; for (let k=0;k<60;k++){ const cl=L.random3SAT(20, Math.round(20*ratio), rnd); if (L.dpllFast(cl).sat) sat++; } console.log('3-SAT n=20 ratio', ratio, 'P(sat)≈', (sat/60).toFixed(2)); }
// minesweeper: 3x3 with center number 1 and all others unknown
const cells = Array.from({length:9},()=>({open:false})); cells[4] = {open:true, n:1}; const inf = E.mines.infer(cells, 3, 3, 1); console.log('mines prob corner', inf.prob[0].toFixed(3), 'safe', inf.safe.length);
const c2 = Array.from({length:3},()=>({open:false})); c2[0]={open:true,n:1}; const i2=E.mines.infer(c2,3,1,1); console.log('row: cell1 mine?', i2.mine, 'cell2 safe?', i2.safe);
