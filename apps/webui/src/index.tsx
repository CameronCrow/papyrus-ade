// Order matters: the preload shim must exist before any renderer module
// evaluates (stores read window.App at import time).
import "./shell-web";
// Boot the desktop renderer app itself — the renderer source is the single
// source of truth; only transport + shell differ (see vite.config.ts).
import "../../desktop/src/renderer/index";
