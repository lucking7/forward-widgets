const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadWidget(overrides = {}) {
  const filename = path.join(__dirname, "../widgets/danmu/danmu-select.js");
  const source = fs.readFileSync(filename, "utf8");
  const context = {
    URL,
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

test("parses equivalent English and Chinese season/episode identities", () => {
  const { parseMediaIdentity } = loadWidget();

  const english = parseMediaIdentity({ fileName: "Frieren.S02E03.1080p.WEB-DL.mkv" });
  const chinese = parseMediaIdentity({ title: "葬送的芙莉莲 第2季 第3集" });
  const explicit = parseMediaIdentity({ title: "Frieren", season: 2, episode: 3 });

  assert.deepEqual(
    { title: english.baseTitle, season: english.season, episode: english.episode },
    { title: "Frieren", season: 2, episode: 3 },
  );
  assert.deepEqual(
    { title: chinese.baseTitle, season: chinese.season, episode: chinese.episode },
    { title: "葬送的芙莉莲", season: 2, episode: 3 },
  );
  assert.equal(explicit.season, 2);
  assert.equal(explicit.episode, 3);
});

test("media identity prefers the player series title over a noisy release filename", () => {
  const { parseMediaIdentity } = loadWidget();

  const identity = parseMediaIdentity({
    episode: 3,
    season: 2,
    seriesName: "葬送的芙莉莲 第二季",
    videoUrl: "https://media.example/%5BSubsPlease%5D%20Sousou%20no%20Frieren%20-%2031%20%5B1080p%5D.mkv",
  });

  assert.equal(identity.baseTitle, "葬送的芙莉莲");
  assert.equal(identity.season, 2);
  assert.equal(identity.episode, 3);
  assert.equal(identity.original, "[SubsPlease] Sousou no Frieren - 31 [1080p].mkv");
});

test("candidate scoring uses clean filename aliases for cross-language titles", () => {
  const { parseMediaIdentity, scoreAnimeCandidate } = loadWidget();
  const identity = parseMediaIdentity({
    episode: 3,
    season: 2,
    seriesName: "葬送的芙莉莲 第二季",
    videoUrl: "https://media.example/Sousou.no.Frieren.S02E03.mkv",
  });

  const score = scoreAnimeCandidate(
    { animeTitle: "Sousou no Frieren Season 2", type: "TV Series" },
    identity,
  );

  assert.equal(identity.aliases.includes("葬送的芙莉莲"), true);
  assert.equal(identity.aliases.includes("Sousou no Frieren"), true);
  assert.ok(score >= 65);
});

test("ranks an exact title and season above similar wrong-season candidates", () => {
  const { parseMediaIdentity, rankAnimeCandidates } = loadWidget();
  const identity = parseMediaIdentity({
    title: "Frieren: Beyond Journey's End",
    season: 2,
    type: "tv",
  });

  const ranked = rankAnimeCandidates([
    { animeId: 31, animeTitle: "Frieren: Beyond Journey's End Season 3", type: "TV Series" },
    { animeId: 21, animeTitle: "Frieren: Beyond Journey's End Season 2", type: "TV Series" },
    { animeId: 11, animeTitle: "Frieren Mini Anime", type: "ONA" },
  ], identity);

  assert.equal(ranked[0].animeId, 21);
  assert.ok(ranked[0].matchConfidence >= 85);
  assert.ok(ranked[0].matchConfidence > ranked[1].matchConfidence);
});

test("movie type matching is case insensitive", () => {
  const { parseMediaIdentity, rankAnimeCandidates } = loadWidget();
  const identity = parseMediaIdentity({ title: "Dune", type: "Movie" });

  const ranked = rankAnimeCandidates([
    { animeId: 1, animeTitle: "Dune", type: "TV Series" },
    { animeId: 2, animeTitle: "Dune", type: "Movie" },
  ], identity);

  assert.equal(ranked[0].animeId, 2);
});

test("route IDs preserve ordered fallback sources and tolerate malformed legacy IDs", () => {
  const { decodeRouteId, encodeRouteId } = loadWidget();
  const sources = [
    { title: "primary", server: "https://primary.example" },
    { title: "backup", server: "https://backup.example" },
  ];

  const encoded = encodeRouteId("anime", 42, sources, { confidence: 93 });
  const decoded = decodeRouteId(encoded);

  assert.equal(decoded.kind, "anime");
  assert.equal(decoded.rawId, "42");
  assert.deepEqual(Array.from(decoded.sources, (source) => source.server), [
    "https://primary.example",
    "https://backup.example",
  ]);
  assert.equal(decoded.meta.confidence, 93);
  assert.doesNotThrow(() => decodeRouteId("bad%legacy-id"));
  assert.equal(decodeRouteId("bad%legacy-id").rawId, "bad%legacy-id");
});

test("bound routes do not append an unused default source", () => {
  const { decodeRouteId, encodeRouteId, orderSourcesFromRoute } = loadWidget();
  const route = decodeRouteId(encodeRouteId("episode", 42, [
    { title: "bound", server: "https://bound.example" },
  ]));

  const sources = orderSourcesFromRoute(route, {});

  assert.deepEqual(Array.from(sources, (source) => source.server), ["https://bound.example"]);
});

test("deduplicates mirrored comments without deleting distinct comment IDs", async () => {
  const { processComments } = loadWidget();
  const processed = await processComments([
    { cid: "same", m: "hello", p: "1.004,1,16777215" },
    { cid: "same", m: "hello", p: "1.004,1,16777215" },
    { cid: "other", m: "hello", p: "1.006,1,16777215" },
    { m: "no-id", p: "2.001,1,16777215" },
    { m: "no-id", p: "2.001,1,16777215" },
  ], {
    blockKeywords: "",
    colorMode: "none",
    convertMode: "none",
    maxCount: 0,
  });

  assert.deepEqual(Array.from(processed.comments, (comment) => comment.cid || comment.m), [
    "same",
    "other",
    "no-id",
  ]);
  assert.equal(processed.count, 3);
});

test("comment processing preserves Forward's documented tuple format", async () => {
  const { processComments } = loadWidget();
  const processed = await processComments([
    [1, "1", "16777215", "", "first"],
    [2, "1", "16777215", "", "second"],
  ], {
    blockKeywords: "",
    colorMode: "none",
    convertMode: "none",
    maxCount: 0,
  });

  assert.equal(processed.count, 2);
  assert.deepEqual(
    Array.from(processed.comments, (comment) => Array.from(comment)),
    [
      [1, "1", "16777215", "", "first"],
      [2, "1", "16777215", "", "second"],
    ],
  );
});

test("limits comments deterministically across the full timeline", async () => {
  const { processComments } = loadWidget();
  const comments = Array.from({ length: 10 }, (_, time) => ({
    cid: `c${time}`,
    m: `m${time}`,
    p: `${time},1,16777215`,
  }));

  const first = await processComments(comments, { maxCount: 4 });
  const second = await processComments(comments, { maxCount: 4 });

  assert.deepEqual(Array.from(first.comments, (comment) => comment.cid), ["c0", "c3", "c6", "c9"]);
  assert.deepEqual(Array.from(second.comments, (comment) => comment.cid), ["c0", "c3", "c6", "c9"]);
});

test("comment output is time ordered even when no limit is applied", async () => {
  const { processComments } = loadWidget();
  const result = await processComments([
    { cid: "late", m: "late", p: "3,1,16777215" },
    { cid: "early", m: "early", p: "1,1,16777215" },
    { cid: "middle", m: "middle", p: "2,1,16777215" },
  ], { maxCount: 0 });

  assert.deepEqual(Array.from(result.comments, (comment) => comment.cid), [
    "early",
    "middle",
    "late",
  ]);
});

test("search ranks candidates across sources and embeds fallback routing", async () => {
  const Widget = {
    http: {
      async get(url) {
        if (url.startsWith("https://primary.example")) {
          return {
            data: {
              success: true,
              animes: [{ animeId: 31, animeTitle: "Frieren Season 3", type: "TV Series" }],
            },
          };
        }
        return {
          data: {
            success: true,
            animes: [{ animeId: 21, animeTitle: "Frieren Season 2", type: "TV Series" }],
          },
        };
      },
    },
  };
  const { decodeRouteId, searchDanmu } = loadWidget({ Widget });

  const result = await searchDanmu({
    graceMs: 20,
    requestTimeout: 100,
    season: 2,
    server: "https://primary.example",
    server2: "https://backup.example",
    serverName: "primary",
    serverName2: "backup",
    title: "Frieren",
    type: "tv",
  });

  assert.equal(result.animes[0].animeTitle.startsWith("Frieren Season 2"), true);
  assert.equal(result.animes[0].matchConfidence >= 85, true);
  const route = decodeRouteId(result.animes[0].animeId);
  assert.equal(route.rawId, "21");
  assert.deepEqual(Array.from(route.sources, (source) => source.server), [
    "https://backup.example",
    "https://primary.example",
  ]);
});

test("search excludes candidates below the configured confidence floor", async () => {
  const Widget = {
    http: {
      async get() {
        return {
          data: {
            animes: [
              { animeId: 21, animeTitle: "Frieren Season 2", type: "TV Series" },
              { animeId: 99, animeTitle: "Completely Different Show", type: "TV Series" },
            ],
          },
        };
      },
    },
  };
  const { searchDanmu } = loadWidget({ Widget });

  const result = await searchDanmu({
    minConfidence: 65,
    season: 2,
    server: "https://primary.example",
    title: "Frieren",
    type: "tv",
  });

  assert.equal(result.animes.length, 1);
  assert.equal(result.animes[0].animeTitle.startsWith("Frieren Season 2"), true);
});

test("search accepts an exact movie title with year, type, and provider suffixes", async () => {
  const Widget = {
    http: {
      async get() {
        return {
          data: {
            animes: [{
              animeId: 3052575,
              bangumiId: "rzpyce9pmxayzvb",
              animeTitle: "让子弹飞(2010)【电影】from tencent",
              type: "电影",
            }],
          },
        };
      },
    },
  };
  const { decodeRouteId, searchDanmu } = loadWidget({ Widget });

  const result = await searchDanmu({
    minConfidence: 65,
    server: "https://primary.example",
    title: "让子弹飞",
    type: "movie",
  });

  assert.equal(result.animes.length, 1);
  assert.equal(decodeRouteId(result.animes[0].animeId).rawId, "rzpyce9pmxayzvb");
});

test("movie detail prefers a full-title episode over a same-title clip collection", async () => {
  const calls = [];
  const Widget = {
    http: {
      async get(url) {
        calls.push(url);
        if (url.includes("/search/anime")) {
          return {
            data: {
              animes: [
                {
                  animeId: 3052575,
                  bangumiId: "clip-set",
                  animeTitle: "让子弹飞(2010)【电影】from tencent",
                  type: "电影",
                },
                {
                  animeId: 1063,
                  bangumiId: "full-movie",
                  animeTitle: "让子弹飞(2010)【电影】from 360",
                  type: "电影",
                },
              ],
            },
          };
        }
        if (url.includes("/bangumi/clip-set")) {
          return {
            data: {
              bangumi: {
                episodes: [
                  { episodeId: 4101, episodeNumber: "1", episodeTitle: "精彩片段：鸿门宴" },
                  { episodeId: 4102, episodeNumber: "2", episodeTitle: "让子弹飞 快看电影" },
                ],
              },
            },
          };
        }
        if (url.includes("/bangumi/full-movie")) {
          return {
            data: {
              bangumi: {
                episodes: [{ episodeId: 4201, episodeNumber: "1", episodeTitle: "让子弹飞(2010)" }],
              },
            },
          };
        }
        if (url.includes("/comment/4201")) {
          return { data: { comments: [{ cid: "full", m: "正片弹幕", p: "1,1,16777215" }] } };
        }
        if (url.includes("/comment/")) {
          return { data: { comments: [{ cid: "clip", m: "片段弹幕", p: "1,1,16777215" }] } };
        }
        throw new Error(`unexpected GET ${url}`);
      },
    },
    storage: { get() { return null; }, set() {} },
  };
  const { getCommentsById, getDetailById, searchDanmu } = loadWidget({ Widget });

  const search = await searchDanmu({ server: "https://primary.example", title: "让子弹飞", type: "movie" });
  const episodes = await getDetailById({ animeId: search.animes[0].animeId, title: "让子弹飞", type: "movie" });
  const comments = await getCommentsById({ commentId: episodes[0].episodeId, mergeMode: "quality" });

  assert.equal(calls.some((url) => url.includes("/bangumi/clip-set")), true);
  assert.equal(calls.some((url) => url.includes("/bangumi/full-movie")), true);
  assert.equal(calls.some((url) => url.includes("/comment/4201")), true);
  assert.equal(calls.some((url) => url.includes("/comment/4101")), false);
  assert.equal(comments.comments[0].m, "正片弹幕");
});

test("a fast low-confidence source does not hide a slower exact search result", async () => {
  const Widget = {
    http: {
      async get(url) {
        const isPrimary = url.startsWith("https://primary.example");
        await new Promise((resolve) => setTimeout(resolve, isPrimary ? 5 : 50));
        return {
          data: {
            animes: [isPrimary
              ? { animeId: 99, animeTitle: "Completely Different Show", type: "TV Series" }
              : { animeId: 21, animeTitle: "Frieren Season 2", type: "TV Series" }],
          },
        };
      },
    },
  };
  const { searchDanmu } = loadWidget({ Widget });

  const result = await searchDanmu({
    graceMs: 10,
    minConfidence: 65,
    requestTimeout: 120,
    season: 2,
    server: "https://primary.example",
    server2: "https://backup.example",
    title: "Frieren",
    type: "tv",
  });

  assert.equal(result.animes.length, 1);
  assert.equal(result.animes[0].animeTitle.startsWith("Frieren Season 2"), true);
});

test("completed search operations do not start late secondary requests", async () => {
  const calls = [];
  const Widget = {
    http: {
      async get(url) {
        calls.push(url);
        if (url.startsWith("https://primary.example")) {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return {
            data: {
              animes: [{ animeId: 21, animeTitle: "Frieren Season 2", type: "TV Series" }],
            },
          };
        }
        if (url.includes("/api/v2/search/anime")) {
          await new Promise((resolve) => setTimeout(resolve, 30));
          return { data: { animes: [] } };
        }
        return { data: { animes: [] } };
      },
    },
  };
  const { searchDanmu } = loadWidget({ Widget });

  await searchDanmu({
    graceMs: 10,
    requestTimeout: 100,
    season: 2,
    server: "https://primary.example",
    server2: "https://backup.example",
    title: "Frieren",
    type: "tv",
  });
  await new Promise((resolve) => setTimeout(resolve, 45));

  assert.equal(
    calls.some((url) => url.startsWith("https://backup.example") && url.includes("/search/episodes")),
    false,
  );
});

test("detail fallback uses the anime ID assigned by each source", async () => {
  const requested = [];
  const Widget = {
    http: {
      async get(url) {
        requested.push(url);
        if (url.includes("/api/v2/search/anime")) {
          const animeId = url.startsWith("https://primary.example") ? 101 : 202;
          return {
            data: {
              animes: [{ animeId, animeTitle: "Frieren Season 2", type: "TV Series" }],
            },
          };
        }
        if (url === "https://primary.example/api/v2/bangumi/101") {
          throw new Error("primary unavailable");
        }
        if (url === "https://backup.example/api/v2/bangumi/202") {
          return {
            data: {
              bangumi: {
                episodes: [{ episodeId: 20201, episodeNumber: "1", episodeTitle: "Episode 1" }],
              },
            },
          };
        }
        return { data: { bangumi: { episodes: [] } } };
      },
    },
    storage: { async get() { return null; }, async set() {} },
  };
  const { decodeRouteId, getDetailById, searchDanmu } = loadWidget({ Widget });
  const search = await searchDanmu({
    graceMs: 20,
    requestTimeout: 100,
    season: 2,
    server: "https://primary.example",
    server2: "https://backup.example",
    title: "Frieren",
    type: "tv",
  });

  const route = decodeRouteId(search.animes[0].animeId);
  assert.deepEqual(
    { ...route.meta.sourceIds },
    { "https://backup.example": "202", "https://primary.example": "101" },
  );

  const episodes = await getDetailById({
    animeId: search.animes[0].animeId,
    requestTimeout: 100,
    title: "Frieren",
  });

  assert.equal(episodes[0].episodeId.includes("20201"), true);
  assert.equal(requested.includes("https://backup.example/api/v2/bangumi/202"), true);
  assert.equal(requested.includes("https://backup.example/api/v2/bangumi/101"), false);
});

test("detail never sends an anime ID to a source without an explicit mapping", async () => {
  const requested = [];
  const Widget = {
    http: {
      async get(url) {
        requested.push(url);
        if (url.startsWith("https://primary.example")) throw new Error("primary unavailable");
        return {
          data: {
            bangumi: {
              episodes: [{ episodeId: 99901, episodeNumber: "1", episodeTitle: "Unrelated Episode" }],
            },
          },
        };
      },
    },
    storage: { async get() { return null; }, async set() {} },
  };
  const { encodeRouteId, getDetailById } = loadWidget({ Widget });
  const animeId = encodeRouteId("anime", 101, [
    { title: "primary", server: "https://primary.example" },
    { title: "backup", server: "https://backup.example" },
  ], {
    sourceIds: { "https://primary.example": "101" },
  });

  await assert.rejects(
    getDetailById({ animeId, requestTimeout: 50, title: "Frieren" }),
    /没有来源返回有效选集/,
  );
  assert.equal(requested.some((url) => url.startsWith("https://backup.example")), false);
});

test("detail falls back from a failed bound source and rebinds episodes to the winner", async () => {
  const Widget = {
    http: {
      async get(url) {
        if (url.startsWith("https://primary.example")) throw new Error("primary unavailable");
        return {
          data: {
            bangumi: {
              episodes: [{ episodeId: 4201, episodeTitle: "Episode 1", episodeNumber: "1" }],
            },
          },
        };
      },
    },
    storage: { async get() { return null; }, async set() {} },
  };
  const { decodeRouteId, encodeRouteId, getDetailById } = loadWidget({ Widget });
  const animeId = encodeRouteId("anime", 42, [
    { title: "primary", server: "https://primary.example" },
    { title: "backup", server: "https://backup.example" },
  ], {
    confidence: 98,
    sourceIds: {
      "https://primary.example": "42",
      "https://backup.example": "42",
    },
  });

  const episodes = await getDetailById({ animeId, requestTimeout: 100, title: "Frieren" });

  assert.equal(episodes.length, 1);
  assert.equal(episodes[0].episodeTitle.startsWith("Episode 1"), true);
  const route = decodeRouteId(episodes[0].episodeId);
  assert.equal(route.rawId, "4201");
  assert.equal(route.sources[0].server, "https://backup.example");
  assert.equal(route.sources.length, 2);
  assert.deepEqual({ ...route.meta.sourceIds }, { "https://backup.example": "4201" });
});

test("comment fallback uses the episode ID assigned by each source", async () => {
  const requested = [];
  const Widget = {
    http: {
      async get(url) {
        requested.push(url);
        if (url === "https://primary.example/api/v2/bangumi/101") {
          return {
            data: {
              bangumi: {
                episodes: [{ episodeId: 10101, episodeNumber: "1", episodeTitle: "Episode 1" }],
              },
            },
          };
        }
        if (url === "https://backup.example/api/v2/bangumi/202") {
          return {
            data: {
              bangumi: {
                episodes: [{ episodeId: 20201, episodeNumber: "1", episodeTitle: "Episode 1" }],
              },
            },
          };
        }
        if (url.includes("/api/v2/comment/10101")) return { data: { comments: [] } };
        if (url === "https://backup.example/api/v2/comment/20201?async=1&withRelated=true&chConvert=0") {
          return {
            data: {
              comments: [{ cid: "backup", m: "correct episode", p: "1,1,16777215" }],
            },
          };
        }
        return { data: { comments: [] } };
      },
    },
    storage: { async get() { return null; }, async set() {} },
  };
  const { decodeRouteId, encodeRouteId, getCommentsById, getDetailById } = loadWidget({ Widget });
  const animeId = encodeRouteId("anime", 101, [
    { title: "primary", server: "https://primary.example" },
    { title: "backup", server: "https://backup.example" },
  ], {
    sourceIds: {
      "https://primary.example": "101",
      "https://backup.example": "202",
    },
  });
  const episodes = await getDetailById({ animeId, graceMs: 20, requestTimeout: 100, title: "Frieren" });
  const episodeRoute = decodeRouteId(episodes[0].episodeId);

  assert.deepEqual(
    { ...episodeRoute.meta.sourceIds },
    { "https://backup.example": "20201", "https://primary.example": "10101" },
  );

  const result = await getCommentsById({
    commentId: episodes[0].episodeId,
    hedgeMs: 10,
    requestTimeout: 100,
  });

  assert.equal(result.comments[0].cid, "backup");
  assert.equal(requested.some((url) => url.startsWith("https://backup.example/api/v2/comment/10101")), false);
});

test("automatic detail match uses the media URL filename and never sends a fake hash", async () => {
  let matchBody = null;
  const Widget = {
    http: {
      async get(url) {
        if (url.includes("/api/v2/bangumi/21")) {
          return {
            data: {
              bangumi: {
                episodes: [{ episodeId: 2103, episodeTitle: "Episode 3", episodeNumber: "3" }],
              },
            },
          };
        }
        throw new Error(`unexpected GET ${url}`);
      },
      async post(url, body) {
        assert.equal(url, "https://primary.example/api/v2/match");
        matchBody = body;
        return {
          data: {
            isMatched: true,
            matches: [
              { animeId: 31, animeTitle: "Frieren Season 3", episodeId: 3103, type: "TV Series" },
              { animeId: 21, animeTitle: "Frieren Season 2", episodeId: 2103, type: "TV Series" },
            ],
          },
        };
      },
    },
    storage: { async get() { return null; }, async set() {} },
  };
  const { getDetailById } = loadWidget({ Widget });

  const episodes = await getDetailById({
    animeId: "",
    episode: 3,
    requestTimeout: 100,
    season: 2,
    server: "https://primary.example",
    title: "Frieren",
    type: "tv",
    videoUrl: "https://media.example/Frieren.S02E03.1080p.WEB-DL.mkv?token=redacted",
  });

  assert.equal(matchBody.fileName, "Frieren.S02E03.1080p.WEB-DL.mkv");
  assert.equal(Object.hasOwn(matchBody, "fileHash"), false);
  assert.equal(Object.hasOwn(matchBody, "fileSize"), false);
  assert.equal(episodes[0].episodeId.includes("2103"), true);
});

test("a fast low-confidence match does not hide a slower exact server match", async () => {
  const Widget = {
    http: {
      async get(url) {
        if (url === "https://backup.example/api/v2/bangumi/21") {
          return {
            data: {
              bangumi: {
                episodes: [{ episodeId: 2103, episodeNumber: "3", episodeTitle: "Episode 3" }],
              },
            },
          };
        }
        throw new Error(`unexpected GET ${url}`);
      },
      async post(url) {
        const isPrimary = url.startsWith("https://primary.example");
        await new Promise((resolve) => setTimeout(resolve, isPrimary ? 5 : 50));
        return {
          data: {
            matches: [isPrimary
              ? { animeId: 99, animeTitle: "Completely Different Show", episodeId: 9903, type: "TV Series" }
              : { animeId: 21, animeTitle: "Frieren Season 2", episodeId: 2103, type: "TV Series" }],
          },
        };
      },
    },
    storage: { async get() { return null; }, async set() {} },
  };
  const { getDetailById } = loadWidget({ Widget });

  const episodes = await getDetailById({
    animeId: "",
    episode: 3,
    graceMs: 10,
    minConfidence: 65,
    requestTimeout: 120,
    season: 2,
    server: "https://primary.example",
    server2: "https://backup.example",
    title: "Frieren",
    type: "tv",
  });

  assert.equal(episodes[0].episodeId.includes("2103"), true);
});

test("an explicit server match with an episode ID survives cross-language titles", async () => {
  const Widget = {
    http: {
      async get(url) {
        if (url.includes("/api/v2/bangumi/21")) {
          return {
            data: {
              bangumi: {
                episodes: [{ episodeId: 2103, episodeNumber: "3", episodeTitle: "Episode 3" }],
              },
            },
          };
        }
        throw new Error(`unexpected GET ${url}`);
      },
      async post() {
        return {
          data: {
            isMatched: true,
            matches: [{ animeId: 21, animeTitle: "Frieren Season 2", episodeId: 2103, type: "TV Series" }],
          },
        };
      },
    },
    storage: { async get() { return null; }, async set() {} },
  };
  const { getDetailById } = loadWidget({ Widget });

  const episodes = await getDetailById({
    animeId: "",
    episode: 3,
    fileName: "葬送的芙莉莲 第二季 第三集.mkv",
    requestTimeout: 100,
    season: 2,
    server: "https://primary.example",
    seriesName: "葬送的芙莉莲 第二季",
    type: "tv",
  });

  assert.equal(episodes[0].episodeId.includes("2103"), true);
});

test("comments treat an empty primary response as a miss and use a non-empty fallback", async () => {
  const Widget = {
    http: {
      async get(url) {
        if (url.startsWith("https://primary.example")) return { data: { comments: [] } };
        return {
          data: {
            comments: [{ cid: "backup-1", m: "from backup", p: "1,1,16777215" }],
          },
        };
      },
    },
  };
  const { encodeRouteId, getCommentsById } = loadWidget({ Widget });
  const commentId = encodeRouteId("episode", 4201, [
    { title: "primary", server: "https://primary.example" },
    { title: "backup", server: "https://backup.example" },
  ], { sourceIds: {
    "https://primary.example": "4201",
    "https://backup.example": "4201",
  } });

  const result = await getCommentsById({
    commentId,
    hedgeMs: 10,
    maxCount: 3000,
    mergeMode: "fallback",
    requestTimeout: 100,
  });

  assert.equal(result.count, 1);
  assert.equal(result.comments[0].cid, "backup-1");
});

test("fallback mode does not start backup downloads after an immediate primary hit", async () => {
  let backupCalls = 0;
  const Widget = {
    http: {
      async get(url) {
        if (url.startsWith("https://backup.example")) backupCalls++;
        return {
          data: {
            comments: [{ cid: "primary", m: "fast", p: "1,1,16777215" }],
          },
        };
      },
    },
  };
  const { encodeRouteId, getCommentsById } = loadWidget({ Widget });
  const commentId = encodeRouteId("episode", 4201, [
    { title: "primary", server: "https://primary.example" },
    { title: "backup", server: "https://backup.example" },
  ], { sourceIds: {
    "https://primary.example": "4201",
    "https://backup.example": "4201",
  } });

  const result = await getCommentsById({
    commentId,
    hedgeMs: 20,
    mergeMode: "fallback",
    requestTimeout: 100,
  });

  assert.equal(result.comments[0].cid, "primary");
  assert.equal(backupCalls, 0);
});

test("merge mode combines quick sources and removes mirrored comments", async () => {
  const Widget = {
    http: {
      async get(url) {
        const own = url.startsWith("https://primary.example")
          ? { cid: "primary-only", m: "one", p: "1,1,16777215" }
          : { cid: "backup-only", m: "two", p: "2,1,16777215" };
        return {
          data: {
            comments: [
              { cid: "mirrored", m: "same", p: "0.5,1,16777215" },
              own,
            ],
          },
        };
      },
    },
  };
  const { encodeRouteId, getCommentsById } = loadWidget({ Widget });
  const commentId = encodeRouteId("episode", 4201, [
    { title: "primary", server: "https://primary.example" },
    { title: "backup", server: "https://backup.example" },
  ], { sourceIds: {
    "https://primary.example": "4201",
    "https://backup.example": "4201",
  } });

  const result = await getCommentsById({
    commentId,
    graceMs: 20,
    maxCount: 0,
    mergeMode: "merge",
    requestTimeout: 100,
  });

  assert.equal(result.count, 3);
  assert.deepEqual(Array.from(result.comments, (comment) => comment.cid), [
    "mirrored",
    "primary-only",
    "backup-only",
  ]);
});

test("merge mode deduplicates mirrored content with source-local comment IDs", async () => {
  const Widget = {
    http: {
      async get(url) {
        const cid = url.startsWith("https://primary.example") ? "source-a-1" : "source-b-9";
        return {
          data: {
            comments: [{ cid, m: "same", p: "1,1,16777215" }],
          },
        };
      },
    },
  };
  const { encodeRouteId, getCommentsById } = loadWidget({ Widget });
  const commentId = encodeRouteId("episode", 4201, [
    { title: "primary", server: "https://primary.example" },
    { title: "backup", server: "https://backup.example" },
  ], { sourceIds: {
    "https://primary.example": "4201",
    "https://backup.example": "4201",
  } });

  const result = await getCommentsById({
    commentId,
    graceMs: 20,
    mergeMode: "merge",
    requestTimeout: 100,
  });

  assert.equal(result.count, 1);
});

test("merge mode preserves distinct tuple comments from each source", async () => {
  const Widget = {
    http: {
      async get(url) {
        const prefix = url.startsWith("https://primary.example") ? "a" : "b";
        return {
          data: {
            comments: [
              [1, "1", "16777215", "", `${prefix}1`],
              [2, "1", "16777215", "", `${prefix}2`],
            ],
          },
        };
      },
    },
  };
  const { encodeRouteId, getCommentsById } = loadWidget({ Widget });
  const commentId = encodeRouteId("episode", 4201, [
    { title: "primary", server: "https://primary.example" },
    { title: "backup", server: "https://backup.example" },
  ], { sourceIds: {
    "https://primary.example": "4201",
    "https://backup.example": "4201",
  } });

  const result = await getCommentsById({
    commentId,
    graceMs: 20,
    mergeMode: "merge",
    requestTimeout: 100,
  });

  assert.equal(result.count, 4);
  assert.deepEqual(Array.from(result.comments, (comment) => comment[4]), ["a1", "b1", "a2", "b2"]);
});

test("metadata keeps the Forward danmu contract and existing configuration names", () => {
  const { WidgetMetadata } = loadWidget();
  assert.equal(WidgetMetadata.id, "danmu.quality.select.v1");
  assert.equal(WidgetMetadata.title, "弹幕优选");
  assert.equal(WidgetMetadata.version, "1.1.2");
  assert.deepEqual(Array.from(WidgetMetadata.modules, (module) => module.id), [
    "searchDanmu",
    "getDetail",
    "getComments",
  ]);
  const names = new Set(Array.from(WidgetMetadata.globalParams, (param) => param.name));
  for (const name of [
    "serverName", "server", "serverName2", "server2", "serverName3", "server3",
    "maxCount", "searchBlockKeywords", "convertMode", "colorMode", "blockKeywords",
  ]) {
    assert.equal(names.has(name), true, `missing global param ${name}`);
  }
  assert.equal(names.has("graceMs"), false);
  assert.equal(names.has("hedgeMs"), false);
  assert.equal(WidgetMetadata.requiredVersion, "0.0.2");
});

test("comment processing converts before blocking and rewrites white deterministically", async () => {
  const Widget = {
    storage: {
      get(key) {
        assert.equal(key, "smart_dict_t2s");
        return JSON.stringify({ "臺": "台", "灣": "湾", "廣": "广" });
      },
      set() {},
    },
  };
  const { processComments } = loadWidget({ Widget });

  const result = await processComments([
    { cid: "blocked", m: "臺灣廣告", p: "1,1,123" },
    { cid: "kept", m: "臺灣內容", p: "2,1,123" },
  ], {
    blockKeywords: "广告",
    colorMode: "white",
    convertMode: "t2s",
    maxCount: 0,
  });

  assert.equal(result.count, 1);
  assert.equal(result.comments[0].m, "台湾內容");
  assert.equal(result.comments[0].p, "2,1,16777215");
});

test("a stalled conversion dictionary cannot block comment delivery", async () => {
  const Widget = {
    http: { async get() { return new Promise(() => {}); } },
    storage: { async get() { return null; }, async set() {} },
  };
  const { processComments } = loadWidget({ Widget });

  const result = await Promise.race([
    processComments([
      { cid: "one", m: "臺灣", p: "1,1,16777215" },
    ], {
      convertMode: "t2s",
      requestTimeout: 20,
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error("dictionary timeout was ignored")), 80)),
  ]);

  assert.equal(result.comments[0].m, "臺灣");
});

test("cold conversion warmup does not extend comment delivery", async () => {
  const Widget = {
    http: {
      async get(url) {
        if (url.includes("cdn.jsdelivr.net")) return new Promise(() => {});
        await new Promise((resolve) => setTimeout(resolve, 70));
        return {
          data: {
            comments: [{ cid: "one", m: "臺灣", p: "1,1,16777215" }],
          },
        };
      },
    },
    storage: { async get() { return null; }, async set() {} },
  };
  const { encodeRouteId, getCommentsById } = loadWidget({ Widget });
  const commentId = encodeRouteId("episode", 1, [
    { title: "primary", server: "https://primary.example" },
  ]);
  const startedAt = Date.now();

  const result = await Promise.race([
    getCommentsById({
      commentId,
      convertMode: "t2s",
      requestTimeout: 100,
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error("comment deadline exceeded")), 150)),
  ]);

  assert.equal(result.comments[0].m, "臺灣");
  assert.ok(Date.now() - startedAt < 140);
});

