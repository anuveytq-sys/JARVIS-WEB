# JARVIS-WEB
### A modular AI command cockpit for the browser, the cloud, and the local machine

**JARVIS-WEB brings a cinematic sci-fi HUD and a growing collection of AI, voice, vision, navigation, automation, and specialist tools into one modular assistant experience.** Rather than treating an assistant as a single chat box, the project explores a unified command surface: ask, navigate, inspect, and launch supported workflows from one futuristic interface.

> **One interface. Multiple environments. A modular system built to grow.**
>
> JARVIS-WEB is an experimental project—not a claim of unrestricted device control or flawless autonomy. The capabilities available in each environment depend on the active frontend, backend, browser, permissions, service configuration, and network. This README deliberately distinguishes project areas from features that still require environment-specific verification.

---

## At a glance

- **Project:** JARVIS-WEB — Modular Browser AI Assistant
- **Frontend:** HTML, CSS, and modular browser JavaScript
- **Hosted AI service:** Node.js, Express, and Google Gemini
- **Static hosting:** GitHub Pages
- **Hosted backend configuration:** Render
- **Local machine backend:** Node.js (server.js and gemini.cjs)
- **License:** MIT for this repository; third-party components retain their own terms

### Open JARVIS

- **Live interface:** https://anuveytq-sys.github.io/JARVIS-WEB/
- **Source code:** https://github.com/anuveytq-sys/JARVIS-WEB

The live interface and hosted AI path are separate parts of the system. The frontend can load while AI responses remain unavailable if the backend is missing, sleeping, misconfigured, or unable to reach its provider. Check the latest deployment and test the exact workflow before relying on the live demo.

---

## The JARVIS experience

JARVIS-WEB is organized as a modular assistant cockpit with a futuristic HUD, a central command experience, and feature modules that add focused capabilities. The repository includes or explores the following areas; individual modules may have different maturity levels and dependencies.

### Core interface and interaction

- **Futuristic HUD:** A science-fiction-inspired dashboard with animated visual layers, system panels, and a central 3D-style core.
- **AI conversation:** A browser-to-backend text command path for asking questions when the hosted or local AI service is configured.
- **Voice-oriented interaction:** Browser speech-recognition and speech-related integrations where supported. Microphone access requires permission and browser compatibility.
- **Command routing:** Modular command and service-routing code intended to direct supported requests toward the appropriate feature or service.
- **Mission and reminder interfaces:** Mission-control and reminder-related modules for organizing assistant workflows. Persistence and execution depend on the specific module and environment.
- **Sharing and navigation helpers:** Modules for selected navigation, service access, sharing, and workflow shortcuts.

### Vision, input, and immersive modules

- **Vision intelligence:** Camera/vision-oriented modules that depend on browser media support, permissions, and the feature's required resources.
- **Hand gestures:** A hand-gesture interaction module intended to support hands-free pointer or interface interaction when its vision dependencies are available.
- **Wake-style interactions:** Clap/snap-related wake interaction code is present; microphone behavior and reliability must be verified on the target device.
- **3D core and visual effects:** A central visual core and related styling that give the interface its distinctive command-center aesthetic.
- **Focus and media tools:** Focus-detection and music/media-related modules, subject to their own browser and service requirements.

### Specialist tools and integrations

- **GitHub access and platform search:** Modules for selected repository-related and platform-search workflows; actions depend on configured permissions and available APIs.
- **YouTube-related tools:** A module for YouTube upload workflows; availability depends on the integration, credentials, and authorization it requires.
- **Calling and Beacon:** Calling-related and Beacon modules are present for supported communication/workflow scenarios. They do not guarantee that every contact, call type, or device is callable from every browser.
- **ULTRON:** A specialist module and command layer in the codebase. Its UI or name should not be interpreted as authorization to retrieve private, leaked, restricted, or non-public information.
- **VELVE:** A satellite/country-oriented visualization area with satellite data handling and voice-related support modules. Data availability depends on upstream feeds and static fallback data.
- **TerraNexus:** A separate specialist visual/tool module with its own UI and supporting code.
- **Environment shortcuts and power modules:** Additional shortcut and specialist command modules intended to extend the main experience.

**Important:** This is a map of project areas and modules, not a guarantee that every listed feature works end-to-end in every deployment. Use the testing checklist and demonstrate only workflows verified on the actual target device.

---

## The six JARVIS environments

JARVIS-WEB is organized around six distinct environments, each with a different role. They bring focused tools together under one futuristic assistant experience. The descriptions below summarize the intended scope of each environment; individual features can depend on permissions, APIs, backend configuration, and device/browser support.

