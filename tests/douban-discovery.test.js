const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadWidget(Widget = {}, overrides = {}) {
  const filename = path.join(__dirname, "../widgets/douban/douban-discovery.js");
  const source = fs.readFileSync(filename, "utf8");
  const context = {
    Widget,
    console,
    decodeURIComponent,
    encodeURIComponent,
    ...overrides,
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename });
  return context;
}

test("publishes categorized discovery modules and preserves existing module IDs", () => {
  const source = fs.readFileSync(path.join(__dirname, "../widgets/douban/douban-discovery.js"), "utf8");
  const context = loadWidget();

  assert.match(source, /^\/\/[^\n]*\nWidgetMetadata\s*=/);
  assert.doesNotMatch(source, /\b(?:var|let|const)\s+WidgetMetadata\b/);
  assert.deepEqual(
    Array.from(context.WidgetMetadata.modules, (module) => [module.id, module.functionName]),
    [
      ["doubanPublic", "loadPublicCollections"],
      ["doubanMovies", "loadMovieCatalog"],
      ["doubanTelevision", "loadTvCatalog"],
      ["doubanRealtime", "loadRealtimeHot"],
      ["doubanCustomList", "loadCustomList"],
      ["doubanRecommendations", "loadRecommendations"],
      ["doubanExplore", "loadPreferenceExplore"],
      ["doubanInterests", "loadInterests"],
      ["doubanPersonalized", "loadPersonalized"],
      ["doubanPeople", "loadPeopleWorks"],
    ],
  );
  for (const module of context.WidgetMetadata.modules) {
    assert.equal(typeof context[module.functionName], "function");
  }
});

test("metadata exposes every public capability with unique parameter names", () => {
  const { WidgetMetadata } = loadWidget();
  const namesById = Object.fromEntries(Array.from(WidgetMetadata.modules, (module) => [
    module.id,
    Array.from(module.params, (param) => param.name),
  ]));

  assert.deepEqual(namesById, {
    doubanPublic: ["collection", "page"],
    doubanMovies: ["category", "recent", "classic", "underrated", "region", "genre", "yearly", "sort", "page"],
    doubanTelevision: ["category", "classic", "recent", "underrated", "genre", "yearly", "sort", "page"],
    doubanRealtime: ["kind", "page"],
    doubanCustomList: ["url", "page"],
    doubanRecommendations: ["mediaType", "movieCategory", "movieRegion", "tvRegion", "page"],
    doubanExplore: ["mediaType", "movieGenre", "tvGenre", "movieRegion", "tvRegion", "year", "platform", "tags", "minRating", "sort", "offset"],
    doubanInterests: ["userId", "status", "page"],
    doubanPersonalized: ["cookie", "mediaType", "page"],
    doubanPeople: ["person", "sort", "page"],
  });
  const publicModule = WidgetMetadata.modules.find((module) => module.id === "doubanPublic");
  const collectionValues = publicModule.params[0].enumOptions.map((option) => option.value);
  assert.equal(publicModule.title, "豆瓣一周口碑");
  assert.deepEqual(Array.from(collectionValues), ["movie_weekly", "tv_chinese_best", "tv_global_best", "show_chinese_best", "show_global_best"]);
  assert.equal(collectionValues.some((value) => value.startsWith("tag_")), false);
  const customModule = WidgetMetadata.modules.find((module) => module.id === "doubanCustomList");
  const customPlaceholders = customModule.params[0].placeholders;
  assert.equal(customPlaceholders.length, 3);
  assert.equal(customPlaceholders.every((option) => option.value.includes("/doulist/")), true);
});

test("movie and television categories expose only their own conditional subfilters", () => {
  const { WidgetMetadata } = loadWidget();
  const movies = WidgetMetadata.modules.find((module) => module.id === "doubanMovies");
  const tv = WidgetMetadata.modules.find((module) => module.id === "doubanTelevision");
  assert.deepEqual(Array.from(movies.params[0].enumOptions, (x) => x.title), ["全部", "近期热门", "高分经典", "冷门佳作", "地区佳作", "分类题材", "年度榜单"]);
  assert.deepEqual(Array.from(tv.params[0].enumOptions, (x) => x.title), ["全部", "高分经典", "近期热门", "冷门佳作", "分类题材", "年度榜单"]);
  for (const module of [movies, tv]) {
    const categories = Array.from(module.params[0].enumOptions, (x) => x.value);
    for (const param of module.params.filter((x) => x.belongTo)) {
      assert.equal(param.belongTo.paramName, "category");
      assert.equal(Array.from(param.belongTo.value).every((value) => categories.includes(value)), true);
    }
  }
  const realtime = WidgetMetadata.modules.find((module) => module.id === "doubanRealtime");
  assert.deepEqual(Array.from(realtime.params[0].enumOptions, (x) => x.title), ["书影音", "电影榜", "电视榜"]);
});

