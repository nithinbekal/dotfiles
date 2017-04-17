
" Vundle setup
set nocompatible
filetype off

set rtp+=~/.vim/bundle/Vundle.vim
call vundle#begin()

Plugin 'gmarik/Vundle.vim'

Plugin 'tpope/vim-fugitive' " Git wrapper

call vundle#end()

filetype plugin indent on
" End of Vundle setup

syntax on

set laststatus=2 " Always show status line
set relativenumber
