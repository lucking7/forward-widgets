const crypto = require("node:crypto");

const CURRENT_PATH = "anime-rankings/state/current.json";

class RankingStateConflictError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "RankingStateConflictError";
  }
}

async function streamText(stream) {
  if (!stream) return "";
  if (typeof stream.text === "function") return stream.text();
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

function createBlobRankingStore({ client, versionRetention = 336 } = {}) {
  function blobClient() {
    return client || require("@vercel/blob");
  }

  async function readCurrent() {
    let result;
    try {
      result = await blobClient().get(CURRENT_PATH, { access: "private", useCache: false });
    } catch (error) {
      if (error && error.name === "BlobNotFoundError") return null;
      throw error;
    }
    if (!result || result.statusCode === 404) return null;
    if (result.statusCode && result.statusCode >= 400) {
      throw new Error("ranking state read failed: " + result.statusCode);
    }
    const body = await streamText(result.stream);
    return { value: JSON.parse(body), etag: result.blob && result.blob.etag || null };
  }

  async function commitCurrent(value, { expectedEtag, runKey }) {
    const body = JSON.stringify(value);
    const hash = crypto.createHash("sha256").update(body).digest("hex").slice(0, 16);
    const safeRunKey = String(runKey).replace(/[:.]/g, "-");
    const versionPath = "anime-rankings/versions/" + safeRunKey + "-" + hash + ".json";
    const version = await blobClient().put(versionPath, body, {
      access: "private",
      contentType: "application/json; charset=utf-8",
      addRandomSuffix: true,
    });
    const currentOptions = {
      access: "private",
      contentType: "application/json; charset=utf-8",
      addRandomSuffix: false,
    };
    if (expectedEtag) currentOptions.ifMatch = expectedEtag;
    else currentOptions.allowOverwrite = false;
    let current;
    try {
      current = await blobClient().put(CURRENT_PATH, body, currentOptions);
    } catch (error) {
      if (error && error.name === "BlobPreconditionFailedError") {
        throw new RankingStateConflictError("ranking state changed during publication", { cause: error });
      }
      throw error;
    }
    await pruneVersions();
    return {
      value,
      etag: current.etag || null,
      currentUrl: current.url,
      versionUrl: version.url,
    };
  }

  async function pruneVersions() {
    const api = blobClient();
    if (typeof api.list !== "function" || typeof api.del !== "function") return;
    try {
      const blobs = [];
      let cursor;
      do {
        const page = await api.list({
          prefix: "anime-rankings/versions/",
          limit: 1000,
          cursor,
        });
        blobs.push(...((page && page.blobs) || []));
        cursor = page && page.hasMore ? page.cursor : undefined;
      } while (cursor);
      blobs.sort((left, right) => new Date(right.uploadedAt) - new Date(left.uploadedAt));
      const expired = blobs.slice(versionRetention).map((blob) => blob.url || blob.pathname).filter(Boolean);
      for (let index = 0; index < expired.length; index += 100) {
        await api.del(expired.slice(index, index + 100));
      }
    } catch (error) {
      // Retention is best-effort and must never roll back an already published current pointer.
    }
  }

  return { readCurrent, commitCurrent, pruneVersions };
}

module.exports = {
  CURRENT_PATH,
  RankingStateConflictError,
  createBlobRankingStore,
};
