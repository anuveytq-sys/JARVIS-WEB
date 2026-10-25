# JARVIS Web Deployment Guide

## 1. Publish the GitHub Pages frontend

The current `.github/workflows/pages.yml` workflow builds the Pages site from `public/index.html` and copies selected browser modules and styles from `docs/` into the output directory. `docs/index.html` is a separate HUD copy; it is not the entry point copied by this workflow.

1. Open this repository's **Settings → Pages**.
2. Confirm that the publishing source is **GitHub Actions**, matching the checked-in workflow.
3. Inspect the latest workflow run and confirm it completed successfully.
4. Open the published site:
   `https://anuveytq-sys.github.io/JARVIS-WEB/`

Do not switch Pages to branch/folder publishing unless you intentionally want to use a different build path.

## 2. Deploy the hosted AI backend

The repository includes:
- `web-server.js` — separate, AI-only backend for web hosting.
- `render.yaml` — Render Blueprint configuration.
- `server.js` and `gemini.cjs` — the original local backend path.

To deploy, create a Render Blueprint from this repository using `render.yaml`, or create a Node web service with build command `npm install` and start command `node web-server.js`. Add `GEMINI_API_KEY` as a private environment variable in Render. Never commit the key to GitHub.

After Render gives you a service URL, open:
`https://anuveytq-sys.github.io/JARVIS-WEB/?api=https://YOUR-REAL-BACKEND.onrender.com`

Replace the example with your actual Render service URL. Never put an API key or other secret in the URL.

## Important feature differences

GitHub Pages cannot run Node.js, access a visitor's device, or execute backend commands. The hosted backend provides Gemini chat, status, and basic endpoint compatibility; it deliberately does not run shell commands, open apps, or inspect server files. The original local `server.js` keeps those desktop-specific features for local use.

The hosted backend has a basic origin check and process-local request limit, not a complete production security system. Origin checks are not authentication, and a public endpoint may consume the configured provider quota. Configure provider quotas and alerts, monitor usage, and consider stronger abuse controls before broad public promotion.

## API key safety

The Gemini key previously shared in chat should be treated as exposed. Revoke it in Google AI Studio / Google Cloud and create a replacement. Add the replacement only to Render's private environment settings—never to HTML, a URL, or a public GitHub commit.

For additional review notes, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/SECURITY_REVIEW.md](docs/SECURITY_REVIEW.md).
