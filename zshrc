# Path to your oh-my-zsh configuration.
ZSH=$HOME/.oh-my-zsh

ZSH_THEME="robbyrussell"
DISABLE_AUTO_UPDATE="true"

plugins=(git sublime)

source $ZSH/oh-my-zsh.sh

LANG=en_US.UTF-8

# Customize to your needs...
alias bx="bundle exec"
alias lock="/System/Library/CoreServices/Menu\ Extras/User.menu/Contents/Resources/CGSession -suspend"
alias ggui="git gui &"

# Allow vim to accept Ctrl+S
alias vim="stty stop '' -ixoff ; vim"
ttyctl -f # `Frozing' tty, so after any command terminal settings will be restored


export PATH=$PATH:/usr/local/sbin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/X11/bin:/usr/X11/bin:/usr/local/git/bin
export PATH=/usr/local/bin:$PATH

PATH=$PATH:$HOME/.rvm/bin # Add RVM to PATH for scripting
