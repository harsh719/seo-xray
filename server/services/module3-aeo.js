const { filterKeywordsByBofu } = require('../utils/bofu-filter');

/**
 * Module 3: AEO / GEO Opportunity Finder
 */
async function processAEOOpportunities(client, config, strikingKeywords = []) {
  const { clientDomain, competitors, language, locationCode, serpDepth = 20 } = config;

  // Step 1: Client AI Overview presence
  let clientAIOKeywords = [];
  try {
    const response = await client.rankedKeywords(clientDomain, {
      language,
      locationCode,
      itemTypes: ['ai_overview_reference'],
      limit: 1000,
    });
    clientAIOKeywords = parseAIOKeywords(response);
  } catch (err) {
    console.error('Client AIO fetch failed:', err.message);
  }

  // Step 2: Competitor AI Overview keywords (parallel)
  const competitorAIOMap = {};
  const aioPromises = competitors.map(async (comp) => {
    try {
      const response = await client.rankedKeywords(comp, {
        language,
        locationCode,
        itemTypes: ['ai_overview_reference'],
        limit: 1000,
      });
      competitorAIOMap[comp] = parseAIOKeywords(response);
    } catch (err) {
      console.error(`Competitor AIO fetch failed for ${comp}:`, err.message);
      competitorAIOMap[comp] = [];
    }
  });
  await Promise.all(aioPromises);

  // Find AEO gaps: keywords where competitors appear but client doesn't
  const clientAIOSet = new Set(clientAIOKeywords.map(k => k.keyword.toLowerCase()));
  const aeoGaps = [];

  for (const [comp, keywords] of Object.entries(competitorAIOMap)) {
    for (const kw of keywords) {
      if (!clientAIOSet.has(kw.keyword.toLowerCase())) {
        const existing = aeoGaps.find(g => g.keyword.toLowerCase() === kw.keyword.toLowerCase());
        if (existing) {
          if (!existing.competitors_in_ai_overview.includes(comp)) {
            existing.competitors_in_ai_overview.push(comp);
          }
        } else {
          aeoGaps.push({
            keyword: kw.keyword,
            search_volume: kw.search_volume,
            has_ai_overview: true,
            client_in_ai_overview: false,
            competitors_in_ai_overview: [comp],
            serp_features: ['ai_overview'],
            client_organic_rank: null,
            client_ranking_url: null,
            recommendation: '',
            opportunity_type: 'aeo_gap',
            priority: 'high',
          });
        }
      }
    }
  }

  // Step 3: SERP feature analysis for top striking distance keywords
  const topKeywords = strikingKeywords
    .sort((a, b) => (b.ops_score || b.search_volume || 0) - (a.ops_score || a.search_volume || 0))
    .slice(0, serpDepth);

  const serpResults = [];
  for (const kw of topKeywords) {
    try {
      const response = await client.serpLiveAdvanced(kw.keyword, { language, locationCode });
      const serpData = parseSERPResults(response, kw, clientDomain);
      if (serpData) serpResults.push(serpData);
    } catch (err) {
      console.error(`SERP analysis failed for "${kw.keyword}":`, err.message);
    }
  }

  // Merge SERP results into AEO gaps
  for (const serpResult of serpResults) {
    if (!serpResult.client_in_ai_overview && serpResult.has_ai_overview) {
      const existing = aeoGaps.find(g => g.keyword.toLowerCase() === serpResult.keyword.toLowerCase());
      if (!existing) {
        aeoGaps.push(serpResult);
      }
    }
  }

  // Apply BofU filter if enabled
  const bofuCfg = config.bofuConfig;
  const filteredGaps = filterKeywordsByBofu(aeoGaps, bofuCfg);

  // Generate recommendations
  for (const gap of filteredGaps) {
    gap.recommendation = generateAEORecommendation(gap);
  }

  // Client AIO wins (for Module 5)
  const aioWins = filterKeywordsByBofu(
    clientAIOKeywords.map(kw => ({
      keyword: kw.keyword,
      search_volume: kw.search_volume,
      feature_type: 'ai_overview',
      rank: kw.rank_group || 0,
    })),
    bofuCfg
  );

  const filteredSerpResults = filterKeywordsByBofu(serpResults, bofuCfg);

  const summary = {
    totalAEOGaps: filteredGaps.length,
    clientAIOKeywords: aioWins.length,
    competitorAIOCoverage: Object.fromEntries(
      Object.entries(competitorAIOMap).map(([k, v]) => [k, v.length])
    ),
    serpFeaturesAnalyzed: filteredSerpResults.length,
    highPriorityGaps: filteredGaps.filter(g => g.priority === 'high').length,
  };

  return {
    gaps: filteredGaps,
    serpResults: filteredSerpResults,
    aioWins,
    clientAIOKeywords: filterKeywordsByBofu(clientAIOKeywords, bofuCfg),
    summary,
  };
}

