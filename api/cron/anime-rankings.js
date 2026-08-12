// Approved design: an authenticated hourly collector publishes versioned anime rankings.
function createCronHandler({ secret, runCollection, logger }) {
  return async function animeRankingCron(request, response) {
    const authorization = request && request.headers && request.headers.authorization;
    if (!secret || authorization !== "Bearer " + secret) {
      return response.status(401).json({ error: "unauthorized" });
    }

    try {
      const result = await runCollection();
      return response.status(200).json(result);
    } catch (error) {
      if (logger && typeof logger.error === "function") {
        logger.error("anime_ranking_collection_failed", {
          errorName: error && error.name || "Error",
        });
      }
      return response.status(502).json({ error: "collection_failed" });
    }
  };
}

function createProductionCronHandler({ secret, getService, logger }) {
  return createCronHandler({
    secret,
    runCollection() {
      return getService().runCollection();
    },
    logger,
  });
}

async function handler(request, response) {
  const { getProductionService } = require("../../lib/anime-rankings/service.js");
  return createProductionCronHandler({
    secret: process.env.CRON_SECRET,
    getService: getProductionService,
    logger: console,
  })(request, response);
}

module.exports = handler;
module.exports.createCronHandler = createCronHandler;
module.exports.createProductionCronHandler = createProductionCronHandler;
