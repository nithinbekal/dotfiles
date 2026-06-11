/**
 * Desktop Notification Extension (Ghostty + tmux aware)
 *
 * Sends a native macOS notification when the agent finishes and is waiting
 * for input. Clicking the notification jumps to the exact place pi is running:
 * it brings the terminal to the front and switches the attached tmux client to
 * the right session, window, and pane.
 *
 * Strategy (in order):
 *   1. terminal-notifier  — preferred. Its `-execute` click action can run a
 *      shell command, so we activate the terminal AND run tmux
 *      switch-client/select-window/select-pane. This is the ONLY path that can
 *      jump to the right tmux session, so it is tried first when installed.
 *      Install with: brew install terminal-notifier
 *   2. OSC escape sequence — fallback when terminal-notifier is missing.
 *      OSC 9 (iTerm2), OSC 99 (Kitty), OSC 777 (Ghostty/WezTerm). Clicking only
 *      focuses the surface; it cannot switch tmux windows/sessions.
 *   3. osascript — last resort (requires notification permission).
 *
 * Listens for the global events:
 *   - "notify:disable"  — suppress notifications for this session
 *     (agent-teams emits this for teammate panes).
 *   - "notify:send" {title, body} — let other extensions trigger a notification.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";

const OSC_TERMINALS = new Set(["iTerm.app", "iTerm2", "ghostty", "Ghostty", "WezTerm", "kitty"]);

// macOS bundle identifiers used to bring the right terminal to the front.
const BUNDLE_IDS: Record<string, string> = {
	ghostty: "com.mitchellh.ghostty",
	Ghostty: "com.mitchellh.ghostty",
	"iTerm.app": "com.googlecode.iterm2",
	iTerm2: "com.googlecode.iterm2",
	Apple_Terminal: "com.apple.Terminal",
	WezTerm: "com.github.wez.wezterm",
};

const escapeOsascript = (s: string): string => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

/** Shell-escape a string for safe interpolation into a /bin/sh command. */
const shellEscape = (s: string): string => `'${s.replace(/'/g, "'\\''")}'`;

const run = (cmd: string, args: string[]): string | null => {
	try {
		return execFileSync(cmd, args, { timeout: 1000, encoding: "utf-8" }).trim() || null;
	} catch {
		return null;
	}
};

/** Detect outer terminal — inside tmux, TERM_PROGRAM is "tmux". */
let outerTermCache: string | undefined;
const getOuterTerminal = (): string => {
	if (outerTermCache !== undefined) return outerTermCache;
	let term = process.env.TERM_PROGRAM ?? "";
	if (term === "tmux" && process.env.TMUX) {
		const out = run("tmux", ["show-environment", "-g", "TERM_PROGRAM"]);
		if (out && out.includes("=")) term = out.split("=")[1];
	}
	// Kitty doesn't set TERM_PROGRAM; detect via its own env vars or TERM.
	if (!term && (process.env.KITTY_PID || process.env.TERM === "xterm-kitty")) {
		term = "kitty";
	}
	outerTermCache = term;
	return term;
};

/** Resolve full path to tmux binary (needed in the detached -execute context). */
let tmuxBinCache: string | undefined;
const findTmuxBin = (): string => {
	if (tmuxBinCache === undefined) tmuxBinCache = run("which", ["tmux"]) ?? "tmux";
	return tmuxBinCache;
};

/** True when you're currently looking at the pi pane, so a notification would
 *  just be noise. "Watching" means: Ghostty is the frontmost macOS app AND
 *  pi's tmux pane is the active pane of the active window AND some attached
 *  client is currently viewing pi's session.
 *
 *  Fails open (returns false → notify) when anything can't be determined, so
 *  you never silently miss a finished task. */
const isWatchingPi = (): boolean => {
	const frontAsn = run("lsappinfo", ["front"]);
	if (!frontAsn) return false;
	const frontName = run("lsappinfo", ["info", "-only", "name", frontAsn]) ?? "";
	if (!/ghostty/i.test(frontName)) return false;

	if (process.env.TMUX) {
		const sock = process.env.TMUX.split(",")[0];
		const pane = process.env.TMUX_PANE ?? "";
		if (!sock || !pane) return false;
		// Active pane AND active window within pi's own session.
		if (run("tmux", ["-S", sock, "display-message", "-pt", pane, "#{pane_active}#{window_active}"]) !== "11") {
			return false;
		}
		// Some attached client must actually be viewing pi's session right now.
		const paneSession = run("tmux", ["-S", sock, "display-message", "-pt", pane, "#{session_name}"]);
		const viewing = (run("tmux", ["-S", sock, "list-clients", "-F", "#{client_session}"]) ?? "").split("\n");
		if (!paneSession || !viewing.includes(paneSession)) return false;
	}
	return true;
};

