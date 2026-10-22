'use strict';
// Admin: home, the live monitor and the review queue.

const express = require('express');
const { validate } = require('../../lib/validate');
const { sendOk, checkIdParam } = require('../../lib/http');
const { RULE_NAMES, REVIEW_STATUSES } = require('../../lib/constants');
const live = require('../../lib/live');

const router = express.Router();
router.param('examId', checkIdParam);

router.get('/home', async (req, res) => {
  sendOk(res, await live.homeView());
});

router.get('/exams/:examId/live', validate({ query: { since: { type: 'date' } } }), async (req, res) => {
  sendOk(res, await live.liveView(req.params.examId, req.valid.query.since));
});

router.get('/exams/:examId/review-queue', validate({
  query: {
    status: { type: 'string', enum: [...REVIEW_STATUSES, 'all'], default: 'pending' },
    rule: { type: 'string', enum: [...RULE_NAMES, 'any'], default: 'any' },
    sort: { type: 'string', enum: ['risk', 'flags', 'recent'], default: 'risk' },
  },
}), async (req, res) => {
  sendOk(res, await live.reviewQueue(req.params.examId, req.valid.query));
});

module.exports = router;
