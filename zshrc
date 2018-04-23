# Path to your oh-my-zsh configuration.
ZSH=$HOME/.oh-my-zsh

ZSH_THEME="robbyrussell"
DISABLE_AUTO_UPDATE="true"

plugins=(git)

source $ZSH/oh-my-zsh.sh
source $HOME/.env.local

export LANG="en_US.UTF-8"
export LC_ALL="en_US.UTF-8"

alias bx="bundle exec"
alias dn="cd ~/Dropbox/notes"
alias dnv="cd ~/Dropbox/notes && vim"
alias dotf="tmux new -s dotfiles -c ~/.dotfiles  \; send-keys \"nvim -c 'FZF'\" C-m"
alias e="emacs -nw"
alias gbm="git branch -m"
alias gdm="git diff master"
alias grc="git rebase --continue"
alias grim="git rebase -i master"
alias grm="git rebase master"
alias grx="git rebase --abort"
alias gs="git stash"
alias gsc="git checkout -b scratchpad"
alias gsp="git stash pop"
alias notes="tmux new -s notes -c ~/Dropbox/notes  \; send-keys \"nvim index\" C-m"
alias profile-emacs="emacs -nw -Q -l ~/.emacs.d/profile.el -f profile-dotemacs"
alias todo="vim ~/Dropbox/todo/gtd.md"
alias v="nvim"
alias vim-swp-clear="rm -rf ~/.vim/tmp/*.swp"
alias wiki="tmux new -s wiki -c ~/Dropbox/wiki \; send-keys \"nvim -c 'FZF'\" C-m"

# Alt + left/right arrows
bindkey "^[^[[D" backward-word
bindkey "^[^[[C" forward-word

ssh-add &>/dev/null

export EDITOR=nvim

# Tmux changes the window title without this
export DISABLE_AUTO_TITLE="true"


# FZF setup

export FZF_DEFAULT_COMMAND='rg --files --hidden --glob "!.git/*"'

# The config below is taken from ~/.fzf.zsh which was generated during shell
# extension installation using /usr/local/opt/fzf/install
export PATH="$PATH:/usr/local/opt/fzf/bin"
[[ $- == *i* ]] && source "/usr/local/opt/fzf/shell/completion.zsh" 2> /dev/null
source "/usr/local/opt/fzf/shell/key-bindings.zsh"

export PATH=$PATH:$HOME/.bin

export PATH=$PATH:/usr/local/sbin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/X11/bin:/usr/X11/bin:/usr/local/git/bin
export PATH=/usr/local/bin:$PATH

export PATH=$PATH:$HOME/.rvm/bin # Add RVM to PATH for scripting

export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin

export NVM_DIR=$HOME/.nvm
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

export JAVA_HOME="/Library/Java/JavaVirtualMachines/jdk1.8.0_92.jdk/Contents/Home"

export RUBYMOTION_ANDROID_SDK=/Users/nithin/.rubymotion-android/sdk
export RUBYMOTION_ANDROID_NDK=/Users/nithin/.rubymotion-android/ndk