test("automatic detail reuses a fresh inherited series match before calling match again", async () => {
  let postCalls = 0;
  const Widget = {
    http: {
      async get(url) {
        assert.equal(url.includes("/api/v2/bangumi/42"), true);
        return {
          data: {
            bangumi: {
              episodes: [{ episodeId: 4202, episodeTitle: "Episode 2", episodeNumber: "2" }],
            },
          },
        };
      },
      async post() {
        postCalls++;
        throw new Error("match should not run");
      },
    },
    storage: {
      get(key) {
        assert.equal(key, "smart_match_frieren_s2_tunknown_tmdbnone");
        return JSON.stringify({
          animeId: "42",
          savedAt: Date.now(),
          source: { title: "primary", server: "https://primary.example" },
          sourceFingerprint: "https://primary.example",
        });
      },
      set() {},
    },
  };
  const { getDetailById } = loadWidget({ Widget });

  const episodes = await getDetailById({
    animeId: "",
    episode: 2,
    season: 2,
    server: "https://primary.example",
    title: "Frieren",
  });

  assert.equal(episodes[0].episodeId.includes("4202"), true);
  assert.equal(postCalls, 0);
});

test("inherited match cache is isolated by media type and configured sources", async () => {
  const values = new Map();
  const Widget = {
    storage: {
      get(key) { return values.get(key) || null; },
      set(key, value) { values.set(key, value); },
    },
  };
  const { parseMediaIdentity, recallMatch, rememberMatch } = loadWidget({ Widget });
  const oldSource = { title: "old", server: "https://old.example" };
  const newSource = { title: "new", server: "https://new.example" };
  const movie = parseMediaIdentity({ title: "Same Name", type: "movie" });
  const tv = parseMediaIdentity({ title: "Same Name", type: "tv" });

  await rememberMatch(movie, "42", oldSource, [oldSource]);

  assert.equal(await recallMatch(tv, [oldSource]), null);
  assert.equal(await recallMatch(movie, [newSource]), null);
  assert.equal((await recallMatch(movie, [oldSource])).animeId, "42");
});

