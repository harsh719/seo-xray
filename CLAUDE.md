# CLAUDE.md — SEO Audit Agent (Codename: AuditPilot)

## Project Overview

AuditPilot is a full-stack SEO audit agent built as a React application with a Node.js backend. It audits any website without requiring Google Search Console or Google Analytics access — relying entirely on the website itself and DataForSEO REST API for all data.

The agent produces three output formats:
1. **Interactive React Dashboard** — real-time visual audit results
2. **XLSX Report** — downloadable spreadsheet with all raw data + analysis
3. **DOCX Report** — professional audit document for client delivery

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  FRONTEND (React)                │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  Input    │  │Dashboard │  │  Export   │      │
│  │  Panel    │  │  Views   │  │  Panel    │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       │              │              │             │
│       └──────────────┴──────────────┘             │
│                      │                            │
│              ┌───────┴───────┐                    │
│              │  State Store  │                    │
│              │  (Zustand)    │                    │
│              └───────┬───────┘                    │
└──────────────────────┼────────────────────────────┘
                       │ REST API calls
┌──────────────────────┼────────────────────────────┐
│                  BACKEND (Node/Express)            │
│                      │                             │
│  ┌───────────────────┴───────────────────┐        │
│  │          Orchestrator Layer            │        │
│  │  (Sequences API calls, manages state) │        │
│  └───────────────────┬───────────────────┘        │
│                      │                             │
│  ┌─────────┬─────────┼─────────┬─────────┬─────────┐│
│  │Module 1 │Module 2 │Module 3 │Module 4 │Module 5 ││
│  │Striking │New Page │AEO/GEO  │Content  │Strengths││
│  │Distance │Opps     │Opps     │Gap      │Analysis ││
│  └────┬────┘└────┬───┘└────┬───┘└────┬───┘└────┬───┘│
│       │          │         │         │            │
│  ┌────┴──────────┴─────────┴─────────┴───┐       │
│  │       DataForSEO API Client           │       │
│  │  (Auth, rate limiting, retry logic)    │       │
│  └───────────────────┬───────────────────┘       │
│                      │                            │
│  ┌───────────────────┴───────────────────┐       │
│  │       Report Generator Layer          │       │
│  │  (XLSX via openpyxl, DOCX via docx-js)│       │
│  └───────────────────────────────────────┘       │
└───────────────────────────────────────────────────┘
                       │
                       ▼
            ┌─────────────────────┐
            │  DataForSEO REST API│
            │  api.dataforseo.com │
            └─────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + Tailwind CSS | Dashboard UI |
| State | Zustand | Client-side state management |
| Charts | Recharts | Data visualization |
| Backend | Node.js + Express | API orchestration |
| Data Source | DataForSEO REST API (v3) | All SEO data |
| XLSX Export | Python + openpyxl | Spreadsheet reports |
| DOCX Export | Node.js + docx-js | Word document reports |
| Auth | Basic Auth (base64) | DFS API authentication |

---

## Module Specifications

### Module 1: Striking Distance Keywords (Rank 11-30)

**Purpose:** Find keywords where the client domain ranks between positions 11-30. These are low-hanging fruit — close to page 1 — that can be optimized for both traditional Google SEO and AEO.

**DataForSEO Endpoint:**
```
POST https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live
```

**Request Payload:**
```json
[{
  "target": "{client_domain}",
  "language_name": "{user_selected_language}",
  "location_code": {user_selected_location_code},
  "filters": [
    ["ranked_serp_element.serp_item.rank_group", ">=", 11],
    "and",
    ["ranked_serp_element.serp_item.rank_group", "<=", 30],
    "and",
    ["ranked_serp_element.serp_item.type", "=", "organic"]
  ],
  "order_by": ["keyword_data.keyword_info.search_volume,desc"],
  "limit": 1000
}]
```

**Data Extraction Logic:**
For each returned keyword, extract:
- `keyword` — the search term
- `search_volume` — monthly search volume
- `keyword_difficulty` — DFS difficulty score (1-100)
- `rank_group` — current SERP position
- `rank_absolute` — absolute position including SERP features
- `relative_url` — the client page currently ranking
- `etv` — estimated traffic volume
- `cpc` — cost per click (signals commercial intent)
- `competition` — PPC competition level
- `serp_item.type` — type of SERP element (organic, featured_snippet, etc.)

**Pagination Logic:**
- DFS caps at 1000 results per request
- If `total_count > 1000`, make additional requests with `offset` parameter incrementing by 1000
- Continue until all results are fetched or a reasonable cap (e.g., 5000 keywords) is hit

**Scoring & Prioritization:**
Each keyword gets a composite **Optimization Priority Score (OPS)** calculated as:

```
OPS = (search_volume_normalized * 0.3) 
    + (inverse_rank_normalized * 0.25) 
    + (cpc_normalized * 0.2) 
    + (inverse_difficulty_normalized * 0.15) 
    + (etv_normalized * 0.1)
```

Where:
- `search_volume_normalized` = keyword SV / max SV in dataset
- `inverse_rank_normalized` = (30 - rank_group) / 19 (closer to 11 = higher score)
- `cpc_normalized` = keyword CPC / max CPC in dataset
- `inverse_difficulty_normalized` = (100 - keyword_difficulty) / 100
- `etv_normalized` = keyword ETV / max ETV in dataset

Sort results by OPS descending. Top 50 are flagged as **"Quick Wins"**.

**Grouping Logic:**
Group keywords by their `relative_url` (the page currently ranking). This reveals:
- Pages with the most striking-distance keywords (consolidation opportunities)
- Pages ranking for high-value terms that need optimization
- Cannibalization signals (multiple pages ranking for same keyword cluster)

**Output Schema:**
```typescript
interface StrikingDistanceResult {
  keyword: string;
  search_volume: number;
  keyword_difficulty: number;
  rank_group: number;
  ranking_url: string;
  etv: number;
  cpc: number;
  competition: number;
  ops_score: number;  // 0-100
  serp_features: string[];  // what SERP features appear for this query
  has_ai_overview: boolean;
  optimization_notes: string;  // auto-generated recommendation
}
```

---

### Module 2: New Page Opportunities

**Purpose:** Identify high-value keywords the client has NO ranking page for, but competitors do. These represent net-new page creation opportunities.

**Strategy:** This module combines two approaches:

#### Approach A: Competitor Keyword Gap (Primary)
Uses Domain Intersection API to find keywords competitors rank for but client doesn't.

