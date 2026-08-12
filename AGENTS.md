# Repository Guide

## Purpose

This repository publishes Forward modules and components. Production widgets live under `widgets/danmu/`, `widgets/douban/`, `widgets/anime/`, and `widgets/trending/`; `widgets.fwd` is the public collection manifest. The anime ranking backend lives under `api/` and `lib/anime-rankings/`.

## Commands

- `npm test`: run every Node.js regression test.
- `npm run test:danmu`: run the danmu suite only.
- `npm run test:douban`: run the Douban suite only.
- `npm run test:douban:live`: run the opt-in no-Cookie Douban smoke test.
- `npm run test:anime`: run the offline anime ranking service and Forward widget suites.
- `npm run test:anime:live`: run the opt-in AniList and Bahamut source smoke test.
- `npm run test:trending`: run the offline TMDB movie/TV trending widget suite.
- `npm run test:flow`: run the deterministic search-detail-comments backtest.
- `npm run test:live`: run an opt-in live smoke test against the configured public instances.
- `npm run test:runtime`: run the same flow without Node timer globals.
- `npm run check`: parse-check all production widgets.

Run `npm install` before development. Tests use Node.js built-ins, the deployed ranking service uses `@vercel/blob`, and Node.js 20 or newer is required.

## Layout

- `widgets.fwd`: public Forward collection manifest. Keep metadata synchronized with each widget.
- `widgets/danmu/danmu-select.js`: self-contained Forward runtime script. It cannot import npm packages.
- `widgets/danmu/danmu-select.md`: user-facing behavior and configuration notes.
- `widgets/douban/douban-discovery.js`: self-contained Douban discovery and strict TMDB mapping widget.
- `widgets/douban/douban-discovery.md`: user-facing Douban behavior, privacy, and matching notes.
- `widgets/anime/anime-rankings.js`: self-contained Forward client for the deployed anime ranking API.
- `widgets/trending/tmdb-trending.js`: self-contained TMDB movie/TV day-week widget using `Widget.tmdb`.
- `api/cron/anime-rankings.js`: authenticated hourly collector entrypoint.
- `api/v1/rankings/anime/`: public realtime, day, week, and meta handlers.
- `lib/anime-rankings/`: AniList/Bahamut collectors, weighting, Blob CAS publication, and service logic.
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

## Anime ranking invariants

- AniList is the hourly primary source. A failed primary collection must not replace the last successful state.
- Bahamut is an auxiliary signal sampled at most every six hours. Only uniquely exact-matched AniList identities may enter aggregation.
- Hash normalized semantic Bahamut fields, never raw HTML. An unchanged content hash must not gain repeated weight.
- Keep day and week coverage explicit. Cold-start history is `partial`; a primary sample older than three hours is `stale`.
- Publish an immutable Blob version before updating `current.json` with ETag CAS. Re-read once after a CAS conflict.
- Forward TMDB mapping is strict and bounded to four concurrent requests. Do not emit an ambiguous first search result.

## TMDB trending invariants

- Movie and TV day/week rankings must use `/trending/{movie|tv}/{day|week}`. Never relabel `popular` as a time-window ranking.
- Label the source as TMDB global trending, not IMDb or platform playback data.
- Because movie and TV are separate modules, keep `id` numeric and use `mediaType` to distinguish their TMDB namespaces.
- Use only Forward's built-in `Widget.tmdb`; this widget must not require Vercel, user API keys, or timer globals.

## Change process

Add or update a regression test before changing runtime behavior. Run both `npm test` and `npm run check`. When widget metadata changes, update `widgets.fwd`, the widget documentation, and README in the same commit.
