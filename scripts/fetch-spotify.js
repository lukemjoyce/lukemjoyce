// Run by the "Update Spotify" GitHub Action. Uses the long-lived refresh token
// (stored as a repo secret) to mint a short-lived access token, fetches the
// recently-played and top tracks, and writes a slim spotify.json the static
// site can read. No secrets ever reach the browser.
const { writeFileSync } = require("fs");

const ID = process.env.SPOTIFY_CLIENT_ID;
const SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REFRESH = process.env.SPOTIFY_REFRESH_TOKEN;

if (!ID || !SECRET || !REFRESH) {
  console.error("Missing SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET / SPOTIFY_REFRESH_TOKEN.");
  process.exit(1);
}

const basic = "Basic " + Buffer.from(`${ID}:${SECRET}`).toString("base64");

async function accessToken() {
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: basic },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: REFRESH }),
  });
  if (!r.ok) throw new Error(`token ${r.status}: ${await r.text()}`);
  return (await r.json()).access_token;
}

async function get(url, token) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`${url} -> ${r.status}: ${await r.text()}`);
  return r.json();
}

const slim = (t) => ({
  id: t.id,
  name: t.name,
  artists: t.artists.map((a) => a.name).join(", "),
  url: t.external_urls.spotify,
});

async function main() {
  const token = await accessToken();
  const [recent, top] = await Promise.all([
    get("https://api.spotify.com/v1/me/player/recently-played?limit=5", token),
    get("https://api.spotify.com/v1/me/top/tracks?limit=5&time_range=short_term", token),
  ]);

  const out = {
    updated: new Date().toISOString(),
    recent: recent.items.map((i) => slim(i.track)),
    top: top.items.map(slim),
  };

  writeFileSync("spotify.json", JSON.stringify(out, null, 2) + "\n");
  console.log(`Wrote spotify.json: ${out.recent.length} recent, ${out.top.length} top.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
