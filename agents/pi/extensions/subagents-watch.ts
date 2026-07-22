/**
 * Subagents Watcher (lead-side, push-async)
 *
 * Turns the `subagents` skill into push mode: watches its state dir and injects
 * each newly-finished subagent report into the lead's conversation — waking the
 * lead — so you don't have to block in `subagents wait` or poll manually.
 *
 * All detection lives in the CLI (`subagents events`, which prints NEW completion
 * events as TSV: id<TAB>role<TAB>status<TAB>reportPath and advances its detection
 * markers). This extension drains it on an interval + fs.watch and pushes via
 * pi.sendMessage(steer, triggerTurn). Late events are durably spooled for replay.
 *
 * Without this extension the skill still works in pull mode (wait/reap/status).
 *
 * Env:
 *   SUBAGENTS_BIN       path to the subagents script (else autodetected)
 *   SUBAGENTS_WAKE      "0" to inject without waking an idle lead (default: wake)
 *   SUBAGENTS_WATCH_MS  poll interval in ms (default 3000)
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { execFile, execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const STATE_DIR = path.join(
	process.env.XDG_STATE_HOME || path.join(os.homedir(), ".local/state"),
	"subagents",
);
const PREVIEW_CHARS = 1500;

type CompletionEvent = {
	id: string;
	role: string;
	status: string;
	reportPath: string;
	reportBody?: string;
};

function completionEventId({ id, role, status, reportPath }: CompletionEvent): string {
	return createHash("sha256").update(JSON.stringify({ id, role, status, reportPath })).digest("hex");
}

// Resolve the current tmux session id the same way the `subagents` CLI does, so
// this extension watches the SAME per-session subfolder the CLI writes into
// (<state>/$<session-id>/<id>/). Prefer $TMUX_PANE (exact pane we run in), then
// parse $TMUX ("socket,pid,<session-num>" -> "$<num>"); give up if neither is
// set (not in tmux -> subagents can't run anyway).
function currentSessionId(): string | null {
	const pane = process.env.TMUX_PANE;
	if (pane) {
		try {
			const sid = execFileSync("tmux", ["display-message", "-pt", pane, "#{session_id}"], {
				encoding: "utf-8",
				timeout: 2000,
			}).trim();
			if (sid) return sid;
		} catch {
			/* fall through to $TMUX parsing */
		}
	}
	const tmux = process.env.TMUX;
	if (tmux) {
		const parts = tmux.split(",");
		const num = parts[2];
		if (num && /^\d+$/.test(num)) return "$" + num;
	}
	return null;
}

function findBin(): string | null {
	const candidates = [
		process.env.SUBAGENTS_BIN,
		path.join(os.homedir(), ".pi/agent/skills/subagents/subagents"),
		path.join(os.homedir(), "dotfiles/agents/common/skills/subagents/subagents"),
	].filter(Boolean) as string[];
	for (const c of candidates) {
		try {
			fs.accessSync(c, fs.constants.X_OK);
			return c;
		} catch {
			/* keep looking */
		}
	}
	return null;
}

