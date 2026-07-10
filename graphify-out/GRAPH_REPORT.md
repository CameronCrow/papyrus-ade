# Graph Report - .  (2026-07-09)

## Corpus Check
- 523 files · ~158,424 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3236 nodes · 6204 edges · 194 communities (156 shown, 38 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 41 edges (avg confidence: 0.66)
- Token cost: 0 input · 46,331 output

## Community Hubs (Navigation)
- UI Accordion & Breadcrumb
- Agent CLI Wrapper Setup
- AI Prompt Input Attachments
- MCP Server & Workspace Tools
- AI Artifact Display
- Alert & Model Selector UI
- UI Package Dependencies
- Hotkeys & Menu Accelerators
- Terminal Host Client
- AI Queue Display
- PTY Terminal Session Mgmt
- Web App Auth Pages
- Desktop-MCP Browser Actions
- Web Integration Connection Pages
- Headless Terminal Emulator
- Terminal Profiles & Themes
- Daemon Terminal Manager
- AI Message Display
- Custom Ringtones
- Chat-Mastra MCP Runtime Gate
- App State & Device ID
- AI Inline Citation Carousel
- Auto-Updater & App Env
- tRPC Client & Router
- Chat-Mastra Runtime Invocation
- tRPC Package Dependencies
- PostHog Analytics Queries
- Terminal Host RPC Types
- Terminal Host IPC Sockets
- Web Package Dependencies
- Chat-Mastra Package Config
- AI Context Display
- Mastra Chat Display Hook
- Open-In AI Chat Tool
- Terminal Host Client Protocol
- Workspace Init Manager
- Workspace Runtime Registry
- Desktop Shared Type Defs
- Agent Package Core (Mastra)
- AI Sources & Tool Display
- Deep Link & Dock Icon
- Desktop-MCP DOM Tools
- MCP Package Dependencies
- UI Form Field Component
- Terminal Data Batcher & Daemon
- Web tRPC Query Client
- AI Confirmation Dialog
- Terminal Port Manager
- Agent Package Dependencies
- Agent Init & Memory Backfill
- Tray Menu & Daemon Events
- Notification Server & Tabs State
- MCP Server Overview & Probing
- Desktop-MCP Package Deps
- Project & Workspace Icons
- Terminal History Manager
- PTY Subprocess Handling
- Desktop Shared Config Types
- Web Header & Avatar UI
- AI Plan Display
- Agent Home & Repo Scaffold
- Terminal Shell & Escape Filter
- UI Components Registry Config
- AI Chain-of-Thought Component
- Terminal Env & Shell Wrappers
- Notification Manager Tests
- Terminal History Files
- Web Auth Pages & UI Button
- Web Integrations Cards
- Web OAuth Consent & Select UI
- Agent Registry & Notifications
- Chat-Mastra Hono Server
- tRPC Integration Routers
- UI Context Menu Component
- Electron Browser Manager
- PTY Subprocess IPC Framing
- Chat-Mastra Service Client
- AI Bash/Search Tool Display
- AI Shimmer Loading UI
- UI Input & Input Group
- Agent Package README & Architecture
- Telemetry & Daemon Restore
- Terminal Daemon Connection Tests
- Terminal Session Lifecycle Tests
- Web Root Layout & Providers
- UI Carousel Component
- Window State Persistence
- Native Notification Manager
- Terminal Port Scanner
- Workspace Branch Naming
- Chat-Mastra File Search Index
- AI File Diff Tool
- UI Item Component
- Static Ports Config Loader
- Terminal Daemon Types & Errors
- Web Product Demo & Gradient
- Desktop-MCP Server & Transport
- tRPC Task Sync Integration
- Electron Extensions Loader
- UI Package Scripts Config
- AI Reasoning Display
- AI Task Display
- UI Chart Component
- UI Drawer Component
- Provider API Key Storage
- Terminal Session Events
- PTY Write Queue
- Web TypeScript Build Config
- UI Package TS Config
- Agent Wrappers Tests
- Sync Workspace Identity
- Workspace Terminal Ops Interface
- Desktop File Type Detection
- Chat-Mastra TS Config
- UI Package Export Map
- AI Code Block Component
- AI Conversation Display
- UI Pagination Component
- Resource Metrics Collection
- Agent Scheduler Watcher
- Terminal Daemon Client Mock
- Terminal Priority Semaphore
- Terminal Reconcile on Startup
- Web TS Config
- Desktop-MCP Console Capture
- Desktop-MCP TS Config
- MCP Package TS Config
- tRPC Upload & User Router
- UI Icons Dependencies
- UI Empty State Component
- Static & Detected Ports Types
- Terminal Port Scanner (cross-platform)
- Theme Color Utils
- UI Toggle Component
- Electron Preload IPC Bridge
- Web Package Scripts
- Web GitHub Error Handler
- Web Stripe Gradient Types
- Agent Package TS Config
- Desktop-MCP DOM Inspector
- Desktop-MCP Focus Lock
- Desktop-MCP Send Keys Tool
- tRPC Linear Priority Mapping
- tRPC TS Config
- UI Input OTP Component
- UI Avatar Atom Component
- AI Edge/Flow Component
- AI Web Fetch Tool
- UI Stripe Gradient Types
- Device Identity Hashing
- Static Ports Watcher
- Worktree ID Naming
- Web Package Metadata
- Web Desktop Auth Redirect
- Web Route Proxy/Middleware
- UI Popover (legacy)
- UI Popover Component
- Binary Name Sanitization
- Terminal Host Semaphore
- Desktop File Tree Types
- Desktop App ID Utils
- Web Slack Error Handler
- UI Preset Icon Lookup
- AI Text Selection Popover
- UI Hover Card Component
- Agent Scaffold Tests
- OpenCode Plugin Template
- macOS Apple Events Permission
- Terminal Port Scanner Tests
- Project Color Constants
- Branch Slug Generator
- AI Canvas Component
- Codex Wrapper Script Template
- Copilot Hook Script Template
- Cursor Hook Script Template
- Gemini Hook Script Template
- Notify Hook Script Template
- Window Bounds Tests
- Web Next.js Config
- UI SVG Type Declaration
- Web tRPC Hook Exports

## God Nodes (most connected - your core abstractions)
1. `cn()` - 461 edges
2. `DaemonTerminalManager` - 53 edges
3. `TerminalHostClient` - 48 edges
4. `Session` - 47 edges
5. `Button()` - 36 edges
6. `getMcpContext()` - 36 edges
7. `LocalTerminalRuntime` - 35 edges
8. `PortManager` - 31 edges
9. `HeadlessEmulator` - 26 edges
10. `setupAgentHooks()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `RootLayout()` --calls--> `cn()`  [EXTRACTED]
  apps/web/src/app/layout.tsx → packages/ui/src/lib/utils.ts
- `SidebarNav()` --calls--> `cn()`  [EXTRACTED]
  apps/web/src/app/(dashboard)/components/SidebarNav/SidebarNav.tsx → packages/ui/src/lib/utils.ts
- `ThemeState` --references--> `Theme`  [EXTRACTED]
  apps/desktop/src/main/lib/app-state/schemas.ts → apps/desktop/src/shared/themes/types.ts
- `MainWindow()` --indirect_call--> `playNotificationSound()`  [INFERRED]
  apps/desktop/src/main/windows/main.ts → apps/desktop/src/main/lib/notification-sound.ts
- `Artifact()` --calls--> `cn()`  [EXTRACTED]
  packages/ui/src/components/ai-elements/artifact.tsx → packages/ui/src/lib/utils.ts

## Import Cycles
- 3-file cycle: `packages/desktop-mcp/src/mcp/tools/index.ts -> packages/desktop-mcp/src/mcp/tools/take-screenshot/index.ts -> packages/desktop-mcp/src/mcp/tools/take-screenshot/take-screenshot.ts -> packages/desktop-mcp/src/mcp/tools/index.ts`
- 3-file cycle: `packages/desktop-mcp/src/mcp/tools/click/click.ts -> packages/desktop-mcp/src/mcp/tools/index.ts -> packages/desktop-mcp/src/mcp/tools/click/index.ts -> packages/desktop-mcp/src/mcp/tools/click/click.ts`
- 3-file cycle: `packages/desktop-mcp/src/mcp/tools/evaluate-js/evaluate-js.ts -> packages/desktop-mcp/src/mcp/tools/index.ts -> packages/desktop-mcp/src/mcp/tools/evaluate-js/index.ts -> packages/desktop-mcp/src/mcp/tools/evaluate-js/evaluate-js.ts`
- 3-file cycle: `packages/desktop-mcp/src/mcp/tools/get-console-logs/get-console-logs.ts -> packages/desktop-mcp/src/mcp/tools/index.ts -> packages/desktop-mcp/src/mcp/tools/get-console-logs/index.ts -> packages/desktop-mcp/src/mcp/tools/get-console-logs/get-console-logs.ts`
- 3-file cycle: `packages/desktop-mcp/src/mcp/tools/get-window-info/get-window-info.ts -> packages/desktop-mcp/src/mcp/tools/index.ts -> packages/desktop-mcp/src/mcp/tools/get-window-info/index.ts -> packages/desktop-mcp/src/mcp/tools/get-window-info/get-window-info.ts`
- 3-file cycle: `packages/desktop-mcp/src/mcp/tools/index.ts -> packages/desktop-mcp/src/mcp/tools/inspect-dom/index.ts -> packages/desktop-mcp/src/mcp/tools/inspect-dom/inspect-dom.ts -> packages/desktop-mcp/src/mcp/tools/index.ts`
- 3-file cycle: `packages/desktop-mcp/src/mcp/tools/index.ts -> packages/desktop-mcp/src/mcp/tools/navigate/index.ts -> packages/desktop-mcp/src/mcp/tools/navigate/navigate.ts -> packages/desktop-mcp/src/mcp/tools/index.ts`
- 3-file cycle: `packages/desktop-mcp/src/mcp/tools/index.ts -> packages/desktop-mcp/src/mcp/tools/send-keys/index.ts -> packages/desktop-mcp/src/mcp/tools/send-keys/send-keys.ts -> packages/desktop-mcp/src/mcp/tools/index.ts`
- 3-file cycle: `packages/desktop-mcp/src/mcp/tools/index.ts -> packages/desktop-mcp/src/mcp/tools/type-text/index.ts -> packages/desktop-mcp/src/mcp/tools/type-text/type-text.ts -> packages/desktop-mcp/src/mcp/tools/index.ts`

## Hyperedges (group relationships)
- **Agent Package Module Architecture** — agent_agent_executor, agent_sdk_to_ai_chunks, agent_session_store, agent_permission_manager, agent_types [EXTRACTED 1.00]
- **Environments Consuming @superset/agent** — packages_agent_readme_desktop_app, packages_agent_readme_sandbox_workers, packages_agent_readme_cloud_agents [EXTRACTED 1.00]
- **Design Principles of @superset/agent** — packages_agent_readme_environment_agnostic, packages_agent_readme_callback_based, packages_agent_readme_type_safe, packages_agent_readme_testable [EXTRACTED 1.00]

## Communities (194 total, 38 thin omitted)

### Community 0 - "UI Accordion & Breadcrumb"
Cohesion: 0.03
Nodes (88): AccordionContent(), AccordionItem(), AccordionTrigger(), BreadcrumbEllipsis(), BreadcrumbItem(), BreadcrumbLink(), BreadcrumbList(), BreadcrumbPage() (+80 more)

### Community 1 - "Agent CLI Wrapper Setup"
Cohesion: 0.06
Nodes (87): buildCodexWrapperExecLine(), cleanupGlobalOpenCodePlugin(), CODEX_WRAPPER_EXEC_TEMPLATE_PATH, createClaudeSettings(), createClaudeWrapper(), createCodexWrapper(), createOpenCodePlugin(), createOpenCodeWrapper() (+79 more)

### Community 2 - "AI Prompt Input Attachments"
Cohesion: 0.02
Nodes (84): AttachmentsContext, LocalAttachmentsContext, PromptInput(), PromptInputActionAddAttachments(), PromptInputActionAddAttachmentsProps, PromptInputActionMenuContent(), PromptInputActionMenuContentProps, PromptInputActionMenuItem() (+76 more)

### Community 3 - "MCP Server & Workspace Tools"
Cohesion: 0.06
Nodes (44): McpContext, createInMemoryMcpClient(), createMcpServer(), register(), workspaceInputSchema, register(), register(), register() (+36 more)

### Community 4 - "AI Artifact Display"
Cohesion: 0.04
Nodes (55): Artifact(), ArtifactAction(), ArtifactActionProps, ArtifactActions(), ArtifactActionsProps, ArtifactClose(), ArtifactCloseProps, ArtifactContent() (+47 more)

### Community 5 - "Alert & Model Selector UI"
Cohesion: 0.05
Nodes (40): alert, Alerter(), AlertOptions, InternalAlertOptions, ModelSelectorContent(), ModelSelectorContentProps, ModelSelectorDialogProps, ModelSelectorEmptyProps (+32 more)

### Community 6 - "UI Package Dependencies"
Cohesion: 0.04
Nodes (56): dependencies, ai, class-variance-authority, clsx, cmdk, date-fns, embla-carousel-react, @hookform/resolvers (+48 more)

### Community 7 - "Hotkeys & Menu Accelerators"
Cohesion: 0.09
Nodes (40): getMenuAccelerator(), buildHotkeysStateFromExport(), buildOverridesFromBindings(), canonicalizeHotkey(), canonicalizeHotkeyForPlatform(), createHotkeysExport(), defineHotkey(), deriveNonMacDefault() (+32 more)

### Community 9 - "AI Queue Display"
Cohesion: 0.05
Nodes (39): Queue(), QueueItem(), QueueItemAction(), QueueItemActionProps, QueueItemActions(), QueueItemActionsProps, QueueItemAttachment(), QueueItemAttachmentProps (+31 more)

### Community 10 - "PTY Terminal Session Mgmt"
Cohesion: 0.09
Nodes (3): treeKillAsync(), PtySubprocessIpcType, Session

### Community 11 - "Web App Auth Pages"
Cohesion: 0.09
Nodes (21): @trpc/server, AcceptInvitationButton(), AcceptInvitationButtonProps, AcceptInvitationPage(), PageProps, Footer(), navItems, SidebarNav() (+13 more)

### Community 12 - "Desktop-MCP Browser Actions"
Cohesion: 0.06
Nodes (37): ClickRequest, ClickRequestSchema, ClickResponse, ClickResponseSchema, ConsoleLogEntrySchema, ConsoleLogsRequest, ConsoleLogsRequestSchema, ConsoleLogsResponse (+29 more)

### Community 13 - "Web Integration Connection Pages"
Cohesion: 0.09
Nodes (24): ConnectionControls(), ConnectionControls(), ERROR_MESSAGES, ErrorHandler(), TeamSelector(), ConnectionControls(), Node(), NodeActionProps (+16 more)

### Community 14 - "Headless Terminal Emulator"
Cohesion: 0.08
Nodes (10): applySnapshot(), escapeRegex(), HeadlessEmulator, HeadlessEmulatorOptions, MODE_MAP, IMPORTANT: We only buffer sequences we actually track (DECSET/DECRST and OSC-7)., applySnapshotAsync(), DEFAULT_MODES (+2 more)

### Community 15 - "Terminal Profiles & Themes"
Cohesion: 0.12
Nodes (26): profileMap, TERMINAL_PROFILES, TerminalProfile, darkTheme, builtInThemes, getBuiltInTheme(), lightTheme, monokaiTheme (+18 more)

### Community 17 - "AI Message Display"
Cohesion: 0.07
Nodes (33): defaultMessageAnimation, Message(), MessageActionProps, MessageActions(), MessageActionsProps, MessageAttachment(), MessageAttachmentProps, MessageAttachments() (+25 more)

### Community 18 - "Custom Ringtones"
Cohesion: 0.11
Nodes (29): ALLOWED_AUDIO_EXTENSIONS, areSamePath(), CUSTOM_RINGTONE_METADATA_PATH, CustomRingtoneInfo, CustomRingtoneMetadata, ensureCustomRingtonesDir(), getCustomRingtoneFilename(), getCustomRingtoneInfo() (+21 more)

### Community 19 - "Chat-Mastra MCP Runtime Gate"
Cohesion: 0.12
Nodes (27): searchFiles(), ENABLED_VALUES, isMastraMcpEnabled(), getSupersetMcpTools(), authenticateRuntimeMcpServer(), buildOverview(), getRuntimeMcpOverview(), toRuntimeStatusMap() (+19 more)

### Community 20 - "App State & Device ID"
Cohesion: 0.12
Nodes (27): APP_STATE_PATH, ensureSupersetHomeDirExists(), SUPERSET_HOME_DIR, appState, AppStateDB, DEVICE_ID_PATH, ensureValidShape(), getDeviceId() (+19 more)

### Community 21 - "AI Inline Citation Carousel"
Cohesion: 0.07
Nodes (28): CarouselApiContext, InlineCitation(), InlineCitationCardBody(), InlineCitationCardBodyProps, InlineCitationCardProps, InlineCitationCardTrigger(), InlineCitationCardTriggerProps, InlineCitationCarousel() (+20 more)

### Community 22 - "Auto-Updater & App Env"
Cohesion: 0.14
Nodes (22): env, setSkipQuitConfirmation(), autoUpdateEmitter, AutoUpdateStatusEvent, checkForUpdates(), checkForUpdatesInteractive(), emitStatus(), installUpdate() (+14 more)

### Community 23 - "tRPC Client & Router"
Cohesion: 0.10
Nodes (13): @trpc/client, trpcClient, @trpc/client, AppRouter, createCaller, RouterInputs, RouterOutputs, apiKeyRouter (+5 more)

### Community 24 - "Chat-Mastra Runtime Invocation"
Cohesion: 0.14
Nodes (23): ApiClient, destroyRuntime(), extractProviderMessage(), generateAndSetTitle(), isHarnessAgentEndEvent(), isHarnessAgentStartEvent(), isHarnessErrorEvent(), isHarnessWorkspaceErrorEvent() (+15 more)

### Community 25 - "tRPC Package Dependencies"
Cohesion: 0.07
Nodes (29): default, dependencies, drizzle-orm, @linear/sdk, superjson, @superset/auth, @superset/db, @superset/shared (+21 more)

### Community 26 - "PostHog Analytics Queries"
Cohesion: 0.09
Nodes (24): executeFunnelQuery(), executeHogQLQuery(), executeQuery(), executeRetentionQuery(), FunnelResult, FunnelsQuery, FunnelStep, HogQLQuery (+16 more)

### Community 27 - "Terminal Host RPC Types"
Cohesion: 0.15
Nodes (11): ClearScrollbackRequest, CreateOrAttachRequest, CreateOrAttachResponse, EmptyResponse, KillAllRequest, KillRequest, ResizeRequest, SignalRequest (+3 more)

### Community 28 - "Terminal Host IPC Sockets"
Cohesion: 0.12
Nodes (24): IpcRequest, broadcastEventToAllStreamSockets(), clientsById, ClientSockets, ClientState, ensureAuthToken(), handleConnection(), handleRequest() (+16 more)

### Community 29 - "Web Package Dependencies"
Cohesion: 0.07
Nodes (29): dependencies, better-auth, framer-motion, geist, import-in-the-middle, jose, lucide-react, next (+21 more)

### Community 30 - "Chat-Mastra Package Config"
Cohesion: 0.07
Nodes (28): default, types, devDependencies, @superset/typescript, @types/bun, @types/node, @types/react, typescript (+20 more)

### Community 31 - "AI Context Display"
Cohesion: 0.09
Nodes (25): ContextCacheUsage(), ContextCacheUsageProps, ContextContent(), ContextContentBody(), ContextContentBodyProps, ContextContentFooter(), ContextContentFooterProps, ContextContentHeader() (+17 more)

### Community 32 - "Mastra Chat Display Hook"
Cohesion: 0.10
Nodes (22): DisplayStateOutput, findLastUserMessageIndex(), findLatestAssistantErrorMessage(), HistoryMessage, HistoryMessagePart, ListMessagesOutput, MastraChatDisplayState, MastraChatHistoryMessages (+14 more)

### Community 33 - "Open-In AI Chat Tool"
Cohesion: 0.09
Nodes (22): OpenInChatGPT(), OpenInChatGPTProps, OpenInClaude(), OpenInClaudeProps, OpenInContent(), OpenInContentProps, OpenInContext, OpenInCursor() (+14 more)

### Community 34 - "Terminal Host Client Protocol"
Cohesion: 0.10
Nodes (21): ConnectionState, NdjsonParser, PendingRequest, PID_PATH, SCRIPT_MTIME_PATH, SOCKET_PATH, SPAWN_LOCK_PATH, SUPERSET_HOME_DIR (+13 more)

### Community 35 - "Workspace Init Manager"
Cohesion: 0.10
Nodes (8): InitJob, WorkspaceInitManager, getStepIndex(), INIT_STEP_MESSAGES, INIT_STEP_ORDER, isStepComplete(), WorkspaceInitProgress, WorkspaceInitStep

### Community 36 - "Workspace Runtime Registry"
Cohesion: 0.16
Nodes (11): LocalWorkspaceRuntime, DefaultWorkspaceRuntimeRegistry, resetWorkspaceRuntimeRegistry(), TerminalCapabilities, TerminalEventSource, TerminalManagement, TerminalRuntime, TerminalWorkspaceOperations (+3 more)

### Community 37 - "Desktop Shared Type Defs"
Cohesion: 0.08
Nodes (20): ChangeCategory, ChangedFile, CommitInfo, DiffViewMode, FileContents, FileDiffInput, FileStatus, GitChangesStatus (+12 more)

### Community 38 - "Agent Package Core (Mastra)"
Cohesion: 0.11
Nodes (21): AnthropicOAuthCredentials, clearAnthropicAuthToken(), getAnthropicAuthToken(), instructions, mastra, memory, planningAgent, resolveModel() (+13 more)

### Community 39 - "AI Sources & Tool Display"
Cohesion: 0.10
Nodes (23): SourceProps, Sources(), SourcesContent(), SourcesContentProps, SourcesProps, SourcesTrigger(), SourcesTriggerProps, formatJson() (+15 more)

### Community 40 - "Deep Link & Dock Icon"
Cohesion: 0.11
Nodes (17): focusMainWindow(), gotTheLock, processDeepLink(), drawBorder(), findContentBounds(), getIconPath(), hashString(), sdfRoundedRect() (+9 more)

### Community 41 - "Desktop-MCP DOM Tools"
Cohesion: 0.16
Nodes (11): register(), register(), LEVEL_MAP, LEVEL_NAMES, register(), register(), allTools, ToolContext (+3 more)

### Community 42 - "MCP Package Dependencies"
Cohesion: 0.08
Nodes (25): default, types, default, dependencies, drizzle-orm, @modelcontextprotocol/sdk, @superset/db, @superset/shared (+17 more)

### Community 43 - "UI Form Field Component"
Cohesion: 0.10
Nodes (22): Field(), FieldContent(), FieldDescription(), FieldError(), FieldGroup(), FieldLabel(), FieldLegend(), FieldSeparator() (+14 more)

### Community 44 - "Terminal Data Batcher & Daemon"
Cohesion: 0.12
Nodes (13): DataBatcher, getDaemonTerminalManager(), prewarmTerminalRuntime(), reconcileDaemonSessions(), RegisteredSession, CreateSessionParams, InternalCreateSessionParams, SessionResult (+5 more)

### Community 45 - "Web tRPC Query Client"
Cohesion: 0.20
Nodes (18): ConnectionControlsProps, ConnectionControlsProps, ConnectionControlsProps, createQueryClient(), context, getQueryClient(), TRPCReactProvider(), UseTRPC (+10 more)

### Community 46 - "AI Confirmation Dialog"
Cohesion: 0.10
Nodes (22): Confirmation(), ConfirmationAccepted(), ConfirmationAcceptedProps, ConfirmationActionProps, ConfirmationActions(), ConfirmationActionsProps, ConfirmationContext, ConfirmationContextValue (+14 more)

### Community 48 - "Agent Package Dependencies"
Cohesion: 0.09
Nodes (22): default, dependencies, @ai-sdk/anthropic, cheerio, @mastra/ai-sdk, @mastra/core, @mastra/memory, mastracode (+14 more)

### Community 49 - "Agent Init & Memory Backfill"
Cohesion: 0.17
Nodes (14): AgentInitContext, beginAgentInit(), contexts, retryAgentInit(), runAgentInit(), backfillAgentMemory(), memoryDirIsEmpty(), AgentRepoSource (+6 more)

### Community 50 - "Tray Menu & Daemon Events"
Cohesion: 0.19
Nodes (20): menuEmitter, OpenSettingsEvent, OpenWorkspaceEvent, SettingsSection, getTerminalHostClient(), restartDaemon(), tryListExistingDaemonSessions(), buildSessionsSubmenu() (+12 more)

### Community 51 - "Notification Server & Tabs State"
Cohesion: 0.15
Nodes (17): notificationsApp, BaseTab, extractWorkspaceIdFromUrl(), getNotificationTitle(), getWorkspaceName(), Pane, PaneLocation, TabsState (+9 more)

### Community 52 - "MCP Server Overview & Probing"
Cohesion: 0.16
Nodes (21): buildProbeServerDefinition(), findRemoteUrl(), isMcpRemote(), McpProbeServerDefinition, McpServerState, McpServerTransport, ParsedMcpConfig, parseMcpConfig() (+13 more)

### Community 53 - "Desktop-MCP Package Deps"
Cohesion: 0.10
Nodes (20): bin, desktop-mcp, default, dependencies, dotenv, @modelcontextprotocol/sdk, puppeteer-core, zod (+12 more)

### Community 54 - "Project & Workspace Icons"
Cohesion: 0.21
Nodes (19): deleteProjectIcon(), deleteWorkspaceIcon(), ensureIconsDir(), ensureProjectIconsDir(), ensureWorkspaceIconsDir(), getIconPath(), getIconProtocolUrl(), getProjectIconPath() (+11 more)

### Community 56 - "PTY Subprocess Handling"
Cohesion: 0.19
Nodes (17): decoder, flush(), flushOutput(), handleDispose(), handleKill(), handleSpawn(), handleWrite(), maybePauseStdin() (+9 more)

### Community 57 - "Desktop Shared Config Types"
Cohesion: 0.13
Nodes (12): SetupAction, SetupConfig, SetupDetectionResult, RecentProject, Route, WindowProps, MosaicNode, CreateTabInput (+4 more)

### Community 58 - "Web Header & Avatar UI"
Cohesion: 0.15
Nodes (13): Header(), Avatar(), AvatarFallback(), AvatarImage(), DropdownMenuCheckboxItem(), DropdownMenuLabel(), DropdownMenuRadioItem(), DropdownMenuSeparator() (+5 more)

### Community 59 - "AI Plan Display"
Cohesion: 0.11
Nodes (16): Plan(), PlanActionProps, PlanContentProps, PlanContext, PlanContextValue, PlanDescription(), PlanDescriptionProps, PlanFooterProps (+8 more)

### Community 60 - "Agent Home & Repo Scaffold"
Cohesion: 0.26
Nodes (16): agentsDir(), getAgentCodexHome(), getAgentHome(), getAgentMemoryDir(), getAgentWorktreePath(), AgentRepoResult, setupAgentRepo(), BRIDGE_EXCLUDES (+8 more)

### Community 61 - "Terminal Shell & Escape Filter"
Cohesion: 0.20
Nodes (13): getShellArgs(), findBinaryPathsUnix(), findBinaryPathsWindows(), findRealBinary(), getDefaultShell(), CLEAR_SCROLLBACK_PATTERN, containsClearScrollbackSequence(), extractContentAfterClear() (+5 more)

### Community 62 - "UI Components Registry Config"
Cohesion: 0.11
Nodes (18): aliases, components, hooks, lib, ui, utils, registries, @ai-elements (+10 more)

### Community 63 - "AI Chain-of-Thought Component"
Cohesion: 0.11
Nodes (16): ChainOfThought, ChainOfThoughtContent, ChainOfThoughtContentProps, ChainOfThoughtContext, ChainOfThoughtContextValue, ChainOfThoughtHeader, ChainOfThoughtHeaderProps, ChainOfThoughtImage (+8 more)

### Community 64 - "Terminal Env & Shell Wrappers"
Cohesion: 0.26
Nodes (15): getShellEnv(), ALLOWED_ENV_VARS, ALLOWED_PREFIXES, buildSafeEnv(), buildTerminalEnv(), getLocale(), hasAllowedPrefix(), isAllowedVar() (+7 more)

### Community 65 - "Notification Manager Tests"
Cohesion: 0.24
Nodes (11): NotificationManagerDeps, createDeps(), createMockNotification(), MockNotification, TestDeps, TrackedEntry, isPaneVisible(), AgentInvokeEvent (+3 more)

### Community 66 - "Terminal History Files"
Cohesion: 0.21
Nodes (11): assertSafeIdSegment(), getHistoryDir(), getMetadataPath(), getScrollbackPath(), getTerminalHistoryRootDir(), HistoryReader, isUtf8ContinuationByte(), resolveHistoryDir() (+3 more)

### Community 67 - "Web Auth Pages & UI Button"
Cohesion: 0.18
Nodes (8): Question, QuestionOption, UserQuestionTool(), UserQuestionToolProps, Button(), buttonVariants, Calendar(), CalendarDayButton()

### Community 68 - "Web Integrations Cards"
Cohesion: 0.18
Nodes (9): IntegrationCard(), IntegrationCardProps, RepositoryList(), RepositoryListProps, integrations, Badge(), badgeVariants, SidebarCard() (+1 more)

### Community 69 - "Web OAuth Consent & Select UI"
Cohesion: 0.19
Nodes (13): TeamSelectorProps, ConsentFormProps, Organization, SCOPE_DESCRIPTIONS, Select(), SelectContent(), SelectItem(), SelectLabel() (+5 more)

### Community 70 - "Agent Registry & Notifications"
Cohesion: 0.17
Nodes (11): AGENT_REGISTRY_PATH, AgentRegistry, AgentRegistryEntry, getAgentByWorkspaceId(), getAgentEntry(), loadAgentRegistry(), mapEventType(), app (+3 more)

### Community 71 - "Chat-Mastra Hono Server"
Cohesion: 0.13
Nodes (13): dependencies, fast-glob, fuse.js, hono, @mastra/mcp, mastracode, superjson, @superset/trpc (+5 more)

### Community 72 - "tRPC Integration Routers"
Cohesion: 0.30
Nodes (5): qstash, getSlackConnection(), verifyOrgAdmin(), verifyOrgMembership(), protectedProcedure

### Community 73 - "UI Context Menu Component"
Cohesion: 0.12
Nodes (9): ContextMenuCheckboxItem(), ContextMenuContent(), ContextMenuItem(), ContextMenuLabel(), ContextMenuRadioItem(), ContextMenuSeparator(), ContextMenuShortcut(), ContextMenuSubContent() (+1 more)

### Community 74 - "Electron Browser Manager"
Cohesion: 0.21
Nodes (3): BrowserManager, ConsoleEntry, sanitizeUrl()

### Community 75 - "PTY Subprocess IPC Framing"
Cohesion: 0.16
Nodes (9): createFrameHeader(), EMPTY_PAYLOAD, PtySubprocessFrame, PtySubprocessFrameDecoder, writeFrame(), FakeChildProcess, FakeStdin, FakeStdout (+1 more)

### Community 76 - "Chat-Mastra Service Client"
Cohesion: 0.28
Nodes (11): createChatMastraServiceClient(), CreateChatMastraServiceClientOptions, createChatMastraServiceHttpClient(), CreateChatMastraServiceHttpClientOptions, ChatMastraServiceClient, ChatMastraServiceProvider(), ChatMastraServiceProviderProps, chatMastraServiceTrpc (+3 more)

### Community 77 - "AI Bash/Search Tool Display"
Cohesion: 0.16
Nodes (11): BashTool(), BashToolProps, BashToolState, extractCommandSummary(), Loader(), LoaderIconProps, LoaderProps, SearchResult (+3 more)

### Community 78 - "AI Shimmer Loading UI"
Cohesion: 0.18
Nodes (11): buildSummary(), ExploringGroup(), ExploringGroupItem, ExploringGroupProps, ShimmerLabel(), ShimmerLabelProps, Shimmer, ShimmerComponent() (+3 more)

### Community 79 - "UI Input & Input Group"
Cohesion: 0.17
Nodes (12): InputGroup(), InputGroupAddon(), inputGroupAddonVariants, InputGroupButton(), inputGroupButtonVariants, InputGroupInput(), InputGroupText(), InputGroupTextarea() (+4 more)

### Community 80 - "Agent Package README & Architecture"
Cohesion: 0.19
Nodes (14): agent-executor.ts, executeAgent, permission-manager.ts, sdk-to-ai-chunks.ts, session-store.ts, types.ts, Callback-based, Cloud agents (Fly.io, Cloudflare Workers) (+6 more)

### Community 81 - "Telemetry & Daemon Restore"
Cohesion: 0.19
Nodes (3): getClient(), isTelemetryEnabled(), track()

### Community 82 - "Terminal Daemon Connection Tests"
Cohesion: 0.14
Nodes (8): HelloResponse, DAEMON_PATH, PID_PATH, sendRequest(), SOCKET_PATH, SUPERSET_HOME_DIR, TOKEN_PATH, XTERM_POLYFILL_PATH

### Community 83 - "Terminal Session Lifecycle Tests"
Cohesion: 0.18
Nodes (10): authenticate(), connectClient(), connectToDaemon(), DAEMON_PATH, PID_PATH, sendRequest(), SOCKET_PATH, SUPERSET_HOME_DIR (+2 more)

### Community 84 - "Web Root Layout & Providers"
Cohesion: 0.19
Nodes (9): ibmPlexMono, inter, metadata, RootLayout(), viewport, Providers(), PostHogUserIdentifier(), sonner (+1 more)

### Community 85 - "UI Carousel Component"
Cohesion: 0.20
Nodes (13): Carousel(), CarouselApi, CarouselContent(), CarouselContext, CarouselContextProps, CarouselItem(), CarouselNext(), CarouselOptions (+5 more)

### Community 86 - "Window State Persistence"
Cohesion: 0.32
Nodes (9): WINDOW_STATE_PATH, clampToWorkArea(), getInitialWindowBounds(), InitialWindowBounds, isVisibleOnAnyDisplay(), isValidWindowState(), loadWindowState(), saveWindowState() (+1 more)

### Community 88 - "Terminal Port Scanner"
Cohesion: 0.23
Nodes (7): DaemonSession, IGNORED_PORTS, ScanState, PortInfo, isProcessAlive(), isProcessNotFoundError(), treeKillWithEscalation()

### Community 89 - "Workspace Branch Naming"
Cohesion: 0.37
Nodes (9): deduplicateBranchName(), resolveBranchPrefix(), sanitizeAuthorPrefix(), sanitizeBranchName(), sanitizeBranchNameWithMaxLength(), sanitizeSegment(), truncateBranchName(), deriveWorkspaceBranchFromPrompt() (+1 more)

### Community 90 - "Chat-Mastra File Search Index"
Cohesion: 0.23
Nodes (11): buildSearchIndex(), DEFAULT_IGNORE_PATTERNS, FileSearchCacheEntry, FileSearchIndex, FileSearchItem, FileSearchResult, getSearchCacheKey(), getSearchIndex() (+3 more)

### Community 91 - "AI File Diff Tool"
Cohesion: 0.21
Nodes (12): buildSimpleDiff(), calculateDiffStats(), DiffLine, extractFilename(), FileDiffTool(), FileDiffToolExpandedContentProps, FileDiffToolProps, FileDiffToolState (+4 more)

### Community 92 - "UI Item Component"
Cohesion: 0.18
Nodes (12): Item(), ItemActions(), ItemContent(), ItemDescription(), ItemFooter(), ItemGroup(), ItemHeader(), ItemMedia() (+4 more)

### Community 93 - "Static Ports Config Loader"
Cohesion: 0.23
Nodes (9): hasStaticPortsConfig(), loadStaticPorts(), PortEntry, PortsConfig, PORTS_FILE, SUPERSET_DIR, TEST_DIR, WORKTREE_PATH (+1 more)

### Community 94 - "Terminal Daemon Types & Errors"
Cohesion: 0.32
Nodes (4): mockClient, ColdRestoreInfo, SessionInfo, TerminalKilledError

### Community 95 - "Web Product Demo & Gradient"
Cohesion: 0.21
Nodes (5): DEMO_OPTIONS, ProductDemo(), GradientInstance, MeshGradient(), MeshGradientProps

### Community 96 - "Desktop-MCP Server & Transport"
Cohesion: 0.27
Nodes (5): server, transport, ConnectionManager, createMcpServer(), registerTools()

### Community 97 - "tRPC Task Sync Integration"
Cohesion: 0.24
Nodes (6): env, PROVIDER_ENDPOINTS, qstash, syncTask(), createTaskSchema, updateTaskSchema

### Community 98 - "Electron Extensions Loader"
Cohesion: 0.36
Nodes (10): compareVersionLikeStrings(), getChromeExtensionRoots(), getChromiumUserDataDirs(), loadReactDevToolsExtension(), loadWebviewBrowserExtension(), resolveExtensionVersionPath(), resolveReactDevToolsPath(), resolveWebviewExtensionPath() (+2 more)

### Community 99 - "UI Package Scripts Config"
Cohesion: 0.18
Nodes (10): name, peerDependencies, react, private, scripts, clean, typecheck, ui-add (+2 more)

### Community 100 - "AI Reasoning Display"
Cohesion: 0.18
Nodes (8): Reasoning, ReasoningContent, ReasoningContentProps, ReasoningContext, ReasoningContextValue, ReasoningProps, ReasoningTrigger, ReasoningTriggerProps

### Community 101 - "AI Task Display"
Cohesion: 0.18
Nodes (10): Task(), TaskContent(), TaskContentProps, TaskItem(), TaskItemFile(), TaskItemFileProps, TaskItemProps, TaskProps (+2 more)

### Community 102 - "UI Chart Component"
Cohesion: 0.25
Nodes (9): ChartConfig, ChartContainer(), ChartContext, ChartContextProps, ChartLegendContent(), ChartTooltipContent(), getPayloadConfigFromPayload(), THEMES (+1 more)

### Community 103 - "UI Drawer Component"
Cohesion: 0.18
Nodes (6): DrawerContent(), DrawerDescription(), DrawerFooter(), DrawerHeader(), DrawerOverlay(), DrawerTitle()

### Community 104 - "Provider API Key Storage"
Cohesion: 0.36
Nodes (9): clearProviderKey(), getProviderKey(), getProviderKeyStatus(), hasProviderKey(), PROVIDER_IDS, ProviderId, readKeyMap(), setProviderKey() (+1 more)

### Community 106 - "Terminal Session Events"
Cohesion: 0.24
Nodes (7): SessionMeta, TerminalDataEvent, TerminalErrorEvent, TerminalExitEvent, AttachedClient, SessionOptions, SpawnProcess

### Community 108 - "Web TypeScript Build Config"
Cohesion: 0.20
Nodes (10): devDependencies, babel-plugin-react-compiler, dotenv, @superset/typescript, tailwindcss, @tailwindcss/postcss, @types/node, @types/react (+2 more)

### Community 109 - "UI Package TS Config"
Cohesion: 0.20
Nodes (9): compilerOptions, baseUrl, jsx, lib, paths, exclude, extends, include (+1 more)

### Community 110 - "Agent Wrappers Tests"
Cohesion: 0.22
Nodes (8): mockedHomeDir, TEST_BASH_DIR, TEST_BIN_DIR, TEST_HOOKS_DIR, TEST_OPENCODE_CONFIG_DIR, TEST_OPENCODE_PLUGIN_DIR, TEST_ROOT, TEST_ZSH_DIR

### Community 111 - "Sync Workspace Identity"
Cohesion: 0.33
Nodes (8): canonicalizeWorkspace(), EmbeddedWorkspaceMeta, findLocalWorkspaceByCanonical(), getCanonicalForLocalWorkspaceId(), NOTE: We intentionally do NOT create projects on the fly. If the peer, resolveLocalWorkspaceId(), ResolveLocalWorkspaceIdOptions, WorkspaceIdentityInput

### Community 114 - "Desktop File Type Detection"
Cohesion: 0.42
Nodes (8): getExtension(), getImageMimeType(), hasRenderedPreview(), IMAGE_EXTENSIONS, IMAGE_MIME_TYPES, isImageFile(), isMarkdownFile(), MARKDOWN_EXTENSIONS

### Community 115 - "Chat-Mastra TS Config"
Cohesion: 0.22
Nodes (8): compilerOptions, jsx, lib, outDir, rootDir, exclude, extends, include

### Community 116 - "UI Package Export Map"
Cohesion: 0.22
Nodes (9): exports, ./ai-elements/*, ./atoms/*, ./globals.css, ./hooks/*, ./icons/preset-icons, ./lib/*, ./mesh-gradient (+1 more)

### Community 117 - "AI Code Block Component"
Cohesion: 0.25
Nodes (8): CodeBlock(), CodeBlockContext, CodeBlockContextType, CodeBlockCopyButton(), CodeBlockCopyButtonProps, CodeBlockProps, highlightCode(), lineNumberTransformer

### Community 118 - "AI Conversation Display"
Cohesion: 0.22
Nodes (8): Conversation(), ConversationContent(), ConversationContentProps, ConversationEmptyState(), ConversationEmptyStateProps, ConversationProps, ConversationScrollButton(), ConversationScrollButtonProps

### Community 119 - "UI Pagination Component"
Cohesion: 0.22
Nodes (7): Pagination(), PaginationContent(), PaginationEllipsis(), PaginationLink(), PaginationLinkProps, PaginationNext(), PaginationPrevious()

### Community 120 - "Resource Metrics Collection"
Cohesion: 0.32
Nodes (7): AppMetrics, collectResourceMetrics(), ProcessMetrics, ResourceMetricsSnapshot, SessionMetrics, WorkspaceMetrics, getProcessTree()

### Community 121 - "Agent Scheduler Watcher"
Cohesion: 0.29
Nodes (3): AgentWatcher, WatcherConfig, WATCHERS_PATH

### Community 124 - "Terminal Reconcile on Startup"
Cohesion: 0.36
Nodes (4): ReconcilableManager, reconcileWithTimeout(), settledWithin(), warnings

### Community 125 - "Web TS Config"
Cohesion: 0.25
Nodes (7): compilerOptions, baseUrl, paths, exclude, extends, include, @/*

### Community 126 - "Desktop-MCP Console Capture"
Cohesion: 0.36
Nodes (3): ConsoleCapture, LEVEL_MAP, ConsoleLogEntry

### Community 127 - "Desktop-MCP TS Config"
Cohesion: 0.25
Nodes (7): compilerOptions, baseUrl, paths, exclude, extends, include, @/*

### Community 128 - "MCP Package TS Config"
Cohesion: 0.25
Nodes (7): compilerOptions, baseUrl, paths, exclude, extends, include, @/*

### Community 129 - "tRPC Upload & User Router"
Cohesion: 0.43
Nodes (3): ALLOWED_IMAGE_TYPES, generateImagePathname(), uploadImage()

### Community 130 - "UI Icons Dependencies"
Cohesion: 0.25
Nodes (8): devDependencies, @lobehub/icons-static-svg, react, @superset/typescript, tailwindcss, @tailwindcss/postcss, @types/react, typescript

### Community 131 - "UI Empty State Component"
Cohesion: 0.29
Nodes (7): Empty(), EmptyContent(), EmptyDescription(), EmptyHeader(), EmptyMedia(), emptyMediaVariants, EmptyTitle()

### Community 132 - "Static & Detected Ports Types"
Cohesion: 0.38
Nodes (4): DetectedPort, EnrichedPort, StaticPort, StaticPortsResult

### Community 133 - "Terminal Port Scanner (cross-platform)"
Cohesion: 0.67
Nodes (6): execAsync, getListeningPortsForPids(), getListeningPortsLsof(), getListeningPortsWindows(), getProcessName(), getProcessNameWindows()

### Community 134 - "Theme Color Utils"
Cohesion: 0.52
Nodes (5): stripHash(), toHex(), toHex8(), toHexAuto(), withAlpha()

### Community 135 - "UI Toggle Component"
Cohesion: 0.43
Nodes (5): ToggleGroup(), ToggleGroupContext, ToggleGroupItem(), Toggle(), toggleVariants

### Community 136 - "Electron Preload IPC Bridge"
Cohesion: 0.33
Nodes (5): API, IpcListener, ipcRendererAPI, listenerMap, Window

### Community 137 - "Web Package Scripts"
Cohesion: 0.33
Nodes (6): scripts, build, clean, dev, start, typecheck

### Community 138 - "Web GitHub Error Handler"
Cohesion: 0.40
Nodes (4): ERROR_MESSAGES, ErrorHandler(), SUCCESS_MESSAGES, WARNING_MESSAGES

### Community 140 - "Agent Package TS Config"
Cohesion: 0.33
Nodes (5): compilerOptions, types, exclude, extends, include

### Community 143 - "Desktop-MCP Send Keys Tool"
Cohesion: 0.53
Nodes (4): KEY_MAP, MODIFIER_KEYS, normalizeKey(), register()

### Community 144 - "tRPC Linear Priority Mapping"
Cohesion: 0.53
Nodes (4): getLinearClient(), mapPriorityFromLinear(), mapPriorityToLinear(), Priority

### Community 145 - "tRPC TS Config"
Cohesion: 0.33
Nodes (5): compilerOptions, jsx, exclude, extends, include

### Community 146 - "UI Input OTP Component"
Cohesion: 0.33
Nodes (4): input-otp, InputOTP(), InputOTPGroup(), InputOTPSlot()

### Community 147 - "UI Avatar Atom Component"
Cohesion: 0.60
Nodes (4): Avatar(), avatarFallbackVariants, AvatarProps, avatarVariants

### Community 148 - "AI Edge/Flow Component"
Cohesion: 0.47
Nodes (4): Animated(), Edge, getEdgeParams(), getHandleCoordsByPosition()

### Community 149 - "AI Web Fetch Tool"
Cohesion: 0.47
Nodes (5): extractHostname(), formatBytes(), WebFetchTool(), WebFetchToolProps, WebFetchToolState

### Community 151 - "Device Identity Hashing"
Cohesion: 0.60
Nodes (3): getHashedDeviceId(), getMachineId(), getRawMachineId()

### Community 153 - "Worktree ID Naming"
Cohesion: 0.80
Nodes (3): deriveWorkspaceNameFromWorktreeSegments(), getWorkspaceName(), normalizeWorkspaceName()

### Community 154 - "Web Package Metadata"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 156 - "Web Route Proxy/Middleware"
Cohesion: 0.50
Nodes (4): config, isPublicRoute(), proxy(), publicRoutes

### Community 161 - "Desktop File Tree Types"
Cohesion: 0.50
Nodes (3): DirectoryEntry, FileSystemChangeEvent, FileTreeNode

### Community 165 - "AI Text Selection Popover"
Cohesion: 0.67
Nodes (3): TextSelectionPopover(), TextSelectionPopoverAction, TextSelectionPopoverProps

### Community 166 - "UI Hover Card Component"
Cohesion: 0.50
Nodes (3): HoverCard(), HoverCardContent(), HoverCardTrigger()

## Knowledge Gaps
- **934 isolated node(s):** `FileStatus`, `ChangedFile`, `CommitInfo`, `GitChangesStatus`, `DiffViewMode` (+929 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `UI Accordion & Breadcrumb` to `AI Prompt Input Attachments`, `UI Empty State Component`, `AI Artifact Display`, `Alert & Model Selector UI`, `UI Toggle Component`, `AI Queue Display`, `Web App Auth Pages`, `Web Integration Connection Pages`, `AI Message Display`, `UI Input OTP Component`, `UI Avatar Atom Component`, `AI Inline Citation Carousel`, `AI Web Fetch Tool`, `UI Popover (legacy)`, `UI Popover Component`, `AI Context Display`, `Open-In AI Chat Tool`, `AI Text Selection Popover`, `UI Hover Card Component`, `AI Sources & Tool Display`, `UI Form Field Component`, `Web tRPC Query Client`, `AI Confirmation Dialog`, `Web Header & Avatar UI`, `AI Plan Display`, `AI Chain-of-Thought Component`, `Web Auth Pages & UI Button`, `Web Integrations Cards`, `Web OAuth Consent & Select UI`, `UI Context Menu Component`, `AI Bash/Search Tool Display`, `AI Shimmer Loading UI`, `UI Input & Input Group`, `Web Root Layout & Providers`, `UI Carousel Component`, `AI File Diff Tool`, `UI Item Component`, `AI Reasoning Display`, `AI Task Display`, `UI Chart Component`, `UI Drawer Component`, `AI Code Block Component`, `AI Conversation Display`, `UI Pagination Component`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Why does `AppRouter` connect `tRPC Client & Router` to `Chat-Mastra Hono Server`, `Web App Auth Pages`, `Web tRPC Query Client`, `Chat-Mastra MCP Runtime Gate`, `Chat-Mastra Runtime Invocation`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Web Package Dependencies` to `Web Package Metadata`, `Web App Auth Pages`, `tRPC Client & Router`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `FileStatus`, `ChangedFile`, `CommitInfo` to the rest of the system?**
  _942 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI Accordion & Breadcrumb` be split into smaller, more focused modules?**
  _Cohesion score 0.03163418290854573 - nodes in this community are weakly interconnected._
- **Should `Agent CLI Wrapper Setup` be split into smaller, more focused modules?**
  _Cohesion score 0.059794214715589204 - nodes in this community are weakly interconnected._
- **Should `AI Prompt Input Attachments` be split into smaller, more focused modules?**
  _Cohesion score 0.02280701754385965 - nodes in this community are weakly interconnected._