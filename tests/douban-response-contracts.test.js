const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const repo = path.resolve(__dirname, "..");
const widgetPath = path.join(repo, "widgets/douban/douban-discovery.js");
const widgetSource = fs.readFileSync(widgetPath, "utf8");

function loadWidget(payload) {
  const context = {
    Widget: {
      http: {
        async get() {
          return { status: 200, data: payload };
        },
      },
    },
    console,
    decodeURIComponent,
    encodeURIComponent,
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(widgetSource, context, { filename: widgetPath });
  return context;
}

const listContracts = [
  {
    name: "public collection",
    field: "subject_collection_items",
    invoke: (context) => context.loadPublicCollections({ collection: "movie_top250", page: 1 }),
  },
  {
    name: "custom Doulist",
    field: "items",
    invoke: (context) => context.loadCustomList({ url: "https://m.douban.com/doulist/1518184", page: 1 }),
  },
  {
    name: "preference recommendations",
    field: "items",
    invoke: (context) => context.loadPreferenceExplore({ mediaType: "movie", offset: 0 }),
  },
  {
    name: "recent-hot recommendations",
    field: "items",
    invoke: (context) => context.loadRecommendations({ mediaType: "movie", category: "热门", region: "全部", page: 1 }),
  },
  {
    name: "person works",
    field: "works",
    invoke: (context) => context.loadPeopleWorks({ person: "1048026", sort: "time", page: 1 }),
  },
  {
    name: "interests",
    field: "interests",
    invoke: (context) => context.loadInterests({ userId: "response-contract-user", status: "mark", page: 1 }),
  },
  {
    name: "personalized suggestions",
    field: "items",
    invoke: (context) => context.loadPersonalized({ cookie: "dbcl2=fake; ck=fake", mediaType: "movie", page: 1 }),
  },
];

for (const contract of listContracts) {
  test(`${contract.name} rejects a missing list field`, async () => {
    await assert.rejects(contract.invoke(loadWidget({})), (error) => {
      assert.match(String(error && error.message), /结构/);
      assert.match(String(error && error.message), new RegExp(contract.field));
      return true;
    });
  });

  test(`${contract.name} rejects a non-array list field`, async () => {
    await assert.rejects(contract.invoke(loadWidget({ [contract.field]: {} })), (error) => {
      assert.match(String(error && error.message), /结构/);
      assert.match(String(error && error.message), new RegExp(contract.field));
      return true;
    });
  });

  test(`${contract.name} preserves a valid empty list`, async () => {
    const result = await contract.invoke(loadWidget({ [contract.field]: [] }));
    assert.deepEqual(Array.from(result), []);
  });
}

function runPublicAudit(preloadSource) {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "douban-audit-contract-"));
  const preloadPath = path.join(temporaryDirectory, "fake-fetch.cjs");
  const outputPath = path.join(temporaryDirectory, "result.json");
  fs.writeFileSync(preloadPath, preloadSource);

  const result = childProcess.spawnSync(
    process.execPath,
    [path.join(repo, "audit-douban-interfaces.cjs"), outputPath],
    {
      cwd: repo,
      env: { ...process.env, NODE_OPTIONS: `--require=${preloadPath}` },
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    },
  );
  return {
    result,
    outputPath,
    cleanup() {
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    },
  };
}

test("the public audit CLI fails when HTTP 200 responses omit every list field", () => {
  const audit = runPublicAudit(`
global.fetch = async function fakeFetch(url) {
  const parsed = new URL(String(url));
  let data = {};
  const detail = parsed.pathname.match(/\\/rexxar\\/api\\/v2\\/(movie|tv|book|music)\\/(\\d+)$/);
  if (detail) data = { id: detail[2], type: detail[1], title: "详情" + detail[2] };
  else if (parsed.pathname.endsWith("/j/subject_suggest")) {
    data = [{ type: "celebrity", title: parsed.searchParams.get("q"), id: "1048026" }];
  }
  return { status: 200, async text() { return JSON.stringify(data); } };
};
`);

  try {
    assert.equal(audit.result.status, 1, audit.result.stderr || audit.result.stdout);
    assert.equal(fs.existsSync(audit.outputPath), true, "audit CLI did not write its evidence file");
    const summary = JSON.parse(fs.readFileSync(audit.outputPath, "utf8"));
    assert.ok(summary.errors > 0, "audit CLI accepted missing list fields as legitimate empty charts");
    assert.ok(
      summary.results.some((item) => item.status === "error" && /响应结构错误/.test(item.error)),
      "audit evidence did not identify a response-structure failure",
    );
  } finally {
    audit.cleanup();
  }
});

test("the public audit CLI accepts explicit empty list fields", () => {
  const audit = runPublicAudit(`
global.fetch = async function fakeFetch(url) {
  const parsed = new URL(String(url));
  let data;
  const detail = parsed.pathname.match(/\\/rexxar\\/api\\/v2\\/(movie|tv|book|music)\\/(\\d+)$/);
  if (detail) data = { id: detail[2], type: detail[1], title: "详情" + detail[2] };
  else if (parsed.pathname.endsWith("/j/subject_suggest")) {
    data = [{ type: "celebrity", title: parsed.searchParams.get("q"), id: "1048026" }];
  } else if (parsed.pathname.includes("/subject_collection/") && parsed.pathname.endsWith("/items")) {
    data = { subject_collection_items: [] };
  } else if (parsed.pathname.endsWith("/j/search_subjects")) {
    data = { subjects: [] };
  } else if (/\\/doulist\\/\\d+\\/items$/.test(parsed.pathname)) {
    data = { items: [] };
  } else if (/\\/celebrity\\/\\d+\\/works$/.test(parsed.pathname)) {
    data = { works: [] };
  } else if (parsed.pathname.includes("/subject/recent_hot/") || parsed.pathname.endsWith("/recommend")) {
    data = { items: [] };
  } else {
    data = {};
  }
  return { status: 200, async text() { return JSON.stringify(data); } };
};
`);

  try {
    assert.equal(audit.result.status, 0, audit.result.stderr || audit.result.stdout);
    assert.equal(fs.existsSync(audit.outputPath), true, "audit CLI did not write its evidence file");
    const summary = JSON.parse(fs.readFileSync(audit.outputPath, "utf8"));
    assert.equal(summary.errors, 0);
  } finally {
    audit.cleanup();
  }
});