test("a stalled cache write cannot block a successful detail response", async () => {
  const Widget = {
    http: {
      async get() {
        return {
          data: {
            bangumi: {
              episodes: [{ episodeId: 4201, episodeNumber: "1", episodeTitle: "Episode 1" }],
            },
          },
        };
      },
    },
    storage: {
      async get() { return null; },
      async set() { return new Promise(() => {}); },
    },
  };
  const { encodeRouteId, getDetailById } = loadWidget({ Widget });
  const animeId = encodeRouteId("anime", 42, [
    { title: "primary", server: "https://primary.example" },
  ]);
  const startedAt = Date.now();

  const episodes = await Promise.race([
    getDetailById({ animeId, requestTimeout: 100, title: "Frieren" }),
    new Promise((_, reject) => setTimeout(() => reject(new Error("cache write blocked detail")), 150)),
  ]);

  assert.equal(episodes[0].episodeId.includes("4201"), true);
  assert.ok(Date.now() - startedAt < 80);
});

test("source configuration supports multiline entries, Chinese commas, and URL deduplication", () => {
  const { getConfiguredSources } = loadWidget();
  const sources = getConfiguredSources({
    server: "https://one.example/\n第二源，https://two.example/",
    server2: "重复源,https://one.example",
    serverName: "第一源",
  });

  assert.deepEqual(Array.from(sources, (source) => `${source.title}|${source.server}`), [
    "第一源|https://one.example",
    "第二源|https://two.example",
  ]);
});

