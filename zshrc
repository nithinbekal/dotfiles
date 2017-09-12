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
alias e="emacs -nw"
alias gbm="git branch -m"
alias gsc="git checkout -b scratchpad"
alias profile-emacs="emacs -nw -Q -l ~/.emacs.d/profile.el -f profile-dotemacs"
alias todo="vim ~/Dropbox/todo/gtd.md"
alias v="nvim"
alias vim-swp-clear="rm -rf ~/.tmp/*.swp"

# Alt + left/right arrows
bindkey "^[^[[D" backward-word
bindkey "^[^[[C" forward-word

ssh-add &>/dev/null

# Tmux changes the window title without this
DISABLE_AUTO_TITLE="true"

export FZF_DEFAULT_COMMAND='rg --files --hidden --follow --glob "!.git/*"'

export PATH=$PATH:/usr/local/sbin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/X11/bin:/usr/X11/bin:/usr/local/git/bin
export PATH=/usr/local/bin:$PATH
export PATH=~/.bin:$PATH

PATH=$PATH:$HOME/.rvm/bin # Add RVM to PATH for scripting

export EDITOR=vim

export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin

export NVM_DIR=$HOME/.nvm
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

export JAVA_HOME="/Library/Java/JavaVirtualMachines/jdk1.8.0_92.jdk/Contents/Home"

export RUBYMOTION_ANDROID_SDK=/Users/nithin/.rubymotion-android/sdk
export RUBYMOTION_ANDROID_NDK=/Users/nithin/.rubymotion-android/ndk
