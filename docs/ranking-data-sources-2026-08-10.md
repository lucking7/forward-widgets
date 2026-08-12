# 电影、电视、动漫日榜与周榜数据源选择

日期：2026-08-10

## 结论

如果模块需要免费、可直接调用且榜单定义明确，推荐如下：

| 榜单 | 主源 | 第二信号 | 可选商业增强 |
| --- | --- | --- | --- |
| 电影日榜 | TMDB `trending/movie/day` | Trakt `movies/trending`（过去 24 小时） | JustWatch 1d 地区流媒体榜 |
| 电影周榜 | TMDB `trending/movie/week` | Trakt `movies/watched/weekly` | JustWatch 7d；IMDb MOVIEmeter 周榜/历史库 |
| 电视日榜 | TMDB `trending/tv/day` | Trakt `shows/trending`（过去 24 小时） | JustWatch 1d 地区流媒体榜 |
| 电视周榜 | TMDB `trending/tv/week` | Trakt `shows/watched/weekly` | JustWatch 7d；IMDb TVmeter 周榜/历史库 |
| 动漫日榜 | AniList `TRENDING_DESC` 的小时快照，自行聚合最近 24 小时 | Bangumi 收藏热度增量、MAL `airing` 仅作稳定性校验 | 无必要 |
| 动漫周榜 | 同一批 AniList 小时/日快照，自行聚合滚动 7 天 | Bangumi 收藏热度增量、MAL `airing` | 无必要 |

不能持久化快照时，动漫榜只能标成“实时趋势”，不能把 AniList、MAL 或 Bangumi 的当前排序标成“日榜/周榜”。

## 为什么这样选

### TMDB：电影、电视免费主源

