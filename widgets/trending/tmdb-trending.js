// TMDB 影视趋势榜，直接使用 Forward 内置 TMDB 接口提供电影与电视日榜/周榜。
WidgetMetadata = {
  id: "tmdb.trending.v1",
  title: "TMDB 影视趋势榜",
  description: "TMDB 全球电影与电视日榜、周榜",
  author: "lucking7",
  version: "1.0.0",
  requiredVersion: "0.0.2",
  site: "https://github.com/lucking7/forward-widgets",
  modules: [
    {
      id: "tmdbMovieTrending",
      title: "TMDB 电影趋势榜",
      functionName: "loadMovieTrending",
      type: "video",
      cacheDuration: 3600,
      params: [
        {
          name: "window", title: "榜单周期", type: "enumeration", value: "day",
          enumOptions: [
            { title: "电影日榜", value: "day" },
            { title: "电影周榜", value: "week" },
          ],
        },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "tmdbTvTrending",
      title: "TMDB 电视趋势榜",
      functionName: "loadTvTrending",
      type: "video",
      cacheDuration: 3600,
      params: [
        {
          name: "window", title: "榜单周期", type: "enumeration", value: "day",
          enumOptions: [
            { title: "电视日榜", value: "day" },
            { title: "电视周榜", value: "week" },
          ],
        },
        { name: "page", title: "页码", type: "page" },
      ],
    },
  ],
};

async function loadMovieTrending(params) {
  return loadTmdbTrending("movie", params);
}

async function loadTvTrending(params) {
  return loadTmdbTrending("tv", params);
}

function responseData(response) {
  var status = Number(response && (response.status || response.statusCode));
  if (status >= 400) throw new Error("TMDB 趋势榜请求失败: " + status);
  var value = response && Object.prototype.hasOwnProperty.call(response, "data") ? response.data : response;
  if (typeof value !== "string") return value || {};
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error("TMDB 趋势榜返回了无效 JSON");
  }
}

function pageNumber(value) {
  var parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
}

function windowValue(value) {
  var window = String(value || "day");
  if (window !== "day" && window !== "week") throw new Error("榜单周期必须是 day 或 week");
  return window;
}

function windowTitle(mediaType, window) {
  return "TMDB 全球" + (mediaType === "movie" ? "电影" : "电视") + (window === "day" ? "日榜" : "周榜");
}

function mapTrendingItem(item, mediaType, window, rank) {
  var releaseDate = mediaType === "movie" ? item.release_date : item.first_air_date;
  var title = mediaType === "movie" ? item.title : item.name;
  return {
    id: Number(item.id),
    tmdbId: Number(item.id),
    type: "tmdb",
    mediaType: mediaType,
    title: "#" + rank + " " + (title || item.original_title || item.original_name || "未命名"),
    description: windowTitle(mediaType, window) + (item.overview ? " · " + item.overview : ""),
    releaseDate: releaseDate,
    year: releaseDate ? String(releaseDate).slice(0, 4) : undefined,
    posterPath: item.poster_path,
    backdropPath: item.backdrop_path,
    rating: item.vote_average,
  };
}

async function loadTmdbTrending(mediaType, params) {
  params = params || {};
  var window = windowValue(params.window);
  var page = pageNumber(params.page);
  if (!Widget.tmdb || typeof Widget.tmdb.get !== "function") {
    throw new Error("当前 Forward 运行时未提供 Widget.tmdb");
  }
  var response = await Widget.tmdb.get("trending/" + mediaType + "/" + window, {
    params: { language: "zh-CN", page: page },
  });
  var data = responseData(response);
  var results = Array.isArray(data.results) ? data.results : [];
  return results.map(function (item, index) {
    return mapTrendingItem(item, mediaType, window, (page - 1) * 20 + index + 1);
  });
}
