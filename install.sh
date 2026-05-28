#! /bin/bash

set -e

current_status() {
  printf "\e[33m⭑\e[0m %s\n" "$1"
}

is_wsl2() {
  grep -qi microsoft /proc/version 2>/dev/null
}

current_status "Installing dotfiles"

dotfiles=(.gemrc .railsrc .vimrc .zshrc)

for file in "${dotfiles[@]}"
do
  current_status "Linking ${file}"
  rm -f ~/$file
  ln -sf ~/dotfiles/$file ~/$file
done

if is_wsl2; then
  current_status "Installing packages"
  sudo apt-get update -qq
  sudo apt-get install -y build-essential zsh
fi

current_status "Installing Rust via rustup"
if ! command -v rustup > /dev/null 2>&1; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path
  source "$HOME/.cargo/env"
fi

if ! which brew > /dev/null 2>&1; then
  current_status "Installing Homebrew"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

if [[ "$OSTYPE" == "darwin"* ]]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
else
  eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
fi

current_status "Installing dependencies via Brewfile"
if is_wsl2; then
  grep -v '^cask' ~/dotfiles/Brewfile | brew bundle --file=/dev/stdin
else
  brew bundle --file=~/dotfiles/Brewfile
fi

if [[ "$OSTYPE" == "darwin"* ]]; then
  # Fix VS Code has problems with repeated keystrokes with the vim plugin
  # https://wesleywiser.github.io/post/vscode-vim-repeat-osx/
  defaults write com.microsoft.VSCode ApplePressAndHoldEnabled -bool false

  current_status "Remapping caps lock to escape"
  hidutil property --set '{"UserKeyMapping":[{"HIDKeyboardModifierMappingSrc":0x700000039,"HIDKeyboardModifierMappingDst":0x700000029}]}'

  current_status "Configuring trackpad"
  defaults write com.apple.AppleMultitouchTrackpad Clicking -bool true
  defaults write com.apple.driver.AppleBluetoothMultitouch.trackpad Clicking -bool true
  defaults write NSGlobalDomain com.apple.mouse.tapBehavior -int 1
  defaults write NSGlobalDomain com.apple.trackpad.scaling -float 3.0
  defaults write com.apple.AppleMultitouchTrackpad TrackpadThreeFingerDrag -bool true
  defaults write com.apple.driver.AppleBluetoothMultitouch.trackpad TrackpadThreeFingerDrag -bool true
  defaults write com.apple.AppleMultitouchTrackpad TrackpadThreeFingerHorizSwipeGesture -int 0
  defaults write com.apple.driver.AppleBluetoothMultitouch.trackpad TrackpadThreeFingerHorizSwipeGesture -int 0
  defaults write com.apple.AppleMultitouchTrackpad TrackpadThreeFingerVertSwipeGesture -int 0
  defaults write com.apple.driver.AppleBluetoothMultitouch.trackpad TrackpadThreeFingerVertSwipeGesture -int 0

  # https://stratus3d.com/blog/2015/02/28/sync-iterm2-profile-with-dotfiles-repository/
  current_status "Setting iTerm2 preferences directory"
  defaults write com.googlecode.iterm2.plist PrefsCustomFolder -string "~/dotfiles/iterm2"
  defaults write com.googlecode.iterm2.plist LoadPrefsFromCustomFolder -bool true

  current_status "Setting up Ghostty config"
  mkdir -p ~/.config/ghostty
  ln -sf ~/dotfiles/.config/ghostty/config ~/.config/ghostty/config

  current_status "Setting up Obsidian backup"
  mkdir -p ~/Documents/backups/obsidian
  ln -sf ~/dotfiles/launchagents/com.nithin.obsidian-backup.plist ~/Library/LaunchAgents/com.nithin.obsidian-backup.plist
  launchctl unload ~/Library/LaunchAgents/com.nithin.obsidian-backup.plist 2>/dev/null || true
  launchctl load ~/Library/LaunchAgents/com.nithin.obsidian-backup.plist
fi

current_status "Setting up Zellij config"
mkdir -p ~/.config/zellij
ln -sf ~/dotfiles/.config/zellij/config.kdl ~/.config/zellij/config.kdl

current_status "Setting up tmux"
mkdir -p ~/.config/tmux/plugins
[ ! -d ~/.config/tmux/plugins/tpm ] && git clone https://github.com/tmux-plugins/tpm ~/.config/tmux/plugins/tpm
ln -sf ~/dotfiles/.config/tmux/tmux.conf ~/.config/tmux/tmux.conf

current_status "Linking .vim directory"

mkdir -p ~/.vim/tmp

current_status "Setting up Neovim config"

