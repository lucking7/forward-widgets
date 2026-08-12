const ANILIST_ENDPOINT = "https://graphql.anilist.co";

const ANILIST_TRENDING_QUERY = `
query AnimeTrending($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
      id
      idMal
      title { romaji english native }
      synonyms
      format
      status
      season
      seasonYear
      episodes
      startDate { year month day }
      countryOfOrigin
      genres
      averageScore
      popularity
      trending
      siteUrl
    }
  }
}`;

function normalizeAniListItem(item, index, listSize) {
  const rank = index + 1;
  return {
    canonicalId: "anilist:" + item.id,
    sourceId: String(item.id),
    anilistId: Number(item.id),
    malId: item.idMal == null ? null : Number(item.idMal),
    rank,
    listSize,
    rawMetric: Number(item.trending) || 0,
    score: (listSize - rank + 1) / listSize,
    title: item.title || {},
    synonyms: Array.isArray(item.synonyms) ? item.synonyms : [],
    format: item.format || null,
    season: item.season || null,
    seasonYear: item.seasonYear == null ? null : Number(item.seasonYear),
    episodes: item.episodes == null ? null : Number(item.episodes),
    startDate: item.startDate || null,
    countryOfOrigin: item.countryOfOrigin || null,
    genres: Array.isArray(item.genres) ? item.genres : [],
    averageScore: item.averageScore == null ? null : Number(item.averageScore),
    popularity: item.popularity == null ? null : Number(item.popularity),
    siteUrl: item.siteUrl || "https://anilist.co/anime/" + item.id,
    sources: ["anilist"],
  };
}

async function fetchAniListSnapshot({ fetchImpl = fetch, sampledAt, perPage = 100 }) {
  const response = await fetchImpl(ANILIST_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "forward-widgets-anime-rankings/1.0",
    },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      query: ANILIST_TRENDING_QUERY,
      variables: { page: 1, perPage },
    }),
  });
  if (!response || !response.ok) {
    throw new Error("AniList request failed: " + (response ? response.status : "network"));
  }
  const payload = await response.json();
  if (payload && Array.isArray(payload.errors) && payload.errors.length > 0) {
    throw new Error("AniList GraphQL error");
  }
  const media = payload && payload.data && payload.data.Page && payload.data.Page.media;
  if (!Array.isArray(media) || media.length === 0) {
    throw new Error("AniList returned no ranking items");
  }
  return {
    source: "anilist",
    bucket: sampledAt,
    effectiveAt: sampledAt,
    collectedAt: sampledAt,
    nativeCadence: "hour",
    stale: false,
    items: media.map((item, index) => normalizeAniListItem(item, index, media.length)),
  };
}

module.exports = {
  ANILIST_ENDPOINT,
  fetchAniListSnapshot,
};
