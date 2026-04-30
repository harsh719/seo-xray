const { classifyIntent, suggestPageType } = require('./intent-classifier');
const { calculatePriorityScore } = require('./scoring');
const { deduplicateKeywords, excludeKeywords } = require('../utils/dedup');
const { filterKeywordsByBofu } = require('../utils/bofu-filter');

/**
 * Module 2: New Page Opportunities
 */
async function processNewPageOpportunities(client, config, existingKeywords = []) {
  const { competitors, language, locationCode, minSearchVolume = 100 } = config;
  const allOpportunities = [];

  // Approach A: Competitor Keyword Gap
  const gapPromises = competitors.map(async (competitor) => {
    try {
      const response = await client.domainIntersection(competitor, config.clientDomain, {
        language,
        locationCode,
        intersections: false,
        filters: [
          ['keyword_data.keyword_info.search_volume', '>=', minSearchVolume],
          'and',
          ['first_domain_serp_element.serp_item.rank_group', '<=', 20],
        ],
        limit: 1000,
      });
      return parseIntersectionResults(response, competitor, 'competitor_gap');
    } catch (err) {
      console.error(`Gap analysis failed for ${competitor}:`, err.message);
      return [];
    }
  });

  const gapResults = await Promise.all(gapPromises);
  for (const results of gapResults) {
    allOpportunities.push(...results);
  }

  // Approach B: Related Keywords Expansion
  const topKeywords = existingKeywords
    .sort((a, b) => (b.search_volume || 0) - (a.search_volume || 0))
    .slice(0, 10);

  const relatedPromises = topKeywords.map(async (kw) => {
    try {
      const response = await client.relatedKeywords(kw.keyword, {
        language,
        locationCode,
        limit: 100,
      });
      return parseRelatedKeywords(response);
    } catch (err) {
      console.error(`Related keywords failed for "${kw.keyword}":`, err.message);
      return [];
    }
  });

  const relatedResults = await Promise.all(relatedPromises);
  for (const results of relatedResults) {
    allOpportunities.push(...results.map(kw => ({ ...kw, source: 'related_expansion' })));
  }

  // Deduplicate
  let deduped = deduplicateKeywords(allOpportunities);

  // Exclude keywords client already ranks for
  deduped = excludeKeywords(deduped, existingKeywords);

  // Apply BofU filter if enabled
  deduped = filterKeywordsByBofu(deduped, config.bofuConfig);

  // Classify intent and suggest page types
  const enriched = deduped.map(kw => ({
    ...kw,
    intent: classifyIntent(kw.keyword),
    suggested_page_type: suggestPageType(kw.keyword),
    priority_score: calculatePriorityScore(kw),
  }));

  enriched.sort((a, b) => b.priority_score - a.priority_score);

  const summary = {
    totalOpportunities: enriched.length,
    totalSearchVolume: enriched.reduce((s, k) => s + k.search_volume, 0),
    byIntent: countBy(enriched, 'intent'),
    byPageType: countBy(enriched, 'suggested_page_type'),
    bySource: countBy(enriched, 'source'),
  };

  return { opportunities: enriched, summary };
}

function parseIntersectionResults(response, competitorDomain, source) {
  const results = [];
  const tasks = response?.tasks || [];
  for (const task of tasks) {
    if (task.status_code !== 20000 || !task.result) continue;
    for (const resultItem of task.result) {
      const items = resultItem.items || [];
      for (const item of items) {
        const kwData = item.keyword_data || {};
        const serpItem = item.first_domain_serp_element?.serp_item || {};
        results.push({
          keyword: kwData.keyword || '',
          search_volume: kwData.keyword_info?.search_volume || 0,
          keyword_difficulty: kwData.keyword_info?.keyword_difficulty || 0,
          cpc: kwData.keyword_info?.cpc || 0,
          competitors_ranking: [{
            domain: competitorDomain,
            rank: serpItem.rank_group || 0,
            url: serpItem.relative_url || '',
          }],
          source,
          has_ai_overview: false,
          priority_score: 0,
        });
      }
    }
  }
  return results;
}

function parseRelatedKeywords(response) {
  const results = [];
  const tasks = response?.tasks || [];
  for (const task of tasks) {
    if (task.status_code !== 20000 || !task.result) continue;
    for (const resultItem of task.result) {
      const items = resultItem.items || [];
      for (const item of items) {
        const kwData = item.keyword_data || {};
        results.push({
          keyword: kwData.keyword || '',
          search_volume: kwData.keyword_info?.search_volume || 0,
          keyword_difficulty: kwData.keyword_info?.keyword_difficulty || 0,
          cpc: kwData.keyword_info?.cpc || 0,
          competitors_ranking: [],
          has_ai_overview: false,
          priority_score: 0,
        });
      }
    }
  }
  return results;
}

function countBy(arr, key) {
  const counts = {};
  for (const item of arr) {
    const val = item[key] || 'unknown';
    counts[val] = (counts[val] || 0) + 1;
  }
  return counts;
}

module.exports = { processNewPageOpportunities };
