const PAGE_CLASSIFIERS = {
  product_page: {
    url_patterns: ['/product', '/platform', '/features', '/feature/'],
    title_signals: ['product', 'platform', 'feature'],
  },
  solution_page: {
    url_patterns: ['/solution', '/use-case', '/industry/', '/for-'],
    title_signals: ['solution', 'use case', 'for'],
  },
  landing_page: {
    url_patterns: ['/lp/', '/landing/', '/get-', '/try-', '/start-'],
    title_signals: ['get started', 'try', 'free', 'demo'],
  },
  listicle: {
    url_patterns: ['/best-', '/top-'],
    title_signals: ['best', 'top 10', 'top 5', 'top 15', 'top 20'],
  },
  comparison_page: {
    url_patterns: ['/vs-', '-vs-', '/versus-', '/compare/', '/comparison/'],
    title_signals: ['vs', 'versus', 'compared', 'comparison'],
  },
  alternative_page: {
    url_patterns: ['/alternative', '-alternatives'],
    title_signals: ['alternative', 'alternatives to'],
  },
  competitor_page: {
    url_patterns: ['/competitor'],
    title_signals: ['competitor'],
  },
  pricing_page: {
    url_patterns: ['/pricing', '/plans'],
    title_signals: ['pricing', 'plans', 'cost'],
  },
  integration_page: {
    url_patterns: ['/integration', '/connect/'],
    title_signals: ['integration', 'connect', 'integrates with'],
  },
  case_study: {
    url_patterns: ['/case-study', '/customer-story', '/success-story'],
    title_signals: ['case study', 'customer story', 'success story'],
  },
  blog: {
    url_patterns: ['/blog/', '/articles/', '/resources/blog', '/insights/'],
    title_signals: [],
  },
};

/**
 * Classify a page based on URL and title
 * Returns the page type string or 'other'
 */
function classifyPage(url, title = '') {
  const urlLower = (url || '').toLowerCase();
  const titleLower = (title || '').toLowerCase();

  for (const [pageType, config] of Object.entries(PAGE_CLASSIFIERS)) {
    const urlMatch = config.url_patterns.some(p => urlLower.includes(p));
    const titleMatch = config.title_signals.some(s => titleLower.includes(s));

    if (urlMatch || titleMatch) {
      return pageType;
    }
  }

  return 'other';
}

/**
 * Check if a page is a blog page
 */
function isBlogPage(url, title = '') {
  return classifyPage(url, title) === 'blog';
}

/**
 * Classify an array of pages and filter out blogs
 */
function classifyAndFilterPages(pages) {
  return pages
    .map(page => ({
      ...page,
      page_type: classifyPage(page.url || page.relative_url, page.title || page.meta?.title),
    }))
    .filter(page => page.page_type !== 'blog');
}

module.exports = { classifyPage, isBlogPage, classifyAndFilterPages, PAGE_CLASSIFIERS };
