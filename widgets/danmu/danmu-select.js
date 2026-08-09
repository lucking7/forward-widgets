/**
 * Danmu Select
 * A clean-room Forward widget focused on deterministic matching, quality selection, and bounded latency.
 */
WidgetMetadata = {
  id: "danmu.quality.select.v1",
  title: "弹幕优选",
  version: "1.1.1",
  requiredVersion: "0.0.2",
  description: "准确匹配、快速源质量优选、Lily 深度兜底与确定性去重",
  author: "lucking7",
  globalParams: [
    { name: "serverName", title: "快速源 A 名称", type: "input", value: "Alpha" },
    { name: "server", title: "快速源 A 地址", type: "input", value: "http://nl.jc.cd/87654321" },
    { name: "serverName2", title: "快速源 B 名称", type: "input", value: "炊烟" },
    { name: "server2", title: "快速源 B 地址", type: "input", value: "https://danmu.cynn.top/cynnsq" },
    { name: "serverName3", title: "深度源名称", type: "input", value: "Lily" },
    { name: "server3", title: "深度源地址", type: "input", value: "https://danmu.longemby.com/lilyemby" },
    { name: "requestTimeout", title: "总请求时限（毫秒）", type: "input", value: "25000" },
    { name: "fastTimeout", title: "快速层时限（毫秒）", type: "input", value: "3500" },
    { name: "graceMs", title: "同层收集宽限（毫秒）", type: "input", value: "650" },
    { name: "hedgeMs", title: "兼容模式备用源等待（毫秒）", type: "input", value: "180" },
    { name: "minConfidence", title: "最低匹配置信度", type: "input", value: "65" },
    { name: "minQuality", title: "快速源最低质量分", type: "input", value: "55" },
    {
      name: "mergeMode",
      title: "弹幕来源策略",
      type: "enumeration",
      value: "quality",
      enumOptions: [
        { title: "动态质量优选（推荐）", value: "quality" },
        { title: "按配置容灾（兼容）", value: "fallback" },
        { title: "合并快速来源", value: "merge" },
      ],
    },
    { name: "maxCount", title: "弹幕数量上限", type: "input", value: "3000" },
    { name: "searchBlockKeywords", title: "搜索结果屏蔽词", type: "input", value: "" },
    {
      name: "convertMode",
      title: "繁简转换",
      type: "enumeration",
      value: "none",
      enumOptions: [
        { title: "保持原样", value: "none" },
        { title: "转简体", value: "t2s" },
        { title: "转繁体", value: "s2t" },
      ],
    },
    {
      name: "colorMode",
      title: "弹幕颜色",
      type: "enumeration",
      value: "none",
      enumOptions: [
        { title: "保持原样", value: "none" },
        { title: "全部纯白", value: "white" },
        { title: "部分彩色", value: "partial" },
        { title: "完全彩色", value: "all" },
      ],
    },
    { name: "blockKeywords", title: "弹幕内容屏蔽词", type: "input", value: "" },
  ],
  modules: [
    { id: "searchDanmu", title: "搜索弹幕", functionName: "searchDanmu", type: "danmu", cacheDuration: 0, params: [] },
    { id: "getDetail", title: "获取详情", functionName: "getDetailById", type: "danmu", cacheDuration: 0, params: [] },
    { id: "getComments", title: "获取弹幕", functionName: "getCommentsById", type: "danmu", cacheDuration: 0, params: [] },
  ],
};

const SMART_ROUTE_PREFIX = "__SMART_DANMU_V1__";
const LEGACY_ROUTE_SEPARATOR = "__FORWARD_DANMU_SERVER__";
const DICTIONARY_URLS = {
  s2t: "https://cdn.jsdelivr.net/npm/opencc-data@1.0.3/data/STCharacters.txt",
  t2s: "https://cdn.jsdelivr.net/npm/opencc-data@1.0.3/data/TSCharacters.txt",
};
const DICTIONARY_CACHE = Object.create(null);
const DANMU_COLORS = [16711680, 16776960, 16752384, 16738740, 13445375, 11730943, 11730790];
const BUILTIN_SOURCES = [
  {
    server: "http://nl.jc.cd/87654321",
    title: "Alpha",
    tier: "fast",
    coveragePrior: 100,
    qualityPrior: 84,
    speedPrior: 100,
  },
  {
    server: "https://danmu.cynn.top/cynnsq",
    title: "炊烟",
    tier: "fast",
    coveragePrior: 58,
    qualityPrior: 94,
    speedPrior: 90,
  },
  {
    server: "https://danmu.longemby.com/lilyemby",
    title: "Lily",
    tier: "deep",
    coveragePrior: 100,
    qualityPrior: 96,
    speedPrior: 25,
  },
];

function normalizeServer(value) {
  const server = String(value || "").trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(server) ? server : "";
}

function normalizeSource(source, index = 0) {
  const server = normalizeServer(source && source.server);
  if (!server) return null;
  const builtin = BUILTIN_SOURCES.find((candidate) => candidate.server === server);
  let fallbackTitle = server;
  try {
    fallbackTitle = new URL(server).host || server;
  } catch (_) {}
  return {
    server,
    title: String((source && source.title) || (builtin && builtin.title) || fallbackTitle || `source-${index + 1}`).trim(),
    tier: source && ["fast", "deep"].includes(source.tier) ? source.tier : (builtin ? builtin.tier : "fast"),
    coveragePrior: Number(source && source.coveragePrior) || (builtin ? builtin.coveragePrior : 70),
    qualityPrior: Number(source && source.qualityPrior) || (builtin ? builtin.qualityPrior : 70),
    speedPrior: Number(source && source.speedPrior) || (builtin ? builtin.speedPrior : 70),
  };
}

function encodeRouteId(kind, rawId, sources, meta = {}) {
  const payload = {
    kind: String(kind || "unknown"),
    meta,
    rawId: String(rawId ?? ""),
    sources: (Array.isArray(sources) ? sources : [])
      .map(normalizeSource)
      .filter(Boolean),
  };
  return `${SMART_ROUTE_PREFIX}${encodeURIComponent(JSON.stringify(payload))}`;
}

function decodeRouteId(value) {
  const original = String(value ?? "");
  if (!original.startsWith(SMART_ROUTE_PREFIX)) {
    const separatorIndex = original.indexOf(LEGACY_ROUTE_SEPARATOR);
    if (separatorIndex >= 0) {
      try {
        const sourcePayload = JSON.parse(decodeURIComponent(original.slice(0, separatorIndex)));
        const source = normalizeSource(sourcePayload);
        if (source) {
          return {
            kind: "legacy-bound",
            meta: {},
            rawId: original.slice(separatorIndex + LEGACY_ROUTE_SEPARATOR.length),
            sources: [source],
          };
        }
      } catch (_) {}
    }
    return { kind: "legacy", meta: {}, rawId: original, sources: [] };
  }
  try {
    const payload = JSON.parse(decodeURIComponent(original.slice(SMART_ROUTE_PREFIX.length)));
    return {
      kind: String(payload.kind || "unknown"),
      meta: payload.meta && typeof payload.meta === "object" ? payload.meta : {},
      rawId: String(payload.rawId ?? ""),
      sources: (Array.isArray(payload.sources) ? payload.sources : [])
        .map(normalizeSource)
        .filter(Boolean),
    };
  } catch (_) {
    return { kind: "legacy", meta: {}, rawId: original, sources: [] };
  }
}

function toPositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function parseChineseNumber(value) {
  if (/^\d+(?:\.\d+)?$/.test(String(value))) return Number(value);
  const digits = {
    "零": 0, "〇": 0, "一": 1, "壹": 1, "二": 2, "两": 2, "兩": 2, "贰": 2, "貳": 2,
    "三": 3, "叁": 3, "參": 3, "四": 4, "肆": 4, "五": 5, "伍": 5,
    "六": 6, "陆": 6, "陸": 6, "七": 7, "柒": 7, "八": 8, "捌": 8, "九": 9, "玖": 9,
  };
  const units = { "十": 10, "拾": 10, "百": 100, "佰": 100, "千": 1000, "仟": 1000 };
  let total = 0;
  let current = 0;
  for (const character of String(value || "")) {
    if (digits[character] !== undefined) {
      current = digits[character];
    } else if (units[character]) {
      total += (current || 1) * units[character];
      current = 0;
    }
  }
  return total + current || null;
}

