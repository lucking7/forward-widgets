# 弹幕源策略

> 数据快照：2026-08-09。公共实例配置和性能会变化，发布后应定期复测。

## 为什么默认精简为三个实例

Lily 的公开 `SOURCE_ORDER` 当时列出：

```text
360, vod, tmdb, douban, tencent, youku, iqiyi, imgo, bilibili, migu,
sohu, leshi, xigua, maiduidui, renren, hanjutv, bahamut, dandan,
animeko, custom
```

其中 `custom` 的 URL 为空，因此最多按 19 个可调用名称理解。`MERGE_SOURCE_PAIRS` 为空，这些名称主要扩展搜索候选，并不表示每集会合并 20 路弹幕。

公开配置的名称重叠如下：

| 实例 | 启用项数 | 与 Lily 交集 | Lily 是否包含其全部名称 |
|---|---:|---:|---:|
| Alpha | 12 | 12/12 | 是 |
| 炊烟 | 7 | 7/7 | 是 |
| 稳健 | 9 | 9/9 | 是 |
| 乔蒂深 1 | 8 | 8/8 | 是 |

因此默认同时启用五个实例会大量重复请求爱优腾芒哔、360 和 Renren 等采集链路。精简后的职责是：

- Alpha 保留快速和宽覆盖。
- 炊烟保留独立实例级容灾，以及较好的 HTTPS、匹配和弹幕质量表现。
- Lily 负责补充 `tmdb`、`sohu`、`leshi`、`xigua`、`maiduidui` 等路径，并只在需要时进入慢速路径。
- 稳健与乔蒂深不再默认内置。其差异化的 `vod`、`douban` 已由 Lily 覆盖，保留它们带来的主要是重复实例容灾，不足以抵消默认并发成本。

相同 source 名称不等于相同最终弹幕。实例版本、Cookie、缓存、过滤、出口和数量上限仍可能不同，所以这是默认成本与收益的取舍，不是断言两个实例完全等价。

## Lily 与 AI

Lily 当前基于 LogVar 兼容服务。AI 只在普通搜索得到结构化候选后选择候选索引，不负责抓取、生成或审核弹幕。候选选择失败时仍走传统规则回退。

本组件暂不在客户端加入 AI，原因是 Forward JavaScript 无法安全保存服务端 API key，而且模型调用会增加延迟和隐私面。我们借鉴的是它的边界设计：封闭候选集、结构化输出、结果校验和确定性 fallback。

## 证据

- [Lily 首页](https://danmu.longemby.com/lilyemby)
- [Lily 动态脱敏配置](https://danmu.longemby.com/lilyemby/api/config)
- [LogVar 源码快照](https://github.com/huangxd-/danmu_api/tree/72e345e840343491804f2bdbbf70843e6ab17f7e)
- [LogVar 采集源与平台说明](https://github.com/huangxd-/danmu_api/blob/72e345e840343491804f2bdbbf70843e6ab17f7e/README.md#L583-L607)
- [LogVar AI 匹配实现](https://github.com/huangxd-/danmu_api/blob/72e345e840343491804f2bdbbf70843e6ab17f7e/danmu_api/apis/dandan-api.js#L1097-L1196)
- [Alpha 动态配置](http://nl.jc.cd/87654321/api/config)
- [炊烟动态配置](https://danmu.cynn.top/cynnsq/api/config)
- [稳健动态配置](https://dandan.wenjian.de/wenjian/api/config)
- [乔蒂深 1 动态配置](https://logvardm.278612356.xyz/steven/api/config)
