
" Vundle setup
set nocompatible
filetype off

set rtp+=~/.vim/bundle/Vundle.vim
call vundle#begin()

Plugin 'gmarik/Vundle.vim'

Plugin 'ctrlpvim/ctrlp.vim'               " Fuzzy file search
Plugin 'mileszs/ack.vim'                  " Use Ag for search
Plugin 'nanotech/jellybeans.vim'          " Jellybeans color scheme
Plugin 'tpope/vim-fugitive'               " Git wrapper

call vundle#end()

filetype plugin indent on
" End of Vundle setup

syntax on

colorscheme jellybeans

set expandtab                   " Tab settings - Use spaces to insert a tab
set backupdir=~/.tmp            " Don't clutter my dirs with swp/tmp files
set colorcolumn=80              " Show vertical bar to indicate 80 chars
set directory=~/.tmp            " Don't clutter my dirs with swp/tmp files
set hlsearch                    " Highlight search results
set incsearch                   " Show search results as you type
set laststatus=2                " Always show status line
set relativenumber              " Use relative line numbers
set shiftround                  " Indentation: When at 3 spaces, >> takes to 4, not 5
set shiftwidth=2                " Tab settings - Use 2 spaces for each indent level
set softtabstop=2               " Tab settings - Count 2 spaces in editing operations
set splitbelow                  " Open new split panes below
set splitright                  " Open new split panes to the right


let g:ackprg = 'ag --vimgrep'


" Leader key settings

let mapleader = ","

map  <leader>f    :Ack<space>
map  <leader>gs   :Gstatus<cr>
map  <leader>n    :nohl<cr>
map  <leader>q    :bd<cr>

map  <C-s> <esc>:w<CR>
imap <C-s> <esc>:w<CR>

" I often mistype Q and Wq
command! Q  q
command! Wq wq
