

-- Setting options

vim.opt.autoindent = true             -- Indent: Copy indent from current line when starting new line
vim.opt.clipboard = "unnamedplus"     -- Sync clipboard between OS and Neovim
vim.opt.colorcolumn = "120"           -- Show vertical bar to indicate 120 chars
vim.opt.cursorline = true             -- Highlight the cursor line
vim.opt.expandtab = true              -- Use spaces to insert a tab
vim.opt.fillchars = "eob: "           -- Hide ~ in line number column after end of buffer

-- Use treesitter for folding
vim.opt.foldmethod = "expr"
vim.opt.foldexpr = "v:lua.vim.treesitter.foldexpr()"
vim.opt.foldenable = false

vim.opt.grepprg = "rg --vimgrep"      -- Use ripgrep for file search
vim.opt.laststatus = 2                -- Always show status line
vim.opt.list = true                   -- Show tabs and trailing whitespace
vim.opt.listchars = "tab:>-,trail:·"  -- Set chars to show for tabs or trailing whitespace
vim.opt.mouse = ""                    -- Disable mouse clicks but scrolling still works
vim.opt.scrolloff = 10                -- Show next few lines when searching text
vim.opt.shiftround = true             -- Indentation: When at 3 spaces, >> takes to 4, not 5
vim.opt.shiftwidth = 2                -- Tab settings - Use 2 spaces for each indent level
vim.opt.splitbelow = true
vim.opt.splitright = true
vim.opt.updatetime = 200              -- Reduce updatetime
vim.opt.wildmode = "list:full"        -- Completion mode: list all matches

-- Line numbers: Show current line, but use relative numbers elsewhere
vim.opt.number = true
vim.opt.relativenumber = true

-- Search
vim.opt.hlsearch = true               -- Highlight results
vim.opt.incsearch = true              -- Show results as you type
vim.opt.ignorecase = true             -- Ignore case
vim.opt.smartcase = true              -- unless uppercase chars are given

vim.g.mapleader = ","

-- Plugin manager: lazy.nvim

