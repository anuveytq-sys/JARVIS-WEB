# JARVIS Web Deployment Guide

## 1. Publish the GitHub Pages frontend

A separate copy of the JARVIS HUD is in `docs/index.html`. The original `public/index.html` and local backend files remain unchanged.

1. Open this repository's **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select branch `main` and folder `/docs`, then save.
4. Expected website URL:
   `https://anuveytq-sys.github.io/JARVIS-WEB/`

## 2. Deploy the web AI backend

The repository now includes:
- `web-server.js` — a separate, AI-only backend for web hosting.
- `render.yaml` — Render Blueprint configuration.
- `server.js` and `gemini.cjs` — the original local backend, unchanged.

To deploy, create a Render Blueprint from this repository using `render.yaml`, or create a Node web service with build command `npm install` and start command `node web-server.js`. Add `GEMINI_API_KEY` as a private environment variable in Render. Never commit the key to GitHub.

After Render gives you a service URL, open:
`https://anuveytq-sys.github.io/JARVIS-WEB/?api=https://YOUR-REAL-BACKEND.onrender.com`

Replace the example with your actual Render service URL.

## Important feature differences

GitHub Pages cannot run Node.js, access a visitor's device, or execute backend commands. The new hosted backend provides Gemini chat, status, and basic endpoint compatibility; it deliberately does not run shell commands, open apps, or inspect server files. The original local `server.js` keeps those desktop-specific features for local use.

The hosted backend has a basic origin check and request limit, not a complete production security system. Watch API usage and configure provider quotas/billing controls. Hosting providers may sleep or impose usage limits.

## API key safety

The Gemini key posted in chat should be treated as exposed. Revoke it in Google AI Studio / Google Cloud and create a replacement. Add the replacement only to Render's private environment settings—never to HTML, a URL, or a public GitHub commit.
