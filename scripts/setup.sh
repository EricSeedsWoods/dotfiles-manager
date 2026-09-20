#!/usr/bin/env bash
# setup.sh — checks dependencies and makes scripts executable
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BOLD}Dotfiles Manager — environment setup${NC}"
echo "----------------------------------------"

ok=true

check() {
  local name="$1"
  local cmd="$2"
  local hint="$3"
  if command -v "$cmd" >/dev/null 2>&1; then
    local version
    version=$("$cmd" --version 2>/dev/null | head -n1)
    echo -e "${GREEN}✔${NC} $name found ($version)"
  else
    echo -e "${RED}✘${NC} $name not found. $hint"
    ok=false
  fi
}

check "Node.js (>=18)" node "Install from https://nodejs.org or use nvm: nvm install 20"
check "npm" npm "Ships with Node.js — reinstall Node.js if missing."
check "git" git "Install from https://git-scm.com/downloads"
check "GitHub CLI" gh "Install from https://cli.github.com"

echo "----------------------------------------"

if command -v gh >/dev/null 2>&1; then
  if gh auth status >/dev/null 2>&1; then
    echo -e "${GREEN}✔${NC} gh is authenticated"
  else
    echo -e "${YELLOW}⚠${NC} gh is installed but not authenticated."
    echo "   Fix it with: gh auth login"
  fi
fi

echo "Making scripts executable..."
chmod +x scripts/*.sh 2>/dev/null || true
echo -e "${GREEN}✔${NC} scripts/*.sh are now executable"

if [ "$ok" = false ]; then
  echo -e "${YELLOW}Some dependencies are missing — install them above, then re-run this script.${NC}"
  exit 1
fi

echo -e "${GREEN}${BOLD}All set. Run 'npm install' then 'npm start -- --help' to begin.${NC}"
