# Nithin Bekal's dotfiles

## New machine setup

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

### Clone and install

```bash
git clone git@github.com:nithinbekal/dotfiles.git ~/dotfiles
cd ~/dotfiles
./install.sh
```

After install, authenticate the GitHub CLI:

```bash
gh auth login
```

### Windows

On Windows, run `windows/windows_setup.ps1` as Administrator before the steps above. This installs WSL2, WezTerm, win32yank, Obsidian, Cursor, and JetBrains Mono Nerd Font. Reboot if prompted, then follow the steps above inside the WSL2 Ubuntu terminal.

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
.\windows\windows_setup.ps1
```

`install.sh` detects WSL2 and handles apt packages, Rust, mise, Claude Code, and the win32yank Neovim clipboard bridge automatically.

## Agent config

Agent-related files live under `agents/`:

- `agents/common/` — shared skills for all agents
- `agents/pi/` — Pi settings, extensions, themes, and Pi-specific files
- `agents/claude/` — Claude settings and scripts

Shared skills are linked into `~/.agents/skills/`, `~/.claude/skills/`, and `~/.pi/agent/skills/`.

### iTerm settings

After running `./install.sh` on a new computer,
the following settings need to be changed in iTerm

- General > Window
  - Native full screen windows: false
- Profiles > Colors
  - Color presets: Tango dark
- Profiles > Text
  - Font: FiraCode Nerd Font Mono, Retina
  - Font size: 13
  - Vertical space: 112
  - Use ligatures: true
- Profiles > Terminal
  - Enable mouse reporting
    - Report mouse wheel events: true
    - Everything else: false
