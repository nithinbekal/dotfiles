
# oh-my-zsh config
DISABLE_AUTO_UPDATE="true"
ZSH=$HOME/.oh-my-zsh
ZSH_THEME="robbyrussell"

plugins=(asdf fzf)

source $ZSH/oh-my-zsh.sh

export EDITOR=nvim
export FZF_DEFAULT_COMMAND='rg --files --hidden --glob "!.git/*"'
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

[ -f /opt/dev/dev.sh ] && source /opt/dev/dev.sh
[ -f ~/.openairc ] && source ~/.openairc # Source OpenAI config for avante.nvim

# The following lines are automatically added by dev. Don't touch them.

[[ -f /opt/dev/sh/chruby/chruby.sh ]] && { type chruby >/dev/null 2>&1 || chruby () { source /opt/dev/sh/chruby/chruby.sh; chruby "$@"; } }

[[ -x /opt/homebrew/bin/brew ]] && eval $(/opt/homebrew/bin/brew shellenv)