function getMediaFileName(params = {}) {
  if (params.fileName) return String(params.fileName).trim();
  for (const candidate of [params.videoUrl, params.link]) {
    if (!candidate) continue;
    try {
      const pathname = new URL(String(candidate)).pathname;
      const fileName = decodeURIComponent(pathname.split("/").filter(Boolean).pop() || "");
      if (fileName) return fileName;
    } catch (_) {}
  }
  return "";
}

function prepareIdentityText(value) {
  return String(value || "")
    .replace(/\.(mkv|mp4|mov|avi|flv|wmv|m4v|ts)$/i, "")
    .replace(/[._]+/g, " ")
    .replace(/\[[^\]]*\]/g, " ");
}

function cleanIdentityTitle(value) {
  return prepareIdentityText(value)
    .replace(/\bS\d{1,2}\s*E\d{1,4}(?:\.\d+)?\b/gi, " ")
    .replace(/\bSeason\s*\d{1,2}\s*Episode\s*\d{1,4}(?:\.\d+)?\b/gi, " ")
    .replace(/\bSeason\s*\d{1,2}\b/gi, " ")
    .replace(/第\s*[\d零〇一二两兩三四五六七八九十百千壹贰貳叁參肆伍陆陸柒捌玖拾佰仟]+\s*[季部]/g, " ")
    .replace(/第\s*[\d零〇一二两兩三四五六七八九十百千壹贰貳叁參肆伍陆陸柒捌玖拾佰仟]+\s*[集话話]/g, " ")
    .replace(/\b(2160p|1080p|720p|480p|web[ -]?dl|webrip|bluray|bdrip|x26[45]|h\.?26[45]|hevc|av1|aac|flac)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMediaIdentity(params = {}) {
  const mediaFileName = getMediaFileName(params);
  const preferred = String(params.seriesName || params.title || "").trim();
  const original = String(mediaFileName || preferred).trim();
  const parsingText = prepareIdentityText(`${original} ${preferred}`);
  const special = /\b(OVA|OAD|SP\d*|SPECIAL|NCOP|NCED)\b|特别篇|特別篇|剧场版|劇場版/i.test(parsingText);

  let season = toPositiveNumber(params.season);
  let episode = toPositiveNumber(params.episode);

  const seasonEpisodeMatch = parsingText.match(/\bS(\d{1,2})\s*E(\d{1,4}(?:\.\d+)?)\b/i);
  const wordMatch = parsingText.match(/\bSeason\s*(\d{1,2})\s*Episode\s*(\d{1,4}(?:\.\d+)?)\b/i);
  const seasonOnlyMatch = parsingText.match(/\bSeason\s*(\d{1,2})\b/i);
  const chineseSeason = parsingText.match(/第\s*([\d零〇一二两兩三四五六七八九十百千壹贰貳叁參肆伍陆陸柒捌玖拾佰仟]+)\s*[季部]/);
  const chineseEpisode = parsingText.match(/第\s*([\d零〇一二两兩三四五六七八九十百千壹贰貳叁參肆伍陆陸柒捌玖拾佰仟]+)\s*[集话話]/);

  if (!season && seasonEpisodeMatch) season = Number(seasonEpisodeMatch[1]);
  if (!episode && seasonEpisodeMatch) episode = Number(seasonEpisodeMatch[2]);
  if (!season && wordMatch) season = Number(wordMatch[1]);
  if (!episode && wordMatch) episode = Number(wordMatch[2]);
  if (!season && seasonOnlyMatch) season = Number(seasonOnlyMatch[1]);
  if (!season && chineseSeason) season = parseChineseNumber(chineseSeason[1]);
  if (!episode && chineseEpisode) episode = parseChineseNumber(chineseEpisode[1]);

  const aliases = [...new Set([
    cleanIdentityTitle(preferred),
    cleanIdentityTitle(original),
  ].filter(Boolean))];
  const baseTitle = aliases[0] || "";

  return {
    aliases,
    baseTitle: baseTitle || preferred || original,
    episode,
    original,
    season: season || 1,
    special,
    tmdbId: params.tmdbId == null ? null : String(params.tmdbId),
    type: params.type || null,
  };
}

function normalizeTitle(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\.(mkv|mp4|mov|avi|flv|wmv|m4v|ts)$/i, "")
    .replace(/\[[^\]]*\]|\([^)]*(?:1080|720|2160|web|bluray|x26|hevc|av1)[^)]*\)/gi, " ")
    .replace(/\bS\d{1,2}\s*E?\d{0,4}(?:\.\d+)?\b/gi, " ")
    .replace(/\bSeason\s*\d{1,2}(?:\s*Episode\s*\d{1,4}(?:\.\d+)?)?\b/gi, " ")
    .replace(/第\s*[\d零〇一二两兩三四五六七八九十百千壹贰貳叁參肆伍陆陸柒捌玖拾佰仟]+\s*[季部]/g, " ")
    .replace(/第\s*[\d零〇一二两兩三四五六七八九十百千壹贰貳叁參肆伍陆陸柒捌玖拾佰仟]+\s*[集话話]/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

function titleSimilarity(left, right) {
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) {
    return Math.min(left.length, right.length) / Math.max(left.length, right.length);
  }

  const bigrams = (value) => {
    const result = [];
    for (let index = 0; index < value.length - 1; index++) result.push(value.slice(index, index + 2));
    return result;
  };
  const leftBigrams = bigrams(left);
  const rightBigrams = bigrams(right);
  if (!leftBigrams.length || !rightBigrams.length) return 0;
  const counts = new Map();
  for (const item of leftBigrams) counts.set(item, (counts.get(item) || 0) + 1);
  let overlap = 0;
  for (const item of rightBigrams) {
    const count = counts.get(item) || 0;
    if (count > 0) {
      overlap++;
      counts.set(item, count - 1);
    }
  }
  return (2 * overlap) / (leftBigrams.length + rightBigrams.length);
}

function isMovieType(type) {
  const normalized = String(type || "").toLowerCase();
  return ["movie", "电影", "劇場版", "剧场版", "奇幻片"].some((item) => normalized.includes(item));
}

function getCandidateEpisodeNumber(candidate) {
  const explicit = toPositiveNumber(candidate && candidate.episodeNumber);
  if (explicit) return explicit;
  const title = String((candidate && candidate.episodeTitle) || "");
  const seasonEpisode = title.match(/\bS\d{1,2}\s*E\s*0*(\d+(?:\.\d+)?)/i);
  if (seasonEpisode) return Number(seasonEpisode[1]);
  const english = title.match(/(?:^|[^A-Za-z0-9])(?:episode|ep|e)\s*0*(\d+(?:\.\d+)?)/i);
  if (english) return Number(english[1]);
  const chinese = title.match(/第\s*([\d零〇一二两兩三四五六七八九十百千壹贰貳叁參肆伍陆陸柒捌玖拾佰仟]+)\s*[集话話]/);
  return chinese ? parseChineseNumber(chinese[1]) : null;
}

function scoreAnimeCandidate(candidate, identity) {
  const candidateEpisode = getCandidateEpisodeNumber(candidate);
  if (!identity.special && identity.episode && candidateEpisode && Number(identity.episode) !== Number(candidateEpisode)) return 0;
  const targetTitles = (Array.isArray(identity.aliases) && identity.aliases.length
    ? identity.aliases
    : [identity.baseTitle])
    .map(normalizeTitle)
    .filter(Boolean);
  const candidateIdentity = parseMediaIdentity({ title: candidate.animeTitle || candidate.title || "" });
  const candidateTitle = normalizeTitle(candidateIdentity.baseTitle);
  const similarity = targetTitles.reduce(
    (best, targetTitle) => Math.max(best, titleSimilarity(targetTitle, candidateTitle)),
    0,
  );
  let score = similarity === 1 ? 70 : Math.round(similarity * 62);

  if (identity.season && candidateIdentity.season) {
    score += identity.season === candidateIdentity.season ? 20 : -30;
  }
  if (identity.type) {
    const wantsMovie = isMovieType(identity.type);
    score += wantsMovie === isMovieType(candidate.type) ? 8 : -12;
  }
  if (candidate._serverMatched && candidate.episodeId !== undefined && candidate.episodeId !== null) {
    score = Math.max(score, 80);
  }
  if (!identity.special && identity.episode && candidateEpisode) score += 8;

  return Math.max(0, Math.min(100, score));
}

