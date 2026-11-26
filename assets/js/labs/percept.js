/* Chapters 25–26 labs: edge detection, a kernel-guessing game, the pinhole camera,
   Monte Carlo localisation, RRT motion planning and a PID tuning game. */
(function (G) {
  'use strict';
  const AI = G.AI, esc = AI.esc;

  /* ---------- a synthetic grey-level scene ---------- */
  function scene(W, H, noise, seed) {
    const r = AI.rng(seed), img = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let v = 0.25 + 0.15 * (x / W);
      if (x > W * 0.08 && x < W * 0.38 && y > H * 0.2 && y < H * 0.75) v = 0.85;
      if (Math.hypot(x - W * 0.62, y - H * 0.45) < H * 0.24) v = 0.1;
      const tx = x - W * 0.72, ty = y - H * 0.62; if (ty > 0 && ty < H * 0.3 && Math.abs(tx) < (H * 0.3 - ty) * 0.8) v = 0.6;
      img[y * W + x] = v + AI.gauss(r) * noise;
    }
    return img;
  }
  function convolve(img, W, H, k) { const n = k.length, h = (n - 1) / 2, out = new Float32Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0; for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) { const yy = Math.min(H - 1, Math.max(0, y + a - h)), xx = Math.min(W - 1, Math.max(0, x + b - h)); s += k[a][b] * img[yy * W + xx]; } out[y * W + x] = s; } return out; }
  function gaussK(sig) { if (sig <= 0) return [[1]]; const h = Math.ceil(2.5 * sig), k = []; let z = 0; for (let a = -h; a <= h; a++) { const row = []; for (let b = -h; b <= h; b++) { const v = Math.exp(-(a * a + b * b) / (2 * sig * sig)); row.push(v); z += v; } k.push(row); } return k.map(r => r.map(v => v / z)); }
  const SOBX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], SOBY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
  function paint(c, img, W, H, lo, hi, signed) {
    const g = c.g, id = g.createImageData(W, H); for (let i = 0; i < W * H; i++) { let v = (img[i] - lo) / (hi - lo); v = Math.max(0, Math.min(1, v)); let r, gg, b; if (signed) { const t = img[i] / Math.max(Math.abs(lo), Math.abs(hi)); if (t >= 0) { r = 255 - 245 * t; gg = 255 - 155 * t; b = 255 - 39 * t; } else { r = 255; gg = 255 + 165 * t; b = 255 + 224 * t; } } else { r = gg = b = Math.round(v * 255); } id.data[4 * i] = r; id.data[4 * i + 1] = gg; id.data[4 * i + 2] = b; id.data[4 * i + 3] = 255; }
    const off = document.createElement('canvas'); off.width = W; off.height = H; off.getContext('2d').putImageData(id, 0, 0); g.imageSmoothingEnabled = false; g.drawImage(off, 0, 0, c.w, c.h);
  }
  AI._vision = { scene, convolve, gaussK };

  AI.lab({
    id: 'edge-detection', ch: 25, kind: 'demo', title: 'Edge detection: smooth, differentiate, threshold',
    blurb: 'Find the edges in a noisy image the classical way: smooth with a Gaussian, take the intensity gradient with Sobel filters, and keep the strong responses. See why smoothing comes first.',
    tags: ['edge detection', 'Gaussian filter', 'convolution', 'image gradient', 'Sobel operator', 'noise'],
    how: [['Why edges', '<p>Edges are where brightness changes sharply. They often mark the boundaries of objects, depth discontinuities, changes in surface orientation or shadows, and they compress an image to the lines that matter.</p>'],
      ['The pipeline', '<ol><li>Convolve with a Gaussian of width σ to suppress noise.</li><li>Estimate the derivatives ∂I/∂x and ∂I/∂y with Sobel kernels; the gradient magnitude √(Iₓ² + I_y²) is large on edges.</li><li>Mark pixels whose magnitude exceeds a threshold. (Detectors such as Canny also thin the edges and link them.)</li></ol>'],
      ['Try', '<ul><li>Raise the noise with σ = 0: the gradient image fills with speckle.</li><li>Increase σ: the speckle goes, but corners round off and thin edges fade.</li></ul>']],
    mount(root, ctx) {
      const st = { noise: 0.08, sig: 1.2, thr: 0.35 }; const W = 160, H = 110;
      const Le = AI.layout(root, { cls: 'full' });
      const grid = AI.el('<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;padding:12px"></div>'); Le.stage.appendChild(grid); Le.stage.classList.add('plain');
      const mk = t => { const d = AI.el(`<div><p class="small muted" style="margin:0 0 4px">${t}</p><div></div></div>`); grid.appendChild(d); return d.lastChild; };
      let I, S, Mg, Gx;
      const c1 = AI.canvas(mk('1. Input image'), ctx, c => I && paint(c, I, W, H, 0, 1), H / W), c2 = AI.canvas(mk('2. Smoothed with a Gaussian'), ctx, c => S && paint(c, S, W, H, 0, 1), H / W), c3 = AI.canvas(mk('3. Horizontal derivative ∂I/∂x (blue +, orange −)'), ctx, c => Gx && paint(c, Gx, W, H, -2, 2, true), H / W), c4 = AI.canvas(mk('4. Gradient magnitude above the threshold'), ctx, c => { if (!Mg) return; const e = Mg.map(v => v > st.thr ? 0 : 1); paint(c, e, W, H, 0, 1); }, H / W);
      const pc = AI.panel(Le.below, 'Settings');
      AI.controls(pc, [{ t: 'range', k: 'noise', label: 'Noise in the image', min: 0, max: 0.3, step: 0.01, fmt: v => v.toFixed(2) }, { t: 'range', k: 'sig', label: 'Gaussian σ (pixels)', min: 0, max: 4, step: 0.1, fmt: v => v.toFixed(1) }, { t: 'range', k: 'thr', label: 'Edge threshold', min: 0.05, max: 1.5, step: 0.05, fmt: v => v.toFixed(2) }], st, () => run());
      function run() { I = scene(W, H, st.noise, 7); S = convolve(I, W, H, gaussK(st.sig)); Gx = convolve(S, W, H, SOBX); const Gy = convolve(S, W, H, SOBY); Mg = Gx.map((v, i) => Math.hypot(v, Gy[i])); [c1, c2, c3, c4].forEach(c => c.redraw()); }
      run();
    }
  });

  /* ---------- game: which kernel made this? ---------- */
  const KS = { 'Box blur': [[1, 1, 1], [1, 1, 1], [1, 1, 1]].map(r => r.map(v => v / 9)), 'Sharpen': [[0, -1, 0], [-1, 5, -1], [0, -1, 0]], 'Vertical edges (∂/∂x)': SOBX, 'Horizontal edges (∂/∂y)': SOBY, 'Laplacian': [[0, 1, 0], [1, -4, 1], [0, 1, 0]], 'Shift right by 2': [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [1, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]] };
  AI.lab({
    id: 'which-kernel', ch: 25, kind: 'game', title: 'Which filter made this?',
    blurb: 'You see an image before and after a convolution. Pick the kernel that was applied. Eight rounds, with noise and the scene changing each time.',
    tags: ['convolution', 'linear filtering', 'kernels', 'edge detection'],
    how: [['Clues', '<ul><li>Blurs keep the overall brightness and soften edges.</li><li>Derivative filters respond only where brightness changes, in one direction, and give both signs.</li><li>The Laplacian responds to edges in every direction, with a double line.</li><li>Sharpening exaggerates edges but keeps the picture.</li></ul><p>Signed outputs are shown with blue for positive and orange for negative.</p>']],
    mount(root, ctx) {
      const W = 120, H = 84, names = Object.keys(KS);
      const Lw = AI.layout(root);
      const body = AI.el('<div style="padding:12px;display:grid;gap:12px"></div>'); Lw.stage.appendChild(body); Lw.stage.classList.add('plain');
      const imgs = AI.el('<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"></div>'), opts = AI.el('<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px"></div>'), fb = AI.el('<div style="min-height:44px"></div>'); body.append(imgs, opts, fb);
      const hb = AI.el('<div><p class="small muted" style="margin:0 0 4px">Before</p><div></div></div>'), ha = AI.el('<div><p class="small muted" style="margin:0 0 4px">After</p><div></div></div>'); imgs.append(hb, ha);
      let A, B, signed, answer, round = 0, score = 0, locked = false;
      const cb = AI.canvas(hb.lastChild, ctx, c => A && paint(c, A, W, H, 0, 1), H / W), ca = AI.canvas(ha.lastChild, ctx, c => { if (!B) return; if (signed) { const m = Math.max(1e-6, ...B.map(Math.abs)); paint(c, B, W, H, -m, m, true); } else paint(c, B, W, H, 0, 1); }, H / W);
      const ps = AI.panel(Lw.side, 'Score'); const stats = AI.stats(ps, [['r', 'round'], ['s', 'correct'], ['b', 'best']]);
      function next() {
        if (round >= 8) { const better = AI.progress.best('which-kernel', score); fb.innerHTML = `<div class="score-big">${score} / 8</div><p class="small" style="margin:6px 0 10px">${better ? 'New best. ' : ''}</p><button type="button" class="btn primary">${AI.icon.reset}<span>Play again</span></button>`; opts.innerHTML = ''; fb.querySelector('button').onclick = () => { round = 0; score = 0; next(); }; upd(); return; }
        answer = names[(Math.random() * names.length) | 0]; A = scene(W, H, 0.02 + Math.random() * 0.03, (Math.random() * 1e9) | 0); B = convolve(A, W, H, KS[answer]); signed = /edges|Laplacian/.test(answer); locked = false;
        cb.redraw(); ca.redraw(); fb.innerHTML = '';
        opts.innerHTML = names.map(n => `<button type="button" class="pick" data-n="${esc(n)}" style="padding:10px 12px"><b>${esc(n)}</b><span class="mono small">${KS[n].length === 3 ? KS[n].map(r => '[' + r.map(v => (Math.abs(v - 1 / 9) < 1e-9 ? '1/9' : v)).join(' ') + ']').join(' ') : '5×5: a single 1, two columns left of centre'}</span></button>`).join('');
        opts.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { if (locked) return; locked = true; const ok = b.dataset.n === answer; if (ok) score++; round++; b.setAttribute('aria-pressed', 'true'); opts.querySelectorAll('[data-n]').forEach(x => { x.disabled = true; if (x.dataset.n === answer) x.style.borderColor = 'var(--ok)'; }); fb.innerHTML = `<p style="margin:0 0 8px"><b>${ok ? 'Correct.' : 'Not this time.'}</b> It was <b>${esc(answer)}</b>.</p><button type="button" class="btn primary">${AI.icon.next}<span>${round >= 8 ? 'See your score' : 'Next image'}</span></button>`; fb.querySelector('button').onclick = next; upd(); });
        upd();
      }
      function upd() { const b = AI.progress.best('which-kernel'); stats.set('r', `${Math.min(round + 1, 8)} / 8`); stats.set('s', score); stats.set('b', b == null ? '–' : b + ' / 8'); }
      next();
    }
  });

  /* =====================================================================
     The pinhole camera
     ===================================================================== */
  AI.lab({
    id: 'pinhole', ch: 25, kind: 'demo', title: 'The pinhole camera and perspective',
    blurb: 'Light from each point of an object passes through a pinhole and lands on the image plane, upside down. Move the object and change the focal length to see the perspective projection x = −fX/Z at work.',
    tags: ['image formation', 'pinhole camera', 'perspective projection', 'focal length', 'scaled orthographic projection'],
    how: [['The equations', '<p>Put the pinhole at the origin and the image plane at distance f behind it. A scene point at (X, Y, Z) projects to x = −fX/Z, y = −fY/Z. The minus signs say the image is inverted.</p>'],
      ['Consequences', '<ul><li>Image size is inversely proportional to distance: double Z and the image halves.</li><li>A longer focal length magnifies everything by the same factor.</li><li>When an object’s depth varies little compared with its distance, every point has nearly the same Z, and the projection is close to a uniform scaling (scaled orthographic projection).</li></ul>']],
    mount(root, ctx) {
      const st = { f: 1.5, Z: 6, H: 2, Z2: 10, two: true };
      const Lp = AI.layout(root);
      const sv = AI.svgHost(Lp.stage, ctx, (w, h) => draw(w, h)); Lp.stage.style.minHeight = '380px';
      const pc = AI.panel(Lp.side, 'Camera and scene');
      AI.controls(pc, [{ t: 'range', k: 'f', label: 'Focal length f', min: 0.5, max: 3, step: 0.1, fmt: v => v.toFixed(1) }, { t: 'range', k: 'Z', label: 'Distance to the first tree Z', min: 2, max: 14, step: 0.5, fmt: v => v.toFixed(1) }, { t: 'range', k: 'H', label: 'Height of the trees', min: 0.5, max: 3, step: 0.1, fmt: v => v.toFixed(1) }, { t: 'row' }, { t: 'check', k: 'two', label: 'Add an identical tree farther away' }, { t: 'range', k: 'Z2', label: 'Distance to the second tree', min: 2, max: 14, step: 0.5, fmt: v => v.toFixed(1) }], st, () => { sv.redraw(); upd(); });
      const ps = AI.panel(Lp.side, 'Image heights'); const stats = AI.stats(ps, [['h1', 'first tree'], ['h2', 'second tree']]);
      function upd() { stats.set('h1', (st.f * st.H / st.Z).toFixed(3)); stats.set('h2', st.two ? (st.f * st.H / st.Z2).toFixed(3) : '–'); }
      function draw(w, h) {
        const sx = (w - 60) / (14 + 3.2), ox = 30 + 3.2 * sx, oy = h / 2, X = z => ox + z * sx, Y = y => oy - y * sx; let s = '';
        s += `<line x1="${X(-3.2)}" x2="${X(14)}" y1="${oy}" y2="${oy}" stroke="var(--line2)" stroke-dasharray="4 5"/><text x="${X(13.8)}" y="${oy - 6}" text-anchor="end" class="svg-s">optical axis (Z)</text>`;
        s += `<line x1="${X(-st.f)}" x2="${X(-st.f)}" y1="${Y(2.6)}" y2="${Y(-2.6)}" stroke="var(--ink2)" stroke-width="3"/><text x="${X(-st.f)}" y="${Y(-2.6) + 18}" text-anchor="middle" class="svg-s">image plane</text>`;
        s += `<line x1="${X(0)}" x2="${X(0)}" y1="${Y(3)}" y2="${Y(0.08)}" stroke="var(--ink)" stroke-width="4"/><line x1="${X(0)}" x2="${X(0)}" y1="${Y(-0.08)}" y2="${Y(-3)}" stroke="var(--ink)" stroke-width="4"/><text x="${X(0)}" y="${Y(3) - 8}" text-anchor="middle" class="svg-s">pinhole</text>`;
        s += `<line x1="${X(-st.f)}" x2="${X(0)}" y1="${oy + 26}" y2="${oy + 26}" stroke="var(--muted)"/><text x="${X(-st.f / 2)}" y="${oy + 40}" text-anchor="middle" class="svg-s">f</text>`;
        const tree = (Z, H, col) => { const base = -1.2, top = base + H; s += `<line x1="${X(Z)}" x2="${X(Z)}" y1="${Y(base)}" y2="${Y(top)}" stroke="${col}" stroke-width="5" stroke-linecap="round"/><circle cx="${X(Z)}" cy="${Y(top)}" r="7" fill="${col}"/>`; [top, base].forEach(yy => { const yi = -st.f * yy / Z; s += `<line x1="${X(Z)}" y1="${Y(yy)}" x2="${X(-st.f)}" y2="${Y(yi)}" stroke="${col}" stroke-opacity=".55" stroke-width="1.5"/>`; }); const a = -st.f * top / Z, b = -st.f * base / Z; s += `<line x1="${X(-st.f) - 6}" x2="${X(-st.f) - 6}" y1="${Y(a)}" y2="${Y(b)}" stroke="${col}" stroke-width="5" stroke-linecap="round"/><circle cx="${X(-st.f) - 6}" cy="${Y(a)}" r="5" fill="${col}"/>`; s += `<text x="${X(Z)}" y="${Y(base) + 18}" text-anchor="middle" class="svg-s">Z = ${Z.toFixed(1)}</text>`; };
        tree(st.Z, st.H, 'var(--v-goal)'); if (st.two) tree(st.Z2, st.H, 'var(--accent)');
        return s;
      }
      upd();
    }
  });

  /* =====================================================================
     Monte Carlo localisation in a corridor
     ===================================================================== */
  const DOORS = [[1.5, 2.5], [4.5, 5.5], [12, 13]], LEN = 20;
  const atDoor = x => DOORS.some(([a, b]) => x >= a && x <= b);
  AI.lab({
    id: 'particle-filter', ch: 26, kind: 'demo', title: 'Monte Carlo localisation with a particle filter',
    blurb: 'A robot moves along a corridor with three doors and can only sense whether it is beside a door. A cloud of particles represents its belief about where it is: predict, weight, resample.',
    tags: ['particle filtering', 'Monte Carlo localisation', 'resampling', 'motion model', 'sensor model'],
    how: [['The cycle', '<ol><li><b>Predict</b>: move every particle by the commanded distance plus random motion noise.</li><li><b>Weight</b>: multiply each particle’s weight by the probability of the sensor reading at its position.</li><li><b>Resample</b>: draw a new set of particles in proportion to the weights.</li></ol>'],
      ['The models', '<p>The robot moves 1 unit per step with Gaussian noise. The door sensor fires with probability 0.9 beside a door and 0.1 elsewhere. The corridor is 20 units long and wraps around.</p>'],
      ['What to look for', '<p>At first the particles are spread everywhere. After the first door they cluster beside all three doors, since a door looks like any other door. The spacing between doors then breaks the tie: only one hypothesis fits the sequence of readings.</p>']],
    mount(root, ctx) {
      const st = { N: 500, noise: 0.15 };
      const Lm = AI.layout(root);
      const sv = AI.svgHost(Lm.stage, ctx, (w, h) => draw(w, h)); Lm.stage.style.minHeight = '330px';
      const bar = AI.el('<div class="player"></div>'); Lm.stageCol.appendChild(bar); const bS = AI.el(`<button type="button" class="btn primary">${AI.icon.next}<span>Move and sense</span></button>`), bR = AI.el(`<button type="button" class="btn">${AI.icon.reset}<span>New run</span></button>`), info = AI.el('<span class="count" style="margin-left:auto"></span>'); bar.append(bS, bR, info);
      const pc = AI.panel(Lm.side, 'Filter'); AI.controls(pc, [{ t: 'select', k: 'N', label: 'Particles', opts: [[50, '50'], [200, '200'], [500, '500'], [2000, '2,000']] }, { t: 'range', k: 'noise', label: 'Motion noise (std. dev.)', min: 0.02, max: 0.6, step: 0.02, fmt: v => v.toFixed(2) }], st, () => reset());
      const ps = AI.panel(Lm.side, 'Last reading'); const ex = AI.el('<div class="explain small"></div>'); ps.appendChild(ex);
      const pq = AI.panel(Lm.side, 'Estimate'); const stats = AI.stats(pq, [['near', 'particles within 1 unit of the robot'], ['err', 'error of the mean estimate']]);
      let P, x, t, z, phase;
      const wrap = v => ((v % LEN) + LEN) % LEN;
      function reset() { x = 3 + Math.random() * 14; P = AI.range(+st.N).map(() => ({ x: Math.random() * LEN, w: 1 / st.N })); t = 0; z = null; phase = 'start'; ex.textContent = 'No reading yet: particles are spread uniformly.'; upd(); }
      function step() { const u = 1; x = wrap(x + u + AI.gauss() * st.noise * 0.5); P.forEach(p => { p.x = wrap(p.x + u + AI.gauss() * st.noise); }); z = Math.random() < (atDoor(x) ? 0.9 : 0.1); P.forEach(p => { p.w = (atDoor(p.x) === z) ? 0.9 : 0.1; }); const tot = P.reduce((s, p) => s + p.w, 0); P.forEach(p => { p.w /= tot; });
        // systematic resampling
        const n = P.length, out = [], u0 = Math.random() / n; let c = P[0].w, i = 0; for (let m = 0; m < n; m++) { const U = u0 + m / n; while (U > c && i < n - 1) { i++; c += P[i].w; } out.push({ x: P[i].x, w: 1 / n }); } P = out; t++;
        ex.innerHTML = `Step ${t}: the robot moved about 1 unit and the sensor said <b>${z ? 'door' : 'no door'}</b>${z !== atDoor(x) ? ' (a false reading this time)' : ''}. Particles in agreeing positions got weight 0.9, the others 0.1, before resampling.`; upd(); }
      function upd() { const near = P.filter(p => Math.min(Math.abs(p.x - x), LEN - Math.abs(p.x - x)) < 1).length; const ang = P.reduce((a, p) => [a[0] + Math.cos(2 * Math.PI * p.x / LEN), a[1] + Math.sin(2 * Math.PI * p.x / LEN)], [0, 0]); const mean = wrap(Math.atan2(ang[1], ang[0]) / (2 * Math.PI) * LEN); const err = Math.min(Math.abs(mean - x), LEN - Math.abs(mean - x)); stats.set('near', `${Math.round(100 * near / P.length)}%`); stats.set('err', err.toFixed(2)); info.textContent = `step ${t}`; sv.redraw(); }
      function draw(w, h) {
        const X = v => 20 + v / LEN * (w - 40), y0 = h * 0.42; let s = `<rect x="${X(0)}" y="${y0 - 40}" width="${X(LEN) - X(0)}" height="80" rx="8" fill="var(--bg)" stroke="var(--line2)"/>`;
        DOORS.forEach(([a, b]) => { s += `<rect x="${X(a)}" y="${y0 - 40}" width="${X(b) - X(a)}" height="16" fill="var(--v-chance)" fill-opacity=".55"/><text x="${(X(a) + X(b)) / 2}" y="${y0 - 46}" text-anchor="middle" class="svg-s">door</text>`; });
        const bins = 80, hist = new Array(bins).fill(0); P.forEach(p => hist[Math.min(bins - 1, (p.x / LEN * bins) | 0)]++); const mx = Math.max(1, ...hist), base = h - 24, hh = h - y0 - 70;
        hist.forEach((c, i) => { const bw = (X(LEN) - X(0)) / bins; s += `<rect x="${X(0) + i * bw}" y="${base - c / mx * hh}" width="${bw - 1}" height="${c / mx * hh}" fill="var(--v-path)" fill-opacity=".8"/>`; });
        s += `<text x="${X(0)}" y="${base + 16}" class="svg-s">particle histogram</text>`;
        P.slice(0, 400).forEach((p, i) => { s += `<circle cx="${X(p.x)}" cy="${y0 + 8 + (i % 9) * 3}" r="1.8" fill="var(--v-path)"/>`; });
        s += `<g transform="translate(${X(x)},${y0 - 8})"><rect x="-12" y="-14" width="24" height="22" rx="5" fill="var(--accent)"/><circle cx="-6" cy="10" r="4" fill="var(--ink)"/><circle cx="6" cy="10" r="4" fill="var(--ink)"/></g><text x="${X(x)}" y="${y0 - 28}" text-anchor="middle" class="svg-s halo-bg">robot</text>`;
        return s;
      }
      bS.onclick = step; bR.onclick = reset; reset();
    }
  });

  /* =====================================================================
     RRT motion planning
     ===================================================================== */
  const OBST = [[0.18, 0.0, 0.06, 0.62], [0.42, 0.38, 0.06, 0.62], [0.66, 0.0, 0.06, 0.55], [0.82, 0.62, 0.18, 0.06]];
  const hits = (x, y) => OBST.some(([a, b, w, h]) => x >= a && x <= a + w && y >= b && y <= b + h);
  const segFree = (x1, y1, x2, y2) => { const n = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 0.004); for (let i = 0; i <= n; i++) { const t = i / Math.max(1, n); if (hits(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return false; } return true; };
  AI._rrt = { hits, segFree };
  AI.lab({
    id: 'rrt', ch: 26, kind: 'demo', title: 'Rapidly exploring random trees',
    blurb: 'Plan a path through a maze of walls by growing a tree from the start towards random points. Watch how the tree rushes into empty space, and how goal bias speeds it up.',
    tags: ['motion planning', 'configuration space', 'RRT', 'sampling-based planning', 'collision checking'],
    how: [['The algorithm', '<ol><li>Sample a random point in free space (with probability equal to the goal bias, use the goal itself).</li><li>Find the nearest node already in the tree.</li><li>Step from that node towards the sample by at most the step size.</li><li>If the new segment is collision-free, add the new node to the tree.</li><li>Stop when a node lands within one step of the goal.</li></ol>'],
      ['Why it works', '<p>Large unexplored regions are more likely to contain the random sample, so the tree is pulled into them: it is biased towards exploration. RRT finds a path if one exists, given enough samples (probabilistic completeness), but the path is usually jagged and far from shortest; variants such as RRT* improve it with more samples.</p>'],
      ['Here', '<p>The robot is a point, so the configuration space is just the plane with the walls as obstacles.</p>']],
    mount(root, ctx) {
      const st = { step: 0.04, bias: 0.05 }; const S0 = [0.06, 0.1], GOAL = [0.94, 0.9];
      const Lr = AI.layout(root);
      const host = AI.el('<div style="padding:10px"></div>'); Lr.stage.appendChild(host); Lr.stage.classList.add('plain');
      let T, path, rng, sample = null;
      const cv = AI.canvas(host, ctx, c => {
        const g = c.g, pad = 10, X = v => pad + v * (c.w - 2 * pad), Y = v => c.h - pad - v * (c.h - 2 * pad);
        g.fillStyle = AI.color('bg'); g.fillRect(0, 0, c.w, c.h); g.strokeStyle = AI.color('line2'); g.strokeRect(X(0), Y(1), X(1) - X(0), Y(0) - Y(1));
        g.fillStyle = AI.color('wall'); OBST.forEach(([a, b, w, h]) => g.fillRect(X(a), Y(b + h), X(a + w) - X(a), Y(b) - Y(b + h)));
        g.strokeStyle = AI.alpha(AI.color('v-path'), 0.75); g.lineWidth = 1.4; T.forEach(n => { if (n.p < 0) return; const q = T[n.p]; g.beginPath(); g.moveTo(X(q.x), Y(q.y)); g.lineTo(X(n.x), Y(n.y)); g.stroke(); });
        if (sample) { g.fillStyle = AI.color('muted'); g.beginPath(); g.arc(X(sample[0]), Y(sample[1]), 3, 0, Math.PI * 2); g.fill(); }
        if (path) { g.strokeStyle = AI.color('accent'); g.lineWidth = 4; g.beginPath(); path.forEach((n, i) => i ? g.lineTo(X(n.x), Y(n.y)) : g.moveTo(X(n.x), Y(n.y))); g.stroke(); }
        [[S0, 'v-goal', 'start'], [GOAL, 'accent', 'goal']].forEach(([p, col, t]) => { g.fillStyle = AI.color(col); g.beginPath(); g.arc(X(p[0]), Y(p[1]), 8, 0, Math.PI * 2); g.fill(); g.fillStyle = AI.color('ink'); g.font = '12px ' + getComputedStyle(document.body).fontFamily; g.fillText(t, X(p[0]) + 11, Y(p[1]) + 4); });
      }, 0.68);
      const bar = AI.el('<div class="player"></div>'); Lr.stageCol.appendChild(bar);
      const b1 = AI.el(`<button type="button" class="btn">${AI.icon.next}<span>Add 1 node</span></button>`), b50 = AI.el('<button type="button" class="btn"><span>Add 50</span></button>'), bRun = AI.el(`<button type="button" class="btn primary">${AI.icon.play}<span>Grow until the goal is reached</span></button>`), bR = AI.el(`<button type="button" class="btn">${AI.icon.reset}<span>New tree</span></button>`); bar.append(b1, b50, bRun, bR);
      const pc = AI.panel(Lr.side, 'Settings'); AI.controls(pc, [{ t: 'range', k: 'step', label: 'Step size', min: 0.01, max: 0.1, step: 0.005, fmt: v => v.toFixed(3) }, { t: 'range', k: 'bias', label: 'Goal bias', min: 0, max: 0.5, step: 0.01, fmt: v => Math.round(v * 100) + '%' }], st, () => reset());
      const ps = AI.panel(Lr.side, 'Tree'); const stats = AI.stats(ps, [['n', 'nodes'], ['s', 'samples drawn'], ['len', 'path length']]);
      let samples = 0, running = null;
      function reset() { if (running) { running(); running = null; } rng = AI.rng((Math.random() * 1e9) | 0); T = [{ x: S0[0], y: S0[1], p: -1 }]; path = null; sample = null; samples = 0; upd(); }
      function grow() {
        if (path) return; samples++; let q; if (rng() < st.bias) q = GOAL; else { do { q = [rng(), rng()]; } while (hits(q[0], q[1])); } sample = q;
        let bi = 0, bd = Infinity; T.forEach((n, i) => { const d = Math.hypot(n.x - q[0], n.y - q[1]); if (d < bd) { bd = d; bi = i; } }); const n = T[bi], d = Math.max(1e-9, bd), s = Math.min(st.step, d), nx = n.x + (q[0] - n.x) / d * s, ny = n.y + (q[1] - n.y) / d * s;
        if (!segFree(n.x, n.y, nx, ny)) return; T.push({ x: nx, y: ny, p: bi });
        if (Math.hypot(nx - GOAL[0], ny - GOAL[1]) <= st.step && segFree(nx, ny, GOAL[0], GOAL[1])) { T.push({ x: GOAL[0], y: GOAL[1], p: T.length - 1 }); path = []; let k = T.length - 1; while (k >= 0) { path.unshift(T[k]); k = T[k].p; } }
      }
      function upd() { stats.set('n', T.length); stats.set('s', samples); stats.set('len', path ? path.reduce((a, n, i) => a + (i ? Math.hypot(n.x - path[i - 1].x, n.y - path[i - 1].y) : 0), 0).toFixed(3) : '–'); cv.redraw(); }
      b1.onclick = () => { grow(); upd(); }; b50.onclick = () => { for (let i = 0; i < 50; i++) grow(); upd(); };
      bRun.onclick = () => { if (running) return; running = ctx.every(30, () => { for (let i = 0; i < 6 && !path; i++) grow(); upd(); if (path || samples > 30000) { running(); running = null; } }); };
      bR.onclick = reset; reset();
    }
  });

  /* =====================================================================
     Game: tune a PID controller
     ===================================================================== */
  const PLANTS = [
    { name: 'Cart with friction', b: 1.0, d: 0, note: 'A cart on level ground with friction. A proportional controller alone can do well.' },
    { name: 'Frictionless cart', b: 0, d: 0, note: 'No friction at all. With P alone the cart oscillates for ever: you need damping, the D term.' },
    { name: 'Cart on a slope', b: 1.0, d: -2, note: 'A constant force pushes the cart back. With P and D alone it stops short of the target: the steady-state error that the I term removes.' }
  ];
  function simPID(pl, kp, ki, kd) { const dt = 0.01, Tn = 1000; let x = 0, v = 0, I = 0, prevE = 1, iae = 0, maxX = 0; const xs = []; for (let k = 0; k < Tn; k++) { const e = 1 - x; I += e * dt; const D = (e - prevE) / dt; prevE = e; let u = kp * e + ki * I + kd * D; u = Math.max(-20, Math.min(20, u)); const a = u - pl.b * v + pl.d; v += a * dt; x += v * dt; iae += Math.abs(e) * dt; maxX = Math.max(maxX, x); if (k % 10 === 0) xs.push(x); } return { xs, iae, over: Math.max(0, maxX - 1), final: x }; }
  AI._pid = { simPID, PLANTS };
  AI.lab({
    id: 'pid-game', ch: 26, kind: 'game', title: 'Tune the controller',
    blurb: 'Move a cart to the target position with a PID controller. Set the proportional, integral and derivative gains and get the lowest tracking error on three increasingly awkward carts.',
    tags: ['control', 'P controller', 'PD controller', 'PID controller', 'damping', 'steady-state error'],
    how: [['The controller', '<p>The error is e(t) = target − position. The controller pushes with u = K<sub>P</sub>e + K<sub>I</sub>∫e dt + K<sub>D</sub> de/dt, limited to ±20. P reacts to the current error, I to the accumulated error, D to how fast the error is changing.</p>'],
      ['Scoring', '<p>Your score is the integrated absolute error over 10 seconds, ∫|e| dt: smaller is better. The cart starts at 0 and the target is 1.</p>'],
      ['The carts', '<ul><li>Friction damps the motion, so P alone works.</li><li>Without friction, P alone gives an undamped oscillation; D adds the missing damping.</li><li>A constant opposing force leaves a steady error that only the integral term can remove.</li></ul>']],
    mount(root, ctx) {
      const st = { lv: 0, kp: 2, ki: 0, kd: 0 };
      const Lp = AI.layout(root);
      const cbox = AI.el('<div style="padding:10px 6px"></div>'); Lp.stage.appendChild(cbox); Lp.stage.classList.add('plain');
      const cart = AI.svgHost(AI.el('<div style="height:90px;position:relative"></div>'), ctx, (w, h) => cartSVG(w, h)); cbox.appendChild(cart.svg.parentNode);
      const chart = AI.chart(cbox, ctx, { height: 260, xLabel: 'time (s)', xs: i => (i / 10).toFixed(0), right: 90 });
      const pc = AI.panel(Lp.side, 'Gains');
      AI.controls(pc, [{ t: 'select', k: 'lv', label: 'Cart', opts: PLANTS.map((p, i) => [i, `${i + 1}. ${p.name}`]) }, { t: 'row' }, { t: 'range', k: 'kp', label: 'K_P (proportional)', min: 0, max: 30, step: 0.5, fmt: v => v.toFixed(1) }, { t: 'range', k: 'ki', label: 'K_I (integral)', min: 0, max: 20, step: 0.5, fmt: v => v.toFixed(1) }, { t: 'range', k: 'kd', label: 'K_D (derivative)', min: 0, max: 15, step: 0.25, fmt: v => v.toFixed(2) }], st, k => { if (k === 'lv') note.textContent = PLANTS[st.lv].note; run(); });
      const note = AI.el('<p class="small" style="margin:8px 0 0"></p>'); pc.appendChild(note); note.textContent = PLANTS[0].note;
      const ps = AI.panel(Lp.side, 'Result'); const stats = AI.stats(ps, [['iae', 'integrated |error|'], ['over', 'overshoot'], ['fin', 'position at 10 s'], ['best', 'your best']]);
      let R, anim = null, shown = 0;
      function cartSVG(w, h) { if (!R) return ''; const X = v => 30 + v / 1.6 * (w - 60), x = R.xs[Math.min(shown, R.xs.length - 1)]; return `<line x1="${X(-0.1)}" x2="${X(1.6)}" y1="${h - 18}" y2="${h - 18}" stroke="var(--ink2)" stroke-width="2"/><line x1="${X(1)}" x2="${X(1)}" y1="10" y2="${h - 18}" stroke="var(--accent)" stroke-dasharray="4 4" stroke-width="2"/><text x="${X(1) + 6}" y="20" class="svg-s" fill="var(--accent)">target</text><rect x="${X(x) - 26}" y="${h - 52}" width="52" height="26" rx="6" fill="var(--v-path)"/><circle cx="${X(x) - 14}" cy="${h - 24}" r="6" fill="var(--ink)"/><circle cx="${X(x) + 14}" cy="${h - 24}" r="6" fill="var(--ink)"/>`; }
      function run() {
        R = simPID(PLANTS[st.lv], st.kp, st.ki, st.kd); const ok = isFinite(R.iae);
        stats.set('iae', ok ? R.iae.toFixed(3) : '∞'); stats.set('over', (R.over * 100).toFixed(0) + '%', R.over > 0.25 ? 'bad' : ''); stats.set('fin', R.final.toFixed(3));
        if (ok) AI.progress.best('pid-' + st.lv, Math.round(R.iae * 1000), false); const b = AI.progress.best('pid-' + st.lv); stats.set('best', b == null ? '–' : (b / 1000).toFixed(3));
        chart.set([{ name: 'position', color: 'var(--v-path)', values: R.xs, width: 2.6 }, { name: 'target', color: 'var(--accent)', values: R.xs.map(() => 1), dash: '6 4' }]);
        if (anim) anim(); shown = 0; anim = ctx.every(16, () => { shown += 2; cart.redraw(); if (shown >= R.xs.length) { anim(); anim = null; } });
      }
      run();
    }
  });
})(window);
