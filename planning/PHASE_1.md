# Phase 1 — Extract `papyrus-server` (headless core) (~4–7 days)

The center of gravity: make the Electron main process's brain run as a plain
Node daemon on Windows + macOS. Decisions in play: D2 (extract, don't
rewrite), D4 (tRPC HTTP+WS), D5 (Node LTS), D6 (named pipe), D7 (token auth),
D10 (SecretStore) — see [PLAN_MAIN.md](PLAN_MAIN.md) §4.

## 0. THE SPIKE — node-pty + ConPTY on Windows (go/no-go gate, run first)

Highest-information experiment in the whole plan. A bare Node script (no
Electron, no repo code) on the Windows laptop that:

1. Spawns `claude` (and `pwsh`/`cmd` as controls) via node-pty under ConPTY.
2. Verifies: ANSI/VT output renders (colors, cursor movement, alt-screen),
   `resize()` reflows, Ctrl-C interrupts the CLI without killing the daemon,
   exit codes propagate, UTF-8 survives.
3. Verifies the daemon topology: parent process exits, PTY subprocess keeps
   running (matches `terminal-host/pty-subprocess.ts` design), reattach gets
   scrollback.

If `claude` won't run interactively under ConPTY, the fallback ladder is:
try Windows Terminal's ConPTY feature flags → try WSL2-hosted server (the
server runs in WSL, browsers connect the same way) → reassess. **Do not start
extraction until this passes.**

## 1. Scaffold `apps/server`

- Entry: `papyrus serve --port 7777 --bind 127.0.0.1` (bind default is
  localhost — D7; Tailscale handles remote in Phase 3 without changing this).
- Node LTS runtime (D5): node-pty + better-sqlite3 native prebuilds are
  proven on Node/Windows; Bun stays as package manager/tooling only.
- Config file `~/.papyrus/server.json` (port, bind, data dir override);
  flags win over file.

## 2. Extract `packages/server-core` from `apps/desktop/src/main/lib/`

Move, don't rewrite. Inventory of `src/main/lib/` by destination:

**→ server-core (Electron-free already, or nearly):**
`agent-config/`, `agent-home.ts`, `agent-init.ts`, `agent-memory-backfill.ts`,
`agent-repo.ts`, `agent-scaffold.ts` (+ test), `agent-setup/`,
`agent-worktree.ts`, `app-environment.ts`, `local-db/`, `terminal/`,
`terminal-host/` (daemon + client), `terminal-history.ts`,
`terminal-escape-filter.ts` (+ test), `workspace-runtime/`, `static-ports/`,
`resource-metrics/`, `sync/`, `scheduler/`, `sanitize/`, `tree-kill.ts`,
`data-batcher.ts`, `workspace-init-manager.ts`, `project-icons.ts`,
`feature-flags.ts`, `user-profile.ts`.

**→ server-core behind an interface:**
`provider-keys.ts` (+ test) — introduce `SecretStore`:
`{ encrypt(buf), decrypt(buf), isAvailable() }`. Electron impl wraps
`safeStorage`; server impl uses an AES key in `~/.papyrus/secret.key`
(0600 / owner-ACL on Windows) per D10.

**stays in Electron main (shell):**
`menu.ts`, `menu-events.ts`, `tray/`, `dock-icon.ts`, `notifications/`,
`notification-sound.ts`, `custom-ringtones.ts`, `sound-paths.ts`,
`hotkeys-events.ts`, `auto-updater.ts`, `apple-events-permission.ts`,
`local-network-permission.ts`, `window-state/`, `browser/`, `extensions/`,
`device-info.ts`, `analytics/`, `app-state/`, `test-server/` (audit
case-by-case; default shell).

Hidden-Electron-import discipline: the Phase-1 exit test is *headless boot*,
which flushes out every offender; each one gets the `SecretStore` treatment
(small interface, two impls) rather than a conditional import.

## 3. Split the router tree (`apps/desktop/src/lib/trpc/routers/`)

