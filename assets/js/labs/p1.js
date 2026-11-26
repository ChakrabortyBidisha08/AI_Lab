/* Chapters 1–2 labs: four approaches to AI, the vacuum world, task-environment classifier. */
(function (G) {
  'use strict';
  const AI = G.AI, esc = AI.esc;

  /* ---------- Four approaches (game) ---------- */
  const QUAD = { TH: 'Thinking humanly', TR: 'Thinking rationally', AH: 'Acting humanly', AR: 'Acting rationally' };
  const CARDS = [
    ['A chatbot judged only on whether people chatting with it by text can tell it is a machine.', 'AH', 'This is the Turing test: success is defined by behaviour that is indistinguishable from a person’s.'],
    ['A program whose reasoning steps are compared with recordings of people thinking aloud while solving the same puzzles.', 'TH', 'Cognitive modelling cares about how humans think, so the model is judged against human thought processes.'],
    ['A system that draws conclusions only by valid logical inference from the premises it is given.', 'TR', 'The “laws of thought” approach: correct reasoning, defined by logic, is the goal.'],
    ['A self-driving car built to choose whichever action gives the best expected outcome, given what its sensors tell it.', 'AR', 'A rational agent acts to achieve the best expected outcome. This is the view the book takes.'],
    ['A memory model tuned until its reaction times match those measured from human volunteers.', 'TH', 'Matching human timing data is a test of whether the program thinks the way people do.'],
    ['A robot that must convince judges it is human over video, and also handle objects passed to it.', 'AH', 'This is the total Turing test, which adds vision and robotics to the conversation test.'],
    ['A theorem prover that states every problem in formal logic and searches for a proof.', 'TR', 'The logicist tradition: write the problem in logic, then reason correctly.'],
    ['A controller judged only on how well it meets its objective, not on how it reasons.', 'AR', 'Rational agents are judged by what they do, measured by a performance measure.'],
    ['Software that copies human typing errors so that its messages look human.', 'AH', 'Imitating human behaviour, mistakes included, only makes sense when the goal is to act like a human.'],
    ['A model of problem solving tested against brain-imaging data from people doing the same task.', 'TH', 'Comparing with brain activity asks whether the program works the way human thinking works.'],
    ['A program that follows syllogisms: from “all people are mortal” and “Socrates is a person”, it concludes Socrates is mortal.', 'TR', 'Syllogisms are Aristotle’s patterns of correct reasoning, the root of the laws-of-thought view.'],
    ['An agent that sometimes reacts instantly, without deliberating, because acting fast is what gives the best expected result.', 'AR', 'Rational action does not always need inference. A reflex can be the rational choice when there is no time to think.']
  ];
  AI.lab({
    id: 'four-approaches', ch: 1, kind: 'game', title: 'Four ways to define AI',
    blurb: 'Sort twelve AI systems into the book’s four approaches: thinking or acting, humanly or rationally.',
    tags: ['Turing test', 'cognitive modelling', 'laws of thought', 'rational agent'],
    how: [['The two questions', '<p>Is the definition about <b>thought processes</b> or <b>behaviour</b>? And is success measured against <b>human</b> performance or against an ideal of <b>rationality</b>? The two answers place a system in one of four boxes.</p>'], ['Why the book picks one', '<p>The book builds rational agents. Rationality is mathematically well defined and general, while human behaviour is tied to one kind of mind. Acting rationally also covers cases where correct inference is not the whole story.</p>']],
    mount(root, ctx) {
      const L = AI.layout(root, { cls: 'even' }); L.stage.classList.add('plain');
      const card = AI.el('<div style="padding:22px;min-height:180px;display:flex;flex-direction:column;justify-content:center"></div>'); L.stage.appendChild(card);
      const grid = AI.el(`<div style="display:grid;grid-template-columns:auto minmax(0,1fr) minmax(0,1fr);gap:8px;padding:0 18px 18px">
        <span></span><b class="small" style="text-align:center">Humanly</b><b class="small" style="text-align:center">Rationally</b>
        <b class="small" style="align-self:center">Thinking</b><button type="button" class="btn" data-q="TH" style="min-height:64px;white-space:normal">Thinking humanly</button><button type="button" class="btn" data-q="TR" style="min-height:64px;white-space:normal">Thinking rationally</button>
        <b class="small" style="align-self:center">Acting</b><button type="button" class="btn" data-q="AH" style="min-height:64px;white-space:normal">Acting humanly</button><button type="button" class="btn" data-q="AR" style="min-height:64px;white-space:normal">Acting rationally</button></div>`);
      L.stage.appendChild(grid);
      const ps = AI.panel(L.side, 'Score'); const sc = AI.stats(ps, [['ok', 'correct'], ['left', 'cards left'], ['best', 'best score']]);
      const pf = AI.panel(L.side, 'Feedback'); const fb = AI.el('<div class="explain">Read the card, then choose a box.</div>'); pf.appendChild(fb);
      const again = AI.el(`<button type="button" class="btn primary" style="margin-top:12px">${AI.icon.reset}Shuffle and restart</button>`); pf.appendChild(again);
      let deck, i, ok, answered;
      const start = () => { deck = AI.shuffle(CARDS.slice()); i = 0; ok = 0; answered = false; draw(); fb.textContent = 'Read the card, then choose a box.'; };
      const draw = () => {
        const best = AI.progress.best('four-approaches'); sc.set('ok', ok); sc.set('left', deck.length - i); sc.set('best', best == null ? '–' : best + '/12');
        grid.querySelectorAll('button').forEach(b => { b.classList.remove('primary', 'accent'); b.disabled = false; });
        if (i >= deck.length) { card.innerHTML = `<div class="score-big">${ok} / ${deck.length}</div><p class="lede" style="margin-top:8px">${ok >= 11 ? 'Excellent. You can tell the four approaches apart.' : ok >= 8 ? 'Good. Re-read the feedback for the ones you missed.' : 'Look again at the two questions under the game, then try another round.'}</p>`; AI.progress.best('four-approaches', ok); grid.querySelectorAll('button').forEach(b => b.disabled = true); return; }
        card.innerHTML = `<p class="small muted" style="margin:0 0 6px">Card ${i + 1} of ${deck.length}</p><p style="font-size:20px;line-height:1.4;margin:0;font-weight:500">${esc(deck[i][0])}</p>`;
      };
      grid.addEventListener('click', e => {
        const b = e.target.closest('[data-q]'); if (!b || answered || i >= deck.length) return; answered = true;
        const [, q, why] = deck[i]; const right = b.dataset.q === q; if (right) ok++;
        grid.querySelectorAll('button').forEach(x => { x.disabled = true; if (x.dataset.q === q) x.classList.add('primary'); else if (x === b) x.classList.add('accent'); });
        fb.innerHTML = `<b style="color:${right ? 'var(--ok)' : 'var(--bad)'}">${right ? 'Right.' : `It is ${QUAD[q]}.`}</b> ${esc(why)}`;
        ctx.after(right ? 1300 : 2600, () => { i++; answered = false; draw(); });
      });
      again.addEventListener('click', start); start();
    }
  });

  /* ---------- Vacuum world (demo) ---------- */
  AI.lab({
    id: 'vacuum-world', ch: 2, kind: 'demo', title: 'The vacuum-cleaner world',
    blurb: 'Run reflex, model-based and random agent programs in the book’s two-square world or a bigger room, and score them with different performance measures.',
    tags: ['agent function', 'simple reflex agent', 'model-based agent', 'performance measure'],
    how: [['The book’s setup', '<p>Two squares, A and B. The agent perceives its location and whether that square is dirty, and can move Left, Right or Suck. The book’s performance measure gives one point for each clean square at each time step, over a lifetime of 1000 steps.</p>'],
      ['What to try', '<ul><li>With no new dirt, the reflex agent and the model-based agent score the same, but the reflex agent keeps shuttling back and forth.</li><li>Switch the measure to charge one point per move: the model-based agent, which stops when it knows both squares are clean, now wins.</li><li>Turn on new dirt. Now an agent that stops checking does worse.</li></ul>'],
      ['The point', '<p>Rationality depends on the performance measure, the agent’s knowledge, its actions and its percepts. Change any of these and a different agent becomes the rational one.</p>']],
    mount(root, ctx) {
      const st = { world: 'two', measure: 'clean', dirt: 0, agent: 'reflex' };
      const L = AI.layout(root);
      const box = AI.el('<div style="position:relative;aspect-ratio:2.1;min-height:260px"></div>'); L.stage.appendChild(box);
      const pc = AI.panel(L.side, 'Set up');
      AI.controls(pc, [{ t: 'select', k: 'world', label: 'World', opts: [['two', 'Two squares (book)'], ['grid', 'Room of 6 × 4 squares']], str: true }, { t: 'select', k: 'agent', label: 'Agent program', opts: [['reflex', 'Simple reflex'], ['model', 'Model-based reflex'], ['random', 'Random']], str: true }, { t: 'row' }, { t: 'select', k: 'measure', label: 'Performance measure', opts: [['clean', '+1 per clean square per step'], ['move', 'Same, but −1 per move']], str: true, grow: true }, { t: 'row' }, { t: 'range', k: 'dirt', label: 'New dirt per square per step', min: 0, max: 0.1, step: 0.005, fmt: v => (v * 100).toFixed(1) + '%' }], st, () => reset());
      const prog = AI.panel(L.side, 'Agent program'); const code = AI.el('<div></div>'); prog.appendChild(code);
      const pe = AI.panel(L.side, 'Last step'); const ex = AI.el('<div class="explain"></div>'); pe.appendChild(ex);
      const ctl = AI.el('<div class="player"></div>'); L.stageCol.appendChild(ctl);
      const btnPlay = AI.el(`<button type="button" class="btn primary" style="min-width:92px">${AI.icon.play}<span>Run</span></button>`), btnStep = AI.el(`<button type="button" class="btn">${AI.icon.next}<span>Step</span></button>`), btnReset = AI.el(`<button type="button" class="btn">${AI.icon.reset}<span>Reset</span></button>`), score = AI.el('<span class="count" style="margin-left:auto;min-width:0"></span>');
      ctl.append(btnPlay, btnStep, btnReset, score);
      const pr = AI.panel(L.below, 'Compare agents over 1000 steps <small>average of 200 runs</small>'); const cmpBtn = AI.el('<button type="button" class="btn small">Run the comparison</button>'); pr.appendChild(cmpBtn); const cmpOut = AI.el('<div style="margin-top:10px"></div>'); pr.appendChild(cmpOut);
      const ph = AI.panel(L.below, 'Score over time'); const chart = AI.chart(ph, ctx, { height: 190, xLabel: 'time step' });
      let W, H, dirt, loc, t, total, model, hist, playing = false, lastMsg = '';
      const PROG = { reflex: ['function REFLEX-VACUUM-AGENT([location, status])', '  if status = Dirty then return Suck', '  else if location = A then return Right', '  else if location = B then return Left'], model: ['function MODEL-BASED-VACUUM-AGENT(percept)', '  update model: this square is now known', '  if status = Dirty then return Suck', '  if every square is known clean then', '    return NoOp', '  move toward the square not seen for longest'], random: ['function RANDOM-VACUUM-AGENT(percept)', '  return a random choice of', '    Left, Right, Suck (and Up, Down in a room)'] };
      const PROGG = { reflex: ['function REFLEX-AGENT-IN-A-ROOM([location, status])', '  if status = Dirty then return Suck', '  return a random move (it has no memory)'] };
      let pseudo;
      function reset() {
        playing = false; setBtn();
        if (st.world === 'two') { W = 2; H = 1; } else { W = 6; H = 4; }
        const r = AI.rng(12345 + (st.world === 'two' ? 0 : 7)); dirt = new Uint8Array(W * H).map(() => r() < 0.5 ? 1 : 0); if (st.world === 'two') { dirt[0] = 1; dirt[1] = 1; }
        loc = 0; t = 0; total = 0; hist = []; model = { seen: new Float64Array(W * H).fill(-1), clean: new Uint8Array(W * H) };
        code.innerHTML = ''; pseudo = AI.pseudo(code, (st.world === 'grid' && PROGG[st.agent]) || PROG[st.agent]); lastMsg = 'Both squares start dirty. The agent is in square A.'; if (st.world === 'grid') lastMsg = 'Some squares start dirty. The agent starts in the top-left corner.';
        draw(); chart.set([]);
      }
      const nb = i => { const x = i % W, y = (i / W) | 0, o = []; if (x > 0) o.push(['Left', i - 1]); if (x < W - 1) o.push(['Right', i + 1]); if (y > 0) o.push(['Up', i - W]); if (y < H - 1) o.push(['Down', i + W]); return o; };
      function act(agent, l, d, m, r) {
        if (agent === 'random') { const opts = ['Suck'].concat(st.world === 'two' ? ['Left', 'Right'] : ['Left', 'Right', 'Up', 'Down']); return [AI.pick(opts, r), 2]; }
        if (d[l]) return ['Suck', agent === 'model' ? 3 : 2];
        if (agent === 'reflex') { if (st.world === 'two') return [l === 0 ? 'Right' : 'Left', l === 0 ? 3 : 4]; return [AI.pick(nb(l), r)[0], 3]; }
        if (st.world === 'two' && st.dirt === 0 && m.clean[0] && m.clean[1]) return ['NoOp', 5];
        if (st.world === 'grid' && st.dirt === 0 && m.clean.every(Boolean)) return ['NoOp', 5];
        // head for the square seen least recently (breadth-first distance breaks ties)
        let best = -1, bs = Infinity; for (let i = 0; i < W * H; i++) { if (i === l) continue; const age = m.seen[i]; const dist = Math.abs(i % W - l % W) + Math.abs(((i / W) | 0) - ((l / W) | 0)); const sc = age * 100 + dist; if (sc < bs) { bs = sc; best = i; } }
        const tx = best % W, ty = (best / W) | 0, lx = l % W, ly = (l / W) | 0; return [tx < lx ? 'Left' : tx > lx ? 'Right' : ty < ly ? 'Up' : 'Down', 6];
      }
      function stepOnce(S, agent, r) {
        S.m.seen[S.loc] = S.t; S.m.clean[S.loc] = S.dirt[S.loc] ? 0 : 1;
        const [a, line] = act(agent, S.loc, S.dirt, S.m, r);
        let moved = false;
        if (a === 'Suck') { S.dirt[S.loc] = 0; S.m.clean[S.loc] = 1; }
        else if (a !== 'NoOp') { const to = nb(S.loc).find(x => x[0] === a); if (to) { S.loc = to[1]; } moved = true; }
        for (let i = 0; i < S.dirt.length; i++) if (!S.dirt[i] && r() < st.dirt) S.dirt[i] = 1; // the agent only learns about new dirt by perceiving it
        let pts = 0; for (let i = 0; i < S.dirt.length; i++) if (!S.dirt[i]) pts++;
        if (st.measure === 'move' && moved) pts -= 1;
        S.t++; S.total += pts; return { a, line, pts };
      }
      const S0 = () => ({ dirt, loc, t, total, m: model });
      const rng = AI.rng(99);
      function one() { const S = S0(); const name = (i) => st.world === 'two' ? 'AB'[i] : `(${i % W + 1},${((i / W) | 0) + 1})`; const before = S.loc; const o = stepOnce(S, st.agent, rng); loc = S.loc; t = S.t; total = S.total; hist.push(total); pseudo.hl(o.line); lastMsg = `Step ${t}: in square ${name(before)}, the agent chooses <b>${o.a}</b>. This step scores ${o.pts} point${Math.abs(o.pts) === 1 ? '' : 's'}.`; draw(); if (t % 5 === 0 || t < 40) chart.set([{ name: 'score', color: 'var(--v-path)', values: hist.slice() }]); if (t >= 1000) { playing = false; setBtn(); } }
      function draw() {
        ex.innerHTML = lastMsg; score.textContent = `Step ${t} / 1000 · score ${total}`;
        const w = box.clientWidth, h = box.clientHeight; if (!w) return;
        const cs = Math.min((w - 40) / W, (h - 40) / H), ox = (w - cs * W) / 2, oy = (h - cs * H) / 2;
        let s = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="position:absolute;inset:0">`;
        for (let i = 0; i < W * H; i++) {
          const x = ox + (i % W) * cs, y = oy + ((i / W) | 0) * cs;
          s += `<rect x="${x + 3}" y="${y + 3}" width="${cs - 6}" height="${cs - 6}" rx="12" fill="var(--bg)" stroke="var(--line2)" stroke-width="2"/>`;
          if (st.world === 'two') s += `<text x="${x + 14}" y="${y + 30}" class="svg-b" style="font-size:22px" fill="var(--muted)">${'AB'[i]}</text>`;
          if (dirt[i]) { const R2 = AI.rng(i * 31 + 7); for (let k = 0; k < 9; k++) s += `<ellipse cx="${x + cs * (0.22 + R2() * 0.56)}" cy="${y + cs * (0.5 + R2() * 0.36)}" rx="${cs * (0.025 + R2() * 0.035)}" ry="${cs * 0.022}" fill="${AI.isDark() ? '#a07a45' : '#8a6234'}"/>`; }
        }
        const ax = ox + (loc % W + 0.5) * cs, ay = oy + (((loc / W) | 0) + 0.42) * cs, r = cs * 0.24;
        s += `<g><ellipse cx="${ax}" cy="${ay + r * 0.95}" rx="${r * 1.05}" ry="${r * 0.22}" fill="rgba(0,0,0,.18)"/><circle cx="${ax}" cy="${ay}" r="${r}" fill="var(--ink)"/><circle cx="${ax}" cy="${ay}" r="${r * 0.62}" fill="var(--bg2)"/><circle cx="${ax - r * 0.22}" cy="${ay - r * 0.08}" r="${r * 0.11}" fill="var(--ink)"/><circle cx="${ax + r * 0.22}" cy="${ay - r * 0.08}" r="${r * 0.11}" fill="var(--ink)"/><rect x="${ax - r * 0.55}" y="${ay + r * 0.62}" width="${r * 1.1}" height="${r * 0.22}" rx="${r * 0.1}" fill="var(--accent)"/></g>`;
        box.innerHTML = s + '</svg>';
      }
      const setBtn = () => { btnPlay.innerHTML = (playing ? AI.icon.pause : AI.icon.play) + `<span>${playing ? 'Pause' : 'Run'}</span>`; };
      btnPlay.onclick = () => { if (t >= 1000) reset(); playing = !playing; setBtn(); };
      btnStep.onclick = () => { playing = false; setBtn(); if (t < 1000) one(); };
      btnReset.onclick = reset;
      let acc = 0; ctx.raf(dt => { if (!playing) return; acc += dt; const per = st.world === 'two' ? 220 : 120; while (acc > per && playing) { acc -= per; one(); } });
      ctx.resize(box, draw); ctx.theme(draw);
      cmpBtn.onclick = () => {
        const rows = ['reflex', 'model', 'random'].map(ag => { let sum = 0; const r = AI.rng(2024); for (let run = 0; run < 200; run++) { const S = { dirt: new Uint8Array(W * H).map(() => r() < 0.5 ? 1 : 0), loc: (r() * W * H) | 0, t: 0, total: 0, m: { seen: new Float64Array(W * H).fill(-1), clean: new Uint8Array(W * H) } }; for (let k = 0; k < 1000; k++) stepOnce(S, ag, r); sum += S.total; } return [ag, sum / 200]; });
        const best = Math.max(...rows.map(r => r[1])), names = { reflex: 'Simple reflex', model: 'Model-based reflex', random: 'Random' };
        cmpOut.innerHTML = AI.table(['Agent', 'r:Average score'], rows.map(([a, v]) => `<tr class="${v === best ? 'hl' : ''}"><td>${names[a]}</td><td class="r">${v.toFixed(1)}</td></tr>`), 'compact') + `<p class="tip" style="margin-top:8px">Maximum possible: ${W * H * 1000} (every square clean at every step). Random starting dirt and positions.</p>`;
      };
      reset();
    }
  });

  /* ---------- Task environment classifier (game) ---------- */
  const DIMS = [['obs', 'Observable', ['Fully', 'Partially']], ['agents', 'Agents', ['Single', 'Multi']], ['det', 'Deterministic?', ['Deterministic', 'Stochastic']], ['epi', 'Episodic?', ['Episodic', 'Sequential']], ['stat', 'Static?', ['Static', 'Semi-dynamic', 'Dynamic']], ['disc', 'Discrete?', ['Discrete', 'Continuous']]];
  const ENVS = [
    ['Crossword puzzle', { obs: ['Fully', 'The whole grid and all clues are visible.'], agents: ['Single', 'No one else acts on the puzzle.'], det: ['Deterministic', 'Writing a word always has the same effect.'], epi: ['Sequential', 'Each word you write constrains later words.'], stat: ['Static', 'Nothing changes while you think.'], disc: ['Discrete', 'Finitely many squares and letters.'] }],
    ['Chess with a clock', { obs: ['Fully', 'Both players see the whole board.'], agents: ['Multi', 'The opponent is another agent trying to beat you.'], det: ['Deterministic', 'Moves have exactly the effect you choose; there is no chance.'], epi: ['Sequential', 'Each move affects the rest of the game.'], stat: ['Semi-dynamic', 'The board does not change while you think, but your clock runs, so your score does.'], disc: ['Discrete', 'Finitely many positions and moves.'] }],
    ['Poker', { obs: ['Partially', 'You cannot see the other players’ cards.'], agents: ['Multi', 'Other players compete with you.'], det: ['Stochastic', 'The shuffle decides which cards come.'], epi: ['Sequential', 'Earlier bets shape later ones.'], stat: ['Static', 'Nothing happens while you decide.'], disc: ['Discrete', 'Cards and bets come in distinct units.'] }],
    ['Backgammon', { obs: ['Fully', 'The board and dice are visible to both players.'], agents: ['Multi', 'You play against an opponent.'], det: ['Stochastic', 'Dice rolls decide what moves are possible.'], epi: ['Sequential', 'Each move changes the future position.'], stat: ['Static', 'The board waits for your move.'], disc: ['Discrete', 'Finitely many points, checkers and dice values.'] }],
    ['Taxi driving', { obs: ['Partially', 'Sensors cannot see round corners or into other drivers’ minds.'], agents: ['Multi', 'Other drivers and pedestrians are agents too.'], det: ['Stochastic', 'Traffic, weather and tyres behave unpredictably.'], epi: ['Sequential', 'Choices now affect where you are later.'], stat: ['Dynamic', 'The world keeps moving while the driver decides.'], disc: ['Continuous', 'Speed, position and steering angle are continuous.'] }],
    ['Medical diagnosis', { obs: ['Partially', 'The patient’s internal state is hidden; tests reveal parts of it.'], agents: ['Single', 'The patient is treated as part of the environment.'], det: ['Stochastic', 'Patients respond to treatment unpredictably.'], epi: ['Sequential', 'Tests and treatments now affect later options.'], stat: ['Dynamic', 'The illness progresses over time.'], disc: ['Continuous', 'Measurements such as temperature are continuous.'] }],
    ['Image analysis (each picture on its own)', { obs: ['Fully', 'The whole image is available to the agent.'], agents: ['Single', 'No other agent acts.'], det: ['Deterministic', 'Analysing an image does not involve chance in the environment.'], epi: ['Episodic', 'Each image is classified independently of the last.'] }],
    ['Part-picking robot on a conveyor', { obs: ['Partially', 'Its camera sees parts imperfectly.'], agents: ['Single', 'It works alone at its station.'], det: ['Stochastic', 'Grasps can slip and parts arrive unpredictably.'], epi: ['Episodic', 'Each part is handled on its own; earlier decisions do not affect the next part.'], stat: ['Dynamic', 'The conveyor keeps moving.'], disc: ['Continuous', 'Arm positions and part poses are continuous.'] }],
    ['Refinery controller', { obs: ['Partially', 'Sensors measure only some of the process state.'], agents: ['Single', 'One controller runs the plant.'], det: ['Stochastic', 'Chemical processes have unpredictable variation.'], epi: ['Sequential', 'Today’s settings affect tomorrow’s state.'], stat: ['Dynamic', 'The process runs continuously.'], disc: ['Continuous', 'Temperatures, pressures and flows are continuous.'] }],
    ['Interactive English tutor', { obs: ['Partially', 'The tutor cannot see what the student really understands.'], agents: ['Multi', 'The student is another agent the tutor interacts with.'], det: ['Stochastic', 'Student responses are unpredictable.'], epi: ['Sequential', 'Each exercise builds on earlier ones.'], stat: ['Dynamic', 'The student’s state changes while the tutor decides.'], disc: ['Discrete', 'Exchanges are made of words and exercises.'] }],
    ['Sudoku solver', { obs: ['Fully', 'Every given digit is visible.'], agents: ['Single', 'Nobody else plays.'], det: ['Deterministic', 'Placing a digit has a fixed effect.'], epi: ['Sequential', 'Each placement constrains the rest.'], stat: ['Static', 'The puzzle waits.'], disc: ['Discrete', 'Eighty-one cells, nine digits.'] }],
    ['Robot soccer player', { obs: ['Partially', 'A robot sees only part of the pitch.'], agents: ['Multi', 'Team-mates cooperate and opponents compete.'], det: ['Stochastic', 'Kicks and collisions are unpredictable.'], epi: ['Sequential', 'Positions now affect the rest of the match.'], stat: ['Dynamic', 'Play continues while the robot decides.'], disc: ['Continuous', 'Positions and velocities are continuous.'] }]
  ];
  AI.lab({
    id: 'env-classifier', ch: 2, kind: 'game', title: 'Classify the task environment',
    blurb: 'For twelve task environments, decide whether each is observable, single-agent, deterministic, episodic, static and discrete.',
    tags: ['task environment', 'PEAS', 'observable', 'episodic', 'dynamic'],
    how: [['The six questions', '<ul><li><b>Fully observable</b>: sensors show everything relevant to the choice.</li><li><b>Multi-agent</b>: another agent’s behaviour affects your performance.</li><li><b>Deterministic</b>: the next state is fixed by the current state and action.</li><li><b>Episodic</b>: each decision is independent of earlier ones.</li><li><b>Static</b>: the world waits while you think. <b>Semi-dynamic</b>: it waits, but your score changes with time.</li><li><b>Discrete</b>: finitely many distinct states, percepts and actions.</li></ul>'],
      ['Scoring', '<p>Each environment has up to six answers. Your total is kept for this round, and your best round is saved in this browser.</p>']],
    mount(root, ctx) {
      const L = AI.layout(root, { cls: 'even' }); L.stage.classList.add('plain');
      const body = AI.el('<div style="padding:18px"></div>'); L.stage.appendChild(body);
      const ps = AI.panel(L.side, 'Score'); const sc = AI.stats(ps, [['ok', 'correct'], ['asked', 'answered'], ['best', 'best round']]);
      const pf = AI.panel(L.side, 'Why'); const fb = AI.el('<div class="explain small">Choose an answer in every row, then press Check.</div>'); pf.appendChild(fb);
      let deck, i, ok, asked, picks, checked;
      const start = () => { deck = AI.shuffle(ENVS.slice()); i = 0; ok = 0; asked = 0; render(); };
      function render() {
        const best = AI.progress.best('env-classifier'); sc.set('ok', ok); sc.set('asked', asked); sc.set('best', best == null ? '–' : best + '%');
        if (i >= deck.length) { const pct = Math.round(ok / asked * 100); AI.progress.best('env-classifier', pct); body.innerHTML = `<div class="score-big">${pct}%</div><p class="lede" style="margin:8px 0 14px">${ok} of ${asked} properties right.</p><button type="button" class="btn primary" data-a>${AI.icon.reset}Play again</button>`; body.querySelector('[data-a]').onclick = start; return; }
        const [name, ans] = deck[i]; picks = {}; checked = false;
        body.innerHTML = `<p class="small muted" style="margin:0">Environment ${i + 1} of ${deck.length}</p><h2 style="margin:4px 0 14px">${esc(name)}</h2>` + DIMS.filter(([k]) => ans[k]).map(([k, label, opts]) => `<div style="display:grid;grid-template-columns:minmax(96px,120px) minmax(0,1fr);gap:8px;align-items:center;margin:8px 0"><span class="small" style="font-weight:600">${label}</span><div class="seg" data-k="${k}">${opts.map(o => `<button type="button" data-v="${o}">${o}</button>`).join('')}</div></div>`).join('') + `<div class="btns" style="margin-top:14px"><button type="button" class="btn primary" data-check>Check</button></div>`;
        body.querySelectorAll('.seg').forEach(sg => sg.addEventListener('click', e => { const b = e.target.closest('button'); if (!b || checked) return; picks[sg.dataset.k] = b.dataset.v; sg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); }));
        body.querySelector('[data-check]').onclick = () => {
          if (checked) { i++; render(); return; }
          const keys = DIMS.filter(([k]) => ans[k]).map(([k]) => k); if (keys.some(k => !picks[k])) { fb.innerHTML = 'Answer every row first.'; return; }
          checked = true; let right = 0; const lines = [];
          keys.forEach(k => { const [a, why] = ans[k]; const good = picks[k] === a; if (good) right++; const sg = body.querySelector(`.seg[data-k="${k}"]`); sg.querySelectorAll('button').forEach(x => { if (x.dataset.v === a) { x.style.background = 'var(--ok)'; x.style.color = '#fff'; } else if (x.dataset.v === picks[k]) { x.style.background = 'var(--bad)'; x.style.color = '#fff'; } }); lines.push(`<li><b>${DIMS.find(d => d[0] === k)[1].replace('?', '')}: ${a}.</b> ${esc(why)}</li>`); });
          ok += right; asked += keys.length; fb.innerHTML = `<p style="margin:0 0 6px"><b>${right} of ${keys.length}</b> right.</p><ul style="padding-left:18px;margin:0">${lines.join('')}</ul>`;
          body.querySelector('[data-check]').textContent = i === deck.length - 1 ? 'See your score' : 'Next environment'; sc.set('ok', ok); sc.set('asked', asked);
        };
      }
      start();
    }
  });
})(window);
