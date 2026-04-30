const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { createAudit, getAudit, runAudit } = require('../services/orchestrator');
const { normalizeDomain, isValidDomain } = require('../utils/url-utils');

router.post('/audit/start', async (req, res) => {
  try {
    const { clientUrl, competitors = [], login, password, language, locationCode, crawlPages, serpDepth, minSearchVolume, bofuConfig } = req.body;

    // Validate
    if (!clientUrl || !login || !password) {
      return res.status(400).json({ error: 'Client URL and DataForSEO credentials are required' });
    }

    const normalizedClient = normalizeDomain(clientUrl);
    if (!isValidDomain(normalizedClient)) {
      return res.status(400).json({ error: 'Invalid client URL' });
    }

    const validCompetitors = competitors.map(normalizeDomain).filter(isValidDomain);
    if (validCompetitors.length === 0) {
      return res.status(400).json({ error: 'At least one valid competitor URL is required' });
    }

    const auditId = uuidv4();
    const config = {
      clientUrl: normalizedClient,
      competitors: validCompetitors,
      login,
      password,
      language: language || 'English',
      locationCode: locationCode || 2840,
      crawlPages: crawlPages || 500,
      serpDepth: serpDepth || 20,
      minSearchVolume: minSearchVolume || 100,
      bofuConfig: bofuConfig || { enabled: false, selectedTypes: [], customPatterns: [] },
    };

    createAudit(auditId, config);

    // Run audit in background
    runAudit(auditId, config).catch(err => {
      console.error(`Audit ${auditId} failed:`, err);
    });

    res.json({ auditId, status: 'started' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/audit/:id/status', (req, res) => {
  const audit = getAudit(req.params.id);
  if (!audit) return res.status(404).json({ error: 'Audit not found' });

  res.json({
    id: audit.id,
    status: audit.status,
    progress: audit.progress,
    currentStep: audit.currentStep,
    logs: audit.logs.slice(-20),
    error: audit.error,
  });
});

router.get('/audit/:id/results', (req, res) => {
  const audit = getAudit(req.params.id);
  if (!audit) return res.status(404).json({ error: 'Audit not found' });

  if (audit.status !== 'completed') {
    return res.json({
      status: audit.status,
      progress: audit.progress,
      results: audit.results,
    });
  }

  res.json({
    status: 'completed',
    results: {
      overview: audit.results.overview,
      module1: audit.results.module1,
      module2: audit.results.module2,
      module3: audit.results.module3,
      module4: audit.results.module4,
      module5: audit.results.module5,
    },
    config: {
      clientDomain: audit.config.clientUrl,
      competitors: audit.config.competitors,
      language: audit.config.language,
      locationCode: audit.config.locationCode,
      bofuConfig: audit.config.bofuConfig || null,
    },
  });
});

router.get('/audit/:id/module/:num', (req, res) => {
  const audit = getAudit(req.params.id);
  if (!audit) return res.status(404).json({ error: 'Audit not found' });

  const moduleKey = `module${req.params.num}`;
  const data = audit.results[moduleKey];
  if (!data) return res.status(404).json({ error: 'Module data not available yet' });

  res.json(data);
});

module.exports = router;
