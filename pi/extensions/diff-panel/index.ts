/**
 * Diff Panel — interactive git status view.
 *
 * Command:
 *   /diff-panel  - Toggle a right-side overlay showing a list of changed files.
 *
 * Layout:
 *   Untracked (N) → Unstaged (N) → Staged (N)
 *
 * Focus model:
 *   Overlay grabs keyboard focus on open. Press alt+g (or esc) to hand
 *   control back to the prompt; alt+g again re-focuses the overlay.
 *
 * Keys (in the overlay, when focused):
 *   j/k or ↑/↓         move cursor between files
 *   space              toggle inline diff under current file
 *   -                  stage (untracked/unstaged) or unstage (staged)
 *   c                  commit staged changes (prompts for message)
 *   r                  refresh status
 *   g / G              first / last file
 *   PgUp / PgDn        scroll viewport one page
 *   alt+g / Esc        release focus back to the prompt
 *   q                  close the overlay
 *
 * Auto-refreshes whenever the agent uses write/edit/bash tools.
 *
 * In non-git directories, the overlay falls back to a single "Modified"
 * section built from snapshots taken on first write/edit. Stage/unstage is
 * disabled in that mode.
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ExtensionAPI, ExtensionContext, Theme } from "@mariozechner/pi-coding-agent";
import { isToolCallEventType } from "@mariozechner/pi-coding-agent";
import {
	type Component,
	matchesKey,
	type OverlayHandle,
	truncateToWidth,
	wrapTextWithAnsi,
} from "@mariozechner/pi-tui";

// ---------- Types ----------

type Section = "untracked" | "unstaged" | "staged";

interface FileEntry {
	section: Section;
	path: string;
	/** Single-letter porcelain status: M, A, D, R, C, U, ?, T, ... */
	status: string;
}

interface StatusModel {
	branch: string;
	staged: FileEntry[];
	unstaged: FileEntry[];
	untracked: FileEntry[];
}

const EMPTY_STATUS: StatusModel = {
	branch: "",
	staged: [],
	unstaged: [],
	untracked: [],
};

interface DiffState {
	cwd: string;
	isGitRepo: boolean;
	// Non-git fallback: path -> original contents at first touch (null = did not exist).
	snapshots: Map<string, string | null>;
	touched: Set<string>;
	status: StatusModel;
	lastRefresh: number;
	/** Cache of raw (unstyled) diff lines per "section:path". Cleared on refresh. */
	diffCache: Map<string, string[]>;
}

const state: DiffState = {
	cwd: process.cwd(),
	isGitRepo: false,
	snapshots: new Map(),
	touched: new Set(),
	status: EMPTY_STATUS,
	lastRefresh: 0,
	diffCache: new Map(),
};

/**
 * When the overlay is active, this is set to a callback that re-renders it.
 * Used by tool_result auto-refresh and by stage/unstage actions.
 */
let requestOverlayRender: (() => void) | null = null;

/**
 * The overlay handle while it's open. Used by the `ctrl+g` shortcut to grab
 * keyboard focus on demand. Null when the overlay is closed.
 */
let overlayHandle: OverlayHandle | null = null;

/** Key used to focus the overlay from the prompt. */
// ctrl+g conflicts with the built-in app.editor.external (open $EDITOR).
const FOCUS_OVERLAY_KEY = "alt+g";

// ---------- Git helpers ----------

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

