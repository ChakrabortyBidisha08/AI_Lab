/* Chapter 19 (Learning from Examples) and Global Edition chapter 20 (Knowledge in Learning) labs. */
(function (G) {
  'use strict';
  const AI = G.AI, E = G.AIE, esc = AI.esc;
  const R = E.restaurant;

  /* =====================================================================
     Decision trees on the book's restaurant data
     ===================================================================== */
  // Build the tree with a trace of frames; each node gets an id so frames can reveal it.
  function treeTrace(rows) {
    let nid = 0; const frames = [], reveal = [];
    function rec(exs, attrs, parent, depth, via) {
      const id = nid++; const node = { id, ids: exs.map(r => r.id), depth, via };
      const snap = (line, msg, extra) => frames.push(Object.assign({ cur: id, line, msg, ids: node.ids, shown: reveal.slice() }, extra || {}));
      if (!exs.length) { node.leaf = E.dt.plurality(parent, 'WillWait'); node.empty = true; reveal.push(id); snap(2, `No examples reach this branch${via ? ` (${esc(via)})` : ''}, so it predicts the majority of its parent’s examples: <b>${node.leaf}</b>.`); return node; }
      const ys = new Set(exs.map(r => r.WillWait));
      if (ys.size === 1) { node.leaf = exs[0].WillWait; reveal.push(id); snap(3, `All ${exs.length} example${exs.length > 1 ? 's' : ''} here (${node.ids.join(', ')}) have WillWait = ${node.leaf}. Make a leaf.`); return node; }
      if (!attrs.length) { node.leaf = E.dt.plurality(exs, 'WillWait'); node.mixed = true; reveal.push(id); snap(4, `No attributes left: predict the majority, ${node.leaf}.`); return node; }
      const gains = E.dt.gainTable(exs, attrs, R.values, 'WillWait'); let best = gains[0]; gains.forEach(g => { if (g.gain > best.gain + 1e-12) best = g; });
      node.attr = best.a; node.gain = best.gain; node.kids = []; reveal.push(id);
      const ties = gains.filter(g => Math.abs(g.gain - best.gain) < 1e-9 && g.a !== best.a).map(g => g.a);
      snap(6, `${exs.length} examples (${node.ids.join(', ')}), ${exs.filter(r => r.WillWait === 'Yes').length} Yes and ${exs.filter(r => r.WillWait === 'No').length} No. The attribute with the highest information gain is <b>${best.a}</b>: ${best.gain.toFixed(3)} bits.${ties.length ? ` (${ties.join(', ')} tie${ties.length > 1 ? '' : 's'} with it; the first in the list is taken.)` : ''}`, { gains: gains.map(g => [g.a, g.gain]), best: best.a });
      for (const v of R.values[best.a]) node.kids.push({ v, node: rec(exs.filter(r => r[best.a] === v), attrs.filter(a => a !== best.a), exs, depth + 1, `${best.a} = ${v}`) });
      return node;
    }
    const root = rec(rows, R.attrs, rows, 0, '');
    frames.push({ cur: -1, line: 12, msg: `The finished tree has ${nid} nodes and classifies all 12 training examples correctly. Unlike the full table of 10 attributes, it tests only Patrons, Hungry, Type and Fri/Sat.`, ids: [], shown: AI.range(nid) });
    return { root, frames, n: nid };
  }
  // Layout: leaves spaced evenly; parents centred over children.
  function layoutTree(root) {
    let leaf = 0, maxD = 0; const pos = {};
    (function walk(n) { maxD = Math.max(maxD, n.depth); if (n.leaf || !n.kids || !n.kids.length) { pos[n.id] = { x: leaf++, d: n.depth }; return; } n.kids.forEach(k => walk(k.node)); const xs = n.kids.map(k => pos[k.node.id].x); pos[n.id] = { x: (Math.min(...xs) + Math.max(...xs)) / 2, d: n.depth }; })(root);
    return { pos, leaves: leaf, depth: maxD };
  }
  function treeSVG(w, h, root, o) {
    o = o || {}; const L = layoutTree(root), padX = 56, padY = 30, nw = Math.min(118, (w - padX * 2) / Math.max(1, L.leaves) - 8), nh = 34;
    const X = x => L.leaves <= 1 ? w / 2 : padX + x * (w - padX * 2) / (L.leaves - 1), Y = d => padY + d * (h - padY * 2 - nh) / Math.max(1, L.depth);
    let s = '', labels = '';
    (function edges(n) { if (!n.kids) return; n.kids.forEach(k => { const c = k.node, show = !o.shown || o.shown.has(c.id); const x1 = X(L.pos[n.id].x), y1 = Y(n.depth) + nh, x2 = X(L.pos[c.id].x), y2 = Y(c.depth); s += `<path d="M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}" fill="none" stroke="${show ? 'var(--line2)' : 'var(--line)'}" stroke-width="2" ${show ? '' : 'stroke-dasharray="4 5"'}/>`; labels += `<text x="${(x1 + x2) / 2 + (x2 > x1 ? 6 : x2 < x1 ? -6 : 8)}" y="${(y1 + y2) / 2 + 4}" text-anchor="${x2 > x1 ? 'start' : x2 < x1 ? 'end' : 'start'}" class="svg-s halo-bg" style="font-size:12px">${esc(k.v)}</text>`; edges(c); }); })(root);
    s += labels;
    (function nodes(n) {
      const show = !o.shown || o.shown.has(n.id), x = X(L.pos[n.id].x), y = Y(n.depth), cur = o.cur === n.id;
      if (show) {
        if (n.leaf) { const yes = n.leaf === 'Yes'; s += `<rect x="${x - nw / 2}" y="${y}" width="${nw}" height="${nh}" rx="17" fill="${yes ? 'color-mix(in srgb,var(--ok) 20%,var(--bg))' : 'color-mix(in srgb,var(--bad) 16%,var(--bg))'}" stroke="${cur ? 'var(--accent)' : yes ? 'var(--ok)' : 'var(--bad)'}" stroke-width="${cur ? 3.5 : 2}" ${o.click ? `data-n="${n.id}"` : ''}/><text x="${x}" y="${y + 22}" text-anchor="middle" class="svg-b" style="font-size:14px">${n.leaf}${n.empty ? '*' : ''}</text>`; }
        else if (n.attr) { s += `<rect x="${x - nw / 2}" y="${y}" width="${nw}" height="${nh}" rx="8" fill="var(--bg)" stroke="${cur ? 'var(--accent)' : 'var(--ink2)'}" stroke-width="${cur ? 3.5 : 2}"/><text x="${x}" y="${y + 22}" text-anchor="middle" class="svg-b" style="font-size:14px">${esc(n.attr)}?</text>`; }
        else { s += `<rect x="${x - nw / 2}" y="${y}" width="${nw}" height="${nh}" rx="8" fill="color-mix(in srgb,var(--accent) 12%,var(--bg))" stroke="var(--accent)" stroke-width="${cur ? 3.5 : 2}" stroke-dasharray="5 4" ${o.click ? `data-n="${n.id}" style="cursor:pointer"` : ''}/><text x="${x}" y="${y + 22}" text-anchor="middle" class="svg-t" style="font-size:13px;font-weight:600" pointer-events="none">choose…</text>`; }
        if (o.counts && n.ids) { const yv = n.ids.filter(id => R.rows.find(r => r.id === id).WillWait === 'Yes').length; s += `<text x="${x}" y="${y + nh + 14}" text-anchor="middle" class="svg-s" style="font-size:11px">${yv}✓ ${n.ids.length - yv}✗</text>`; }
      } else s += `<circle cx="${x}" cy="${y + nh / 2}" r="9" fill="var(--bg)" stroke="var(--line2)" stroke-dasharray="3 3"/>`;
      if (n.kids) n.kids.forEach(k => nodes(k.node));
    })(root);
    return s;
  }
  function dataTable(hl) {
    const cols = R.attrs.concat(['WillWait']);
    return `<div class="scroll"><table class="tbl compact"><thead><tr><th>Ex.</th>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${R.rows.map(r => `<tr style="${hl && hl.has(r.id) ? 'background:color-mix(in srgb,var(--accent) 13%,transparent)' : hl && hl.size ? 'opacity:.45' : ''}"><td><b>${r.id}</b></td>${cols.map(c => `<td${c === 'WillWait' ? ` style="font-weight:700;color:${r[c] === 'Yes' ? 'var(--ok)' : 'var(--bad)'}"` : ''}>${esc(r[c])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  const PSEUDO_DT = ['function LEARN-DECISION-TREE(examples, attributes, parent_examples)', '  if examples is empty then return PLURALITY-VALUE(parent_examples)', '  else if all examples have the same class then return that class', '  else if attributes is empty then return PLURALITY-VALUE(examples)', '  else', '    A ← the attribute with the highest IMPORTANCE (information gain)', '    tree ← a new decision tree with root test A', '    for each value v of A do', '      exs ← the examples with A = v', '      subtree ← LEARN-DECISION-TREE(exs, attributes − A, examples)', '      add a branch labelled (A = v) leading to subtree', '  return tree'];

  AI.lab({
    id: 'decision-tree', ch: 19, kind: 'demo', title: 'Learning a decision tree: the restaurant problem',
    blurb: 'The book’s twelve restaurant examples. Step through the decision-tree learner as it picks the attribute with the highest information gain at every node.',
    tags: ['decision tree', 'information gain', 'entropy', 'ID3', 'restaurant example'],
    how: [['Entropy and gain', '<p>For a node with p positive and n negative examples, the entropy is B(p/(p+n)) bits, where B(q) = −(q log₂ q + (1−q) log₂(1−q)). Splitting on attribute A leaves an expected entropy Remainder(A) = Σ (pₖ+nₖ)/(p+n) · B(pₖ/(pₖ+nₖ)). The gain is the difference.</p>'],
      ['Numbers to check', '<ul><li>At the root, Gain(Patrons) = 0.541 bits and Gain(Type) = 0 bits.</li><li>The finished tree tests Patrons, then Hungry, then Type, then Fri/Sat, as in the book.</li><li>The French branch under Type has no examples, so it takes the majority of its parent (marked *).</li></ul>'],
      ['Read the table', '<p>The highlighted rows are the examples that reach the node being processed.</p>']],
    mount(root, ctx) {
      const T = treeTrace(R.rows); let frame = T.frames[0];
      const Ld = AI.layout(root);
      Ld.stage.style.minHeight = '430px';
      const sv = AI.svgHost(Ld.stage, ctx, (w, h) => treeSVG(w, h, T.root, { shown: new Set(frame.shown), cur: frame.cur }));
      const player = AI.Player(Ld.stageCol, ctx, f => { frame = f; sv.redraw(); pseudo.hl(f.line); ex.innerHTML = f.msg; tbl.innerHTML = dataTable(new Set(f.ids)); gains(f); }, { speed: 1400 });
      const pp = AI.panel(Ld.side, 'Pseudocode'); const pseudo = AI.pseudo(pp, PSEUDO_DT);
      const pe = AI.panel(Ld.side, 'This step'); const ex = AI.el('<div class="explain small"></div>'); pe.appendChild(ex);
      const pg = AI.panel(Ld.side, 'Information gain at this node'); const gbox = AI.el('<div class="small muted">Shown when a node is split.</div>'); pg.appendChild(gbox);
      const pt = AI.panel(Ld.below, 'The twelve examples'); const tbl = AI.el('<div></div>'); pt.appendChild(tbl);
      function gains(f) { if (!f.gains) { gbox.innerHTML = '<span class="small muted">Shown when a node is split.</span>'; return; } const mx = Math.max(0.001, ...f.gains.map(g => g[1])); AI.bars(gbox, f.gains.slice().sort((a, b) => b[1] - a[1]).map(([a, g]) => ({ label: a, value: g, text: g.toFixed(3), color: a === f.best ? 'var(--accent)' : 'var(--ink2)' })), mx); }
      player.set(T.frames);
    }
  });

  /* ---------- the game: build the tree yourself ---------- */
  AI.lab({
    id: 'tree-builder', ch: 19, kind: 'game', title: 'Grow the smallest tree',
    blurb: 'Choose the attribute to test at each node of a decision tree for the restaurant data. Can you match the tree found by information gain, with 12 nodes?',
    tags: ['decision tree', 'information gain', 'greedy search', 'Ockham’s razor'],
    how: [['How to play', '<p>Click a dashed node, then pick an attribute to test there. Each option shows how the node’s examples would split: ✓ for WillWait = Yes and ✗ for No. Branches whose examples all agree become leaves automatically. Aim for the fewest nodes.</p>'],
      ['Why small trees', '<p>A smaller tree consistent with the data is more likely to generalise: this is Ockham’s razor. Finding the smallest consistent tree is intractable in general, so learners pick the most informative attribute greedily, as here.</p>']],
    mount(root, ctx) {
      const Lt = AI.layout(root); Lt.stage.style.minHeight = '430px';
      let tree, nid, sel = null, choices = 0, done = false;
      const banner = AI.banner(Lt.stage);
      const sv = AI.svgHost(Lt.stage, ctx, (w, h) => tree ? treeSVG(w, h, tree, { click: true, cur: sel ? sel.id : null, counts: true }) : '');
      const pc = AI.panel(Lt.side, 'Choose an attribute'); const box = AI.el('<div class="small muted">Click a dashed node in the tree.</div>'); pc.appendChild(box);
      const ps = AI.panel(Lt.side, 'Your tree'); const stats = AI.stats(ps, [['nodes', 'nodes so far'], ['open', 'nodes to decide'], ['best', 'best finished tree']]);
      const fb = AI.el('<div class="explain small" style="margin-top:10px"></div>'); ps.appendChild(fb);
      const bar = AI.el('<div class="player"></div>'); Lt.stageCol.appendChild(bar); const bNew = AI.el(`<button type="button" class="btn">${AI.icon.reset}<span>Start again</span></button>`); bar.appendChild(bNew);
      const pt = AI.panel(Lt.below, 'The twelve examples'); const tbl = AI.el('<div></div>'); pt.appendChild(tbl);
      function make(ids, attrs, parentIds, depth, via) {
        const id = nid++, rows = ids.map(i => R.rows.find(r => r.id === i)); const n = { id, ids, attrs, depth, via };
        if (!rows.length) { n.leaf = E.dt.plurality(parentIds.map(i => R.rows.find(r => r.id === i)), 'WillWait'); n.empty = true; }
        else if (new Set(rows.map(r => r.WillWait)).size === 1) n.leaf = rows[0].WillWait;
        else if (!attrs.length) n.leaf = E.dt.plurality(rows, 'WillWait');
        return n;
      }
      const all = n => [n].concat(n.kids ? n.kids.flatMap(k => all(k.node)) : []);
      function reset() { nid = 0; tree = make(R.rows.map(r => r.id), R.attrs.slice(), [], 0, ''); sel = tree; choices = 0; done = false; fb.textContent = ''; update(); }
      function update() {
        const ns = all(tree), open = ns.filter(n => !n.leaf && !n.attr); stats.set('nodes', ns.length); stats.set('open', open.length); const b = AI.progress.best('tree-builder'); stats.set('best', b == null ? '–' : b);
        tbl.innerHTML = dataTable(sel ? new Set(sel.ids) : null); sv.redraw();
        if (!sel || sel.leaf || sel.attr) { box.innerHTML = open.length ? '<span class="small muted">Click a dashed node in the tree.</span>' : ''; }
        else {
          const rows = sel.ids.map(i => R.rows.find(r => r.id === i));
          box.innerHTML = `<p class="small" style="margin:0 0 8px">${sel.via ? `Branch ${esc(sel.via)}: ` : 'Root: '}${rows.length} examples, ${rows.filter(r => r.WillWait === 'Yes').length}✓ ${rows.filter(r => r.WillWait === 'No').length}✗.</p><div style="display:grid;gap:6px">${sel.attrs.map(a => `<button type="button" class="pick" data-a="${esc(a)}" style="padding:8px 10px;gap:2px"><b>${esc(a)}</b><span class="small">${R.values[a].map(v => { const s = rows.filter(r => r[a] === v), y = s.filter(r => r.WillWait === 'Yes').length; return `${esc(v)} ${y}✓${s.length - y}✗`; }).join(' · ')}</span></button>`).join('')}</div>`;
          box.querySelectorAll('[data-a]').forEach(btn => btn.onclick = () => choose(btn.dataset.a));
        }
        if (!open.length && !done) { done = true; const n = ns.length; const better = AI.progress.best('tree-builder', n, false); stats.set('best', AI.progress.best('tree-builder')); banner(`${n === 12 ? 'Twelve nodes: as small as the information-gain tree' : n < 12 ? `${n} nodes: smaller than the information-gain tree!` : `${n} nodes`}<small>${better ? 'New best. ' : ''}The tree learned by information gain has 12 nodes.</small>`, 4200); }
      }
      function choose(a) {
        const rows = sel.ids.map(i => R.rows.find(r => r.id === i)); const gains = E.dt.gainTable(rows, sel.attrs, R.values, 'WillWait'); const mine = gains.find(g => g.a === a), best = Math.max(...gains.map(g => g.gain)), tops = gains.filter(g => g.gain > best - 1e-9).map(g => g.a);
        fb.innerHTML = Math.abs(mine.gain - best) < 1e-9 ? `<b>${esc(a)}</b> has the highest information gain here, ${best.toFixed(3)} bits${tops.length > 1 ? ` (tied with ${tops.filter(x => x !== a).join(', ')})` : ''}.` : `<b>${esc(a)}</b> gains ${mine.gain.toFixed(3)} bits; the best here was ${tops.join(' or ')}, with ${best.toFixed(3)} bits.`;
        sel.attr = a; sel.kids = R.values[a].map(v => ({ v, node: make(rows.filter(r => r[a] === v).map(r => r.id), sel.attrs.filter(x => x !== a), sel.ids, sel.depth + 1, `${a} = ${v}`) }));
        choices++; sel = all(tree).find(n => !n.leaf && !n.attr) || null; update();
      }
      ctx.on(Lt.stage, 'click', e => { const t = e.target.closest('[data-n]'); if (!t) return; const n = all(tree).find(x => x.id === +t.dataset.n); if (n && !n.leaf && !n.attr) { sel = n; update(); } });
      bNew.onclick = reset; reset();
    }
  });

  /* =====================================================================
     Version space (candidate elimination) — Global Edition chapter 20
     ===================================================================== */
  const VS_ATTR = ['Sky', 'AirTemp', 'Humidity', 'Wind', 'Water', 'Forecast'], VS_DOM = [['Sunny', 'Cloudy', 'Rainy'], ['Warm', 'Cold'], ['Normal', 'High'], ['Strong', 'Weak'], ['Warm', 'Cool'], ['Same', 'Change']];
  const VS_EX = [[['Sunny', 'Warm', 'Normal', 'Strong', 'Warm', 'Same'], true], [['Sunny', 'Warm', 'High', 'Strong', 'Warm', 'Same'], true], [['Rainy', 'Cold', 'High', 'Strong', 'Warm', 'Change'], false], [['Sunny', 'Warm', 'High', 'Strong', 'Cool', 'Change'], true]];
  AI.lab({
    id: 'version-space', ch: 'G20', kind: 'demo', title: 'Version spaces: the S and G boundaries',
    blurb: 'Candidate elimination keeps every hypothesis consistent with the data, represented by its most specific (S) and most general (G) members. Add examples and watch the boundaries close in.',
    tags: ['version space', 'candidate elimination', 'least-commitment search', 'generalisation', 'specialisation'],
    how: [['Hypotheses', '<p>A hypothesis is a conjunction of constraints, one per attribute: a specific value, ? for any value, or ∅ for none. A positive example must be covered and a negative one must not.</p>'],
      ['The update', '<ul><li>A positive example removes from G anything that fails to cover it and minimally generalises S to cover it.</li><li>A negative example removes from S anything that covers it and minimally specialises G to exclude it, keeping only specialisations that are still more general than some member of S.</li></ul><p>When S and G meet, the concept has been learned exactly. If either becomes empty, no conjunctive hypothesis fits the data.</p>'],
      ['The data', '<p>The four starting examples are the well-known EnjoySport data from Tom Mitchell’s <i>Machine Learning</i> (1997), a standard illustration of candidate elimination. Add your own examples below.</p>']],
    mount(root, ctx) {
      let ex = VS_EX.map(e => [e[0].slice(), e[1]]), k = ex.length;
      const Lv = AI.layout(root, { cls: 'full' });
      const body = AI.el('<div style="padding:clamp(14px,2.2vw,24px);display:grid;gap:16px"></div>'); Lv.stage.appendChild(body); Lv.stage.classList.add('plain');
      const draft = VS_DOM.map(d => d[0]); let lab = true;
      const hstr = h => `⟨${h.map(v => v === '?' ? '<b>?</b>' : v === '∅' ? '∅' : esc(v)).join(', ')}⟩`;
      function run() {
        const steps = E.versionSpace(VS_ATTR, VS_DOM, ex.slice(0, k)), last = steps[steps.length - 1] || { S: [VS_ATTR.map(() => '∅')], G: [VS_ATTR.map(() => '?')] };
        const conv = last.S.length === 1 && last.G.length === 1 && last.S[0].join() === last.G[0].join(), empty = !last.S.length || !last.G.length;
        body.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px">
          <div><h4 style="font-family:var(--display);margin:0 0 6px">G, the most general boundary</h4>${last.G.length ? last.G.map(h => `<div class="mono small" style="padding:6px 8px;border:1px solid var(--line2);border-radius:8px;margin:4px 0">${hstr(h)}</div>`).join('') : '<p class="small" style="color:var(--bad)">empty</p>'}</div>
          <div><h4 style="font-family:var(--display);margin:0 0 6px">S, the most specific boundary</h4>${last.S.length ? last.S.map(h => `<div class="mono small" style="padding:6px 8px;border:1px solid var(--line2);border-radius:8px;margin:4px 0">${hstr(h)}</div>`).join('') : '<p class="small" style="color:var(--bad)">empty</p>'}</div></div>
          <p class="small" style="margin:0">${empty ? '<b style="color:var(--bad)">The version space has collapsed: no conjunctive hypothesis is consistent with these examples.</b>' : conv ? '<b>S and G have met: the target concept is identified.</b>' : 'Every hypothesis between S and G (more general than some member of S, more specific than some member of G) is consistent with the examples so far.'}</p>
          ${AI.table(['#'].concat(VS_ATTR).concat(['Label', 'In use']), ex.map((e, i) => `<tr style="${i < k ? '' : 'opacity:.45'}"><td>${i + 1}</td>${e[0].map(v => `<td>${esc(v)}</td>`).join('')}<td style="font-weight:700;color:${e[1] ? 'var(--ok)' : 'var(--bad)'}">${e[1] ? 'positive' : 'negative'}</td><td><input type="checkbox" data-u="${i}" ${i < k ? 'checked' : ''} aria-label="use example ${i + 1}"></td></tr>`), 'compact')}
          <div class="note-block"><h4>Add an example</h4><div class="ctl">${VS_ATTR.map((a, i) => `<label class="field"><span>${a}</span><select data-d="${i}">${VS_DOM[i].map(v => `<option ${draft[i] === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>`).join('')}<label class="field"><span>Label</span><select data-l><option value="1" ${lab ? 'selected' : ''}>positive</option><option value="0" ${lab ? '' : 'selected'}>negative</option></select></label></div><div class="ctl" style="margin-top:8px"><button type="button" class="btn primary" data-add>${AI.icon.next}<span>Add example</span></button><button type="button" class="btn" data-reset>${AI.icon.reset}<span>Back to Mitchell’s four</span></button></div></div>`;
        body.querySelectorAll('[data-u]').forEach(c => c.onchange = () => { const i = +c.dataset.u; k = c.checked ? Math.max(k, i + 1) : i; run(); });
        body.querySelectorAll('[data-d]').forEach(s => s.onchange = () => { draft[+s.dataset.d] = s.value; });
        body.querySelector('[data-l]').onchange = e => { lab = e.target.value === '1'; };
        body.querySelector('[data-add]').onclick = () => { ex = ex.slice(0, k); ex.push([draft.slice(), lab]); k = ex.length; run(); };
        body.querySelector('[data-reset]').onclick = () => { ex = VS_EX.map(e => [e[0].slice(), e[1]]); k = ex.length; run(); };
      }
      run();
    }
  });

  /* =====================================================================
     Shared 2-D plane on a canvas, data in [0,1] × [0,1]
     ===================================================================== */
  function plane(host, ctx, draw, aspect) {
    const st = AI.canvas(host, ctx, c => { const pad = 26; c.pad = pad; c.X = x => pad + x * (c.w - 2 * pad); c.Y = y => c.h - pad - y * (c.h - 2 * pad); c.ix = px => (px - pad) / (c.w - 2 * pad); c.iy = py => (c.h - pad - py) / (c.h - 2 * pad); draw(c); }, aspect || 0.72);
    st.cv.style.touchAction = 'manipulation'; return st;
  }
  function frame2d(c, regions, res) {
    const g = c.g, bg = AI.color('bg'), line = AI.color('line'), C1 = AI.color('v-path'), C0 = AI.color('accent');
    g.fillStyle = bg; g.fillRect(0, 0, c.w, c.h);
    if (regions) { const step = res || 6; for (let px = c.pad; px < c.w - c.pad; px += step) for (let py = c.pad; py < c.h - c.pad; py += step) { const p = regions(c.ix(px + step / 2), c.iy(py + step / 2)); if (p == null || isNaN(p)) continue; const a = Math.min(1, Math.abs(p - 0.5) * 2); g.fillStyle = AI.alpha(p >= 0.5 ? C1 : C0, 0.07 + 0.2 * a); g.fillRect(px, py, step, step); } }
    g.strokeStyle = line; g.lineWidth = 1; for (let k = 0; k <= 4; k++) { const x = c.X(k / 4), y = c.Y(k / 4); g.beginPath(); g.moveTo(x, c.Y(0)); g.lineTo(x, c.Y(1)); g.stroke(); g.beginPath(); g.moveTo(c.X(0), y); g.lineTo(c.X(1), y); g.stroke(); }
  }
  function dots(c, pts, o) {
    o = o || {}; const g = c.g, C1 = AI.color('v-path'), C0 = AI.color('accent'), bg = AI.color('bg'), ink = AI.color('ink');
    pts.forEach((p, i) => { const r = o.size ? o.size(p, i) : 6, x = c.X(p.x), y = c.Y(p.y), pos = p.c === 1; g.fillStyle = pos ? C1 : C0; g.strokeStyle = bg; g.lineWidth = 2; g.beginPath(); if (pos) g.arc(x, y, r, 0, Math.PI * 2); else g.rect(x - r * 0.9, y - r * 0.9, r * 1.8, r * 1.8); g.fill(); g.stroke(); if (o.ring && o.ring(p, i)) { g.strokeStyle = ink; g.lineWidth = 2.2; g.beginPath(); g.arc(x, y, r + 5, 0, Math.PI * 2); g.stroke(); } if (o.wrong && o.wrong(p, i)) { g.strokeStyle = AI.color('bad'); g.lineWidth = 2.5; g.beginPath(); g.moveTo(x - r - 3, y - r - 3); g.lineTo(x + r + 3, y + r + 3); g.stroke(); } });
  }
  function lineW(c, w, col, dash) { // draw w0 + w1 x + w2 y = 0 clipped to the unit square
    const g = c.g, P = []; const add = (x, y) => { if (x >= -1e-9 && x <= 1 + 1e-9 && y >= -1e-9 && y <= 1 + 1e-9) P.push([x, y]); };
    if (Math.abs(w[2]) > 1e-12) { add(0, -w[0] / w[2]); add(1, -(w[0] + w[1]) / w[2]); } if (Math.abs(w[1]) > 1e-12) { add(-w[0] / w[1], 0); add(-(w[0] + w[2]) / w[1], 1); }
    if (P.length < 2) return; P.sort((a, b) => a[0] - b[0] || a[1] - b[1]); g.strokeStyle = col; g.lineWidth = 3; g.setLineDash(dash || []); g.beginPath(); g.moveTo(c.X(P[0][0]), c.Y(P[0][1])); g.lineTo(c.X(P[P.length - 1][0]), c.Y(P[P.length - 1][1])); g.stroke(); g.setLineDash([]);
  }
  const blobs = (r, n, sep, spread) => AI.range(n).map(i => { const c = i % 2; const cx = c ? 0.5 + sep / 2 : 0.5 - sep / 2; return { x: AI.clamp(cx + AI.gauss(r) * spread, 0.02, 0.98), y: AI.clamp((c ? 0.62 : 0.38) + AI.gauss(r) * spread, 0.02, 0.98), c }; });
  function clickPoint(c, e) { const r = c.cv.getBoundingClientRect(); return { x: AI.clamp(c.ix(e.clientX - r.left), 0, 1), y: AI.clamp(c.iy(e.clientY - r.top), 0, 1) }; }
  AI._plane = { plane, frame2d, dots, lineW, clickPoint, blobs };

  /* =====================================================================
     Linear regression by gradient descent, with the loss surface
     ===================================================================== */
  AI.lab({
    id: 'linear-regression', ch: 19, kind: 'demo', title: 'Linear regression and gradient descent',
    blurb: 'Fit a line by gradient descent and watch the weights walk downhill on the loss surface. Choose the learning rate and see when the steps overshoot and diverge.',
    tags: ['linear regression', 'squared-error loss', 'gradient descent', 'learning rate', 'weight space'],
    how: [['Two views', '<p>Left: the data and the current line y = w₀ + w₁x. Right: <b>weight space</b>. Each point is a pair (w₀, w₁), shaded by its loss; darker is lower. The loss is convex, so there is one minimum, which the exact least-squares solution finds directly.</p>'],
      ['The update', '<p>Each step moves the weights against the gradient of the mean squared error: wᵢ ← wᵢ + α · (2/N) Σⱼ (yⱼ − h(xⱼ)) xⱼ,ᵢ, with x₀ = 1.</p>'],
      ['Learning rate', '<p>Small α creeps; large α overshoots. For this loss, steps converge only when α is below 2/λ_max, where λ_max is the largest eigenvalue of the loss’s Hessian. The panel shows that limit for the current data.</p>'],
      ['Try', '<ul><li>Click the right-hand plot to start from different weights.</li><li>Click the left-hand plot to add data points.</li><li>Set α just above the limit and watch the zigzag grow.</li></ul>']],
    mount(root, ctx) {
      const st = { a: 0.3 }; const W0 = [-0.6, 1.4], W1 = [-1.4, 2.2];
      let pts, w, path, it = 0, running = null;
      const Lr = AI.layout(root, { cls: 'full' });
      const grid = AI.el('<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px;padding:12px"></div>'); Lr.stage.appendChild(grid); Lr.stage.classList.add('plain');
      const h1 = AI.el('<div><p class="small muted" style="margin:0 0 4px">Data and fitted line</p><div></div></div>'), h2 = AI.el('<div><p class="small muted" style="margin:0 0 4px">Weight space: loss for each (w₀, w₁)</p><div></div></div>'); grid.append(h1, h2);
      const pd = plane(h1.lastChild, ctx, c => { frame2d(c); const g = c.g; const ls = E.linreg.exact(pts); g.strokeStyle = AI.color('muted'); g.lineWidth = 2; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(c.X(0), c.Y(ls[0])); g.lineTo(c.X(1), c.Y(ls[0] + ls[1])); g.stroke(); g.setLineDash([]); g.save(); g.beginPath(); g.rect(c.X(0), c.Y(1), c.X(1) - c.X(0), c.Y(0) - c.Y(1)); g.clip(); g.strokeStyle = AI.color('v-path'); g.lineWidth = 3; g.beginPath(); g.moveTo(c.X(0), c.Y(w[0])); g.lineTo(c.X(1), c.Y(w[0] + w[1])); g.stroke(); g.restore(); dots(c, pts.map(p => ({ x: p.x, y: p.y, c: 1 })), { size: () => 5 }); });
      const pw = plane(h2.lastChild, ctx, c => {
        const g = c.g, ink = AI.color('ink'); const mx = v => W0[0] + v * (W0[1] - W0[0]), my = v => W1[0] + v * (W1[1] - W1[0]); const toX = a => c.X((a - W0[0]) / (W0[1] - W0[0])), toY = b => c.Y((b - W1[0]) / (W1[1] - W1[0]));
        g.fillStyle = AI.color('bg'); g.fillRect(0, 0, c.w, c.h); const C = AI.color('v-path'), step = 5; const lmin = E.linreg.loss(pts, ...E.linreg.exact(pts));
        for (let px = c.pad; px < c.w - c.pad; px += step) for (let py = c.pad; py < c.h - c.pad; py += step) { const L = E.linreg.loss(pts, mx(c.ix(px + step / 2)), my(c.iy(py + step / 2))); const t = Math.log(1 + (L - lmin) * 20); g.fillStyle = AI.alpha(C, Math.max(0.03, 0.55 - 0.16 * t)); g.fillRect(px, py, step, step); }
        g.fillStyle = AI.color('muted'); g.font = '12px ' + getComputedStyle(document.body).fontFamily; g.fillText('w₀ →', c.w - c.pad - 34, c.h - 8); g.fillText('w₁ ↑', 4, c.pad + 4);
        const ls = E.linreg.exact(pts); g.strokeStyle = ink; g.lineWidth = 2; g.beginPath(); g.arc(toX(ls[0]), toY(ls[1]), 7, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(toX(ls[0]) - 10, toY(ls[1])); g.lineTo(toX(ls[0]) + 10, toY(ls[1])); g.moveTo(toX(ls[0]), toY(ls[1]) - 10); g.lineTo(toX(ls[0]), toY(ls[1]) + 10); g.stroke();
        g.save(); g.beginPath(); g.rect(c.pad, c.pad, c.w - 2 * c.pad, c.h - 2 * c.pad); g.clip(); g.strokeStyle = AI.color('accent'); g.lineWidth = 2.5; g.beginPath(); path.forEach(([a, b], i) => i ? g.lineTo(toX(a), toY(b)) : g.moveTo(toX(a), toY(b))); g.stroke(); g.fillStyle = AI.color('accent'); path.forEach(([a, b]) => { g.beginPath(); g.arc(toX(a), toY(b), 3, 0, Math.PI * 2); g.fill(); }); g.beginPath(); g.arc(toX(w[0]), toY(w[1]), 7, 0, Math.PI * 2); g.fill(); g.restore();
      });
      const pc = AI.panel(Lr.side, 'Gradient descent');
      const refs = AI.controls(pc, [{ t: 'range', k: 'a', label: 'Learning rate α', min: 0.01, max: 1.2, step: 0.01, fmt: v => v.toFixed(2) }, { t: 'row' }, { t: 'btn', label: 'Step', icon: 'next', on: () => { stop(); step(); } }, { t: 'btn', label: 'Run', icon: 'play', cls: 'primary', id: 'run', on: () => running ? stop() : start() }, { t: 'btn', label: 'Restart', icon: 'reset', on: () => { stop(); restart(w0start); } }, { t: 'btn', label: 'New data', icon: 'dice', on: () => { stop(); newData(); } }], st, () => info());
      const ps = AI.panel(Lr.side, 'Progress'); const stats = AI.stats(ps, [['it', 'steps'], ['loss', 'loss now'], ['opt', 'minimum loss']]);
      const lim = AI.el('<p class="small" style="margin:10px 0 0"></p>'); ps.appendChild(lim);
      let w0start = [0, -0.8];
      function newData() { const r = AI.rng((Math.random() * 1e9) | 0); const a = 0.2 + r() * 0.3, b = 0.2 + r() * 0.5; pts = AI.range(16).map(() => { const x = 0.05 + 0.9 * r(); return { x, y: AI.clamp(a + b * x + AI.gauss(r) * 0.06, 0.01, 0.99) }; }); restart(w0start); }
      function restart(s) { w = s.slice(); path = [w.slice()]; it = 0; info(); }
      function step() { w = E.linreg.step(pts, w[0], w[1], st.a); path.push(w.slice()); if (path.length > 400) path.shift(); it++; info(); if (!isFinite(w[0]) || Math.abs(w[0]) > 1e6) { stop(); w = path[0].slice(); } }
      function start() { running = ctx.every(70, () => { step(); if (it > 2000) stop(); }); refs.run.querySelector('span').textContent = 'Pause'; }
      function stop() { if (running) { running(); running = null; } refs.run.querySelector('span').textContent = 'Run'; }
      function info() {
        const L = E.linreg.loss(pts, w[0], w[1]), ls = E.linreg.exact(pts), Lm = E.linreg.loss(pts, ls[0], ls[1]);
        const n = pts.length, mx = pts.reduce((s, p) => s + p.x, 0) / n, mxx = pts.reduce((s, p) => s + p.x * p.x, 0) / n, lmax = (1 + mxx) + Math.sqrt((1 - mxx) ** 2 + 4 * mx * mx);
        stats.set('it', it); stats.set('loss', isFinite(L) ? L.toFixed(5) : '∞', L > 1 ? 'bad' : ''); stats.set('opt', Lm.toFixed(5));
        lim.innerHTML = `For these ${n} points, gradient descent converges when α &lt; 2/λ<sub>max</sub> = <b>${(2 / lmax).toFixed(3)}</b>. ${st.a >= 2 / lmax ? '<span style="color:var(--bad)">Your α is above the limit: the steps will grow.</span>' : ''}`;
        pd.redraw(); pw.redraw();
      }
      ctx.on(pd.cv, 'click', e => { const p = clickPoint(pd, e); pts.push(p); info(); });
      ctx.on(pw.cv, 'click', e => { const p = clickPoint(pw, e); stop(); w0start = [W0[0] + p.x * (W0[1] - W0[0]), W1[0] + p.y * (W1[1] - W1[0])]; restart(w0start); });
      newData();
    }
  });

  /* =====================================================================
     Linear classifiers: perceptron rule and logistic regression
     ===================================================================== */
  AI.lab({
    id: 'linear-classifiers', ch: 19, kind: 'demo', title: 'Perceptron versus logistic regression',
    blurb: 'Train a hard-threshold linear classifier and a logistic one on separable and overlapping data, one example at a time, and compare their training curves.',
    tags: ['perceptron learning rule', 'logistic regression', 'linear separability', 'learning-rate schedule', 'training curve'],
    how: [['The two update rules (from the book)', '<p>Both pick one training example at a time. The <b>perceptron rule</b> uses a hard threshold h(x) = 1 if w·x ≥ 0, else 0, and updates wᵢ ← wᵢ + α (y − h(x)) xᵢ, so it changes w only on mistakes. <b>Logistic regression</b> uses h(x) = 1/(1 + e<sup>−w·x</sup>) and, for squared-error loss as derived in the book, updates wᵢ ← wᵢ + α (y − h(x)) h(x)(1 − h(x)) xᵢ.</p>'],
      ['What to look for', '<ul><li>On separable data the perceptron rule reaches 100% accuracy within a few hundred updates and then never changes again, because it only updates on mistakes.</li><li>On overlapping data no line classifies every example correctly, so the perceptron keeps making mistakes, keeps updating, and its accuracy keeps jumping about.</li><li>Logistic regression’s updates shrink as its predictions become confident, so its training curve is much steadier. The shading shows its predicted probability.</li><li>A decaying learning rate such as α(t) = 1000/(1000 + t) makes later updates smaller; switch it on and compare.</li></ul>'],
      ['Try', '<p>Click the plot to add an example of the selected class.</p>']],
    mount(root, ctx) {
      const st = { data: 'sep', algo: 'perc', sched: 'fixed', add: 1 };
      const Lc = AI.layout(root);
      const host = AI.el('<div style="padding:10px"></div>'); Lc.stage.appendChild(host); Lc.stage.classList.add('plain');
      let pts, w, t, hist, rng;
      const pl = plane(host, ctx, c => { const f = st.algo === 'perc' ? (x, y) => (w[0] + w[1] * x + w[2] * y >= 0 ? 1 : 0) : (x, y) => E.clf.sig(w[0] + w[1] * x + w[2] * y); frame2d(c, f); lineW(c, w, AI.color('ink')); dots(c, pts, { wrong: p => (f(p.x, p.y) >= 0.5 ? 1 : 0) !== p.c }); });
      const pc = AI.panel(Lc.side, 'Set-up');
      AI.controls(pc, [{ t: 'seg', k: 'data', label: 'Data', opts: [['sep', 'Separable'], ['noisy', 'Overlapping']] }, { t: 'row' }, { t: 'seg', k: 'algo', label: 'Learner', opts: [['perc', 'Perceptron'], ['log', 'Logistic']] }, { t: 'row' }, { t: 'seg', k: 'sched', label: 'Learning rate', opts: [['fixed', 'Fixed α'], ['decay', '1000/(1000 + t)']] }, { t: 'row' }, { t: 'seg', k: 'add', label: 'Clicks add', opts: [[1, 'circles (1)'], [0, 'squares (0)']] }], st, k => { if (k === 'data') newData(); else if (k !== 'add') reset(); });
      const pr = AI.panel(Lc.side, 'Train'); AI.controls(pr, [{ t: 'btn', label: '1 update', icon: 'next', on: () => train(1) }, { t: 'btn', label: '100', on: () => train(100) }, { t: 'btn', label: '1,000', cls: 'primary', on: () => train(1000) }, { t: 'btn', label: '10,000', on: () => train(10000) }, { t: 'btn', label: 'Reset weights', icon: 'reset', on: () => reset() }], {}, null);
      const ps = AI.panel(Lc.side, 'Status'); const stats = AI.stats(ps, [['t', 'updates'], ['acc', 'training accuracy'], ['w', 'weights w₀, w₁, w₂']]);
      const pb = AI.panel(Lc.below, 'Training curve'); const cb = AI.el('<div></div>'); pb.appendChild(cb); const chart = AI.chart(cb, ctx, { height: 220, yMin: 0, yMax: 1, xLabel: 'number of weight updates', right: 90, xs: i => i * Math.max(1, Math.ceil(hist.length / 400)) });
      function newData() { const r = AI.rng(st.data === 'sep' ? 11 : 29); pts = st.data === 'sep' ? blobs(r, 60, 0.36, 0.08) : blobs(r, 80, 0.16, 0.13); reset(); }
      function reset() { w = [0, 0, 0]; t = 0; hist = [acc()]; rng = AI.rng(7); upd(); }
      function acc() { const f = st.algo === 'perc' ? p => (w[0] + w[1] * p.x + w[2] * p.y >= 0 ? 1 : 0) : p => (E.clf.sig(w[0] + w[1] * p.x + w[2] * p.y) >= 0.5 ? 1 : 0); return pts.filter(p => f(p) === p.c).length / pts.length; }
      function train(n) {
        for (let k = 0; k < n; k++) {
          const a = st.sched === 'fixed' ? (st.algo === 'perc' ? 0.1 : 2) : (st.algo === 'perc' ? 0.1 : 2) * 1000 / (1000 + t); const p = pts[(rng() * pts.length) | 0]; const x = [1, p.x, p.y];
          if (st.algo === 'perc') { const h = w[0] + w[1] * p.x + w[2] * p.y >= 0 ? 1 : 0; for (let i = 0; i < 3; i++) w[i] += a * (p.c - h) * x[i]; }
          else { const h = E.clf.sig(w[0] + w[1] * p.x + w[2] * p.y); for (let i = 0; i < 3; i++) w[i] += a * (p.c - h) * h * (1 - h) * x[i]; }
          t++; hist.push(acc());
        }
        upd();
      }
      function upd() { const ac = acc(); stats.set('t', t.toLocaleString('en-US')); stats.set('acc', (ac * 100).toFixed(1) + '%', ac === 1 ? 'good' : ''); stats.set('w', w.map(v => v.toFixed(2)).join(', ')); const k = Math.max(1, Math.ceil(hist.length / 400)); chart.set([{ name: 'proportion correct', color: 'var(--v-path)', values: hist.filter((_, i) => i % k === 0) }]); pl.redraw(); }
      ctx.on(pl.cv, 'click', e => { const p = clickPoint(pl, e); pts.push(Object.assign(p, { c: +st.add })); hist.push(acc()); upd(); });
      newData();
    }
  });

  /* =====================================================================
     k-nearest neighbours, with leave-one-out error and the curse of dimensionality
     ===================================================================== */
  function knnData(kind, r) {
    if (kind === 'xor') return AI.range(80).map(() => { const x = r(), y = r(); return { x, y, c: (x > 0.5) !== (y > 0.5) ? 1 : 0 }; }).map(p => (r() < 0.08 ? Object.assign(p, { c: 1 - p.c }) : p));
    if (kind === 'ring') return AI.range(90).map(() => { const x = r(), y = r(); const d = Math.hypot(x - 0.5, y - 0.5); return { x, y, c: d < 0.27 ? 1 : 0 }; }).map(p => (r() < 0.06 ? Object.assign(p, { c: 1 - p.c }) : p));
    return blobs(r, 70, 0.22, 0.14);
  }
  AI.lab({
    id: 'knn', ch: 19, kind: 'demo', title: 'Nearest neighbours: choosing k',
    blurb: 'Classify every point of the plane by majority vote of its k nearest training examples. Compare k = 1 with larger k, pick k by leave-one-out error, and see why high dimensions defeat neighbours.',
    tags: ['k-nearest neighbours', 'nonparametric model', 'leave-one-out cross-validation', 'curse of dimensionality'],
    how: [['The rule', '<p>To classify a point, find the k training examples nearest to it and take a majority vote (ties go to the class of the nearer example). With k = 1 every training point gets its own island; larger k smooths the boundary.</p>'],
      ['Choosing k', '<p>The chart below gives the leave-one-out error for each k: classify each training example using all the others. Low k overfits and high k underfits.</p>'],
      ['The curse of dimensionality', '<p>With N points spread uniformly in a unit hypercube of n dimensions, the k nearest neighbours of a point occupy a small cube of edge ℓ = (k/N)<sup>1/n</sup>. As n grows, that “neighbourhood” spans most of each axis, so neighbours are no longer near.</p>']],
    mount(root, ctx) {
      const st = { data: 'blobs', k: 1, metric: 'L2', add: 1, N: 1e6, kk: 10 };
      const Lk = AI.layout(root);
      const host = AI.el('<div style="padding:10px"></div>'); Lk.stage.appendChild(host); Lk.stage.classList.add('plain');
      let pts;
      const pl = plane(host, ctx, c => { frame2d(c, (x, y) => E.clf.knn(pts, st.k, x, y, st.metric).c, 7); dots(c, pts); });
      const pc = AI.panel(Lk.side, 'Classifier');
      AI.controls(pc, [{ t: 'range', k: 'k', label: 'k', min: 1, max: 25, step: 1 }, { t: 'seg', k: 'metric', label: 'Distance', opts: [['L2', 'Euclidean'], ['L1', 'Manhattan']] }, { t: 'row' }, { t: 'select', k: 'data', label: 'Data', opts: [['blobs', 'Two overlapping clouds'], ['xor', 'XOR with noise'], ['ring', 'Ring with noise']], str: true }, { t: 'seg', k: 'add', label: 'Clicks add', opts: [[1, 'circles'], [0, 'squares']] }], st, k => { if (k === 'data') newData(); else if (k !== 'add') upd(); });
      const ps = AI.panel(Lk.side, 'Error'); const stats = AI.stats(ps, [['tr', 'training error'], ['loo', 'leave-one-out error'], ['best', 'best k (LOO)']]);
      const pb = AI.panel(Lk.below, 'Leave-one-out error for each k'); const cb = AI.el('<div></div>'); pb.appendChild(cb); const chart = AI.chart(cb, ctx, { height: 200, yMin: 0, xLabel: 'k', xs: i => i + 1, right: 70 });
      const pd = AI.panel(Lk.below, 'The curse of dimensionality'); const dbox = AI.el('<div></div>'); pd.appendChild(dbox);
      AI.controls(pd, [{ t: 'select', k: 'N', label: 'Points N', opts: [[1e3, '1,000'], [1e6, '1,000,000'], [1e9, '1,000,000,000']] }, { t: 'select', k: 'kk', label: 'Neighbours k', opts: [[1, '1'], [10, '10'], [100, '100']] }], st, () => dims());
      function loo(k) { return pts.filter((p, i) => E.clf.knn(pts.filter((_, j) => j !== i), k, p.x, p.y, st.metric).c !== p.c).length / pts.length; }
      function newData() { pts = knnData(st.data, AI.rng({ blobs: 5, xor: 8, ring: 13 }[st.data])); upd(); }
      function upd() { const tr = pts.filter(p => E.clf.knn(pts, st.k, p.x, p.y, st.metric).c !== p.c).length / pts.length; const ks = AI.range(25).map(i => loo(i + 1)); let bk = 0; ks.forEach((v, i) => { if (v < ks[bk] - 1e-12) bk = i; }); stats.set('tr', (tr * 100).toFixed(1) + '%'); stats.set('loo', (ks[st.k - 1] * 100).toFixed(1) + '%'); stats.set('best', String(bk + 1)); chart.set([{ name: 'LOO error', color: 'var(--accent)', values: ks }], (X, Y, g) => `<line x1="${X(st.k - 1)}" x2="${X(st.k - 1)}" y1="${g.T}" y2="${g.T + g.ih}" stroke="var(--ink)" stroke-dasharray="3 4"/>`); pl.redraw(); }
      function dims() { const ns = [1, 2, 3, 5, 10, 17, 50, 100, 200]; dbox.innerHTML = AI.table(['Dimensions n'].concat(ns.map(n => 'r:' + n)), [`<tr><td>edge ℓ of the neighbourhood</td>${ns.map(n => `<td class="r">${Math.pow(st.kk / st.N, 1 / n).toFixed(3)}</td>`).join('')}</tr>`], 'compact') + `<p class="small muted" style="margin:8px 0 0">ℓ = (k/N)<sup>1/n</sup> for N = ${(+st.N).toLocaleString('en-US')} and k = ${st.kk}.${+st.N === 1e6 && +st.kk === 10 ? ' In two dimensions the 10 nearest of a million points fit in a square of side 0.003; by 200 dimensions the neighbourhood spans about 94% of each axis.' : ''}</p>`; }
      ctx.on(pl.cv, 'click', e => { const p = clickPoint(pl, e); pts.push(Object.assign(p, { c: +st.add })); upd(); });
      newData(); dims();
    }
  });

  /* =====================================================================
     Overfitting: polynomial degree, regularisation and cross-validation
     ===================================================================== */
  const truth = x => 0.5 + 0.35 * Math.sin(2 * Math.PI * x);
  AI.lab({
    id: 'overfitting', ch: 19, kind: 'demo', title: 'Overfitting, regularisation and cross-validation',
    blurb: 'Fit polynomials of increasing degree to a few noisy points. Training error always falls; error on new data falls and then rises. Use cross-validation or regularisation to pick a good model.',
    tags: ['overfitting', 'underfitting', 'model selection', 'cross-validation', 'regularisation', 'bias and variance'],
    how: [['The set-up', '<p>The data come from a smooth curve (dashed) plus Gaussian noise. A polynomial of degree d is fitted by least squares, optionally with an L2 penalty λ Σ wᵢ² on its weights. Validation error is measured on 200 fresh points from the same source.</p>'],
      ['Cross-validation', '<p>In practice you have no fresh data to spare. 5-fold cross-validation splits the training points into five parts, trains on four and tests on the fifth, five times over, and averages. Its curve tracks the validation curve, so it can choose the degree.</p>'],
      ['Things to try', '<ul><li>Raise the degree with only 10 points: the curve passes through every point and swings wildly between them.</li><li>Keep the high degree and raise λ: the swings flatten.</li><li>Add more points: high degrees overfit much less.</li></ul>']],
    mount(root, ctx) {
      const st = { d: 3, lam: -10, N: 12, noise: 0.12 };
      let seed = 3, tr, va, w;
      const Lo = AI.layout(root);
      const host = AI.el('<div style="padding:10px"></div>'); Lo.stage.appendChild(host); Lo.stage.classList.add('plain');
      const pl = plane(host, ctx, c => { frame2d(c); const g = c.g; g.save(); g.beginPath(); g.rect(c.X(0), c.Y(1), c.X(1) - c.X(0), c.Y(0) - c.Y(1)); g.clip(); g.strokeStyle = AI.color('muted'); g.lineWidth = 2; g.setLineDash([6, 5]); g.beginPath(); for (let k = 0; k <= 200; k++) { const x = k / 200; k ? g.lineTo(c.X(x), c.Y(truth(x))) : g.moveTo(c.X(x), c.Y(truth(x))); } g.stroke(); g.setLineDash([]); g.strokeStyle = AI.color('accent'); g.lineWidth = 3; g.beginPath(); for (let k = 0; k <= 400; k++) { const x = k / 400, y = E.polyval(w, 2 * x - 1); k ? g.lineTo(c.X(x), c.Y(AI.clamp(y, -2, 3))) : g.moveTo(c.X(x), c.Y(AI.clamp(y, -2, 3))); } g.stroke(); g.restore(); dots(c, tr.map(p => ({ x: p.x, y: p.y, c: 1 })), { size: () => 5.5 }); });
      const pc = AI.panel(Lo.side, 'Model');
      AI.controls(pc, [{ t: 'range', k: 'd', label: 'Polynomial degree d', min: 0, max: 14, step: 1 }, { t: 'range', k: 'lam', label: 'Regularisation λ', min: -10, max: 0, step: 0.5, fmt: v => v <= -10 ? '0' : '10^' + v }, { t: 'row' }, { t: 'range', k: 'N', label: 'Training points', min: 6, max: 60, step: 1 }, { t: 'range', k: 'noise', label: 'Noise σ', min: 0, max: 0.3, step: 0.01, fmt: v => v.toFixed(2) }, { t: 'row' }, { t: 'btn', label: 'New sample', icon: 'dice', on: () => { seed = (Math.random() * 1e9) | 0; data(); } }], st, k => { if (k === 'N' || k === 'noise') data(); else fit(); });
      const ps = AI.panel(Lo.side, 'Errors (mean squared)'); const stats = AI.stats(ps, [['tr', 'training'], ['va', 'validation'], ['cv', 'best degree by 5-fold CV']]);
      const pb = AI.panel(Lo.below, 'Error against degree (log scale)'); const cb = AI.el('<div></div>'); pb.appendChild(cb);
      const chart = AI.chart(cb, ctx, { height: 240, xLabel: 'polynomial degree', xs: i => i, right: 100, fmt: v => { const x = Math.pow(10, v); return x >= 1 ? x.toFixed(0) : x.toPrecision(1); } });
      const lam = () => st.lam <= -10 ? 1e-10 : Math.pow(10, st.lam);
      const mse = (ww, ps2) => ps2.reduce((a, p) => a + (E.polyval(ww, 2 * p.x - 1) - p.y) ** 2, 0) / ps2.length;
      const fitW = (ps2, d) => E.polyfit(ps2.map(p => 2 * p.x - 1), ps2.map(p => p.y), d, lam() * ps2.length);
      function data() { const r = AI.rng(seed); tr = AI.range(st.N).map(() => { const x = r(); return { x, y: truth(x) + AI.gauss(r) * st.noise }; }); const r2 = AI.rng(seed + 99); va = AI.range(200).map(() => { const x = r2(); return { x, y: truth(x) + AI.gauss(r2) * st.noise }; }); fit(); }
      function cv(d) { const k = 5, n = tr.length; let err = 0, cnt = 0; for (let f = 0; f < k; f++) { const test = tr.filter((_, i) => i % k === f), train = tr.filter((_, i) => i % k !== f); if (!test.length || train.length < 1) continue; err += mse(fitW(train, d), test) * test.length; cnt += test.length; } return err / cnt; }
      function fit() {
        w = fitW(tr, st.d); const ds = AI.range(15), etr = [], eva = [], ecv = []; ds.forEach(d => { const ww = fitW(tr, d); etr.push(mse(ww, tr)); eva.push(mse(ww, va)); ecv.push(cv(d)); });
        let bd = 0; ecv.forEach((v, i) => { if (v < ecv[bd]) bd = i; });
        stats.set('tr', mse(w, tr).toFixed(4)); stats.set('va', mse(w, va).toFixed(4)); stats.set('cv', String(bd));
        const lg = a => a.map(v => Math.log10(Math.max(1e-6, v)));
        chart.set([{ name: 'training', color: 'var(--v-path)', values: lg(etr) }, { name: 'validation', color: 'var(--accent)', values: lg(eva) }, { name: '5-fold CV', color: 'var(--v-chance)', values: lg(ecv), dash: '6 4' }], (X, Y, g) => `<line x1="${X(st.d)}" x2="${X(st.d)}" y1="${g.T}" y2="${g.T + g.ih}" stroke="var(--ink)" stroke-dasharray="3 4"/>`);
        pl.redraw();
      }
      data();
    }
  });

  /* =====================================================================
     AdaBoost with decision stumps
     ===================================================================== */
  AI.lab({
    id: 'adaboost', ch: 19, kind: 'demo', title: 'Boosting decision stumps',
    blurb: 'AdaBoost combines many one-line classifiers. After each round, misclassified examples gain weight (drawn larger), so the next stump concentrates on them.',
    tags: ['ensemble learning', 'boosting', 'AdaBoost', 'decision stump', 'weighted training set'],
    how: [['Each round', '<p>Choose the stump (a single threshold on x or on y) with the lowest weighted error ε. Give it a vote α = ½ ln((1 − ε)/ε). Multiply the weight of every example it gets right by e<sup>−α</sup> and every one it gets wrong by e<sup>α</sup>, then renormalise.</p>'],
      ['The ensemble', '<p>The combined classifier takes the sign of Σ αₘ hₘ(x). Each stump alone is weak, but the weighted vote can draw curved boundaries out of straight pieces.</p>'],
      ['What to notice', '<p>Training error often reaches zero, and test error can keep improving for a while after that, as in the book’s experiment. With label noise, though, later rounds start chasing the mislabelled points.</p>'],
      ['The book’s version', '<p>The book’s pseudocode writes the same algorithm slightly differently: it multiplies the weights of correctly classified examples by ε/(1 − ε) and gives each hypothesis the vote log((1 − ε)/ε). After normalisation the example weights are identical to the ones here, and the votes differ only by a constant factor, which does not change the weighted majority.</p>']],
    mount(root, ctx) {
      const st = { M: 1, data: 'circle', noise: 0.05 };
      let pts, test, ab;
      const La = AI.layout(root);
      const host = AI.el('<div style="padding:10px"></div>'); La.stage.appendChild(host); La.stage.classList.add('plain');
      const concept = { circle: (x, y) => Math.hypot(x - 0.5, y - 0.5) < 0.3, diag: (x, y) => x + y > 1.05, band: (x, y) => Math.abs(y - 0.5 - 0.25 * Math.sin(6 * x)) < 0.17 };
      const pl = plane(host, ctx, c => { const H = ab.hist[st.M - 1]; frame2d(c, H ? (x, y) => (ab.score(H.H, { x, y }) > 0 ? 1 : 0) : null, 6); const g = c.g; if (H) { const h = H.h; g.strokeStyle = AI.color('ink'); g.lineWidth = 3; g.setLineDash([8, 6]); g.beginPath(); if (h.f === 'x') { g.moveTo(c.X(h.t), c.Y(0)); g.lineTo(c.X(h.t), c.Y(1)); } else { g.moveTo(c.X(0), c.Y(h.t)); g.lineTo(c.X(1), c.Y(h.t)); } g.stroke(); g.setLineDash([]); } const wts = H ? H.w : pts.map(() => 1 / pts.length); const mx = Math.max(...wts); dots(c, pts.map(p => ({ x: p.x, y: p.y, c: p.c > 0 ? 1 : 0 })), { size: (p, i) => 3 + 9 * Math.sqrt(wts[i] / mx) }); });
      const pc = AI.panel(La.side, 'Boosting');
      const refs = AI.controls(pc, [{ t: 'range', k: 'M', label: 'Rounds M', min: 1, max: 60, step: 1 }, { t: 'row' }, { t: 'select', k: 'data', label: 'Target concept', opts: [['circle', 'Disc'], ['diag', 'Diagonal line'], ['band', 'Wavy band']], str: true }, { t: 'range', k: 'noise', label: 'Label noise', min: 0, max: 0.2, step: 0.01, fmt: v => Math.round(v * 100) + '%' }], st, k => { if (k === 'M') draw(); else data(); });
      const ps = AI.panel(La.side, 'This round'); const stats = AI.stats(ps, [['eps', 'stump error ε'], ['alpha', 'stump vote α'], ['tr', 'ensemble training errors']]);
      const ex = AI.el('<div class="explain small" style="margin-top:10px"></div>'); ps.appendChild(ex);
      const pb = AI.panel(La.below, 'Error against the number of rounds'); const cb = AI.el('<div></div>'); pb.appendChild(cb); const chart = AI.chart(cb, ctx, { height: 220, yMin: 0, xLabel: 'rounds', xs: i => i + 1, right: 90 });
      function data() { const r = AI.rng(17), f = concept[st.data]; pts = AI.range(70).map(() => { const x = r(), y = r(); let c = f(x, y) ? 1 : -1; if (r() < st.noise) c = -c; return { x, y, c }; }); const r2 = AI.rng(99); test = AI.range(3000).map(() => { const x = r2(), y = r2(); return { x, y, c: f(x, y) ? 1 : -1 }; }); ab = E.adaboost(pts, 60); refs.M.max = ab.hist.length; if (st.M > ab.hist.length) st.M = ab.hist.length; refs.sync(); draw(); }
      function draw() {
        const H = ab.hist[st.M - 1]; if (!H) return; stats.set('eps', H.h.eps.toFixed(3)); stats.set('alpha', H.h.alpha.toFixed(3)); stats.set('tr', `${H.trainErr} / ${pts.length}`, H.trainErr ? '' : 'good');
        const side = pts.filter(p => p[H.h.f] > H.h.t).length, outside = side === 0 || side === pts.length, allPos = outside && (side === 0 ? -H.h.s : H.h.s) > 0;
        ex.innerHTML = `Round ${st.M}: ${outside ? `the best stump this round puts its threshold outside the data, so it labels every example a ${allPos ? 'circle' : 'square'}.` : `the dashed line is the stump chosen this round: ${H.h.f} ${H.h.s > 0 ? '&gt;' : '&lt;'} ${H.h.t.toFixed(3)} predicts circles.`} Point size shows each example’s weight going into round ${st.M + 1}.`;
        const te = ab.hist.map(h => test.filter(p => Math.sign(ab.score(h.H, p)) !== p.c).length / test.length), trE = ab.hist.map(h => h.trainErr / pts.length);
        chart.set([{ name: 'training error', color: 'var(--v-path)', values: trE }, { name: 'test error', color: 'var(--accent)', values: te }], (X, Y, g) => `<line x1="${X(st.M - 1)}" x2="${X(st.M - 1)}" y1="${g.T}" y2="${g.T + g.ih}" stroke="var(--ink)" stroke-dasharray="3 4"/>`);
        pl.redraw();
      }
      data();
    }
  });

  /* =====================================================================
     Support vector machines (simplified SMO)
     ===================================================================== */
  function svmData(kind, r) {
    if (kind === 'circle') return AI.range(60).map(() => { const x = r(), y = r(); return { x, y, c: Math.hypot(x - 0.5, y - 0.5) < 0.25 ? 1 : -1 }; });
    if (kind === 'xor') return AI.range(60).map(() => { const x = r(), y = r(); return { x, y, c: (x > 0.5) !== (y > 0.5) ? 1 : -1 }; });
    const sp = kind === 'overlap' ? 0.12 : 0.07; return AI.range(40).map(i => { const c = i % 2 ? 1 : -1; return { x: AI.clamp((c > 0 ? 0.64 : 0.36) + AI.gauss(r) * sp, 0.02, 0.98), y: AI.clamp((c > 0 ? 0.62 : 0.38) + AI.gauss(r) * sp, 0.02, 0.98), c }; });
  }
  AI.lab({
    id: 'svm', ch: 19, kind: 'demo', title: 'Support vector machines and the kernel trick',
    blurb: 'Find the separator with the widest margin. Only the support vectors, circled, determine it. Switch to a quadratic or Gaussian kernel to separate data that no straight line can.',
    tags: ['support vector machine', 'maximum margin separator', 'support vectors', 'kernel trick', 'soft margin'],
    how: [['Maximum margin', '<p>Among all separating lines, an SVM picks the one farthest from the nearest examples. The solution has the form h(x) = sign(Σⱼ αⱼ yⱼ K(xⱼ, x) + b), and αⱼ is zero except for the <b>support vectors</b>: the examples on the margin (or inside it, with a soft margin).</p>'],
      ['Kernels', '<p>Replacing the dot product xⱼ · x by a kernel K(xⱼ, x) fits a linear separator in a higher-dimensional feature space without ever computing the features. K = (1 + xⱼ · x)² corresponds to all quadratic features; the Gaussian kernel K = e<sup>−γ|xⱼ − x|²</sup> to infinitely many.</p>'],
      ['C, the soft margin', '<p>With overlapping classes no separator is perfect. C sets the penalty for examples inside the margin or on the wrong side: large C fits the training data hard, small C prefers a wide margin.</p>'],
      ['Reading the plot', '<p>The solid line is h(x) = 0 and the dashed lines are the margins at ±1. The optimiser is Platt’s SMO in a simplified form. For the quadratic kernel the inputs are rescaled to the range −1 to 1 first, which keeps the features well scaled.</p>']],
    mount(root, ctx) {
      const st = { data: 'sep', kern: 'linear', C: 2.5, gamma: 15, add: 1 };
      let pts, M;
      const Ls = AI.layout(root);
      const host = AI.el('<div style="padding:10px"></div>'); Ls.stage.appendChild(host); Ls.stage.classList.add('plain');
      const pl = plane(host, ctx, c => {
        frame2d(c, (x, y) => (M.dec(x, y) >= 0 ? 1 : 0), 6); const g = c.g, step = 3, ink = AI.color('ink'), mu = AI.color('ink2');
        const cols = Math.ceil((c.w - 2 * c.pad) / step) + 1, rows = Math.ceil((c.h - 2 * c.pad) / step) + 1, V = new Float32Array(cols * rows);
        for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) V[j * cols + i] = M.dec(c.ix(c.pad + i * step), c.iy(c.pad + j * step));
        const cross = (lv, col, sz) => { g.fillStyle = col; for (let i = 0; i < cols - 1; i++) for (let j = 0; j < rows - 1; j++) { const a = V[j * cols + i] - lv, b = V[j * cols + i + 1] - lv, d = V[(j + 1) * cols + i] - lv; if ((a > 0) !== (b > 0) || (a > 0) !== (d > 0)) g.fillRect(c.pad + i * step, c.pad + j * step, sz, sz); } };
        cross(1, AI.alpha(mu, 0.55), 1.6); cross(-1, AI.alpha(mu, 0.55), 1.6); cross(0, ink, 2.6);
        const mxA = Math.max(1e-9, ...M.alpha); dots(c, pts.map(p => ({ x: p.x, y: p.y, c: p.c > 0 ? 1 : 0 })), { ring: (p, i) => M.alpha[i] > 1e-3 * mxA });
      });
      const pc = AI.panel(Ls.side, 'Model');
      const refs = AI.controls(pc, [{ t: 'seg', k: 'kern', label: 'Kernel', opts: [['linear', 'Linear'], ['poly2', 'Quadratic'], ['rbf', 'Gaussian']] }, { t: 'row' }, { t: 'range', k: 'C', label: 'C (penalty for margin violations)', min: -1, max: 3, step: 0.1, fmt: v => { const x = 10 ** v; return x >= 10 ? Math.round(x).toLocaleString('en-US') : x >= 1 ? x.toFixed(1) : x.toFixed(2); } }, { t: 'range', k: 'gamma', label: 'γ (Gaussian width)', min: 1, max: 60, step: 1 }, { t: 'row' }, { t: 'select', k: 'data', label: 'Data', opts: [['sep', 'Separable'], ['overlap', 'Overlapping'], ['circle', 'Disc inside a square'], ['xor', 'XOR']], str: true }, { t: 'seg', k: 'add', label: 'Clicks add', opts: [[1, 'circles'], [-1, 'squares']] }], st, k => { if (k === 'data') data(); else if (k !== 'add') train(); });
      const ps = AI.panel(Ls.side, 'Solution'); const stats = AI.stats(ps, [['sv', 'support vectors'], ['err', 'training errors'], ['m', 'margin width']]);
      function data() { pts = svmData(st.data, AI.rng({ sep: 21, overlap: 23, circle: 25, xor: 27 }[st.data])); train(); }
      function train() { refs.gammaField.hidden = st.kern !== 'rbf'; M = E.svm(pts, st.kern, Math.pow(10, st.C), st.gamma, AI.rng(5)); const mxA = Math.max(1e-9, ...M.alpha); stats.set('sv', String(M.alpha.filter(a => a > 1e-3 * mxA).length)); const er = pts.filter(p => Math.sign(M.dec(p.x, p.y)) !== p.c).length; stats.set('err', String(er), er ? '' : 'good'); stats.set('m', M.w ? (2 / Math.hypot(M.w[0], M.w[1])).toFixed(3) : 'n/a'); pl.redraw(); }
      ctx.on(pl.cv, 'click', e => { const p = clickPoint(pl, e); pts.push(Object.assign(p, { c: +st.add })); train(); });
      data();
    }
  });
})(window);
