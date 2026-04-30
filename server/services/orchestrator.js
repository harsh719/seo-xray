const { DFSClient } = require('./dfs-client');
const { processStrikingDistance, parseRankedKeywords } = require('./module1-striking');
const { processNewPageOpportunities } = require('./module2-newpages');
const { processAEOOpportunities } = require('./module3-aeo');
const { processContentGap, parseRelevantPages } = require('./module4-contentgap');
const { compileStrengths } = require('./module5-strengths');
const { normalizeDomain } = require('../utils/url-utils');
const { filterKeywordsByBofu } = require('../utils/bofu-filter');

// In-memory audit store
const audits = new Map();

function getAudit(id) {
  return audits.get(id);
}

function createAudit(id, config) {
  const audit = {
    id,
    config,
    status: 'running',
    progress: 0,
    currentStep: 'Initializing...',
    logs: [],
    results: {},
    error: null,
    startedAt: new Date().toISOString(),
  };
  audits.set(id, audit);
  return audit;
}

function log(audit, message) {
  const entry = { time: new Date().toISOString(), message };
  audit.logs.push(entry);
  console.log(`[${audit.id}] ${message}`);
}

async function runAudit(auditId, config) {
  const audit = getAudit(auditId);
  if (!audit) return;

  const client = new DFSClient(config.login, config.password);
  const clientDomain = normalizeDomain(config.clientUrl);
  const competitors = config.competitors.map(normalizeDomain).filter(Boolean);
  const language = config.language || 'English';
  const locationCode = config.locationCode || 2840;
  const serpDepth = config.serpDepth || 20;

  const bofuConfig = config.bofuConfig || { enabled: false, selectedTypes: [], customPatterns: [] };
  const moduleConfig = { clientDomain, competitors, language, locationCode, serpDepth, bofuConfig };

  try {
    // Step 1: Domain Rank Overview
    audit.progress = 2;
    audit.currentStep = 'Fetching domain overview...';
    log(audit, `Starting audit for ${clientDomain}`);
    if (bofuConfig.enabled) {
      log(audit, `BofU filter active — types: ${bofuConfig.selectedTypes.join(', ')}${bofuConfig.customPatterns.length ? ', custom: ' + bofuConfig.customPatterns.join(', ') : ''}`);
    }

    let domainOverview = null;
    try {
      const overviewResp = await client.domainRankOverview(clientDomain, { language, locationCode });
      domainOverview = overviewResp?.tasks?.[0]?.result?.[0] || null;
    } catch (err) {
      log(audit, `Domain overview fetch failed: ${err.message}`);
    }

    // Step 2: Start OnPage crawl early (async)
    audit.progress = 5;
    audit.currentStep = 'Starting site crawl...';
    log(audit, 'Submitting OnPage crawl task');

    let onPageTaskId = null;
    try {
      const crawlResp = await client.onPageTaskPost(clientDomain, {
        maxCrawlPages: config.crawlPages || 500,
      });
      onPageTaskId = crawlResp?.tasks?.[0]?.id || null;
      log(audit, `OnPage crawl task started: ${onPageTaskId}`);
    } catch (err) {
      log(audit, `OnPage crawl failed to start: ${err.message}`);
    }

    // Step 3: Ranked Keywords (positions 1-30 combined)
    audit.progress = 10;
    audit.currentStep = 'Analyzing keyword rankings (1-30)...';
    log(audit, 'Fetching ranked keywords (positions 1-30)');

    let allRankedKeywords = [];
    try {
      const rankResp = await client.rankedKeywords(clientDomain, {
        language,
        locationCode,
        filters: [
          ['ranked_serp_element.serp_item.rank_group', '<=', 30],
          'and',
          ['ranked_serp_element.serp_item.type', '=', 'organic'],
        ],
        limit: 1000,
      });
      allRankedKeywords = parseRankedKeywords(rankResp);

      // Paginate if needed
      const totalCount = rankResp?.tasks?.[0]?.result?.[0]?.total_count || 0;
      if (totalCount > 1000) {
        const pages = Math.min(Math.ceil(totalCount / 1000), 5);
        for (let i = 1; i < pages; i++) {
          const pageResp = await client.rankedKeywords(clientDomain, {
            language, locationCode,
            filters: [
              ['ranked_serp_element.serp_item.rank_group', '<=', 30],
              'and',
              ['ranked_serp_element.serp_item.type', '=', 'organic'],
            ],
            limit: 1000,
            offset: i * 1000,
          });
          allRankedKeywords.push(...parseRankedKeywords(pageResp));
        }
      }
      log(audit, `Found ${allRankedKeywords.length} ranked keywords (pos 1-30)`);
    } catch (err) {
      log(audit, `Ranked keywords fetch failed: ${err.message}`);
    }

    // Split: rank 1-10 → Module 5, rank 11-30 → Module 1
    // Apply BofU filter after rank split
    const top10Keywords = filterKeywordsByBofu(
      allRankedKeywords.filter(k => k.rank_group <= 10), bofuConfig
    );
    const strikingRaw = filterKeywordsByBofu(
      allRankedKeywords.filter(k => k.rank_group >= 11 && k.rank_group <= 30), bofuConfig
    );
    if (bofuConfig.enabled) {
      log(audit, `BofU filter: ${top10Keywords.length} top-10 keywords, ${strikingRaw.length} striking distance keywords after filtering`);
    }

    // Module 1: Striking Distance
    audit.progress = 18;
    audit.currentStep = 'Processing striking distance keywords...';
    const module1Results = await processStrikingDistance(strikingRaw);
    audit.results.module1 = module1Results;
    log(audit, `Module 1 complete: ${module1Results.keywords.length} striking distance keywords`);

    // Step 4: Backlink summaries (parallel)
    audit.progress = 22;
    audit.currentStep = 'Analyzing backlink profiles...';
    log(audit, 'Fetching backlink summaries');

    const backlinkData = { clientDomain, client: {}, competitors: {} };
    try {
      const [clientBL, ...compBLs] = await Promise.all([
        client.backlinksSummary(clientDomain),
        ...competitors.map(c => client.backlinksSummary(c).catch(() => null)),
      ]);
      backlinkData.client = clientBL?.tasks?.[0]?.result?.[0] || {};
      competitors.forEach((comp, i) => {
        backlinkData.competitors[comp] = compBLs[i]?.tasks?.[0]?.result?.[0] || {};
      });
    } catch (err) {
      log(audit, `Backlink fetch failed: ${err.message}`);
    }

    // Step 5: Module 2 — New Page Opportunities + Competitive Moat
    audit.progress = 28;
    audit.currentStep = 'Finding new page opportunities...';
    log(audit, 'Running Module 2: New Page Opportunities');

    const module2Results = await processNewPageOpportunities(client, moduleConfig, allRankedKeywords);
    audit.results.module2 = module2Results;
    log(audit, `Module 2 complete: ${module2Results.opportunities.length} opportunities`);

    // Competitive moat (inverse intersection)
    audit.progress = 42;
    audit.currentStep = 'Analyzing competitive advantages...';
    log(audit, 'Fetching competitive moat data');

    let competitiveMoat = [];
    try {
      const moatPromises = competitors.map(async (comp) => {
        try {
          const resp = await client.domainIntersection(clientDomain, comp, {
            language, locationCode, intersections: false,
            filters: [
              ['keyword_data.keyword_info.search_volume', '>=', 50],
              'and',
              ['first_domain_serp_element.serp_item.rank_group', '<=', 20],
            ],
            limit: 500,
          });
          return { competitor: comp, data: resp };
        } catch { return { competitor: comp, data: null }; }
      });
      const moatResults = await Promise.all(moatPromises);

      const moatMap = new Map();
      for (const { competitor, data } of moatResults) {
        if (!data) continue;
        const tasks = data.tasks || [];
        for (const task of tasks) {
          if (task.status_code !== 20000 || !task.result) continue;
          for (const r of task.result) {
            for (const item of (r.items || [])) {
              const kw = item.keyword_data?.keyword || '';
              const key = kw.toLowerCase();
              if (!moatMap.has(key)) {
                moatMap.set(key, {
                  keyword: kw,
                  search_volume: item.keyword_data?.keyword_info?.search_volume || 0,
                  rank: item.first_domain_serp_element?.serp_item?.rank_group || 0,
                  competitors_not_ranking: [competitor],
                });
              } else {
                moatMap.get(key).competitors_not_ranking.push(competitor);
              }
            }
          }
        }
      }
      competitiveMoat = filterKeywordsByBofu(
        Array.from(moatMap.values()).sort((a, b) => b.search_volume - a.search_volume),
        bofuConfig
      );
    } catch (err) {
      log(audit, `Competitive moat fetch failed: ${err.message}`);
    }

    // Step 6: Module 3 — AEO/GEO
    audit.progress = 52;
    audit.currentStep = 'Analyzing AI Overview opportunities...';
    log(audit, 'Running Module 3: AEO/GEO Analysis');

    const module3Results = await processAEOOpportunities(
      client, moduleConfig, module1Results.keywords
    );
    audit.results.module3 = module3Results;
    log(audit, `Module 3 complete: ${module3Results.gaps.length} AEO gaps`);

    // Step 7: Wait for OnPage crawl and run Module 4
    audit.progress = 68;
    audit.currentStep = 'Waiting for site crawl to complete...';

    if (onPageTaskId) {
      log(audit, 'Polling OnPage crawl status...');
      let crawlReady = false;
      for (let i = 0; i < 30; i++) {
        try {
          const summaryResp = await client.onPageSummary(onPageTaskId);
          const crawlProgress = summaryResp?.tasks?.[0]?.result?.[0]?.crawl_progress;
          if (crawlProgress === '100' || crawlProgress === 100 || crawlProgress === 1) {
            crawlReady = true;
            // Store OnPage summary for Module 5
            audit.results._onPageSummary = summaryResp?.tasks?.[0]?.result?.[0] || null;
            break;
          }
          log(audit, `Crawl progress: ${crawlProgress || 'pending'}...`);
        } catch { /* polling */ }
        await new Promise(r => setTimeout(r, 10000));
      }
      if (!crawlReady) {
        log(audit, 'OnPage crawl timed out — skipping Module 4 detailed analysis');
      }
    }

    audit.progress = 72;
    audit.currentStep = 'Analyzing content gaps...';
    log(audit, 'Running Module 4: Content Gap Analysis');

    // Fetch client relevant pages for Module 5
    let clientRelevantPages = [];
    try {
      const relResp = await client.relevantPages(clientDomain, { language, locationCode, limit: 100 });
      const tasks = relResp?.tasks || [];
      for (const task of tasks) {
        if (task.status_code !== 20000 || !task.result) continue;
        for (const r of task.result) {
          clientRelevantPages = (r.items || []).map(item => ({
            url: item.page_address || '',
            title: item.meta?.title || '',
            estimated_traffic: item.metrics?.organic?.etv || 0,
            ranking_keywords_count: item.metrics?.organic?.count || 0,
            avg_position: 0,
          }));
        }
      }
    } catch (err) {
      log(audit, `Client relevant pages failed: ${err.message}`);
    }

    const module4Results = await processContentGap(client, moduleConfig, onPageTaskId);
    audit.results.module4 = module4Results;
    log(audit, `Module 4 complete: ${module4Results.gaps.length} content gaps`);

    // Step 8: Module 5 — Compile Strengths
    audit.progress = 88;
    audit.currentStep = 'Compiling strengths analysis...';
    log(audit, 'Running Module 5: Strengths Analysis');

    const module5Results = compileStrengths({
      topKeywords: top10Keywords,
      clientRelevantPages,
      competitiveMoat,
      aioWins: module3Results.aioWins || [],
      serpFeatureWins: module3Results.serpResults?.filter(s => s.client_in_ai_overview || s.serp_features.length > 0) || [],
      backlinkData,
      onPageSummary: audit.results._onPageSummary || null,
      competitors,
    });
    audit.results.module5 = module5Results;
    log(audit, 'Module 5 complete');

    // Store domain overview
    audit.results.overview = {
      domainOverview,
      rankDistribution: buildRankDistribution(
        bofuConfig.enabled ? filterKeywordsByBofu(allRankedKeywords, bofuConfig) : allRankedKeywords
      ),
      totalKeywords: bofuConfig.enabled
        ? filterKeywordsByBofu(allRankedKeywords, bofuConfig).length
        : allRankedKeywords.length,
      estimatedCost: client.getCost(),
      bofuActive: bofuConfig.enabled || false,
    };

    // Done
    audit.progress = 100;
    audit.status = 'completed';
    audit.currentStep = 'Audit complete!';
    audit.completedAt = new Date().toISOString();
    log(audit, 'Audit completed successfully');

  } catch (err) {
    audit.status = 'error';
    audit.error = err.message;
    audit.currentStep = `Error: ${err.message}`;
    log(audit, `Audit failed: ${err.message}`);
  }
}

function buildRankDistribution(keywords) {
  const dist = { '1-3': 0, '4-10': 0, '11-20': 0, '21-30': 0 };
  for (const kw of keywords) {
    const r = kw.rank_group;
    if (r <= 3) dist['1-3']++;
    else if (r <= 10) dist['4-10']++;
    else if (r <= 20) dist['11-20']++;
    else if (r <= 30) dist['21-30']++;
  }
  return dist;
}

module.exports = { createAudit, getAudit, runAudit };
