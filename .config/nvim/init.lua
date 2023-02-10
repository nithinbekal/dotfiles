

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
