/**
 * Deduplicate keywords by exact match, keeping the entry with the highest priority score
 */
function deduplicateKeywords(keywords, scoreField = 'priority_score') {
  const map = new Map();
  for (const kw of keywords) {
    const key = kw.keyword.toLowerCase().trim();
    const existing = map.get(key);
    if (!existing || (kw[scoreField] || 0) > (existing[scoreField] || 0)) {
      map.set(key, kw);
    }
  }
  return Array.from(map.values());
}

/**
 * Remove keywords that appear in an exclusion set
 */
function excludeKeywords(keywords, exclusionSet) {
  const excluded = new Set(exclusionSet.map(k => (typeof k === 'string' ? k : k.keyword).toLowerCase().trim()));
  return keywords.filter(kw => !excluded.has(kw.keyword.toLowerCase().trim()));
}

module.exports = { deduplicateKeywords, excludeKeywords };
