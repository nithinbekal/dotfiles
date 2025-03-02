# Enable persistent history
HISTFILE=~/.zsh_history
HISTSIZE=100000
SAVEHIST=100000

setopt HIST_SAVE_NO_DUPS
setopt INC_APPEND_HISTORY

# Use the up and down keys to navigate the history
bindkey "\e[A" history-beginning-search-backward
bindkey "\e[B" history-beginning-search-forward

# Home and End keys
bindkey "^[[H"  beginning-of-line
bindkey "^[[F"  end-of-line
bindkey "^[[1~" beginning-of-line
bindkey "^[[4~" end-of-line

setopt autocd # Move to diretories without cd

autoload -U compinit; compinit # Initialize completion

export EDITOR=nvim # Set the editor to neovim
export FZF_DEFAULT_COMMAND='rg --files --hidden --glob "!.git/*"' # Set the default command for fzf
export LANG="en_US.UTF-8"
export LC_ALL="en_US.UTF-8"

export PATH=$HOME/dotfiles/bin:$PATH
export PATH=$HOME/.local/bin:$PATH

gfco() { git fetch origin "$1" && git checkout "$1" }
prs() { open "https://github.com/pulls?q=is%3Aopen+is%3Apr+author%3A${1:-@me}+org%3Ashopify" }

# Aliases

alias aliases="cat ~/.zshrc | grep alias | sort | sed -e \"s/^alias\ //\" | column -t -s'='"
alias bx="bundle exec"
alias dotf="cd ~/dotfiles"
alias v="nvim"

# Git Aliases

alias g='git'
alias gbd='git branch -d'
alias gbm="git branch -m"
alias gco='git checkout'
alias gd='git diff'
alias gdm="git diff main"
alias ggpull='git pull origin $(git_current_branch)'
alias gfp='git push origin $(git_current_branch) --force-with-lease'
alias glog='git log --oneline'
alias gp='git push origin $(git_current_branch)'
alias grc="git rebase --continue"
alias grhh='git reset HEAD --hard'
alias grim="git rebase -i main"
alias grm="git rebase main"
alias grx="git rebase --abort"
alias gst='git status'
alias gsta='git stash'
alias gstp='git stash pop'

# This file is for stuff that varies between work and personal machines, and isn't included in the repo.
[ -f ~/.zshrc.local ] && source ~/.zshrc.local

# The following lines are automatically added by dev. Don't touch them.

[ -f /opt/dev/dev.sh ] && source /opt/dev/dev.sh

[[ -f /opt/dev/sh/chruby/chruby.sh ]] && { type chruby >/dev/null 2>&1 || chruby () { source /opt/dev/sh/chruby/chruby.sh; chruby "$@"; } }

[[ -x /opt/homebrew/bin/brew ]] && eval $(/opt/homebrew/bin/brew shellenv)

source <(fzf --zsh)

eval "$(starship init zsh)"
