/**
 * Bronfenbrenner Ecological Systems Visualization
 * Animated agents moving through nested ecological system layers.
 */
window.initBronfenbrenner = function(canvas) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d');

  const W = 900, H = 360;
  canvas.width = W; canvas.height = H;

  const FROST   = '#88C0D0';
  const GREEN   = '#A3BE8C';
  const YELLOW  = '#EBCB8B';
  const MAGENTA = '#B48EAD';

  // --- FIXED MESOSYSTEMS (institutions) ---
  const fixedMeso = [
    { x: W * 0.18, y: H * 0.42, r: 72, label: 'university',  color: FROST  },
    { x: W * 0.52, y: H * 0.36, r: 62, label: 'workplace',   color: YELLOW },
    { x: W * 0.80, y: H * 0.58, r: 56, label: 'community',   color: GREEN  },
  ];

  // --- CORRIDORS between mesosystems ---
  const corridors = [];
  for (let i = 0; i < fixedMeso.length; i++) {
    for (let j = i + 1; j < fixedMeso.length; j++) {
      const a = fixedMeso[i], b = fixedMeso[j];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = -dy / len, ny = dx / len;
      const curveAmt = 20 + Math.random() * 15;
      corridors.push({
        from: i, to: j,
        cx: mx + nx * curveAmt,
        cy: my + ny * curveAmt,
        ax: a.x, ay: a.y,
        bx: b.x, by: b.y,
      });
    }
  }

  // --- AGENT PERSONALITY TYPES ---
  const PERSONALITY = {
    academic:   { baseColor: [136, 192, 208], hex: FROST,   homeIdx: 0, speedMul: 0.8  },
    workplace:  { baseColor: [235, 203, 139], hex: YELLOW,  homeIdx: 1, speedMul: 1.0  },
    community:  { baseColor: [163, 190, 140], hex: GREEN,   homeIdx: 2, speedMul: 0.9  },
    wanderer:   { baseColor: [180, 142, 173], hex: MAGENTA, homeIdx: -1, speedMul: 1.3 },
  };
  const PERSONALITY_KEYS = Object.keys(PERSONALITY);

  // --- AGENTS ---
  const N_AGENTS = 55;
  const AGENT_R = 2.8;

  function makeAgent(offCanvas) {
    const pKey = PERSONALITY_KEYS[Math.floor(Math.random() * PERSONALITY_KEYS.length)];
    const p = PERSONALITY[pKey];
    let x, y;
    if (offCanvas) {
      const edge = Math.floor(Math.random() * 4);
      if (edge === 0)      { x = -10; y = Math.random() * H; }
      else if (edge === 1) { x = W + 10; y = Math.random() * H; }
      else if (edge === 2) { x = Math.random() * W; y = -10; }
      else                 { x = Math.random() * W; y = H + 10; }
    } else {
      x = Math.random() * W;
      y = Math.random() * H;
    }
    return {
      x, y,
      vx: (Math.random() - 0.5) * 0.5 * p.speedMul,
      vy: (Math.random() - 0.5) * 0.5 * p.speedMul,
      personality: pKey,
      baseColor: [...p.baseColor],
      currentColor: [...p.baseColor],
      homeIdx: p.homeIdx,
      speedMul: p.speedMul,
      phase: Math.random() * Math.PI * 2,
      state: 'roam',
      targetMeso: -1,
      dwellTimer: 0,
      travelProgress: 0,
      corridorIdx: -1,
      corridorDir: 1,
      leaveAngle: 0,
      stateTimer: 80 + Math.random() * 200,
      lifespan: offCanvas ? 300 + Math.random() * 500 : Infinity,
      age: 0,
    };
  }

  const agents = [];
  for (let i = 0; i < N_AGENTS; i++) {
    agents.push(makeAgent(false));
  }

  let nextSpawnTime = 2;
  let emergentMeso = [];
  let microsystems = [];
  let ripples = [];
  let nextRippleTime = 0;
  let policyWaves = [];
  let nextPolicyWaveTime = 3;
  let macroPhase = 0;
  let t = 0;
  let running = false;
  let raf;

  function dist(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  function fieldAngle(x, y, time) {
    const s = 0.004;
    return (
      Math.sin(x * s * 1.1 + time * 0.2) * Math.cos(y * s * 0.9 + time * 0.15) +
      Math.sin(x * s * 2.0 + y * s * 1.4 + time * 0.1) * 0.35
    );
  }

  function bezierPt(ax, ay, cx, cy, bx, by, t) {
    const u = 1 - t;
    return {
      x: u * u * ax + 2 * u * t * cx + t * t * bx,
      y: u * u * ay + 2 * u * t * cy + t * t * by,
    };
  }

  function lerpColor(c1, c2, amt) {
    return [
      c1[0] + (c2[0] - c1[0]) * amt,
      c1[1] + (c2[1] - c1[1]) * amt,
      c1[2] + (c2[2] - c1[2]) * amt,
    ];
  }

  function colorToRgb(c) {
    return `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
  }

  const MESO_COLORS = [
    [136, 192, 208],
    [235, 203, 139],
    [163, 190, 140],
  ];

  function updateAgents() {
    const ATTRACT_MESO = 0.004;
    const REPEL_AGENT = 0.12;
    const REPEL_DIST = 14;
    const FIELD_STR = 0.015;
    const DAMP = 0.982;
    const MAX_V_BASE = 0.9;

    let policySpeedMul = 1;
    let policyCluster = false;

    policyWaves.forEach(pw => {
      if (pw.alpha > 0.05) {
        if (pw.type === 'accelerate') policySpeedMul = 1.4;
        else if (pw.type === 'decelerate') policySpeedMul = 0.5;
        else if (pw.type === 'cluster') policyCluster = true;
      }
    });

    agents.forEach((a, idx) => {
      a.age++;
      a.stateTimer--;

      const MAX_V = MAX_V_BASE * a.speedMul * policySpeedMul;

      if (a.state === 'roam') {
        const angle = fieldAngle(a.x, a.y, t + a.phase);
        a.vx += Math.cos(angle) * FIELD_STR;
        a.vy += Math.sin(angle) * FIELD_STR;

        if (a.homeIdx >= 0) {
          const home = fixedMeso[a.homeIdx];
          const d = dist(a, home);
          if (d > home.r * 3) {
            const pull = 0.001;
            a.vx += (home.x - a.x) / d * pull;
            a.vy += (home.y - a.y) / d * pull;
          }
        }

        fixedMeso.forEach(m => {
          const d = dist(a, m);
          if (d < m.r * 2.2 && d > 0) {
            const targetDist = m.r * 0.6;
            const pull = (d - targetDist) * ATTRACT_MESO;
            a.vx += (m.x - a.x) / d * pull;
            a.vy += (m.y - a.y) / d * pull;
          }
        });

        if (policyCluster) {
          const nearest = fixedMeso.reduce((best, m) => {
            const d = dist(a, m);
            return d < best.d ? { m, d } : best;
          }, { m: null, d: Infinity });
          if (nearest.m && nearest.d > nearest.m.r * 0.5) {
            a.vx += (nearest.m.x - a.x) / nearest.d * 0.02;
            a.vy += (nearest.m.y - a.y) / nearest.d * 0.02;
          }
        }

        if (a.stateTimer <= 0) {
          const roll = Math.random();
          if (roll < 0.35 && a.personality !== 'wanderer') {
            const possibleCorridors = corridors.filter(c => {
              const nearFrom = dist(a, fixedMeso[c.from]) < fixedMeso[c.from].r * 2.5;
              const nearTo = dist(a, fixedMeso[c.to]) < fixedMeso[c.to].r * 2.5;
              return nearFrom || nearTo;
            });
            if (possibleCorridors.length > 0) {
              const chosen = possibleCorridors[Math.floor(Math.random() * possibleCorridors.length)];
              a.state = 'traveling';
              a.corridorIdx = corridors.indexOf(chosen);
              const dFrom = dist(a, fixedMeso[chosen.from]);
              const dTo = dist(a, fixedMeso[chosen.to]);
              a.corridorDir = dFrom < dTo ? 1 : -1;
              a.travelProgress = a.corridorDir === 1 ? 0 : 1;
            } else {
              a.stateTimer = 60 + Math.random() * 120;
            }
          } else if (roll < 0.55 && a.personality === 'wanderer') {
            a.targetMeso = Math.floor(Math.random() * fixedMeso.length);
            a.state = 'dwelling';
            a.dwellTimer = 80 + Math.random() * 150;
            a.stateTimer = a.dwellTimer;
          } else if (a.lifespan !== Infinity && a.age > a.lifespan * 0.7) {
            a.state = 'leaving';
            a.leaveAngle = Math.atan2(a.y - H / 2, a.x - W / 2) + (Math.random() - 0.5) * 0.5;
            a.stateTimer = 200;
          } else {
            a.stateTimer = 60 + Math.random() * 200;
          }
        }
      } else if (a.state === 'traveling') {
        const corr = corridors[a.corridorIdx];
        const speed = 0.006 * a.speedMul * policySpeedMul;
        a.travelProgress += speed * a.corridorDir;

        if (a.travelProgress >= 1 || a.travelProgress <= 0) {
          a.state = 'dwelling';
          const destIdx = a.corridorDir === 1 ? corr.to : corr.from;
          a.targetMeso = destIdx;
          a.dwellTimer = 100 + Math.random() * 200;
          a.stateTimer = a.dwellTimer;
        } else {
          const pt = bezierPt(corr.ax, corr.ay, corr.cx, corr.cy, corr.bx, corr.by, a.travelProgress);
          const dx = pt.x - a.x, dy = pt.y - a.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          a.vx += (dx / d) * 0.12 * a.speedMul;
          a.vy += (dy / d) * 0.12 * a.speedMul;
        }
      } else if (a.state === 'dwelling') {
        if (a.targetMeso >= 0 && a.targetMeso < fixedMeso.length) {
          const m = fixedMeso[a.targetMeso];
          const d = dist(a, m);
          if (d > m.r * 0.8) {
            a.vx += (m.x - a.x) / d * 0.03;
            a.vy += (m.y - a.y) / d * 0.03;
          }
          const angle = fieldAngle(a.x, a.y, t + a.phase);
          a.vx += Math.cos(angle) * FIELD_STR * 0.3;
          a.vy += Math.sin(angle) * FIELD_STR * 0.3;
        }
        a.dwellTimer--;
        if (a.stateTimer <= 0 || a.dwellTimer <= 0) {
          a.state = 'roam';
          a.stateTimer = 80 + Math.random() * 200;
          a.targetMeso = -1;
        }
      } else if (a.state === 'leaving') {
        a.vx += Math.cos(a.leaveAngle) * 0.04;
        a.vy += Math.sin(a.leaveAngle) * 0.04;
        if (a.stateTimer <= 0 || a.x < -30 || a.x > W + 30 || a.y < -30 || a.y > H + 30) {
          Object.assign(a, makeAgent(true));
        }
      }

      // Agent-agent repulsion
      agents.forEach(b => {
        if (a === b) return;
        const dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (d < REPEL_DIST) {
          const f = REPEL_AGENT * (1 - d / REPEL_DIST);
          a.vx += (dx / d) * f;
          a.vy += (dy / d) * f;
        }
      });

      // Ripple effects
      ripples.forEach(rip => {
        const dx = a.x - rip.x, dy = a.y - rip.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const ripDist = Math.abs(d - rip.r);
        if (ripDist < 25) {
          const push = 0.06 * rip.alpha * (1 - ripDist / 25);
          a.vx += (dx / d) * push;
          a.vy += (dy / d) * push;
        }
      });

      // Emergent meso attraction
      emergentMeso.forEach(em => {
        const d = dist(a, em);
        if (d < em.r * 2 && d > em.r * 0.3) {
          const pull = 0.008 * (em.life / em.maxLife);
          a.vx += (em.x - a.x) / d * pull;
          a.vy += (em.y - a.y) / d * pull;
        }
      });

      // Damping and speed cap
      a.vx *= DAMP;
      a.vy *= DAMP;
      const speed = Math.sqrt(a.vx * a.vx + a.vy * a.vy);
      if (speed > MAX_V) {
        a.vx = (a.vx / speed) * MAX_V;
        a.vy = (a.vy / speed) * MAX_V;
      }

      a.x += a.vx;
      a.y += a.vy;

      // Wrap at edges (only for non-leaving agents)
      if (a.state !== 'leaving') {
        const margin = 15;
        if (a.x < -margin) a.x += W + margin * 2;
        if (a.x > W + margin) a.x -= W + margin * 2;
        if (a.y < -margin) a.y += H + margin * 2;
        if (a.y > H + margin) a.y -= H + margin * 2;
      }

      // Environmental color influence
      let inMesoIdx = -1;
      fixedMeso.forEach((m, mi) => {
        if (dist(a, m) < m.r) inMesoIdx = mi;
      });
      if (inMesoIdx >= 0) {
        a.currentColor = lerpColor(a.currentColor, MESO_COLORS[inMesoIdx], 0.008);
      } else {
        a.currentColor = lerpColor(a.currentColor, a.baseColor, 0.003);
      }
    });

    // Spawn new agents from edges occasionally
    t += 0.016;
    if (t > nextSpawnTime && agents.length < 65) {
      agents.push(makeAgent(true));
      nextSpawnTime = t + 3 + Math.random() * 8;
    }

    // Remove agents that have been alive too long and are off-canvas
    for (let i = agents.length - 1; i >= 0; i--) {
      const a = agents[i];
      if (a.lifespan !== Infinity && a.age > a.lifespan && (a.x < -20 || a.x > W + 20 || a.y < -20 || a.y > H + 20)) {
        agents.splice(i, 1);
      }
    }
  }

  function detectMicrosystems() {
    const MICRO_DIST = 22;
    const used = new Set();
    const newMicro = [];

    agents.forEach((a, i) => {
      if (used.has(i)) return;
      const group = [i];
      agents.forEach((b, j) => {
        if (i === j || used.has(j)) return;
        if (dist(a, b) < MICRO_DIST) group.push(j);
      });
      if (group.length >= 2 && group.length <= 3) {
        const cx = group.reduce((s, idx) => s + agents[idx].x, 0) / group.length;
        const cy = group.reduce((s, idx) => s + agents[idx].y, 0) / group.length;
        let inFixed = false;
        fixedMeso.forEach(m => { if (dist({ x: cx, y: cy }, m) < m.r * 0.7) inFixed = true; });
        if (!inFixed) {
          let found = microsystems.find(m => dist(m, { x: cx, y: cy }) < 30 && m.life > 0);
          if (found) {
            found.x = cx; found.y = cy; found.agents = group;
            found.life = Math.min(found.maxLife, found.life + 2);
            newMicro.push(found);
          } else {
            newMicro.push({ x: cx, y: cy, r: 22, agents: group, life: 50, maxLife: 100 });
          }
          group.forEach(idx => used.add(idx));
        }
      }
    });
    microsystems.forEach(m => {
      if (!newMicro.includes(m)) { m.life -= 1; if (m.life > 0) newMicro.push(m); }
    });
    microsystems = newMicro;
  }

  function detectEmergentMeso() {
    const CLUSTER_DIST = 32;
    const visited = new Set();
    const clusters = [];

    agents.forEach((a, i) => {
      if (visited.has(i)) return;
      const group = [i];
      const stack = [i];
      visited.add(i);
      while (stack.length) {
        const ci = stack.pop();
        agents.forEach((b, j) => {
          if (visited.has(j)) return;
          if (dist(agents[ci], b) < CLUSTER_DIST) { visited.add(j); group.push(j); stack.push(j); }
        });
      }
      if (group.length >= 4) {
        const cx = group.reduce((s, idx) => s + agents[idx].x, 0) / group.length;
        const cy = group.reduce((s, idx) => s + agents[idx].y, 0) / group.length;
        let inFixed = false;
        fixedMeso.forEach(m => { if (dist({ x: cx, y: cy }, m) < m.r * 0.9) inFixed = true; });
        if (!inFixed) clusters.push({ agents: group, x: cx, y: cy });
      }
    });

    const newEmergent = [];
    clusters.forEach(c => {
      let found = emergentMeso.find(m => dist(m, c) < 40 && m.life > 0);
      if (found) {
        found.x = found.x * 0.85 + c.x * 0.15;
        found.y = found.y * 0.85 + c.y * 0.15;
        found.agents = c.agents;
        found.life = Math.min(found.maxLife, found.life + 3);
        found.r = 28 + c.agents.length * 3;
        newEmergent.push(found);
      } else {
        newEmergent.push({
          x: c.x, y: c.y, r: 28 + c.agents.length * 3,
          agents: c.agents, life: 80, maxLife: 160,
          pulsePhase: Math.random() * Math.PI * 2,
          label: ['third space', 'study group', 'social gathering', 'informal network'][Math.floor(Math.random() * 4)],
        });
      }
    });
    emergentMeso.forEach(m => {
      if (!newEmergent.includes(m)) { m.life -= 1; if (m.life > 0) newEmergent.push(m); }
    });
    emergentMeso = newEmergent;
  }

  function updateRipples() {
    if (t > nextRippleTime) {
      const edge = Math.floor(Math.random() * 4);
      let rx, ry;
      if (edge === 0)      { rx = -30; ry = Math.random() * H; }
      else if (edge === 1) { rx = W + 30; ry = Math.random() * H; }
      else if (edge === 2) { rx = Math.random() * W; ry = -30; }
      else                 { rx = Math.random() * W; ry = H + 30; }
      ripples.push({ x: rx, y: ry, r: 0, maxR: Math.max(W, H) * 0.85, alpha: 0.28, speed: 1.4 });
      nextRippleTime = t + 3 + Math.random() * 5;
    }
    ripples.forEach(rip => { rip.r += rip.speed; rip.alpha = 0.28 * (1 - rip.r / rip.maxR); });
    ripples = ripples.filter(rip => rip.alpha > 0.01);
  }

  function updatePolicyWaves() {
    if (t > nextPolicyWaveTime) {
      const types = ['accelerate', 'decelerate', 'cluster'];
      const type = types[Math.floor(Math.random() * types.length)];
      const colors = {
        accelerate: 'rgba(163, 190, 140, ',
        decelerate: 'rgba(191, 97, 106, ',
        cluster:    'rgba(136, 192, 208, ',
      };
      policyWaves.push({
        y: -40,
        speed: 0.6 + Math.random() * 0.4,
        alpha: 0.08 + Math.random() * 0.06,
        maxAlpha: 0.08 + Math.random() * 0.06,
        height: 30 + Math.random() * 20,
        type: type,
        colorBase: colors[type],
      });
      nextPolicyWaveTime = t + 8 + Math.random() * 14;
    }
    policyWaves.forEach(pw => {
      pw.y += pw.speed;
      if (pw.y < 40) pw.alpha = pw.maxAlpha * (pw.y + 40) / 80;
      else if (pw.y > H - 40) pw.alpha = pw.maxAlpha * (H + 40 - pw.y) / 80;
      else pw.alpha = pw.maxAlpha;
    });
    policyWaves = policyWaves.filter(pw => pw.y < H + 60);
  }

  let frameCount = 0;

  function draw() {
    frameCount++;
    macroPhase += 0.0025;

    // --- MACROSYSTEM BACKGROUND ---
    const macroHue1 = 210 + Math.sin(macroPhase) * 25;
    const macroHue2 = 225 + Math.cos(macroPhase * 0.6) * 18;
    const macroSat = 14 + Math.sin(macroPhase * 0.4) * 6;
    const macroLight = 12 + Math.sin(macroPhase * 0.25) * 4;

    ctx.fillStyle = `hsl(${macroHue1}, ${macroSat}%, ${macroLight}%)`;
    ctx.fillRect(0, 0, W, H);

    const macroGrad = ctx.createLinearGradient(
      W * (0.2 + Math.sin(macroPhase * 0.3) * 0.3), 0,
      W * (0.8 + Math.cos(macroPhase * 0.25) * 0.2), H
    );
    macroGrad.addColorStop(0, `hsla(${macroHue2}, 18%, 16%, 0.35)`);
    macroGrad.addColorStop(0.5, `hsla(${macroHue1 + 30}, 12%, 14%, 0.2)`);
    macroGrad.addColorStop(1, `hsla(${macroHue2 - 15}, 15%, 15%, 0.3)`);
    ctx.fillStyle = macroGrad;
    ctx.fillRect(0, 0, W, H);

    const macroGrad2 = ctx.createRadialGradient(
      W * (0.5 + Math.sin(macroPhase * 0.2) * 0.3),
      H * (0.5 + Math.cos(macroPhase * 0.15) * 0.3),
      0,
      W * 0.5, H * 0.5, W * 0.6
    );
    macroGrad2.addColorStop(0, `hsla(${macroHue1 + 40}, 20%, 18%, 0.12)`);
    macroGrad2.addColorStop(1, 'transparent');
    ctx.fillStyle = macroGrad2;
    ctx.fillRect(0, 0, W, H);

    updateAgents();
    updateRipples();
    updatePolicyWaves();
    if (frameCount % 5 === 0) { detectMicrosystems(); detectEmergentMeso(); }

    // --- POLICY WAVES ---
    policyWaves.forEach(pw => {
      const grad = ctx.createLinearGradient(0, pw.y - pw.height / 2, 0, pw.y + pw.height / 2);
      grad.addColorStop(0, pw.colorBase + '0)');
      grad.addColorStop(0.3, pw.colorBase + pw.alpha + ')');
      grad.addColorStop(0.5, pw.colorBase + (pw.alpha * 1.2) + ')');
      grad.addColorStop(0.7, pw.colorBase + pw.alpha + ')');
      grad.addColorStop(1, pw.colorBase + '0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, pw.y - pw.height / 2, W, pw.height);
    });

    // --- EXOSYSTEM RIPPLES ---
    ripples.forEach(rip => {
      ctx.beginPath();
      ctx.arc(rip.x, rip.y, rip.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(94, 129, 172, ${rip.alpha})`;
      ctx.lineWidth = 1.8;
      ctx.stroke();
      if (rip.r > 12) {
        ctx.beginPath();
        ctx.arc(rip.x, rip.y, rip.r - 8, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(94, 129, 172, ${rip.alpha * 0.35})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    });

    // --- CORRIDORS ---
    corridors.forEach(c => {
      ctx.beginPath();
      ctx.moveTo(c.ax, c.ay);
      ctx.quadraticCurveTo(c.cx, c.cy, c.bx, c.by);
      ctx.strokeStyle = 'rgba(94, 129, 172, 0.06)';
      ctx.lineWidth = 12;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(94, 129, 172, 0.04)';
      ctx.lineWidth = 24;
      ctx.stroke();
    });

    // --- FIXED MESOSYSTEMS ---
    fixedMeso.forEach(m => {
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r + 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(163, 190, 140, 0.02)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(163, 190, 140, 0.07)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(163, 190, 140, 0.3)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.font = '600 14px JetBrains Mono, monospace';
      ctx.fillStyle = 'rgba(163, 190, 140, 0.5)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(m.label, m.x, m.y + m.r + 16);
    });

    // --- EMERGENT MESOSYSTEMS ---
    emergentMeso.forEach(em => {
      const alpha = Math.min(1, em.life / 40) * 0.18;
      const pulse = 1 + Math.sin(t * 2.5 + em.pulsePhase) * 0.08;
      const r = em.r * pulse;
      ctx.beginPath();
      ctx.arc(em.x, em.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(235, 203, 139, ${alpha * 0.6})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(em.x, em.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(235, 203, 139, ${alpha * 1.8})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      if (em.life > 30 && em.label) {
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillStyle = `rgba(235, 203, 139, ${alpha * 2})`;
        ctx.textAlign = 'center';
        ctx.fillText(em.label, em.x, em.y + r + 10);
      }
    });

    // --- MICROSYSTEMS ---
    microsystems.forEach(ms => {
      const alpha = Math.min(1, ms.life / 25) * 0.3;
      ctx.beginPath();
      ctx.arc(ms.x, ms.y, ms.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(136, 192, 208, ${alpha * 0.3})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ms.x, ms.y, ms.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(136, 192, 208, ${alpha * 0.8})`;
      ctx.lineWidth = 0.7;
      ctx.stroke();
      if (ms.agents && ms.agents.length >= 2) {
        ctx.lineWidth = 0.5;
        for (let i = 0; i < ms.agents.length; i++) {
          for (let j = i + 1; j < ms.agents.length; j++) {
            const ai = agents[ms.agents[i]], aj = agents[ms.agents[j]];
            if (ai && aj) {
              ctx.beginPath();
              ctx.moveTo(ai.x, ai.y);
              ctx.lineTo(aj.x, aj.y);
              ctx.strokeStyle = `rgba(136, 192, 208, ${alpha * 0.6})`;
              ctx.stroke();
            }
          }
        }
      }
    });

    // --- AGENTS ---
    agents.forEach(a => {
      let inMeso = false;
      fixedMeso.forEach(m => { if (dist(a, m) < m.r) inMeso = true; });

      if (a.state === 'traveling') {
        ctx.beginPath();
        ctx.arc(a.x, a.y, AGENT_R * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${Math.round(a.currentColor[0])},${Math.round(a.currentColor[1])},${Math.round(a.currentColor[2])},0.12)`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(a.x, a.y, AGENT_R, 0, Math.PI * 2);
      ctx.fillStyle = colorToRgb(a.currentColor);
      ctx.globalAlpha = inMeso ? 0.92 : (a.state === 'leaving' ? 0.4 : 0.72);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Proximity connections
    ctx.lineWidth = 0.4;
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const d = dist(agents[i], agents[j]);
        if (d < 18) {
          ctx.beginPath();
          ctx.moveTo(agents[i].x, agents[i].y);
          ctx.lineTo(agents[j].x, agents[j].y);
          ctx.strokeStyle = `rgba(136, 192, 208, ${0.1 * (1 - d / 18)})`;
          ctx.stroke();
        }
      }
    }

    // --- LEGEND ---
    const legendX = W - 220, legendY = H - 82;
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    const legendItems = [
      [FROST,   'microsystem (transient bond)'],
      [GREEN,   'mesosystem (institution)'],
      [YELLOW,  'emergent mesosystem (third space)'],
      ['rgba(94,129,172,0.8)', 'exosystem (ripple)'],
      [MAGENTA, 'macrosystem (policy wave)'],
    ];
    ctx.fillStyle = 'rgba(30, 36, 48, 0.65)';
    ctx.fillRect(legendX - 6, legendY - 6, 226, legendItems.length * 15 + 10);
    legendItems.forEach(([col, lbl], i) => {
      const ly = legendY + i * 15;
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(legendX, ly, 8, 8);
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(205, 212, 223, 0.55)';
      ctx.fillText(lbl, legendX + 14, ly + 7);
    });

    if (!prefersReducedMotion) {
      raf = requestAnimationFrame(draw);
    }
  }

  // Draw initial static frame
  ctx.fillStyle = 'rgb(30,36,48)';
  ctx.fillRect(0, 0, W, H);

  // Start animation
  if (!prefersReducedMotion) {
    draw();
  } else {
    draw();
  }

  // Expose stop function for cleanup
  window.stopBronfenbrenner = function() {
    running = false;
    cancelAnimationFrame(raf);
  };
};
