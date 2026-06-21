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

// ── Spatial deck navigation ─────────────────────────
// Home is the centre; the other panels live left / up / right / down around it
// on one plane. go(name) slides the plane so the chosen panel fills the
// viewport — the same seamless motion in every direction. Any element with a
// data-go attribute (edge cues, back cues, menu links) drives it.
const plane = document.getElementById("plane");
const PANELS = ["home", "about", "projects", "experience", "music"];
const OFFSET = {
  home:       [0, 0],
  about:      [100, 0],   // about is to the left  → slide the plane right
  projects:   [0, 100],   // projects is up        → slide the plane down
  experience: [-100, 0],  // experience is right   → slide the plane left
  music:      [0, -100],  // music is down         → slide the plane up
};
const navLinks = document.querySelectorAll("[data-go]");

function setActive(name) {
  menu.querySelectorAll("a[data-go]").forEach((a) => {
    if (a.dataset.go === name) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

function go(name, animate = true) {
  if (!plane || !OFFSET[name]) return;
  if (!animate) plane.style.transition = "none";
  const [x, y] = OFFSET[name];
  plane.style.transform = `translate(${x}vw, ${y}vh)`;
  if (!animate) {
    void plane.offsetWidth; // flush the jump, then restore the sliding transition
    plane.style.transition = "";
  }
  setActive(name);
  history.replaceState(null, "", name === "home" ? location.pathname : "#" + name);
}

navLinks.forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    setMenu(false);
    go(el.dataset.go);
  });
});

// Honour an initial #panel deep-link on load, without animating in.
if (plane) {
  const start = (location.hash || "").replace("#", "");
  go(PANELS.includes(start) ? start : "home", false);
}
