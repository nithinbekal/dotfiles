#! /bin/bash

set -e

current_status() {
  printf "\e[32m✔\e[0m %s\n" "$1"
}

if [ $SPIN ]; then
  current_status "Installing packages"
  sudo apt-get install -y neovim ripgrep
fi

current_status "Installing ohmyzsh"
if [ -d ~/.oh-my-zsh ]; then
  current_status "Found ~/.oh-my-zsh - skipping this step"
else
  sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
fi

current_status "Installing dotfiles"

dotfiles=(.ctags .gemrc .pryrc .railsrc .vimrc .zshrc)

for file in "${dotfiles[@]}"
do
  current_status "Linking ${file}"
  rm -f ~/$file
  ln -s ~/dotfiles/$file ~/$file
done

current_status "Linking .vim directory"

mkdir -p ~/.vim
mkdir -p ~/.vim/tmp

ln -sf ~/dotfiles/.vim/ultisnips ~/.vim/ultisnips

current_status "Setting up Neovim config"

mkdir -p ~/.config/nvim
ln -sf ~/dotfiles/.config/nvim/init.lua ~/.config/nvim/init.lua
ln -sf ~/dotfiles/.config/nvim/coc-settings.json ~/.config/nvim/coc-settings.json

current_status "Installing lazy.nvim for neovim"

nvim -c 'q'

if [[ "$OSTYPE" == "darwin"* ]]; then
  if ! which brew > /dev/null; then
    current_status "Installing homebrew"
    /usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
  fi;

  eval "$(/opt/homebrew/bin/brew shellenv)"

  current_status "Installing via brew"
  brew install neovim fzf ripgrep
fi

current_status "Installation successful 🚀"
