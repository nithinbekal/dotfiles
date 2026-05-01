# Windows Setup

Two-step setup: run the PowerShell script on Windows first, then clone dotfiles and run `install.sh` inside WSL2.

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

## Step 2 — Manual steps inside WSL2

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

`install.sh` detects WSL2 and handles apt packages, Rust, mise, Claude Code, and the win32yank Neovim clipboard bridge automatically.

## Notes

- `install.sh` is idempotent — it skips steps that are already done.
- `windows_setup.ps1` skips winget apps that are already installed and the font if it is already present.
- Require `clipboard.lua` from your `init.lua` if it isn't already.