- 官方把 `trending` 定义为短时间窗口的热度，并明确提供 daily、weekly；电影和电视端点的 `time_window` 只接受 `day` 或 `week`。[Popularity & Trending](https://developer.themoviedb.org/docs/popularity-and-trending)、[Trending Movies](https://developer.themoviedb.org/reference/trending-movies)、[Trending TV](https://developer.themoviedb.org/reference/trending-tv)
- 它覆盖 movie、TV 和 people，但没有独立 anime 类型。动画 genre 不能等价于日本动漫，不能用 `genre=16` 直接冒充动漫榜。
- `popular` 是包含当日行为、累计票数、发布日期和前日分数等因素的 lifetime-like 分数，不是日榜或周榜；日/周模块应调用 `trending`，不要调用 `popular` 后改名。[Popularity & Trending](https://developer.themoviedb.org/docs/popularity-and-trending)
- 认证需要 TMDB API key/read token。旧的 40 次/10 秒限制已取消，但官方仍说明存在约 40 次/秒的上限，应处理 `429`。[Rate Limiting](https://developer.themoviedb.org/docs/rate-limiting)
- 非商业使用免费但必须归因，商业用途需联系销售；官方不提供 SLA。[FAQ](https://developer.themoviedb.org/docs/faq)
- TMDB 表示自 2017-04-28 起日导出文件保留 popularity 值，但没有 API 查询历史 popularity。若产品要展示“上升 X 位”，仍需自己保存榜单快照。[Popularity & Trending](https://developer.themoviedb.org/docs/popularity-and-trending)

结论：TMDB 是现有 Forward 模块最容易落地的电影/电视日榜和周榜主源，但它表示全球 TMDB 社区热度，不是某一国家真实播放量。

### Trakt：观看行为的免费第二信号

- `movies/trending` 和 `shows/trending` 明确定义为过去 24 小时观看人数排序，适合作为日榜校验。[Trending Movies](https://docs.trakt.tv/reference/getmoviestrending)、[Trending Shows](https://docs.trakt.tv/reference/getshowstrending)
- `movies/watched/{period}` 和相应 show 接口按 unique users 排序，支持 `daily`、`weekly`、`monthly`、`yearly`、`all`，适合周榜或独立“最多观看”榜。[Most Watched Movies](https://docs.trakt.tv/reference/getmovieswatched)
- 普通 GET 不需要用户 OAuth，但每个请求仍需应用 `client_id`、API version 等 header。[Required Headers](https://docs.trakt.tv/docs/required-headers)
- 未认证应用 GET 限制为每 5 分钟 1000 次，收到 `429` 后必须尊重 `Retry-After`。[Rate Limits](https://docs.trakt.tv/docs/rate-limiting)
- Trakt 的样本是 Trakt 用户和接入其 scrobble 的播放器，不等于全市场播放量。它适合与 TMDB 交叉验证，不建议单独替代 TMDB。

### JustWatch：地区流媒体榜最佳，但需要合作授权

- 官方 Streaming Charts 根据过去 24 小时、7 天或 30 天的用户活动计算，按日更新，分电影和电视，并提供国家维度。[Streaming Charts](https://www.justwatch.com/us/streaming-charts)
- 官方 Partner API 可返回具体标题的 1d、7d、30d rank；必须先签约，每个合作方获得唯一 partner token，并要求品牌链接和归因。[Partner API / Streaming Charts API](https://apis.justwatch.com/docs/api#the-streaming-charts-api)
- 官网宣称榜单覆盖 140 个国家、4500 个流媒体服务、每月超过 6000 万用户活动，但这是平台用户行为，不是 Netflix 等平台披露的真实播放数。[Streaming Charts](https://www.justwatch.com/us/streaming-charts)

结论：如果愿意签约，JustWatch 是地区化电影/电视榜最有价值的增强源；未签约时不要依赖网页或内部 GraphQL 抓取。

### IMDb：高质量周榜和历史排名，但不是免费运行时 API

- 公共 Most Popular Movies/TV 是按电影与电视分别计算的 popularity ranking；MOVIEmeter 则覆盖 IMDb 全部 title。[IMDb Help](https://help.imdb.com/article/imdb/track-movies-tv/what-s-the-difference-between-the-moviemeter-and-popularity-ranking-on-a-title/G9X2T9KM887YSZYJ)
- 2025 年发布的 IMDb Meters Timeseries 提供 MOVIEmeter、TVmeter、TITLEmeter 完整历史排名，MOVIEmeter/TVmeter 可追溯到 2015 年，并提供 weekly snapshots；GEOmeters 提供 4 大区和 13 国的周榜。[IMDb Developer Documentation](https://developer.imdb.com/documentation)
- 正式 GraphQL API 和 bulk datasets 通过 AWS Data Exchange 订阅，需 AWS 账号、批准、API key 和产品授权，并非公共免费 GraphQL。[Getting Access](https://developer.imdb.com/documentation/api-documentation/getting-access)

结论：付费版很适合做“权威周榜”和历史趋势，但不适合当前 Forward 客户端作为默认免费日榜源。IMDb 网页或内部 GraphQL 没有稳定公共 API 合同，不建议抓取。

## 动漫源

### AniList：当前动漫趋势的最佳公开信号，但原生窗口只有 1 小时

- `Media.trending` 的官方 schema 定义是“过去一小时的相关活动量”，`MediaSort` 提供 `TRENDING_DESC`；`popularity` 则是把作品加入列表的用户总数，不是短周期趋势。[Media schema（固定提交）](https://github.com/AniList/docs/blob/dd9c579f18036d720038b3da17b892b44609fd62/docs/reference/object/media.md)、[MediaSort（固定提交）](https://github.com/AniList/docs/blob/dd9c579f18036d720038b3da17b892b44609fd62/docs/reference/enum/mediasort.md)
- 官方常规限制为 90 次/分钟，但文档当前标注 degraded state 为 30 次/分钟，并另有 burst limiter。[Rate limits（固定提交）](https://github.com/AniList/docs/blob/dd9c579f18036d720038b3da17b892b44609fd62/docs/guide/rate-limiting.md)
- 非商业使用免费，禁止 hoarding/mass collection；月收入超过 150 美元需要商业许可。[Terms（固定提交）](https://github.com/AniList/docs/blob/dd9c579f18036d720038b3da17b892b44609fd62/docs/guide/terms-of-use.md)

落地方法：每小时取前 100 名并保存 `{anilistId, trending, rank, sampledAt}`。日榜聚合最近 24 个小时，周榜聚合最近 168 个小时。优先用平均 rank/Borda 分数与入榜小时数，原始 `trending` 只作辅助，避免服务端分值尺度调整造成跳变。

### MyAnimeList 与 Jikan：适合长期/播出中榜，不是真日周趋势

- MAL 官方 `/v2/anime/ranking` 提供 `all`、`airing`、`upcoming`、`tv`、`movie`、`bypopularity`、`favorite` 等类型，没有日/周 time window；官方请求需要 client authentication/OAuth 凭据。[MAL API v2](https://myanimelist.net/apiconfig/references/api/v2#operation/anime_ranking_get)
- MAL 网页明确把 `bypopularity` 称为 Most Popular，并显示每日更新两次，但其含义仍是累计 popularity，不是最近 24 小时增量。[MAL Most Popular](https://myanimelist.net/topanime.php?type=bypopularity)
- Jikan 自称 unofficial MAL API，通过抓取 MAL 补齐官方 API；公共实例限制 3 次/秒、60 次/分钟，并可能继续受到 MAL 限制。[Jikan docs](https://docs.api.jikan.moe/)、[Jikan 源码固定提交](https://github.com/jikan-me/jikan-rest/tree/1e33a79bcc9161f1831e4428004e110c67a48676)

结论：MAL `airing` 可用于过滤和稳定性校验；Jikan 只能作为无需 key 的降级源，不应承担核心日/周热榜。

### Bangumi：中文社区校验源，不提供原生日周榜

- 官方 v0 API 可按 `rank` 或日期浏览条目；搜索可按 `heat`（收藏人数）、`rank`、`score` 排序并按 air date 筛选，但没有 daily/weekly 窗口。[OpenAPI 固定提交](https://github.com/bangumi/api/blob/65d29cff2331e08c0110d30d515f7f1b6488f845/open-api/v0.yaml)
- `/v0/subjects` 第一页缓存 24 小时，后续页缓存 1 小时，说明它不适合作为高频实时源。[OpenAPI 固定提交](https://github.com/bangumi/api/blob/65d29cff2331e08c0110d30d515f7f1b6488f845/open-api/v0.yaml)

结论：保存每日收藏热度快照后计算增量，可以补充中文用户偏好；未保存历史时只能显示“Bangumi 热门/高分”，不能称日榜或周榜。

### Bilibili：不作为核心源

截至本次检查，没有在 [哔哩哔哩开放平台](https://openhome.bilibili.com/) 确认到面向第三方、具有稳定合同的电影/电视/番剧 1d/7d 热榜接口。网页使用的排行接口、PGC 内部接口和社区整理文档不等于公开 API 承诺，字段、风控和登录要求可随时变化。

结论：只有在取得官方合作接口时才接入；否则最多作为实验性中国区信号，失败时必须静默降级，不能影响主榜。

## 合并和降级规则

1. 不把不同定义的 rank 直接相加。先在每个源内部转成 percentile，再按媒体类型合并。
2. 电影/电视默认权重建议：TMDB 70%，Trakt 30%。JustWatch 获得授权后，地区榜可改为 JustWatch 50%、TMDB 30%、Trakt 20%。IMDb 授权后只加入周榜，不加入日榜。
3. 动漫默认不跨平台合并原始分值。AniList 生成主榜，MAL/Bangumi 只标注 `crossSourceCount`、`airing`、评分或收藏增量。
4. 日榜缓存 1 小时，周榜缓存 6 小时；保存每日最终 Top 100 快照至少 90 天，才能展示升降位和历史趋势。
5. 降级顺序：电影/电视 `TMDB -> Trakt -> 最近成功快照`；动漫 `AniList 聚合 -> Bangumi/MAL 最近快照 -> 最近成功主榜`。缓存结果必须带 `source`、`window`、`generatedAt`、`stale`，避免把旧榜伪装成实时榜。
6. JustWatch、IMDb、Bilibili 没有合法可用凭据时，不调用、不抓内部接口；模块仍应靠 TMDB、Trakt、AniList 正常工作。

## 不推荐的误用

- TMDB `popular`、MAL `bypopularity`、AniList `POPULARITY_DESC`：累计或 lifetime-like 热度，不是日榜/周榜。
- IMDb 网页或内部 GraphQL、JustWatch 内部 GraphQL、Bilibili PGC 内部接口：没有适合本项目的稳定公共合同。
- 用 TMDB animation genre 代替 anime：会混入欧美动画，也会漏掉媒体标注不完整的动漫。
- 只在模块加载时读取 AniList 当前趋势，然后同时生成“日榜”和“周榜”：两个榜没有不同时间证据。