**DataForSEO Endpoint:**
```
POST https://api.dataforseo.com/v3/dataforseo_labs/google/domain_intersection/live
```

**Request Payload (per competitor):**
```json
[{
  "target1": "{competitor_domain}",
  "target2": "{client_domain}",
  "language_name": "{user_selected_language}",
  "location_code": {user_selected_location_code},
  "intersections": false,
  "filters": [
    ["keyword_data.keyword_info.search_volume", ">=", 100],
    "and",
    ["first_domain_serp_element.serp_item.rank_group", "<=", 20]
  ],
  "order_by": ["keyword_data.keyword_info.search_volume,desc"],
  "limit": 1000
}]
```

**Explanation:** With `intersections: false`, this returns keywords where `target1` (competitor) ranks BUT `target2` (client) does NOT. We filter for keywords where the competitor ranks in top 20 (meaning the keyword is achievable) with search volume >= 100.

Run this for each competitor (3-5 competitors), then deduplicate and merge results.

#### Approach B: Related Keywords Expansion (Secondary)
Uses Related Keywords endpoint to discover additional opportunities based on the client's top-performing keywords.

**DataForSEO Endpoint:**
```
POST https://api.dataforseo.com/v3/dataforseo_labs/google/related_keywords/live
```

**Request Payload:**
```json
[{
  "keyword": "{top_keyword_from_module_1}",
  "language_name": "{user_selected_language}",
  "location_code": {user_selected_location_code},
  "limit": 100
}]
```

Run for top 10 keywords from Module 1, cross-reference against existing client rankings. Any keyword not already ranking = new opportunity.

**Deduplication & Merging:**
- Merge all keywords from all competitor gaps + related keywords
- Deduplicate by exact keyword match
- Cross-reference against Module 1 results (if client already ranks 11-30, it goes to Module 1, not here)
- Cross-reference against client's full keyword set (ranked_keywords with no position filter) to exclude keywords client already ranks for at any position

**Intent Classification:**
Classify each keyword by search intent using keyword pattern matching:

```
TRANSACTIONAL: contains "buy", "pricing", "cost", "demo", "trial", "free", "signup", "get started", "tool", "software", "platform", "app"
COMMERCIAL_INVESTIGATION: contains "best", "top", "vs", "versus", "alternative", "comparison", "review", "compared"
INFORMATIONAL: contains "how to", "what is", "guide", "tutorial", "learn", "tips", "examples", "template"
NAVIGATIONAL: contains brand names, "login", "support"
```

**Page Type Suggestion:**
Based on intent + keyword pattern, suggest the type of page to create:

| Pattern | Suggested Page Type |
|---------|-------------------|
| "best {category}" | Listicle / Roundup |
| "{product} vs {product}" | Versus / Comparison |
| "{product} alternative" | Alternatives Page |
| "{category} software/tool" | Product/Solution Page |
| "how to {action}" | Guide / Tutorial |
| "{product} pricing" | Pricing Page |
| "{product} integration" | Integration Page |
| "{product} for {industry}" | Industry Landing Page |

**Output Schema:**
```typescript
interface NewPageOpportunity {
  keyword: string;
  search_volume: number;
  keyword_difficulty: number;
  cpc: number;
  intent: 'transactional' | 'commercial' | 'informational' | 'navigational';
  suggested_page_type: string;
  competitors_ranking: {
    domain: string;
    rank: number;
    url: string;
  }[];
  source: 'competitor_gap' | 'related_expansion';
  priority_score: number;  // 0-100
  has_ai_overview: boolean;
}
```

---

### Module 3: AEO / GEO Opportunity Finder

**Purpose:** Identify keywords where AI Overviews appear in SERPs, check if the client is cited, and find gaps where competitors appear in AI answers but the client doesn't.

**Strategy:** Three-pronged approach.

#### Step 1: Find Client's AI Overview Presence
Get all keywords where client appears in AI Overviews.

**DataForSEO Endpoint:**
```
POST https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live
```

**Request Payload:**
```json
[{
  "target": "{client_domain}",
  "language_name": "{user_selected_language}",
  "location_code": {user_selected_location_code},
  "item_types": ["ai_overview_reference"],
  "limit": 1000
}]
```

This returns only keywords where the client domain appears as a reference within AI Overviews.

#### Step 2: Find AI Overview Keywords Client Is Missing
For each competitor, get their AI Overview referenced keywords.

```json
[{
  "target": "{competitor_domain}",
  "language_name": "{user_selected_language}",
  "location_code": {user_selected_location_code},
  "item_types": ["ai_overview_reference"],
  "limit": 1000
}]
```

Compare competitor AIO keywords against client AIO keywords. Keywords where competitors appear but client doesn't = **AEO gaps**.

#### Step 3: SERP Feature Analysis
For the top striking-distance keywords from Module 1, check SERP features using the SERP API.

**DataForSEO Endpoint:**
```
POST https://api.dataforseo.com/v3/serp/google/organic/live/advanced
```

**Request Payload:**
```json
[{
  "keyword": "{keyword}",
  "language_name": "{user_selected_language}",
  "location_code": {user_selected_location_code},
  "device": "desktop",
  "os": "windows"
}]
```

**IMPORTANT:** This endpoint is expensive. Only run for the TOP 20-30 highest-priority keywords from Module 1, not the full list. Use this to:
- Confirm AI Overview presence/absence
- Check if client appears in featured snippets, PAA, knowledge panels
- Identify which competitors are cited in AI Overviews
- Detect SERP feature opportunities (featured snippet, PAA, etc.)

**SERP Items to Check For:**
- `ai_overview` — AI Overview block
- `featured_snippet` — Position 0 featured snippet
- `people_also_ask` — PAA box (great for content optimization)
- `knowledge_panel` — Knowledge graph
- `local_pack` — Local results
- `video` — Video carousel
- `top_stories` — News results
- `related_searches` — Related searches

**AEO Recommendation Engine:**
For each AEO gap keyword, generate recommendations:

```
IF keyword has AI Overview AND client NOT cited:
  → Recommendation: "Optimize existing content at {url} for AEO. Add structured data, FAQ schema, and concise definition paragraphs targeting this query."

IF keyword has AI Overview AND client has NO page:
  → Recommendation: "Create new authoritative content targeting this query. Structure with clear H2 headers, definition-style paragraphs, and FAQ schema."

IF keyword has featured_snippet AND client ranks 2-10:
  → Recommendation: "Restructure content at {url} to capture featured snippet. Add a concise 40-60 word definition/answer paragraph immediately after H2."

IF keyword has people_also_ask:
  → Recommendation: "Add FAQ section to {url} addressing PAA questions. Use exact question as H3, provide concise 2-3 sentence answers."
```

