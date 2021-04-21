#! /bin/sh

# Install the dotfiles to the correct paths

set -e

rm "$HOME/.bashrc"
ln -s "$PWD/bashrc" "$HOME/.bashrc"

rm "$HOME/.bin"
ln -s "$PWD/bin" "$HOME/.bin"

rm "$HOME/.ctags"
ln -s "$PWD/ctags" "$HOME/.ctags"

rm "$HOME/.gemrc"
ln -s "$PWD/gemrc" "$HOME/.gemrc"

rm $HOME/.pryrc
ln -s $PWD/.pryrc $HOME

rm "$HOME/.railsrc"
ln -s "$PWD/railsrc" "$HOME/.railsrc"

rm "$HOME/.tmux.conf"
ln -s "$PWD/tmux.conf" "$HOME/.tmux.conf"

rm "$HOME/.vimrc"
ln -s "$PWD/vimrc" "$HOME/.vimrc"

rm "$HOME/.zlogin"
ln -s "$PWD/zlogin" "$HOME/.zlogin"

rm "$HOME/.zshrc"
ln -s "$PWD/zshrc" "$HOME/.zshrc"

rm $HOME/.vim/snippets
ln -s "$PWD/vim-snippets" "$HOME/.vim/snippets"

echo "Setting up Neovim config"
mkdir -p $HOME/.config/nvim
rm $HOME/.config/nvim/init.vim
ln -s $PWD/init.vim $HOME/.config/nvim/init.vim
