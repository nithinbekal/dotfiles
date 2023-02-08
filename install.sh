#! /bin/bash

set -e

if [ $SPIN ]; then
  echo "▶︎ Installing packages"
  sudo apt-get install -y neovim ripgrep universal-ctags
fi

echo "▶︎ Installing oh-my-zsh"
if [ -d ~/.oh-my-zsh ]; then
  echo "Found ~/.oh-my-zsh - skipping this step"
else
  sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
fi

echo "▶︎ Installing dotfiles"

dotfiles=(.ctags .gemrc .pryrc .railsrc .vimrc .zshrc)

for file in "${dotfiles[@]}"
do
  echo "▶︎ Linking ${file}"
  rm -f ~/$file
  ln -s ~/dotfiles/$file ~/$file
done

echo "▶︎ Linking .vim directory"

mkdir -p ~/.vim
mkdir -p ~/.vim/tmp

ln -sf ~/dotfiles/.vim/ultisnips ~/.vim/ultisnips

echo "▶︎ Setting up Neovim config"

mkdir -p ~/.config/nvim
ln -sf ~/dotfiles/.config/nvim/init.vim ~/.config/nvim/init.vim
ln -sf ~/dotfiles/.config/nvim/init.lua ~/.config/nvim/init.lua

echo "▶︎ Installing plug for neovim"

sh -c 'curl -fLo "${XDG_DATA_HOME:-$HOME/.local/share}"/nvim/site/autoload/plug.vim --create-dirs \
       https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim'

if [[ "$OSTYPE" == "darwin"* ]]; then
  if ! which brew > /dev/null; then
    echo "▶︎ Installing homebrew"
    /usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
  fi;

  echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> /Users/nithin/.zprofile
  eval "$(/opt/homebrew/bin/brew shellenv)"

  echo "▶︎ Installing via brew"
  brew install neovim fzf ripgrep
fi

echo "✅ Installation successful"
