/**
 * Oh My Pi-style status line
 *
 * Replaces the normal footer with a compact status bar embedded into the
 * prompt editor's top border:
 *   ─ π  model · thinking  folder  worktree  git  ctx  cost ─ session ─
 *
 * Pi's public extension API only exposes custom footers, so this extension uses
 * a small, scoped prototype patch on the built-in CustomEditor to swap its top
 * border for the status bar. The footer itself renders no lines so the old
 * duplicated footer disappears. The editor rows are also filled with the
 * theme's user-message background so the prompt, including its border rows,
 * reads as one dark panel.
 */

import { basename, resolve } from "node:path";
import type { AssistantMessage } from "@earendil-works/pi-ai";
import {
	AssistantMessageComponent,
	CustomEditor,
	type ExtensionAPI,
	type ExtensionContext,
	type ReadonlyFooterDataProvider,
	type Theme,
} from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

const PATCHED = Symbol.for("nithin.pi.ompStatusLine.patched");
const THINKING_BLOCK_PATCHED = Symbol.for("nithin.pi.ompStatusLine.thinkingBlockPatched");
const STATE = Symbol.for("nithin.pi.ompStatusLine.state");

let capturedTheme: Theme | undefined;

type RenderStatusLine = (width: number) => string;

type StatusLineState = {
	render?: RenderStatusLine;
	requestRender?: () => void;
};

type PrInfo = { number: string; url: string };

// A continuous muted teal strip groups the status and complements the theme accent.
const STATUS_BG = "\x1b[48;2;32;56;59m";
const ACTIVITY_FG = "\x1b[38;2;255;158;100m";
const VOICE_FG = "\x1b[38;2;255;85;85m";
const RESET_BG = "\x1b[49m";
const RESET_FG = "\x1b[39m";

const icons = {
	pi: "π",
	model: "",
	folder: "",
	worktree: "wt",
	branch: "",
	context: "",
	auto: "🪄",
	fast: "⚡",
	thinking: "󰧑",
	separator: "",
};

export default function (pi: ExtensionAPI) {
	let isStreaming = false;
	let isThinking = false;

	patchEditorTopBorder();
	patchHiddenThinkingBlocks();

	pi.on("session_start", async (_event, ctx) => {
		isStreaming = false;
		isThinking = false;
		if (ctx.mode === "tui") {
			capturedTheme = ctx.ui.theme;
			ctx.ui.setHiddenThinkingLabel("");
			ctx.ui.setWorkingVisible(false);
		}
		const worktree = await getLinkedWorktreeName(pi, ctx.cwd);

		ctx.ui.setFooter((tui, theme, footerData) => {
			const state = getState();
			let prInfo: PrInfo | undefined;

			// Resolve the current branch's PR (number + web URL) via `gh pr view`.
			// Skipped on main/master. Async + cached: refreshed only here and on
			// branch change, then a re-render is requested when the result lands.
			const refreshPrNumber = async () => {
				const branch = footerData.getGitBranch();
				if (!branch || branch === "main" || branch === "master") {
					prInfo = undefined;
					return;
				}
				const result = await pi
					.exec("gh", ["pr", "view", "--json", "number,url"], { cwd: ctx.cwd })
					.catch(() => undefined);
				prInfo = undefined;
				if (result && result.code === 0) {
					try {
						const parsed = JSON.parse(result.stdout);
						if (parsed?.number != null && parsed?.url) {
							prInfo = { number: String(parsed.number), url: String(parsed.url) };
						}
					} catch {}
				}
				state.requestRender?.();
			};

			const render: RenderStatusLine = (width) =>
				buildStatusLine(width, pi, ctx, footerData, theme, isStreaming, isThinking, worktree, prInfo);
			state.render = render;
			state.requestRender = () => tui.requestRender();

			void refreshPrNumber();

			const unsub = footerData.onBranchChange(() => {
				void refreshPrNumber();
				tui.requestRender();
			});

			return {
				dispose() {
					unsub();
					const current = getState();
					if (current.render === render) {
						current.render = undefined;
						current.requestRender = undefined;
					}
				},
				invalidate() {},
				render() {
					// Hide the old footer. Status now lives in the editor top border.
					return [];
				},
			};
		});
	});

	pi.on("turn_start", async () => {
		isStreaming = true;
		isThinking = false;
		getState().requestRender?.();
	});

	pi.on("message_update", async (event) => {
		const eventType = event.assistantMessageEvent.type;
		if (eventType === "thinking_start") {
			isThinking = true;
			getState().requestRender?.();
		} else if (eventType === "thinking_end") {
			isThinking = false;
			getState().requestRender?.();
		}
	});

	pi.on("turn_end", async () => {
		isStreaming = false;
		isThinking = false;
		getState().requestRender?.();
	});

	pi.on("model_select", async () => {
		getState().requestRender?.();
	});

	pi.on("thinking_level_select", async () => {
		getState().requestRender?.();
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		isStreaming = false;
		isThinking = false;
		if (ctx.mode === "tui") {
			ctx.ui.setHiddenThinkingLabel();
			ctx.ui.setWorkingVisible(true);
		}
	});
}

