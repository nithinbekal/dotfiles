#! /bin/bash

set -e

current_status() {
  printf "\e[33m⭑\e[0m %s\n" "$1"
}

if [ $SPIN ]; then
  current_status "Installing packages"
  sudo apt-get install -y neovim ripgrep
fi

current_status "Installing dotfiles"

dotfiles=(.gemrc .railsrc .vimrc .zshrc)

for file in "${dotfiles[@]}"
do
  current_status "Linking ${file}"
  rm -f ~/$file
  ln -sf ~/dotfiles/$file ~/$file
done

if [[ "$OSTYPE" == "darwin"* ]]; then
  if ! which brew > /dev/null; then
    current_status "Installing homebrew"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  fi;

  # Intel and M-series macs have different brew paths
  if [[ "$(uname -m)" == "arm64" ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  else
    eval "$(/usr/local/bin/brew shellenv)"
  fi

  current_status "Installing dependencies via Brewfile"
  brew bundle --file=~/dotfiles/Brewfile

  # Fix VS Code has problems with repeated keystrokes with the vim plugin
  # https://wesleywiser.github.io/post/vscode-vim-repeat-osx/
  defaults write com.microsoft.VSCode ApplePressAndHoldEnabled -bool false

  current_status "Remapping caps lock to escape"
  hidutil property --set '{"UserKeyMapping":[{"HIDKeyboardModifierMappingSrc":0x700000039,"HIDKeyboardModifierMappingDst":0x700000029}]}'

  # https://stratus3d.com/blog/2015/02/28/sync-iterm2-profile-with-dotfiles-repository/
  current_status "Setting iTerm2 preferences directory"
  defaults write com.googlecode.iterm2.plist PrefsCustomFolder -string "~/dotfiles/iterm2"
  defaults write com.googlecode.iterm2.plist LoadPrefsFromCustomFolder -bool true

  current_status "Setting up Ghostty config"
  mkdir -p ~/.config/ghostty
  ln -sf ~/dotfiles/.config/ghostty/config ~/.config/ghostty/config

  current_status "Setting up Zellij config"
  mkdir -p ~/.config/zellij
  ln -sf ~/dotfiles/.config/zellij/config.kdl ~/.config/zellij/config.kdl

  current_status "Setting up Obsidian backup"
  mkdir -p ~/Documents/backups/obsidian
  ln -sf ~/dotfiles/launchagents/com.nithin.obsidian-backup.plist ~/Library/LaunchAgents/com.nithin.obsidian-backup.plist
  launchctl unload ~/Library/LaunchAgents/com.nithin.obsidian-backup.plist 2>/dev/null || true
  launchctl load ~/Library/LaunchAgents/com.nithin.obsidian-backup.plist
fi

if grep -qi microsoft /proc/version 2>/dev/null; then
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
  fi
fi

current_status "Setting up tmux"
mkdir -p ~/.config/tmux/plugins
[ ! -d ~/.config/tmux/plugins/tpm ] && git clone https://github.com/tmux-plugins/tpm ~/.config/tmux/plugins/tpm
ln -sf ~/dotfiles/.config/tmux/tmux.conf ~/.config/tmux/tmux.conf

current_status "Setting up Claude config"
mkdir -p ~/.claude/commands
ln -sf ~/dotfiles/agents/claude/settings.json ~/.claude/settings.json
ln -sf ~/dotfiles/agents/claude/statusline-command.sh ~/.claude/statusline-command.sh
ln -sf ~/dotfiles/agents/common/commands/pr.md ~/.claude/commands/pr.md
ln -sf ~/dotfiles/agents/common/commands/push-commit.md ~/.claude/commands/push-commit.md

current_status "Linking .vim directory"

mkdir -p ~/.vim/tmp

current_status "Setting up Neovim config"

mkdir -p ~/.config/nvim
ln -sf ~/dotfiles/.config/nvim/init.lua ~/.config/nvim/init.lua
ln -sf ~/dotfiles/.config/nvim/coc-settings.json ~/.config/nvim/coc-settings.json

current_status "Installing lazy.nvim for neovim"

nvim --headless "+Lazy! sync" +qa > /dev/null 2>&1

current_status "Setting up mise config"
mkdir -p ~/.config/mise
ln -sf ~/dotfiles/.config/mise/config.toml ~/.config/mise/config.toml

current_status "Installing languages via mise"
mise install

current_status "Setting up IRB config"
mkdir -p ~/.config/irb
ln -sf ~/dotfiles/.config/irb/irbrc ~/.config/irb/irbrc

current_status "Setting up Pi config"
mkdir -p ~/.pi/agent/extensions ~/.pi/agent/prompts ~/.pi/agent/themes
ln -sf ~/dotfiles/agents/pi/extensions/status-line.ts ~/.pi/agent/extensions/status-line.ts
ln -sfn ~/dotfiles/agents/pi/extensions/diff-panel ~/.pi/agent/extensions/diff-panel
ln -sf ~/dotfiles/agents/common/commands/pr.md ~/.pi/agent/prompts/pr.md
ln -sf ~/dotfiles/agents/common/commands/push-commit.md ~/.pi/agent/prompts/push-commit.md
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