mkdir -p ~/.config/nvim
ln -sf ~/dotfiles/.config/nvim/init.lua ~/.config/nvim/init.lua
ln -sf ~/dotfiles/.config/nvim/coc-settings.json ~/.config/nvim/coc-settings.json

if is_wsl2; then
  mkdir -p ~/.config/nvim/lua
  ln -sf ~/dotfiles/.config/nvim/lua/windows-clipboard.lua ~/.config/nvim/lua/windows-clipboard.lua
fi

current_status "Installing lazy.nvim for neovim"

nvim --headless "+Lazy! sync" +qa > /dev/null 2>&1

current_status "Setting up mise config"
mkdir -p ~/.config/mise
ln -sf ~/dotfiles/.config/mise/config.toml ~/.config/mise/config.toml

current_status "Installing languages via mise"
mise install
export PATH="$HOME/.local/share/mise/shims:$PATH"
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"
mkdir -p "$PNPM_HOME"

current_status "Setting up pnpm"
corepack enable
corepack prepare pnpm@latest --activate

install_pnpm_global() {
  package="$1"
  command="$2"

  if ! command -v "$command" > /dev/null 2>&1 || ! pnpm list -g --depth 0 | grep -Fq "$package"; then
    pnpm add -g "$package"
  fi
}

current_status "Installing Claude Code"
install_pnpm_global @anthropic-ai/claude-code claude

current_status "Installing Codex"
install_pnpm_global @openai/codex codex

current_status "Installing Pi coding agent"
install_pnpm_global @mariozechner/pi-coding-agent pi

current_status "Installing qmd"
install_pnpm_global @tobilu/qmd qmd

current_status "Setting up IRB config"
mkdir -p ~/.config/irb
ln -sf ~/dotfiles/.config/irb/irbrc ~/.config/irb/irbrc

current_status "Setting up Claude config"
mkdir -p ~/.claude/commands
ln -sf ~/dotfiles/agents/claude/settings.json ~/.claude/settings.json
ln -sf ~/dotfiles/agents/claude/statusline-command.sh ~/.claude/statusline-command.sh
ln -sf ~/dotfiles/agents/common/commands/pr.md ~/.claude/commands/pr.md
ln -sf ~/dotfiles/agents/common/commands/commit.md ~/.claude/commands/commit.md
ln -sf ~/dotfiles/agents/common/commands/push-commit.md ~/.claude/commands/push-commit.md
ln -sf ~/dotfiles/agents/common/commands/issue-implement.md ~/.claude/commands/issue-implement.md
ln -sf ~/dotfiles/agents/common/commands/issue-investigate.md ~/.claude/commands/issue-investigate.md
ln -sf ~/dotfiles/agents/common/commands/pr-address-reviews.md ~/.claude/commands/pr-address-reviews.md

current_status "Setting up Pi config"
mkdir -p ~/.pi/agent/extensions ~/.pi/agent/prompts ~/.pi/agent/themes
ln -sf ~/dotfiles/agents/pi/extensions/status-line.ts ~/.pi/agent/extensions/status-line.ts
[ ! -L ~/.pi/agent/extensions/diff-panel ] || rm ~/.pi/agent/extensions/diff-panel
ln -sfn ~/dotfiles/agents/pi/extensions/self-review ~/.pi/agent/extensions/self-review
ln -sf ~/dotfiles/agents/common/commands/pr.md ~/.pi/agent/prompts/pr.md
ln -sf ~/dotfiles/agents/common/commands/commit.md ~/.pi/agent/prompts/commit.md
ln -sf ~/dotfiles/agents/common/commands/push-commit.md ~/.pi/agent/prompts/push-commit.md
ln -sf ~/dotfiles/agents/common/commands/issue-implement.md ~/.pi/agent/prompts/issue-implement.md
ln -sf ~/dotfiles/agents/common/commands/issue-investigate.md ~/.pi/agent/prompts/issue-investigate.md
ln -sf ~/dotfiles/agents/common/commands/pr-address-reviews.md ~/.pi/agent/prompts/pr-address-reviews.md
ln -sf ~/dotfiles/agents/pi/settings.json ~/.pi/agent/settings.json
ln -sf ~/dotfiles/agents/pi/themes/nightowl.json ~/.pi/agent/themes/nightowl.json

current_status "Setting up common agent skills"
mkdir -p ~/.agents/skills ~/.claude/skills ~/.pi/agent/skills
for skill in ~/dotfiles/agents/common/skills/*
do
  [ -d "$skill" ] || continue
  skill_name=$(basename "$skill")
  ln -sfn "$skill" ~/.agents/skills/$skill_name
  ln -sfn "$skill" ~/.claude/skills/$skill_name
  ln -sfn "$skill" ~/.pi/agent/skills/$skill_name
done

current_status "Installation successful 🚀"
