'use strict';
// Admin: /api/admin/attempts/:attemptId/... (detail, evidence, flags, decisions, time actions, release).

const express = require('express');
const { validate } = require('../../lib/validate');
const { sendOk, checkIdParam } = require('../../lib/http');
const { REVIEW_STATUSES } = require('../../lib/constants');
const review = require('../../lib/review');
const evidence = require('../../lib/evidence');

const router = express.Router();
router.param('attemptId', checkIdParam);
router.param('flagId', checkIdParam);

const REASON = { type: 'string', required: true, min: 1, max: 200 };

router.get('/:attemptId', async (req, res) => {
  sendOk(res, await review.attemptDetail(req.params.attemptId));
});

// Sends the image itself (not the JSON envelope); main turns it into { mime, bytes }.
router.get('/:attemptId/evidence/:kind/:file', async (req, res) => {
  const bytes = await evidence.readEvidence(req.params.attemptId, req.params.kind, req.params.file);
  res.type('image/jpeg').send(bytes);
});

router.post('/:attemptId/flags/:flagId/dismiss', validate({ body: { note: { ...REASON, max: 500 } } }), async (req, res) => {
  sendOk(res, await review.dismissFlag(req.user.id, req.params.attemptId, req.params.flagId, req.valid.body.note));
});

router.put('/:attemptId/review', validate({
  body: {
    status: { type: 'string', required: true, enum: REVIEW_STATUSES },
    note: { type: 'string', max: 1000, default: '' },
  },
}), async (req, res) => {
  sendOk(res, await review.decide(req.user.id, req.params.attemptId, req.valid.body));
});

router.post('/:attemptId/extend', validate({
  body: { minutes: { type: 'integer', required: true, min: 1, max: 180 }, reason: REASON },
}), async (req, res) => {
  sendOk(res, await review.extendAttempt(req.user.id, req.params.attemptId, req.valid.body.minutes, req.valid.body.reason));
});

router.post('/:attemptId/end', validate({ body: { reason: REASON } }), async (req, res) => {
  sendOk(res, await review.endAttempt(req.user.id, req.params.attemptId, req.valid.body.reason));
});

router.post('/:attemptId/resume', validate({
  body: { extraFlags: { type: 'integer', min: 0, max: 20, default: 0 }, reason: REASON },
}), async (req, res) => {
  sendOk(res, await review.resumeAttempt(req.user.id, req.params.attemptId, req.valid.body.extraFlags, req.valid.body.reason));
});

router.post('/:attemptId/release', async (req, res) => {
  sendOk(res, await review.releaseResult(req.user.id, req.params.attemptId));
});

module.exports = router;
