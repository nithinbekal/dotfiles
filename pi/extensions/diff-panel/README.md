# diff-panel

Interactive git status overlay for the current pi session. Single command: `/diff-panel`.

## Command

`/diff-panel` toggles a scrollable modal overlay anchored to the right side of the terminal. By default it shows a list of changed files grouped into **Untracked → Unstaged → Staged**, auto-refreshing on every `write`/`edit`/`bash` tool call.

## Keys (in the overlay)

- `↑` / `↓` or `j` / `k` — move cursor between files
- `<space>` — toggle inline diff under the current file
- `-` — stage (untracked/unstaged) or unstage (staged) the current file
- `c` — commit staged changes (prompts for message)
- `r` — force refresh
- `g` / `G` — first / last file
- `PgUp` / `PgDn` (or `Ctrl+U` / `Ctrl+D`) — scroll viewport one page
- `q` or `Esc` — close

## Behavior

- **In a git repo:** Status is parsed from `git status --porcelain=v1 -uall`. A file with both staged and unstaged changes appears in both sections (matches `git status`). Per-file diffs come from `git diff [--cached] -- <path>`; untracked files are synthesized as new-file diffs.
- **`c` commits only what's staged** (no implicit `git add -A`). If nothing is staged, you'll be told to press `-` first.
- **Outside a git repo:** Falls back to a single "Unstaged" section built from snapshots taken on first `write`/`edit`. `<space>` still expands diffs; `-` is disabled.

Diffs are rendered with explicit bright green/red on dark green/red backgrounds, so additions/deletions pop regardless of theme.

## Notes

- The overlay is modal: while it's open, keystrokes drive the panel. Press `q`/`Esc` to return to typing.
- Width is 50% (min 50 cols), anchored top-right, full height.
- `/reload` picks up code changes to this extension without restarting pi.