function getCurrentBranch(cwd: string): string {
	try {
		const out = execSync("git rev-parse --abbrev-ref HEAD", {
			cwd,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
		if (out === "HEAD") {
			// Detached: show short SHA
			try {
				const sha = execSync("git rev-parse --short HEAD", {
					cwd,
					encoding: "utf8",
					stdio: ["ignore", "pipe", "ignore"],
				}).trim();
				return `(detached ${sha})`;
			} catch {
				return "(detached)";
			}
		}
		return out;
	} catch {
		return "";
	}
}

function loadGitStatus(cwd: string): StatusModel {
	const branch = getCurrentBranch(cwd);
	const staged: FileEntry[] = [];
	const unstaged: FileEntry[] = [];
	const untracked: FileEntry[] = [];

	let raw: string;
	try {
		raw = execSync("git status --porcelain=v1 -uall --no-renames", {
			cwd,
			encoding: "utf8",
			maxBuffer: 4 * 1024 * 1024,
		});
	} catch {
		return { branch, staged, unstaged, untracked };
	}

	for (const rawLine of raw.split("\n")) {
		if (!rawLine) continue;
		// Format: "XY path"  (X=index, Y=worktree). Path may be quoted if it has special chars,
		// but with --porcelain=v1 (no -z) git uses C-style quotes around paths with weird chars.
		// We accept the unquoted common case and strip surrounding quotes if present.
		if (rawLine.length < 3) continue;
		const X = rawLine[0];
		const Y = rawLine[1];
		let path = rawLine.slice(3);
		if (path.startsWith('"') && path.endsWith('"')) {
			// Best-effort unquote: handles \\ \" \n \t. Most paths won't hit this.
			path = path
				.slice(1, -1)
				.replace(/\\\\/g, "\\")
				.replace(/\\"/g, '"')
				.replace(/\\n/g, "\n")
				.replace(/\\t/g, "\t");
		}

		if (X === "?" && Y === "?") {
			untracked.push({ section: "untracked", path, status: "?" });
			continue;
		}
		if (X !== " " && X !== "?") {
			staged.push({ section: "staged", path, status: X });
		}
		if (Y !== " " && Y !== "?") {
			unstaged.push({ section: "unstaged", path, status: Y });
		}
	}

	return { branch, staged, unstaged, untracked };
}

function loadSnapshotStatus(): StatusModel {
	// Build a single "unstaged" section from touched files in non-git mode.
	const unstaged: FileEntry[] = [];
	for (const abs of state.touched) {
		const original = state.snapshots.get(abs);
		let current: string | null = null;
		try {
			if (existsSync(abs)) current = readFileSync(abs, "utf8");
		} catch {
			current = null;
		}
		const rel = abs.startsWith(state.cwd) ? abs.slice(state.cwd.length + 1) : abs;
		if (original === null && current !== null) {
			unstaged.push({ section: "unstaged", path: rel, status: "A" });
		} else if (original !== null && current === null) {
			unstaged.push({ section: "unstaged", path: rel, status: "D" });
		} else if (original !== null && current !== null && original !== current) {
			unstaged.push({ section: "unstaged", path: rel, status: "M" });
		}
	}
	return { branch: "(no git)", staged: [], unstaged, untracked: [] };
}

function refreshStatus(): void {
	state.status = state.isGitRepo ? loadGitStatus(state.cwd) : loadSnapshotStatus();
	state.diffCache.clear();
	state.lastRefresh = Date.now();
}

// ---------- Per-file diff loading ----------

function diffCacheKey(entry: FileEntry): string {
	return `${entry.section}:${entry.path}`;
}

function loadFileDiff(entry: FileEntry): string[] {
	const key = diffCacheKey(entry);
	const cached = state.diffCache.get(key);
	if (cached) return cached;

	let lines: string[];
	if (state.isGitRepo) {
		lines = loadGitFileDiff(entry);
	} else {
		lines = loadSnapshotFileDiff(entry);
	}
	state.diffCache.set(key, lines);
	return lines;
}

function loadGitFileDiff(entry: FileEntry): string[] {
	if (entry.section === "untracked") {
		const abs = resolve(state.cwd, entry.path);
		try {
			const content = readFileSync(abs, "utf8");
			const fileLines = content.split("\n");
			const out: string[] = [];
			out.push(`@@ -0,0 +1,${fileLines.length} @@`);
			for (const l of fileLines) out.push(`+${l}`);
			return out;
		} catch (e) {
			return [`(unreadable: ${(e as Error).message})`];
		}
	}

	const flag = entry.section === "staged" ? "--cached" : "";
	try {
		const cmd = `git diff ${flag} --no-color -- ${JSON.stringify(entry.path)}`.trim();
		const out = execSync(cmd, {
			cwd: state.cwd,
			encoding: "utf8",
			maxBuffer: 16 * 1024 * 1024,
		});
		const all = out.split("\n");
		// Skip the file header (diff --git ... / index ... / --- / +++) — the file row above
		// already names the file. Start from the first hunk.
		const hunkIdx = all.findIndex((l) => l.startsWith("@@"));
		const sliced = hunkIdx >= 0 ? all.slice(hunkIdx) : all;
		// Drop trailing blank
		while (sliced.length && !sliced[sliced.length - 1]) sliced.pop();
		if (sliced.length === 0) return ["(no diff)"];
		return sliced;
	} catch (e) {
		return [`(diff failed: ${(e as Error).message})`];
	}
}

function loadSnapshotFileDiff(entry: FileEntry): string[] {
	const abs = resolve(state.cwd, entry.path);
	const original = state.snapshots.get(abs);
	let current: string | null = null;
	try {
		if (existsSync(abs)) current = readFileSync(abs, "utf8");
	} catch {
		current = null;
	}

	if (original === undefined && current !== null) {
		// Not snapshotted but exists — treat as fully new.
		const fileLines = current.split("\n");
		return [`@@ -0,0 +1,${fileLines.length} @@`, ...fileLines.map((l) => `+${l}`)];
	}
	if (original === null && current !== null) {
		const fileLines = current.split("\n");
		return [`@@ -0,0 +1,${fileLines.length} @@`, ...fileLines.map((l) => `+${l}`)];
	}
	if (original !== null && original !== undefined && current === null) {
		const fileLines = original.split("\n");
		return [`@@ -1,${fileLines.length} +0,0 @@`, ...fileLines.map((l) => `-${l}`)];
	}
	if (original !== null && original !== undefined && current !== null && original !== current) {
		const oldLines = original.split("\n");
		const newLines = current.split("\n");
		return [
			`@@ -1,${oldLines.length} +1,${newLines.length} @@`,
			...oldLines.map((l) => `-${l}`),
			...newLines.map((l) => `+${l}`),
		];
	}
	return ["(no diff)"];
}

// ---------- Snapshot tracking (non-git fallback) ----------

function snapshotIfNeeded(path: string): void {
	if (state.isGitRepo) return;
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

// ---------- ANSI styling ----------

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const INVERSE = "\x1b[7m";
const INVERSE_OFF = "\x1b[27m";
const FG_GREEN = "\x1b[32m";
const FG_RED = "\x1b[31m";
const FG_CYAN = "\x1b[36m";
const FG_YELLOW = "\x1b[33m";
const FG_GRAY = "\x1b[90m";
const FG_MAGENTA = "\x1b[35m";
const BG_GREEN = "\x1b[48;5;22m";
const BG_RED = "\x1b[48;5;52m";

/**
 * pi-tui counts a TAB as 1 visible column but the terminal renders 4-8.
 * Expand to spaces up front so width math lines up.
 */
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
	if (line.startsWith("@@")) return `${FG_YELLOW}${line}${RESET}`;
	if (line.startsWith("+")) {
		return `${BG_GREEN}${FG_GREEN}${BOLD}+${RESET}${BG_GREEN}${FG_GREEN}${line.slice(1)}${RESET}`;
	}
	if (line.startsWith("-")) {
		return `${BG_RED}${FG_RED}${BOLD}-${RESET}${BG_RED}${FG_RED}${line.slice(1)}${RESET}`;
	}
	return `${DIM}${line}${RESET}`;
}

function statusLetterColor(status: string, section: Section): string {
	if (section === "untracked") return FG_CYAN;
	if (section === "staged") return FG_GREEN;
	// unstaged
	if (status === "D") return FG_RED;
	if (status === "A") return FG_GREEN;
	return FG_YELLOW;
}

// ---------- Stage / unstage actions ----------

function stageOrUnstage(entry: FileEntry): { ok: boolean; message: string } {
	if (!state.isGitRepo) {
		return { ok: false, message: "Not a git repo — stage/unstage disabled" };
	}
	const quoted = JSON.stringify(entry.path);
	try {
		if (entry.section === "staged") {
			execSync(`git reset -q HEAD -- ${quoted}`, {
				cwd: state.cwd,
				stdio: ["ignore", "pipe", "pipe"],
			});
			return { ok: true, message: `Unstaged ${entry.path}` };
		}
		// untracked or unstaged — `git add -A` handles new/modified/deleted
		execSync(`git add -A -- ${quoted}`, {
			cwd: state.cwd,
			stdio: ["ignore", "pipe", "pipe"],
		});
		return { ok: true, message: `Staged ${entry.path}` };
	} catch (e) {
		const stderr = (e as { stderr?: Buffer }).stderr?.toString().trim() || (e as Error).message;
		return { ok: false, message: stderr.split("\n")[0] };
	}
}

// ---------- List row construction ----------

type RowKind = "header" | "file" | "diff" | "spacer";

interface ListRow {
	kind: RowKind;
	/** Pre-styled text, NOT yet width-truncated. */
	text: string;
	/** For kind === 'file': index into flat entries. */
	entryIndex?: number;
	/** For kind === 'diff' / 'spacer' under a file: index it belongs to. */
	belongsTo?: number;
}

function flatEntries(): FileEntry[] {
	const s = state.status;
	return [...s.untracked, ...s.unstaged, ...s.staged];
}

function sectionHeader(label: string, count: number, color: string): string {
	return `${BOLD}${color}${label}${RESET} ${FG_GRAY}(${count})${RESET}`;
}

function fileRowText(entry: FileEntry, isCursor: boolean): string {
	const color = statusLetterColor(entry.status, entry.section);
	const letter = entry.status === "?" ? "?" : entry.status;
	const marker = isCursor ? `${FG_MAGENTA}${BOLD}▶${RESET}` : " ";
	const inner = `${marker}  ${BOLD}${color}${letter}${RESET}  ${entry.path}`;
	return isCursor ? `${INVERSE}${inner}${INVERSE_OFF}` : inner;
}

function buildRows(cursorEntryIndex: number, expanded: Set<string>, innerWidth: number): ListRow[] {
	const rows: ListRow[] = [];
	const s = state.status;

	// Header line
	const headLabel = state.isGitRepo ? "HEAD" : "(snapshot mode)";
	const headValue = state.isGitRepo ? s.branch || "(unknown)" : state.cwd;
	rows.push({
		kind: "header",
		text: `${BOLD}${FG_GRAY}${headLabel}:${RESET} ${headValue}`,
	});
	rows.push({ kind: "spacer", text: "" });

	const entries = flatEntries();
	let entryIdx = 0;

	const renderSection = (label: string, list: FileEntry[], color: string) => {
		if (list.length === 0) return;
		rows.push({ kind: "header", text: sectionHeader(label, list.length, color) });
		for (const entry of list) {
			const isCursor = entryIdx === cursorEntryIndex;
			rows.push({
				kind: "file",
				text: fileRowText(entry, isCursor),
				entryIndex: entryIdx,
			});
			if (expanded.has(diffCacheKey(entry))) {
				const diffLines = loadFileDiff(entry);
				const indent = "    ";
				// Wrap each diff line within the available width minus indent.
				const wrapWidth = Math.max(10, innerWidth - indent.length - 2);
				for (const raw of diffLines) {
					const styled = styleDiffLine(raw);
					const pieces = wrapTextWithAnsi(styled, wrapWidth);
					for (const p of pieces) {
						rows.push({
							kind: "diff",
							text: `${indent}${p}`,
							belongsTo: entryIdx,
						});
					}
				}
				rows.push({ kind: "spacer", text: "", belongsTo: entryIdx });
			}
			entryIdx++;
		}
		rows.push({ kind: "spacer", text: "" });
	};

	renderSection("Untracked", s.untracked, FG_CYAN);
	renderSection("Unstaged", s.unstaged, FG_YELLOW);
	renderSection("Staged", s.staged, FG_GREEN);

	if (entries.length === 0) {
		rows.push({
			kind: "header",
			text: `${DIM}nothing to commit, working tree clean${RESET}`,
		});
	}

	return rows;
}

// ---------- Overlay component ----------

class StatusOverlay implements Component {
	private cursor = 0;
	private expanded: Set<string> = new Set();
	private scroll = 0;
	private lastWidth = 0;
	private cachedRows: ListRow[] = [];
	private lastDiffStamp = -1;
	private visibleHeight = 30;

	// top border, header, blank, scroll info, hint, bottom border
	private static readonly CHROME_ROWS = 6;

	constructor(
		private theme: Theme,
		private done: () => void,
		private requestRender: () => void,
		private notify: (msg: string, level?: "info" | "warning" | "error") => void,
		private onCommit: () => void,
		private releaseFocus: () => void,
	) {
		refreshStatus();
	}

	/** Force the next render to rebuild rows. Called from outside on auto-refresh. */
	invalidate(): void {
		this.cachedRows = [];
		this.lastDiffStamp = -1;
		this.clampCursor();
	}

	private currentEntry(): FileEntry | null {
		const entries = flatEntries();
		if (this.cursor < 0 || this.cursor >= entries.length) return null;
		return entries[this.cursor];
	}

	private clampCursor(): void {
		const total = flatEntries().length;
		if (total === 0) {
			this.cursor = 0;
			return;
		}
		if (this.cursor < 0) this.cursor = 0;
		if (this.cursor >= total) this.cursor = total - 1;
	}

	/** Find the row index of the given entry index in the cached rows. */
	private cursorRowIndex(): number {
		for (let i = 0; i < this.cachedRows.length; i++) {
			if (this.cachedRows[i].kind === "file" && this.cachedRows[i].entryIndex === this.cursor) {
				return i;
			}
		}
		return 0;
	}

	handleInput(data: string): void {
		// Esc / alt+g return focus to the prompt but keep the overlay open.
		if (matchesKey(data, "escape") || matchesKey(data, "alt+g")) {
			this.releaseFocus();
			return;
		}
		// q closes the overlay entirely.
		if (data === "q" || data === "Q") {
			this.done();
			return;
		}
		if (data === "c" || data === "C") {
			this.onCommit();
			return;
		}
		if (data === "r" || data === "R") {
			refreshStatus();
			this.invalidate();
			this.clampCursor();
			this.requestRender();
			return;
		}

		const total = flatEntries().length;

		if (matchesKey(data, "up") || data === "k") {
			if (total === 0) return;
			this.cursor = Math.max(0, this.cursor - 1);
			this.invalidate();
			this.requestRender();
			return;
		}
		if (matchesKey(data, "down") || data === "j") {
			if (total === 0) return;
			this.cursor = Math.min(total - 1, this.cursor + 1);
			this.invalidate();
			this.requestRender();
			return;
		}
		if (matchesKey(data, "home") || data === "g") {
			this.cursor = 0;
			this.invalidate();
			this.requestRender();
			return;
		}
		if (matchesKey(data, "end") || data === "G") {
			this.cursor = Math.max(0, total - 1);
			this.invalidate();
			this.requestRender();
			return;
		}
		if (matchesKey(data, "pageUp") || data === "\x15" /* C-u */) {
			this.scroll = Math.max(0, this.scroll - this.visibleHeight);
			this.requestRender();
			return;
		}
		if (matchesKey(data, "pageDown") || data === "\x04" /* C-d */) {
			const maxScroll = Math.max(0, this.cachedRows.length - this.visibleHeight);
			this.scroll = Math.min(maxScroll, this.scroll + this.visibleHeight);
			this.requestRender();
			return;
		}

		if (data === " ") {
			const entry = this.currentEntry();
			if (!entry) return;
			const key = diffCacheKey(entry);
			if (this.expanded.has(key)) this.expanded.delete(key);
			else this.expanded.add(key);
			this.invalidate();
			this.requestRender();
			return;
		}

		if (data === "-") {
			const entry = this.currentEntry();
			if (!entry) return;
			const rememberedPath = entry.path;
			const result = stageOrUnstage(entry);
			if (!result.ok) {
				this.notify(result.message, "warning");
				return;
			}
			refreshStatus();
			// Try to keep cursor on the same path in its new section.
			const entries = flatEntries();
			const sameIdx = entries.findIndex((e) => e.path === rememberedPath);
			if (sameIdx >= 0) this.cursor = sameIdx;
			else this.clampCursor();
			this.invalidate();
			this.requestRender();
			return;
		}
	}

	render(width: number): string[] {
		const th = this.theme;
		const innerW = Math.max(20, width - 2);

		if (
			this.cachedRows.length === 0 ||
			this.lastWidth !== width ||
			this.lastDiffStamp !== state.lastRefresh
		) {
			this.cachedRows = buildRows(this.cursor, this.expanded, innerW);
			this.lastWidth = width;
			this.lastDiffStamp = state.lastRefresh;
		}

		const entries = flatEntries();
		const stagedCount = state.status.staged.length;
		const totalCount = entries.length;

		const title = th.bold(th.fg("accent", "📋 Git Status"));
		const stats = th.fg(
			"muted",
			`  ${totalCount} file${totalCount === 1 ? "" : "s"}  •  ${stagedCount} staged`,
		);
		const mode = th.fg("dim", state.isGitRepo ? "git" : "snapshot");

		const top = th.fg("border", "╭" + "─".repeat(innerW) + "╮");
		const bottom = th.fg("border", "╰" + "─".repeat(innerW) + "╯");
		const row = (s: string) =>
			th.fg("border", "│") + truncateToWidth(s, innerW, "", true) + th.fg("border", "│");

		const lines: string[] = [];
		lines.push(top);
		lines.push(row(` ${title}${stats}  ${mode}`));
		lines.push(row(th.fg("border", "─".repeat(innerW))));

		const termRows = (process.stdout.rows ?? 36) as number;
		const contentHeight = Math.max(5, termRows - StatusOverlay.CHROME_ROWS - 2);
		this.visibleHeight = contentHeight;

		// Auto-scroll so cursor row stays visible.
		const cursorRow = this.cursorRowIndex();
		if (cursorRow < this.scroll) this.scroll = Math.max(0, cursorRow - 1);
		if (cursorRow >= this.scroll + contentHeight) {
			this.scroll = Math.max(0, cursorRow - contentHeight + 2);
		}
		const maxScroll = Math.max(0, this.cachedRows.length - contentHeight);
		if (this.scroll > maxScroll) this.scroll = maxScroll;

		const visible = this.cachedRows.slice(this.scroll, this.scroll + contentHeight);
		for (const r of visible) lines.push(row(" " + r.text + " "));
		for (let i = visible.length; i < contentHeight; i++) lines.push(row(""));

		const end = Math.min(this.scroll + contentHeight, this.cachedRows.length);
		const scrollInfo =
			this.cachedRows.length > contentHeight
				? `${this.scroll + 1}-${end} / ${this.cachedRows.length}`
				: `${this.cachedRows.length} rows`;
		lines.push(row(th.fg("dim", ` ${scrollInfo}`)));
		lines.push(
			row(
				th.fg(
					"dim",
					" j/k move • space expand • - stage • c commit • r refresh • " +
						FOCUS_OVERLAY_KEY + "/esc unfocus • q close",
				),
			),
		);
		lines.push(bottom);

		return lines;
	}
}

// ---------- Tracked tool detection ----------

function pathsFromToolCall(toolName: string, input: unknown): string[] {
	if (toolName === "write" || toolName === "edit") {
		const p = (input as { path?: string } | null)?.path;
		return p ? [p] : [];
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
		refreshStatus();
	});

	// Snapshot before write/edit (non-git mode only)
	pi.on("tool_call", async (event) => {
		if (!state.isGitRepo) {
			if (isToolCallEventType("write", event) || isToolCallEventType("edit", event)) {
				const path = (event.input as { path?: string }).path;
				if (path) snapshotIfNeeded(path);
			}
		}
	});

	// After tool result, refresh status and re-render overlay if open.
	pi.on("tool_result", async (event) => {
		const paths = pathsFromToolCall(event.toolName, event.input);
		for (const p of paths) trackPath(p);

		if (event.toolName === "write" || event.toolName === "edit" || event.toolName === "bash") {
			refreshStatus();
			requestOverlayRender?.();
		}
	});

	async function commitFlow(ctx: ExtensionContext): Promise<void> {
		if (!state.isGitRepo) {
			ctx.ui.notify("Not a git repo — cannot commit", "warning");
			return;
		}
		let stagedCount = 0;
		try {
			const staged = execSync("git diff --cached --name-only", {
				cwd: state.cwd,
				encoding: "utf8",
			}).trim();
			stagedCount = staged ? staged.split("\n").length : 0;
		} catch {
			stagedCount = 0;
		}
		if (stagedCount === 0) {
			ctx.ui.notify("No staged changes — press '-' to stage files first", "warning");
			return;
		}

		const message = await ctx.ui.input(
			`Commit message (${stagedCount} file${stagedCount === 1 ? "" : "s"} staged)`,
			"e.g. fix: handle edge case",
		);
		if (!message || !message.trim()) {
			ctx.ui.notify("Commit cancelled", "info");
			return;
		}

		try {
			execSync(`git commit -m ${JSON.stringify(message.trim())}`, {
				cwd: state.cwd,
				stdio: ["ignore", "pipe", "pipe"],
			});
			const sha = execSync("git rev-parse --short HEAD", {
				cwd: state.cwd,
				encoding: "utf8",
			}).trim();
			ctx.ui.notify(`Committed ${sha}: ${message.trim()}`, "info");
			refreshStatus();
		} catch (e) {
			const stderr = (e as { stderr?: Buffer }).stderr?.toString().trim() || (e as Error).message;
			ctx.ui.notify(`Commit failed: ${stderr.split("\n")[0]}`, "error");
		}
	}

	pi.registerCommand("diff-panel", {
		description: "Toggle the side diff panel (interactive git status)",
		handler: async (_args, ctx) => {
			if (overlayActive) {
				overlayDone?.();
				return;
			}
			refreshStatus();
			overlayActive = true;
			let pendingCommit = false;
			await ctx.ui.custom<void>(
				(tui, theme, _kb, done) => {
					overlayDone = () => {
						done();
						overlayActive = false;
						overlayDone = null;
						requestOverlayRender = null;
						overlayHandle = null;
					};
					const onCommit = () => {
						pendingCommit = true;
						overlayDone!();
					};
					const releaseFocus = () => {
						overlayHandle?.unfocus();
						tui.requestRender();
					};
					const overlay = new StatusOverlay(
						theme,
						() => overlayDone!(),
						() => tui.requestRender(),
						(msg, level) => ctx.ui.notify(msg, level ?? "info"),
						onCommit,
						releaseFocus,
					);
					requestOverlayRender = () => {
						overlay.invalidate();
						tui.requestRender();
					};
					return overlay;
				},
				{
					overlay: true,
					overlayOptions: {
						width: "50%",
						minWidth: 50,
						maxHeight: "100%",
						anchor: "top-right",
						margin: { top: 1, right: 1, bottom: 1 },
						// Grab keyboard focus on open so j/k, space, -, c, r work
						// immediately. Press alt+g (or esc) to hand control back to
						// the prompt; alt+g again re-focuses the overlay.
					},
					onHandle: (handle) => {
						overlayHandle = handle;
					},
				},
			);
			if (pendingCommit) {
				await commitFlow(ctx);
			}
		},
	});

	// Global shortcut: focus the overlay so j/k, space, -, c, r work.
	// No-op when the overlay is closed or already focused.
	pi.registerShortcut(FOCUS_OVERLAY_KEY, {
		description: "Focus the diff panel overlay (when open)",
		handler: () => {
			if (!overlayHandle) return;
			if (overlayHandle.isFocused()) return;
			overlayHandle.focus();
		},
	});
}
