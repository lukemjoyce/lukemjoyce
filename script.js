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

// close the menu after following a link
menu.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setMenu(false));
});
