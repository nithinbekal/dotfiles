# Nithin Bekal's dotfiles

This repo will contain the dot files I use to configure my system. The
[bin](bin) directory contains some utility scripts that get copied to `~/.bin`.

## Install

```bash
git clone git@github.com:nithinbekal/dotfiles.git
cd dotfiles
bin/install
```

## Vim and Tmux

My editor of choice is vim, and I use Neovim from the terminal.

My setup depends on
[Neovim](http://neovim.io),
[ag](https://github.com/ggreer/the_silver_searcher),
[fzf](https://github.com/junegunn/fzf)
and
[ripgrep](https://github.com/BurntSushi/ripgrep).

Tmux needs
[reattach-to-user-namespace](https://github.com/ChrisJohnsen/tmux-MacOSX-pasteboard)
to make sure pbcopy and pbpaste commands work properly.

```bash
brew install neovim ag fzf ripgrep reattach-to-user-namespace
```

## Fonts

vim-airline is configured to use powerline fonts to display non-ASCII characters.
To get this to work, powerline fonts need to be installed.

```bash
git clone https://github.com/powerline/fonts.git /tmp/powerline-fonts
/tmp/powerline-fonts/install
rm -rf /tmp/powerline-fonts
```

Then, set a powerline font in Preferences > Profile > Text > Non-ASCII font.
I use Menlo, which is not available in powerline fonts,
but "Robot Mono for Powerline" works well with it.

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

