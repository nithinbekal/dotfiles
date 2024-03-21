# Nithin Bekal's dotfiles

This repo will contain the dot files I use to configure my system. The
[bin](bin) directory contains some utility scripts that get copied to `~/.bin`.

## Install

```bash
git clone git@github.com:nithinbekal/dotfiles.git
cd dotfiles
./install.sh
```
### Fonts

I use Fira Code, patched by [Nerd Fonts](https://www.nerdfonts.com/).
To install it:

```bash
brew tap homebrew/cask-fonts
brew install font-fira-code-nerd-font
```

### iTerm settings

After running ./install.sh on a new computer,
the following settings need to be changed in iTerm

- General > Window
  - Native full screen windows: false
- Profiles > Colors
  - Color presets: Tango dark
- Profiles > Text
  - Font: FiraCode Nerd Font Mono, Retina
  - Font size: 13
  - Vertical space: 112
  - Use ligatures: true
- Profiles > Terminal
  - Enable mouse reporting
    - Report mouse wheel events: true
    - Everything else: false

### VS Code and Sublime

My config for VS Code and Sublime are in `editors/`, but these are not
automatically installed.

VS Code has problems with repeated keystrokes with the vim plugin on MacOS,
([details](https://wesleywiser.github.io/post/vscode-vim-repeat-osx/))
so this command needs to be run to fix that:

```bash
defaults write com.microsoft.VSCode ApplePressAndHoldEnabled -bool false
```
