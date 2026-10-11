# JARVIS GitHub Pages frontend

This folder contains a separate GitHub Pages copy of the existing JARVIS HUD.

- `index.html` is copied from `public/index.html`; the original file is unchanged.
- The visual HUD and browser voice features run in the browser.
- The frontend contains no Gemini API key.
- GitHub Pages hosts only static files; it cannot run Node.js or execute device commands.

## 1. Publish the frontend

In the GitHub repository, open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, select branch `main` and folder `/docs`, then save.

Expected site URL:
`https://anuveytq-sys.github.io/JARVIS-WEB/`

## 2. Deploy the AI backend separately

The repository now includes `web-server.js` and `render.yaml` for a separate Render backend.

1. Sign in to Render and create a **Blueprint** from this GitHub repository, or create a Node web service manually.
2. For a manual service, use build command `npm install` and start command `node web-server.js`.
3. Add `GEMINI_API_KEY` as a private environment variable in Render. Do not commit the key to GitHub or paste it into the website.
4. Keep `ALLOWED_ORIGIN` set to `https://anuveytq-sys.github.io`.
5. After deployment, copy the backend's Render URL (for example, `https://your-service.onrender.com`).

Then open the Pages site with that backend URL:
`https://anuveytq-sys.github.io/JARVIS-WEB/?api=https://YOUR-REAL-BACKEND.onrender.com`

Replace the example backend host with your actual Render URL.

## What the public backend supports

The new `web-server.js` is intentionally a **safe web AI mode**. It provides Gemini chat, status, and basic endpoint compatibility. It does not run shell commands, open apps, or read files on the hosting server. Those desktop features remain part of the original local `server.js` and cannot control a visitor's device through GitHub Pages.

The backend uses a basic per-IP request limit and origin check, but this is not a complete production security system. Monitor usage and configure quotas/billing controls with your AI provider. Free hosting may sleep or have usage limits.

## API key safety

The Gemini key posted in chat should be treated as exposed. Revoke it in Google AI Studio / Google Cloud and create a replacement. Add the replacement only to Render's private environment settings—never to HTML, a URL, or a public GitHub commit.
