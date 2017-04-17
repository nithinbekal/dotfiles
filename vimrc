
" Vundle setup
set nocompatible
filetype off

set rtp+=~/.vim/bundle/Vundle.vim
call vundle#begin()

Plugin 'gmarik/Vundle.vim'

Plugin 'ctrlpvim/ctrlp.vim'               " Fuzzy file search
Plugin 'jceb/vim-orgmode'                 " Org mode
Plugin 'mileszs/ack.vim'                  " Use Ag for search
Plugin 'mortice/pbcopy.vim'               " Easy copy paste in terminal vim
Plugin 'nanotech/jellybeans.vim'          " Jellybeans color scheme
Plugin 'rizzatti/dash.vim'                " Documentation lookup using Dash.app
Plugin 'tpope/vim-fugitive'               " Git wrapper
Plugin 'tpope/vim-speeddating'            " Inc/decrement dates - Needed by vim-orgmode

call vundle#end()

filetype plugin indent on
" End of Vundle setup

syntax on

colorscheme jellybeans

set expandtab                   " Tab settings - Use spaces to insert a tab
set backupdir=~/.tmp            " Don't clutter my dirs with swp/tmp files
set colorcolumn=80              " Show vertical bar to indicate 80 chars
set directory=~/.tmp            " Don't clutter my dirs with swp/tmp files
set hlsearch                    " Search: Highlight results
set ignorecase smartcase        " Search: ignore case, unless uppercase chars given
set incsearch                   " Search: Show results as you type
set laststatus=2                " Always show status line
set relativenumber number       " Line numbers: Show current #, but use relative #s elsewhere
set shiftround                  " Indentation: When at 3 spaces, >> takes to 4, not 5
set shiftwidth=2                " Tab settings - Use 2 spaces for each indent level
set softtabstop=2               " Tab settings - Count 2 spaces in editing operations
set splitbelow                  " Open new split panes below
set splitright                  " Open new split panes to the right


let g:ackprg = 'ag --vimgrep'

" Status line configuration
set statusline=%m\ %f
set statusline+=\ %{fugitive#statusline()}
set statusline+=%=%l/%L\ [%P]\ C:%c

highlight StatusLine ctermfg=white ctermbg=blue


" Leader key settings

let mapleader = ","

map  <leader>dd   :Dash<cr>
map  <leader>f    :Ack<space>
map  <leader>gs   :Gstatus<cr>
map  <leader>n    :nohl<cr>
map  <leader>q    :bd<cr>
map  <leader>gg   :tabe ~/Dropbox/org/main.org<cr>
map  <leader>vn   :vnew<cr>:CtrlP<cr>

map K   <nop>
map Q   @q

vmap <F2> :w !pbcopy<CR><CR>
map  <F3> :r !pbpaste<CR>

nnoremap <C-h> <C-w><C-h>
nnoremap <C-j> <C-w><C-j>
nnoremap <C-k> <C-w><C-k>
nnoremap <C-l> <C-w><C-l>

map  <C-s> <esc>:w<CR>
imap <C-s> <esc>:w<CR>

" I often mistype Q and Wq
command! Q  q
command! Wq wq