test("decodes IDs created by the existing Forward danmu modules", () => {
  const { decodeRouteId } = loadWidget();
  const legacy = `${encodeURIComponent(JSON.stringify({
    server: "https://legacy.example",
    title: "legacy",
  }))}__FORWARD_DANMU_SERVER__42`;

  const decoded = decodeRouteId(legacy);

  assert.equal(decoded.kind, "legacy-bound");
  assert.equal(decoded.rawId, "42");
  assert.equal(decoded.sources[0].server, "https://legacy.example");
});

test("automatic detail falls back from match to ranked anime research", async () => {
  const calls = [];
  const Widget = {
    http: {
      async get(url) {
        calls.push(url);
        if (url.includes("/api/v2/search/anime")) {
          return {
            data: {
              animes: [{ animeId: 21, animeTitle: "Frieren Season 2", type: "TV Series" }],
              success: true,
            },
          };
        }
        if (url.includes("/api/v2/bangumi/21")) {
          return {
            data: {
              bangumi: {
                episodes: [{ episodeId: 2104, episodeTitle: "Episode 4", episodeNumber: "4" }],
              },
            },
          };
        }
        throw new Error(`unexpected GET ${url}`);
      },
      async post(url) {
        calls.push(url);
        return { data: { isMatched: false, matches: [] } };
      },
    },
    storage: { async get() { return null; }, async set() {} },
  };
  const { getDetailById } = loadWidget({ Widget });

  const episodes = await getDetailById({
    animeId: "",
    episode: 4,
    season: 2,
    server: "https://primary.example",
    title: "Frieren",
    type: "tv",
  });

  assert.equal(episodes[0].episodeId.includes("2104"), true);
  assert.equal(calls[0].endsWith("/api/v2/match"), true);
  assert.equal(calls.some((url) => url.includes("/api/v2/search/anime")), true);
});