| Environment | Core capabilities |
|---|---|
| **Main JARVIS** | The central assistant experience for AI conversations, voice-oriented interaction, supported command routing, service shortcuts, and connected workflows such as calling/Beacon and reminders where configured. |
| **VELVE** | A satellite- and country-oriented exploration environment, bringing together visualizations and satellite/data-related modules. Coverage and freshness depend on the available data sources and feeds. |
| **TerraNexus** | An Earth-focused visual and exploration environment for geographic or planet-scale context, using the dedicated TerraNexus interface and its supporting modules. Specific data layers depend on what is configured and available. |
| **Command Centre** | A mission-control-style workspace for organizing and monitoring supported commands, mission/task interfaces, status panels, reminders, and workflow shortcuts. Displayed controls do not by themselves guarantee background execution or persistent synchronization. |
| **Vision Intelligence** | A camera/vision-oriented environment with hand-gesture and other visual-interaction modules. Features require compatible browser/device support, access permissions, and their associated vision resources. |
| **ULTRON** | A specialist research and intelligence environment for supported search and analysis workflows, including lawful open-source research using public, authorized sources. It is not a guarantee of access to private, leaked, restricted, or non-public data. |

**Important:** These are six product environments—not six guarantees of fully autonomous or universally available functionality. Demonstrate only workflows verified in the target deployment, and keep the boundaries between browser permissions, hosted services, and local-machine access clear.


---

## Architecture

Under the six product environments, the current implementation has three main technical execution paths:

- **Browser HUD:** public/index.html plus selected browser modules from docs/.
- **Hosted Web AI:** web-server.js → Express API → Gemini using a server-side key.
- **Local backend:** server.js and gemini.cjs → local command handlers and OS-specific helpers.

The browser frontend, hosted AI backend, and local backend have different permissions and responsibilities. They are not interchangeable.

### Repository map

| Path | Responsibility |
|---|---|
| public/index.html | Main HTML source used by the current Pages workflow. |
| docs/ | Browser modules, styles, icons, supporting assets, architecture/security/testing documentation, and a separate static HUD copy. The Pages workflow copies a curated set of assets; it does not use docs/index.html as the entry point. |
| server.js | Local backend and supported machine-oriented command path. |
| gemini.cjs | Gemini integration used by the local backend. |
| web-server.js | Hosted web AI backend. |
| render.yaml | Render service configuration for the hosted backend. |
| .github/workflows/pages.yml | Syntax checks, project-specific checks, static-site build, and GitHub Pages deployment. |
| WEB_DEPLOYMENT.md | Deployment instructions and environment differences. |
| docs/ARCHITECTURE.md | Expanded architecture notes. |
| docs/SECURITY_REVIEW.md | Initial security review and remediation priorities. |
| docs/TESTING_CHECKLIST.md | Manual verification checklist. |
| docs/COMPETITION_READINESS.md | Competition preparation checklist. |
| docs/DEVPOST_SUBMISSION_DRAFT.md | Submission-description starting point. |

The browser module paths, HTML loading order, and workflow asset-copy list are coupled. Do not rename or delete a module solely because it looks unused; check static and dynamic references first.

---

## Setup and deployment

### A. Publish the frontend with GitHub Pages

The repository's Pages workflow builds from public/index.html and copies selected modules/assets from docs/.

