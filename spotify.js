// Music page widget. Reads the static spotify.json (refreshed hourly by the
// "Update Spotify" GitHub Action) and renders Recently Played + Top Tracks as
// monochrome rows. Clicking a row's play button expands Spotify's official
// embed inline, so the page stays on-brand until you actually want to listen.
(() => {
  const mount = document.getElementById("spotify");
  if (!mount) return;

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));

  function trackRow(t) {
    return `
      <li class="sp-track" data-id="${esc(t.id)}">
        <div class="sp-row">
          <button class="sp-play" aria-label="Play ${esc(t.name)}" aria-expanded="false">&#9654;</button>
          <div class="sp-meta">
            <span class="sp-name">${esc(t.name)}</span>
            <span class="sp-artist">${esc(t.artists)}</span>
          </div>
        </div>
        <div class="sp-embed"></div>
      </li>`;
  }

  function column(title, tracks) {
    const body = tracks.length
      ? `<ol class="sp-list">${tracks.map(trackRow).join("")}</ol>`
      : `<p class="sp-empty">Nothing here yet.</p>`;
    return `<div class="sp-col"><h2 class="sp-col-title">${title}</h2>${body}</div>`;
  }

  function closeRow(row) {
    row.classList.remove("open");
    row.querySelector(".sp-play").setAttribute("aria-expanded", "false");
    row.querySelector(".sp-embed").innerHTML = ""; // stops playback + frees the iframe
  }

  function wire() {
    mount.querySelectorAll(".sp-track").forEach((row) => {
      const btn = row.querySelector(".sp-play");
      const slot = row.querySelector(".sp-embed");
      btn.addEventListener("click", () => {
        if (row.classList.contains("open")) {
          closeRow(row);
          return;
        }
        // only one track open at a time
        mount.querySelectorAll(".sp-track.open").forEach(closeRow);
        // lazy-load the embed only on first play
        slot.innerHTML =
          `<iframe src="https://open.spotify.com/embed/track/${encodeURIComponent(row.dataset.id)}?utm_source=generator"` +
          ` height="80" loading="lazy" allow="autoplay; encrypted-media"></iframe>`;
        row.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
      });
    });
  }

  fetch("spotify.json", { cache: "no-cache" })
    .then((r) => {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    })
    .then((data) => {
      mount.innerHTML =
        `<div class="sp-grid">` +
        column("Recently Played", data.recent || []) +
        column("Top Tracks", data.top || []) +
        `</div>` +
        (data.updated
          ? `<p class="sp-updated">Updated ${esc(new Date(data.updated).toLocaleString())}</p>`
          : "");
      wire();
    })
    .catch(() => {
      mount.innerHTML = `<p class="sp-empty">Couldn't load tracks right now.</p>`;
    });
})();
