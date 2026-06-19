/* Page colour. Everything monochromatic on the site — CSS text and all
   canvases (globe, gears) — derives from a single muted "ink" colour. There
   used to be a slider that swept the ink across several anchors; now the site
   uses one fixed global stone. Change INK below to recolour the whole site.
   Loaded in <head> so the colours apply before first paint. */
(() => {
  const INK = [68, 64, 60]; // global stone #44403c — the one colour everything derives from

  const WHITE = [255, 255, 255], BLACK = [0, 0, 0];
  const mix = (a, b, t) => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
  const css = (c) => `rgb(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])})`;

  const THEME = { ink: INK.slice() };

  function apply(ink) {
    THEME.ink = ink;                          // text, gear body
    THEME.soft = mix(ink, WHITE, 0.28);       // --stone-soft
    THEME.line = mix(ink, WHITE, 0.86);       // --stone-line
    THEME.blobTop = mix(ink, BLACK, 0.45);    // globe gradient, top
    THEME.blobBottom = mix(ink, WHITE, 0.55); // globe gradient, bottom
    THEME.gearLine = mix(ink, WHITE, 0.55);   // lighter internal gear lines
    THEME.dark = mix(ink, BLACK, 0.62);       // gear corrosion / pits
    THEME.coast = mix(ink, BLACK, 0.12);      // coastline ink

    const s = document.documentElement.style;
    s.setProperty("--stone", css(ink));
    s.setProperty("--stone-soft", css(THEME.soft));
    s.setProperty("--stone-line", css(THEME.line));
  }

  THEME.apply = apply;
  window.THEME = THEME;

  apply(INK.slice());
})();
