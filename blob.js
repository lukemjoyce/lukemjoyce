/* A morphing 3D wireframe blob, stroked in stone — no fills, no shadows.
   Depth is conveyed purely by line opacity, so it reads as 3D while
   staying the same color as the page type. */
(() => {
  const backCanvas = document.getElementById("blob-back");
  const frontCanvas = document.getElementById("blob-front");
  if (!backCanvas || !frontCanvas) return;
  const backCtx = backCanvas.getContext("2d");
  const frontCtx = frontCanvas.getContext("2d");

  const STONE = [68, 64, 60]; // var(--stone) #44403c
  const RINGS = 22; // latitude divisions
  const SEGS = 60; // longitude divisions
  const AMP = 0.18; // how far the surface morphs
  const TILT = -0.38; // fixed pitch so we see it from slightly above

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
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = backCanvas.getBoundingClientRect();
    W = r.width;
    H = r.height;
    for (const c of [backCanvas, frontCanvas]) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
      c.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }
  resize();
  window.addEventListener("resize", resize);

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function frame(now) {
    const t = now * 0.0009;
    backCtx.clearRect(0, 0, W, H);
    frontCtx.clearRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(W, H) * 0.34; // world radius in px
    const camDist = R * 3.2;
    const focal = R * 3.2;

    const yaw = t * 0.5;
    const cy_ = Math.cos(yaw), sy_ = Math.sin(yaw);
    const cx_ = Math.cos(TILT), sx_ = Math.sin(TILT);

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
        px[i][j] = cx + x1 * f;
        py[i][j] = cy + y1 * f * 0.6;
        pz[i][j] = z2; // larger = farther
      }
    }

    // Far depth fades toward 0 opacity, near toward full — the 3D cue.
    // Near-side lines (depth < 0) draw on the front canvas, over the title,
    // so the name appears to sit inside the blob.
    function stroke(ax, ay, az, bx, by, bz) {
      const depth = (az + bz) * 0.5;
      const a = 0.07 + 0.33 * (1 - (depth + R) / (2 * R));
      const c = depth < 0 ? frontCtx : backCtx;
      c.strokeStyle = `rgba(${STONE[0]},${STONE[1]},${STONE[2]},${a.toFixed(3)})`;
      c.beginPath();
      c.moveTo(ax, ay);
      c.lineTo(bx, by);
      c.stroke();
    }

    backCtx.lineWidth = 1;
    frontCtx.lineWidth = 1;
    for (let i = 0; i <= RINGS; i++) {
      for (let j = 0; j <= SEGS; j++) {
        if (j < SEGS) {
          stroke(px[i][j], py[i][j], pz[i][j], px[i][j + 1], py[i][j + 1], pz[i][j + 1]);
        }
        if (i < RINGS) {
          stroke(px[i][j], py[i][j], pz[i][j], px[i + 1][j], py[i + 1][j], pz[i + 1][j]);
        }
      }
    }

    if (!reduce) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
