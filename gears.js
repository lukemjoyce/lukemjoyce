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

  const IRON = "120, 92, 72"; // warm oxidized-iron stroke
  const PIT = "74, 54, 42";   // darker rust speckle

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
      k.pits = makePits(k);
    }
    gears = g;
  }

  // Static rust speckles in gear-local coords, so they rotate with the gear.
  function makePits(k) {
    const n = Math.min(34, Math.round(k.pr * 0.7));
    const pits = [];
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = (0.16 + Math.random() * 0.78) * k.pr;
      pits.push({
        x: Math.cos(ang) * rad,
        y: Math.sin(ang) * rad,
        r: 0.3 + Math.random() * 1.1,
        o: 0.05 + Math.random() * 0.16,
      });
    }
    return pits;
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
    // fraction of each tooth-pitch: rise, tip, fall, gap, gap-mid
    const stops = [
      [0.0, Rr], [0.2, Rt], [0.4, Rt], [0.6, Rr], [0.8, Rr],
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
    ctx.save();
    ctx.translate(k.px, k.py);
    ctx.rotate(k.phase + k.speed * T);

    // body: faint fill + crisp outline
    gearPath(k.pr, k.mod, k.teeth);
    ctx.fillStyle = `rgba(${IRON}, 0.05)`;
    ctx.fill();
    ctx.lineWidth = Math.max(1, k.mod * 0.45);
    ctx.lineJoin = "round";
    ctx.strokeStyle = `rgba(${IRON}, 0.7)`;
    ctx.stroke();

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

    // rust pits
    for (const p of k.pits) {
      ctx.fillStyle = `rgba(${PIT}, ${p.o.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function frame(now) {
    const T = now * 0.001;
    ctx.clearRect(0, 0, W, H);
    for (const k of gears) drawGear(k, T);
    if (!reduce) requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(frame);
})();
