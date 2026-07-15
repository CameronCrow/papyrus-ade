# Papyrus

A self-hosted, OS-agnostic agentic development environment. Papyrus is a local-first, single-user system where you build a roster of persistent coding agents and work alongside them in the terminal. Every agent is a durable identity — its own name, photo, git repository, runtime CLI, and long-lived memory — not a throwaway chat session. You come back to the same agent tomorrow and it remembers what it learned today.

Papyrus is a fork of [per-simmons' ADE](https://github.com/per-simmons/damon-ade) (macOS-only Electron app), restructured around one move: **one server, any screen**. A headless `papyrus-server` daemon runs where your repos and coding CLIs live; every device — Windows laptop, Mac, iPhone — is just a browser pointed at it.

```
┌───────────────── your devices ─────────────────┐
│  Windows laptop      Mac           iPhone      │
│    Chrome/Edge      Safari       Safari (PWA)  │
└─────────┬──────────────┬──────────────┬────────┘
          │   HTTPS + WSS · tRPC · token auth
          ▼
  papyrus-server  (Node daemon on one machine)
  ├─ agents, teams, sessions, files, settings
  ├─ agent core: repos/worktrees, persistent memory
  └─ terminal-host daemon (node-pty)
       └─ claude / codex / opencode CLIs
```

**Status: pre-implementation.** The Electron desktop app (inherited from ADE, macOS-only) still builds and works; the client–server restructuring is planned in [`planning/`](planning/PLAN_MAIN.md) and being implemented phase by phase.

## The product

The interface is a two-level left rail. **Teams** group your work; inside each team live **Agents**. Selecting an agent opens its workspace: a strip of **session** tabs, each a real terminal running the agent's coding CLI inside that agent's own git worktree. A **model bar** under the tabs lets you spawn a session on a different model without leaving the agent. On the right, the **Agent Files** panel shows the agent's memory growing as it works.

Papyrus runs whatever CLI coding agents you already have installed. Claude Code, OpenAI's Codex, and OpenCode are first-class runtimes. The model bar can also launch sessions on Kimi K2.7, MiniMax M3, and GLM 5.2 through a single OpenRouter key you enter once, in-app. Nothing here is a hosted service — your code, your keys, and your agents' memory all stay on your machine.

Terminal sessions live in a detached daemon, not in the app: they survive app restarts, browser disconnects, and (by design) a phone that locks its screen mid-session.

## Prerequisites

Papyrus orchestrates coding CLIs; it does not bundle them. On the machine that runs the server you need:

- **Git** — required. Each agent gets its own repository or worktree.
- **At least one agent CLI.** Claude Code is recommended, because it also powers the Kimi, MiniMax, and GLM sessions from the model bar:

  ```bash
  npm i -g @anthropic-ai/claude-code
  npm i -g @openai/codex        # optional: OpenAI Codex sessions
  npm i -g opencode-ai          # optional: OpenCode runtime
  ```

- **Node.js LTS** — runs `papyrus-server` (and installs the CLIs above).
- **An OpenRouter API key** — only for the open-model sessions; entered once, in-app, encrypted at rest.

## Build from source

Requires [Bun](https://bun.sh) 1.0+ (as package manager/tooling).

```bash
git clone https://github.com/CameronCrow/papyrus-ade.git
cd papyrus-ade
bun install

# Desktop app (current form factor, macOS):
cd apps/desktop
bun run compile:app        # builds main + preload + renderer into dist/
bunx electron .            # launches the built app
```

The headless server (`apps/server`) and browser UI (`apps/webui`) land in Phases 1–2 of the [plan](planning/PLAN_MAIN.md).

## No-admin install (Windows)

Everything Papyrus itself needs installs per-user — no elevation. The catch is picking the right installer at each step; the machine-wide variants all want admin.

1. **Git** — use the per-user installer (or portable zip), then:

   ```powershell
   git config --global core.longpaths true
   ```

   The longpaths flag is required: agent checkouts live under `~/.papyrus/agents/<uuid>/worktree/`, and that prefix pushes deep repos past Windows' 260-char path limit. This git setting is enough — the system-wide registry toggle is not needed.

2. **Node.js 24 (LTS)** — install via [fnm](https://github.com/Schniz/fnm) or extract the plain Node zip into a user directory. Avoid the Node MSI and nvm-windows: both need admin (nvm-windows symlinks into `C:\Program Files`).

3. **Bun** — the official installer is user-level (`~/.bun`):

   ```powershell
   irm bun.sh/install.ps1 | iex
   ```

4. **Dependencies** — from the repo root:

   ```powershell
   bun install --ignore-scripts
   ```

   Then install better-sqlite3's prebuilt binding manually (bun's `--ignore-scripts` skips it):

   ```powershell
   cd (ls node_modules\.bun\better-sqlite3@*\node_modules\better-sqlite3).FullName
   npx prebuild-install
   ```

   node-pty ships its prebuilds inside the package — no step needed. Everything lands in the project; nothing touches system paths. (This holds because Windows prebuilds exist for both native modules on Node 24 — if one were ever missing, compiling from source would need VS Build Tools, which does want admin.)

5. **Build and run** — the server and daemon must run under Node, not bun:

   ```powershell
   cd apps\webui;  bun run build          # ~2 min
   cd ..\server;   bun run scripts\build.ts
   node dist\server.cjs serve --port 7777
   ```

   Open `http://localhost:7777` and enter the token from `~\.papyrus\token`. Binding to loopback on an unprivileged port means no firewall prompt and no elevation; ConPTY is built into Windows 10 1809+. The `claude` CLI installs per-user too (`npm i -g` under your user-writable Node).

**What still needs admin (both outside Papyrus):** installing Tailscale for remote access (network driver), and approving the Windows Firewall prompt if you bind the server to a LAN address instead of loopback. Localhost-only Papyrus runs fully unelevated.

## How memory works

Every Papyrus agent keeps a persistent, self-curated memory, adapted from the [Hermes agent](https://github.com/NousResearch/hermes-agent). The design is deliberately simple: plain markdown files the agent reads at the start of every session and writes back to as it learns. The files live outside the git worktree, so they survive branch and worktree churn and are never committed to your code.

- **AGENT.md** — a short identity and operating brief.
- **USER.md** — a profile of you: name, preferences, communication style, hard rules.
- **MEMORY.md** — the agent's own notes: conventions, tool quirks, lessons learned, plus an index into longer topic files.
- **Skills** — reusable, multi-step procedures the agent writes for itself, each a `SKILL.md` whose body loads only when relevant.

A write-back protocol travels with the memory (when to save, when to skip, consolidate over append), and a session-end reflection loop prompts the agent to update its memory before finishing. The same canonical files feed every runtime through thin, auto-generated bridge files, so you can switch an agent's runtime without losing its memory. See [docs/memory.md](docs/memory.md) for the full design.

## Remote access

The blessed path is [Tailscale](https://tailscale.com): `tailscale serve` in front of the server port gives TLS and tailnet-only access while the server stays bound to localhost. A LAN + Caddy alternative is documented in the plan. Never expose the server to the raw internet.

## License

Papyrus is a modified derivative of ADE, which is itself a modified derivative of [Superset](https://github.com/superset-sh/superset) (Copyright Superset, Inc.). It is distributed under the **Elastic License 2.0** — see [LICENSE.md](LICENSE.md), with the modification chain documented in [NOTICE](NOTICE). Third-party dependency notices are in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md). The agent memory architecture is adapted from [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) (MIT).

Under ELv2 you may use, modify, and self-host Papyrus freely (including distributing it for others to self-host). You may **not** offer Papyrus to third parties as a hosted or managed service.
