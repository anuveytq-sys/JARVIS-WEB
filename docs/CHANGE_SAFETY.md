# Safe Change and Rollback Workflow

## Current preparation branch

The competition-readiness documentation is prepared on the separate branch:

`devpost/portfolio-readiness`

The default `main` branch is not the target for these documentation changes. The intent is to keep the existing application and deployment behavior untouched while the documentation diff is reviewed.

## Before any future code change

1. Start from a known-good commit.
2. Create a dedicated branch for one coherent change.
3. Inspect the diff before editing and identify dependent paths, imports, and deployment steps.
4. Prefer additive documentation or isolated tests before touching runtime files.
5. Run relevant automated checks and manual smoke tests.
6. Open a pull request and review it before merging.
7. Verify the deployed site only after an intentional merge/deployment.

## Undoing this preparation

Because this work is isolated on `devpost/portfolio-readiness`, it can be undone without reverting unrelated commits on `main`:

- If the pull request is still open, close it without merging.
- If it has not been merged, the default branch and production deployment should remain unchanged by this branch.
- If changes are later merged, revert the specific merge commit or the individual documentation commits. Review the target commit before reverting; do not force-push or reset shared history as a first choice.

This workflow cannot guarantee rollback of external side effects. A separate hosting deployment, secret rotation, or service configuration change would need its own rollback plan.

## Scope of the current documentation pass

This pass is intentionally documentation-only. It does not reorganize application modules, change scripts, alter environment variables, modify the Render configuration, or intentionally trigger a production deployment.
