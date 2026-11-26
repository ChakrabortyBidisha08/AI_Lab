require('../assets/js/engines/search.js'); require('../assets/js/engines/csp.js'); const E = globalThis.AIE;
for (const vo of ['static','mrv','mrvdeg']) for (const inf of ['none','fc','mac']) { const r = E.backtrack(E.australia(), { varOrd: vo, inf, valOrd: 'static' }); console.log(vo.padEnd(6), inf.padEnd(4), 'ok', r.ok, 'backtracks', r.backtracks, 'assigns', r.assigns, JSON.stringify(r.A)); }
// fast sudoku solver to count solutions (bitmask)
function solveCount(g, limit) { const a = g.split('').map(Number); let count = 0; const rows=new Uint16Array(9), cols=new Uint16Array(9), box=new Uint16Array(9); const bx=(r,c)=>((r/3)|0)*3+((c/3)|0);
  for (let i=0;i<81;i++){ if(a[i]){ const m=1<<a[i]; const r=(i/9)|0,c=i%9; if((rows[r]|cols[c]|box[bx(r,c)])&m) return 0; rows[r]|=m; cols[c]|=m; box[bx(r,c)]|=m; } }
  const rec=()=>{ let bi=-1,bc=10,bm=0; for(let i=0;i<81;i++) if(!a[i]){ const r=(i/9)|0,c=i%9; const used=rows[r]|cols[c]|box[bx(r,c)]; let m=0,k=0; for(let d=1;d<=9;d++) if(!(used&(1<<d))){m|=1<<d;k++;} if(k<bc){bc=k;bi=i;bm=m; if(k===0) return;} }
    if(bi<0){count++; return;} const r=(bi/9)|0,c=bi%9; for(let d=1;d<=9;d++) if(bm&(1<<d)){ a[bi]=d; rows[r]|=1<<d; cols[c]|=1<<d; box[bx(r,c)]|=1<<d; rec(); rows[r]&=~(1<<d); cols[c]&=~(1<<d); box[bx(r,c)]&=~(1<<d); a[bi]=0; if(count>=limit) return; } };
  rec(); return count; }
function fullGrid(rnd) { const a = Array(81).fill(0); const ok=(i,d)=>{const r=(i/9)|0,c=i%9; for(let k=0;k<9;k++){ if(a[r*9+k]===d||a[k*9+c]===d) return false;} const br=r-r%3,bc=c-c%3; for(let x=0;x<3;x++)for(let y=0;y<3;y++) if(a[(br+x)*9+bc+y]===d) return false; return true;};
  const rec=i=>{ if(i===81) return true; const ds=[1,2,3,4,5,6,7,8,9].sort(()=>rnd()-0.5); for(const d of ds){ if(ok(i,d)){a[i]=d; if(rec(i+1)) return true; a[i]=0;} } return false; }; rec(0); return a; }
function makePuzzle(seed, target) { const rnd = E.mulberry(seed); const sol = fullGrid(rnd); const a = sol.slice(); const order = [...Array(81).keys()].sort(()=>rnd()-0.5); let clues = 81;
  for (const i of order) { if (clues <= target) break; const keep = a[i]; a[i]=0; if (solveCount(a.join(''),2)!==1) a[i]=keep; else clues--; } return { p: a.join(''), s: sol.join(''), clues }; }
const out = []; for (const [seed, tgt] of [[11,40],[23,32],[37,27],[53,23]]) { const z = makePuzzle(seed, tgt); out.push(z); console.log('puzzle clues', z.clues, z.p, 'unique', solveCount(z.p,2)===1); }
// AC-3 alone + backtracking with MAC on each
for (const z of out) { const csp = E.sudoku(z.p); const ac = E.ac3Trace(csp); const solvedByAC = csp.vars.every(v => ac.D[v].length===1); const r = E.backtrack(csp, { varOrd:'mrv', inf:'mac', maxFrames: 100000 }); const sol = csp.vars.map(v=>r.A[v]).join(''); console.log('clues', z.clues, 'AC3 alone solves:', solvedByAC, 'revisions', ac.revisions, '| MRV+MAC ok', r.ok, 'backtracks', r.backtracks, 'matches', sol===z.s); }
require('fs').writeFileSync('tests/sudoku.json', JSON.stringify(out));
const mc = E.minConflicts(200, E.mulberry(5), 5000); console.log('min-conflicts n=200 ok', mc.ok, 'steps', mc.steps);
