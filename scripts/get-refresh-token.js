// One-time local helper to obtain your Spotify REFRESH token.
//
// Prereqs in the Spotify dashboard (https://developer.spotify.com/dashboard):
//   - Create an app, copy its Client ID + Client Secret.
//   - Add this exact Redirect URI to the app: http://127.0.0.1:8888/callback
//
// Then, from the repo root (Node 18+):
//   PowerShell:  $env:SPOTIFY_CLIENT_ID="..."; $env:SPOTIFY_CLIENT_SECRET="..."; node scripts/get-refresh-token.js
//   bash:        SPOTIFY_CLIENT_ID=... SPOTIFY_CLIENT_SECRET=... node scripts/get-refresh-token.js
//
// Open the printed URL, approve, and the refresh token prints in the terminal.
const http = require("http");
const crypto = require("crypto");

const ID = process.env.SPOTIFY_CLIENT_ID;
const SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT = "http://127.0.0.1:8888/callback";
const SCOPES = "user-read-recently-played user-top-read";

if (!ID || !SECRET) {
  console.error("Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET env vars first.");
  process.exit(1);
}

const state = crypto.randomBytes(8).toString("hex");
const authUrl =
  "https://accounts.spotify.com/authorize?" +
  new URLSearchParams({
    response_type: "code",
    client_id: ID,
    scope: SCOPES,
    redirect_uri: REDIRECT,
    state,
  }).toString();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT);
  if (url.pathname !== "/callback") {
    res.writeHead(404);
    res.end();
    return;
  }
  if (url.searchParams.get("state") !== state) {
    res.end("State mismatch — start over.");
    server.close();
    return;
  }
  try {
    const r = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(`${ID}:${SECRET}`).toString("base64"),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: url.searchParams.get("code"),
        redirect_uri: REDIRECT,
      }),
    });
    const data = await r.json();
    res.end("Done — close this tab and return to the terminal.");
    if (data.refresh_token) {
      console.log("\n  SPOTIFY_REFRESH_TOKEN (store this as a repo secret):\n");
      console.log("  " + data.refresh_token + "\n");
    } else {
      console.error("\nNo refresh token in response:", data);
    }
  } catch (e) {
    console.error(e);
  } finally {
    server.close();
  }
});

server.listen(8888, "127.0.0.1", () => {
  console.log("\nOpen this URL in your browser to authorize:\n");
  console.log("  " + authUrl + "\n");
});
