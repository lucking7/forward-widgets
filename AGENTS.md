# Repository Guide

## Purpose

This repository publishes Forward modules and components. The current production component is `widgets/danmu/danmu-select.js`; `widgets.fwd` is the public collection manifest.

## Commands

- `npm test`: run every Node.js regression test.
- `npm run test:danmu`: run the danmu suite only.
- `npm run test:flow`: run the deterministic search-detail-comments backtest.
- `npm run test:live`: run an opt-in live smoke test against the configured public instances.
- `npm run test:runtime`: run the same flow without Node timer globals.
- `npm run check`: parse-check the production widget.

No install step is required. Tests use Node.js built-ins and expect Node.js 20 or newer.

## Layout

- `widgets.fwd`: public Forward collection manifest. Keep metadata synchronized with each widget.
- `widgets/danmu/danmu-select.js`: self-contained Forward runtime script. It cannot import npm packages.
- `widgets/danmu/danmu-select.md`: user-facing behavior and configuration notes.
- `tests/`: VM-based contract and regression tests.
- `docs/`: dated research and architectural decisions. Clearly mark dynamic external configuration as a snapshot.

## Danmu invariants

- Preserve the public module IDs `searchDanmu`, `getDetail`, and `getComments`.
- Preserve per-source `animeId` and `episodeId` mappings. Never send one provider's ID to another provider.
- Matching accuracy is a hard gate. Completion order must not outrank title, season, episode, and media-type evidence.
- Alpha and Cynn are fast-tier defaults. Lily is a deep-tier fallback and must not be started after a sufficient fast-tier result.
- Comment quality selection must remain deterministic and locally testable. Do not send comment text to an AI service.
- Do not use timer globals that Forward does not expose. Use launch budgets for later stages and let `Widget.http` enforce native request timeouts.
- Treat third-party endpoints as user-editable defaults. Never commit private tokens or API keys.

## Change process

Add or update a regression test before changing runtime behavior. Run both `npm test` and `npm run check`. When widget metadata changes, update `widgets.fwd`, the widget documentation, and README in the same commit.
