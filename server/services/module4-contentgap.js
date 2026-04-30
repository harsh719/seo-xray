const { classifyPage, classifyAndFilterPages } = require('./page-classifier');
const { getBofuPageTypes, filterKeywordsByBofu } = require('../utils/bofu-filter');

/**
 * Module 4: Content Gap Analysis (Money Pages Only)
 */
async function processContentGap(client, config, onPageTaskId) {
  const { clientDomain, competitors, language, locationCode } = config;

  // Step 1: Get client pages from OnPage crawl
  let clientPages = [];
  if (onPageTaskId) {
    try {
      const pagesResponse = await client.onPagePages(onPageTaskId, { limit: 500 });
      clientPages = parseOnPageResults(pagesResponse);
    } catch (err) {
      console.error('OnPage pages fetch failed:', err.message);
    }
  }

  // Classify client pages and filter out blogs
  const bofuConfig = config.bofuConfig;
  const allowedPageTypes = getBofuPageTypes(bofuConfig);
  let classifiedClientPages = classifyAndFilterPages(clientPages);
  if (allowedPageTypes) {
    classifiedClientPages = classifiedClientPages.filter(p => allowedPageTypes.has(p.page_type));
  }

  // Step 2: Get competitor pages (parallel)
  const competitorPagesMap = {};
  const compPromises = competitors.map(async (comp) => {
    try {
      const response = await client.relevantPages(comp, { language, locationCode, limit: 500 });
      const pages = parseRelevantPages(response, comp);
      let classified = classifyAndFilterPages(pages);
      if (allowedPageTypes) {
        classified = classified.filter(p => allowedPageTypes.has(p.page_type));
      }
      competitorPagesMap[comp] = classified;
    } catch (err) {
      console.error(`Relevant pages failed for ${comp}:`, err.message);
      competitorPagesMap[comp] = [];
    }
  });
  await Promise.all(compPromises);

  // Step 3: Build page type counts
  const clientTypeCounts = countPageTypes(classifiedClientPages);
  const competitorTypeCounts = {};
  for (const [comp, pages] of Object.entries(competitorPagesMap)) {
    competitorTypeCounts[comp] = countPageTypes(pages);
  }

  // Step 4: Identify gaps
  const gaps = [];
  const allPageTypes = new Set();

  for (const counts of [clientTypeCounts, ...Object.values(competitorTypeCounts)]) {
    Object.keys(counts).forEach(t => allPageTypes.add(t));
  }

  for (const pageType of allPageTypes) {
    if (pageType === 'blog' || pageType === 'other') continue;
    const clientCount = clientTypeCounts[pageType] || 0;

    for (const [comp, pages] of Object.entries(competitorPagesMap)) {
      const compPages = pages.filter(p => p.page_type === pageType);
      if (compPages.length > 0 && clientCount === 0) {
        // Page type gap — client has none, competitor has some
        for (const page of compPages.slice(0, 5)) {
          gaps.push({
            gap_type: 'page_type_missing',
            page_type: pageType,
            competitor_url: page.url,
            competitor_domain: comp,
            competitor_page_title: page.title || '',
            estimated_traffic: page.estimated_traffic || 0,
            target_keywords: [],
            total_keyword_volume: 0,
            recommendation: `Create a ${formatPageType(pageType)} — competitor ${comp} has ${compPages.length} such pages.`,
            priority: compPages.length >= 3 ? 'high' : 'medium',
          });
        }
      } else if (compPages.length > clientCount && clientCount > 0) {
        // Topic gap — competitor has more pages of this type
        for (const page of compPages.slice(0, 3)) {
          const clientHasSimilar = classifiedClientPages.some(cp =>
            cp.page_type === pageType && isSimilarTopic(cp, page)
          );
          if (!clientHasSimilar) {
            gaps.push({
              gap_type: 'topic_gap',
              page_type: pageType,
              competitor_url: page.url,
              competitor_domain: comp,
              competitor_page_title: page.title || '',
              estimated_traffic: page.estimated_traffic || 0,
              target_keywords: [],
              total_keyword_volume: 0,
              recommendation: `Consider creating a ${formatPageType(pageType)} similar to ${page.url}`,
              priority: (page.estimated_traffic || 0) > 500 ? 'high' : 'medium',
            });
          }
        }
      }
    }
  }

  // Fetch keyword data for top gaps (limit to save cost)
  const topGaps = gaps
    .sort((a, b) => b.estimated_traffic - a.estimated_traffic)
    .slice(0, 20);

  for (const gap of topGaps) {
    try {
      const kwResponse = await client.rankedKeywords(gap.competitor_domain, {
        language,
        locationCode,
        filters: [
          ['ranked_serp_element.serp_item.relative_url', '=', new URL(gap.competitor_url.startsWith('http') ? gap.competitor_url : `https://${gap.competitor_url}`).pathname],
        ],
        limit: 50,
      });
      gap.target_keywords = filterKeywordsByBofu(parseGapKeywords(kwResponse), bofuConfig);
      gap.total_keyword_volume = gap.target_keywords.reduce((s, k) => s + k.search_volume, 0);
    } catch {
      // Keyword fetch for gap is optional
    }
  }

  gaps.sort((a, b) => b.total_keyword_volume - a.total_keyword_volume || b.estimated_traffic - a.estimated_traffic);

  // Build comparison matrix
  const matrix = {};
  for (const pageType of allPageTypes) {
    if (pageType === 'blog') continue;
    matrix[pageType] = {
      client: clientTypeCounts[pageType] || 0,
      ...Object.fromEntries(
        Object.entries(competitorTypeCounts).map(([comp, counts]) => [comp, counts[pageType] || 0])
      ),
    };
  }

  return {
    gaps,
    matrix,
    clientPages: classifiedClientPages,
    summary: {
      totalGaps: gaps.length,
      pageTypeMissing: gaps.filter(g => g.gap_type === 'page_type_missing').length,
      topicGaps: gaps.filter(g => g.gap_type === 'topic_gap').length,
      highPriority: gaps.filter(g => g.priority === 'high').length,
    },
  };
}

