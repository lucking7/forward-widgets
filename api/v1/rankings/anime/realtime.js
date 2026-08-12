const { createRankingHandler: createHandler } = require("../../../../lib/anime-rankings/http.js");

function createRankingHandler({ getRanking }) {
  return createHandler({ window: "realtime", getRanking });
}

async function handler(request, response) {
  const { getProductionService } = require("../../../../lib/anime-rankings/service.js");
  return createRankingHandler({ getRanking: getProductionService().getRanking })(request, response);
}

module.exports = handler;
module.exports.createRankingHandler = createRankingHandler;
