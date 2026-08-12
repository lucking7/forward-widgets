function createRankingHandler({ window, getRanking }) {
  return async function rankingHandler(request, response) {
    if (request.method && request.method !== "GET") {
      return response.status(405).json({ error: "method_not_allowed" });
    }
    const ranking = await getRanking(window);
    if (!ranking) {
      return response.status(503).json({ error: "ranking_not_ready" });
    }
    response.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=86400");
    return response.status(200).json(ranking);
  };
}

module.exports = { createRankingHandler };