test("public collections paginate and select the evidence-backed TMDB result instead of the first result", async () => {
  const calls = [];
  const Widget = {
    http: {
      async get(url) {
        calls.push(url);
        return {
          data: {
            subject_collection_items: [{
              id: "1295644",
              title: "这个杀手不太冷",
              original_title: "Léon",
              type: "movie",
              year: "1994",
              rating: { value: 9.4 },
            }],
          },
        };
      },
    },
    tmdb: {
      async get(endpoint) {
        assert.equal(endpoint, "search/movie");
        return {
          results: [
            { id: 999, media_type: "movie", title: "这个杀手不太冷", original_title: "Léon", release_date: "2018-01-01" },
            { id: 101, media_type: "movie", title: "这个杀手不太冷", original_title: "Léon", release_date: "1994-09-14" },
          ],
        };
      },
    },
    storage: { get() { return null; }, set() {} },
  };
  const { loadPublicCollections } = loadWidget(Widget);

  const items = await loadPublicCollections({ collection: "movie_top250", page: 2 });

  assert.equal(calls.length, 1);
  assert.match(calls[0], /subject_collection\/movie_top250\/items/);
  assert.match(calls[0], /start=20/);
  assert.match(calls[0], /count=20/);
  assert.deepEqual(
    Array.from(items, (item) => ({ id: item.id, tmdbId: item.tmdbId, type: item.type, mediaType: item.mediaType })),
    [{ id: 101, tmdbId: 101, type: "tmdb", mediaType: "movie" }],
  );
});

test("every public collection has an explicit media type instead of relying on its key prefix", async () => {
  const tmdbEndpoints = [];
  const Widget = {
    http: {
      async get() {
        return { data: { subject_collection_items: [{ id: "oscar-1", title: "奥斯卡电影" }] } };
      },
    },
    tmdb: {
      async get(endpoint) {
        tmdbEndpoints.push(endpoint);
        return { results: [] };
      },
    },
  };
  const { loadPublicCollections } = loadWidget(Widget);

  const items = await loadPublicCollections({ collection: "oscars_97", page: 1 });

  assert.deepEqual(tmdbEndpoints, ["search/movie"]);
  assert.equal(items[0].type, "url");
  assert.equal(items[0].mediaType, "movie");
});

test("strict TMDB matching keeps an ambiguous or season-weakened subject as a module-owned detail", async () => {
  const Widget = {
    http: {
      async get() {
        return {
          data: {
            subject_collection_items: [{
              id: "35580265",
              title: "星城 第二季",
              original_title: "Star City Season 2",
              type: "tv",
              year: "2026",
            }],
          },
        };
      },
    },
    tmdb: {
      async get() {
        return {
          results: [
            { id: 1, media_type: "tv", name: "星城", original_name: "Star City", first_air_date: "2026-05-29" },
            { id: 2, media_type: "tv", name: "星城 第二季", original_name: "Star City Season 2", first_air_date: "2026-01-01" },
            { id: 3, media_type: "tv", name: "星城 第二季", original_name: "Star City Season 2", first_air_date: "2026-08-01" },
          ],
        };
      },
    },
    storage: { get() { return null; }, set() {} },
  };
  const { loadPublicCollections } = loadWidget(Widget);

  const items = await loadPublicCollections({ collection: "tv_american", page: 1 });

  assert.deepEqual(
    Array.from(items, (item) => ({ id: item.id, type: item.type, title: item.title })),
    [{ id: "35580265", type: "url", title: "星城 第二季" }],
  );
});

test("custom lists support only HTTPS Doulist and subject-collection URLs and preserve pagination", async () => {
  const calls = [];
  const Widget = {
    http: {
      async get(url) {
        calls.push(url);
        if (url.includes("/doulist/1518184/")) {
          return { data: { items: [{ target_id: "11", title: "电影甲", type: "movie" }] } };
        }
        return { data: { subject_collection_items: [{ id: "22", title: "剧集乙", type: "tv" }] } };
      },
    },
  };
  const { loadCustomList } = loadWidget(Widget);

  const doulist = await loadCustomList({ url: "https://www.douban.com/doulist/1518184/", page: 2 });
  const collection = await loadCustomList({ url: "https://m.douban.com/subject_collection/tv_hot", page: 3 });

  assert.deepEqual(Array.from(doulist, (item) => [item.id, item.type]), [["11", "url"]]);
  assert.deepEqual(Array.from(collection, (item) => [item.id, item.type]), [["22", "url"]]);
  assert.match(calls[0], /start=25/);
  assert.match(calls[0], /count=25/);
  assert.match(calls[1], /start=40/);
  assert.match(calls[1], /count=20/);
  const countBeforeReject = calls.length;
  await assert.rejects(
    loadCustomList({ url: "https://evil.example/doulist/1518184", page: 1 }),
    /仅支持豆瓣 HTTPS/,
  );
  assert.equal(calls.length, countBeforeReject);
});

test("recommendations accept every supported region but reject invalid media-category combinations", async () => {
  const calls = [];
  const Widget = {
    http: {
      async get(url) {
        calls.push(url);
        return { data: { items: [{ id: String(calls.length), title: "条目" + calls.length, type: url.includes("/movie/") ? "movie" : "tv" }] } };
      },
    },
  };
  const { loadRecommendations } = loadWidget(Widget);

  const movie = await loadRecommendations({ mediaType: "movie", category: "热门", region: "欧美", page: 2 });
  const tv = await loadRecommendations({ mediaType: "tv", category: "tv", region: "tv_american", page: 1 });
  const show = await loadRecommendations({ mediaType: "tv", category: "show", region: "show_domestic", page: 1 });
  const countBeforeReject = calls.length;
  await assert.rejects(
    loadRecommendations({ mediaType: "movie", category: "show", region: "show_domestic", page: 1 }),
    /不支持的推荐组合/,
  );

  assert.deepEqual([movie[0].id, tv[0].id, show[0].id], ["1", "2", "3"]);
  assert.match(calls[0], /\/subject\/recent_hot\/movie\?/);
  assert.match(calls[0], /start=20/);
  assert.match(calls[0], /category=%E7%83%AD%E9%97%A8/);
  assert.match(calls[0], /type=%E6%AC%A7%E7%BE%8E/);
  assert.match(calls[1], /\/subject\/recent_hot\/tv\?/);
  assert.match(calls[1], /category=tv/);
  assert.match(calls[1], /type=tv_american/);
  assert.match(calls[2], /category=show/);
  assert.match(calls[2], /type=show_domestic/);
  assert.equal(calls.length, countBeforeReject);
});

