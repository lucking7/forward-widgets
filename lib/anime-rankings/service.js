const { fetchAniListSnapshot } = require("./anilist.js");
const { aggregateRanking } = require("./aggregate.js");
const { fetchBahamutSnapshot, matchBahamutSnapshot } = require("./bahamut.js");

function hourBucket(date) {
  const value = new Date(date);
  value.setUTCMinutes(0, 0, 0);
  return value.toISOString();
}

function buildRealtimeRanking(snapshot, generatedAt) {
  return {
    schemaVersion: 1,
    modelVersion: "rank-ewma-v1",
    mediaType: "anime",
    window: "realtime",
    generatedAt,
    sampledThrough: snapshot.effectiveAt,
    stale: false,
    partial: false,
    coverage: { expected: 1, actual: 1, ratio: 1 },
    sources: [{ id: "anilist", fresh: true, expected: 1, actual: 1, sampledThrough: snapshot.effectiveAt }],
    items: snapshot.items,
  };
}

function createRankingService({
  store,
  fetchImpl = fetch,
  clock = () => new Date(),
  bahamutEnabled = false,
  bahamutIntervalHours = 6,
  logger = null,
}) {
  if (!store || typeof store.readCurrent !== "function" || typeof store.commitCurrent !== "function") {
    throw new Error("ranking store is required");
  }

  async function runCollectionAttempt() {
    const now = new Date(clock());
    const runKey = hourBucket(now);
    const current = await store.readCurrent();
    const previous = current && current.value;
    if (previous && Array.isArray(previous.completedRunKeys) && previous.completedRunKeys.includes(runKey)) {
      return { status: "duplicate", runKey, version: previous.version };
    }

    const snapshot = await fetchAniListSnapshot({ fetchImpl, sampledAt: runKey });
    const generatedAt = now.toISOString();
    let snapshots = [...((previous && previous.snapshots) || []), snapshot];
    const warnings = [];
    const sourceStatus = {
      ...((previous && previous.sourceStatus) || {}),
      anilist: { ok: true, checkedAt: generatedAt },
    };
    if (bahamutEnabled) {
      const previousBahamut = [...snapshots].reverse().find((entry) => entry.source === "bahamut");
      const previousTime = previousBahamut
        ? new Date(previousBahamut.checkedAt || previousBahamut.effectiveAt).getTime()
        : 0;
      if (!previousBahamut || now.getTime() - previousTime >= bahamutIntervalHours * 3600000) {
        try {
          const rawBahamut = await fetchBahamutSnapshot({ fetchImpl, sampledAt: runKey });
          const bahamut = matchBahamutSnapshot(rawBahamut, snapshot);
          if (previousBahamut && previousBahamut.contentHash === bahamut.contentHash) {
            snapshots = snapshots.map((entry) => entry === previousBahamut
              ? { ...entry, checkedAt: runKey, items: bahamut.items }
              : entry);
          } else {
            snapshots.push({ ...bahamut, checkedAt: runKey });
          }
          sourceStatus.bahamut = { ok: true, checkedAt: generatedAt };
        } catch (error) {
          warnings.push("bahamut_unavailable");
          sourceStatus.bahamut = { ok: false, checkedAt: generatedAt };
          if (logger && typeof logger.warn === "function") {
            logger.warn("anime_ranking_auxiliary_failed", {
              source: "bahamut",
              errorName: error && error.name || "Error",
            });
          }
        }
      }
    }
    const oldest = now.getTime() - 8 * 24 * 3600000;
    snapshots = snapshots.filter((entry) => {
      return new Date(entry.checkedAt || entry.effectiveAt).getTime() >= oldest;
    }).slice(-256);
    const value = {
      schemaVersion: 1,
      modelVersion: "rank-ewma-v1",
      version: generatedAt,
      generatedAt,
      completedRunKeys: [...((previous && previous.completedRunKeys) || []), runKey].slice(-192),
      snapshots,
      sourceStatus,
      rankings: {
        ...((previous && previous.rankings) || {}),
        realtime: buildRealtimeRanking(snapshot, generatedAt),
        day: aggregateRanking({
          snapshots,
          now,
          window: "day",
          windowHours: 24,
          halfLifeHours: 8,
        }),
        week: aggregateRanking({
          snapshots,
          now,
          window: "week",
          windowHours: 168,
          halfLifeHours: 48,
        }),
      },
    };
    await store.commitCurrent(value, { expectedEtag: current && current.etag, runKey });
    return { status: "updated", runKey, version: value.version, warnings };
  }

  async function runCollection() {
    try {
      return await runCollectionAttempt();
    } catch (error) {
      if (!error || error.name !== "RankingStateConflictError") throw error;
      return runCollectionAttempt();
    }
  }

  function rankingForWindow(value, window, now) {
    if (!value) return null;
    if (window === "realtime") return value.rankings && value.rankings.realtime;
    if (window === "day") {
      return aggregateRanking({
        snapshots: value.snapshots || [],
        now,
        window: "day",
        windowHours: 24,
        halfLifeHours: 8,
      });
    }
    if (window === "week") {
      return aggregateRanking({
        snapshots: value.snapshots || [],
        now,
        window: "week",
        windowHours: 168,
        halfLifeHours: 48,
      });
    }
    return null;
  }

  async function getRanking(window) {
    const current = await store.readCurrent();
    const now = clock();
    const ranking = rankingForWindow(current && current.value, window, now);
    return applyCurrentFreshness(ranking, now);
  }

  async function getMeta() {
    const current = await store.readCurrent();
    const value = current && current.value;
    if (!value) return null;
    const windows = {};
    for (const window of ["realtime", "day", "week"]) {
      const now = clock();
      const ranking = applyCurrentFreshness(rankingForWindow(value, window, now), now);
      if (!ranking) continue;
      windows[window] = {
        sampledThrough: ranking.sampledThrough,
        stale: ranking.stale,
        partial: ranking.partial,
        coverage: ranking.coverage,
      };
    }
    return {
      schemaVersion: 1,
      modelVersion: value.modelVersion,
      version: value.version,
      generatedAt: value.generatedAt,
      lastRunKey: value.completedRunKeys[value.completedRunKeys.length - 1],
      sourceStatus: value.sourceStatus || {},
      windows,
    };
  }

  return { runCollection, getRanking, getMeta };
}

function applyCurrentFreshness(ranking, now) {
  if (!ranking) return null;
  const nowMs = new Date(now).getTime();
  const sampledMs = ranking.sampledThrough ? new Date(ranking.sampledThrough).getTime() : 0;
  const stale = !sampledMs || nowMs - sampledMs > 3 * 3600000;
  return {
    ...ranking,
    stale,
    sources: (ranking.sources || []).map((source) => {
      if (source.id !== "anilist") return source;
      return { ...source, fresh: !stale };
    }),
  };
}

let productionService;

function getProductionService() {
  if (!productionService) {
    const { createBlobRankingStore } = require("./blob-store.js");
    productionService = createRankingService({
      store: createBlobRankingStore(),
      bahamutEnabled: true,
      logger: console,
    });
  }
  return productionService;
}

module.exports = {
  applyCurrentFreshness,
  createRankingService,
  getProductionService,
};
