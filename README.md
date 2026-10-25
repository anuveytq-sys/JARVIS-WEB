# JARVIS-WEB

**JARVIS-WEB is an experimental, modular browser-based AI assistant interface** with a futuristic HUD and separate feature modules for voice, vision, automation, missions, calling, Beacon, VELVE, and related tools. See the feature notes and deployment limitations below before relying on any capability.

> **Project status:** Experimental. Individual features depend on browser permissions, the configured backend, third-party services, device/browser support, and network availability. A feature name or UI control is not by itself a guarantee that every environment supports it.

## What this repository contains

- `public/` — primary HTML entry-point source copied by the current Pages workflow.
- `docs/` — browser-side modules, styles, assets, deployment notes, and a separate static HUD copy. The Pages workflow copies a curated set of assets from this folder; it does not use `docs/index.html` as its entry point.
- `server.js` and `gemini.cjs` — local backend-related files.
- `web-server.js` and `render.yaml` — hosted AI-backend path for Render.
- `.github/workflows/` — automated checks and deployment workflow configuration.
- `WEB_DEPLOYMENT.md` — deployment notes and important environment limitations.

The exact file paths and deployment settings are the source of truth; avoid moving or renaming files without updating every script, workflow, and reference that uses them.

## Main capabilities

The project is designed around a modular assistant experience. Depending on the enabled module and environment, the interface includes or explores:

- Browser-based AI chat and voice output.
- Voice and vision-related interactions that require browser permission.
- Modular command, mission, and automation interfaces.
- Calling and Beacon-related interfaces/integrations.
- VELVE and other specialist visual/interactive modules.
- A hosted web AI mode separate from local machine-specific functionality.

**Important:** Browser-only hosting cannot silently control a visitor's operating system, run arbitrary local shell commands, or access private device data. The hosted AI backend is intentionally separate from the local backend and has a narrower capability set. Review [WEB_DEPLOYMENT.md](WEB_DEPLOYMENT.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

## Try the web version

The repository's documented GitHub Pages URL is:

`https://anuveytq-sys.github.io/JARVIS-WEB/`

Availability depends on the repository's Pages configuration and the latest successful deployment. The hosted AI response path also requires a separately configured backend; see the deployment guide. Do not assume a live endpoint is healthy without testing it.

## Deployment overview

1. **Static frontend:** The Pages workflow builds from `public/index.html` and copies the required browser modules and assets from `docs/`.
2. **Hosted AI backend:** The Render configuration runs `node web-server.js` and expects `GEMINI_API_KEY` to be configured as a private environment variable.
3. **Local backend:** Local machine-oriented capabilities belong to the local backend path and are not automatically available from a static website.

Follow [WEB_DEPLOYMENT.md](WEB_DEPLOYMENT.md). Never commit API keys, access tokens, passwords, or other secrets. If a key has been exposed, revoke it and create a replacement.

## Development and validation

Before changing application behavior:

1. Work on a separate branch and keep the known-good `main` branch untouched until the changes have been reviewed.
2. Check module dependencies, script-loading order, and references in `public/index.html`, the Pages workflow, and deployment configuration.
3. Run the repository's configured checks. The Pages workflow includes JavaScript syntax checks and project-specific verification steps; a successful syntax check does not prove that browser interactions or remote services work end-to-end.
4. Test on the intended browser/device and confirm the frontend and backend separately.
5. Document any feature that cannot be verified in the test environment.

The `package.json` test script is currently a placeholder that exits with an error. Do not interpret that placeholder as a passing application test suite. Use the GitHub Actions workflow and manual end-to-end checks as separate evidence.

## Competition / demo preparation

- [Competition readiness checklist](docs/COMPETITION_READINESS.md)
- [Draft submission description](docs/DEVPOST_SUBMISSION_DRAFT.md)
- [Architecture notes](docs/ARCHITECTURE.md)
- [Manual verification checklist](docs/TESTING_CHECKLIST.md)
- [Initial security review and remediation priorities](docs/SECURITY_REVIEW.md)
- [Safe change and rollback workflow](docs/CHANGE_SAFETY.md)

Before submitting to a hackathon, confirm that the event accepts existing projects and that your location, age, team status, and project meet its rules. Record a demo using features that were actually tested. Verify live URLs immediately before submission and never show API keys, private messages, personal information, or account tokens in the recording.

## Security and privacy notes

- Keep API keys and service credentials out of source files, URLs, screenshots, videos, and commit history.
- Browser features such as camera, microphone, and notifications require user permission and vary by browser.
- Treat third-party integrations as optional dependencies that can fail or change.
- The current deployment notes describe basic safeguards, not a complete security audit. Review [docs/SECURITY_REVIEW.md](docs/SECURITY_REVIEW.md) before broad public promotion. Do not expose the local command-executing backend publicly without a separate security review.

## License

This repository currently includes an MIT license. Review the licenses and terms of any bundled assets, dependencies, APIs, or third-party services separately; the repository license does not override their terms.