test("automatic detail continues research when a matched bangumi has no episodes", async () => {
  const calls = [];
  const Widget = {
    http: {
      async get(url) {
        calls.push(url);
        if (url.includes("/api/v2/bangumi/21")) {
          return { data: { bangumi: { episodes: [] } } };
        }
        if (url.includes("/api/v2/search/anime")) {
          return {
            data: {
              animes: [{ animeId: 22, animeTitle: "Frieren Season 2", type: "TV Series" }],
            },
          };
        }
        if (url.includes("/api/v2/bangumi/22")) {
          return {
            data: {
              bangumi: {
                episodes: [{ episodeId: 2203, episodeNumber: "3", episodeTitle: "Episode 3" }],
              },
            },
          };
        }
        throw new Error(`unexpected GET ${url}`);
      },
      async post() {
        return {
          data: {
            matches: [{ animeId: 21, animeTitle: "Frieren Season 2", type: "TV Series" }],
          },
        };
      },
    },
    storage: { async get() { return null; }, async set() {} },
  };
  const { getDetailById } = loadWidget({ Widget });

  const episodes = await getDetailById({
    animeId: "",
    episode: 3,
    requestTimeout: 100,
    season: 2,
    server: "https://primary.example",
    title: "Frieren",
    type: "tv",
  });

  assert.equal(episodes[0].episodeId.includes("2203"), true);
  assert.equal(calls.some((url) => url.includes("/api/v2/search/anime")), true);
});

