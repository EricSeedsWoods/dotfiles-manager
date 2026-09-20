# 🔗 Dotfiles Manager

[![CI](https://img.shields.io/github/actions/workflow/status/YOUR_USERNAME/dotfiles-manager/ci.yml?branch=main&label=CI)](../../actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/YOUR_USERNAME/dotfiles-manager?label=release)](../../releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org)

A small, dependency-free tool for managing a dotfiles repo across macOS, Linux, and Windows — using real symlinks (not copies), a single JSON manifest, and per-OS overrides where you actually need them.

```
$ dotfiles-manager link
Platform: macos

  [linked] zsh/.zshrc -> /Users/you/.zshrc
  [already-linked] git/.gitconfig -> /Users/you/.gitconfig
  [skipped-conflict] vim/.vimrc -> /Users/you/.vimrc

2 linked, 1 already linked, 1 skipped.
Re-run with --force to overwrite conflicting real files.
```

## Install

```bash
git clone https://github.com/YOUR_USERNAME/dotfiles-manager.git
cd dotfiles-manager
npm install
```

Or open in **GitHub Codespaces** — Node 20 and the GitHub CLI are pre-installed via the dev container.

## Usage

Run these from the root of *your own* dotfiles repo (not this tool's repo):

```bash
# Create a starter dotfiles.json to edit
npx dotfiles-manager init

# Move an existing file into the repo and symlink it back automatically
npx dotfiles-manager add ~/.zshrc

# Symlink everything in the manifest into $HOME
npx dotfiles-manager link

# Preview without touching anything
npx dotfiles-manager link --dry-run

# Overwrite real (non-symlink) files that are in the way
npx dotfiles-manager link --force

# See what's linked, missing, or conflicting
npx dotfiles-manager status
```

## The manifest (`dotfiles.json`)

```json
{
  "links": {
    "zsh/.zshrc": "~/.zshrc",
    "git/.gitconfig": "~/.gitconfig",
    "vim/.vimrc": "~/.vimrc"
  },
  "platformOverrides": {
    "windows": {
      "git/.gitconfig": "~/.gitconfig"
    }
  }
}
```

- Keys are paths relative to the repo root; values are the destination (`~` expands to your real home directory).
- `platformOverrides` lets specific entries resolve differently per OS (`macos`, `linux`, `windows`) — everything else falls back to the default in `links`.

## Why symlinks, not copies?

Editing `~/.vimrc` directly edits the file *in your repo* (since it's the same inode via the symlink) — so `git status` in your dotfiles repo immediately shows what changed, with no separate "sync" step to remember to run.

## Development

```bash
npm test              # run the test suite (uses temp fixture home/repo dirs, touches nothing real)
npm run tracker        # see real repo stats (PRs merged, issues closed, releases)
npm run roadmap        # see the Day 1 -> Month 1 contributor roadmap
bash scripts/setup.sh   # check dependencies & make scripts executable
bash scripts/release.sh patch   # bump version, tag, and open a release PR
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow.

## License

[MIT](LICENSE)
