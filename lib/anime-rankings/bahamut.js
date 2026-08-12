const crypto = require("node:crypto");

const BAHAMUT_ENDPOINT = "https://acg.gamer.com.tw/billboard.php?p=anime&t=2";

function decodeHtml(value) {
  return String(value || "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function cleanText(value) {
  return decodeHtml(String(value || "").replace(/<[^>]+>/g, " ")).normalize("NFKC").replace(/\s+/g, " ").trim();
}

function normalizeTitle(value) {
  return cleanText(value).toLocaleLowerCase("en-US").replace(/[\p{P}\p{S}\s]+/gu, "");
}

function parseBahamutHtml(html, sampledAt) {
  const segments = String(html).split(/<div\s+class=["']ACG-mainbox1["'][^>]*>/i).slice(1);
  const rawItems = [];
  for (const segment of segments) {
    const block = segment.split("<!--資料結束-->")[0];
    const rankMatch = block.match(/ACG-mainumber[^>]*>\s*No\.(\d+)/i);
    const identityMatch = block.match(/acgDetail\.php\?s=(\d+)[^>]*>([\s\S]*?)<\/a>/i);
    const popularityMatch = block.match(/span_want2paly_(\d+)[^>]*>\s*([\d,]+)/i);
    if (!rankMatch || !identityMatch || !popularityMatch) continue;
    const scoreMatch = block.match(/ACG-mainboxpoint[^>]*>[\s\S]*?<span[^>]*>\s*([\d.]+)/i);
    const genreDateMatch = block.match(/<li[^>]*>\s*([^<\/]+?)\s*\/\s*(\d{4}-\d{2}-\d{2})\s*<\/li>/i);
    const altMatch = block.match(/ACG-mainbox2B[\s\S]*?<img[^>]+alt=(["'])([\s\S]*?)\1/i);
    const title = cleanText(identityMatch[2]);
    const aliases = altMatch ? cleanText(altMatch[2]).split(",").map(cleanText).filter(Boolean) : [];
    if (!aliases.some((alias) => normalizeTitle(alias) === normalizeTitle(title))) aliases.unshift(title);
    rawItems.push({
      sourceId: identityMatch[1],
      bahamutId: identityMatch[1],
      rank: Number(rankMatch[1]),
      title,
      aliases,
      popularity: Number(popularityMatch[2].replace(/,/g, "")),
      scoreValue: scoreMatch ? Number(scoreMatch[1]) : null,
      genre: genreDateMatch ? cleanText(genreDateMatch[1]) : null,
      airDate: genreDateMatch ? genreDateMatch[2] : null,
    });
  }
  if (rawItems.length === 0) throw new Error("Bahamut returned no ranking items");
  rawItems.sort((left, right) => left.rank - right.rank || left.sourceId.localeCompare(right.sourceId));
  const canonical = {
    source: "bahamut",
    period: "halfyear",
    items: rawItems.map(({ sourceId, rank, title, aliases, popularity, scoreValue, genre, airDate }) => ({
      id: sourceId,
      rank,
      title,
      aliases,
      popularity,
      score: scoreValue,
      genre,
      airDate,
    })),
  };
  const contentHash = crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
  const listSize = rawItems.length;
  return {
    source: "bahamut",
    bucket: sampledAt,
    effectiveAt: sampledAt,
    collectedAt: sampledAt,
    nativeCadence: "change",
    contentHash,
    stale: false,
    items: rawItems.map((item) => ({
      ...item,
      canonicalId: "bahamut:" + item.sourceId,
      listSize,
      rawMetric: item.popularity,
      score: (listSize - item.rank + 1) / listSize,
      siteUrl: "https://acg.gamer.com.tw/acgDetail.php?s=" + item.sourceId,
      sources: ["bahamut"],
    })),
  };
}

function aniListAliases(item) {
  return [
    item.title && item.title.romaji,
    item.title && item.title.english,
    item.title && item.title.native,
    ...(item.synonyms || []),
  ].filter(Boolean);
}

function explicitSeasons(titles) {
  const seasons = new Set();
  const patterns = [
    /\bseason\s*(\d+)\b/gi,
    /\b(\d+)(?:st|nd|rd|th)\s+season\b/gi,
    /第\s*(\d+)\s*[期季]/g,
  ];
  for (const title of titles) {
    const normalized = cleanText(title);
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(normalized))) seasons.add(Number(match[1]));
    }
  }
  return seasons;
}

function seasonsConflict(leftTitles, rightTitles) {
  const left = explicitSeasons(leftTitles);
  const right = explicitSeasons(rightTitles);
  if (left.size === 0 && right.size === 0) return false;
  if (left.size === 0 || right.size === 0) return true;
  return ![...left].some((season) => right.has(season));
}

function matchBahamutSnapshot(snapshot, aniListSnapshot) {
  const candidates = aniListSnapshot.items;
  return {
    ...snapshot,
    items: snapshot.items.map((item) => {
      const titles = new Set(item.aliases.map(normalizeTitle).filter(Boolean));
      const itemYear = item.airDate ? Number(item.airDate.slice(0, 4)) : null;
      const matches = candidates.filter((candidate) => {
        const candidateAliases = aniListAliases(candidate);
        if (seasonsConflict(item.aliases, candidateAliases)) return false;
        const candidateYear = candidate.startDate && candidate.startDate.year
          ? Number(candidate.startDate.year)
          : candidate.seasonYear;
        if (itemYear && candidateYear && itemYear !== candidateYear) return false;
        return candidateAliases.some((title) => titles.has(normalizeTitle(title)));
      });
      if (matches.length !== 1) return null;
      const match = matches[0];
      return {
        ...item,
        canonicalId: match.canonicalId,
        anilistId: match.anilistId,
        malId: match.malId,
      };
    }).filter(Boolean),
  };
}

async function fetchBahamutSnapshot({ fetchImpl = fetch, sampledAt }) {
  const response = await fetchImpl(BAHAMUT_ENDPOINT, {
    method: "GET",
    headers: {
      Accept: "text/html",
      "User-Agent": "forward-widgets-anime-rankings/1.0 (+https://github.com/lucking7/forward-widgets)",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!response || !response.ok) {
    throw new Error("Bahamut request failed: " + (response ? response.status : "network"));
  }
  return parseBahamutHtml(await response.text(), sampledAt);
}

module.exports = {
  BAHAMUT_ENDPOINT,
  fetchBahamutSnapshot,
  matchBahamutSnapshot,
  parseBahamutHtml,
};
