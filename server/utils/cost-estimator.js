const ENDPOINT_COSTS = {
  ranked_keywords: 0.01,       // per 1000 results
  domain_intersection: 0.011,  // per 1000 results
  competitors_domain: 0.0103,
  related_keywords: 0.01,      // per 1000 results
  relevant_pages: 0.01,        // per 1000 results
  serp_live_advanced: 0.003,   // per task
  on_page_task_post: 0.00025,  // per page crawled
  on_page_pages: 0,            // free
  domain_rank_overview: 0.0101,
  backlinks_summary: 0.002,    // per target
};

/**
 * Estimate audit cost before running
 */
function estimateCost({ competitorCount = 3, crawlPages = 500, serpDepth = 20 }) {
  let cost = 0;

  // Domain rank overview: client
  cost += ENDPOINT_COSTS.domain_rank_overview;

  // Ranked keywords: 1 call (positions 1-30 combined)
  cost += ENDPOINT_COSTS.ranked_keywords;

  // Backlinks summary: client + competitors
  cost += ENDPOINT_COSTS.backlinks_summary * (1 + competitorCount);

  // Domain intersection: gap direction + moat direction per competitor
  cost += ENDPOINT_COSTS.domain_intersection * competitorCount * 2;

  // Related keywords: top 10 terms
  cost += ENDPOINT_COSTS.related_keywords * 10;

  // AIO ranked keywords: client + competitors
  cost += ENDPOINT_COSTS.ranked_keywords * (1 + competitorCount);

  // SERP live advanced: top N keywords
  cost += ENDPOINT_COSTS.serp_live_advanced * serpDepth;

  // OnPage crawl
  cost += ENDPOINT_COSTS.on_page_task_post * crawlPages;

  // Relevant pages: client + competitors
  cost += ENDPOINT_COSTS.relevant_pages * (1 + competitorCount);

  return Math.round(cost * 100) / 100;
}

module.exports = { estimateCost, ENDPOINT_COSTS };
