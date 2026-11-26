/* Sequential decisions and RL engines (AIMA ch. 17, 22): grid MDPs, value and policy iteration,
   bandits, passive RL (direct estimation, ADP, TD), Q-learning and SARSA. */
(function (G) {
  'use strict';
  const E = G.AIE = G.AIE || {};
  const ACT = { U: [0, 1], R: [1, 0], D: [0, -1], L: [-1, 0] }, PERP = { U: ['L', 'R'], D: ['L', 'R'], L: ['U', 'D'], R: ['U', 'D'] };
  E.ACT = ACT;

  /* grid MDP. (x,y) are 1-based with (1,1) bottom-left, as in the book.
     spec: {W,H,walls:['2,2'], terms:{'4,3':1,'4,2':-1}, r: living reward, gamma, pOk (0.8), conv: 'state' | 'transition'} */
  E.gridMDP = spec => {
    const m = Object.assign({ W: 4, H: 3, walls: ['2,2'], terms: { '4,3': 1, '4,2': -1 }, r: -0.04, gamma: 1, pOk: 0.8, conv: 'state' }, spec || {});
    m.states = []; for (let y = 1; y <= m.H; y++) for (let x = 1; x <= m.W; x++) { const k = x + ',' + y; if (!m.walls.includes(k)) m.states.push(k); }
    m.isTerm = k => k in m.terms;
    m.move = (k, a) => { const [x, y] = k.split(',').map(Number), [dx, dy] = ACT[a], nx = x + dx, ny = y + dy, nk = nx + ',' + ny; return (nx < 1 || ny < 1 || nx > m.W || ny > m.H || m.walls.includes(nk)) ? k : nk; };
    m.T = (k, a) => { const side = (1 - m.pOk) / 2; return [[m.pOk, m.move(k, a)], [side, m.move(k, PERP[a][0])], [side, m.move(k, PERP[a][1])]].filter(t => t[0] > 0); };
    // expected utility of doing a in k, given U
    m.Q = (U, k, a) => m.T(k, a).reduce((s, [p, s2]) => s + p * (m.conv === 'state' ? m.gamma * U[s2] : ((m.isTerm(s2) ? m.terms[s2] : m.r) + m.gamma * U[s2])), 0);
    m.init = () => { const U = {}; m.states.forEach(k => U[k] = m.conv === 'state' && m.isTerm(k) ? m.terms[k] : 0); return U; };
    m.backup = (U, k) => { if (m.isTerm(k)) return m.conv === 'state' ? m.terms[k] : 0; const best = Math.max(...Object.keys(ACT).map(a => m.Q(U, k, a))); return m.conv === 'state' ? m.r + best : best; };
    m.policy = U => { const pi = {}; m.states.forEach(k => { if (m.isTerm(k)) return; let ba = 'U', bv = -Infinity; for (const a of ['U', 'R', 'D', 'L']) { const v = m.Q(U, k, a); if (v > bv + 1e-12) { bv = v; ba = a; } } pi[k] = ba; }); return pi; };
    return m;
  };
  E.valueIteration = (m, eps, maxIt) => {
    eps = eps == null ? 1e-4 : eps; maxIt = maxIt || 200; let U = m.init(); const hist = [{ U: Object.assign({}, U), delta: null }];
    for (let it = 1; it <= maxIt; it++) {
      const N = {}; let d = 0; m.states.forEach(k => { N[k] = m.backup(U, k); d = Math.max(d, Math.abs(N[k] - U[k])); });
      U = N; hist.push({ U: Object.assign({}, U), delta: d, pi: m.policy(U) });
      const stop = m.gamma < 1 ? eps * (1 - m.gamma) / m.gamma : eps; if (d < stop) break;
    }
    return hist;
  };
  E.policyEval = (m, pi, U0, sweeps) => { let U = Object.assign({}, U0 || m.init()); for (let s = 0; s < (sweeps || 1000); s++) { const N = {}; let d = 0; m.states.forEach(k => { if (m.isTerm(k)) { N[k] = m.conv === 'state' ? m.terms[k] : 0; return; } const q = m.Q(U, k, pi[k]); N[k] = m.conv === 'state' ? m.r + q : q; d = Math.max(d, Math.abs(N[k] - U[k])); }); U = N; if (d < 1e-9) break; } return U; };
  E.policyIteration = (m, pi0) => {
    let pi = Object.assign({}, pi0); const hist = []; let U = m.init();
    for (let it = 0; it < 40; it++) {
      U = E.policyEval(m, pi, U); const npi = m.policy(U); let changed = 0;
      m.states.forEach(k => { if (!m.isTerm(k) && m.Q(U, k, npi[k]) > m.Q(U, k, pi[k]) + 1e-9) { changed++; } else if (!m.isTerm(k)) npi[k] = pi[k]; });
      hist.push({ pi: Object.assign({}, pi), U: Object.assign({}, U), changed, next: Object.assign({}, npi) });
      if (!changed) break; pi = npi;
    }
    return hist;
  };
  E.simulate = (m, pi, start, r, maxSteps) => { let k = start, total = 0, steps = 0; const path = [k]; while (!m.isTerm(k) && steps < (maxSteps || 200)) { if (m.conv === 'state') total += Math.pow(m.gamma, steps) * m.r; const ts = m.T(k, pi[k]); let x = r(), nk = ts[ts.length - 1][1]; for (const [p, s2] of ts) { x -= p; if (x <= 0) { nk = s2; break; } } if (m.conv !== 'state') total += Math.pow(m.gamma, steps) * (m.isTerm(nk) ? m.terms[nk] : m.r); k = nk; path.push(k); steps++; } if (m.conv === 'state' && m.isTerm(k)) total += Math.pow(m.gamma, steps) * m.terms[k]; return { path, total, steps }; };

  /* ---------- multi-armed bandits (Bernoulli arms) ---------- */
  E.bandit = {
    policies: {
      greedy: () => ({ name: 'Greedy', pick(s) { const k = s.n.findIndex(x => x === 0); if (k >= 0) return k; return argmax(s.mean); } }),
      eps: e => ({ name: `ε-greedy (ε = ${e})`, pick(s, r) { if (r() < e) return (r() * s.n.length) | 0; const k = s.n.findIndex(x => x === 0); if (k >= 0) return k; return argmax(s.mean); } }),
      ucb: () => ({ name: 'UCB1', pick(s) { const k = s.n.findIndex(x => x === 0); if (k >= 0) return k; const t = s.n.reduce((a, b) => a + b, 0); return argmax(s.mean.map((m, i) => m + Math.sqrt(2 * Math.log(t) / s.n[i]))); } }),
      thompson: () => ({ name: 'Thompson sampling', pick(s, r) { return argmax(s.n.map((n, i) => betaSample(1 + s.w[i], 1 + n - s.w[i], r))); } })
    },
    run(probs, policy, T, r) { const s = { n: probs.map(() => 0), w: probs.map(() => 0), mean: probs.map(() => 0) }; let reward = 0; const best = Math.max(...probs); const regret = []; let reg = 0; const picks = []; for (let t = 0; t < T; t++) { const k = policy.pick(s, r); const win = r() < probs[k] ? 1 : 0; s.n[k]++; s.w[k] += win; s.mean[k] = s.w[k] / s.n[k]; reward += win; reg += best - probs[k]; regret.push(reg); picks.push(k); } return { reward, regret, s, picks }; }
  };
  const argmax = a => { let bi = 0; a.forEach((v, i) => { if (v > a[bi]) bi = i; }); return bi; };
  function gammaSample(k, r) { if (k < 1) return gammaSample(k + 1, r) * Math.pow(r(), 1 / k); const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d); for (;;) { let x, v; do { const u1 = r() || 1e-12, u2 = r(); x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); v = 1 + c * x; } while (v <= 0); v = v * v * v; const u = r(); if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v; } }
  function betaSample(a, b, r) { const x = gammaSample(a, r), y = gammaSample(b, r); return x / (x + y); }
  E.betaSample = betaSample;

  /* ---------- passive RL on a grid MDP with a fixed policy ---------- */
  E.passive = (m, pi, method, trials, r, alphaFn) => {
    const start = '1,1'; const U = {}; m.states.forEach(k => U[k] = 0);
    const Ns = {}, Nsa = {}, Nsas = {}, Rs = {}, returns = {}; const hist = [];
    for (let t = 0; t < trials; t++) {
      const ep = []; let k = start; let guard = 0;
      while (guard++ < 300) { const rew = m.isTerm(k) ? m.terms[k] : m.r; ep.push([k, rew]); if (m.isTerm(k)) break; const ts = m.T(k, pi[k]); let x = r(), nk = ts[ts.length - 1][1]; for (const [p, s2] of ts) { x -= p; if (x <= 0) { nk = s2; break; } } k = nk; }
      if (method === 'direct') { let G = 0; for (let i = ep.length - 1; i >= 0; i--) { G = ep[i][1] + m.gamma * G; const s = ep[i][0]; returns[s] = returns[s] || [0, 0]; returns[s][0] += G; returns[s][1]++; } m.states.forEach(s => { if (returns[s]) U[s] = returns[s][0] / returns[s][1]; }); }
      else if (method === 'td') { for (let i = 0; i < ep.length; i++) { const [s, rew] = ep[i]; Ns[s] = (Ns[s] || 0) + 1; if (m.isTerm(s)) { U[s] = rew; continue; } const s2 = ep[i + 1][0]; const a = alphaFn ? alphaFn(Ns[s]) : 60 / (59 + Ns[s]); U[s] += a * (rew + m.gamma * U[s2] - U[s]); } }
      else if (method === 'adp') { for (let i = 0; i < ep.length; i++) { const [s, rew] = ep[i]; Rs[s] = rew; if (m.isTerm(s)) continue; const s2 = ep[i + 1][0]; Nsa[s] = (Nsa[s] || 0) + 1; Nsas[s] = Nsas[s] || {}; Nsas[s][s2] = (Nsas[s][s2] || 0) + 1; }
        for (let sweep = 0; sweep < 60; sweep++) m.states.forEach(s => { if (!(s in Rs)) return; if (m.isTerm(s)) { U[s] = Rs[s]; return; } let e = 0; for (const s2 in Nsas[s]) e += (Nsas[s][s2] / Nsa[s]) * U[s2]; U[s] = Rs[s] + m.gamma * e; }); }
      hist.push(Object.assign({}, U));
    }
    return hist;
  };

  /* ---------- Q-learning and SARSA on a deterministic or slippery grid ----------
     env: {W,H, start, goal, cliff:Set, walls:Set, stepR, cliffR, goalR, slip} cells as "x,y" with (0,0) bottom-left */
  E.tdControl = {
    make(env, algo, alpha, gamma, eps, r) {
      const Q = {}; const acts = ['U', 'R', 'D', 'L'];
      const q = (s, a) => Q[s + a] || 0;
      const greedy = s => { let ba = acts[0], bv = -Infinity; for (const a of acts) { const v = q(s, a); if (v > bv + 1e-12) { bv = v; ba = a; } } return ba; };
      const choose = s => r() < eps ? acts[(r() * 4) | 0] : greedy(s);
      const step = (s, a) => { if (env.slip && r() < env.slip) a = PERP[a][r() < 0.5 ? 0 : 1]; const [x, y] = s.split(',').map(Number), [dx, dy] = ACT[a]; let nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= env.W || ny >= env.H || env.walls.has(nx + ',' + ny)) { nx = x; ny = y; } const ns = nx + ',' + ny; if (env.cliff.has(ns)) return { s: env.start, r: env.cliffR, done: false, fell: true }; if (ns === env.goal) return { s: ns, r: env.goalR, done: true }; return { s: ns, r: env.stepR, done: false }; };
      return {
        Q, q, greedy, acts,
        episode(maxSteps) {
          let s = env.start, a = choose(s), total = 0, steps = 0, falls = 0; const path = [s];
          while (steps++ < (maxSteps || 500)) {
            const o = step(s, a); total += o.r; if (o.fell) falls++;
            const a2 = choose(o.s);
            const target = o.done ? o.r : o.r + gamma * (algo === 'sarsa' ? q(o.s, a2) : q(o.s, greedy(o.s)));
            Q[s + a] = q(s, a) + alpha * (target - q(s, a));
            path.push(o.s); s = o.s; a = a2; if (o.done) break;
          }
          return { total, steps, falls, path };
        }
      };
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
