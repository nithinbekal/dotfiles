
# oh-my-zsh config
DISABLE_AUTO_UPDATE="true"
ZSH=$HOME/.oh-my-zsh
ZSH_THEME="jaischeema"

source $ZSH/oh-my-zsh.sh

export EDITOR=nvim
export FZF_DEFAULT_COMMAND='rg --files --hidden --glob "!.git/*"'
export LANG="en_US.UTF-8"
export LC_ALL="en_US.UTF-8"

ssh-add &>/dev/null

gfco() { git fetch origin "$1" && git checkout "$1" }

# USAGE: git-churn --since='6 months ago' .
#
git-churn() {
  git log --all -M -C --name-only --format='format:' "$@" \
    | sort \
    | grep -v '^$' \
    | uniq -c \
    | sort -nr \
    | awk 'BEGIN {print "count\tfile"} {print $1 "\t" $2}'
}

# Kill process running on a port
# USAGE: killport 3000
#
killport() { kill -9 $(lsof -t -i:$1) 2>/dev/null }

# Open prs by author (defaults to @me)
prs() { open "https://github.com/pulls?q=is%3Aopen+is%3Apr+author%3A${1:-@me}+org%3Ashopify" }

# Spin up current branch
function sucb() { spin up shopify --name ${git_current_branch} -c shopify.branch=${git_current_branch} }

# Aliases

alias aliases="cat ~/.zshrc | grep alias | sort | sed -e \"s/^alias\ //\" | column -t -s'='"
alias bx="bundle exec"
alias blog="cd ~/src/nithinbekal.github.io"
alias dokku='bash $HOME/.dokku/contrib/dokku_client.sh --rm'
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
alias glg='git log --stat'
alias glog='git log --oneline --decorate --graph'
alias gp='git push origin $(git_current_branch)'
alias grc="git rebase --continue"
alias grhh='git reset HEAD --hard'
alias grim="git rebase -i main"
alias grm="git rebase main"
alias grx="git rebase --abort"
alias gst='git status'
alias gsta='git stash'
alias gstp='git stash pop'

if [ -f $HOME/.fzf.zsh ]; then
  . $HOME/.fzf.zsh
fi

if [ -f $HOME/.asdf/asdf.sh ]; then
  . $HOME/.asdf/asdf.sh
  . $HOME/.asdf/completions/asdf.bash
fi

if [ -e /Users/nithinbekal/.nix-profile/etc/profile.d/nix.sh ]; then . /Users/nithinbekal/.nix-profile/etc/profile.d/nix.sh; fi # added by Nix installer

[ -f /opt/dev/dev.sh ] && source /opt/dev/dev.sh

[[ -f /opt/dev/sh/chruby/chruby.sh ]] && { type chruby >/dev/null 2>&1 || chruby () { source /opt/dev/sh/chruby/chruby.sh; chruby "$@"; } }

[[ -x /opt/homebrew/bin/brew ]] && eval $(/opt/homebrew/bin/brew shellenv)

# Source OpenAI config for avante.nvim
[ -f ~/.openairc ] && source ~/.openairc
