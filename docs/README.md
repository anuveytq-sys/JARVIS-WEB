# JARVIS Web Deployment Notes

The repository's current GitHub Actions Pages workflow builds the published site from `public/index.html` and copies a curated set of browser modules and assets from `docs/` into the output folder. `docs/index.html` is a separate HUD copy and is **not** the entry point copied by that workflow. Keep this distinction in mind when making frontend changes.

- `public/index.html` — HTML entry point used by the current Pages workflow.
- `docs/` — browser modules, CSS, icons, and other assets copied by the workflow.
- `docs/index.html` — separate static HUD copy; changes to it alone do not necessarily affect the current deployment.
- The frontend contains no Gemini API key.
- GitHub Pages hosts only static files; it cannot run Node.js or execute commands on a visitor's device.

## 1. Publish the frontend

The repository includes a GitHub Actions workflow at `.github/workflows/pages.yml`. It validates selected JavaScript modules, performs project-specific checks, and builds the Pages output from `public/index.html` plus selected assets from `docs/`.

Check **Settings → Pages** to confirm that Pages is configured to use the GitHub Actions workflow. Do not switch the source to a branch/folder deployment unless you intentionally want a different publishing process.

Expected site URL:

`https://anuveytq-sys.github.io/JARVIS-WEB/`

## 2. Deploy the AI backend separately

The repository includes `web-server.js` and `render.yaml` for a separate Render backend.

1. Sign in to Render and create a Blueprint from this repository, or create a Node web service manually.
2. For a manual service, use build command `npm install` and start command `node web-server.js`.
3. Add `GEMINI_API_KEY` as a private environment variable in Render. Do not commit the key to GitHub or paste it into the website.
4. Keep `ALLOWED_ORIGIN` set to `https://anuveytq-sys.github.io`.
5. After deployment, copy the backend's Render URL.

Then open the Pages site with that backend URL:

`https://anuveytq-sys.github.io/JARVIS-WEB/?api=https://YOUR-REAL-BACKEND.onrender.com`

Replace the example backend host with your actual Render URL. Query-string URLs can be copied into browser history and logs, so put only the public backend base URL there—never a secret or API key.

## What the hosted backend supports

The `web-server.js` service is intentionally a **web AI mode**. It provides Gemini chat, status, and basic endpoint compatibility. It does not run shell commands, open apps, or read files on the hosting server. Those desktop features belong to the local `server.js` path and cannot control a visitor's device through GitHub Pages.

The backend uses a basic process-local per-IP request limit and origin check, but this is not a complete production security system. Origin checks are not authentication. Monitor usage and configure quotas/billing controls with your AI provider. Free hosting may sleep or have usage limits.

## API key safety

The Gemini key previously shared in chat should be treated as exposed. Revoke it in Google AI Studio / Google Cloud and create a replacement. Add the replacement only to Render's private environment settings—never to HTML, a URL, or a public GitHub commit.
