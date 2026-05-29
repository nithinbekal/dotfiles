/**
 * Compact Tool Rendering
 *
 * Overrides the built-in read and bash tool renderers to keep tool rows to a
 * single line while preserving the normal tool execution/result sent to the LLM.
 */

import type { AgentToolResult } from "@earendil-works/pi-agent-core";
import {
	createBashToolDefinition,
	createReadToolDefinition,
	type ExtensionAPI,
	type ToolDefinition,
	type ToolRenderContext,
	type ToolRenderResultOptions,
} from "@earendil-works/pi-coding-agent";
import type { Component } from "@earendil-works/pi-tui";
import { truncateToWidth } from "@earendil-works/pi-tui";

const cwd = process.cwd();
const readTool = createReadToolDefinition(cwd);
const bashTool = createBashToolDefinition(cwd);

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		...readTool,
		renderShell: "self",
		renderCall: (args, theme, context) => toolHeader(context, formatRead(args, theme)),
		renderResult: (result, options, theme, context) => toolResult(context, formatResult(result, options, theme, resultSummary(result, "read"))),
	} satisfies ToolDefinition);

	pi.registerTool({
		...bashTool,
		renderShell: "self",
		renderCall: (args, theme, context) => toolHeader(context, formatBash(args, theme)),
		renderResult: (result, options, theme, context) => toolResult(context, formatResult(result, options, theme, resultSummary(result, "bash"))),
	} satisfies ToolDefinition);
}

interface CompactToolState {
	header?: string;
	result?: string;
}

class ToolHeaderLine implements Component {
	constructor(private state: CompactToolState) {}

	render(width: number): string[] {
		const line = [this.state.header, this.state.result].filter(Boolean).join(" ");
		return [truncateToWidth(line, width, "…")];
	}

	invalidate() {}
}

class EmptyComponent implements Component {
	render(): string[] {
		return [];
	}

	invalidate() {}
}

function toolHeader(context: ToolRenderContext<CompactToolState>, text: string): ToolHeaderLine {
	context.state.header = text;
	return context.lastComponent instanceof ToolHeaderLine ? context.lastComponent : new ToolHeaderLine(context.state);
}

function toolResult(context: ToolRenderContext<CompactToolState>, text: string): EmptyComponent {
	context.state.result = text;
	return context.lastComponent instanceof EmptyComponent ? context.lastComponent : new EmptyComponent();
}

function formatRead(args: unknown, theme: ThemeLike): string {
	const input = asRecord(args);
	const path = typeof input.path === "string" ? input.path : "…";
	const range = [
		typeof input.offset === "number" ? `offset ${input.offset}` : undefined,
		typeof input.limit === "number" ? `limit ${input.limit}` : undefined,
	]
		.filter(Boolean)
		.join(", ");
	return `${theme.fg("toolTitle", theme.bold("🔖 read"))} ${theme.fg("toolOutput", path)}${range ? theme.fg("muted", ` (${range})`) : ""}`;
}

function formatBash(args: unknown, theme: ThemeLike): string {
	const input = asRecord(args);
	const command = typeof input.command === "string" && input.command.trim() ? input.command.replace(/\s+/g, " ").trim() : "…";
	const timeout = typeof input.timeout === "number" ? theme.fg("muted", ` (timeout ${input.timeout}s)`) : "";
	return `${theme.fg("toolTitle", theme.bold("💻 bash"))} ${theme.fg("toolOutput", command)}${timeout}`;
}

function formatResult(result: AgentToolResult<unknown>, options: ToolRenderResultOptions, theme: ThemeLike, summary: string): string {
	const icon = options.isPartial ? "…" : "✓";
	const color = options.isPartial ? "warning" : "success";
	return `${theme.fg(color, icon)} ${theme.fg("muted", summary)}`;
}

function resultSummary(result: AgentToolResult<unknown>, tool: "read" | "bash"): string {
	const textBlocks = result.content.filter((item) => item.type === "text");
	const imageBlocks = result.content.filter((item) => item.type === "image");
	const text = textBlocks.map((item) => item.text ?? "").join("\n").trim();
	const lineCount = text ? text.split("\n").length : 0;
	const imageSuffix = imageBlocks.length > 0 ? `, ${imageBlocks.length} image${imageBlocks.length === 1 ? "" : "s"}` : "";

	if (tool === "bash") {
		return text || imageBlocks.length > 0 ? `${lineCount} output line${lineCount === 1 ? "" : "s"}${imageSuffix}` : "no output";
	}

	return text || imageBlocks.length > 0 ? `${lineCount} line${lineCount === 1 ? "" : "s"}${imageSuffix}` : "empty file";
}

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

type ThemeLike = {
	fg(name: string, text: string): string;
	bold(text: string): string;
};
