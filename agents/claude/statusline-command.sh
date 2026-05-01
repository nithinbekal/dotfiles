#!/usr/bin/env bash
input=$(cat)

model_id=$(echo "$input" | jq -r '.model.id // empty')
ctx_pct=$(echo "$input" | jq -r '.context_window.used_percentage // 0')
ctx_size=$(echo "$input" | jq -r '.context_window.context_window_size // 200000')
total_in=$(echo "$input" | jq -r '.context_window.total_input_tokens // 0')
total_out=$(echo "$input" | jq -r '.context_window.total_output_tokens // 0')
total_cost=$(echo "$input" | jq -r '.cost.total_cost_usd // 0')
cwd=$(echo "$input" | jq -r '.worktree.original_cwd // .cwd // empty')

fmt_k() {
  local n=$1
  if [ "$n" -ge 1000000 ]; then
    awk "BEGIN { printf \"%.1fM\", $n / 1000000 }"
  elif [ "$n" -ge 1000 ]; then
    awk "BEGIN { printf \"%.0fk\", $n / 1000 }"
  else
    printf '%s' "$n"
  fi
}

# Pretty model name: claude-sonnet-4-6 → Sonnet 4.6
model_label=$(echo "$model_id" \
  | sed 's/-[0-9]\{8\}$//' \
  | sed 's/\[.*\]//' \
  | awk -F'-' '{
      if (NF >= 4 && $1 == "claude") {
        fam = toupper(substr($2,1,1)) substr($2,2)
        print fam " " $3 "." $4
      } else if (NF >= 3 && $1 == "claude") {
        fam = toupper(substr($2,1,1)) substr($2,2)
        print fam " " $3
      } else { print $0 }
    }')
[ -z "$model_label" ] && model_label=$(echo "$input" | jq -r '.model.display_name // "Unknown"')

ctx_size_fmt=$(fmt_k "$ctx_size")
ctx_pct_fmt=$(printf "%.1f" "$ctx_pct")
total_tokens=$((total_in + total_out))
tokens_fmt=$(fmt_k "$total_tokens")
cost_fmt=$(awk "BEGIN { printf \"%.2f\", $total_cost }")

# Dir: prefer git repo root name, fall back to cwd basename
dir_name=$(basename "$(cd "$cwd" 2>/dev/null && git rev-parse --show-toplevel 2>/dev/null || echo "${cwd:-$PWD}")")

# Effort level (project settings override global)
effort=$(jq -r '.effortLevel // empty' "${cwd}/.claude/settings.json" 2>/dev/null)
[ -z "$effort" ] && effort=$(jq -r '.effortLevel // empty' ~/.claude/settings.json 2>/dev/null)
[ -z "$effort" ] && effort="normal"

# Git branch + staged/untracked counts
git_pill=""
if git -C "${cwd:-.}" rev-parse --git-dir > /dev/null 2>&1; then
  branch=$(git -C "${cwd:-.}" branch --show-current 2>/dev/null)
  [ -z "$branch" ] && branch=$(git -C "${cwd:-.}" rev-parse --abbrev-ref HEAD 2>/dev/null)
  staged=$(git -C "${cwd:-.}" diff --cached --numstat 2>/dev/null | wc -l | tr -d ' ')
  untracked=$(git -C "${cwd:-.}" ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')
  git_pill=" ${branch}"  # IC_BRANCH prepended in p4
  [ "$staged" -gt 0 ]    && git_pill="${git_pill} +${staged}"
  [ "$untracked" -gt 0 ] && git_pill="${git_pill} ?${untracked}"
fi

# Nerd font icons (hex bytes so the file stays ASCII-safe)
IC_FOLDER=$'\xef\x81\xbb'   # U+F07B
IC_BRANCH=$'\xee\x82\xa0'   # U+E0A0
IC_CHART=$'\xef\x82\x80'    # U+F080
IC_DB=$'\xef\x87\x80'       # U+F1C0

# Colors
R=$'\e[0m'
DIM=$'\e[2m'
ACC=$'\e[38;5;135m'
CLAUDE=$'\e[38;2;217;119;87m'
GRN=$'\e[38;5;71m'
YLW=$'\e[38;5;214m'
RED=$'\e[38;5;196m'
WHT=$'\e[97m'

effort_color="$WHT"
case "$effort" in
  minimal)     effort_color="$DIM" ;;
  low)         effort_color="$WHT" ;;
  medium)      effort_color="$YLW" ;;
  high|xhigh)  effort_color="$RED" ;;
esac

SEP="${DIM} ❯ ${R}"

p1="${CLAUDE}✻${R}"
p2="${ACC}⚙ ${R}${WHT}${model_label}${R}${DIM} [${ctx_size_fmt}]${R}${DIM} ·${R} ${effort_color}● ${R}${WHT}${effort}${R}"
p3="${GRN}${IC_FOLDER} ${R}${WHT}${dir_name}${R}"
p4="${YLW}${IC_BRANCH}${R}${WHT}${git_pill}${R}"
p5="${ACC}${IC_CHART} ${R}${WHT}${ctx_pct_fmt}%/${ctx_size_fmt}${R}"
p6="${ACC}${IC_DB} ${R}${WHT}→${tokens_fmt}${R}"
p7="${YLW}\$${cost_fmt}${R}"

line="${p1}${SEP}${p2}${SEP}${p3}"
[ -n "$git_pill" ] && line="${line}${SEP}${p4}"
line="${line}${SEP}${p5}"
[ "$total_tokens" -gt 0 ] && line="${line}${SEP}${p6}"
[ "$(awk "BEGIN { print ($total_cost > 0.001) ? 1 : 0 }")" = "1" ] && line="${line}${SEP}${p7}"

printf '%s\n' "$line"
