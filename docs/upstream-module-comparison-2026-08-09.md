# Forward 弹幕与豆瓣模块源码对比

研究时间：2026-08-09。

## 证据边界

- 我们的仓库固定在 [`lucking7/forward-widgets@bcf3f03`](https://github.com/lucking7/forward-widgets/tree/bcf3f038f7c44927b7887a845576906e2bd4fc4f)。
- Huang 仓库固定在 [`huangxd-/ForwardWidgets@8b33652`](https://github.com/huangxd-/ForwardWidgets/tree/8b33652bdabec8440d361872a29241decdb83323)。
- Makka 仓库固定在 [`MakkaPakka518/FW@688c974`](https://github.com/MakkaPakka518/FW/tree/688c974403a3042f171bc5ef8713c8023542e12b)。
- 结论来自源码与仓库目录，不把“bundle 中存在但未接到 Forward 参数/入口”的代码算作可用功能。
- 只做静态检查和我们仓库既有测试，没有对第三方接口做压力测试，因此不声称绝对命中率或 P50/P95。

## 一、弹幕模块

对比对象：

- 我们的 [`danmu-select.js`](https://github.com/lucking7/forward-widgets/blob/bcf3f038f7c44927b7887a845576906e2bd4fc4f/widgets/danmu/danmu-select.js)，版本 1.1.2，1,598 行、约 64 KB。
- Huang 的 [`danmu_auto.js`](https://github.com/huangxd-/ForwardWidgets/blob/8b33652bdabec8440d361872a29241decdb83323/widgets/danmu_auto.js)，版本 1.20.5，21,471 行、约 1.27 MB，首行说明它由 `danmu_api` 一键导出。

### 结论

两者不是同一种架构。我们的模块是小型、确定性的 Dandan-compatible API 优选器，目标是默认快速、准确、质量稳定。Huang 的模块是把多平台抓取后端打成一个 Forward bundle，目标是尽可能广的来源与高级功能。

如果用于 SenPlayer/Forward 的默认弹幕模块，继续以我们的实现为主更合适。Huang 版本最值得借鉴的是分段弹幕缓存、时间轴 offset/对齐、源内健康轮询和少量高价值直连适配器，不建议整体移植 2.1 万行 bundle。

### 功能与行为矩阵

| 维度 | 我们的弹幕优选 | Huang `danmu_auto` | 判断 |
|---|---|---|---|
| Forward 接口 | search、detail、comments 三段标准接口，[metadata](https://github.com/lucking7/forward-widgets/blob/bcf3f038f7c44927b7887a845576906e2bd4fc4f/widgets/danmu/danmu-select.js#L5-L65) | 多一个按时间获取分段弹幕接口，[metadata](https://github.com/huangxd-/ForwardWidgets/blob/8b33652bdabec8440d361872a29241decdb83323/widgets/danmu_auto.js#L20434-L20441) 与 [modules](https://github.com/huangxd-/ForwardWidgets/blob/8b33652bdabec8440d361872a29241decdb83323/widgets/danmu_auto.js#L20914-L20944) | Huang 的分段播放能力更强。 |
| 默认来源 | Alpha、炊烟为 fast，Lily 为 deep | 默认豆瓣、360、人人、韩剧，可配置约 22 类搜索源 | Huang 覆盖广，我们结构简单。 |
| 搜索身份 | 使用 title、seriesName、fileName、videoUrl、season、episode、type、special | Forward 包装层主要以 title 调内层搜索，未完整传入 episode、fileName、hash、duration | 我们公共入口的身份约束更完整。 |
| 跨源 ID | route 显式保存每源 anime/episode ID，只向对应来源回传 | 依赖 bundle 内部全局缓存映射平台 URL/ID | 我们更容易验证，也更不易跨源串片。 |
| 电影正片 | 详情阶段比较每源最多 4 个候选，正片/完整版加分，片段/预告/解说降权 | 有大量平台专属解析，但没有同等统一的电影候选质量规则 | 普通电影自动选择，我们更稳。 |
| 弹幕选源 | quality 模式按有效率、唯一率、低价值率、时间覆盖和数量动态评分，质量不足才调用 Lily | 默认同时搜索配置源，等待完成后按 sourceOrder 拼接；评论通常由已选平台抓取 | 我们更符合“质量优先”，Huang 更符合“来源优先”。 |
| 加工 | 繁简、关键词、确定性去重、颜色、时间线均匀限量 | 繁简、regex 屏蔽、分钟分组去重、点赞、顶/底转滚动、颜色、offset、时间轴对齐 | Huang 可调功能更多。 |
| 大集合 | 评分最多采样 12,000 条，默认输出最多 3,000 条 | 默认 `danmuLimit=0`，即不限制；部分 offset 路径使用 `Math.max(...array)` | 我们内存和输出更有界。 |
| 缓存 | 7 天匹配缓存与繁简字典缓存，无评论体缓存 | 搜索/评论短缓存、5 小时 segment cache | 重复播放和分段场景 Huang 占优。 |
| 隐私 | 不需要 Cookie/API key，但默认 Alpha 是明文 HTTP | 可配置 Bilibili/Douban Cookie、TMDB key、代理，并持久化部分日志和缓存 | 我们凭证面更小；Alpha HTTP 是明确短板。 |
| 测试与维护 | 生产代码 1,598 行，59 个测试和严格 Forward runtime flow | 生成 bundle 21,471 行，目标仓库未见配套测试入口 | 我们更容易审计和持续修复。 |

### 关键优劣

我们的优势：

1. 匹配置信度先于完成顺序，错误 season/episode/type 可硬拒绝。
2. 每源 ID 路由、电影正片选择和 special 处理都有回归测试。
3. Alpha/炊烟准确且质量足够时不启动 Lily，典型请求数较少。
4. 质量评分后再决定来源，默认输出有界。
5. 生产文件不依赖 `setTimeout`、`fetch`、`require` 等未确认的 Forward 全局。

我们的不足：

1. `fastTimeout/requestTimeout` 是后续阶段的启动预算，不会取消已经发出的 `Widget.http` 请求。
2. 没有分段弹幕和评论体缓存。
3. 没有平台直连适配器，覆盖依赖三家聚合 API。
4. 默认 Alpha 使用 HTTP，应优先换成可信 HTTPS 镜像。

Huang 的优势：

1. 直连腾讯、爱奇艺、Bilibili、优酷、360、豆瓣、人人、韩剧、巴哈、Animeko 等大量来源。
2. 支持分段弹幕、5 小时 segment cache、offset、时间轴对齐、手工 URL 合并。
3. 有平台特定的 episode 解析、Cookie、代理和节点健康逻辑。

Huang 的不足与风险：

1. 当前 Forward 搜索包装层没有把内层高级身份参数完整接通。
2. 默认等待所有搜索 pipeline settle，再按 sourceOrder 返回，不按实际弹幕质量选最好来源。
3. 自带的 [`setTimeout` shim](https://github.com/huangxd-/ForwardWidgets/blob/8b33652bdabec8440d361872a29241decdb83323/widgets/danmu_auto.js#L178-L221) 忽略 delay、在下一个 microtask 执行，却被用于 abort、重试、退避和限速，语义不可靠。
4. bundle 中有 AI、Bangumi Data、源合并等代码，但对应参数没有完整进入 `globalParams/initGlobals`，不能算作当前 Forward 可用功能。
5. 默认弹幕无限量，超大集合的内存、调用栈和渲染风险更高。

### 建议借鉴顺序

1. 分段弹幕与按 episode route、源指纹、处理参数构建的短期评论缓存。
2. 手动 offset 与多源时间轴对齐，默认关闭，仅在用户明确配置时启用。
3. 源内镜像健康状态与短超时轮询。
4. 把 Bilibili、腾讯/爱奇艺或 Animeko 做成可选独立适配器，不塞进核心优选器。

## 二、Makka 的豆瓣相关模块

### 当前目录中实际发布的豆瓣能力

以 [`widgets.fwd`](https://github.com/MakkaPakka518/FW/blob/688c974403a3042f171bc5ef8713c8023542e12b/widgets.fwd) 为发布口径，当前有 4 个组件含豆瓣子功能：

| 当前组件 | 豆瓣功能 | 数据与返回方式 | 主要问题 |
|---|---|---|---|
| [`ysbd.js`](https://github.com/MakkaPakka518/FW/blob/688c974403a3042f171bc5ef8713c8023542e12b/widgets/normal/ysbd.js)，“影视榜单Lite” | 13 个 subject collection：英美/韩/日/国产剧、动画、热门/周榜/Top250/院线电影、国内外综艺、全球/华语剧集口碑榜 | 请求 `m.douban.com/rexxar`，每个豆瓣条目再并发搜索 TMDB，返回 `type: tmdb`，匹配不到就丢弃 | 每页可能形成 1+20 次请求；标题只做简单季数清洗；源码内置 TMDB key；目录版本 1.2.1 与文件 metadata 1.3.1 不一致。 |
| [`mediahub.js`](https://github.com/MakkaPakka518/FW/blob/688c974403a3042f171bc5ef8713c8023542e12b/widgets/normal/mediahub.js)，“全球影视｜分流聚合” | 热门国产剧、综艺、电影、美剧 4 个 tag 榜单 | 请求 `movie.douban.com/j/search_subjects`，再逐条取 TMDB 第一项补全 | 简洁，但同名片容易误配；TMDB 失败时仍可能返回带 `db_` ID、却声明 `type: tmdb` 的不完整项。 |
| [`mediahubrepair.js`](https://github.com/MakkaPakka518/FW/blob/688c974403a3042f171bc5ef8713c8023542e12b/widgets/normal/mediahubrepair.js)，“防风控版” | 与 mediahub 相同的 4 个 tag 榜单 | 增加移动 UA、Referer、XHR 头与随机 `bid` Cookie，再映射 TMDB | 只能缓解部分访问限制，不能保证稳定；伪造访客 Cookie 增加维护和合规风险，匹配准确性没有改善。 |
| [`MakkaPakka-ALL.js`](https://github.com/MakkaPakka518/FW/blob/688c974403a3042f171bc5ef8713c8023542e12b/widgets/mk-2.0/MakkaPakka-ALL.js)，“终极聚合” | “影剧流行风向”中的同一组 4 个豆瓣 tag 榜单 | 基本复用防风控请求与 TMDB 映射 | 这是大型聚合组件里的豆瓣子功能，不是独立豆瓣组件；与 mediahubrepair 高度重复；目录版本 1.2.0 与文件 metadata 1.3.1 不一致。 |

分类说明：

- `widgets/1.js`、`Automated-List.js`、`TEST121.js`、`mk-2.0/13.js`、`mktest.js` 和旧版 ALL 虽然含豆瓣代码，但不在当前 `widgets.fwd` 发布目录中，应归为历史、实验或副本。
- `VodMax.js` 中的“豆瓣资源”只是名为“豆瓣资源”的 VOD 采集站，不是 Douban.com 榜单、评分或用户数据功能。
- `movielist.js` 的“全能电影榜”全部来自 TMDB，不属于豆瓣模块。

### 与 Huang `douban.js` 的差异

Huang 的 [`douban.js`](https://github.com/huangxd-/ForwardWidgets/blob/8b33652bdabec8440d361872a29241decdb83323/widgets/douban.js) 是独立豆瓣组件，版本 1.0.20、1,785 行，共 9 个模块：

1. 豆瓣“想看、在看、看过”和随机想看。
2. 使用 Cookie 的电影/电视个性化推荐。
3. 自定义 Doulist 与 subject collection 片单，并映射 TMDB。
4. 电影推荐与剧集推荐。
5. 按类型、地区、年代、平台、评分、排序等观影偏好筛选。
6. 两种 UI 的豆瓣影人作品查询。
7. 首页/Apple TV Top Shelf 轮播图。

| 维度 | Makka 当前豆瓣子功能 | Huang `douban.js` |
|---|---|---|
| 定位 | 聚合组件中的公开榜单入口 | 独立的豆瓣个人数据、片单、推荐与影人组件 |
| 公开榜单 | 13 个 collection，或 4 个 tag 榜单 | 自定义 Doulist/collection、电影/剧集推荐和偏好筛选，范围更灵活 |
| 个人数据 | 无 | 支持想看/在看/看过、随机想看、Cookie 个性化推荐 |
| 影人 | 无 | 影人搜索和作品列表，两种选择 UI |
| 返回 ID | 主要强制映射到 TMDB | 个人兴趣、推荐和影人可直接返回 `type: douban`；部分片单再映射 TMDB |
| TMDB 匹配 | ysbd 用标题、年份 ±1 和媒体类型；mediahub 系列通常直接取第一项 | 先标题和年份匹配，再尝试豆瓣原名，最后仍可能退到 TMDB 第一项 |
| 请求量 | ysbd 与 mediahub 系列都有逐条 TMDB 搜索的 N+1 请求 | 直接 Douban ID 的路径较轻；片单/TMDB 版同样存在逐条 TMDB 搜索 |
| 缓存声明 | mediahub、repair、ALL 为 1 小时；ysbd 豆瓣模块未声明 cacheDuration | 1 小时、12 小时、24 小时或 7 天，按数据变化频率区分 |
| 隐私 | 不要求用户 Cookie，但 ysbd 内置第三方 key | Cookie 会作为组件参数保存并发送；源码还会把部分接口响应写入日志 |
| 风控 | 普通 rexxar 或 search_subjects；repair/ALL 伪造随机 bid | 同样依赖非正式 rexxar/search 接口、UA 和 Referer，没有官方稳定性保证 |

### 优劣结论

Makka 的优点：

1. 无需登录，适合做首页公开榜单。
2. UI 简单，13 个固定分类对普通用户容易理解。
3. 返回 TMDB 项目后，Forward/SenPlayer 的详情和播放链路通常更统一。

Makka 的不足：

1. 四个当前组件大量重复同一段豆瓣抓取与 TMDB 映射代码。
2. 不支持个人“我看”、个性推荐、自定义 Doulist、影人作品和复杂偏好筛选。
3. N+1 TMDB 请求增加尾延迟；mediahub 的“TMDB 第一项”策略容易同名误配。
4. 两个发布目录版本号与文件 metadata 不一致。
5. ysbd 把第三方 API key 写入客户端源码，不适合直接借鉴。

Huang 的优点：

1. 豆瓣功能完整度明显更高，个人数据、片单、偏好、影人和轮播都覆盖。
2. 对缓存周期有更细分的设计。
3. 直接返回 Douban ID 的路径不必为每个条目都做 TMDB 搜索。

Huang 的不足：

1. Cookie 需要由用户抓包并保存，隐私和使用门槛更高。
2. 依赖非官方移动端接口与 HTML/AJAX 行为，可能随豆瓣风控变化失效。
3. 日志中打印接口响应，个人列表或推荐内容可能进入宿主日志。
4. TMDB 版片单仍可能在精确匹配失败后回退第一项，存在错误映射。
5. 两个影人模块复用同一个函数，只是参数 UI 不同，metadata 很大，维护成本较高。

## 三、对我们仓库的建议

如果后续新增豆瓣组件，建议组合两边的长处：

1. 第一版先做无需 Cookie 的公开榜单、Doulist/subject collection URL 和 TMDB 严格映射。
2. 映射必须校验规范化标题、年份、媒体类型，不能直接取 TMDB 第一项；匹配失败时保留 `type: douban` 或明确丢弃，不能伪装成无效 TMDB 项。
3. 对同页 TMDB 查询设置有限并发、结果缓存和 negative cache，避免 20 路同时请求。
4. 个人“我看”和 Cookie 推荐拆成独立可选模块，明确隐私提示，不记录响应正文。
5. 不内置 API key，不复制随机 Cookie 伪装逻辑。
6. 先写公开流程回归测试，再加入组件目录。
