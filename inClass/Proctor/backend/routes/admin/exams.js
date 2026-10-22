'use strict';
// Admin: /api/admin/exams (exam CRUD, settings, proctoring, publish) and their questions.

const express = require('express');
const { validate } = require('../../lib/validate');
const { sendOk, checkIdParam } = require('../../lib/http');
const { ID_PATTERN } = require('../../lib/ids');
const exams = require('../../lib/exams');
const examQuestions = require('../../lib/examQuestions');
const review = require('../../lib/review');
const { getExam } = require('../../lib/examStore');

const router = express.Router();
router.param('examId', checkIdParam);
router.param('questionId', checkIdParam);

const DRY_RUN = { dryRun: { type: 'boolean', default: false } };

router.get('/', (req, res) => {
  sendOk(res, exams.listExams());
});

router.post('/', validate({
  body: { ...exams.META_FIELDS, title: { ...exams.META_FIELDS.title, required: true }, copyFromId: { type: 'id' } },
}), async (req, res) => {
  sendOk(res, { exam: await exams.createExam(req.valid.body) }, 201);
});

router.get('/:examId', (req, res) => {
  sendOk(res, { exam: exams.adminExam(getExam(req.params.examId)) });
});

router.patch('/:examId', validate({ body: exams.META_FIELDS }), async (req, res) => {
  sendOk(res, { exam: await exams.updateMeta(req.params.examId, req.valid.body) });
});

router.delete('/:examId', async (req, res) => {
  sendOk(res, await exams.deleteExam(req.params.examId));
});

router.put('/:examId/settings', validate({ body: { settings: { type: 'object', required: true } } }), async (req, res) => {
  sendOk(res, { exam: await exams.updateSettings(req.params.examId, req.valid.body.settings) });
});

router.put('/:examId/proctoring', validate({ body: { proctoring: { type: 'object', required: true } } }), async (req, res) => {
  sendOk(res, { exam: await exams.updateProctoring(req.params.examId, req.valid.body.proctoring) });
});

router.post('/:examId/publish', validate({ body: DRY_RUN }), async (req, res) => {
  sendOk(res, await exams.publishExam(req.params.examId, req.valid.body.dryRun));
});

router.post('/:examId/unpublish', async (req, res) => {
  sendOk(res, { exam: await exams.unpublishExam(req.params.examId) });
});

router.post('/:examId/extend-in-progress', validate({
  body: {
    minutes: { type: 'integer', required: true, min: 1, max: 180 },
    reason: { type: 'string', required: true, min: 1, max: 200 },
  },
}), async (req, res) => {
  const { minutes, reason } = req.valid.body;
  sendOk(res, await review.extendInProgress(req.user.id, req.params.examId, minutes, reason));
});

// ---- questions ----

// Type-specific parts (config, key) are checked by the question's type module.
const QUESTION_BODY = {
  type: { type: 'string' },
  text: { type: 'any' },
  marks: { type: 'any' },
  topic: { type: 'any' },
  explanation: { type: 'any' },
  config: { type: 'object' },
  key: { type: 'object' },
};

router.post('/:examId/questions', validate({
  body: { ...QUESTION_BODY, type: { type: 'string', required: true }, afterId: { type: 'string', pattern: ID_PATTERN } },
}), async (req, res) => {
  sendOk(res, { question: await examQuestions.createQuestion(req.params.examId, req.valid.body) }, 201);
});

// Registered before /:questionId so "order" is never read as a question id.
router.put('/:examId/questions/order', validate({
  body: { order: { type: 'array', required: true, max: 500, items: { type: 'id' } } },
}), async (req, res) => {
  sendOk(res, await examQuestions.reorderQuestions(req.params.examId, req.valid.body.order));
});

router.patch('/:examId/questions/:questionId', validate({ body: QUESTION_BODY }), async (req, res) => {
  sendOk(res, { question: await examQuestions.updateQuestion(req.params.examId, req.params.questionId, req.valid.body) });
});

router.delete('/:examId/questions/:questionId', async (req, res) => {
  sendOk(res, await examQuestions.deleteQuestion(req.params.examId, req.params.questionId));
});

router.post('/:examId/questions/:questionId/preview-score', validate({
  body: { response: { type: 'any', required: true, nullable: true } },
}), (req, res) => {
  sendOk(res, examQuestions.previewScore(req.params.examId, req.params.questionId, req.valid.body.response));
});

module.exports = router;
