

-- Setting options

vim.opt.autoindent = true             -- Indent: Copy indent from current line when starting new line
vim.opt.colorcolumn = '120'           -- Show vertical bar to indicate 120 chars
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
vim.opt.wildmode = 'list:full'        -- Completion mode: list all matches

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

local plugins = {
  {
    'ibhagwan/fzf-lua',
    config = function()
      local fzf_lua = require('fzf-lua')
      vim.keymap.set('n', '<leader>l,', fzf_lua.files, { desc = 'Find files' })
      vim.keymap.set('n', '<leader>lbb', fzf_lua.buffers, { desc = 'Find buffers' })
      vim.keymap.set('n', '<leader>lff', fzf_lua.grep, { desc = 'Grep' })
      vim.keymap.set('n', '<leader>lfw', fzf_lua.grep_cword, { desc = 'Grep for word under cursor' })
    end,
  },

  {
    'junegunn/fzf',
    config = function()
      vim.keymap.set('n', '<leader>,',  ':Files<cr>')
      vim.keymap.set('n', '<leader>bb', ':Buffers<cr>')
      vim.keymap.set('n', '<leader>fd', ':Rg def <C-r><C-w><cr>')
      vim.keymap.set('n', '<leader>ff', ':Rg ')
      vim.keymap.set('n', '<leader>fw', ':Rg <C-r><C-w>')
      vim.keymap.set('n', '<leader>fW', ':Rg \\b<C-r><C-w>\\b')
    end,
  },

  {
    'junegunn/fzf.vim',
    build = ":call fzf#install()",
  },

  {
    'kassio/neoterm',
    config = function()
      vim.g.neoterm_default_mod = 'vertical'

      vim.keymap.set('n', '<leader>tc', ':Tclear<cr>', { desc = 'Clear terminal' })
      vim.keymap.set('n', '<leader>to', ':vertical Ttoggle<cr>', { desc = 'Toggle terminal' })
      vim.keymap.set('n', '<leader>tl', ':w<cr>:T dev test --include-branch-commits<cr>', { desc = 'Test local changes' })
      vim.keymap.set('n', '<leader>ty', ':w<cr>:T srb typecheck<cr>', { desc = 'Sorbet typecheck' })
    end,
  },

  {
    'lewis6991/gitsigns.nvim',
    config = function()
      require('gitsigns').setup()

      vim.keymap.set('n', '<leader>ghs', ':Gitsigns stage_hunk<cr>', { desc = 'Git stage hunk' })
      vim.keymap.set('n', '<leader>ghu', ':Gitsigns undo_stage_hunk<cr>', { desc = 'Git undo stage hunk' })
      vim.keymap.set('n', '<leader>ghr', ':Gitsigns reset_hunk<cr>', { desc = 'Git reset hunk' })
      vim.keymap.set({'o', 'x'}, 'ac', ':<C-U>Gitsigns select_hunk<CR>') -- Text object for git hunks

      vim.keymap.set('n', ']c', ':Gitsigns next_hunk<cr>')
      vim.keymap.set('n', '[c', ':Gitsigns prev_hunk<cr>')
    end,
  },

  {
    'Mofiqul/vscode.nvim',
    config = function()
      require('vscode').load()
    end,
  },

  {
    'neovim/nvim-lspconfig',
    dependencies = {
      { 'williamboman/mason.nvim', config = true },
      'williamboman/mason-lspconfig.nvim',
    },
  },

  {
    'nvim-lualine/lualine.nvim',
    config = function() require('lualine').setup({
      options = {
        icons_enabled = false,
        theme = 'vscode',
        component_separators = '|',
        section_separators = '',
        path = 1, -- show relative file path
      }
    })
    end,
  },

  {
    'rhysd/devdocs.vim',
    config = function()
      vim.keymap.set('n', '<leader>dd', '<Plug>(devdocs-under-cursor)', { desc = 'Open devdocs.io' })
    end,
  },

  'Townk/vim-autoclose',
  'tpope/vim-bundler',
  'tpope/vim-commentary',   -- Toggle comments easily
  'tpope/vim-endwise',      -- Add end after ruby blocks

  {
    'tpope/vim-fugitive',
    config = function()
      vim.keymap.set('n', '<leader>gbl', ':Git blame<cr>', { desc = 'Git blame' })
      vim.keymap.set({ 'n', 'v'}, '<leader>gbr', ':GBrowse<cr>', { desc = 'Git browse' })
      vim.keymap.set('n', '<leader>ghp', ':!/opt/dev/bin/dev open pr &<cr><cr>', { desc = 'Github PR' })
      vim.keymap.set('n', '<leader>gs', ':Git<cr>', { desc = 'Git status' })
    end,
  },

  {
    'tpope/vim-rails',        -- Rails support
    config = function()
      vim.keymap.set('n', '<leader>s', ':A<cr>', { desc = 'Toggle test and code files' })
    end,
  },

  'tpope/vim-rhubarb',      -- Needed by fugitive for Gbrowse
  'tpope/vim-surround',     -- Easily change quotes/bracket pairs
  'tpope/vim-unimpaired',   -- Misc mappings like ]<space> or ]c
  'vim-ruby/vim-ruby',

  {
    'vim-test/vim-test',
    config = function()
      vim.g['test#strategy'] = 'neoterm'

      vim.keymap.set('n', '<leader>tf', ':w<cr>:TestFile<cr>', { desc = 'Test current file' })
      vim.keymap.set('n', '<leader>tn', ':w<cr>:TestNearest<cr>', { desc = 'Test current file' })
      vim.keymap.set('n', '<leader>ts', ':w<cr>:TestSuite<cr>', { desc = 'Test suite' })
      vim.keymap.set('n', '<leader>tt', ':w<cr>:TestLast<cr>', { desc = 'Rerun last test' })
    end,
  },

  'wsdjeg/vim-fetch',
}

