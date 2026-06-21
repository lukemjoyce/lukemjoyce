/* A little train of meshing gears under the Experience heading. Stroked, not
   filled — minimalist like the rest of the site — but tinted in oxidized iron
   with faint rust "pits" for a gritty, rusted feel. The gears genuinely mesh:
   tooth counts set the size, pitch circles are tangent, neighbours turn in
   opposite directions at the inverse tooth ratio, and each one's phase is
   locked so its teeth drop into the next one's gaps. */
(() => {
  const canvas = document.getElementById("gears");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Each gear: tooth count (its size) + the angle, in degrees, at which it sits
  // off the previous gear. Mixed sizes, gently zig-zagging across the band.
  const SPEC = [
    { teeth: 20, angle: 0 },   // first gear — angle unused
    { teeth: 13, angle: -24 },
    { teeth: 28, angle: 24 },
    { teeth: 11, angle: -30 },
    { teeth: 17, angle: 20 },
    { teeth: 9, angle: -26 },
    { teeth: 23, angle: 22 },
  ];
  const MODULE = 3;     // tooth size: pitch radius = MODULE * teeth / 2
  const SPEED = 0.22;   // rad/s of the first gear (the rest derive from meshing)
  const PAD = 10;       // breathing room inside the canvas

  const DEF_STONE = "68, 64, 60"; // fallback gear body fill (theme overrides)
  const LINE = "255, 255, 255";   // white internal lines
  const SPECK = "255, 255, 255";  // white flecks
  const DEF_DARK = "26, 23, 21";  // fallback corrosion / pits (theme overrides)
  const rgbStr = (c) => `${c[0] | 0}, ${c[1] | 0}, ${c[2] | 0}`;

  let W = 0, H = 0, dpr = 1;
  let gears = [];

  function buildGears() {
    const g = SPEC.map((s) => ({ teeth: s.teeth, R: (MODULE * s.teeth) / 2 }));

    // 1) walk the chain: each gear's pitch circle is tangent to the previous.
    g[0].x = 0;
    g[0].y = 0;
    for (let i = 1; i < g.length; i++) {
      const a = (SPEC[i].angle * Math.PI) / 180;
      const d = g[i - 1].R + g[i].R;
      g[i].x = g[i - 1].x + d * Math.cos(a);
      g[i].y = g[i - 1].y + d * Math.sin(a);
    }

    // 2) rotation speed (inverse ratio, opposite direction) + locked mesh phase.
    g[0].speed = SPEED;
    g[0].phase = 0;
    for (let i = 1; i < g.length; i++) {
      const A = g[i - 1], B = g[i];
      const alpha = Math.atan2(B.y - A.y, B.x - A.x); // direction A→B
      B.speed = (-A.speed * A.teeth) / B.teeth;
      // mesh condition N_A(α−θ_A) = π − N_B(α+π−θ_B), solved for θ_B (B.phase)
      B.phase =
        alpha + Math.PI - (Math.PI - A.teeth * (alpha - A.phase)) / B.teeth;
    }

    // 3) scale + centre the whole cluster to fit the canvas.
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const k of g) {
      const tip = k.R + MODULE;
      minX = Math.min(minX, k.x - tip);
      maxX = Math.max(maxX, k.x + tip);
      minY = Math.min(minY, k.y - tip);
      maxY = Math.max(maxY, k.y + tip);
    }
    const cw = maxX - minX, ch = maxY - minY;
    const f = Math.min((W - 2 * PAD) / cw, (H - 2 * PAD) / ch, 1.5);
    const ox = (W - cw * f) / 2 - minX * f;
    const oy = (H - ch * f) / 2 - minY * f;

    for (const k of g) {
      k.px = k.x * f + ox;
      k.py = k.y * f + oy;
      k.pr = k.R * f;     // scaled pitch radius
      k.mod = MODULE * f; // scaled tooth size
      k.grunge = makeGrunge(k);
    }
    gears = g;
  }

  // Static grunge in gear-local coords (so it rotates with the metal): soft
  // dark corrosion patches, two-tone speckles (dark pits + light flecks), and
  // a few fine scratches.
  function makeGrunge(k) {
    const R = k.pr;
    const spot = () => {
      const ang = Math.random() * Math.PI * 2;
      const rad = Math.random() * R;
      return [Math.cos(ang) * rad, Math.sin(ang) * rad];
    };

    const grime = [];
    const gn = 4 + Math.round(Math.random() * 3);
    for (let i = 0; i < gn; i++) {
      const [x, y] = spot();
      grime.push({ x, y, r: (0.18 + Math.random() * 0.42) * R, o: 0.05 + Math.random() * 0.13 });
    }

    const specks = [];
    const sn = Math.min(80, Math.round(R * 1.4));
    for (let i = 0; i < sn; i++) {
      const [x, y] = spot();
      specks.push({
        x, y,
        r: 0.25 + Math.random() * 1.2,
        o: 0.06 + Math.random() * 0.24,
        dark: Math.random() < 0.6, // mostly pits, some bright flecks
      });
    }

    const scratches = [];
    const cn = 3 + Math.round(Math.random() * 4);
    for (let i = 0; i < cn; i++) {
      const [x, y] = spot();
      const dir = Math.random() * Math.PI * 2;
      const len = (0.12 + Math.random() * 0.32) * R;
      scratches.push({
        x, y,
        dx: Math.cos(dir) * len,
        dy: Math.sin(dir) * len,
        o: 0.06 + Math.random() * 0.16,
        light: Math.random() < 0.4,
      });
    }

    return { grime, specks, scratches };
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    W = r.width;
    H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildGears();
  }

  // Trace one gear's toothed outline, centred on the origin.
  function gearPath(R, mod, teeth) {
    const Rt = R + mod;        // tip (addendum)
    const Rr = R - mod * 1.1;  // root (dedendum, a touch deeper)
    const step = (Math.PI * 2) / teeth;
    // Squared teeth with a gentle taper — wider at the root than the tip, like
    // a real cog. The flat top is centred on each tooth-pitch angle (a0), where
    // the meshing-phase math expects the tip, so neighbours line up. The tip
    // edges sit at ±0.20 of the pitch and the root edges flare out to ±0.28, so
    // the flanks lean outward toward the root (with a little gap clearance).
    const stops = [
      [0.0, Rt], [0.24, Rt], [0.4, Rr], [0.72, Rr], [0.80, Rt],
    ];
    ctx.beginPath();
    for (let k = 0; k < teeth; k++) {
      const a0 = k * step;
      for (const [frac, rad] of stops) {
        const a = a0 + frac * step;
        const x = Math.cos(a) * rad;
        const y = Math.sin(a) * rad;
        k === 0 && frac === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
  }

  function drawGear(k, T) {
    // body + corrosion colours follow the page theme (lines/flecks stay white)
    const th = window.THEME;
    const STONE = th ? rgbStr(th.ink) : DEF_STONE;
    const DARK = th ? rgbStr(th.dark) : DEF_DARK;

    ctx.save();
    ctx.translate(k.px, k.py);
    ctx.rotate(k.phase + k.speed * T);

    // body: solid stone fill, no outline (the fill is the silhouette)
    gearPath(k.pr, k.mod, k.teeth);
    ctx.fillStyle = `rgba(${STONE}, 0.92)`;
    ctx.fill();

    // grunge, clipped to the body so it bites into the tooth edges too
    gearPath(k.pr, k.mod, k.teeth);
    ctx.save();
    ctx.clip();
    const G = k.grunge;

    // soft corrosion patches (mottling)
    for (const p of G.grime) {
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      grad.addColorStop(0, `rgba(${DARK}, ${p.o.toFixed(3)})`);
      grad.addColorStop(1, `rgba(${DARK}, 0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
    }

    // scratches
    ctx.lineWidth = 0.6;
    for (const s of G.scratches) {
      ctx.strokeStyle = `rgba(${s.light ? SPECK : DARK}, ${s.o.toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + s.dx, s.y + s.dy);
      ctx.stroke();
    }

    // two-tone speckles
    for (const p of G.specks) {
      ctx.fillStyle = `rgba(${p.dark ? DARK : SPECK}, ${p.o.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // internal detail lines, in a lighter stone (crisp, over the grunge)
    ctx.lineWidth = Math.max(1, k.mod * 0.45);
    ctx.lineJoin = "round";
    ctx.strokeStyle = `rgba(${LINE}, 0.85)`;

    // hub + centre hole
    ctx.beginPath();
    ctx.arc(0, 0, k.pr * 0.34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, k.pr * 0.13, 0, Math.PI * 2);
    ctx.stroke();

    // spokes on the larger gears
    if (k.teeth >= 16) {
      const spokes = 5;
      ctx.beginPath();
      for (let s = 0; s < spokes; s++) {
        const a = (s / spokes) * Math.PI * 2;
        ctx.moveTo(Math.cos(a) * k.pr * 0.34, Math.sin(a) * k.pr * 0.34);
        ctx.lineTo(Math.cos(a) * k.pr * 0.78, Math.sin(a) * k.pr * 0.78);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function frame(now) {
    const T = now * 0.001;
    ctx.clearRect(0, 0, W, H);
    for (const k of gears) drawGear(k, T);
    if (running) rafId = requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener("resize", resize);

  // Only spin while the gears are on screen — when the Experience panel is slid
  // out of view (or scrolled past), pause the loop so it isn't burning frames.
  let running = false, rafId = null;
  function start() {
    if (running || reduce) return;
    running = true;
    rafId = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
  }
  frame(performance.now()); // one frame now, so it's never blank before the observer fires
  new IntersectionObserver(
    (entries) => { entries[0].isIntersecting ? start() : stop(); },
    { threshold: 0.01 }
  ).observe(canvas);
})();
