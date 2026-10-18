const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadWidget(Widget = {}) {
  const filename = path.join(__dirname, "../widgets/douban/douban-discovery.js");
  const source = fs.readFileSync(filename, "utf8");
  const context = { Widget, console, decodeURIComponent, encodeURIComponent };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename });
  return context;
}

function doubanCollectionItem(overrides = {}) {
  return {
    id: "36689816",
    title: "流人 第六季",
    original_title: null,
    type: "tv",
    year: "2026",
    rating: { value: 9.3 },
    card_subtitle: "2026 / 英国 美国 / 剧情 惊悚",
    ...overrides,
  };
}

function slowHorsesDetail(overrides = {}) {
  return {
    id: "36689816",
    type: "tv",
    title: "流人 第六季",
    original_title: "Slow Horses Season 6",
    aka: ["翻盘特工队(港)", "流放特务组(台)", "慢马"],
    year: "2026",
    card_subtitle: "2026 / 英国 美国 / 剧情 惊悚",
    intro: "第六季改编自《Joe Country》和《Slough House》。",
    cover_url: "https://img.example/slow-horses-6.jpg",
    rating: { count: 100, value: 9.3 },
    genres: ["剧情", "惊悚"],
    actors: [{ id: "1054418", name: "加里·奥德曼", avatar: "https://img.example/oldman.jpg" }],
    directors: [{ id: "1275010", name: "亚当·兰道", avatar: "https://img.example/randall.jpg" }],
    url: "https://movie.douban.com/subject/36689816/",
    ...overrides,
  };
}

test("season-labelled Douban TV maps to a TMDB series only when that exact season and year exist", async () => {
  const tmdbQueries = [];
  const Widget = {
    http: {
      async get(url) {
        if (url.includes("/subject_collection/")) {
          return { data: { subject_collection_items: [doubanCollectionItem()] } };
        }
        if (url.includes("/rexxar/api/v2/tv/36689816")) {
          return { data: slowHorsesDetail() };
        }
        throw new Error("unexpected Douban URL: " + url);
      },
    },
    tmdb: {
      async get(endpoint, options) {
        if (endpoint === "tv/95480") {
          return {
            id: 95480,
            name: "Slow Horses",
            original_name: "Slow Horses",
            first_air_date: "2022-04-01",
            seasons: [{ season_number: 6, air_date: "2026-10-14" }],
          };
        }
        assert.equal(endpoint, "search/tv");
        const query = options.params.query;
        tmdbQueries.push(query);
        if (query === "Slow Horses") {
          return {
            results: [{
              id: 95480,
              media_type: "tv",
              name: "Slow Horses",
              original_name: "Slow Horses",
              first_air_date: "2022-04-01",
            }],
          };
        }
        return { results: [] };
      },
    },
    storage: { get() { return null; }, set() {} },
  };
  const { loadPublicCollections } = loadWidget(Widget);

  const items = await loadPublicCollections({ collection: "tv_american", page: 1 });

  assert.deepEqual(Array.from(items, (item) => [item.type, item.id, item.mediaType]), [["tmdb", 95480, "tv"]]);
  assert.equal(items[0].season, 6);
  assert.equal(items[0].releaseDate, "2026-10-14");
  assert.equal(items[0].year, "2026");
  assert.equal(tmdbQueries.includes("流人 第六季"), true);
  assert.equal(tmdbQueries.includes("Slow Horses"), true);
});

test("season-labelled TV stays a module detail item when TMDB has no same-year season", async () => {
  const Widget = {
    http: {
      async get(url) {
        if (url.includes("/subject_collection/")) {
          return { data: { subject_collection_items: [doubanCollectionItem()] } };
        }
        if (url.includes("/rexxar/api/v2/tv/36689816")) {
          return { data: slowHorsesDetail() };
        }
        throw new Error("unexpected Douban URL: " + url);
      },
    },
    tmdb: {
      async get(endpoint, options) {
        if (endpoint === "tv/95480") {
          return {
            id: 95480,
            name: "Slow Horses",
            original_name: "Slow Horses",
            first_air_date: "2022-04-01",
            seasons: [{ season_number: 6, air_date: "2025-10-14" }],
          };
        }
        if (endpoint === "search/tv" && options.params.query === "Slow Horses") {
          return {
            results: [{
              id: 95480,
              media_type: "tv",
              name: "Slow Horses",
              original_name: "Slow Horses",
              first_air_date: "2022-04-01",
            }],
          };
        }
        return { results: [] };
      },
    },
    storage: { get() { return null; }, set() {} },
  };
  const { loadPublicCollections } = loadWidget(Widget);

  const [item] = await loadPublicCollections({ collection: "tv_american", page: 1 });

  assert.equal(item.type, "url");
  assert.equal(item.id, "36689816");
  assert.equal(item.link, "https://m.douban.com/tv/36689816");
});

