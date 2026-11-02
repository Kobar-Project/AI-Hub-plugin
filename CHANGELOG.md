# Changelog

## 1.1.0 - 2026-11-02

- Canlı look: panel shell radius 32 on the Canlı shell colour with e3 shadow and subtle stroke, circular 36 px header buttons, pill model picker, chat rows radius 16 with container fill when active, message bubbles radius 24 (user = container fill, assistant = surface), pill composer actions with one filled accent send button, monospace inset for code, inset inputs in settings; removed the pulsing "thinking" text; Material Symbols Rounded with Outlined fallback; Canlı tokens with fallbacks for older hosts.
- Bar tile: label template plus a `dot` badge on the bar item when a reply finished while the panel was closed (cleared when the panel opens); feature-detected, ignored on hosts without the tile API. Manifest `bar` block added (`sensitive: true`, `defaultSize: icon`).
- Redesigned from its functions: one-column chat with a history view, a pill model picker and composer.
- Current models grouped by provider (Anthropic, OpenAI, Gemini, local); a saved older model stays selectable; OpenAI and Gemini keys enabled.
- QA fixes: tile priority busy > error > unread, a single rename field, Esc in the history view.
