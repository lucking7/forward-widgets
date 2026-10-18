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

## 原生电视地区榜单与接口边界

`tags=高分经典` 和 `tags=冷门佳作` 返回空结果。`recent_hot/tv?category=冷门佳片` 会忽略未知分类，返回的内容与普通热播剧集相同，这只说明查询入口不对，不能据此推断豆瓣没有原生冷门榜。

- 高分经典：使用豆瓣 Top 250 或 `recent_hot/movie` 的“豆瓣高分”。
- 地区佳作：使用真实地区标签，评分区间 8–10。
- 电视原生榜单：`GET /subject_collection/EC74443FY?for_mobile=1` 返回 `category_tabs`，包含 10 个地区/类型、9 个高分经典榜、9 个冷门佳作榜、33 个地区题材榜。完整 ID 快照见 `douban-tv-category-tabs-2026-10-18.json`。
- 原生冷门美剧 `ECGI5HUQI` 前三名为《继承之战 第二季》《紧急呼救 第四季》《亿万 第五季》；原生冷门大陆剧 `ECRI46YZQ` 前三名为《外乡人》《12·1枪杀大案》《东周列国·春秋篇》，与用户提供的截图一致。
- 电视冷门使用上述原生 collection，不按评分/人数重筛。欧洲剧冷门 `ECTM5JVYA` 当前为空，保留空榜。

## 详情与身份

`/{movie|tv}/{id}` 的详情比榜单条目多出 `original_title`、`aka`、`year`、`release_date` 等字段。例：榜单“流人 第六季”没有原名；`/tv/36689816` 给出 `Slow Horses Season 6`。TMDB 按主剧建档，季度条目必须进一步验证对应季号与首播年份，不能直接删掉季号后取搜索第一项。
