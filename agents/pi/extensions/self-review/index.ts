/**
 * Self Review — interactive git diff view.
 *
 * Command:
 *   /self-review  - Toggle a right-side overlay showing changed-file diffs.
 *
 * Layout:
 *   A changed-file tree on the left, selected file diff on the right.
 *
 * Focus model:
 *   /self-review grabs focus on open. Press alt+g to release focus
 *   to the prompt; alt+g re-focuses the overlay. Esc closes the overlay.
 *
 * Keys (in the overlay, when focused):
 *   j/k or ↑/↓         move cursor between files in the tree
 *   Enter              focus the selected file's diff
 *   h/←                return focus from diff to file tree
 *   j/k or ↑/↓         move the diff line cursor while diff is focused
 *   ] / [              jump to next / previous diff hunk
 *   PgUp / PgDn        page the selected file diff
 *   c                  add a comment on the selected diff line
 *   x                  remove the latest comment on the selected diff line
 *   r                  refresh status
 *   }                  toggle working tree vs parent-branch diff
 *   g / G              first / last file
 *   alt+g              release focus back to the prompt
 *   Esc / q            close the overlay
 *
 * Auto-refreshes whenever the agent uses write/edit/bash tools.
 *
 * In non-git directories, the overlay falls back to diffs built from snapshots
 * taken on first write/edit. Git-only actions are disabled in that mode.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ExtensionAPI, ExtensionContext, Theme } from "@mariozechner/pi-coding-agent";
import { isToolCallEventType } from "@mariozechner/pi-coding-agent";
import {
	type Component,
	matchesKey,
	type OverlayHandle,
	truncateToWidth,
	visibleWidth,
	wrapTextWithAnsi,
} from "@mariozechner/pi-tui";

// ---------- Types ----------

type Section = "untracked" | "unstaged" | "staged";
type ReviewMode = "working" | "branch";

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

interface DiffComment {
	path: string;
	rawLineIndex: number;
	text: string;
	createdAt: number;
}

interface DiffCommentTarget {
	path: string;
	rawLineIndex: number;
	displayLine: number;
	preview: string;
}

interface DiffDisplayRow {
	text: string;
	rawLineIndex: number;
	isLastForRawLine: boolean;
}

interface DiffLineStats {
	additions: number;
	deletions: number;
}

const EMPTY_STATUS: StatusModel = {
	branch: "",
	staged: [],
	unstaged: [],
	untracked: [],
};

interface DiffState {
	cwd: string;
	gitRoot: string | null;
	isGitRepo: boolean;
	reviewMode: ReviewMode;
	parentRef: string | null;
	// Non-git fallback: path -> original contents at first touch (null = did not exist).
	snapshots: Map<string, string | null>;
	touched: Set<string>;
	status: StatusModel;
	lastRefresh: number;
	/** Cache of raw (unstyled) diff lines per path. Cleared on refresh. */
	diffCache: Map<string, string[]>;
	/** Cache of per-file added/deleted counts, derived from diffCache. Cleared on refresh. */
	statsCache: Map<string, DiffLineStats>;
	/** In-memory comments attached to raw diff lines by file path. */
	comments: Map<string, DiffComment[]>;
}

const state: DiffState = {
	cwd: process.cwd(),
	gitRoot: null,
	isGitRepo: false,
	reviewMode: "working",
	parentRef: null,
	snapshots: new Map(),
	touched: new Set(),
	status: EMPTY_STATUS,
	lastRefresh: 0,
	diffCache: new Map(),
	statsCache: new Map(),
	comments: new Map(),
};

/**
 * When the overlay is active, this is set to a callback that re-renders it.
 * Used by tool_result auto-refresh and panel actions.
 */
let requestOverlayRender: (() => void) | null = null;

/**
 * The overlay handle while it's open. Used by the `ctrl+g` shortcut to grab
 * keyboard focus on demand. Null when the overlay is closed.
 */
let overlayHandle: OverlayHandle | null = null;

/** Key used to focus the overlay from the prompt. */
// ctrl+g is taken by the built-in app.editor.external (open $EDITOR).
const FOCUS_OVERLAY_KEY = "alt+g";

// ---------- Git helpers ----------

