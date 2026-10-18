#!/usr/bin/env node

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const target = path.resolve(__dirname, "widgets/douban/douban-discovery.js");
const personId = process.env.DOUBAN_LIVE_PERSON_ID || "1048026";

const Widget = {
  http: {
    async get(url, options = {}) {
      const response = await fetch(url, {
        headers: options.headers || {},
        redirect: options.allow_redirects === false ? "manual" : "follow",
        signal: AbortSignal.timeout(15000),
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (error) {
        data = text;
      }
      return { status: response.status, data };
    },
  },
};

function loadWidget() {
  const source = fs.readFileSync(target, "utf8");
  const context = { Widget, console, decodeURIComponent, encodeURIComponent };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: target });
  return context;
}

(async () => {
  const context = loadWidget();
  const results = {
    publicTop250: (await context.loadPublicCollections({ collection: "movie_top250", page: 1 })).length,
    customCollection: (await context.loadCustomList({
      url: "https://m.douban.com/subject_collection/movie_top250",
      page: 1,
    })).length,
    movieRecommendations: (await context.loadRecommendations({
      mediaType: "movie",
      category: "热门",
      region: "全部",
      page: 1,
    })).length,
    movieExplore: (await context.loadPreferenceExplore({
      mediaType: "movie",
      minRating: "8",
      sort: "S",
      offset: 0,
    })).length,
    peopleWorks: (await context.loadPeopleWorks({ person: personId, sort: "vote", page: 1 })).length,
    highlights: (await context.loadPublicCollections({ collection: "highlights", page: 1 })).length,
  };

  for (const collection of ["movie_weekly", "tv_chinese_best", "tv_global_best", "show_chinese_best", "show_global_best"]) {
    results[collection] = (await context.loadPublicCollections({ collection })).length;
  }
  for (const options of [
    { category: "all" }, { category: "recent", recent: "new:日本" },
    { category: "classic", classic: "top250" }, { category: "underrated", underrated: "全部" },
    { category: "region", region: "法国" }, { category: "genre", genre: "科幻" },
  ]) {
    results["movie_" + options.category] = (await context.loadMovieCatalog(options)).length;
  }
  for (const options of [
    { category: "all" }, { category: "recent", recent: "tv_american" },
    { category: "underrated", underrated: "全部" }, { category: "genre", genre: "show:真人秀" },
  ]) {
    results["tv_" + options.category] = (await context.loadTvCatalog(options)).length;
  }
  for (const kind of ["all", "movie", "tv"]) {
    results["realtime_" + kind] = (await context.loadRealtimeHot({ kind })).length;
  }

  for (const [name, count] of Object.entries(results)) {
    assert.ok(count > 0, `${name} returned no items`);
  }
  assert.equal(results.highlights, 12);
  console.log("PASS", { mode: "live-no-cookie", target, ...results });
})().catch((error) => {
  console.error("FAIL", { mode: "live-no-cookie", target, error: `${error.name}: ${error.message}` });
  process.exitCode = 1;
});
