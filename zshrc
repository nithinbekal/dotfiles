# Path to your oh-my-zsh configuration.
ZSH=$HOME/.oh-my-zsh

ZSH_THEME="robbyrussell"
DISABLE_AUTO_UPDATE="true"

plugins=(git)

source $ZSH/oh-my-zsh.sh

LANG=en_US.UTF-8

alias bx="bundle exec"
alias lock="/System/Library/CoreServices/Menu\ Extras/User.menu/Contents/Resources/CGSession -suspend"

alias vim="stty stop '' -ixoff ; vim" # Allow vim to accept Ctrl+S
ttyctl -f                             # `Frozing' tty, so after any command terminal settings will be restored

export PATH=$PATH:/usr/local/sbin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/X11/bin:/usr/X11/bin:/usr/local/git/bin
export PATH=/usr/local/bin:$PATH
export PATH=~/.bin:$PATH

# Use caps lock key for ESC
xmodmap -e "clear lock"
xmodmap -e "keycode 0x42 = Escape"

# for tmux: export 256color
[ -n "$TMUX" ] && export TERM=xterm-color

PATH=$PATH:$HOME/.rvm/bin # Add RVM to PATH for scripting
