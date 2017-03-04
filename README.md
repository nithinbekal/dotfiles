# Nithin Bekal's dotfiles

This repo will contain the dot files I use to configure my system. The
[bin](bin) directory contains some utility scripts that get copied to `~/.bin`.

## Install

    git clone git@github.com:nithinbekal/dotfiles.git
    cd dotfiles
    rake install

## Vim

Before using Vim with this .vimrc, [Vundle](https://github.com/gmarik/Vundle.vim) needs to be installed:

    git clone https://github.com/gmarik/Vundle.vim.git ~/.vim/bundle/Vundle.vim
    vim +PluginInstall +qall

- Install [Ag](https://github.com/ggreer/the_silver_searcher)

### Map Esc to Caps Lock (macOS)

Since macOS Sierra (10.12):

- System Preferences > Keyboard > Modifier keys: Set Caps Lock to Escape.

Older versions

- System Preferences > Keyboard > Modifier keys: Set Caps Lock to no action.
- Install [Seil](https://pqrs.org/macosx/keyremap4macbook/pckeyboardhack.html.en) utility.
- PCKeyboardHack: Change CapsLock key to 53 (ESC)

### iTerm Settings

- Settings > Profiles > General > Working directory
  - Set to "Reuse previous session's directory"

