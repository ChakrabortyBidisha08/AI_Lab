/* AI Lab core: utilities, storage, theme colours, controls, step player, pseudocode, charts, lab lifecycle. */
(function (G) {
  'use strict';
  const AI = G.AI = G.AI || {};
  AI.labs = {}; AI.labOrder = [];
  AI.lab = def => { AI.labs[def.id] = def; AI.labOrder.push(def.id); };

  /* ---------- utilities ---------- */
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  AI.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ESC[c]);
  AI.$ = (s, r) => (r || document).querySelector(s);
  AI.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  AI.el = html => { const t = document.createElement('template'); t.innerHTML = String(html).trim(); return t.content.firstElementChild; };
  AI.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  AI.lerp = (a, b, t) => a + (b - a) * t;
  AI.range = n => Array.from({ length: n }, (_, i) => i);
  AI.sum = a => a.reduce((s, x) => s + x, 0);
  AI.argmax = (a, f) => { let bi = -1, bv = -Infinity; a.forEach((x, i) => { const v = f ? f(x, i) : x; if (v > bv) { bv = v; bi = i; } }); return bi; };
  AI.fmt = (x, d) => { if (x === Infinity) return '∞'; if (x === -Infinity) return '−∞'; if (typeof x !== 'number' || isNaN(x)) return String(x); const s = x.toFixed(d == null ? 3 : d); return s.replace(/^-/, '−'); };
  AI.pct = (x, d) => (x * 100).toFixed(d == null ? 0 : d) + '%';
  AI.rng = seed => { let s = (seed >>> 0) || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  AI.shuffle = (a, r) => { r = r || Math.random; for (let i = a.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  AI.pick = (a, r) => a[((r || Math.random)() * a.length) | 0];
  AI.gauss = r => { r = r || Math.random; let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  AI.debounce = (f, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };

  /* ---------- storage (one viewer's browser; may be unavailable) ---------- */
  AI.store = {
    get(k, d) { try { const v = localStorage.getItem('ailab:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('ailab:' + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
  };
  AI.progress = {
    visit(id) { const v = AI.store.get('visited', {}); if (!v[id]) { v[id] = Date.now(); AI.store.set('visited', v); } },
    visited(id) { return !!AI.store.get('visited', {})[id]; },
    quiz(ch, data) { const q = AI.store.get('quiz', {}); if (data === undefined) return q[ch] || null; q[ch] = data; AI.store.set('quiz', q); },
    best(id, score, higher) {
      const b = AI.store.get('best', {}); const old = b[id];
      if (score === undefined) return old;
      const better = old == null || (higher === false ? score < old : score > old);
      if (better) { b[id] = score; AI.store.set('best', b); }
      return better;
    }
  };

  /* ---------- theme colours, resolved for canvas ---------- */
  let colorCache = {};
  AI.color = name => {
    if (colorCache[name]) return colorCache[name];
    const v = getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim();
    return (colorCache[name] = v || '#888');
  };
  AI.isDark = () => { const t = document.documentElement.getAttribute('data-theme'); if (t) return t === 'dark'; return matchMedia('(prefers-color-scheme: dark)').matches; };
  const themeChanged = () => { colorCache = {}; document.dispatchEvent(new CustomEvent('ai:theme')); };
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', themeChanged); } catch (e) { /* old browser */ }
  new MutationObserver(themeChanged).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  AI.alpha = (hex, a) => { const h = hex.replace('#', ''); if (h.length !== 6) return hex; const n = parseInt(h, 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

  /* ---------- lab lifecycle: everything registered here is torn down on navigation ---------- */
  AI.makeCtx = () => {
    const clean = [];
    const c = {
      cleanup: f => clean.push(f),
      raf(loop) { let id, last = performance.now(), alive = true; const tick = t => { if (!alive) return; const dt = Math.min(100, t - last); last = t; if (loop(dt, t) !== false) id = requestAnimationFrame(tick); }; id = requestAnimationFrame(tick); const stop = () => { alive = false; cancelAnimationFrame(id); }; clean.push(stop); return stop; },
      every(ms, f) { const id = setInterval(f, ms); clean.push(() => clearInterval(id)); return () => clearInterval(id); },
      after(ms, f) { const id = setTimeout(f, ms); clean.push(() => clearTimeout(id)); return id; },
      on(t, ev, f, o) { t.addEventListener(ev, f, o); clean.push(() => t.removeEventListener(ev, f, o)); },
      resize(el, f) { let w = -1, h = -1; const ro = new ResizeObserver(() => { const W = el.clientWidth, H = el.clientHeight; if (W !== w || H !== h) { w = W; h = H; f(W, H); } }); ro.observe(el); clean.push(() => ro.disconnect()); },
      theme(f) { c.on(document, 'ai:theme', f); },
      key(f) { c.on(document, 'keydown', e => { const tag = (document.activeElement && document.activeElement.tagName) || ''; if (/INPUT|TEXTAREA|SELECT/.test(tag)) return; f(e); }); },
      destroy() { while (clean.length) { try { clean.pop()(); } catch (e) { /* ignore */ } } }
    };
    return c;
  };

  /* ---------- icons (inline SVG, no emoji) ---------- */
  const I = AI.icon = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 4.5v15l10-7.5zM16 4h3v16h-3z"/></svg>',
    prev: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 4.5v15L9 12zM5 4h3v16H5z"/></svg>',
    first: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6l-6 6 6 6M7 5v14"/></svg>',
    last: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l6 6-6 6M17 5v14"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v5h5"/></svg>',
    dice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1.4" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.4" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.4" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
    bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2V16h5v-.2c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4M8.5 20h7M10 17h4"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>'
  };

  /* ---------- declarative controls ----------
     spec items: {t:'select',k,label,opts:[[v,text]]}, {t:'range',k,label,min,max,step,fmt},
     {t:'seg',k,label,opts}, {t:'check',k,label}, {t:'text',k,label,ph}, {t:'num',k,label,min,max,step},
     {t:'btn',label,on,cls,icon,id}, {t:'row'} starts a new row, {t:'html',html} */
  AI.controls = (host, spec, state, onChange) => {
    const refs = {}; let row = AI.el('<div class="ctl"></div>'); host.appendChild(row);
    const emit = k => onChange && onChange(k, state[k]);
    spec.forEach(s => {
      if (s.t === 'row') { row = AI.el('<div class="ctl"></div>'); host.appendChild(row); return; }
      if (s.t === 'html') { const e = AI.el(s.html); row.appendChild(e); if (s.id) refs[s.id] = e; return; }
      if (s.t === 'btn') {
        const b = AI.el(`<button type="button" class="btn ${s.cls || ''}">${s.icon ? I[s.icon] : ''}<span>${AI.esc(s.label)}</span></button>`);
        b.addEventListener('click', () => s.on && s.on(b)); row.appendChild(b); refs[s.id || s.label] = b; return;
      }
      if (s.t === 'check') {
        const w = AI.el(`<label class="switch" style="flex:1 1 220px"><span>${AI.esc(s.label)}</span><input type="checkbox" role="switch"></label>`);
        const inp = w.querySelector('input'); inp.checked = !!state[s.k];
        inp.addEventListener('change', () => { state[s.k] = inp.checked; emit(s.k); }); row.appendChild(w); refs[s.k] = inp; return;
      }
      const tag = s.t === 'seg' ? 'div' : 'label';
      const f = AI.el(`<${tag} class="field ${s.grow ? 'grow' : ''}"><span>${AI.esc(s.label || '')}${s.t === 'range' ? '<output></output>' : ''}</span></${tag}>`);
      let inp;
      if (s.t === 'select') {
        inp = AI.el('<select></select>');
        s.opts.forEach(o => { const [v, txt] = Array.isArray(o) ? o : [o, o]; const op = document.createElement('option'); op.value = v; op.textContent = txt; inp.appendChild(op); });
        inp.value = state[s.k]; inp.addEventListener('change', () => { state[s.k] = isNaN(+inp.value) || inp.value === '' || s.str ? inp.value : +inp.value; emit(s.k); });
      } else if (s.t === 'range') {
        inp = AI.el(`<input type="range" min="${s.min}" max="${s.max}" step="${s.step || 1}">`);
        const out = f.querySelector('output'); const show = () => { out.textContent = s.fmt ? s.fmt(state[s.k]) : state[s.k]; };
        inp.value = state[s.k]; show();
        inp.addEventListener('input', () => { state[s.k] = +inp.value; show(); emit(s.k); });
        refs[s.k + 'Out'] = out; inp._show = show;
      } else if (s.t === 'seg') {
        inp = AI.el(`<div class="seg" role="group" ${s.label ? `aria-label="${AI.esc(s.label)}"` : ''}></div>`);
        s.opts.forEach(o => { const [v, txt] = Array.isArray(o) ? o : [o, o]; const b = AI.el(`<button type="button">${AI.esc(txt)}</button>`); b.dataset.v = v; b.setAttribute('aria-pressed', String(String(state[s.k]) === String(v))); b.addEventListener('click', () => { state[s.k] = typeof state[s.k] === 'number' ? +v : v; inp.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); emit(s.k); }); inp.appendChild(b); });
        inp.set = v => inp.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.v === String(v))));
      } else if (s.t === 'text' || s.t === 'num') {
        inp = AI.el(`<input type="${s.t === 'num' ? 'number' : 'text'}" ${s.ph ? `placeholder="${AI.esc(s.ph)}"` : ''} ${s.min != null ? `min="${s.min}"` : ''} ${s.max != null ? `max="${s.max}"` : ''} ${s.step != null ? `step="${s.step}"` : ''} spellcheck="false" autocomplete="off">`);
        inp.value = state[s.k]; inp.addEventListener(s.live ? 'input' : 'change', () => { state[s.k] = s.t === 'num' ? +inp.value : inp.value; emit(s.k); });
      }
      if (s.id) inp.id = s.id;
      f.appendChild(inp); row.appendChild(f); refs[s.k] = inp; if (s.hide) f.hidden = true; refs[s.k + 'Field'] = f;
    });
    refs.sync = () => spec.forEach(s => { const r = refs[s.k]; if (!r || !s.k) return; if (s.t === 'check') r.checked = !!state[s.k]; else if (s.t === 'seg') r.set(state[s.k]); else if (s.t === 'range') { r.value = state[s.k]; r._show(); } else r.value = state[s.k]; });
    return refs;
  };

  /* ---------- panels ---------- */
  AI.panel = (host, title, extra) => { const p = AI.el(`<section class="panel ${extra || ''}">${title ? `<h3>${title}</h3>` : ''}</section>`); host.appendChild(p); return p; };
  AI.layout = (root, opts) => {
    opts = opts || {};
    const lab = AI.el(`<div class="lab ${opts.cls || ''}"><div class="stage-col"><div class="stage ${opts.stageCls || ''}"></div></div><div class="side"></div></div>`);
    root.appendChild(lab);
    const below = AI.el('<div class="below"></div>'); root.appendChild(below);
    return { lab, stageCol: lab.firstElementChild, stage: lab.querySelector('.stage'), side: lab.querySelector('.side'), below };
  };
  AI.legend = (host, items) => { const l = AI.el('<div class="legend"></div>'); l.innerHTML = items.map(([c, t, round]) => `<span><i class="${round ? 'round' : ''}" style="background:${c}"></i>${AI.esc(t)}</span>`).join(''); host.appendChild(l); return l; };
  AI.banner = (stage) => { const b = AI.el('<div class="banner" role="status"></div>'); stage.appendChild(b); let t; return (html, ms) => { b.innerHTML = html; b.classList.add('show'); clearTimeout(t); if (ms !== 0) t = setTimeout(() => b.classList.remove('show'), ms || 1400); }; };

  /* ---------- pseudocode panel: lines are strings; frame.line is 1-based ---------- */
  AI.pseudo = (host, lines) => {
    const pre = AI.el('<div class="pseudo" aria-label="Pseudocode"></div>');
    pre.innerHTML = lines.map(l => `<div>${AI.esc(l).replace(/\b(function|if|else|then|for each|for|while|loop|do|return|repeat|until|and|or|not|in|to|end)\b/g, '<span class="kw">$1</span>')}</div>`).join('');
    host.appendChild(pre);
    let cur = -1;
    return { el: pre, hl(n) { if (n === cur) return; const rows = pre.children; if (rows[cur - 1]) rows[cur - 1].classList.remove('on'); cur = n; if (rows[n - 1]) { rows[n - 1].classList.add('on'); const r = rows[n - 1], top = r.offsetTop - pre.clientHeight / 2; if (pre.scrollHeight > pre.clientHeight) pre.scrollTop = Math.max(0, top); } } };
  };

  /* ---------- key/value variables view ---------- */
  AI.kv = host => {
    const dl = AI.el('<dl class="kv"></dl>'); host.appendChild(dl); let prev = {};
    return { el: dl, set(obj) { dl.innerHTML = Object.keys(obj).map(k => `<dt>${AI.esc(k)}</dt><dd class="${prev[k] !== undefined && prev[k] !== obj[k] ? 'chg' : ''}">${AI.esc(obj[k])}</dd>`).join(''); prev = Object.assign({}, obj); } };
  };
  AI.stats = (host, items) => {
    const w = AI.el('<div class="stats"></div>'); host.appendChild(w);
    const cells = {};
    items.forEach(([k, label]) => { const s = AI.el(`<div class="stat"><b>–</b><span>${AI.esc(label)}</span></div>`); w.appendChild(s); cells[k] = s; });
    return { el: w, set(k, v, cls) { const c = cells[k]; if (!c) return; c.firstChild.textContent = v; c.className = 'stat ' + (cls || ''); } };
  };

  /* ---------- step player ----------
     frames: array of objects; onFrame(frame, index, total). Keyboard: Space, arrows, Home, End. */
  AI.Player = (host, ctx, onFrame, opts) => {
    opts = opts || {};
    const bar = AI.el(`<div class="player" aria-label="Step controls">
      <button type="button" class="btn icon" data-a="first" title="Start (Home)" aria-label="Go to start">${I.first}</button>
      <button type="button" class="btn icon" data-a="prev" title="Step back (←)" aria-label="Step back">${I.prev}</button>
      <button type="button" class="btn primary" data-a="play" title="Play / pause (Space)" style="min-width:92px">${I.play}<span>Play</span></button>
      <button type="button" class="btn icon" data-a="next" title="Step forward (→)" aria-label="Step forward">${I.next}</button>
      <button type="button" class="btn icon" data-a="last" title="End (End)" aria-label="Go to end">${I.last}</button>
      <div class="scrub"><input type="range" min="0" max="0" value="0" aria-label="Scrub through steps"><span class="count">0 / 0</span></div>
      <select aria-label="Speed"><option value="1400">Slow</option><option value="700" selected>Normal</option><option value="300">Fast</option><option value="90">Very fast</option></select>
    </div>`);
    host.appendChild(bar);
    const btn = a => bar.querySelector(`[data-a="${a}"]`), scrub = bar.querySelector('input'), count = bar.querySelector('.count'), speed = bar.querySelector('select');
    if (opts.speed) speed.value = String(opts.speed);
    let frames = [], i = 0, playing = false, acc = 0, stopRaf = null;
    const show = () => { const n = frames.length; scrub.max = Math.max(0, n - 1); scrub.value = i; count.textContent = n ? `${i + 1} / ${n}` : '0 / 0'; if (n) onFrame(frames[i], i, n); };
    const setPlay = p => { playing = p; const b = btn('play'); b.innerHTML = (p ? I.pause : I.play) + `<span>${p ? 'Pause' : 'Play'}</span>`; if (p && !stopRaf) { acc = 0; stopRaf = ctx.raf(dt => { if (!playing) { stopRaf = null; return false; } acc += dt; const iv = +speed.value; if (acc >= iv) { acc = 0; if (i < frames.length - 1) { i++; show(); } else { setPlay(false); stopRaf = null; return false; } } }); } };
    const api = {
      el: bar,
      set(f, keepEnd) { frames = f || []; i = keepEnd ? Math.max(0, frames.length - 1) : 0; setPlay(false); show(); },
      go(k) { i = AI.clamp(k, 0, Math.max(0, frames.length - 1)); show(); },
      get index() { return i; }, get length() { return frames.length; }, get frame() { return frames[i]; },
      play() { if (i >= frames.length - 1) i = 0; setPlay(true); }, pause() { setPlay(false); },
      get playing() { return playing; }
    };
    btn('first').onclick = () => { setPlay(false); api.go(0); };
    btn('last').onclick = () => { setPlay(false); api.go(frames.length - 1); };
    btn('prev').onclick = () => { setPlay(false); api.go(i - 1); };
    btn('next').onclick = () => { setPlay(false); api.go(i + 1); };
    btn('play').onclick = () => playing ? setPlay(false) : api.play();
    scrub.oninput = () => { setPlay(false); api.go(+scrub.value); };
    if (opts.keys !== false) ctx.key(e => {
      if (e.code === 'Space' && !/BUTTON/.test((document.activeElement || {}).tagName || '')) { e.preventDefault(); playing ? setPlay(false) : api.play(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); setPlay(false); api.go(i + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setPlay(false); api.go(i - 1); }
      else if (e.key === 'Home') { e.preventDefault(); setPlay(false); api.go(0); }
      else if (e.key === 'End') { e.preventDefault(); setPlay(false); api.go(frames.length - 1); }
    });
    return api;
  };

  /* ---------- canvas sized to its box (device-pixel aware) ---------- */
  /* content-box size of an element in whole pixels (client size minus padding) */
  AI.innerSize = el => { const cs = getComputedStyle(el); return [Math.max(0, Math.round(el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight))), Math.max(0, Math.round(el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)))]; };
  AI.canvas = (host, ctx, draw, aspect) => {
    const cv = document.createElement('canvas'); cv.style.display = 'block'; host.appendChild(cv); // block: no baseline gap, so a host sized by its content cannot grow by itself
    const g = cv.getContext('2d'); const st = { cv, g, w: 0, h: 0, dpr: 1 };
    const fit = () => { const [w, hh] = AI.innerSize(host); const h = aspect ? Math.round(w * aspect) : hh; if (!w || !h) return; st.dpr = Math.min(2.5, window.devicePixelRatio || 1); cv.width = Math.round(w * st.dpr); cv.height = Math.round(h * st.dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px'; st.w = w; st.h = h; g.setTransform(st.dpr, 0, 0, st.dpr, 0, 0); draw && draw(st); };
    st.fit = fit; st.redraw = () => { g.setTransform(st.dpr, 0, 0, st.dpr, 0, 0); draw && draw(st); };
    ctx.resize(host, fit); ctx.theme(() => st.redraw());
    return st;
  };
  AI.svgHost = (host, ctx, draw) => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.style.display = 'block'; host.appendChild(s);
    // The drawing gets the host's exact content size in pixels, so it never makes its host taller than it was.
    const api = { svg: s, w: 0, h: 0, redraw() { if (api.w) { s.setAttribute('viewBox', `0 0 ${api.w} ${api.h}`); s.setAttribute('width', api.w); s.setAttribute('height', api.h); s.innerHTML = draw(api.w, api.h); } } };
    ctx.resize(host, () => { const [w, h] = AI.innerSize(host); api.w = w; api.h = h || 1; api.redraw(); });
    return api;
  };

  /* ---------- line chart (SVG, drawn at real pixel size) ----------
     series: [{name, color, values:[...], dash}], opts: {yMin,yMax,xLabel,yLabel,xs,height,fmt} */
  AI.chart = (host, ctx, opts) => {
    opts = opts || {}; const wrap = AI.el(`<div style="position:relative;height:${opts.height || 200}px"></div>`); host.appendChild(wrap);
    let series = opts.series || [], extra = opts.extra || null;
    const sv = AI.svgHost(wrap, ctx, (W, H) => {
      const L = 44, R = opts.right == null ? 70 : opts.right, T = 12, B = opts.xLabel ? 34 : 22, iw = Math.max(10, W - L - R), ih = Math.max(10, H - T - B);
      const fin = v => typeof v === 'number' && isFinite(v);
      const all = series.flatMap(s => s.values.filter(fin));
      let y0 = opts.yMin != null ? opts.yMin : (all.length ? Math.min(...all) : 0), y1 = opts.yMax != null ? opts.yMax : (all.length ? Math.max(...all) : 1);
      if (y1 - y0 < 1e-9) { y0 -= 0.5; y1 += 0.5; }
      const nt = ih < 150 ? 3 : 4, raw = (y1 - y0) / nt, p10 = Math.pow(10, Math.floor(Math.log10(raw))), fr = raw / p10;
      const step = (fr <= 1 ? 1 : fr <= 2 ? 2 : fr <= 2.5 ? 2.5 : fr <= 5 ? 5 : 10) * p10;
      if (opts.yMin == null) y0 = Math.floor(y0 / step + 1e-9) * step; if (opts.yMax == null) y1 = Math.ceil(y1 / step - 1e-9) * step;
      let dec = 0; while (dec < 6 && Math.abs(+step.toFixed(dec) - step) > 1e-9 * Math.max(1, step)) dec++;
      const n = Math.max(2, ...series.map(s => s.values.length));
      const X = k => L + iw * (n <= 1 ? 0 : k / (n - 1)), Y = v => T + ih * (1 - (v - y0) / (y1 - y0));
      const f = opts.fmt || (v => { const t = (Math.abs(v) < step * 1e-6 ? 0 : v).toFixed(dec); return t.replace(/^-/, '−'); });
      let out = '';
      for (let v = Math.ceil(y0 / step - 1e-9) * step; v <= y1 + step * 1e-6; v += step) { const y = Y(v); out += `<line x1="${L}" x2="${L + iw}" y1="${y}" y2="${y}" stroke="var(--line)" />`; out += `<text x="${L - 6}" y="${y + 4}" text-anchor="end" class="svg-s">${AI.esc(f(v))}</text>`; }
      const xs = opts.xs; const xt = W < 520 ? 3 : 5;
      // x ticks: round numbers (0, 20, 40 …) when the labels are a linear function of the index, else evenly spaced indices
      const xv = k => xs ? +xs(k) : k, xa = xv(0), xb = xv(n - 1), xm = Math.floor((n - 1) / 2);
      if (n > 2 && isFinite(xa) && isFinite(xb) && xb > xa && Math.abs(xv(xm) - (xa + (xb - xa) * xm / (n - 1))) < 1e-6 * Math.max(1, Math.abs(xb))) {
        const whole = Number.isInteger(xa) && Number.isInteger(xb), rw = (xb - xa) / xt, q = Math.pow(10, Math.floor(Math.log10(rw)));
        let st = q; (whole ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10]).forEach(c => { c *= q; if (c <= rw * 1.2) st = c; });
        if (whole) st = Math.max(1, Math.round(st));
        let xd = 0; while (xd < 6 && Math.abs(+st.toFixed(xd) - st) > 1e-9 * Math.max(1, st)) xd++;
        for (let v = Math.ceil(xa / st - 1e-9) * st; v <= xb + st * 1e-6; v += st) { const k = (v - xa) / (xb - xa) * (n - 1); out += `<text x="${X(k)}" y="${T + ih + 16}" text-anchor="middle" class="svg-s">${AI.esc((Math.abs(v) < st * 1e-6 ? 0 : v).toFixed(xd).replace(/^-/, '−'))}</text>`; }
      } else { const seen = new Set(); for (let k = 0; k <= xt; k++) { const idx = Math.round((n - 1) * k / xt); if (seen.has(idx)) continue; seen.add(idx); out += `<text x="${X(idx)}" y="${T + ih + 16}" text-anchor="middle" class="svg-s">${AI.esc(xs ? xs(idx) : idx)}</text>`; } }
      if (opts.xLabel) out += `<text x="${L + iw / 2}" y="${H - 4}" text-anchor="middle" class="svg-s">${AI.esc(opts.xLabel)}</text>`;
      if (extra) out += extra(X, Y, { L, T, iw, ih, y0, y1, n });
      const labels = [];
      series.forEach(s => {
        const pts = s.values.map((v, k) => fin(v) ? `${X(k).toFixed(1)},${Y(AI.clamp(v, y0, y1)).toFixed(1)}` : null).filter(Boolean);
        if (!pts.length) return;
        out += `<polyline points="${pts.join(' ')}" fill="none" stroke="${s.color}" stroke-width="${s.width || 2.2}" stroke-linejoin="round" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''}/>`;
        const lastK = s.values.length - 1, lv = s.values[lastK];
        if (s.name && fin(lv)) labels.push({ y: Y(AI.clamp(lv, y0, y1)), x: X(lastK), name: s.name, color: s.color });
      });
      labels.sort((a, b) => a.y - b.y); for (let k = 1; k < labels.length; k++) if (labels[k].y - labels[k - 1].y < 14) labels[k].y = labels[k - 1].y + 14; if (labels.length) { const over = labels[labels.length - 1].y - (T + ih); if (over > 0) labels.forEach(l => { l.y -= over; }); for (let k = labels.length - 2; k >= 0; k--) if (labels[k + 1].y - labels[k].y < 14) labels[k].y = labels[k + 1].y - 14; }
      labels.forEach(l => { out += `<text x="${Math.min(l.x + 6, W - 2)}" y="${l.y + 4}" class="svg-t halo-bg" style="font-size:12.5px;font-weight:600" fill="${l.color}">${AI.esc(l.name)}</text>`; });
      return out;
    });
    return { set(s, ex) { series = s; if (ex !== undefined) extra = ex; sv.redraw(); }, redraw: () => sv.redraw() };
  };

  /* bar rows in HTML: items [{label, value, color, text}] with max */
  AI.bars = (host, items, max) => {
    max = max || Math.max(1e-9, ...items.map(i => i.value));
    host.innerHTML = items.map(i => `<div style="display:grid;grid-template-columns:minmax(70px,max-content) minmax(0,1fr) 60px;gap:8px;align-items:center;margin:4px 0;font-size:14px"><span>${AI.esc(i.label)}</span><span style="height:12px;background:var(--bg3);border-radius:6px;overflow:hidden"><i style="display:block;height:100%;width:${AI.clamp(i.value / max, 0, 1) * 100}%;background:${i.color || 'var(--ink)'}"></i></span><b class="num" style="text-align:right;font-weight:600">${AI.esc(i.text != null ? i.text : AI.fmt(i.value))}</b></div>`).join('');
  };

  /* table helper */
  AI.table = (head, rows, cls) => `<div class="scroll"><table class="tbl ${cls || ''}"><thead><tr>${head.map(h => `<th${/^#|^r:/.test(h) ? ' class="r"' : ''}>${AI.esc(String(h).replace(/^r:/, ''))}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;

  /* arrow head path for SVG lines */
  AI.arrowDefs = (id, color) => `<defs><marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${color || 'var(--ink2)'}"/></marker></defs>`;
})(window);
