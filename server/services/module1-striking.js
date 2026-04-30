const { calculateOPS, getMaxValues } = require('./scoring');

/**
 * Module 1: Striking Distance Keywords (Rank 11-30)
 * Note: Data comes from the orchestrator's combined rank 1-30 fetch
 */
async function processStrikingDistance(rankedKeywordsData) {
  // Filter for rank 11-30 from the combined dataset
  const strikingKeywords = rankedKeywordsData.filter(
    kw => kw.rank_group >= 11 && kw.rank_group <= 30
  );

  if (strikingKeywords.length === 0) {
    return { keywords: [], quickWins: [], groupedByUrl: {}, summary: getEmptySummary() };
  }

  const maxValues = getMaxValues(strikingKeywords);

  const scored = strikingKeywords.map(kw => ({
    keyword: kw.keyword,
    search_volume: kw.search_volume || 0,
    keyword_difficulty: kw.keyword_difficulty || 0,
    rank_group: kw.rank_group,
    rank_absolute: kw.rank_absolute || kw.rank_group,
    ranking_url: kw.relative_url || '',
    etv: kw.etv || 0,
    cpc: kw.cpc || 0,
    competition: kw.competition || 0,
    ops_score: calculateOPS(kw, maxValues),
    serp_features: kw.serp_features || [],
    has_ai_overview: kw.has_ai_overview || false,
    optimization_notes: generateNotes(kw),
  }));

  scored.sort((a, b) => b.ops_score - a.ops_score);

  const quickWins = scored.slice(0, 50);

  // Group by URL
  const groupedByUrl = {};
  for (const kw of scored) {
    const url = kw.ranking_url || 'unknown';
    if (!groupedByUrl[url]) {
      groupedByUrl[url] = { url, keywords: [], totalSV: 0, totalETV: 0, avgRank: 0 };
    }
    groupedByUrl[url].keywords.push(kw);
    groupedByUrl[url].totalSV += kw.search_volume;
    groupedByUrl[url].totalETV += kw.etv;
  }

  for (const group of Object.values(groupedByUrl)) {
    group.avgRank = Math.round(
      group.keywords.reduce((sum, kw) => sum + kw.rank_group, 0) / group.keywords.length * 10
    ) / 10;
  }

  return {
    keywords: scored,
    quickWins,
    groupedByUrl,
    summary: {
      totalKeywords: scored.length,
      totalSearchVolume: scored.reduce((s, k) => s + k.search_volume, 0),
      totalETV: scored.reduce((s, k) => s + k.etv, 0),
      avgRank: Math.round(scored.reduce((s, k) => s + k.rank_group, 0) / scored.length * 10) / 10,
      avgDifficulty: Math.round(scored.reduce((s, k) => s + k.keyword_difficulty, 0) / scored.length),
      pagesWithKeywords: Object.keys(groupedByUrl).length,
    },
  };
}

function generateNotes(kw) {
  const notes = [];
  if (kw.rank_group <= 15) {
    notes.push('Very close to page 1 — prioritize on-page optimization.');
  } else if (kw.rank_group <= 20) {
    notes.push('Within striking distance — optimize content and internal links.');
  } else {
    notes.push('Consider content refresh and backlink building.');
  }
  if (kw.cpc > 5) {
    notes.push('High commercial value keyword.');
  }
  if (kw.keyword_difficulty < 30) {
    notes.push('Low difficulty — quick win potential.');
  }
  if (kw.has_ai_overview) {
    notes.push('AI Overview present — add structured data and concise answers.');
  }
  return notes.join(' ');
}

function getEmptySummary() {
  return { totalKeywords: 0, totalSearchVolume: 0, totalETV: 0, avgRank: 0, avgDifficulty: 0, pagesWithKeywords: 0 };
}

/**
 * Parse raw DFS ranked keywords response into a flat array
 */
function parseRankedKeywords(dfsResponse) {
  const results = [];
  const tasks = dfsResponse?.tasks || [];
  for (const task of tasks) {
    if (task.status_code !== 20000 || !task.result) continue;
    for (const resultItem of task.result) {
      const items = resultItem.items || [];
      for (const item of items) {
        const kwData = item.keyword_data || {};
        const serpItem = item.ranked_serp_element?.serp_item || {};
        results.push({
          keyword: kwData.keyword || '',
          search_volume: kwData.keyword_info?.search_volume || 0,
          keyword_difficulty: kwData.keyword_info?.keyword_difficulty || 0,
          cpc: kwData.keyword_info?.cpc || 0,
          competition: kwData.keyword_info?.competition || 0,
          rank_group: serpItem.rank_group || 0,
          rank_absolute: serpItem.rank_absolute || 0,
          relative_url: serpItem.relative_url || '',
          etv: serpItem.etv || 0,
          serp_features: [],
          has_ai_overview: false,
          type: serpItem.type || 'organic',
        });
      }
    }
  }
  return results;
}

module.exports = { processStrikingDistance, parseRankedKeywords };