if vim.env.SPIN == "1" then
  table.insert(plugins, "Shopify/spin-hud")
end

require("lazy").setup(plugins)

local on_attach = function()
  vim.keymap.set('n', "K", vim.lsp.buf.hover, { desc = "Hover documentation" })
end

local servers = {
  ruby_ls = {},
  sorbet = {},
}

local capabilities = vim.lsp.protocol.make_client_capabilities()
local mason_lspconfig = require("mason-lspconfig")

mason_lspconfig.setup {
  ensure_installed = vim.tbl_keys(servers),
}

mason_lspconfig.setup_handlers {
  function(server_name)
    require("lspconfig")[server_name].setup {
      capabilities = capabilities,
      on_attach = on_attach,
      settings = servers[server_name],
      filetypes = (servers[server_name] or {}).filetypes,
    }
  end
}

-- Commonly mistyped commands
vim.api.nvim_create_user_command('Q', 'q', {})
vim.api.nvim_create_user_command('Wq', 'wq', {})

-- Keymaps: Navigation
vim.keymap.set('n', '<C-h>', '<C-w><C-h>')
vim.keymap.set('n', '<C-j>', '<C-w><C-j>')
vim.keymap.set('n', '<C-k>', '<C-w><C-k>')
vim.keymap.set('n', '<C-l>', '<C-w><C-l>')

-- Keymaps: Terminal
vim.keymap.set('t', '<C-h>', '<C-\\><C-n><C-w>h')
vim.keymap.set('t', '<C-j>', '<C-\\><C-n><C-w>j')
vim.keymap.set('t', '<C-k>', '<C-\\><C-n><C-w>k')
vim.keymap.set('t', '<C-l>', '<C-\\><C-n><C-w>l')
vim.keymap.set('t', '<C-o>', '<C-\\><C-n>')

-- Keymaps: Remap for dealing with word wrap
vim.keymap.set('n', 'k', "v:count == 0 ? 'gk' : 'k'", { expr = true, silent = true })
vim.keymap.set('n', 'j', "v:count == 0 ? 'gj' : 'j'", { expr = true, silent = true })

-- Keymaps: misc
vim.keymap.set({ '', 'i' }, '<C-s>', '<esc>:w<cr>')
vim.keymap.set('n', '<leader>nh', ':nohl<cr>', { desc = 'No highlight' })
vim.keymap.set('n', '<leader>o', ':only<cr>', { desc = 'Only keep current pane' })
vim.keymap.set('n', '<leader>pp', '"+p', { desc = 'Paste from clipboard' })
vim.keymap.set('n', '<leader>q', ':bd<cr>', { desc = 'Close buffer' })
vim.keymap.set('n', '<leader>rm', ':!rm %', { desc = 'Remove file' })
vim.keymap.set('n', '<leader>vv', ':vnew<cr>', { desc = 'New vertical split' })
vim.keymap.set('v', '<leader>yy', '"+y', { desc = 'Copy to clipboard' })
