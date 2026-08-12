# 动漫加权榜部署架构

## 数据流

```text
Vercel Cron (每小时第 17 分钟)
  -> AniList GraphQL (每小时主样本)
  -> Bahamut HTML (最多每 6 小时辅助样本)
  -> private Blob version object
  -> ETag CAS 更新 current.json
  -> public realtime/day/week/meta Functions
  -> Forward 动漫加权榜组件
```

任一小时只允许一个 `runKey` 生效。写入顺序是先保存带随机后缀的不可变版本对象，首次 current pointer 使用 create-only 写入，后续以 `ifMatch` 更新。并发失败会重新读取一次，若另一执行已经发布相同小时则返回 `duplicate`。版本对象滚动保留 336 个，约等于 14 天小时版本，清理失败不会回滚已成功发布的 current pointer。

AniList 是主源。AniList 失败时不写新状态，公开 API 继续提供最后一次成功数据，并在超过 3 小时后动态标记 `stale`。日榜和周榜在每次读取时按当前时间重新滑窗，不会在停采后继续伪报旧 coverage。Bahamut 是可降级辅助源，其网络失败不会阻断新 AniList 样本。两种外部请求均使用 15 秒原生 `AbortSignal` 超时。

## Vercel 配置

本实现面向 Vercel Pro，因为 Hobby Cron 不能稳定表达每小时采样。所需资源：

- Node.js 20 或更高版本
- private Vercel Blob store
- `CRON_SECRET`
- `BLOB_READ_WRITE_TOKEN`，连接 Blob 后由 Vercel 注入

定时配置位于 `vercel.json`，采集函数最长运行时间为 300 秒。公开 API 使用 CDN cache header，Blob current pointer 始终以 `useCache: false` 读取，避免 CDN 旧对象参与 CAS。

## 本地验证

```bash
npm install
npm run test:anime
npm run test:anime:live
npm run check
```

默认测试全部离线且不需要 Vercel 凭证。`test:anime:live` 会真实请求 AniList 与巴哈，仅用于手动 smoke test。
