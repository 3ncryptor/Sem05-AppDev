'use strict';
// Admin: /api/admin/users (students).

const express = require('express');
const { validate } = require('../../lib/validate');
const { sendOk, checkIdParam } = require('../../lib/http');
const { LIMITS } = require('../../lib/constants');
const users = require('../../lib/users');

const router = express.Router();
router.param('userId', checkIdParam);

router.get('/', (req, res) => {
  sendOk(res, users.listStudents());
});

router.post('/', validate({
  body: {
    rollNo: { type: 'string', required: true, min: 2, max: 32 },
    name: { type: 'string', required: true, min: 1, max: 80 },
    password: { type: 'string', min: 8, max: 64, trim: false },
  },
}), async (req, res) => {
  sendOk(res, await users.createStudent(req.valid.body), 201);
});

// Registered before /:userId so "import" is never read as a user id.
router.post('/import', validate({
  body: {
    rows: { type: 'array', required: true, min: 1, max: LIMITS.IMPORT_ROWS, items: { type: 'object' } },
    dryRun: { type: 'boolean', default: true },
  },
}), async (req, res) => {
  sendOk(res, await users.importStudents(req.valid.body.rows, req.valid.body.dryRun));
});

router.patch('/:userId', validate({
  body: { name: { type: 'string', min: 1, max: 80 }, active: { type: 'boolean' } },
}), async (req, res) => {
  sendOk(res, await users.updateStudent(req.params.userId, req.valid.body));
});

router.post('/:userId/reset-password', async (req, res) => {
  sendOk(res, await users.resetPassword(req.params.userId));
});

module.exports = router;
