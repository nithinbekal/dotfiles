# diff-panel

Interactive git diff overlay for the current pi session. Single command: `/diff-panel`.

## Command

`/diff-panel` toggles a scrollable overlay anchored to the right side of the terminal. It shows a changed-file tree in the left sidebar and the selected file's diff on the right, auto-refreshing on every `write`/`edit`/`bash` tool call.

The overlay **takes keyboard focus on open** so its keys work immediately. Press `Alt+G` to hand control back to the prompt; press `Alt+G` again to re-focus the overlay. Press `Esc` to close it.

## Keys

**Inside the overlay (focused, default on open):**

- `↑` / `↓` or `j` / `k` — move cursor between files in the tree
- `Enter` or `→` / `l` — focus the selected file's diff
- `←` / `h` — return focus from the diff to the file tree
- In diff focus, `↑` / `↓` or `j` / `k` move the highlighted line cursor
- `]` / `[` — jump to the next / previous diff hunk
- `PgUp` / `PgDn` (or `Ctrl+U` / `Ctrl+D`) — move through the selected file's diff by one page
- `c` — add a comment on the highlighted diff line (prompts for text)
- `x` — remove the latest comment on the highlighted diff line
- `s` — send all comments with diff context to the prompt, ending with `---` and blank space for a final note
- `r` — force refresh
- `g` / `G` — first / last file
- `Alt+G` — release focus back to the prompt (overlay stays open)
- `Esc` or `q` — close the overlay entirely

**From the prompt (overlay open, prompt focused):**

- `Alt+G` — re-focus the overlay

Run `/diff-panel` again at any time to close it.

## Behavior

- **In a git repo:** Status is parsed from `git status --porcelain=v1 -uall`, then deduplicated by path. A file with both staged and unstaged changes appears once. The file tree right-aligns per-file `+added -deleted` counts. Per-file diffs come from `git diff HEAD -- <path>` so staged and unstaged changes are shown together; untracked files are synthesized as new-file diffs.
- **Comments are session-local annotations.** Press `c` on the highlighted diff line, enter text, and the comment is rendered under that diff line in an indented box. Press `x` to remove the latest comment on the highlighted line. Press `s` to copy all comments with file/hunk context into the prompt followed by `---` and two newlines for a final note. Comments are not written to git or disk yet.
- **Outside a git repo:** Falls back to diffs built from snapshots taken on first `write`/`edit`. Git-only actions are disabled.

Diffs are rendered with explicit bright green/red on dark green/red backgrounds, so additions/deletions pop regardless of theme. When the diff pane is focused, the current diff line gets the theme's selected-line background, an underline, and a yellow left-gutter marker.

## Notes

- Width is 90% while focused and 40% while unfocused (min 50 cols), anchored top-right, full height.
- `/reload` picks up code changes to this extension without restarting pi.
