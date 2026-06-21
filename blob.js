/* A morphing 3D wireframe blob, stroked in stone — no fills, no shadows.
   Depth is conveyed purely by line opacity, so it reads as 3D while
   staying the same color as the page type. */
(() => {
  const backCanvas = document.getElementById("blob-back");
  const frontCanvas = document.getElementById("blob-front");
  if (!backCanvas || !frontCanvas) return;
  const backCtx = backCanvas.getContext("2d");
  const frontCtx = frontCanvas.getContext("2d");

  // The title is HTML text sitting between the two canvases. To make the
  // near-side strands turn white exactly where they cross a letter, we redraw
  // the title into an offscreen glyph mask, and redraw the front strands into
  // an opaque-white buffer; intersecting the two leaves white only on
  // line ∩ letter, which we then lay back over the stone front lines.
  const title = document.querySelector(".hero-title");
  const maskCanvas = document.createElement("canvas"); // white glyphs
  const maskCtx = maskCanvas.getContext("2d");
  const whiteBuf = document.createElement("canvas");   // opaque-white front strands
  const whiteCtx = whiteBuf.getContext("2d");

  // Gradient ends come from the page theme (top darker, bottom lighter); fall
  // back to stone if the theme module isn't present.
  const DEF_TOP = [41, 37, 36];      // #292524
  const DEF_BOTTOM = [168, 162, 158]; // #a8a29e

  // Blend top↔bottom by vertical position. s: 0 at the bottom, 1 at the top.
  function colorAt(s) {
    const th = window.THEME;
    const top = th ? th.blobTop : DEF_TOP;
    const bot = th ? th.blobBottom : DEF_BOTTOM;
    return [
      Math.round(bot[0] + (top[0] - bot[0]) * s),
      Math.round(bot[1] + (top[1] - bot[1]) * s),
      Math.round(bot[2] + (top[2] - bot[2]) * s),
    ];
  }
  const RINGS = 18; // latitude divisions
  const SEGS = 36; // longitude divisions
  const AMP = 0; // how far the surface morphs
  const TILT = -0.38; // fixed pitch so we see it from slightly above
  const OBLIQUITY = (23.44 * Math.PI) / 180; // Earth's real axial tilt, drawn as an in-plane lean

  // Unit direction for every vertex on the sphere, precomputed once.
  const dirs = [];
  for (let i = 0; i <= RINGS; i++) {
    const theta = (i / RINGS) * Math.PI; // 0 .. PI
    const st = Math.sin(theta);
    const ct = Math.cos(theta);
    const row = [];
    for (let j = 0; j <= SEGS; j++) {
      const phi = (j / SEGS) * Math.PI * 2;
      row.push([st * Math.cos(phi), ct, st * Math.sin(phi)]);
    }
    dirs.push(row);
  }

  // World coastlines (Natural Earth 110m, from coastline.js) turned into unit
  // direction vectors with the north pole up — so they ride the same morphing
  // surface and rotation as the wireframe, drawing an Earth onto the shell.
  function latlngToVec(lng, lat) {
    const la = (lat * Math.PI) / 180, lo = (lng * Math.PI) / 180;
    const cl = Math.cos(la);
    // negate the vertical so the north pole points up on screen (canvas y is
    // flipped); longitude/screen-x is unaffected, so no east-west mirroring
    return [cl * Math.cos(lo), -Math.sin(la), cl * Math.sin(lo)];
  }
  const coast = (window.COASTLINE || []).map((line) =>
    line.map(([lng, lat]) => latlngToVec(lng, lat))
  );
  const DEF_COAST = [55, 51, 47]; // fallback when the theme module isn't present

  // Smooth, organic radial displacement — layered sines acting like noise.
  function morph(x, y, z, t) {
    return (
      0.50 * Math.sin(1.2 * x + t * 0.70) +
      0.40 * Math.sin(1.7 * y - t * 0.90 + 1.3) +
      0.35 * Math.sin(2.3 * z + t * 0.55 + 2.1) +
      0.28 * Math.sin(2.9 * (x + y) - t * 0.62) +
      0.22 * Math.sin(3.7 * (y + z) + t * 0.80 + 0.6)
    );
  }

  let W = 0, H = 0, dpr = 1;
  // Globe centre in canvas coords, computed by buildTextMask once the name is
  // measured so we can sit the globe a single space to its left. Null until then.
  let blobCX = null, blobCY = null;

  // ── One place to move / size the whole [globe + name] unit ──
  const SCALE    = 0.875;   // overall size of the globe + name together
  const OFFSET_X = 0;   // move the pair right (+) / left (−), in px
  const OFFSET_Y = -16;   // move the pair down (+) / up (−), in px

  // Redraw the title into the mask in opaque white, positioned exactly over
  // where the on-screen <h1> sits relative to the blob canvas.
  function buildTextMask() {
    if (!title) return;
    maskCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    maskCtx.clearRect(0, 0, W, H);

    // Size the name first: clear our own override so we read the responsive
    // clamp size, then scale that — SCALE grows the name while staying responsive.
    title.style.fontSize = "";
    const baseFont = parseFloat(getComputedStyle(title).fontSize);
    title.style.fontSize = `${baseFont * SCALE}px`;

    const cs = getComputedStyle(title);
    maskCtx.fillStyle = "#fff";
    maskCtx.textAlign = "center";
    maskCtx.textBaseline = "alphabetic";
    maskCtx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    try { maskCtx.letterSpacing = cs.letterSpacing; } catch (e) {}

    // Lay the globe and name out as a centred pair — [globe][space][name] —
    // where the gap is one real space character in the title's own font (the
    // whitespace you'd type between two words). The maths is done in the canvas's
    // own coordinates so the disc can never be clipped by the canvas edge: the
    // globe is always placed entirely inside [0, W]. SCALE/OFFSET_X/OFFSET_Y move
    // and size the whole pair from this one place.
    const R = Math.min(W, H) * 0.202 * SCALE; // 2/3 of the original radius × SCALE
    const diam = 2 * R * 1.05; // include the slight perspective bulge of the disc
    const space = 36 * SCALE; // px gap between the globe and the name
    title.style.transform = "none";
    const t0 = title.getBoundingClientRect(); // name centred, before the nudge
    const cr = frontCanvas.getBoundingClientRect();
    const pairW = diam + space + t0.width;
    const pairLeft = Math.max(4, (W - pairW) / 2) + OFFSET_X; // canvas-x of the globe's left edge
    blobCX = pairLeft + diam / 2;
    blobCY = t0.top - cr.top + t0.height / 2 + OFFSET_Y;
    // Slide the name so its left edge sits one space to the right of the globe,
    // and drop it by OFFSET_Y so it moves with the globe.
    const shift = cr.left + pairLeft + diam + space - t0.left;
    title.style.transform = `translate(${shift.toFixed(1)}px, ${OFFSET_Y}px)`;

    const tr = title.getBoundingClientRect();

    const text = title.textContent;
    const x = tr.left + tr.width / 2 - cr.left;
    // Put the baseline where the browser puts the <h1>'s: line-box top +
    // half-leading + font ascent. Using the real ascent/descent (not a
    // "middle" guess) keeps the mask glyphs locked onto the HTML glyphs.
    const m = maskCtx.measureText(text);
    const asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent;
    let baseline;
    if (Number.isFinite(asc) && Number.isFinite(desc)) {
      baseline = tr.top - cr.top + (tr.height - (asc + desc)) / 2 + asc;
    } else {
      maskCtx.textBaseline = "middle"; // older browsers w/o font metrics
      baseline = tr.top - cr.top + tr.height / 2;
    }
    maskCtx.fillText(text, x, baseline);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = backCanvas.getBoundingClientRect();
    W = r.width;
    H = r.height;
    for (const c of [backCanvas, frontCanvas, maskCanvas, whiteBuf]) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
      c.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    whiteCtx.strokeStyle = "#fff"; // opaque white strands for the knockout
    whiteCtx.lineWidth = 1;
    buildTextMask();
  }
  resize();
  window.addEventListener("resize", resize);
  // Web font load changes glyph metrics — rebuild the mask once it's ready.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildTextMask);

  // Re-stroke a near-side segment into the opaque-white buffer.
  function whiteSeg(ax, ay, bx, by) {
    whiteCtx.beginPath();
    whiteCtx.moveTo(ax, ay);
    whiteCtx.lineTo(bx, by);
    whiteCtx.stroke();
  }

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function frame(now) {
    const t = now * 0.0009;
    backCtx.clearRect(0, 0, W, H);
    frontCtx.clearRect(0, 0, W, H);
    whiteCtx.clearRect(0, 0, W, H);

    const R = Math.min(W, H) * 0.202 * SCALE; // world radius in px — 2/3 of original × SCALE
    // Globe centre comes from the pair layout in buildTextMask; fall back to the
    // canvas centre until the title has been measured.
    const cx = blobCX != null ? blobCX : W / 2;
    const cy = blobCY != null ? blobCY : H / 2;
    const camDist = R * 3.2;
    const focal = R * 3.2;

    const yaw = t * 0.25;
    const cy_ = Math.cos(yaw), sy_ = Math.sin(yaw);
    const cx_ = Math.cos(TILT), sx_ = Math.sin(TILT);
    const cob = Math.cos(OBLIQUITY), sob = Math.sin(OBLIQUITY); // in-plane axial lean

    // Project every vertex for this frame.
    const px = [], py = [], pz = [];
    for (let i = 0; i <= RINGS; i++) {
      px[i] = []; py[i] = []; pz[i] = [];
      for (let j = 0; j <= SEGS; j++) {
        const d = dirs[i][j];
        const rad = R * (1 + AMP * morph(d[0], d[1], d[2], t));
        let x = d[0] * rad, y = d[1] * rad, z = d[2] * rad;

        // rotate around Y (yaw)
        let x1 = x * cy_ + z * sy_;
        let z1 = -x * sy_ + z * cy_;
        // rotate around X (tilt)
        let y1 = y * cx_ - z1 * sx_;
        let z2 = y * sx_ + z1 * cx_;

        const f = focal / (z2 + camDist);
        const ox = x1 * f, oy = y1 * f;
        px[i][j] = cx + ox * cob - oy * sob;
        py[i][j] = cy + ox * sob + oy * cob;
        pz[i][j] = z2; // larger = farther
      }
    }

    // Far depth fades toward 0 opacity, near toward full — the 3D cue.
    // Near-side lines (depth < 0) draw on the front canvas, over the title,
    // so the name appears to sit inside the blob.
    // va/vb are the endpoints' vertical unit-positions (+1 top .. -1 bottom),
    // so the stroke is tinted by its height on the sphere.
    function stroke(ax, ay, az, bx, by, bz, va, vb) {
      const depth = (az + bz) * 0.5;
      const a = 0.07 + 0.33 * (1 - (depth + R) / (2 * R));
      const s = ((va + vb) * 0.5 + 1) / 2; // 0 bottom .. 1 top
      const [r, g, b] = colorAt(s);
      const c = depth < 0 ? frontCtx : backCtx;
      c.strokeStyle = `rgba(${r},${g},${b},${a.toFixed(3)})`;
      c.beginPath();
      c.moveTo(ax, ay);
      c.lineTo(bx, by);
      c.stroke();
      if (c === frontCtx) whiteSeg(ax, ay, bx, by); // mirror near strands for the knockout
    }

    backCtx.lineWidth = 0.5;
    frontCtx.lineWidth = 0.5;
    for (let i = 0; i <= RINGS; i++) {
      for (let j = 0; j <= SEGS; j++) {
        if (j < SEGS) {
          // longitude segment: same ring, so both ends share this height
          stroke(px[i][j], py[i][j], pz[i][j], px[i][j + 1], py[i][j + 1], pz[i][j + 1],
            dirs[i][j][1], dirs[i][j + 1][1]);
        }
        if (i < RINGS) {
          // latitude segment: spans two rings, so it blends between heights
          stroke(px[i][j], py[i][j], pz[i][j], px[i + 1][j], py[i + 1][j], pz[i + 1][j],
            dirs[i][j][1], dirs[i + 1][j][1]);
        }
      }
    }

    // Coastlines on the shell — each point morphed/rotated/projected like a
    // vertex, then the polyline stroked segment by segment with the same
    // depth fade and front/back split as the wireframe.
    const coastC = (window.THEME && window.THEME.coast) || DEF_COAST;
    for (const line of coast) {
      let hx = 0, hy = 0, hz = 0, has = false;
      for (let k = 0; k < line.length; k++) {
        const d = line[k];
        const rad = R * (1 + AMP * morph(d[0], d[1], d[2], t));
        const x = d[0] * rad, y = d[1] * rad, z = d[2] * rad;
        const x1 = x * cy_ + z * sy_;
        const z1 = -x * sy_ + z * cy_;
        const y1 = y * cx_ - z1 * sx_;
        const z2 = y * sx_ + z1 * cx_;
        const f = focal / (z2 + camDist);
        const ox = x1 * f, oy = y1 * f;
        const sx = cx + ox * cob - oy * sob;
        const sy = cy + ox * sob + oy * cob;

        if (has) {
          const depth = (hz + z2) * 0.5;
          const a = 0.12 + 0.6 * (1 - (depth + R) / (2 * R));
          const c = depth < 0 ? frontCtx : backCtx;
          c.strokeStyle = `rgba(${coastC[0] | 0},${coastC[1] | 0},${coastC[2] | 0},${a.toFixed(3)})`;
          c.beginPath();
          c.moveTo(hx, hy);
          c.lineTo(sx, sy);
          c.stroke();
          if (c === frontCtx) whiteSeg(hx, hy, sx, sy);
        }
        hx = sx; hy = sy; hz = z2; has = true;
      }
    }

    // Keep only the white strands that fall on a glyph, then lay them over the
    // stone front lines — so each near strand reads white where it crosses a
    // letter, and stays stone everywhere else.
    if (title) {
      whiteCtx.save();
      whiteCtx.setTransform(1, 0, 0, 1, 0, 0);
      whiteCtx.globalCompositeOperation = "destination-in";
      whiteCtx.drawImage(maskCanvas, 0, 0);
      whiteCtx.restore();

      frontCtx.save();
      frontCtx.setTransform(1, 0, 0, 1, 0, 0);
      frontCtx.drawImage(whiteBuf, 0, 0);
      frontCtx.restore();
    }

    if (running) rafId = requestAnimationFrame(frame);
  }

  // Only run the globe's loop while the home panel is actually on screen. When
  // the deck slides it away, pause entirely — so panels' animation loops never
  // pile up on top of each other.
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
  ).observe(backCanvas);
})();
