
# If not running interactively, don't do anything
[ -z "$PS1" ] && return

# don't put duplicate lines or lines starting with space in the history.
# See bash(1) for more options
HISTCONTROL=ignoreboth

# append to the history file, don't overwrite it
shopt -s histappend

# for setting history length see HISTSIZE and HISTFILESIZE in bash(1)
HISTSIZE=1000
HISTFILESIZE=2000

# check the window size after each command and, if necessary,
# update the values of LINES and COLUMNS.
shopt -s checkwinsize

# make less more friendly for non-text input files, see lesspipe(1)
[ -x /usr/bin/lesspipe ] && eval "$(SHELL=/bin/sh lesspipe)"

# enable programmable completion features (you don't need to enable
# this, if it's already enabled in /etc/bash.bashrc and /etc/profile
# sources /etc/bash.bashrc).
if [ -f /etc/bash_completion ] && ! shopt -oq posix; then
    . /etc/bash_completion
fi

## Custom aliases

alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'

function current_branch() {
  ref=$(git symbolic-ref HEAD 2> /dev/null) || \
  ref=$(git rev-parse --short HEAD 2> /dev/null) || return
  echo ${ref#refs/heads/}
}

alias g='git'
alias gst='git status'
alias gco='git checkout'
alias gcm='git commit -m'
alias grhh='git reset HEAD --hard'
alias glog='git log --oneline --decorate --color --graph'
alias ggui='git gui &'
alias ggpull='git pull origin $(current_branch)'
alias ggpush='git push origin $(current_branch)'

# bundle
alias bx='bundle exec'
alias bi='bundle install'
alias bxrc='bundle exec rails c'
alias bxrs='bundle exec rails s'

alias rmrf='rm -rf'
alias reloadsh='source ~/.bashrc'

# Disable flow control for vim
stty -ixon

# Custom scripts

        RED="\[\033[0;31m\]"
     YELLOW="\[\033[0;33m\]"
       BLUE="\[\033[0;34m\]"
      GREEN="\[\033[1;32m\]"
      WHITE="\[\033[1;37m\]"
 COLOR_NONE="\[\e[0m\]"

function parse_git_branch {
  git rev-parse --git-dir &> /dev/null
  git_status="$(git status 2> /dev/null)"
  branch_pattern="^# On branch ([^${IFS}]*)"
  remote_pattern="# Your branch is (.*) of"
  diverge_pattern="# Your branch and (.*) have diverged"
  if [[ ! ${git_status} =~ "working directory clean" ]]; then
    state="${RED} λ"
  else
    state="${GREEN} λ"
  fi

  if [[ ${git_status} =~ ${remote_pattern} ]]; then
    if [[ ${BASH_REMATCH[1]} == "ahead" ]]; then
      remote="${YELLOW}↑"
    else
      remote="${YELLOW}↓"
    fi
  fi
  if [[ ${git_status} =~ ${diverge_pattern} ]]; then
    remote="${YELLOW}↕"
  fi
  if [[ ${git_status} =~ ${branch_pattern} ]]; then
    branch=${BASH_REMATCH[1]}
    echo " (${branch})${remote}${state}"
  fi
}

function prompt_func() {
    previous_return_value=$?;
    prompt="${TITLEBAR}${RED}\w${BLUE}$(parse_git_branch)${COLOR_NONE} "
    if test $previous_return_value -eq 0
    then
        PS1="${prompt}${COLOR_NONE}"
    else
        PS1="${prompt}${COLOR_NONE}"
    fi
}

PROMPT_COMMAND=prompt_func

# Use caps lock key for ESC
xmodmap -e "clear lock"
xmodmap -e "keycode 0x42 = Escape"

# for tmux: export 256color
[ -n "$TMUX" ] && export TERM=screen-256color

# FZF setup
export PATH="$PATH:/usr/local/opt/fzf/bin"
[[ $- == *i* ]] && source "/usr/local/opt/fzf/shell/completion.bash" 2> /dev/null
source "/usr/local/opt/fzf/shell/key-bindings.bash"

export EDITOR=vim

source $HOME/.env.local

. $HOME/.asdf/asdf.sh
. $HOME/.asdf/completions/asdf.bash
