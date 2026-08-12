# TMDB、巴哈姆特与加权服务部署补充研究

日期：2026-08-10

## 结论

1. TMDB 可以为 movie、TV series、TV episode 返回 IMDb `tt...` external ID，但 TMDB Trending、Popular、Top Rated 和评分仍是 TMDB 自己的数据，不是 IMDb 排名。Makka 的“IMDb 热榜”固定源码只调用 TMDB，并输出 `type: "tmdb"`，属于名称误标。
2. 巴哈姆特 `p=anime&t=2` 是“动画人气排行”，默认范围为半年内播映作品，只公开 Top 20。“人气”来自会员想看/收藏追踪的存量信号，不是播放量，也没有日榜或周榜时间窗。它只能作为台湾繁中社区的辅助信号。
3. Vercel Pro 适合部署小时级采集与加权服务，推荐 Cron + Blob 条件写入 + CDN API。Vercel Hobby Cron 最快每天一次，不适合小时采样。免费优先可使用 GitHub Actions + Pages；长期公共服务可考虑 Cloudflare Workers Paid + D1 + R2。

## TMDB 与 IMDb

- Movie detail 和 movie external IDs 可返回 `imdb_id`。
- TV series 需调用 external IDs 或 `append_to_response=external_ids`。
- TV episode external IDs 支持 IMDb ID。
- TV season external IDs 不支持 IMDb ID。
- `/find/{external_id}?external_source=imdb_id` 可用 IMDb ID 反查 movie、TV、episode、person，但不支持 season。

External ID 只解决跨库身份，不能改变榜单来源。TMDB 官方对 Trending/Popularity 的说明只涉及 TMDB 内部浏览、投票、收藏、watchlist、发布日期等信号，没有 IMDb 排名成分。

来源：[TMDB External IDs](https://developer.themoviedb.org/reference/movie-external-ids)、[TMDB Find](https://developer.themoviedb.org/reference/find-by-id)、[TMDB Popularity and Trending](https://developer.themoviedb.org/docs/popularity-and-trending)、[Makka 固定源码](https://github.com/MakkaPakka518/FW/blob/688c974403a3042f171bc5ef8713c8023542e12b/widgets/normal/imdb.js)

## 巴哈姆特动画人气排行

- 页面：<https://acg.gamer.com.tw/billboard.php?p=anime&t=2>
- `t=2` 为人气排行，默认 `period=halfyear`，可切换 `period=all`。
- 只有 Top 20，无有效分页。
- 第一方脚本显示，人气与会员“想看/收藏至游戏动漫柜”动作关联。
- 官方未公布完整榜单重排频率，也没有发现公开 JSON API；目前只能低频解析服务器端 HTML。
- 匿名访问可用，robots 当前允许，但 Cloudflare bot management、HTML 结构变化和转载条款都是运行风险。

建议只保存巴哈 ID、排名、人气数、时间和来源回链，不镜像图片、简介或整页内容。跨库映射优先使用日文原名、播映日期和季数；映射到 TMDB TV 时必须额外保留 `seasonNumber`。

来源：[巴哈榜单](https://acg.gamer.com.tw/billboard.php?p=anime&t=2)、[巴哈第一方脚本](https://i2.bahamut.com.tw/js/home_acg.js?v=1784512882)、[robots.txt](https://acg.gamer.com.tw/robots.txt)、[版权声明](https://user.gamer.com.tw/help/detail.php?sn=280&top=1)

## 来源内加权与来源融合

AniList 按小时采样；巴哈按内容变化或原生周期形成有效桶，相同 `contentHash` 不得每小时重复累计。

```text
rankPercentile = (listSize - rank + 1) / listSize
timeWeight     = 2 ^ (-ageHours / halfLife)

sourceScore =
  0.75 * weightedRankMean
+ 0.15 * weightedPresence
+ 0.10 * boundedMomentum
```

- 日榜：24 小时窗口，8 小时半衰期。
- 周榜：168 小时窗口，48 小时半衰期。
- AniList 为主源；巴哈初始权重建议日榜 25%、周榜 20%。
- 巴哈还可使用 `positiveDelta24h/7d = max(0, popularityNow - popularityBefore)`，在当次 Top 20 内做 percentile normalization。
- 榜外是截断数据，不得当作 0；抓取失败也不得把全部作品记为落榜。

## Vercel 部署判断

### Vercel Pro

推荐架构：

```text
Vercel Cron -> collector -> immutable Blob version
             -> ETag/ifMatch 更新 current pointer
             -> cached API -> Forward
```

- Cron 可分钟级运行，但属于 best-effort，可能漏跑、重复或重叠，失败不自动重试。
- 每个任务必须使用稳定 `runKey` 幂等执行。
- 先写不可变版本，最后以 ETag 条件更新指针，避免客户端读到半成品。
- 当前数据量先用 Blob；多 writer 需要锁时再加 Upstash，需要任意历史查询和回测时再用 Neon。

### Vercel Hobby

Hobby Cron 最快每天一次，且触发时间可能在指定小时内漂移，不适合 AniList 小时级采样。可以只部署读取 API，让 GitHub Actions 或外部调度器负责采集，但混合架构通常不如直接使用 Actions + Pages。

### 替代方案

- 免费、个人维护：GitHub Actions + Pages。
- 已有 Vercel Pro：Vercel Cron + Blob。
- 长期公共服务和结构化历史：Cloudflare Workers Paid + D1 + R2。

来源：[Vercel Cron pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing)、[Managing Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs)、[Vercel Blob](https://vercel.com/docs/vercel-blob)、[Vercel CDN Cache](https://vercel.com/docs/caching/cdn-cache)、[Cloudflare Cron](https://developers.cloudflare.com/workers/configuration/cron-triggers/)、[R2 consistency](https://developers.cloudflare.com/r2/reference/consistency/)
