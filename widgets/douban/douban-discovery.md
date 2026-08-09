# 豆瓣全景

`douban-discovery.js` 是单文件 Forward 视频组件，版本 `1.0.0`，要求 Forward `>= 0.0.2`。

## 功能

| 模块 | 能力 |
| --- | --- |
| 豆瓣公开榜单 | Makka 的 13 个 collection、Huang 的补充 collection，以及 12 部实时首页精选；4 个 tag 源仅作自动 fallback |
| 自定义豆瓣片单 | HTTPS Doulist、subject collection，支持分页 |
| 豆瓣分类推荐 | 电影、剧集、综艺的合法快捷组合，不允许媒体类型和子类型错配 |
| 豆瓣偏好探索 | 形式、类型、地区、年份、平台、标签、最低评分、排序和 offset |
| 豆瓣我看 | 想看、在看、看过，以及最多扫描 5 页后抽取 9 项的随机想看 |
| 豆瓣个性推荐 | 使用用户 Cookie 获取电影或电视推荐 |
| 豆瓣影人作品 | 影人 ID、豆瓣 URL，或上游 suggestion 可用时的唯一精确姓名 |

首页精选从 `movie_hot_gaia`、`tv_hot`、`show_hot`、`tv_animation` 各取 3 项，不读取 Huang 作者维护的第三方 Gist。两套影人 UI 合并为一个输入入口，Makka 重复的 tag 页面隐藏为对应 collection 的空结果/失败 fallback。自定义片单只保留未出现在公开榜单中的 Doulist 示例。快捷分类推荐不再提供与偏好探索相同的无筛选 `all` 查询。

## 严格 TMDB 匹配

- 媒体类型必须一致。
- 主标题或原名保守规范化后必须完全相等，不删除季数、续集编号、前传、剧场版等身份信息。
- 两边都有年份时默认必须相等。只有主标题和原名都精确、候选唯一时才允许相差 1 年。
- 同证据候选超过 1 个时视为歧义，不按 popularity、完成顺序或搜索第一项猜测。
- 匹配失败、歧义或 TMDB 单项故障时，返回 `type: "douban"` 的原条目，不丢数据。
- TMDB 搜索最多 4 并发并保持豆瓣原顺序。公开映射成功缓存 30 天，确定未命中缓存 24 小时。

## 隐私与安全

- 脚本不内置 TMDB key，统一使用 Forward 的 `Widget.tmdb`。
- 个性化 Cookie 必填，只发送到 `https://m.douban.com`，禁用自动重定向，不写日志、不写存储、不发送给 TMDB。
- “豆瓣我看”和个性化模块均不缓存个人列表或对应的 TMDB 映射。
- 自定义片单只接受 `www.douban.com`、`movie.douban.com`、`m.douban.com` 的 HTTPS Doulist/collection URL。脚本只提取 ID，再构造固定 API 地址。
- 不伪造随机 `bid`，不记录响应正文，不包含 API key 或私有 token。

## 测试

```bash
npm run test:douban
npm run test:douban:live
npm test
npm run check
```

测试从 `WidgetMetadata` 和 7 个公开函数进入，在不提供 Node timer、`fetch`、`require` 或 `process` 的严格 VM 中运行。
`test:douban:live` 是不使用 Cookie 的手动 smoke test，会轻量请求当前公开榜单、片单、推荐、偏好、影人作品和首页精选，不纳入默认回归测试。

豆瓣 `rexxar`、`j/search_subjects` 和 suggestion 均为非正式 Web 接口，字段、风控和访问权限可能变化。源级 401、403、429 或坏 JSON 会明确报错，不会伪装成空列表或文本视频项。
2026-08-10 live smoke 中旧 `movie.douban.com/j/subject_suggest` 对“周星驰”返回空数组，因此影人 ID/URL 是当前可靠入口，姓名搜索会在无法得到唯一精确结果时明确报错。