function findGitRoot(cwd: string): string | null {
	try {
		return execFileSync("git", ["rev-parse", "--show-toplevel"], {
			cwd,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
	} catch {
		return null;
	}
}

function gitCommandCwd(): string {
	return state.gitRoot ?? state.cwd;
}

function getCurrentBranch(cwd: string): string {
	try {
		const out = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
			cwd,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
		if (out === "HEAD") {
			// Detached: show short SHA
			try {
				const sha = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
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

function gitOutput(args: string[], cwd = gitCommandCwd()): string | null {
	try {
		return execFileSync("git", args, {
			cwd,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
	} catch {
		return null;
	}
}

function refExists(ref: string, cwd = gitCommandCwd()): boolean {
	return gitOutput(["rev-parse", "--verify", `${ref}^{commit}`], cwd) !== null;
}

function normalizeParentRef(candidate: string | null, currentBranch: string, cwd = gitCommandCwd()): string | null {
	if (!candidate) return null;
	const ref = candidate.trim();
	if (!ref || ref === currentBranch) return null;
	if (refExists(ref, cwd)) return ref;
	const originRef = `origin/${ref}`;
	if (refExists(originRef, cwd)) return originRef;
	return null;
}

function resolveParentRef(cwd = gitCommandCwd()): string | null {
	const currentBranch = getCurrentBranch(cwd);
	if (!currentBranch || currentBranch.startsWith("(detached")) return null;

	const configuredBase = gitOutput(["config", "--get", `branch.${currentBranch}.github-pr-base-branch`], cwd);
	if (configuredBase) {
		const base = configuredBase.includes("#") ? configuredBase.split("#").pop()! : configuredBase;
		const normalized = normalizeParentRef(base, currentBranch, cwd);
		if (normalized) return normalized;
	}

	const vscodeMergeBase = gitOutput(["config", "--get", `branch.${currentBranch}.vscode-merge-base`], cwd);
	const normalizedMergeBase = normalizeParentRef(vscodeMergeBase, currentBranch, cwd);
	if (normalizedMergeBase) return normalizedMergeBase;

	for (const candidate of ["main", "master"]) {
		const normalized = normalizeParentRef(candidate, currentBranch, cwd);
		if (normalized) return normalized;
	}

	return null;
}

function loadGitStatus(cwd: string): StatusModel {
	const branch = getCurrentBranch(cwd);
	const staged: FileEntry[] = [];
	const unstaged: FileEntry[] = [];
	const untracked: FileEntry[] = [];

	let raw: string;
	try {
		raw = execFileSync("git", ["status", "--porcelain=v1", "-uall", "--no-renames"], {
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

function loadBranchStatus(cwd: string): StatusModel {
	const branch = getCurrentBranch(cwd);
	const parentRef = resolveParentRef(cwd);
	state.parentRef = parentRef;
	if (!parentRef) return { branch: `${branch || "HEAD"} ↔ (no parent)`, staged: [], unstaged: [], untracked: [] };

	const entries: FileEntry[] = [];
	let raw: string;
	try {
		raw = execFileSync("git", ["diff", "--name-status", "--no-renames", `${parentRef}...HEAD`], {
			cwd,
			encoding: "utf8",
			maxBuffer: 4 * 1024 * 1024,
		});
	} catch {
		return { branch: `${branch || "HEAD"} ↔ ${parentRef}`, staged: [], unstaged: [], untracked: [] };
	}

	for (const rawLine of raw.split("\n")) {
		if (!rawLine) continue;
		const [status = "M", path = ""] = rawLine.split("\t");
		if (!path) continue;
		entries.push({ section: "unstaged", path, status: status[0] ?? "M" });
	}

	return { branch: `${branch || "HEAD"} ↔ ${parentRef}`, staged: [], unstaged: entries, untracked: [] };
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
	if (state.isGitRepo && !state.gitRoot) state.gitRoot = findGitRoot(state.cwd);
	state.parentRef = null;
	if (!state.isGitRepo) {
		state.reviewMode = "working";
		state.status = loadSnapshotStatus();
	} else if (state.reviewMode === "branch") {
		state.status = loadBranchStatus(gitCommandCwd());
	} else {
		state.status = loadGitStatus(gitCommandCwd());
	}
	state.diffCache.clear();
	state.statsCache.clear();
	state.lastRefresh = Date.now();
}

// ---------- Per-file diff loading ----------

function diffCacheKey(entry: FileEntry): string {
	return entry.path;
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
	if (state.reviewMode === "branch") {
		const parentRef = state.parentRef ?? resolveParentRef();
		if (!parentRef) return ["(no parent branch found)"];
		try {
			const out = execFileSync("git", ["diff", "-p", "--no-ext-diff", "--no-color", `${parentRef}...HEAD`, "--", entry.path], {
				cwd: gitCommandCwd(),
				encoding: "utf8",
				maxBuffer: 16 * 1024 * 1024,
			});
			const all = out.split("\n");
			const hunkIdx = all.findIndex((l) => l.startsWith("@@"));
			const sliced = hunkIdx >= 0 ? all.slice(hunkIdx) : all;
			while (sliced.length && !sliced[sliced.length - 1]) sliced.pop();
			if (sliced.length === 0) return ["(no diff)"];
			return sliced;
		} catch (e) {
			return [`(diff failed: ${(e as Error).message})`];
		}
	}

	if (entry.section === "untracked") {
		const abs = resolve(gitCommandCwd(), entry.path);
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

	try {
		const out = execFileSync("git", ["diff", "-p", "--no-ext-diff", "--no-color", "HEAD", "--", entry.path], {
			cwd: gitCommandCwd(),
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
const UNDERLINE = "\x1b[4m";
const UNDERLINE_OFF = "\x1b[24m";
const DIM = "\x1b[2m";
const FG_GREEN = "\x1b[32m";
const FG_RED = "\x1b[31m";
const FG_CYAN = "\x1b[36m";
const FG_YELLOW = "\x1b[33m";
const FG_GRAY = "\x1b[90m";
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

// ---------- File tree construction ----------

interface FileTreeFileNode {
	kind: "file";
	name: string;
	path: string;
	entry: FileEntry;
}

interface FileTreeDirNode {
	kind: "dir";
	name: string;
	path: string;
	children: FileTreeNode[];
	fileCount: number;
}

type FileTreeNode = FileTreeDirNode | FileTreeFileNode;

interface FileTreeRow {
	node: FileTreeNode;
	depth: number;
}

function flatEntries(): FileEntry[] {
	const s = state.status;
	const entries: FileEntry[] = [];
	const seen = new Set<string>();
	for (const entry of [...s.untracked, ...s.unstaged, ...s.staged]) {
		if (seen.has(entry.path)) continue;
		seen.add(entry.path);
		entries.push(entry);
	}
	entries.sort((a, b) => a.path.localeCompare(b.path));
	return entries;
}

function buildFileTree(entries: FileEntry[]): FileTreeDirNode {
	const root: FileTreeDirNode = { kind: "dir", name: "", path: "", children: [], fileCount: 0 };

	for (const entry of entries) {
		const parts = entry.path.split("/").filter((part) => part.length > 0);
		if (parts.length === 0) continue;

		let current = root;
		let currentPath = "";
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i]!;
			const isLast = i === parts.length - 1;
			currentPath = currentPath ? `${currentPath}/${part}` : part;

			if (isLast) {
				current.children.push({ kind: "file", name: part, path: currentPath, entry });
				continue;
			}

			let next = current.children.find(
				(child): child is FileTreeDirNode => child.kind === "dir" && child.path === currentPath,
			);
			if (!next) {
				next = { kind: "dir", name: part, path: currentPath, children: [], fileCount: 0 };
				current.children.push(next);
			}
			current = next;
		}
	}

	sortFileTree(root);
	computeFileCounts(root);
	return root;
}

function sortFileTree(node: FileTreeDirNode): void {
	node.children.sort((a, b) => {
		if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
		return a.name.localeCompare(b.name);
	});
	for (const child of node.children) {
		if (child.kind === "dir") sortFileTree(child);
	}
}

function computeFileCounts(node: FileTreeDirNode): number {
	let count = 0;
	for (const child of node.children) {
		count += child.kind === "file" ? 1 : computeFileCounts(child);
	}
	node.fileCount = count;
	return count;
}

function flattenFileTree(node: FileTreeDirNode, depth = 0): FileTreeRow[] {
	const rows: FileTreeRow[] = [];
	for (const child of node.children) {
		rows.push({ node: child, depth });
		if (child.kind === "dir") rows.push(...flattenFileTree(child, depth + 1));
	}
	return rows;
}

function fitLine(line: string, width: number): string {
	if (width <= 0) return "";
	const truncated = truncateToWidth(line, width, "", true);
	const padding = Math.max(0, width - visibleWidth(truncated));
	return truncated + " ".repeat(padding);
}

function fitLeftRight(left: string, right: string, width: number): string {
	if (width <= 0) return "";
	if (!right) return fitLine(left, width);

	const rightWidth = visibleWidth(right);
	if (rightWidth + 1 >= width) return fitLine(left, width);

	const leftWidth = Math.max(0, width - rightWidth - 1);
	const fittedLeft = truncateToWidth(left, leftWidth, "", true);
	const padding = Math.max(1, width - visibleWidth(fittedLeft) - rightWidth);
	return `${fittedLeft}${" ".repeat(padding)}${right}`;
}

function stripAnsi(line: string): string {
	return line.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "");
}

function addDiffComment(comment: DiffComment): void {
	const comments = state.comments.get(comment.path) ?? [];
	comments.push(comment);
	state.comments.set(comment.path, comments);
}

function removeLatestDiffComment(path: string, rawLineIndex: number): DiffComment | null {
	const comments = state.comments.get(path);
	if (!comments) return null;

	const index = comments.findLastIndex((comment) => comment.rawLineIndex === rawLineIndex);
	if (index < 0) return null;

	const [removed] = comments.splice(index, 1);
	if (comments.length === 0) state.comments.delete(path);
	else state.comments.set(path, comments);
	return removed ?? null;
}

function commentsForLine(path: string, rawLineIndex: number): DiffComment[] {
	return (state.comments.get(path) ?? []).filter((comment) => comment.rawLineIndex === rawLineIndex);
}

function allDiffComments(): DiffComment[] {
	return [...state.comments.values()]
		.flat()
		.sort((a, b) => a.path.localeCompare(b.path) || a.rawLineIndex - b.rawLineIndex || a.createdAt - b.createdAt);
}

function diffLinesForPath(path: string): string[] {
	const entry = flatEntries().find((candidate) => candidate.path === path);
	if (entry) return loadFileDiff(entry);
	return state.diffCache.get(path) ?? ["(diff unavailable)"];
}

function commentContext(lines: string[], rawLineIndex: number): string[] {
	if (lines.length === 0) return ["(diff unavailable)"];
	const lineIndex = Math.max(0, Math.min(rawLineIndex, lines.length - 1));
	const hunkIndex = lines.findLastIndex((line, index) => index <= lineIndex && line.startsWith("@@"));
	const start = Math.max(0, lineIndex - 3);
	const end = Math.min(lines.length, lineIndex + 4);
	const context = lines.slice(start, end);
	if (hunkIndex >= 0 && hunkIndex < start) context.unshift(lines[hunkIndex]!);
	return context;
}

function formatCommentsForPrompt(): string | null {
	const comments = allDiffComments();
	if (comments.length === 0) return null;

	const lines: string[] = ["Diff review comments:"];
	let currentPath = "";
	comments.forEach((comment, index) => {
		if (comment.path !== currentPath) {
			currentPath = comment.path;
			lines.push("", `## ${comment.path}`);
		}
		const diffLines = diffLinesForPath(comment.path);
		const lineIndex = Math.max(0, Math.min(comment.rawLineIndex, diffLines.length - 1));
		lines.push("", `### Comment ${index + 1} on diff line ${lineIndex + 1}`);
		lines.push("````diff", ...commentContext(diffLines, lineIndex), "````");
		lines.push("", `Comment: ${comment.text}`);
	});
	return `${lines.join("\n").trimEnd()}\n---\n\n`;
}

function diffLineStats(entry: FileEntry): DiffLineStats {
	const key = diffCacheKey(entry);
	const cached = state.statsCache.get(key);
	if (cached) return cached;

	let additions = 0;
	let deletions = 0;
	for (const line of loadFileDiff(entry)) {
		if (line.startsWith("+")) additions++;
		else if (line.startsWith("-")) deletions++;
	}
	const stats = { additions, deletions };
	state.statsCache.set(key, stats);
	return stats;
}

function statusBadge(entry: FileEntry): string {
	const letter = entry.status === "?" ? "?" : entry.status;
	return `${BOLD}${statusLetterColor(entry.status, entry.section)}${letter}${RESET}`;
}

function diffStatsBadge(entry: FileEntry): string {
	const { additions, deletions } = diffLineStats(entry);
	const additionColor = additions > 0 ? FG_GREEN : FG_GRAY;
	const deletionColor = deletions > 0 ? FG_RED : FG_GRAY;
	return `${additionColor}+${additions}${RESET} ${deletionColor}-${deletions}${RESET}`;
}

// ---------- Overlay component ----------

type PaneFocus = "tree" | "diff";

class StatusOverlay implements Component {
	private cursor = 0;
	private focusedPane: PaneFocus = "tree";
	private treeScroll = 0;
	private diffScroll = 0;
	private diffCursor = 0;
	private diffPaneWidth = 80;
	private visibleHeight = 30;

	// top border, header, divider, pane title, scroll info, hint, bottom border
	private static readonly CHROME_ROWS = 7;

	constructor(
		private theme: Theme,
		private done: () => void,
		private requestRender: () => void,
		private notify: (msg: string, level?: "info" | "warning" | "error") => void,
		private onComment: (target: DiffCommentTarget) => void,
		private onSubmitComments: () => void,
		private releaseFocus: () => void,
	) {
		refreshStatus();
	}

	/** Force the next render to rebuild from latest status. Called from outside on auto-refresh. */
	invalidate(): void {
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
			this.focusedPane = "tree";
			this.diffScroll = 0;
			this.diffCursor = 0;
			this.treeScroll = 0;
			return;
		}
		if (this.cursor < 0) this.cursor = 0;
		if (this.cursor >= total) this.cursor = total - 1;
	}

	private moveCursor(next: number): void {
		const entries = flatEntries();
		if (entries.length === 0) return;
		const previousPath = entries[this.cursor]?.path;
		this.cursor = Math.max(0, Math.min(entries.length - 1, next));
		if (entries[this.cursor]?.path !== previousPath) {
			this.diffScroll = 0;
			this.diffCursor = 0;
		}
	}

	private focusDiff(): void {
		if (!this.currentEntry()) return;
		this.focusedPane = "diff";
		this.diffCursor = this.diffScroll;
	}

	private focusTree(): void {
		this.focusedPane = "tree";
	}

	private scrollDiff(delta: number): void {
		this.diffScroll = Math.max(0, this.diffScroll + delta);
	}

	private toggleReviewMode(): void {
		if (!state.isGitRepo) {
			this.notify("Parent-branch diff is only available in git repositories", "warning");
			return;
		}
		state.reviewMode = state.reviewMode === "working" ? "branch" : "working";
		refreshStatus();
		this.clampCursor();
		this.focusedPane = "tree";
		this.treeScroll = 0;
		this.diffScroll = 0;
		this.diffCursor = 0;
	}

	private moveDiffCursor(delta: number): void {
		this.diffCursor = Math.max(0, this.diffCursor + delta);
	}

	private jumpHunk(direction: 1 | -1): void {
		const entry = this.currentEntry();
		if (!entry) return;
		const hunkLines = this.hunkLineIndexes(entry, this.diffPaneWidth);
		if (hunkLines.length === 0) return;
		const wasDiffFocused = this.focusedPane === "diff";
		this.focusedPane = "diff";
		const base = wasDiffFocused ? this.diffCursor : direction > 0 ? -1 : Number.MAX_SAFE_INTEGER;
		const target =
			direction > 0
				? hunkLines.find((line) => line > base)
				: hunkLines.findLast((line) => line < base);
		if (target === undefined) return;
		this.diffCursor = target;
	}

	private currentCommentTarget(): DiffCommentTarget | null {
		const entry = this.currentEntry();
		if (!entry) return null;
		const rows = this.diffDisplayRows(entry, this.diffPaneWidth);
		if (rows.length === 0) return null;
		this.clampDiffCursor(rows.length);
		const row = rows[this.diffCursor];
		if (!row) return null;
		return {
			path: entry.path,
			rawLineIndex: row.rawLineIndex,
			displayLine: this.diffCursor,
			preview: truncateToWidth(stripAnsi(row.text).trim(), 80, "…", true),
		};
	}

	handleInput(data: string): void {
		if (data === "[" || data === "]") {
			this.jumpHunk(data === "]" ? 1 : -1);
			this.requestRender();
			return;
		}
		if (data === "}") {
			this.toggleReviewMode();
			this.requestRender();
			return;
		}

		// Alt+g returns focus to the prompt but keeps the overlay open.
		if (matchesKey(data, FOCUS_OVERLAY_KEY)) {
			this.releaseFocus();
			return;
		}
		// Esc / q close the overlay entirely.
		if (matchesKey(data, "escape") || data === "q" || data === "Q") {
			this.done();
			return;
		}
		if (data === "c" || data === "C") {
			const target = this.currentCommentTarget();
			if (!target) return;
			this.focusedPane = "diff";
			this.onComment(target);
			this.requestRender();
			return;
		}
		if (data === "x" || data === "X") {
			const target = this.currentCommentTarget();
			if (!target) return;
			this.focusedPane = "diff";
			const removed = removeLatestDiffComment(target.path, target.rawLineIndex);
			if (removed) this.notify(`Removed comment from ${target.path}`, "info");
			else this.notify("No comment on highlighted diff line", "warning");
			this.requestRender();
			return;
		}
		if (data === "s" || data === "S") {
			this.onSubmitComments();
			return;
		}
		if (data === "r" || data === "R") {
			refreshStatus();
			this.clampCursor();
			this.diffScroll = 0;
			this.diffCursor = 0;
			this.requestRender();
			return;
		}

		const total = flatEntries().length;

		if (matchesKey(data, "return")) {
			if (this.focusedPane === "tree") this.focusDiff();
			else this.focusTree();
			this.requestRender();
			return;
		}
		if (this.focusedPane === "diff" && (matchesKey(data, "left") || data === "h")) {
			this.focusTree();
			this.requestRender();
			return;
		}
		if (this.focusedPane === "tree" && (matchesKey(data, "right") || data === "l")) {
			this.focusDiff();
			this.requestRender();
			return;
		}
		if (matchesKey(data, "up") || data === "k") {
			if (this.focusedPane === "diff") this.moveDiffCursor(-1);
			else {
				if (total === 0) return;
				this.moveCursor(this.cursor - 1);
			}
			this.requestRender();
			return;
		}
		if (matchesKey(data, "down") || data === "j") {
			if (this.focusedPane === "diff") this.moveDiffCursor(1);
			else {
				if (total === 0) return;
				this.moveCursor(this.cursor + 1);
			}
			this.requestRender();
			return;
		}
		if (matchesKey(data, "home") || data === "g") {
			if (this.focusedPane === "diff") this.diffCursor = 0;
			else this.moveCursor(0);
			this.requestRender();
			return;
		}
		if (matchesKey(data, "end") || data === "G") {
			if (this.focusedPane === "diff") this.diffCursor = Number.MAX_SAFE_INTEGER;
			else this.moveCursor(Math.max(0, total - 1));
			this.requestRender();
			return;
		}
		if (matchesKey(data, "pageUp") || data === "\x15" /* C-u */) {
			if (this.focusedPane === "diff") this.moveDiffCursor(-this.visibleHeight);
			else this.scrollDiff(-this.visibleHeight);
			this.requestRender();
			return;
		}
		if (matchesKey(data, "pageDown") || data === "\x04" /* C-d */) {
			if (this.focusedPane === "diff") this.moveDiffCursor(this.visibleHeight);
			else this.scrollDiff(this.visibleHeight);
			this.requestRender();
			return;
		}
	}

	render(width: number): string[] {
		const th = this.theme;
		const innerW = Math.max(20, width - 2);
		const entries = flatEntries();
		this.clampCursor();

		const totalCount = entries.length;
		const title = th.bold(th.fg("accent", "📋 Self Review"));
		const branch = state.isGitRepo ? state.status.branch || "(unknown)" : "snapshot";
		const modeLabel = state.isGitRepo ? (state.reviewMode === "branch" ? "parent diff" : "working tree") : "snapshot";
		const stats = th.fg("muted", `  ${totalCount} changed file${totalCount === 1 ? "" : "s"}  •  ${branch}`);
		const mode = th.fg("dim", modeLabel);

		const top = th.fg("border", "╭" + "─".repeat(innerW) + "╮");
		const bottom = th.fg("border", "╰" + "─".repeat(innerW) + "╯");
		const row = (s: string) => th.fg("border", "│") + fitLine(s, innerW) + th.fg("border", "│");

		const lines: string[] = [];
		lines.push(top);
		lines.push(row(` ${title}${stats}  ${mode}`));
		lines.push(row(th.fg("border", "─".repeat(innerW))));

		const termRows = (process.stdout.rows ?? 36) as number;
		const contentHeight = Math.max(5, termRows - StatusOverlay.CHROME_ROWS - 2);
		this.visibleHeight = contentHeight;

		const showTree = entries.length > 0 && innerW >= 60;
		const leftWidth = showTree ? Math.max(18, Math.min(40, Math.floor(innerW * 0.3), innerW - 31)) : 0;
		const separator = th.fg("border", "│");
		const rightWidth = showTree ? Math.max(1, innerW - leftWidth - 1) : innerW;
		this.diffPaneWidth = rightWidth;
		const currentEntry = this.currentEntry();

		if (showTree) {
			const leftLabel = `${this.focusedPane === "tree" ? "▸" : " "} Files (${totalCount})`;
			const rightLabel = `${this.focusedPane === "diff" ? "▸" : " "} ${currentEntry ? currentEntry.path : "Diff"}`;
			const leftTitle = th.fg(this.focusedPane === "tree" ? "accent" : "muted", this.focusedPane === "tree" ? th.bold(leftLabel) : leftLabel);
			const rightTitle = th.fg(this.focusedPane === "diff" ? "accent" : "muted", this.focusedPane === "diff" ? th.bold(rightLabel) : rightLabel);
			lines.push(row(fitLine(leftTitle, leftWidth) + separator + fitLine(rightTitle, rightWidth)));

			const treeLines = this.renderTreeLines(entries, leftWidth, contentHeight);
			const diffLines = this.renderDiffLines(currentEntry, rightWidth, contentHeight);
			for (let i = 0; i < contentHeight; i++) {
				lines.push(row((treeLines[i] ?? " ".repeat(leftWidth)) + separator + (diffLines[i] ?? " ".repeat(rightWidth))));
			}
		} else {
			const rightTitle = currentEntry ? th.fg("accent", th.bold(currentEntry.path)) : th.fg("muted", "Diff");
			lines.push(row(rightTitle));
			lines.push(...this.renderDiffLines(currentEntry, innerW, contentHeight).map(row));
		}

		const diffInfo = this.diffScrollInfo(currentEntry, rightWidth);
		const fileInfo = totalCount > 0 ? `file ${this.cursor + 1}/${totalCount}` : "0 files";
		lines.push(row(th.fg("dim", ` ${fileInfo}${diffInfo ? ` • ${diffInfo}` : ""}`)));
		const paneHelp =
			this.focusedPane === "diff"
				? " j/k line • [/] hunks • } toggle diff • h/← files • PgUp/PgDn page • "
				: " j/k files • enter diff • [/] hunks • } toggle diff • PgUp/PgDn diff • ";
		lines.push(
			row(
				th.fg(
					"dim",
					paneHelp + "c comment • x remove comment • s submit comments • r refresh • " + FOCUS_OVERLAY_KEY + " unfocus • esc/q close",
				),
			),
		);
		lines.push(bottom);

		return lines;
	}

	private renderTreeLines(entries: FileEntry[], width: number, height: number): string[] {
		if (width <= 0) return new Array(height).fill("");
		if (entries.length === 0) return this.fillVertical([this.theme.fg("muted", "Working tree clean")], width, height);

		const rows = flattenFileTree(buildFileTree(entries));
		const selectedPath = this.currentEntry()?.path;
		const selectedRowIndex = rows.findIndex((row) => row.node.kind === "file" && row.node.path === selectedPath);
		this.ensureTreeSelectionVisible(selectedRowIndex, rows.length, height);

		const visible = rows.slice(this.treeScroll, this.treeScroll + height);
		return this.fillVertical(
			visible.map((row) => this.renderTreeRow(row, width, row.node.kind === "file" && row.node.path === selectedPath)),
			width,
			height,
			true,
		);
	}

	private renderTreeRow(row: FileTreeRow, width: number, selected: boolean): string {
		const indent = "  ".repeat(row.depth);
		const marker = row.node.kind === "dir" ? this.theme.fg("muted", "▾ ") : `${statusBadge(row.node.entry)} `;
		const label = row.node.kind === "dir" ? this.theme.fg("muted", row.node.name) : this.theme.fg("text", row.node.name);
		const count = row.node.kind === "dir" ? this.theme.fg("dim", ` (${row.node.fileCount})`) : "";
		const left = `${indent}${marker}${label}${count}`;
		const stats = row.node.kind === "file" ? diffStatsBadge(row.node.entry) : "";
		const fitted = fitLeftRight(left, stats, width);
		return selected && this.focusedPane === "tree" ? this.theme.bg("selectedBg", fitted) : fitted;
	}

	private renderDiffLines(entry: FileEntry | null, width: number, height: number): string[] {
		if (width <= 0) return new Array(height).fill("");
		if (!entry) return this.fillVertical([this.theme.fg("muted", "working tree clean")], width, height);

		const rows = this.diffDisplayRows(entry, width);
		const maxScroll = Math.max(0, rows.length - height);
		if (this.diffScroll > maxScroll) this.diffScroll = maxScroll;
		if (this.diffScroll < 0) this.diffScroll = 0;
		if (this.focusedPane === "diff") {
			this.clampDiffCursor(rows.length);
			this.ensureDiffCursorVisible(rows.length, height);
		}

		const visible: string[] = [];
		for (let absoluteLine = this.diffScroll; absoluteLine < rows.length && visible.length < height; absoluteLine++) {
			const diffRow = rows[absoluteLine]!;
			const fitted = fitLine(diffRow.text, width);
			visible.push(this.focusedPane === "diff" && absoluteLine === this.diffCursor ? this.highlightLine(fitted) : fitted);
			if (diffRow.isLastForRawLine) {
				for (const comment of commentsForLine(entry.path, diffRow.rawLineIndex)) {
					for (const commentLine of this.renderCommentLines(comment, width)) {
						if (visible.length >= height) break;
						visible.push(commentLine);
					}
					if (visible.length >= height) break;
				}
			}
		}
		return this.fillVertical(visible, width, height, true);
	}

	private wrappedDiffLines(entry: FileEntry, width: number): string[] {
		return this.diffDisplayRows(entry, width).map((row) => row.text);
	}

	private diffDisplayRows(entry: FileEntry, width: number): DiffDisplayRow[] {
		const wrapWidth = Math.max(10, width - 2);
		const rows: DiffDisplayRow[] = [];
		loadFileDiff(entry).forEach((raw, rawLineIndex) => {
			const styled = styleDiffLine(raw);
			const pieces = styled.length === 0 ? [""] : wrapTextWithAnsi(styled, wrapWidth);
			pieces.forEach((piece, index) => {
				rows.push({
					text: ` ${piece}`,
					rawLineIndex,
					isLastForRawLine: index === pieces.length - 1,
				});
			});
		});
		if (rows.length === 0) {
			rows.push({ text: this.theme.fg("muted", "(no diff)"), rawLineIndex: 0, isLastForRawLine: true });
		}
		return rows;
	}

	private renderCommentLines(comment: DiffComment, width: number): string[] {
		const indentCols = Math.min(10, Math.max(0, width - 12));
		const indent = " ".repeat(indentCols);
		const boxWidth = Math.max(8, width - indentCols);
		const contentWidth = Math.max(1, boxWidth - 4);
		const border = (text: string) => this.theme.fg("accent", text);
		const body = this.theme.fg("muted", `💬 ${comment.text}`);
		const pieces = wrapTextWithAnsi(body, contentWidth);
		const lines = [
			`${indent}${border(`╭${"─".repeat(boxWidth - 2)}╮`)}`,
			...(pieces.length ? pieces : [""]).map((piece) => `${indent}${border("│ ")}${fitLine(piece, contentWidth)}${border(" │")}`),
			`${indent}${border(`╰${"─".repeat(boxWidth - 2)}╯`)}`,
		];
		return lines.map((line) => fitLine(line, width));
	}

	private hunkLineIndexes(entry: FileEntry, width: number): number[] {
		const wrapWidth = Math.max(10, width - 2);
		const hunks: number[] = [];
		let row = 0;
		for (const raw of loadFileDiff(entry)) {
			if (raw.startsWith("@@")) hunks.push(row);
			const styled = styleDiffLine(raw);
			row += styled.length === 0 ? 1 : Math.max(1, wrapTextWithAnsi(styled, wrapWidth).length);
		}
		return hunks;
	}

	private highlightLine(line: string): string {
		const selectedBg = this.theme.bg("selectedBg", "").replace(/\x1b\[49m$/, "");
		const marker = `${BOLD}${FG_YELLOW}▌${RESET}`;
		const width = visibleWidth(line);
		const body = line.startsWith(" ") ? line.slice(1) : truncateToWidth(line, Math.max(0, width - 1), "", true);
		const markedLine = `${marker}${body}`;
		return (
			selectedBg +
			UNDERLINE +
			markedLine.replaceAll(RESET, `${RESET}${selectedBg}${UNDERLINE}`) +
			UNDERLINE_OFF +
			"\x1b[49m"
		);
	}

	private clampDiffCursor(lineCount: number): void {
		const max = Math.max(0, lineCount - 1);
		if (this.diffCursor < 0) this.diffCursor = 0;
		if (this.diffCursor > max) this.diffCursor = max;
	}

	private ensureDiffCursorVisible(lineCount: number, height: number): void {
		if (height <= 0) return;
		const maxScroll = Math.max(0, lineCount - height);
		if (this.diffCursor < this.diffScroll) this.diffScroll = this.diffCursor;
		if (this.diffCursor >= this.diffScroll + height) this.diffScroll = this.diffCursor - height + 1;
		if (this.diffScroll > maxScroll) this.diffScroll = maxScroll;
		if (this.diffScroll < 0) this.diffScroll = 0;
	}

	private diffScrollInfo(entry: FileEntry | null, width: number): string {
		if (!entry) return "";
		const lineCount = this.wrappedDiffLines(entry, width).length;
		const lineCursor = Math.min(this.diffCursor + 1, lineCount);
		const cursorInfo = this.focusedPane === "diff" ? ` • line ${lineCursor}/${lineCount}` : "";
		if (lineCount <= this.visibleHeight) return `${lineCount} diff rows${cursorInfo}`;
		const start = Math.min(this.diffScroll + 1, lineCount);
		const end = Math.min(this.diffScroll + this.visibleHeight, lineCount);
		return `diff ${start}-${end}/${lineCount}${cursorInfo}`;
	}

	private ensureTreeSelectionVisible(selectedRowIndex: number, rowCount: number, height: number): void {
		if (selectedRowIndex < 0 || height <= 0) return;
		if (selectedRowIndex < this.treeScroll) this.treeScroll = selectedRowIndex;
		if (selectedRowIndex >= this.treeScroll + height) this.treeScroll = selectedRowIndex - height + 1;
		const maxScroll = Math.max(0, rowCount - height);
		if (this.treeScroll > maxScroll) this.treeScroll = maxScroll;
		if (this.treeScroll < 0) this.treeScroll = 0;
	}

	private fillVertical(lines: string[], width: number, height: number, prefit = false): string[] {
		const out = prefit ? [...lines] : lines.map((line) => fitLine(line, width));
		while (out.length < height) out.push(" ".repeat(width));
		return out.slice(0, height);
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
	let compactOverlayHandle: OverlayHandle | null = null;

	pi.on("session_start", async (_event, ctx) => {
		state.cwd = ctx.cwd;
		state.gitRoot = findGitRoot(ctx.cwd);
		state.isGitRepo = state.gitRoot !== null;
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

	async function commentFlow(ctx: ExtensionContext, target: DiffCommentTarget): Promise<void> {
		const comment = await ctx.ui.input(
			`Comment on ${target.path} diff line ${target.displayLine + 1}`,
			target.preview || "Add a review note",
		);
		if (!comment || !comment.trim()) {
			ctx.ui.notify("Comment cancelled", "info");
			return;
		}

		addDiffComment({
			path: target.path,
			rawLineIndex: target.rawLineIndex,
			text: comment.trim(),
			createdAt: Date.now(),
		});
		ctx.ui.notify(`Comment added to ${target.path}`, "info");
	}

	function submitCommentsToPrompt(ctx: ExtensionContext): boolean {
		const prompt = formatCommentsForPrompt();
		if (!prompt) {
			ctx.ui.notify("No comments to submit", "warning");
			return false;
		}
		ctx.ui.setEditorText(prompt);
		ctx.ui.notify("Comments added to prompt", "info");
		return true;
	}

	pi.registerCommand("self-review", {
		description: "Toggle the self-review diff panel",
		handler: async (_args, ctx) => {
			if (overlayActive) {
				overlayDone?.();
				return;
			}
			refreshStatus();
			overlayActive = true;
			// Fire-and-forget: don't await the overlay's lifetime, otherwise the
			// /self-review command itself never returns, which keeps the main
			// interactive loop blocked inside session.prompt(). With the loop
			// blocked, getUserInput() never re-arms onInputCallback, so any
			// subsequent Enter in the prompt clears the editor without sending
			// the message. By returning immediately we let the loop resume and
			// the editor go back to working normally; the overlay keeps running
			// independently until the user closes it with `q` or runs the
			// command again.
			void ctx.ui.custom<void>(
				(tui, theme, _kb, done) => {
					let overlay: StatusOverlay;
					const hideCompactOverlay = () => {
						compactOverlayHandle?.hide();
						compactOverlayHandle = null;
					};
					const showCompactOverlay = () => {
						if (compactOverlayHandle) return;
						compactOverlayHandle = tui.showOverlay(overlay, {
							width: "40%",
							minWidth: 50,
							maxHeight: "100%",
							anchor: "top-right",
							margin: { top: 1, right: 1, bottom: 1 },
							nonCapturing: true,
						});
					};
					overlayDone = () => {
						hideCompactOverlay();
						done();
						overlayActive = false;
						overlayDone = null;
						requestOverlayRender = null;
						overlayHandle = null;
					};
					// The input dialog renders in the prompt editor area. Hide the panel
					// while it is open so the overlay does not cover the comment field.
					const onComment = (target: DiffCommentTarget) => {
						overlayHandle?.setHidden(true);
						tui.requestRender();
						void commentFlow(ctx, target).then(() => {
							overlayHandle?.setHidden(false);
							requestOverlayRender?.();
							overlayHandle?.focus();
						});
					};
					const releaseFocus = () => {
						overlayHandle?.setHidden(true);
						showCompactOverlay();
						tui.requestRender();
					};
					const onSubmitComments = () => {
						if (!submitCommentsToPrompt(ctx)) return;
						releaseFocus();
					};
					overlay = new StatusOverlay(
						theme,
						() => overlayDone!(),
						() => tui.requestRender(),
						(msg, level) => ctx.ui.notify(msg, level ?? "info"),
						onComment,
						onSubmitComments,
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
						width: "90%",
						minWidth: 50,
						maxHeight: "100%",
						anchor: "top-right",
						margin: { top: 1, right: 1, bottom: 1 },
						// Capturing overlay: framework focuses it on open. Press alt+g
						// to hide this full panel and show a non-capturing compact panel;
						// alt+g from the prompt restores the full focused panel.
					},
					onHandle: (handle) => {
						overlayHandle = handle;
					},
				},
			);
		},
	});

	// Global shortcut: focus the overlay so j/k, PgUp/PgDn, c, r work.
	// No-op when the overlay is closed or already focused.
	pi.registerShortcut(FOCUS_OVERLAY_KEY, {
		description: "Focus the self-review overlay (when open)",
		handler: () => {
			if (!overlayHandle) return;
			if (compactOverlayHandle) {
				compactOverlayHandle.hide();
				compactOverlayHandle = null;
				overlayHandle.setHidden(false);
				overlayHandle.focus();
				requestOverlayRender?.();
				return;
			}
			if (overlayHandle.isFocused()) return;
			overlayHandle.focus();
			requestOverlayRender?.();
		},
	});
}
