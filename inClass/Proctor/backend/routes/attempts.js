'use strict';
// Student: /api/attempts/:attemptId/... Every handler checks the attempt is the caller's own.

const express = require('express');
const { validate } = require('../lib/validate');
const { sendOk, checkIdParam } = require('../lib/http');
const { validationError } = require('../lib/errors');
const { ID_PATTERN } = require('../lib/ids');
const { CLIENT_EVENT_TYPES, LIMITS, EVIDENCE_KINDS, EVIDENCE_REASONS } = require('../lib/constants');
const attempts = require('../lib/attempts');
const events = require('../lib/events');
const evidence = require('../lib/evidence');

const PAYLOAD_MAX_CHARS = 2000;

const router = express.Router();
router.param('attemptId', checkIdParam);
router.param('questionId', checkIdParam);

const EVENT_SCHEMA = {
  type: 'object',
  fields: {
    seq: { type: 'integer', required: true, min: 0, max: 1e9 },
    type: { type: 'string', required: true, enum: CLIENT_EVENT_TYPES },
    phase: { type: 'string', enum: ['start', 'end'] },
    clientTs: { type: 'date' },
    questionId: { type: 'string', pattern: ID_PATTERN },
    payload: { type: 'object' },
  },
};

const EVENTS_LIST = { type: 'array', items: EVENT_SCHEMA, max: LIMITS.EVENTS_PER_REQUEST };

/** Payloads are free-form detail (e.g. awaySec), so only their size is limited. */
function checkPayloads(list) {
  const tooBig = (list || []).findIndex((e) => e.payload && JSON.stringify(e.payload).length > PAYLOAD_MAX_CHARS);
  if (tooBig >= 0) throw validationError({ [`events.${tooBig}.payload`]: `At most ${PAYLOAD_MAX_CHARS} characters` });
}

router.get('/:attemptId', async (req, res) => {
  sendOk(res, await attempts.getAttempt(req.user, req.params.attemptId));
});

router.put('/:attemptId/answers/:questionId', validate({
  body: {
    revision: { type: 'integer', required: true, min: 1, max: 1e9 },
    response: { type: 'any', required: true, nullable: true },
    timeSpentSec: { type: 'integer', min: 0, max: 86400, default: 0 },
    marked: { type: 'boolean', default: false },
  },
}), async (req, res) => {
  sendOk(res, await attempts.saveAnswer(req.user, req.params.attemptId, req.params.questionId, req.valid.body));
});

router.post('/:attemptId/events', validate({ body: { events: { ...EVENTS_LIST, required: true, min: 1 } } }), async (req, res) => {
  checkPayloads(req.valid.body.events);
  sendOk(res, await events.recordEvents(req.user, req.params.attemptId, req.valid.body.events));
});

router.post('/:attemptId/heartbeat', validate({
  body: {
    seq: { type: 'integer', min: 0, max: 1e9 },
    sensors: {
      type: 'object',
      fields: {
        fullscreen: { type: 'boolean' },
        focused: { type: 'boolean' },
        displays: { type: 'integer', min: 0, max: 16 },
        camera: { type: 'string', enum: ['live', 'lost', 'off', 'unknown'] },
        faces: { type: 'integer', min: 0, max: 20, nullable: true },
        faceDetector: { type: 'string', enum: ['ok', 'loading', 'unavailable', 'off'] },
        online: { type: 'boolean' },
      },
    },
    events: { ...EVENTS_LIST, default: [] },
  },
}), async (req, res) => {
  checkPayloads(req.valid.body.events);
  sendOk(res, await events.heartbeat(req.user, req.params.attemptId, req.valid.body));
});

// Raw JPEG body (not JSON), at most 1 MB. The service checks the FF D8 FF magic bytes.
router.post('/:attemptId/evidence', express.raw({ type: 'image/jpeg', limit: LIMITS.EVIDENCE_BYTES }), validate({
  query: {
    kind: { type: 'string', required: true, enum: EVIDENCE_KINDS },
    seq: { type: 'integer', required: true, min: 0, max: 1e9, coerce: true },
    capturedAt: { type: 'date', required: true },
    reason: { type: 'string', enum: EVIDENCE_REASONS, default: 'interval' },
  },
}), async (req, res) => {
  sendOk(res, await evidence.uploadEvidence(req.user, req.params.attemptId, req.valid.query, req.body), 201);
});

router.post('/:attemptId/submit', async (req, res) => {
  sendOk(res, await attempts.submitAttempt(req.user, req.params.attemptId));
});

router.get('/:attemptId/receipt', async (req, res) => {
  sendOk(res, await attempts.getReceipt(req.user, req.params.attemptId));
});

router.get('/:attemptId/result', async (req, res) => {
  sendOk(res, await attempts.getResult(req.user, req.params.attemptId));
});

module.exports = router;
