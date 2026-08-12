# TMDB 影视趋势榜

该组件直接使用 Forward 内置 `Widget.tmdb`，提供四个明确的数据入口：

- 电影日榜：TMDB `/trending/movie/day`
- 电影周榜：TMDB `/trending/movie/week`
- 电视日榜：TMDB `/trending/tv/day`
- 电视周榜：TMDB `/trending/tv/week`

组件包含两个 Forward 模块：“TMDB 电影趋势榜”和“TMDB 电视趋势榜”。每个模块都可以在参数中切换日榜或周榜，并支持标准页码。

## 数据语义

这些榜单反映 TMDB 平台根据短时间窗口计算的全球趋势，不是 IMDb、Netflix 或地区流媒体平台的播放量。组件不会用 TMDB `popular` 冒充日榜或周榜。

## 输出

每个条目直接输出 Forward 标准 TMDB 类型：

```js
{
  id: 101,
  tmdbId: 101,
  type: "tmdb",
  mediaType: "movie",
  title: "#1 电影名称"
}
```

电影和电视是两个独立模块，因此按照 Forward TMDB 约定使用数值 `id`，并通过 `mediaType` 区分媒体类型。组件同时保留上映日期、海报、背景图、评分和简介。

## 运行时

- 不需要自建 API、Vercel、Cookie 或用户 API key。
- 使用 Forward 自带的 TMDB 访问能力。
- 缓存时间为 1 小时。
- 不使用 `setTimeout`、`URL` 等 Forward 严格运行时未保证提供的全局对象。
