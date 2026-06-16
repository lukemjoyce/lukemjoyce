/* Teeny tiny twinkling stone-colored stars across the whole page —
   a transparent full-screen canvas layered above the UI (but click-through),
   so the field also spans over the menu when it's open. */
(() => {
  const canvas = document.getElementById("stars");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const STONE = "68, 64, 60"; // var(--stone) #44403c
  const DENSITY = 1 / 12000; // stars per CSS pixel of area (50% more than 1/9000)
  const MAX_OPACITY = 0.7;
  const SPIKE = 2.2; // prong length vs. star size (stars read smaller than dots)
  const WAIST = 0.22; // inner-radius ratio — smaller = pointier prongs

  let W = 0, H = 0, dpr = 1;
  let stars = [];

  function build() {
    const count = Math.round(W * H * DENSITY);
    stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random(), // fraction of width, so resize just remaps
        y: Math.random(),
        r: 0.5 + Math.random() * 2, // random ~0.5–1.6px (min same, max 50% smaller)
        base: 0.1 + Math.random() * 0.3, // dim baseline
        amp: 0.2 + Math.random() * 0.4, // twinkle depth
        speed: 0.6 + Math.random() * 1.8, // twinkle rate
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function frame(now) {
    const t = now * 0.001;
    ctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      let o = s.base + s.amp * Math.sin(t * s.speed + s.phase);
      if (o <= 0) continue;
      if (o > MAX_OPACITY) o = MAX_OPACITY;
      ctx.fillStyle = `rgba(${STONE}, ${o.toFixed(3)})`;
      sparkle(s.x * W, s.y * H, s.r * SPIKE);
      ctx.fill();
    }
    if (!reduce) requestAnimationFrame(frame);
  }

  // Classic 4-point twinkle: long thin prongs (up/right/down/left) with a
  // tight inner waist, drawn as an 8-vertex star.
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
