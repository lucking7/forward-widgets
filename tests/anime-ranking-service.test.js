const assert = require("node:assert/strict");
const test = require("node:test");

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = value;
    },
    json(value) {
      this.body = value;
      return this;
    },
  };
}

test("cron rejects an invalid bearer token before collecting ranking data", async () => {
  const { createCronHandler } = require("../api/cron/anime-rankings.js");
  let collectionCalls = 0;
  const handler = createCronHandler({
    secret: "correct-secret",
    async runCollection() {
      collectionCalls += 1;
    },
  });
  const response = createResponse();

  await handler({ method: "GET", headers: { authorization: "Bearer wrong" } }, response);

  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.body, { error: "unauthorized" });
  assert.equal(collectionCalls, 0);
});

test("the production Cron wiring resolves runCollection from the production service", async () => {
  const { createProductionCronHandler } = require("../api/cron/anime-rankings.js");
  const response = createResponse();
  let serviceCalls = 0;
  const handler = createProductionCronHandler({
    secret: "s",
    getService() {
      return {
        async runCollection() {
          serviceCalls += 1;
          return { status: "updated", runKey: "production-wire" };
        },
      };
    },
  });

  await handler({ method: "GET", headers: { authorization: "Bearer s" } }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.runKey, "production-wire");
  assert.equal(serviceCalls, 1);
});

test("an authenticated cron publishes the current AniList ranking through the realtime API", async () => {
  const { createCronHandler } = require("../api/cron/anime-rankings.js");
  const { createRankingHandler } = require("../api/v1/rankings/anime/realtime.js");
  const { createRankingService } = require("../lib/anime-rankings/service.js");
  let current = null;
  const store = {
    async readCurrent() {
      return current;
    },
    async commitCurrent(value) {
      current = { value, etag: "etag-1" };
      return current;
    },
  };
  const service = createRankingService({
    store,
    clock: () => new Date("2026-08-12T02:30:00.000Z"),
    async fetchImpl(url, options) {
      assert.equal(url, "https://graphql.anilist.co");
      assert.equal(options.method, "POST");
      assert.equal(options.signal instanceof AbortSignal, true);
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            data: {
              Page: {
                media: [
                  {
                    id: 21,
                    idMal: 21,
                    title: { romaji: "One Piece", english: "One Piece", native: "ONE PIECE" },
                    synonyms: [],
                    format: "TV",
                    season: "SPRING",
                    seasonYear: 2026,
                    episodes: null,
                    startDate: { year: 1999, month: 10, day: 20 },
                    countryOfOrigin: "JP",
                    genres: ["Action"],
                    averageScore: 88,
                    popularity: 900000,
                    trending: 308,
                    siteUrl: "https://anilist.co/anime/21",
                  },
                  {
                    id: 178789,
                    idMal: 62592,
                    title: { romaji: "Mushoku Tensei III", english: "Mushoku Tensei Season 3", native: "無職転生Ⅲ" },
                    synonyms: [],
                    format: "TV",
                    season: "SUMMER",
                    seasonYear: 2026,
                    episodes: 12,
                    startDate: { year: 2026, month: 7, day: 5 },
                    countryOfOrigin: "JP",
                    genres: ["Fantasy"],
                    averageScore: 84,
                    popularity: 200000,
                    trending: 300,
                    siteUrl: "https://anilist.co/anime/178789",
                  },
                ],
              },
            },
          };
        },
      };
    },
  });
  const cronResponse = createResponse();

  await createCronHandler({ secret: "secret", runCollection: service.runCollection })(
    { method: "GET", headers: { authorization: "Bearer secret" } },
    cronResponse,
  );

  assert.equal(cronResponse.statusCode, 200);
  assert.equal(cronResponse.body.status, "updated");
  assert.equal(cronResponse.body.runKey, "2026-08-12T02:00:00.000Z");

  const rankingResponse = createResponse();
  await createRankingHandler({ getRanking: service.getRanking })(
    { method: "GET", headers: {} },
    rankingResponse,
  );

  assert.equal(rankingResponse.statusCode, 200);
  assert.equal(rankingResponse.body.schemaVersion, 1);
  assert.equal(rankingResponse.body.mediaType, "anime");
  assert.equal(rankingResponse.body.window, "realtime");
  assert.equal(rankingResponse.body.partial, false);
  assert.equal(rankingResponse.body.stale, false);
  assert.deepEqual(
    rankingResponse.body.items.map((item) => [item.canonicalId, item.rank, item.score]),
    [["anilist:21", 1, 1], ["anilist:178789", 2, 0.5]],
  );
});

