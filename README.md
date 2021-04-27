# Nithin Bekal's dotfiles

This repo will contain the dot files I use to configure my system. The
[bin](bin) directory contains some utility scripts that get copied to `~/.bin`.

## Install

```bash
git clone git@github.com:nithinbekal/dotfiles.git
cd dotfiles
./install.sh
```

## Vim

My editor of choice is vim, and I use Neovim from the terminal.

My setup depends on
[Neovim](http://neovim.io),
[ag](https://github.com/ggreer/the_silver_searcher),
[fzf](https://github.com/junegunn/fzf)
and
[ripgrep](https://github.com/BurntSushi/ripgrep).

```bash
brew install neovim ag fzf ripgrep
```

### Map Esc to Caps Lock (macOS)

Since macOS Sierra (10.12):

- System Preferences > Keyboard > Modifier keys: Set Caps Lock to Escape.

### VS Code and Sublime

My config for VS Code and Sublime are in `editors/`, but these are not
automatically installed.

VS Code has problems with repeated keystrokes with the vim plugin on MacOS,
([details](https://wesleywiser.github.io/post/vscode-vim-repeat-osx/))
so this command needs to be run to fix that:

```bash
defaults write com.microsoft.VSCode ApplePressAndHoldEnabled -bool false
```

### Example function for starting up a Rails project in tmux

```bash
function tmux-my-project {
  cd my-project

  tmux start-server

  tmux new-session -d -s myproject -n main
  tmux split-window -h -p 34

  tmux new-window -n server
  tmux select-pane -t 1
  tmux send-keys "bundle exec rails server" C-m

  tmux select-window -t 1
  tmux select-pane -t 1

  tmux send-keys "nvim" C-m

  tmux -u attach-session -d -t myproject
}
```
