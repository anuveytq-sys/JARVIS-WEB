# JARVIS-WEB — Competition Submission Draft

> **Draft only.** Tailor this to the chosen event, verify its rules, and replace any general wording with results from a tested demo before submitting.

## Project name

JARVIS-WEB — Modular Browser AI Assistant

## Short description

JARVIS-WEB is an experimental, modular browser-based AI assistant interface that combines a futuristic HUD with separate browser modules for AI chat, voice-oriented interaction, navigation, and specialist interactive tools. A separate hosted backend provides text-based AI responses, while local-only capabilities remain distinct from the public web experience.

## Problem

AI assistants often present their capabilities through disconnected interfaces, while experimental projects can be difficult to understand, configure, and extend. JARVIS-WEB explores a modular interface that brings several interaction patterns into one browser-based command experience.

## Approach

The project separates the HUD, browser modules, hosted AI endpoint, and local backend into distinct parts. This separation makes it possible to demonstrate browser-compatible features without claiming that a static website can directly control a visitor's operating system.

## What the demo should prove

Choose one end-to-end workflow that has been tested on the target browser/device. For example:

1. Open the published JARVIS interface.
2. Submit a question through the configured web AI endpoint.
3. Show the response and explain the browser/backend path.
4. Show one additional browser module only if its behavior has been independently verified.
5. Explain the difference between hosted web mode and local-only machine functionality.

Do not record the demo until the selected workflow has been tested from a fresh session.

## Technical architecture

- **Frontend:** HTML, CSS, and modular browser JavaScript.
- **Hosted service:** Node.js and Express.
- **AI integration:** Google Gemini through the server-side `GEMINI_API_KEY` environment variable.
- **Static deployment:** GitHub Pages workflow.
- **Hosted backend deployment:** Render configuration in `render.yaml`.

## Current limitations to disclose

- This is an experimental project; not every interface module has been verified end-to-end in this audit.
- The hosted web backend does not execute local device commands or inspect visitor files.
- Hosted timers are not synchronized by the current web backend.
- Voice recognition depends on browser support and user permissions.
- The current backend has basic origin checks and process-local request limiting, not a complete production security system.
- AI responses require a correctly configured server-side API key and remain subject to provider availability, quotas, and terms.

## Demo and repository

- Repository: https://github.com/anuveytq-sys/JARVIS-WEB
- Published frontend (verify availability before submission): https://anuveytq-sys.github.io/JARVIS-WEB/
- Demo video: add after recording a tested workflow.
- Team and credits: add accurate names/roles and third-party credits required by the event.

## Before submitting

- [ ] Check the competition accepts existing projects and participants from your location.
- [ ] Confirm age, team, deadline, intellectual-property, AI-use, and prize requirements.
- [ ] Test the exact workflow and live URLs.
- [ ] Add a real demo video; do not use mock results as evidence of functionality.
- [ ] Remove secrets and private data from the recording.
- [ ] Add third-party attribution where required.
- [ ] Adjust this description to the competition's prompt and judging rubric.
