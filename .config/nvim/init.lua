

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
    'hrsh7th/nvim-cmp',
    dependencies = {
      'L3MON4D3/LuaSnip',
      'saadparwaiz1/cmp_luasnip',
      'hrsh7th/cmp-nvim-lsp',
      'rafamadriz/friendly-snippets',
    },
  },

  {
    'ibhagwan/fzf-lua',
    keys = {
      { "<leader>,", ":FzfLua files<cr>", desc = "Find files" },
      { "<leader>bb", ":FzfLua buffers<cr>", desc = "Find buffers" },
      { "<leader>ff", ":FzfLua grep<cr>", desc = "Grep" },
      { "<leader>fw", ":FzfLua grep_cword<cr>", desc = "Grep for word under cursor" },
    },
  },

  {
    'junegunn/fzf',
    keys = {
      { "<leader>fd", ":Rg def <C-r><C-w><cr>", desc = "Search for ruby method definition" },
      { "<leader>fW", ":Rg \\b<C-r><C-w>\\b", desc = "Grep for word under cursor with boundaries" },
    },
  },

  {
    'junegunn/fzf.vim',
    build = ":call fzf#install()",
  },

  {
    'kassio/neoterm',
    config = function() vim.g.neoterm_default_mod = "vertical" end,
    lazy = false,
    keys = {
      { "<leader>tc", ":Tclear<cr>", desc = "Clear terminal" },
      { "<leader>to", ":Ttoggle<cr>", desc = "Toggle terminal" },
      { "<leader>tl", ":w<cr>:T dev test --include-branch-commits<cr>", desc = "Test local changes" },
      { "<leader>ty", ":w<cr>:T srb typecheck<cr>", desc = "Sorbet typecheck" },
    },
  },

  {
    "lewis6991/gitsigns.nvim",
    config = function()
      require('gitsigns').setup()
    end,
    event = { "CursorHold", "CursorHoldI" },
    keys = {
      { "<leader>ghs", ":Gitsigns stage_hunk<cr>", desc = "Git stage hunk" },
      { "<leader>ghu", ":Gitsigns undo_stage_hunk<cr>", desc = "Git undo stage hunk" },
      { "<leader>ghr", ":Gitsigns reset_hunk<cr>", desc = "Git reset hunk" },
      { "]c", ":Gitsigns next_hunk<cr>", desc = "Gitsigns: Go to next hunk" },
      { "[c", ":Gitsigns prev_hunk<cr>", desc = "Gitsigns: Go to prev hunk" },
      { "ac", ":<C-U>Gitsigns select_hunk<CR>", mode = {"o", "x"}, desc = "Text object for git hunks" },
    },
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
    dependencies = {
      { 'nvim-tree/nvim-web-devicons', opt = true },
    },
    config = function()
      require('lualine').setup({
        options = {
          icons_enabled = true,
          theme = 'vscode',
          path = 1, -- show relative file path
        }
      })
    end,
  },

  {
    "rcarriga/nvim-notify",
    config = function () vim.notify = require("notify") end,
  },

  {
    'rhysd/devdocs.vim',
    keys = {
      { "<leader>dd", "<Plug>(devdocs-under-cursor)", desc = "Open devdocs.io" },
    }
  },

  { "Townk/vim-autoclose", ft = { "ruby", "eruby" } },
  { "tpope/vim-bundler", ft = { "ruby", "eruby" } },

  "tpope/vim-commentary",

  { "tpope/vim-endwise", ft = { "ruby", "eruby" } },

  {
    'tpope/vim-fugitive',
    dependencies = { "tpope/vim-rhubarb" },
    keys = {
      { "<leader>gbl", ":Git blame<cr>", desc = "Git blame" },
      { "<leader>ghp", ":!/opt/dev/bin/dev open pr &<cr><cr>", desc = "Github PR" },
      { "<leader>gs", ":Git<cr>", desc = "Git status" },
      { "<leader>gbr", ":Gbrowse<cr>", desc = "Git browse", mode = { "n", "v" } },
    },
  },

  {
    'tpope/vim-rails',
    keys = {
      { "<leader>s", ":A<cr>", desc = 'Toggle test and code files' },
    },
  },

  'tpope/vim-surround',     -- Easily change quotes/bracket pairs
  'tpope/vim-unimpaired',   -- Misc mappings like ]<space> or ]c

  { "vim-ruby/vim-ruby", ft = { "ruby", "eruby" } },

  {
    'vim-test/vim-test',
    config = function() vim.g['test#strategy'] = 'neoterm' end,
    keys = {
      { "<leader>tf", ":w<cr>:TestFile<cr>", desc = 'Test current file' },
      { "<leader>tn", ":w<cr>:TestNearest<cr>", desc = 'Test current file' },
      { "<leader>ts", ":w<cr>:TestSuite<cr>", desc = 'Test suite' },
      { "<leader>tt", ":w<cr>:TestLast<cr>", desc = 'Rerun last test' },
    },
  },

  'wsdjeg/vim-fetch',
}

