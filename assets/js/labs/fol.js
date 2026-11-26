/* Chapters 8–9 labs: first-order model checker, translation game, unification, unification game, FOL chaining. */
(function (G) {
  'use strict';
  const AI = G.AI, E = G.AIE, esc = AI.esc, F = E.fol;

  /* ---------- a small first-order model, in the spirit of the book's Richard-and-John example ---------- */
  const OBJ = { Richard: 'Richard the Lionheart', John: 'King John', RLeg: 'Richard’s left leg', JLeg: 'John’s left leg', TheCrown: 'the crown' };
  const MODEL = { objects: Object.keys(OBJ), consts: { Richard: 'Richard', John: 'John' }, preds: { Person: [['Richard'], ['John']], King: [['John']], Crown: [['TheCrown']], Leg: [['RLeg'], ['JLeg']], Brother: [['Richard', 'John'], ['John', 'Richard']], OnHead: [['TheCrown', 'John']] }, funcs: { LeftLeg: { Richard: 'RLeg', John: 'JLeg' } } };
  function parseFOL(s) {
    const t = []; let i = 0; s = String(s);
    while (i < s.length) { const c = s[i]; if (/\s/.test(c)) { i++; continue; } const two = s.slice(i, i + 3); if (two === '<=>') { t.push('⇔'); i += 3; continue; } if (s.slice(i, i + 2) === '=>') { t.push('⇒'); i += 2; continue; } if ('¬~!'.includes(c)) { t.push('¬'); i++; continue; } if ('∧&'.includes(c)) { t.push('∧'); i++; continue; } if ('∨|'.includes(c)) { t.push('∨'); i++; continue; } if ('⇒⇔∀∃(),='.includes(c)) { t.push(c); i++; continue; } const m = s.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/); if (m) { const w = m[0]; t.push(w === 'forall' ? '∀' : w === 'exists' ? '∃' : '$' + w); i += w.length; continue; } throw new Error(`Unexpected “${c}”`); }
    let k = 0; const peek = () => t[k], eat = x => { if (t[k] !== x) throw new Error(`Expected “${x}”`); k++; };
    const term = () => { const w = t[k]; if (!w || w[0] !== '$') throw new Error('Expected a term'); k++; const n = w.slice(1); if (peek() === '(') { k++; const args = [term()]; while (peek() === ',') { k++; args.push(term()); } eat(')'); return { f: n, args }; } return /^[a-z]/.test(n) ? { v: n } : { c: n }; };
    const unary = () => {
      const w = peek(); if (w === undefined) throw new Error('The sentence ends too early');
      if (w === '¬') { k++; return { t: 'not', a: unary() }; }
      if (w === '∀' || w === '∃') { k++; const vars = []; while (peek() && peek()[0] === '$' && /^\$[a-z]/.test(peek()) && t[k + 1] !== '(') { vars.push(t[k].slice(1)); k++; if (peek() === ',') k++; } if (!vars.length) throw new Error('A quantifier needs a variable'); let body = iff(); for (let j = vars.length - 1; j >= 0; j--) body = { t: w === '∀' ? 'all' : 'ex', v: vars[j], a: body }; return body; }
      if (w === '(') { k++; const e = iff(); eat(')'); return e; }
      const a = term(); if (peek() === '=') { k++; return { t: 'eq', a, b: term() }; } if (a.v) throw new Error(`“${a.v}” is a variable, not a sentence`); return { t: 'atom', p: a.f || a.c, args: a.args || [] };
    };
    const and = () => { let a = unary(); while (peek() === '∧') { k++; a = { t: 'and', a, b: unary() }; } return a; };
    const or = () => { let a = and(); while (peek() === '∨') { k++; a = { t: 'or', a, b: and() }; } return a; };
    const imp = () => { const a = or(); if (peek() === '⇒') { k++; return { t: 'imp', a, b: imp() }; } return a; };
    const iff = () => { let a = imp(); while (peek() === '⇔') { k++; a = { t: 'iff', a, b: imp() }; } return a; };
    const e = iff(); if (k < t.length) throw new Error(`Unexpected “${String(t[k]).replace('$', '')}”`); return e;
  }
  function evalTerm(tm, env) { if (tm.v) { if (!(tm.v in env)) throw new Error(`Variable ${tm.v} is not bound by a quantifier`); return env[tm.v]; } if (tm.c) { if (!(tm.c in MODEL.consts)) throw new Error(`No constant “${tm.c}” in this model (try Richard or John)`); return MODEL.consts[tm.c]; } const fn = MODEL.funcs[tm.f]; if (!fn) throw new Error(`No function “${tm.f}” in this model`); const a = evalTerm(tm.args[0], env); if (!(a in fn)) throw new Error(`${tm.f} is only defined for people here, not for ${OBJ[a]}`); return fn[a]; }
  function evalS(e, env, trace) {
    switch (e.t) {
      case 'atom': { const ext = MODEL.preds[e.p]; if (!ext) throw new Error(`No predicate “${e.p}” in this model`); const args = e.args.map(a => evalTerm(a, env)); return ext.some(tu => tu.length === args.length && tu.every((x, i) => x === args[i])); }
      case 'eq': return evalTerm(e.a, env) === evalTerm(e.b, env);
      case 'not': return !evalS(e.a, env);
      case 'and': return evalS(e.a, env) && evalS(e.b, env);
      case 'or': return evalS(e.a, env) || evalS(e.b, env);
      case 'imp': return !evalS(e.a, env) || evalS(e.b, env);
      case 'iff': return evalS(e.a, env) === evalS(e.b, env);
      case 'all': case 'ex': { const res = MODEL.objects.map(o => [o, evalS(e.a, Object.assign({}, env, { [e.v]: o }))]); if (trace && !trace.done) { trace.done = true; trace.q = e.t; trace.v = e.v; trace.res = res; } return e.t === 'all' ? res.every(r => r[1]) : res.some(r => r[1]); }
    }
  }
  AI.lab({
    id: 'fol-model', ch: 8, kind: 'demo', title: 'Truth in a first-order model',
    blurb: 'Type first-order sentences and check whether they are true in a small model with Richard, John, their left legs and a crown.',
    tags: ['models', 'quantifiers', '∀ with ⇒', '∃ with ∧', 'functions', 'equality'],
    how: [['The model', '<p>Five objects: Richard the Lionheart, King John, their two left legs, and a crown. Richard and John are brothers and both are persons; John is king and wears the crown. LeftLeg is a function defined for the two people. This follows the spirit of the book’s own example.</p>'],
      ['The two classic mistakes', '<ul><li>“All kings are persons” is ∀x King(x) ⇒ Person(x). Writing ∀x King(x) ∧ Person(x) claims every object is a king, which is false here.</li><li>“The crown is on John’s head” is ∃x Crown(x) ∧ OnHead(x, John). Writing ∃x Crown(x) ⇒ OnHead(x, John) is true as soon as anything is not a crown, so it says almost nothing.</li></ul>'],
      ['Syntax', '<p>∀ or forall, ∃ or exists, then the variable. Variables start lower-case; constants, predicates and functions start upper-case. A quantifier’s scope runs as far right as possible, so use brackets to stop it.</p>']],
    mount(root, ctx) {
      const PRE = ['King(John)', '∀x King(x) ⇒ Person(x)', '∀x King(x) ∧ Person(x)', '∃x Crown(x) ∧ OnHead(x, John)', '∃x Crown(x) ⇒ OnHead(x, Richard)', '∀x ∀y Brother(x, y) ⇒ Brother(y, x)', '∀x Person(x) ⇒ Leg(LeftLeg(x))', 'LeftLeg(Richard) = LeftLeg(John)', '∃x ∃y Brother(x, y) ∧ King(y) ∧ ¬King(x)', '∀x Crown(x) ⇒ ∃y Person(y) ∧ OnHead(x, y)'];
      const st = { s: PRE[1], pre: 1 };
      const Lf = AI.layout(root);
      const box = AI.el('<div style="position:relative;aspect-ratio:1.5;min-height:280px"></div>'); Lf.stage.appendChild(box);
      let hl = null;
      const sv = AI.svgHost(box, ctx, (w, h) => {
        const P = { Richard: [0.2, 0.38], John: [0.6, 0.38], RLeg: [0.2, 0.84], JLeg: [0.6, 0.84], TheCrown: [0.87, 0.14] }; const xy = o => [P[o][0] * w, P[o][1] * h];
        let s = AI.arrowDefs('fa', 'var(--ink2)');
        const arrow = (a, b, label, bend) => { const [x1, y1] = xy(a), [x2, y2] = xy(b); const mx = (x1 + x2) / 2 + (bend || 0) * (y2 - y1) * 0.18, my = (y1 + y2) / 2 - (bend || 0) * (x2 - x1) * 0.18; const d = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / d, uy = (y2 - y1) / d; return `<path d="M${x1 + ux * 30} ${y1 + uy * 30}Q${mx} ${my} ${x2 - ux * 32} ${y2 - uy * 32}" fill="none" stroke="var(--ink2)" stroke-width="2" marker-end="url(#fa)"/><text x="${mx}" y="${my + (bend ? -2 : -6)}" text-anchor="middle" class="svg-t halo" style="font-weight:600">${label}</text>`; };
        s += arrow('Richard', 'John', 'Brother', 1) + arrow('John', 'Richard', 'Brother', 1) + arrow('TheCrown', 'John', 'OnHead', 0) + arrow('Richard', 'RLeg', 'LeftLeg', 0) + arrow('John', 'JLeg', 'LeftLeg', 0);
        const badge = { Richard: ['Person'], John: ['Person', 'King'], RLeg: ['Leg'], JLeg: ['Leg'], TheCrown: ['Crown'] };
        Object.keys(P).forEach(o => { const [x, y] = xy(o); const mark = hl && hl.res && hl.res.find(r => r[0] === o); const ring = mark ? (mark[1] ? 'var(--ok)' : 'var(--bad)') : 'var(--ink)'; s += `<circle cx="${x}" cy="${y}" r="27" fill="var(--bg)" stroke="${ring}" stroke-width="${mark ? 5 : 2.5}"/><text x="${x}" y="${y + 5}" text-anchor="middle" class="svg-b" style="font-size:13px">${{ Richard: 'R', John: 'J', RLeg: 'RL', JLeg: 'JL', TheCrown: 'C' }[o]}</text><text x="${x}" y="${y + 44}" text-anchor="middle" class="svg-t halo" style="font-size:12.5px">${esc(OBJ[o])}</text><text x="${x}" y="${y + 60}" text-anchor="middle" class="svg-s halo" style="font-weight:600">${badge[o].join(' · ')}</text>`; });
        return s;
      });
      const pc = AI.panel(Lf.side, 'Sentence');
      const refs = AI.controls(pc, [{ t: 'select', k: 'pre', label: 'Examples', opts: PRE.map((p, i) => [i, p]), grow: true }, { t: 'row' }, { t: 'text', k: 's', label: 'Or type your own', grow: true, live: true }], st, k => { if (k === 'pre') { st.s = PRE[st.pre]; refs.s.value = st.s; } run(); });
      const kb = AI.el('<div class="btns" style="margin-top:8px"></div>'); ['∀', '∃', '¬', '∧', '∨', '⇒', '⇔', '='].forEach(sym => { const b = AI.el(`<button type="button" class="btn small" style="min-width:38px">${sym}</button>`); b.onclick = () => { const inp = refs.s; const p = inp.selectionStart || inp.value.length; inp.value = inp.value.slice(0, p) + sym + inp.value.slice(p); st.s = inp.value; inp.focus(); run(); }; kb.appendChild(b); }); pc.appendChild(kb);
      const pr = AI.panel(Lf.side, 'Verdict'); const out = AI.el('<div class="explain"></div>'); pr.appendChild(out);
      function run() {
        hl = null; try { const e = parseFOL(st.s); const tr = {}; const v = evalS(e, {}, tr); hl = tr.done ? tr : null;
          out.innerHTML = `<p style="margin:0 0 6px;font-size:20px;font-weight:800;font-family:var(--display);color:${v ? 'var(--ok)' : 'var(--bad)'}">${v ? 'True' : 'False'} in this model</p>` + (tr.done ? `<p class="small" style="margin:0">The outer quantifier ${tr.q === 'all' ? '∀' : '∃'}${esc(tr.v)} tries each object. Ringed green: the body is true with ${esc(tr.v)} set to that object; red: false.${tr.q === 'all' ? (v ? ' True for all five, so the ∀ holds.' : ` It fails for ${tr.res.filter(r => !r[1]).map(r => esc(OBJ[r[0]])).join(', ')}.`) : (v ? ` A witness: ${esc(OBJ[tr.res.find(r => r[1])[0]])}.` : ' No object works.')}</p>` : '');
        } catch (er) { out.innerHTML = `<b>Cannot evaluate:</b> ${esc(er.message)}.`; }
        sv.redraw();
      }
      run();
    }
  });

  /* ---------- translation game ---------- */
  const TR = [
    ['All kings are persons.', ['∀x King(x) ⇒ Person(x)', '∀x King(x) ∧ Person(x)', '∃x King(x) ⇒ Person(x)', '∀x Person(x) ⇒ King(x)'], 'Universal quantifiers go with ⇒. With ∧ the sentence would claim that everything is a king and a person.'],
    ['Some student is a programmer.', ['∃x Student(x) ∧ Programmer(x)', '∃x Student(x) ⇒ Programmer(x)', '∀x Student(x) ∧ Programmer(x)', '∃x Student(x) ∨ Programmer(x)'], 'Existential quantifiers go with ∧. With ⇒ the sentence is true as soon as any object is not a student.'],
    ['Everyone loves somebody.', ['∀x ∃y Loves(x, y)', '∃y ∀x Loves(x, y)', '∀x ∀y Loves(x, y)', '∃x ∃y Loves(x, y)'], 'For each person x there is some y, which may be different for each x. Swapping the quantifiers says one person is loved by all.'],
    ['There is someone whom everyone loves.', ['∃y ∀x Loves(x, y)', '∀x ∃y Loves(x, y)', '∃x ∀y Loves(x, y)', '∀y ∃x Loves(x, y)'], 'One fixed y is loved by every x, so ∃y comes first. ∃x ∀y Loves(x, y) says someone loves everyone instead.'],
    ['Nobody likes broccoli.', ['∀x ¬Likes(x, Broccoli)', '¬∀x Likes(x, Broccoli)', '∃x ¬Likes(x, Broccoli)', '¬∃x ¬Likes(x, Broccoli)'], '“Nobody” means for every x, not Likes. This is the same as ¬∃x Likes(x, Broccoli). The second option only says that not everybody likes it.'],
    ['Brothers are siblings.', ['∀x ∀y Brother(x, y) ⇒ Sibling(x, y)', '∀x ∀y Sibling(x, y) ⇒ Brother(x, y)', '∀x ∃y Brother(x, y) ∧ Sibling(x, y)', '∃x ∃y Brother(x, y) ⇒ Sibling(x, y)'], 'Being a brother implies being a sibling, not the other way round (sisters are siblings too).'],
    ['Every student took at least one course.', ['∀s Student(s) ⇒ ∃c Course(c) ∧ Took(s, c)', '∃c ∀s Student(s) ⇒ Course(c) ∧ Took(s, c)', '∀s ∀c Student(s) ∧ Course(c) ⇒ Took(s, c)', '∀s Student(s) ⇒ ∃c Course(c) ⇒ Took(s, c)'], 'Each student has their own course, so ∃c sits inside ∀s, and the ∃ uses ∧.'],
    ['Exactly one student failed.', ['∃x Student(x) ∧ Failed(x) ∧ ∀y (Student(y) ∧ Failed(y) ⇒ y = x)', '∃x Student(x) ∧ Failed(x)', '∀x ∀y (Student(x) ∧ Failed(x) ∧ Student(y) ∧ Failed(y)) ⇒ x = y', '∃x ∃y Student(x) ∧ Failed(x) ∧ Student(y) ∧ Failed(y) ∧ ¬(x = y)'], 'Exactly one needs two parts: at least one (there is an x) and at most one (any other failing student equals x). The second option is only “at least one”, the third only “at most one”, the fourth “at least two”.'],
    ['Not all birds can fly.', ['∃x Bird(x) ∧ ¬Flies(x)', '∀x Bird(x) ⇒ ¬Flies(x)', '¬∃x Bird(x) ∧ Flies(x)', '∃x Bird(x) ⇒ ¬Flies(x)'], '¬∀x (Bird(x) ⇒ Flies(x)) is equivalent to ∃x (Bird(x) ∧ ¬Flies(x)): some bird does not fly. The second and third options say no bird flies.'],
    ['Anyone who loves all animals is loved by someone.', ['∀x (∀y Animal(y) ⇒ Loves(x, y)) ⇒ ∃z Loves(z, x)', '∀x ∀y Animal(y) ⇒ (Loves(x, y) ⇒ ∃z Loves(z, x))', '∀x (∃y Animal(y) ∧ Loves(x, y)) ⇒ ∃z Loves(z, x)', '∃x (∀y Animal(y) ⇒ Loves(x, y)) ∧ ∃z Loves(z, x)'], 'The condition “loves all animals” is a whole ∀y sentence inside the brackets. Moving ∀y outside changes it to “loves some animal”.'],
    ['Two different people live in Paris.', ['∃x ∃y Person(x) ∧ Person(y) ∧ LivesIn(x, Paris) ∧ LivesIn(y, Paris) ∧ ¬(x = y)', '∃x ∃y Person(x) ∧ Person(y) ∧ LivesIn(x, Paris) ∧ LivesIn(y, Paris)', '∀x ∀y Person(x) ∧ Person(y) ⇒ LivesIn(x, Paris) ∧ LivesIn(y, Paris)', '∃x Person(x) ∧ LivesIn(x, Paris) ∧ ∃y y = x'], 'Without ¬(x = y), x and y could be the same person, so the sentence would only say that at least one person lives in Paris.'],
    ['Every person has a mother.', ['∀x Person(x) ⇒ ∃m Mother(m, x)', '∃m ∀x Person(x) ⇒ Mother(m, x)', '∀x ∃m Person(x) ∧ Mother(m, x)', '∀x ∀m Person(x) ⇒ Mother(m, x)'], 'Each person has their own mother, so ∃m comes after ∀x. The third option wrongly claims that everything is a person.']
  ];
  AI.lab({
    id: 'fol-translate', ch: 8, kind: 'game', title: 'English to first-order logic',
    blurb: 'Pick the correct first-order translation of twelve English sentences. The wrong options are the mistakes students really make.',
    tags: ['translation', 'quantifier order', '∀ with ⇒', '∃ with ∧', 'equality'],
    how: [['Rules of thumb', '<ul><li>∀ usually goes with ⇒; ∃ usually goes with ∧.</li><li>The order of different quantifiers matters: ∀x ∃y is not ∃y ∀x.</li><li>“At least two” and “exactly one” need equality.</li></ul>']],
    mount(root, ctx) {
      const Lg = AI.layout(root, { cls: 'even' }); Lg.stage.classList.add('plain');
      const body = AI.el('<div style="padding:20px"></div>'); Lg.stage.appendChild(body);
      const ps = AI.panel(Lg.side, 'Score'); const stats = AI.stats(ps, [['ok', 'correct'], ['n', 'answered'], ['best', 'best round']]);
      const pf = AI.panel(Lg.side, 'Explanation'); const fb = AI.el('<div class="explain">Choose a translation.</div>'); pf.appendChild(fb);
      let deck, i, ok, n, locked;
      const start = () => { deck = AI.shuffle(TR.map(t => t.slice())); i = 0; ok = 0; n = 0; show(); };
      function show() {
        const b = AI.progress.best('fol-translate'); stats.set('ok', ok); stats.set('n', n); stats.set('best', b == null ? '–' : b + '/12'); locked = false;
        if (i >= deck.length) { AI.progress.best('fol-translate', ok); body.innerHTML = `<div class="score-big">${ok} / ${deck.length}</div><p class="lede" style="margin:8px 0 16px">Every wrong option was a classic slip. Re-read the explanations for the ones you missed.</p><button type="button" class="btn primary" data-a>${AI.icon.reset}Play again</button>`; body.querySelector('[data-a]').onclick = start; return; }
        const [en, opts, why] = deck[i]; const order = AI.shuffle([0, 1, 2, 3]);
        body.innerHTML = `<p class="small muted" style="margin:0">Sentence ${i + 1} of ${deck.length}</p><p style="font-size:22px;font-weight:700;font-family:var(--display);margin:6px 0 16px">${esc(en)}</p><div class="quiz" style="max-width:none"><div class="opts" style="display:grid;gap:8px">${order.map(k => `<button type="button" class="opt" style="display:block;text-align:left;border:1px solid var(--line2);border-radius:11px;padding:12px;background:var(--bg);cursor:pointer;font-family:var(--mono);font-size:15px" data-k="${k}">${esc(opts[k])}</button>`).join('')}</div></div>`;
        body.querySelectorAll('[data-k]').forEach(btn => btn.onclick = () => {
          if (locked) return; locked = true; n++; const right = +btn.dataset.k === 0; if (right) ok++;
          body.querySelectorAll('[data-k]').forEach(x => { x.disabled = true; if (+x.dataset.k === 0) { x.style.borderColor = 'var(--ok)'; x.style.boxShadow = '0 0 0 1px var(--ok)'; } else if (x === btn) { x.style.borderColor = 'var(--bad)'; } });
          fb.innerHTML = `<b style="color:${right ? 'var(--ok)' : 'var(--bad)'}">${right ? 'Right.' : 'Not quite.'}</b> ${esc(why)}`; stats.set('ok', ok); stats.set('n', n);
          const nx = AI.el(`<button type="button" class="btn primary" style="margin-top:14px">${i === deck.length - 1 ? 'See your score' : 'Next sentence'}${AI.icon.arrow}</button>`); body.appendChild(nx); nx.onclick = () => { i++; show(); };
        });
      }
      start();
    }
  });

  /* ---------- unification ---------- */
  const UPAIRS = [['Knows(John, x)', 'Knows(John, Jane)'], ['Knows(John, x)', 'Knows(y, Bill)'], ['Knows(John, x)', 'Knows(y, Mother(y))'], ['Knows(John, x)', 'Knows(x, Elizabeth)'], ['Knows(John, x)', 'Knows(z, Elizabeth)'], ['P(x, F(x))', 'P(F(y), y)'], ['Q(x, G(x, y), y)', 'Q(A, z, B)'], ['R(x, x)', 'R(F(y), G(y))']];
  AI.lab({
    id: 'unify', ch: 9, kind: 'demo', title: 'Unification, step by step',
    blurb: 'Find the most general unifier of two first-order expressions, one recursive step at a time, with the occur check.',
    tags: ['UNIFY', 'most general unifier', 'occur check', 'standardizing apart'],
    how: [['The book’s four examples', '<ul><li>Knows(John, x) and Knows(John, Jane): {x/Jane}.</li><li>Knows(John, x) and Knows(y, Bill): {x/Bill, y/John}.</li><li>Knows(John, x) and Knows(y, Mother(y)): {y/John, x/Mother(John)}.</li><li>Knows(John, x) and Knows(x, Elizabeth): fail, because x cannot be both John and Elizabeth. Renaming the second sentence’s variable (standardizing apart) fixes it: Knows(z, Elizabeth) unifies with {z/John, x/Elizabeth}.</li></ul>'],
      ['The occur check', '<p>A variable cannot be bound to a term that contains it: P(x, F(x)) and P(F(y), y) would need y = F(F(y)), an infinite term. The check makes unification quadratic in the size of the expressions; Prolog skips it for speed.</p>']],
    mount(root, ctx) {
      const st = { a: UPAIRS[0][0], b: UPAIRS[0][1], pre: 0, occ: true };
      const Lu = AI.layout(root, { cls: 'even' }); Lu.stage.classList.add('plain');
      const list = AI.el('<div style="padding:16px"></div>'); Lu.stage.appendChild(list);
      const pc = AI.panel(Lu.side, 'Expressions');
      const refs = AI.controls(pc, [{ t: 'select', k: 'pre', label: 'Examples', opts: UPAIRS.map((p, i) => [i, `${p[0]}  ·  ${p[1]}`]), grow: true }, { t: 'row' }, { t: 'text', k: 'a', label: 'First', grow: true, live: true }, { t: 'row' }, { t: 'text', k: 'b', label: 'Second', grow: true, live: true }, { t: 'row' }, { t: 'check', k: 'occ', label: 'Occur check' }], st, k => { if (k === 'pre') { st.a = UPAIRS[st.pre][0]; st.b = UPAIRS[st.pre][1]; refs.a.value = st.a; refs.b.value = st.b; } run(); });
      const pp = AI.panel(Lu.side, 'Pseudocode'); const pseudo = AI.pseudo(pp, ['function UNIFY(x, y, θ)', '  if x and y are identical: return θ', '  if x is a variable: UNIFY-VAR(x, y, θ)', '  if y is a variable: UNIFY-VAR(y, x, θ)', '  if both compound: unify the arguments', '  else: return failure', 'function UNIFY-VAR(var, x, θ)', '  if var is bound to v: UNIFY(v, x, θ)', '  if x is bound to v: UNIFY(var, v, θ)', '  if OCCUR-CHECK(var, x): return failure', '  else: return θ + {var/x}', 'result']);
      const pr = AI.panel(Lu.side, 'Result'); const res = AI.el('<div class="explain"></div>'); pr.appendChild(res);
      const player = AI.Player(Lu.stageCol, ctx, (f, i) => { pseudo.hl(f.line); list.querySelectorAll('[data-s]').forEach(el => { const k = +el.dataset.s; el.style.opacity = k <= i ? 1 : 0.32; el.style.background = k === i ? 'color-mix(in srgb,var(--accent) 16%,transparent)' : 'transparent'; }); });
      function run() {
        let x, y; try { x = F.parseTerm(st.a); y = F.parseTerm(st.b); } catch (e) { res.innerHTML = `<b>Cannot read that:</b> ${esc(e.message)}.`; list.innerHTML = ''; player.set([]); return; }
        const u = F.unify(x, y, st.occ);
        list.innerHTML = u.steps.map((s, i) => `<div data-s="${i}" style="display:grid;grid-template-columns:28px minmax(0,1fr);gap:8px;padding:8px 6px;border-bottom:1px solid var(--line);border-radius:8px"><b class="muted num">${i + 1}</b><div><div>${s.msg}</div>${s.th ? `<div class="mono small muted" style="margin-top:3px">θ = ${esc(F.substStr(s.th))}</div>` : ''}</div></div>`).join('');
        res.innerHTML = u.th ? `<b style="color:var(--ok)">Unifier:</b> <span class="mono">${esc(F.substStr(u.th))}</span><p class="small" style="margin:6px 0 0">Both become <span class="mono">${esc(F.str(F.subst(u.th, x)))}</span>.</p>` : '<b style="color:var(--bad)">They do not unify.</b>';
        player.set(u.steps, true);
      }
      run();
    }
  });
  AI.lab({
    id: 'unify-game', ch: 9, kind: 'game', title: 'Unify or fail?',
    blurb: 'A rapid-fire round: for each pair of expressions, choose the most general unifier, or say they cannot be unified.',
    tags: ['unification', 'MGU', 'occur check', 'exam practice'],
    how: [['How to play', '<p>Ten pairs per round. Each has one correct answer: the most general unifier written as a substitution, or “fail”. Variables are lower-case; everything upper-case is a constant or a function.</p>'], ['A quick method', '<p>Walk both expressions left to right. At the first difference, if one side is a variable, bind it (after applying the bindings you already have) and continue; if both are different constants or functions, fail.</p>']],
    mount(root, ctx) {
      const Lg = AI.layout(root, { cls: 'even' }); Lg.stage.classList.add('plain');
      const body = AI.el('<div style="padding:20px"></div>'); Lg.stage.appendChild(body);
      const ps = AI.panel(Lg.side, 'Score'); const stats = AI.stats(ps, [['ok', 'correct'], ['n', 'of 10'], ['best', 'best round']]);
      const pf = AI.panel(Lg.side, 'Why'); const fb = AI.el('<div class="explain small">Pick an answer.</div>'); pf.appendChild(fb);
      const V = ['x', 'y', 'z'], C = ['A', 'B', 'John', 'Jane'], FN = ['F', 'G'];
      const r = Math.random;
      const randTerm = d => { const k = r(); if (d > 1 || k < 0.4) return { v: AI.pick(V, r) }; if (k < 0.75) return { c: AI.pick(C, r) }; return { f: AI.pick(FN, r), args: [randTerm(d + 1)] }; };
      const make = () => { for (;;) { const p = AI.pick(['P', 'Q', 'Knows'], r); const n = 2 + ((r() * 2) | 0); const a = { f: p, args: AI.range(n).map(() => randTerm(0)) }; const b = { f: p, args: AI.range(n).map(() => randTerm(0)) }; if (F.str(a) === F.str(b)) continue; const u = F.unify(a, b, true); const opts = new Set(); const correct = u.th ? F.substStr(u.th) : 'fail'; opts.add(correct); if (correct !== 'fail') opts.add('fail'); let tries = 0; while (opts.size < 4 && tries++ < 40) { const th = {}; const vs = [...new Set((F.str(a) + F.str(b)).match(/\b[a-z]\b/g) || [])]; vs.forEach(v => { if (r() < 0.7) th[v] = r() < 0.6 ? { c: AI.pick(C, r) } : { v: AI.pick(V.filter(x => x !== v), r) }; }); const s = Object.keys(th).length ? F.substStr(th) : '{}'; if (s !== correct) opts.add(s); } if (opts.size < 3) continue; return { a, b, correct, opts: AI.shuffle([...opts]), u }; } };
      let i, ok, cur, locked;
      const start = () => { i = 0; ok = 0; next(); };
      function next() {
        stats.set('ok', ok); stats.set('n', i); const best = AI.progress.best('unify-game'); stats.set('best', best == null ? '–' : best + '/10'); locked = false;
        if (i >= 10) { AI.progress.best('unify-game', ok); body.innerHTML = `<div class="score-big">${ok} / 10</div><p class="lede" style="margin:8px 0 16px">${ok >= 9 ? 'Excellent unifying.' : 'Use the step-by-step demo to see where the misses went wrong.'}</p><button type="button" class="btn primary" data-a>${AI.icon.reset}Another round</button>`; body.querySelector('[data-a]').onclick = start; return; }
        cur = make();
        body.innerHTML = `<p class="small muted" style="margin:0">Pair ${i + 1} of 10</p><div class="formula" style="font-size:17px;margin:10px 0">${esc(F.str(cur.a))}\n${esc(F.str(cur.b))}</div><div style="display:grid;gap:8px">${cur.opts.map(o => `<button type="button" class="btn" style="justify-content:flex-start;font-family:var(--mono);font-weight:500" data-o="${esc(o)}">${esc(o === 'fail' ? 'fail: they do not unify' : o)}</button>`).join('')}</div>`;
        body.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { if (locked) return; locked = true; const right = b.dataset.o === cur.correct; if (right) ok++; body.querySelectorAll('[data-o]').forEach(x => { x.disabled = true; if (x.dataset.o === cur.correct) { x.style.borderColor = 'var(--ok)'; x.style.boxShadow = '0 0 0 1px var(--ok)'; } else if (x === b) x.style.borderColor = 'var(--bad)'; }); fb.innerHTML = `<b style="color:${right ? 'var(--ok)' : 'var(--bad)'}">${right ? 'Right.' : 'Not quite.'}</b> ${cur.u.steps.filter(s => /Bind|fail|Occur|different/.test(s.msg)).map(s => s.msg).slice(0, 4).join(' ')}`; i++; ctx.after(right ? 900 : 2200, next); });
      }
      start();
    }
  });

  /* ---------- forward and backward chaining in FOL ---------- */
  const KBS = {
    crime: ['American(x) ∧ Weapon(y) ∧ Sells(x, y, z) ∧ Hostile(z) ⇒ Criminal(x)', 'Owns(Nono, M1)', 'Missile(M1)', 'Missile(x) ∧ Owns(Nono, x) ⇒ Sells(West, x, Nono)', 'Missile(x) ⇒ Weapon(x)', 'Enemy(x, America) ⇒ Hostile(x)', 'American(West)', 'Enemy(Nono, America)'],
    family: ['Parent(Asha, Bina)', 'Parent(Bina, Chitra)', 'Parent(Chitra, Dev)', 'Parent(x, y) ⇒ Ancestor(x, y)', 'Parent(x, y) ∧ Ancestor(y, z) ⇒ Ancestor(x, z)']
  };
  AI.lab({
    id: 'fol-chaining', ch: 9, kind: 'demo', title: 'Chaining with variables: the crime case',
    blurb: 'Prove that Colonel West is a criminal from the book’s knowledge base, by forward chaining and by backward chaining, and see the proof tree.',
    tags: ['definite clauses', 'forward chaining', 'backward chaining', 'generalized Modus Ponens', 'proof tree'],
    how: [['The story, in the book’s words paraphrased', '<p>It is a crime for an American to sell weapons to hostile nations. The country Nono, an enemy of America, has some missiles, and all of its missiles were sold to it by Colonel West, who is American. The eight definite clauses on the right encode this, with M1 naming one of Nono’s missiles.</p>'],
      ['Forward chaining', '<p>In round 1, three rules fire: Missile(M1) gives Weapon(M1); Missile(M1) and Owns(Nono, M1) give Sells(West, M1, Nono); Enemy(Nono, America) gives Hostile(Nono). In round 2 the crime rule fires and Criminal(West) is added. Each firing is generalized Modus Ponens with a unifier.</p>'],
      ['Backward chaining', '<p>Start from the goal Criminal(x) and work back, Prolog style: depth-first, left to right, carrying the substitution along. The answer is {x/West}.</p>']],
    mount(root, ctx) {
      const st = { kb: 'crime', mode: 'fc', q: 'Criminal(x)' };
      const Lc = AI.layout(root);
      const box = AI.el('<div style="position:relative;aspect-ratio:1.6;min-height:300px"></div>'); Lc.stage.appendChild(box);
      let tree = null;
      const sv = AI.svgHost(box, ctx, (w, h) => drawProof(w, h));
      const pc = AI.panel(Lc.side, 'Knowledge base');
      const refs = AI.controls(pc, [{ t: 'select', k: 'kb', label: 'KB', opts: [['crime', 'Crime (book)'], ['family', 'Family tree (ancestors)']], str: true }, { t: 'seg', k: 'mode', label: 'Method', opts: [['fc', 'Forward'], ['bc', 'Backward']] }, { t: 'row' }, { t: 'text', k: 'q', label: 'Query', grow: true }], st, k => { if (k === 'kb') { st.q = st.kb === 'crime' ? 'Criminal(x)' : 'Ancestor(Asha, z)'; refs.q.value = st.q; } build(); });
      const kbList = AI.el('<ol class="small mono" style="margin:10px 0 0;padding-left:22px"></ol>'); pc.appendChild(kbList);
      const pe = AI.panel(Lc.side, 'Steps'); const ex = AI.el('<div class="explain small"></div>'); pe.appendChild(ex);
      const player = AI.Player(Lc.stageCol, ctx, f => { tree = f.tree; sv.redraw(); ex.innerHTML = f.msg; });
      function drawProof(w, h) {
        if (!tree || !tree.length) return `<text x="${w / 2}" y="${h / 2}" text-anchor="middle" class="svg-s">The proof tree appears here.</text>`;
        const kids = {}; tree.forEach(n => { if (n.parent != null) (kids[n.parent] = kids[n.parent] || []).push(n.id); });
        const depth = {}, rootN = tree.find(n => n.parent == null); const pos = {}; let leafX = 0;
        const lay = (id, d) => { depth[id] = d; const ks = kids[id] || []; if (!ks.length) { pos[id] = leafX++; return pos[id]; } const xs = ks.map(k => lay(k, d + 1)); pos[id] = (Math.min(...xs) + Math.max(...xs)) / 2; return pos[id]; };
        lay(rootN.id, 0); const maxD = Math.max(...Object.values(depth)); const nx = Math.max(1, leafX);
        const fs0 = Math.max(10, Math.min(13, (w - 40) / nx / 7.5)), mg = Math.max(60, Math.max(...tree.map(n => n.goal.length)) * fs0 * 0.31 + 12); const X = id => mg + (w - 2 * mg) * (nx === 1 ? 0.5 : pos[id] / (nx - 1)), Y = id => st.mode === 'fc' ? h - 30 - (h - 60) * (maxD - depth[id]) / Math.max(1, maxD) : 28 + (h - 56) * depth[id] / Math.max(1, maxD);
        let s = '';
        tree.forEach(n => { if (n.parent != null) s += `<line x1="${X(n.parent)}" y1="${Y(n.parent)}" x2="${X(n.id)}" y2="${Y(n.id)}" stroke="var(--v-edge)" stroke-width="2"/>`; });
        const fs = Math.max(10, Math.min(13, (w - 40) / nx / 7.5));
        tree.forEach(n => { const col = n.status === 'yes' ? 'var(--v-goal)' : n.status === 'no' ? 'var(--bad)' : n.status === 'fact' ? 'var(--bg3)' : 'var(--v-frontier)'; const tw = Math.min(n.goal.length * fs * 0.6 + 14, (w - 20) / Math.max(1, nx) + 40); s += `<rect x="${X(n.id) - tw / 2}" y="${Y(n.id) - 13}" width="${tw}" height="26" rx="7" fill="var(--bg)" stroke="${col}" stroke-width="2.5"/><text x="${X(n.id)}" y="${Y(n.id) + 4}" text-anchor="middle" class="svg-m" style="font-size:${fs}px">${esc(n.goal)}</text>`; });
        return s;
      }
      function build() {
        const rules = KBS[st.kb].map(F.parseRule); kbList.innerHTML = KBS[st.kb].map(r => `<li>${esc(r)}</li>`).join('');
        let q; try { q = F.parseTerm(st.q); } catch (e) { ex.innerHTML = 'Write the query as an atom, such as Criminal(x).'; return; }
        if (st.mode === 'fc') {
          const r = F.forwardChain(rules, q); const frames = []; const derived = {};
          rules.filter(x => !x.prem.length).forEach(x => derived[F.str(x.concl)] = null);
          r.rounds.forEach(rd => { rd.added.forEach(a => { derived[F.str(a.fact)] = { prem: a.rule.prem.map(p => F.str(F.subst(a.th, p))) }; }); });
          const proofOf = fact => { const t = []; const add = (f, parent) => { const id = t.length; const d = derived[f]; t.push({ id, parent, goal: f, status: d ? 'yes' : 'fact' }); if (d) d.prem.forEach(p => add(p, id)); }; add(fact, null); return t; };
          const target = r.rounds.find(x => x.hit) ? r.rounds.find(x => x.hit).hit : null;
          r.rounds.forEach(rd => { const facts = rd.added.map(a => `<li><b class="mono">${esc(F.str(a.fact))}</b> from “${esc(F.ruleStr(a.rule))}” with θ = <span class="mono">${esc(F.substStr(a.th))}</span></li>`).join(''); frames.push({ msg: rd.added.length ? `<b>Round ${rd.round}</b>: ${rd.added.length} new fact${rd.added.length > 1 ? 's' : ''}.<ul style="padding-left:18px;margin:6px 0 0">${facts}</ul>${rd.hit ? `<p style="margin:8px 0 0">${esc(rd.hit)} matches the query. Done.</p>` : ''}` : `<b>Round ${rd.round}</b>: no rule produces anything new, so forward chaining stops.`, tree: target ? proofOf(target).map(n => Object.assign(n, { status: rd.added.some(a => F.str(a.fact) === n.goal) || n.status === 'fact' || r.rounds.slice(0, rd.round - 1).some(p => p.added.some(a => F.str(a.fact) === n.goal)) ? (n.status === 'fact' ? 'fact' : 'yes') : 'open' })) : [] }); });
          frames.unshift({ msg: `Start with the ${rules.filter(x => !x.prem.length).length} facts in the KB. Each round fires every rule whose premises can all be matched to known facts.`, tree: target ? proofOf(target).map(n => Object.assign(n, { status: n.status === 'fact' ? 'fact' : 'open' })) : [] });
          player.set(frames);
        } else { const r = F.backwardChain(rules, q, 200); player.set(r.frames.map(f => ({ msg: f.msg, tree: f.tree.map(n => Object.assign({}, n, { status: n.status === 'yes' && !n.rule ? 'yes' : n.status })) }))); }
      }
      build();
    }
  });

})(window);
