# diff-panel

Interactive git status overlay for the current pi session. Single command: `/diff-panel`.

## Command

`/diff-panel` toggles a scrollable overlay anchored to the right side of the terminal. It shows a list of changed files grouped into **Untracked → Unstaged → Staged**, auto-refreshing on every `write`/`edit`/`bash` tool call.

The overlay **takes keyboard focus on open** so its keys work immediately. Press `Alt+G` (or `Esc`) to hand control back to the prompt; press `Alt+G` again to re-focus the overlay.

## Keys

**Inside the overlay (focused, default on open):**

- `↑` / `↓` or `j` / `k` — move cursor between files
- `<space>` — toggle inline diff under the current file
- `-` — stage (untracked/unstaged) or unstage (staged) the current file
- `c` — commit staged changes (prompts for message)
- `r` — force refresh
- `g` / `G` — first / last file
- `PgUp` / `PgDn` (or `Ctrl+U` / `Ctrl+D`) — scroll viewport one page
- `Alt+G` or `Esc` — release focus back to the prompt (overlay stays open)
- `q` — close the overlay entirely

**From the prompt (overlay open, prompt focused):**

- `Alt+G` — re-focus the overlay

Run `/diff-panel` again at any time to close it.

## Behavior

- **In a git repo:** Status is parsed from `git status --porcelain=v1 -uall`. A file with both staged and unstaged changes appears in both sections (matches `git status`). Per-file diffs come from `git diff [--cached] -- <path>`; untracked files are synthesized as new-file diffs.
- **`c` commits only what's staged** (no implicit `git add -A`). If nothing is staged, you'll be told to press `-` first.
- **Outside a git repo:** Falls back to a single "Unstaged" section built from snapshots taken on first `write`/`edit`. `<space>` still expands diffs; `-` is disabled.

Diffs are rendered with explicit bright green/red on dark green/red backgrounds, so additions/deletions pop regardless of theme.

## Notes

- Width is 50% (min 50 cols), anchored top-right, full height.
- `/reload` picks up code changes to this extension without restarting pi.
