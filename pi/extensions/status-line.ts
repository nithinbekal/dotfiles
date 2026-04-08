/**
 * Status Line Extension
 *
 * A custom footer for pi with:
 *   Left:   folder │ git branch │ ● model name │ thinking level
 *   Right:  ↑in ↓out tokens │ $cost │ turn count
 *
 * Also sets a status indicator that shows turn progress.
 */

import type { AssistantMessage } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";

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
					// --- Compute token stats ---
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

					// --- Left side: folder | branch | model | thinking ---
					const separator = theme.fg("dim", " │ ");

					// Current working directory (just folder name)
					const cwd = process.cwd();
					const folderName = cwd.split('/').pop() || cwd;
					const folderPart = theme.fg("muted", "📁 " + folderName);

					// Git branch
					const branch = footerData.getGitBranch();
					const branchPart = branch
						? separator + theme.fg("muted", "🌿 " + branch)
						: "";

					// Model indicator
					const modelName = ctx.model?.id || "no-model";
					const shortModel = shortenModel(modelName);
					const modelPart = separator + (isStreaming
						? theme.fg("accent", "◉ ") + theme.fg("text", shortModel)
						: theme.fg("dim", "○ ") + theme.fg("text", shortModel));

					// Thinking level
					const thinking = pi.getThinkingLevel();
					const thinkingPart = thinking !== "off"
						? separator + thinkingBadge(theme, thinking)
						: "";

					const left = folderPart + branchPart + modelPart + thinkingPart;

					// --- Right side: tokens + cost + turns ---
					const fmt = (n: number) =>
						n < 1000 ? `${n}` : n < 1_000_000 ? `${(n / 1000).toFixed(1)}k` : `${(n / 1_000_000).toFixed(1)}M`;

					const tokensPart = theme.fg("dim", `↑${fmt(inputTokens)} ↓${fmt(outputTokens)}`);

					// Context usage %
					const ctxUsage = ctx.getContextUsage();
					const ctxPart = ctxUsage?.percent != null
						? separator + theme.fg(
							ctxUsage.percent > 80 ? "error" : ctxUsage.percent > 50 ? "warning" : "dim",
							`ctx ${Math.round(ctxUsage.percent)}%`
						)
						: "";
					const costPart = totalCost > 0
						? separator + theme.fg("warning", `$${formatCost(totalCost)}`)
						: "";
					const turnsPart = turnCount > 0
						? separator + theme.fg("muted", `${turnCount} turn${turnCount !== 1 ? "s" : ""}`)
						: "";

					const right = tokensPart + ctxPart + costPart + turnsPart;

					// --- Compose ---
					const gap = width - visibleWidth(left) - visibleWidth(right);
					const pad = " ".repeat(Math.max(1, gap));
					return [truncateToWidth(left + pad + right, width)];
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

function shortenModel(id: string): string {
	// Trim common prefixes/suffixes for a compact display
	return id
		.replace(/-\d{8}$/, "")        // remove date suffixes like -20250514
		.replace(/^claude-/, "")        // claude-sonnet-4 → sonnet-4
		.replace(/^gpt-/, "gpt")        // keep gpt prefix short
		.replace(/^gemini-/, "gemini "); // gemini-2.5-pro → gemini 2.5-pro
}

function thinkingBadge(theme: any, level: string): string {
	const badges: Record<string, [string, string]> = {
		minimal:  ["⚡", "thinkingMinimal"],
		low:      ["💭", "thinkingLow"],
		medium:   ["🧠", "thinkingMedium"],
		high:     ["🔥", "thinkingHigh"],
		xhigh:    ["⚡🔥", "thinkingXhigh"],
	};
	const [icon, color] = badges[level] || ["?", "dim"];
	return theme.fg(color, `${icon} ${level}`);
}

function formatCost(cost: number): string {
	if (cost < 0.01) return cost.toFixed(4);
	if (cost < 1) return cost.toFixed(3);
	return cost.toFixed(2);
}
