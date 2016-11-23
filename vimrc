
" Vundle setup

set nocompatible " Required by vundle
filetype off     " Required by vundle

" set the runtime path to include Vundle and initialize
set rtp+=~/.vim/bundle/Vundle.vim
call vundle#begin()

Plugin 'gmarik/Vundle.vim'

Plugin 'c-brenn/phoenix.vim'
Plugin 'elixir-lang/vim-elixir'
Plugin 'garbas/vim-snipmate'
Plugin 'guns/vim-clojure-static'
Plugin 'janko-m/vim-test'
Plugin 'kchmck/vim-coffee-script'
Plugin 'kien/ctrlp.vim'
Plugin 'lambdatoast/elm.vim'
Plugin 'ludovicchabant/vim-gutentags'           " Generate tags on save
Plugin 'MarcWeber/vim-addon-mw-utils'           " Needed by snipmate
Plugin 'mattn/emmet-vim'
Plugin 'mileszs/ack.vim'
Plugin 'mortice/pbcopy.vim'
Plugin 'nanotech/jellybeans.vim'                " Color scheme
Plugin 'rhysd/vim-crystal'
Plugin 'rizzatti/dash.vim'
Plugin 'slashmili/alchemist.vim'
Plugin 'terryma/vim-multiple-cursors'
Plugin 'tomtom/tlib_vim'                        " Needed by snipmate
Plugin 'Townk/vim-autoclose'
Plugin 'tpope/vim-commentary'
Plugin 'tpope/vim-dispatch'
Plugin 'tpope/vim-endwise'
Plugin 'tpope/vim-fireplace'
Plugin 'tpope/vim-fugitive'
Plugin 'tpope/vim-projectionist'                " Needed by phoenix.vim
Plugin 'tpope/vim-rails'
Plugin 'tpope/vim-surround'
Plugin 'tpope/vim-unimpaired'
Plugin 'vim-airline/vim-airline'
Plugin 'vim-ruby/vim-ruby'

call vundle#end() " All of your Plugins must be added before this

set t_Co=256 " Needed for colors to work on gnome-terminal

syntax on                 " Enable syntax highlighting
filetype plugin indent on " Enable filetype-specific indenting and plugins


let mapleader = ","

map <leader>,   :CtrlP<cr>
map <leader>.   :w<cr>:TestSuite<cr>
map <leader>dd :Dash<cr>
map <Leader>f :Ack 
map <Leader>gac :Gcommit -m -a ""<LEFT>
map <Leader>gc :Gcommit -m ""<LEFT>
map <Leader>gs :Gstatus<CR>
map <Leader>gw :!git add . && git commit -m 'WIP' && git push<cr>
map <Leader>h :%s/
map <Leader>md :!mkdir -p 
map <Leader>mv :call RenameFile()<cr>
map <Leader>n :nohl<cr>
map <Leader>q :bd<cr>
map <Leader>rc :Econtroller 
map <Leader>rm :!rm %
map <Leader>rv :Eview 
map <Leader>s :A<cr>
map <Leader>v :vnew<cr>

" Upcase previous word in insert mode
inoremap <C-x>c <esc>bgUWea

" Vim
map <Leader>vi :tabe ~/.vimrc<CR>
nmap <Leader>bi :source ~/.vimrc<cr>:PluginInstall<cr>
map <Leader>gt :tabe ~/Dropbox/todo/gtd.md<CR>
map <Leader>gg :tabe ~/Dropbox/todo/work.md<CR>

" Elm

nnoremap <leader>el :ElmEvalLine<CR>
vnoremap <leader>es :<C-u>ElmEvalSelection<CR>
nnoremap <leader>em :ElmMakeCurrentFile<CR>

" Copy and paste in OSX
vmap <F2> :w !pbcopy<CR><CR>
map <F3> :r !pbpaste<CR>

" Split navigation
nnoremap <C-J> <C-W><C-J>
nnoremap <C-K> <C-W><C-K>
nnoremap <C-L> <C-W><C-L>
nnoremap <C-H> <C-W><C-H>

" Disable arrow keys
map <up> <nop>
map <down> <nop>
map <left> <nop>
map <right> <nop>
imap <up> <nop>
imap <down> <nop>
imap <left> <nop>
imap <right> <nop>

" Remapping C-s requires flow control to be disabled in .bash/.zshrc
map <C-s> <esc>:w<CR>
imap <C-s> <esc>:w<CR>
map <C-t> <esc>:tabnew<CR>

" Disable Ex mode
map Q <Nop>

" Disable K looking stuff up
map K <Nop>

" Let's be reasonable, shall we?
nmap k gk
nmap j gj

command! Q q " Bind :Q to :q
command! Qall qall


set autoindent                  " always set autoindenting on
set backspace=indent,eol,start  " allow backspacing over everything in insert mode
set backupdir=~/.tmp            " Don't clutter my dirs up with swp and tmp files
set directory=~/.tmp            " Don't clutter my dirs up with swp and tmp files
set et                          " Use the appropriate number of spaces to insert a tab
set formatoptions-=or           " Don't add the comment prefix when I hit enter or o/O on a comment line.
set gdefault                    " assume the /g flag on :s substitutions to replace all matches in a line
set guioptions-=T               " Hide toolbar in GUI vim
set history=500                 " keep 500 lines of command line history
set laststatus=2                " Always show status line.
set nofoldenable                " Say no to code folding
set ruler                       " show the cursor position all the time
set shiftround                  " When at 3 spaces and I hit >>, go to 4, not 5.
set showcmd                     " display incomplete commands
set splitbelow                  " Open new split panes below
set splitright                  " Open new split panes to the right
set tags=./tags;                " Set the tag file search order
set timeoutlen=500              " Don't wait so long for the next keypress (particularly in ambigious Leader situations.
set wildmenu                    " Better? completion on command line
set wildmode=list:full          " What to do when I press 'wildchar'. Worth tweaking to see what feels right.