function parseAIOKeywords(response) {
  const results = [];
  const tasks = response?.tasks || [];
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
          rank_group: serpItem.rank_group || 0,
          relative_url: serpItem.relative_url || '',
        });
      }
    }
  }
  return results;
}

function parseSERPResults(response, originalKw, clientDomain) {
  const tasks = response?.tasks || [];
  for (const task of tasks) {
    if (task.status_code !== 20000 || !task.result) continue;
    for (const resultItem of task.result) {
      const items = resultItem.items || [];
      const features = [];
      let hasAIO = false;
      let clientInAIO = false;
      let hasFeaturedSnippet = false;
      let hasPAA = false;
      const competitorsInAIO = [];

      for (const item of items) {
        if (item.type === 'ai_overview') {
          hasAIO = true;
          features.push('ai_overview');
          const references = item.references || [];
          for (const ref of references) {
            if (ref.domain && ref.domain.includes(clientDomain)) {
              clientInAIO = true;
            } else if (ref.domain) {
              competitorsInAIO.push(ref.domain);
            }
          }
        }
        if (item.type === 'featured_snippet') {
          hasFeaturedSnippet = true;
          features.push('featured_snippet');
        }
        if (item.type === 'people_also_ask') {
          hasPAA = true;
          features.push('people_also_ask');
        }
        if (item.type === 'knowledge_panel') features.push('knowledge_panel');
        if (item.type === 'local_pack') features.push('local_pack');
        if (item.type === 'video') features.push('video');
        if (item.type === 'top_stories') features.push('top_stories');
        if (item.type === 'related_searches') features.push('related_searches');
      }

      let opportunityType = 'aeo_gap';
      let priority = 'medium';
      if (hasAIO && !clientInAIO) {
        opportunityType = 'aeo_gap';
        priority = 'high';
      } else if (hasFeaturedSnippet) {
        opportunityType = 'featured_snippet';
        priority = originalKw.rank_group <= 10 ? 'high' : 'medium';
      } else if (hasPAA) {
        opportunityType = 'paa';
        priority = 'medium';
      }

      return {
        keyword: originalKw.keyword,
        search_volume: originalKw.search_volume,
        has_ai_overview: hasAIO,
        client_in_ai_overview: clientInAIO,
        competitors_in_ai_overview: [...new Set(competitorsInAIO)],
        serp_features: [...new Set(features)],
        client_organic_rank: originalKw.rank_group || null,
        client_ranking_url: originalKw.ranking_url || originalKw.relative_url || null,
        recommendation: '',
        opportunity_type: opportunityType,
        priority,
      };
    }
  }
  return null;
}

function generateAEORecommendation(gap) {
  if (gap.has_ai_overview && !gap.client_in_ai_overview && gap.client_ranking_url) {
    return `Optimize existing content at ${gap.client_ranking_url} for AEO. Add structured data, FAQ schema, and concise definition paragraphs targeting this query.`;
  }
  if (gap.has_ai_overview && !gap.client_ranking_url) {
    return 'Create new authoritative content targeting this query. Structure with clear H2 headers, definition-style paragraphs, and FAQ schema.';
  }
  if (gap.serp_features.includes('featured_snippet') && gap.client_organic_rank && gap.client_organic_rank <= 10) {
    return `Restructure content at ${gap.client_ranking_url || 'ranking page'} to capture featured snippet. Add a concise 40-60 word definition/answer paragraph immediately after H2.`;
  }
  if (gap.serp_features.includes('people_also_ask')) {
    return `Add FAQ section to ${gap.client_ranking_url || 'relevant page'} addressing PAA questions. Use exact question as H3, provide concise 2-3 sentence answers.`;
  }
  return 'Analyze SERP features and optimize content structure to improve visibility.';
}

module.exports = { processAEOOpportunities };