test("preference exploration keeps offset and count separate and forwards every filter", async () => {
  const calls = [];
  const Widget = {
    http: {
      async get(url) {
        calls.push(url);
        return { data: { items: [{ card: "subject", id: "301", title: "星城", type: "tv", year: "2026" }] } };
      },
    },
  };
  const { loadPreferenceExplore } = loadWidget(Widget);

  const items = await loadPreferenceExplore({
    mediaType: "tv",
    format: "电视剧",
    genre: "科幻",
    region: "美国",
    year: "2026",
    platform: "Apple TV+",
    tags: "太空,火星",
    minRating: "8",
    sort: "U",
    offset: 40,
  });

  assert.equal(items[0].id, "301");
  const url = new URL(calls[0]);
  assert.equal(url.pathname, "/rexxar/api/v2/tv/recommend");
  assert.equal(url.searchParams.get("start"), "40");
  assert.equal(url.searchParams.get("count"), "20");
  assert.equal(url.searchParams.get("score_range"), "8,10");
  assert.equal(url.searchParams.get("sort"), "U");
  assert.deepEqual(JSON.parse(url.searchParams.get("selected_categories")), {
    "类型": "科幻",
    "地区": "美国",
    "形式": "电视剧",
  });
  assert.equal(url.searchParams.get("tags"), "科幻,电视剧,美国,2026,Apple TV+,太空,火星");
});

test("interests paginate wanted, watching, and watched lists without sending a Cookie", async () => {
  const calls = [];
  const Widget = {
    http: {
      async get(url, options) {
        calls.push({ url, options });
        return { data: { interests: [{ subject: { id: "401", title: "想看片", type: "movie" } }] } };
      },
    },
  };
  const { loadInterests } = loadWidget(Widget);

  const items = await loadInterests({ userId: "user name", status: "mark", page: 2 });

  assert.deepEqual(Array.from(items, (item) => [item.id, item.type]), [["401", "url"]]);
  assert.match(calls[0].url, /\/user\/user%20name\/interests/);
  assert.match(calls[0].url, /status=mark/);
  assert.match(calls[0].url, /start=20/);
  assert.equal(Object.prototype.hasOwnProperty.call(calls[0].options.headers, "Cookie"), false);
});

test("random wanted items return at most nine unique subjects and scan no more than five pages", async () => {
  const calls = [];
  const Widget = {
    http: {
      async get(url) {
        calls.push(url);
        const start = Number(new URL(url).searchParams.get("start"));
        return {
          data: {
            interests: Array.from({ length: 50 }, (_, index) => ({
              subject: { id: String(start + index + 1), title: "片" + (start + index + 1), type: "movie" },
            })),
          },
        };
      },
    },
  };
  const { loadInterests } = loadWidget(Widget);

  const items = await loadInterests({ userId: "u1", status: "random_mark", page: 1 });
  const requestCount = calls.length;
  const secondPage = await loadInterests({ userId: "u1", status: "random_mark", page: 2 });

  assert.equal(items.length, 9);
  assert.equal(new Set(Array.from(items, (item) => item.id)).size, 9);
  assert.equal(requestCount, 5);
  assert.equal(calls.length, requestCount);
  assert.deepEqual(Array.from(secondPage), []);
});

