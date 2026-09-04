# Nithin Bekal's dotfiles

## New machine setup

### SSH key

```bash
ssh-keygen -t ed25519 -C "nithinbekal@gmail.com"
cat ~/.ssh/id_ed25519.pub
```

Add the printed key to GitHub → Settings → SSH keys, then test:

```bash
ssh -T git@github.com
```

### Git config

The first time you run a git command, MacOS will prompt you to install Xcode CLI tools, which will take 5-10 minutes to install.

```bash
git config --global user.name "Nithin Bekal"
git config --global user.email "nithinbekal@gmail.com"
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
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/nithinbekal/dotfiles/main/windows/windows_setup.ps1" -OutFile "$env:TEMP\windows_setup.ps1" -UseBasicParsing
& "$env:TEMP\windows_setup.ps1"
```

`install.sh` detects WSL2 and handles apt packages, Rust, mise, Claude Code, and the win32yank Neovim clipboard bridge automatically.

## Agent config

Agent-related files live under `agents/`:

- `agents/common/` — shared skills for all agents
- `agents/pi/` — Pi settings, extensions, themes, and Pi-specific files
- `agents/claude/` — Claude settings and scripts

Shared skills are linked into `~/.agents/skills/`, `~/.claude/skills/`, and `~/.pi/agent/skills/`.

### Pi

[pi](https://github.com/earendil-works/pi) is installed via its installer; extensions, skills, and themes live under `agents/pi/` and are linked into `~/.pi/agent/` by `install.sh`.

Extensions in this repo (linked into `~/.pi/agent/extensions/`):

- `status-line.ts` — status line with git branch/worktree awareness
- `subagents-watch.ts` — pushes subagent reports to the lead agent
- `side-pane-editor.ts` — side-pane file editor
- `turn-timestamps.ts` — per-turn timestamps
- `notify.ts` — desktop notifications
- `self-review` — self-review extension

Skills in this repo (under `agents/common/skills/`): `nithin-writing-voice`, `subagents`.

Standalone Pi projects:

- [`pi-subagents`](https://github.com/nithinbekal/pi-subagents) — tmux-based subagent runner and report watcher (the `subagents` CLI + `subagents` skill)
- [`pi-atlas`](https://github.com/nithinbekal/pi-atlas) — file-based persistent memory extension

On a new machine, add packages after `pi` is installed and authenticated:

```bash
pi install git:github.com/Shopify/pi-tool-gateway-extension
pi install ~/src/pi-atlas   # after cloning the sibling projects below
```

The custom theme (`nithinbekal.json`) is linked from `agents/pi/themes/`.

## Tmux helpers

- `m` — compact popup switcher for tmux windows running Pi or Claude Code. Press prefix + `m` inside tmux, type to filter by agent/session/worktree/window, then use `1`-`9` or Enter to jump. Press Ctrl-P to toggle pane preview.
- `tmux-switcher` — popup switcher for tmux sessions, listing session name, worktree name, and git branch. Press Alt-`s` inside tmux, type to filter, then use `1`-`9` or Enter to jump.

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
