#!/usr/bin/env bash

set -euo pipefail

current_status() {
  printf "\e[33m⭑\e[0m %s\n" "$1"
}

# ── System packages ───────────────────────────────────────────────────────────

current_status "Updating apt and installing base packages"
sudo apt-get update -qq
sudo apt-get install -y git curl build-essential

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

current_status "Running mise install (versions defined in dotfiles mise config)"
mise install

# ── Claude Code ───────────────────────────────────────────────────────────────

current_status "Installing Claude Code"
if ! command -v claude > /dev/null 2>&1; then
  npm install -g @anthropic-ai/claude-code
else
  echo "  claude already installed, skipping"
fi

# ── Neovim clipboard bridge (win32yank) ───────────────────────────────────────

current_status "Setting up Neovim clipboard bridge for WSL2"
clipboard_lua="$HOME/.config/nvim/lua/clipboard.lua"
if [ ! -f "$clipboard_lua" ]; then
  mkdir -p "$(dirname "$clipboard_lua")"
  cat > "$clipboard_lua" << 'EOF'
-- WSL2 clipboard bridge via win32yank
vim.g.clipboard = {
  name = "win32yank",
  copy = {
    ["+"] = "win32yank.exe -i --crlf",
    ["*"] = "win32yank.exe -i --crlf",
  },
  paste = {
    ["+"] = "win32yank.exe -o --lf",
    ["*"] = "win32yank.exe -o --lf",
  },
  cache_enabled = 0,
}
EOF
  echo "  Created $clipboard_lua"
else
  echo "  $clipboard_lua already exists, skipping"
fi

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
printf "\e[32m✓ WSL2 automated setup complete.\e[0m\n"
echo ""
echo "Manual steps still needed — see windows/README.md for details:"
echo "  1. SSH key generation and GitHub access"
echo "  2. git config (name + email)"
echo "  3. gh auth login"
echo "  4. Clone dotfiles and run install.sh"
echo ""
