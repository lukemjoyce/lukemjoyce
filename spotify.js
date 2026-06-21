// Music page widget. Reads the static spotify.json (refreshed hourly by the
// "Update Spotify" GitHub Action) and renders Recently Played + Top Tracks as
// Spotify's official inline embeds, so a single click on the player starts
// playback — no custom play button in the way.
(() => {
  const mount = document.getElementById("spotify");
  if (!mount) return;

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));

  const MAX = 5; // tracks shown per column

  function trackRow(t) {
    return `
      <li class="sp-track">
        <iframe class="sp-embed" title="${esc(t.name)} — ${esc(t.artists)}"
          src="https://open.spotify.com/embed/track/${encodeURIComponent(t.id)}?utm_source=generator"
          height="80" loading="lazy" allow="autoplay; encrypted-media"></iframe>
      </li>`;
  }

  function column(title, tracks) {
    const body = tracks.length
      ? `<ol class="sp-list">${tracks.slice(0, MAX).map(trackRow).join("")}</ol>`
      : `<p class="sp-empty">Nothing here yet.</p>`;
    return `<div class="sp-col"><h2 class="sp-col-title">${title}</h2>${body}</div>`;
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
    })
    .catch(() => {
      mount.innerHTML = `<p class="sp-empty">Couldn't load tracks right now.</p>`;
    });
})();
