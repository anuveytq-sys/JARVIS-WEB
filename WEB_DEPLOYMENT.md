# JARVIS Web Deployment Guide

## GitHub Pages frontend

A separate copy of the JARVIS HUD is now in `docs/index.html`. The original `public/index.html`, `server.js`, and `gemini.cjs` have not been modified as part of the Pages frontend setup.

To publish the frontend:

1. Open this repository's **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select branch `main` and folder `/docs`, then save.
4. After GitHub Pages finishes publishing, the expected site URL is:
   `https://anuveytq-sys.github.io/JARVIS-WEB/`

## Backend and AI

GitHub Pages cannot run Node.js, keep a server-side Gemini key, or execute backend commands. The existing backend files (`server.js` and `gemini.cjs`) remain in the repository for local use, but they are **not automatically hosted by GitHub Pages**.

The Pages HUD accepts a separately hosted backend base URL via the `?api=` query parameter, for example:
`https://anuveytq-sys.github.io/JARVIS-WEB/?api=https://YOUR-SECURE-BACKEND.example`

That is only a connection mechanism, not a deployed backend. Replace the example with a real backend URL only after a secure backend has been prepared and deployed.

## Security and API key

- The Gemini API key must be stored as a private environment variable on the backend host, never in `docs/index.html`, a URL, or a public GitHub commit.
- The API key you posted in chat should be treated as exposed. Revoke it in Google AI Studio / Google Cloud and create a replacement only when needed. Do not send the replacement in chat.
- The current local backend includes operating-system command execution. Do not expose it publicly as-is. Add authentication and restrict command-execution features first; commands on a hosted server would run on that server, not on the visitor's device.
- The GitHub Pages frontend can display the HUD and use browser voice capabilities, but AI commands will not work until a compatible secured backend is connected.
