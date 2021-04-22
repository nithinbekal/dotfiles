#! /bin/sh

# Install the dotfiles to the correct paths

set -e

if [ $SPIN ]; then
  echo "▶︎ Installing packages"
  sudo apt-get install -y ripgrep fzf neovim
fi

if [ ! -d $ZSH ]; then
  echo "▶︎ Installing oh-my-zsh"
  sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
fi

echo "▶︎ Adding custom scripts to ~/.bin"

rm -f "$HOME/.bin"
ln -s "$PWD/bin" "$HOME/.bin"

echo "▶︎ Installing dotfiles"

dotfiles=(.ctags .gemrc .pryrc .railsrc .vimrc .zshrc)

for file in "${dotfiles[@]}"
do
  echo "▶︎ Linking ${file}"
  rm -f $HOME/$file
  ln -s $PWD/$file $HOME/$file
done

echo "▶︎ Installing vim snippets"

rm -rf $HOME/.vim/snippets
mkdir $HOME/.vim/snippets
ln -s "$PWD/vim-snippets" "$HOME/.vim/snippets"

echo "▶︎ Setting up Neovim config"

mkdir -p $HOME/.config/nvim
rm -f $HOME/.config/nvim/init.vim
ln -s $PWD/.config/nvim/init.vim $HOME/.config/nvim/init.vim

echo "▶︎ Installing plug for neovim"

sh -c 'curl -fLo "${XDG_DATA_HOME:-$HOME/.local/share}"/nvim/site/autoload/plug.vim --create-dirs \
       https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim'

echo "✅ Installation successful"