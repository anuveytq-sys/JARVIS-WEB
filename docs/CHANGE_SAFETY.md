# Safe Change and Rollback Workflow

## Current Devpost-readiness documentation

The documentation proposal is tracked in pull request #2 on branch `devpost/portfolio-readiness-current`. It is documentation-only and targets `main`. The separate cleanup of three confirmed server backup files was merged independently; the current Pages workflow has since completed successfully on `main`.

## Before any future code change

1. Start from a known-good commit.
2. Create a dedicated branch for one coherent change.
3. Inspect the diff before editing and identify dependent paths, imports, and deployment steps.
4. Prefer additive documentation or isolated tests before touching runtime files.
5. Run relevant automated checks and manual smoke tests.
6. Open a pull request and review it before merging.
7. Verify the deployed site only after an intentional merge/deployment.

## Undoing a change

- If a pull request is still open, close it without merging to keep it off the default branch.
- If a change has been merged, revert the specific merge/squash commit or the individual commit that introduced it. Review the target commit before reverting; do not force-push or reset shared history as a first choice.
- Git history preserves the deleted backup files and prior versions unless repository history is rewritten. To restore a file, retrieve its version from a known commit and review it before committing the restoration.

This workflow cannot guarantee rollback of external side effects. A hosting deployment, secret rotation, provider configuration change, or external service action needs its own rollback plan.

## Scope of the Devpost documentation pass

The proposal updates project documentation only: the README, deployment notes, architecture, security review, testing checklist, competition checklist, submission draft, and change-safety notes. It does not modify application JavaScript/HTML modules, dependencies, environment variables, Render configuration, or GitHub Actions workflow files. No runtime feature behavior is intentionally changed.

## Release evidence and limits

A successful GitHub Pages workflow demonstrates that its configured checks and build steps passed; it does not prove every browser feature works end-to-end. Before a competition submission, test the exact workflow to be recorded on the target browser/device, confirm the hosted backend separately if used, and describe only observed behavior.
