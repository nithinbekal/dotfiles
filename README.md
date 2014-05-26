#### Nithin Bekal's dotfiles

This repo will contain the dot files I use to configure my system. I'm using
this with both OSX and Elementary OS.

## Install

    git clone git@github.com:nithinbekal/dotfiles.git
    cd dotfiles
    rake install

## Vim

Before using Vim with this .vimrc, Vundle needs to be installed:

    git clone https://github.com/gmarik/Vundle.vim.git ~/.vim/bundle/Vundle.vim

After opening Vim, install plugins using the :BundleInstall command.

### Map Esc to Caps Lock (OSX)

* Install [PCKeyboardHack](https://pqrs.org/macosx/keyremap4macbook/pckeyboardhack.html.en) utility.
* System Preferences > Keyboard > Modifier keys: Set Caps Lock to no action.
* PCKeyboardHack: Change CapsLock key to 53 (ESC)

### Install ack fr ack.vim plugin

For Ubuntu > 12.04

     sudo apt-get install ack-grep

Ubuntu <= 12.04 only has ack 1.96 in repositories; ack.vim needs >= 2.0.

   sudo add-apt-repository ppa:leonard-ehrenfried/ack2
   sudo apt-get update
   sudo apt-get install ack-grep

