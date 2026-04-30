/**
 * Calculate Optimization Priority Score (OPS) for striking distance keywords
 */
function calculateOPS(keyword, maxValues) {
  const svNorm = maxValues.searchVolume ? keyword.search_volume / maxValues.searchVolume : 0;
  const rankNorm = (30 - keyword.rank_group) / 19;
  const cpcNorm = maxValues.cpc ? keyword.cpc / maxValues.cpc : 0;
  const kdNorm = (100 - keyword.keyword_difficulty) / 100;
  const etvNorm = maxValues.etv ? keyword.etv / maxValues.etv : 0;

  const ops = (svNorm * 0.3) + (rankNorm * 0.25) + (cpcNorm * 0.2) + (kdNorm * 0.15) + (etvNorm * 0.1);
  return Math.round(ops * 100);
}

/**
 * Calculate max values for normalization
 */
function getMaxValues(keywords) {
  return {
    searchVolume: Math.max(...keywords.map(k => k.search_volume || 0), 1),
    cpc: Math.max(...keywords.map(k => k.cpc || 0), 0.01),
    etv: Math.max(...keywords.map(k => k.etv || 0), 1),
  };
}

/**
 * Calculate priority score for new page opportunities
 */
function calculatePriorityScore(keyword) {
  const svScore = Math.min(keyword.search_volume / 10000, 1) * 40;
  const kdScore = ((100 - keyword.keyword_difficulty) / 100) * 30;
  const cpcScore = Math.min(keyword.cpc / 10, 1) * 20;
  const compScore = keyword.competitors_ranking?.length ? Math.min(keyword.competitors_ranking.length / 3, 1) * 10 : 0;

  return Math.round(svScore + kdScore + cpcScore + compScore);
}

/**
 * Calculate Strength Impact Score (SIS)
 */
function calculateSIS(keyword, { totalCompetitors = 3, maxEtv = 1 }) {
  const trafficImpact = maxEtv ? (keyword.etv || 0) / maxEtv : 0;
  const competitiveAdvantage = keyword.competitors_not_ranking
    ? keyword.competitors_not_ranking.length / Math.max(totalCompetitors, 1)
    : (keyword.rank <= 3 ? 0.7 : 0.3);
  const defensibility = keyword.rank === 1
    ? 1
    : keyword.rank <= 3
      ? 0.8
      : keyword.rank <= 5
        ? 0.6
        : 0.4;

  const sis = (trafficImpact * 0.4) + (competitiveAdvantage * 0.3) + (defensibility * 0.3);
  return Math.round(sis * 100);
}

module.exports = { calculateOPS, getMaxValues, calculatePriorityScore, calculateSIS };