test("loadDetail turns a Douban fallback link into a readable module-owned detail page", async () => {
  const calls = [];
  const Widget = {
    http: {
      async get(url) {
        calls.push(url);
        return { data: slowHorsesDetail() };
      },
    },
  };
  const { loadDetail } = loadWidget(Widget);

  const detail = await loadDetail("https://m.douban.com/tv/36689816");

  assert.match(calls[0], /\/rexxar\/api\/v2\/tv\/36689816$/);
  assert.equal(detail.type, "url");
  assert.equal(detail.id, "36689816");
  assert.equal(detail.link, "https://m.douban.com/tv/36689816");
  assert.equal(detail.title, "流人 第六季");
  assert.equal(detail.originalTitle, "Slow Horses Season 6");
  assert.equal(detail.description.includes("Joe Country"), true);
  assert.equal(detail.posterPath, "https://img.example/slow-horses-6.jpg");
  assert.equal(detail.rating, 9.3);
  assert.deepEqual(Array.from(detail.genreItems, (genre) => genre.title), ["剧情", "惊悚"]);
  assert.deepEqual(Array.from(detail.peoples, (person) => [person.title, person.role]), [
    ["加里·奥德曼", "演员"],
    ["亚当·兰道", "导演"],
  ]);
});

test("book and music subjects bypass TMDB and retain a usable Douban detail fallback", async () => {
  let tmdbCalls = 0;
  const Widget = {
    http: {
      async get(url) {
        if (url.includes("/rexxar/api/v2/book/1007305")) {
          return {
            data: {
              id: "1007305",
              type: "book",
              title: "红楼梦",
              card_subtitle: "(清)曹雪芹 / 1982 / 人民文学出版社",
              intro: "中国古典长篇小说。",
              cover_url: "https://img.example/red-chamber.jpg",
              rating: { count: 470216, value: 9.7 },
              author: ["(清)曹雪芹", "(清)无名氏"],
              url: "https://book.douban.com/subject/1007305/",
            },
          };
        }
        throw new Error("unexpected URL: " + url);
      },
    },
    tmdb: { async get() { tmdbCalls += 1; return { results: [] }; } },
  };
  const { loadCustomList, loadDetail } = loadWidget(Widget);

  Widget.http.get = async function (url) {
    if (url.includes("/rexxar/api/v2/doulist/1518184/items")) {
      return { data: { items: [{ target: { id: "1007305", type: "book", title: "红楼梦" } }] } };
    }
    if (url.includes("/rexxar/api/v2/book/1007305")) {
      return {
        data: {
          id: "1007305",
          type: "book",
          title: "红楼梦",
          card_subtitle: "(清)曹雪芹 / 1982 / 人民文学出版社",
          intro: "中国古典长篇小说。",
          cover_url: "https://img.example/red-chamber.jpg",
          rating: { count: 470216, value: 9.7 },
          author: ["(清)曹雪芹", "(清)无名氏"],
          url: "https://book.douban.com/subject/1007305/",
        },
      };
    }
    throw new Error("unexpected URL: " + url);
  };

  const [item] = await loadCustomList({ url: "https://m.douban.com/doulist/1518184", page: 1 });
  const detail = await loadDetail(item.link);

  assert.equal(tmdbCalls, 0);
  assert.deepEqual([item.type, item.link], ["url", "https://m.douban.com/book/1007305"]);
  assert.equal(detail.title, "红楼梦");
  assert.equal(detail.mediaType, undefined);
  assert.equal(detail.description, "中国古典长篇小说。");
  assert.equal(detail.peoples.some((person) => person.title === "(清)曹雪芹" && person.role === "作者"), true);
});

test("mixed books and music with the same numeric ID remain separate entries", async () => {
  const context = loadWidget({ http: { async get() { return { data: { subject_collection_items: [
    { id: "100", type: "book", title: "同号图书" },
    { id: "100", type: "music", title: "同号音乐" },
    { id: "100", type: "book", title: "同号图书" },
  ] } }; } } });
  const items = await context.loadRealtimeHot({ kind: "all" });
  assert.deepEqual(Array.from(items, (item) => item.link), ["https://m.douban.com/book/100", "https://m.douban.com/music/100"]);
});

