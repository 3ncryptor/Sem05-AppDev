'use strict';
// Admin: results (list, publish, CSV) and analytics for one exam.

const express = require('express');
const { validate } = require('../../lib/validate');
const { sendOk, checkIdParam } = require('../../lib/http');
const results = require('../../lib/results');

const router = express.Router();
router.param('examId', checkIdParam);

router.get('/:examId/results', async (req, res) => {
  sendOk(res, await results.listResults(req.params.examId));
});

// Plain CSV, not the JSON envelope; main saves it with dialog.showSaveDialog.
router.get('/:examId/results.csv', async (req, res) => {
  const csv = await results.resultsCsv(req.params.examId);
  res.type('text/csv; charset=utf-8').attachment('results.csv').send(csv);
});

router.post('/:examId/results/publish', validate({ body: { dryRun: { type: 'boolean', default: false } } }), async (req, res) => {
  sendOk(res, await results.publishResults(req.params.examId, req.valid.body.dryRun));
});

router.get('/:examId/analytics', async (req, res) => {
  sendOk(res, await results.analyticsFor(req.params.examId));
});

module.exports = router;
