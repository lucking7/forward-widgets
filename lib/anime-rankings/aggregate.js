function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value) {
  return Math.round(value * 1000000) / 1000000;
}

function snapshotObservedAt(snapshot) {
  return snapshot.checkedAt || snapshot.effectiveAt;
}

function scoreSourceSnapshots(snapshots, nowMs, halfLifeHours) {
  const totalWeights = snapshots.reduce((sum, snapshot) => {
    const ageHours = Math.max(0, (nowMs - new Date(snapshotObservedAt(snapshot)).getTime()) / 3600000);
    return sum + Math.pow(2, -ageHours / halfLifeHours);
  }, 0);
  const byId = new Map();
  for (const snapshot of snapshots) {
    const ageHours = Math.max(0, (nowMs - new Date(snapshotObservedAt(snapshot)).getTime()) / 3600000);
    const weight = Math.pow(2, -ageHours / halfLifeHours);
    for (const item of snapshot.items) {
      const value = byId.get(item.canonicalId) || { observations: [], latest: item };
      value.observations.push({ item, weight });
      value.latest = item;
      byId.set(item.canonicalId, value);
    }
  }
  const scored = new Map();
  for (const [canonicalId, value] of byId) {
    const presentWeight = value.observations.reduce((sum, observation) => sum + observation.weight, 0);
    const weightedRankMean = value.observations.reduce(
      (sum, observation) => sum + observation.item.score * observation.weight,
      0,
    ) / presentWeight;
    const weightedPresence = totalWeights > 0 ? presentWeight / totalWeights : 0;
    const first = value.observations[0].item.score;
    const last = value.observations[value.observations.length - 1].item.score;
    const momentum = value.observations.length > 1 ? clamp(0.5 + (last - first) / 2, 0, 1) : 0.5;
    scored.set(canonicalId, {
      score: 0.75 * weightedRankMean + 0.15 * weightedPresence + 0.10 * momentum,
      observedSamples: value.observations.length,
      latest: value.latest,
    });
  }
  return scored;
}

function mergeItemMetadata(entries) {
  const aniList = entries.find((entry) => entry.source === "anilist");
  const bahamut = entries.find((entry) => entry.source === "bahamut");
  const base = { ...(aniList ? aniList.value.latest : entries[0].value.latest) };
  if (bahamut) {
    base.bahamutId = bahamut.value.latest.bahamutId;
    base.bahamutPopularity = bahamut.value.latest.popularity;
    base.bahamutRank = bahamut.value.latest.rank;
  }
  base.sources = entries.map((entry) => entry.source).sort((left, right) => {
    return ["anilist", "bahamut"].indexOf(left) - ["anilist", "bahamut"].indexOf(right);
  });
  base.observedSamples = entries.reduce((sum, entry) => sum + entry.value.observedSamples, 0);
  return base;
}

function aggregateRanking({ snapshots, now, window, windowHours, halfLifeHours }) {
  const nowMs = new Date(now).getTime();
  const cutoff = nowMs - windowHours * 3600000;
  const validSnapshots = snapshots
    .filter((snapshot) => new Date(snapshotObservedAt(snapshot)).getTime() >= cutoff)
    .sort((left, right) => new Date(snapshotObservedAt(left)) - new Date(snapshotObservedAt(right)));
  const bySource = new Map();
  for (const snapshot of validSnapshots) {
    const values = bySource.get(snapshot.source) || [];
    values.push(snapshot);
    bySource.set(snapshot.source, values);
  }
  const sourceScores = new Map();
  for (const [source, sourceSnapshots] of bySource) {
    sourceScores.set(source, scoreSourceSnapshots(sourceSnapshots, nowMs, halfLifeHours));
  }
  const entriesById = new Map();
  for (const [source, scores] of sourceScores) {
    for (const [canonicalId, value] of scores) {
      const entries = entriesById.get(canonicalId) || [];
      entries.push({ source, value });
      entriesById.set(canonicalId, entries);
    }
  }
  const sourceWeights = window === "week"
    ? { anilist: 0.80, bahamut: 0.20 }
    : { anilist: 0.75, bahamut: 0.25 };
  const items = [];
  for (const [canonicalId, entries] of entriesById) {
    const weightTotal = entries.reduce((sum, entry) => sum + (sourceWeights[entry.source] || 0), 0);
    const score = entries.reduce(
      (sum, entry) => sum + entry.value.score * (sourceWeights[entry.source] || 0),
      0,
    ) / weightTotal;
    items.push({ ...mergeItemMetadata(entries), canonicalId, score: round(score) });
  }
  items.sort((left, right) => right.score - left.score || left.canonicalId.localeCompare(right.canonicalId));
  items.forEach((item, index) => { item.rank = index + 1; });

  const aniListSnapshots = bySource.get("anilist") || [];
  const sampledThrough = aniListSnapshots.length > 0
    ? aniListSnapshots[aniListSnapshots.length - 1].effectiveAt
    : null;
  const latestAniListAge = sampledThrough == null ? Infinity : (nowMs - new Date(sampledThrough).getTime()) / 3600000;
  const actual = new Set(aniListSnapshots.map((snapshot) => snapshot.bucket)).size;
  const ratio = round(actual / windowHours);
  const sources = [];
  if (aniListSnapshots.length > 0) {
    sources.push({ id: "anilist", fresh: latestAniListAge <= 3, expected: windowHours, actual, sampledThrough });
  }
  const bahamutSnapshots = bySource.get("bahamut") || [];
  if (bahamutSnapshots.length > 0) {
    const latest = bahamutSnapshots[bahamutSnapshots.length - 1];
    const checkedThrough = latest.checkedAt || latest.effectiveAt;
    const age = (nowMs - new Date(checkedThrough).getTime()) / 3600000;
    sources.push({
      id: "bahamut",
      fresh: age <= 12,
      expected: 1,
      actual: bahamutSnapshots.length,
      sampledThrough: latest.effectiveAt,
      checkedThrough,
    });
  }

  return {
    schemaVersion: 1,
    modelVersion: "rank-ewma-v1",
    mediaType: "anime",
    window,
    generatedAt: new Date(now).toISOString(),
    sampledThrough,
    stale: latestAniListAge > 3,
    partial: actual < windowHours,
    coverage: { expected: windowHours, actual, ratio },
    sources,
    items,
  };
}

module.exports = { aggregateRanking };