function rankAnimeCandidates(candidates, identity) {
  return (Array.isArray(candidates) ? candidates : [])
    .map((candidate, index) => ({
      ...candidate,
      _inputOrder: index,
      matchConfidence: scoreAnimeCandidate(candidate, identity),
    }))
    .sort((left, right) => right.matchConfidence - left.matchConfidence || left._inputOrder - right._inputOrder)
    .map(({ _inputOrder, ...candidate }) => candidate);
}

function normalizeTimeoutMs(value, fallbackMs = 3000) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallbackMs;
}

function collectUsefulWithin(promises, options = {}) {
  const isUseful = options.isUseful || ((value) => value !== null && value !== undefined);
  const shouldStartGrace = options.shouldStartGrace || isUseful;
  const graceMs = Math.max(0, Number(options.graceMs) || 0);
  const totalTimeoutMs = normalizeTimeoutMs(options.totalTimeoutMs);
  const tasks = Array.isArray(promises) ? promises : [];

  return new Promise((resolve) => {
    const results = new Array(tasks.length);
    const settled = new Array(tasks.length).fill(false);
    let settledCount = 0;
    let graceTimer = null;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(totalTimer);
      if (graceTimer) clearTimeout(graceTimer);
      resolve(results.filter((value, index) => settled[index] && isUseful(value)));
    };

    const totalTimer = setTimeout(finish, totalTimeoutMs);
    if (!tasks.length) {
      finish();
      return;
    }

    tasks.forEach((task, index) => {
      Promise.resolve(task)
        .then((value) => {
          results[index] = value;
          if (!graceTimer && isUseful(value) && shouldStartGrace(value)) {
            graceTimer = setTimeout(finish, graceMs);
          }
        })
        .catch(() => {})
        .finally(() => {
          settled[index] = true;
          settledCount++;
          if (settledCount === tasks.length) finish();
        });
    });
  });
}

async function collectTieredUseful(sources, taskFactory, options = {}) {
  const { deep, fast } = partitionSourcesByTier(sources);
  const requestTimeout = Math.max(100, Number(options.requestTimeout) || 25000);
  const deadlineAt = Number.isFinite(options.deadlineAt)
    ? options.deadlineAt
    : Date.now() + requestTimeout;
  const fastTimeout = Math.max(100, Number(options.fastTimeout) || 3500);
  const runTier = async (tierSources, budgetMs) => {
    const budget = Math.min(getRemainingTime(deadlineAt, requestTimeout), budgetMs);
    if (!tierSources.length || budget <= 0) return [];
    const stageDeadlineAt = Date.now() + budget;
    return collectUsefulWithin(
      tierSources.map((source) => taskFactory(source, stageDeadlineAt)),
      {
        graceMs: options.graceMs,
        isUseful: options.isUseful,
        shouldStartGrace: options.shouldStartGrace,
        totalTimeoutMs: budget,
      },
    );
  };

  const fastResults = await runTier(fast, fastTimeout);
  if (fastResults.length || !deep.length) return { results: fastResults, tier: "fast" };
  const deepResults = await runTier(deep, getRemainingTime(deadlineAt, requestTimeout));
  return { results: deepResults, tier: "deep" };
}

function firstUsefulHedged(taskFactories, options = {}) {
  const tasks = Array.isArray(taskFactories) ? taskFactories : [];
  const isUseful = options.isUseful || ((value) => value !== null && value !== undefined);
  const hedgeMs = Math.max(0, Number(options.hedgeMs) || 0);
  const totalTimeoutMs = normalizeTimeoutMs(options.totalTimeoutMs);

  return new Promise((resolve) => {
    let activeCount = 0;
    let finished = false;
    let launchTimer = null;
    let nextIndex = 0;

    const finish = (value) => {
      if (finished) return;
      finished = true;
      clearTimeout(totalTimer);
      if (launchTimer) clearTimeout(launchTimer);
      resolve(value);
    };

    const settleMiss = () => {
      activeCount--;
      if (finished) return;
      if (nextIndex < tasks.length) {
        if (launchTimer) clearTimeout(launchTimer);
        launchTimer = null;
        launchNext();
      } else if (activeCount === 0) {
        finish(null);
      }
    };

    const scheduleNext = () => {
      if (finished || launchTimer || nextIndex >= tasks.length) return;
      launchTimer = setTimeout(() => {
        launchTimer = null;
        launchNext();
      }, hedgeMs);
    };

    const launchNext = () => {
      if (finished || nextIndex >= tasks.length) return;
      const factory = tasks[nextIndex++];
      activeCount++;
      scheduleNext();
      Promise.resolve()
        .then(() => factory())
        .then((value) => {
          if (isUseful(value)) {
            finish(value);
            return;
          }
          settleMiss();
        }, settleMiss);
    };

    const totalTimer = setTimeout(() => finish(null), totalTimeoutMs);
    if (!tasks.length) {
      finish(null);
      return;
    }
    launchNext();
  });
}

function getCommentMessage(comment) {
  if (Array.isArray(comment)) return String(comment[4] ?? "");
  return String((comment && (comment.m ?? comment.message)) || "");
}

function getCommentTime(comment) {
  if (Array.isArray(comment)) {
    const tupleTime = Number.parseFloat(comment[0]);
    return Number.isFinite(tupleTime) ? tupleTime : 0;
  }
  const raw = comment && comment.p ? String(comment.p).split(",")[0] : comment && comment.time;
  const time = Number.parseFloat(raw);
  return Number.isFinite(time) ? time : 0;
}

function getCommentKey(comment) {
  const cid = !Array.isArray(comment) && comment ? (comment.cid ?? comment.id) : null;
  if (cid !== undefined && cid !== null && String(cid) !== "") return `id:${String(cid)}`;
  return getCommentBodyKey(comment);
}

function getCommentBodyKey(comment) {
  if (Array.isArray(comment)) {
    return `body:${getCommentTime(comment).toFixed(3)}|${String(comment[1] ?? "")}|${String(comment[2] ?? "")}|${getCommentMessage(comment)}`;
  }
  const parts = comment && comment.p ? String(comment.p).split(",") : [];
  const position = parts[1] || String((comment && comment.position) || "");
  const color = parts[2] || String((comment && comment.color) || "");
  return `body:${getCommentTime(comment).toFixed(3)}|${position}|${color}|${getCommentMessage(comment)}`;
}

async function loadConversionMap(mode, timeoutMs) {
  if (!DICTIONARY_URLS[mode]) return null;
  const explicitTimeout = Number(timeoutMs);
  if (Number.isFinite(explicitTimeout) && explicitTimeout <= 0) return null;
  const timeoutBudget = Number.isFinite(explicitTimeout) ? explicitTimeout : 2500;
  const deadlineAt = Date.now() + timeoutBudget;
  if (DICTIONARY_CACHE[mode]) return DICTIONARY_CACHE[mode];
  const storageKey = `smart_dict_${mode}`;
  if (Widget.storage && typeof Widget.storage.get === "function") {
    try {
      const stored = await withTimeout(
        Widget.storage.get(storageKey),
        getRemainingTime(deadlineAt, timeoutBudget),
      );
      if (stored) {
        const parsed = typeof stored === "string" ? JSON.parse(stored) : stored;
        if (parsed && typeof parsed === "object") {
          DICTIONARY_CACHE[mode] = parsed;
          return parsed;
        }
      }
    } catch (_) {}
  }
  if (getRemainingTime(deadlineAt, timeoutBudget) <= 0) return null;
  if (!Widget.http || typeof Widget.http.get !== "function") return null;
  try {
    const response = await withTimeout(
      Widget.http.get(DICTIONARY_URLS[mode]),
      getRemainingTime(deadlineAt, timeoutBudget),
    );
    const text = response && response.data !== undefined ? response.data : response;
    if (typeof text !== "string") return null;
    const map = Object.create(null);
    for (const line of text.split("\n")) {
      const [from, to] = line.trim().split(/\s+/);
      if (from && to) map[from] = to;
    }
    DICTIONARY_CACHE[mode] = map;
    if (Widget.storage && typeof Widget.storage.set === "function") {
      const writeBudget = getRemainingTime(deadlineAt, timeoutBudget);
      if (writeBudget > 0) {
        try {
          await withTimeout(
            Widget.storage.set(storageKey, JSON.stringify(map)),
            Math.min(50, writeBudget),
          );
        } catch (_) {}
      }
    }
    return map;
  } catch (_) {
    return null;
  }
}