test("duplicate source identities trigger only one mapping request", async () => {
  let calls = 0;
  const item = { id: "10", type: "movie", title: "唯一影片", year: "2020" };
  const context = loadWidget({
    http: { async get() { return { data: { subject_collection_items: [item, item] } }; } },
    tmdb: { async get() { calls += 1; return { results: [{ id: 20, title: "唯一影片", release_date: "2020-01-01" }] }; } },
  });
  const items = await context.loadPublicCollections({ collection: "movie_top250" });
  assert.equal(items.length, 1);
  assert.equal(calls, 1);
});

test("detail memory evicts old entries and rejects arbitrary detail URLs", async () => {
  let calls = 0;
  const context = loadWidget({ http: { async get(url) {
    calls += 1;
    return { data: { id: url.split("/").at(-1), type: "movie", title: "影片" } };
  } } });
  for (let id = 1; id <= 130; id += 1) await context.loadDetail("https://m.douban.com/movie/" + id);
  await context.loadDetail("https://m.douban.com/movie/1");
  assert.equal(calls, 131);
  await assert.rejects(context.loadDetail("https://example.com/movie/1"), /仅支持/);
  assert.equal(calls, 131);
});

test("alternative searches obey a four-request global limit and preserve source order", async () => {
  let active = 0;
  let maxActive = 0;
  const context = loadWidget({
    http: { async get(url) {
      if (url.includes("subject_collection")) return { data: { subject_collection_items: Array.from({ length: 6 }, (_, i) => ({ id: String(i + 1), title: "标题" + i, type: "movie", year: "2020" })) } };
      const id = url.split("/").at(-1);
      return { data: { id, title: "标题" + (Number(id) - 1), original_title: "Original " + id, aka: ["Alias " + id], type: "movie", year: "2020" } };
    } },
    tmdb: { async get() {
      active += 1; maxActive = Math.max(active, maxActive);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1; return { results: [] };
    } },
  });
  const items = await context.loadPublicCollections({ collection: "movie_top250" });
  assert.equal(maxActive, 4);
  assert.deepEqual(Array.from(items, (item) => item.id), ["1", "2", "3", "4", "5", "6"]);
});

test("enrichment matches a unique original movie title without weakening its year", async () => {
  const queries = [];
  const context = loadWidget({
    http: { async get(url) {
      if (url.includes("subject_collection")) return { data: { subject_collection_items: [{ id: "99", title: "另一译名", type: "movie" }] } };
      return { data: { id: "99", title: "另一译名", original_title: "Exact Original", year: "2024", type: "movie" } };
    } },
    tmdb: { async get(endpoint, options) {
      queries.push(options.params.query);
      return { results: options.params.query === "Exact Original" ? [
        { id: 1, title: "另一标题", original_title: "Exact Original", release_date: "2024-01-01" },
        { id: 2, title: "另一标题", original_title: "Exact Original", release_date: "2004-01-01" },
      ] : [] };
    } },
  });
  const [item] = await context.loadPublicCollections({ collection: "movie_top250" });
  assert.equal(item.type, "tmdb");
  assert.equal(item.id, 1);
  assert.deepEqual(queries, ["另一译名", "Exact Original"]);
});

test("an unavailable season candidate cannot establish uniqueness of another match", async () => {
  const details = [];
  const context = loadWidget({
    http: { async get(url) {
      return { data: url.includes("subject_collection") ? { subject_collection_items: [doubanCollectionItem()] } : slowHorsesDetail() };
    } },
    tmdb: { async get(endpoint, options) {
      if (endpoint.startsWith("tv/")) {
        details.push(endpoint);
        if (endpoint === "tv/1") throw new Error("temporarily unavailable");
        return { id: 2, seasons: [{ season_number: 6, air_date: "2026-01-01" }] };
      }
      return { results: options.params.query === "Slow Horses" ? [
        { id: 1, name: "Slow Horses", original_name: "Slow Horses" },
        { id: 2, name: "Slow Horses", original_name: "Slow Horses" },
      ] : [] };
    } },
  });
  const [item] = await context.loadPublicCollections({ collection: "tv_american" });
  assert.equal(item.type, "url");
  assert.deepEqual(details.sort(), ["tv/1", "tv/2"]);
});

