# JARVIS Web Deployment Guide

This guide explains how to deploy the separate web-compatible entry point without changing the original `server.js`.

## Files added for web hosting

- `web-server.js` — separate web-hosting entry point.
- `render.yaml` — Render service configuration.
- `WEB_DEPLOYMENT.md` — this guide.

## Deploy using Render

1. Sign in to Render and choose **New +** → **Web Service**.
2. Connect your GitHub account and select `anuveytq-sys/JARVIS-WEB`.
3. Use these settings:
   - **Runtime:** Node
   - **Build command:** `npm install`
   - **Start command:** `node web-server.js`
4. In the service's **Environment** settings, add `GEMINI_API_KEY` with your own Gemini API key. Keep it private; do not put it in source code or commit it to GitHub.
5. Deploy and check the service logs for startup errors.

You can also try the included `render.yaml` as a Blueprint configuration if it is present in the repository root.

## Important limitations and security

- This is a Node.js backend, so GitHub Pages alone cannot run the complete app.
- AI responses depend on a valid API key, supported model availability, provider quotas, and current pricing. Do not assume API use is always free.
- Browser voice input/output depends on browser support and microphone permissions.
- Commands executed by the backend run on the hosting server, not on a visitor's phone or computer.
- **Do not expose this app publicly as-is.** The original backend includes operating-system command execution and was designed for trusted local use. Before making it public, add authentication, restrict or remove command-execution routes, validate inputs, and apply rate limits. A hosted version may otherwise let strangers trigger actions on the server.
- Deployment has not been confirmed by this guide; check logs and test carefully before sharing the site.