let hasTerminalNotifierCache: boolean | undefined;
const hasTerminalNotifier = (): boolean => {
	if (hasTerminalNotifierCache === undefined) {
		hasTerminalNotifierCache = run("which", ["terminal-notifier"]) !== null;
	}
	return hasTerminalNotifierCache;
};

interface TmuxContext {
	socket: string;
	paneId: string;
	sessionName: string | null;
	clientTty: string | null;
}

/** Capture the tmux target for click-to-activate.
 *  Prefers TMUX_PANE (set per-process at shell creation, stable across pane
 *  switches) over display-message, which reports the *active* pane and can
 *  drift if the user navigates away before the debounced notification fires. */
const getTmuxContext = (): TmuxContext | null => {
	if (!process.env.TMUX) return null;
	// TMUX env is "socket_path,pid,session_id" — extract the socket path.
	const socket = process.env.TMUX.split(",")[0];
	if (!socket) return null;
	let paneId = process.env.TMUX_PANE ?? "";
	if (!paneId) paneId = run("tmux", ["display-message", "-p", "#{pane_id}"]) ?? "";
	if (!paneId) return null;
	const sessionName = run("tmux", ["-S", socket, "display-message", "-pt", paneId, "#{session_name}"]);
	const clientTty = run("tmux", ["-S", socket, "display-message", "-pt", paneId, "#{client_tty}"]);
	return { socket, paneId, sessionName, clientTty };
};

/** Build the shell command that runs when the notification is clicked.
 *  Brings the terminal forward, then re-points tmux at the right session,
 *  window, and pane. Returns null when there's nothing useful to do. */
const buildClickCommand = (term: string): string | null => {
	const parts: string[] = [];
	const tty = process.env.TMUX
		? run("tmux", ["display-message", "-p", "#{client_tty}"])
		: run("tty", []);

	// 1. Bring the right terminal/tab to the front.
	if (term === "Apple_Terminal" && tty) {
		// Terminal.app exposes per-tab ttys via AppleScript — select the exact tab.
		const script = [
			'tell application "Terminal" to activate',
			'tell application "Terminal"',
			`  set targetTTY to "${tty}"`,
			"  repeat with w in windows",
			"    repeat with t in tabs of w",
			"      if tty of t is targetTTY then",
			"        set selected tab of w to t",
			"        set index of w to 1",
			"        return",
			"      end if",
			"    end repeat",
			"  end repeat",
			"end tell",
		].join("\n");
		parts.push(`osascript -e ${shellEscape(script)}`);
	} else {
		const bundleId = BUNDLE_IDS[term];
		// Ghostty/iTerm/WezTerm can't select a specific window by tty, so we just
		// bring the app to the front; the tmux step below fixes the position.
		if (bundleId) parts.push(`open -b ${shellEscape(bundleId)}`);
	}

	// 2. Re-point tmux at the right session/window/pane.
	const tmux = getTmuxContext();
	if (tmux) {
		const bin = shellEscape(findTmuxBin());
		const sock = shellEscape(tmux.socket);
		const pane = shellEscape(tmux.paneId);
		if (tmux.sessionName) {
			const target = shellEscape(tmux.sessionName);
			const clientArg = tmux.clientTty ? ` -c ${shellEscape(tmux.clientTty)}` : "";
			parts.push(`${bin} -S ${sock} switch-client${clientArg} -t ${target}`);
		}
		parts.push(`${bin} -S ${sock} select-window -t ${pane}`);
		parts.push(`${bin} -S ${sock} select-pane -t ${pane}`);
	}

	return parts.length ? parts.join(" ; ") : null;
};

