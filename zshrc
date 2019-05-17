
# oh-my-zsh config
DISABLE_AUTO_UPDATE="true"
ZSH=$HOME/.oh-my-zsh
ZSH_THEME="robbyrussell"

source $ZSH/oh-my-zsh.sh
source $HOME/.env.local

export DISABLE_AUTO_TITLE="true" # Tmux changes the window title without this
export EDITOR=nvim
export FZF_DEFAULT_COMMAND='rg --files --hidden --glob "!.git/*"'
export JAVA_HOME="/Library/Java/JavaVirtualMachines/jdk1.8.0_92.jdk/Contents/Home"
export LANG="en_US.UTF-8"
export LC_ALL="en_US.UTF-8"

alias aliases="cat ~/.zshrc | grep alias | sort | sed -e \"s/^alias\ //\" | column -t -s'='"
alias bx="bundle exec"
alias dokku='bash $HOME/.dokku/contrib/dokku_client.sh --rm'
alias dotf="tmux new -s dotfiles -c ~/.dotfiles  \; send-keys \"nvim -c 'FZF'\" C-m"
alias e="emacs -nw"
alias profile-emacs="emacs -nw -Q -l ~/.emacs.d/profile.el -f profile-dotemacs"
alias v="nvim"
alias vim-swp-clear="rm -rf ~/.vim/tmp/*.swp"
alias wiki="tmux new -s wiki -c ~/Dropbox/wiki \; send-keys \"nvim -c 'FZF'\" C-m"

# Alt + left/right arrows
bindkey "^[^[[D" backward-word
bindkey "^[^[[C" forward-word

ssh-add &>/dev/null

# This config is taken from ~/.fzf.zsh which was generated during shell
# extension installation using /usr/local/opt/fzf/install
export PATH="$PATH:/usr/local/opt/fzf/bin"
[[ $- == *i* ]] && source "/usr/local/opt/fzf/shell/completion.zsh" 2> /dev/null
source "/usr/local/opt/fzf/shell/key-bindings.zsh"

export PATH=$PATH:$HOME/.bin
export PATH=$PATH:/usr/local/sbin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/X11/bin:/usr/X11/bin:/usr/local/git/bin
export PATH=/usr/local/bin:$PATH

# Git setup
# Based on ohmyzsh git plugin:
# https://github.com/robbyrussell/oh-my-zsh/blob/master/plugins/git/git.plugin.zsh

# Query/use custom command for `git`.
zstyle -s ":vcs_info:git:*:-all-" "command" _omz_git_git_cmd
: ${_omz_git_git_cmd:=git}

git_fetch_and_checkout() { git fetch origin "$1" && git checkout "$1" }

function git-formatted-branches() {
  git for-each-ref --sort=-committerdate --sort=-author  refs/heads/ \
    --format='%(HEAD),%(refname:short),%(contents:subject),%(authorname),%(committerdate:relative)'\
    | column -t -s ','
}

function git-group-formatted-branches() {
  local name=$(git config --global user.name)
  git-formatted-branches | grep "${name}"
  echo '---'
  git-formatted-branches | grep -v ${name}
}

# Git Aliases

alias g='git'

alias gbd='git branch -d'
alias gbf="git-group-formatted-branches"
alias gbm="git branch -m"
alias gco='git checkout'
alias gd='git diff'
alias gdm="git diff master"
alias ggpull='git pull origin $(git_current_branch)'
alias ggpush='git push origin $(git_current_branch)'
alias gfco='git_fetch_and_checkout'
alias gfp='git push origin $(git_current_branch) --force-with-lease'
alias glg='git log --stat'
alias glog='git log --oneline --decorate --graph'
alias grc="git rebase --continue"
alias grhh='git reset HEAD --hard'
alias grim="git rebase -i master"
alias grm="git rebase master"
alias grx="git rebase --abort"
alias gst='git status'
alias gsta='git stash'
alias gstp='git stash pop'

. $HOME/.asdf/asdf.sh
. $HOME/.asdf/completions/asdf.bash
