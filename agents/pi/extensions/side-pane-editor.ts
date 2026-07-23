/**
 * Side-pane external editor (Ctrl+G)
 *
 * Pi's built-in external-editor shortcut is remapped to Ctrl+Shift+G in the
 * user keybindings so this extension can own Ctrl+G. It follows the same edit
 * contract as Pi's built-in flow, but runs the editor in a tmux pane on the
 * right instead of suspending Pi's TUI:
 *
 *   1. Write the current prompt to a temporary Markdown file.
 *   2. Split the current tmux pane and run the configured external editor there.
 *   3. Wait for the editor to exit.
 *   4. On exit status 0, replace Pi's prompt with the edited file contents.
 *
 * The editor command uses the same precedence as Pi: settings.json
 * `externalEditor`, $VISUAL, $EDITOR, then the platform default.
 */

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
	// Match Pi's argv handling for configured commands such as "code --wait".
	// Quoting each token keeps paths safe and ensures a malformed editor setting
	// cannot prevent the EXIT trap from waking the waiting Pi process.
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

export default function (pi: ExtensionAPI) {
	let editing = false;

	pi.registerShortcut("ctrl+g", {
		description: "Edit prompt in external editor in a tmux side pane",
		handler: async (ctx: ExtensionContext) => {
			if (ctx.mode !== "tui") return;
			if (editing) {
				ctx.ui.notify("The side-pane editor is already open.", "warning");
				return;
			}
			if (!process.env.TMUX) {
				ctx.ui.notify("The side-pane editor requires tmux.", "error");
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

			const temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-side-editor-"));
			const temporaryFile = path.join(temporaryDir, "prompt.pi.md");
			const statusFile = path.join(temporaryDir, "status");
			const waitChannel = `pi-side-editor-${randomUUID()}`;
			fs.writeFileSync(temporaryFile, ctx.ui.getEditorText(), "utf-8");
			editing = true;

			try {
				const targetPane = process.env.TMUX_PANE;
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
				editing = false;
				fs.rmSync(temporaryDir, { recursive: true, force: true });
			}
		},
	});
}
