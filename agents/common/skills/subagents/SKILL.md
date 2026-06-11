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
subagents run  <role> "<task>"   # start a subagent, hand it the task; prints its id
subagents wait <id> [seconds]    # block until it finishes the current task; prints its report
subagents tell <id> "<message>"  # send a follow-up: answer a question, steer, or nudge
subagents peek <id> [lines]      # show the tail of its pane (watch it work)
subagents ls                     # list active subagents
subagents stop <id|--all>        # shut a subagent (or all) down (window closes when empty)
```

## Workflow

1. `subagents run <role> "<task>"` → note the `#id`.
2. `subagents wait <id>` → read the report it wrote.
3. If it asks a question or stalls: `subagents peek <id>` to see what's happening,
   then `subagents tell <id> "<answer or nudge>"` and `subagents wait <id>` again.
4. **Shut it down when done** with `subagents stop <id>`, unless you expect to
   give it more related work soon (subagents keep their context between tasks, so
   reuse one for follow-on work rather than spawning a fresh one).

Run several in parallel by issuing multiple `subagents run`s, then `wait` each.

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
