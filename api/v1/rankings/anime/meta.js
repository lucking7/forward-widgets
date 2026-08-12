function createMetaHandler({ getMeta }) {
  return async function metaHandler(request, response) {
    if (request.method && request.method !== "GET") {
      return response.status(405).json({ error: "method_not_allowed" });
    }
    const meta = await getMeta();
    if (!meta) return response.status(503).json({ error: "ranking_not_ready" });
    response.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=86400");
    return response.status(200).json(meta);
  };
}

async function handler(request, response) {
  const { getProductionService } = require("../../../../lib/anime-rankings/service.js");
  return createMetaHandler({ getMeta: getProductionService().getMeta })(request, response);
}

module.exports = handler;
module.exports.createMetaHandler = createMetaHandler;
