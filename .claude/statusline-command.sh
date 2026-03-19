#!/bin/sh
# Claude Code status line - mirrors the zsh prompt style

input=$(cat)

cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd')
model=$(echo "$input" | jq -r '.model.display_name')
used_pct=$(echo "$input" | jq -r '.context_window.used_percentage // empty')

# Shorten home directory to ~
home="$HOME"
short_cwd="${cwd/#$home/\~}"

# Get git branch (skip optional locks to avoid interfering with running git processes)
git_branch=""
if git -C "$cwd" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git_branch=$(git -C "$cwd" branch --show-current 2>/dev/null)
fi

# Build context usage progress bar
context_info=""
if [ -n "$used_pct" ]; then
  used_int=$(echo "$used_pct" | cut -d. -f1)
  bar_total=10
  filled=$(( used_int * bar_total / 100 ))
  empty=$(( bar_total - filled ))
  bar=""
  i=0
  while [ $i -lt $filled ]; do
    bar="${bar}█"
    i=$(( i + 1 ))
  done
  i=0
  while [ $i -lt $empty ]; do
    bar="${bar}░"
    i=$(( i + 1 ))
  done
  context_info=" [${bar}] ${used_int}%"
fi

# Build git branch segment
branch_segment=""
if [ -n "$git_branch" ]; then
  branch_segment=" $git_branch"
fi

printf "\033[34;1m%s\033[0m\033[34;1m%s\033[0m\033[32m%s\033[0m\033[35m%s\033[0m" \
  "$short_cwd" \
  "$context_info" \
  "$branch_segment" \
  " | $model"
