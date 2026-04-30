# SEO X-Ray

> **Audit any website's SEO without ever touching Google Search Console or Google Analytics.**

SEO X-Ray is a full-stack SEO audit agent that produces a complete, client-ready audit of any domain on the internet — no logins, no permission grants, no waiting on the client to share access. Plug in a URL + 3-5 competitor URLs + a DataForSEO API key, and you get back an interactive dashboard, a full XLSX data export, and a polished DOCX report ready to deliver.

Built for SEO consultants, agencies, in-house teams, and anyone who needs to audit prospects *before* they're signed.

---

## Why SEO X-Ray?

Most SEO audit tools require Google Search Console and/or Google Analytics access. That means agencies and consultants are stuck waiting for client logins, NDAs, or permission grants before they can even start an audit. SEO X-Ray removes that bottleneck entirely.

- **Audit any domain on the internet** — including prospects you haven't signed yet
- **No GSC/GA4 dependency** — uses DataForSEO's 270M+ domain database
- **Three deliverables in one run** — dashboard, XLSX, and client-ready DOCX
- **AI Overview / AEO coverage** — surfaces generative search citation gaps (most audit tools still don't do this)

---

## What it produces

### 1. Interactive React Dashboard
Six tabs of visual, filterable insights — Overview, Striking Distance, New Page Opportunities, AEO/GEO, Content Gap, and Strengths.

### 2. XLSX Report
Seven sheets of raw data with formulas, conditional formatting, and pre-applied filters. Perfect for analysts who want to slice and dice.

### 3. DOCX Report
Polished, client-presentation-ready audit document. Leads with strengths before gaps — a deliberate trust-building structure for client deliveries.

---

## The 5 audit modules

| # | Module | What it finds |
|---|--------|---------------|
| 1 | **Striking Distance Keywords** | Keywords ranking in positions 11-30 (page 2). Quick wins close to page 1. Scored by a custom Optimization Priority Score (OPS) blending search volume, rank, CPC, difficulty, and traffic. |
| 2 | **New Page Opportunities** | Keywords competitors rank for but the client has *no page* for. Auto-classifies search intent and suggests page type (listicle, vs page, alternatives, pricing, integration, industry landing). |
| 3 | **AEO / GEO Opportunities** | Where AI Overviews appear in SERPs, whether the client is cited, and where competitors appear in AI answers but the client doesn't. Generates AEO-specific recommendations per gap. |
| 4 | **Content Gap (Money Pages Only)** | Compares page types (product, comparison, alternative, integration, pricing, solution) against competitors. **Explicitly excludes blog content** — focuses on revenue-driving pages only. |
| 5 | **Strengths Analysis** | What's already working — top-10 keywords, competitive moat (keywords *only* the client ranks for), SERP feature wins, backlink profile vs competitors, technical health. |

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Tailwind CSS + Zustand + Recharts |
| Backend | Node.js + Express |
| Data Source | DataForSEO REST API v3 |
| XLSX Export | Python + openpyxl |
| DOCX Export | docx-js |

---

## Getting started

### Prerequisites

- Node.js 18+
- A DataForSEO API account ([sign up here](https://dataforseo.com/)) — you'll need API login + password
- Python 3.9+ (for XLSX generation)

### Installation

```bash
git clone https://github.com/harsh719/seo-xray.git
cd seo-xray
npm install
```

### Configuration

Create a `.env` file in the project root:

```env
DATAFORSEO_LOGIN=your_dfs_login
DATAFORSEO_PASSWORD=your_dfs_password
PORT=3001
NODE_ENV=development
MAX_CONCURRENT_DFS=10
CRAWL_PAGE_LIMIT=500
```

You can also pass DataForSEO credentials directly via the UI input panel (they won't be stored).

### Running locally

```bash
npm run dev
```

This starts both the Express backend (port 3001) and the React frontend (port 3000) concurrently. Open `http://localhost:3000` in your browser.

### Running an audit

1. Enter the client domain
2. Add 3-5 competitor domains
3. Choose location and language
4. Enter DataForSEO credentials (or rely on `.env`)
5. Review the cost estimate
6. Click **Run Full Audit**
7. Watch live progress as each module runs
8. Explore the dashboard, then download XLSX and DOCX reports

---

## Cost & API usage

Every audit run costs money on DataForSEO (typically a few dollars per full audit, depending on domain size). The agent shows a **running cost estimate before and during the audit** so you're never surprised.

Approximate per-call costs:

| Endpoint | Cost |
|----------|------|
| Ranked Keywords (Labs) | ~$0.01 per 1000 results |
| Domain Intersection (Labs) | ~$0.011 per 1000 results |
| SERP Live Advanced | ~$0.003 per task |
| OnPage Crawl | ~$0.00025 per page |
| Backlinks Summary | ~$0.002 per target |

The agent is built with cost-awareness throughout — for example, ranked keywords for positions 1-30 are fetched in a single call and split client-side, instead of two separate calls.

---

## Project structure

```
seo-xray/
├── CLAUDE.md                    # Full agent specification
├── README.md                    # This file
├── package.json
├── server/
│   ├── index.js                 # Express server entry
│   ├── routes/                  # API route handlers
│   ├── services/
│   │   ├── dfs-client.js        # DataForSEO API client (auth, rate limit, retry)
│   │   ├── orchestrator.js      # Audit orchestration logic
│   │   ├── module1-striking.js
│   │   ├── module2-newpages.js
│   │   ├── module3-aeo.js
│   │   ├── module4-contentgap.js
│   │   ├── module5-strengths.js
│   │   ├── page-classifier.js
│   │   ├── scoring.js
│   │   └── intent-classifier.js
│   └── utils/
├── client/
│   └── src/
│       ├── store/               # Zustand store
│       └── components/
│           ├── InputPanel/
│           ├── ProgressView/
│           ├── Dashboard/
│           └── ExportPanel/
└── scripts/
    └── generate-xlsx.py         # Python XLSX generator
```

For the complete agent specification, including module-level API payloads, scoring formulas, page classification logic, and orchestration flow, see [CLAUDE.md](./CLAUDE.md).

---

## Roadmap

- [ ] Add support for international/multilingual sites with locale-aware competitor matching
- [ ] Caching layer to avoid re-fetching for repeated audits of the same domain
- [ ] Scheduled re-audits with diff reports (track movement over time)
- [ ] Bring-your-own-LLM integration for AI-generated optimization recommendations
- [ ] PDF export option in addition to DOCX

---

## Contributing

Issues and PRs welcome. If you're using SEO X-Ray in production and want to share a use case or feature request, open an issue.

---

## License

MIT — see [LICENSE](./LICENSE).

---

## Credits

Built by [@harsh719](https://github.com/harsh719). Powered by [DataForSEO](https://dataforseo.com/).
