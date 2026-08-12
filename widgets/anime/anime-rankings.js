// 动漫加权榜，读取自部署榜单 API，并用严格证据映射到 TMDB。
WidgetMetadata = {
  id: "anime.weighted.rankings.v1",
  title: "动漫加权榜",
  description: "AniList 小时趋势与巴哈姆特社区信号加权，提供实时、日榜和周榜",
  author: "lucking7",
  version: "1.0.0",
  requiredVersion: "0.0.2",
  site: "https://github.com/lucking7/forward-widgets",
  modules: [
    {
      id: "animeRankings",
      title: "动漫加权榜",
      functionName: "loadAnimeRankings",
      type: "video",
      cacheDuration: 900,
      params: [
        {
          name: "apiBase",
          title: "榜单 API 地址",
          type: "input",
          description: "Vercel 部署的 HTTPS 根地址，例如 https://example.vercel.app",
        },
        {
          name: "window",
          title: "榜单周期",
          type: "enumeration",
          value: "day",
          enumOptions: [
            { title: "实时榜", value: "realtime" },
            { title: "日榜", value: "day" },
            { title: "周榜", value: "week" },
          ],
        },
        { name: "page", title: "页码", type: "page" },
      ],
    },
  ],
};

var WINDOW_TITLES = { realtime: "实时榜", day: "日榜", week: "周榜" };

function responseData(response) {
  var status = Number(response && (response.status || response.statusCode));
  if (status >= 400) throw new Error("榜单 API 请求失败: " + status);
  var value = response && Object.prototype.hasOwnProperty.call(response, "data") ? response.data : response;
  if (typeof value !== "string") return value || {};
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error("榜单 API 返回了无效 JSON");
  }
}

