# JARVIS-WEB Architecture Notes

This document records the structure visible in the repository at the time of the audit. It is a source-code map, not proof that every feature has passed runtime testing.

## High-level components

### Browser frontend

- `public/index.html` is the HTML source copied by the current GitHub Pages workflow into the published site as `index.html`.
- The Pages workflow copies a curated list of browser modules and styles from `docs/` into the build output.
- `docs/index.html` is a separate static HUD copy. The current workflow does not copy this file as the Pages entry point, so changes to it alone should not be assumed to affect the deployed Pages site.
- Browser modules are kept as separate files. Script references, module names, and workflow copy lists are coupled: changing one may require updating the others.

### Browser modules

The repository includes separate browser modules for areas such as the web bridge, universal service routing, GitHub access/navigation, platform search, Beacon, mission control, calling, VELVE, vision, and other HUD enhancements. Their names indicate intended responsibility, but a module's actual supported behavior must be verified in its code and in a live browser.

### Hosted AI backend

- `web-server.js` runs a separate Express service intended for hosted web AI.
- It exposes `GET /api/status`, `POST /api/command`, `GET /api/timers`, and `POST /api/voice`.
- The chat route calls the configured Gemini model using `GEMINI_API_KEY` from the server environment.
- The hosted backend explicitly describes itself as web AI mode and does not run local shell commands or control a visitor's device.
- `render.yaml` configures a Render service using `node web-server.js`.

### Local backend

- `server.js` is a separate local Express backend and serves the `public/` directory.
- It imports `gemini.cjs` and uses Node's child-process `exec` helper for supported local commands.
- Local device functionality is not equivalent to functionality available from a static website or the hosted web AI backend.

## Current route inventory

| Component | Route | Purpose evidenced by source |
|---|---|---|
| Hosted backend | `GET /api/status` | Returns basic web-backend status and model metadata |
| Hosted backend | `POST /api/command` | Sends a text prompt to the configured Gemini model |
| Hosted backend | `GET /api/timers` | Returns an empty timer list with a note that hosted timers are not synchronized |
| Hosted backend | `POST /api/voice` | Reports that voice recognition runs in the browser when supported |
| Local backend | `POST /api/command` | Local command handling; inspect implementation before exposing it to a network |
| Local backend | `POST /api/voice` | Local backend voice route |
| Local backend | `GET /api/timers` | Local timer route |
| Local backend | `GET /api/status` | Local backend status |

## Dependency and release-sensitive areas

1. **HTML-to-module loading:** Browser entry-point references and the workflow's copied asset list must agree.
2. **Frontend-to-backend URL:** The web bridge reads an API base from a URL parameter or local storage. It must point to the intended hosted service for remote AI chat.
3. **Environment configuration:** Hosted AI requires a private server-side Gemini key. It must not be embedded in frontend JavaScript.
4. **Separate execution environments:** Static Pages, hosted web AI, and local machine automation have different permissions. Do not describe them as interchangeable.
5. **Workflow checks:** The Pages workflow validates JavaScript syntax for a set of modules and performs project-specific checks. This is useful but is not an end-to-end browser test.
6. **Dependency metadata:** The current package metadata uses the package name `offline-jarvis`, has an empty description, and defines a placeholder test script that exits with an error. These are polish/quality issues; the package name should not be changed without checking lockfile and deployment expectations.

## Safe maintenance rules

- Do not delete a file merely because it appears duplicated, old, or unused. Verify references in HTML, dynamic module loaders, workflow copy lists, backend imports, deployment files, and documentation first.
- Keep behavior changes isolated from documentation and metadata changes.
- Before a module change, record the baseline commit and test the relevant browser workflow.
- After changing a file path, search all repository references and run the Pages workflow.
- Keep the local backend private to the intended machine unless a separate threat model and security review justify a different deployment.
