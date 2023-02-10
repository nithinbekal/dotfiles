

-- Setting options

vim.opt.autoindent = true             -- Indent: Copy indent from current line when starting new line
vim.opt.colorcolumn = '80,120'        -- Show vertical bar to indicate 80/120 chars
vim.opt.cursorline = true             -- Highlight the cursor line
vim.opt.expandtab = true              -- Use spaces to insert a tab
vim.opt.fillchars = 'eob: '           -- Hide ~ in line number column after end of buffer
vim.opt.grepprg = 'rg --vimgrep'      -- Use ripgrep for file search
vim.opt.laststatus = 2                -- Always show status line
vim.opt.list = true                   -- Show tabs and trailing whitespace
vim.opt.listchars = 'tab:>-,trail:·'  -- Set chars to show for tabs or trailing whitespace
vim.opt.shiftround = true             -- Indentation: When at 3 spaces, >> takes to 4, not 5
vim.opt.shiftwidth = 2                -- Tab settings - Use 2 spaces for each indent level
vim.opt.splitbelow = true
vim.opt.splitright = true
vim.opt.updatetime = 200              -- Reduce updatetime
vim.opt.wildmode = 'list:longest'     -- Completion mode: complete till longest common string

-- Line numbers: Show current line, but use relative numbers elsewhere
vim.opt.number = true
vim.opt.relativenumber = true

-- Search
vim.opt.hlsearch = true               -- Highlight results
vim.opt.incsearch = true              -- Show results as you type
vim.opt.ignorecase = true             -- Ignore case
vim.opt.smartcase = true              -- unless uppercase chars are given

vim.g.mapleader = ','

-- Plugin manager: lazy.nvim

-- Install lazy.nvim if not installed already
local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not vim.loop.fs_stat(lazypath) then
  print('Installing lazy.nvim plugin manager')
  vim.fn.system({
    "git",
    "clone",
    "--filter=blob:none",
    "https://github.com/folke/lazy.nvim.git",
    "--branch=stable", -- latest stable release
    lazypath,
  })
end
vim.opt.rtp:prepend(lazypath)

require("lazy").setup({
  {
    'navarasu/onedark.nvim',
    lazy = false,
    config = function() vim.cmd([[colorscheme onedark]]) end,
  },

  'ibhagwan/fzf-lua',
  'kassio/neoterm',

  {
    'lewis6991/gitsigns.nvim',
    config = function() require('gitsigns').setup() end,
  },

  {
    'nvim-lualine/lualine.nvim',
    config = function() require('lualine').setup({
      options = {
        icons_enabled = false,
        theme = 'auto',
        component_separators = '|',
        section_separators = '',
      }
    })
    end,
  },

  'rhysd/devdocs.vim',
  'Townk/vim-autoclose',
  'tpope/vim-bundler',
  'tpope/vim-commentary',   -- Toggle comments easily
  'tpope/vim-endwise',      -- Add end after ruby blocks
  'tpope/vim-fugitive',     -- Git wrapper
  'tpope/vim-rails',        -- Rails support
  'tpope/vim-rhubarb',      -- Needed by fugitive for Gbrowse
  'tpope/vim-surround',     -- Easily change quotes/bracket pairs
  'tpope/vim-unimpaired',   -- Misc mappings like ]<space> or ]c
  'vim-ruby/vim-ruby',
  'vim-test/vim-test',
  'wsdjeg/vim-fetch',
})

-- Key mappings

vim.keymap.set('n', '<C-h>', '<C-w><C-h>', { noremap = true })
vim.keymap.set('n', '<C-j>', '<C-w><C-j>', { noremap = true })
vim.keymap.set('n', '<C-k>', '<C-w><C-k>', { noremap = true })
vim.keymap.set('n', '<C-l>', '<C-w><C-l>', { noremap = true })

vim.keymap.set({ '', 'i' }, '<C-s>', '<esc>:w<cr>')

-- Terminal navigation
vim.keymap.set('t', '<C-h>', '<C-\\><C-n><C-w>h', { noremap = true })
vim.keymap.set('t', '<C-j>', '<C-\\><C-n><C-w>j', { noremap = true })
vim.keymap.set('t', '<C-k>', '<C-\\><C-n><C-w>k', { noremap = true })
vim.keymap.set('t', '<C-l>', '<C-\\><C-n><C-w>l', { noremap = true })
vim.keymap.set('t', '<C-o>', '<C-\\><C-n>', { noremap = true })

-- Remap for dealing with word wrap
vim.keymap.set('n', 'k', "v:count == 0 ? 'gk' : 'k'", { expr = true, silent = true })
vim.keymap.set('n', 'j', "v:count == 0 ? 'gj' : 'j'", { expr = true, silent = true })

-- FZF
vim.keymap.set('n', '<leader>,', require('fzf-lua').files, { desc = 'Find files' })
vim.keymap.set('n', '<leader>bb', require('fzf-lua').buffers, { desc = 'Find buffers' })

vim.keymap.set('n', '<leader>dd', '<Plug>(devdocs-under-cursor)', { desc = 'Open devdocs.io' })

-- Git
vim.keymap.set('n', '<leader>gbl', ':Git blame<cr>', { desc = 'Git blame' })
vim.keymap.set('n', '<leader>gbr', ':GBrowse<cr>', { desc = 'Git browse' })
vim.keymap.set('n', '<leader>ghp', ':!/opt/dev/bin/dev open pr &<cr><cr>', { desc = 'Github PR' })
vim.keymap.set('n', '<leader>ghs', ':Gitsigns stage_hunk<cr>', { desc = 'Git stage hunk' })
vim.keymap.set('n', '<leader>ghu', ':Gitsigns undo_stage_hunk<cr>', { desc = 'Git unstage hunk' })
vim.keymap.set('n', '<leader>gs', ':Git<cr>', { desc = 'Git status' })

vim.keymap.set('n', '<leader>nh', ':nohl<cr>', { desc = 'Disable search highlight' })
vim.keymap.set('n', '<leader>o', ':only<cr>', { desc = 'Only keep current pane' })
vim.keymap.set('n', '<leader>pp', '"+p', { desc = 'Paste from clipboard' })
vim.keymap.set('n', '<leader>q', ':bd<cr>', { desc = 'Close buffer' })

-- Terminal and testing
vim.keymap.set('n', '<leader>tc', ':Tclear<cr>', { desc = 'Toggle terminal' })
vim.keymap.set('n', '<leader>tf', ':w<cr>:TestFile<cr>', { desc = 'Test current file' })
vim.keymap.set('n', '<leader>tl', ':w<cr>:T dev test --include-branch-commits<cr>', { desc = 'Test local changes' })
vim.keymap.set('n', '<leader>tn', ':w<cr>:TestNearest<cr>', { desc = 'Test current file' })
vim.keymap.set('n', '<leader>to', ':vertical Ttoggle<cr>', { desc = 'Toggle terminal' })
vim.keymap.set('n', '<leader>ts', ':w<cr>:TestSuite<cr>', { desc = 'Test suite' })
vim.keymap.set('n', '<leader>tt', ':w<cr>:TestLast<cr>', { desc = 'Rerun last test' })
vim.keymap.set('n', '<leader>ty', ':w<cr>:srb typecheck<cr>', { desc = 'Sorbet typecheck' })

vim.keymap.set('n', '<leader>vv', ':vnew<cr>', { desc = 'New vertical split' })
vim.keymap.set('n', '<leader>yy', '"+y', { desc = 'Copy to clipboard' })