function convertWithMap(value, map) {
  if (!value || !map) return value;
  let converted = "";
  for (const character of String(value)) converted += map[character] || character;
  return converted;
}

function stableHash(value) {
  let hash = 2166136261;
  for (const character of String(value || "")) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rewriteCommentColor(comment, mode) {
  if (!mode || mode === "none") return comment;
  if (Array.isArray(comment)) {
    const hash = stableHash(`${getCommentKey(comment)}|${getCommentMessage(comment)}`);
    let color = 16777215;
    if (mode === "all" || (mode === "partial" && hash % 2 === 0)) {
      color = DANMU_COLORS[hash % DANMU_COLORS.length];
    }
    comment[2] = String(color);
    return comment;
  }
  if (!comment.p) return comment;
  const parts = String(comment.p).split(",");
  if (parts.length < 3) return comment;
  const hash = stableHash(`${getCommentKey(comment)}|${getCommentMessage(comment)}`);
  let color = 16777215;
  if (mode === "all" || (mode === "partial" && hash % 2 === 0)) {
    color = DANMU_COLORS[hash % DANMU_COLORS.length];
  }
  parts[2] = String(color);
  comment.p = parts.join(",");
  return comment;
}

function limitCommentsEvenly(comments, maxCount) {
  const limit = Math.floor(Number(maxCount));
  const sorted = [...comments].sort((left, right) => getCommentTime(left) - getCommentTime(right));
  if (!Number.isFinite(limit) || limit <= 0 || sorted.length <= limit) return sorted;
  if (limit === 1) return [sorted[0]];
  return Array.from({ length: limit }, (_, index) => {
    const sourceIndex = Math.round((index * (sorted.length - 1)) / (limit - 1));
    return sorted[sourceIndex];
  });
}

async function processComments(comments, options = {}) {
  const conversionMap = await loadConversionMap(options.convertMode, options.requestTimeout);
  const blocked = parseKeywordList(options.blockKeywords);
  const unique = [];
  const seen = new Set();
  const seenBodySources = new Map();
  const seenSourceIds = new Set();
  for (const sourceComment of Array.isArray(comments) ? comments : []) {
    if (!sourceComment || typeof sourceComment !== "object") continue;
    const isSourced = !Array.isArray(sourceComment) && sourceComment.__smartComment !== undefined;
    const rawComment = isSourced ? sourceComment.__smartComment : sourceComment;
    const sourceKey = isSourced ? String(sourceComment.__smartSource || "") : "";
    if (!rawComment || typeof rawComment !== "object") continue;
    const comment = Array.isArray(rawComment) ? [...rawComment] : { ...rawComment };
    if (Array.isArray(comment)) {
      if (comment[4] !== undefined) comment[4] = convertWithMap(comment[4], conversionMap);
    } else {
      if (comment.m !== undefined) comment.m = convertWithMap(comment.m, conversionMap);
      if (comment.message !== undefined) comment.message = convertWithMap(comment.message, conversionMap);
    }
    if (blocked.some((keyword) => getCommentMessage(comment).includes(keyword))) continue;
    if (sourceKey) {
      const cid = Array.isArray(comment) ? null : (comment.cid ?? comment.id);
      const sourceIdKey = cid === undefined || cid === null || String(cid) === ""
        ? null
        : `${sourceKey}|${String(cid)}`;
      if (sourceIdKey && seenSourceIds.has(sourceIdKey)) continue;
      const bodyKey = getCommentBodyKey(comment);
      const bodySources = seenBodySources.get(bodyKey) || new Set();
      if (bodySources.size > 0 && !bodySources.has(sourceKey)) continue;
      if (!sourceIdKey && bodySources.has(sourceKey)) continue;
      if (sourceIdKey) seenSourceIds.add(sourceIdKey);
      bodySources.add(sourceKey);
      seenBodySources.set(bodyKey, bodySources);
    } else {
      const key = getCommentKey(comment);
      if (seen.has(key)) continue;
      seen.add(key);
    }
    unique.push(rewriteCommentColor(comment, options.colorMode));
  }
  const limited = limitCommentsEvenly(unique, options.maxCount);
  return { comments: limited, count: limited.length };
}

function getConfiguredSources(params = {}) {
  const slots = [
    { raw: params.server, title: params.serverName || "主源" },
    { raw: params.server2, title: params.serverName2 || "备用源 1" },
    { raw: params.server3, title: params.serverName3 || "备用源 2" },
  ];
  const seen = new Set();
  const sources = [];
  for (const slot of slots) {
    const lines = String(slot.raw || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    for (let index = 0; index < lines.length; index++) {
      const separator = lines[index].match(/[,，]/);
      const entry = separator
        ? {
          server: lines[index].slice(separator.index + separator[0].length).trim(),
          title: lines[index].slice(0, separator.index).trim(),
        }
        : { server: lines[index], title: index === 0 ? slot.title : "" };
      const source = normalizeSource(entry, sources.length);
      if (!source || seen.has(source.server)) continue;
      seen.add(source.server);
      sources.push(source);
    }
  }
  if (!sources.length) {
    sources.push(...BUILTIN_SOURCES.map((source, index) => normalizeSource(source, index)));
  }
  return sources;
}

function partitionSourcesByTier(sources) {
  const normalized = (Array.isArray(sources) ? sources : []).map(normalizeSource).filter(Boolean);
  return {
    deep: normalized.filter((source) => source.tier === "deep"),
    fast: normalized.filter((source) => source.tier !== "deep"),
  };
}

function getSourcePreference(source) {
  const normalized = normalizeSource(source) || {};
  return (
    Number(normalized.qualityPrior || 0) * 0.5
    + Number(normalized.coveragePrior || 0) * 0.3
    + Number(normalized.speedPrior || 0) * 0.2
  );
}

function rankSourcedAnimeCandidates(candidates, identity) {
  return rankAnimeCandidates(candidates, identity)
    .map((candidate, index) => ({ ...candidate, _rankOrder: index }))
    .sort((left, right) => (
      right.matchConfidence - left.matchConfidence
      || getSourcePreference(right._source) - getSourcePreference(left._source)
      || left._rankOrder - right._rankOrder
    ))
    .map(({ _rankOrder, ...candidate }) => candidate);
}

function withTimeout(promise, timeoutMs) {
  const duration = normalizeTimeoutMs(timeoutMs);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`请求超时 (${duration}ms)`)), duration);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function getRemainingTime(deadlineAt, fallbackMs) {
  if (!Number.isFinite(deadlineAt)) return Math.max(0, Number(fallbackMs) || 0);
  return Math.max(0, deadlineAt - Date.now());
}

function getRequestHeaders() {
  return { "Content-Type": "application/json", "User-Agent": "ForwardWidgets/1.1.1" };
}