function getState(): StatusLineState {
	const global = globalThis as any;
	global[STATE] ??= {};
	return global[STATE] as StatusLineState;
}

function patchHiddenThinkingBlocks(): void {
	const proto = AssistantMessageComponent.prototype as any;
	if (proto[THINKING_BLOCK_PATCHED]) return;
	proto[THINKING_BLOCK_PATCHED] = true;

	const originalUpdateContent = proto.updateContent as (message: AssistantMessage) => void;
	proto.updateContent = function (this: any, message: AssistantMessage): void {
		if (this.hideThinkingBlock && this.hiddenThinkingLabel === "") {
			const visibleMessage = {
				...message,
				content: message.content.filter((content) => content.type !== "thinking"),
			};
			originalUpdateContent.call(this, visibleMessage);

			// Keep the original message so changing the setting can restore its
			// thinking content; only the rendered copy is filtered.
			this.lastMessage = message;
			return;
		}

		originalUpdateContent.call(this, message);
	};
}

function patchEditorTopBorder() {
	const proto = CustomEditor.prototype as any;

	if (proto[PATCHED]) return;
	proto[PATCHED] = true;

	const originalRender = proto.render as (this: CustomEditor, width: number) => string[];
	proto.render = function (this: CustomEditor, width: number): string[] {
		const lines = originalRender.call(this, width);
		const render = getState().render;
		if (render && lines.length > 0) {
			lines[0] = render(width);
			lines.splice(1, 0, "");
			removeBottomBorderLine(lines);
			lines.push("");
		}

		const theme = capturedTheme;
		return theme ? lines.map((line) => applyEditorBackground(line, width, theme)) : lines;
	};
}

function removeBottomBorderLine(lines: string[]): void {
	for (let i = lines.length - 1; i >= 1; i--) {
		if (isEditorBorderLine(lines[i] ?? "")) {
			lines.splice(i, 1);
			return;
		}
	}

	// Editor.render() always appends a bottom border after the visible input
	// rows. If the exact glyph/color shape changes, still drop that final row so
	// the prompt stays OMP-style: status line on top, no underline below.
	if (lines.length > 1) {
		lines.pop();
	}
}

