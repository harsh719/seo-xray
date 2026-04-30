const { calculateSIS } = require('./scoring');
const { classifyPage } = require('./page-classifier');
const { classifyFunnelStage } = require('../utils/bofu-filter');

/**
 * Module 5: Strengths Analysis
 */
function compileStrengths({
  topKeywords,          // rank 1-10 keywords
  clientRelevantPages,  // from relevant_pages endpoint
  competitiveMoat,      // from inverse domain intersection
  aioWins,              // from module 3
  serpFeatureWins,      // from module 3 SERP data
  backlinkData,        // client + competitor backlink summaries
  onPageSummary,       // from onpage crawl
  competitors,
}) {
  // Summary stats
  const totalTop10 = topKeywords.length;
  const totalTraffic = topKeywords.reduce((s, k) => s + (k.etv || 0), 0);

  const clientBacklinks = backlinkData?.client || {};
  const domainRank = clientBacklinks.rank || 0;
  const referringDomains = clientBacklinks.referring_domains || 0;

  const maxEtv = Math.max(...topKeywords.map(k => k.etv || 0), 1);

  // Score and sort top keywords — include funnel stage
  const scoredKeywords = topKeywords.map(kw => ({
    keyword: kw.keyword,
    rank: kw.rank_group || kw.rank || 0,
    search_volume: kw.search_volume || 0,
    etv: kw.etv || 0,
    cpc: kw.cpc || 0,
    ranking_url: kw.relative_url || kw.ranking_url || '',
    is_position_1: (kw.rank_group || kw.rank || 0) === 1,
    has_featured_snippet: false,
    has_ai_overview_citation: aioWins.some(
      w => w.keyword.toLowerCase() === kw.keyword.toLowerCase()
    ),
    funnel_stage: classifyFunnelStage(kw.keyword),
    sis_score: calculateSIS(
      { ...kw, rank: kw.rank_group || kw.rank || 0, etv: kw.etv || 0 },
      { totalCompetitors: competitors.length, maxEtv }
    ),
  }));

  scoredKeywords.sort((a, b) => b.sis_score - a.sis_score);

  // Build keyword-per-page grouping for expandable pages
  const keywordsByPage = {};
  for (const kw of scoredKeywords) {
    const url = kw.ranking_url || 'unknown';
    if (!keywordsByPage[url]) keywordsByPage[url] = [];
    keywordsByPage[url].push({
      keyword: kw.keyword,
      rank: kw.rank,
      search_volume: kw.search_volume,
      etv: kw.etv,
      cpc: kw.cpc,
      funnel_stage: kw.funnel_stage,
    });
  }

  // Top pages — include funnel classification + keywords list
  const topPages = (clientRelevantPages || []).slice(0, 20).map(page => {
    const totalPageTraffic = clientRelevantPages.reduce((s, p) => s + (p.estimated_traffic || 0), 0);
    const url = page.url || page.page_address || '';
    const pageKeywords = keywordsByPage[url] || [];
    // Classify page funnel stage based on its keywords
    const funnelCounts = { bofu: 0, mofu: 0, tofu: 0 };
    for (const kw of pageKeywords) {
      funnelCounts[kw.funnel_stage] = (funnelCounts[kw.funnel_stage] || 0) + 1;
    }
    // Also classify by page URL/title
    const pageFunnel = classifyFunnelStage(page.title || url);

    return {
      url,
      estimated_traffic: page.estimated_traffic || 0,
      ranking_keywords_count: page.ranking_keywords_count || 0,
      avg_position: page.avg_position || 0,
      page_type: classifyPage(url, page.title || ''),
      traffic_share_pct: totalPageTraffic
        ? Math.round(((page.estimated_traffic || 0) / totalPageTraffic) * 1000) / 10
        : 0,
      funnel_stage: pageFunnel,
      keywords: pageKeywords,
    };
  });

  // Domain comparison
  const domainComparison = [
    {
      domain: backlinkData?.clientDomain || 'client',
      domain_rank: clientBacklinks.rank || 0,
      referring_domains: clientBacklinks.referring_domains || 0,
      total_backlinks: clientBacklinks.backlinks || 0,
      dofollow_pct: clientBacklinks.backlinks
        ? Math.round(((clientBacklinks.dofollow || 0) / clientBacklinks.backlinks) * 100)
        : 0,
      is_client: true,
    },
    ...Object.entries(backlinkData?.competitors || {}).map(([domain, data]) => ({
      domain,
      domain_rank: data.rank || 0,
      referring_domains: data.referring_domains || 0,
      total_backlinks: data.backlinks || 0,
      dofollow_pct: data.backlinks
        ? Math.round(((data.dofollow || 0) / data.backlinks) * 100)
        : 0,
      is_client: false,
    })),
  ];

  // Technical strengths from OnPage
  const technicalStrengths = parseTechnicalStrengths(onPageSummary);

  // Funnel distribution for keywords
  const funnelDistribution = { bofu: 0, mofu: 0, tofu: 0 };
  for (const kw of scoredKeywords) {
    funnelDistribution[kw.funnel_stage] = (funnelDistribution[kw.funnel_stage] || 0) + 1;
  }

  // Compile summary
  const summary = {
    total_top10_keywords: totalTop10,
    total_organic_traffic: totalTraffic,
    domain_rank: domainRank,
    referring_domains: referringDomains,
    featured_snippets_held: serpFeatureWins?.filter(w => w.feature_type === 'featured_snippet').length || 0,
    ai_overview_citations: aioWins.length,
    competitive_advantage_keywords: competitiveMoat?.length || 0,
    funnel_distribution: funnelDistribution,
  };

  return {
    summary,
    top_keywords: scoredKeywords.slice(0, 100),
    top_pages: topPages,
    competitive_moat: (competitiveMoat || []).slice(0, 50),
    serp_feature_wins: serpFeatureWins || [],
    domain_comparison: domainComparison,
    technical_strengths: technicalStrengths,
  };
}

