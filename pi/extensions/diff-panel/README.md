# diff-panel

Live diff viewer for the current pi session. Single command: `/diff-panel`.

## Command

`/diff-panel` toggles a scrollable modal overlay anchored to the right side of the terminal. Shows the full git diff (or a synthetic snapshot diff outside git repos), auto-refreshing on every `write`/`edit`/`bash` tool call.

## Keys (in the overlay)

- `↑` / `↓` or `j` / `k` — scroll one line
- `PgUp` / `PgDn` or `Ctrl+U` / `Ctrl+D` / `Space` — scroll a page
- `g` / `G` or `Home` / `End` — top / bottom
- `r` — force refresh
- `c` — commit: closes overlay, prompts for a commit message, runs `git add -A && git commit -m "…"`
- `q` or `Esc` — close

## How it works

- **In a git repo:** Shows `git diff HEAD` plus untracked files synthesized as new-file diffs.
- **Outside a git repo:** Snapshots each file the first time the agent touches it via `write`/`edit`, then diffs current contents against the snapshot. (Bash-driven changes to other files are not detected — use a git repo for full coverage.)

Diffs are rendered with explicit bright green/red on dark green/red backgrounds, so additions/deletions pop regardless of theme.

## Notes

- The overlay is modal: while it's open, keystrokes drive the panel (scroll/commit/close). Press `q`/`Esc` to return to typing.
- Width is 50% (min 50 cols), anchored `right-center`.
- `/reload` picks up code changes to this extension without restarting pi.
