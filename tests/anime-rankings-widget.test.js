const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadWidget(Widget = {}) {
  const filename = path.join(__dirname, "../widgets/anime/anime-rankings.js");
  const source = fs.readFileSync(filename, "utf8");
  const context = { Widget, console, encodeURIComponent, decodeURIComponent };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename });
  return context;
}

test("publishes one strict-runtime anime ranking module without timer or URL globals", () => {
  const source = fs.readFileSync(path.join(__dirname, "../widgets/anime/anime-rankings.js"), "utf8");
  const context = loadWidget();

  assert.match(source, /^\/\/[^\n]*\nWidgetMetadata\s*=/);
  assert.doesNotMatch(source, /\b(?:var|let|const)\s+WidgetMetadata\b/);
  assert.equal(context.WidgetMetadata.id, "anime.weighted.rankings.v1");
  assert.deepEqual(
    Array.from(context.WidgetMetadata.modules, (module) => [module.id, module.functionName]),
    [["animeRankings", "loadAnimeRankings"]],
  );
  assert.equal(typeof context.loadAnimeRankings, "function");
  assert.equal("setTimeout" in context, false);
  assert.equal("URL" in context, false);
});

test("loads a selected window and only emits uniquely verified TMDB matches", async () => {
  const calls = [];
  const Widget = {
    http: {
      async get(url) {
        calls.push(url);
        return { data: {
          schemaVersion: 1,
          window: "day",
          coverage: { expected: 24, actual: 12, ratio: 0.5 },
          partial: true,
          stale: false,
          items: [
            {
              canonicalId: "anilist:1",
              rank: 1,
              score: 0.91,
              format: "MOVIE",
              title: { english: "Exact Film", romaji: "Exact Film", native: "正確電影" },
              startDate: { year: 2026, month: 3, day: 1 },
              sources: ["anilist"],
            },
            {
              canonicalId: "anilist:2",
              rank: 2,
              score: 0.88,
              format: "TV",
              title: {
                english: "That Time I Got Reincarnated as a Slime Season 4",
                romaji: "Tensei Shitara Slime Datta Ken 4th Season",
                native: "転生したらスライムだった件 第4期",
              },
              startDate: { year: 2026, month: 4, day: 3 },
              sources: ["anilist", "bahamut"],
            },
            {
              canonicalId: "anilist:3",
              rank: 3,
              score: 0.8,
              format: "TV",
              title: { english: "Ambiguous", romaji: "Ambiguous", native: "歧義" },
              startDate: { year: 2026, month: 1, day: 1 },
              sources: ["anilist"],
            },
          ],
        } };
      },
    },
    tmdb: {
      async get(endpoint, options) {
        const params = options && options.params || {};
        if (endpoint === "search/movie") {
          assert.equal(params.query, "Exact Film");
          return { results: [{
            id: 101,
            media_type: "movie",
            title: "Exact Film",
            original_title: "Exact Film",
            release_date: "2026-03-01",
            poster_path: "/film.jpg",
          }] };
        }
        if (endpoint === "search/tv" && params.query.includes("Slime")) {
          return { results: [{
            id: 82684,
            media_type: "tv",
            name: "That Time I Got Reincarnated as a Slime",
            original_name: "転生したらスライムだった件",
            first_air_date: "2018-10-02",
            poster_path: "/slime.jpg",
          }] };
        }
        if (endpoint === "tv/82684/season/4") return { air_date: "2026-04-03" };
        if (endpoint === "search/tv") {
          return { results: [
            { id: 201, name: "Ambiguous", original_name: "Ambiguous", first_air_date: "2026-01-01" },
            { id: 202, name: "Ambiguous", original_name: "Ambiguous", first_air_date: "2026-01-01" },
          ] };
        }
        throw new Error("unexpected TMDB endpoint: " + endpoint);
      },
    },
  };
  const { loadAnimeRankings } = loadWidget(Widget);

  const items = await loadAnimeRankings({
    apiBase: "https://rankings.example.test/",
    window: "day",
    page: 1,
  });

  assert.deepEqual(calls, ["https://rankings.example.test/api/v1/rankings/anime/day"]);
  assert.deepEqual(
    Array.from(items, (item) => ({
      id: item.id,
      tmdbId: item.tmdbId,
      type: item.type,
      mediaType: item.mediaType,
      season: item.season,
      seasonNumber: item.seasonNumber,
    })),
    [
      { id: "movie.101", tmdbId: 101, type: "tmdb", mediaType: "movie", season: undefined, seasonNumber: undefined },
      { id: "tv.82684", tmdbId: 82684, type: "tmdb", mediaType: "tv", season: 4, seasonNumber: 4 },
    ],
  );
  assert.match(items[0].description, /日榜/);
  assert.match(items[0].description, /覆盖 12\/24/);
  assert.match(items[1].description, /AniList \+ Bahamut/);
});

test("rejects an unsafe API base before making a request", async () => {
  let calls = 0;
  const { loadAnimeRankings } = loadWidget({
    http: { async get() { calls += 1; } },
  });

  await assert.rejects(
    loadAnimeRankings({ apiBase: "http://rankings.example.test", window: "day" }),
    /HTTPS/,
  );
  assert.equal(calls, 0);
});

test("TMDB enrichment preserves ranking order and never exceeds four concurrent searches", { timeout: 5000 }, async () => {
  let active = 0;
  let maxActive = 0;
  const releases = [];
  const rankingItems = Array.from({ length: 8 }, (_, index) => ({
    canonicalId: "anilist:" + (index + 1),
    rank: index + 1,
    score: 1 - index / 10,
    format: "MOVIE",
    title: { english: "Film " + (index + 1) },
    startDate: { year: 2026, month: 1, day: index + 1 },
    sources: ["anilist"],
  }));
  const Widget = {
    http: {
      async get() {
        return { data: {
          schemaVersion: 1,
          window: "day",
          coverage: { expected: 24, actual: 24, ratio: 1 },
          items: rankingItems,
        } };
      },
    },
    tmdb: {
      get(endpoint, options) {
        assert.equal(endpoint, "search/movie");
        const params = options && options.params || {};
        active += 1;
        maxActive = Math.max(maxActive, active);
        return new Promise((resolve, reject) => {
          releases.push(() => {
            active -= 1;
            const number = Number(params.query.replace("Film ", ""));
            if (number === 5) {
              reject(new Error("one TMDB lookup failed"));
              return;
            }
            resolve({ results: [{
              id: number,
              title: params.query,
              original_title: params.query,
              release_date: "2026-01-01",
            }] });
          });
        });
      },
    },
  };
  const { loadAnimeRankings } = loadWidget(Widget);
  const pending = loadAnimeRankings({ apiBase: "https://rankings.example.test", window: "day" });

  async function waitForReleases(expected) {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      if (releases.length >= expected) return;
      await new Promise((resolve) => setImmediate(resolve));
    }
    assert.fail("timed out waiting for TMDB workers");
  }
  await waitForReleases(4);
  releases.splice(0, 4).forEach((release) => release());
  await waitForReleases(4);
  releases.splice(0, 4).forEach((release) => release());
  const items = await pending;

  assert.equal(maxActive, 4);
  assert.deepEqual(Array.from(items, (item) => item.tmdbId), [1, 2, 3, 4, 6, 7, 8]);
});