function apiRoot(value) {
  var input = String(value || "").trim().replace(/\/+$/, "");
  if (!/^https:\/\/[A-Za-z0-9.-]+(?::\d+)?(?:\/[^\s?#]*)?$/i.test(input)) {
    throw new Error("榜单 API 必须是 HTTPS 根地址");
  }
  return input;
}

function pageNumber(value) {
  var parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
}

function cleanTitle(value) {
  var title = String(value || "");
  if (typeof title.normalize === "function") title = title.normalize("NFKC");
  return title.replace(/\s+/g, " ").trim();
}

function normalizeTitle(value) {
  return cleanTitle(value).toLocaleLowerCase().replace(/[\p{P}\p{S}\s]+/gu, "");
}

function sourceTitles(item) {
  var title = item && item.title || {};
  return [title.english, title.romaji, title.native].concat(item && item.synonyms || [])
    .map(cleanTitle)
    .filter(Boolean);
}

function seasonEvidence(titles) {
  var patterns = [
    /\bseason\s*(\d+)\b/i,
    /\b(\d+)(?:st|nd|rd|th)\s+season\b/i,
    /第\s*(\d+)\s*[期季]/,
  ];
  var number = null;
  titles.some(function (title) {
    return patterns.some(function (pattern) {
      var match = title.match(pattern);
      if (!match) return false;
      number = Number(match[1]);
      return true;
    });
  });
  var bases = titles.map(function (title) {
    return patterns.reduce(function (value, pattern) {
      return value.replace(pattern, " ");
    }, title).replace(/\s+/g, " ").trim();
  }).filter(Boolean);
  return { number: number, bases: bases };
}

function yearOf(value) {
  var match = String(value || "").match(/(?:^|\D)((?:19|20)\d{2})(?:\D|$)/);
  return match ? Number(match[1]) : null;
}

function sourceYear(item) {
  return item && item.startDate && Number(item.startDate.year) || Number(item && item.seasonYear) || null;
}

function candidateAliases(candidate, mediaType) {
  return mediaType === "movie"
    ? [candidate.title, candidate.original_title]
    : [candidate.name, candidate.original_name];
}

function hasExactTitle(candidate, expectedTitles, mediaType) {
  var expected = Object.create(null);
  expectedTitles.forEach(function (title) { expected[normalizeTitle(title)] = true; });
  return candidateAliases(candidate, mediaType).some(function (title) {
    var normalized = normalizeTitle(title);
    return normalized && expected[normalized];
  });
}

async function selectStrictTmdb(item) {
  if (!Widget.tmdb || typeof Widget.tmdb.get !== "function") return null;
  var titles = sourceTitles(item);
  if (!titles.length) return null;
  var mediaType = item.format === "MOVIE" ? "movie" : "tv";
  var season = mediaType === "tv" ? seasonEvidence(titles) : { number: null, bases: titles };
  var query = season.number && season.number > 1 ? season.bases[0] : titles[0];
  var result = responseData(await Widget.tmdb.get("search/" + mediaType, {
    params: { query: query, language: "zh-CN" },
  }));
  var candidates = result && Array.isArray(result.results) ? result.results : [];
  var expectedTitles = season.number && season.number > 1 ? season.bases : titles;
  var exact = candidates.filter(function (candidate) {
    return hasExactTitle(candidate, expectedTitles, mediaType);
  });
  var year = sourceYear(item);

  if (mediaType === "movie" || !season.number || season.number <= 1) {
    exact = exact.filter(function (candidate) {
      var date = mediaType === "movie" ? candidate.release_date : candidate.first_air_date;
      return !year || yearOf(date) === year;
    });
    return exact.length === 1 ? { candidate: exact[0], mediaType: mediaType, season: season.number } : null;
  }

  if (exact.length !== 1) return null;
  var seasonDetail = responseData(await Widget.tmdb.get("tv/" + exact[0].id + "/season/" + season.number));
  if (year && yearOf(seasonDetail && seasonDetail.air_date) !== year) return null;
  return { candidate: exact[0], mediaType: mediaType, season: season.number };
}

function rankingDescription(item, payload) {
  var coverage = payload.coverage || {};
  var sourceText = (item.sources || []).map(function (source) {
    return source === "anilist" ? "AniList" : source === "bahamut" ? "Bahamut" : source;
  }).join(" + ");
  var parts = [WINDOW_TITLES[payload.window] || payload.window];
  if (coverage.expected != null && coverage.actual != null) {
    parts.push("覆盖 " + coverage.actual + "/" + coverage.expected);
  }
  if (sourceText) parts.push(sourceText);
  if (payload.partial) parts.push("数据积累中");
  if (payload.stale) parts.push("数据可能已过期");
  return parts.join(" · ");
}

async function mapRankingItem(item, payload) {
  var match = await selectStrictTmdb(item);
  if (!match) return null;
  var candidate = match.candidate;
  var title = candidate.title || candidate.name || sourceTitles(item)[0];
  var date = match.mediaType === "movie" ? candidate.release_date : candidate.first_air_date;
  var output = {
    id: match.mediaType + "." + candidate.id,
    tmdbId: Number(candidate.id),
    type: "tmdb",
    mediaType: match.mediaType,
    title: "#" + item.rank + " " + title,
    description: rankingDescription(item, payload),
    releaseDate: date,
    year: date ? String(date).slice(0, 4) : undefined,
    posterPath: candidate.poster_path,
    backdropPath: candidate.backdrop_path,
    rating: candidate.vote_average,
  };
  if (match.mediaType === "tv" && match.season) {
    output.season = match.season;
    output.seasonNumber = match.season;
  }
  return output;
}

async function mapWithConcurrency(items, payload, limit) {
  var output = new Array(items.length);
  var nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      var index = nextIndex;
      nextIndex += 1;
      try {
        output[index] = await mapRankingItem(items[index], payload);
      } catch (error) {
        output[index] = null;
      }
    }
  }
  var workers = [];
  var count = Math.min(limit, items.length);
  for (var index = 0; index < count; index += 1) workers.push(worker());
  await Promise.all(workers);
  return output.filter(Boolean);
}

async function loadAnimeRankings(params) {
  params = params || {};
  var root = apiRoot(params.apiBase);
  var window = String(params.window || "day");
  if (!WINDOW_TITLES[window]) throw new Error("不支持的榜单周期");
  var page = pageNumber(params.page);
  var response = await Widget.http.get(root + "/api/v1/rankings/anime/" + window, {
    headers: { Accept: "application/json", "User-Agent": "ForwardWidgets/AnimeRankings" },
  });
  var payload = responseData(response);
  if (Number(payload.schemaVersion) !== 1 || !Array.isArray(payload.items)) {
    throw new Error("榜单 API 契约不兼容");
  }
  var start = (page - 1) * 20;
  return mapWithConcurrency(payload.items.slice(start, start + 20), payload, 4);
}
