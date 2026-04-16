

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
vim.opt.swapfile = false              -- No swap files; save often + git is sufficient
vim.opt.undofile = true               -- Persist undo history across sessions
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
if not vim.uv.fs_stat(lazypath) then
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
    "saghen/blink.cmp",
    version = "*",
    opts = {
      keymap = {
        preset = "default",
        ["<CR>"] = { "accept", "fallback" },
        ["<Tab>"] = { "select_next", "snippet_forward", "fallback" },
        ["<S-Tab>"] = { "select_prev", "snippet_backward", "fallback" },
      },
      sources = {
        default = { "lsp", "path", "snippets", "copilot" },
        providers = {
          copilot = {
            name = "copilot",
            module = "blink-cmp-copilot",
            score_offset = 100,
            async = true,
          },
        },
      },
      enabled = function()
        return vim.bo.filetype ~= "markdown"
      end,
    },
    dependencies = {
      {
        "zbirenbaum/copilot.lua",
        cmd = "Copilot",
        event = "InsertEnter",
        config = function()
          require("copilot").setup({
            suggestion = { enabled = false },
            panel = { enabled = false },
          })
        end,
      },
      { "giuxtaposition/blink-cmp-copilot" },
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
    init = function() vim.g.neoterm_default_mod = "vertical" end,
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
    opts = { signcolumn = false, numhl = true },
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
    "williamboman/mason.nvim",
    opts = { ui = { border = "rounded" } },
  },

  {
    "williamboman/mason-lspconfig.nvim",
    config = function()
      require("mason-lspconfig").setup({
        ensure_installed = { "ruby_lsp", "lua_ls", "rust_analyzer" },
      })

      vim.lsp.config("*", { capabilities = require("blink.cmp").get_lsp_capabilities() })

      vim.lsp.config("ruby_lsp", {
        cmd = { "ruby-lsp" },
        filetypes = { "ruby", "eruby" },
        root_dir = function(bufnr, on_dir)
          local bufname = vim.api.nvim_buf_get_name(bufnr)
          local found = vim.fs.find({ "Gemfile", ".git" }, { upward = true, path = vim.fs.dirname(bufname) })[1]
          if found then
            on_dir(vim.fs.dirname(found))
          end
        end,
      })
      vim.lsp.enable("ruby_lsp")

      vim.lsp.config("sorbet", {
        cmd = { "srb", "tc", "--lsp" },
        filetypes = { "ruby" },
        root_dir = function(bufnr, on_dir)
          local bufname = vim.api.nvim_buf_get_name(bufnr)
          local found = vim.fs.find("sorbet/config", { upward = true, path = vim.fs.dirname(bufname) })[1]
          if found then
            on_dir(vim.fs.dirname(vim.fs.dirname(found)))
          end
        end,
      })
      vim.lsp.enable("sorbet")


      vim.lsp.config("lua_ls", {
        settings = {
          Lua = {
            workspace = {
              checkThirdParty = false,
              library = vim.list_extend(
                vim.api.nvim_get_runtime_file("", true),
                { "${3rd}/luv/library" }
              ),
            },
            telemetry = { enable = false },
            diagnostics = { globals = { "vim" } },
          },
        },
      })

      vim.lsp.config("rust_analyzer", {})
      vim.lsp.enable("rust_analyzer")
    end,
  },

  {
    "nvim-lualine/lualine.nvim",
    dependencies = { "nvim-tree/nvim-web-devicons" },
    opts = {
      options = {
        icons_enabled = true,
        theme = "onedark",
        path = 1, -- show relative file path
      },
      sections = {
        lualine_b = {
          -- Use gitsigns_head for branch name (handles git worktrees correctly)
          { function() return vim.b.gitsigns_head or "" end, icon = "" },
          "diff",
          "diagnostics",
        },
      },
    },
  },

  {
    "nvim-treesitter/nvim-treesitter",
    branch = "main",
    build = ":TSUpdate",
    init = function()
      local ensureInstalled = { "lua", "ruby", "rust", "vimdoc" }
      local alreadyInstalled = require("nvim-treesitter.config").get_installed()
      local parsersToInstall = vim.iter(ensureInstalled)
        :filter(function(parser)
          return not vim.tbl_contains(alreadyInstalled, parser)
        end)
        :totable()
      require("nvim-treesitter").install(parsersToInstall)
    end,
  },

  {
    "nvim-treesitter/nvim-treesitter-textobjects",
    branch = "main",
    event = { "BufReadPost", "BufNewFile" },
    config = function()
      -- Textobject selection
      local select = require("nvim-treesitter-textobjects.select")
      vim.keymap.set({ "x", "o" }, "af", function() select.select_textobject("@function.outer", "textobjects") end)
      vim.keymap.set({ "x", "o" }, "if", function() select.select_textobject("@function.inner", "textobjects") end)
      vim.keymap.set({ "x", "o" }, "ac", function() select.select_textobject("@class.outer", "textobjects") end)
      vim.keymap.set({ "x", "o" }, "ic", function() select.select_textobject("@class.inner", "textobjects") end)

      -- Textobject movement
      local move = require("nvim-treesitter-textobjects.move")
      local jumps = {
        ["]m"] = { query = "@function.outer", forward = true, start = true },
        ["]M"] = { query = "@function.outer", forward = true, start = false },
        ["]]"] = { query = "@class.outer", forward = true, start = true },
        ["]["] = { query = "@class.outer", forward = true, start = false },
        ["[m"] = { query = "@function.outer", forward = false, start = true },
        ["[M"] = { query = "@function.outer", forward = false, start = false },
        ["[["] = { query = "@class.outer", forward = false, start = true },
        ["[]"] = { query = "@class.outer", forward = false, start = false },
      }
      for key, opts in pairs(jumps) do
        local fn = opts.forward
          and (opts.start and move.goto_next_start or move.goto_next_end)
          or (opts.start and move.goto_previous_start or move.goto_previous_end)
        vim.keymap.set({ "n", "x", "o" }, key, function() fn(opts.query, "textobjects") end)
      end
    end,
  },

  {
    "olimorris/onedarkpro.nvim",
    priority = 1000,
    config = function() vim.cmd("colorscheme onedark") end,
  },

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

  { "tpope/vim-surround", event = { "BufReadPost", "BufNewFile" } },

  {
    "vim-test/vim-test",
    init = function() vim.g["test#strategy"] = "neoterm" end,
    keys = {
      { "<leader>tf", ":w<cr>:TestFile<cr>", desc = "Test current file" },
      { "<leader>tn", ":w<cr>:TestNearest<cr>", desc = "Test current file" },
      { "<leader>ts", ":w<cr>:TestSuite<cr>", desc = "Test suite" },
      { "<leader>tt", ":w<cr>:TestLast<cr>", desc = "Rerun last test" },
    },
  },

  { "echasnovski/mini.pairs", event = "InsertEnter", opts = {} },
  "wsdjeg/vim-fetch",


}