1. Open the repository's **Settings → Pages**.
2. Confirm the publishing source is **GitHub Actions**.
3. Open the latest [Pages workflow runs](https://github.com/anuveytq-sys/JARVIS-WEB/actions/workflows/pages.yml) and confirm the run for the intended commit succeeded.
4. Visit the [JARVIS-WEB live interface](https://anuveytq-sys.github.io/JARVIS-WEB/).

Do not switch to branch/folder publishing unless you intentionally want a different build path.

### B. Configure the hosted AI backend

1. Create a Render Blueprint from this repository using render.yaml, or create a Node web service manually.
2. For a manual service, use build command npm install and start command node web-server.js.
3. Add GEMINI_API_KEY as a **private environment variable** in Render. Never place it in frontend JavaScript, HTML, a URL, screenshots, or a public commit.
4. Set ALLOWED_ORIGIN to the exact origin of the published frontend if needed. The service has a basic origin check and process-local request limiting; these are not authentication or a complete production security system.
5. After deployment, use your actual Render URL in the frontend query parameter:

   https://anuveytq-sys.github.io/JARVIS-WEB/?api=https://YOUR-REAL-BACKEND.onrender.com

   Replace the example backend host with your actual service URL. Never put credentials in the URL.

For details, see [WEB_DEPLOYMENT.md](WEB_DEPLOYMENT.md).

### C. Run the local backend

The local path requires Node.js and the dependencies/configuration expected by the repository. Review server.js, gemini.cjs, and the deployment notes before running it on a machine. Configure required secrets locally through an environment file or environment variables that are excluded from version control. Do not publish a local server or expose its command routes to the internet.

Because the local backend can run machine commands, only run it on a device you own or are authorized to administer, and inspect the exact command behavior before use.

---

## Security, privacy, and reliability

JARVIS-WEB is an evolving experimental project. Its current protections are not a security certification.

- **API keys:** Keep secrets server-side. Rotate any key that may have been exposed and remove secrets from public code and logs.
- **Hosted endpoint:** Origin checks are not authentication. Requests without an Origin header are accepted by the current middleware, and the process-local rate limit is not shared across instances. Configure provider quotas, alerts, and stronger abuse controls before broad public promotion.
- **Local command execution:** The local backend uses shell execution. Keep it local-only and review all command call sites and input handling.
- **Browser permissions:** Camera, microphone, speech, and related APIs depend on browser support and explicit user permission.
- **Third-party services:** AI providers, satellite feeds, APIs, browsers, and external integrations may change, become unavailable, or enforce quotas.
- **Data and privacy:** Use test data in demos. Do not record real private messages, account tokens, passwords, or sensitive files.
- **Limitations:** A successful build or JavaScript syntax check does not prove every feature works end-to-end.

See the [initial security review](docs/SECURITY_REVIEW.md) and [manual testing checklist](docs/TESTING_CHECKLIST.md).

---

## Testing and project status

The GitHub Pages workflow runs node --check on a set of browser modules, verifies selected project-specific markers, assembles the static site, and deploys it. These checks catch some syntax and packaging errors; they are **not** a complete browser test suite.

The package.json test script is currently a placeholder that exits with an error. Do not interpret it as a passing automated test suite.

Before a release or competition demo:

- [ ] Verify the latest Pages workflow for the exact commit.
- [ ] Load the live site in a fresh browser session and check the console.
- [ ] Test the selected user journey on the actual target device/browser.
- [ ] Test the hosted backend separately, including status and a valid AI request.
- [ ] Confirm microphone/camera permission handling if the demo uses those APIs.
- [ ] Verify all external services and required credentials.
- [ ] Test graceful behavior when the backend is unavailable or a permission is denied.
- [ ] Make sure the demo claims match what was actually observed.

---

## Devpost and competition preparation

JARVIS-WEB is designed to tell a strong engineering story: a modular command-center interface, multiple execution environments, and a deliberate separation between browser features, hosted AI, and local machine actions.

For a credible submission, choose one or two workflows that work reliably and show them from start to finish. Explain the architecture, what is genuinely distinctive, and the current limitations. Do not present UI animations, module names, or planned capabilities as proof that every feature is production-ready.

- [Competition readiness checklist](docs/COMPETITION_READINESS.md)
- [Devpost submission draft](docs/DEVPOST_SUBMISSION_DRAFT.md)
- [Architecture notes](docs/ARCHITECTURE.md)
- [Testing checklist](docs/TESTING_CHECKLIST.md)
- [Security review](docs/SECURITY_REVIEW.md)
- [Change safety and rollback](docs/CHANGE_SAFETY.md)

Before entering an event, verify its current rules for eligibility, age, team size, pre-existing projects, AI usage, intellectual property, deadlines, judging criteria, and prize requirements. Add an authentic demo video and accurate contributor/third-party credits.

---

## Contributing safely

JARVIS-WEB contains many coupled modules, so small-looking changes can affect script order or feature behavior.

1. Start from the latest known-good commit.
2. Create a branch for one focused change.
3. Trace imports, HTML references, dynamic loading, backend routes, and workflow copy lists before editing.
4. Keep changes scoped and review the complete diff.
5. Run the configured checks and manually test the affected workflow.
6. Deploy only after the intended changes are reviewed.
7. Keep rollback tied to the specific commit or pull request.

Do not remove modules or assets until their use has been checked across the application and build workflow.

---

## License and credits

This repository includes an MIT license. That license applies to this repository's covered code, subject to the license text; it does not override the licenses, terms, attribution requirements, or usage restrictions of bundled assets, dependencies, Google Gemini, Render, GitHub Pages, satellite-data providers, or other third-party services. Review those terms separately before distribution or competition submission.

---

**JARVIS-WEB — a modular AI cockpit built to bring more of the assistant experience into one place, while keeping clear boundaries between the browser, the cloud, and the local machine.**