**Output Schema:**
```typescript
interface AEOOpportunity {
  keyword: string;
  search_volume: number;
  has_ai_overview: boolean;
  client_in_ai_overview: boolean;
  competitors_in_ai_overview: string[];
  serp_features: string[];
  client_organic_rank: number | null;
  client_ranking_url: string | null;
  recommendation: string;
  opportunity_type: 'aeo_gap' | 'featured_snippet' | 'paa' | 'new_content_aeo';
  priority: 'high' | 'medium' | 'low';
}
```

---

### Module 4: Content Gap Analysis (Money Pages Only)

**Purpose:** Compare the client's money pages against 3-5 competitors. Identify page types competitors have that the client doesn't. Focus ONLY on revenue-driving pages, NOT blogs.

**Strategy:** This is a multi-step process combining OnPage crawling + keyword analysis.

#### Step 1: Crawl & Classify Client Pages
Use OnPage API to get the full sitemap and page structure.

**DataForSEO Endpoint (Task POST):**
```
POST https://api.dataforseo.com/v3/on_page/task_post
```

**Request Payload:**
```json
[{
  "target": "{client_domain}",
  "max_crawl_pages": 500,
  "load_resources": false,
  "enable_javascript": false,
  "enable_browser_rendering": false,
  "custom_user_agent": "Mozilla/5.0 (compatible; AuditPilot/1.0)"
}]
```

Then retrieve pages:
```
POST https://api.dataforseo.com/v3/on_page/pages
```

```json
[{
  "id": "{task_id}",
  "filters": [
    ["resource_type", "=", "html"],
    "and",
    ["status_code", "=", 200]
  ],
  "limit": 500
}]
```

#### Step 2: Page Classification Engine
Classify each crawled page into categories using URL pattern matching + title/H1 analysis:

```python
PAGE_CLASSIFIERS = {
    "product_page": {
        "url_patterns": ["/product", "/platform", "/features", "/feature/"],
        "title_signals": ["product", "platform", "feature"],
    },
    "solution_page": {
        "url_patterns": ["/solution", "/use-case", "/industry/", "/for-"],
        "title_signals": ["solution", "use case", "for"],
    },
    "landing_page": {
        "url_patterns": ["/lp/", "/landing/", "/get-", "/try-", "/start-"],
        "title_signals": ["get started", "try", "free", "demo"],
    },
    "listicle": {
        "url_patterns": ["/best-", "/top-"],
        "title_signals": ["best", "top 10", "top 5", "top 15", "top 20"],
    },
    "comparison_page": {
        "url_patterns": ["/vs-", "-vs-", "/versus-", "/compare/", "/comparison/"],
        "title_signals": ["vs", "versus", "compared", "comparison"],
    },
    "alternative_page": {
        "url_patterns": ["/alternative", "-alternatives"],
        "title_signals": ["alternative", "alternatives to"],
    },
    "competitor_page": {
        "url_patterns": ["/competitor"],
        "title_signals": ["competitor"],
    },
    "pricing_page": {
        "url_patterns": ["/pricing", "/plans"],
        "title_signals": ["pricing", "plans", "cost"],
    },
    "integration_page": {
        "url_patterns": ["/integration", "/connect/"],
        "title_signals": ["integration", "connect", "integrates with"],
    },
    "case_study": {
        "url_patterns": ["/case-study", "/customer-story", "/success-story"],
        "title_signals": ["case study", "customer story", "success story"],
    },
    "blog": {
        "url_patterns": ["/blog/", "/articles/", "/resources/blog", "/insights/"],
        "title_signals": [],
    },
}
```

**CRITICAL: Exclude all `blog` classified pages from the analysis.** Only money pages proceed.

#### Step 3: Competitor Page Discovery
For each competitor, use the **Relevant Pages** endpoint to get their top pages by traffic.

**DataForSEO Endpoint:**
```
POST https://api.dataforseo.com/v3/dataforseo_labs/google/relevant_pages/live
```

**Request Payload:**
```json
[{
  "target": "{competitor_domain}",
  "language_name": "{user_selected_language}",
  "location_code": {user_selected_location_code},
  "order_by": ["metrics.organic.etv,desc"],
  "limit": 500
}]
```

This returns competitor pages sorted by organic estimated traffic. Apply the same Page Classification Engine to categorize competitor pages.

#### Step 4: Gap Identification
For each page type, compare:

```
client_pages[page_type] vs competitor_pages[page_type]
```

The gap analysis works at two levels:

**Level 1 — Page Type Gap:**
Does the client have this page type at all?
- Client has 0 alternative pages, competitor A has 5, competitor B has 8 → GAP
- Client has 0 versus pages, competitors have 10+ → GAP

**Level 2 — Topic/Entity Gap:**
Within the same page type, what specific topics/entities are missing?
- Competitor has "{brand} vs Competitor X" page, client doesn't → specific gap
- Competitor has "Best {category} tools for {industry}" page, client doesn't → specific gap

Use the **keyword data** from the competitor's ranked keywords for these pages to identify the topics and search intent.

For each gap, fetch keyword data for the competitor's page:
```
POST https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live
```

```json
[{
  "target": "{competitor_domain}",
  "filters": [
    ["ranked_serp_element.serp_item.relative_url", "=", "{competitor_page_path}"]
  ],
  "language_name": "{user_selected_language}",
  "location_code": {user_selected_location_code},
  "order_by": ["keyword_data.keyword_info.search_volume,desc"],
  "limit": 50
}]
```

This reveals the keywords driving traffic to that competitor page — which become the target keywords for the client's new page.

**Output Schema:**
```typescript
interface ContentGapResult {
  gap_type: 'page_type_missing' | 'topic_gap';
  page_type: string;
  competitor_url: string;
  competitor_domain: string;
  competitor_page_title: string;
  estimated_traffic: number;
  target_keywords: {
    keyword: string;
    search_volume: number;
    difficulty: number;
  }[];
  total_keyword_volume: number;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
}
```

---

### Module 5: Strengths Analysis (What's Working Well)

**Purpose:** Identify and surface what the client is already doing well — top-performing pages, strong keyword positions, competitive advantages, SERP feature wins, and areas of authority. This gives a balanced audit (not just gaps) and helps the client understand what to protect and double down on.

