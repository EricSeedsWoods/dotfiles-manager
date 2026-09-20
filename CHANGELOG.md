# Changelog

All notable changes to Dotfiles Manager will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Nothing yet — open a PR!

## [1.0.0] - 2026-07-05

### Added
- Initial public release of Dotfiles Manager.
- Core CLI implementation in `src/`.
- CI workflow (`.github/workflows/ci.yml`) running tests on push and PR to `main`.
- Release workflow (`.github/workflows/release.yml`) that publishes a GitHub Release when a `vX.Y.Z` tag is pushed.
- Dev container config for one-click GitHub Codespaces setup (Node 20 + GitHub CLI).
- `scripts/setup.sh` for local dependency checks and executable permissions.
- `scripts/release.sh` to bump versions and tag releases from the command line.
- `src/progress-tracker.js` to show real project milestones and a Day 1 → Month 1 roadmap.
