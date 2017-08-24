
call plug#begin('~/.vim/plugged')

Plug 'airblade/vim-gitgutter'           " Show sign column for git diff
Plug 'elixir-lang/vim-elixir'           " Elixir support
Plug 'garbas/vim-snipmate'              " Insert snippets using tab
Plug 'jceb/vim-orgmode'                 " Org mode
Plug 'junegunn/fzf'                     " Basic fzf wrapper
Plug 'junegunn/fzf.vim'                 " Fuzzy file finder
Plug 'kchmck/vim-coffee-script'         " Coffeescript syntax higlighting
Plug 'leafgarland/typescript-vim'       " Typescript syntax highlighting
Plug 'ludovicchabant/vim-gutentags'     " Automatic ctags generation
Plug 'MarcWeber/vim-addon-mw-utils'     " Needed by snipmate
Plug 'mileszs/ack.vim'                  " Use Ag for search
Plug 'mortice/pbcopy.vim'               " Easy copy paste in terminal vim
Plug 'nanotech/jellybeans.vim'          " Jellybeans color scheme
Plug 'rizzatti/dash.vim'                " Documentation lookup using Dash.app
Plug 'terryma/vim-multiple-cursors'     " Sublime text style multiple cursors
Plug 'thinca/vim-localrc'               " Add per project vimrc files
Plug 'tomtom/tlib_vim'                  " Needed by snipmate
Plug 'Townk/vim-autoclose'              " Insert matching pair () {} []
Plug 'tpope/vim-commentary'             " Toggle comments easily
Plug 'tpope/vim-dispatch'               " Run commands in tmux pane
Plug 'tpope/vim-endwise'                " Add end after ruby blocks
Plug 'tpope/vim-fugitive'               " Git wrapper
Plug 'tpope/vim-rails'                  " Rails support
Plug 'tpope/vim-surround'               " Easily change quotes/bracket pairs
Plug 'tpope/vim-speeddating'            " Inc/decrement dates - Needed by vim-orgmode
Plug 'tpope/vim-unimpaired'             " Misc mappings like ]<space> or ]c
Plug 'vim-ruby/vim-ruby'                " Ruby support

call plug#end()

colorscheme jellybeans

set autoindent                  " Indent: Copy indent from current line when starting new line
set expandtab                   " Tab settings - Use spaces to insert a tab
set backupdir=~/.tmp            " Don't clutter my dirs with swp/tmp files
set colorcolumn=80              " Show vertical bar to indicate 80 chars
set directory=~/.tmp            " Don't clutter my dirs with swp/tmp files
set grepprg=rg\ --vimgrep       " Use ripgrep for file search
set hlsearch                    " Search: Highlight results
set ignorecase smartcase        " Search: ignore case, unless uppercase chars given
set incsearch                   " Search: Show results as you type
set laststatus=2                " Always show status line
set list                        " Show tabs and trailing whitespace
set listchars=tab:>-,trail:·    " Set chars to show for tabs or trailing whitespace
set nofoldenable                " Disable code folding
set relativenumber number       " Line numbers: Show current #, but use relative #s elsewhere
set rtp+=/usr/local/opt/fzf     " Set fzf path
set shiftround                  " Indentation: When at 3 spaces, >> takes to 4, not 5
set shiftwidth=2                " Tab settings - Use 2 spaces for each indent level
set softtabstop=2               " Tab settings - Count 2 spaces in editing operations
set splitbelow                  " Open new split panes below
set splitright                  " Open new split panes to the right
set t_Co=256                    " Use 256 colors in tmux
set tags=$HOME/.tags_cache      " Keep tags file in a single place
set wildmode=list:full          " Command mode tab completion - complete upto ambiguity

" Status line configuration
set statusline=%m\ %f
set statusline+=\ %{fugitive#statusline()}
set statusline+=%=%l/%L\ [%P]\ C:%c

highlight StatusLine ctermfg=white ctermbg=blue


" Enable extended matching with %
runtime macros/matchit.vim

" Use ag for text search
let g:ackprg = 'rg --vimgrep'

" Don't pollute all projects with tags file. Put them all on one place
let g:gutentags_cache_dir = '~/.tags_cache'


" Create a directory for the current file if it does not exist.
augroup Mkdir
  autocmd!
  autocmd BufWritePre *
    \ if !isdirectory(expand("<afile>:p:h")) |
        \ call mkdir(expand("<afile>:p:h"), "p") |
    \ endif
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


" Used in Snipmate
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


map K   <nop>
map Q   @q

vmap <F2> :w !pbcopy<CR><CR>
map  <F3> :r !pbpaste<CR>

nnoremap <C-h> <C-w><C-h>
nnoremap <C-j> <C-w><C-j>
nnoremap <C-k> <C-w><C-k>
nnoremap <C-l> <C-w><C-l>

" Use fzf.vim for fuzzy file search
map <C-p> :Files<cr>

map  <C-s> <esc>:w<CR>
imap <C-s> <esc>:w<CR>

" Disable arrow keys
map  <up>    <nop>
imap <up>    <nop>
map  <down>  <nop>
imap <down>  <nop>
map  <left>  <nop>
imap <left>  <nop>
map  <right> <nop>
imap <right> <nop>

" I often mistype Q and Wq
command! Q  q
command! Wq wq

command! -bang -nargs=* Rg
  \ call fzf#vim#grep(
  \   'rg --column --line-number --no-heading --color=always '.shellescape(<q-args>), 1,
  \   <bang>0 ? fzf#vim#with_preview('up:60%')
  \           : fzf#vim#with_preview('right:50%:hidden', '?'),
  \   <bang>0)


" Leader key settings

let mapleader = ","

nmap <leader>bi   :source ~/.vimrc<cr>:PluginInstall<cr>
map  <leader>dd   :Dash<cr>
map  <leader>fa   :Ack<space>
map  <leader>ff   :Rg<space>
map  <leader>fw   "zyiw:exe "Rg ".@z.""<cr>
map  <leader>gg   :tabe ~/Dropbox/notes/notes.md<cr>
map  <leader>gs   :Gstatus<cr>
map  <leader>mv   :call RenameFile()<cr>
map  <leader>n    :nohl<cr>
map  <leader>q    :bd<cr>
map  <leader>rc   :Econtroller
map  <leader>rm   :!rm %
map  <leader>rv   :Eview
map  <leader>s    :A<cr>
map  <leader>vi   :tabe ~/.vimrc<cr>
map  <leader>vv   :vnew<cr>
