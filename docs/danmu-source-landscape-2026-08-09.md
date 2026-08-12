# Huang、Lily 与本项目的弹幕来源架构

> 快照日期：2026-08-10（Asia/Shanghai）。Huang 当前 `main` 仍固定到 commit `72e345e840343491804f2bdbbf70843e6ab17f7e`；Lily 部署配置来自公开、无需管理权限且已脱敏的 `/api/config`，属于动态快照。本文不记录任何 token、Cookie 或 API key。

## 结论

1. `huangxd-/ForwardWidgets/widgets/danmu_auto.js` **不是远程弹幕服务器**。它是把 `huangxd-/danmu_api` 的采集 adapter、匹配、合并、缓存等核心代码打进 Forward 的“嵌入式采集客户端 bundle”。它在 Forward 内直接访问上游网站，不监听端口，也不向其他客户端提供 HTTP 服务。
2. `huangxd-/danmu_api` 才是可部署的弹幕 API 服务器。它提供 DandanPlay-compatible 搜索、详情、匹配和弹幕 HTTP 路由，并复用与 `danmu_auto.js` 相同的 adapter 核心。
3. Huang 另有一个 `danmu_api.js`，这才是“只调用外部服务器”的薄 Forward 包装器。它要求用户填写 `server`，再请求该服务器的 `/api/v2/...`。
4. 当前 Huang `1.20.5` 源码支持 22 个 `SOURCE_ORDER` 调度键；Lily 公开实例报告 `1.17.0`，配置列出 20 个键。集合上 Lily 是 Huang 当前支持集的子集，Huang 比 Lily 多 `aiyifan`、`hongguo`。
5. 不能据此说 Huang 默认覆盖 22 源。Huang bundle 的默认顺序只有 `douban,360,renren,hanjutv`；22 是“可配置支持集”。Lily 配置尝试调度 20 键，但 `custom` URL 为空，故最多有 19 个内置/已配置路径可实际工作。
6. 本项目的 Alpha、Cynn、Lily 都只是外部 Dandan-compatible server。我们的代码不包含它们的采集 adapter，也不能把三台实例的名称计作三个独立内容平台。

## 三种形态，不能混为一谈

| 形态 | 文件/部署 | 上游采集在哪里发生 | 是否对外提供 HTTP API |
| --- | --- | --- | --- |
| 可部署服务器 | `huangxd-/danmu_api` | 服务器进程/函数内部 | 是 |
| 嵌入式采集 bundle | `danmu_auto.js` | Forward App 内部 | 否 |
| 外部服务器包装器 | Huang `danmu_api.js`、我们的 `danmu-select.js` | 所填写的远程服务器 | 否 |

