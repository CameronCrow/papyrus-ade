# Papyrus TODO

Working checklist for the OS-agnostic build-out. Source of truth for scope: [PLAN_MAIN.md](PLAN_MAIN.md); per-phase detail in [PHASE_0](PHASE_0.md)–[PHASE_5](PHASE_5.md).

## Phase 0 — Fork groundwork & rebrand ([PHASE_0.md](PHASE_0.md))
- [x] Append Papyrus modification block to NOTICE (keep Superset → ADE chain, LICENSE.md, THIRD-PARTY-NOTICES.md untouched)
- [x] Rename user-facing strings ADE → Papyrus; decided `~/.papyrus` with one-time migration from `~/.ade` (app-environment.ts)
- [x] Quarantine `apps/{web,api,mobile,admin,marketing,streams}` from the workspace graph (explicit workspaces list; cloud dev/db scripts removed; fly.toml dropped). Note: packages/{db,auth,chat,chat-mastra} stay — desktop imports them directly; re-audit in Phase 1.
- [x] Rewrite README for Papyrus + target architecture

## Phase 1 — papyrus-server (headless core) ([PHASE_1.md](PHASE_1.md))
- [x] **SPIKE PASSED (2026-07-10):** node-pty (prebuilt) + ConPTY on Windows ran cmd.exe (ANSI/resize/exit codes), `claude -p` (exit 0), and interactive claude TUI (repaint on resize, clean Ctrl-C) — GO
- [x] Scaffold `apps/server` (`papyrus serve --port 7777 --bind 127.0.0.1`; config file `~/.papyrus/server.json`; smoke-tested headless on Windows incl. WS subscription + auth rejection)
- [ ] Extract main-process business logic → `packages/server-core` (agent-*, terminal, terminal-host, workspace-runtime, local-db)
  - [x] Package created with the strangler pattern: modules move to `packages/server-core/src`, desktop keeps `export *` shims at the old paths (zero import churn; main build bundles workspace TS deps already)
  - [x] Leaf modules moved: `constants`, `env.shared`, `app-environment`, `terminal-escape-filter` (+tests), `terminal-history`, `tree-kill`, `data-batcher`
  - [x] Env-builder cluster moved: `agent-home`, `agent-setup/{paths,shell-wrappers}`, `terminal/env` (+102 tests; two Windows-portability test fixes). Exports map simplified to `./*` wildcard.
  - [ ] Terminal cluster: `terminal-host/` (daemon+client), `terminal/`, `workspace-runtime/`
  - [ ] Agent cluster: `agent-*` modules, `local-db`, `static-ports`, `resource-metrics`, `sync`, `scheduler`, `sanitize`
- [ ] `SecretStore` interface: safeStorage impl (Electron) + file-key impl (server)
- [ ] Split routers: core (workspaces, projects, terminal, filesystem, changes, config, settings, ports, sync, cache, utils, resource-metrics, browser-history) vs shell (window, menu, hotkeys, auto-update, permissions, ringtone, notifications, external, browser)
- [ ] Serve core routers over HTTP + WS (tRPC v11, superjson, observables) — transport layer DONE (health router proves HTTP query + WS observable subscription); core routers land with the server-core extraction
- [x] Bearer-token auth middleware; token minted to `~/.papyrus/token` on first run (constant-time compare; WS verified at upgrade)
- [ ] Windows: named pipe for terminal-host, guard chmod, verify better-sqlite3 + git worktrees
- [ ] Desktop app consumes server-core in-process (stays green)
- [ ] Headless smoke test: create agent → spawn session → stream bytes (Win + mac)

## Phase 2 — apps/webui (browser client) ([PHASE_2.md](PHASE_2.md))
- [ ] Scaffold `apps/webui` (Vite SPA) seeded from desktop renderer
- [ ] Swap ipcLink → httpBatchLink + wsLink (+ sessionIdLink)
- [ ] `shell` capability interface: web impls for preload/Electron-only surface
- [ ] Terminal over WS subscription; renderer fallback webgl → canvas/dom
- [ ] Token login screen
- [ ] Reconnect + scrollback replay on WS drop
- [ ] papyrus-server serves the built SPA (same origin)
- [ ] **M1: full workflow at localhost:7777 in Chrome on Windows**

## Phase 3 — Remote access + iPhone ([PHASE_3.md](PHASE_3.md))
- [ ] Tailscale Serve path tested + documented (blessed path)
- [ ] LAN + Caddy alternative documented (adapt Caddyfile.example)
- [ ] PWA manifest + service worker + apple-touch-icons
- [ ] iOS keyboard: xterm focus shim + on-screen key bar (Esc/Tab/Ctrl/arrows)
- [ ] Resubscribe on visibilitychange
- [ ] Responsive layout: rail → drawer, tabs → swipe strip, Agent Files → sheet
- [ ] **M2: drive an agent from the iPhone over Tailscale, survives lock/unlock**

## Phase 4 — Parity & hardening ([PHASE_4.md](PHASE_4.md))
- [ ] Provider-keys encrypted at rest + web OpenRouter key flow
- [ ] Web Notification API for attention events
- [ ] Verify Monaco/markdown/diff viewers on web
- [ ] Multi-device attach policy (mirror-readonly v1)
- [ ] Resource metrics + kill/cleanup on web
- [ ] Security pass: token rotation, login rate-limit, socket reachability audit, CSP
- [ ] CI on Windows + macOS runners

## Phase 5 — Optional ([PHASE_5.md](PHASE_5.md))
- [ ] Electron as thin shell over server + webui
- [ ] Capacitor iOS wrapper (only if PWA limits bite)
- [ ] Multi-server support via WorkspaceRuntimeRegistry

## Open decisions
- [x] `~/.ade` → `~/.papyrus` migration: YES — one-time renameSync on first boot (Phase 0)
- [ ] Multi-attach: mirror vs takeover
- [ ] Verify OpenRouter model bar works from a Windows-hosted server
