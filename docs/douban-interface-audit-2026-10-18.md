# 豆瓣全景接口完整审计

日期：2026-10-18。版本：1.2.0。这里的“完整”指本模块的公开入口、其参数枚举和已发现的电影/电视原生目录，并非豆瓣所有产品的内部 API。以下是当日在线快照。

## 修复结果

| 问题 | 证据 | 修复 |
| --- | --- | --- |
| 广告变成空白影片 | `recommend` 中存在 `type=ad`、无 `card` 的记录，旧代码允许其通过 | 排除广告及推广卡，所有列表拒绝缺少 ID/标题的条目 |
| 电影原生榜被自由筛选代替 | 第一方 `category_tabs` 含 26 题材、241 子榜；旧电影区使用 `recent_hot` / `recommend` | 新选项逐个指向原生 collection，保留原顺序；旧保存参数继续可读 |
| 近期热门电视未使用原生地区榜 | 原生目录含大陆、美、日、韩、欧洲五榜 | 新增五个精确原生入口，原来的综合、动画、纪录片和综艺筛选继续保留 |
| 年度电影和电视入口缺失 | 第一方目录含 2014–2025 年电影 108 榜、电视 82 榜 | 电影、电视分别增加年度分类 |
| 分类允许无效跨媒体组合 | 旧推荐/探索把电影、剧集、综艺参数共用 | 新界面分媒体展示有效选项，电视类型绑定形式；补齐原生筛选地区 |
| 升级后新默认值覆盖旧筛选 | 新旧参数混合的 payload 可复现 | 新字段默认沿用已有筛选，显式“全部”单独清空；覆盖混合 payload 回归 |
| 1990 年代查询返回空 | `tags=1990年代` 返回 0，`tags=90年代` 返回实际 1990–1999 作品；`year_range` 在该入口不生效 | 1960–1990 年代转换为 `60年代`–`90年代`；2000 年代起保留原写法 |

## 原生目录覆盖

| 目录 | 数量 | 第一方入口 | 核验 |
| --- | ---: | --- | --- |
| 电影题材 | 26 题材、241 榜 | [film_genre_27](https://m.douban.com/rexxar/api/v2/subject_collection/film_genre_27?for_mobile=1) | 全部 collection 首条请求成功，均为电影 |
| 年度电影 | 12 年、108 榜 | [ECE472UNY](https://m.douban.com/rexxar/api/v2/subject_collection/ECE472UNY?for_mobile=1) | 全部成功，均为电影 |
| 电视地区/题材 | 10 地区或类型、56 榜 | [EC74443FY](https://m.douban.com/rexxar/api/v2/subject_collection/EC74443FY?for_mobile=1) | 5 近期、9 经典、9 冷门、33 题材均核查；欧洲冷门榜为空 |
| 年度电视 | 12 年、82 榜 | [EC2FACYKQ](https://m.douban.com/rexxar/api/v2/subject_collection/EC2FACYKQ?for_mobile=1) | 全部成功，均为电视 |

共 487 个原生榜。电影题材目录的 241 榜包括 26 个高分经典、12 个近期热门、19 个冷门佳作、184 个地区与题材组合。年度只展示源站实际存在的年份与分类，不创建尚未公布的 2026 年度榜。

目录 ID 快照保存在：

- [电影与年度电影](douban-movie-category-tabs-2026-10-18.json)
- [电视地区与题材](douban-tv-category-tabs-2026-10-18.json)
- [年度电视](douban-tv-yearly-2026-10-18.json)

## 接口与参数核查范围

所有 `rexxar` 路径以下列基址为前缀：`https://m.douban.com/rexxar/api/v2`。

| 接口 | 用途和分页 | 证据边界 |
| --- | --- | --- |
| `/subject_collection/{id}?for_mobile=1` | 原生目录 `category_tabs` | 四个目录首层与 ID 映射均核对 |
| `/subject_collection/{id}/items` | 周口碑、实时、原生分类、年度；`start/count=20` | 枚举入口和代表第二页实测；保留源站空榜 |
| `/subject/recent_hot/movie` | 四类 × 五地区；`start/limit=20` | 全部合法组合实测；不当作原生固定榜 |
| `/subject/recent_hot/tv` | 七剧集与三综艺类别；`start/limit=20` | 全部合法组合实测 |
| `/movie/recommend`、`/tv/recommend` | `selected_categories/tags/score_range/sort/start/count` | 当前界面每个选项单独实测；未穷举多个条件的笛卡尔积 |
| `/doulist/{id}/items` | 自定义片单；`start/count=25` | 内置三个片单实测，任意用户片单可用性取决于公开权限 |
| `/celebrity/{id}/works` | 影人作品；`start/count=50/sort` | 周星驰 ID，时间/评分排序实测 |
| `movie.douban.com/j/subject_suggest` | 姓名解析到影人 | 姓名样本实测，唯一精确姓名才接受 |
| `movie.douban.com/j/search_subjects` | 四个旧列表的降级路径 | 本地故障注入验证调用；源站正常时无需强制触发降级 |
| `/{movie|tv|book|music}/{id}` | 条目详情、原名和别名 | 公共类型样本实测；身份/类型校验本地覆盖 |
| `/user/{id}/interests` | 想看/在看/看过、随机想看 | 分页和上限本地测试，未使用用户私人列表在线验收 |
| `/{movie|tv}/suggestion` | Cookie 个性推荐 | Cookie、ck、禁止重定向、禁止缓存及外传本地测试；未使用登录 Cookie 在线验收 |
| `Widget.tmdb` 的 `search/movie`、`search/tv`、`tv/{id}` | 严格标题、年份、季号匹配 | VM 回归覆盖唯一性、失败降级和并发；未宣称真实 REX 内 TMDB 网络验收 |

`recommend` 的“返回空”可能表示合法的条件交集为空；HTTP 401/403/429、非 JSON 与真正的网络失败另行记录。类别切换不会发送另一个媒体的隐藏字段。地区与类型固定榜不在本地另加评分或人数阈值。

## 验证方式与限制

初始版本 1.1.1 的审计共 340 个公共逻辑用例、295 个独立 HTTP 请求：无请求错误，8 个空结果，其中含无效跨媒体选项、旧年代写法和正常榜尾；7 个用例发现无效空白卡片。新版本 755 个公开逻辑用例、695 个独立 HTTP 请求全部完成：752 个非空结果，3 个合法空结果，0 请求错误，0 缺少 ID/标题的卡片。空结果为欧洲冷门剧榜、周口碑第二页和冷门美剧第二页。108 项回归测试及严格 Forward runtime、语法检查通过。另对最终默认值兼容与显式清空执行 8 个在线用例。完整 JSON 证据保存在本机交付目录 `Documents/Emby-Migration-20261017/interface-audit-20261018/after-interface-results.json`。

执行方式：

```sh
npm test
npm run check
npm run test:douban:live
node audit-douban-interfaces.cjs /tmp/douban-interface-results.json
```

完整脚本只使用无 Cookie 的公共请求，网络并发最多 3，保存用例参数、返回数量、样本身份、错误与空结果。它不会证明所有影片的 TMDB 映射正确，也不替代 REX 真机界面或播放验收。目录是快照，未来新增榜单需要刷新；私人列表和登录推荐仍需用户实际账户验收。
