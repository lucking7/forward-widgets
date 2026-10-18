# Forward 模块/组件

一个面向 Forward 的模块与组件仓库。当前提供“弹幕优选”“豆瓣全景”和“TMDB 影视趋势榜”，后续可以继续增加影视榜单、工具和其他 Widget。

## 安装

在 Forward 中导入组件集合：

```text
https://raw.githubusercontent.com/lucking7/forward-widgets/main/widgets.fwd
```

也可以只导入弹幕优选：

```text
https://raw.githubusercontent.com/lucking7/forward-widgets/main/widgets/danmu/danmu-select.js
```

或只导入豆瓣全景：

```text
https://raw.githubusercontent.com/lucking7/forward-widgets/main/widgets/douban/douban-discovery.js
```

TMDB 影视趋势榜组件地址：

```text
https://raw.githubusercontent.com/lucking7/forward-widgets/main/widgets/trending/tmdb-trending.js
```

要求 Forward `>= 0.0.2`。

## 弹幕优选

默认启用三个互补实例，不把配置位置当成固定优先级：

| 角色 | 实例 | 用途 |
|---|---|---|
| 快速层 | Alpha | 覆盖广、响应快 |
| 快速层 | 炊烟 | HTTPS、质量与稳定性补充 |
| 深度层 | Lily | 快速层没有准确结果或质量不足时兜底 |

匹配先做标题、季度、媒体类型等硬规则评分。弹幕选择会比较有效率、重复度、低价值内容比例、时间轴覆盖和数量饱和度，不采用“哪个先返回就用哪个”。Lily 不与快速层常态并发，避免把其长尾延迟带入每次请求。

默认策略可以在组件设置中调整：

- `minConfidence` 控制匹配准确率门槛。
- `minQuality` 控制何时启用 Lily 深度兜底。
- `fastTimeout` 控制是否继续启动快速层后续步骤。
- `requestTimeout` 控制是否继续启动深度回退等后续步骤；已发出的请求由 Forward 原生网络层负责超时。
- `quality` 为推荐策略，`fallback` 和 `merge` 用于兼容既有使用方式。

详细参数与行为见 [弹幕优选说明](widgets/danmu/danmu-select.md)，源精简依据见 [弹幕源策略](docs/source-strategy.md)。

## 豆瓣全景

单文件按用途提供清晰入口，并保留原有配置所用的模块 ID 和函数：

- **豆瓣一周口碑**：电影、华语剧集、全球剧集、国内综艺、全球综艺五榜。
- **豆瓣电影**：全部、近期热门、高分经典、冷门佳作、地区佳作、分类题材、年度榜单；接入 26 个题材的 241 个原生榜及 2014–2025 年的 108 个年度榜。
- **豆瓣电视**：全部、高分经典、近期热门、冷门佳作、分类题材、年度榜单；接入 56 个地区/题材原生榜及 2014–2025 年的 82 个年度榜，保留动画、纪录片和综艺筛选。
- **豆瓣实时热门**：书影音综合榜、电影榜、电视榜。图书和音乐作为信息条目展示，不当作电影查询 TMDB。
- 保留自定义片单、分类推荐、偏好探索、我看、Cookie 个性推荐和影人作品，旧首页的模块 ID 及参数仍可继续使用。

电影和电视的原生榜来自第一方 `category_tabs`，直接读取 `subject_collection`，保留榜单成员与顺序。自由筛选继续保留，界面按电影、剧集/综艺显示有效条件，并过滤广告卡片。完整接口范围与验证边界见 [接口审计](docs/douban-interface-audit-2026-10-18.md)。

影视匹配保留媒体类型、标题、年份和唯一性约束，并在需要时补充豆瓣详情与原名。季度剧集只有在 TMDB 对应季号及该季年份也一致时才匹配到主剧，使用 `season` 保留不同季度，显示该季首播日期。无法安全匹配时显示豆瓣详情，不按搜索第一项猜测。

1.2.1 补齐响应结构校验并统一重复规则，验证证据见 [交付记录](docs/douban-followups-2026-10-19.md)。

详细参数、匹配规则和隐私边界见 [豆瓣全景说明](widgets/douban/douban-discovery.md)。

## TMDB 影视趋势榜

提供电影日榜、电影周榜、电视日榜和电视周榜，分别调用 TMDB 官方短周期趋势端点。该组件直接使用 Forward 内置 `Widget.tmdb`，不需要 Vercel、自建 API 或用户 API key。

榜单表示 TMDB 全球趋势，不是 IMDb 排名，也不是 Netflix 等平台披露的播放量。每个条目按照 Forward 约定输出数值 `id`、`type: "tmdb"`、`mediaType` 和数值 `tmdbId`。详细说明见 [TMDB 影视趋势榜](widgets/trending/tmdb-trending.md)。

## 隐私与可用性

- Alpha 当前使用明文 HTTP。按用户要求默认启用，但请求标题、文件名等匹配信息可能被链路观察或篡改，也可能受客户端网络安全策略限制。
- 自动匹配只在调用方明确提供时发送 `fileHash`、`fileSize` 和时长，不会伪造文件哈希。
- 公共实例由第三方运营，地址、限流、采集配置和可用性都可能变化。本仓库不控制这些服务，也不承诺持续可用。
- 不要把私有 API key 或个人服务 token 提交到组件源码。
- 豆瓣个性化 Cookie 只发送到 `m.douban.com`，不写日志、不缓存，也不会传给 TMDB。

## 开发

```bash
npm test
npm run test:douban
npm run test:douban:live
node audit-douban-interfaces.cjs /tmp/douban-interface-results.json
npm run test:trending
npm run test:flow
npm run test:live
npm run test:runtime
npm run check
```

项目使用 Node.js 内置测试运行器，没有运行时 npm 依赖。`test:flow` 按官方三段流程离线回测，`test:runtime` 在不注入 Node timer 的严格 Forward VM 中执行同一流程。`test:live` 会请求当前默认第三方实例，只用于手动 smoke test，不纳入默认测试。

## License

[MIT](LICENSE)
