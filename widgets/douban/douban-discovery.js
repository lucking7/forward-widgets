// 豆瓣全景，公开榜单、个人列表与严格 TMDB 匹配。
WidgetMetadata = {
  id: "douban.discovery.v1",
  title: "豆瓣全景",
  description: "公开榜单、自定义片单、个性推荐与严格 TMDB 匹配",
  author: "lucking7",
  version: "1.0.0",
  requiredVersion: "0.0.2",
  site: "https://github.com/lucking7/forward-widgets",
  modules: [
    {
      id: "doubanPublic",
      title: "豆瓣公开榜单",
      functionName: "loadPublicCollections",
      type: "video",
      cacheDuration: 21600,
      params: [
        {
          name: "collection", title: "榜单", type: "enumeration", value: "movie_top250",
          enumOptions: [
            { title: "英美剧", value: "tv_american" },
            { title: "韩剧", value: "tv_korean" },
            { title: "日剧", value: "tv_japanese" },
            { title: "国产剧", value: "tv_domestic" },
            { title: "动画", value: "tv_animation" },
            { title: "实时热门电影", value: "movie_hot" },
            { title: "一周口碑电影", value: "movie_weekly" },
            { title: "豆瓣 Top 250", value: "movie_top250" },
            { title: "院线热映", value: "movie_showing" },
            { title: "国内综艺", value: "show_domestic" },
            { title: "国外综艺", value: "show_foreign" },
            { title: "全球口碑剧集", value: "tv_global_best" },
            { title: "华语口碑剧集", value: "tv_chinese_best" },
            { title: "豆瓣热门电影", value: "movie_hot_gaia" },
            { title: "热播新剧", value: "tv_hot" },
            { title: "热播综艺", value: "show_hot" },
            { title: "实时热门电视", value: "tv_real_time_hotest" },
            { title: "国内综艺口碑榜", value: "show_chinese_best" },
            { title: "全球综艺口碑榜", value: "show_global_best" },
            { title: "第 97 届奥斯卡", value: "oscars_97" },
            { title: "首页精选 12 部", value: "highlights" },
          ],
        },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "doubanCustomList",
      title: "自定义豆瓣片单",
      functionName: "loadCustomList",
      type: "video",
      cacheDuration: 43200,
      params: [
        {
          name: "url", title: "Doulist 或合集地址", type: "input",
          description: "仅支持豆瓣 HTTPS Doulist 与 subject collection 地址",
          placeholders: [
            { title: "IMDb Movie Top 250", value: "https://m.douban.com/doulist/1518184" },
            { title: "IMDb TV Top 250", value: "https://m.douban.com/doulist/41573512" },
            { title: "意外结局电影", value: "https://m.douban.com/doulist/11324" },
          ],
        },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "doubanRecommendations",
      title: "豆瓣分类推荐",
      functionName: "loadRecommendations",
      type: "video",
      cacheDuration: 21600,
      params: [
        { name: "mediaType", title: "类别", type: "enumeration", value: "movie", enumOptions: [
          { title: "电影", value: "movie" }, { title: "剧集/综艺", value: "tv" },
        ] },
        { name: "category", title: "分类", type: "enumeration", value: "热门", enumOptions: [
          { title: "电影·热门", value: "热门" }, { title: "电影·最新", value: "最新" },
          { title: "电影·豆瓣高分", value: "豆瓣高分" }, { title: "电影·冷门佳片", value: "冷门佳片" },
          { title: "剧集", value: "tv" }, { title: "综艺", value: "show" },
        ] },
        { name: "region", title: "地区/子类型", type: "enumeration", value: "全部", enumOptions: [
          { title: "电影·全部", value: "全部" }, { title: "电影·华语", value: "华语" },
          { title: "电影·欧美", value: "欧美" }, { title: "电影·韩国", value: "韩国" },
          { title: "电影·日本", value: "日本" }, { title: "剧集·综合", value: "tv" },
          { title: "剧集·国产", value: "tv_domestic" }, { title: "剧集·欧美", value: "tv_american" },
          { title: "剧集·日本", value: "tv_japanese" }, { title: "剧集·韩国", value: "tv_korean" },
          { title: "剧集·动画", value: "tv_animation" }, { title: "剧集·纪录片", value: "tv_documentary" },
          { title: "综艺·综合", value: "show" }, { title: "综艺·国内", value: "show_domestic" },
          { title: "综艺·国外", value: "show_foreign" },
        ] },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "doubanExplore",
      title: "豆瓣偏好探索",
      functionName: "loadPreferenceExplore",
      type: "video",
      cacheDuration: 21600,
      params: [
        { name: "mediaType", title: "类别", type: "enumeration", value: "movie", enumOptions: [
          { title: "电影", value: "movie" }, { title: "剧集", value: "tv" },
        ] },
        { name: "format", title: "形式", type: "enumeration", value: "", enumOptions: [
          { title: "全部", value: "" }, { title: "电视剧", value: "电视剧" }, { title: "综艺", value: "综艺" },
        ] },
        { name: "genre", title: "类型", type: "enumeration", value: "", enumOptions: [
          { title: "全部", value: "" }, { title: "喜剧", value: "喜剧" }, { title: "爱情", value: "爱情" },
          { title: "动作", value: "动作" }, { title: "科幻", value: "科幻" }, { title: "动画", value: "动画" },
          { title: "悬疑", value: "悬疑" }, { title: "犯罪", value: "犯罪" }, { title: "音乐", value: "音乐" },
          { title: "历史", value: "历史" }, { title: "奇幻", value: "奇幻" }, { title: "恐怖", value: "恐怖" },
          { title: "战争", value: "战争" }, { title: "西部", value: "西部" }, { title: "歌舞", value: "歌舞" },
          { title: "传记", value: "传记" }, { title: "武侠", value: "武侠" }, { title: "纪录片", value: "纪录片" },
          { title: "短片", value: "短片" }, { title: "古装", value: "古装" }, { title: "家庭", value: "家庭" },
          { title: "冒险", value: "冒险" }, { title: "剧情", value: "剧情" }, { title: "惊悚", value: "惊悚" },
          { title: "灾难", value: "灾难" }, { title: "真人秀", value: "真人秀" }, { title: "脱口秀", value: "脱口秀" },
        ] },
        { name: "region", title: "地区", type: "enumeration", value: "", enumOptions: [
          { title: "全部", value: "" }, { title: "华语", value: "华语" }, { title: "欧美", value: "欧美" },
          { title: "韩国", value: "韩国" }, { title: "日本", value: "日本" }, { title: "中国大陆", value: "中国大陆" },
          { title: "中国香港", value: "中国香港" }, { title: "中国台湾", value: "中国台湾" },
          { title: "美国", value: "美国" }, { title: "英国", value: "英国" }, { title: "法国", value: "法国" },
          { title: "德国", value: "德国" }, { title: "意大利", value: "意大利" },
          { title: "西班牙", value: "西班牙" }, { title: "印度", value: "印度" }, { title: "泰国", value: "泰国" },
        ] },
        { name: "year", title: "年份", type: "input", value: "", description: "年份或年代，例如 2026、2020年代" },
        { name: "platform", title: "平台", type: "enumeration", value: "", enumOptions: [
          { title: "全部", value: "" }, { title: "腾讯视频", value: "腾讯视频" }, { title: "爱奇艺", value: "爱奇艺" },
          { title: "优酷", value: "优酷" }, { title: "湖南卫视", value: "湖南卫视" }, { title: "Netflix", value: "Netflix" },
          { title: "HBO", value: "HBO" }, { title: "BBC", value: "BBC" }, { title: "NHK", value: "NHK" },
          { title: "CBS", value: "CBS" }, { title: "NBC", value: "NBC" }, { title: "tvN", value: "tvN" },
          { title: "Apple TV+", value: "Apple TV+" }, { title: "Disney+", value: "Disney+" },
        ] },
        { name: "tags", title: "自定义标签", type: "input", value: "", description: "多个标签用英文逗号分隔" },
        { name: "minRating", title: "最低评分", type: "input", value: "0", description: "0 到 9 的整数" },
        { name: "sort", title: "排序", type: "enumeration", value: "U", enumOptions: [
          { title: "综合排序", value: "T" }, { title: "近期热度", value: "U" },
          { title: "首映时间", value: "R" }, { title: "高分优选", value: "S" },
        ] },
        { name: "offset", title: "起始位置", type: "offset" },
      ],
    },
    {
      id: "doubanInterests",
      title: "豆瓣我看",
      functionName: "loadInterests",
      type: "video",
      cacheDuration: 0,
      params: [
        { name: "userId", title: "豆瓣用户 ID", type: "input", description: "个人主页 URL 中的用户 ID" },
        { name: "status", title: "状态", type: "enumeration", value: "mark", enumOptions: [
          { title: "想看", value: "mark" }, { title: "在看", value: "doing" },
          { title: "看过", value: "done" }, { title: "随机想看", value: "random_mark" },
        ] },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "doubanPersonalized",
      title: "豆瓣个性推荐",
      functionName: "loadPersonalized",
      type: "video",
      cacheDuration: 0,
      params: [
        { name: "cookie", title: "用户 Cookie", type: "input", description: "仅发往 m.douban.com，不记录、不缓存" },
        { name: "mediaType", title: "类别", type: "enumeration", value: "movie", enumOptions: [
          { title: "电影", value: "movie" }, { title: "电视", value: "tv" },
        ] },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "doubanPeople",
      title: "豆瓣影人作品",
      functionName: "loadPeopleWorks",
      type: "video",
      cacheDuration: 604800,
      params: [
        { name: "person", title: "影人", type: "input", description: "豆瓣影人 ID、URL 或唯一精确姓名" },
        { name: "sort", title: "排序", type: "enumeration", value: "time", enumOptions: [
          { title: "时间", value: "time" }, { title: "评分", value: "vote" },
        ] },
        { name: "page", title: "页码", type: "page" },
      ],
    },
  ],
};

var DOUBAN_COLLECTIONS = {
  tv_american: { id: "tv_american", type: "tv" },
  tv_korean: { id: "tv_korean", type: "tv" },
  tv_japanese: { id: "tv_japanese", type: "tv" },
  tv_domestic: { id: "tv_domestic", type: "tv" },
  tv_animation: { id: "tv_animation", type: "tv" },
  movie_hot: { id: "movie_real_time_hotest", type: "movie" },
  movie_weekly: { id: "movie_weekly_best", type: "movie" },
  movie_top250: { id: "movie_top250", type: "movie" },
  movie_showing: { id: "movie_showing", type: "movie" },
  show_domestic: { id: "show_domestic", type: "tv" },
  show_foreign: { id: "show_foreign", type: "tv" },
  tv_global_best: { id: "tv_global_best_weekly", type: "tv" },
  tv_chinese_best: { id: "tv_chinese_best_weekly", type: "tv" },
  movie_hot_gaia: { id: "movie_hot_gaia", type: "movie" },
  tv_hot: { id: "tv_hot", type: "tv" },
  show_hot: { id: "show_hot", type: "tv" },
  tv_real_time_hotest: { id: "tv_real_time_hotest", type: "tv" },
  show_chinese_best: { id: "show_chinese_best_weekly", type: "tv" },
  show_global_best: { id: "show_global_best_weekly", type: "tv" },
  oscars_97: { id: "EC7I7ZDRA", type: "movie" },
};

var DOUBAN_TAG_FALLBACKS = {
  tv_domestic: { type: "tv", tag: "国产剧" },
  show_domestic: { type: "tv", tag: "综艺" },
  movie_hot: { type: "movie", tag: "热门" },
  tv_american: { type: "tv", tag: "美剧" },
};

var MOVIE_RECOMMENDATION_CATEGORIES = ["热门", "最新", "豆瓣高分", "冷门佳片"];
var MOVIE_RECOMMENDATION_REGIONS = ["全部", "华语", "欧美", "韩国", "日本"];
var TV_RECOMMENDATION_REGIONS = {
  tv: ["tv", "tv_domestic", "tv_american", "tv_japanese", "tv_korean", "tv_animation", "tv_documentary"],
  show: ["show", "show_domestic", "show_foreign"],
};

var DOUBAN_HEADERS = {
  Referer: "https://m.douban.com/",
  "User-Agent": "Mozilla/5.0 (ForwardWidgets; Douban Discovery)",
};

function responseData(response) {
  var status = Number(response && (response.status || response.statusCode));
  if (status >= 400) throw new Error("豆瓣请求失败: " + status);
  var value = response && Object.prototype.hasOwnProperty.call(response, "data") ? response.data : response;
  if (typeof value !== "string") return value || {};
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error("豆瓣返回了无效 JSON");
  }
}

function pageNumber(value) {
  var parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
}

function normalizeIdentityTitle(value) {
  var title = String(value || "");
  if (typeof title.normalize === "function") title = title.normalize("NFKC");
  return title
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^[\s\p{P}\p{S}]+|[\s\p{P}\p{S}]+$/gu, "")
    .trim();
}

function normalizeMediaType(value, fallback) {
  var type = String(value || fallback || "").toLowerCase();
  if (type === "movie") return "movie";
  if (type === "tv" || type === "show" || type === "series") return "tv";
  return "";
}

function yearFromValue(value) {
  var match = String(value || "").match(/(?:^|\D)((?:19|20)\d{2})(?:\D|$)/);
  return match ? Number(match[1]) : null;
}

function normalizeDoubanSubject(raw, fallbackType) {
  var subject = raw && (raw.subject || raw.target || raw.work) || raw || {};
  var id = subject.id != null ? subject.id : raw && raw.target_id;
  var type = normalizeMediaType(subject.type, fallbackType);
  var ratingValue = subject.rating && typeof subject.rating === "object" ? subject.rating.value : subject.rating;
  return {
    id: id == null ? "" : String(id),
    title: String(subject.title || subject.name || "").trim(),
    originalTitle: String(subject.original_title || subject.originalTitle || "").trim(),
    type: type,
    year: yearFromValue(subject.year || subject.card_subtitle || subject.info),
    rating: Number(ratingValue != null ? ratingValue : subject.rate) || undefined,
    description: subject.info || subject.description || subject.card_subtitle || "",
    posterPath: subject.posterPath || subject.cover_url || (typeof subject.cover === "string" ? subject.cover : subject.cover && subject.cover.url) ||
      subject.pic && subject.pic.normal || undefined,
  };
}

function candidateYear(candidate, mediaType) {
  return yearFromValue(mediaType === "movie" ? candidate.release_date : candidate.first_air_date);
}

function candidateTitleEvidence(subject, candidate) {
  var subjectMain = normalizeIdentityTitle(subject.title);
  var subjectOriginal = normalizeIdentityTitle(subject.originalTitle);
  var candidateMain = normalizeIdentityTitle(candidate.title || candidate.name);
  var candidateOriginal = normalizeIdentityTitle(candidate.original_title || candidate.original_name);
  return {
    any: Boolean(subjectMain && (subjectMain === candidateMain || subjectMain === candidateOriginal)) ||
      Boolean(subjectOriginal && (subjectOriginal === candidateMain || subjectOriginal === candidateOriginal)),
    main: Boolean(subjectMain && subjectMain === candidateMain),
    original: Boolean(subjectOriginal && subjectOriginal === candidateOriginal),
  };
}

function selectStrictTmdbCandidate(subject, candidates) {
  var typed = (Array.isArray(candidates) ? candidates : []).filter(function (candidate) {
    var candidateType = normalizeMediaType(candidate.media_type, subject.type);
    return candidateType === subject.type && candidateTitleEvidence(subject, candidate).any;
  });
  if (!typed.length) return null;

  if (subject.year) {
    var exactYear = typed.filter(function (candidate) {
      return candidateYear(candidate, subject.type) === subject.year;
    });
    if (exactYear.length === 1) return exactYear[0];
    if (exactYear.length > 1) return null;

    var adjacentYear = typed.filter(function (candidate) {
      var evidence = candidateTitleEvidence(subject, candidate);
      var year = candidateYear(candidate, subject.type);
      return evidence.main && evidence.original && year && Math.abs(year - subject.year) === 1;
    });
    return adjacentYear.length === 1 ? adjacentYear[0] : null;
  }

  return typed.length === 1 ? typed[0] : null;
}

function doubanFallbackItem(subject) {
  return {
    id: subject.id,
    type: "douban",
    title: subject.title,
    mediaType: subject.type || undefined,
    rating: subject.rating,
    description: subject.description,
    posterPath: subject.posterPath,
  };
}

function tmdbVideoItem(subject, candidate) {
  var mediaType = subject.type;
  var releaseDate = mediaType === "movie" ? candidate.release_date : candidate.first_air_date;
  return {
    id: Number(candidate.id),
    tmdbId: candidate.id,
    type: "tmdb",
    mediaType: mediaType,
    title: candidate.title || candidate.name || subject.title,
    description: candidate.overview || subject.description,
    releaseDate: releaseDate,
    year: releaseDate ? String(releaseDate).slice(0, 4) : undefined,
    posterPath: candidate.poster_path,
    backdropPath: candidate.backdrop_path,
    rating: subject.rating || candidate.vote_average,
  };
}

function mappingCacheKey(subject) {
  return [
    "douban_tmdb_v1",
    subject.id,
    subject.type,
    subject.year || "",
    normalizeIdentityTitle(subject.title),
    normalizeIdentityTitle(subject.originalTitle),
  ].map(function (part) { return encodeURIComponent(String(part || "")); }).join(":");
}

async function readMappingCache(subject) {
  if (!Widget.storage || typeof Widget.storage.get !== "function") return null;
  try {
    var value = await Widget.storage.get(mappingCacheKey(subject));
    if (typeof value === "string") value = JSON.parse(value);
    if (!value || Number(value.expiresAt) <= Date.now()) return null;
    return value;
  } catch (error) {
    return null;
  }
}

async function writeMappingCache(subject, candidate) {
  if (!Widget.storage || typeof Widget.storage.set !== "function") return;
  var ttl = candidate ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  try {
    await Widget.storage.set(mappingCacheKey(subject), {
      candidate: candidate || null,
      expiresAt: Date.now() + ttl,
    });
  } catch (error) {
    // Cache failures must not hide a valid list item.
  }
}

async function mapSubjectToVideo(subject, useCache) {
  if (!subject.id || !subject.title || !subject.type || !Widget.tmdb || typeof Widget.tmdb.get !== "function") {
    return doubanFallbackItem(subject);
  }
  if (useCache !== false) {
    var cached = await readMappingCache(subject);
    if (cached) return cached.candidate ? tmdbVideoItem(subject, cached.candidate) : doubanFallbackItem(subject);
  }
  try {
    var response = await Widget.tmdb.get("search/" + subject.type, {
      params: { query: subject.title, language: "zh-CN" },
    });
    var data = responseData(response);
    var candidate = selectStrictTmdbCandidate(subject, data.results || []);
    if (useCache !== false) await writeMappingCache(subject, candidate);
    return candidate ? tmdbVideoItem(subject, candidate) : doubanFallbackItem(subject);
  } catch (error) {
    return doubanFallbackItem(subject);
  }
}

async function mapSubjects(rawItems, fallbackType, useCache) {
  var results = new Array(rawItems.length);
  var nextIndex = 0;
  async function worker() {
    while (true) {
      var index = nextIndex;
      nextIndex += 1;
      if (index >= rawItems.length) return;
      results[index] = await mapSubjectToVideo(normalizeDoubanSubject(rawItems[index], fallbackType), useCache);
    }
  }
  var workers = [];
  var workerCount = Math.min(4, rawItems.length);
  for (var workerIndex = 0; workerIndex < workerCount; workerIndex += 1) workers.push(worker());
  await Promise.all(workers);
  var seen = Object.create(null);
  return results.filter(function (item) {
    var key = [item.type || "", item.mediaType || "", item.id || ""].join(":");
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

async function loadPublicHighlights(page) {
  if (page > 1) return [];
  var definitions = [
    { id: "movie_hot_gaia", type: "movie" },
    { id: "tv_hot", type: "tv" },
    { id: "show_hot", type: "tv" },
    { id: "tv_animation", type: "tv" },
  ];
  var responses = await Promise.all(definitions.map(function (definition) {
    var url = "https://m.douban.com/rexxar/api/v2/subject_collection/" + definition.id +
      "/items?start=0&count=12&items_only=1&for_mobile=1";
    return Widget.http.get(url, { headers: DOUBAN_HEADERS });
  }));
  var subjects = [];
  responses.forEach(function (response, index) {
    var items = responseData(response).subject_collection_items || [];
    items.slice(0, 3).forEach(function (item) {
      subjects.push(normalizeDoubanSubject(item, definitions[index].type));
    });
  });
  return mapSubjects(subjects, "");
}

async function loadPublicCollections(params) {
  params = params || {};
  var key = params.collection || "movie_top250";
  var page = pageNumber(params.page);
  if (key === "highlights") return loadPublicHighlights(page);
  var collection = DOUBAN_COLLECTIONS[key];
  if (!collection) throw new Error("不支持的豆瓣公开榜单");
  var tagFallback = DOUBAN_TAG_FALLBACKS[key];
  var start = (page - 1) * 20;
  var url = "https://m.douban.com/rexxar/api/v2/subject_collection/" + collection.id +
    "/items?start=" + start + "&count=20&items_only=1&for_mobile=1";
  var items;
  try {
    var response = await Widget.http.get(url, { headers: DOUBAN_HEADERS });
    items = responseData(response).subject_collection_items || [];
  } catch (error) {
    if (!tagFallback) throw error;
    items = [];
  }
  if (!items.length && tagFallback) {
    var tagUrl = "https://movie.douban.com/j/search_subjects?type=" + tagFallback.type +
      "&tag=" + encodeURIComponent(tagFallback.tag) + "&sort=recommend&page_limit=20&page_start=" + start;
    var tagResponse = await Widget.http.get(tagUrl, { headers: DOUBAN_HEADERS });
    items = responseData(tagResponse).subjects || [];
  }
  return mapSubjects(items, collection.type);
}

function parseCustomListUrl(value) {
  var input = String(value || "").trim();
  var doulist = input.match(/^https:\/\/(?:www|movie|m)\.douban\.com\/doulist\/(\d+)(?:[\/?#].*)?$/i);
  if (doulist) return { kind: "doulist", id: doulist[1] };
  var collection = input.match(/^https:\/\/(?:www|movie|m)\.douban\.com\/subject_collection\/([A-Za-z0-9_-]+)(?:[\/?#].*)?$/i);
  if (collection) return { kind: "collection", id: collection[1] };
  throw new Error("仅支持豆瓣 HTTPS Doulist 或 subject collection 地址");
}

async function loadCustomList(params) {
  params = params || {};
  var parsed = parseCustomListUrl(params.url);
  var page = pageNumber(params.page);
  var url;
  var items;
  if (parsed.kind === "doulist") {
    var doulistStart = (page - 1) * 25;
    url = "https://m.douban.com/rexxar/api/v2/doulist/" + parsed.id +
      "/items?start=" + doulistStart + "&count=25&items_only=1&for_mobile=1";
    var doulistData = responseData(await Widget.http.get(url, { headers: DOUBAN_HEADERS }));
    items = doulistData.items || [];
  } else {
    var collectionStart = (page - 1) * 20;
    url = "https://m.douban.com/rexxar/api/v2/subject_collection/" + parsed.id +
      "/items?start=" + collectionStart + "&count=20&items_only=1&for_mobile=1";
    var collectionData = responseData(await Widget.http.get(url, { headers: DOUBAN_HEADERS }));
    items = collectionData.subject_collection_items || [];
  }
  return mapSubjects(items, "");
}

async function loadRecommendations(params) {
  params = params || {};
  var mediaType = normalizeMediaType(params.mediaType || "movie");
  var category = String(params.category || (mediaType === "movie" ? "热门" : "tv"));
  var region = String(params.region || (mediaType === "movie" ? "全部" : category));
  var validMovie = mediaType === "movie" && MOVIE_RECOMMENDATION_CATEGORIES.indexOf(category) >= 0 &&
    MOVIE_RECOMMENDATION_REGIONS.indexOf(region) >= 0;
  var validTv = mediaType === "tv" && TV_RECOMMENDATION_REGIONS[category] &&
    TV_RECOMMENDATION_REGIONS[category].indexOf(region) >= 0;
  if (!validMovie && !validTv) throw new Error("不支持的推荐组合");
  var page = pageNumber(params.page);
  var start = (page - 1) * 20;
  var url = "https://m.douban.com/rexxar/api/v2/subject/recent_hot/" + mediaType +
    "?start=" + start + "&limit=20&category=" + encodeURIComponent(category) +
    "&type=" + encodeURIComponent(region);
  var data = responseData(await Widget.http.get(url, { headers: DOUBAN_HEADERS }));
  return mapSubjects(data.items || [], mediaType);
}

async function loadPreferenceExplore(params) {
  params = params || {};
  var mediaType = normalizeMediaType(params.mediaType || "movie");
  if (!mediaType) throw new Error("偏好类型必须是 movie 或 tv");
  var rating = String(params.minRating == null ? "0" : params.minRating);
  if (!/^(?:[0-9])$/.test(rating)) throw new Error("最低评分必须是 0 到 9 的整数");
  var offsetValue = Number(params.offset == null ? 0 : params.offset);
  var offset = Number.isFinite(offsetValue) && offsetValue >= 0 ? Math.floor(offsetValue) : 0;
  var selected = {
    "类型": String(params.genre || ""),
    "地区": String(params.region || ""),
    "形式": String(params.format || ""),
  };
  var tags = [params.genre, params.format, params.region, params.year, params.platform]
    .concat(String(params.tags || "").split(","))
    .map(function (value) { return String(value || "").trim(); })
    .filter(Boolean);
  var uniqueTags = [];
  tags.forEach(function (tag) {
    if (uniqueTags.indexOf(tag) < 0) uniqueTags.push(tag);
  });
  var url = "https://m.douban.com/rexxar/api/v2/" + mediaType +
    "/recommend?refresh=0&start=" + offset + "&count=20" +
    "&selected_categories=" + encodeURIComponent(JSON.stringify(selected)) +
    "&uncollect=false&score_range=" + encodeURIComponent(rating + ",10") +
    "&tags=" + encodeURIComponent(uniqueTags.join(",")) +
    "&sort=" + encodeURIComponent(String(params.sort || "U"));
  var data = responseData(await Widget.http.get(url, { headers: DOUBAN_HEADERS }));
  var items = (data.items || []).filter(function (item) { return !item.card || item.card === "subject"; });
  return mapSubjects(items, mediaType);
}

async function fetchInterestSubjects(userId, status, start, count) {
  var url = "https://m.douban.com/rexxar/api/v2/user/" + encodeURIComponent(userId) +
    "/interests?status=" + encodeURIComponent(status) + "&start=" + start + "&count=" + count;
  var data = responseData(await Widget.http.get(url, { headers: DOUBAN_HEADERS }));
  return (data.interests || []).map(function (item) { return item.subject || item; });
}

async function loadInterests(params) {
  params = params || {};
  var userId = String(params.userId || "").trim();
  if (!userId) throw new Error("豆瓣用户 ID 不能为空");
  var status = String(params.status || "mark");
  if (["mark", "doing", "done", "random_mark"].indexOf(status) < 0) {
    throw new Error("不支持的豆瓣我看状态");
  }
  var page = pageNumber(params.page);
  if (status === "random_mark") {
    if (page > 1) return [];
    var reservoir = [];
    var seen = Object.create(null);
    var uniqueCount = 0;
    for (var pageIndex = 0; pageIndex < 5; pageIndex += 1) {
      var batch = await fetchInterestSubjects(userId, "mark", pageIndex * 50, 50);
      for (var itemIndex = 0; itemIndex < batch.length; itemIndex += 1) {
        var normalized = normalizeDoubanSubject(batch[itemIndex], "");
        if (!normalized.id || seen[normalized.id]) continue;
        seen[normalized.id] = true;
        uniqueCount += 1;
        if (reservoir.length < 9) {
          reservoir.push(batch[itemIndex]);
        } else {
          var replacement = Math.floor(Math.random() * uniqueCount);
          if (replacement < 9) reservoir[replacement] = batch[itemIndex];
        }
      }
      if (batch.length < 50) break;
    }
    return mapSubjects(reservoir, "", false);
  }
  var subjects = await fetchInterestSubjects(userId, status, (page - 1) * 20, 20);
  return mapSubjects(subjects, "", false);
}

async function loadPersonalized(params) {
  params = params || {};
  var cookie = String(params.cookie || "").trim();
  if (!cookie) throw new Error("豆瓣个性推荐需要 Cookie");
  var ckMatch = cookie.match(/(?:^|;\s*)ck=([^;]+)/);
  if (!ckMatch || !ckMatch[1]) throw new Error("豆瓣 Cookie 缺少 ck 字段");
  var mediaType = normalizeMediaType(params.mediaType || "movie");
  if (!mediaType) throw new Error("个性推荐类型必须是 movie 或 tv");
  var start = (pageNumber(params.page) - 1) * 20;
  var url = "https://m.douban.com/rexxar/api/v2/" + mediaType +
    "/suggestion?start=" + start + "&count=20&new_struct=1&with_review=1&ck=" +
    encodeURIComponent(ckMatch[1]);
  var headers = {
    Referer: "https://m.douban.com/" + mediaType,
    "User-Agent": DOUBAN_HEADERS["User-Agent"],
    Cookie: cookie,
  };
  var response = await Widget.http.get(url, { headers: headers, allow_redirects: false });
  var status = Number(response && (response.status || response.statusCode));
  if (status >= 300 && status < 400) throw new Error("豆瓣个性推荐拒绝跨域重定向");
  var data = responseData(response);
  return mapSubjects(data.items || [], mediaType, false);
}

async function resolvePersonId(person) {
  var input = String(person || "").trim();
  if (!input) throw new Error("豆瓣影人不能为空");
  if (/^\d+$/.test(input)) return input;
  var urlMatch = input.match(/^https:\/\/(?:www|movie|m)\.douban\.com\/celebrity\/(\d+)(?:[\/?#].*)?$/i);
  if (urlMatch) return urlMatch[1];
  if (/^[a-z]+:\/\//i.test(input)) throw new Error("仅支持豆瓣影人 URL");
  var url = "https://movie.douban.com/j/subject_suggest?q=" + encodeURIComponent(input);
  var data = responseData(await Widget.http.get(url, { headers: DOUBAN_HEADERS }));
  var normalizedInput = normalizeIdentityTitle(input);
  var ids = [];
  (Array.isArray(data) ? data : []).forEach(function (candidate) {
    if (candidate.type !== "celebrity") return;
    if (normalizeIdentityTitle(candidate.title || candidate.name) !== normalizedInput) return;
    var id = String(candidate.id || "");
    if (id && ids.indexOf(id) < 0) ids.push(id);
  });
  if (ids.length !== 1) throw new Error("影人姓名没有唯一匹配，请改用豆瓣影人 ID 或 URL");
  return ids[0];
}

async function loadPeopleWorks(params) {
  params = params || {};
  var personId = await resolvePersonId(params.person);
  var page = pageNumber(params.page);
  var start = (page - 1) * 50;
  var sort = String(params.sort || "time");
  var url = "https://m.douban.com/rexxar/api/v2/celebrity/" + personId +
    "/works?start=" + start + "&count=50&sort=" + encodeURIComponent(sort);
  var data = responseData(await Widget.http.get(url, { headers: DOUBAN_HEADERS }));
  var works = (data.works || []).map(function (item) { return item.work || item; });
  return mapSubjects(works, "");
}
