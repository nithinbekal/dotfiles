/**
 * Diff Panel - shows a live git diff of changes made during the session
 *
 * Command:
 *   /diff-panel  - Toggle a right-side overlay showing the diff (scrollable, modal).
 *                  Press `c` inside the overlay to commit the changes (prompts for message).
 *
 * The diff auto-refreshes whenever the agent uses write/edit/bash tools.
 * Works in git repos (uses `git diff`) and outside (snapshots originals on first touch).
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ExtensionAPI, ExtensionContext, Theme } from "@mariozechner/pi-coding-agent";
import { isToolCallEventType } from "@mariozechner/pi-coding-agent";
import {
	type Component,
	matchesKey,
	truncateToWidth,
	wrapTextWithAnsi,
} from "@mariozechner/pi-tui";

// ---------- Shared state (module-scoped so component + handlers see same data) ----------

interface DiffState {
	cwd: string;
	isGitRepo: boolean;
	// For non-git fallback: path -> original contents at first touch
	snapshots: Map<string, string | null>; // null means "did not exist before"
	// Files we've tracked being touched
	touched: Set<string>;
	// Cached diff text + last refresh timestamp
	diffText: string;
	lastRefresh: number;
}

const state: DiffState = {
	cwd: process.cwd(),
	isGitRepo: false,
	snapshots: new Map(),
	touched: new Set(),
	diffText: "",
	lastRefresh: 0,
};

// ---------- Diff generation ----------

function detectGitRepo(cwd: string): boolean {
	try {
		execSync("git rev-parse --is-inside-work-tree", {
			cwd,
			stdio: ["ignore", "pipe", "ignore"],
		});
		return true;
	} catch {
		return false;
	}
}

function generateGitDiff(cwd: string): string {
	try {
		// Show both staged and unstaged changes vs HEAD, plus untracked files
		const tracked = execSync("git diff HEAD --no-color", {
			cwd,
			encoding: "utf8",
			maxBuffer: 10 * 1024 * 1024,
		});

		// Add untracked files as a synthetic "new file" diff
		const untracked = execSync("git ls-files --others --exclude-standard", {
			cwd,
			encoding: "utf8",
			maxBuffer: 1024 * 1024,
		})
			.split("\n")
			.filter((f) => f.trim());

		let untrackedDiff = "";
		for (const f of untracked) {
			try {
				const full = resolve(cwd, f);
				if (!existsSync(full)) continue;
				const content = readFileSync(full, "utf8");
				const lines = content.split("\n");
				untrackedDiff += `diff --git a/${f} b/${f}\n`;
				untrackedDiff += `new file mode 100644\n`;
				untrackedDiff += `--- /dev/null\n`;
				untrackedDiff += `+++ b/${f}\n`;
				untrackedDiff += `@@ -0,0 +1,${lines.length} @@\n`;
				untrackedDiff += lines.map((l) => `+${l}`).join("\n") + "\n";
			} catch {
				// skip unreadable
			}
		}

		return (tracked + untrackedDiff).trim() || "(no changes yet)";
	} catch (e) {
		return `(git diff failed: ${(e as Error).message})`;
	}
}

function generateSnapshotDiff(): string {
	if (state.touched.size === 0) return "(no changes yet)";

	let out = "";
	for (const path of state.touched) {
		const original = state.snapshots.get(path);
		let current: string | null = null;
		try {
			if (existsSync(path)) current = readFileSync(path, "utf8");
		} catch {
			current = null;
		}

		const rel = path.startsWith(state.cwd) ? path.slice(state.cwd.length + 1) : path;

		if (original === null && current !== null) {
			// New file
			const lines = current.split("\n");
			out += `diff --git a/${rel} b/${rel}\nnew file mode 100644\n--- /dev/null\n+++ b/${rel}\n`;
			out += `@@ -0,0 +1,${lines.length} @@\n`;
			out += lines.map((l) => `+${l}`).join("\n") + "\n";
		} else if (original !== null && current === null) {
			// Deleted file
			const lines = original.split("\n");
			out += `diff --git a/${rel} b/${rel}\ndeleted file mode 100644\n--- a/${rel}\n+++ /dev/null\n`;
			out += `@@ -1,${lines.length} +0,0 @@\n`;
			out += lines.map((l) => `-${l}`).join("\n") + "\n";
		} else if (original !== null && current !== null && original !== current) {
			// Modified - simple full-file replace diff (no LCS)
			const oldLines = original.split("\n");
			const newLines = current.split("\n");
			out += `diff --git a/${rel} b/${rel}\n--- a/${rel}\n+++ b/${rel}\n`;
			out += `@@ -1,${oldLines.length} +1,${newLines.length} @@\n`;
			out += oldLines.map((l) => `-${l}`).join("\n") + "\n";
			out += newLines.map((l) => `+${l}`).join("\n") + "\n";
		}
	}

	return out.trim() || "(no changes yet)";
}

function refreshDiff(): void {
	state.diffText = state.isGitRepo ? generateGitDiff(state.cwd) : generateSnapshotDiff();
	state.lastRefresh = Date.now();
}

function snapshotIfNeeded(path: string): void {
	if (state.isGitRepo) return; // git tracks for us
	const abs = resolve(state.cwd, path);
	if (state.snapshots.has(abs)) return;
	try {
		if (existsSync(abs)) {
			state.snapshots.set(abs, readFileSync(abs, "utf8"));
		} else {
			state.snapshots.set(abs, null);
		}
	} catch {
		state.snapshots.set(abs, null);
	}
}

function trackPath(path: string): void {
	const abs = resolve(state.cwd, path);
	state.touched.add(abs);
}

// ---------- Diff styling ----------

// ANSI codes — explicit bright green/red so additions/deletions pop
// regardless of theme. We use these instead of pi's renderDiff because
// renderDiff expects a line-numbered format (`+123 content`) and silently
// renders raw `git diff HEAD` output as dim context.
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const FG_GREEN = "\x1b[32m";
const FG_RED = "\x1b[31m";
const FG_CYAN = "\x1b[36m";
const FG_YELLOW = "\x1b[33m";
const FG_GRAY = "\x1b[90m";
const BG_GREEN = "\x1b[48;5;22m"; // dark green bg for added lines
const BG_RED = "\x1b[48;5;52m"; // dark red bg for removed lines

// Tabs in source code are a real footgun for pi-tui's width calculations:
// wrapTextWithAnsi() and truncateToWidth() count a TAB as 1 visible column,
// but the terminal renders it as 4 or 8 columns. That mismatch makes the
// overlay row wider than `width`, tripping the TUI overflow guard
// (e.g. "Rendered line N exceeds terminal width (396 > 393)").
// Expand tabs to spaces up front so widths line up.
function expandTabs(line: string, tabSize = 4): string {
	if (!line.includes("\t")) return line;
	let out = "";
	let col = 0;
	for (const ch of line) {
		if (ch === "\t") {
			const pad = tabSize - (col % tabSize);
			out += " ".repeat(pad);
			col += pad;
		} else {
			out += ch;
			col += 1;
		}
	}
	return out;
}

function styleDiffLine(line: string): string {
	line = expandTabs(line);
	if (line.length === 0) return "";
	// File header lines
	if (line.startsWith("diff --git ")) {
		return `${BOLD}${FG_CYAN}${line}${RESET}`;
	}
	if (line.startsWith("index ") || line.startsWith("new file") || line.startsWith("deleted file")) {
		return `${FG_GRAY}${line}${RESET}`;
	}
	if (line.startsWith("--- ") || line.startsWith("+++ ")) {
		return `${BOLD}${FG_GRAY}${line}${RESET}`;
	}
	// Hunk header
	if (line.startsWith("@@")) {
		return `${FG_YELLOW}${line}${RESET}`;
	}
	// Added line — bright green on dark green bg, bold marker
	if (line.startsWith("+")) {
		return `${BG_GREEN}${FG_GREEN}${BOLD}+${RESET}${BG_GREEN}${FG_GREEN}${line.slice(1)}${RESET}`;
	}
	// Removed line — bright red on dark red bg, bold marker
	if (line.startsWith("-")) {
		return `${BG_RED}${FG_RED}${BOLD}-${RESET}${BG_RED}${FG_RED}${line.slice(1)}${RESET}`;
	}
	// Context (space prefix) — dim
	return `${DIM}${line}${RESET}`;
}

function styledDiffLines(): string[] {
	return state.diffText.split("\n").map(styleDiffLine);
}

// ---------- Modal overlay component (full scrollable diff viewer) ----------

class DiffOverlay implements Component {
	private scroll = 0;
	private lastWidth = 0;
	private cachedWrappedLines: string[] = [];
	private lastDiffStamp = -1;
	private visibleContentHeight = 30;

	constructor(
		private theme: Theme,
		private done: () => void,
		private requestRender: () => void,
		private onCommit: () => void,
	) {
		refreshDiff();
	}

	handleInput(data: string): void {
		if (matchesKey(data, "escape") || data === "q" || data === "Q") {
			this.done();
			return;
		}
		if (data === "c" || data === "C") {
			this.onCommit();
			return;
		}
		const visibleHeight = this.visibleContentHeight;
		const maxScroll = Math.max(0, this.cachedWrappedLines.length - visibleHeight);

		if (matchesKey(data, "up") || data === "k") {
			this.scroll = Math.max(0, this.scroll - 1);
		} else if (matchesKey(data, "down") || data === "j") {
			this.scroll = Math.min(maxScroll, this.scroll + 1);
		} else if (matchesKey(data, "pageUp") || data === "\x15") {
			this.scroll = Math.max(0, this.scroll - visibleHeight);
		} else if (matchesKey(data, "pageDown") || data === "\x04" || data === " ") {
			this.scroll = Math.min(maxScroll, this.scroll + visibleHeight);
		} else if (matchesKey(data, "home") || data === "g") {
			this.scroll = 0;
		} else if (matchesKey(data, "end") || data === "G") {
			this.scroll = maxScroll;
		} else if (data === "r" || data === "R") {
			refreshDiff();
			this.cachedWrappedLines = [];
		} else {
			return;
		}
		this.requestRender();
	}

	invalidate(): void {
		this.cachedWrappedLines = [];
	}

	render(width: number): string[] {
		const th = this.theme;
		const innerW = Math.max(20, width - 2);

		// Re-wrap when width changes or diff updates
		if (
			this.cachedWrappedLines.length === 0 ||
			this.lastWidth !== width ||
			this.lastDiffStamp !== state.lastRefresh
		) {
			const styled = styledDiffLines();
			const wrapped: string[] = [];
			for (const line of styled) {
				const pieces = wrapTextWithAnsi(line, innerW - 2);
				for (const p of pieces) wrapped.push(p);
			}
			this.cachedWrappedLines = wrapped;
			this.lastWidth = width;
			this.lastDiffStamp = state.lastRefresh;
			// Clamp scroll if diff shrank
			const maxScroll = Math.max(0, this.cachedWrappedLines.length - this.visibleContentHeight);
			if (this.scroll > maxScroll) this.scroll = maxScroll;
		}

		const totalLines = this.cachedWrappedLines.length;
		const fileCount = (state.diffText.match(/^diff --git /gm) || []).length;
		const title = th.bold(th.fg("accent", "📋 Session Diff"));
		const stats = th.fg("muted", `  ${fileCount} file${fileCount === 1 ? "" : "s"}  ${totalLines} lines`);
		const mode = th.fg("dim", state.isGitRepo ? "git" : "snapshot");

		const top = th.fg("border", "╭" + "─".repeat(innerW) + "╮");
		const bottom = th.fg("border", "╰" + "─".repeat(innerW) + "╯");
		// truncateToWidth with pad=true both truncates overflow AND pads underflow
		// to exactly innerW. This is the safety net that prevents the TUI
		// "Rendered line N exceeds terminal width" crash if wrapTextWithAnsi
		// ever returns a piece slightly wider than requested (wide chars, ANSI
		// edge cases).
		const row = (s: string) =>
			th.fg("border", "│") + truncateToWidth(s, innerW, "", true) + th.fg("border", "│");

		const lines: string[] = [];
		lines.push(top);
		lines.push(row(` ${title}${stats}  ${mode}`));
		lines.push(row(th.fg("border", "─".repeat(innerW))));

		const contentHeight = this.visibleContentHeight;
		const visible = this.cachedWrappedLines.slice(this.scroll, this.scroll + contentHeight);
		for (const l of visible) lines.push(row(" " + l + " "));
		for (let i = visible.length; i < contentHeight; i++) lines.push(row(""));

		const end = Math.min(this.scroll + contentHeight, totalLines);
		const scrollInfo = totalLines > contentHeight
			? `${this.scroll + 1}-${end} / ${totalLines}`
			: `${totalLines} lines`;
		lines.push(row(th.fg("dim", ` ${scrollInfo}`)));
		lines.push(row(th.fg("dim", " ↑↓/jk • PgUp/PgDn • g/G • r refresh • c commit • q/Esc close")));
		lines.push(bottom);

		return lines;
	}
}

// ---------- Tracked tool detection ----------

function pathsFromToolCall(toolName: string, input: any): string[] {
	if (toolName === "write" || toolName === "edit") {
		return input?.path ? [input.path] : [];
	}
	if (toolName === "bash") {
		// Best-effort: don't try to parse arbitrary bash. Fall back to tracking nothing —
		// in git mode we'll see all changes anyway via `git diff`.
		return [];
	}
	return [];
}

// ---------- Extension entry ----------

export default function diffPanelExtension(pi: ExtensionAPI): void {
	let overlayActive = false;
	let overlayDone: (() => void) | null = null;

	pi.on("session_start", async (_event, ctx) => {
		state.cwd = ctx.cwd;
		state.isGitRepo = detectGitRepo(ctx.cwd);
		refreshDiff();
	});

	// Snapshot before write/edit (non-git mode)
	pi.on("tool_call", async (event) => {
		if (!state.isGitRepo) {
			if (isToolCallEventType("write", event) || isToolCallEventType("edit", event)) {
				const path = (event.input as any).path;
				if (path) snapshotIfNeeded(path);
			}
		}
	});

	// After tool result, refresh diff
	pi.on("tool_result", async (event) => {
		const paths = pathsFromToolCall(event.toolName, event.input);
		for (const p of paths) trackPath(p);

		// Refresh on any potentially file-mutating tool (incl. bash in git mode)
		if (
			event.toolName === "write" ||
			event.toolName === "edit" ||
			event.toolName === "bash"
		) {
			refreshDiff();
		}
	});

	async function commitFlow(ctx: ExtensionContext): Promise<void> {
		if (!state.isGitRepo) {
			ctx.ui.notify("Not a git repo — cannot commit", "warning");
			return;
		}
		let hasChanges = false;
		try {
			const staged = execSync("git diff --cached --name-only", { cwd: state.cwd, encoding: "utf8" }).trim();
			const unstaged = execSync("git diff --name-only", { cwd: state.cwd, encoding: "utf8" }).trim();
			const untracked = execSync("git ls-files --others --exclude-standard", { cwd: state.cwd, encoding: "utf8" }).trim();
			hasChanges = !!(staged || unstaged || untracked);
		} catch {
			hasChanges = false;
		}
		if (!hasChanges) {
			ctx.ui.notify("No changes to commit", "info");
			return;
		}

		const message = await ctx.ui.input("Commit message", "e.g. fix: handle edge case");
		if (!message || !message.trim()) {
			ctx.ui.notify("Commit cancelled", "info");
			return;
		}

		try {
			execSync("git add -A", { cwd: state.cwd, stdio: ["ignore", "pipe", "pipe"] });
			execSync(`git commit -m ${JSON.stringify(message.trim())}`, {
				cwd: state.cwd,
				stdio: ["ignore", "pipe", "pipe"],
			});
			const sha = execSync("git rev-parse --short HEAD", { cwd: state.cwd, encoding: "utf8" }).trim();
			ctx.ui.notify(`Committed ${sha}: ${message.trim()}`, "info");
			refreshDiff();
		} catch (e) {
			const stderr = (e as { stderr?: Buffer }).stderr?.toString().trim() || (e as Error).message;
			ctx.ui.notify(`Commit failed: ${stderr.split("\n")[0]}`, "error");
		}
	}

	pi.registerCommand("diff-panel", {
		description: "Toggle the side diff panel (modal overlay)",
		handler: async (_args, ctx) => {
			if (overlayActive) {
				overlayDone?.();
				return;
			}
			refreshDiff();
			overlayActive = true;
			let pendingCommit = false;
			await ctx.ui.custom<void>(
				(tui, theme, _kb, done) => {
					overlayDone = () => {
						done();
						overlayActive = false;
						overlayDone = null;
					};
					const onCommit = () => {
						pendingCommit = true;
						overlayDone!();
					};
					return new DiffOverlay(
						theme,
						() => overlayDone!(),
						() => tui.requestRender(),
						onCommit,
					);
				},
				{
					overlay: true,
					overlayOptions: {
						width: "50%",
						minWidth: 50,
						maxHeight: "90%",
						anchor: "right-center",
						margin: { right: 1 },
					},
				},
			);
			if (pendingCommit) {
				await commitFlow(ctx);
			}
		},
	});

}
