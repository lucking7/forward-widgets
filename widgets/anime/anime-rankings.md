# 动漫加权榜

该组件读取本仓库随附的 Vercel 榜单 API，将 AniList 小时趋势与巴哈姆特“想看”榜信号组合成实时、日度和周度榜单。

## 使用

1. 将仓库部署到 Vercel，并连接一个 private Vercel Blob store。
2. 设置随机且不可公开的 `CRON_SECRET`。
3. 在 Forward 导入 `widgets/anime/anime-rankings.js`。
4. 在组件参数 `apiBase` 中填写部署后的 HTTPS 根地址，例如 `https://example.vercel.app`。

本仓库没有写入未知或尚未部署的默认地址。Vercel 部署完成后，可以再把稳定地址设为组件默认值。

## 榜单语义

- 实时榜直接反映最新一轮 AniList `TRENDING_DESC`，不把巴哈半年榜伪装成实时信号。
- 日榜读取最近 24 个小时桶，半衰期 8 小时。周榜读取最近 168 个小时桶，半衰期 48 小时。
- 每个来源内部按 `75% 排名 + 15% 持续出现 + 10% 动量` 评分。
- 日榜来源权重为 AniList 75%、巴哈 25%，周榜为 AniList 80%、巴哈 20%。只有严格匹配到唯一 AniList 条目的巴哈数据才参与加权。
- 巴哈最多每 6 小时采样一次，并按语义字段 `contentHash` 去重，相同页面不会因定时任务重复执行而获得额外权重。
- `partial` 表示历史小时桶仍未积满，`stale` 表示 AniList 主源超过 3 小时没有成功样本。

## Forward 映射

组件每页读取 20 条，最多 4 并发调用 Forward 内置 `Widget.tmdb`。只有标题、媒体类型、年份和唯一性证据通过时才输出 TMDB 条目。电影与电视混合列表使用 Forward 约定的 `movie.<id>`、`tv.<id>` 条目 ID，续作季度还会验证对应 TMDB season 的首播年份，并同时保留 `season`、`seasonNumber`。歧义或无匹配条目会被省略，不按第一条搜索结果猜测。

组件不使用 `setTimeout`、`URL` 等 Forward 严格运行时未保证提供的全局对象。

## API

- `GET /api/v1/rankings/anime/realtime`
- `GET /api/v1/rankings/anime/day`
- `GET /api/v1/rankings/anime/week`
- `GET /api/v1/rankings/anime/meta`
- `GET /api/cron/anime-rankings`，仅供携带正确 Bearer token 的 Vercel Cron 调用

公开响应包含 `schemaVersion`、`modelVersion`、`window`、`generatedAt`、`sampledThrough`、`coverage`、`partial`、`stale`、`sources` 和 `items`。
