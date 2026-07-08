/**
 * Turn Timestamps Extension
 *
 * Adds short right-aligned timestamps like `(11:05 AM)` after user messages
 * and assistant turns in the interactive transcript.
 */

import type { ExtensionAPI, InteractiveMode, Theme } from "@earendil-works/pi-coding-agent";
import type { Component } from "@earendil-works/pi-tui";
import { InteractiveMode as PiInteractiveMode } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

type AgentMessage = any;

const PATCHED = Symbol.for("nithin.pi.turnTimestamps.patched");

// The coding-agent theme singleton is internal and not importable from an
// extension. We capture it from the extension context at session start and
// share it with the prototype-patched render path below.
let capturedTheme: Theme | undefined;

type TimestampedInteractiveMode = InteractiveMode & {
	chatContainer?: { addChild(component: Component): void };
	ui?: { requestRender(): void };
	[PATCHED]?: boolean;
};

export default function (pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		capturedTheme = ctx.ui.theme;
	});

	patchInteractiveMode();
}

function patchInteractiveMode() {
	const proto = PiInteractiveMode.prototype as TimestampedInteractiveMode & {
		addMessageToChat?: (message: AgentMessage, options?: unknown) => unknown;
		handleEvent?: (event: any) => unknown | Promise<unknown>;
	};

	if (proto[PATCHED]) return;
	proto[PATCHED] = true;

	const originalAddMessageToChat = proto.addMessageToChat;
	if (originalAddMessageToChat) {
		proto.addMessageToChat = function (this: TimestampedInteractiveMode, message: AgentMessage, options?: unknown) {
			const result = originalAddMessageToChat.call(this, message, options);

			// Live user messages and history rendering both flow through addMessageToChat.
			// Live assistant messages stream through handleEvent instead, so we only
			// decorate assistant messages here when loading existing session history.
			if (message.role === "user" || message.role === "assistant") {
				appendTimestamp(this, message.timestamp);
			}

			return result;
		};
	}

	const originalHandleEvent = proto.handleEvent;
	if (originalHandleEvent) {
		proto.handleEvent = async function (this: TimestampedInteractiveMode, event: any) {
			const result = await originalHandleEvent.call(this, event);

			// A Pi turn ends after the assistant message and any tool executions for
			// that response, so this places the timestamp after the whole turn.
			if (event?.type === "turn_end") {
				appendTimestamp(this, event.message?.timestamp ?? Date.now());
				this.ui?.requestRender?.();
			}

			return result;
		};
	}
}

function appendTimestamp(mode: TimestampedInteractiveMode, timestamp: number | undefined) {
	const chatContainer = mode.chatContainer;
	if (!chatContainer || !capturedTheme) return;

	chatContainer.addChild(new RightAlignedTimestamp(formatTimestamp(timestamp)));
}

function formatTimestamp(timestamp: number | undefined): string {
	const time = new Intl.DateTimeFormat("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	}).format(new Date(timestamp ?? Date.now()));

	return `(${time})`;
}

class RightAlignedTimestamp implements Component {
	constructor(private readonly timestamp: string) {}

	render(width: number): string[] {
		const styled = capturedTheme?.fg("dim", this.timestamp) ?? this.timestamp;
		const line = truncateToWidth(styled, width);
		const padding = Math.max(0, width - visibleWidth(line));
		return [" ".repeat(padding) + line];
	}

	invalidate(): void {
		// No cached render state.
	}
}
