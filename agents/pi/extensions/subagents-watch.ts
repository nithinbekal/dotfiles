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
const DELIVERY_RETRY_MS = 15_000;

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

// Resolve lazily from session_start rather than blocking every extension factory
// load. Prefer $TMUX_PANE (the exact pane), then parse $TMUX.
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

	let sessionDir: string | null = null;
	let pendingDir: string | null = null;
	let deliveredDir: string | null = null;
	let sessionFile: string | undefined;
	let active = false;
	let draining = false;
	let pending = false;
	let timer: ReturnType<typeof setInterval> | null = null;
	let watcher: fs.FSWatcher | null = null;
	let scheduledDrain: ReturnType<typeof setTimeout> | null = null;
	let scheduledDrainAt = 0;
	let drainPromise: Promise<void> | null = null;
	let finishDrain: (() => void) | null = null;
	const confirmedEventIds = new Set<string>();
	const deliveryAttempts = new Map<string, number>();
	const memoryEvents = new Map<string, CompletionEvent>();
	const reportedSpoolErrors = new Set<string>();

	const reportSpoolError = (operation: string, error: unknown): void => {
		const message = error instanceof Error ? error.message : String(error);
		const key = `${operation}: ${message}`;
		if (reportedSpoolErrors.has(key)) return;
		reportedSpoolErrors.add(key);
		console.error(`[subagents-watch] ${key}`);
	};

	const hasSubagents = (): boolean => {
		if (!sessionDir) return false;
		try {
			return fs
				.readdirSync(sessionDir, { withFileTypes: true })
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

	const deliveredPath = (eventId: string): string | null =>
		deliveredDir ? path.join(deliveredDir, eventId) : null;

	const isDelivered = (eventId: string): boolean => {
		if (confirmedEventIds.has(eventId)) return true;
		const marker = deliveredPath(eventId);
		if (!marker) return false;
		try {
			if (!fs.existsSync(marker)) return false;
			confirmedEventIds.add(eventId);
			return true;
		} catch {
			return false;
		}
	};

	const queueEvent = (event: CompletionEvent): boolean => {
		if (!pendingDir) return false;
		const eventId = completionEventId(event);
		const queuedPath = path.join(pendingDir, `${eventId}.json`);
		let tempPath: string | null = null;
		try {
			fs.mkdirSync(pendingDir, { recursive: true });
			if (fs.existsSync(queuedPath)) return true;
			tempPath = path.join(pendingDir, `.${eventId}.${randomUUID()}.tmp`);
			fs.writeFileSync(tempPath, JSON.stringify(event), "utf-8");
			fs.renameSync(tempPath, queuedPath);
			tempPath = null;
			return true;
		} catch (error) {
			reportSpoolError(`could not spool event ${eventId}`, error);
			if (tempPath) {
				try { fs.unlinkSync(tempPath); } catch { /* ignore temp cleanup errors */ }
			}
			return false;
		}
	};

	const markDelivered = (eventId: string): boolean => {
		const marker = deliveredPath(eventId);
		if (!marker || !deliveredDir) return false;
		try {
			fs.mkdirSync(deliveredDir, { recursive: true });
			try {
				fs.writeFileSync(marker, `${Date.now()}\n`, { encoding: "utf-8", flag: "wx" });
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
			}
			confirmedEventIds.add(eventId);
			return true;
		} catch (error) {
			reportSpoolError(`could not record delivered event ${eventId}`, error);
			return false;
		}
	};

	const confirmDelivery = (eventId: string): void => {
		if (!markDelivered(eventId)) return;
		memoryEvents.delete(eventId);
		deliveryAttempts.delete(eventId);
		if (!pendingDir) return;
		try { fs.unlinkSync(path.join(pendingDir, `${eventId}.json`)); } catch { /* ledger prevents replay */ }
	};

	const eventIdFromEntry = (entry: unknown): string | null => {
		if (!entry || typeof entry !== "object") return null;
		const record = entry as {
			type?: unknown;
			customType?: unknown;
			details?: unknown;
			message?: { role?: unknown; customType?: unknown; details?: unknown };
		};
		const custom = record.type === "custom_message"
			? record
			: record.type === "message" && record.message?.role === "custom"
				? record.message
				: null;
		if (!custom || custom.customType !== "subagent-report") return null;
		const details = custom.details as { eventId?: unknown } | undefined;
		return typeof details?.eventId === "string" ? details.eventId : null;
	};

	const restoreDeliveredEntries = (ctx: ExtensionContext): void => {
		for (const entry of ctx.sessionManager.getEntries()) {
			const eventId = eventIdFromEntry(entry);
			if (eventId) confirmDelivery(eventId);
		}
	};

	// A non-throwing pi.sendMessage call is not an acknowledgement: Pi catches
	// asynchronous send failures internally. Confirm only after the custom message
	// is observable in the persisted JSONL session, then write an on-disk ledger
	// before removing its spool file. A crash after session append but before the
	// ledger write can cause a duplicate on restart, which is intentionally safer
	// than silent loss.
	const reconcilePersistedDeliveries = (): void => {
		if (!sessionFile) return;
		let contents: string;
		try {
			contents = fs.readFileSync(sessionFile, "utf-8");
		} catch {
			return;
		}
		for (const line of contents.split("\n")) {
			if (!line.trim()) continue;
			try {
				const eventId = eventIdFromEntry(JSON.parse(line));
				if (eventId) confirmDelivery(eventId);
			} catch {
				/* a concurrent final JSONL line may not be complete yet */
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

	const attemptDelivery = (input: CompletionEvent): void => {
		if (!active) return;
		const event = snapshotEvent(input);
		const { id, role, status, reportPath, reportBody = "" } = event;
		const eventId = completionEventId(event);
		if (isDelivered(eventId)) {
			confirmDelivery(eventId);
			return;
		}
		const lastAttempt = deliveryAttempts.get(eventId) ?? 0;
		if (Date.now() - lastAttempt < DELIVERY_RETRY_MS) return;

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

		deliveryAttempts.set(eventId, Date.now());
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
			// Check the session after Pi has had a chance to persist the message.
			scheduleDrain(100);
		} catch {
			// Synchronous stale-runtime errors must never escape a background callback.
			deliveryAttempts.delete(eventId);
		}
	};

	const rememberEvent = (input: CompletionEvent): void => {
		const event = snapshotEvent(input);
		const eventId = completionEventId(event);
		if (isDelivered(eventId)) {
			confirmDelivery(eventId);
			return;
		}
		// Keep an in-memory copy before attempting the spool. If ENOSPC or a
		// permission error prevents persistence after the CLI marker advanced, the
		// next drain retries this event instead of silently dropping it.
		memoryEvents.set(eventId, event);
		if (queueEvent(event)) memoryEvents.delete(eventId);
		attemptDelivery(event);
	};

	const flushMemoryEvents = (): void => {
		for (const [eventId, event] of memoryEvents) {
			if (isDelivered(eventId)) {
				confirmDelivery(eventId);
				continue;
			}
			if (queueEvent(event)) memoryEvents.delete(eventId);
			attemptDelivery(event);
		}
	};

	const quarantineCorruptEvent = (queuedPath: string): void => {
		let corruptPath = `${queuedPath}.corrupt`;
		if (fs.existsSync(corruptPath)) corruptPath += `.${randomUUID()}`;
		try {
			fs.renameSync(queuedPath, corruptPath);
		} catch (error) {
			reportSpoolError(`could not quarantine corrupt event ${queuedPath}`, error);
		}
	};

	const flushQueuedEvents = (): void => {
		if (!active || !pendingDir) return;
		let files: fs.Dirent[];
		try {
			files = fs.readdirSync(pendingDir, { withFileTypes: true });
		} catch {
			return;
		}

		// The spool is shared by Pi hosts in one tmux session. Running multiple lead
		// Pi hosts in the same tmux session is unsupported and may duplicate a replay;
		// duplicates are acceptable, while records are never removed merely because
		// sendMessage returned. The delivered ledger deduplicates after persistence.
		for (const file of files) {
			if (!file.isFile() || !file.name.endsWith(".json")) continue;
			const queuedPath = path.join(pendingDir, file.name);
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
				quarantineCorruptEvent(queuedPath);
				continue;
			}

			const eventId = completionEventId(event);
			if (isDelivered(eventId)) {
				confirmDelivery(eventId);
				continue;
			}
			attemptDelivery(event);
		}
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
		reconcilePersistedDeliveries();
		flushMemoryEvents();
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
							if (event) rememberEvent(event);
						}
					}
				} catch (error) {
					reportSpoolError("event drain callback failed", error);
				} finally {
					const shouldDrainAgain = pending;
					pending = false;
					completeDrain();
					if (shouldDrainAgain) scheduleDrain(50);
				}
			});
		} catch (error) {
			reportSpoolError("could not start event drain", error);
			completeDrain();
		}
	};

	const start = (_event: unknown, ctx: ExtensionContext): void => {
		if (active) return;
		const sid = currentSessionId();
		if (!sid) return;
		sessionDir = path.join(STATE_DIR, sid);
		pendingDir = path.join(sessionDir, ".watcher-pending");
		deliveredDir = path.join(sessionDir, ".watcher-delivered");
		sessionFile = ctx.sessionManager.getSessionFile();
		active = true;
		restoreDeliveredEntries(ctx);
		try { fs.mkdirSync(sessionDir, { recursive: true }); } catch { /* later drains will retry */ }

		timer = setInterval(() => scheduleDrain(0), intervalMs);
		if (typeof timer.unref === "function") timer.unref();

		// fs.watch gives snappier delivery of `done` events (result-file writes);
		// the interval is the safety net and drives the time-based idle detection.
		try {
			watcher = fs.watch(sessionDir, { recursive: true }, (_eventType, filename) => {
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
		// lock and spools late stdout before Pi invalidates this extension runtime.
		const inFlight = drainPromise;
		if (inFlight) await inFlight;
		for (const event of memoryEvents.values()) queueEvent(event);
		// If spool storage stays unavailable until the process exits, no extension
		// can make a volatile event survive that process death; queueEvent has
		// already surfaced that residual failure on stderr rather than hiding it.
		draining = false;
	};

	pi.on("session_start", start);
	pi.on("message_end", (event) => {
		const eventId = eventIdFromEntry({ type: "message", message: event.message });
		if (!eventId) return;
		if (!sessionFile) {
			// In-memory sessions have no stronger persistence signal. message_end means
			// the report reached the agent event stream; a process crash before the
			// in-memory session consumes it remains an unavoidable residual window.
			confirmDelivery(eventId);
		} else {
			// The hook runs immediately before SessionManager persistence. Reconcile on
			// the next timer tick rather than acknowledging prematurely.
			scheduleDrain(0);
		}
	});
	pi.on("session_shutdown", stop);
}
