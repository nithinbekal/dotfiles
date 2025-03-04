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
    /usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
  fi;

  eval "$(/opt/homebrew/bin/brew shellenv)"

  current_status "Installing dependencies via Brewfile"
  brew bundle --file=~/dotfiles/Brewfile

  current_status "Setting up tmux"
  mkdir -p ~/.config/tmux/plugins
  [ ! -d ~/.config/tmux/plugins/tpm ] && git clone https://github.com/tmux-plugins/tpm ~/.config/tmux/plugins/tpm
  ln -sf ~/dotfiles/.config/tmux/tmux.conf ~/.config/tmux/tmux.conf

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
fi

current_status "Linking .vim directory"

mkdir -p ~/.vim/tmp

current_status "Setting up Neovim config"

mkdir -p ~/.config/nvim
ln -sf ~/dotfiles/.config/nvim/init.lua ~/.config/nvim/init.lua
ln -sf ~/dotfiles/.config/nvim/coc-settings.json ~/.config/nvim/coc-settings.json

current_status "Installing lazy.nvim for neovim"

nvim --headless "+Lazy! sync" +qa

current_status "Setting up IRB config"
mkdir -p ~/.config/irb
ln -sf ~/dotfiles/.config/irb/irbrc ~/.config/irb/irbrc

current_status "Installation successful 🚀"