test("the day API aggregates hourly ranks with decay, persistence, and momentum", async () => {
  const { createCronHandler } = require("../api/cron/anime-rankings.js");
  const { createRankingHandler } = require("../api/v1/rankings/anime/day.js");
  const { createRankingService } = require("../lib/anime-rankings/service.js");
  let current = null;
  let currentTime = new Date("2026-08-12T00:20:00.000Z");
  let sampleIndex = 0;
  const samples = [
    [[1, "Alpha", 100], [2, "Beta", 90], [3, "Gamma", 80]],
    [[2, "Beta", 110], [1, "Alpha", 95]],
    [[2, "Beta", 120], [1, "Alpha", 90]],
  ];
  const store = {
    async readCurrent() { return current; },
    async commitCurrent(value) {
      current = { value, etag: "etag-" + (sampleIndex + 1) };
      return current;
    },
  };
  const service = createRankingService({
    store,
    clock: () => currentTime,
    async fetchImpl() {
      const media = samples[sampleIndex].map(([id, title, trending]) => ({
        id,
        idMal: id,
        title: { romaji: title, english: title, native: title },
        synonyms: [],
        format: "TV",
        season: "SUMMER",
        seasonYear: 2026,
        startDate: { year: 2026, month: 7, day: 1 },
        countryOfOrigin: "JP",
        genres: [],
        trending,
        siteUrl: "https://anilist.co/anime/" + id,
      }));
      return { ok: true, status: 200, async json() { return { data: { Page: { media } } }; } };
    },
  });
  const cron = createCronHandler({ secret: "secret", runCollection: service.runCollection });

  for (sampleIndex = 0; sampleIndex < samples.length; sampleIndex += 1) {
    const response = createResponse();
    await cron({ method: "GET", headers: { authorization: "Bearer secret" } }, response);
    assert.equal(response.statusCode, 200);
    currentTime = new Date(currentTime.getTime() + 60 * 60 * 1000);
  }

  const response = createResponse();
  await createRankingHandler({ getRanking: service.getRanking })(
    { method: "GET", headers: {} },
    response,
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.window, "day");
  assert.deepEqual(response.body.coverage, { expected: 24, actual: 3, ratio: 0.125 });
  assert.equal(response.body.partial, true);
  assert.equal(response.body.stale, false);
  assert.deepEqual(response.body.items.map((item) => item.canonicalId), ["anilist:2", "anilist:1", "anilist:3"]);
  assert.equal(response.body.items[2].score > 0, true);
});

test("the week API exposes a 168-hour window without pretending a cold start is complete", async () => {
  const { createCronHandler } = require("../api/cron/anime-rankings.js");
  const { createRankingHandler } = require("../api/v1/rankings/anime/week.js");
  const { createRankingService } = require("../lib/anime-rankings/service.js");
  let current = null;
  const store = {
    async readCurrent() { return current; },
    async commitCurrent(value) { current = { value, etag: "one" }; return current; },
  };
  const service = createRankingService({
    store,
    clock: () => new Date("2026-08-12T04:15:00.000Z"),
    async fetchImpl() {
      return {
        ok: true,
        status: 200,
        async json() {
          return { data: { Page: { media: [{
            id: 9,
            title: { romaji: "Nine", english: "Nine", native: "九" },
            synonyms: [],
            trending: 99,
            siteUrl: "https://anilist.co/anime/9",
          }] } } };
        },
      };
    },
  });
  const cronResponse = createResponse();
  await createCronHandler({ secret: "s", runCollection: service.runCollection })(
    { method: "GET", headers: { authorization: "Bearer s" } },
    cronResponse,
  );

  const response = createResponse();
  await createRankingHandler({ getRanking: service.getRanking })(
    { method: "GET", headers: {} },
    response,
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.window, "week");
  assert.deepEqual(response.body.coverage, { expected: 168, actual: 1, ratio: 0.005952 });
  assert.equal(response.body.partial, true);
});