-- Install lazy.nvim if not installed already
local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not vim.loop.fs_stat(lazypath) then
  print("Installing lazy.nvim plugin manager")
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
    "hrsh7th/nvim-cmp",
    dependencies = {
      "L3MON4D3/LuaSnip",
      "saadparwaiz1/cmp_luasnip",
      "hrsh7th/cmp-nvim-lsp",
      "rafamadriz/friendly-snippets",
    },
  },

  {
    "ibhagwan/fzf-lua",
    event = "VeryLazy",
    opts = {
      files = { previewer = "telescope" },
      buffers = { no_term_buffers = true },
    },
    keys = {
      { "<leader>,",  ":FzfLua files<cr>", desc = "Find files" },
      { "<leader>ca", ":FzfLua lsp_code_actions<cr>", desc = "Code actions" },
      { "<leader>bb", ":FzfLua buffers<cr>", desc = "Find buffers" },
      { "<leader>ds", ":FzfLua lsp_document_symbols<cr>", desc = "Document symbols" },
      { "<leader>fd", ":FzfLua grep<cr> def <C-r><C-w><cr>", desc = "Search for ruby method definition" },
      { "<leader>ff", ":FzfLua grep<cr>", desc = "Grep" },
      { "<leader>fr", ":FzfLua resume<cr>", desc = "Resume search" },
      { "<leader>fw", ":FzfLua grep_cword<cr>", desc = "Grep for word under cursor" },
      { "<leader>wd", ":FzfLua lsp_workspace_diagnostics<cr>", desc = "Workspace diagnostics" },
      { "gr", ":FzfLua lsp_references<cr>", desc = "LSP references" },
    },
  },

  {
    "kassio/neoterm",
    config = function() vim.g.neoterm_default_mod = "vertical" end,
    lazy = false,
    keys = {
      { "<leader>tc", ":Tclear<cr>", desc = "Clear terminal" },
      { "<leader>to", ":Ttoggle<cr>", desc = "Toggle terminal" },
      { "<leader>tl", ":w<cr>:T dev test --include-branch-commits<cr>", desc = "Test local changes" },
      { "<leader>ty", ":w<cr>:T bin/srb typecheck<cr>", desc = "Sorbet typecheck" },
    },
  },

  {
    "lewis6991/gitsigns.nvim",
    config = function()
      require("gitsigns").setup({ signcolumn = false, numhl = true})
    end,
    event = { "CursorHold", "CursorHoldI" },
    keys = {
      { "<leader>ghs", ":Gitsigns stage_hunk<cr>", desc = "Git stage hunk" },
      { "<leader>ghu", ":Gitsigns undo_stage_hunk<cr>", desc = "Git undo stage hunk" },
      { "<leader>ghr", ":Gitsigns reset_hunk<cr>", desc = "Git reset hunk" },
      { "]h", ":Gitsigns next_hunk<cr>", desc = "Gitsigns: Go to next hunk" },
      { "[h", ":Gitsigns prev_hunk<cr>", desc = "Gitsigns: Go to prev hunk" },
      { "ah", ":<C-U>Gitsigns select_hunk<CR>", mode = {"o", "x"}, desc = "Text object for git hunks" },
    },
  },

  {
    "neovim/nvim-lspconfig",
    dependencies = {
      { "williamboman/mason.nvim", opts = { ui = { border = "rounded" } } },
      "williamboman/mason-lspconfig.nvim",
    },
    config = function()
      require("mason-lspconfig").setup({
        ensure_installed = { "ruby_lsp", "sorbet", "lua_ls" },
        automatic_enable = true,
      })

      local capabilities = vim.lsp.protocol.make_client_capabilities()
      capabilities = require("cmp_nvim_lsp").default_capabilities(capabilities)

      require("lspconfig").ruby_lsp.setup({ capabilities = capabilities })

      require("lspconfig").sorbet.setup({
        capabilities = capabilities,
        root_dir = require("lspconfig.util").root_pattern("sorbet/config"),
      })

      require("lspconfig").lua_ls.setup({
        capabilities = capabilities,
        settings = {
          Lua = {
            workspace = { checkThirdParty = false },
            telemetry = { enable = false },
            diagnostics = { globals = { "vim" } },
          },
        },
      })
    end,
  },

  {
    "nvim-lualine/lualine.nvim",
    dependencies = {
      "Mofiqul/vscode.nvim",
      "nvim-tree/nvim-web-devicons",
    },
    config = function()
      require("lualine").setup({
        options = {
          icons_enabled = true,
          theme = "onedark",
          path = 1, -- show relative file path
        }
      })
    end,
  },

  {
    "nvim-treesitter/nvim-treesitter",
    dependencies = {
      "nvim-treesitter/nvim-treesitter-textobjects",
    },
    config = function()
      require("nvim-treesitter.configs").setup({
        ensure_installed = { "lua", "ruby", "vimdoc" },
        auto_install = false,
        highlight = { enable = true, },
        textobjects = {
          select = {
            enable = true,
            lookahead = true, -- Automatically jump forward to textobj, similar to targets.vim
            keymaps = {
              ["af"] = "@function.outer",
              ["if"] = "@function.inner",
              ["ac"] = "@class.outer",
              ["ic"] = "@class.inner",
            },
          },
          move = {
            enable = true,
            set_jumps = true, -- whether to set jumps in the jumplist
            goto_next_start = {
              ["]m"] = "@function.outer",
              ["]]"] = "@class.outer",
            },
            goto_next_end = {
              ["]M"] = "@function.outer",
              ["]["] = "@class.outer",
            },
            goto_previous_start = {
              ["[m"] = "@function.outer",
              ["[["] = "@class.outer",
            },
            goto_previous_end = {
              ["[M"] = "@function.outer",
              ["[]"] = "@class.outer",
            },
          },
        },
      })
    end,
    build = ":TSUpdate",
  },

  {
    "olimorris/onedarkpro.nvim",
    priority = 1000,
    config = function() vim.cmd("colorscheme onedark") end,
  },

  {
    "rhysd/devdocs.vim",
    keys = {
      { "<leader>dd", "<Plug>(devdocs-under-cursor)", desc = "Open devdocs.io" },
    }
  },

  {
    "rmagatti/goto-preview",
    event = "BufEnter",
    config = true,
    keys = {
      { "<leader>gp", ":lua require('goto-preview').goto_preview_definition()<cr>", desc = "Preview definition" },
    },
  },

  { "tpope/vim-bundler", ft = { "ruby", "eruby" } },
  { "tpope/vim-endwise", ft = { "ruby", "eruby" } },

  {
    "tpope/vim-fugitive",
    dependencies = { "tpope/vim-rhubarb" },
    keys = {
      { "<leader>gbl", ":Git blame<cr>", desc = "Git blame" },
      { "<leader>ghp", ":!/opt/dev/bin/dev open pr &<cr><cr>", desc = "Github PR" },
      { "<leader>gs", ":Git<cr>", desc = "Git status" },
      { "<leader>gbr", ":GBrowse<cr>", desc = "Git browse", mode = { "n", "v" } },
    },
  },

  {
    "tpope/vim-rails",
    keys = {
      { "<leader>s", ":A<cr>", desc = "Toggle test and code files" },
    },
  },

  { "tpope/vim-surround", event = { "BufReadPost", "BufNewFile" } },
  { "tpope/vim-unimpaired", event = { "BufReadPost", "BufNewFile" } },
  { "vim-ruby/vim-ruby", event = { "BufReadPost", "BufNewFile" } },

  {
    "vim-test/vim-test",
    config = function() vim.g["test#strategy"] = "neoterm" end,
    keys = {
      { "<leader>tf", ":w<cr>:TestFile<cr>", desc = "Test current file" },
      { "<leader>tn", ":w<cr>:TestNearest<cr>", desc = "Test current file" },
      { "<leader>ts", ":w<cr>:TestSuite<cr>", desc = "Test suite" },
      { "<leader>tt", ":w<cr>:TestLast<cr>", desc = "Rerun last test" },
    },
  },

  { "windwp/nvim-autopairs", event = "InsertEnter", opts = {} },
  "wsdjeg/vim-fetch",



  {
    "zbirenbaum/copilot-cmp",
    event = "InsertEnter",
    config = function () require("copilot_cmp").setup() end,
    dependencies = {
      "zbirenbaum/copilot.lua",
      cmd = "Copilot",
      config = function()
        require("copilot").setup({
          suggestion = { enabled = false },
          panel = { enabled = false },
        })
      end,
    },
  },
}

