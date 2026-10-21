/**
 * External editor on Ctrl+G
 *
 * Pi's built-in external-editor shortcut is unbound in the user keybindings so
 * this extension can own Ctrl+G. It follows the same edit contract as Pi's
 * built-in flow:
 *
 *   1. Write the current prompt to a temporary Markdown file.
 *   2. Run the configured external editor on it.
 *   3. Wait for the editor to exit.
 *   4. On exit status 0, replace Pi's prompt with the edited file contents.
 *
 * Inside tmux, the editor runs in a pane on the right and Pi's TUI stays up.
 * Outside tmux, it suspends the TUI and runs in the same terminal, like Pi's
 * built-in flow.
 *
 * The editor command uses the same precedence as Pi: settings.json
 * `externalEditor`, $VISUAL, $EDITOR, then the platform default.
 */

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
	getAgentDir,
	SettingsManager,
	type ExtensionAPI,
	type ExtensionContext,
} from "@earendil-works/pi-coding-agent";

const PANE_SIZE_PERCENT = "50";

function shellQuote(value: string): string {
	return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function paneCommand(
	editorCommand: string,
	temporaryFile: string,
	statusFile: string,
	waitChannel: string,
): string {
	// Match Pi 0.80's simple space-delimited argv handling for commands such as
	// "code --wait". Like Pi's built-in flow, this does not interpret shell quotes
	// in editor paths or arguments. Quoting each resulting token keeps paths safe
	// and ensures a malformed setting cannot suppress the EXIT trap.
	const editorArgv = editorCommand.split(" ").filter(Boolean);
	const command = [...editorArgv, temporaryFile].map(shellQuote).join(" ");

	return [
		"finish_side_editor() {",
		"  exit_code=$?",
		"  trap - EXIT HUP INT TERM",
		`  printf '%s\\n' "$exit_code" > ${shellQuote(statusFile)}`,
		`  tmux wait-for -S ${shellQuote(waitChannel)}`,
		'  exit "$exit_code"',
		"}",
		"trap finish_side_editor EXIT HUP INT TERM",
		command,
	].join("\n");
}

function externalEditorCommand(ctx: ExtensionContext): string | undefined {
	return SettingsManager.create(ctx.cwd, getAgentDir(), {
		projectTrusted: ctx.isProjectTrusted(),
	}).getExternalEditorCommand();
}

async function editInTerminal(ctx: ExtensionContext, editorCommand: string): Promise<void> {
	const temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-editor-"));
	const temporaryFile = path.join(temporaryDir, "prompt.pi.md");
	fs.writeFileSync(temporaryFile, ctx.ui.getEditorText(), "utf-8");

	try {
		const status = await ctx.ui.custom<number | null>((tui, _theme, _keybindings, done) => {
			tui.stop();
			const [editor, ...editorArgs] = editorCommand.split(" ").filter(Boolean);
			const child = spawn(editor, [...editorArgs, temporaryFile], { stdio: "inherit" });
			let finished = false;
			const finish = (code: number | null) => {
				if (finished) return;
				finished = true;
				// done() restores the prompt text saved before ctx.ui.custom(), so set the
				// edited text after it and before the restarted TUI renders.
				done(code);
				if (code === 0) ctx.ui.setEditorText(fs.readFileSync(temporaryFile, "utf-8").replace(/\n$/, ""));
				tui.start();
				tui.requestRender(true);
			};
			child.on("error", () => finish(null));
			child.on("close", finish);
			return { render: () => [], invalidate: () => {} };
		});

		if (status !== 0) {
			ctx.ui.notify(`Editor exited with status ${status ?? "error"}; prompt unchanged.`, "warning");
		}
	} finally {
		fs.rmSync(temporaryDir, { recursive: true, force: true });
	}
}

export default function (pi: ExtensionAPI) {
	let editing = false;

	pi.registerShortcut("ctrl+g", {
		description: "Edit prompt in external editor (tmux side pane when inside tmux)",
		handler: async (ctx: ExtensionContext) => {
			if (ctx.mode !== "tui") return;
			if (editing) {
				ctx.ui.notify("The side-pane editor is already open.", "warning");
				return;
			}

			const editorCommand = externalEditorCommand(ctx);
			if (!editorCommand) {
				ctx.ui.notify(
					"No editor configured. Set externalEditor in settings.json or $VISUAL/$EDITOR.",
					"error",
				);
				return;
			}

			if (!process.env.TMUX) {
				await editInTerminal(ctx, editorCommand);
				return;
			}

			const temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-side-editor-"));
			const temporaryFile = path.join(temporaryDir, "prompt.pi.md");
			const statusFile = path.join(temporaryDir, "status");
			const waitChannel = `pi-side-editor-${randomUUID()}`;
			fs.writeFileSync(temporaryFile, ctx.ui.getEditorText(), "utf-8");
			editing = true;

			const targetPane = process.env.TMUX_PANE;
			let sidePane: string | undefined;

			try {
				const splitArgs = [
					"split-window",
					"-h",
					"-p",
					PANE_SIZE_PERCENT,
					"-c",
					ctx.cwd,
					"-P",
					"-F",
					"#{pane_id}",
				];
				if (targetPane) splitArgs.push("-t", targetPane);
				splitArgs.push(paneCommand(editorCommand, temporaryFile, statusFile, waitChannel));

				const split = await pi.exec("tmux", splitArgs);
				if (split.code !== 0) {
					throw new Error(split.stderr.trim() || "tmux could not create the side pane");
				}
				sidePane = split.stdout.trim();
				if (!/^%\d+$/.test(sidePane)) {
					throw new Error(`tmux returned an invalid side-pane id: ${sidePane || "(empty)"}`);
				}

				const waited = await pi.exec("tmux", ["wait-for", waitChannel]);
				if (waited.code !== 0) {
					throw new Error(waited.stderr.trim() || "tmux stopped waiting for the side pane");
				}

				const status = Number.parseInt(fs.readFileSync(statusFile, "utf-8"), 10);
				if (status !== 0) {
					ctx.ui.notify(`Editor exited with status ${status}; prompt unchanged.`, "warning");
					return;
				}

				const editedText = fs.readFileSync(temporaryFile, "utf-8").replace(/\n$/, "");
				ctx.ui.setEditorText(editedText);
			} catch (error) {
				ctx.ui.notify(
					`Could not open side-pane editor: ${error instanceof Error ? error.message : String(error)}`,
					"error",
				);
			} finally {
				// A dead pane persists when remain-on-exit is enabled. Remove it by the
				// id printed by split-window, then explicitly return focus to Pi.
				if (sidePane) await pi.exec("tmux", ["kill-pane", "-t", sidePane]);
				if (targetPane) await pi.exec("tmux", ["select-pane", "-t", targetPane]);
				editing = false;
				fs.rmSync(temporaryDir, { recursive: true, force: true });
			}
		},
	});
}
