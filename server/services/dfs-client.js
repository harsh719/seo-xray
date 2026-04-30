const PQueue = require('p-queue').default;

class DFSClient {
  constructor(login, password) {
    this.baseUrl = 'https://api.dataforseo.com/v3';
    this.credentials = Buffer.from(`${login}:${password}`).toString('base64');
    this.headers = {
      'Authorization': `Basic ${this.credentials}`,
      'Content-Type': 'application/json',
    };
    this.queue = new PQueue({
      concurrency: parseInt(process.env.MAX_CONCURRENT_DFS || '10', 10),
      interval: 100,
      intervalCap: 1,
    });
    this.totalCost = 0;
  }

  async request(endpoint, payload, retries = 5) {
    return this.queue.add(() => this._doRequest(endpoint, payload, retries));
  }

  async _doRequest(endpoint, payload, retriesLeft) {
    const url = `${this.baseUrl}${endpoint}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      if (response.status === 429 || response.status >= 500) {
        if (retriesLeft > 0) {
          const delay = Math.pow(2, 5 - retriesLeft) * 1000;
          await new Promise(r => setTimeout(r, delay));
          return this._doRequest(endpoint, payload, retriesLeft - 1);
        }
        throw new Error(`DFS API error: ${response.status} after max retries`);
      }

      const data = await response.json();

      if (data.status_code !== 20000) {
        throw new DFSError(data.status_code, data.status_message, data);
      }

      return data;
    } catch (err) {
      if (err instanceof DFSError) throw err;
      if (retriesLeft > 0) {
        const delay = Math.pow(2, 5 - retriesLeft) * 1000;
        await new Promise(r => setTimeout(r, delay));
        return this._doRequest(endpoint, payload, retriesLeft - 1);
      }
      throw err;
    }
  }

  async get(endpoint) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this.headers,
    });
    return response.json();
  }

  // --- Labs API ---

  async rankedKeywords(target, options = {}) {
    const payload = [{
      target,
      language_name: options.language || 'English',
      location_code: options.locationCode || 2840,
      ...(options.filters && { filters: options.filters }),
      ...(options.itemTypes && { item_types: options.itemTypes }),
      order_by: options.orderBy || ['keyword_data.keyword_info.search_volume,desc'],
      limit: options.limit || 1000,
      ...(options.offset && { offset: options.offset }),
    }];
    return this.request('/dataforseo_labs/google/ranked_keywords/live', payload);
  }

  async domainIntersection(target1, target2, options = {}) {
    const payload = [{
      target1,
      target2,
      language_name: options.language || 'English',
      location_code: options.locationCode || 2840,
      intersections: options.intersections ?? false,
      ...(options.filters && { filters: options.filters }),
      order_by: options.orderBy || ['keyword_data.keyword_info.search_volume,desc'],
      limit: options.limit || 1000,
    }];
    return this.request('/dataforseo_labs/google/domain_intersection/live', payload);
  }

  async relatedKeywords(keyword, options = {}) {
    const payload = [{
      keyword,
      language_name: options.language || 'English',
      location_code: options.locationCode || 2840,
      limit: options.limit || 100,
    }];
    return this.request('/dataforseo_labs/google/related_keywords/live', payload);
  }

  async relevantPages(target, options = {}) {
    const payload = [{
      target,
      language_name: options.language || 'English',
      location_code: options.locationCode || 2840,
      order_by: options.orderBy || ['metrics.organic.etv,desc'],
      limit: options.limit || 500,
    }];
    return this.request('/dataforseo_labs/google/relevant_pages/live', payload);
  }

  async domainRankOverview(target, options = {}) {
    const payload = [{
      target,
      language_name: options.language || 'English',
      location_code: options.locationCode || 2840,
    }];
    return this.request('/dataforseo_labs/google/domain_rank_overview/live', payload);
  }

  async competitorsDomain(target, options = {}) {
    const payload = [{
      target,
      language_name: options.language || 'English',
      location_code: options.locationCode || 2840,
      limit: options.limit || 10,
    }];
    return this.request('/dataforseo_labs/google/competitors_domain/live', payload);
  }

  async locationsAndLanguages() {
    return this.get('/dataforseo_labs/locations_and_languages');
  }

  // --- SERP API ---

  async serpLiveAdvanced(keyword, options = {}) {
    const payload = [{
      keyword,
      language_name: options.language || 'English',
      location_code: options.locationCode || 2840,
      device: options.device || 'desktop',
      os: options.os || 'windows',
    }];
    return this.request('/serp/google/organic/live/advanced', payload);
  }

  // --- Backlinks API ---

  async backlinksSummary(target) {
    const payload = [{
      target,
      internal_list_limit: 0,
      include_subdomains: true,
    }];
    return this.request('/backlinks/summary/live', payload);
  }

  // --- OnPage API ---

  async onPageTaskPost(target, options = {}) {
    const payload = [{
      target,
      max_crawl_pages: options.maxCrawlPages || parseInt(process.env.CRAWL_PAGE_LIMIT || '500', 10),
      load_resources: false,
      enable_javascript: false,
      enable_browser_rendering: false,
      custom_user_agent: 'Mozilla/5.0 (compatible; AuditPilot/1.0)',
    }];
    return this.request('/on_page/task_post', payload);
  }

  async onPagePages(taskId, options = {}) {
    const payload = [{
      id: taskId,
      filters: [
        ['resource_type', '=', 'html'],
        'and',
        ['status_code', '=', 200],
      ],
      limit: options.limit || 500,
    }];
    return this.request('/on_page/pages', payload);
  }

  async onPageSummary(taskId) {
    const payload = [{ id: taskId }];
    return this.request('/on_page/summary', payload);
  }

  addCost(amount) {
    this.totalCost += amount;
  }

  getCost() {
    return this.totalCost;
  }
}

class DFSError extends Error {
  constructor(statusCode, statusMessage, rawResponse) {
    super(`DFS Error ${statusCode}: ${statusMessage}`);
    this.statusCode = statusCode;
    this.statusMessage = statusMessage;
    this.rawResponse = rawResponse;
  }
}

module.exports = { DFSClient, DFSError };