| Router | Side | Notes |
|---|---|---|
| `workspaces` (agents), `projects` (teams), `terminal`, `filesystem`, `changes`, `config`, `settings`, `ports`, `sync`, `cache`, `utils`, `resource-metrics`, `browser-history` | **core** | served over HTTP/WS |
| `ui-state` | **core** | server-persisted so UI state follows the user across devices; revisit if per-device state is wanted |
| `auth` | **core (reworked)** | becomes token verification (D7), not Superset auth |
| `window`, `menu`, `hotkeys`, `auto-update`, `permissions`, `ringtone`, `external`, `browser` | **shell** | Electron-only; web client stubs or hides |
| `notifications` | **shell now** | web impl via Notification API in Phase 4 |

Mechanically: `routers/index.ts` becomes two exported routers (`coreRouter`,
`shellRouter`) merged for Electron, core-only for the server. Context type
gains `{ runtimeRegistry, secretStore, authedDeviceId }`.

## 4. Serve it

- tRPC v11 standalone/Express adapter for HTTP + `ws` server for
  subscriptions; `superjson` transformer; **keep observables** (same
  semantics trpc-electron required, so router code doesn't change).
- Token auth middleware on every HTTP request and WS upgrade: token minted to
  `~/.papyrus/token` (0600) on first run, printed once to console. Constant-
  time compare. This is D7 — single-user, simplest safe thing.

## 5. Windows-proof the core

- **terminal-host IPC**: unix socket `~/.superset/terminal-host.sock` →
  platform switch: named pipe `\\.\pipe\papyrus-terminal-host-<username>` on
  win32 (D6). `node:net` has the same API for pipes; **guard the
  `chmodSync`** at `terminal-host/index.ts:61` (pipes don't chmod; pipe ACLs
  are per-user by default). Socket dir moves `~/.superset` → `~/.papyrus`.
- better-sqlite3 / libsql prebuilds load on Windows Node LTS (smoke it).
- Git worktree flows with Windows paths (`agent-worktree.ts`) — watch for
  hardcoded `/` joins and long-path issues (`core.longpaths`).
- `tree-kill.ts` / signal semantics: Windows has no POSIX signals; verify the
  kill/cleanup paths use taskkill-style fallbacks.

## 6. Keep the desktop app green

Wire Electron main to consume `packages/server-core` **in-process** (same
functions, ipcLink transport unchanged). Desktop builds and runs throughout
the extraction — D11, no big-bang.

## 7. Headless smoke test (exit gate)

Script (curl + a small WS client) against `papyrus serve` on **both** Windows
and macOS: mint token → create project/team → create agent (repo scaffold on
disk) → spawn terminal session → write `echo hi` → assert bytes stream back
→ detach → reattach → scrollback replays → kill session → cleanup.

## Checklist

- [ ] **SPIKE:** node-pty + ConPTY runs `claude` on Windows (resize, Ctrl-C, ANSI, exit codes, detached daemon) — go/no-go
- [ ] Scaffold `apps/server` with `papyrus serve --port 7777 --bind 127.0.0.1`
- [ ] Extract `packages/server-core` per inventory above; desktop consumes it in-process
- [ ] `SecretStore` interface + safeStorage (Electron) and file-key (server) impls
- [ ] Router split: `coreRouter` / `shellRouter`; context carries registry + secretStore
- [ ] HTTP + WS tRPC adapter, superjson, observables preserved
- [ ] Bearer-token middleware; token minted to `~/.papyrus/token` on first run
- [ ] Windows: named pipe for terminal-host, chmod guard, `~/.superset` → `~/.papyrus`
- [ ] Windows: better-sqlite3 prebuilds, git worktrees, tree-kill semantics verified
- [ ] Headless smoke test passes on Windows and macOS
- [ ] Open questions from PLAN_MAIN §6 resolved: data-dir migration (done Phase 0), OpenRouter model bar env-injection works from a Windows server

**Exit:** `papyrus serve` runs headless on Windows and macOS; the smoke
script can create an agent, spawn a session, and stream terminal bytes.
