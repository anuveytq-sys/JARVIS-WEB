# JARVIS Manual Verification Checklist

This checklist is intended to help maintainers test the project without assuming that syntax validation equals full functionality. Record the result, date, browser/device, and any error for each check.

## Repository and CI

- [ ] GitHub Actions workflow completes successfully on the candidate commit.
- [ ] Every JavaScript file checked by the workflow passes `node --check`.
- [ ] Project-specific grep/assertion steps in the workflow pass.
- [ ] No accidental secrets, tokens, local environment files, or personal data are present in the diff.
- [ ] Any changed script path is reflected in the Pages build workflow and HTML references.

## Static website

- [ ] Pages site loads over HTTPS.
- [ ] Browser console has no new uncaught errors during the chosen demo.
- [ ] Primary interface remains usable at desktop and mobile viewport sizes.
- [ ] All assets and modules used in the chosen demo load successfully.
- [ ] Refreshing the page does not break the chosen workflow.
- [ ] A denied permission or unavailable browser API fails gracefully.

## Hosted AI backend

- [ ] Render deployment is healthy and the documented health endpoint responds.
- [ ] Frontend points to the intended backend URL.
- [ ] Valid request produces an expected response.
- [ ] Missing or invalid configuration returns a useful error without exposing secrets.
- [ ] Origin checks and request limits behave as documented.
- [ ] Provider usage limits and spending controls are configured and monitored.
- [ ] No real API key is included in the browser bundle, query string, repository, or recording.

## Local-only features

- [ ] Local backend is tested separately from the hosted backend.
- [ ] Device-level actions are tested only on a device the maintainer owns or is authorized to administer.
- [ ] Any action that changes files, settings, or applications requires appropriate user intent and permission.
- [ ] Local features are not described as available through GitHub Pages unless that is independently proven.

## Release decision

- [ ] Known-good baseline remains available.
- [ ] Candidate changes have a clear diff and can be reverted.
- [ ] No unrequested feature behavior or UI has been changed.
- [ ] Demo claims match observed test results.
- [ ] Rollback path is documented before merging or deploying.