function parseOnPageResults(response) {
  const results = [];
  const tasks = response?.tasks || [];
  for (const task of tasks) {
    if (task.status_code !== 20000 || !task.result) continue;
    for (const resultItem of task.result) {
      const items = resultItem.items || [];
      for (const item of items) {
        results.push({
          url: item.url || '',
          title: item.meta?.title || '',
          status_code: item.status_code,
          resource_type: item.resource_type,
          h1: item.meta?.htags?.h1?.[0] || '',
        });
      }
    }
  }
  return results;
}

function parseRelevantPages(response, domain) {
  const results = [];
  const tasks = response?.tasks || [];
  for (const task of tasks) {
    if (task.status_code !== 20000 || !task.result) continue;
    for (const resultItem of task.result) {
      const items = resultItem.items || [];
      for (const item of items) {
        results.push({
          url: item.page_address || '',
          title: item.meta?.title || '',
          estimated_traffic: item.metrics?.organic?.etv || 0,
          ranking_keywords_count: item.metrics?.organic?.count || 0,
          avg_position: item.metrics?.organic?.pos_1 ? calculateAvgPos(item.metrics.organic) : 0,
          domain,
        });
      }
    }
  }
  return results;
}

function calculateAvgPos(metrics) {
  const positions = [
    { pos: 1, count: metrics.pos_1 || 0 },
    { pos: 5, count: metrics.pos_2_3 || 0 },
    { pos: 7, count: metrics.pos_4_10 || 0 },
    { pos: 15, count: metrics.pos_11_20 || 0 },
    { pos: 30, count: metrics.pos_21_30 || 0 },
  ];
  const total = positions.reduce((s, p) => s + p.count, 0);
  if (total === 0) return 0;
  const weighted = positions.reduce((s, p) => s + p.pos * p.count, 0);
  return Math.round((weighted / total) * 10) / 10;
}

function countPageTypes(pages) {
  const counts = {};
  for (const page of pages) {
    const type = page.page_type || 'other';
    counts[type] = (counts[type] || 0) + 1;
  }
  return counts;
}

function isSimilarTopic(page1, page2) {
  const title1 = (page1.title || '').toLowerCase();
  const title2 = (page2.title || '').toLowerCase();
  const words1 = new Set(title1.split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(title2.split(/\s+/).filter(w => w.length > 3));
  let overlap = 0;
  for (const w of words1) {
    if (words2.has(w)) overlap++;
  }
  return overlap >= 2;
}

function parseGapKeywords(response) {
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
          difficulty: kwData.keyword_info?.keyword_difficulty || 0,
        });
      }
    }
  }
  return results;
}

function formatPageType(type) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

module.exports = { processContentGap, parseRelevantPages };