function parseTechnicalStrengths(onPageSummary) {
  if (!onPageSummary) return [];
  const strengths = [];
  const data = onPageSummary;

  if (data.pages_with_canonical !== undefined && data.pages_crawled) {
    const pct = Math.round((data.pages_with_canonical / data.pages_crawled) * 100);
    strengths.push({
      metric: 'Canonical Tags',
      value: `${pct}%`,
      status: pct >= 90 ? 'strong' : pct >= 70 ? 'good' : 'needs_attention',
      benchmark: 'Industry avg: 85%',
    });
  }

  if (data.pages_with_https !== undefined && data.pages_crawled) {
    const pct = Math.round((data.pages_with_https / data.pages_crawled) * 100);
    strengths.push({
      metric: 'HTTPS Coverage',
      value: `${pct}%`,
      status: pct >= 99 ? 'strong' : pct >= 90 ? 'good' : 'needs_attention',
      benchmark: 'Expected: 100%',
    });
  }

  if (data.pages_with_h1 !== undefined && data.pages_crawled) {
    const pct = Math.round((data.pages_with_h1 / data.pages_crawled) * 100);
    strengths.push({
      metric: 'H1 Tags Present',
      value: `${pct}%`,
      status: pct >= 95 ? 'strong' : pct >= 80 ? 'good' : 'needs_attention',
      benchmark: 'Best practice: 100%',
    });
  }

  if (data.internal_links_avg !== undefined) {
    strengths.push({
      metric: 'Avg Internal Links/Page',
      value: data.internal_links_avg,
      status: data.internal_links_avg >= 15 ? 'strong' : data.internal_links_avg >= 10 ? 'good' : 'needs_attention',
      benchmark: 'Industry avg: ~10',
    });
  }

  return strengths;
}

module.exports = { compileStrengths };
