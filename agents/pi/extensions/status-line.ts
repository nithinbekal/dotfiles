/**
 * Status Line Extension
 *
 * A custom footer for pi that mirrors the Claude Code status line:
 *   π ❯ model/context/thinking ❯ folder ❯ git branch ❯ ctx usage ❯ tokens ❯ cost
 *
 * Also tracks turn progress.
 */

import type { AssistantMessage } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { truncateToWidth } from "@mariozechner/pi-tui";

export default function (pi: ExtensionAPI) {
	let turnCount = 0;
	let isStreaming = false;

	pi.on("session_start", async (_event, ctx) => {
		// Count existing turns from session history
		turnCount = 0;
		for (const entry of ctx.sessionManager.getBranch()) {
			if (entry.type === "message" && entry.message.role === "assistant") {
				turnCount++;
			}
		}

		// Install the custom footer
		ctx.ui.setFooter((tui, theme, footerData) => {
			const unsub = footerData.onBranchChange(() => tui.requestRender());

			return {
				dispose: unsub,
				invalidate() {},
				render(width: number): string[] {
					let inputTokens = 0;
					let outputTokens = 0;
					let totalCost = 0;

					for (const e of ctx.sessionManager.getBranch()) {
						if (e.type === "message" && e.message.role === "assistant") {
							const m = e.message as AssistantMessage;
							inputTokens += m.usage.input;
							outputTokens += m.usage.output;
							totalCost += m.usage.cost.total;
						}
					}

					const sep = theme.fg("dim", " ❯ ");
					const accent = (s: string) => theme.fg("accent", s);
					const dim = (s: string) => theme.fg("dim", s);
					const text = (s: string) => theme.fg("text", s);
					const warning = (s: string) => theme.fg("warning", s);

					const ctxUsage = ctx.getContextUsage();
					const ctxWindow = ctxUsage?.contextWindow ?? ctx.model?.contextWindow ?? 0;
					const ctxSize = ctxWindow > 0 ? fmt(ctxWindow) : "?";
					const ctxPercent = ctxUsage?.percent ?? 0;
					const ctxPct = ctxUsage?.percent != null ? ctxPercent.toFixed(1) : "0.0";
					const totalTokens = inputTokens + outputTokens;

					const modelName = ctx.model?.id || "no-model";
					const modelLabel = prettyModel(modelName);
					const thinking = pi.getThinkingLevel();
					const thinkingColor = thinkingLevelColor(theme, thinking);
					const streamingDot = isStreaming ? accent("◉ ") : thinkingColor("● ");
					const modelPart = `${accent("⚙ ")}${text(modelLabel)}${dim(` [${ctxSize}]`)}${dim(" ·")} ${streamingDot}${text(thinking)}`;

					const cwd = process.cwd();
					const folderName = cwd.split("/").pop() || cwd;
					const folderPart = `${theme.fg("success", " ")}${text(folderName)}`;

					const branch = footerData.getGitBranch();
					const branchPart = branch ? `${sep}${warning("")}${text(` ${branch}`)}` : "";

					const contextColor = ctxPercent > 80 ? "error" : ctxPercent > 50 ? "warning" : "accent";
					const contextPart = `${accent(" ")}${theme.fg(contextColor, `${ctxPct}%/${ctxSize}`)}`;
					const tokensPart = `${accent(" ")}${text(`→${fmt(totalTokens)}`)}`;
					const costPart = totalCost > 0 ? `${sep}${warning(`$${formatCost(totalCost)}`)}` : "";
					const turnsPart = turnCount > 0 ? `${sep}${dim(`${turnCount} turn${turnCount !== 1 ? "s" : ""}`)}` : "";

					const line = [
						accent(" π"),
						modelPart,
						folderPart,
					]
						.join(sep)
						+ branchPart
						+ sep + contextPart
						+ sep + tokensPart
						+ costPart
						+ turnsPart;

					return [truncateToWidth(line, width)];
				},
			};
		});
	});

	// Track turn progress
	pi.on("turn_start", async (_event, _ctx) => {
		isStreaming = true;
	});

	pi.on("turn_end", async (_event, _ctx) => {
		turnCount++;
		isStreaming = false;
	});

	// Reset on new session
	pi.on("session_switch", async (event, _ctx) => {
		if (event.reason === "new") {
			turnCount = 0;
			isStreaming = false;
		}
	});
}

// --- Helpers ---

function fmt(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1000) return `${Math.round(n / 1000)}k`;
	return `${n}`;
}

function prettyModel(id: string): string {
	const parts = id
		.replace(/-\d{8}$/, "")
		.replace(/\[.*\]/, "")
		.split("-");

	if (parts[0] === "claude" && parts.length >= 4) {
		return `${capitalize(parts[1])} ${parts[2]}.${parts[3]}`;
	}

	if (parts[0] === "claude" && parts.length >= 3) {
		return `${capitalize(parts[1])} ${parts[2]}`;
	}

	return id;
}

function capitalize(s: string): string {
	return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function thinkingLevelColor(theme: any, level: string): (s: string) => string {
	const color: Record<string, string> = {
		minimal: "dim",
		low: "text",
		medium: "warning",
		high: "error",
		xhigh: "error",
	};
	return (s: string) => theme.fg(color[level] || "text", s);
}

function formatCost(cost: number): string {
	if (cost < 0.01) return cost.toFixed(4);
	if (cost < 1) return cost.toFixed(3);
	return cost.toFixed(2);
}