test("Bahamut is a deduplicated auxiliary signal and only joins an exact AniList identity", async () => {
  const { createCronHandler } = require("../api/cron/anime-rankings.js");
  const { createRankingHandler } = require("../api/v1/rankings/anime/day.js");
  const { createRankingService } = require("../lib/anime-rankings/service.js");
  let current = null;
  let currentTime = new Date("2026-08-12T00:17:00.000Z");
  let bahamutCalls = 0;
  const store = {
    async readCurrent() { return current; },
    async commitCurrent(value) { current = { value, etag: "v" + value.version }; return current; },
  };
  const bahamutHtml = `
    <div class="ACG-mainbox1">
      <span class="ACG-mainumber">No.1</span>
      <a href="acgDetail.php?s=141656">關於我轉生變成史萊姆這檔事 第四季</a>
      <span id="span_want2paly_141656">134600</span>
      <div class="ACG-mainboxpoint">評分<span>4.9</span></div>
      <li>奇幻冒險 / 2026-04-03</li>
      <div class="ACG-mainbox2B"><img alt="關於我轉生變成史萊姆這檔事 第四季,転生したらスライムだった件 第4期,That Time I Got Reincarnated as a Slime Season 4"></div>
      <!--資料結束-->
    </div>
    <div class="ACG-mainbox1">
      <span class="ACG-mainumber">No.2</span>
      <a href="acgDetail.php?s=999999">未匹配作品</a>
      <span id="span_want2paly_999999">50000</span>
      <div class="ACG-mainboxpoint">評分<span>4.8</span></div>
      <li>奇幻冒險 / 2026-04-03</li>
      <div class="ACG-mainbox2B"><img alt="未匹配作品,Unmatched Work"></div>
      <!--資料結束-->
    </div>`;
  const service = createRankingService({
    store,
    bahamutEnabled: true,
    clock: () => currentTime,
    async fetchImpl(url, options) {
      if (url === "https://graphql.anilist.co") {
        return {
          ok: true,
          status: 200,
          async json() {
            return { data: { Page: { media: [
              {
                id: 182205,
                idMal: 59970,
                title: {
                  romaji: "Tensei Shitara Slime Datta Ken 4th Season",
                  english: "That Time I Got Reincarnated as a Slime Season 4",
                  native: "転生したらスライムだった件 第4期",
                },
                synonyms: [],
                format: "TV",
                seasonYear: 2026,
                startDate: { year: 2026, month: 4, day: 3 },
                trending: 100,
                siteUrl: "https://anilist.co/anime/182205",
              },
              {
                id: 999,
                title: { romaji: "Different Show", english: "Different Show", native: "別作品" },
                synonyms: [],
                format: "TV",
                seasonYear: 2026,
                startDate: { year: 2026, month: 4, day: 3 },
                trending: 90,
                siteUrl: "https://anilist.co/anime/999",
              },
            ] } } };
          },
        };
      }
      assert.match(url, /^https:\/\/acg\.gamer\.com\.tw\/billboard\.php/);
      assert.equal(options.signal instanceof AbortSignal, true);
      bahamutCalls += 1;
      return { ok: true, status: 200, async text() { return bahamutHtml; } };
    },
  });
  const cron = createCronHandler({ secret: "s", runCollection: service.runCollection });

  await cron({ method: "GET", headers: { authorization: "Bearer s" } }, createResponse());
  currentTime = new Date("2026-08-12T06:17:00.000Z");
  await cron({ method: "GET", headers: { authorization: "Bearer s" } }, createResponse());
  currentTime = new Date("2026-08-12T07:17:00.000Z");
  await cron({ method: "GET", headers: { authorization: "Bearer s" } }, createResponse());

  const response = createResponse();
  await createRankingHandler({ getRanking: service.getRanking })(
    { method: "GET", headers: {} },
    response,
  );

  assert.equal(bahamutCalls, 2);
  assert.deepEqual(response.body.sources.map((source) => source.id), ["anilist", "bahamut"]);
  const slime = response.body.items.find((item) => item.canonicalId === "anilist:182205");
  assert.deepEqual(slime.sources, ["anilist", "bahamut"]);
  assert.equal(slime.bahamutId, "141656");
  assert.equal(response.body.items.some((item) => item.canonicalId === "bahamut:999999"), false);
  const savedBahamut = current.value.snapshots.filter((snapshot) => snapshot.source === "bahamut");
  assert.equal(savedBahamut.length, 1);
  assert.equal(savedBahamut[0].effectiveAt, "2026-08-12T00:00:00.000Z");
  assert.equal(savedBahamut[0].checkedAt, "2026-08-12T06:00:00.000Z");
});