require("lazy").setup({
  spec = plugins,
  ui = { border = "rounded" },
})



-- Autocomplete setup

local cmp_autopairs = require("nvim-autopairs.completion.cmp")
local cmp = require("cmp")
local luasnip = require("luasnip")

cmp.event:on("confirm_done", cmp_autopairs.on_confirm_done())

require("luasnip.loaders.from_vscode").lazy_load()
luasnip.config.setup {}

cmp.setup {
  snippet = {
    expand = function(args)
      luasnip.lsp_expand(args.body)
    end,
  },
  mapping = cmp.mapping.preset.insert {
    ["<C-n>"] = cmp.mapping.select_next_item(),
    ["<C-p>"] = cmp.mapping.select_prev_item(),
    ["<C-d>"] = cmp.mapping.scroll_docs(-4),
    ["<C-f>"] = cmp.mapping.scroll_docs(4),
    ["<C-Space>"] = cmp.mapping.complete {},
    ["<CR>"] = cmp.mapping.confirm {
      behavior = cmp.ConfirmBehavior.Replace,
      select = true,
    },
    ["<Tab>"] = cmp.mapping(function(fallback)
      if cmp.visible() then
        cmp.select_next_item()
      elseif luasnip.expand_or_locally_jumpable() then
        luasnip.expand_or_jump()
      else
        fallback()
      end
    end, { "i", "s" }),
    ["<S-Tab>"] = cmp.mapping(function(fallback)
      if cmp.visible() then
        cmp.select_prev_item()
      elseif luasnip.locally_jumpable(-1) then
        luasnip.jump(-1)
      else
        fallback()
      end
    end, { "i", "s" }),
  },
  sources = {
    { name = "copilot" },
    { name = "nvim_lsp" },
    { name = "luasnip" },
  },
  enabled = function ()
    return vim.api.nvim_buf_get_option(0, "filetype") ~= "markdown"
  end,
}

