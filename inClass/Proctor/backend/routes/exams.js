'use strict';
// Student: /api/exams (list, detail, start or resume an attempt).

const express = require('express');
const { validate } = require('../lib/validate');
const { sendOk, checkIdParam } = require('../lib/http');
const studentExams = require('../lib/studentExams');
const attempts = require('../lib/attempts');

const router = express.Router();
router.param('examId', checkIdParam);

router.get('/', async (req, res) => {
  sendOk(res, await studentExams.listForStudent(req.user));
});

router.get('/:examId', async (req, res) => {
  sendOk(res, await studentExams.getForStudent(req.user, req.params.examId));
});

router.post('/:examId/attempts', validate({
  body: {
    consent: {
      type: 'object',
      required: true,
      fields: {
        capture: { type: 'boolean', default: false },
        events: { type: 'boolean', default: false },
        terms: { type: 'boolean', default: false },
        termsVersion: { type: 'string', max: 40 },
      },
    },
    systemCheck: {
      type: 'object',
      fields: {
        camera: { type: 'string', max: 20 },
        face: { type: 'string', enum: ['ok', 'unavailable', 'failed'] },
        light: { type: 'string', max: 20 },
        screen: { type: 'string', max: 20 },
        displays: { type: 'integer', min: 0, max: 16 },
      },
    },
  },
}), async (req, res) => {
  const result = await attempts.startAttempt(req.user, req.params.examId, req.valid.body);
  sendOk(res, result, result.resumed ? 200 : 201);
});

module.exports = router;
