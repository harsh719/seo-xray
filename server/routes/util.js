const express = require('express');
const router = express.Router();
const { DFSClient, DFSError } = require('../services/dfs-client');
const { normalizeDomain } = require('../utils/url-utils');
const { estimateCost } = require('../utils/cost-estimator');

let cachedLocations = null;

router.post('/validate-credentials', async (req, res) => {
  try {
    const { login, password } = req.body;
    if (!login || !password) {
      return res.status(400).json({ error: 'Login and password are required' });
    }

    const client = new DFSClient(login, password);
    const result = await client.domainRankOverview('google.com');

    if (result.status_code === 20000) {
      return res.json({ valid: true });
    }
    return res.json({ valid: false, message: result.status_message });
  } catch (err) {
    if (err instanceof DFSError) {
      if (err.statusCode === 40100) {
        return res.json({ valid: false, message: 'Invalid credentials' });
      }
      if (err.statusCode === 40200) {
        return res.json({ valid: false, message: 'Insufficient balance' });
      }
    }
    return res.status(500).json({ valid: false, message: err.message });
  }
});

router.get('/locations', async (req, res) => {
  try {
    if (cachedLocations) {
      return res.json(cachedLocations);
    }

    const { login, password } = req.query;
    if (!login || !password) {
      return res.status(400).json({ error: 'Credentials required as query params' });
    }

    const client = new DFSClient(login, password);
    const data = await client.locationsAndLanguages();

    if (data.status_code === 20000 && data.tasks?.[0]?.result) {
      cachedLocations = data.tasks[0].result;
      return res.json(cachedLocations);
    }
    return res.status(500).json({ error: 'Failed to fetch locations' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/estimate-cost', (req, res) => {
  const { competitorCount = 3, crawlPages = 500, serpDepth = 20 } = req.body;
  const cost = estimateCost({ competitorCount, crawlPages, serpDepth });
  res.json({ estimatedCost: cost });
});

module.exports = router;
