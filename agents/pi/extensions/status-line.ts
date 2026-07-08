/**
 * Oh My Pi-style status line
 *
 * Replaces the normal footer with a compact status bar embedded into the
 * prompt editor's top border:
 *   ╭─ π  model · thinking  cwd  git  ctx  cost ─ session ─╮
 *
 * Pi's public extension API only exposes custom footers, so this extension uses
 * a small, scoped prototype patch on the built-in CustomEditor to swap its top
 * border for the status bar. The footer itself renders no lines so the old
 * duplicated footer disappears.
 */

import type { AssistantMessage } from "@earendil-works/pi-ai";
import {
	CustomEditor,
	type ExtensionAPI,
	type ExtensionContext,
	type ReadonlyFooterDataProvider,
	type Theme,
} from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

const PATCHED = Symbol.for("nithin.pi.ompStatusLine.patched");
const STATE = Symbol.for("nithin.pi.ompStatusLine.state");

type RenderStatusLine = (width: number) => string;

type StatusLineState = {
	render?: RenderStatusLine;
	requestRender?: () => void;
};

const STATUS_BG = "\x1b[48;2;18;18;24m";
const STATUS_FG = "\x1b[38;2;18;18;24m";
const RESET_BG = "\x1b[49m";
const RESET_FG = "\x1b[39m";

const icons = {
	pi: "π",
	model: "",
	folder: "",
	branch: "",
	context: "",
	auto: "🪄",
	fast: "⚡",
	separator: "",
	end: "",
};

export default function (pi: ExtensionAPI) {
	let isStreaming = false;

	patchEditorTopBorder();

	pi.on("session_start", async (_event, ctx) => {
		isStreaming = false;

		ctx.ui.setFooter((tui, theme, footerData) => {
			const state = getState();
			const render: RenderStatusLine = (width) => buildStatusLine(width, pi, ctx, footerData, theme, isStreaming);
			state.render = render;
			state.requestRender = () => tui.requestRender();

			const unsub = footerData.onBranchChange(() => tui.requestRender());

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
		getState().requestRender?.();
	});

	pi.on("turn_end", async () => {
		isStreaming = false;
		getState().requestRender?.();
	});

	pi.on("model_select", async () => {
		getState().requestRender?.();
	});

	pi.on("thinking_level_select", async () => {
		getState().requestRender?.();
	});

	pi.on("session_shutdown", async () => {
		isStreaming = false;
	});
}

function getState(): StatusLineState {
	const global = globalThis as any;
	global[STATE] ??= {};
	return global[STATE] as StatusLineState;
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
			removeBottomBorderLine(lines);
			lines.push("");
		}
		return lines;
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
): string {
	const sep = theme.fg("dim", ` ${icons.separator} `);
	const accent = (s: string) => theme.fg("accent", s);
	const text = (s: string) => theme.fg("text", s);
	const warning = (s: string) => theme.fg("warning", s);
	const success = (s: string) => theme.fg("success", s);

	const leftParts = [
		accent(` ${icons.pi}`),
		modelPart(pi, ctx, theme, isStreaming),
		pathPart(ctx, theme),
	];

	const branch = footerData.getGitBranch();
	if (branch) {
		leftParts.push(`${warning(icons.branch)}${text(` ${branch}`)}`);
	}

	leftParts.push(contextPart(ctx, theme));

	const cost = totalCost(ctx);
	if (cost > 0) {
		leftParts.push(warning(`$${formatCost(cost)}`));
	}

	const left = leftParts.join(sep);
	const sessionName = ctx.sessionManager.getSessionName?.();
	const right = sessionName ? success(sessionName) : "";

	return renderBorderLine(width, left, right, theme);
}

function renderBorderLine(width: number, left: string, right: string, theme: Theme): string {
	const border = (s: string) => theme.fg("accent", s);
	const prefix = border("╭─ ");
	const suffix = border("─╮");
	const rawRightGroup = right ? ` ${right} ` : "";
	const endArrowWidth = left ? visibleWidth(icons.end) : 0;
	const fixedWidth = visibleWidth(prefix) + visibleWidth(suffix) + visibleWidth(rawRightGroup) + endArrowWidth;
	const minGap = right ? 1 : 0;
	const leftPaddingWidth = left ? 1 : 0;
	const availableLeft = Math.max(0, width - fixedWidth - minGap - leftPaddingWidth);
	const fittedLeft = visibleWidth(left) > availableLeft ? truncateToWidth(left, availableLeft, "") : left;

	const leftGroup = fittedLeft ? statusBg(`${fittedLeft} `) : "";
	const endArrow = fittedLeft ? statusEndArrow() : "";
	const rightGroup = rawRightGroup ? statusBg(rawRightGroup) : "";
	const used = visibleWidth(prefix) + visibleWidth(leftGroup) + visibleWidth(endArrow) + visibleWidth(rightGroup) + visibleWidth(suffix);
	const gap = Math.max(0, width - used);
	const line = `${prefix}${leftGroup}${endArrow}${border("─".repeat(gap))}${rightGroup}${suffix}`;

	return truncateToWidth(line, width, "");
}

function statusBg(text: string): string {
	return `${STATUS_BG}${text}${RESET_BG}`;
}

function statusEndArrow(): string {
	return `${STATUS_FG}${icons.end}${RESET_FG}`;
}

function modelPart(pi: ExtensionAPI, ctx: ExtensionContext, theme: Theme, isStreaming: boolean): string {
	const modelId = ctx.model?.id || "no-model";
	const modelLabel = prettyModel(ctx.model?.name || modelId);
	const thinking = pi.getThinkingLevel();
	const thinkingColor = thinkingLevelColor(theme, thinking);
	const activityDot = isStreaming ? theme.fg("accent", "◉") : thinkingColor("●");
	const fast = ctx.model?.reasoning ? ` ${theme.fg("accent", icons.fast)}` : "";

	return [
		theme.fg("accent", `${icons.model} ${modelLabel}`),
		fast,
		theme.fg("dim", " · "),
		activityDot,
		" ",
		thinkingColor(thinking),
	].join("");
}

function pathPart(ctx: ExtensionContext, theme: Theme): string {
	return `${theme.fg("text", icons.folder)}${theme.fg("text", ` ${formatPath(ctx.cwd)}`)}`;
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

function formatPath(cwd: string): string {
	const home = process.env.HOME;
	if (home && cwd === home) return "~";
	if (home && cwd.startsWith(`${home}/`)) return `~/${cwd.slice(home.length + 1)}`;
	return cwd;
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