async function searchSource(source, identity, params) {
  const query = identity.baseTitle || params.title;
  try {
    const firstBudget = getRemainingTime(params.deadlineAt, params.requestTimeout);
    if (firstBudget <= 0) throw new Error("请求时限已用尽");
    const response = await withTimeout(
      Widget.http.get(
        `${source.server}/api/v2/search/anime?keyword=${encodeURIComponent(query)}`,
        { headers: getRequestHeaders() },
      ),
      firstBudget,
    );
    const data = response && response.data;
    let animes = data && Array.isArray(data.animes) ? data.animes : [];
    if (animes.length && params.operation) {
      const directConfidence = animes.reduce(
        (best, anime) => Math.max(best, scoreAnimeCandidate(anime, identity)),
        0,
      );
      params.operation.bestDirectConfidence = Math.max(
        Number(params.operation.bestDirectConfidence) || 0,
        directConfidence,
      );
    }
    if (!animes.length) {
      if (params.operation && (
        !params.operation.active
        || Number(params.operation.bestDirectConfidence) >= 98
      )) return { animes: [], source };
      const fallbackBudget = getRemainingTime(params.deadlineAt, params.requestTimeout);
      if (fallbackBudget <= 0) throw new Error("请求时限已用尽");
      const fallback = await withTimeout(
        Widget.http.get(
          `${source.server}/api/v2/search/episodes?anime=${encodeURIComponent(query)}`,
          { headers: getRequestHeaders() },
        ),
        fallbackBudget,
      );
      const fallbackAnimes = fallback && fallback.data && fallback.data.animes;
      if (Array.isArray(fallbackAnimes)) {
        animes = fallbackAnimes.map(({ episodes, ...anime }) => anime);
      }
    }
    return { animes, source };
  } catch (error) {
    return { animes: [], error, source };
  }
}