export default function (pi: ExtensionAPI) {
	const bin = findBin();
	if (!bin) return; // skill not installed — nothing to watch

	const wake = process.env.SUBAGENTS_WAKE !== "0";
	const intervalMs = Number(process.env.SUBAGENTS_WATCH_MS) || 3000;

	// Per-session subfolder: only this session's subagents live here, so the
	// watcher can never push another session's reports into this lead.
	const sid = currentSessionId();
	const SESSION_DIR = sid ? path.join(STATE_DIR, sid) : null;
	const PENDING_DIR = SESSION_DIR ? path.join(SESSION_DIR, ".watcher-pending") : null;

	let active = false;
	let draining = false;
	let pending = false;
	let timer: ReturnType<typeof setInterval> | null = null;
	let watcher: fs.FSWatcher | null = null;
	let scheduledDrain: ReturnType<typeof setTimeout> | null = null;
	let scheduledDrainAt = 0;
	let drainPromise: Promise<void> | null = null;
	let finishDrain: (() => void) | null = null;
	const deliveredEventIds = new Set<string>();

	const hasSubagents = (): boolean => {
		if (!SESSION_DIR) return false;
		try {
			return fs
				.readdirSync(SESSION_DIR, { withFileTypes: true })
				.some((e) => e.isDirectory() && /^\d+$/.test(e.name));
		} catch {
			return false;
		}
	};

	const parseEventLine = (line: string): CompletionEvent | null => {
		const [id, role, status, reportPath] = line.split("\t");
		if (!id || !reportPath) return null;
		return { id, role: role || "?", status: status || "done", reportPath };
	};

	const snapshotEvent = (event: CompletionEvent): CompletionEvent => {
		if (event.reportBody !== undefined) return event;
		let reportBody = "";
		try {
			reportBody = fs.readFileSync(event.reportPath, "utf-8").trim().slice(0, PREVIEW_CHARS + 1);
		} catch {
			/* report file may be gone if the subagent was stopped */
		}
		return { ...event, reportBody };
	};

	const pushEvent = (input: CompletionEvent): boolean => {
		if (!active) return false;
		const event = snapshotEvent(input);
		const { id, role, status, reportPath, reportBody = "" } = event;
		const eventId = completionEventId(event);
		if (deliveredEventIds.has(eventId)) return true;

		const truncated = reportBody.length > PREVIEW_CHARS;
		const preview = truncated ? `${reportBody.slice(0, PREVIEW_CHARS)}\n…(truncated)` : reportBody;
		const label =
			status === "done" ? "finished"
			: status === "exited" ? "exited"
			: status === "idle" ? "is idle — may have answered inline or need input"
			: status;
		const content =
			`📋 subagent #${id} (${role}) ${label}.\n\n` +
			`${preview || "(no report captured)"}\n\n` +
			`(full report: ${reportPath}${truncated ? "; preview truncated above" : ""}` +
			` — peek: subagents peek ${id}, follow up: subagents tell ${id} <msg>)`;

		try {
			pi.sendMessage(
				{
					customType: "subagent-report",
					content,
					display: true,
					details: { id, role, status, reportPath, eventId },
				},
				{ deliverAs: "steer", triggerTurn: wake },
			);
			deliveredEventIds.add(eventId);
			return true;
		} catch {
			// Background callbacks must never crash pi if the session was replaced
			// after shutdown started but before this callback finished unwinding.
			return false;
		}
	};

	// `subagents events` advances its delivery markers before returning. If its
	// callback completes after session shutdown, preserve the event for the new
	// extension instance instead of calling the stale ExtensionAPI or losing it.
	const queueEvent = (event: CompletionEvent): void => {
		if (!PENDING_DIR) return;
		let tempPath: string | null = null;
		try {
			fs.mkdirSync(PENDING_DIR, { recursive: true });
			const durableEvent = snapshotEvent(event);
			const contents = JSON.stringify(durableEvent);
			const eventId = completionEventId(durableEvent);
			const queuedPath = path.join(PENDING_DIR, `${eventId}.json`);
			tempPath = path.join(PENDING_DIR, `.${eventId}.${randomUUID()}.tmp`);
			fs.writeFileSync(tempPath, contents, "utf-8");
			fs.renameSync(tempPath, queuedPath);
			tempPath = null;
		} catch {
			if (tempPath) {
				try { fs.unlinkSync(tempPath); } catch { /* ignore */ }
			}
			/* best effort — never crash pi from a background callback */
		}
	};

	const flushQueuedEvents = (): void => {
		if (!active || !PENDING_DIR) return;
		let files: fs.Dirent[];
		try {
			files = fs.readdirSync(PENDING_DIR, { withFileTypes: true });
		} catch {
			return;
		}

		for (const file of files) {
			if (!file.isFile() || !file.name.endsWith(".json")) continue;
			const queuedPath = path.join(PENDING_DIR, file.name);
			let event: CompletionEvent;
			try {
				const parsed = JSON.parse(fs.readFileSync(queuedPath, "utf-8")) as Partial<CompletionEvent>;
				if (
					typeof parsed.id !== "string" ||
					typeof parsed.role !== "string" ||
					typeof parsed.status !== "string" ||
					typeof parsed.reportPath !== "string" ||
					(parsed.reportBody !== undefined && typeof parsed.reportBody !== "string")
				) {
					throw new Error("invalid queued completion event");
				}
				event = parsed as CompletionEvent;
			} catch {
				try { fs.unlinkSync(queuedPath); } catch { /* ignore */ }
				continue;
			}

			try {
				if (!pushEvent(event)) return;
				try { fs.unlinkSync(queuedPath); } catch { /* retry on the next drain */ }
			} catch {
				// Background callback guard: pushEvent catches stale-ctx errors,
				// but never let a stray throw escape into a timer callback.
				return;
			}
		}
	};

	const scheduleDrain = (delayMs: number): void => {
		if (!active) return;
		const runAt = Date.now() + delayMs;
		if (scheduledDrain && runAt >= scheduledDrainAt) return;
		if (scheduledDrain) clearTimeout(scheduledDrain);
		scheduledDrainAt = runAt;
		scheduledDrain = setTimeout(() => {
			scheduledDrain = null;
			scheduledDrainAt = 0;
			if (active) drain();
		}, delayMs);
		if (typeof scheduledDrain.unref === "function") scheduledDrain.unref();
	};

	const completeDrain = (): void => {
		draining = false;
		const finish = finishDrain;
		finishDrain = null;
		drainPromise = null;
		finish?.();
	};

	const drain = (): void => {
		if (!active) return;
		flushQueuedEvents();
		if (draining) {
			pending = true;
			return;
		}
		if (!hasSubagents()) return;
		draining = true;
		drainPromise = new Promise<void>((resolve) => {
			finishDrain = resolve;
		});
		try {
			execFile(bin, ["events"], { encoding: "utf-8", timeout: 10_000 }, (_err, stdout) => {
				try {
					if (stdout) {
						for (const line of stdout.split("\n")) {
							if (!line.trim()) continue;
							const event = parseEventLine(line);
							if (event && !pushEvent(event)) queueEvent(event);
						}
					}
				} catch {
					// Background callbacks must never crash pi. pushEvent/queueEvent
					// catch stale-ctx errors themselves; this guards any stray throw.
				} finally {
					const shouldDrainAgain = pending;
					pending = false;
					completeDrain();
					if (shouldDrainAgain) scheduleDrain(50);
				}
			});
		} catch {
			completeDrain();
		}
	};

	const start = (_event: unknown, ctx: ExtensionContext): void => {
		if (active || !SESSION_DIR) return;
		active = true;
		deliveredEventIds.clear();
		for (const entry of ctx.sessionManager.getEntries()) {
			if (entry.type !== "message" || entry.message.role !== "custom") continue;
			if (entry.message.customType !== "subagent-report") continue;
			const details = entry.message.details as { eventId?: unknown } | undefined;
			if (typeof details?.eventId === "string") deliveredEventIds.add(details.eventId);
		}
		try { fs.mkdirSync(SESSION_DIR, { recursive: true }); } catch { /* ignore */ }

		timer = setInterval(() => scheduleDrain(0), intervalMs);
		if (typeof timer.unref === "function") timer.unref();

		// fs.watch gives snappier delivery of `done` events (result-file writes);
		// the interval is the safety net and drives the time-based idle detection.
		try {
			watcher = fs.watch(SESSION_DIR, { recursive: true }, (_eventType, filename) => {
				const changedPath = filename?.toString();
				if (
					!changedPath ||
					path.basename(changedPath) === "result.md" ||
					changedPath.includes(".watcher-pending")
				) {
					scheduleDrain(100);
				}
			});
			watcher.on("error", () => {});
		} catch {
			/* fs.watch unavailable — interval still covers it */
		}
		scheduleDrain(0);
	};

	const stop = async (): Promise<void> => {
		active = false;
		pending = false;

		if (timer) {
			clearInterval(timer);
			timer = null;
		}
		if (watcher) {
			try { watcher.close(); } catch { /* ignore watcher close errors */ }
			watcher = null;
		}
		if (scheduledDrain) {
			clearTimeout(scheduledDrain);
			scheduledDrain = null;
			scheduledDrainAt = 0;
		}

		// Let an in-flight `subagents events` finish so it releases its directory
		// lock and queues late stdout before pi invalidates this extension runtime.
		const inFlight = drainPromise;
		if (inFlight) await inFlight;
		draining = false;
	};

	pi.on("session_start", start);
	pi.on("session_shutdown", stop);
}
