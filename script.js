const toggle = document.getElementById("menu-toggle");
const menu = document.getElementById("menu");
const overlay = document.getElementById("overlay");

function setMenu(open) {
  toggle.classList.toggle("open", open);
  menu.classList.toggle("open", open);
  overlay.classList.toggle("open", open);

  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  menu.setAttribute("aria-hidden", String(!open));
}

toggle.addEventListener("click", () => {
  setMenu(!menu.classList.contains("open"));
});

overlay.addEventListener("click", () => setMenu(false));

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setMenu(false);
});

// Cross-page links: fade the white curtain in (page fades to white), then
// navigate. The destination page fades the curtain back out on load, so the
// two pages cross-fade through white. Same-page anchors and new-tab clicks are
// left alone.
const curtain = document.querySelector(".fade-curtain");

function fadeOutThenGo(href) {
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    location.href = href;
  };
  curtain.classList.add("leaving");
  curtain.addEventListener("animationend", go, { once: true });
  // fallback in case animationend doesn't fire (e.g. reduced motion)
  const fade = parseFloat(getComputedStyle(curtain).animationDuration) * 1000 || 450;
  setTimeout(go, fade + 100);
}

menu.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", (e) => {
    const url = new URL(link.href, location.href);
    const sameDoc = url.pathname === location.pathname && url.search === location.search;
    const newTab =
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      link.target === "_blank";

    setMenu(false);

    if (sameDoc || newTab || !curtain) return; // anchor on this page, or new tab

    e.preventDefault();
    fadeOutThenGo(url.href);
  });
});