test("automatic detail does not start new stages after the shared launch budget", async () => {
  const delay = (value) => new Promise((resolve) => setTimeout(() => resolve(value), 60));
  const Widget = {
    http: {
      async get(url) {
        if (url.includes("/api/v2/bangumi/21")) {
          return delay({ data: { bangumi: { episodes: [] } } });
        }
        if (url.includes("/api/v2/search/anime")) {
          return delay({
            data: {
              animes: [{ animeId: 22, animeTitle: "Frieren Season 2", type: "TV Series" }],
            },
          });
        }
        if (url.includes("/api/v2/bangumi/22")) {
          return delay({
            data: {
              bangumi: {
                episodes: [{ episodeId: 2203, episodeNumber: "3", episodeTitle: "Episode 3" }],
              },
            },
          });
        }
        throw new Error(`unexpected GET ${url}`);
      },
      async post() {
        return delay({
          data: {
            matches: [{ animeId: 21, animeTitle: "Frieren Season 2", type: "TV Series" }],
          },
        });
      },
    },
    storage: { async get() { return null; }, async set() {} },
  };
  const { getDetailById } = loadWidget({ Widget });
  const startedAt = Date.now();

  await assert.rejects(
    Promise.race([
      getDetailById({
        animeId: "",
        episode: 3,
        requestTimeout: 100,
        season: 2,
        server: "https://primary.example",
        title: "Frieren",
        type: "tv",
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("end-to-end deadline exceeded")), 180)),
    ]),
    /没有来源返回有效选集/,
  );
  assert.ok(Date.now() - startedAt < 170);
});

test("parses Chinese numeral seasons and episodes", () => {
  const { parseMediaIdentity } = loadWidget();
  const identity = parseMediaIdentity({ title: "庆余年 第二季 第十二集" });

  assert.equal(identity.baseTitle, "庆余年");
  assert.equal(identity.season, 2);
  assert.equal(identity.episode, 12);
});

test("special episodes never fabricate an ordinary E01 match filename", () => {
  const { buildMatchBody, parseMediaIdentity } = loadWidget();
  const identity = parseMediaIdentity({ title: "Frieren OVA" });
  const body = buildMatchBody({ title: "Frieren OVA" }, identity);

  assert.equal(identity.special, true);
  assert.equal(body.fileName, "Frieren OVA");
});

test("defaults to the refined Alpha, Cynn, and Lily source tiers", () => {
  const { getConfiguredSources, WidgetMetadata } = loadWidget();

  const sources = getConfiguredSources({});

  assert.deepEqual(Array.from(sources, (source) => ({
    server: source.server,
    tier: source.tier,
    title: source.title,
  })), [
    { server: "http://nl.jc.cd/87654321", tier: "fast", title: "Alpha" },
    { server: "https://danmu.cynn.top/cynnsq", tier: "fast", title: "炊烟" },
    { server: "https://danmu.longemby.com/lilyemby", tier: "deep", title: "Lily" },
  ]);
  const params = Object.fromEntries(Array.from(WidgetMetadata.globalParams, (item) => [item.name, item.value]));
  assert.equal(params.server, "http://nl.jc.cd/87654321");
  assert.equal(params.server2, "https://danmu.cynn.top/cynnsq");
  assert.equal(params.server3, "https://danmu.longemby.com/lilyemby");
  assert.equal(params.mergeMode, "quality");
});

test("search finishes in the fast tier without starting Lily after an accurate hit", async () => {
  const calls = [];
  const Widget = {
    http: {
      async get(url) {
        calls.push(url);
        return {
          data: {
            animes: [{ animeId: url.includes("cynn.top") ? 22 : 11, animeTitle: "Star City", type: "TV Series" }],
          },
        };
      },
    },
  };
  const { searchDanmu } = loadWidget({ Widget });

  const result = await searchDanmu({ title: "Star City", type: "tv", graceMs: 5, requestTimeout: 100 });

  assert.equal(result.animes.length, 1);
  assert.equal(calls.some((url) => url.includes("longemby.com")), false);
  assert.equal(calls.some((url) => url.includes("nl.jc.cd")), true);
  assert.equal(calls.some((url) => url.includes("cynn.top")), true);
});

test("search starts Lily only after the fast tier has no accurate candidate", async () => {
  const calls = [];
  const Widget = {
    http: {
      async get(url) {
        calls.push(url);
        if (url.includes("longemby.com") && url.includes("/search/anime")) {
          return { data: { animes: [{ animeId: 33, animeTitle: "Star City", type: "TV Series" }] } };
        }
        return { data: { animes: [] } };
      },
    },
  };
  const { searchDanmu } = loadWidget({ Widget });

  const result = await searchDanmu({ title: "Star City", type: "tv", graceMs: 5, requestTimeout: 150 });

  assert.equal(result.animes.length, 1);
  assert.match(result.animes[0].animeTitle, /Lily/);
  assert.equal(calls.some((url) => url.includes("longemby.com")), true);
});

test("quality mode chooses the better fast comment set instead of the first response", async () => {
  const alpha = { server: "http://nl.jc.cd/87654321", title: "Alpha" };
  const cynn = { server: "https://danmu.cynn.top/cynnsq", title: "炊烟" };
  const Widget = {
    http: {
      async get(url) {
        if (url.includes("cynn.top")) {
          await new Promise((resolve) => setTimeout(resolve, 8));
          return {
            data: {
              comments: Array.from({ length: 24 }, (_, index) => ({
                cid: `c-${index}`,
                m: `剧情评论 ${index}`,
                p: `${index * 75},1,16777215`,
              })),
            },
          };
        }
        return {
          data: {
            comments: Array.from({ length: 24 }, (_, index) => ({
              cid: `a-${index}`,
              m: index % 2 ? "哈哈哈哈" : "666666",
              p: `${index % 3},1,16777215`,
            })),
          },
        };
      },
    },
  };
  const { encodeRouteId, getCommentsById } = loadWidget({ Widget });
  const commentId = encodeRouteId("episode", 1, [alpha, cynn], {
    sourceIds: {
      [alpha.server]: "11",
      [cynn.server]: "22",
    },
  });

  const result = await getCommentsById({
    commentId,
    graceMs: 20,
    mergeMode: "quality",
    minQuality: 50,
    requestTimeout: 120,
  });

  assert.equal(result.count, 24);
  assert.equal(result.comments.every((comment) => comment.m.startsWith("剧情评论")), true);
});

