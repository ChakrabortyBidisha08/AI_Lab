/* Chapter 7 labs: Wumpus World (game with logical and probabilistic assistant), logic workbench, Horn chaining, Minesweeper. */
(function (G) {
  'use strict';
  const AI = G.AI, E = G.AIE, esc = AI.esc, L = E.logic;

  /* ---------- wumpus world ---------- */
  const N = 4, key = (x, y) => x + ',' + y, nbrs = (x, y) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].filter(([a, b]) => a >= 1 && b >= 1 && a <= N && b <= N);
  const DIRS = { E: [1, 0], N: [0, 1], W: [-1, 0], S: [0, -1] }, LEFT = { E: 'N', N: 'W', W: 'S', S: 'E' }, RIGHT = { E: 'S', S: 'W', W: 'N', N: 'E' };
  function makeWorld(r, fair) {
    for (let t = 0; t < 400; t++) {
      const sq = []; for (let x = 1; x <= N; x++) for (let y = 1; y <= N; y++) if (!(x === 1 && y === 1)) sq.push(key(x, y));
      const pits = new Set(sq.filter(() => r() < 0.2)), wumpus = AI.pick(sq, r), gold = AI.pick(sq, r);
      const w = { pits, wumpus, gold };
      if (!fair || reachable(w)) return w;
    }
  }
  function reachable(w) { const seen = new Set(['1,1']), q = [[1, 1]]; while (q.length) { const [x, y] = q.shift(); if (key(x, y) === w.gold) return true; nbrs(x, y).forEach(([a, b]) => { const k = key(a, b); if (!seen.has(k) && !w.pits.has(k)) { seen.add(k); q.push([a, b]); } }); } return false; }
  // Inference by enumerating models consistent with the percepts. Pits: independent, prior 0.2. Wumpus: uniform over squares other than [1,1].
  function infer(K) {
    const unknown = []; for (let x = 1; x <= N; x++) for (let y = 1; y <= N; y++) { const k = key(x, y); if (!K.visited.has(k)) unknown.push(k); }
    const front = unknown.filter(k => { const [x, y] = k.split(',').map(Number); return nbrs(x, y).some(([a, b]) => K.visited.has(key(a, b))); });
    const wCand = unknown.filter(k => k !== '1,1');
    const pit = {}, wum = {}; unknown.forEach(k => { pit[k] = 0; wum[k] = 0; }); let Z = 0, models = 0;
    const visited = [...K.visited].map(k => [k, ...k.split(',').map(Number)]);
    for (const w of wCand) {
      const [wx, wy] = w.split(',').map(Number);
      if (!visited.every(([k, x, y]) => (Math.abs(x - wx) + Math.abs(y - wy) === 1) === !!K.per[k].stench)) continue;
      if (!K.shots.every(s => s.line.includes(w) === s.scream)) continue;
      for (let m = 0; m < (1 << front.length); m++) {
        const P = new Set(front.filter((f, i) => m & (1 << i)));
        if (!visited.every(([k, x, y]) => nbrs(x, y).some(([a, b]) => P.has(key(a, b))) === !!K.per[k].breeze)) continue;
        const wt = front.reduce((s, f) => s * (P.has(f) ? 0.2 : 0.8), 1); Z += wt; models++;
        P.forEach(f => pit[f] += wt); wum[w] += wt;
      }
    }
    const out = {}; unknown.forEach(k => { const pp = front.includes(k) ? (Z ? pit[k] / Z : 0) : (k === '1,1' ? 0 : 0.2); const pw = Z ? wum[k] / Z : 0; const wl = K.wumpusDead ? 0 : pw; out[k] = { pit: pp, wumpus: pw, risk: 1 - (1 - pp) * (1 - wl), safe: pp < 1e-12 && wl < 1e-12, pitSure: pp > 1 - 1e-12, wSure: pw > 1 - 1e-12, front: front.includes(k) }; });
    return { sq: out, models };
  }
  AI.lab({
    id: 'wumpus', ch: 7, kind: 'game', title: 'Hunt the wumpus',
    blurb: 'Explore the book’s 4 × 4 cave by its percepts alone. A logical assistant marks squares it can prove safe, and a probabilistic one estimates the risk of the rest.',
    tags: ['wumpus world', 'percepts', 'entailment', 'model checking', 'knowledge-based agent'],
    how: [['The rules (from the book)', '<ul><li>You start in [1,1] facing east. Squares next to a pit are breezy; squares next to the wumpus smell; the gold glitters in its own square.</li><li>Actions: Forward, Turn left, Turn right, Grab, Shoot (one arrow, flies in a straight line), Climb (only from [1,1]).</li><li>Score: +1000 for climbing out with the gold, −1000 for falling into a pit or being eaten, −1 for each action, −10 for using the arrow.</li><li>Keys: ↑ forward, ← → turn, G grab, S shoot, C climb.</li></ul>'],
      ['The assistants', '<p><b>Logic</b> checks every model of the unvisited squares that agrees with your percepts. A square is marked OK only if it is free of pits and a live wumpus in every such model, so the mark is entailed by what you know. <b>Probability</b> weighs the same models with the book’s priors (each square has a pit with probability 0.2; the wumpus is equally likely in any square except [1,1]) to estimate each square’s risk.</p>'],
      ['Watch an agent', '<p>The agent goes to the nearest square that logic proves safe. When none is left it shoots if it knows where the wumpus is, takes the least risky square if the risk is low, or gives up and climbs out.</p>']],
    mount(root, ctx) {
      const st = { assist: 'logic', fair: true };
      const L2 = AI.layout(root);
      const box = AI.el('<div style="position:relative;width:min(100%,560px);aspect-ratio:1;margin:12px auto"></div>'); L2.stage.appendChild(box); L2.stage.classList.add('plain');
      const banner = AI.banner(L2.stage);
      const pad = AI.el('<div class="player" style="justify-content:center"></div>'); L2.stageCol.appendChild(pad);
      const A = (label, fn, cls) => { const b = AI.el(`<button type="button" class="btn ${cls || ''}">${label}</button>`); b.onclick = fn; pad.appendChild(b); return b; };
      A('Turn left', () => act('TurnLeft')); A('Forward', () => act('Forward'), 'primary'); A('Turn right', () => act('TurnRight')); A('Grab', () => act('Grab')); A('Shoot', () => act('Shoot')); A('Climb', () => act('Climb'));
      const pc = AI.panel(L2.side, 'Percepts now'); const per = AI.el('<div style="display:flex;flex-wrap:wrap;gap:6px"></div>'); pc.appendChild(per);
      const ps = AI.panel(L2.side, 'Game'); const stats = AI.stats(ps, [['score', 'score'], ['steps', 'actions'], ['best', 'best score']]);
      AI.controls(ps, [{ t: 'seg', k: 'assist', label: 'Assistant', opts: [['off', 'Off'], ['logic', 'Logic'], ['prob', 'Probability']] }, { t: 'row' }, { t: 'check', k: 'fair', label: 'Only worlds where the gold is reachable' }, { t: 'row' }, { t: 'btn', label: 'New cave', icon: 'dice', cls: 'primary', on: () => fresh() }, { t: 'btn', label: 'Watch the agent', icon: 'play', on: () => auto() }], st, () => draw());
      const pl = AI.panel(L2.side, 'Log'); const log = AI.el('<ul class="log"></ul>'); pl.appendChild(log);
      let W, ag, K, over, score, steps, autoOn = false, inf = null;
      const say = (t, cls) => { log.insertAdjacentHTML('afterbegin', `<li><b style="color:${cls === 'bad' ? 'var(--bad)' : cls === 'ok' ? 'var(--ok)' : 'var(--muted)'}">${steps}</b><span>${t}</span></li>`); };
      function fresh() { autoOn = false; W = makeWorld(Math.random, st.fair); ag = { x: 1, y: 1, dir: 'E', arrow: true, gold: false }; K = { visited: new Set(['1,1']), per: {}, shots: [], wumpusDead: false }; over = false; score = 0; steps = 0; log.innerHTML = ''; sense(false, false); say('You enter the cave at [1,1], facing east.'); draw(); }
      function percept(bump, scream) { const k = key(ag.x, ag.y), [x, y] = [ag.x, ag.y]; return { stench: nbrs(x, y).some(([a, b]) => key(a, b) === W.wumpus), breeze: nbrs(x, y).some(([a, b]) => W.pits.has(key(a, b))), glitter: !ag.gold && W.gold === k, bump, scream }; }
      let cur;
      function sense(bump, scream) { cur = percept(bump, scream); K.per[key(ag.x, ag.y)] = { stench: cur.stench, breeze: cur.breeze }; inf = infer(K); }
      function act(a) {
        if (over) return; steps++; score -= 1; let bump = false, scream = false;
        if (a === 'TurnLeft') ag.dir = LEFT[ag.dir]; else if (a === 'TurnRight') ag.dir = RIGHT[ag.dir];
        else if (a === 'Forward') { const [dx, dy] = DIRS[ag.dir], nx = ag.x + dx, ny = ag.y + dy; if (nx < 1 || ny < 1 || nx > N || ny > N) { bump = true; say('Bump: you walked into a wall.'); } else { ag.x = nx; ag.y = ny; K.visited.add(key(nx, ny)); const k = key(nx, ny); if (W.pits.has(k)) return die('You fell into a pit.'); if (W.wumpus === k && !K.wumpusDead) return die('The wumpus ate you.'); } }
        else if (a === 'Grab') { if (!ag.gold && W.gold === key(ag.x, ag.y)) { ag.gold = true; say('You grab the gold. Now get back to [1,1] and climb.', 'ok'); } else say('Nothing to grab here.'); }
        else if (a === 'Shoot') { if (!ag.arrow) say('You have no arrow left.'); else { ag.arrow = false; score -= 10; const line = []; let [x, y] = [ag.x, ag.y]; const [dx, dy] = DIRS[ag.dir]; for (;;) { x += dx; y += dy; if (x < 1 || y < 1 || x > N || y > N) break; line.push(key(x, y)); } scream = line.includes(W.wumpus); if (scream) K.wumpusDead = true; K.shots.push({ line, scream }); say(scream ? 'A terrible scream: the wumpus is dead.' : 'The arrow hits the wall. No scream, so the wumpus is not in that line.', scream ? 'ok' : ''); } }
        else if (a === 'Climb') { if (ag.x === 1 && ag.y === 1) { over = true; if (ag.gold) score += 1000; say(ag.gold ? 'You climb out with the gold!' : 'You climb out without the gold.', ag.gold ? 'ok' : ''); finish(ag.gold ? 'You escaped with the gold' : 'You escaped empty-handed'); } else say('You can only climb out from [1,1].'); }
        if (!over) sense(bump, scream); draw();
      }
      function die(msg) { score -= 1000; over = true; say(msg, 'bad'); finish(msg); draw(); }
      function finish(t) { autoOn = false; const better = AI.progress.best('wumpus', score); banner(`${t}<small>Score ${score}${better ? ' · new best' : ''}</small>`, 3200); }
      function draw() {
        per.innerHTML = [['Stench', cur.stench], ['Breeze', cur.breeze], ['Glitter', cur.glitter], ['Bump', cur.bump], ['Scream', cur.scream]].map(([n, on]) => `<span class="pill" style="${on ? 'background:var(--ink);color:var(--bg);border-color:var(--ink)' : 'opacity:.55'}">${n}</span>`).join('');
        stats.set('score', score, score < 0 ? 'bad' : score > 0 ? 'good' : ''); stats.set('steps', steps); const b = AI.progress.best('wumpus'); stats.set('best', b == null ? '–' : b);
        const w = box.clientWidth; if (!w) return; const cs = w / N; let s = `<svg viewBox="0 0 ${w} ${w}" width="${w}" height="${w}" style="position:absolute;inset:0">`;
        for (let x = 1; x <= N; x++) for (let y = 1; y <= N; y++) {
          const k = key(x, y), px = (x - 1) * cs, py = (N - y) * cs, vis = K.visited.has(k), show = vis || over;
          s += `<rect x="${px + 3}" y="${py + 3}" width="${cs - 6}" height="${cs - 6}" rx="12" fill="${show ? 'var(--bg)' : 'var(--bg3)'}" stroke="var(--line2)" stroke-width="1.5"/>`;
          s += `<text x="${px + 10}" y="${py + 22}" class="svg-s">[${x},${y}]</text>`;
          if (show) {
            const p = K.per[k] || percept(false, false); const tags = [];
            if (vis && p.breeze) tags.push('Breeze'); if (vis && p.stench) tags.push('Stench');
            tags.forEach((t, i) => { s += `<text x="${px + cs - 10}" y="${py + 22 + i * 16}" text-anchor="end" class="svg-t" style="font-size:12.5px;font-weight:600" fill="${t === 'Breeze' ? 'var(--v-path)' : 'var(--v-chance)'}">${t}</text>`; });
            if (W.pits.has(k)) s += `<ellipse cx="${px + cs / 2}" cy="${py + cs * 0.6}" rx="${cs * 0.3}" ry="${cs * 0.16}" fill="var(--ink)"/><text x="${px + cs / 2}" y="${py + cs * 0.88}" text-anchor="middle" class="svg-t" style="font-weight:700">Pit</text>`;
            if (W.wumpus === k) s += wumpusGlyph(px + cs / 2, py + cs * 0.55, cs * 0.22, K.wumpusDead);
            if (W.gold === k && !ag.gold) s += `<path d="M${px + cs * 0.35} ${py + cs * 0.74}h${cs * 0.3}l${-cs * 0.05} ${-cs * 0.12}h${-cs * 0.2}z" fill="var(--v-frontier)" stroke="var(--warn)" stroke-width="2"/><text x="${px + cs / 2}" y="${py + cs * 0.9}" text-anchor="middle" class="svg-t" style="font-weight:700">Gold</text>`;
          } else if (st.assist !== 'off' && inf) {
            const q = inf.sq[k]; if (!q) continue;
            if (st.assist === 'logic') { const t = q.safe ? 'OK' : q.pitSure ? 'Pit!' : q.wSure && !K.wumpusDead ? 'Wumpus!' : q.front ? (q.pit > 0 && (q.wumpus > 0 && !K.wumpusDead) ? 'P? W?' : q.pit > 0 ? 'P?' : 'W?') : ''; if (t) s += `<text x="${px + cs / 2}" y="${py + cs / 2 + 8}" text-anchor="middle" class="svg-b" style="font-size:${cs * 0.2}px" fill="${q.safe ? 'var(--ok)' : 'var(--bad)'}">${t}</text>`; }
            else { s += `<text x="${px + cs / 2}" y="${py + cs / 2 + 2}" text-anchor="middle" class="svg-b" style="font-size:${cs * 0.2}px" fill="${q.risk < 0.05 ? 'var(--ok)' : q.risk > 0.5 ? 'var(--bad)' : 'var(--warn)'}">${Math.round(q.risk * 100)}%</text><text x="${px + cs / 2}" y="${py + cs / 2 + 22}" text-anchor="middle" class="svg-s">pit ${Math.round(q.pit * 100)}% · w ${Math.round((K.wumpusDead ? 0 : q.wumpus) * 100)}%</text>`; }
          }
        }
        const ax = (ag.x - 0.5) * cs, ay = (N - ag.y + 0.5) * cs, r = cs * 0.2, ang = { E: 0, N: -90, W: 180, S: 90 }[ag.dir];
        if (!over || ag.x) s += `<g transform="translate(${ax} ${ay}) rotate(${ang})"><circle r="${r * 1.25}" fill="var(--v-path)" opacity=".18"/><path d="M${r * 1.2} 0L${-r * 0.8} ${r * 0.85}L${-r * 0.4} 0L${-r * 0.8} ${-r * 0.85}Z" fill="var(--v-path)" stroke="var(--bg)" stroke-width="2"/></g>`;
        if (ag.gold) s += `<text x="${ax}" y="${ay + r * 2.2}" text-anchor="middle" class="svg-s" style="font-weight:700">carrying gold</text>`;
        box.innerHTML = s + '</svg>';
      }
      const wumpusGlyph = (x, y, r, dead) => `<g opacity="${dead ? 0.45 : 1}"><ellipse cx="${x}" cy="${y + r * 0.2}" rx="${r * 1.2}" ry="${r}" fill="var(--v-bad)"/><circle cx="${x - r * 0.4}" cy="${y - r * 0.1}" r="${r * 0.22}" fill="#fff"/><circle cx="${x + r * 0.4}" cy="${y - r * 0.1}" r="${r * 0.22}" fill="#fff"/><path d="M${x - r * 0.5} ${y + r * 0.5}l${r * 0.25} ${-r * 0.22}l${r * 0.25} ${r * 0.22}l${r * 0.25} ${-r * 0.22}l${r * 0.25} ${r * 0.22}" stroke="#fff" stroke-width="2" fill="none"/>${dead ? `<path d="M${x - r * 1.3} ${y - r}L${x + r * 1.3} ${y + r * 1.2}" stroke="var(--ink)" stroke-width="3"/>` : ''}</g>`;
      // simple hybrid agent
      function plan(target, allowed) { const start = key(ag.x, ag.y); const q = [start], par = { [start]: null }; while (q.length) { const c = q.shift(); if (c === target) break; const [x, y] = c.split(',').map(Number); nbrs(x, y).forEach(([a, b]) => { const k = key(a, b); if (!(k in par) && (allowed.has(k) || k === target)) { par[k] = c; q.push(k); } }); } if (!(target in par)) return null; const p = []; let c = target; while (c) { p.unshift(c); c = par[c]; } return p; }
      function actionsTo(path) { const acts = []; let d = ag.dir, [x, y] = [ag.x, ag.y]; for (const k of path.slice(1)) { const [nx, ny] = k.split(',').map(Number); const want = Object.keys(DIRS).find(D => DIRS[D][0] === nx - x && DIRS[D][1] === ny - y); while (d !== want) { if (LEFT[d] === want) { acts.push('TurnLeft'); d = want; } else { acts.push('TurnRight'); d = RIGHT[d]; } } acts.push('Forward'); x = nx; y = ny; } return acts; }
      let queue = [];
      function decide() {
        if (cur.glitter) return ['Grab'];
        const safe = new Set([...K.visited]); Object.entries(inf.sq).forEach(([k, q]) => { if (q.safe) safe.add(k); });
        if (ag.gold) { if (ag.x === 1 && ag.y === 1) return ['Climb']; const p = plan('1,1', K.visited); return actionsTo(p); }
        const targets = Object.entries(inf.sq).filter(([, q]) => q.safe).map(([k]) => k);
        let best = null; for (const t of targets) { const p = plan(t, safe); if (p && (!best || p.length < best.length)) best = p; }
        if (best) return actionsTo(best);
        const wk = Object.entries(inf.sq).find(([, q]) => q.wSure); if (wk && ag.arrow && !K.wumpusDead) { const [wx, wy] = wk[0].split(',').map(Number); for (const v of K.visited) { const [x, y] = v.split(',').map(Number); if (x === wx || y === wy) { const p = plan(v, K.visited); if (!p) continue; const acts = actionsTo(p); let d = ag.dir; acts.forEach(a => { if (a === 'TurnLeft') d = LEFT[d]; if (a === 'TurnRight') d = RIGHT[d]; }); const want = x === wx ? (wy > y ? 'N' : 'S') : (wx > x ? 'E' : 'W'); while (d !== want) { if (LEFT[d] === want) { acts.push('TurnLeft'); d = want; } else { acts.push('TurnRight'); d = RIGHT[d]; } } acts.push('Shoot'); return acts; } } }
        const risky = Object.entries(inf.sq).filter(([, q]) => q.front).sort((a, b) => a[1].risk - b[1].risk)[0];
        if (risky && risky[1].risk <= 0.35) { const p = plan(risky[0], K.visited); if (p) { say(`No square is provably safe. Taking the least risky one, ${risky[0]} (${Math.round(risky[1].risk * 100)}%).`); return actionsTo(p); } }
        if (ag.x === 1 && ag.y === 1) return ['Climb']; return actionsTo(plan('1,1', K.visited));
      }
      function auto() { if (over) fresh(); autoOn = true; queue = []; tick(); }
      function tick() { if (!autoOn || over) return; if (!queue.length) queue = decide() || ['Climb']; act(queue.shift()); ctx.after(380, tick); }
      ctx.key(e => { if (e.key === 'ArrowUp') { e.preventDefault(); act('Forward'); } else if (e.key === 'ArrowLeft') { e.preventDefault(); act('TurnLeft'); } else if (e.key === 'ArrowRight') { e.preventDefault(); act('TurnRight'); } else if (/^[gG]$/.test(e.key)) act('Grab'); else if (/^[sS]$/.test(e.key)) act('Shoot'); else if (/^[cC]$/.test(e.key)) act('Climb'); });
      ctx.resize(box, draw); ctx.theme(draw); fresh();
    }
  });

  /* ---------- logic workbench ---------- */
  const PRESETS = [
    ['Wumpus world, R1–R5 (book)', '¬P11 ∧ (B11 ⇔ (P12 ∨ P21)) ∧ (B21 ⇔ (P11 ∨ P22 ∨ P31)) ∧ ¬B11 ∧ B21', '¬P12'],
    ['Wumpus world: is there no pit in [2,2]?', '¬P11 ∧ (B11 ⇔ (P12 ∨ P21)) ∧ (B21 ⇔ (P11 ∨ P22 ∨ P31)) ∧ ¬B11 ∧ B21', '¬P22'],
    ['Modus ponens', 'P ∧ (P ⇒ Q)', 'Q'],
    ['Affirming the consequent (a fallacy)', 'Q ∧ (P ⇒ Q)', 'P'],
    ['Contrapositive', 'P ⇒ Q', '¬Q ⇒ ¬P'],
    ['Knights and knaves: A says “B is a knave”; B says “we are both knights”', '(A ⇔ ¬B) ∧ (B ⇔ (A ∧ B))', 'A ∧ ¬B']
  ];
  AI.lab({
    id: 'logic-workbench', ch: 7, kind: 'demo', title: 'Logic workbench',
    blurb: 'Type a knowledge base and a query. Check entailment with a truth table, convert to CNF, prove it by resolution, or test it with DPLL.',
    tags: ['entailment', 'truth table', 'CNF', 'resolution', 'DPLL', 'satisfiability'],
    how: [['Writing sentences', '<p>Use ¬ or ~ for not, ∧ or &amp; for and, ∨ or | for or, ⇒ or =&gt; for implies, ⇔ or &lt;=&gt; for if and only if. Symbols are letters and digits, such as P12 for a pit in [1,2].</p>'],
      ['Three ways to the same answer', '<p><b>Truth table</b>: KB ⊨ α if α is true in every row where KB is true. <b>Resolution</b>: KB ⊨ α if KB ∧ ¬α resolves to the empty clause. <b>DPLL</b>: KB ⊨ α if KB ∧ ¬α is unsatisfiable. All three agree on every preset.</p>'],
      ['The book’s example', '<p>With R1 to R5 there are 7 symbols, so 128 models. KB is true in exactly 3 of them, and ¬P1,2 holds in all 3, so KB ⊨ ¬P1,2. But P2,2 is true in some of the 3 and false in others, so neither P2,2 nor ¬P2,2 is entailed.</p>']],
    mount(root, ctx) {
      const st = { kb: PRESETS[0][1], q: PRESETS[0][2], tab: 'tt', preset: 0, onlyKB: false };
      const wrap = AI.el('<div></div>'); root.appendChild(wrap);
      const top = AI.panel(wrap, 'Knowledge base and query');
      const refs = AI.controls(top, [{ t: 'select', k: 'preset', label: 'Preset', opts: PRESETS.map((p, i) => [i, p[0]]), grow: true }, { t: 'row' }, { t: 'text', k: 'kb', label: 'KB', grow: true, live: true }, { t: 'row' }, { t: 'text', k: 'q', label: 'Query α', grow: true, live: true }, { t: 'row' }, { t: 'seg', k: 'tab', opts: [['tt', 'Truth table'], ['cnf', 'CNF steps'], ['res', 'Resolution'], ['dpll', 'DPLL']] }], st, k => { if (k === 'preset') { st.kb = PRESETS[st.preset][1]; st.q = PRESETS[st.preset][2]; refs.kb.value = st.kb; refs.q.value = st.q; } run(); });
      const verdict = AI.el('<div class="callout" style="margin-top:12px"></div>'); top.appendChild(verdict);
      const out = AI.el('<div style="margin-top:14px"></div>'); wrap.appendChild(out);
      let dctx = null;
      function run() {
        if (dctx) { dctx.destroy(); dctx = null; }
        let kb, a; try { kb = L.parse(st.kb); a = L.parse(st.q); } catch (e) { verdict.innerHTML = `<b>Cannot read that.</b> ${esc(e.message)}.`; out.innerHTML = ''; return; }
        const syms = [...new Set([...L.symbols(kb), ...L.symbols(a)])].sort();
        if (syms.length > 12) { verdict.innerHTML = '<b>Too many symbols.</b> Use 12 or fewer here.'; out.innerHTML = ''; return; }
        const r = L.entails(kb, a);
        verdict.innerHTML = r.entails ? `<b style="color:var(--ok)">KB ⊨ α.</b> α is true in all ${r.kbModels} model${r.kbModels === 1 ? '' : 's'} of the KB (out of ${r.total}).` : r.kbModels === 0 ? '<b>The KB has no models</b> (it is unsatisfiable), so it entails everything.' : `<b style="color:var(--bad)">KB does not entail α.</b> In ${esc(Object.entries(r.counter).map(([k, v]) => `${k} = ${v ? 'T' : 'F'}`).join(', '))}, the KB is true but α is false.`;
        out.innerHTML = '';
        if (st.tab === 'tt') {
          const ctl = AI.el('<label class="switch" style="max-width:360px;margin-bottom:8px"><span>Show only rows where KB is true</span><input type="checkbox" role="switch"></label>'); out.appendChild(ctl); const cb = ctl.querySelector('input'); cb.checked = st.onlyKB; cb.onchange = () => { st.onlyKB = cb.checked; run(); };
          const rows = L.models(syms).map(m => { const k = L.ev(kb, m), v = L.ev(a, m); if (st.onlyKB && !k) return ''; return `<tr class="${k && !v ? '' : k ? 'hl' : 'dim'}" ${k && !v ? 'style="background:color-mix(in srgb,var(--bad) 14%,transparent)"' : ''}>${syms.map(s => `<td class="r">${m[s] ? 'T' : 'F'}</td>`).join('')}<td class="r"><b>${k ? 'T' : 'F'}</b></td><td class="r"><b>${v ? 'T' : 'F'}</b></td></tr>`; });
          out.insertAdjacentHTML('beforeend', `<p class="tip">Highlighted rows are the models of the KB. ${syms.length > 7 ? `${1 << syms.length} rows in total.` : ''}</p>` + AI.table(syms.map(s => 'r:' + s).concat(['r:KB', 'r:α']), rows, 'compact'));
        } else if (st.tab === 'cnf') {
          const steps = L.cnfSteps(L.conj([kb, { t: 'not', a }]));
          out.innerHTML = `<p class="tip">Converting KB ∧ ¬α, the sentence that resolution and DPLL work on.</p>` + steps.map(([t, e]) => `<div class="panel" style="margin-bottom:8px"><b class="small">${esc(t)}</b><div class="formula" style="margin:6px 0 0;white-space:pre-wrap">${esc(L.str(e))}</div></div>`).join('') + `<div class="panel"><b class="small">Clauses (after removing duplicates and tautologies)</b><div class="formula" style="white-space:pre-wrap">${L.clauses(L.conj([kb, { t: 'not', a }])).map(c => '(' + L.clauseStr(c) + ')').join('\n')}</div></div>`;
        } else if (st.tab === 'res') {
          const r2 = L.resolution(L.clauses(kb), L.clauses({ t: 'not', a }), 1500);
          const label = i => `C${i + 1}`;
          const proof = r2.proof || []; const show = r2.proved ? proof : r2.all.map((_, i) => i).slice(0, 60);
          out.innerHTML = `<p class="tip">${r2.proved ? `The empty clause appeared after ${r2.all.length} clauses in total. Below is just the proof: the clauses it uses, in order.` : r2.gaveUp ? 'Stopped after 1,500 clauses without finding the empty clause.' : `No new clauses can be made (${r2.all.length} clauses in total), and the empty clause never appeared: KB does not entail α.`}</p>` + AI.table(['#', 'Clause', 'From'], show.map(i => { const c = r2.all[i]; return `<tr class="${!c.c.length ? 'hl' : ''}"><td>${label(i)}</td><td class="mono">${esc(L.clauseStr(c.c))}</td><td>${c.parents ? `resolve ${label(c.parents[0])} and ${label(c.parents[1])}` : c.from === '¬α' ? 'negated query' : 'KB'}</td></tr>`; }), 'compact');
        } else {
          const cl = L.clauses(L.conj([kb, { t: 'not', a }]));
          const host = AI.el('<div class="lab even"><div class="panel"></div><div class="side"></div></div>'); out.appendChild(host);
          const left = host.firstElementChild, right = host.lastElementChild;
          left.insertAdjacentHTML('beforeend', '<h3 style="margin:0 0 8px">Is KB ∧ ¬α satisfiable?</h3>'); const mv = AI.el('<div class="explain"></div>'); left.appendChild(mv); const model = AI.el('<div style="margin-top:10px"></div>'); left.appendChild(model);
          dctx = AI.makeCtx(); const d = L.dpll(cl);
          const pp = AI.panel(right, 'Pseudocode'); const ps = AI.pseudo(pp, ['function DPLL(clauses, symbols, model)', '  if every clause is true: return true', '  if some clause is false: return false', '  P ← FIND-PURE-SYMBOL: set it and recurse', '  P ← FIND-UNIT-CLAUSE: set it and recurse', '  P ← first symbol: try P = true …', '  … and if that fails, P = false', '(no branch worked: unsatisfiable)']);
          const pl = AI.Player(left, dctx, f => { ps.hl(f.line); mv.innerHTML = f.msg; model.innerHTML = `<p class="small muted" style="margin:0 0 4px">Partial model</p><div class="chips">${d.symbols.map(s => `<span class="chip" style="${s in f.m ? `background:${f.m[s] ? 'var(--ok)' : 'var(--bad)'};color:#fff;border-color:transparent` : ''}">${esc(s)}${s in f.m ? ' = ' + (f.m[s] ? 'T' : 'F') : ''}</span>`).join('')}</div>`; });
          pl.set(d.frames);
          left.insertAdjacentHTML('beforeend', `<p class="tip" style="margin-top:10px">${d.model ? 'Satisfiable, so KB does <b>not</b> entail α: the model found is a counterexample.' : 'Unsatisfiable, so KB ⊨ α.'} DPLL made ${d.calls} recursive call${d.calls === 1 ? '' : 's'}.</p>`);
        }
      }
      ctx.cleanup(() => dctx && dctx.destroy());
      run();
    }
  });

  /* ---------- Horn clauses: forward and backward chaining ---------- */
  AI.lab({
    id: 'horn-chaining', ch: 7, kind: 'demo', title: 'Forward and backward chaining',
    blurb: 'Run forward chaining (data-driven) and backward chaining (goal-driven) on the book’s Horn-clause knowledge base, or your own.',
    tags: ['Horn clauses', 'forward chaining', 'backward chaining', 'AND–OR graph', 'agenda'],
    how: [['The book’s KB', '<p>P ⇒ Q, L ∧ M ⇒ P, B ∧ L ⇒ M, A ∧ P ⇒ L, A ∧ B ⇒ L, and the facts A and B. Query: Q. Forward chaining fires A ∧ B ⇒ L, then B ∧ L ⇒ M, then L ∧ M ⇒ P, then P ⇒ Q.</p>'],
      ['Forward chaining', '<p>Each rule keeps a count of premises not yet known. Popping a symbol from the agenda decreases the counts of the rules it appears in; a rule whose count reaches 0 adds its conclusion to the agenda. It runs in time linear in the size of the KB.</p>'],
      ['Backward chaining', '<p>Start from the query and work back through rules that conclude it. A goal already on the current chain is skipped, which is why the rule A ∧ P ⇒ L fails here: proving L that way would need P, which is what we are already trying to prove.</p>']],
    mount(root, ctx) {
      const st = { kb: 'P ⇒ Q\nL ∧ M ⇒ P\nB ∧ L ⇒ M\nA ∧ P ⇒ L\nA ∧ B ⇒ L\nA\nB', q: 'Q', mode: 'fc' };
      const Lt = AI.layout(root);
      const box = AI.el('<div style="position:relative;aspect-ratio:1.5;min-height:300px"></div>'); Lt.stage.appendChild(box);
      let kb = L.parseHorn(st.kb), frame = null;
      const sv = AI.svgHost(box, ctx, (w, h) => drawGraph(w, h));
      AI.legend(Lt.stageCol, [['var(--v-goal)', 'Known true', 1], ['var(--v-frontier)', 'On the agenda / being proved', 1], ['var(--v-node)', 'Unknown', 1]]);
      const pc = AI.panel(Lt.side, 'Knowledge base');
      const ta = AI.el('<textarea rows="7" aria-label="Horn clauses, one per line"></textarea>'); ta.value = st.kb; pc.appendChild(ta);
      AI.controls(pc, [{ t: 'text', k: 'q', label: 'Query' }, { t: 'seg', k: 'mode', label: 'Method', opts: [['fc', 'Forward'], ['bc', 'Backward']] }], st, () => build());
      ta.addEventListener('input', AI.debounce(() => { st.kb = ta.value; build(); }, 400));
      const pp = AI.panel(Lt.side, 'Pseudocode'); let pseudo;
      const pe = AI.panel(Lt.side, 'What just happened'); const ex = AI.el('<div class="explain"></div>'); pe.appendChild(ex);
      const pa = AI.panel(Lt.below, 'Agenda and counts'); const ag = AI.el('<div></div>'); pa.appendChild(ag);
      const player = AI.Player(Lt.stageCol, ctx, f => { frame = f; sv.redraw(); pseudo.hl(f.line); ex.innerHTML = f.msg; if (st.mode === 'fc') ag.innerHTML = `<p class="small" style="margin:0 0 6px"><b>Agenda:</b> ${f.agenda.map(esc).join(', ') || '—'}</p>` + AI.table(['Rule', 'r:Count'], kb.map((c, i) => c.prem.length ? `<tr class="${f.fired && f.fired.includes(i) ? 'hl' : ''}"><td class="mono">${esc(L.hornStr(c))}</td><td class="r">${f.count[i]}</td></tr>` : '').filter(Boolean), 'compact'); else ag.innerHTML = '<ul style="margin:0;padding-left:18px">' + f.nodes.map(n => `<li style="margin-left:${depthOf(f.nodes, n) * 14}px">${esc(n.goal)} <span class="muted small">${{ yes: 'proved', no: 'failed', loop: 'loop, skipped', open: 'working' }[n.status]}${n.rule && n.rule !== 'fact' ? ' via ' + esc(n.rule) : n.rule === 'fact' ? ' (fact)' : ''}</span></li>`).join('') + '</ul>'; });
      const depthOf = (nodes, n) => { let d = 0; while (n.parent != null) { n = nodes[n.parent]; d++; } return d; };
      function levels() { const lv = {}; kb.forEach(c => { if (!c.prem.length) lv[c.concl] = 0; }); for (let it = 0; it < 20; it++) kb.forEach(c => { if (c.prem.length && c.prem.every(p => lv[p] !== undefined)) { const v = 1 + Math.max(...c.prem.map(p => lv[p])); if (lv[c.concl] === undefined || v < lv[c.concl]) lv[c.concl] = v; } }); const syms = [...new Set(kb.flatMap(c => c.prem.concat(c.concl)))]; let mx = Math.max(0, ...Object.values(lv)); syms.forEach(s => { if (lv[s] === undefined) lv[s] = ++mx; }); return lv; }
      function drawGraph(w, h) {
        const lv = levels(), syms = Object.keys(lv), maxL = Math.max(...Object.values(lv)), pos = {};
        for (let l = 0; l <= maxL; l++) { const row = syms.filter(s => lv[s] === l).sort(); row.forEach((s, i) => pos[s] = [w * (i + 1) / (row.length + 1), h - 34 - (h - 70) * (maxL ? l / maxL : 0)]); }
        let s = AI.arrowDefs('hc', 'var(--v-edge)');
        kb.forEach(c => { if (!c.prem.length) return; const [cx, cy] = pos[c.concl]; c.prem.forEach(p => { const [px, py] = pos[p]; s += `<line x1="${px}" y1="${py - 16}" x2="${cx}" y2="${cy + 17}" stroke="var(--v-edge)" stroke-width="1.8" marker-end="url(#hc)" style="color:var(--v-edge)"/>`; }); if (c.prem.length > 1) { const pts = c.prem.map(p => { const [px, py] = pos[p]; const t = 0.3; return [cx + (px - cx) * t, cy + 17 + (py - 16 - cy - 17) * t]; }); s += `<path d="M${pts[0][0]} ${pts[0][1]}Q${cx} ${pts[0][1] + 14} ${pts[pts.length - 1][0]} ${pts[pts.length - 1][1]}" fill="none" stroke="var(--ink2)" stroke-width="2"/>`; } });
        const f = frame || {};
        syms.forEach(sy => { const [x, y] = pos[sy]; let fill = 'var(--v-node)'; if (st.mode === 'fc') { if (f.inferred && f.inferred[sy]) fill = 'var(--v-goal)'; else if (f.agenda && f.agenda.includes(sy)) fill = 'var(--v-frontier)'; if (f.p === sy) fill = 'var(--v-current)'; } else if (f.nodes) { const ns = f.nodes.filter(n => n.goal === sy); if (ns.some(n => n.status === 'yes')) fill = 'var(--v-goal)'; else if (ns.some(n => n.status === 'open')) fill = 'var(--v-frontier)'; else if (ns.length) fill = 'var(--bg3)'; const curN = f.nodes[f.cur]; if (curN && curN.goal === sy) fill = 'var(--v-current)'; }
          s += `<circle cx="${x}" cy="${y}" r="17" fill="${fill}" stroke="var(--ink)" stroke-width="2"/><text x="${x}" y="${y + 5}" text-anchor="middle" class="svg-b" style="font-size:15px">${esc(sy)}</text>`; });
        return s;
      }
      function build() {
        try { kb = L.parseHorn(st.kb); if (!kb.length) throw new Error('empty'); } catch (e) { ex.textContent = 'Write one Horn clause per line, such as “A ∧ B ⇒ C” or a fact like “A”.'; return; }
        pp.querySelector('.pseudo') && pp.querySelector('.pseudo').remove();
        if (st.mode === 'fc') { pseudo = AI.pseudo(pp, ['function PL-FC-ENTAILS?(KB, q)', '  count[c] ← number of premises of c', '  agenda ← the known facts', '  while agenda is not empty do', '    p ← POP(agenda); if p = q: return true', '    if inferred[p] is true: skip it', '    inferred[p] ← true', '    for each c with p in its premise: count[c]−1', '    if count[c] = 0: add c’s conclusion', '  return false']); const r = L.forwardChain(kb, st.q.trim()); const map = { 1: 3, 4: 5, 5: 6, 7: 8, 9: 10 }; player.set(r.frames.map(fr => Object.assign({}, fr, { line: map[fr.line] || fr.line }))); }
        else { pseudo = AI.pseudo(pp, ['function BC(goal)', '  if goal was proved before: return true', '  if goal is already on the chain: fail', '  for each rule whose conclusion is goal', '    if it is a fact: return true', '    prove every premise by BC', '    …', '    if all succeed: return true', '    otherwise try the next rule', '  return false', 'answer for the query']); const r = L.backwardChain(kb, st.q.trim()); player.set(r.frames); }
      }
      build();
    }
  });

  /* ---------- Minesweeper with an inference assistant ---------- */
  AI.lab({
    id: 'minesweeper', ch: 7, kind: 'game', title: 'Minesweeper with a logical assistant',
    blurb: 'Clear the field without hitting a mine. The assistant proves which squares are safe or mined, and estimates the odds when logic runs out.',
    tags: ['inference', 'model checking', 'constraint propagation', 'probability'],
    how: [['How to play', '<ul><li>Click to open a square; the number is how many of its eight neighbours hide mines. Right-click (or switch on flag mode) to flag a mine.</li><li>Your first click is always safe.</li></ul>'],
      ['How the assistant reasons', '<p>Each number is a constraint on its unopened neighbours. The assistant enumerates every arrangement of mines along the edge of the opened area that satisfies all the numbers. A square that is clear in every arrangement is <b>entailed</b> to be safe, exactly like model checking in this chapter. Weighting arrangements by how many ways the remaining mines fit elsewhere gives each square’s probability of hiding a mine.</p>']],
    mount(root, ctx) {
      const st = { size: 9, flag: false, show: 'logic' };
      const Lm = AI.layout(root);
      const box = AI.el('<div style="position:relative;width:min(100%,560px);margin:14px auto;touch-action:manipulation"></div>'); Lm.stage.appendChild(box); Lm.stage.classList.add('plain');
      const banner = AI.banner(Lm.stage);
      const pc = AI.panel(Lm.side, 'Game');
      AI.controls(pc, [{ t: 'select', k: 'size', label: 'Board', opts: [[9, '9 × 9, 10 mines'], [12, '12 × 12, 22 mines'], [16, '16 × 16, 40 mines']] }, { t: 'seg', k: 'show', label: 'Assistant', opts: [['off', 'Off'], ['logic', 'Logic'], ['prob', 'Odds']] }, { t: 'row' }, { t: 'check', k: 'flag', label: 'Flag mode (for touch screens)' }, { t: 'row' }, { t: 'btn', label: 'New game', icon: 'reset', cls: 'primary', on: () => fresh() }, { t: 'btn', label: 'Let the AI move', icon: 'bulb', on: () => aiMove() }], st, k => { if (k === 'size') fresh(); else draw(); });
      const ps = AI.panel(Lm.side, 'Status'); const stats = AI.stats(ps, [['left', 'mines left'], ['safe', 'proved safe'], ['wins', 'wins']]);
      const pe = AI.panel(Lm.side, 'Assistant says'); const ex = AI.el('<div class="explain small"></div>'); pe.appendChild(ex);
      let Wd, M, cells, first, over, inf, aiMoves;
      const MINES = { 9: 10, 12: 22, 16: 40 };
      function fresh() { Wd = st.size; M = MINES[Wd]; cells = AI.range(Wd * Wd).map(() => ({ open: false, mine: false, flag: false, n: 0 })); first = true; over = false; aiMoves = 0; inf = null; ex.textContent = 'Open any square to begin. The first click is always safe.'; draw(); }
      const nb = i => { const x = i % Wd, y = (i / Wd) | 0, o = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < Wd && b < Wd) o.push(b * Wd + a); } return o; };
      function place(safe) { const banned = new Set([safe, ...nb(safe)]); const free = AI.range(Wd * Wd).filter(i => !banned.has(i)); AI.shuffle(free).slice(0, M).forEach(i => cells[i].mine = true); cells.forEach((c, i) => c.n = nb(i).filter(j => cells[j].mine).length); }
      function open(i) {
        if (over || cells[i].open || cells[i].flag) return; if (first) { place(i); first = false; }
        if (cells[i].mine) { over = true; cells.forEach(c => { if (c.mine) c.open = true; }); cells[i].boom = true; draw(); banner('Boom. You hit a mine.', 2400); return; }
        const q = [i]; while (q.length) { const k = q.pop(); if (cells[k].open) continue; cells[k].open = true; cells[k].flag = false; if (cells[k].n === 0) nb(k).forEach(j => { if (!cells[j].open && !cells[j].mine) q.push(j); }); }
        if (cells.filter(c => !c.open).length === M) { over = true; const w = AI.store.get('mines-wins-' + Wd, 0) + 1; AI.store.set('mines-wins-' + Wd, w); banner(`Cleared!${aiMoves ? `<small>The AI made ${aiMoves} of the moves</small>` : ''}`, 2600); }
        draw();
      }
      function think() { if (first || over) { inf = null; return; } inf = E.mines.infer(cells.map(c => ({ open: c.open, n: c.n })), Wd, Wd, M); }
      function aiMove() {
        if (over) return; if (first) { open(((Wd * Wd) / 2) | 0); aiMoves++; ex.textContent = 'The AI opened the centre: the first click is always safe.'; return; }
        think(); if (!inf || !inf.exact) { ex.textContent = 'The open edge is too long to enumerate exactly here; play a few squares yourself.'; return; }
        const safe = inf.safe.filter(i => !cells[i].open); aiMoves++;
        if (safe.length) { open(safe[0]); ex.innerHTML = `Opened a square that is <b>provably safe</b>: no consistent arrangement puts a mine there.`; return; }
        const cand = Object.entries(inf.prob).filter(([i]) => !cells[+i].open && !cells[+i].flag).sort((a, b) => a[1] - b[1])[0];
        ex.innerHTML = `No square is provably safe, so the AI has to guess. It picks the one with the lowest mine probability (${Math.round(cand[1] * 100)}%).`; open(+cand[0]);
      }
      function draw() {
        think();
        const w = box.clientWidth || 480, cs = w / Wd; box.style.height = w + 'px';
        let s = `<svg viewBox="0 0 ${w} ${w}" width="${w}" height="${w}" style="position:absolute;inset:0;user-select:none">`;
        const COL = ['', 'var(--v-path)', 'var(--ok)', 'var(--bad)', 'var(--v-chance)', 'var(--warn)', 'var(--p6)', 'var(--ink)', 'var(--muted)'];
        cells.forEach((c, i) => {
          const x = (i % Wd) * cs, y = ((i / Wd) | 0) * cs;
          s += `<rect x="${x + 1}" y="${y + 1}" width="${cs - 2}" height="${cs - 2}" rx="${cs * 0.14}" fill="${c.open ? (c.boom ? 'var(--bad)' : 'var(--bg)') : 'var(--bg3)'}" stroke="var(--line2)" data-i="${i}"/>`;
          if (c.open && c.mine) s += `<circle cx="${x + cs / 2}" cy="${y + cs / 2}" r="${cs * 0.22}" fill="var(--ink)" pointer-events="none"/>`;
          else if (c.open && c.n) s += `<text x="${x + cs / 2}" y="${y + cs * 0.68}" text-anchor="middle" class="svg-b" style="font-size:${cs * 0.5}px" fill="${COL[c.n]}" pointer-events="none">${c.n}</text>`;
          else if (!c.open && c.flag) s += `<path d="M${x + cs * 0.38} ${y + cs * 0.78}V${y + cs * 0.22}L${x + cs * 0.72} ${y + cs * 0.36}L${x + cs * 0.38} ${y + cs * 0.5}" fill="var(--bad)" stroke="var(--ink)" stroke-width="2" pointer-events="none"/>`;
          else if (!c.open && inf && inf.exact && st.show !== 'off') { const p = inf.prob[i]; if (p === undefined) return; if (st.show === 'logic') { if (p < 1e-9) s += `<circle cx="${x + cs / 2}" cy="${y + cs / 2}" r="${cs * 0.16}" fill="var(--ok)" pointer-events="none"/>`; else if (p > 1 - 1e-9) s += `<text x="${x + cs / 2}" y="${y + cs * 0.64}" text-anchor="middle" class="svg-b" style="font-size:${cs * 0.42}px" fill="var(--bad)" pointer-events="none">!</text>`; } else if (cs > 26) s += `<text x="${x + cs / 2}" y="${y + cs * 0.6}" text-anchor="middle" class="svg-m" style="font-size:${Math.min(13, cs * 0.3)}px" fill="${p < 0.05 ? 'var(--ok)' : p > 0.5 ? 'var(--bad)' : 'var(--ink2)'}" pointer-events="none">${Math.round(p * 100)}</text>`; }
        });
        box.innerHTML = s + '</svg>';
        stats.set('left', M - cells.filter(c => c.flag).length); stats.set('safe', inf && inf.exact ? inf.safe.filter(i => !cells[i].open).length : '–'); stats.set('wins', AI.store.get('mines-wins-' + Wd, 0));
        if (!first && !over && st.show !== 'off') ex.innerHTML = inf && inf.exact ? (st.show === 'logic' ? `Green dots are provably safe, “!” is a proved mine. ${inf.safe.filter(i => !cells[i].open).length ? '' : 'Nothing is certain right now: time to use the odds.'}` : 'Numbers are the chance (in %) that a square hides a mine, given everything shown.') : 'The open edge is too long to enumerate exactly here.';
      }
      ctx.on(box, 'click', e => { const t = e.target.closest('[data-i]'); if (!t) return; const i = +t.dataset.i; if (st.flag && !cells[i].open) { cells[i].flag = !cells[i].flag; draw(); } else open(i); });
      ctx.on(box, 'contextmenu', e => { const t = e.target.closest('[data-i]'); if (!t) return; e.preventDefault(); const i = +t.dataset.i; if (!cells[i].open && !over) { cells[i].flag = !cells[i].flag; draw(); } });
      ctx.resize(box, draw); ctx.theme(draw); fresh();
    }
  });
})(window);