function seasonFixtureWidget(saved = new Map(), counters = { search: 0 }) {
  const subjects = [
    { id: "9101", type: "tv", title: "示例剧 第一季", original_title: "Example Show Season 1", year: "2020" },
    { id: "9102", type: "tv", title: "示例剧 第二季", original_title: "Example Show Season 2", year: "2021" },
  ];
  return {
    subjects,
    Widget: {
      http: { async get(url) {
        if (url.includes("subject_collection")) return { data: { subject_collection_items: subjects } };
        return { data: subjects.find((subject) => url.endsWith("/" + subject.id)) };
      } },
      tmdb: { async get(endpoint, options) {
        if (endpoint === "tv/42") return { id: 42, seasons: [
          { season_number: 1, air_date: "2020-02-03" },
          { season_number: 2, air_date: "2021-04-05" },
        ] };
        counters.search += 1;
        return { results: ["Example Show", "示例剧"].includes(options.params.query) ? [
          { id: 42, media_type: "tv", name: "示例剧", original_name: "Example Show", first_air_date: "2020-02-03", overview: "TMDB 简介", poster_path: "/show.jpg" },
        ] : [] };
      } },
      storage: { get(key) { return saved.get(key); }, set(key, value) { saved.set(key, value); } },
    },
  };
}

test("seasons sharing one TMDB series retain independent navigable identities and matched air dates", async () => {
  const { Widget } = seasonFixtureWidget();
  const context = loadWidget(Widget);
  const items = await context.loadPublicCollections({ collection: "tv_american" });
  assert.equal(items.length, 2, "different Douban seasons must never deduplicate into their shared TMDB series");
  assert.deepEqual(Array.from(items, (item) => [item.type, item.id, item.season]), [["tmdb", 42, 1], ["tmdb", 42, 2]]);
  assert.deepEqual(Array.from(items, (item) => item.year), ["2020", "2021"]);
  assert.deepEqual(Array.from(items, (item) => item.releaseDate), ["2020-02-03", "2021-04-05"]);
  assert.equal(items[1].title, "示例剧 第二季");
  const second = await context.loadDetail("https://m.douban.com/tv/9102");
  assert.equal(second.year, "2021");
});

test("season mapping cache preserves the matched season date across widget reloads", async () => {
  const saved = new Map();
  const counters = { search: 0 };
  const { Widget, subjects } = seasonFixtureWidget(saved, counters);
  const firstContext = loadWidget(Widget);
  const first = await firstContext.mapSubjects([subjects[1]], "tv");
  const searchCount = counters.search;
  const secondContext = loadWidget(Widget);
  const cached = await secondContext.mapSubjects([subjects[1]], "tv");
  assert.equal(counters.search, searchCount);
  assert.equal(first[0].year, "2021");
  assert.equal(cached[0].year, "2021");
  assert.equal(cached[0].releaseDate, "2021-04-05");
  assert.equal(cached[0].id, first[0].id);
  assert.equal(cached[0].season, 2);
});

test("old series-only mapping cache cannot restore an incorrect season year", async () => {
  const saved = new Map();
  const { Widget, subjects } = seasonFixtureWidget(saved);
  const context = loadWidget(Widget);
  const subject = context.normalizeDoubanSubject(subjects[1], "tv");
  const oldKey = ["douban_tmdb_v2", subject.id, subject.type, subject.year, context.normalizeIdentityTitle(subject.title), context.normalizeIdentityTitle(subject.originalTitle)].map((part) => encodeURIComponent(String(part || ""))).join(":");
  saved.set(oldKey, { expiresAt: Date.now() + 100000, candidate: { id: 42, name: "示例剧", first_air_date: "2020-02-03" } });
  const [item] = await context.mapSubjects([subjects[1]], "tv");
  assert.equal(item.year, "2021");
  assert.equal(item.releaseDate, "2021-04-05");
});

test("cached season identity retains detail enrichment when list metadata omits year or season title", async () => {
  for (const sparse of [
    { year: undefined },
    { year: undefined, title: "本地译名", original_title: "" },
  ]) {
    const saved = new Map();
    const counters = { search: 0 };
    const { Widget, subjects } = seasonFixtureWidget(saved, counters);
    const input = { ...subjects[1], ...sparse };
    const first = await loadWidget(Widget).mapSubjects([input], "tv");
    const searchCount = counters.search;
    const cached = await loadWidget(Widget).mapSubjects([input], "tv");
    assert.equal(counters.search, searchCount);
    for (const item of [first[0], cached[0]]) {
      assert.equal(item.type, "tmdb");
      assert.equal(item.season, 2);
      assert.equal(item.title, "示例剧 第二季");
      assert.equal(item.year, "2021");
      assert.equal(item.releaseDate, "2021-04-05");
    }
  }
});
