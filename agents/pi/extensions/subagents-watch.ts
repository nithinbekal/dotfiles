/**
 * Subagents Watcher (lead-side, push-async)
 *
 * Turns the `subagents` skill into push mode: watches its state dir and injects
 * each newly-finished subagent report into the lead's conversation — waking the
 * lead — so you don't have to block in `subagents wait` or poll manually.
 *
 * All detection lives in the CLI (`subagents events`, which prints NEW completion
 * events as TSV: id<TAB>role<TAB>status<TAB>reportPath and advances markers so
 * each is delivered once). This extension just drains it on an interval +
 * fs.watch and pushes via pi.sendMessage(steer, triggerTurn).
 *
 * Without this extension the skill still works in pull mode (wait/reap/status).
 *
 * Env:
 *   SUBAGENTS_BIN       path to the subagents script (else autodetected)
 *   SUBAGENTS_WAKE      "0" to inject without waking an idle lead (default: wake)
 *   SUBAGENTS_WATCH_MS  poll interval in ms (default 3000)
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const STATE_DIR = path.join(
	process.env.XDG_STATE_HOME || path.join(os.homedir(), ".local/state"),
	"subagents",
);
const PREVIEW_CHARS = 1500;

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

	let draining = false;
	let pending = false;

	const hasSubagents = (): boolean => {
		try {
			return fs
				.readdirSync(STATE_DIR, { withFileTypes: true })
				.some((e) => e.isDirectory() && /^\d+$/.test(e.name));
		} catch {
			return false;
		}
	};

	const pushEvent = (id: string, role: string, status: string, reportPath: string): void => {
		let body = "";
		try {
			body = fs.readFileSync(reportPath, "utf-8").trim();
		} catch {
			/* report file may be gone if the subagent was stopped */
		}
		const truncated = body.length > PREVIEW_CHARS;
		const preview = truncated ? `${body.slice(0, PREVIEW_CHARS)}\n…(truncated)` : body;
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
		pi.sendMessage(
			{ customType: "subagent-report", content, display: true, details: { id, role, status, reportPath } },
			{ deliverAs: "steer", triggerTurn: wake },
		);
	};

	const drain = (): void => {
		if (draining) {
			pending = true;
			return;
		}
		if (!hasSubagents()) return;
		draining = true;
		execFile(bin, ["events"], { timeout: 10_000, encoding: "utf-8" }, (err, stdout) => {
			draining = false;
			if (!err && stdout) {
				for (const line of stdout.split("\n")) {
					if (!line.trim()) continue;
					const [id, role, status, reportPath] = line.split("\t");
					if (id && reportPath) pushEvent(id, role || "?", status || "done", reportPath);
				}
			}
			if (pending) {
				pending = false;
				setTimeout(drain, 50);
			}
		});
	};

	const timer = setInterval(drain, intervalMs);
	if (typeof timer.unref === "function") timer.unref();

	// fs.watch gives snappier delivery of `done` events (result-file writes);
	// the interval is the safety net and drives the time-based idle detection.
	try {
		fs.mkdirSync(STATE_DIR, { recursive: true });
		const watcher = fs.watch(STATE_DIR, { recursive: true }, () => setTimeout(drain, 100));
		watcher.on?.("error", () => {});
	} catch {
		/* fs.watch unavailable — interval still covers it */
	}
}
