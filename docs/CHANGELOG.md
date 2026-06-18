# Changelog

This document records notable changes to ZamSchool OS. You should add an entry on every merge to `main`. Keep entries short — one to three lines each, dated in ISO format.

The format is `## YYYY-MM-DD` for the section header and `- <one line>` for each change. You group changes by area when a release touches several places (`Frontend`, `Backend`, `Security`, `Docs`).

## How to use this

You write the entry when you open the pull request, not when you merge. If the PR is rejected or replaced, you delete the entry. You do not edit a merged entry after the fact; you write a follow-up entry that supersedes it.

You should link to the PR or issue from each entry. Long descriptions belong in the PR body, not here.

## Entries

### 2026-06-18

- Docs: rewrote the documentation set as ≤10 simple, consistent markdown files. Added `UI-UX.md`, kept `AUDIT.md`, archived plans and pilot material under `docs/_archive/`. See [AUDIT.md](./AUDIT.md) for the test freshness audit (25 current, 2 needs-update).

### Earlier

Earlier entries are not reproduced here. You can reconstruct them from the git history of the archived documents under `docs/_archive/`. If you need a chronological view, run `git log --diff-filter=A --name-only --pretty=format:%ad --date=short -- '*.md'` and filter to the surviving doc paths.
