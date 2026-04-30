/**
 * Normalize a domain string: strip protocol, www, trailing slash
 */
function normalizeDomain(url) {
  if (!url) return '';
  let domain = url.trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//, '');
  domain = domain.replace(/^www\./, '');
  domain = domain.replace(/\/+$/, '');
  return domain;
}

/**
 * Validate URL format
 */
function isValidDomain(domain) {
  const normalized = normalizeDomain(domain);
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,})+$/.test(normalized);
}

/**
 * Extract path from full URL
 */
function extractPath(url) {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.pathname;
  } catch {
    return url;
  }
}

module.exports = { normalizeDomain, isValidDomain, extractPath };