require("lazy").setup({
  spec = plugins,
  ui = { border = "rounded" },
})



-- Enable treesitter highlighting and indentation when a parser is available
vim.api.nvim_create_autocmd("FileType", {
  callback = function()
    if pcall(vim.treesitter.start) then
      vim.bo.indentexpr = "v:lua.require'nvim-treesitter'.indentexpr()"
    end
  end,
})

vim.diagnostic.config({
  underline = { severity = { max = vim.diagnostic.severity.INFO } },
  virtual_text = { severity = { min = vim.diagnostic.severity.WARN } },
  float = { border = "rounded", header = "" },
})

local function RenameFile()
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
vim.keymap.set("n", "gd", vim.lsp.buf.definition, { desc = "Go to definition" })
vim.keymap.set("n", "[d", function() vim.diagnostic.jump({ count = -1, float = true }) end, { desc = "Diagnostics: prev" })
vim.keymap.set("n", "]d", function() vim.diagnostic.jump({ count = 1, float = true }) end, { desc = "Diagnostics: next" })

-- Keymaps: Remap for dealing with word wrap
vim.keymap.set("n", "k", "v:count == 0 ? 'gk' : 'k'", { expr = true, silent = true })
vim.keymap.set("n", "j", "v:count == 0 ? 'gj' : 'j'", { expr = true, silent = true })

-- Keymaps: misc
vim.keymap.set({ "", "i" }, "<C-s>", "<esc>:w<cr>", { desc = "Save file" })
vim.keymap.set("n", "<Esc>", ":nohlsearch<cr>", { desc = "Remove search highlight"})
vim.keymap.set("n", "<leader>dd", function()
  vim.fn.jobstart({ "open", "https://devdocs.io/#q=" .. vim.fn.expand("<cword>") })
end, { desc = "Open devdocs.io" })
vim.keymap.set("n", "<leader>mv", RenameFile, { desc = "Rename file" })
vim.keymap.set("n", "<leader>nv", ":e ~/dotfiles/.config/nvim/init.lua<cr>", { desc = "Edit nvim config" })
vim.keymap.set("n", "<leader>o", ":only<cr>", { desc = "Only keep current pane" })
vim.keymap.set("n", "<leader>q", "<C-w>c", { desc = "Close buffer" })
vim.keymap.set("n", "<leader>rm", ":!rm %", { desc = "Remove file" })
vim.keymap.set("n", "<leader>vv", ":vnew<cr>", { desc = "New vertical split" })
vim.keymap.set("n", "glf", 'yaW<C-w><C-h>:e <C-r>"<cr>', { desc = "Open file in left split" })
