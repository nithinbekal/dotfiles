# diff-panel

Interactive git status overlay for the current pi session. Single command: `/diff-panel`.

## Command

`/diff-panel` toggles a scrollable overlay anchored to the right side of the terminal. By default it shows a list of changed files grouped into **Untracked → Unstaged → Staged**, auto-refreshing on every `write`/`edit`/`bash` tool call.

The overlay is **non-capturing**: while it's open you can keep typing in the prompt as usual. To interact with it, focus it with the shortcut below.

## Keys

**From the prompt (overlay open, prompt focused):**

- `Alt+G` — focus the overlay so its keys take effect

**Inside the overlay (focused):**

- `↑` / `↓` or `j` / `k` — move cursor between files
- `<space>` — toggle inline diff under the current file
- `-` — stage (untracked/unstaged) or unstage (staged) the current file
- `X` — discard changes to the current file (press twice to confirm; for untracked files this **deletes the file from disk**)
- `c` — commit staged changes (prompts for message)
- `r` — force refresh
- `g` / `G` — first / last file
- `PgUp` / `PgDn` (or `Ctrl+U` / `Ctrl+D`) — scroll viewport one page
- `Esc` — release focus back to the prompt (overlay stays open)
- `q` — close the overlay entirely

Run `/diff-panel` again at any time to close it.

## Behavior

- **In a git repo:** Status is parsed from `git status --porcelain=v1 -uall`. A file with both staged and unstaged changes appears in both sections (matches `git status`). Per-file diffs come from `git diff [--cached] -- <path>`; untracked files are synthesized as new-file diffs.
- **`c` commits only what's staged** (no implicit `git add -A`). If nothing is staged, you'll be told to press `-` first.
- **`X` discard semantics by section:**
  - *Untracked* — deletes the file from disk (**unrecoverable**).
  - *Unstaged* — `git checkout HEAD -- <path>` (revert worktree to HEAD).
  - *Staged* — `git restore --staged --worktree -- <path>` (drops both index and worktree changes).

  Requires two `X` presses on the same file. Pressing any other key cancels the pending discard. Disabled outside a git repo.
- **Outside a git repo:** Falls back to a single "Unstaged" section built from snapshots taken on first `write`/`edit`. `<space>` still expands diffs; `-` is disabled.

Diffs are rendered with explicit bright green/red on dark green/red backgrounds, so additions/deletions pop regardless of theme.

## Notes

- Width is 50% (min 50 cols), anchored top-right, full height.
- `/reload` picks up code changes to this extension without restarting pi.
