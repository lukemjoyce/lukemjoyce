/* "Immersive & deep" starfield — a real 3D field, perspective-projected, with
   the camera panning sideways. Each star has a true depth z; near ones are
   large, dark and sweep across fast, far ones are tiny faint specks that barely
   move — genuine parallax, so it reads as infinite depth rather than a flat
   sheet. Stars that slide off the right are recycled to the left at a fresh
   random depth, so the drift never ends. Grey marks on white; a transparent
   full-screen canvas above the UI, click-through. */
(() => {
  const canvas = document.getElementById("stars");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const STONE = "68, 64, 60"; // var(--stone) #44403c
  const DENSITY = 1 / 5000;   // stars per CSS pixel of area
  const MAX_OPACITY = 0.65;   // most opaque (darkest) a near star reaches
  const SPIKE = 2.6;          // prong length vs. size, for near-star glints
  const WAIST = 0.14;         // inner-radius ratio — smaller = pointier prongs

  const FOCAL = 0.62;  // lens: bigger = more zoom / stronger parallax
  const NEAR = 0.15;   // nearest depth (fast, big)
  const FAR = 3.2;     // farthest depth (slow, tiny, faint)
  const SPEED = 0.05;  // world units/sec the camera pans (drift rate)
  const BASE = 0.5;    // base size; on-screen radius ≈ BASE / z
  const MARGIN = 30;   // off-screen recycle slack in px

  let W = 0, H = 0, dpr = 1;
  let cx = 0, cy = 0, PS = 1; // projection: screen = center + world/z * PS
  let stars = [];
  let lastT = 0;

  const randZ = () => NEAR + (FAR - NEAR) * Math.sqrt(Math.random()); // skew far

  // Place a star at a target screen point + depth, backing out world x,y.
  function set(s, sx, sy, z) {
    s.z = z;
    s.x = ((sx - cx) * z) / PS;
    s.y = ((sy - cy) * z) / PS;
  }

  function build() {
    const count = Math.round(W * H * DENSITY);
    stars = [];
    for (let i = 0; i < count; i++) {
      const s = {
        speed: 0.5 + Math.random() * 1.4, // twinkle rate
        phase: Math.random() * Math.PI * 2,
        tw: Math.random() < 0.3 ? 0.12 : 0, // sparse gentle twinkle
      };
      set(s, Math.random() * W, Math.random() * H, randZ());
      stars.push(s);
    }
  }

  // Re-enter from just off the left edge, fresh depth + row.
  function recycle(s) {
    set(s, -MARGIN, Math.random() * H, randZ());
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = W / 2;
    cy = H / 2;
    PS = Math.max(W, H) * FOCAL;
    build();
  }

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function frame(now) {
    const tSec = now * 0.001;
    let dt = tSec - lastT;
    lastT = tSec;
    if (dt > 0.1) dt = 0.1; // clamp big gaps (e.g. tab was backgrounded)

    ctx.clearRect(0, 0, W, H);

    for (const s of stars) {
      if (!reduce) s.x += SPEED * dt; // camera pan → world slides right

      const p = PS / s.z;            // perspective scale: near = big
      const sx = cx + s.x * p;
      const sy = cy + s.y * p;

      if (sx > W + MARGIN) { recycle(s); continue; }

      const near01 = (FAR - s.z) / (FAR - NEAR); // 1 near .. 0 far
      let a = 0.06 + near01 * 0.5;               // far fades into white
      if (s.tw) a += s.tw * Math.sin(tSec * s.speed + s.phase);
      if (a <= 0.004) continue;
      if (a > MAX_OPACITY) a = MAX_OPACITY;

      let r = BASE / s.z;
      if (r > 4) r = 4;

      ctx.fillStyle = `rgba(${STONE}, ${a.toFixed(3)})`;
      if (s.z < 0.7) {
        // near → a 4-point glint
        sparkle(sx, sy, r * SPIKE);
        ctx.fill();
      } else {
        // far → a tiny point
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(0.4, r), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (!reduce) requestAnimationFrame(frame);
  }

  // Classic 4-point twinkle: long thin prongs around a tight inner waist.
  function sparkle(x, y, outer) {
    const inner = outer * WAIST;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const ang = (Math.PI / 4) * i - Math.PI / 2; // start at the top point
      const rad = i % 2 === 0 ? outer : inner;
      const px = x + Math.cos(ang) * rad;
      const py = y + Math.sin(ang) * rad;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(frame);
})();