`danmu_api` 的 Worker 明确注册搜索等 HTTP 路由（[worker.js L319-L336](https://github.com/huangxd-/danmu_api/blob/72e345e840343491804f2bdbbf70843e6ab17f7e/danmu_api/worker.js#L319-L336)）。相反，Forward 构建以 `forward/forward-widget.js` 为入口，用 esbuild 打包并把 HTTP 调用替换为 `Widget.http`（[build-forward-widget.js L108-L120](https://github.com/huangxd-/danmu_api/blob/72e345e840343491804f2bdbbf70843e6ab17f7e/build-forward-widget.js#L108-L120)、[L145-L183](https://github.com/huangxd-/danmu_api/blob/72e345e840343491804f2bdbbf70843e6ab17f7e/build-forward-widget.js#L145-L183)）。发布的 `danmu_auto.js` 第一行也声明它由 `danmu_api` 一键导出（[danmu_auto.js L1](https://github.com/huangxd-/ForwardWidgets/blob/8b33652bdabec8440d361872a29241decdb83323/widgets/danmu_auto.js#L1)）。

Huang 的薄包装 `danmu_api.js` 则只声明远程 `server` 参数并请求 `/api/v2/search/anime`（[danmu_api.js L15-L35](https://github.com/huangxd-/ForwardWidgets/blob/8b33652bdabec8440d361872a29241decdb83323/widgets/danmu_api.js#L15-L35)、[L64-L84](https://github.com/huangxd-/ForwardWidgets/blob/8b33652bdabec8440d361872a29241decdb83323/widgets/danmu_api.js#L64-L84)）。

## Huang 当前支持集

固定源码：`danmu_api@72e345e840343491804f2bdbbf70843e6ab17f7e`、`ForwardWidgets@8b33652bdabec8440d361872a29241decdb83323`，两处版本均为 `1.20.5`。源码允许集见 [envs.js L16-L19](https://github.com/huangxd-/danmu_api/blob/72e345e840343491804f2bdbbf70843e6ab17f7e/danmu_api/configs/envs.js#L16-L19)，发布 bundle 中也保留相同数组（[danmu_auto.js L6107-L6110](https://github.com/huangxd-/ForwardWidgets/blob/8b33652bdabec8440d361872a29241decdb83323/widgets/danmu_auto.js#L6107-L6110)）。

完整 22 键：

`360, vod, tmdb, douban, tencent, youku, iqiyi, imgo, bilibili, migu, renren, hanjutv, sohu, leshi, xigua, maiduidui, aiyifan, hongguo, dandan, bahamut, animeko, custom`

这些不是 22 个彼此独立的“弹幕内容池”：

- `360`、`vod`、`tmdb`、`douban` 主要承担检索和播放链接解析。比如 Douban adapter 会把供应商链接继续交给腾讯、爱奇艺、优酷、Bilibili、咪咕 adapter（[douban.js L9-L16](https://github.com/huangxd-/danmu_api/blob/72e345e840343491804f2bdbbf70843e6ab17f7e/danmu_api/sources/douban.js#L9-L16)、[L210-L259](https://github.com/huangxd-/danmu_api/blob/72e345e840343491804f2bdbbf70843e6ab17f7e/danmu_api/sources/douban.js#L210-L259)）。
- `tencent`、`youku`、`iqiyi`、`imgo`、`bilibili`、`migu`、`renren`、`hanjutv`、`sohu`、`leshi`、`xigua`、`maiduidui`、`aiyifan`、`hongguo`、`bahamut`、`animeko` 是站点/社区 adapter。
- `dandan` 经代理访问 DandanPlay-compatible 数据，并可结合平台 adapter；其搜索和详情请求见 [dandan.js L60-L75](https://github.com/huangxd-/danmu_api/blob/72e345e840343491804f2bdbbf70843e6ab17f7e/danmu_api/sources/dandan.js#L60-L75)、[L220-L229](https://github.com/huangxd-/danmu_api/blob/72e345e840343491804f2bdbbf70843e6ab17f7e/danmu_api/sources/dandan.js#L220-L229)。
- `custom` 是另一个 Dandan-compatible 服务器入口，搜索、详情、弹幕均转发到配置 URL（[custom.js L11-L19](https://github.com/huangxd-/danmu_api/blob/72e345e840343491804f2bdbbf70843e6ab17f7e/danmu_api/sources/custom.js#L11-L19)、[L48-L55](https://github.com/huangxd-/danmu_api/blob/72e345e840343491804f2bdbbf70843e6ab17f7e/danmu_api/sources/custom.js#L48-L55)、[L140-L149](https://github.com/huangxd-/danmu_api/blob/72e345e840343491804f2bdbbf70843e6ab17f7e/danmu_api/sources/custom.js#L140-L149)）。
- `otherServer` 不是第 23 个 `SOURCE_ORDER` 键，只是在无法识别链接时调用另一类第三方接口的兜底（[other.js L8-L21](https://github.com/huangxd-/danmu_api/blob/72e345e840343491804f2bdbbf70843e6ab17f7e/danmu_api/sources/other.js#L8-L21)）。

Huang 比 Lily 多出的两个键不是单纯标题映射，而是直接产出带时间轴弹幕的原生 adapter：

- `aiyifan` 直接调用爱壹帆搜索、播放列表、视频信息和 `getBarrage` 弹幕接口（[aiyifan.js L24-L34](https://github.com/huangxd-/danmu_api/blob/72e345e840343491804f2bdbbf70843e6ab17f7e/danmu_api/sources/aiyifan.js#L24-L34)、[L210-L237](https://github.com/huangxd-/danmu_api/blob/72e345e840343491804f2bdbbf70843e6ab17f7e/danmu_api/sources/aiyifan.js#L210-L237)），并把 `second/content/color/good` 转成 Dandan 格式（[L497-L506](https://github.com/huangxd-/danmu_api/blob/72e345e840343491804f2bdbbf70843e6ab17f7e/danmu_api/sources/aiyifan.js#L497-L506)）。它能补充爱壹帆站内影视弹幕，是一般影视覆盖的有效增量。
- `hongguo` 直连红果 `fqnovel.com` API（[hongguo.js L21-L29](https://github.com/huangxd-/danmu_api/blob/72e345e840343491804f2bdbbf70843e6ab17f7e/danmu_api/sources/hongguo.js#L21-L29)），搜索短剧、拉取分集并请求带时间窗的评论接口（[L757-L828](https://github.com/huangxd-/danmu_api/blob/72e345e840343491804f2bdbbf70843e6ab17f7e/danmu_api/sources/hongguo.js#L757-L828)、[L956-L994](https://github.com/huangxd-/danmu_api/blob/72e345e840343491804f2bdbbf70843e6ab17f7e/danmu_api/sources/hongguo.js#L956-L994)）。输出明确标记为“短剧”（[L935-L947](https://github.com/huangxd-/danmu_api/blob/72e345e840343491804f2bdbbf70843e6ab17f7e/danmu_api/sources/hongguo.js#L935-L947)），因此主要增加中国短剧覆盖，不能外推为电影或欧美长剧覆盖提升。

两者都依赖上游非公开接口、签名或模拟客户端参数，属于有真实内容增量但稳定性受上游变更和风控影响的来源；且都不在 Huang 默认四源中，必须显式加入 `SOURCE_ORDER` 才会参与调度。

Huang bundle 的 UI 虽列出全部可选键，却明确写着默认只有 `douban,360,renren,hanjutv`（[danmu_auto.js L20432-L20465](https://github.com/huangxd-/ForwardWidgets/blob/8b33652bdabec8440d361872a29241decdb83323/widgets/danmu_auto.js#L20432-L20465)；服务源码默认值同样见 [envs.js L152-L162](https://github.com/huangxd-/danmu_api/blob/72e345e840343491804f2bdbbf70843e6ab17f7e/danmu_api/configs/envs.js#L152-L162)）。

## Lily 实例快照

公开脱敏配置端点：<https://danmu.longemby.com/api/config>。2026-08-10 读取结果：

- 报告版本：`1.17.0`。
- `SOURCE_ORDER` 共 20 键：`360, vod, tmdb, douban, tencent, youku, iqiyi, imgo, bilibili, migu, sohu, leshi, xigua, maiduidui, renren, hanjutv, bahamut, dandan, animeko, custom`。
- `custom` 在顺序中，但公开脱敏配置显示其 URL 未配置，因此不可按“有效外部采集源”计数。
- VOD 配置存在 3 个站点，返回模式为 `all`；这里只记录数量和模式，不记录部署细节。
- `MERGE_SOURCE_PAIRS` 为空，表示该实例未公开配置多源合并组。
- `REAL_TIME_PULL_DANDAN` 为启用状态；公开状态同时显示 AI 当前无有效配置。两项都不改变 `SOURCE_ORDER` 的集合关系。

该 20 键与项目 `v1.17.7` 标签的允许集完全相同；该标签说明为“新增爱壹帆源前的最后一个版本”，固定 commit 为 `b4511e501e02a125ac3f72d5817b2158b73e8080`，对应数组见 [envs.js L14-L17](https://github.com/huangxd-/danmu_api/blob/b4511e501e02a125ac3f72d5817b2158b73e8080/danmu_api/configs/envs.js#L14-L17)。这能证明 Lily 的配置代际，但不能证明它正运行该标签的逐字相同构建，所以仍以实例自报 `1.17.0` 为准。

集合关系：

`Lily_config_20 ⊂ Huang_1.20.5_supported_22`

`Huang_1.20.5_supported_22 − Lily_config_20 = {aiyifan, hongguo}`

`Lily_potentially_effective ≤ 19`（因 `custom` 未配置；单个上游是否临时可用不在本次源码审计范围内）。

因此，问“谁覆盖更广”需要给出口径：按当前**代码可配置范围**，Huang `1.20.5` 比 Lily 公开实例广两个原生弹幕 adapter；按 Huang **默认启用配置**，Lily 明显更广；按真实节目命中率，不能由源键数量推出，仍需题库实测。

## 覆盖差异的分层结论

| 口径 | Huang `1.20.5` | Lily 公开实例 | 结论 |
| --- | --- | --- | --- |
| 代码支持 | 22 个调度键 | 实例代际对应 20 个键 | Huang 多 `aiyifan`、`hongguo` |
| Huang 默认启用 | 4 键：`douban,360,renren,hanjutv` | 不适用 | 两个 Huang-only adapter 默认都未启用 |
| 当前实例配置 | 未指定部署实例，不能假设启用 22 键 | 20 键进入 `SOURCE_ORDER`，`custom` 未配置，最多 19 条可工作路径 | 开箱配置 Lily 更广 |
| 独立内容增量 | `aiyifan` 和 `hongguo` 都直接产出弹幕 | 没有这两个 adapter | 爱壹帆补一般影视，红果主要补中国短剧 |
| 实际命中率 | 未做同题库、同时间窗实测 | 未做同题库、同时间窗实测 | 无法量化谁的真实覆盖率更高 |

所以两者在**支持集合**上确实只差 `aiyifan`、`hongguo`；但在**实际运行配置**上并非只差两个来源，因为 Huang 默认只开 4 个，而 Lily 当前尝试调度 20 个。若把 Huang 配成与 Lily 相同的 20 键，再启用这两个 adapter，Huang 才是在 Lily 基础上获得“爱壹帆影视 + 红果短剧”的真实增量。

## 《星城 / Star City》单剧低频实测

测试时间：2026-08-10 00:56-00:57（Asia/Shanghai）。目标身份固定为 TMDB `252107`、2026 年、第一季 8 集。每个关键词只搜索一次，只在确认正确条目后检查详情和 E01；不保存弹幕正文，也不进行压力测试。

| 路径 | 搜索命中 | 分集覆盖 | E01 实际弹幕 | 判断 |
| --- | --- | --- | --- | --- |
| Lily，中文 `星城` | 正确命中 `星城(2026)【电视剧】from renren` | 8 集，E01-E08 | 3738 条，3738 条正文非空 | 已证实完整覆盖 |
| Lily，英文 `Star City` | 未命中正确条目 | 未继续请求 | 未请求 | 英文别名发现能力不足，但不影响中文命中 |
| Huang-only `aiyifan`，中文 `星城` | 正确命中 `星城`、2026、电视剧 | 当前环境获取播放列表时，签名配置页返回 HTTP 403，故未取得分集 | 未请求 | 只有搜索发现，未证实可用弹幕覆盖 |
| 已部署服务器的 `aiyifan` 路径 | 正确命中目标剧 | 8 集 | E01 返回 4 条 | 证明该 adapter 在另一部署网络可完成全链路，但数据量远少于 Lily 本片结果 |
| Huang-only `aiyifan`，英文 `Star City` | 返回 3 个结果，均非目标剧 | 未继续请求 | 未请求 | 未命中 |
| Huang-only `hongguo`，中文/英文 | 各返回 20 个短剧候选，均无标题精确相等的 2026 目标剧 | 未继续请求 | 未请求 | 无正确命中，不能把同名或模糊短剧误计为覆盖 |

Lily 正确条目来自 `renren`，公开 `bangumiId` 为 `56978`，详情返回 8 集；只对 E01 的公开 `episodeId=10834` 发出一次弹幕请求，得到 3738 条非空正文。脱敏调用形态为：

```sh
curl -fsS '<LILY_BASE>/api/v2/search/anime?keyword=<URL_ENCODED_QUERY>'
curl -fsS '<LILY_BASE>/api/v2/bangumi/<BANGUMI_ID>'
curl -fsS '<LILY_BASE>/api/v2/comment/<EPISODE_ID>?async=1&withRelated=true&chConvert=0' \
  | jq '{commentCount: ((.comments // []) | length)}'
```

Huang-only 两源使用当前固定 commit 的 adapter 直接实例化，每个关键词一次：

```sh
node --input-type=module -e 'import Source from "./danmu_api/sources/<source>.js"; const s=new Source(); console.log(await s.search("<keyword>"))'
```

`aiyifan` 搜索映射的实现见 [aiyifan.js L249-L279](https://github.com/huangxd-/danmu_api/blob/72e345e840343491804f2bdbbf70843e6ab17f7e/danmu_api/sources/aiyifan.js#L249-L279)，分集必须继续请求播放列表（[L287-L307](https://github.com/huangxd-/danmu_api/blob/72e345e840343491804f2bdbbf70843e6ab17f7e/danmu_api/sources/aiyifan.js#L287-L307)）；签名器会先从桌面站配置页读取签名材料（[aiyifan-util.js L301-L325](https://github.com/huangxd-/danmu_api/blob/72e345e840343491804f2bdbbf70843e6ab17f7e/danmu_api/utils/aiyifan-util.js#L301-L325)）。本机直连正是在该步骤收到 HTTP 403，因此该执行路径的“搜索命中”不能升级为“分集覆盖”或“实际非空弹幕”。作为交叉验证，另一个已部署 Dandan-compatible 服务器将正确结果标记为 `aiyifan`，返回 8 集，且只请求 E01 得到 4 条；脱敏调用形态与上面的 Lily 命令相同，公开 E01 ID 为 `185867`。这说明 adapter 能否完成全链路受部署网络和上游风控影响。`hongguo` 的搜索会返回短剧候选（[hongguo.js L757-L798](https://github.com/huangxd-/danmu_api/blob/72e345e840343491804f2bdbbf70843e6ab17f7e/danmu_api/sources/hongguo.js#L757-L798)），本次没有标题、年份和类型都符合目标的条目，所以没有请求分集或评论。

**本片结论：Huang-only 来源没有带来“从无到有”的覆盖增量。** Lily 已通过 `renren` 提供 8 集和 E01 的 3738 条非空弹幕；已部署的 `aiyifan` 路径也覆盖 8 集，但 E01 只有 4 条，因此最多算另一社区的候选深度增量，且未逐条去重，不能宣称新增 4 条独有内容。`hongguo` 没有正确命中。本机直连 `aiyifan` 的 403 还表明其稳定性依赖部署网络。该结论只适用于本次单剧、当前网络和时间点，不能外推为两套系统的总体命中率。

## 本项目的位置

本项目 `danmu-select.js@bcf3f038f7c44927b7887a845576906e2bd4fc4f` 默认配置 Alpha、Cynn、Lily 三个远程 server（[danmu-select.js L13-L18](https://github.com/lucking7/forward-widgets/blob/bcf3f038f7c44927b7887a845576906e2bd4fc4f/widgets/danmu/danmu-select.js#L13-L18)），搜索与弹幕分别调用远端 `/api/v2/search/anime` 和 `/api/v2/comment/...`（[L709-L743](https://github.com/lucking7/forward-widgets/blob/bcf3f038f7c44927b7887a845576906e2bd4fc4f/widgets/danmu/danmu-select.js#L709-L743)、[L1461-L1470](https://github.com/lucking7/forward-widgets/blob/bcf3f038f7c44927b7887a845576906e2bd4fc4f/widgets/danmu/danmu-select.js#L1461-L1470)）。

所以我们的优势是跨实例匹配、质量优选和容灾，内容覆盖取决于这些实例各自部署的 adapter。若 Alpha/Cynn 也是 `danmu_api`/其分支部署，它们与 Lily 可能高度重叠；不能把“3 个服务器”直接等价为“3 倍平台覆盖”。

## Sources

- [huangxd-/danmu_api 固定源码](https://github.com/huangxd-/danmu_api/tree/72e345e840343491804f2bdbbf70843e6ab17f7e)
- [huangxd-/ForwardWidgets 固定源码](https://github.com/huangxd-/ForwardWidgets/tree/8b33652bdabec8440d361872a29241decdb83323)
- [Lily 公开脱敏配置](https://danmu.longemby.com/api/config)（动态快照）
- [本项目固定源码](https://github.com/lucking7/forward-widgets/tree/bcf3f038f7c44927b7887a845576906e2bd4fc4f)
