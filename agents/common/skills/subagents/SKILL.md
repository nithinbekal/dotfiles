---
name: subagents
description: Delegate a complex or separable task to a focused subagent running in its own tmux pane, watch it work, exchange messages with it, and collect its report. Use when a task benefits from an isolated context (codebase recon, planning, review, a self-contained implementation/fix) or when you want to run several such tasks in parallel. Requires tmux. Subagents are driven via the `subagents` CLI in this skill directory.
---

# Subagents

Run focused subagents in a dedicated tmux window and talk to them. Each subagent
is an isolated `pi` instance in its own pane of a window named `subagents`.
You hand it a task, watch it, send follow-ups, and collect a report. Members are
told apart by their pane titles (`subagent#<id> <role>`), not the window name.

This is for **handoff with a channel back**: unlike a one-shot run, you can
answer a subagent's questions, steer it, or unblock it mid-task.

## When to use

- A task deserves its own context window (deep recon, planning, review, a
  contained implementation or fix) so it doesn't crowd the main conversation.
- Several independent tasks can run in parallel.
- Pick a **role** from the available role files (see `subagents roles`). Each
  role carries its own system prompt, model, and tool allowlist.

Do NOT use a subagent for quick, single-step things you can just do yourself.

## Running it

The `subagents` script sits next to this file in the skill directory. Resolve
its absolute path from this skill's location and call it directly — e.g.
`<skill-dir>/subagents run ...`. The examples below write `subagents` for
brevity; use the full path to the script in this directory.

## Commands

```bash
subagents roles                  # list available roles (and their models)
subagents run [-m MODEL] [--effort LEVEL] <role> "<task>"   # start a subagent; -m overrides the role's model
subagents wait <id> [seconds]    # block until it finishes (returns early on completion/idle); prints its report
subagents reap                   # print any newly-finished reports (pull mode; non-blocking)
subagents status                 # show each subagent as working|idle|exited (non-blocking)
subagents tell <id> "<message>"  # send a follow-up: answer a question, steer, or nudge
subagents peek <id> [lines]      # show the tail of its pane (watch it work)
subagents ls                     # list active subagents
subagents stop <id|--all>        # shut a subagent (or all) down (window closes when empty)
```

## Choosing a model

A role may pin a default model (kept where the choice is deliberate, e.g. a
cross-family critic). Otherwise pick per task with `-m`, sized to complexity:

- trivial / mechanical (list files, simple edits) → a small fast model (e.g. haiku)
- standard work (most recon, implementation, review) → a mid model (e.g. sonnet)
- hard reasoning / careful review / adversarial critique → a top model (e.g. opus, gpt-5.x)

Use provider-qualified ids (e.g. `anthropic/claude-sonnet-4-6`) to avoid an
ambiguous-model error. `--effort` sets the thinking level (off..xhigh) for harder tasks.

## Push mode vs pull mode

If the `subagents-watch` extension is loaded in the lead (it watches the state
dir), finished reports are **pushed into your conversation automatically** and
wake you — you don't need to `wait` or poll. Just `run` subagents, keep working,
and reports arrive as they complete. Use `tell`/`peek` to respond. (Don't also
`wait` on a subagent the watcher is handling — both consume the same event.)

Without the extension, use **pull mode**: `subagents wait <id>` (block for one),
or `subagents reap` (drain all newly-finished reports) and `subagents status`
between your own steps.

## Workflow (pull mode)

1. `subagents run <role> "<task>"` → note the `#id`.
2. `subagents wait <id>` → read the report it wrote (or `reap` to drain all).
3. If it asks a question or stalls: `subagents peek <id>` to see what's happening,
   then `subagents tell <id> "<answer or nudge>"` and `subagents wait <id>` again.
4. **Shut it down when done** with `subagents stop <id>`, unless you expect to
   give it more related work soon (subagents keep their context between tasks, so
   reuse one for follow-on work rather than spawning a fresh one).

Run several in parallel by issuing multiple `subagents run`s, then `wait` each.

## Responsiveness (how often to check)

`subagents wait` polls every couple seconds and returns as soon as the subagent
finishes OR goes idle — including when it hits a blocker, since the protocol makes
it surface the blocker and stop. A single `wait` blocks for at most ~2 min, then
returns "still working" so you (or the human) can step in; call it again to keep
waiting, or pass a longer timeout: `subagents wait <id> 600`.

The lead acts one step at a time, so a subagent only gets an answer when you next
`wait`/`peek`. For work you want to stay on top of, `run` then `wait` (responsive
within seconds). If you fire several and check only occasionally, expect a blocked
subagent to wait until your next check — subagents are told to work autonomously
and stop only for true blockers, so this mostly costs latency, not throughput.

## Handling stalls

A subagent reports back by writing a result file; `subagents wait` also detects
when one goes **idle**. If `wait` says the subagent is idle but wrote no report,
or it times out:

- `subagents peek <id>` to read its current state — it may be asking a question
  or waiting for a decision.
- `subagents tell <id> "<answer>"` to unblock it, or `subagents tell <id> "continue"`
  to nudge, then `subagents wait <id>` again.
- If it's wedged, `subagents stop <id>` and start over.

## Notes

- Requires tmux. Subagents run with built-in tools only (read, bash, edit, write,
  grep, find, ls), so roles that depend on external/MCP tools won't have them.
- A role's declared model is used as-is. In an environment with multiple model
  providers, role files should use a provider-qualified model id (e.g.
  `provider/model-name`) to avoid an ambiguous-model error at startup.
- If subagents fail to reach a model, the launch command may need a wrapper to
  inject provider auth — set `SUBAGENTS_PI` (e.g. in a private shell rc) to that
  wrapper plus `pi`. It defaults to `pi`.
