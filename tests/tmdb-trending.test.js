// Approved direction: a standalone TMDB movie/TV day-week widget, separate from the Vercel anime service.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadWidget(Widget = {}) {
  const filename = path.join(__dirname, "../widgets/trending/tmdb-trending.js");
  const source = fs.readFileSync(filename, "utf8");
  const context = { Widget, console, encodeURIComponent, decodeURIComponent };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename });
  return context;
}

test("publishes separate movie and TV trending modules in the strict Forward runtime", () => {
  const context = loadWidget();

  assert.equal(context.WidgetMetadata.id, "tmdb.trending.v1");
  assert.deepEqual(
    Array.from(context.WidgetMetadata.modules, (module) => [module.id, module.functionName]),
    [
      ["tmdbMovieTrending", "loadMovieTrending"],
      ["tmdbTvTrending", "loadTvTrending"],
    ],
  );
  assert.equal(typeof context.loadMovieTrending, "function");
  assert.equal(typeof context.loadTvTrending, "function");
  assert.equal("setTimeout" in context, false);
  assert.equal("URL" in context, false);
});

test("movie day ranking calls TMDB trending and returns ranked Forward items", async () => {
  const calls = [];
  const Widget = {
    tmdb: {
      async get(endpoint, options) {
        calls.push({ endpoint, options });
        return { results: [{
          id: 101,
          title: "电影甲",
          original_title: "Movie A",
          overview: "电影简介",
          release_date: "2026-08-12",
          poster_path: "/movie.jpg",
          backdrop_path: "/movie-bg.jpg",
          vote_average: 8.3,
          genre_ids: [28, 12],
        }] };
      },
    },
  };
  const { loadMovieTrending } = loadWidget(Widget);

  const items = await loadMovieTrending({ window: "day", page: 2 });

  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{
    endpoint: "trending/movie/day",
    options: { params: { language: "zh-CN", page: 2 } },
  }]);
  assert.deepEqual(Array.from(items, (item) => ({
    id: item.id,
    tmdbId: item.tmdbId,
    type: item.type,
    mediaType: item.mediaType,
    title: item.title,
    description: item.description,
    releaseDate: item.releaseDate,
    posterPath: item.posterPath,
    backdropPath: item.backdropPath,
    rating: item.rating,
  })), [{
    id: 101,
    tmdbId: 101,
    type: "tmdb",
    mediaType: "movie",
    title: "#21 电影甲",
    description: "TMDB 全球电影日榜 · 电影简介",
    releaseDate: "2026-08-12",
    posterPath: "/movie.jpg",
    backdropPath: "/movie-bg.jpg",
    rating: 8.3,
  }]);
  assert.equal(items[0].poster_path, undefined);
  assert.equal(items[0].backdrop_path, undefined);
  assert.equal(items[0].overview, undefined);
});

test("TV week ranking uses TV identity and first-air metadata", async () => {
  const calls = [];
  const Widget = {
    tmdb: {
      async get(endpoint, options) {
        calls.push({ endpoint, options });
        return { results: [{
          id: 202,
          name: "剧集乙",
          original_name: "Show B",
          overview: "剧集简介",
          first_air_date: "2026-08-08",
          poster_path: "/tv.jpg",
          backdrop_path: "/tv-bg.jpg",
          vote_average: 8.8,
        }] };
      },
    },
  };
  const { loadTvTrending } = loadWidget(Widget);

  const items = await loadTvTrending({ window: "week", page: 1 });

  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{
    endpoint: "trending/tv/week",
    options: { params: { language: "zh-CN", page: 1 } },
  }]);
  assert.deepEqual(Array.from(items, (item) => ({
    id: item.id,
    tmdbId: item.tmdbId,
    type: item.type,
    mediaType: item.mediaType,
    title: item.title,
    description: item.description,
    releaseDate: item.releaseDate,
    year: item.year,
  })), [{
    id: 202,
    tmdbId: 202,
    type: "tmdb",
    mediaType: "tv",
    title: "#1 剧集乙",
    description: "TMDB 全球电视周榜 · 剧集简介",
    releaseDate: "2026-08-08",
    year: "2026",
  }]);
  assert.equal(items[0].first_air_date, undefined);
  assert.equal(items[0].original_name, undefined);
});

test("the two loaders cover all four day-week endpoints", async () => {
  const endpoints = [];
  const Widget = {
    tmdb: {
      async get(endpoint) {
        endpoints.push(endpoint);
        return { results: [] };
      },
    },
  };
  const { loadMovieTrending, loadTvTrending } = loadWidget(Widget);

  await loadMovieTrending({ window: "day" });
  await loadMovieTrending({ window: "week" });
  await loadTvTrending({ window: "day" });
  await loadTvTrending({ window: "week" });

  assert.deepEqual(endpoints, [
    "trending/movie/day",
    "trending/movie/week",
    "trending/tv/day",
    "trending/tv/week",
  ]);
});

test("rejects an unsupported window before TMDB and reports a missing TMDB runtime clearly", async () => {
  let calls = 0;
  const withTmdb = loadWidget({ tmdb: { async get() { calls += 1; } } });

  await assert.rejects(withTmdb.loadMovieTrending({ window: "month" }), /day 或 week/);
  assert.equal(calls, 0);

  const withoutTmdb = loadWidget();
  await assert.rejects(withoutTmdb.loadTvTrending({ window: "day" }), /Widget\.tmdb/);
});