**Strategy:** This module reuses data already fetched by Modules 1-4 (no additional API calls needed for most parts), plus one targeted call for backlink strength.

#### Step 1: Top Performing Keywords (Rank 1-10)
Reuse the Ranked Keywords call from Module 1, but filter for page 1 positions.

**DataForSEO Endpoint (already called — reuse with broader filter):**
```
POST https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live
```

**Request Payload:**
```json
[{
  "target": "{client_domain}",
  "language_name": "{user_selected_language}",
  "location_code": {user_selected_location_code},
  "filters": [
    ["ranked_serp_element.serp_item.rank_group", "<=", 10],
    "and",
    ["ranked_serp_element.serp_item.type", "=", "organic"]
  ],
  "order_by": ["keyword_data.keyword_info.search_volume,desc"],
  "limit": 1000
}]
```

**NOTE:** To avoid making a duplicate API call, the orchestrator should fetch ranked keywords for positions 1-30 in a single call (removing the `>=11` lower bound from Module 1's request), then split the results client-side:
- Rank 1-10 → Module 5 (Strengths)
- Rank 11-30 → Module 1 (Striking Distance)

This saves API cost and avoids redundancy.

**Data to surface:**
- Total keywords ranking in top 10
- Total estimated organic traffic from these keywords
- Top 20 highest-traffic keywords with rank, SV, ETV, CPC
- Keywords in position 1 (dominant positions — these are defensive assets)
- Keywords in featured snippets (from SERP data in Module 3)

#### Step 2: Top Pages by Traffic
Use the **Relevant Pages** endpoint (already called in Module 4 for competitors — now call for client too).

**DataForSEO Endpoint:**
```
POST https://api.dataforseo.com/v3/dataforseo_labs/google/relevant_pages/live
```

**Request Payload:**
```json
[{
  "target": "{client_domain}",
  "language_name": "{user_selected_language}",
  "location_code": {user_selected_location_code},
  "order_by": ["metrics.organic.etv,desc"],
  "limit": 100
}]
```

**Data to surface:**
- Top 20 pages by estimated organic traffic
- For each page: URL, estimated traffic, number of ranking keywords, average position
- Page type classification (reuse Module 4 classifier) to show which page types are performing best
- Highlight pages that contribute to >5% of total organic traffic (high-value assets)

#### Step 3: Competitive Advantages
Cross-reference Module 2's domain intersection data to find the *inverse* — keywords where the **client ranks but competitors don't**.

**DataForSEO Endpoint (already called in Module 2 — call the inverse):**
```
POST https://api.dataforseo.com/v3/dataforseo_labs/google/domain_intersection/live
```

**Request Payload (per competitor):**
```json
[{
  "target1": "{client_domain}",
  "target2": "{competitor_domain}",
  "language_name": "{user_selected_language}",
  "location_code": {user_selected_location_code},
  "intersections": false,
  "filters": [
    ["keyword_data.keyword_info.search_volume", ">=", 50],
    "and",
    ["first_domain_serp_element.serp_item.rank_group", "<=", 20]
  ],
  "order_by": ["keyword_data.keyword_info.search_volume,desc"],
  "limit": 500
}]
```

With `intersections: false`, `target1` = client, `target2` = competitor → returns keywords where client ranks but competitor doesn't. This is the client's competitive moat.

**Data to surface:**
- Unique keywords client ranks for that NO competitor ranks for
- Keywords client ranks for that majority of competitors don't
- Group by topic/page to identify content areas of authority

#### Step 4: SERP Feature Wins
Derived from Module 3's SERP analysis data. Filter for instances where the client already holds:

- **Featured Snippets** — keywords where client owns position 0
- **AI Overview Citations** — keywords where client is cited in AI Overviews (from Module 3 Step 1)
- **People Also Ask** — keywords where client appears in PAA boxes
- **Knowledge Panel** — if client has a knowledge panel presence

No additional API calls needed — this is a re-analysis of Module 3 data filtering for wins instead of gaps.

#### Step 5: Domain Authority & Backlink Strength
One additional API call to assess overall domain health.

**DataForSEO Endpoint:**
```
POST https://api.dataforseo.com/v3/backlinks/summary/live
```

**Request Payload:**
```json
[{
  "target": "{client_domain}",
  "internal_list_limit": 0,
  "include_subdomains": true
}]
```

**Data to surface:**
- Domain Rank (DFS proprietary score)
- Total backlinks count
- Referring domains count
- Dofollow vs nofollow ratio
- Top referring domains (high authority links)

**Compare against competitors** (run the same call for each competitor):
```json
[{
  "target": "{competitor_domain}",
  "internal_list_limit": 0,
  "include_subdomains": true
}]
```

This creates a **Domain Authority Comparison Table**:
| Metric | Client | Comp 1 | Comp 2 | Comp 3 |
|--------|--------|--------|--------|--------|
| Domain Rank | X | Y | Z | W |
| Referring Domains | X | Y | Z | W |
| Total Backlinks | X | Y | Z | W |
| Dofollow % | X% | Y% | Z% | W% |

Highlight cells where client is STRONGER than competitors (green).

#### Step 6: Technical Health Quick Wins (from OnPage Data)
Reuse OnPage crawl data from Module 4. Instead of looking at page classification, analyze technical SEO signals:

**From OnPage Summary endpoint (already fetched):**
```
POST https://api.dataforseo.com/v3/on_page/summary
```

**Data to surface (positive signals):**
- Pages with proper canonical tags (% compliance)
- Pages with valid schema markup
- Average page load speed (if available)
- Mobile-friendly pages %
- Pages with proper H1 structure
- SSL/HTTPS implementation status
- Internal linking density (avg internal links per page)

**Frame as strengths:**
- "92% of pages have proper canonical tags" → STRENGTH
- "All pages served over HTTPS" → STRENGTH
- "Average internal links per page: 15" → STRENGTH (if above industry average of ~10)

**Technical Issues to Flag (brief, not the focus):**
Surface ONLY critical issues from OnPage data, but keep this light — the module is about strengths. Present issues as "areas to protect" not "failures."

#### Strengths Scoring
Each strength gets a **Strength Impact Score (SIS)** based on:

```
SIS = (traffic_impact * 0.4) + (competitive_advantage * 0.3) + (defensibility * 0.3)
```

Where:
- `traffic_impact` = normalized ETV or traffic contribution of this strength
- `competitive_advantage` = how many competitors DON'T have this (more = higher)
- `defensibility` = how hard it would be for competitors to replicate (position 1 with high KD = very defensible)

**Output Schema:**
```typescript
interface StrengthsAnalysis {
  summary: {
    total_top10_keywords: number;
    total_organic_traffic: number;
    domain_rank: number;
    referring_domains: number;
    featured_snippets_held: number;
    ai_overview_citations: number;
    competitive_advantage_keywords: number;  // keywords only client ranks for
  };
  
  top_keywords: {
    keyword: string;
    rank: number;
    search_volume: number;
    etv: number;
    cpc: number;
    ranking_url: string;
    is_position_1: boolean;
    has_featured_snippet: boolean;
    has_ai_overview_citation: boolean;
    sis_score: number;
  }[];
  
  top_pages: {
    url: string;
    estimated_traffic: number;
    ranking_keywords_count: number;
    avg_position: number;
    page_type: string;
    traffic_share_pct: number;  // % of total site traffic
  }[];
  
  competitive_moat: {
    keyword: string;
    search_volume: number;
    rank: number;
    competitors_not_ranking: string[];  // which competitors don't rank
  }[];
  
  serp_feature_wins: {
    keyword: string;
    feature_type: 'featured_snippet' | 'ai_overview' | 'paa' | 'knowledge_panel';
    search_volume: number;
    rank: number;
  }[];
  
  domain_comparison: {
    domain: string;
    domain_rank: number;
    referring_domains: number;
    total_backlinks: number;
    dofollow_pct: number;
    is_client: boolean;
  }[];
  
  technical_strengths: {
    metric: string;
    value: string | number;
    status: 'strong' | 'good' | 'needs_attention';
    benchmark: string;  // industry benchmark for context
  }[];
}
```

---

### Authentication
```javascript
const credentials = Buffer.from(`${login}:${password}`).toString('base64');
const headers = {
  'Authorization': `Basic ${credentials}`,
  'Content-Type': 'application/json'
};
```

### Base URL
```
https://api.dataforseo.com/v3/
```

### Rate Limiting
- Max 2000 API calls per minute
- Max 30 simultaneous requests
- Implement a queue with concurrency limit of 10
- Add 100ms delay between requests
- Retry on 429/500 with exponential backoff (1s, 2s, 4s, 8s, max 5 retries)

### Cost Management
Each endpoint has different costs. Track and display estimated cost per audit:

| Endpoint | Approx. Cost per Call |
|----------|----------------------|
| Ranked Keywords (Labs) | $0.01 per 1000 results |
| Domain Intersection (Labs) | $0.011 per 1000 results |
| Competitors Domain (Labs) | $0.0103 |
| Related Keywords (Labs) | $0.01 per 1000 results |
| Relevant Pages (Labs) | $0.01 per 1000 results |
| SERP Live Advanced | $0.003 per task |
| OnPage Task POST | $0.00025 per page crawled |
| OnPage Pages | Free (results retrieval) |
| Domain Rank Overview | $0.0101 |
| Backlinks Summary | $0.002 per target |

Display a **running cost estimator** in the UI before and during the audit.

### Error Handling
```typescript
interface DFSResponse {
  status_code: number;  // 20000 = success
  status_message: string;
  tasks: {
    id: string;
    status_code: number;
    status_message: string;
    result: any[];
  }[];
}

// Handle these error codes:
// 20000 = OK
// 40000 = Bad Request (check payload)
// 40100 = Unauthorized (check credentials)
// 40200 = Payment Required (insufficient balance)
// 40400 = Not Found
// 50000 = Internal Server Error (retry)
```

### Endpoint Reference (Complete List Used)

```
# DataForSEO Labs API
POST /v3/dataforseo_labs/google/ranked_keywords/live
POST /v3/dataforseo_labs/google/domain_intersection/live
POST /v3/dataforseo_labs/google/competitors_domain/live
POST /v3/dataforseo_labs/google/related_keywords/live
POST /v3/dataforseo_labs/google/relevant_pages/live
POST /v3/dataforseo_labs/google/domain_rank_overview/live
POST /v3/dataforseo_labs/locations_and_languages

# SERP API
POST /v3/serp/google/organic/live/advanced

# Backlinks API
POST /v3/backlinks/summary/live

# OnPage API
POST /v3/on_page/task_post
POST /v3/on_page/pages
POST /v3/on_page/summary
```

---

## Frontend Specification

### Input Panel (Step 1)

**Fields:**
```
┌─────────────────────────────────────────────┐
│  Client Website URL:  [________________]    │
│                                             │
│  Competitor URLs (3-5):                     │
│  1. [________________]                      │
│  2. [________________]                      │
│  3. [________________]  [+ Add More]        │
│                                             │
│  Location:     [Dropdown - searchable]      │
│  Language:     [Dropdown - searchable]      │
│                                             │
│  DataForSEO Credentials:                    │
│  Login:    [________________]               │
│  Password: [________________]               │
│                                             │
│  Estimated Cost: ~$X.XX                     │
│                                             │
│  [▶ Run Full Audit]  [⚙ Advanced Options]  │
└─────────────────────────────────────────────┘
```

**Location/Language Dropdown:**
Pre-fetch from: `GET /v3/dataforseo_labs/locations_and_languages`
Store in local state. Allow search/filter. Default: show common locations at top (US, UK, India, Canada, Australia, Germany).

**Advanced Options (collapsed by default):**
- Max crawl pages (default: 500)
- Min search volume threshold (default: 100)
- SERP analysis depth (number of keywords for live SERP check, default: 20)
- Include/exclude specific page types from content gap

**Validation:**
- URL format validation (auto-strip https://, www., trailing slash)
- Minimum 1 competitor, max 5
- DFS credentials validation (make a test call to `/v3/dataforseo_labs/google/domain_rank_overview/live` with a known domain)

### Dashboard Views (Step 2)

The dashboard has 6 tabs:

#### Tab 1: Overview
- **Domain Authority Summary** — from Domain Rank Overview API
- **Ranking Distribution** — pie/bar chart showing keywords in pos 1-3, 4-10, 11-20, 21-30, 31-50, 51-100
- **Total Opportunities Found** — summary cards for each module
- **Strengths Snapshot** — top 5 performing keywords, domain rank vs competitors
- **AI Overview Presence** — % of keywords where client appears in AIO vs competitors
- **Estimated Total Traffic Opportunity** — sum of ETV from all identified opportunities

#### Tab 2: Striking Distance (Module 1)
- **Table view:** Sortable, filterable table of all rank 11-30 keywords
  - Columns: Keyword | Rank | Search Volume | KD | CPC | ETV | OPS Score | Ranking URL | AI Overview? | Action
  - Filters: min SV, max KD, has AI overview, URL contains
  - Sorting: by any column
- **Grouped view:** Keywords grouped by ranking URL
  - Expandable rows showing all keywords per URL
  - Aggregate metrics per URL (total SV, avg rank, total ETV)
- **Quick Wins panel:** Top 20 by OPS score, highlighted

#### Tab 3: New Page Opportunities (Module 2)
- **Table view:** All new page opportunities
  - Columns: Keyword | SV | KD | CPC | Intent | Suggested Page Type | Competitors Ranking | Source | Priority
  - Filters: by intent, page type, min SV, source
- **Page Type Summary:** Cards showing opportunities by page type
  - e.g., "12 Alternative Page Opportunities" | "8 Comparison Pages" | "5 Listicle Opportunities"
- **Intent Distribution:** Donut chart showing transactional vs commercial vs informational

#### Tab 4: AEO/GEO Opportunities (Module 3)
- **AI Overview Gap Matrix:** Heatmap or table
  - Rows: keywords with AI Overviews
  - Columns: Client, Competitor 1, Competitor 2, ...
  - Cells: ✅ (cited) or ❌ (not cited)
- **SERP Feature Opportunities:** Table of keywords with feature opportunities
- **Recommendations Panel:** Actionable AEO recommendations with priority tags

#### Tab 5: Content Gap (Module 4)
- **Side-by-side comparison matrix:**
  - Rows: page types (product, solution, comparison, alternative, etc.)
  - Columns: Client | Comp 1 | Comp 2 | Comp 3 | ...
  - Cells: count of pages in that type
  - Red highlight where client has 0 but competitors have pages
- **Gap Details:** Expandable rows showing specific competitor pages the client lacks
  - Competitor URL, title, estimated traffic, target keywords
- **Priority Queue:** Top 20 gaps sorted by total keyword volume opportunity

#### Tab 6: Strengths Analysis (Module 5)
- **Strengths Summary Cards:** Total top-10 keywords, total organic traffic, featured snippets held, AI Overview citations, domain rank
- **Top Performing Keywords Table:** Sortable table of rank 1-10 keywords
  - Columns: Keyword | Rank | SV | ETV | CPC | URL | Featured Snippet? | AIO? | SIS Score
  - Highlight position 1 keywords in gold
- **Top Pages by Traffic:** Bar chart + table of top 20 pages by estimated traffic
  - Show traffic share % as a stacked bar
- **Competitive Moat:** Keywords client ranks for but competitors don't
  - Table with competitor coverage indicators (✅/❌ per competitor)
- **Domain Authority Comparison:** Side-by-side bar chart comparing domain rank, referring domains, backlinks across client + all competitors
  - Green highlight where client leads, red where client trails
- **SERP Feature Wins:** Cards showing featured snippet count, AIO citation count, PAA appearances
  - Expandable to see specific keywords
- **Technical Health Summary:** Simple scorecard of technical strengths from OnPage data
  - Green/yellow/red indicators per metric

### Export Panel (Step 3)
- **[Download XLSX Report]** — full data export with separate tabs per module
- **[Download DOCX Report]** — formatted audit report for client presentation
- **[Export as JSON]** — raw data for programmatic use

---

## XLSX Report Specification

**File:** `{client_domain}_SEO_Audit_{date}.xlsx`

**Sheets:**

### Sheet 1: Executive Summary
- Client domain
- Date of audit
- Competitors analyzed
- Location / language
- Key metrics: total keywords found, total opportunities, estimated traffic potential
- Cost of audit

### Sheet 2: Striking Distance Keywords
- All columns from Module 1 output schema
- Conditional formatting: green for high OPS, red for low
- Auto-filter enabled
- Sorted by OPS score descending
- Formula: SUM of search volume, AVG of rank, SUM of ETV at bottom

### Sheet 3: New Page Opportunities
- All columns from Module 2 output schema
- Grouped by suggested page type
- Auto-filter enabled

### Sheet 4: AEO Opportunities
- All columns from Module 3 output schema
- Conditional formatting for gaps (red where client NOT in AIO, green where client IS)

### Sheet 5: Content Gap Analysis
- Summary matrix (page types vs domains)
- Detailed gap list below
- Sorted by total keyword volume descending

### Sheet 6: Strengths Analysis
- Top keywords table (rank 1-10) with SV, ETV, CPC, SIS score
- Top pages by traffic
- Competitive moat keywords
- Domain authority comparison table (client vs competitors)
- SERP feature wins summary
- Technical health scorecard
- Conditional formatting: green where client leads competitors

### Sheet 7: Raw Data — Keyword Rankings
- Full ranked keywords export (all positions, not just 11-30)
- For reference / additional analysis

**Use openpyxl for creation. Follow the xlsx skill guidelines:**
- Use formulas for all calculated fields (SUM, AVERAGE, COUNTIF)
- Apply professional formatting (Arial font, borders, header shading)
- Set column widths appropriately
- Recalculate with `scripts/recalc.py`

---

## DOCX Report Specification

**File:** `{client_domain}_SEO_Audit_Report_{date}.docx`

**Structure:**

```
Cover Page
  - "SEO Audit Report"
  - Client domain
  - Date
  - Prepared by: [configurable]

Table of Contents

1. Executive Summary
   - Audit scope & methodology
   - Key findings (3-5 bullet points)
   - Key strengths (3-5 bullet points)
   - Top recommendations (prioritized)

2. Strengths Analysis — What's Working Well
   - Domain authority & backlink profile summary
   - Top performing keywords & pages
   - Competitive advantages (keywords only you rank for)
   - SERP feature wins (featured snippets, AI Overview citations)
   - Technical health highlights
   - Domain authority comparison table vs competitors

3. Domain Overview
   - Current ranking distribution
   - Domain authority metrics
   - Organic traffic estimate

4. Striking Distance Opportunities
   - Summary: X keywords found in positions 11-30
   - Top 20 quick wins table
   - Recommendations for optimization

5. New Page Opportunities
   - Summary: X new pages recommended
   - Breakdown by page type
   - Top 10 highest-impact opportunities table
   - Implementation roadmap

6. AEO & Generative Search Opportunities
   - AI Overview landscape analysis
   - Client vs competitor AEO presence
   - Top 10 AEO gap opportunities
   - AEO optimization playbook

7. Content Gap Analysis
   - Page type comparison matrix
   - Critical gaps identified
   - Competitor page analysis
   - Content creation priority queue

8. Next Steps & Implementation Plan
   - Quick wins (0-30 days)
   - Medium-term (30-90 days)
   - Long-term (90+ days)

Appendix A: Full Keyword Data Reference
Appendix B: Methodology Notes
```

**Follow the docx skill guidelines:**
- Use `docx-js` for creation
- US Letter page size (12240 x 15840 DXA)
- Override built-in heading styles
- Use proper numbering config for lists
- Tables with dual widths (columnWidths + cell width)
- ShadingType.CLEAR for table backgrounds
- Validate with `scripts/office/validate.py`

---

## Backend API Routes

```
POST   /api/audit/start              → Start full audit (returns audit_id)
GET    /api/audit/:id/status         → Get audit progress (0-100%)
GET    /api/audit/:id/results        → Get all results
GET    /api/audit/:id/module/:num    → Get specific module results
POST   /api/audit/:id/export/xlsx    → Generate & download XLSX
POST   /api/audit/:id/export/docx    → Generate & download DOCX
GET    /api/audit/:id/export/json    → Download raw JSON
POST   /api/validate-credentials     → Test DFS API credentials
GET    /api/locations                 → Get locations & languages list
```

### Audit Orchestration Flow

```
1. Validate inputs (URLs, credentials)
2. Fetch locations/languages if not cached
3. Get Domain Rank Overview for client (establishes baseline)
4. Run Module 1 + Module 5 (combined): Ranked Keywords for positions 1-30
   → Split results: rank 1-10 → Module 5, rank 11-30 → Module 1
   → Progress: 0-20%
5. Run Module 5 (continued): Backlink Summary for client + all competitors (parallel)
   → Progress: 20-25%
6. Run Module 2: New Page Opportunities
   a. Domain Intersection for each competitor (parallel) — GAP direction (comp→client)
   b. Domain Intersection INVERSE for each competitor (parallel) — MOAT direction (client→comp) → feeds Module 5
   c. Related Keywords for top terms
   d. Deduplicate & merge
   → Progress: 25-50%
7. Run Module 3: AEO/GEO Analysis
   a. Client AIO keywords → wins feed Module 5, gaps feed Module 3
   b. Competitor AIO keywords (parallel)
   c. SERP analysis for top keywords (rate-limited)
   → Progress: 50-70%
8. Run Module 4: Content Gap Analysis
   a. OnPage crawl of client site (async, wait for completion)
   b. Relevant Pages for client (feeds Module 5 top pages) + each competitor (parallel)
   c. Classify all pages
   d. Identify gaps
   → Progress: 70-85%
9. Run Module 5 (compile): Aggregate strengths from all modules
   a. Top keywords from step 4
   b. Backlink comparison from step 5
   c. Competitive moat from step 6b
   d. SERP feature wins from step 7
   e. Top pages + technical health from step 8
   → Progress: 85-95%
10. Compile final results
   → Progress: 95-100%
```

**Parallel Execution:**
- Competitor-level operations run in parallel (3-5 concurrent)
- Module 1 and parts of Module 2 can partially overlap
- OnPage crawl (Module 4) should start early as it takes the longest — initiate at step 1 and poll until ready

---

## UI Component Tree

```
<App>
  <Header />
  <main>
    <AuditWizard>
      <Step1_InputPanel>
        <URLInput />
        <CompetitorURLList />
        <LocationSelector />
        <LanguageSelector />
        <CredentialsInput />
        <CostEstimator />
        <AdvancedOptions />
        <StartButton />
      </Step1_InputPanel>
      
      <Step2_Progress>
        <ProgressBar />
        <ModuleStatusCards />
        <LiveLogPanel />
      </Step2_Progress>
      
      <Step3_Dashboard>
        <TabNavigation />
        <OverviewTab>
          <DomainSummaryCards />
          <RankDistributionChart />
          <StrengthsSnapshot />
          <OpportunitySummary />
          <AIOPresenceChart />
        </OverviewTab>
        <StrikingDistanceTab>
          <QuickWinsPanel />
          <KeywordTable />
          <GroupedByURLView />
        </StrikingDistanceTab>
        <NewPagesTab>
          <PageTypeSummaryCards />
          <IntentDistributionChart />
          <OpportunityTable />
        </NewPagesTab>
        <AEOTab>
          <AIOGapMatrix />
          <SERPFeatureTable />
          <RecommendationsPanel />
        </AEOTab>
        <ContentGapTab>
          <ComparisonMatrix />
          <GapDetailsList />
          <PriorityQueue />
        </ContentGapTab>
        <StrengthsTab>
          <StrengthsSummaryCards />
          <TopKeywordsTable />
          <TopPagesByTrafficChart />
          <CompetitiveMoatTable />
          <DomainAuthorityComparison />
          <SERPFeatureWins />
          <TechnicalHealthScorecard />
        </StrengthsTab>
        <ExportPanel />
      </Step3_Dashboard>
    </AuditWizard>
  </main>
</App>
```

---

## Environment Variables

```env
DATAFORSEO_LOGIN=         # DFS API login (or passed via UI)
DATAFORSEO_PASSWORD=      # DFS API password (or passed via UI)
PORT=3001                 # Backend server port
NODE_ENV=development
MAX_CONCURRENT_DFS=10     # Max parallel DFS API calls
CRAWL_PAGE_LIMIT=500      # Default OnPage crawl limit
```

---

## Error Handling & Edge Cases

| Scenario | Handling |
|----------|----------|
| DFS API returns 0 results for a module | Show "No data found" message, continue with other modules |
| DFS credentials invalid | Block audit start, show clear error |
| Competitor domain has very few rankings | Warn user, still include in analysis with note |
| OnPage crawl takes >5 minutes | Show estimated time, allow user to skip Module 4 |
| Rate limit hit (429) | Exponential backoff, queue remaining requests |
| Insufficient DFS balance | Show cost estimate, warn before starting |
| Client domain is brand new (no rankings) | Module 1 returns empty, focus on Module 2 and 4 |
| Keyword appears in multiple modules | Deduplicate with priority: Module 1 > Module 3 > Module 2 |

---

## File Structure

```
auditpilot/
├── CLAUDE.md                    # This file
├── package.json
├── .env
├── server/
│   ├── index.js                 # Express server entry
│   ├── routes/
│   │   ├── audit.js             # Audit endpoints
│   │   ├── export.js            # Export endpoints
│   │   └── util.js              # Validation, locations
│   ├── services/
│   │   ├── dfs-client.js        # DataForSEO API client
│   │   ├── orchestrator.js      # Audit orchestration logic
│   │   ├── module1-striking.js  # Striking distance module
│   │   ├── module2-newpages.js  # New page opportunities
│   │   ├── module3-aeo.js       # AEO/GEO analysis
│   │   ├── module4-contentgap.js# Content gap analysis
│   │   ├── module5-strengths.js # Strengths analysis
│   │   ├── page-classifier.js   # URL/title classification engine
│   │   ├── scoring.js           # OPS and priority scoring
│   │   └── intent-classifier.js # Search intent classification
│   ├── exporters/
│   │   ├── xlsx-generator.js    # XLSX report generation
│   │   └── docx-generator.js    # DOCX report generation
│   └── utils/
│       ├── url-utils.js         # URL normalization
│       ├── dedup.js             # Keyword deduplication
│       └── cost-estimator.js    # DFS cost calculator
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── store/
│   │   │   └── audit-store.js   # Zustand store
│   │   ├── components/
│   │   │   ├── InputPanel/
│   │   │   ├── ProgressView/
│   │   │   ├── Dashboard/
│   │   │   │   ├── OverviewTab.jsx
│   │   │   │   ├── StrikingDistanceTab.jsx
│   │   │   │   ├── NewPagesTab.jsx
│   │   │   │   ├── AEOTab.jsx
│   │   │   │   ├── ContentGapTab.jsx
│   │   │   │   └── StrengthsTab.jsx
│   │   │   ├── ExportPanel/
│   │   │   └── shared/
│   │   │       ├── DataTable.jsx
│   │   │       ├── Charts.jsx
│   │   │       └── StatusCards.jsx
│   │   └── utils/
│   │       └── api.js           # API client
│   └── index.html
└── scripts/
    └── generate-xlsx.py         # Python XLSX generator
```

---

## Development Order (Recommended Build Sequence)

```
Phase 1: Foundation
  1. Set up project structure (React + Express)
  2. Build DFS API client with auth, rate limiting, retry
  3. Build Input Panel UI
  4. Build credential validation endpoint

Phase 2: Core Modules
  5. Module 1: Striking Distance (API + scoring logic)
  6. Module 1: Dashboard tab (table + charts)
  7. Module 2: New Page Opportunities (API + classification)
  8. Module 2: Dashboard tab
  9. Progress tracking and orchestration

Phase 3: Advanced Modules
  10. Module 3: AEO/GEO (API + recommendation engine)
  11. Module 3: Dashboard tab
  12. Module 4: Content Gap (OnPage crawl + classification + gap logic)
  13. Module 4: Dashboard tab
  14. Module 5: Strengths Analysis (aggregation + backlink calls + scoring)
  15. Module 5: Dashboard tab

Phase 4: Reports & Export
  16. Overview tab (aggregated metrics + charts + strengths snapshot)
  17. XLSX report generator
  18. DOCX report generator
  19. Export panel integration

Phase 5: Polish
  20. Cost estimator
  21. Error handling refinements
  22. UI polish and responsive design
  23. End-to-end testing with real domains
```

---

## Key Design Decisions & Constraints

1. **No GSC/GA dependency** — All data comes from DataForSEO. This means we rely on DFS's keyword database (270M+ domains) which is comprehensive but may miss some long-tail queries that only GSC would surface.

2. **Cost control** — SERP Live Advanced is the most expensive call ($0.003 per keyword). We limit it to top 20-30 keywords only. Labs endpoints are cheaper and should handle the bulk of analysis.

3. **OnPage crawl is async** — Unlike Labs endpoints (instant), OnPage requires task submission → wait → result retrieval. Start it early and poll. The crawl_progress field in Summary endpoint indicates completion (1.0 = done).

4. **Money pages only in content gap** — The page classifier explicitly excludes /blog/ paths and blog-pattern URLs. This keeps the analysis focused on revenue-driving pages per the client requirement.

5. **AEO data availability** — AI Overview data in DFS is relatively new and coverage varies by market. If `item_types: ["ai_overview_reference"]` returns 0 results, it may mean DFS hasn't indexed AIO data for that location/language combo. Surface this to the user as a data limitation, not an error.

6. **Ranked Keywords 1000 cap** — DFS returns max 1000 per request. For large domains with many rank 11-30 keywords, pagination via `offset` is necessary.

7. **Domain Intersection pair-based** — Content gap via Domain Intersection is pairwise (client vs one competitor at a time). For 5 competitors, that's 5 API calls minimum. Merge and deduplicate client-side.

8. **Strengths module is mostly cost-free** — Module 5 reuses data from Modules 1-4 wherever possible. The only new API calls are Backlinks Summary (client + each competitor = ~6 calls) and the inverse Domain Intersection (client→competitor direction). The ranked keywords call is optimized to fetch positions 1-30 in one shot and split client-side, saving a duplicate call. The Relevant Pages call for the client site is also new but cheap.

9. **Strengths-first report structure** — The DOCX report deliberately places "What's Working Well" (Section 2) before any gap analysis. This is a client-delivery best practice: lead with strengths to build trust and credibility before presenting what needs fixing. The dashboard tabs are ordered differently (Overview → Striking Distance → ... → Strengths last) for the analyst workflow, since the person running the audit typically wants actionable gaps first.

---

## Notes for Claude (Development Instructions)

- When building, start by reading this CLAUDE.md fully before writing any code
- Follow the docx skill at `/mnt/skills/public/docx/SKILL.md` for all DOCX generation
- Follow the xlsx skill at `/mnt/skills/public/xlsx/SKILL.md` for all XLSX generation
- Follow the frontend-design skill at `/mnt/skills/public/frontend-design/SKILL.md` for all React UI
- Use Tailwind CSS for styling — avoid generic Inter/Roboto fonts, make the UI distinctive
- All DFS API calls go through the centralized `dfs-client.js` which handles auth, rate limiting, and retries
- Never hardcode DFS credentials — always accept via UI input or env vars
- Display cost estimates prominently before starting an audit
- All tables should be sortable and filterable
- Charts use Recharts library
- State management via Zustand (not Redux or Context)
- The DOCX report is the client-facing deliverable — make it polished and professional
- The XLSX is the data workhorse — include all raw data with proper formulas