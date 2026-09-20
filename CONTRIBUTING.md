# Contributing to Dotfiles Manager

Thanks for your interest in improving Dotfiles Manager! This document explains how to get set up and how to submit good changes.

## Getting Started

1. Fork the repository and clone your fork:
   ```bash
   git clone https://github.com/<your-username>/dotfiles-manager.git
   cd dotfiles-manager
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the test suite to confirm everything works:
   ```bash
   npm test
   ```
4. Run the tool locally:
   ```bash
   npm start
   ```

You can also open this repo in **GitHub Codespaces** — the dev container will install Node 20 and the GitHub CLI (`gh`) automatically.

## Making a Change

1. Create a branch off `main`:
   ```bash
   git checkout -b feature/short-description
   ```
2. Make your change, with tests where reasonable.
3. Run `npm test` and `npm run start -- --help` to sanity-check.
4. Commit with a clear message describing **what** and **why**.
5. Push your branch and open a pull request against `main`. Fill out the PR template — it's short on purpose.

## Pull Request Guidelines

- Keep PRs focused on a single change. Small PRs get reviewed faster.
- Describe what you tested and how.
- Link any related issue with `Closes #123`.
- CI (`.github/workflows/ci.yml`) must pass before merge.
- Please don't include unrelated formatting-only changes in a functional PR.

## Reporting Bugs / Requesting Features

Use the issue templates under **Issues → New Issue**:
- `bug_report.md` for something broken
- `feature_request.md` for an idea or enhancement

Please include reproduction steps for bugs (OS, Node version, command run, expected vs actual output).

## Code Style

- Plain Node.js (no build step) — keep it dependency-light.
- Prefer small, readable functions over clever one-liners.
- Match the existing formatting style in the file you're editing.

## Releasing

Maintainers cut releases by bumping the version in `package.json` and pushing a tag (`vX.Y.Z`). The `release.yml` workflow then builds and publishes a GitHub Release automatically. See `scripts/release.sh` for a helper that does this for you.

## Code of Conduct

Be respectful, assume good intent, and keep feedback constructive. Harassment or discrimination of any kind is not tolerated.
