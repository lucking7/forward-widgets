#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const args = process.argv.slice(2);
const targetArg = args.find((arg) => !arg.startsWith("--"));
const title = (args.find((arg) => arg.startsWith("--title=")) || "").slice(8) || "让子弹飞";
const type = (args.find((arg) => arg.startsWith("--type=")) || "").slice(7) || "movie";
const timeoutValue = Number((args.find((arg) => arg.startsWith("--http-timeout=")) || "").slice(15));
const httpTimeout = Number.isFinite(timeoutValue) && timeoutValue > 0 ? timeoutValue : 20000;
const target = path.resolve(targetArg || path.join(__dirname, "widgets/danmu/danmu-select.js"));
const calls = [];
const storage = new Map();

async function request(method, url, body, options = {}) {
  const call = { method, url };
  const startedAt = Date.now();
  calls.push(call);
  try {
    const response = await fetch(url, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: options.headers,
      redirect: options.allow_redirects === false ? "manual" : "follow",
      signal: AbortSignal.timeout(httpTimeout),
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (_) {
      data = text;
    }
    call.status = response.status;
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return {
      data,
      headers: Object.fromEntries(response.headers.entries()),
      status: response.status,
    };
  } catch (error) {
    call.error = `${error.name}: ${error.message}`;
    throw error;
  } finally {
    call.elapsedMs = Date.now() - startedAt;
  }
}

const Widget = {
  http: {
    get: (url, options) => request("GET", url, undefined, options),
    post: (url, body, options) => request("POST", url, body, options),
  },
  storage: {
    get: (key) => storage.get(key) || null,
    remove: (key) => storage.delete(key),
    set: (key, value) => storage.set(key, value),
  },
};

const context = { URL, Widget, console, decodeURIComponent, encodeURIComponent };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(target, "utf8"), context, { filename: target });

(async () => {
  const startedAt = Date.now();
  const search = await context.searchDanmu({ title, type });
  if (!search.animes.length) throw new Error("live search returned no candidates");

  const episodes = await context.getDetailById({
    animeId: search.animes[0].animeId,
    title,
    type,
  });
  if (!episodes.length) throw new Error("live detail returned no episodes");

  const comments = await context.getCommentsById({
    commentId: episodes[0].episodeId,
    maxCount: 3000,
    mergeMode: "quality",
  });

  console.log(JSON.stringify({
    ok: true,
    target,
    title: search.animes[0].animeTitle,
    episode: episodes[0].episodeTitle,
    commentCount: comments && comments.count,
    elapsedMs: Date.now() - startedAt,
    calls,
  }, null, 2));
})().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    target,
    error: `${error.name}: ${error.message}`,
    calls,
  }, null, 2));
  process.exitCode = 1;
});