test("Blob publication writes an immutable version before a CAS-protected current state", async () => {
  const { Readable } = require("node:stream");
  const { createBlobRankingStore } = require("../lib/anime-rankings/blob-store.js");
  const puts = [];
  const client = {
    async get(pathname, options) {
      assert.equal(pathname, "anime-rankings/state/current.json");
      assert.deepEqual(options, { access: "private", useCache: false });
      return {
        statusCode: 200,
        blob: { etag: "etag-current" },
        stream: Readable.from([JSON.stringify({ version: "saved", rankings: {} })]),
      };
    },
    async put(pathname, body, options) {
      puts.push({ pathname, body, options });
      return { pathname, etag: "etag-" + puts.length, url: "https://blob.example/" + pathname };
    },
  };
  const store = createBlobRankingStore({ client });

  const current = await store.readCurrent();
  await store.commitCurrent(
    { version: "next", rankings: { day: { items: [] } } },
    { expectedEtag: current.etag, runKey: "2026-08-12T06:00:00.000Z" },
  );

  assert.equal(current.value.version, "saved");
  assert.equal(current.etag, "etag-current");
  assert.equal(puts.length, 2);
  assert.match(puts[0].pathname, /^anime-rankings\/versions\/2026-08-12T06-00-00-000Z-/);
  assert.equal(puts[0].options.access, "private");
  assert.equal(puts[0].options.addRandomSuffix, true);
  assert.equal(Object.prototype.hasOwnProperty.call(puts[0].options, "allowOverwrite"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(puts[0].options, "ifMatch"), false);
  assert.equal(puts[1].pathname, "anime-rankings/state/current.json");
  assert.equal(puts[1].options.ifMatch, "etag-current");
  assert.equal(puts[1].options.addRandomSuffix, false);
});

test("ranking and meta APIs mark the last successful data stale after a collector outage", async () => {
  const { createCronHandler } = require("../api/cron/anime-rankings.js");
  const { createRankingHandler } = require("../api/v1/rankings/anime/realtime.js");
  const { createMetaHandler } = require("../api/v1/rankings/anime/meta.js");
  const { createRankingService } = require("../lib/anime-rankings/service.js");
  let current = null;
  let currentTime = new Date("2026-08-12T00:10:00.000Z");
  const store = {
    async readCurrent() { return current; },
    async commitCurrent(value) { current = { value, etag: "e1" }; return current; },
  };
  const service = createRankingService({
    store,
    clock: () => currentTime,
    async fetchImpl() {
      return {
        ok: true,
        status: 200,
        async json() {
          return { data: { Page: { media: [{
            id: 1,
            title: { romaji: "A", english: "A", native: "A" },
            synonyms: [],
            trending: 1,
          }] } } };
        },
      };
    },
  });
  await createCronHandler({ secret: "s", runCollection: service.runCollection })(
    { method: "GET", headers: { authorization: "Bearer s" } },
    createResponse(),
  );
  currentTime = new Date("2026-08-12T04:01:00.000Z");

  const rankingResponse = createResponse();
  await createRankingHandler({ getRanking: service.getRanking })(
    { method: "GET", headers: {} },
    rankingResponse,
  );
  const metaResponse = createResponse();
  await createMetaHandler({ getMeta: service.getMeta })(
    { method: "GET", headers: {} },
    metaResponse,
  );

  assert.equal(rankingResponse.body.stale, true);
  assert.equal(rankingResponse.body.sources[0].fresh, false);
  assert.equal(metaResponse.statusCode, 200);
  assert.equal(metaResponse.body.modelVersion, "rank-ewma-v1");
  assert.equal(metaResponse.body.windows.realtime.stale, true);
  assert.equal(metaResponse.body.lastRunKey, "2026-08-12T00:00:00.000Z");
});

test("a Bahamut block degrades to AniList instead of preventing a fresh ranking", async () => {
  const { createCronHandler } = require("../api/cron/anime-rankings.js");
  const { createRankingService } = require("../lib/anime-rankings/service.js");
  let current = null;
  const store = {
    async readCurrent() { return current; },
    async commitCurrent(value) { current = { value, etag: "ok" }; return current; },
  };
  const service = createRankingService({
    store,
    bahamutEnabled: true,
    clock: () => new Date("2026-08-12T08:17:00.000Z"),
    async fetchImpl(url) {
      if (url.includes("anilist")) {
        return {
          ok: true,
          status: 200,
          async json() {
            return { data: { Page: { media: [{
              id: 7,
              title: { romaji: "Seven", english: "Seven", native: "七" },
              synonyms: [],
              trending: 7,
            }] } } };
          },
        };
      }
      return { ok: false, status: 403, async text() { return "blocked"; } };
    },
  });
  const response = createResponse();

  await createCronHandler({ secret: "s", runCollection: service.runCollection })(
    { method: "GET", headers: { authorization: "Bearer s" } },
    response,
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, "updated");
  assert.deepEqual(response.body.warnings, ["bahamut_unavailable"]);
  assert.deepEqual(current.value.rankings.day.sources.map((source) => source.id), ["anilist"]);
});

test("a primary collector failure returns a bounded 502 and does not expose upstream details", async () => {
  const { createCronHandler } = require("../api/cron/anime-rankings.js");
  const response = createResponse();
  const diagnostics = [];

  await createCronHandler({
    secret: "s",
    logger: { error(event, details) { diagnostics.push({ event, details }); } },
    async runCollection() {
      throw new Error("upstream body contains a private diagnostic");
    },
  })({ method: "GET", headers: { authorization: "Bearer s" } }, response);

  assert.equal(response.statusCode, 502);
  assert.deepEqual(response.body, { error: "collection_failed" });
  assert.equal(JSON.stringify(response.body).includes("private diagnostic"), false);
  assert.deepEqual(diagnostics, [{
    event: "anime_ranking_collection_failed",
    details: { errorName: "Error" },
  }]);
  assert.equal(JSON.stringify(diagnostics).includes("private diagnostic"), false);
});

test("Blob state treats a missing private object as an empty first run", async () => {
  const { createBlobRankingStore } = require("../lib/anime-rankings/blob-store.js");
  const client = {
    async get() {
      const error = new Error("not found");
      error.name = "BlobNotFoundError";
      throw error;
    },
  };

  const current = await createBlobRankingStore({ client }).readCurrent();

  assert.equal(current, null);
});

test("the first Blob current pointer is create-only so concurrent initialization can retry", async () => {
  const { createBlobRankingStore } = require("../lib/anime-rankings/blob-store.js");
  const puts = [];
  const client = {
    async put(pathname, body, options) {
      puts.push({ pathname, options });
      return { url: "https://blob.example/" + pathname, etag: "etag" };
    },
  };

  await createBlobRankingStore({ client }).commitCurrent(
    { version: "first", rankings: {} },
    { expectedEtag: null, runKey: "2026-08-12T00:00:00.000Z" },
  );

  assert.equal(puts[1].pathname, "anime-rankings/state/current.json");
  assert.equal(puts[1].options.allowOverwrite, false);
  assert.equal(Object.prototype.hasOwnProperty.call(puts[1].options, "ifMatch"), false);
});

test("a CAS loser re-reads once and accepts the winning hourly publication", async () => {
  const { createRankingService } = require("../lib/anime-rankings/service.js");
  let current = null;
  let fetchCalls = 0;
  let commitCalls = 0;
  const store = {
    async readCurrent() { return current; },
    async commitCurrent(value) {
      commitCalls += 1;
      current = { value, etag: "winner" };
      const error = new Error("etag changed");
      error.name = "RankingStateConflictError";
      throw error;
    },
  };
  const service = createRankingService({
    store,
    clock: () => new Date("2026-08-12T09:17:00.000Z"),
    async fetchImpl() {
      fetchCalls += 1;
      return {
        ok: true,
        status: 200,
        async json() {
          return { data: { Page: { media: [{
            id: 17,
            title: { romaji: "Seventeen", english: "Seventeen", native: "十七" },
            synonyms: [],
            trending: 17,
          }] } } };
        },
      };
    },
  });

  const result = await service.runCollection();

  assert.equal(result.status, "duplicate");
  assert.equal(fetchCalls, 1);
  assert.equal(commitCalls, 1);
});

test("day and week APIs slide their windows against request time after collection stops", async () => {
  const { createRankingService } = require("../lib/anime-rankings/service.js");
  let now = new Date("2026-08-12T00:17:00.000Z");
  let current = null;
  const store = {
    async readCurrent() { return current; },
    async commitCurrent(value) { current = { value, etag: "saved" }; return current; },
  };
  const service = createRankingService({
    store,
    clock: () => now,
    async fetchImpl() {
      return {
        ok: true,
        status: 200,
        async json() {
          return { data: { Page: { media: [{
            id: 31,
            title: { romaji: "Thirty One", english: "Thirty One", native: "三十一" },
            synonyms: [],
            trending: 31,
          }] } } };
        },
      };
    },
  });
  await service.runCollection();
  now = new Date("2026-08-13T01:17:00.000Z");

  const day = await service.getRanking("day");
  const week = await service.getRanking("week");

  assert.deepEqual(day.coverage, { expected: 24, actual: 0, ratio: 0 });
  assert.equal(day.partial, true);
  assert.equal(day.stale, true);
  assert.deepEqual(day.items, []);
  assert.deepEqual(week.coverage, { expected: 168, actual: 1, ratio: 0.005952 });
  assert.equal(week.stale, true);
});

test("Bahamut exact aliases cannot bridge conflicting explicit seasons", () => {
  const { matchBahamutSnapshot } = require("../lib/anime-rankings/bahamut.js");
  const bahamut = {
    source: "bahamut",
    items: [{
      canonicalId: "bahamut:1",
      aliases: ["Example Season 2", "Example"],
      airDate: "2026-01-01",
    }],
  };
  const aniList = {
    source: "anilist",
    items: [{
      canonicalId: "anilist:1",
      anilistId: 1,
      title: { english: "Example Season 1" },
      synonyms: ["Example"],
      startDate: { year: 2026 },
    }],
  };

  const matched = matchBahamutSnapshot(bahamut, aniList);

  assert.deepEqual(matched.items, []);

  const missingSeason = matchBahamutSnapshot(bahamut, {
    source: "anilist",
    items: [{
      canonicalId: "anilist:2",
      anilistId: 2,
      title: { english: "Example" },
      synonyms: [],
      startDate: { year: 2026 },
    }],
  });
  assert.deepEqual(missingSeason.items, []);
});

test("an unchanged Bahamut page is reprojected onto current AniList identities without duplicate weight", async () => {
  const { createRankingService } = require("../lib/anime-rankings/service.js");
  let now = new Date("2026-08-01T00:17:00.000Z");
  let current = null;
  let aniListCalls = 0;
  const html = `
    <div class="ACG-mainbox1">
      <span class="ACG-mainumber">No.1</span>
      <a href="acgDetail.php?s=42">Target Show</a>
      <span id="span_want2paly_42">100</span>
      <div class="ACG-mainboxpoint">評分<span>4.5</span></div>
      <li>動畫 / 2026-08-01</li>
      <div class="ACG-mainbox2B"><img alt="Target Show"></div>
      <!--資料結束-->
    </div>`;
  const store = {
    async readCurrent() { return current; },
    async commitCurrent(value) { current = { value, etag: "e" }; return current; },
  };
  const service = createRankingService({
    store,
    bahamutEnabled: true,
    clock: () => now,
    async fetchImpl(url) {
      if (url.includes("anilist")) {
        aniListCalls += 1;
        const isFirst = aniListCalls === 1;
        return { ok: true, status: 200, async json() { return { data: { Page: { media: [{
          id: isFirst ? 1 : 42,
          title: { english: isFirst ? "Other Show" : "Target Show" },
          synonyms: [],
          startDate: { year: 2026, month: 8, day: 1 },
          trending: 100,
        }] } } }; } };
      }
      return { ok: true, status: 200, async text() { return html; } };
    },
  });

  await service.runCollection();
  now = new Date("2026-08-01T06:17:00.000Z");
  await service.runCollection();
  now = new Date("2026-08-10T06:17:00.000Z");
  await service.runCollection();

  const snapshots = current.value.snapshots.filter((snapshot) => snapshot.source === "bahamut");
  assert.equal(snapshots.length, 1);
  assert.equal(snapshots[0].effectiveAt, "2026-08-01T00:00:00.000Z");
  assert.equal(snapshots[0].checkedAt, "2026-08-10T06:00:00.000Z");
  assert.deepEqual(snapshots[0].items.map((item) => item.canonicalId), ["anilist:42"]);
});

test("Bahamut semantic hashes include identity aliases used for strict projection", () => {
  const { parseBahamutHtml } = require("../lib/anime-rankings/bahamut.js");
  function html(alias) {
    return `<div class="ACG-mainbox1">
      <span class="ACG-mainumber">No.1</span>
      <a href="acgDetail.php?s=7">作品</a>
      <span id="span_want2paly_7">100</span>
      <div class="ACG-mainboxpoint">評分<span>4.5</span></div>
      <li>動畫 / 2026-08-01</li>
      <div class="ACG-mainbox2B"><img alt="作品,${alias}"></div>
      <!--資料結束--></div>`;
  }

  const first = parseBahamutHtml(html("Alias One"), "2026-08-12T00:00:00.000Z");
  const second = parseBahamutHtml(html("Alias Two"), "2026-08-12T00:00:00.000Z");

  assert.notEqual(first.contentHash, second.contentHash);
});

test("Blob version retention prunes objects beyond the configured rolling limit", async () => {
  const { createBlobRankingStore } = require("../lib/anime-rankings/blob-store.js");
  const deleted = [];
  const client = {
    async put(pathname) { return { url: "https://blob.example/" + pathname, etag: "e" }; },
    async list() {
      return { hasMore: false, blobs: [
        { url: "https://blob.example/old", uploadedAt: new Date("2026-01-01") },
        { url: "https://blob.example/newer", uploadedAt: new Date("2026-01-02") },
        { url: "https://blob.example/newest", uploadedAt: new Date("2026-01-03") },
      ] };
    },
    async del(values) { deleted.push(...values); },
  };

  await createBlobRankingStore({ client, versionRetention: 2 }).commitCurrent(
    { version: "next", rankings: {} },
    { expectedEtag: null, runKey: "2026-08-12T00:00:00.000Z" },
  );

  assert.deepEqual(deleted, ["https://blob.example/old"]);
});
