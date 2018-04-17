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

### Tmux

**Battery status**:
To setup battery status in tmux,
the following is required:

```bash
wget https://raw.github.com/Goles/Battery/master/battery
mv battery /usr/local/bin
chmod u+x /usr/local/bin/battery
```

## Fonts

vim-airline is configured to use powerline fonts to display non-ASCII characters.
To get this to work, powerline fonts need to be installed.

```bash
git clone https://github.com/powerline/fonts.git /tmp/powerline-fonts
/tmp/powerline-fonts/install.sh
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

### Pry Debugging

I use pry for debugging Ruby programs, and I've set up an `.inputrc` file
to use vi mode and add a couple of shortcuts in normal mode:

```
C-n: execute next line (equivalent to typing "next" and hitting enter)
C-s: step through the code (equivalent to typing "step" and hitting enter)
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
