# Forward 模块/组件

一个面向 Forward 的模块与组件仓库。当前提供“弹幕优选”和“豆瓣全景”，后续可以继续增加影视榜单、工具和其他 Widget。

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

单文件提供 7 个功能模块，完整覆盖当前 Makka 豆瓣子功能与 Huang `douban.js` 的公共功能语义：

- 21 个公开入口，包含 13 个核心 collection、补充 collection 和实时首页精选。Makka 的 4 个 tag 源只作为对应榜单的自动 fallback，不重复显示。
- 自定义 Doulist 与 subject collection。
- 电影、剧集、综艺使用白名单校验后的合法组合做快捷推荐，完整偏好筛选独立负责无筛选和高级组合，两者不重复。
- 想看、在看、看过、有限扫描的随机想看。
- Cookie 个性化推荐，以及影人 ID、URL 或唯一精确姓名的作品查询。姓名查询依赖豆瓣旧 suggestion 接口，建议优先使用 ID/URL。
- 首页精选直接读取 4 个豆瓣实时榜单，不依赖第三方 Gist。

所有豆瓣条目都会尝试严格 TMDB 匹配。只有媒体类型、标题、年份和唯一性证据足够时才返回 TMDB，证据不足时保留为 Douban 条目，不按搜索第一项猜测。TMDB 映射最多 4 并发，公开映射带过期缓存。

详细参数、匹配规则和隐私边界见 [豆瓣全景说明](widgets/douban/douban-discovery.md)。

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
npm run test:flow
npm run test:live
npm run test:runtime
npm run check
```

项目使用 Node.js 内置测试运行器，没有运行时 npm 依赖。`test:flow` 按官方三段流程离线回测，`test:runtime` 在不注入 Node timer 的严格 Forward VM 中执行同一流程。`test:live` 会请求当前默认第三方实例，只用于手动 smoke test，不纳入默认测试。

## License

[MIT](LICENSE)
