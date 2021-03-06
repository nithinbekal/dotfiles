
# oh-my-zsh config
DISABLE_AUTO_UPDATE="true"
ZSH=$HOME/.oh-my-zsh
ZSH_THEME="bira"

source $ZSH/oh-my-zsh.sh

export DISABLE_AUTO_TITLE="true" # Tmux changes the window title without this
export EDITOR=nvim
export FZF_DEFAULT_COMMAND='rg --files --hidden --glob "!.git/*"'
export LANG="en_US.UTF-8"
export LC_ALL="en_US.UTF-8"

ssh-add &>/dev/null

# This config is taken from ~/.fzf.zsh which was generated during shell
# extension installation using /usr/local/opt/fzf/install
export PATH="$PATH:/usr/local/opt/fzf/bin"

if [ ! $SPIN ]; then
  [[ $- == *i* ]] && source "/usr/local/opt/fzf/shell/completion.zsh" 2> /dev/null
  source "/usr/local/opt/fzf/shell/key-bindings.zsh"
fi

export PATH=$PATH:$HOME/dotfiles/bin
export PATH=/usr/local/bin:$PATH
export PATH=/usr/local/smlnj/bin:$PATH

git_fetch_and_checkout() { git fetch origin "$1" && git checkout "$1" }

# Aliases

alias aliases="cat ~/.zshrc | grep alias | sort | sed -e \"s/^alias\ //\" | column -t -s'='"
alias bx="bundle exec"
alias blog="cd ~/Dropbox/blog && nvim -c 'FZF'"
alias dokku='bash $HOME/.dokku/contrib/dokku_client.sh --rm'
alias dotf="cd ~/dotfiles && nvim -c 'FZF'"
alias e="emacs -nw"
alias profile-emacs="emacs -nw -Q -l ~/.emacs.d/profile.el -f profile-dotemacs"
alias retag="ctags -R --exclude=public --exclude=app/assets/javascripts ."
alias v="nvim"
alias wiki="cd ~/Dropbox/wiki && nvim -c 'FZF'"

# Git Aliases

alias g='git'
alias gbd='git branch -d'
alias gbm="git branch -m"
alias gco='git checkout'
alias gd='git diff'
alias gdm="git diff master"
alias ggpull='git pull origin $(git_current_branch)'
alias gfco='git_fetch_and_checkout'
alias gfp='git push origin $(git_current_branch) --force-with-lease'
alias glg='git log --stat'
alias glog='git log --oneline --decorate --graph'
alias gp='git push origin $(git_current_branch)'
alias grc="git rebase --continue"
alias grhh='git reset HEAD --hard'
alias grim="git rebase -i master"
alias grm="git rebase master"
alias grx="git rebase --abort"
alias gst='git status'
alias gsta='git stash'
alias gstp='git stash pop'

if [ -f $HOME/.asdf/asdf.sh ]; then
  . $HOME/.asdf/asdf.sh
  . $HOME/.asdf/completions/asdf.bash
fi

if [ -e /Users/nithinbekal/.nix-profile/etc/profile.d/nix.sh ]; then . /Users/nithinbekal/.nix-profile/etc/profile.d/nix.sh; fi # added by Nix installer

[ -f /opt/dev/dev.sh ] && source /opt/dev/dev.sh
