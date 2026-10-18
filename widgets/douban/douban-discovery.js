// 豆瓣全景，公开榜单、个人列表与严格 TMDB 匹配。
WidgetMetadata = {
  id: "douban.discovery.v1",
  title: "豆瓣全景",
  description: "一周口碑、电影与电视分类、实时书影音和可靠详情匹配",
  author: "lucking7",
  version: "1.2.1",
  requiredVersion: "0.0.2",
  site: "https://github.com/lucking7/forward-widgets",
  modules: [
    {
      id: "doubanPublic",
      title: "豆瓣一周口碑",
      functionName: "loadPublicCollections",
      type: "video",
      cacheDuration: 21600,
      params: [
        {
          name: "collection", title: "榜单", type: "enumeration", value: "movie_weekly",
          enumOptions: [
            { title: "一周口碑电影榜", value: "movie_weekly" },
            { title: "华语口碑剧集榜", value: "tv_chinese_best" },
            { title: "全球口碑剧集榜", value: "tv_global_best" },
            { title: "国内口碑综艺榜", value: "show_chinese_best" },
            { title: "全球口碑综艺榜", value: "show_global_best" },
          ],
        },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    movieCatalogModule(),
    tvCatalogModule(),
    {
      id: "doubanRealtime", title: "豆瓣实时热门", functionName: "loadRealtimeHot",
      type: "video", cacheDuration: 1800,
      params: [
        choiceParam("kind", "榜单", [["书影音", "all"], ["电影榜", "movie"], ["电视榜", "tv"]]),
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
        mediaSubfilter("movieCategory", "电影分类", ["热门", "最新", "豆瓣高分", "冷门佳片"], "movie"),
        mediaSubfilter("movieRegion", "电影地区", ["全部", "华语", "欧美", "韩国", "日本"], "movie"),
        mediaSubfilter("tvRegion", "剧集 / 综艺分类", [
          ["全部剧集", "tv"], ["国产剧", "tv_domestic"], ["欧美剧", "tv_american"],
          ["日剧", "tv_japanese"], ["韩剧", "tv_korean"], ["动画", "tv_animation"],
          ["纪录片", "tv_documentary"], ["全部综艺", "show"], ["国内综艺", "show_domestic"], ["国外综艺", "show_foreign"],
        ], "tv"),
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
        mediaSubfilter("movieGenre", "电影类型", ["", "喜剧", "爱情", "动作", "科幻", "动画", "悬疑", "犯罪", "惊悚", "冒险", "音乐", "历史", "奇幻", "恐怖", "战争", "传记", "歌舞", "武侠", "灾难", "西部", "纪录片", "短片"].map(allChoice), "movie"),
        mediaSubfilter("tvGenre", "剧集 / 综艺类型", tvExploreOptions(), "tv"),
        mediaSubfilter("movieRegion", "电影地区", catalogRegions().map(function (region) { return region === "全部" ? [region, ""] : region; }), "movie"),
        mediaSubfilter("tvRegion", "电视地区", ["", "华语", "欧美", "国外", "韩国", "日本", "中国大陆", "中国香港", "美国", "英国", "泰国", "中国台湾", "意大利", "法国", "德国", "西班牙", "俄罗斯", "瑞典", "巴西", "丹麦", "印度", "加拿大", "爱尔兰", "澳大利亚"].map(allChoice), "tv"),
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

function choiceParam(name, title, options, value) {
  var choices = options.map(function (option) {
    return Array.isArray(option) ? { title: option[0], value: option[1] } : { title: option, value: option };
  });
  return { name: name, title: title, type: "enumeration", value: value == null ? choices[0].value : value, enumOptions: choices };
}

function catalogSubfilter(name, title, options, value) {
  var param = choiceParam(name, title, options, value);
  param.belongTo = { paramName: "category", value: [name] };
  return param;
}

function catalogRegions() {
  return ["全部", "华语", "欧美", "韩国", "日本", "中国大陆", "美国", "中国香港", "中国台湾", "英国", "法国", "德国", "意大利", "西班牙", "印度", "泰国", "俄罗斯", "加拿大", "澳大利亚", "爱尔兰", "瑞典", "巴西", "丹麦"];
}

function allChoice(value) {
  return value === "" ? ["全部", ""] : value;
}

function tvGenreRules() {
  return {
    tv: { format: "电视剧", genres: ["喜剧", "爱情", "悬疑", "动画", "武侠", "古装", "家庭", "犯罪", "科幻", "恐怖", "历史", "战争", "动作", "冒险", "传记", "剧情", "奇幻", "惊悚", "灾难", "歌舞", "音乐"] },
    show: { format: "综艺", genres: ["真人秀", "脱口秀", "音乐", "歌舞"] },
  };
}

function tvExploreOptions() {
  var options = [["全部", ""], ["全部剧集", "电视剧:"], ["全部综艺", "综艺:"]];
  var rules = tvGenreRules();
  Object.keys(rules).forEach(function (kind) {
    var rule = rules[kind];
    rule.genres.forEach(function (genre) { options.push([rule.format + "·" + genre, rule.format + ":" + genre]); });
  });
  return options;
}

function mediaSubfilter(name, title, options, mediaType) {
  // An empty new field preserves a stored pre-1.2.0 filter. Explicit all must be distinct.
  var choices = [["沿用已有筛选", ""]].concat(options.map(function (option) {
    return Array.isArray(option) && option[1] === "" ? [option[0], "__all__"] : option;
  }));
  var param = choiceParam(name, title, choices);
  param.belongTo = { paramName: "mediaType", value: [mediaType] };
  return param;
}

function movieNativeCharts() {
  // First-party category_tabs snapshot, 2026-10-18. No runtime directory dependency.
  return {
    "剧情": {"regions":{},"classic":"film_genre_27"},
    "喜剧": {"regions":{"华语":"ECVUOUD7A","欧洲":"ECPQO4BPA","中国大陆":"ECKIO6SXI","美国":"ECGUO62ZA","中国香港":"ECOYO2QPA","中国台湾":"ECEAOX2BI","日本":"ECFIOT7JA","韩国":"ECOIOVQPY","英国":"EC6IOYROI","法国":"ECIEOY5UI","德国":"ECFQO5B4A","意大利":"ECREOTSEI","西班牙":"EC6UO37NQ","瑞典":"ECPMPBHBI","印度":"ECTIOYBOY","泰国":"ECAIO3EWI","加拿大":"ECYUPAHZY","澳大利亚":"ECKMOXL6Q","爱尔兰":"ECOAOZY7Y"},"recent":"ECAYN54KI","classic":"movie_comedy","underrated":"ECLYOFOKA"},
    "爱情": {"regions":{"华语":"ECOIOTUGY","欧洲":"ECUAOYUCA","中国大陆":"EC64OQVEQ","美国":"EC4EOSAQA","中国台湾":"ECWQOQO4A","日本":"ECKMOVF3Y","韩国":"ECHIOXXIQ","英国":"ECHAO4AAQ","法国":"ECTAOT7GQ","德国":"ECNIOS7EQ","意大利":"EC3UOSWUY","西班牙":"ECU4OWMMI","瑞典":"ECCEOUVAA","印度":"ECLUOQWVY","泰国":"ECYQO7YPQ","加拿大":"ECEAOXFIQ","澳大利亚":"ECOUOXYUA","爱尔兰":"ECJMO2O5Y"},"recent":"ECSAOJFTA","classic":"movie_love","underrated":"EC2UOKRRQ"},
    "动作": {"regions":{"华语":"EC2YO2M2A","欧洲":"ECHUOXOUA","美国":"ECPMPC7JA","中国台湾":"ECTMO64KY","日本":"ECBAPBW2Y","韩国":"ECWQOU2HI","英国":"ECCUPDBHQ","法国":"EC5UOWEFY","德国":"EC7AOW57Q","印度":"ECMQO4F2I","加拿大":"ECUQPDN7Y","澳大利亚":"EC4QPALEI"},"recent":"ECBUOLQGY","classic":"movie_action","underrated":"ECVIOHY6A"},
    "科幻": {"regions":{"欧洲":"ECX4O7JAA","美国":"ECDAO6XZI","日本":"ECSYOV6GY","英国":"EC4UOZQ4Y","法国":"EC3MO34NI","德国":"ECOUO2ETY","加拿大":"ECX4PAGTA","澳大利亚":"ECTAOXLWQ"},"recent":"ECZYOJPLI","classic":"movie_scifi","underrated":"EC2IOENJA"},
    "动画": {"regions":{"华语":"ECFMOYMKA","欧洲":"ECLYO57HA","美国":"EC4IPDWYI","日本":"ECLYO6JQQ","英国":"ECWUO3RJA","法国":"ECIQPF7NY","加拿大":"EC3YPB7WQ"},"recent":"EC3UOBDQY","classic":"film_genre_31","underrated":"ECTUO3I3A"},
    "悬疑": {"regions":{"华语":"ECRMOX2JI","欧洲":"ECUMPB7SA","美国":"ECJUO3L7I","中国香港":"ECV4OU2WA","日本":"ECVYOVDIA","韩国":"ECSYOYZWI","英国":"EC5YPE3OI","法国":"ECQUO7FVQ","德国":"ECZQO7KSQ","意大利":"ECVEO7MPI","西班牙":"ECAYOVXFA","加拿大":"ECYMPDCTI","澳大利亚":"ECIMOWR2I"},"recent":"ECPQOJP5Q","classic":"film_genre_32","underrated":"ECK4OEBJY"},
    "犯罪": {"regions":{"华语":"ECVUO4O4Q","欧洲":"EC5QO2HUI","中国大陆":"ECWAPHUIA","美国":"ECEAPADKY","中国香港":"EC3AOZZUY","日本":"ECVUO43DY","韩国":"ECGYO2SPA","英国":"ECVYOZNAI","法国":"ECFEPCR2A","德国":"ECVAPBWRI","意大利":"ECRMO4X7I","西班牙":"ECPAPDKZA","加拿大":"EC2MPBOOI","澳大利亚":"ECEMOZ6DI"},"recent":"ECLAN6LHQ","classic":"film_genre_46","underrated":"EC7EOG3RI"},
    "惊悚": {"regions":{"华语":"EC5MPCA7Y","欧洲":"ECTMPCZTY","美国":"ECSYO3JKQ","日本":"ECFUO25PI","韩国":"ECTMPDECI","英国":"ECU4O6QYQ","法国":"ECPMPHOMI","德国":"ECJIPH4JA","意大利":"EC2QPBTHY","西班牙":"ECLMPAEZY","瑞典":"ECMIPBWCY","印度":"ECRQPBSYI","加拿大":"ECZMPDHQI","澳大利亚":"EC7QPFMYA"},"recent":"ECBUOL2DA","classic":"film_genre_33","underrated":"ECY4ODRSY"},
    "冒险": {"regions":{"华语":"ECAUOWGNQ","欧洲":"ECW4O3GHY","美国":"ECOMON43Q","日本":"ECOUOVT2Q","英国":"ECFUORHLY","法国":"EC5YO53DI","德国":"ECMYOXC2Y","加拿大":"ECRYO5ULY","澳大利亚":"ECFIOR3MY"},"recent":"ECDYOE7WY","classic":"film_genre_49","underrated":"ECEMN5MLA"},
    "家庭": {"regions":{},"classic":"film_genre_41"},
    "儿童": {"regions":{},"classic":"film_genre_42"},
    "音乐": {"regions":{"欧洲":"ECAQO25QI","美国":"ECUAOV5NA","日本":"ECFYORPYQ","英国":"ECAQO3LYY","法国":"ECYAORESI"},"classic":"film_genre_39","underrated":"EC2UOKJFQ"},
    "历史": {"regions":{"华语":"ECV4N7YWY","欧洲":"ECIAOE4OY","美国":"ECK4OGBSA","中国香港":"ECPYOEZNY","日本":"EC54OCODY","韩国":"ECMAOINLA","英国":"ECSEOEISY","法国":"ECUMONVJQ","德国":"ECNQODGKI","意大利":"ECL4OLRCY"},"classic":"film_genre_44","underrated":"ECBAOKDHQ"},
    "奇幻": {"regions":{"华语":"EC5MOJAZY","欧洲":"ECUMOLXQY","美国":"ECVIOIPDI","中国香港":"ECUUOJIFA","日本":"ECEIOJZTQ","韩国":"ECDAOLOSI","英国":"ECRAOGHZY","法国":"EC6QOILRA","德国":"EC4YOCBLQ"},"classic":"film_genre_48","underrated":"ECCMOLZQA"},
    "恐怖": {"regions":{"华语":"EC54OE5HA","欧洲":"ECFAOK5WQ","美国":"ECGMORRUY","日本":"EC6QOMMWY","韩国":"ECFEOMHIQ","英国":"ECFUOGJDQ","法国":"ECHIOLPXA","西班牙":"ECWUOILKA","泰国":"EC2AOMMKY","加拿大":"ECVYODZIA","澳大利亚":"ECFYOIWBQ"},"recent":"ECV4N4FBI","classic":"film_genre_34","underrated":"ECTMOHSQY"},
    "战争": {"regions":{"华语":"ECWUOKOLY","欧洲":"ECUIOKO6I","美国":"ECDYONLLI","中国香港":"ECO4OUYWI","日本":"ECFYOK3AQ","韩国":"EC2UOS6AQ","英国":"ECVIOP57A","法国":"EC6UOQ3TY","德国":"ECV4OGCIA","意大利":"ECYUOU5TA","俄罗斯":"ECF4OMYDQ"},"recent":"EC6MOCTVQ","classic":"film_genre_45","underrated":"ECGEOIWRA"},
    "传记": {"regions":{"华语":"ECVYOEEUA","欧洲":"ECZIOQ6LY","美国":"ECE4OHQQY","英国":"ECNMONJTQ","法国":"ECYIOK3PY","德国":"ECAYOFADY","意大利":"ECLEOKFFQ","加拿大":"ECCUOUMXQ"},"recent":"EC3EOHEYY","classic":"film_genre_43","underrated":"ECRAODXXI"},
    "歌舞": {"regions":{"欧洲":"EC3QOS5MA","美国":"ECYQOXMSA"},"classic":"film_genre_40","underrated":"ECZMOHQ3Q"},
    "武侠": {"regions":{"华语":"ECEAOOAHI","中国大陆":"EC6YOLGQQ"},"classic":"film_genre_50","underrated":"ECWAOLLZQ"},
    "情色": {"regions":{"华语":"ECKQOVFTY","欧洲":"ECVUONKTI","美国":"ECTQOQ6XQ","日本":"ECLUOK4TA","韩国":"ECDMOZMVI","英国":"ECA4OSUNA","法国":"ECDAOW2PY","意大利":"ECM4OVMRY"},"classic":"film_genre_37","underrated":"ECGYN6NHI"},
    "灾难": {"regions":{"欧洲":"EC5IOQ75I","美国":"EC4IOWGKA"},"classic":"natural_disasters","underrated":"ECHMOGZLQ"},
    "西部": {"regions":{"欧洲":"ECM4OWDGI","美国":"ECU4ORYVI"},"classic":"film_genre_47"},
    "古装": {"regions":{},"classic":"film_genre_51"},
    "运动": {"regions":{},"classic":"ECCEPGM4Y"},
    "短片": {"regions":{},"classic":"film_genre_36"}
  };
}

function movieYearlyCharts() {
  return {
    "2025": {"华语":"ECE472UNY","外语":"ECB5AE5EQ","冷门佳片":"ECFM7Z3AA","日本":"ECNI724YA","韩国":"EC45ABN2Y","喜剧":"ECANAAAGY","爱情":"ECM5AC2HQ","恐怖":"ECNA72CVA","动画":"ECKU74SFA","纪录":"ECDBAETMY"},
    "2024": {"华语":"ECBE7RX5A","外语":"ECBQ7RNSA","冷门佳片":"ECSE7P7GQ","日本":"ECRY73E2Q","韩国":"ECBM7NLJA","喜剧":"ECLE7RV6Y","爱情":"ECHU7QOYQ","恐怖":"ECKY7RPLQ","动画":"ECZA7V7AA","纪录":"ECS47YXRQ"},
    "2023": {"华语":"ECQ46F7XI","外语":"ECFA6FLWQ","冷门佳片":"ECMY6GCCA","日本":"ECCU6MRTY","韩国":"EC4Y6ALRA","喜剧":"ECCI6H3TA","爱情":"EC3A56FJA","恐怖":"ECYI6DWVQ","动画":"ECHU6BXBI","纪录":"ECRM6A2JA"},
    "2022": {"华语":"ECKA55LSA","外语":"ECQU6DFQA","冷门佳片":"ECSQ6DBYA","日本":"ECEA6ANKY","韩国":"ECHM6DG7Y","喜剧":"EC4Y54ORI","爱情":"ECYU6IHKI","恐怖":"ECRI53OUQ","动画":"EC4M6ACVQ","纪录":"ECGY527GY"},
    "2021": {"华语":"ECWY6B2GQ","外语":"ECNE54UQI","冷门佳片":"ECRA53WMI","喜剧":"ECJM6BMEA","爱情":"EC6A575FI","恐怖":"ECBM5YQVA","动画":"ECOY6BCBI","纪录":"ECLY57EVQ"},
    "2020": {"华语":"EC2A5MRIY","外语":"ECIU5HIEQ","冷门佳片":"ECGY5FDUA","日本":"ECCA5MMHI","韩国":"EC3A5GQ5A","喜剧":"ECM45Q7VI","爱情":"ECBA5UC6Q","恐怖":"EC7U5TVBY","动画":"ECMY5PBHI","纪录":"EC4Q5SGKQ"},
    "2019": {"华语":"ECFYHQBWQ","外语":"ECFQHXCTQ","冷门佳片":"ECOUHS3TY","喜剧":"ECBU6ENLI","爱情":"ECSY52PSI","动画":"EC7E57OPQ","纪录":"ECYQ6G4WI"},
    "2018": {"华语":"2018_movie_1","外语":"2018_movie_0","冷门佳片":"2018_movie_14","日本":"2018_movie_5","韩国":"2018_movie_4","喜剧":"2018_movie_16","爱情":"2018_movie_17","恐怖":"2018_movie_19","动画":"2018_movie_20","纪录":"2018_movie_21"},
    "2017": {"华语":"2017_movie_chinese_score","外语":"2017_movie_foreign_score","冷门佳片":"2017_movie_dark_horse","日本":"2017_movie_696","韩国":"2017_movie_695","喜剧":"2017_movie_699","爱情":"2017_movie_700","恐怖":"2017_movie_702","纪录":"2017_movie_686"},
    "2016": {"华语":"2016_movie_451","外语":"2016_movie_272","冷门佳片":"2016_movie_456","日本":"2016_movie_459","韩国":"2016_movie_458","喜剧":"2016_movie_465","爱情":"2016_movie_466","恐怖":"2016_movie_468","动画":"2016_movie_469","纪录":"2016_movie_470"},
    "2015": {"华语":"2015_movie_3","外语":"2015_movie_2","冷门佳片":"2015_movie_43","日本":"2015_movie_45","韩国":"2015_movie_44","动画":"2015_movie_54","纪录":"2015_movie_55"},
    "2014": {"华语":"2014_movie_2","外语":"2014_movie_1","冷门佳片":"2014_movie_5","日本":"2014_movie_7","韩国":"2014_movie_6","动画":"2014_movie_9","纪录":"2014_movie_10"}
  };
}

function nativeMovieOptions(category) {
  var charts = movieNativeCharts();
  var options = [];
  Object.keys(charts).forEach(function (genre) {
    var group = charts[genre];
    if (category === "region") {
      Object.keys(group.regions).forEach(function (region) {
        options.push([region + "·" + genre, "native:" + group.regions[region]]);
      });
    } else if (group[category]) options.push([genre, "native:" + group[category]]);
  });
  return options;
}

function nativeYearlyOptions(charts) {
  var options = [];
  Object.keys(charts).sort().reverse().forEach(function (year) {
    Object.keys(charts[year]).forEach(function (name) {
      options.push([year + "·" + name, "native:" + charts[year][name]]);
    });
  });
  return options;
}

function movieCatalogModule() {
  var recent = nativeMovieOptions("recent");
  [["热门筛选", "hot"], ["最新筛选", "new"]].forEach(function (category) {
    ["全部", "华语", "欧美", "韩国", "日本"].forEach(function (region) {
      recent.push([category[0] + "·" + region, category[1] + ":" + region]);
    });
  });
  recent.push(["院线热映", "showing"], ["实时电影榜", "realtime"]);
  return {
    id: "doubanMovies", title: "豆瓣电影", functionName: "loadMovieCatalog", type: "video", cacheDuration: 21600,
    params: [
      choiceParam("category", "分类", [["全部", "all"], ["近期热门", "recent"], ["高分经典", "classic"], ["冷门佳作", "underrated"], ["地区佳作", "region"], ["分类题材", "genre"], ["年度榜单", "yearly"]]),
      catalogSubfilter("recent", "近期热门", recent, "hot:全部"),
      catalogSubfilter("classic", "高分经典", [["豆瓣 Top 250", "top250"]].concat(nativeMovieOptions("classic"))),
      catalogSubfilter("underrated", "冷门佳作", nativeMovieOptions("underrated")),
      catalogSubfilter("region", "地区 · 题材原生榜", nativeMovieOptions("region")),
      catalogSubfilter("genre", "题材高分经典", nativeMovieOptions("classic")),
      catalogSubfilter("yearly", "年度 · 分类", nativeYearlyOptions(movieYearlyCharts())),
      Object.assign(catalogSortParam(), { belongTo: { paramName: "category", value: ["all"] }, description: "仅用于全部；原生榜单保留豆瓣顺序" }),
      { name: "page", title: "页码", type: "page" },
    ],
  };
}

async function fetchSubjectCollectionItems(id, start, count) {
  var url = "https://m.douban.com/rexxar/api/v2/subject_collection/" + encodeURIComponent(id) +
    "/items?start=" + start + "&count=" + count + "&items_only=1&for_mobile=1";
  return responseList(await Widget.http.get(url, { headers: DOUBAN_HEADERS }), "subject_collection_items");
}

async function loadNativeCollection(id, mediaType, page) {
  return mapSubjects(await fetchSubjectCollectionItems(id, (page - 1) * 20, 20), mediaType);
}

function tvYearlyCharts() {
  return {
    "2025": {"华语剧集":"EC2FACYKQ","英美新剧":"ECHNAB4LY","英美续订":"ECWQ7ZJGY","日本剧集":"ECPNAHZ2A","韩国剧集":"EC7VAFY4Q","综艺":"EC647Z33A","动画":"ECQM7YUOQ","纪录":"ECIM7ZJCI","微短剧":"EC2RAB7MY"},
    "2024": {"华语剧集":"ECYA7RAZQ","英美新剧":"EC5U7O7WY","英美续订":"ECOY7WR4I","日本剧集":"ECRE7PJSQ","韩国剧集":"ECMM7RKRA","综艺":"ECTE7TV3Y","动画":"ECHQ7SAPY","纪录":"ECDM74KXY"},
    "2023": {"华语剧集":"ECTE6EOZA","英美新剧":"ECUI6CVAI","英美续订":"ECM46I42A","日本剧集":"ECPE6B6NI","韩国剧集":"EC246FT6Y","综艺":"EC7I6GR6A","动画":"EC3Q6JTOQ","纪录":"ECCU6NNCI"},
    "2022": {"华语剧集":"ECWU56XUI","英美新剧":"ECQY6HRQQ","英美续订":"ECMU6H5VY","日本剧集":"ECRY6I6FA","韩国剧集":"EC2Y6BEGQ","综艺":"EC4U6BXLA","动画":"ECRI533KQ","纪录":"ECR455GTQ"},
    "2021": {"华语剧集":"ECOY56I6Y","英美新剧":"EC5U5X5FA","英美续订":"ECEI6A5ZI","日本剧集":"ECZQ6AD6Y","韩国剧集":"ECNI5ZBSQ","动画":"ECGA6CUPA","纪录":"ECPY52QZY"},
    "2020": {"华语剧集":"ECCM5TXSI","英美新剧":"ECSA5PTFI","英美续订":"ECZU5SJAI","日本剧集":"ECBI5KPKY","韩国剧集":"ECJM5OL6Y"},
    "2019": {"华语剧集":"ECR4HOW3I","英美新剧":"ECS4HX5JI","英美续订":"ECS4HX6GQ","日本剧集":"EC2AHUXEA","韩国剧集":"ECR4HO7JA"},
    "2018": {"华语剧集":"2018_tv_23","英美新剧":"2018_tv_24","英美续订":"2018_tv_25","日本剧集":"2018_tv_26","韩国剧集":"2018_tv_27","动画":"2018_tv_28","纪录":"2018_tv_29"},
    "2017": {"华语剧集":"2017_tv_domestic_score","英美新剧":"2017_tv_american_score","英美续订":"2017_tv_743","日本剧集":"2017_tv_740","韩国剧集":"2017_tv_741","动画":"2017_tv_706","纪录":"2017_tv_707"},
    "2016": {"华语剧集":"2016_tv_478","英美新剧":"2016_tv_472","英美续订":"2016_tv_474","日本剧集":"2016_tv_482","韩国剧集":"2016_tv_481","动画":"2016_tv_486","纪录":"2016_tv_487"},
    "2015": {"华语剧集":"2015_tv_6","英美新剧":"2015_tv_7","英美续订":"2015_tv_13","日本剧集":"2015_tv_14","韩国剧集":"2015_tv_15","动画":"2015_tv_60"},
    "2014": {"华语剧集":"2014_tv_14","英美新剧":"2014_tv_13","英美续订":"2014_tv_12","日本剧集":"2014_tv_16","韩国剧集":"2014_tv_15"}
  };
}

function tvCatalogModule() {
  return {
    id: "doubanTelevision", title: "豆瓣电视", functionName: "loadTvCatalog", type: "video", cacheDuration: 21600,
    params: [
      choiceParam("category", "分类", [["全部", "all"], ["高分经典", "classic"], ["近期热门", "recent"], ["冷门佳作", "underrated"], ["分类题材", "genre"], ["年度榜单", "yearly"]]),
      catalogSubfilter("classic", "原生高分经典榜", nativeTvRegions("classic")),
      catalogSubfilter("recent", "近期热门", nativeTvRegions("recent").map(function (region) { return [region, "native:" + tvNativeCharts()[region].recent]; }).concat([["全部剧集筛选", "tv"], ["国产剧筛选", "tv_domestic"], ["欧美剧筛选", "tv_american"], ["日剧筛选", "tv_japanese"], ["韩剧筛选", "tv_korean"], ["动画", "tv_animation"], ["纪录片", "tv_documentary"], ["全部综艺", "show"], ["国内综艺", "show_domestic"], ["国外综艺", "show_foreign"]]), "tv"),
      catalogSubfilter("underrated", "原生冷门佳作榜", nativeTvRegions("underrated")),
      catalogSubfilter("genre", "原生地区题材榜", nativeTvGenreOptions()),
      catalogSubfilter("yearly", "年度 · 分类", nativeYearlyOptions(tvYearlyCharts())),
      Object.assign(catalogSortParam(), { belongTo: { paramName: "category", value: ["all"] }, description: "仅用于全部；原生榜单保留豆瓣顺序" }),
      { name: "page", title: "页码", type: "page" },
    ],
  };
}

function tvNativeCharts() {
  // Snapshot of Douban category_tabs, 2026-10-18. Kept inline for a standalone widget.
  return {
  "大陆剧": {
    "genres": {
      "喜剧": "ECVQ47BUI",
      "爱情": "ECZM5H55I",
      "悬疑": "ECIU5AZDA",
      "家庭": "ECJU5D3PY",
      "古装": "ECTU453WI",
      "犯罪": "EC4Q5JNKI",
      "历史": "ECN45K75A"
    },
    "recent": "EC74443FY",
    "classic": "ECT45KVZI",
    "underrated": "ECRI46YZQ"
  },
  "美剧": {
    "genres": {
      "喜剧": "ECX45ISGQ",
      "爱情": "ECA45D3RQ",
      "悬疑": "ECKI5JNJI",
      "动作": "ECME44L4Y",
      "科幻": "ECL45GQ4I",
      "犯罪": "EC2Y5CTPA",
      "惊悚": "ECMM5ALJQ",
      "奇幻": "ECHU473PI",
      "恐怖": "ECRE46B7Y"
    },
    "recent": "ECFA5DI7Q",
    "classic": "ECVACWVGI",
    "underrated": "ECGI5HUQI"
  },
  "英剧": {
    "genres": {
      "喜剧": "ECZE5BCZA",
      "悬疑": "ECTM5HMAI",
      "犯罪": "EC5I5EOCQ"
    },
    "classic": "ECVACXBWI",
    "underrated": "ECEM4373Q"
  },
  "日剧": {
    "genres": {
      "喜剧": "ECWM5LNJI",
      "爱情": "ECEA5D2RQ",
      "悬疑": "ECHI5FDTQ"
    },
    "recent": "ECNA46YBA",
    "classic": "ECBQCUATA",
    "underrated": "ECEA5DW5Q"
  },
  "韩剧": {
    "genres": {
      "喜剧": "ECS45ISKI",
      "爱情": "ECOU5ECZQ"
    },
    "recent": "ECBE5CBEI",
    "classic": "EC6EC5GBQ",
    "underrated": "ECZY5IDOY"
  },
  "港剧": {
    "genres": {
      "喜剧": "ECXI5EIII",
      "爱情": "EC3Y5ISIQ",
      "古装": "ECIE5FVTI",
      "犯罪": "EC3A46RGQ"
    },
    "classic": "ECVM47WUA",
    "underrated": "EC3U5ASKQ"
  },
  "台剧": {
    "genres": {
      "爱情": "ECBU5LX3A"
    },
    "classic": "ECBI5EL6A",
    "underrated": "ECJQ5LAFY"
  },
  "泰剧": {
    "genres": {},
    "underrated": "EC2Y5FJTY"
  },
  "欧洲剧": {
    "genres": {
      "喜剧": "ECJQ5LPXY",
      "爱情": "ECSA5KEKY",
      "悬疑": "ECEU47F2I",
      "犯罪": "ECGM5NIQA"
    },
    "recent": "EC6I5FYHA",
    "classic": "ECZY5KBOQ",
    "underrated": "ECTM5JVYA"
  },
  "动画剧集": {
    "genres": {},
    "classic": "ECR4CRXHA"
  }
};
}

function nativeTvRegions(category) {
  var charts = tvNativeCharts();
  return Object.keys(charts).filter(function (region) { return charts[region][category]; });
}

function nativeTvGenreOptions() {
  var charts = tvNativeCharts();
  var options = [];
  Object.keys(charts).forEach(function (region) {
    Object.keys(charts[region].genres).forEach(function (genre) {
      options.push([region + "·" + genre, "native:" + charts[region].genres[genre]]);
    });
  });
  return options;
}

async function loadNativeTvChart(category, selection, page) {
  var charts = tvNativeCharts();
  var legacyRegions = {
    "全部": nativeTvRegions(category), "华语": ["大陆剧", "港剧", "台剧"],
    "欧美": ["美剧", "英剧", "欧洲剧"], "国外": ["美剧", "英剧", "欧洲剧", "日剧", "韩剧"],
    "美国": ["美剧"], "中国大陆": ["大陆剧"], "日本": ["日剧"], "韩国": ["韩剧"],
    "英国": ["英剧"], "中国香港": ["港剧"], "中国台湾": ["台剧"],
  };
  var regions = charts[selection] ? [selection] : legacyRegions[selection];
  if (regions) regions = regions.filter(function (region) { return charts[region] && charts[region][category]; });
  if (!regions || !regions.length) throw new Error("该地区暂无原生榜单，请重新选择电视榜单地区");
  var pages = await Promise.all(regions.map(function (region) {
    return fetchSubjectCollectionItems(charts[region][category], (page - 1) * 20, 20);
  }));
  return mapSubjects([].concat.apply([], pages), "tv");
}

function catalogSortParam() {
  var param = choiceParam("sort", "筛选结果排序", [["综合排序", "T"], ["近期热度", "U"], ["首映 / 首播时间", "R"], ["高分优先", "S"]]);
  param.description = "适用于全部、地区佳作、分类题材；固定榜单保留豆瓣原顺序";
  return param;
}

function selectedCatalogValue(module, name, value) {
  var param = module.params.find(function (item) { return item.name === name; });
  var selected = value == null || value === "" ? param.value : String(value);
  if (!param.enumOptions.some(function (option) { return option.value === selected; })) throw new Error("不支持的" + param.title);
  return selected;
}

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

function responseList(response, field) {
  var data = responseData(response);
  var items = field ? data && data[field] : data;
  if (!Array.isArray(items)) throw new Error("豆瓣响应结构错误: " + (field || "root") + " 必须是数组");
  return items;
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
  var declaredType = subject.type || subject.kind;
  var type = normalizeMediaType(declaredType, fallbackType);
  var kind = declaredType === "book" || declaredType === "music" ? declaredType : type;
  var ratingValue = subject.rating && typeof subject.rating === "object" ? subject.rating.value : subject.rating;
  return {
    id: id == null ? "" : String(id),
    title: String(subject.title || subject.name || "").trim(),
    originalTitle: String(subject.original_title || subject.originalTitle || "").trim(),
    aliases: Array.isArray(subject.aka) ? subject.aka : subject.aliases || [],
    type: type,
    kind: kind,
    year: yearFromValue(subject.year || subject.card_subtitle || subject.info),
    rating: Number(ratingValue != null ? ratingValue : subject.rate) || undefined,
    description: subject.intro || subject.info || subject.description || subject.card_subtitle || "",
    posterPath: subject.posterPath || subject.cover_url || (typeof subject.cover === "string" ? subject.cover : subject.cover && subject.cover.url) ||
      subject.pic && subject.pic.normal || undefined,
    genres: subject.genres || [],
    actors: subject.actors || [],
    directors: subject.directors || [],
    authors: subject.author || subject.authors || [],
    releaseDate: subject.releaseDate || (Array.isArray(subject.release_date) ? subject.release_date[0] : subject.release_date),
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
  var aliases = (subject.aliases || []).map(normalizeIdentityTitle);
  return {
    any: Boolean(subjectMain && (subjectMain === candidateMain || subjectMain === candidateOriginal)) ||
      Boolean(subjectOriginal && (subjectOriginal === candidateMain || subjectOriginal === candidateOriginal)) ||
      aliases.some(function (alias) { return alias && (alias === candidateMain || alias === candidateOriginal); }),
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
    type: "url",
    link: "https://m.douban.com/" + subject.kind + "/" + encodeURIComponent(subject.id),
    title: subject.title,
    originalTitle: subject.originalTitle,
    mediaType: subject.type || undefined,
    rating: subject.rating,
    description: subject.description,
    posterPath: subject.posterPath,
    coverUrl: subject.posterPath,
    releaseDate: subject.releaseDate,
    year: subject.year ? String(subject.year) : undefined,
    genreItems: (subject.genres || []).map(function (genre) { return { id: genre, title: genre }; }),
    peoples: detailPeople(subject),
  };
}

function detailPeople(subject) {
  var people = [];
  [[subject.actors, "演员"], [subject.directors, "导演"], [subject.authors, "作者"]].forEach(function (group) {
    (Array.isArray(group[0]) ? group[0] : []).forEach(function (person) {
      var title = typeof person === "string" ? person : person.name || person.title;
      if (title) people.push({ title: title, role: group[1], avatar: typeof person === "object" ? person.avatar && (person.avatar.normal || person.avatar) : undefined });
    });
  });
  return people;
}

var DOUBAN_DETAIL_MEMORY = new Map();
var TMDB_ACTIVE_REQUESTS = 0;
var TMDB_REQUEST_WAITERS = [];

async function tmdbGet(api, options) {
  if (TMDB_ACTIVE_REQUESTS < 4) TMDB_ACTIVE_REQUESTS += 1;
  else await new Promise(function (resolve) { TMDB_REQUEST_WAITERS.push(resolve); });
  try {
    return await Widget.tmdb.get(api, options);
  } finally {
    if (TMDB_REQUEST_WAITERS.length) TMDB_REQUEST_WAITERS.shift()();
    else TMDB_ACTIVE_REQUESTS -= 1;
  }
}

function rememberDetail(key, entry) {
  DOUBAN_DETAIL_MEMORY.delete(key);
  DOUBAN_DETAIL_MEMORY.set(key, entry);
  while (DOUBAN_DETAIL_MEMORY.size > 128) DOUBAN_DETAIL_MEMORY.delete(DOUBAN_DETAIL_MEMORY.keys().next().value);
}

async function readSubjectDetail(subject, persistent) {
  var key = "douban_detail_v2:" + subject.kind + ":" + subject.id;
  var cached = DOUBAN_DETAIL_MEMORY.get(key);
  if (cached && cached.expiresAt <= Date.now()) {
    DOUBAN_DETAIL_MEMORY.delete(key);
    cached = null;
  }
  if (!cached && persistent && Widget.storage && typeof Widget.storage.get === "function") {
    try {
      cached = await Widget.storage.get(key);
      if (typeof cached === "string") cached = JSON.parse(cached);
    } catch (error) { cached = null; }
  }
  if (cached && cached.expiresAt > Date.now()) {
    rememberDetail(key, cached);
    return cached.subject;
  }
  var response = await Widget.http.get("https://m.douban.com/rexxar/api/v2/" + subject.kind + "/" + encodeURIComponent(subject.id), { headers: DOUBAN_HEADERS });
  var data = responseData(response);
  if (String(data.id) !== subject.id || !data.title) throw new Error("豆瓣详情身份不匹配");
  var detail = normalizeDoubanSubject(data, subject.type);
  if (detail.kind !== subject.kind) throw new Error("豆瓣详情类型不匹配");
  var entry = { subject: detail, expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
  rememberDetail(key, entry);
  if (persistent && Widget.storage && typeof Widget.storage.set === "function") {
    try { await Widget.storage.set(key, entry); } catch (error) { /* A cache failure must not hide the detail. */ }
  }
  return detail;
}

async function loadDetail(link) {
  var match = String(link || "").match(/^https:\/\/m\.douban\.com\/(movie|tv|book|music)\/(\d+)\/?$/);
  if (!match) throw new Error("仅支持本模块的豆瓣详情链接");
  var detail = await readSubjectDetail({ id: match[2], kind: match[1], type: normalizeMediaType(match[1]) }, true);
  return doubanFallbackItem(detail);
}

function tmdbVideoItem(subject, candidate) {
  var mediaType = subject.type;
  var season = seasonIdentity(subject);
  var matchedSeason = candidate.matchedSeason;
  if ((season || matchedSeason) && (!matchedSeason || !Number.isInteger(matchedSeason.number) || matchedSeason.number < 1 ||
    !yearFromValue(matchedSeason.airDate) || (season && matchedSeason.number !== season.number))) {
    return doubanFallbackItem(subject);
  }
  var releaseDate = matchedSeason ? matchedSeason.airDate : mediaType === "movie" ? candidate.release_date : candidate.first_air_date;
  return {
    id: Number(candidate.id),
    tmdbId: candidate.id,
    type: "tmdb",
    mediaType: mediaType,
    title: matchedSeason ? matchedSeason.title || subject.title : candidate.title || candidate.name || subject.title,
    season: matchedSeason ? matchedSeason.number : undefined,
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
    "douban_tmdb_v3",
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
  var ttl = candidate ? 30 * 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
  try {
    await Widget.storage.set(mappingCacheKey(subject), {
      candidate: candidate || null,
      expiresAt: Date.now() + ttl,
    });
  } catch (error) {
    // Cache failures must not hide a valid list item.
  }
}

function seasonIdentity(subject) {
  if (subject.type !== "tv") return null;
  var number = null;
  var bases = [];
  [subject.title, subject.originalTitle].forEach(function (title) {
    var match = String(title || "").match(/\s*(?:第\s*([\d一二三四五六七八九十两]+)\s*季|season\s*(\d+)|s(\d{1,2}))\s*$/i);
    if (!match) return;
    var raw = match[1] || match[2] || match[3];
    var digits = { "一": 1, "二": 2, "两": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9 };
    var parsed = /^\d+$/.test(raw) ? Number(raw) : raw.indexOf("十") >= 0 ? (digits[raw.split("十")[0]] || 1) * 10 + (digits[raw.split("十")[1]] || 0) : digits[raw];
    if (!parsed || number && number !== parsed) { number = -1; return; }
    number = parsed;
    bases.push(String(title).slice(0, match.index).trim());
  });
  return number ? { number: number, bases: bases } : null;
}

async function selectSeasonCandidate(subject, candidates) {
  var season = seasonIdentity(subject);
  if (!season || season.number < 1 || !subject.year) return null;
  var matches = [];
  var eligible = candidates.filter(function (candidate) {
    if (normalizeMediaType(candidate.media_type, subject.type) !== "tv") return false;
    var names = [candidate.name, candidate.original_name].map(normalizeIdentityTitle);
    return season.bases.some(function (base) { return names.indexOf(normalizeIdentityTitle(base)) >= 0; });
  });
  // Avoid an unbounded number of detail requests for an ambiguous generic series name.
  if (eligible.length > 4) return null;
  var results = await Promise.all(eligible.map(async function (candidate) {
    try {
      return { candidate: candidate, detail: responseData(await tmdbGet("tv/" + candidate.id, { params: { language: "zh-CN" } })) };
    } catch (error) { return { failed: true }; }
  }));
  // An unavailable candidate cannot be ruled out, so do not infer uniqueness.
  if (results.some(function (result) { return result.failed; })) return null;
  for (var index = 0; index < results.length; index += 1) {
    var candidate = results[index].candidate;
    var detail = results[index].detail;
    if (detail.id != null && String(detail.id) !== String(candidate.id)) continue;
    var seasons = (detail.seasons || []).filter(function (item) {
      return Number(item.season_number) === season.number && yearFromValue(item.air_date) === subject.year;
    });
    if (seasons.length === 1) matches.push(Object.assign({}, candidate, {
      matchedSeason: { number: season.number, airDate: seasons[0].air_date, title: subject.title },
    }));
  }
  return matches.length === 1 ? matches[0] : null;
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
    var original = subject;
    var candidates = [];
    var seen = Object.create(null);
    async function search(query) {
      var data = responseData(await tmdbGet("search/" + subject.type, { params: { query: query, language: "zh-CN" } }));
      return data.results || [];
    }
    function appendCandidates(results) {
      results.forEach(function (candidate) {
        var id = String(candidate.id);
        if (!seen[id]) { seen[id] = true; candidates.push(candidate); }
      });
    }
    appendCandidates(await search(subject.title));
    var season = seasonIdentity(subject);
    var candidate = season ? null : selectStrictTmdbCandidate(subject, candidates);
    var enriched = false;
    if (!candidate) {
      try { subject = await readSubjectDetail(subject, useCache !== false); enriched = true; } catch (error) { /* Keep original metadata when enrichment is unavailable. */ }
      season = seasonIdentity(subject);
      var queries = [subject.originalTitle].concat(season ? season.bases.slice().reverse() : [], subject.aliases || []);
      var queryKeys = [normalizeIdentityTitle(subject.title)];
      var extraQueries = [];
      for (var index = 0; index < queries.length && queryKeys.length < 6; index += 1) {
        var query = String(queries[index] || "").trim();
        var key = normalizeIdentityTitle(query);
        if (!key || queryKeys.indexOf(key) >= 0) continue;
        queryKeys.push(key);
        extraQueries.push(query);
      }
      var searchResults = await Promise.all(extraQueries.map(search));
      searchResults.forEach(appendCandidates);
      candidate = season ? await selectSeasonCandidate(subject, candidates) : selectStrictTmdbCandidate(subject, candidates);
    }
    if (useCache !== false && (candidate || enriched)) await writeMappingCache(original, candidate);
    return candidate ? tmdbVideoItem(subject, candidate) : doubanFallbackItem(subject);
  } catch (error) {
    return doubanFallbackItem(subject);
  }
}

async function mapSubjects(rawItems, fallbackType, useCache) {
  var sourceSeen = Object.create(null);
  var subjects = rawItems.filter(function (raw) {
    return raw && raw.type !== "ad" && (!raw.card || raw.card === "subject");
  }).map(function (raw) { return normalizeDoubanSubject(raw, fallbackType); }).filter(function (subject) {
    if (!subject.id || !subject.title || ["movie", "tv", "book", "music"].indexOf(subject.kind) < 0) return false;
    var key = subject.kind + ":" + subject.id;
    if (sourceSeen[key]) return false;
    sourceSeen[key] = true;
    return true;
  });
  var results = new Array(subjects.length);
  var nextIndex = 0;
  async function worker() {
    while (true) {
      var index = nextIndex;
      nextIndex += 1;
      if (index >= subjects.length) return;
      results[index] = await mapSubjectToVideo(subjects[index], useCache);
    }
  }
  var workers = [];
  var workerCount = Math.min(4, subjects.length);
  for (var workerIndex = 0; workerIndex < workerCount; workerIndex += 1) workers.push(worker());
  await Promise.all(workers);
  var seen = Object.create(null);
  return results.filter(function (item) {
    var key = [item.type || "", item.mediaType || "", item.type === "url" ? item.link : item.id || "", item.season || ""].join(":");
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
    return fetchSubjectCollectionItems(definition.id, 0, 12);
  }));
  var subjects = [];
  responses.forEach(function (items, index) {
    items.slice(0, 3).forEach(function (item) {
      subjects.push(normalizeDoubanSubject(item, definitions[index].type));
    });
  });
  return mapSubjects(subjects, "");
}

async function loadPublicCollections(params) {
  params = params || {};
  var key = params.collection || "movie_weekly";
  var page = pageNumber(params.page);
  if (key === "highlights") return loadPublicHighlights(page);
  var collection = DOUBAN_COLLECTIONS[key];
  if (!collection) throw new Error("不支持的豆瓣公开榜单");
  var tagFallback = DOUBAN_TAG_FALLBACKS[key];
  var start = (page - 1) * 20;
  var items;
  try {
    items = await fetchSubjectCollectionItems(collection.id, start, 20);
  } catch (error) {
    if (!tagFallback) throw error;
    items = [];
  }
  if (!items.length && tagFallback) {
    var tagUrl = "https://movie.douban.com/j/search_subjects?type=" + tagFallback.type +
      "&tag=" + encodeURIComponent(tagFallback.tag) + "&sort=recommend&page_limit=20&page_start=" + start;
    var tagResponse = await Widget.http.get(tagUrl, { headers: DOUBAN_HEADERS });
    items = responseList(tagResponse, "subjects");
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
    items = responseList(await Widget.http.get(url, { headers: DOUBAN_HEADERS }), "items");
  } else {
    var collectionStart = (page - 1) * 20;
    items = await fetchSubjectCollectionItems(parsed.id, collectionStart, 20);
  }
  return mapSubjects(items, "");
}

async function loadRecommendations(params) {
  params = params || {};
  var mediaType = normalizeMediaType(params.mediaType || "movie");
  var tvRegion = params.tvRegion == null ? null : String(params.tvRegion);
  var category = String(mediaType === "movie" ? (params.movieCategory || params.category || "热门") :
    (tvRegion ? (tvRegion.indexOf("show") === 0 ? "show" : "tv") : params.category || "tv"));
  var region = String(mediaType === "movie" ? (params.movieRegion || params.region || "全部") : tvRegion || params.region || category);
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
  return mapSubjects(responseList(await Widget.http.get(url, { headers: DOUBAN_HEADERS }), "items"), mediaType);
}

async function loadMovieCatalog(params) {
  params = params || {};
  var module = movieCatalogModule();
  var category = selectedCatalogValue(module, "category", params.category);
  var page = pageNumber(params.page);
  if (category === "yearly" || category !== "all" && (params[category] == null || String(params[category]).indexOf("native:") === 0)) {
    var selection = selectedCatalogValue(module, category, params[category]);
    if (selection.indexOf("native:") === 0) return loadNativeCollection(selection.slice(7), "movie", page);
  }
  if (category === "recent") {
    var recent = selectedCatalogValue(module, "recent", params.recent);
    if (recent === "showing" || recent === "realtime") return loadPublicCollections({ collection: recent === "showing" ? "movie_showing" : "movie_hot", page: page });
    var parts = recent.split(":");
    return loadRecommendations({ mediaType: "movie", category: parts[0] === "new" ? "最新" : "热门", region: parts[1], page: page });
  }
  if (category === "classic") {
    var classic = String(params.classic || "top250");
    if (classic !== "top250" && MOVIE_RECOMMENDATION_REGIONS.indexOf(classic) < 0) throw new Error("不支持的高分经典");
    if (classic === "top250") return loadPublicCollections({ collection: "movie_top250", page: page });
    return loadRecommendations({ mediaType: "movie", category: "豆瓣高分", region: classic, page: page });
  }
  if (category === "underrated") return loadRecommendations({ mediaType: "movie", category: "冷门佳片", region: params.underrated, page: page });
  var options = { mediaType: "movie", offset: (page - 1) * 20, sort: selectedCatalogValue(module, "sort", params.sort) };
  if (category === "region") {
    var region = String(params.region || "全部");
    if (catalogRegions().indexOf(region) < 0) throw new Error("不支持的地区佳作");
    options.region = region === "全部" ? "" : region;
    options.minRating = "8";
  }
  if (category === "genre") {
    var genre = String(params.genre || "全部");
    if (genre !== "全部" && genre !== "纪录片" && !movieNativeCharts()[genre]) throw new Error("不支持的分类题材");
    options.genre = genre === "全部" ? "" : genre;
  }
  return loadPreferenceExplore(options);
}

async function loadRealtimeHot(params) {
  params = params || {};
  var kind = String(params.kind || "all");
  var collections = { all: "subject_real_time_hotest", movie: "movie_real_time_hotest", tv: "tv_real_time_hotest" };
  if (!Object.prototype.hasOwnProperty.call(collections, kind)) throw new Error("不支持的实时热门榜");
  var start = (pageNumber(params.page) - 1) * 20;
  return mapSubjects(await fetchSubjectCollectionItems(collections[kind], start, 20), kind === "all" ? "" : kind);
}

async function loadTvCatalog(params) {
  params = params || {};
  var module = tvCatalogModule();
  var category = selectedCatalogValue(module, "category", params.category);
  var page = pageNumber(params.page);
  if (category === "yearly") {
    return loadNativeCollection(selectedCatalogValue(module, "yearly", params.yearly).slice(7), "tv", page);
  }
  if (category === "classic" || category === "underrated") {
    return loadNativeTvChart(category, params[category] || nativeTvRegions(category)[0], page);
  }
  if (category === "recent") {
    var recent = selectedCatalogValue(module, "recent", params.recent);
    if (recent.indexOf("native:") === 0) return loadNativeCollection(recent.slice(7), "tv", page);
    return loadRecommendations({ mediaType: "tv", category: recent.indexOf("show") === 0 ? "show" : "tv", region: recent, page: page });
  }
  var options = { mediaType: "tv", offset: (page - 1) * 20, sort: selectedCatalogValue(module, "sort", params.sort) };
  if (category === "genre") {
    if (!params.genre || String(params.genre).indexOf("native:") === 0) {
      return loadNativeCollection(selectedCatalogValue(module, "genre", params.genre).slice(7), "tv", page);
    }
    // Retain the 1.1.0 generic genre values saved in existing home configurations.
    var parts = String(params.genre).split(":");
    var rules = tvGenreRules();
    var rule = Object.prototype.hasOwnProperty.call(rules, parts[0]) ? rules[parts[0]] : null;
    if (parts.length !== 2 || !rule || (parts[1] && rule.genres.indexOf(parts[1]) < 0)) throw new Error("不支持的电视题材");
    options.format = rule.format;
    options.genre = parts[1];
  }
  return loadPreferenceExplore(options);
}

async function fetchPreferenceSubjects(params) {
  params = params || {};
  var mediaType = normalizeMediaType(params.mediaType || "movie");
  if (!mediaType) throw new Error("偏好类型必须是 movie 或 tv");
  var module = WidgetMetadata.modules.find(function (item) { return item.id === "doubanExplore"; });
  var fields = mediaType === "movie" ? ["movieGenre", "movieRegion"] : ["tvGenre", "tvRegion"];
  fields.forEach(function (field) {
    if (params[field] != null) selectedCatalogValue(module, field, params[field]);
  });
  var genre = params.genre || "";
  var format = params.format || "";
  var region = params.region || "";
  if (mediaType === "movie") {
    if (params.movieGenre) genre = params.movieGenre === "__all__" ? "" : params.movieGenre;
    if (params.movieRegion) region = params.movieRegion === "__all__" ? "" : params.movieRegion;
    // TV-only controls can remain saved when the user switches media type.
    format = "";
  } else {
    if (params.tvRegion) region = params.tvRegion === "__all__" ? "" : params.tvRegion;
    if (params.tvGenre === "__all__") {
      format = "";
      genre = "";
    } else if (params.tvGenre) {
      var selection = String(params.tvGenre);
      var parts = selection.split(":");
      format = parts[0];
      genre = parts[1] || "";
    }
  }
  var rating = String(params.minRating == null ? "0" : params.minRating);
  if (!/^(?:[0-9])$/.test(rating)) throw new Error("最低评分必须是 0 到 9 的整数");
  var offsetValue = Number(params.offset == null ? 0 : params.offset);
  var offset = Number.isFinite(offsetValue) && offsetValue >= 0 ? Math.floor(offsetValue) : 0;
  var selected = {
    "类型": String(genre),
    "地区": String(region),
    "形式": String(format),
  };
  var year = String(params.year || "").trim().replace(/^19([6-9]0年代)$/, "$1");
  var tags = [genre, format, region, year, params.platform]
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
  return responseList(await Widget.http.get(url, { headers: DOUBAN_HEADERS }), "items");
}

async function loadPreferenceExplore(params) {
  params = params || {};
  return mapSubjects(await fetchPreferenceSubjects(params), normalizeMediaType(params.mediaType || "movie"));
}

async function fetchInterestSubjects(userId, status, start, count) {
  var url = "https://m.douban.com/rexxar/api/v2/user/" + encodeURIComponent(userId) +
    "/interests?status=" + encodeURIComponent(status) + "&start=" + start + "&count=" + count;
  return responseList(await Widget.http.get(url, { headers: DOUBAN_HEADERS }), "interests").map(function (item) { return item.subject || item; });
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
  return mapSubjects(responseList(response, "items"), mediaType, false);
}

async function resolvePersonId(person) {
  var input = String(person || "").trim();
  if (!input) throw new Error("豆瓣影人不能为空");
  if (/^\d+$/.test(input)) return input;
  var urlMatch = input.match(/^https:\/\/(?:www|movie|m)\.douban\.com\/celebrity\/(\d+)(?:[\/?#].*)?$/i);
  if (urlMatch) return urlMatch[1];
  if (/^[a-z]+:\/\//i.test(input)) throw new Error("仅支持豆瓣影人 URL");
  var url = "https://movie.douban.com/j/subject_suggest?q=" + encodeURIComponent(input);
  var data = responseList(await Widget.http.get(url, { headers: DOUBAN_HEADERS }));
  var normalizedInput = normalizeIdentityTitle(input);
  var ids = [];
  data.forEach(function (candidate) {
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
  var works = responseList(await Widget.http.get(url, { headers: DOUBAN_HEADERS }), "works").map(function (item) { return item.work || item; });
  return mapSubjects(works, "");
}
