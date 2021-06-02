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

mkdir -p ~/.vim/tmp
ln -s ~/dotfiles/.vim/snippets ~/.vim/snippets

echo "▶︎ Setting up Neovim config"

mkdir -p ~/.config/nvim
ln -s ~/dotfiles/.config/nvim/init.vim ~/.config/nvim/init.vim

echo "▶︎ Installing plug for neovim"

sh -c 'curl -fLo "${XDG_DATA_HOME:-$HOME/.local/share}"/nvim/site/autoload/plug.vim --create-dirs \
       https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim'

if [[ "$SPIN" = 1 ]]
then
  echo "▶︎ Running repo specific setup scripts"
  . ~/data/setup.sh
fi

echo "✅ Installation successful"
