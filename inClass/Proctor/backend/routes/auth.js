'use strict';
// /api/auth: login (rate limited), logout, me.

const express = require('express');
const auth = require('../lib/auth');
const { validate } = require('../lib/validate');
const { sendOk } = require('../lib/http');

const router = express.Router();

router.post('/login', validate({
  body: {
    rollNo: { type: 'string', required: true, min: 1, max: 64 },
    password: { type: 'string', required: true, min: 1, max: 64, trim: false },
  },
}), async (req, res) => {
  const { rollNo, password } = req.valid.body;
  sendOk(res, await auth.login(rollNo, password));
});

router.post('/logout', auth.requireAuth, async (req, res) => {
  await auth.logout(req.token);
  sendOk(res, { ok: true });
});

router.get('/me', auth.requireAuth, (req, res) => {
  sendOk(res, { user: req.user });
});

module.exports = router;