function applyEditorBackground(line: string, width: number, theme: Theme): string {
	const backgroundStart = theme.bg("userMessageBg", "").replace(/\x1b\[49m$/, "");
	const withBackground = applyBackgroundToLine(line, width, (text) => theme.bg("userMessageBg", text));

	// The editor uses a full reset for its cursor highlight. Reapply the
	// editor background afterward so the rest of that row stays filled.
	return withBackground.replace(/\x1b\[0m|\x1b\[49m/g, (reset, offset) =>
		offset + reset.length === withBackground.length ? reset : `${reset}${backgroundStart}`,
	);
}

function applyBackgroundToLine(line: string, width: number, applyBackground: (text: string) => string): string {
	if (width <= 0) return "";

	const fittedLine = visibleWidth(line) > width ? truncateToWidth(line, width, "") : line;
	const padding = " ".repeat(Math.max(0, width - visibleWidth(fittedLine)));
	return applyBackground(`${fittedLine}${padding}`);
}

function isEditorBorderLine(line: string): boolean {
	const plain = stripAnsi(line).trim();
	const horizontal = "[─━═╌┄-]";
	return new RegExp(`^${horizontal}+$`).test(plain) || new RegExp(`^${horizontal}+ [↑↓] \\d+ more ${horizontal}*$`).test(plain);
}

function stripAnsi(text: string): string {
	return text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "");
}

function buildStatusLine(
	width: number,
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	footerData: ReadonlyFooterDataProvider,
	theme: Theme,
	isStreaming: boolean,
	isThinking: boolean,
	worktree?: string,
	prInfo?: PrInfo,
): string {
	const sep = theme.fg("dim", ` ${icons.separator} `);
	const accent = (s: string) => theme.fg("accent", s);
	const text = (s: string) => theme.fg("text", s);
	const warning = (s: string) => theme.fg("warning", s);
	const success = (s: string) => theme.fg("success", s);

	const leftParts = [accent(icons.pi), modelPart(pi, ctx, theme), pathPart(ctx, theme)];

	if (worktree) {
		leftParts.push(worktreePart(worktree, theme));
	}

	const branch = footerData.getGitBranch();
	if (branch) {
		let branchPart = `${warning(icons.branch)}${text(` ${branch}`)}`;
		if (prInfo && branch !== "main" && branch !== "master") {
			branchPart += `${theme.fg("dim", " ")}${theme.fg("dim", hyperlink(`#${prInfo.number}`, prInfo.url))}`;
		}
		leftParts.push(branchPart);
	}

	const voice = voiceActivity(footerData);
	if (voice) {
		leftParts.push(voicePart(voice, theme));
	} else if (isStreaming) {
		leftParts.push(workingPart(isThinking, theme));
	}

	const rightParts = [contextPart(ctx, theme)];

	const cost = totalCost(ctx);
	if (cost > 0) {
		rightParts.push(warning(`$${formatCost(cost)}`));
	}

	const sessionName = ctx.sessionManager.getSessionName?.();
	if (sessionName) {
		rightParts.push(success(sessionName));
	}

	const left = leftParts.join(sep);
	const right = rightParts.join(sep);

	return renderStatusBar(width, left, right);
}

function renderStatusBar(width: number, left: string, right: string): string {
	if (width <= 0) return "";

	const rightGroup = right ? ` ${right} ` : "";
	const minGap = left && right ? 1 : 0;
	const leftPaddingWidth = left ? 1 : 0;
	const availableLeft = Math.max(0, width - visibleWidth(rightGroup) - minGap - leftPaddingWidth);
	const fittedLeft = visibleWidth(left) > availableLeft ? truncateToWidth(left, availableLeft, "") : left;
	const leftGroup = fittedLeft ? ` ${fittedLeft}` : "";
	const used = visibleWidth(leftGroup) + visibleWidth(rightGroup);
	const gap = Math.max(minGap, width - used);
	const line = truncateToWidth(`${leftGroup}${" ".repeat(gap)}${rightGroup}`, width, "");
	const padding = " ".repeat(Math.max(0, width - visibleWidth(line)));

	return statusBg(`${line}${padding}`);
}

function statusBg(text: string): string {
	return `${STATUS_BG}${text}${RESET_BG}`;
}

// OSC 8 hyperlink. Terminals that support it (Ghostty, iTerm2) make `text`
// command-clickable to open `url`; others render just the visible text.
// pi-tui's visibleWidth/truncateToWidth strip OSC sequences, so this is safe
// inside the status line's width math.
function hyperlink(text: string, url: string): string {
	return `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;
}

function modelPart(pi: ExtensionAPI, ctx: ExtensionContext, theme: Theme): string {
	const modelId = ctx.model?.id || "no-model";
	const modelLabel = prettyModel(ctx.model?.name || modelId);
	const thinking = pi.getThinkingLevel();
	const thinkingColor = thinkingLevelColor(theme, thinking);
	const fast = ctx.model?.reasoning ? ` ${theme.fg("accent", icons.fast)}` : "";

	return [
		theme.fg("accent", `${icons.model} ${modelLabel}`),
		fast,
		theme.fg("dim", " · "),
		thinkingColor("●"),
		" ",
		thinkingColor(thinking),
	].join("");
}

function workingPart(isThinking: boolean, theme: Theme): string {
	const label = isThinking ? `${icons.thinking} Thinking` : "◉ Working...";
	return `${ACTIVITY_FG}${theme.bold(label)}${RESET_FG}`;
}

type VoiceState = { state: "recording" | "transcribing"; elapsed?: string };

// The voice extension publishes its state via ctx.ui.setStatus("voice", ...).
// We only surface the active phases (🔴 recording, ✍️ transcribing) here; the
// idle "🎤" prompt is intentionally ignored so this slot stays quiet otherwise.
function voiceActivity(footerData: ReadonlyFooterDataProvider): VoiceState | undefined {
	const status = footerData.getExtensionStatuses().get("voice");
	if (!status) return undefined;
	if (status.includes("🔴")) {
		const elapsed = status
			.replace("🔴", "")
			.replace("Recording...", "")
			.replace(/\(.*\)/, "")
			.trim();
		return { state: "recording", elapsed: elapsed || undefined };
	}
	if (status.includes("✍")) return { state: "transcribing" };
	return undefined;
}

function voicePart(voice: VoiceState, theme: Theme): string {
	const label =
		voice.state === "recording"
			? `● REC${voice.elapsed ? ` ${voice.elapsed}` : ""}`
			: "✎ Transcribing";
	return `${VOICE_FG}${theme.bold(label)}${RESET_FG}`;
}

function pathPart(ctx: ExtensionContext, theme: Theme): string {
	return `${theme.fg("text", icons.folder)}${theme.fg("text", ` ${basename(ctx.cwd) || ctx.cwd}`)}`;
}

function worktreePart(worktree: string, theme: Theme): string {
	return `${theme.fg("dim", icons.worktree)}${theme.fg("text", ` ${worktree}`)}`;
}

async function getLinkedWorktreeName(pi: ExtensionAPI, cwd: string): Promise<string | undefined> {
	const result = await pi.exec("git", ["rev-parse", "--show-toplevel", "--git-dir", "--git-common-dir"], { cwd })
		.catch(() => undefined);
	if (!result || result.code !== 0) return undefined;

	const [topLevel, gitDir, commonDir] = result.stdout.trim().split("\n");
	if (!topLevel || !gitDir || !commonDir) return undefined;

	const gitDirPath = resolve(cwd, gitDir);
	const commonDirPath = resolve(cwd, commonDir);
	if (gitDirPath === commonDirPath) return undefined;

	// Shopify's World checkout keeps every checkout at world/trees/<name>/src.
	// Treat trees/root as the default checkout, and use the tree directory name
	// for actual linked worktrees instead of displaying the unhelpful "src".
	const treeDir = resolve(topLevel, "..");
	const treesDir = resolve(treeDir, "..");
	const worldDir = resolve(treesDir, "..");
	if (basename(topLevel) === "src" && basename(treesDir) === "trees" && basename(worldDir) === "world") {
		const treeName = basename(treeDir);
		return treeName === "root" ? undefined : treeName;
	}

	return basename(topLevel) || undefined;
}

function contextPart(ctx: ExtensionContext, theme: Theme): string {
	const usage = ctx.getContextUsage();
	const contextWindow = usage?.contextWindow ?? ctx.model?.contextWindow ?? 0;
	const percent = usage?.percent ?? 0;
	const percentLabel = usage?.percent == null ? "?" : percent.toFixed(1);
	const windowLabel = contextWindow > 0 ? fmt(contextWindow) : "?";
	const color = percent > 80 ? "error" : percent > 50 ? "warning" : "text";

	return [
		theme.fg("text", icons.context),
		" ",
		theme.fg(color as any, `${percentLabel}%/${windowLabel}`),
		" ",
		theme.fg("dim", icons.auto),
	].join("");
}

function totalCost(ctx: ExtensionContext): number {
	let cost = 0;
	for (const entry of ctx.sessionManager.getBranch()) {
		if (entry.type === "message" && entry.message.role === "assistant") {
			const message = entry.message as AssistantMessage;
			cost += message.usage?.cost?.total ?? 0;
		}
	}
	return cost;
}

function fmt(n: number): string {
	if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
	if (n >= 10_000) return `${Math.round(n / 1000)}k`;
	if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
	return `${n}`;
}

function prettyModel(id: string): string {
	const cleaned = id.replace(/^Claude\s+/i, "").replace(/-\d{8}$/, "").replace(/\[.*\]/, "");
	const parts = cleaned.split("-");

	if (parts[0] === "claude" && parts.length >= 4) {
		return `${capitalize(parts[1])} ${parts[2]}.${parts[3]}`;
	}

	if (parts[0] === "claude" && parts.length >= 3) {
		return `${capitalize(parts[1])} ${parts[2]}`;
	}

	return cleaned
		.replace(/^gpt-/, "GPT ")
		.replace(/^glm-/, "GLM ")
		.replace(/^fireworks:/, "")
		.replace(/-/g, " ");
}

function capitalize(s: string | undefined): string {
	return s ? s[0].toUpperCase() + s.slice(1) : "";
}

function thinkingLevelColor(theme: Theme, level: string): (s: string) => string {
	const color: Record<string, string> = {
		off: "dim",
		minimal: "dim",
		low: "text",
		medium: "warning",
		high: "accent",
		xhigh: "error",
	};
	return (s: string) => theme.fg((color[level] || "text") as any, s);
}

function formatCost(cost: number): string {
	if (cost < 0.01) return cost.toFixed(4);
	if (cost < 1) return cost.toFixed(2);
	return cost.toFixed(2);
}