function parseKeywordList(value) {
  return String(value || "")
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function searchDanmu(params = {}) {
  const identity = parseMediaIdentity(params);
  const sources = getConfiguredSources(params);
  const requestTimeout = Math.max(100, Number(params.requestTimeout) || 25000);
  const deadlineAt = Date.now() + requestTimeout;
  const graceMs = Math.max(0, Number(params.graceMs) || 650);
  const blocked = parseKeywordList(params.searchBlockKeywords);
  const minConfidence = Math.max(1, Number(params.minConfidence) || 65);
  const operation = { active: true };
  const tiered = await collectTieredUseful(sources, (source, stageDeadlineAt) => searchSource(
    source,
    identity,
    {
      ...params,
      deadlineAt: stageDeadlineAt,
      operation,
      requestTimeout,
    },
  ), {
    deadlineAt,
    fastTimeout: params.fastTimeout,
    graceMs,
    isUseful: (result) => result && Array.isArray(result.animes) && result.animes.some((anime) => (
      !blocked.some((keyword) => String(anime.animeTitle || "").includes(keyword))
      && scoreAnimeCandidate(anime, identity) >= minConfidence
    )),
    shouldStartGrace: (result) => result && Array.isArray(result.animes) && result.animes.some((anime) => (
      !blocked.some((keyword) => String(anime.animeTitle || "").includes(keyword))
      && scoreAnimeCandidate(anime, identity) >= 100
    )),
    requestTimeout,
  });
  operation.active = false;
  const results = tiered.results;

  const ranked = rankSourcedAnimeCandidates(
    results.flatMap((result) => result.animes
      .filter((anime) => !blocked.some((keyword) => String(anime.animeTitle || "").includes(keyword)))
      .map((anime) => ({ ...anime, _source: result.source }))),
    identity,
  );

  const unique = [];
  const seen = new Set();
  const sourceIdsByKey = new Map();
  for (const candidate of ranked) {
    const rawId = candidate.bangumiId ?? candidate.animeId;
    if (rawId === undefined || rawId === null || !candidate._source) continue;
    const candidateIdentity = parseMediaIdentity({ title: candidate.animeTitle, type: candidate.type });
    const key = `${normalizeTitle(candidateIdentity.baseTitle)}|${candidateIdentity.season}|${isMovieType(candidate.type)}`;
    if (!sourceIdsByKey.has(key)) sourceIdsByKey.set(key, Object.create(null));
    const sourceIds = sourceIdsByKey.get(key);
    if (sourceIds[candidate._source.server] === undefined) {
      sourceIds[candidate._source.server] = String(rawId);
    }
  }
  for (const candidate of ranked) {
    if (candidate.matchConfidence < minConfidence) continue;
    const candidateIdentity = parseMediaIdentity({ title: candidate.animeTitle, type: candidate.type });
    const key = `${normalizeTitle(candidateIdentity.baseTitle)}|${candidateIdentity.season}|${isMovieType(candidate.type)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const orderedSources = [candidate._source, ...sources.filter((source) => source.server !== candidate._source.server)];
    const rawId = candidate.bangumiId ?? candidate.animeId;
    if (rawId === undefined || rawId === null) continue;
    const { _source, ...publicCandidate } = candidate;
    unique.push({
      ...publicCandidate,
      animeId: encodeRouteId("anime", rawId, orderedSources, {
        confidence: candidate.matchConfidence,
        identity,
        sourceIds: sourceIdsByKey.get(key) || {},
      }),
      animeTitle: `${candidate.animeTitle} · ${candidate.matchConfidence}% · ${candidate._source.title}`,
    });
  }

  return { animes: unique };
}

async function fetchBangumiEpisodes(source, animeId, requestTimeout) {
  try {
    const response = await withTimeout(
      Widget.http.get(`${source.server}/api/v2/bangumi/${encodeURIComponent(animeId)}`, {
        headers: getRequestHeaders(),
      }),
      requestTimeout,
    );
    const episodes = response && response.data && response.data.bangumi && response.data.bangumi.episodes;
    return { animeId: String(animeId), episodes: Array.isArray(episodes) ? episodes : [], source };
  } catch (error) {
    return { animeId: String(animeId), episodes: [], error, source };
  }
}

function getCandidateIdentityKey(candidate) {
  const identity = parseMediaIdentity({ title: candidate && candidate.animeTitle, type: candidate && candidate.type });
  return `${normalizeTitle(identity.baseTitle)}|${identity.season}|${isMovieType(candidate && candidate.type)}`;
}

async function resolveCandidateEpisodes(candidates, options = {}) {
  const eligible = (Array.isArray(candidates) ? candidates : []).filter((candidate) => (
    candidate
    && candidate._source
    && candidate.matchConfidence >= options.minConfidence
    && (candidate.bangumiId ?? candidate.animeId) != null
  ));
  const best = eligible[0] || null;
  if (!best) return { animeId: "", best: null, results: [], winner: null };
  const identityKey = getCandidateIdentityKey(best);
  const seenSources = new Set();
  const sameTitleCandidates = eligible.filter((candidate) => {
    if (getCandidateIdentityKey(candidate) !== identityKey) return false;
    if (seenSources.has(candidate._source.server)) return false;
    seenSources.add(candidate._source.server);
    return true;
  });
  const results = await collectUsefulWithin(
    sameTitleCandidates.map((candidate) => fetchBangumiEpisodes(
      candidate._source,
      candidate.bangumiId ?? candidate.animeId,
      getRemainingTime(options.deadlineAt, options.requestTimeout),
    )),
    {
      graceMs: options.graceMs,
      isUseful: (result) => result && Array.isArray(result.episodes) && result.episodes.length > 0,
      totalTimeoutMs: getRemainingTime(options.deadlineAt, options.requestTimeout),
    },
  );
  const sourceOrder = new Map(sameTitleCandidates.map((candidate, index) => [candidate._source.server, index]));
  results.sort((left, right) => (
    (sourceOrder.get(left.source.server) ?? Number.MAX_SAFE_INTEGER)
    - (sourceOrder.get(right.source.server) ?? Number.MAX_SAFE_INTEGER)
  ));
  const winner = results[0] || null;
  return {
    animeId: winner ? winner.animeId : String(best.bangumiId ?? best.animeId ?? ""),
    best,
    results,
    winner,
  };
}

function getEpisodeMatchKey(episode) {
  const number = episode && episode.episodeNumber;
  if (number !== undefined && number !== null && String(number).trim()) {
    return `number:${String(number).trim().toLowerCase()}`;
  }
  return `title:${normalizeTitle(episode && episode.episodeTitle)}`;
}

function collectEpisodeSourceIds(episode, results) {
  const targetKey = getEpisodeMatchKey(episode);
  const sourceIds = Object.create(null);
  for (const result of Array.isArray(results) ? results : []) {
    if (!result || !result.source || !Array.isArray(result.episodes)) continue;
    const match = result.episodes.find((candidate) => getEpisodeMatchKey(candidate) === targetKey);
    if (!match || match.episodeId === undefined || match.episodeId === null) continue;
    sourceIds[result.source.server] = String(match.episodeId);
  }
  return sourceIds;
}

function buildMatchBody(params, identity) {
  let fileName = getMediaFileName(params);
  if (!fileName && identity.episode && !identity.special) {
    fileName = `${identity.baseTitle} S${String(identity.season || 1).padStart(2, "0")}E${String(identity.episode).padStart(2, "0")}`;
  }
  if (!fileName) fileName = identity.original || identity.baseTitle;
  const body = { fileName };
  if (params.fileHash) body.fileHash = String(params.fileHash);
  const fileSize = toPositiveNumber(params.fileSize);
  if (fileSize) body.fileSize = fileSize;
  const duration = toPositiveNumber(params.duration || params.runtime);
  if (duration) body.videoDuration = duration;
  return body;
}

async function fetchMatches(source, identity, params, requestTimeout) {
  try {
    const response = await withTimeout(
      Widget.http.post(
        `${source.server}/api/v2/match`,
        buildMatchBody(params, identity),
        { headers: getRequestHeaders() },
      ),
      requestTimeout,
    );
    const data = response && response.data;
    return {
      matches: data && Array.isArray(data.matches)
        ? data.matches.map((match, index) => ({
          ...match,
          _serverMatched: Boolean(data.isMatched && index === 0 && match.episodeId != null),
        }))
        : [],
      source,
    };
  } catch (error) {
    return { error, matches: [], source };
  }
}

function orderSourcesFromRoute(route, params) {
  const routeSources = route && Array.isArray(route.sources) ? route.sources : [];
  const hasConfiguredSource = [params.server, params.server2, params.server3]
    .some((server) => Boolean(normalizeServer(server)));
  const configured = hasConfiguredSource || !routeSources.length ? getConfiguredSources(params) : [];
  const combined = [...routeSources, ...configured];
  const seen = new Set();
  return combined.map((source) => normalizeSource(source)).filter((source) => {
    const normalized = normalizeSource(source);
    if (!normalized || seen.has(normalized.server)) return false;
    seen.add(normalized.server);
    return true;
  });
}

function getMatchCacheKey(identity) {
  const mediaType = identity.type ? String(identity.type).toLowerCase() : "unknown";
  const tmdbId = identity.tmdbId || "none";
  return `smart_match_${normalizeTitle(identity.baseTitle)}_s${identity.season || 1}_t${mediaType}_tmdb${tmdbId}`;
}

function getSourceFingerprint(sources) {
  return (Array.isArray(sources) ? sources : [])
    .map((source) => normalizeServer(source && source.server))
    .filter(Boolean)
    .sort()
    .join("|");
}

async function rememberMatch(identity, animeId, source, sources, timeoutMs) {
  if (!Widget.storage || typeof Widget.storage.set !== "function") return;
  const parsedTimeout = Number(timeoutMs);
  const timeoutBudget = Number.isFinite(parsedTimeout) ? Math.max(0, parsedTimeout) : 2500;
  if (timeoutBudget <= 0) return;
  const key = getMatchCacheKey(identity);
  try {
    await withTimeout(
      Widget.storage.set(key, JSON.stringify({
        animeId: String(animeId),
        source,
        sourceFingerprint: getSourceFingerprint(sources || [source]),
        savedAt: Date.now(),
      })),
      Math.min(50, timeoutBudget),
    );
  } catch (_) {}
}

async function recallMatch(identity, sources) {
  if (!Widget.storage || typeof Widget.storage.get !== "function") return null;
  const key = getMatchCacheKey(identity);
  try {
    const stored = await Widget.storage.get(key);
    if (!stored) return null;
    const parsed = typeof stored === "string" ? JSON.parse(stored) : stored;
    const source = normalizeSource(parsed && parsed.source);
    const age = Date.now() - Number(parsed && parsed.savedAt);
    const sourceFingerprint = getSourceFingerprint(sources || []);
    if (!source || !parsed.animeId || !Number.isFinite(age) || age < 0 || age > 7 * 24 * 60 * 60 * 1000) {
      return null;
    }
    if (!sourceFingerprint || parsed.sourceFingerprint !== sourceFingerprint) return null;
    if (!(sources || []).some((candidate) => normalizeServer(candidate.server) === source.server)) return null;
    return { animeId: String(parsed.animeId), source };
  } catch (_) {
    return null;
  }
}

async function getDetailById(params = {}) {
  const route = decodeRouteId(params.animeId);
  let animeId = route.rawId;
  const sources = orderSourcesFromRoute(route, params);
  const requestTimeout = Math.max(100, Number(params.requestTimeout) || 25000);
  const deadlineAt = Date.now() + requestTimeout;
  const graceMs = Math.max(0, Number(params.graceMs) || 650);
  const minConfidence = Math.max(1, Number(params.minConfidence) || 65);
  const identity = route.meta && route.meta.identity
    ? route.meta.identity
    : parseMediaIdentity(params);
  let winner = null;
  let episodeResults = [];

  if (animeId) {
    const sourceIds = route.meta && route.meta.sourceIds && typeof route.meta.sourceIds === "object"
      ? route.meta.sourceIds
      : {};
    const hasSourceIds = Object.keys(sourceIds).length > 0;
    const detailSources = hasSourceIds
      ? sources.filter((source) => sourceIds[source.server] !== undefined)
      : sources.slice(0, 1);
    const tiered = await collectTieredUseful(
      detailSources,
      (source, stageDeadlineAt) => fetchBangumiEpisodes(
        source,
        sourceIds[source.server] ?? animeId,
        getRemainingTime(stageDeadlineAt, requestTimeout),
      ),
      {
        deadlineAt,
        fastTimeout: params.fastTimeout,
        graceMs,
        isUseful: (result) => result && Array.isArray(result.episodes) && result.episodes.length > 0,
        requestTimeout,
      },
    );
    const results = [...tiered.results].sort(
      (left, right) => getSourcePreference(right.source) - getSourcePreference(left.source),
    );
    episodeResults = results;
    winner = results.find((result) => result.episodes.length > 0) || null;
    if (winner) animeId = winner.animeId;
  } else {
    const inheritedBudget = getRemainingTime(deadlineAt, requestTimeout);
    const inherited = inheritedBudget > 0
      ? await withTimeout(recallMatch(identity, sources), inheritedBudget).catch(() => null)
      : null;
    if (inherited) {
      const inheritedResult = await fetchBangumiEpisodes(
        inherited.source,
        inherited.animeId,
        getRemainingTime(deadlineAt, requestTimeout),
      );
      if (inheritedResult.episodes.length) {
        animeId = inherited.animeId;
        winner = inheritedResult;
      }
    }
    if (!winner && getRemainingTime(deadlineAt, requestTimeout) > 0) {
      const matchTier = await collectTieredUseful(
        sources,
        (source, stageDeadlineAt) => fetchMatches(
          source,
          identity,
          params,
          getRemainingTime(stageDeadlineAt, requestTimeout),
        ),
        {
          deadlineAt,
          fastTimeout: params.fastTimeout,
          graceMs,
          isUseful: (result) => result && Array.isArray(result.matches) && result.matches.some(
            (match) => scoreAnimeCandidate(match, identity) >= minConfidence,
          ),
          shouldStartGrace: (result) => result && Array.isArray(result.matches) && result.matches.some(
            (match) => scoreAnimeCandidate(match, identity) >= 100,
          ),
          requestTimeout,
        },
      );
      const rankedMatches = rankSourcedAnimeCandidates(
        matchTier.results.flatMap((result) => result.matches.map((match) => ({ ...match, _source: result.source }))),
        identity,
      );
      const matchResolution = await resolveCandidateEpisodes(rankedMatches, {
        deadlineAt,
        graceMs,
        minConfidence,
        requestTimeout,
      });
      const bestMatch = matchResolution.best;
      if (bestMatch) {
        animeId = matchResolution.animeId;
        episodeResults = matchResolution.results;
        winner = matchResolution.winner;
        if ((!winner || !winner.episodes.length) && bestMatch.episodeId) {
          winner = {
            episodes: [{
              episodeId: bestMatch.episodeId,
              episodeNumber: String(identity.episode || ""),
              episodeTitle: bestMatch.episodeTitle || `第 ${identity.episode || "?"} 集`,
            }],
            source: bestMatch._source,
          };
          episodeResults = [winner];
        }
      }
      if (!winner && getRemainingTime(deadlineAt, requestTimeout) > 0) {
        const researchOperation = { active: true };
        const researchTier = await collectTieredUseful(
          sources,
          (source, stageDeadlineAt) => searchSource(source, identity, {
            ...params,
            deadlineAt: stageDeadlineAt,
            operation: researchOperation,
            requestTimeout,
          }),
          {
            deadlineAt,
            fastTimeout: params.fastTimeout,
            graceMs,
            isUseful: (result) => result && Array.isArray(result.animes) && result.animes.some(
              (anime) => scoreAnimeCandidate(anime, identity) >= minConfidence,
            ),
            shouldStartGrace: (result) => result && Array.isArray(result.animes) && result.animes.some(
              (anime) => scoreAnimeCandidate(anime, identity) >= 100,
            ),
            requestTimeout,
          },
        );
        researchOperation.active = false;
        const rankedResearch = rankSourcedAnimeCandidates(
          researchTier.results.flatMap((result) => result.animes.map((anime) => ({ ...anime, _source: result.source }))),
          identity,
        );
        const researchResolution = await resolveCandidateEpisodes(rankedResearch, {
          deadlineAt,
          graceMs,
          minConfidence,
          requestTimeout,
        });
        animeId = researchResolution.animeId;
        episodeResults = researchResolution.results;
        winner = researchResolution.winner;
      }
    }
  }
  if (!winner || !winner.episodes.length) throw new Error("没有来源返回有效选集");
  if (!episodeResults.length) episodeResults = [winner];

  const orderedSources = [winner.source, ...sources.filter((source) => source.server !== winner.source.server)];
  await rememberMatch(
    identity,
    animeId,
    winner.source,
    sources,
    getRemainingTime(deadlineAt, requestTimeout),
  );

  return winner.episodes.map((episode) => {
    const sourceIds = collectEpisodeSourceIds(episode, episodeResults);
    return {
      ...episode,
      episodeId: encodeRouteId("episode", episode.episodeId, orderedSources, {
        animeId: String(animeId),
        episodeNumber: String(episode.episodeNumber ?? identity.episode ?? ""),
        episodeTitle: String(episode.episodeTitle || ""),
        identity,
        sourceIds,
      }),
      episodeTitle: `${episode.episodeTitle || `第 ${episode.episodeNumber || "?"} 集`} · ${winner.source.title}`,
    };
  });
}

function extractCommentArray(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.comments)) return data.comments;
  return [];
}

function isLikelyLowValueComment(message) {
  const normalized = String(message || "").trim().replace(/[!！~～。.，,\s]/g, "");
  if (!normalized) return true;
  return /^(签到|打卡|来了|前排|第一|沙发|路过|冒泡)$/.test(normalized)
    || /^(哈){3,}$/.test(normalized)
    || /^(6){3,}$/.test(normalized)
    || /^(啊|哦|嗯|呵|草){3,}$/.test(normalized);
}

function scoreCommentSet(comments, source, options = {}) {
  const rawComments = Array.isArray(comments) ? comments : [];
  if (!rawComments.length) return 0;
  const blocked = parseKeywordList(options.blockKeywords);
  const valid = rawComments.map((comment) => {
    const message = getCommentMessage(comment).trim();
    const rawTime = Array.isArray(comment)
      ? Number.parseFloat(comment[0])
      : Number.parseFloat(comment && comment.p ? String(comment.p).split(",")[0] : comment && comment.time);
    return { comment, message, time: rawTime };
  }).filter((item) => (
    item.message
    && Number.isFinite(item.time)
    && item.time >= 0
    && !blocked.some((keyword) => item.message.includes(keyword))
  ));
  if (!valid.length) return 0;

  const uniqueBodies = new Set(valid.map((item) => getCommentBodyKey(item.comment)));
  const cleanCount = valid.filter((item) => !isLikelyLowValueComment(item.message)).length;
  const buckets = new Set(valid.map((item) => Math.floor(item.time / 60)));
  const times = valid.map((item) => item.time);
  const span = Math.max(...times) - Math.min(...times);
  const validRate = valid.length / rawComments.length;
  const uniqueRate = uniqueBodies.size / valid.length;
  const cleanRate = cleanCount / valid.length;
  const coverage = Math.min(1, buckets.size / 12);
  const spread = valid.length > 1 ? Math.min(1, span / 1200) : 0;
  const timelineRate = (coverage + spread) / 2;
  const volumeRate = Math.min(1, Math.log(valid.length + 1) / Math.log(2001));
  const sourcePrior = getSourcePreference(source) / 100;
  return Math.round(100 * (
    validRate * 0.15
    + uniqueRate * 0.15
    + cleanRate * 0.2
    + timelineRate * 0.2
    + volumeRate * 0.25
    + sourcePrior * 0.05
  ));
}

function selectBestCommentResult(results, options = {}) {
  return (Array.isArray(results) ? results : [])
    .filter((result) => result && Array.isArray(result.comments) && result.comments.length > 0)
    .map((result, index) => ({
      ...result,
      _inputOrder: index,
      qualityScore: scoreCommentSet(result.comments, result.source, options),
    }))
    .sort((left, right) => (
      right.qualityScore - left.qualityScore
      || getSourcePreference(right.source) - getSourcePreference(left.source)
      || left._inputOrder - right._inputOrder
    ))[0] || null;
}

async function prepareCommentResultsForQuality(results, params, deadlineAt, requestTimeout) {
  const prepared = [];
  for (const result of Array.isArray(results) ? results : []) {
    const remaining = getRemainingTime(deadlineAt, requestTimeout);
    if (remaining <= 0) break;
    const processed = await processComments(result.comments, {
      ...params,
      colorMode: "none",
      maxCount: 0,
      requestTimeout: Math.min(800, remaining),
    });
    prepared.push({ ...result, comments: processed.comments });
  }
  return prepared;
}

function findEpisodeForIdentity(episodes, identity, routeMeta = {}) {
  const candidates = Array.isArray(episodes) ? episodes : [];
  const targetNumber = identity && identity.special
    ? null
    : (toPositiveNumber(routeMeta.episodeNumber) || toPositiveNumber(identity && identity.episode));
  if (targetNumber) {
    const numbered = candidates.find((episode) => Number(episode && episode.episodeNumber) === Number(targetNumber));
    if (numbered) return numbered;
  }
  const targetTitle = normalizeTitle(routeMeta.episodeTitle);
  if (targetTitle) {
    const titled = candidates.find((episode) => normalizeTitle(episode && episode.episodeTitle) === targetTitle);
    if (titled) return titled;
  }
  return targetNumber || targetTitle ? null : (candidates[0] || null);
}

async function discoverDeepCommentResult(source, route, params, deadlineAt, requestTimeout) {
  const routeMeta = route.meta && typeof route.meta === "object" ? route.meta : {};
  const baseIdentity = routeMeta.identity && typeof routeMeta.identity === "object"
    ? routeMeta.identity
    : parseMediaIdentity(params);
  const episode = baseIdentity.special
    ? toPositiveNumber(baseIdentity.episode)
    : (toPositiveNumber(routeMeta.episodeNumber) || toPositiveNumber(baseIdentity.episode));
  const identity = { ...baseIdentity, episode: episode || baseIdentity.episode };
  if (!String(identity.baseTitle || "").trim()) return { comments: [], source };
  const minConfidence = Math.max(1, Number(params.minConfidence) || 65);
  let commentId = null;

  if (getRemainingTime(deadlineAt, requestTimeout) > 0) {
    const matchResult = await fetchMatches(
      source,
      identity,
      params,
      getRemainingTime(deadlineAt, requestTimeout),
    );
    const rankedMatches = rankSourcedAnimeCandidates(
      matchResult.matches.map((match) => ({ ...match, _source: source })),
      identity,
    );
    const bestMatch = rankedMatches.find((match) => match.matchConfidence >= minConfidence);
    if (bestMatch && bestMatch.episodeId != null) {
      commentId = String(bestMatch.episodeId);
    } else if (bestMatch && (bestMatch.bangumiId ?? bestMatch.animeId) != null) {
      const detail = await fetchBangumiEpisodes(
        source,
        bestMatch.bangumiId ?? bestMatch.animeId,
        getRemainingTime(deadlineAt, requestTimeout),
      );
      const matchedEpisode = findEpisodeForIdentity(detail.episodes, identity, routeMeta);
      if (matchedEpisode && matchedEpisode.episodeId != null) commentId = String(matchedEpisode.episodeId);
    }
  }

  if (!commentId && getRemainingTime(deadlineAt, requestTimeout) > 0) {
    const operation = { active: true };
    const searchResult = await searchSource(source, identity, {
      ...params,
      deadlineAt,
      operation,
      requestTimeout,
    });
    operation.active = false;
    const ranked = rankSourcedAnimeCandidates(
      searchResult.animes.map((anime) => ({ ...anime, _source: source })),
      identity,
    );
    const best = ranked.find((anime) => anime.matchConfidence >= minConfidence);
    if (best && (best.bangumiId ?? best.animeId) != null) {
      const detail = await fetchBangumiEpisodes(
        source,
        best.bangumiId ?? best.animeId,
        getRemainingTime(deadlineAt, requestTimeout),
      );
      const matchedEpisode = findEpisodeForIdentity(detail.episodes, identity, routeMeta);
      if (matchedEpisode && matchedEpisode.episodeId != null) commentId = String(matchedEpisode.episodeId);
    }
  }

  if (!commentId || getRemainingTime(deadlineAt, requestTimeout) <= 0) {
    return { comments: [], source };
  }
  return fetchCommentsFromSource(
    source,
    commentId,
    params,
    getRemainingTime(deadlineAt, requestTimeout),
  );
}

async function fetchCommentsFromSource(source, commentId, params, requestTimeout) {
  try {
    const response = await withTimeout(
      Widget.http.get(
        `${source.server}/api/v2/comment/${encodeURIComponent(commentId)}?async=1&withRelated=true&chConvert=0`,
        { headers: getRequestHeaders() },
      ),
      requestTimeout,
    );
    return { comments: extractCommentArray(response && response.data), source };
  } catch (error) {
    return { comments: [], error, source };
  }
}

async function getCommentsById(params = {}) {
  if (!params.commentId) return null;
  const route = decodeRouteId(params.commentId);
  const sources = orderSourcesFromRoute(route, params);
  const sourceIds = route.meta && route.meta.sourceIds && typeof route.meta.sourceIds === "object"
    ? route.meta.sourceIds
    : null;
  const hasSourceIds = sourceIds && Object.keys(sourceIds).length > 0;
  const requestSources = hasSourceIds
    ? sources.filter((source) => sourceIds[source.server] !== undefined)
    : sources.slice(0, 1);
  const requestTimeout = Math.max(100, Number(params.requestTimeout) || 25000);
  const deadlineAt = Date.now() + requestTimeout;
  const mergeMode = ["fallback", "merge"].includes(params.mergeMode) ? params.mergeMode : "quality";
  const makeTask = (source) => () => {
    const requestBudget = getRemainingTime(deadlineAt, requestTimeout);
    if (requestBudget <= 0) return { comments: [], source };
    return fetchCommentsFromSource(
      source,
      hasSourceIds ? sourceIds[source.server] : route.rawId,
      params,
      requestBudget,
    );
  };
  let comments;
  if (mergeMode === "merge") {
    const tiers = partitionSourcesByTier(requestSources);
    const mergeSources = tiers.fast.length ? tiers.fast : tiers.deep;
    const results = await collectUsefulWithin(
      mergeSources.map((source) => makeTask(source)()),
      {
        graceMs: Math.max(0, Number(params.graceMs) || 250),
        isUseful: (result) => result && Array.isArray(result.comments) && result.comments.length > 0,
        totalTimeoutMs: getRemainingTime(deadlineAt, requestTimeout),
      },
    );
    if (!results.length) throw new Error("没有来源返回有效弹幕");
    comments = results.flatMap((result) => result.comments.map((comment) => ({
      __smartComment: comment,
      __smartSource: result.source.server,
    })));
  } else if (mergeMode === "fallback") {
    const result = await firstUsefulHedged(
      requestSources.map(makeTask),
      {
        hedgeMs: Math.max(0, Number(params.hedgeMs) || 120),
        isUseful: (candidate) => candidate && Array.isArray(candidate.comments) && candidate.comments.length > 0,
        totalTimeoutMs: getRemainingTime(deadlineAt, requestTimeout),
      },
    );
    if (!result) throw new Error("没有来源返回有效弹幕");
    comments = result.comments;
  } else {
    const { deep, fast } = partitionSourcesByTier(requestSources);
    const allDeep = partitionSourcesByTier(sources).deep;
    const unmappedDeep = allDeep.filter((source) => !hasSourceIds || sourceIds[source.server] === undefined);
    const fastTimeout = Math.max(100, Number(params.fastTimeout) || 3500);
    const fastBudget = Math.min(getRemainingTime(deadlineAt, requestTimeout), fastTimeout);
    const minQualityValue = Number(params.minQuality);
    const minQuality = Number.isFinite(minQualityValue) ? Math.max(0, minQualityValue) : 55;
    const rawFastResults = fastBudget > 0
      ? await collectUsefulWithin(
        fast.map((source) => makeTask(source)()),
        {
          graceMs: Math.max(0, Number(params.graceMs) || 650),
          isUseful: (result) => result && Array.isArray(result.comments) && result.comments.length > 0,
          shouldStartGrace: () => false,
          totalTimeoutMs: fastBudget,
        },
      )
      : [];
    const fastResults = await prepareCommentResultsForQuality(
      rawFastResults,
      params,
      deadlineAt,
      requestTimeout,
    );
    const bestFast = selectBestCommentResult(fastResults, params);
    let candidates = fastResults;
    if (!bestFast || bestFast.qualityScore < minQuality) {
      const rawDeepResults = deep.length
        ? await collectUsefulWithin(
          deep.map((source) => makeTask(source)()),
          {
            graceMs: Math.max(0, Number(params.graceMs) || 650),
            isUseful: (result) => result && Array.isArray(result.comments) && result.comments.length > 0,
            shouldStartGrace: () => false,
            totalTimeoutMs: getRemainingTime(deadlineAt, requestTimeout),
          },
        )
        : [];
      const rawDiscoveredResults = unmappedDeep.length && getRemainingTime(deadlineAt, requestTimeout) > 0
        ? await collectUsefulWithin(
          unmappedDeep.map((source) => discoverDeepCommentResult(
            source,
            route,
            params,
            deadlineAt,
            requestTimeout,
          )),
          {
            graceMs: Math.max(0, Number(params.graceMs) || 650),
            isUseful: (result) => result && Array.isArray(result.comments) && result.comments.length > 0,
            shouldStartGrace: () => false,
            totalTimeoutMs: getRemainingTime(deadlineAt, requestTimeout),
          },
        )
        : [];
      const deepResults = await prepareCommentResultsForQuality(
        rawDeepResults,
        params,
        deadlineAt,
        requestTimeout,
      );
      const discoveredResults = await prepareCommentResultsForQuality(
        rawDiscoveredResults,
        params,
        deadlineAt,
        requestTimeout,
      );
      candidates = [...fastResults, ...deepResults, ...discoveredResults];
    }
    const best = selectBestCommentResult(candidates, params);
    if (!best) throw new Error("没有来源返回有效弹幕");
    comments = best.comments;
  }
  return processComments(comments, {
    ...params,
    requestTimeout: getRemainingTime(deadlineAt, requestTimeout),
  });
}
