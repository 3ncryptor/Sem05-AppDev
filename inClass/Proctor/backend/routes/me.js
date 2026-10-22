'use strict';
// Student: /api/me (own attempts and analytics).

const express = require('express');
const { sendOk } = require('../lib/http');
const results = require('../lib/results');

const router = express.Router();

router.get('/attempts', async (req, res) => {
  sendOk(res, await results.myAttemptList(req.user));
});

router.get('/analytics', async (req, res) => {
  sendOk(res, await results.myAnalytics(req.user));
});

module.exports = router;
