// Live multi-agent network drawn behind the page.
// Agents (violet), tools (cyan) and memory nodes drift and link up; amber messages hop between them.
// The cursor acts as the incoming query: nearby nodes lean toward it and light up. Click sends a burst.
// Perf: one canvas, DPR capped at 2, paused when the tab is hidden, static single frame under reduced motion.

const LINK = 150;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function initAgentField(canvas, { reduced = false } = {}) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { refreshColors() {} };

  let w = 0, h = 0, dpr = 1;
  let nodes = [];
  let pulses = [];
  let adj = [];
  let raf = 0, last = 0, spawnIn = 0.4;
  let col = readColors();
  const pointer = { x: -9999, y: -9999, active: false };

  function readColors() {
    const s = getComputedStyle(document.documentElement);
    const g = (n) => s.getPropertyValue(n).trim() || "255,255,255";
    return { agent: g("--c-agent"), tool: g("--c-tool"), pulse: g("--c-pulse"), edge: g("--c-edge") };
  }

  function targetCount() {
    const density = w < 700 ? 26000 : 19000;
    return clamp(Math.round((w * h) / density), 22, 68);
  }

  function makeNode() {
    const r = Math.random();
    const kind = r < 0.2 ? "agent" : r < 0.38 ? "mem" : "tool";
    const speed = 8 + Math.random() * 16;
    const a = Math.random() * Math.PI * 2;
    return {
      x: Math.random() * w, y: Math.random() * h,
      vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      kind, r: kind === "agent" ? 4.2 + Math.random() * 1.6 : kind === "mem" ? 3 : 2 + Math.random(),
      flash: 0, seed: Math.random() * 6.28,
    };
  }

  function resize() {
    const prevW = w;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const want = targetCount();
    if (nodes.length === 0 || Math.abs(want - nodes.length) > want * 0.25 || Math.abs(w - prevW) > 120) {
      nodes = Array.from({ length: want }, makeNode);
      pulses = [];
    } else {
      nodes.forEach((n) => { n.x = clamp(n.x, 0, w); n.y = clamp(n.y, 0, h); });
    }
    if (reduced) { for (let i = 0; i < 90; i++) step(1 / 30); draw(0); }
  }

  function buildAdjacency() {
    adj = nodes.map(() => []);
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
        if (dx * dx + dy * dy < LINK * LINK) { adj[i].push(j); adj[j].push(i); }
      }
    }
  }

  function send(fromIdx, depth = 2, avoid = -1) {
    if (pulses.length > 22) return;
    const options = adj[fromIdx]?.filter((j) => j !== avoid);
    if (!options || options.length === 0) return;
    const to = options[(Math.random() * options.length) | 0];
    pulses.push({ a: fromIdx, b: to, t: 0, dur: 0.8 + Math.random() * 0.7, depth });
    nodes[fromIdx].flash = Math.max(nodes[fromIdx].flash, 0.6);
  }

  function step(dt) {
    for (const n of nodes) {
      if (pointer.active) {
        const dx = pointer.x - n.x, dy = pointer.y - n.y, d = Math.hypot(dx, dy);
        if (d < 190 && d > 1) {
          const f = (1 - d / 190) * 22 * dt;
          n.vx += (dx / d) * f; n.vy += (dy / d) * f;
          n.flash = Math.max(n.flash, (1 - d / 190) * 0.55);
        }
      }
      const sp = Math.hypot(n.vx, n.vy);
      if (sp > 34) { n.vx *= 34 / sp; n.vy *= 34 / sp; }
      n.x += n.vx * dt; n.y += n.vy * dt;
      if (n.x < -20 || n.x > w + 20) n.vx *= -1;
      if (n.y < -20 || n.y > h + 20) n.vy *= -1;
      n.flash = Math.max(0, n.flash - dt * 1.6);
    }
    buildAdjacency();

    spawnIn -= dt;
    if (spawnIn <= 0) {
      spawnIn = 0.35 + Math.random() * 0.55;
      const agents = [];
      nodes.forEach((n, i) => { if (n.kind === "agent" && adj[i].length) agents.push(i); });
      if (agents.length) send(agents[(Math.random() * agents.length) | 0], 3);
    }

    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.t += dt / p.dur;
      if (p.t >= 1) {
        nodes[p.b].flash = 1;
        if (p.depth > 0 && Math.random() < 0.7) send(p.b, p.depth - 1, p.a);
        pulses.splice(i, 1);
      }
    }
  }

  function draw(time) {
    ctx.clearRect(0, 0, w, h);

    // links
    ctx.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (const j of adj[i]) {
        if (j < i) continue;
        const b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const alpha = (1 - d / LINK) * 0.3;
        ctx.strokeStyle = `rgba(${col.edge},${alpha})`;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }

    // cursor "query" links
    if (pointer.active) {
      const near = nodes
        .map((n) => ({ n, d: Math.hypot(n.x - pointer.x, n.y - pointer.y) }))
        .filter((o) => o.d < 220).sort((p, q) => p.d - q.d).slice(0, 4);
      for (const { n, d } of near) {
        ctx.strokeStyle = `rgba(${col.pulse},${(1 - d / 220) * 0.55})`;
        ctx.beginPath(); ctx.moveTo(pointer.x, pointer.y); ctx.lineTo(n.x, n.y); ctx.stroke();
      }
      ctx.strokeStyle = `rgba(${col.pulse},0.55)`;
      ctx.beginPath(); ctx.arc(pointer.x, pointer.y, 5 + Math.sin(time / 380) * 1.2, 0, 6.283); ctx.stroke();
    }

    // nodes
    for (const n of nodes) {
      const breathe = 1 + Math.sin(time / 900 + n.seed) * 0.12;
      if (n.kind === "agent") {
        const gr = n.r * (4.2 + n.flash * 3);
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, gr);
        g.addColorStop(0, `rgba(${col.agent},${0.5 + n.flash * 0.4})`);
        g.addColorStop(1, `rgba(${col.agent},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(n.x, n.y, gr, 0, 6.283); ctx.fill();
        ctx.fillStyle = `rgba(${col.agent},1)`;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r * breathe, 0, 6.283); ctx.fill();
      } else if (n.kind === "mem") {
        ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(0.785);
        ctx.strokeStyle = `rgba(${col.tool},${0.55 + n.flash * 0.45})`;
        ctx.lineWidth = 1.2;
        const s = n.r * 1.5 * (1 + n.flash * 0.5);
        ctx.strokeRect(-s, -s, s * 2, s * 2);
        ctx.restore();
      } else {
        ctx.fillStyle = `rgba(${col.tool},${0.55 + n.flash * 0.45})`;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r * (1 + n.flash * 0.8), 0, 6.283); ctx.fill();
      }
      if (n.flash > 0.05) {
        ctx.strokeStyle = `rgba(${col.pulse},${n.flash * 0.6})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r + (1 - n.flash) * 20, 0, 6.283); ctx.stroke();
      }
    }

    // messages
    for (const p of pulses) {
      const a = nodes[p.a], b = nodes[p.b];
      if (!a || !b) continue;
      const e = easeInOut(p.t);
      const x = a.x + (b.x - a.x) * e, y = a.y + (b.y - a.y) * e;
      const tail = easeInOut(Math.max(0, p.t - 0.16));
      const tx = a.x + (b.x - a.x) * tail, ty = a.y + (b.y - a.y) * tail;
      const trail = ctx.createLinearGradient(tx, ty, x, y);
      trail.addColorStop(0, `rgba(${col.pulse},0)`);
      trail.addColorStop(1, `rgba(${col.pulse},0.9)`);
      ctx.strokeStyle = trail; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = `rgba(${col.pulse},1)`;
      ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 6.283); ctx.fill();
    }
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    step(dt);
    draw(now);
    raf = requestAnimationFrame(frame);
  }
  const start = () => { if (!raf && !reduced) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };

  // Query input
  window.addEventListener("pointermove", (e) => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = e.pointerType !== "touch" || e.buttons > 0;
  }, { passive: true });
  document.addEventListener("pointerleave", () => { pointer.active = false; });
  window.addEventListener("pointerdown", (e) => {
    if (reduced || e.target.closest("a, button, input")) return;
    const near = nodes
      .map((n, i) => ({ i, d: Math.hypot(n.x - e.clientX, n.y - e.clientY) }))
      .filter((o) => o.d < 260).sort((p, q) => p.d - q.d).slice(0, 3);
    near.forEach(({ i }) => { nodes[i].flash = 1; send(i, 2); });
  }, { passive: true });

  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  let resizeT = 0;
  window.addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(resize, 120); });

  resize();
  start();

  return {
    refreshColors() { col = readColors(); if (reduced) draw(0); },
  };
}
