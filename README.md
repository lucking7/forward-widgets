# Forward 模块/组件

一个面向 Forward 的模块与组件仓库。当前首个组件是“弹幕优选”，后续可以继续增加影视榜单、工具和其他 Widget。

## 安装

在 Forward 中导入组件集合：

```text
https://raw.githubusercontent.com/lucking7/forward-widgets/main/widgets.fwd
```

也可以只导入弹幕优选：

```text
https://raw.githubusercontent.com/lucking7/forward-widgets/main/widgets/danmu/danmu-select.js
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

## 隐私与可用性

- Alpha 当前使用明文 HTTP。按用户要求默认启用，但请求标题、文件名等匹配信息可能被链路观察或篡改，也可能受客户端网络安全策略限制。
- 自动匹配只在调用方明确提供时发送 `fileHash`、`fileSize` 和时长，不会伪造文件哈希。
- 公共实例由第三方运营，地址、限流、采集配置和可用性都可能变化。本仓库不控制这些服务，也不承诺持续可用。
- 不要把私有 API key 或个人服务 token 提交到组件源码。

## 开发

```bash
npm test
npm run test:flow
npm run test:live
npm run test:runtime
npm run check
```

项目使用 Node.js 内置测试运行器，没有运行时 npm 依赖。`test:flow` 按官方三段流程离线回测，`test:runtime` 在不注入 Node timer 的严格 Forward VM 中执行同一流程。`test:live` 会请求当前默认第三方实例，只用于手动 smoke test，不纳入默认测试。

## License

[MIT](LICENSE)
