#!/usr/bin/env node

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const args = process.argv.slice(2);
const strictRuntime = args.includes("--strict-runtime");
const mutateIdThread = args.includes("--mutate-id-thread");
const targetArg = args.find((arg) => !arg.startsWith("--"));
const target = path.resolve(targetArg || path.join(__dirname, "widgets/danmu/danmu-select.js"));

function goodComments(prefix, count) {
  return Array.from({ length: count }, (_, index) => ({
    cid: `${prefix}-${index}`,
    m: `剧情评论 ${index}`,
    p: `${index * 60},1,16777215`,
  }));
}

function createWidgetMock(calls) {
  return {
    http: {
      async get(url) {
        calls.push(url);

        if (url.includes("longemby.com")) {
          throw new Error(`Lily should not run after a sufficient fast-tier result: ${url}`);
        }

        if (url.includes("/api/v2/search/anime")) {
          const isCynn = url.includes("cynn.top");
          return {
            data: {
              animes: [{
                animeId: isCynn ? 202 : 101,
                animeTitle: "让子弹飞",
                type: "Movie",
              }],
            },
          };
        }

        if (url.includes("/api/v2/bangumi/101")) {
          return {
            data: {
              bangumi: {
                episodes: [{ episodeId: 1001, episodeNumber: "1", episodeTitle: "正片" }],
              },
            },
          };
        }

        if (url.includes("/api/v2/bangumi/202")) {
          return {
            data: {
              bangumi: {
                episodes: [{ episodeId: 2002, episodeNumber: "1", episodeTitle: "正片" }],
              },
            },
          };
        }

        if (url.includes("/api/v2/comment/1001")) {
          return {
            data: {
              count: 2,
              comments: [
                { cid: "noise-1", m: "666666", p: "0,1,16777215" },
                { cid: "noise-2", m: "哈哈哈哈", p: "60,1,16777215" },
              ],
            },
          };
        }

        if (url.includes("/api/v2/comment/2002")) {
          return { data: { count: 24, comments: goodComments("cynn", 24) } };
        }

        if (url.includes("/api/v2/comment/")) {
          return {
            data: {
              count: 1,
              comments: [{ cid: "wrong", m: "另一部影片的弹幕", p: "1,1,16777215" }],
            },
          };
        }

        throw new Error(`unmocked GET: ${url}`);
      },
      async post(url) {
        calls.push(url);
        throw new Error(`unexpected POST: ${url}`);
      },
    },
    storage: {
      async get() { return null; },
      async set() {},
      async remove() {},
    },
  };
}

function loadWidget(filename, Widget) {
  let source = fs.readFileSync(filename, "utf8");
  if (mutateIdThread) {
    const original = "hasSourceIds ? sourceIds[source.server] : route.rawId,";
    assert.ok(source.includes(original), "mutation target was not found");
    source = source.replace(original, '"999999",');
  }

  const context = {
    URL,
    Widget,
    console,
    decodeURIComponent,
    encodeURIComponent,
  };
  if (!strictRuntime) {
    context.clearTimeout = clearTimeout;
    context.setTimeout = setTimeout;
  }
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename });
  return context;
}

async function runDanmuFlow(context, calls) {
  assert.deepEqual(
    Array.from(context.WidgetMetadata.modules, (module) => module.id),
    ["searchDanmu", "getDetail", "getComments"],
  );

  const search = await context.searchDanmu({
    title: "让子弹飞",
    type: "movie",
    graceMs: 5,
    requestTimeout: 200,
  });
  assert.equal(search.animes.length, 1);
  assert.match(search.animes[0].animeTitle, /^让子弹飞/);

  const episodes = await context.getDetailById({
    animeId: search.animes[0].animeId,
    title: "让子弹飞",
    type: "movie",
    graceMs: 5,
    requestTimeout: 200,
  });
  assert.equal(episodes.length, 1);

  const comments = await context.getCommentsById({
    commentId: episodes[0].episodeId,
    mergeMode: "quality",
    minQuality: 50,
    graceMs: 5,
    requestTimeout: 200,
  });

  assert.equal(comments.count, 24);
  assert.equal(comments.comments.every((comment) => comment.m.startsWith("剧情评论")), true);

  assert.equal(calls.some((url) => url.includes("/api/v2/bangumi/101")), true);
  assert.equal(calls.some((url) => url.includes("/api/v2/bangumi/202")), true);
  assert.equal(calls.some((url) => url.includes("/api/v2/comment/1001")), true);
  assert.equal(calls.some((url) => url.includes("/api/v2/comment/2002")), true);
  assert.equal(calls.some((url) => url.includes("/api/v2/comment/999999")), false);
  assert.equal(calls.some((url) => url.includes("longemby.com")), false);

  return {
    animeTitle: search.animes[0].animeTitle,
    commentCount: comments.count,
    episodeTitle: episodes[0].episodeTitle,
    requestCount: calls.length,
  };
}

(async () => {
  const calls = [];
  const context = loadWidget(target, createWidgetMock(calls));
  const result = await runDanmuFlow(context, calls);
  console.log("PASS", {
    mode: strictRuntime ? "strict-forward-runtime" : "official-node-bridge",
    target,
    ...result,
    calls,
  });
})().catch((error) => {
  console.error("FAIL", {
    mode: strictRuntime ? "strict-forward-runtime" : "official-node-bridge",
    target,
    error: `${error.name}: ${error.message}`,
  });
  process.exitCode = 1;
});