test("personalized recommendations require a Cookie and never leak it to TMDB or logs", async () => {
  const secret = "dbcl2=private; ck=abc123";
  const httpCalls = [];
  const tmdbCalls = [];
  const logs = [];
  const Widget = {
    http: {
      async get(url, options) {
        httpCalls.push({ url, options });
        return { data: { items: [{ id: "501", title: "推荐片", type: "movie", year: "2020" }] }, status: 200 };
      },
    },
    tmdb: {
      async get(endpoint, options) {
        tmdbCalls.push({ endpoint, options });
        return { results: [] };
      },
    },
  };
  const quietConsole = {
    log(...args) { logs.push(args.join(" ")); },
    debug(...args) { logs.push(args.join(" ")); },
    error(...args) { logs.push(args.join(" ")); },
  };
  const { loadPersonalized } = loadWidget(Widget, { console: quietConsole });

  await assert.rejects(loadPersonalized({ mediaType: "movie", page: 1 }), /Cookie/);
  assert.equal(httpCalls.length, 0);
  const items = await loadPersonalized({ cookie: secret, mediaType: "movie", page: 2 });

  assert.equal(items[0].id, "501");
  assert.equal(httpCalls.filter((call) => call.options.headers.Cookie).length, 1);
  assert.equal(httpCalls.slice(1).every((call) => !call.options.headers.Cookie), true);
  assert.match(httpCalls[0].url, /^https:\/\/m\.douban\.com\//);
  assert.match(httpCalls[0].url, /start=20/);
  assert.match(httpCalls[0].url, /ck=abc123/);
  assert.equal(httpCalls[0].options.headers.Cookie, secret);
  assert.equal(httpCalls[0].options.allow_redirects, false);
  assert.equal(JSON.stringify(tmdbCalls).includes(secret), false);
  assert.equal(logs.join("\n").includes(secret), false);
});

test("people works accept a Douban celebrity ID or a unique exact name and reject ambiguous names", async () => {
  const calls = [];
  const Widget = {
    http: {
      async get(url) {
        calls.push(url);
        if (url.includes("/j/subject_suggest")) {
          const query = new URL(url).searchParams.get("q");
          if (query === "同名演员") {
            return { data: [
              { type: "celebrity", id: "71", title: "同名演员" },
              { type: "celebrity", id: "72", title: "同名演员" },
            ] };
          }
          return { data: [
            { type: "movie", id: "1", title: "周星驰" },
            { type: "celebrity", id: "456", title: "周星驰" },
          ] };
        }
        const actorId = url.match(/celebrity\/(\d+)/)[1];
        return { data: { works: [{ work: { id: actorId + "01", title: "作品" + actorId, type: "movie" } }] } };
      },
    },
  };
  const { loadPeopleWorks } = loadWidget(Widget);

  const direct = await loadPeopleWorks({ person: "https://movie.douban.com/celebrity/123/", sort: "time", page: 2 });
  const exactName = await loadPeopleWorks({ person: "周星驰", sort: "vote", page: 1 });
  const callsBeforeAmbiguous = calls.length;
  await assert.rejects(loadPeopleWorks({ person: "同名演员", page: 1 }), /唯一匹配/);

  assert.equal(direct[0].id, "12301");
  assert.equal(exactName[0].id, "45601");
  assert.equal(calls.some((url) => url.includes("subject_suggest") && url.includes(encodeURIComponent("周星驰"))), true);
  const directWorkCall = calls.find((url) => url.includes("/celebrity/123/works"));
  assert.match(directWorkCall, /start=50/);
  assert.match(directWorkCall, /count=50/);
  assert.match(directWorkCall, /sort=time/);
  assert.equal(calls.length, callsBeforeAmbiguous + 1);
});

test("TMDB enrichment uses at most four concurrent requests and preserves Douban order", async () => {
  let active = 0;
  let maxActive = 0;
  const Widget = {
    http: {
      async get() {
        return {
          data: {
            subject_collection_items: Array.from({ length: 8 }, (_, index) => ({
              id: String(index + 1),
              title: "影片" + (index + 1),
              type: "movie",
            })),
          },
        };
      },
    },
    tmdb: {
      async get(endpoint, options) {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
        const title = options.params.query;
        return { results: [{ id: Number(title.slice(2)), media_type: "movie", title }] };
      },
    },
  };
  const { loadPublicCollections } = loadWidget(Widget);

  const items = await loadPublicCollections({ collection: "movie_top250", page: 1 });

  assert.equal(maxActive, 4);
  assert.deepEqual(Array.from(items, (item) => item.title), [
    "影片1", "影片2", "影片3", "影片4", "影片5", "影片6", "影片7", "影片8",
  ]);
});

test("a cached strict TMDB identity survives a later TMDB outage", async () => {
  const values = new Map();
  let tmdbOnline = true;
  let tmdbCalls = 0;
  const Widget = {
    http: {
      async get() {
        return { data: { subject_collection_items: [{ id: "601", title: "缓存电影", type: "movie", year: "2024" }] } };
      },
    },
    tmdb: {
      async get() {
        tmdbCalls += 1;
        if (!tmdbOnline) throw new Error("offline");
        return { results: [{ id: 606, media_type: "movie", title: "缓存电影", release_date: "2024-01-01" }] };
      },
    },
    storage: {
      get(key) { return values.get(key); },
      set(key, value) { values.set(key, value); },
    },
  };
  const { loadPublicCollections } = loadWidget(Widget);

  const first = await loadPublicCollections({ collection: "movie_top250", page: 1 });
  tmdbOnline = false;
  const second = await loadPublicCollections({ collection: "movie_top250", page: 1 });

  assert.equal(first[0].tmdbId, 606);
  assert.equal(second[0].tmdbId, 606);
  assert.equal(tmdbCalls, 1);
  assert.equal(values.size, 1);
});

test("list output deduplicates stable identities without deleting same-title different works", async () => {
  const Widget = {
    http: {
      async get() {
        return { data: { subject_collection_items: [
          { id: "701", title: "同名电影", type: "movie", year: "2001" },
          { id: "701", title: "同名电影", type: "movie", year: "2001" },
          { id: "702", title: "同名电影", type: "movie", year: "2020" },
        ] } };
      },
    },
  };
  const { loadPublicCollections } = loadWidget(Widget);

  const items = await loadPublicCollections({ collection: "movie_top250", page: 1 });

  assert.deepEqual(Array.from(items, (item) => item.id), ["701", "702"]);
});

test("public collections use Makka's tag adapters only as automatic empty-result fallbacks", async () => {
  const calls = [];
  const Widget = {
    http: {
      async get(url) {
        calls.push(url);
        if (url.includes("/subject_collection/")) {
          return { data: { subject_collection_items: [] } };
        }
        return { data: { subjects: [{ id: "801", title: "热门电影", rate: "8.8", cover: "https://img.example/801.jpg" }] } };
      },
    },
  };
  const { loadPublicCollections } = loadWidget(Widget);

  const items = await loadPublicCollections({ collection: "movie_hot", page: 2 });

  assert.equal(items[0].id, "801");
  assert.equal(items[0].mediaType, "movie");
  assert.equal(items[0].rating, 8.8);
  assert.equal(items[0].posterPath, "https://img.example/801.jpg");
  assert.equal(calls.length, 2);
  assert.match(calls[0], /\/subject_collection\/movie_real_time_hotest\/items/);
  assert.match(calls[1], /^https:\/\/movie\.douban\.com\/j\/search_subjects\?/);
  const url = new URL(calls[1]);
  assert.equal(url.searchParams.get("type"), "movie");
  assert.equal(url.searchParams.get("tag"), "热门");
  assert.equal(url.searchParams.get("page_start"), "20");
  assert.equal(url.searchParams.get("page_limit"), "20");
});

test("public highlights replace Huang's external Gist carousel with twelve live Douban items", async () => {
  const calls = [];
  const Widget = {
    http: {
      async get(url) {
        calls.push(url);
        const collection = url.match(/subject_collection\/([^/]+)/)[1];
        const type = collection.startsWith("movie") ? "movie" : "tv";
        return {
          data: {
            subject_collection_items: Array.from({ length: 4 }, (_, index) => ({
              id: collection + "-" + index,
              title: collection + " " + index,
              type,
            })),
          },
        };
      },
    },
  };
  const { loadPublicCollections } = loadWidget(Widget);

  const items = await loadPublicCollections({ collection: "highlights", page: 1 });
  const secondPage = await loadPublicCollections({ collection: "highlights", page: 2 });

  assert.equal(calls.length, 4);
  assert.equal(items.length, 12);
  assert.equal(new Set(Array.from(items, (item) => item.id)).size, 12);
  assert.deepEqual(Array.from(secondPage), []);
  for (const collection of ["movie_hot_gaia", "tv_hot", "show_hot", "tv_animation"]) {
    assert.equal(calls.some((url) => url.includes("/subject_collection/" + collection + "/items")), true);
  }
});

test("source-level HTTP failures reject instead of becoming fake empty or text items", async () => {
  const Widget = {
    http: {
      async get() {
        return { status: 429, data: { message: "rate limited" } };
      },
    },
  };
  const { loadPublicCollections } = loadWidget(Widget);

  await assert.rejects(
    loadPublicCollections({ collection: "movie_top250", page: 1 }),
    /豆瓣请求失败: 429/,
  );
});

test("movie catalog routes curated categories to valid APIs and preserves pagination", async () => {
  const calls = [];
  const context = loadWidget({ http: { async get(url) {
    calls.push(new URL(url));
    return { data: { items: [], subject_collection_items: [] } };
  } } });
  await context.loadMovieCatalog({ category: "recent", recent: "new:日本", page: 2 });
  assert.equal(calls[0].searchParams.get("category"), "最新");
  assert.equal(calls[0].searchParams.get("type"), "日本");
  assert.equal(calls[0].searchParams.get("start"), "20");
  await context.loadMovieCatalog({ category: "classic", classic: "top250" });
  assert.match(calls[1].pathname, /subject_collection\/movie_top250\/items$/);
  await context.loadMovieCatalog({ category: "underrated", underrated: "华语" });
  assert.equal(calls[2].searchParams.get("category"), "冷门佳片");
  await context.loadMovieCatalog({ category: "region", region: "法国", page: 3 });
  assert.equal(calls[3].pathname, "/rexxar/api/v2/movie/recommend");
  assert.equal(calls[3].searchParams.get("score_range"), "8,10");
  assert.equal(calls[3].searchParams.get("tags"), "法国");
  assert.equal(calls[3].searchParams.get("start"), "40");
  await context.loadMovieCatalog({ category: "genre", genre: "科幻", sort: "R" });
  assert.equal(calls[4].searchParams.get("tags"), "科幻");
  assert.equal(calls[4].searchParams.get("sort"), "R");
  await assert.rejects(context.loadMovieCatalog({ category: "recent", recent: "show:tv" }), /不支持/);
  assert.equal(calls.length, 5);
});

test("TV catalog separates recent shows and variety and forwards genre/format together", async () => {
  const calls = [];
  const context = loadWidget({ http: { async get(url) {
    calls.push(new URL(url)); return { data: { items: [] } };
  } } });
  await context.loadTvCatalog({ category: "recent", recent: "tv_japanese" });
  await context.loadTvCatalog({ category: "recent", recent: "show_domestic" });
  await context.loadTvCatalog({ category: "genre", genre: "show:真人秀", page: 2 });
  assert.equal(calls[0].searchParams.get("category"), "tv");
  assert.equal(calls[0].searchParams.get("type"), "tv_japanese");
  assert.equal(calls[1].searchParams.get("category"), "show");
  assert.equal(calls[1].searchParams.get("type"), "show_domestic");
  assert.equal(calls[2].searchParams.get("tags"), "真人秀,综艺");
  assert.equal(JSON.parse(calls[2].searchParams.get("selected_categories"))["形式"], "综艺");
  assert.equal(calls[2].searchParams.get("start"), "20");
});

test("weekly and realtime lists select separate source collections", async () => {
  const calls = [];
  const context = loadWidget({ http: { async get(url) {
    calls.push(new URL(url)); return { data: { subject_collection_items: [] } };
  } } });
  for (const collection of ["movie_weekly", "tv_chinese_best", "tv_global_best", "show_chinese_best", "show_global_best"]) {
    await context.loadPublicCollections({ collection });
  }
  for (const kind of ["all", "movie", "tv"]) await context.loadRealtimeHot({ kind });
  assert.deepEqual(calls.map((url) => url.pathname.split("/").at(-2)), [
    "movie_weekly_best", "tv_chinese_best_weekly", "tv_global_best_weekly", "show_chinese_best_weekly", "show_global_best_weekly",
    "subject_real_time_hotest", "movie_real_time_hotest", "tv_real_time_hotest",
  ]);
  await assert.rejects(context.loadRealtimeHot({ kind: "unknown" }), /不支持/);
  assert.equal(calls.length, 8);
});

test("TV cold picks use original regional charts without a local score/vote filter", async () => {
  const calls = [];
  const context = loadWidget({ http: { async get(url) {
    calls.push(new URL(url)); return { data: { subject_collection_items: [
      { type: "tv", id: "1", title: "原榜收录", rating: { value: 7.9, count: 99999 } },
    ] } };
  } } });
  const expected = { "美剧": "ECGI5HUQI", "大陆剧": "ECRI46YZQ", "日剧": "ECEA5DW5Q", "韩剧": "ECZY5IDOY" };
  for (const [region, id] of Object.entries(expected)) {
    const items = await context.loadTvCatalog({ category: "underrated", underrated: region, page: 2 });
    assert.equal(items.length, 1, "keep original chart membership independent of rating or vote count");
    const url = calls.at(-1);
    assert.equal(url.pathname, "/rexxar/api/v2/subject_collection/" + id + "/items");
    assert.equal(url.searchParams.get("start"), "20");
    assert.equal(url.searchParams.has("score_range"), false);
  }
});

test("TV classic and regional genre options load their exact native collections", async () => {
  const calls = [];
  const context = loadWidget({ http: { async get(url) {
    calls.push(new URL(url)); return { data: { subject_collection_items: [] } };
  } } });
  const module = context.WidgetMetadata.modules.find((m) => m.id === "doubanTelevision");
  const classics = module.params.find((p) => p.name === "classic").enumOptions;
  const cold = module.params.find((p) => p.name === "underrated").enumOptions;
  const genres = module.params.find((p) => p.name === "genre").enumOptions;
  assert.equal(classics.length, 9);
  assert.equal(cold.length, 9);
  assert.equal(genres.length, 33);
  const scifi = genres.find((option) => option.title === "美剧·科幻");
  assert.equal(scifi.value, "native:ECL45GQ4I");
  await context.loadTvCatalog({ category: "classic", classic: "美剧" });
  await context.loadTvCatalog({ category: "genre", genre: scifi.value });
  const empty = await context.loadTvCatalog({ category: "underrated", underrated: "欧洲剧" });
  assert.match(calls[0].pathname, /ECVACWVGI\/items$/);
  assert.match(calls[1].pathname, /ECL45GQ4I\/items$/);
  assert.match(calls[2].pathname, /ECTM5JVYA\/items$/);
  assert.equal(empty.length, 0, "an empty official chart remains empty instead of inventing replacements");
});

test("recommendation ads and malformed subjects never become blank or fabricated detail cards", async () => {
  const context = loadWidget({ http: { async get() { return { data: { items: [
    { type: "ad", data: { id: "advert", title: "广告" } },
    { type: "ad", id: "advert", title: "广告" },
    { card: "subject", type: "movie", id: "123", title: "有效电影" },
    { card: "doulist", id: "456", title: "推荐片单" },
    { type: "movie", id: "789" },
    { type: "movie", title: "没有 ID" },
  ] } }; } } });
  const items = await context.loadPreferenceExplore({ mediaType: "movie", sort: "T" });
  assert.deepEqual(Array.from(items, (item) => item.id), ["123"]);
  const union = await context.mapSubjects([
    { type: "book", id: "10", title: "书" }, { type: "music", id: "11", title: "音乐" },
    { subject: { type: "tv", id: "12", title: "剧" } },
  ], "");
  assert.deepEqual(Array.from(union, (item) => item.link), ["https://m.douban.com/book/10", "https://m.douban.com/music/11", "https://m.douban.com/tv/12"]);
});

test("native movie catalogue exposes all genres and maps exact collections without resorting", async () => {
  const calls = [];
  const context = loadWidget({ http: { async get(url) { calls.push(new URL(url)); return { data: { subject_collection_items: [] } }; } } });
  const module = context.movieCatalogModule();
  const options = (name) => Array.from(module.params.find((param) => param.name === name).enumOptions);
  assert.equal(options("classic").filter((x) => x.value.startsWith("native:")).length, 26);
  assert.equal(options("recent").filter((x) => x.value.startsWith("native:")).length, 12);
  assert.equal(options("underrated").length, 19);
  assert.equal(options("region").length, 184);
  assert.equal(options("genre").length, 26);
  assert.equal(options("yearly").length, 108);
  for (const [category, title, id] of [
    ["classic", "剧情", "film_genre_27"], ["recent", "喜剧", "ECAYN54KI"],
    ["underrated", "喜剧", "ECLYOFOKA"], ["region", "美国·喜剧", "ECGUO62ZA"],
    ["genre", "家庭", "film_genre_41"], ["yearly", "2025·华语", "ECE472UNY"],
  ]) {
    const option = options(category).find((item) => item.title === title);
    assert.ok(option, title);
    await context.loadMovieCatalog({ category, [category]: option.value, page: 2, sort: "R" });
    assert.equal(calls.at(-1).pathname, "/rexxar/api/v2/subject_collection/" + id + "/items");
    assert.equal(calls.at(-1).searchParams.get("start"), "20");
    assert.equal(calls.at(-1).searchParams.has("sort"), false);
  }
  const before = calls.length;
  await assert.rejects(context.loadMovieCatalog({ category: "classic", classic: "native:unknown" }), /不支持/);
  assert.equal(calls.length, before);
});

test("TV recent native regional lists preserve exact collection identity", async () => {
  const calls = [];
  const context = loadWidget({ http: { async get(url) { calls.push(new URL(url)); return { data: { subject_collection_items: [] } }; } } });
  const recent = context.tvCatalogModule().params.find((param) => param.name === "recent").enumOptions;
  assert.equal(recent.filter((x) => x.value.startsWith("native:")).length, 5);
  for (const [title, id] of [["大陆剧", "EC74443FY"], ["美剧", "ECFA5DI7Q"], ["日剧", "ECNA46YBA"], ["韩剧", "ECBE5CBEI"], ["欧洲剧", "EC6I5FYHA"]]) {
    await context.loadTvCatalog({ category: "recent", recent: recent.find((x) => x.title === title).value, page: 2 });
    assert.equal(calls.at(-1).pathname, "/rexxar/api/v2/subject_collection/" + id + "/items");
    assert.equal(calls.at(-1).searchParams.get("start"), "20");
  }
});

test("recommendation metadata only offers valid media-specific combinations and retains old saved parameters", async () => {
  const calls = [];
  const context = loadWidget({ http: { async get(url) { calls.push(new URL(url)); return { data: { items: [] } }; } } });
  const module = context.WidgetMetadata.modules.find((item) => item.id === "doubanRecommendations");
  for (const [name, type] of [["movieCategory", "movie"], ["movieRegion", "movie"], ["tvRegion", "tv"]]) {
    const param = module.params.find((item) => item.name === name);
    assert.equal(param.belongTo.paramName, "mediaType");
    assert.deepEqual(Array.from(param.belongTo.value), [type]);
  }
  assert.equal(module.params.some((item) => item.name === "category" || item.name === "region"), false);
  await context.loadRecommendations({ mediaType: "tv", tvRegion: "show_foreign" });
  assert.equal(calls.at(-1).searchParams.get("category"), "show");
  assert.equal(calls.at(-1).searchParams.get("type"), "show_foreign");
  await context.loadRecommendations({ mediaType: "movie", movieCategory: "最新", movieRegion: "韩国" });
  assert.equal(calls.at(-1).searchParams.get("category"), "最新");
  assert.equal(calls.at(-1).searchParams.get("type"), "韩国");
  await context.loadRecommendations({ mediaType: "tv", category: "show", region: "show_domestic" });
  assert.equal(calls.at(-1).searchParams.get("type"), "show_domestic");
});

test("explore UI separates movie genres from TV formats and emits only valid built-in combinations", async () => {
  const calls = [];
  const context = loadWidget({ http: { async get(url) { calls.push(new URL(url)); return { data: { items: [] } }; } } });
  const module = context.WidgetMetadata.modules.find((item) => item.id === "doubanExplore");
  const get = (name) => module.params.find((item) => item.name === name);
  assert.equal(get("movieGenre").enumOptions.length, 23);
  assert.equal(get("tvGenre").enumOptions.length, 29);
  assert.equal(get("movieRegion").enumOptions.length, 24);
  assert.equal(get("tvRegion").enumOptions.length, 25);
  assert.equal(get("format"), undefined);
  await context.loadPreferenceExplore({ mediaType: "movie", movieGenre: "短片", movieRegion: "丹麦" });
  assert.equal(calls.at(-1).searchParams.get("tags"), "短片,丹麦");
  await context.loadPreferenceExplore({ mediaType: "tv", tvGenre: "综艺:真人秀", tvRegion: "国外" });
  assert.equal(calls.at(-1).searchParams.get("tags"), "真人秀,综艺,国外");
  assert.equal(JSON.parse(calls.at(-1).searchParams.get("selected_categories"))["形式"], "综艺");
  await assert.rejects(context.loadPreferenceExplore({ mediaType: "tv", tvGenre: "电视剧:短片" }), /不支持/);
});

test("TV annual directory keeps every native year/category and uses original collections", async () => {
  const calls = [];
  const context = loadWidget({ http: { async get(url) { calls.push(new URL(url)); return { data: { subject_collection_items: [] } }; } } });
  const module = context.tvCatalogModule();
  const options = module.params.find((item) => item.name === "yearly").enumOptions;
  assert.equal(options.length, 82);
  assert.equal(new Set(Array.from(options, (item) => item.title.split("·")[0])).size, 12);
  const option = options.find((item) => item.title === "2025·英美续订");
  assert.equal(option.value, "native:ECWQ7ZJGY");
  await context.loadTvCatalog({ category: "yearly", yearly: option.value, page: 2 });
  assert.match(calls[0].pathname, /ECWQ7ZJGY\/items$/);
  assert.equal(calls[0].searchParams.get("start"), "20");
  await assert.rejects(context.loadTvCatalog({ category: "yearly", yearly: "native:unknown" }), /不支持/);
});

test("explore normalizes supported twentieth-century decades to Douban tag names", async () => {
  const calls = [];
  const context = loadWidget({ http: { async get(url) { calls.push(new URL(url)); return { data: { items: [] } }; } } });
  for (const [year, expected] of [["1960年代", "60年代"], ["1970年代", "70年代"], ["1980年代", "80年代"], ["1990年代", "90年代"], ["2020年代", "2020年代"], ["2026", "2026"]]) {
    await context.loadPreferenceExplore({ year });
    assert.equal(calls.at(-1).searchParams.get("tags"), expected);
  }
});

test("invalid annual movie selections fail before making a request", async () => {
  let calls = 0;
  const context = loadWidget({ http: { async get() { calls += 1; return { data: { items: [] } }; } } });
  await assert.rejects(context.loadMovieCatalog({ category: "yearly", yearly: "2026" }), /不支持/);
  assert.equal(calls, 0);
});

test("new filter defaults preserve saved filters while explicit all clears them", async () => {
  const calls = [];
  const context = loadWidget({ http: { async get(url) { calls.push(new URL(url)); return { data: { items: [] } }; } } });
  await context.loadRecommendations({ mediaType: "movie", movieCategory: "", movieRegion: "", category: "冷门佳片", region: "日本" });
  assert.equal(calls.at(-1).searchParams.get("category"), "冷门佳片");
  assert.equal(calls.at(-1).searchParams.get("type"), "日本");
  await context.loadRecommendations({ mediaType: "movie", movieCategory: "热门", movieRegion: "全部", category: "冷门佳片", region: "日本" });
  assert.equal(calls.at(-1).searchParams.get("category"), "热门");
  assert.equal(calls.at(-1).searchParams.get("type"), "全部");
  await context.loadPreferenceExplore({ mediaType: "movie", movieGenre: "", movieRegion: "", genre: "科幻", region: "日本" });
  assert.equal(calls.at(-1).searchParams.get("tags"), "科幻,日本");
  await context.loadPreferenceExplore({ mediaType: "movie", movieGenre: "__all__", movieRegion: "__all__", genre: "科幻", region: "日本" });
  assert.equal(calls.at(-1).searchParams.get("tags"), "");
  await context.loadPreferenceExplore({ mediaType: "tv", tvGenre: "", tvRegion: "", genre: "真人秀", format: "综艺", region: "国外" });
  assert.equal(calls.at(-1).searchParams.get("tags"), "真人秀,综艺,国外");
  await context.loadPreferenceExplore({ mediaType: "tv", tvGenre: "__all__", tvRegion: "__all__", genre: "真人秀", format: "综艺", region: "国外" });
  assert.equal(calls.at(-1).searchParams.get("tags"), "");
  const module = context.WidgetMetadata.modules.find((m) => m.id === "doubanRecommendations");
  assert.equal(module.params.find((p) => p.name === "movieCategory").value, "");
  assert.equal(module.params.find((p) => p.name === "movieRegion").value, "");
  assert.equal(module.params.find((p) => p.name === "tvRegion").value, "");
});

test("recent defaults stay broad instead of silently narrowing to comedy or mainland TV", async () => {
  const calls = [];
  const context = loadWidget({ http: { async get(url) { calls.push(new URL(url)); return { data: { items: [] } }; } } });
  await context.loadMovieCatalog({ category: "recent" });
  assert.equal(calls.at(-1).searchParams.get("category"), "热门");
  assert.equal(calls.at(-1).searchParams.get("type"), "全部");
  await context.loadTvCatalog({ category: "recent" });
  assert.equal(calls.at(-1).searchParams.get("category"), "tv");
  assert.equal(calls.at(-1).searchParams.get("type"), "tv");
});

test("unknown subject kinds and nested ads are skipped without guessing a movie identity", async () => {
  const context = loadWidget();
  const rows = [
    { id: "101", type: "event", title: "活动" },
    { id: "102", title: "无来源类型" },
    { target: { id: "103", type: "ad", title: "嵌套广告" } },
    { subject: { id: "104", type: "book", title: "书籍" } },
    { work: { id: "105", type: "music", title: "音乐" } },
  ];
  assert.deepEqual(Array.from(await context.mapSubjects(rows, ""), (item) => item.id), ["104", "105"]);
  assert.deepEqual(Array.from(await context.mapSubjects([{ id: "106", title: "已知来源电影" }], "movie"), (item) => item.id), ["106"]);
  assert.equal((await context.mapSubjects([{ id: "107", type: "ad", title: "广告" }], "movie")).length, 0);
});

test("new explore enum fields reject unsupported values before HTTP while old free-form tags remain usable", async () => {
  const calls = [];
  const context = loadWidget({ http: { async get(url) { calls.push(url); return { data: { items: [] } }; } } });
  for (const params of [
    { mediaType: "movie", movieGenre: "电视剧:喜剧" },
    { mediaType: "movie", movieRegion: "国外" },
    { mediaType: "tv", tvRegion: "火星" },
  ]) await assert.rejects(context.loadPreferenceExplore(params), /不支持/);
  assert.equal(calls.length, 0);
  await context.loadPreferenceExplore({ mediaType: "movie", tags: "任意自定义标签", genre: "家庭" });
  assert.equal(new URL(calls[0]).searchParams.get("tags"), "家庭,任意自定义标签");
});

test("TV current and legacy genre routes derive equivalent requests from one supported taxonomy", async () => {
  const calls = [];
  const context = loadWidget({ http: { async get(url) { calls.push(url); return { data: { items: [] } }; } } });
  for (const [, selection] of context.tvExploreOptions().filter((option) => option[1])) {
    const [format, genre] = selection.split(":");
    await context.loadPreferenceExplore({ mediaType: "tv", tvGenre: selection, sort: "T" });
    await context.loadTvCatalog({ category: "genre", genre: `${format === "电视剧" ? "tv" : "show"}:${genre}`, sort: "T" });
    assert.equal(calls.at(-1), calls.at(-2), selection);
  }
});

test("legacy TV genre kinds cannot resolve inherited object properties", async () => {
  let calls = 0;
  const context = loadWidget({ http: { async get() { calls += 1; return { data: { items: [] } }; } } });
  await assert.rejects(context.loadTvCatalog({ category: "genre", genre: "constructor:" }), /不支持/);
  await assert.rejects(context.loadTvCatalog({ category: "genre", genre: "toString:喜剧" }), /不支持/);
  assert.equal(calls, 0);
});
