require('../assets/js/engines/search.js'); require('../assets/js/engines/games.js'); const E = globalThis.AIE;
const t = E.tree.book(); const mm = E.searchTree(t, 'mm'), ab = E.searchTree(t, 'ab');
const lab = id => { const n = E.tree.all(t).find(n => n.id === id); return n.label || ('leaf' + n.v); };
console.log('minimax', mm.value, 'leaves', mm.leavesSeen, '| alphabeta', ab.value, 'leaves', ab.leavesSeen, 'pruned', ab.pruned.map(lab).join(','));
const T = E.ttt; const b = Array(9).fill(null); console.log('ttt empty value', T.value(b), 'moves', JSON.stringify(T.moveValues(b)));
let t0=Date.now(); console.log('minimax nodes from empty', T.count(b,false), Date.now()-t0,'ms'); t0=Date.now(); console.log('alphabeta nodes', T.count(b,true), Date.now()-t0,'ms');
const b2 = ['X',null,null,null,'O',null,null,null,null]; t0=Date.now(); const m = T.mcts(b2, 3000, E.mulberry(7)); console.log('mcts', JSON.stringify(m.stats.slice(0,3)), Date.now()-t0, 'ms');
const C4 = E.c4; const bb = C4.empty(); for (const d of [4,6,7]) { t0=Date.now(); const r = C4.search(bb, 1, d); console.log('c4 depth', d, 'move', r.move, 'nodes', r.nodes, Date.now()-t0,'ms'); }
// expectiminimax random
const tr = E.tree.random(3, 3, 2, 2, 0, 9, ['max','chance','min']); const ex = E.searchTree(tr, 'mm'); console.log('expectimax value', ex.value);
// verify alpha-beta value equals minimax on random trees
let bad=0; for (let s=1;s<300;s++){ const r=E.tree.random(s, 3+(s%2), 2, 3, 0, 20); if (E.searchTree(r,'ab').value !== E.searchTree(r,'mm').value) bad++; } console.log('ab==mm on 299 random trees, mismatches', bad);
