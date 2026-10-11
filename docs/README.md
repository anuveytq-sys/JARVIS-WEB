# JARVIS GitHub Pages frontend

This folder contains a separate GitHub Pages copy of the existing JARVIS HUD.

- `index.html` is copied from `public/index.html`; the original file is not changed.
- The visual HUD and browser voice features run in the browser.
- The frontend does **not** contain a Gemini API key.
- GitHub Pages only hosts static files. It cannot run the Node.js AI backend or execute operating-system commands.

## Publish the page

In the GitHub repository, open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, select branch `main`, and select folder `/docs`. Save and wait for GitHub Pages to publish.

The expected URL is:

`https://anuveytq-sys.github.io/JARVIS-WEB/`

## Connect an AI backend later

Once a separately hosted, secured backend is ready, open the page with its base URL in the `api` query parameter, for example:

`https://anuveytq-sys.github.io/JARVIS-WEB/?api=https://YOUR-SECURE-BACKEND.example`

Replace the example host with the actual backend URL. Do not paste a Gemini API key into this URL, into HTML/JavaScript, or into a public GitHub file.

**Security:** the existing local backend includes operating-system command features intended for trusted local use. Do not expose those routes publicly without authentication and a careful security review. A hosted backend's OS commands would run on the hosting server, not on a visitor's device.