set showmatch
set nowrap
set autoread
set wmh=0
set viminfo+=!
set guifont=Monaco:h12
set sw=2
set smarttab
set noincsearch
set ignorecase smartcase
set relativenumber
set number
set bg=light
set wildignore+=*/tmp/*,*.so,*.swp,*.zip
set hlsearch

" (Hopefully) removes the delay when hitting esc in insert mode
set noesckeys
set ttimeout
set ttimeoutlen=1

colorscheme jellybeans

let g:airline_mode_map = {
    \ '__' : '-',
    \ 'n'  : 'N',
    \ 'i'  : 'I',
    \ 'R'  : 'R',
    \ 'c'  : 'C',
    \ 'v'  : 'V',
    \ 'V'  : 'V',
    \ '' : 'V',
    \ 's'  : 'S',
    \ 'S'  : 'S',
    \ '' : 'S',
    \ }

" Fuzzy finder: ignore stuff that can't be opened, and generated files
let g:fuzzy_ignore = "*.png;*.PNG;*.JPG;*.jpg;*.GIF;*.gif;vendor/**;coverage/**;tmp/**;rdoc/**"

" Write tags to one common dir
let g:gutentags_cache_dir = '~/.tags_cache'

" Disable folding markdown text
let g:vim_markdown_folding_disabled=1

" Faster Ctrl-P
let g:ctrlp_user_command = ['.git', 'cd %s && git ls-files . -co --exclude-standard', 'find %s -type f']
let g:ctrlp_use_caching = 0

" make test commands execute using dispatch.vim
let test#strategy = "dispatch"

runtime macros/matchit.vim " Enable built-in matchit plugin

" Make it more obvious which paren I'm on
highlight MatchParen cterm=none ctermbg=black ctermfg=yellow

" Make the omnicomplete text readable
highlight PmenuSel ctermfg=black

" Highlight the status line
highlight StatusLine ctermfg=blue ctermbg=yellow

" Set gutter background to black
highlight SignColumn ctermbg=black


" Format xml files
autocmd FileType xml exe ":silent 1,$!xmllint --format --recover - 2>/dev/null"

" Markdown
autocmd BufNewFile,BufRead *.{md,mdwn,mkd,mkdn,mark*} set filetype=markdown

" When loading text files, wrap them and don't split up words.
autocmd BufNewFile,BufRead *.txt setlocal lbr
autocmd BufNewFile,BufRead *.txt setlocal nolist " Don't display whitespace
autocmd BufNewFile,BufRead *.md  setlocal wrap
autocmd BufNewFile,BufRead *.md  setlocal lbr

augroup haml
  autocmd!
  " comments on hamls files with vim-commentary
  autocmd FileType haml set commentstring=\/\ %s
augroup END

" Create a directory for the current file if it does not exist.
augroup Mkdir
  autocmd!
  autocmd BufWritePre *
    \ if !isdirectory(expand("<afile>:p:h")) |
        \ call mkdir(expand("<afile>:p:h"), "p") |
    \ endif
augroup END

augroup Ruby
  autocmd!

  " autoindent with two spaces, always expand tabs
  autocmd FileType ruby,eruby,yaml setlocal ai sw=2 sts=2 et
  autocmd FileType ruby,eruby,yaml setlocal path+=lib
  autocmd FileType ruby,eruby,yaml setlocal colorcolumn=80

  " Remove trailing whitespace on save for ruby files.
  autocmd BufWritePre *.rb :%s/\s\+$//e
augroup END

function! RenameFile()
  let old_name = expand('%')
  let new_name = input('New file name: ', expand('%'), 'file')
  if new_name != '' && new_name != old_name
    exec ':saveas ' . new_name
    exec ':silent !rm ' . old_name
    redraw!
  endif
endfunction

fun! SnippetFilename(...)
  let template = get(a:000, 0, "$1")
  let arg2 = get(a:000, 1, "")

  let basename = expand('%:t:r')

  if basename == ''
    return arg2
  else
    return substitute(template, '$1', basename, 'g')
  endif
endf

" ========================================================================
" End of things set by me.
" ========================================================================

" Only do this part when compiled with support for autocommands.
if has("autocmd")

  " Enable file type detection.
  " Use the default filetype settings, so that mail gets 'tw' set to 72,
  " 'cindent' is on in C files, etc.
  " Also load indent files, to automatically do language-dependent indenting.
  filetype plugin indent on

  " Put these in an autocmd group, so that we can delete them easily.
  augroup vimrcEx
    au!

    " For all text files set 'textwidth' to 78 characters.
    autocmd FileType text setlocal textwidth=78

    " When editing a file, always jump to the last known cursor position.
    " Don't do it when the position is invalid or when inside an event handler
    " (happens when dropping a file on gvim).
    autocmd BufReadPost *
          \ if line("'\"") > 0 && line("'\"") <= line("$") |
          \   exe "normal g`\"" |
          \ endif

  augroup END

endif " has("autocmd")
