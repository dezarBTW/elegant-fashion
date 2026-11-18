<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Keep the repository production ready

Before creating or staging a file or folder, decide whether it belongs in the shared project. Commit application source, assets used by the app, configuration, lockfiles, database migrations, maintained documentation, tests and their fixtures, and CI files. These support a reliable production release even when they are not served at runtime.

Add any new local-only or generated material to `.gitignore` as part of the same task. This includes scratch files, downloaded references, screenshots, browser traces, logs, temporary scripts, build output, local credentials, and demo data that is not needed to reproduce the application. Prefer a narrow, explicit ignore rule when a broad rule could hide future production files. If such a file is already tracked, remove it from the Git index with `git rm --cached` while keeping the local copy, then verify `git status` and `git check-ignore -v` before committing. Do not hide required source, migrations, tests, or production assets just because they are absent from the deployed bundle.