if vim.env.SPIN == "1" then
  table.insert(plugins, "Shopify/spin-hud")
end

require("lazy").setup(plugins)

-- LSP setup

local on_attach = function()
  vim.keymap.set('n', "K", vim.lsp.buf.hover, { desc = "Hover documentation" })
  vim.keymap.set('n', "gd", vim.lsp.buf.definition, { desc = "Go to definition" })
  vim.keymap.set('n', "gr", vim.lsp.buf.references, { desc = "Go to references" })
end

local servers = {
  ruby_ls = {},
  sorbet = {},
  lua_ls = {
    Lua = {
      workspace = { checkThirdParty = false },
      telemetry = { enable = false },
      diagnostics = { globals = { "vim" } },
    },
  },
}

local capabilities = vim.lsp.protocol.make_client_capabilities()
capabilities = require('cmp_nvim_lsp').default_capabilities(capabilities)

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

-- Autocomplete setup

local cmp = require("cmp")
local luasnip = require("luasnip")

require("luasnip.loaders.from_vscode").lazy_load()
luasnip.config.setup {}

cmp.setup {
  snippet = {
    expand = function(args)
      luasnip.lsp_expand(args.body)
    end,
  },
  mapping = cmp.mapping.preset.insert {
    ['<C-n>'] = cmp.mapping.select_next_item(),
    ['<C-p>'] = cmp.mapping.select_prev_item(),
    ['<C-d>'] = cmp.mapping.scroll_docs(-4),
    ['<C-f>'] = cmp.mapping.scroll_docs(4),
    ['<C-Space>'] = cmp.mapping.complete {},
    ['<CR>'] = cmp.mapping.confirm {
      behavior = cmp.ConfirmBehavior.Replace,
      select = true,
    },
    ['<Tab>'] = cmp.mapping(function(fallback)
      if cmp.visible() then
        cmp.select_next_item()
      elseif luasnip.expand_or_locally_jumpable() then
        luasnip.expand_or_jump()
      else
        fallback()
      end
    end, { 'i', 's' }),
    ['<S-Tab>'] = cmp.mapping(function(fallback)
      if cmp.visible() then
        cmp.select_prev_item()
      elseif luasnip.locally_jumpable(-1) then
        luasnip.jump(-1)
      else
        fallback()
      end
    end, { 'i', 's' }),
  },
  sources = {
    { name = 'nvim_lsp' },
    { name = 'luasnip' },
  },
}

function RenameFile()
  local old_name = vim.fn.expand('%')
  local new_name = vim.fn.input('New file name: ', vim.fn.expand('%'), 'file')
  if new_name ~= '' and new_name ~= old_name then
    vim.cmd(':saveas ' .. new_name)
    vim.cmd(':silent !rm ' .. old_name)
    vim.cmd('redraw!')
  end
end

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
vim.keymap.set('n', '<leader>mv', RenameFile, { desc = 'Rename file' })
vim.keymap.set('n', '<leader>nh', ':nohl<cr>', { desc = 'No highlight' })
vim.keymap.set('n', '<leader>o', ':only<cr>', { desc = 'Only keep current pane' })
vim.keymap.set('n', '<leader>pp', '"+p', { desc = 'Paste from clipboard' })
vim.keymap.set('n', '<leader>q', ':bd<cr>', { desc = 'Close buffer' })
vim.keymap.set('n', '<leader>rm', ':!rm %', { desc = 'Remove file' })
vim.keymap.set('n', '<leader>vv', ':vnew<cr>', { desc = 'New vertical split' })
vim.keymap.set('v', '<leader>yy', '"+y', { desc = 'Copy to clipboard' })
