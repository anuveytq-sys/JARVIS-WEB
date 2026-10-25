# JARVIS-WEB Initial Security Review

**Scope:** Static review of selected source/configuration files. This is not a penetration test, dependency audit, or certification. Findings below describe observable implementation details and recommended next steps.

## High-priority findings

### 1. Local backend executes operating-system commands

**Evidence:** `server.js` imports `exec` from Node's `child_process` and defines a helper that executes a command string through a shell.

**Risk:** Any command route that allows untrusted input to reach that helper could permit unintended local command execution. The exact risk depends on the complete command mapping and input validation. Do not expose the local server to the public internet or bind it to a public interface without a dedicated security review.

**Recommended action:** Keep the local backend bound to loopback for local-only use; review every call site of the command helper; use a strict allowlist of fixed commands/arguments; avoid interpolating user text into shell strings; require user confirmation for impactful actions; add tests for rejected inputs. No change to the local backend was made in this documentation pass because changing command behavior without a complete regression test could break JARVIS.

### 2. Hosted backend allows requests with no Origin header

**Evidence:** `web-server.js` only rejects requests when an Origin header exists and is not in the allowlist. Requests without an Origin header are allowed.

**Risk:** Origin/CORS checks are browser controls, not authentication. A non-browser client can omit the header. The current hosted chat route can consume the server's Gemini quota if it is reachable and configured.

**Recommended action:** Treat this endpoint as public. Configure provider quotas and alerts, monitor usage, consider authenticated access or a gateway-level limit, and validate proxy/IP behavior before relying on per-IP limits. Do not claim that CORS alone prevents abuse.

### 3. In-memory rate limiting is limited

**Evidence:** The hosted service tracks request counts in a process-local Map with a 20-request-per-minute limit.

**Risk:** State resets on restart and is not shared across multiple instances. The map's entries may also accumulate for many unique client IPs until their windows are revisited.

**Recommended action:** For public use, prefer a trusted gateway or shared rate-limit store, add bounded cleanup, and test behavior behind the hosting provider's proxy. Monitor abuse and provider spending.

## Additional observations

### 4. Hosted/local capabilities differ

The hosted backend's system instruction states it cannot access a visitor's device, run commands, open apps, or inspect files. Its timer endpoint returns an empty list, and its voice endpoint describes browser-side recognition. The product page and competition demo should make these limits clear.

### 5. Secret handling

The current source reviewed here did not contain an obvious API-key-shaped literal in the selected files. That does not prove the repository history, every file, GitHub Actions logs, or screenshots are free of secrets. Keep credentials in private environment variables, use a secret scanner, and rotate any key that may have been exposed. Do not put keys in query parameters, frontend bundles, or public commits.

### 6. Dependencies and test coverage

The package manifest's test script is a placeholder that exits with an error, and no end-to-end test suite was verified in this review. The Pages workflow has JavaScript syntax checks and project-specific assertions, but syntax checks do not test permissions, API calls, browser interactions, or device integrations.

**Recommended action:** Add a non-destructive automated test suite incrementally, pin and audit dependencies, and use a staging deployment for integration checks. Keep each new test independent of secrets and live paid API calls.

### 7. Browser permissions and privacy

Camera, microphone, notifications, and related browser capabilities require user permission and vary by browser/platform. The demo should explain when permissions are needed, avoid recording or transmitting data unexpectedly, and never use real private messages or credentials in recordings.

## Remediation order

1. Keep the local command-executing backend private and review all shell-command call sites.
2. Configure API quotas and monitoring for the hosted AI endpoint; add stronger abuse controls before broad public promotion.
3. Add automated tests for backend input validation, errors, rate limiting, and frontend-to-backend behavior.
4. Run a dependency and secret-history scan.
5. Perform a browser/device regression test for the exact hackathon demo.
6. Update the public demo claims only after each behavior is verified.

## Changes made during this review

This file records findings and recommendations only. No application runtime code, API configuration, deployment configuration, or module file was changed as part of this security review.
