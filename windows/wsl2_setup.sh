#!/usr/bin/env bash

set -euo pipefail

current_status() {
  printf "\e[33m⭑\e[0m %s\n" "$1"
}

# ── System packages ───────────────────────────────────────────────────────────

current_status "Updating apt and installing base packages"
sudo apt-get update -qq
sudo apt-get install -y git curl build-essential zsh

# ── Neovim ────────────────────────────────────────────────────────────────────

current_status "Installing Neovim"
if ! command -v nvim > /dev/null 2>&1; then
  sudo apt-get install -y neovim
else
  echo "  neovim already installed, skipping"
fi

# ── Rust ─────────────────────────────────────────────────────────────────────

current_status "Installing Rust via rustup"
if ! command -v rustup > /dev/null 2>&1; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path
  source "$HOME/.cargo/env"
else
  echo "  rustup already installed, skipping"
fi

# ── mise ─────────────────────────────────────────────────────────────────────

current_status "Installing mise"
if ! command -v mise > /dev/null 2>&1; then
  curl https://mise.run | sh
  export PATH="$HOME/.local/bin:$PATH"
else
  echo "  mise already installed, skipping"
fi

# ── Claude Code ───────────────────────────────────────────────────────────────

current_status "Installing Claude Code"
if ! command -v claude > /dev/null 2>&1; then
  npm install -g @anthropic-ai/claude-code
else
  echo "  claude already installed, skipping"
fi

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
printf "\e[32m✓ WSL2 bootstrap complete.\e[0m\n"
echo ""
echo "Manual steps still needed — see windows/README.md for details:"
echo "  1. SSH key generation and GitHub access"
echo "  2. git config (name + email)"
echo "  3. gh auth login"
echo "  4. Clone dotfiles and run ./install.sh"
echo ""
