/**
 * BofU (Bottom-of-Funnel) Keyword Focus Filter
 *
 * Filters keywords and pages to only show commercial/transactional
 * content matching user-selected BofU categories.
 */

const BOFU_CATEGORIES = {
  listicles: ['best', 'top'],
  comparisons: ['vs', 'versus', 'compared', 'comparison'],
  alternatives: ['alternative', 'alternatives to'],
  pricing: ['pricing', 'cost', 'plans'],
  product_tool: ['tool', 'software', 'platform', 'app', 'application', 'builder'],
  solution: ['solution', 'for', 'use case'],
  competitor: [],
};

// Maps BofU categories to page-classifier.js page types (for Module 4)
const BOFU_TO_PAGE_TYPES = {
  listicles: ['listicle'],
  comparisons: ['comparison_page'],
  alternatives: ['alternative_page'],
  pricing: ['pricing_page'],
  product_tool: ['product_page', 'landing_page'],
  solution: ['solution_page'],
  competitor: ['competitor_page'],
};

/**
 * Build a flat array of compiled regex patterns from a BofU config.
 * ALL patterns use word-boundary matching to avoid false positives
 * (e.g., "form" should NOT match "information").
 */
function buildBofuPatterns(bofuConfig) {
  const rawPatterns = [];
  for (const type of (bofuConfig.selectedTypes || [])) {
    const categoryPatterns = BOFU_CATEGORIES[type];
    if (categoryPatterns) {
      rawPatterns.push(...categoryPatterns);
    }
  }
  for (const custom of (bofuConfig.customPatterns || [])) {
    const trimmed = custom.trim().toLowerCase();
    if (trimmed) rawPatterns.push(trimmed);
  }

  // Compile unique patterns into word-boundary regexes
  const unique = [...new Set(rawPatterns)];
  return unique.map(p => {
    // Multi-word patterns (e.g., "alternatives to", "use case") — match as phrase
    // Single-word patterns — match with word boundaries
    const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i');
  });
}

/**
 * Check if a keyword matches any BofU pattern
 */
function matchesBofuFilter(keyword, patterns) {
  if (!keyword || patterns.length === 0) return false;
  for (const regex of patterns) {
    if (regex.test(keyword)) return true;
  }
  return false;
}

/**
 * Filter an array of keyword objects by BofU config.
 * Returns the array unchanged if BofU is disabled.
 */
function filterKeywordsByBofu(items, bofuConfig, keywordField = 'keyword') {
  if (!bofuConfig || !bofuConfig.enabled) return items;
  if (!Array.isArray(items)) return items;

  const patterns = buildBofuPatterns(bofuConfig);
  if (patterns.length === 0) return items;

  return items.filter(item => matchesBofuFilter(item[keywordField], patterns));
}

/**
 * Get the set of page types allowed by the BofU config (for Module 4).
 * Returns null if BofU is disabled (meaning all types allowed).
 */
function getBofuPageTypes(bofuConfig) {
  if (!bofuConfig || !bofuConfig.enabled) return null;

  const types = new Set();
  for (const category of (bofuConfig.selectedTypes || [])) {
    const pageTypes = BOFU_TO_PAGE_TYPES[category];
    if (pageTypes) {
      pageTypes.forEach(t => types.add(t));
    }
  }

  // If no categories map to page types, return null (don't filter)
  return types.size > 0 ? types : null;
}

/**
 * Classify a keyword into funnel stage: BofU, MoFu, or ToFu
 */
function classifyFunnelStage(keyword) {
  if (!keyword) return 'tofu';
  const kw = keyword.toLowerCase();

  // BofU patterns (commercial/transactional)
  const bofuPatterns = [
    /\b(best|top)\b/, /\b(vs|versus|compared|comparison)\b/,
    /\b(alternative|alternatives)\b/, /\b(pricing|cost|plans)\b/,
    /\b(tool|software|platform|app|application|builder)\b/,
    /\b(buy|purchase|demo|trial|free|signup|get started)\b/,
    /\b(review|reviews)\b/,
  ];
  if (bofuPatterns.some(r => r.test(kw))) return 'bofu';

  // MoFu patterns (consideration/evaluation)
  const mofuPatterns = [
    /\b(how to|guide|tutorial|learn|tips|examples|template)\b/,
    /\b(solution|use case|case study|success story)\b/,
    /\b(integrate|integration|workflow|strategy)\b/,
    /\b(benchmark|checklist|framework|playbook)\b/,
  ];
  if (mofuPatterns.some(r => r.test(kw))) return 'mofu';

  // Everything else is ToFu (awareness)
  return 'tofu';
}

module.exports = {
  BOFU_CATEGORIES,
  BOFU_TO_PAGE_TYPES,
  buildBofuPatterns,
  matchesBofuFilter,
  filterKeywordsByBofu,
  getBofuPageTypes,
  classifyFunnelStage,
};