vim.diagnostic.config({
  underline = { severity = { max = vim.diagnostic.severity.INFO } },
  virtual_text = { severity = { min = vim.diagnostic.severity.WARN } },
  float = { border = "rounded", header = "" },
})

function RenameFile()
  local old_name = vim.fn.expand("%")
  local new_name = vim.fn.input("New file name: ", vim.fn.expand("%"), "file")
  if new_name ~= "" and new_name ~= old_name then
    vim.cmd(":saveas " .. new_name)
    vim.cmd(":silent !rm " .. old_name)
    vim.cmd("redraw!")
  end
end

vim.api.nvim_create_autocmd("VimResized", {
  command = "wincmd =",
  desc = "Automatically resize splits when window is resized",
})

-- Commonly mistyped commands
vim.api.nvim_create_user_command("Q", "q", {})
vim.api.nvim_create_user_command("Qa", "qa", {})
vim.api.nvim_create_user_command("Wq", "wq", {})

-- Custom Ed command to strip areas/core/<something>/ prefix
vim.api.nvim_create_user_command("Ed", function(opts)
  local path = opts.args
  local stripped = path:gsub("^areas/core/[^/]+/", "")
  vim.cmd("edit " .. stripped)
end, { nargs = 1, complete = "file" })

-- Keymaps: Navigation
vim.keymap.set("n", "<C-h>", "<C-w><C-h>")
vim.keymap.set("n", "<C-j>", "<C-w><C-j>")
vim.keymap.set("n", "<C-k>", "<C-w><C-k>")
vim.keymap.set("n", "<C-l>", "<C-w><C-l>")

-- Keymaps: Terminal
vim.keymap.set("t", "<C-h>", "<C-\\><C-n><C-w>h")
vim.keymap.set("t", "<C-j>", "<C-\\><C-n><C-w>j")
vim.keymap.set("t", "<C-k>", "<C-\\><C-n><C-w>k")
vim.keymap.set("t", "<C-l>", "<C-\\><C-n><C-w>l")
vim.keymap.set("t", "<C-o>", "<C-\\><C-n>")

-- LSP and diagnostics
vim.keymap.set("n", "[d", function() vim.diagnostic.goto_prev({ float = true }) end, { desc = "Diagnostics: prev" })
vim.keymap.set("n", "]d", function() vim.diagnostic.goto_next({ float = true }) end, { desc = "Diagnostics: next" })

vim.keymap.set("n", "gd", vim.lsp.buf.definition, { desc = "Go to definition" })

-- Keymaps: Remap for dealing with word wrap
vim.keymap.set("n", "k", "v:count == 0 ? 'gk' : 'k'", { expr = true, silent = true })
vim.keymap.set("n", "j", "v:count == 0 ? 'gj' : 'j'", { expr = true, silent = true })

-- Keymaps: misc
vim.keymap.set({ "", "i" }, "<C-s>", "<esc>:w<cr>", { desc = "Save file" })
vim.keymap.set("n", "<Esc>", ":nohlsearch<cr>", { desc = "Remove search highlight"})
vim.keymap.set("n", "<leader>mv", RenameFile, { desc = "Rename file" })
vim.keymap.set("n", "<leader>nv", ":e ~/dotfiles/.config/nvim/init.lua<cr>", { desc = "Edit nvim config" })
vim.keymap.set("n", "<leader>o", ":only<cr>", { desc = "Only keep current pane" })
vim.keymap.set("n", "<leader>pp", '"+p', { desc = "Paste from clipboard" })
vim.keymap.set("n", "<leader>q", "<C-w>c", { desc = "Close buffer" })
vim.keymap.set("n", "<leader>rm", ":!rm %", { desc = "Remove file" })
vim.keymap.set("n", "<leader>vv", ":vnew<cr>", { desc = "New vertical split" })
vim.keymap.set("v", "<leader>yy", '"+y', { desc = "Copy to clipboard" })
vim.keymap.set("n", "glf", 'yaW<C-w><C-h>:e <C-r>"<cr>', { desc = "Open file in left split" })
