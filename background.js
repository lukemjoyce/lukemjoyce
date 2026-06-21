/* Cycling photo background.
   A set of landscape photos sits behind the whole site and crosses-fades to the
   next one every few minutes. Each photo carries an "ink" colour chosen for its
   brightness — dark photos get near-white text/icons, bright photos keep the
   usual stone — and that ink crossfades in lockstep with the image so the type,
   social icons and every canvas (globe, gears, stars, coastline) recolour
   together. See theme.js for how the ink drives the rest of the page.

   Performance: only two layers are ever composited (a simple opacity crossfade,
   GPU-friendly), images are pre-shrunk to ≤1920px, and the next one is decoded
   ahead of time so a switch never blocks the main thread. */
(() => {
  const STONE = [68, 64, 60];      // #44403c — over bright photos
  const SNOW  = [245, 245, 244];   // #f5f5f4 — near-white, over dark photos

  // Ink per photo is picked from its measured brightness (see the build notes):
  // luminance ≥ ~95 keeps stone, anything darker switches to near-white.
  const SLIDES = [
    { src: "backgrounds/dino-reichmuth-kk3W5-0b6e0-unsplash.jpg",   ink: SNOW  },
    { src: "backgrounds/kalen-emsley-Bkci_8qcdvQ-unsplash.jpg",     ink: SNOW },
    { src: "backgrounds/casey-horner-O0R5XZfKUGQ-unsplash.jpg",     ink: SNOW  },
    { src: "backgrounds/andrew-ridley-Kt5hRENuotI-unsplash.jpg",    ink: SNOW },
    { src: "backgrounds/bryan-goff-f7YQo-eYHdM-unsplash.jpg",       ink: SNOW  },
    { src: "backgrounds/matteo-catanese-PI8Hk-3ZcCU-unsplash.jpg",  ink: SNOW },
    { src: "backgrounds/emma-francis-vpHCfunwDrQ-unsplash.jpg",     ink: SNOW  },
    { src: "backgrounds/dan-otis-OYFHT4X5isg-unsplash.jpg",         ink: SNOW  },
  ];

  const INTERVAL = 5 * 60 * 1000; // switch every 5 minutes
  const FADE = 1800;              // crossfade / recolour duration (ms)

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  // A scrim sits over the photo to steady the contrast: darken under near-white
  // text, lift (lighten) under stone text. Tuned to stay subtle.
  const scrimFor = (ink) =>
    lum(ink) > 128 ? "rgba(0,0,0,0.34)" : "rgba(255,255,255,0.30)";

  // ── Layers ────────────────────────────────────────
  const root = document.createElement("div");
  root.className = "bg";
  root.setAttribute("aria-hidden", "true");
  const layers = [document.createElement("div"), document.createElement("div")];
  layers.forEach((l) => { l.className = "bg-layer"; root.appendChild(l); });
  const scrim = document.createElement("div");
  scrim.className = "bg-scrim";
  root.appendChild(scrim);
  document.body.appendChild(root);

  // ── Colour tween ──────────────────────────────────
  // Drives THEME.apply across the fade so CSS vars and every canvas recolour
  // together. theme.js reads window.THEME each frame, so this is all it takes.
  let tween = null;
  const lerp = (a, b, t) => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
  function recolour(toInk, fromInk) {
    if (!window.THEME) return;
    if (reduce || !fromInk) { window.THEME.apply(toInk.slice()); return; }
    if (tween) cancelAnimationFrame(tween);
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / FADE);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // easeInOutQuad
      window.THEME.apply(lerp(fromInk, toInk, e));
      if (k < 1) tween = requestAnimationFrame(step);
    };
    tween = requestAnimationFrame(step);
  }

  // ── Preload helper ────────────────────────────────
  const preload = (src) => {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    return img;
  };

  // ── Cycle ─────────────────────────────────────────
  let front = 0;          // which layer is currently visible
  // Fresh start each visit; ?bg=N pins a slide (handy for previewing).
  const pin = parseInt(new URLSearchParams(location.search).get("bg"), 10);
  let idx = Number.isInteger(pin)
    ? ((pin % SLIDES.length) + SLIDES.length) % SLIDES.length
    : Math.floor(Math.random() * SLIDES.length);
  let curInk = SLIDES[idx].ink;

  // Paint the first slide instantly (no fade) and lock in its ink before paint.
  layers[front].style.backgroundImage = `url("${SLIDES[idx].src}")`;
  layers[front].style.opacity = "1";
  scrim.style.backgroundColor = scrimFor(curInk);
  recolour(curInk); // instant
  preload(SLIDES[(idx + 1) % SLIDES.length].src);

  function next() {
    const nextIdx = (idx + 1) % SLIDES.length;
    const slide = SLIDES[nextIdx];
    const img = preload(slide.src);

    const swap = () => {
      const back = 1 - front;
      layers[back].style.backgroundImage = `url("${slide.src}")`;
      // force the back layer to take its new image before we fade it up
      void layers[back].offsetWidth;
      layers[back].style.opacity = "1";
      layers[front].style.opacity = "0";
      scrim.style.backgroundColor = scrimFor(slide.ink);
      recolour(slide.ink, curInk);
      front = back;
      idx = nextIdx;
      curInk = slide.ink;
      preload(SLIDES[(idx + 1) % SLIDES.length].src); // ready the one after
    };

    // wait for decode so the switch never hitches, but don't hang forever
    if (img.decode) img.decode().then(swap).catch(swap);
    else if (img.complete) swap();
    else img.onload = swap, (img.onerror = swap);
  }

  setInterval(next, INTERVAL);
})();