test("the public danmu flow handles a very large comment set without overflowing", async () => {
  const largeComments = Array.from({ length: 140000 }, (_, index) => ({
    cid: `large-${index}`,
    m: `剧情评论 ${index}`,
    p: `${index / 10},1,16777215`,
  }));
  const Widget = {
    http: {
      async get(url) {
        if (url.includes("/search/anime")) {
          return { data: { animes: [{ animeId: 42, animeTitle: "Large Movie", type: "Movie" }] } };
        }
        if (url.includes("/bangumi/42")) {
          return {
            data: {
              bangumi: {
                episodes: [{ episodeId: 4201, episodeNumber: "1", episodeTitle: "Large Movie" }],
              },
            },
          };
        }
        if (url.includes("/comment/4201")) return { data: { comments: largeComments } };
        throw new Error(`unexpected GET ${url}`);
      },
    },
    storage: { get() { return null; }, set() {} },
  };
  const { getCommentsById, getDetailById, searchDanmu } = loadWidget({ Widget });

  const search = await searchDanmu({ server: "https://primary.example", title: "Large Movie", type: "movie" });
  const episodes = await getDetailById({ animeId: search.animes[0].animeId, title: "Large Movie", type: "movie" });
  const result = await getCommentsById({ commentId: episodes[0].episodeId, maxCount: 3000 });

  assert.equal(result.count, 3000);
  assert.equal(result.comments[0].m, "剧情评论 0");
  assert.equal(result.comments.at(-1).m, "剧情评论 139999");
});

test("quality mode skips Lily when a fast source is good enough", async () => {
  const calls = [];
  const sources = [
    { server: "http://nl.jc.cd/87654321", title: "Alpha" },
    { server: "https://danmu.cynn.top/cynnsq", title: "炊烟" },
    { server: "https://danmu.longemby.com/lilyemby", title: "Lily" },
  ];
  const Widget = {
    http: {
      async get(url) {
        calls.push(url);
        return {
          data: {
            comments: Array.from({ length: 30 }, (_, index) => ({
              cid: `${url}-${index}`,
              m: `有效评论 ${index}`,
              p: `${index * 60},1,16777215`,
            })),
          },
        };
      },
    },
  };
  const { encodeRouteId, getCommentsById } = loadWidget({ Widget });
  const sourceIds = Object.fromEntries(sources.map((source, index) => [source.server, String(index + 1)]));
  const commentId = encodeRouteId("episode", 1, sources, { sourceIds });

  const result = await getCommentsById({ commentId, mergeMode: "quality", minQuality: 50, requestTimeout: 120 });

  assert.equal(result.count, 30);
  assert.equal(calls.some((url) => url.includes("longemby.com")), false);
});

test("quality mode uses Lily as a deep fallback when fast comments are poor", async () => {
  const calls = [];
  const sources = [
    { server: "http://nl.jc.cd/87654321", title: "Alpha" },
    { server: "https://danmu.cynn.top/cynnsq", title: "炊烟" },
    { server: "https://danmu.longemby.com/lilyemby", title: "Lily" },
  ];
  const Widget = {
    http: {
      async get(url) {
        calls.push(url);
        if (url.includes("longemby.com")) {
          return {
            data: {
              comments: Array.from({ length: 30 }, (_, index) => ({
                cid: `l-${index}`,
                m: `完整剧情评论 ${index}`,
                p: `${index * 60},1,16777215`,
              })),
            },
          };
        }
        return { data: { comments: [{ cid: "noise", m: "666666", p: "0,1,16777215" }] } };
      },
    },
  };
  const { encodeRouteId, getCommentsById } = loadWidget({ Widget });
  const sourceIds = Object.fromEntries(sources.map((source, index) => [source.server, String(index + 1)]));
  const commentId = encodeRouteId("episode", 1, sources, { sourceIds });

  const result = await getCommentsById({ commentId, mergeMode: "quality", minQuality: 50, requestTimeout: 120 });

  assert.equal(calls.some((url) => url.includes("longemby.com")), true);
  assert.equal(result.comments.every((comment) => comment.m.startsWith("完整剧情评论")), true);
});

test("automatic detail preserves both fast source IDs for later quality selection", async () => {
  const calls = [];
  const Widget = {
    http: {
      async post(url) {
        calls.push(url);
        const isCynn = url.includes("cynn.top");
        return {
          data: {
            isMatched: true,
            matches: [{
              animeId: isCynn ? 22 : 11,
              animeTitle: "Star City",
              episodeId: isCynn ? 222 : 111,
              episodeTitle: "Episode 1",
              type: "TV Series",
            }],
          },
        };
      },
      async get(url) {
        calls.push(url);
        if (url.includes("/bangumi/11")) {
          return { data: { bangumi: { episodes: [{ episodeId: 111, episodeNumber: "1", episodeTitle: "Episode 1" }] } } };
        }
        if (url.includes("/bangumi/22")) {
          return { data: { bangumi: { episodes: [{ episodeId: 222, episodeNumber: "1", episodeTitle: "Episode 1" }] } } };
        }
        if (url.includes("/comment/111")) {
          return { data: { comments: [{ cid: "noise", m: "666666", p: "0,1,16777215" }] } };
        }
        if (url.includes("/comment/222")) {
          return {
            data: {
              comments: Array.from({ length: 24 }, (_, index) => ({
                cid: `good-${index}`,
                m: `剧情评论 ${index}`,
                p: `${index * 75},1,16777215`,
              })),
            },
          };
        }
        throw new Error(`unexpected GET ${url}`);
      },
    },
    storage: { async get() { return null; }, async set() {} },
  };
  const { decodeRouteId, getCommentsById, getDetailById } = loadWidget({ Widget });

  const episodes = await getDetailById({
    animeId: "",
    episode: 1,
    graceMs: 10,
    requestTimeout: 200,
    season: 1,
    title: "Star City",
    type: "tv",
  });
  const route = decodeRouteId(episodes[0].episodeId);
  assert.deepEqual({ ...route.meta.sourceIds }, {
    "http://nl.jc.cd/87654321": "111",
    "https://danmu.cynn.top/cynnsq": "222",
  });

  const result = await getCommentsById({
    commentId: episodes[0].episodeId,
    graceMs: 10,
    mergeMode: "quality",
    requestTimeout: 200,
  });

  assert.equal(result.count, 24);
  assert.equal(result.comments.every((comment) => comment.m.startsWith("剧情评论")), true);
  assert.equal(calls.some((url) => url.includes("longemby.com")), false);
});

test("detail never fans a legacy raw anime ID out to unbound sources", async () => {
  const calls = [];
  const Widget = {
    http: {
      async get(url) {
        calls.push(url);
        return { data: { bangumi: { episodes: [] } } };
      },
    },
    storage: { async get() { return null; }, async set() {} },
  };
  const { encodeRouteId, getDetailById } = loadWidget({ Widget });
  const animeId = encodeRouteId("anime", 42, [
    { title: "bound", server: "https://bound.example" },
    { title: "unbound", server: "https://unbound.example" },
  ]);

  await assert.rejects(getDetailById({ animeId, requestTimeout: 80 }), /没有来源返回有效选集/);

  assert.deepEqual(calls, ["https://bound.example/api/v2/bangumi/42"]);
});

test("comments never fan a legacy raw episode ID out to unbound sources", async () => {
  const calls = [];
  const Widget = {
    http: {
      async get(url) {
        calls.push(url);
        return { data: { comments: [] } };
      },
    },
  };
  const { encodeRouteId, getCommentsById } = loadWidget({ Widget });
  const commentId = encodeRouteId("episode", 42, [
    { title: "bound", server: "https://bound.example" },
    { title: "unbound", server: "https://unbound.example" },
  ]);

  await assert.rejects(getCommentsById({ commentId, requestTimeout: 80 }), /没有来源返回有效弹幕/);

  assert.equal(calls.length, 1);
  assert.match(calls[0], /^https:\/\/bound\.example\/api\/v2\/comment\/42/);
});

