# Nithin Bekal's dotfiles

This repo will contain the dot files I use to configure my system. The
[bin](bin) directory contains some utility scripts that get copied to `~/.bin`.

## Install

```bash
git clone git@github.com:nithinbekal/dotfiles.git
cd dotfiles
bin/install
```

## Vimrc dependencies

Before using Vim with this .vimrc, [Vundle](https://github.com/gmarik/Vundle.vim) needs to be installed:

    git clone https://github.com/gmarik/Vundle.vim.git ~/.vim/bundle/Vundle.vim
    vim +PluginInstall +qall

The following tools need to be installed as well:

- [ag](https://github.com/ggreer/the_silver_searcher)
- [fzf](https://github.com/junegunn/fzf)
- [ripgrep](https://github.com/BurntSushi/ripgrep)

### Map Esc to Caps Lock (macOS)

Since macOS Sierra (10.12):

- System Preferences > Keyboard > Modifier keys: Set Caps Lock to Escape.

### iTerm Settings

- Preferences > General > Load preferences from custom folder or url
  - Set it to `dotfiles_path/items2/com.googlecode.iterm2.plist`

### Other editors

My config for VS Code and Sublime are in `editors/`, but these are not
automatically installed.

VS Code has problems with repeated keystrokes with the vim plugin on MacOS,
([details](https://wesleywiser.github.io/post/vscode-vim-repeat-osx/))
so this command needs to be run to fix that:

```bash
defaults write com.microsoft.VSCode ApplePressAndHoldEnabled -bool false
```