const notifyTerminalNotifier = (title: string, body: string): boolean => {
	if (!hasTerminalNotifier()) return false;
	try {
		const args = ["-title", title, "-message", body, "-sound", "default"];
		const click = buildClickCommand(getOuterTerminal());
		if (click) {
			args.push("-execute", click);
		} else {
			const bundleId = BUNDLE_IDS[getOuterTerminal()];
			if (bundleId) args.push("-activate", bundleId);
		}
		execFileSync("terminal-notifier", args, { timeout: 3000, stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
};

const notifyOSC = (title: string, body: string, term: string): boolean => {
	let payload: string;
	if (term.startsWith("iTerm")) {
		// OSC 9 — iTerm2
		payload = `\x1b]9;${title}: ${body}\x07`;
	} else if (term === "kitty") {
		// OSC 99 — Kitty: key=value metadata, base64 body to survive special chars.
		const encoded = Buffer.from(`${title}: ${body}`).toString("base64");
		payload = `\x1b]99;i=1:d=0:p=body;${encoded}\x1b\\`;
	} else {
		// OSC 777 — Ghostty, WezTerm, and others.
		payload = `\x1b]777;notify;${title};${body}\x07`;
	}
	try {
		const fd = fs.openSync("/dev/tty", "w");
		fs.writeSync(fd, payload);
		fs.closeSync(fd);
		return true;
	} catch {
		return false;
	}
};

const notifyOsascript = (title: string, body: string): boolean => {
	try {
		const t = escapeOsascript(title);
		const b = escapeOsascript(body);
		execFileSync("osascript", ["-e", `display notification "${b}" with title "${t}"`], {
			timeout: 3000, stdio: "ignore",
		});
		return true;
	} catch {
		return false;
	}
};

/**
 * In RPC mode (pi-desktop, pide, etc.), emit the notification as a JSON line so
 * the host can show it natively. Gated on PI_MODE=rpc to avoid injecting JSON
 * into piped shells, CI runners, and --mode json consumers.
 */
const notifyRpcHost = (title: string, body: string): boolean => {
	if (process.env.PI_MODE !== "rpc") return false;
	try {
		process.stdout.write(JSON.stringify({ type: "desktop_notification", title, body }) + "\n");
		return true;
	} catch {
		return false;
	}
};

const notify = (title: string, body: string): void => {
	if (notifyRpcHost(title, body)) return;
	const term = getOuterTerminal();
	// terminal-notifier first: it's the only path whose click can switch tmux.
	if (notifyTerminalNotifier(title, body)) return;
	if (OSC_TERMINALS.has(term) && notifyOSC(title, body, term)) return;
	notifyOsascript(title, body);
};

const isTextPart = (p: unknown): p is { type: "text"; text: string } =>
	Boolean(p && typeof p === "object" && "type" in p && (p as any).type === "text" && "text" in p);

const extractLastText = (msgs: Array<{ role?: string; content?: unknown }>): string | null => {
	for (let i = msgs.length - 1; i >= 0; i--) {
		const m = msgs[i];
		if (m?.role !== "assistant") continue;
		if (typeof m.content === "string") return m.content.trim() || null;
		if (Array.isArray(m.content)) {
			return m.content.filter(isTextPart).map((p) => p.text).join("\n").trim() || null;
		}
		return null;
	}
	return null;
};

const summarize = (text: string | null): string => {
	if (!text) return "Ready for input";
	const plain = text.replace(/[#*_`~\[\]()>|-]/g, "").replace(/\s+/g, " ").trim();
	return plain.length > 200 ? `${plain.slice(0, 199)}…` : plain;
};

export default function (pi: ExtensionAPI) {
	let enabled = true;
	pi.events.on("notify:disable", () => { enabled = false; });

	pi.events.on("notify:send", (payload: unknown) => {
		const p = payload as { title: string; body: string };
		if (enabled && p && p.title && p.body) notify(p.title, p.body);
	});

	const getTitle = (): string => {
		const name = pi.getSessionName();
		return name ? `π: ${name}` : "π";
	};

	// Debounce: only notify once the agent has truly settled (no new agent_start
	// within DEBOUNCE_MS). Suppresses rapid-fire notifications from multi-step
	// tool chains and team_message processing.
	const DEBOUNCE_MS = 5_000;
	let pendingTimer: ReturnType<typeof setTimeout> | null = null;

	pi.on("agent_start", () => {
		if (pendingTimer) {
			clearTimeout(pendingTimer);
			pendingTimer = null;
		}
	});

	pi.on("agent_end", async (event) => {
		if (pendingTimer) clearTimeout(pendingTimer);
		const title = getTitle();
		const body = summarize(extractLastText(event.messages ?? []));
		pendingTimer = setTimeout(() => {
			pendingTimer = null;
			// Skip if you're already looking at the pi pane — only ping when you've
			// switched to another app, tmux window, or session.
			if (enabled && !isWatchingPi()) notify(title, body);
		}, DEBOUNCE_MS);
	});

	pi.registerCommand("notify", {
		description: "Send a test desktop notification",
		handler: async (_args, ctx) => {
			const term = getOuterTerminal();
			const via = hasTerminalNotifier() ? "terminal-notifier" : OSC_TERMINALS.has(term) ? "OSC" : "osascript";
			ctx.ui.notify(`Testing via ${via} (term: ${term || "unknown"})`, "info");
			notify("π test", "Click me — should jump to this tmux pane!");
		},
	});
}