test("an early acceptable search result cannot hide a later exact result inside the fast budget", async () => {
  const Widget = {
    http: {
      async get(url) {
        if (url.includes("cynn.top")) {
          await new Promise((resolve) => setTimeout(resolve, 30));
          return { data: { animes: [{ animeId: 22, animeTitle: "Star City", type: "TV Series" }] } };
        }
        return { data: { animes: [{ animeId: 11, animeTitle: "Star Ci", type: "TV Series" }] } };
      },
    },
  };
  const { searchDanmu } = loadWidget({ Widget });

  const result = await searchDanmu({
    fastTimeout: 100,
    graceMs: 5,
    requestTimeout: 140,
    title: "Star City",
    type: "tv",
  });

  assert.ok(result.animes.length >= 1);
  assert.match(result.animes[0].animeTitle, /Star City.*炊烟/);
});

test("automatic match rejects an S01E02 result for an E01 request", async () => {
  const Widget = {
    http: {
      async post() {
        return {
          data: {
            isMatched: true,
            matches: [{
              animeId: 42,
              animeTitle: "Star City",
              episodeId: 4202,
              episodeTitle: "Star City S01E02",
              type: "TV Series",
            }],
          },
        };
      },
      async get(url) {
        if (url.includes("/bangumi/42")) return { data: { bangumi: { episodes: [] } } };
        return { data: { animes: [] } };
      },
    },
    storage: { async get() { return null; }, async set() {} },
  };
  const { getDetailById } = loadWidget({ Widget });

  await assert.rejects(getDetailById({
    animeId: "",
    episode: 1,
    requestTimeout: 100,
    season: 1,
    server: "https://primary.example",
    title: "Star City",
    type: "tv",
  }), /没有来源返回有效选集/);
});

test("automatic match waits inside the fast budget for stronger episode evidence", async () => {
  const Widget = {
    http: {
      async post(url) {
        const isCynn = url.includes("cynn.top");
        if (isCynn) await new Promise((resolve) => setTimeout(resolve, 30));
        return {
          data: {
            isMatched: true,
            matches: [{
              animeId: isCynn ? 22 : 11,
              animeTitle: "Star City",
              episodeId: isCynn ? 221 : 111,
              ...(isCynn ? { episodeTitle: "Episode 1" } : {}),
              type: "TV Series",
            }],
          },
        };
      },
      async get(url) {
        const isCynn = url.includes("cynn.top");
        return {
          data: {
            bangumi: {
              episodes: [{
                episodeId: isCynn ? 221 : 111,
                episodeNumber: "1",
                episodeTitle: "Episode 1",
              }],
            },
          },
        };
      },
    },
    storage: { async get() { return null; }, async set() {} },
  };
  const { decodeRouteId, getDetailById } = loadWidget({ Widget });

  const episodes = await getDetailById({
    animeId: "",
    episode: 1,
    fastTimeout: 100,
    graceMs: 5,
    requestTimeout: 160,
    season: 1,
    title: "Star City",
    type: "tv",
  });

  assert.equal(decodeRouteId(episodes[0].episodeId).rawId, "221");
});

test("quality fallback scores comments after conversion and blocking", async () => {
  const calls = [];
  const sources = [
    { server: "http://nl.jc.cd/87654321", title: "Alpha" },
    { server: "https://danmu.longemby.com/lilyemby", title: "Lily" },
  ];
  const Widget = {
    http: {
      async post(url) {
        calls.push(url);
        return {
          data: {
            isMatched: true,
            matches: [{
              animeId: 33,
              animeTitle: "Star City",
              episodeId: 333,
              episodeTitle: "Episode 1",
              type: "TV Series",
            }],
          },
        };
      },
      async get(url) {
        calls.push(url);
        if (url.includes("/comment/111")) {
          return {
            data: {
              comments: Array.from({ length: 24 }, (_, index) => ({
                cid: `fast-${index}`,
                m: `廣告內容 ${index}`,
                p: `${index * 75},1,16777215`,
              })),
            },
          };
        }
        if (url.includes("/comment/333")) {
          return {
            data: {
              comments: Array.from({ length: 24 }, (_, index) => ({
                cid: `lily-${index}`,
                m: `Lily 劇情 ${index}`,
                p: `${index * 75},1,16777215`,
              })),
            },
          };
        }
        throw new Error(`unexpected GET ${url}`);
      },
    },
    storage: {
      get() { return JSON.stringify({ "廣": "广", "劇": "剧" }); },
      set() {},
    },
  };
  const { encodeRouteId, getCommentsById, parseMediaIdentity } = loadWidget({ Widget });
  const commentId = encodeRouteId("episode", 111, sources, {
    episodeNumber: "1",
    identity: parseMediaIdentity({ episode: 1, season: 1, title: "Star City", type: "tv" }),
    sourceIds: { "http://nl.jc.cd/87654321": "111" },
  });

  const result = await getCommentsById({
    blockKeywords: "广告",
    commentId,
    convertMode: "t2s",
    graceMs: 5,
    minQuality: 50,
    requestTimeout: 180,
  });

  assert.equal(result.count, 24);
  assert.equal(result.comments.every((comment) => comment.m.startsWith("Lily 剧情")), true);
  assert.equal(calls.includes("https://danmu.longemby.com/lilyemby/api/v2/match"), true);
});

test("deep discovery never fabricates a normal S01E01 filename for specials", () => {
  const { buildMatchBody, parseMediaIdentity } = loadWidget();
  const identity = { ...parseMediaIdentity({ title: "Star OVA" }), episode: 1 };

  assert.equal(buildMatchBody({}, identity).fileName, "Star OVA");
});

test("the real search-detail-comments chain can discover Lily after poor fast comments", async () => {
  const calls = [];
  const Widget = {
    http: {
      async post(url) {
        calls.push(url);
        assert.equal(url, "https://danmu.longemby.com/lilyemby/api/v2/match");
        return {
          data: {
            isMatched: true,
            matches: [{
              animeId: 33,
              animeTitle: "Star City",
              episodeId: 333,
              episodeTitle: "Episode 1",
              type: "TV Series",
            }],
          },
        };
      },
      async get(url) {
        calls.push(url);
        if (url.includes("/search/anime")) {
          const animeId = url.includes("cynn.top") ? 22 : 11;
          return { data: { animes: [{ animeId, animeTitle: "Star City", type: "TV Series" }] } };
        }
        if (url.includes("/bangumi/11")) {
          return { data: { bangumi: { episodes: [{ episodeId: 111, episodeNumber: "1", episodeTitle: "Episode 1" }] } } };
        }
        if (url.includes("/bangumi/22")) {
          return { data: { bangumi: { episodes: [{ episodeId: 222, episodeNumber: "1", episodeTitle: "Episode 1" }] } } };
        }
        if (url.includes("/comment/333")) {
          return {
            data: {
              comments: Array.from({ length: 24 }, (_, index) => ({
                cid: `lily-${index}`,
                m: `Lily 剧情评论 ${index}`,
                p: `${index * 75},1,16777215`,
              })),
            },
          };
        }
        if (url.includes("/comment/111") || url.includes("/comment/222")) {
          return { data: { comments: [{ cid: url, m: "666666", p: "0,1,16777215" }] } };
        }
        throw new Error(`unexpected GET ${url}`);
      },
    },
    storage: { async get() { return null; }, async set() {} },
  };
  const { getCommentsById, getDetailById, searchDanmu } = loadWidget({ Widget });

  const search = await searchDanmu({ graceMs: 5, requestTimeout: 180, title: "Star City", type: "tv" });
  const episodes = await getDetailById({ animeId: search.animes[0].animeId, graceMs: 5, requestTimeout: 180 });
  const comments = await getCommentsById({
    commentId: episodes[0].episodeId,
    graceMs: 5,
    minQuality: 50,
    requestTimeout: 180,
  });

  assert.equal(comments.count, 24);
  assert.equal(comments.comments.every((comment) => comment.m.startsWith("Lily 剧情评论")), true);
  assert.equal(calls.includes("https://danmu.longemby.com/lilyemby/api/v2/match"), true);
});
