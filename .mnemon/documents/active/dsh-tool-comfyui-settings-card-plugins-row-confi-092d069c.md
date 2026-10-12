---
id: "092d069c-6ecc-4fdc-988c-1179d52ea0be"
title: "dsh-tool-comfyui settings card (plugins.row.config) implementation handoff"
description: "How the ComfyUI tool's visual configuration card was built against DSH 0.2.0-rc.2: Host volatile fields, lazy-CJS client bundle, owner-props form contract, and verification results."
status: "active"
created_at: "2026-10-12T02:24:23.404Z"
updated_at: "2026-10-12T02:24:23.404Z"
content_hash: "1d51331ebd2de117a1c79a0e08acaa6bff4ebfc0e81a61e6a20debe618dc2f73"
source_paths:
  - "lib/client.js"
  - "lib/index.js"
  - "package.json"
  - "README.md"
session_ids:
  - "8a322348-1395-4881-b01d-910c4df771c6"
memory_body_ids:
  []
---

# dsh-tool-comfyui — visual settings card implementation handoff

Scope: makes the plugin's configuration editable from the DSH web Plugins page instead of only by hand-editing `cordis.patch.yml`. Built against DSH 0.2.0-rc.2 contracts verified in the local DSH checkout (`D:\apps\npm\node_modules\@deepseek-ai\dsh`). Source paths are relative to the workspace `E:\Documents\ai-home\dsh-tool-comfyui`.

## Two halves

**Host half — `lib/index.js`**
All 10 fields of the plugin's `Config` schema got `.volatile()`. The dsh settings service's `describe()` projects the schema through `volatileForm(schema)` and returns only volatile fields; a plugin with no volatile fields never appears in the UI (`if (form === void 0) return []`). Verified: `Config volatile fields: 10`.

**Browser half — `lib/client.js` (new)**
A hand-written lazy-CJS factory bundle matching the platform's exact format:

```js
window.__ModuleLoader__.load({
  id: "dsh-tool-comfyui",
  factory: (require) => { /* module/exports shim, requires, register */ }
});
```

- Registers into slot `plugins.row.config` with entry key `dsh-tool-comfyui#tool-comfyui` (the bundle patch's row id). `plugins.item` is occupied by the official settings pages; a bundle's own config belongs in `plugins.bundle.config` (keyed by npm package name) or `plugins.row.config` (keyed by `<pkg>#<rowid>`).
- Reads the config form from **owner props**: the plugin-manager page calls `renderSlot("plugins.row.config", { view: "page", form }, { entryKey: key })`, where `form` is `{ state, mutate }` built by `formFor(rowId)`. The component does **not** build its own controller and does not need `configForms` injection. `view` is `"summary"` or `"page"`.
- Controls use `@deepseek-ai/dsh-client-ui-primitives`: `SettingsForm`, `SettingsValueField`, `Checkbox`. Note `Checkbox` takes `onChange: (next: boolean) => void`, not a DOM event.
- Edits are staged locally per field; **保存** compiles them into `op: "set" | "unset"` path ops and submits atomically via `form.mutate`. Number fields (`timeoutMs`, `pollIntervalMs`, `maxBatchSize`) validate and can be unset back to profile default; `workers` array ↔ multi-line `id | url | label` text.
- Locale dictionary namespace `settings.comfyui` (zh + en), via the card's `inject: ["slots", "locale"]`.
- React rules: all hooks (10 fixed `useStaged` calls) run unconditionally before any early return; the not-ready / summary branches return only after hooks.

**`package.json`**
- `exports["./client"]` → `./lib/client.js`
- `dsh.client`: `{ platform: "web", inject: ["@deepseek-ai/dsh-client-locale", "settings", "plugin-manager"] }`
- `lib/**/*.js` already covered by `files`.

**`README.md`** — documents the real entry path: Plugins page → `tool-comfyui` row → 配置 card, plus the two-half mechanism.

## Verification (all passed)

| Check | Result |
|---|---|
| `Config` volatile field count | 10 |
| `exports./client` + `dsh.client.platform` | present / `web` |
| `node --check lib/client.js` | syntax OK |
| Materialize factory with stub seed | registered id `dsh-tool-comfyui`; exports `NS, ROW_KEY, apply, inject` |

## Open point / known risk

The card's `require`s — `react/jsx-runtime`, `react`, `@deepseek-ai/dsh-client-ui-primitives` — were assumed to be platform baseline seed (`PLATFORM_MODULES` in the DSH source), so no `dsh.client.external` was declared. If the card fails to appear after a web profile rebuild, first suspects are those three modules missing from that build's baseline; then add them to `dsh.client.external`.

Effective after: rebuild/restart the web profile. Config writes back to the profile's `cordis.patch.yml`.

Related: no prior managed document covered this project; this is the first.
