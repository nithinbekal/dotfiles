#! /bin/sh

# Install the dotfiles to the correct paths

set -e

if [ $SPIN ]; then
  echo "Installing packages"
  sudo apt-get install -y ripgrep fzf neovim
fi

if [ ! -d $ZSH ]; then
  echo "Installing oh-my-zsh"
  sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
fi

rm -f "$HOME/.bin"
ln -s "$PWD/bin" "$HOME/.bin"

rm -f "$HOME/.ctags"
ln -s "$PWD/ctags" "$HOME/.ctags"

rm -f "$HOME/.gemrc"
ln -s "$PWD/gemrc" "$HOME/.gemrc"

rm -f "$HOME/.pryrc"
ln -s "$PWD/.pryrc" "$HOME/.pryrc"

rm -f "$HOME/.railsrc"
ln -s "$PWD/railsrc" "$HOME/.railsrc"

rm -f "$HOME/.tmux.conf"
ln -s "$PWD/tmux.conf" "$HOME/.tmux.conf"

rm -f "$HOME/.vimrc"
ln -s "$PWD/vimrc" "$HOME/.vimrc"

rm -f "$HOME/.zshrc"
ln -s "$PWD/zshrc" "$HOME/.zshrc"

rm -rf $HOME/.vim/snippets
mkdir $HOME/.vim/snippets
ln -s "$PWD/vim-snippets" "$HOME/.vim/snippets"

echo "Setting up Neovim config"
mkdir -p $HOME/.config/nvim
rm -f $HOME/.config/nvim/init.vim
ln -s $PWD/init.vim $HOME/.config/nvim/init.vim

echo "Installing plug for neovim"
sh -c 'curl -fLo "${XDG_DATA_HOME:-$HOME/.local/share}"/nvim/site/autoload/plug.vim --create-dirs \
       https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim'

echo "✅ Installation successful"
