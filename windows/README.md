# Windows Setup

Two-step setup: run the PowerShell script on Windows first, then the bash script inside WSL2.

## Step 1 — Windows (PowerShell as Administrator)

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
.\windows_setup.ps1
```

This installs:
- WSL2
- Windows Defender exclusion for the WSL2 path
- WezTerm, win32yank, Obsidian, Cursor (via winget)
- JetBrains Mono Nerd Font

**Reboot after this step** if WSL2 was newly installed.

## Step 2 — WSL2 Ubuntu terminal

```bash
bash wsl2_setup.sh
```

This installs: git, curl, build-essential, Neovim, Rust, mise, Claude Code, and sets up the Neovim win32yank clipboard bridge.

## Step 3 — Manual steps inside WSL2

These are interactive and are best done by hand:

### SSH key

```bash
ssh-keygen -t ed25519 -C "your@email.com"
cat ~/.ssh/id_ed25519.pub
```

Add the printed key to GitHub → Settings → SSH keys, then test:

```bash
ssh -T git@github.com
```

### Git config

```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

### GitHub CLI

```bash
gh auth login
```

### Clone dotfiles and run install

```bash
git clone git@github.com:<username>/dotfiles.git ~/dotfiles
cd ~/dotfiles
./install.sh
```

## Notes

- `wsl2_setup.sh` is idempotent — it skips steps that are already done.
- `windows_setup.ps1` skips winget apps that are already installed and the font if it is already present.
- Tool versions installed by `mise install` are defined by the `mise.toml` in your dotfiles, not hardcoded here.
- The Neovim clipboard file is written to `~/.config/nvim/lua/clipboard.lua`; require it from your `init.lua` if it isn't already.
