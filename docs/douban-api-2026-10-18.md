# 豆瓣分类 API 核查

核查日期：2026-10-18。以下是豆瓣第一方 Web API 的实测快照，不是稳定性承诺。

## 分类与分页

- `https://m.douban.com/rexxar/api/v2/subject/recent_hot/movie`：`category` 为热门、最新、豆瓣高分、冷门佳片；各类的 `type` 为全部、华语、欧美、韩国、日本。`start` 和 `limit` 分页。
- `https://m.douban.com/rexxar/api/v2/subject/recent_hot/tv`：`category=tv` 的 `type` 为 `tv`、`tv_domestic`、`tv_american`、`tv_japanese`、`tv_korean`、`tv_animation`、`tv_documentary`；`category=show` 的 `type` 为 `show`、`show_domestic`、`show_foreign`。接口 `tags` 返回这套分类。
- `https://m.douban.com/rexxar/api/v2/movie/recommend` 和 `/tv/recommend`：返回 `recommend_categories` 和 `sorts`；使用 `selected_categories`、`tags`、`score_range`、`sort`、`start`、`count`。只把 `card=subject` 的项目当影视，过滤片单和推广卡。
- 排序：`T` 综合、`U` 近期热度、`R` 首映/首播时间、`S` 高分优先。
- 电影题材 21 种，地区含全部共 23 项。电视题材按电视剧 21 种和综艺 4 种区分，不把电影专属题材混入综艺。

## 周口碑与实时榜

统一使用 `/subject_collection/{id}/items?start=0&count=20`：

| UI | collection ID | 实测条数 |
| --- | --- | --- |
| 一周口碑电影榜 | `movie_weekly_best` | 10 |
| 华语口碑剧集榜 | `tv_chinese_best_weekly` | 10 |
| 全球口碑剧集榜 | `tv_global_best_weekly` | 10 |
| 国内口碑综艺榜 | `show_chinese_best_weekly` | 6 |
| 全球口碑综艺榜 | `show_global_best_weekly` | 10 |
| 实时热门书影音 | `subject_real_time_hotest` | 20 |
| 实时电影榜 | `movie_real_time_hotest` | 10 |
| 实时电视榜 | `tv_real_time_hotest` | 10 |

豆瓣把 `show_global_best_weekly` 的官方名称写作“国外口碑综艺榜”，UI 沿用用户要求的“全球口碑综艺榜”。书影音综合榜的 `subject_type=union`，本次样本是电影 6 条、电视 14 条，未来可能含图书、音乐，不能把所有条目强制转成电影。

## 不支持的分类与派生口径

`tags=高分经典` 和 `tags=冷门佳作` 返回空结果。`recent_hot/tv?category=冷门佳片` 会忽略未知分类，返回的内容与普通热播剧集相同，不能据此伪造电视冷门榜。

- 高分经典：使用豆瓣 Top 250 或 `recent_hot/movie` 的“豆瓣高分”。
- 地区佳作：使用真实地区标签，评分区间 8–10。
- 电视冷门佳作：每页请求 `tv/recommend` 的 100 项，`score_range=8,10`、`sort=U`，保留评分 ≥ 8 且评价人数 1–10000 的条目。这是模块的透明筛选，实测首个 100 项中有 8 项符合条件。

## 详情与身份

`/{movie|tv}/{id}` 的详情比榜单条目多出 `original_title`、`aka`、`year`、`release_date` 等字段。例：榜单“流人 第六季”没有原名；`/tv/36689816` 给出 `Slow Horses Season 6`。TMDB 按主剧建档，季度条目必须进一步验证对应季号与首播年份，不能直接删掉季号后取搜索第一项。
