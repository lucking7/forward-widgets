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

  for (const [name, count] of Object.entries(results)) {
    assert.ok(count > 0, `${name} returned no items`);
  }
  assert.equal(results.highlights, 12);
  console.log("PASS", { mode: "live-no-cookie", target, ...results });
})().catch((error) => {
  console.error("FAIL", { mode: "live-no-cookie", target, error: `${error.name}: ${error.message}` });
  process.exitCode = 1;
});
