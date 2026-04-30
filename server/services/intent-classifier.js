const INTENT_PATTERNS = {
  transactional: [
    'buy', 'pricing', 'cost', 'demo', 'trial', 'free', 'signup', 'sign up',
    'get started', 'tool', 'software', 'platform', 'app', 'purchase', 'order',
    'download', 'subscribe',
  ],
  commercial: [
    'best', 'top', 'vs', 'versus', 'alternative', 'comparison', 'review',
    'compared', 'recommend', 'which',
  ],
  informational: [
    'how to', 'what is', 'what are', 'guide', 'tutorial', 'learn', 'tips',
    'examples', 'template', 'definition', 'meaning', 'why', 'when to',
  ],
  navigational: [
    'login', 'log in', 'sign in', 'support', 'contact', 'help',
  ],
};

const PAGE_TYPE_PATTERNS = [
  { pattern: /\bbest\s+\w+/i, type: 'Listicle / Roundup' },
  { pattern: /\w+\s+vs\s+\w+/i, type: 'Versus / Comparison' },
  { pattern: /\w+\s+alternative/i, type: 'Alternatives Page' },
  { pattern: /\w+\s+(software|tool|platform|app)\b/i, type: 'Product / Solution Page' },
  { pattern: /\bhow\s+to\b/i, type: 'Guide / Tutorial' },
  { pattern: /\w+\s+pricing/i, type: 'Pricing Page' },
  { pattern: /\w+\s+integration/i, type: 'Integration Page' },
  { pattern: /\w+\s+for\s+\w+/i, type: 'Industry Landing Page' },
  { pattern: /\w+\s+template/i, type: 'Template / Resource Page' },
  { pattern: /\w+\s+examples?/i, type: 'Examples / Showcase Page' },
];

/**
 * Classify search intent for a keyword
 */
function classifyIntent(keyword) {
  const kw = keyword.toLowerCase();

  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (patterns.some(p => kw.includes(p))) {
      return intent;
    }
  }
  return 'informational';
}

/**
 * Suggest a page type based on keyword
 */
function suggestPageType(keyword) {
  for (const { pattern, type } of PAGE_TYPE_PATTERNS) {
    if (pattern.test(keyword)) {
      return type;
    }
  }
  return 'Content Page';
}

module.exports = { classifyIntent, suggestPageType };
