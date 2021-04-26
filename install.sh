#! /bin/bash

set -e

if [ $SPIN ]; then
  echo "▶︎ Installing packages"
  sudo apt-get install -y neovim ripgrep universal-ctags
fi

echo "▶︎ Moving utility scripts to ~/.bin"

rm -f "$HOME/.bin"
ln -s "~/dotfiles/bin" "$HOME/.bin"

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
  rm -f $HOME/$file
  ln -s ~/dotfiles/$file $HOME/$file
done

echo "▶︎ Linking .vim directory"

mkdir -p $HOME/.vim/tmp
ln -s ~/dotfiles/.vim/snippets $HOME/.vim/snippets

echo "▶︎ Setting up Neovim config"

mkdir -p $HOME/.config/nvim
ln -s ~/dotfiles/.config/nvim/init.vim $HOME/.config/nvim/init.vim

echo "▶︎ Installing plug for neovim"

sh -c 'curl -fLo "${XDG_DATA_HOME:-$HOME/.local/share}"/nvim/site/autoload/plug.vim --create-dirs \
       https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim'

echo "✅ Installation successful"
