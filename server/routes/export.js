const express = require('express');
const router = express.Router();
const { getAudit } = require('../services/orchestrator');

router.get('/audit/:id/export/json', (req, res) => {
  const audit = getAudit(req.params.id);
  if (!audit) return res.status(404).json({ error: 'Audit not found' });

  if (audit.status !== 'completed') {
    return res.status(400).json({ error: 'Audit not yet completed' });
  }

  const filename = `${audit.config.clientUrl}_SEO_Audit_${new Date().toISOString().split('T')[0]}.json`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/json');
  res.json({
    audit_date: audit.completedAt,
    client_domain: audit.config.clientUrl,
    competitors: audit.config.competitors,
    language: audit.config.language,
    location_code: audit.config.locationCode,
    results: {
      overview: audit.results.overview,
      module1: audit.results.module1,
      module2: audit.results.module2,
      module3: audit.results.module3,
      module4: audit.results.module4,
      module5: audit.results.module5,
    },
  });
});

router.post('/audit/:id/export/xlsx', async (req, res) => {
  const audit = getAudit(req.params.id);
  if (!audit) return res.status(404).json({ error: 'Audit not found' });
  if (audit.status !== 'completed') {
    return res.status(400).json({ error: 'Audit not yet completed' });
  }

  // TODO: Implement XLSX generation with Python openpyxl
  res.status(501).json({ error: 'XLSX export not yet implemented' });
});

router.post('/audit/:id/export/docx', async (req, res) => {
  const audit = getAudit(req.params.id);
  if (!audit) return res.status(404).json({ error: 'Audit not found' });
  if (audit.status !== 'completed') {
    return res.status(400).json({ error: 'Audit not yet completed' });
  }

  // TODO: Implement DOCX generation with docx-js
  res.status(501).json({ error: 'DOCX export not yet implemented' });
});

module.exports = router;
