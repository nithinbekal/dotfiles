---
name: subagents
description: >-
  Delegate a task to a focused subagent running in its own tmux pane, watch it
  work, exchange messages with it, and collect its report. Default to delegating
  — spawn subagents early and often, and split non-trivial work across
  independent tracks rather than doing it all inline first. Use for anything
  beyond a one-liner: recon, planning, review, a contained implementation/fix,
  or several such tasks in parallel. Requires tmux. Subagents are driven via the `subagents` CLI in this skill directory.
---

# Subagents

Run focused subagents in a dedicated tmux window and talk to them. Each subagent
is an isolated `pi` instance in its own pane of a window named `subagents`.
You hand it a task, watch it, send follow-ups, and collect a report. Members are
told apart by their pane titles (`subagent#<id> <role>`), not the window name.

This is for **handoff with a channel back**: unlike a one-shot run, you can
answer a subagent's questions, steer it, or unblock it mid-task.

## When to use

**Default to delegating.** The bar is low: if a task has more than one step, a
separable part, or would crowd the main context, hand it to a subagent. Spawn
early and split non-trivial work across independent tracks (e.g. one subagent on
recon while another starts implementation) — don't do the whole investigation
inline first and only delegate after being prompted. A subagent's isolated
context keeps the lead lean and lets work happen in parallel.

Reach for a subagent when any of these apply (most of them usually do):

- A task takes more than a single tool call or a single short answer.
- It has a separable part (recon before editing, one PR per fix, a parallel
  investigation track).
- It would push the main conversation toward compaction.
- Several independent tasks can run at once.
- You want a different role/model/context for one piece of the work.

Only do it inline when it's truly a one-liner — a single read/grep/edit, a
one-shot question with an obvious answer, or something faster to just do than
to describe. If you're unsure, lean toward delegating.

Pick a **role** from the available role files (see `subagents roles`). Each
role carries its own system prompt, model, and tool allowlist.

## Valid roles (do not invent names)

Role names must match a file in `~/.pi/agent/agents/` exactly. Spawning a
non-existent role fails with `subagents: role '<name>' not found`. There are
**five** roles (run `subagents roles` to confirm):

| Role | Model | Use for |
| --- | --- | --- |
| `implementer` | gpt-5.6-sol | Heavyweight: implement a feature/fix/parity/test change end-to-end in a worktree, push, (optionally) open a PR |
| `pr-fixer` | gpt-5.6-sol | Make an already-open PR's CI green + address review findings, push, retrigger CI |
| `critic` | gpt-5.6-sol | Adversarial second opinion on another agent's output (plan, fix, review) |
| `helper` | gpt-5.6-luna | Lightweight quick-task: fetch/summarize files, run one command, make a specific edit, find/list something |
| `watcher` | gpt-5.6-luna | Long-running monitor of sibling subagents + open PRs |

`implementer` is the default for "go do this implementation work." `pr-fixer`
is for *already-open* PRs. `critic` reviews an agent's *output*, not diffs.
`helper` is the lightweight role for small single-purpose tasks that don't need
a worktree or end-to-end implementation. `watcher` is the long-running monitor.
Heavyweight work uses `gpt-5.6-sol`; `helper` and `watcher` use the fast gpt-5.6-luna model.

If you're unsure of a role name, run `subagents roles` — it lists every
available role and its model. Never guess a role name; the names above are the
complete set. Model names (`sonnet`, `opus`, `haiku`, `glm`, …) are **not**
roles — pass them via `-m`, e.g. `-m openai/gpt-5.6-sol`.

## Running it

The `subagents` script sits next to this file in the skill directory. Resolve
its absolute path from this skill's location and call it directly — e.g.
`<skill-dir>/subagents run ...`. The examples below write `subagents` for
brevity; use the full path to the script in this directory.

## Commands

```bash
subagents doctor                 # check window/state layout, role models, and live provider auth
subagents roles                  # list roles and their provider-qualified models
subagents run [-m MODEL] [--effort LEVEL] <role> "<task>"   # start; -m overrides the role model
subagents tell <id> "<message>"  # answer a pushed question, steer, or nudge
subagents status                 # show working|idle|exited (diagnostics only)
subagents peek <id> [lines]      # inspect a reported stall (never poll with it)
subagents ls                     # list active subagents
subagents stop <id|--all>        # shut down one or all
subagents wait <id> [seconds]    # pull fallback only; block and print report
subagents reap                   # pull fallback only; drain finished reports
```

## Choosing a model

A role may pin a default model (kept where the choice is deliberate, e.g. a
cross-family critic). Otherwise pick per task with `-m`, sized to complexity:

- trivial / mechanical (list files, simple edits) → a small fast model (e.g. haiku)
- standard work (most recon, implementation, review) → a mid model (e.g. sonnet)
- hard reasoning / careful review / adversarial critique → a top model (e.g. opus, gpt-5.x)

Use provider-qualified ids (e.g. `anthropic/claude-sonnet-4-6`) to avoid an
ambiguous-model error. `--effort` sets the thinking level (off..xhigh) for harder tasks.

## Push workflow (default)

The `subagents-watch` extension watches the session state directory, pushes each
finished/blocked report into the lead conversation, and wakes the lead.

1. Run `subagents doctor` before the first delegation (and after changing roles,
   launchers, auth, tmux sessions, or state). Fix every `FAIL`; warnings identify
   stale/orphaned state worth cleaning up.
2. Issue one or more `subagents run <role> "<task>"` commands.
3. **END YOUR TURN immediately after the run command(s).** Do not call `wait`,
   do not poll with `peek`/`status`, and do not keep doing the delegated work
   inline. The extension will push the report and trigger the next turn.
4. Read the pushed report. If it asks for input, use `tell`, then **end the turn
   again**. Use `peek` only to diagnose a stall already reported by the watcher,
   never as a polling loop.
5. `stop` the agent when done, unless you will reuse its context for a follow-up.

## Responsiveness

Push delivery is automatic: ending the lead turn lets the watcher wake it as
soon as a report arrives. Polling competes for the same completion event, wastes
turns, and can hide the pushed report, so never combine watcher mode with
`wait`/`reap`. A pushed `idle` or `exited` report is the signal to inspect,
answer with `tell`, restart, or stop the agent.

## Pull fallback (only without the extension)

If `subagents-watch` is not loaded, use `subagents wait <id>` for one agent or
`subagents reap` to drain all reports. On timeout/idle, inspect once with `peek`,
answer with `tell`, and `wait` again. Never use this fallback merely because a
push-mode agent is still working.

## Notes

- **Session-scoped:** every command (and the watcher extension) only sees and
  acts on subagents in the *current* tmux session. Subagents in other sessions
  are invisible and protected — `stop --all` never reaches them.
- Requires tmux. Subagents run with built-in tools only (read, bash, edit, write,
  grep, find, ls), so roles that depend on external/MCP tools won't have them.
- A role's declared model is used as-is. In an environment with multiple model
  providers, role files should use a provider-qualified model id (e.g.
  `provider/model-name`) to avoid an ambiguous-model error at startup.
- If subagents fail to reach a model, the launch command may need a wrapper to
  inject provider auth — set `SUBAGENTS_PI` (e.g. in a private shell rc) to that
  wrapper plus `pi`. It defaults to `pi`.
