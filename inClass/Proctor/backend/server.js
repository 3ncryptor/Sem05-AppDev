'use strict';
// Athena exam server. Builds the Express app in the order of BUILD_PLAN §19.1 and listens on HOST:PORT
// (127.0.0.1 by default, so only this Mac can reach it unless HOST is set).

const express = require('express');
const { loadConfig } = require('./config');
const store = require('./lib/store');
const auth = require('./lib/auth');
const http = require('./lib/http');
const attemptFiles = require('./lib/attemptFiles');

/** @returns {import('express').Express} */
function createApp() {
  const app = express();
  app.disable('x-powered-by');

  // 1–2. request id and one log line per request
  app.use(http.requestId, http.logger, http.securityHeaders);
  // 3. JSON bodies everywhere; the evidence route adds its own raw image/jpeg parser.
  app.use(express.json({ limit: '256kb' }));

  // Unauthenticated: lets the client's "server:ping" check the server is up.
  app.get('/api/health', (req, res) => http.sendOk(res, { status: 'ok', serverNow: new Date().toISOString() }));

  // 4. routers: auth (public login), admin (admin role), student (student role)
  app.use('/api/auth', require('./routes/auth'));

  const admin = express.Router();
  admin.use(auth.requireAuth, auth.requireRole('admin'));
  admin.use('/exams', require('./routes/admin/exams'));
  admin.use('/exams', require('./routes/admin/results'));
  admin.use('/users', require('./routes/admin/users'));
  admin.use('/attempts', require('./routes/admin/review'));
  admin.use('/', require('./routes/admin/live'));
  admin.use(http.notFoundHandler);
  app.use('/api/admin', admin);

  const student = express.Router();
  student.use(auth.requireAuth, auth.requireRole('student'));
  student.use('/exams', require('./routes/exams'));
  student.use('/attempts', require('./routes/attempts'));
  student.use('/me', require('./routes/me'));
  app.use('/api', student);

  // 7–8. unknown routes and the error envelope
  app.use(http.notFoundHandler);
  app.use(http.errorHandler);
  return app;
}

function start() {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    process.stderr.write(`Config error: ${err.message}\n`);
    process.exit(1);
  }
  store.init(config.dataDir);
  attemptFiles.setEvidenceRoot(config.evidenceDir);
  auth.setTokenTtlHours(config.tokenTtlHours);
  const server = createApp().listen(config.port, config.host, () => {
    process.stdout.write(`Athena server on http://${config.host}:${config.port} (data: ${config.dataDir}, evidence: ${config.evidenceDir})\n`);
  });
  server.on('error', (err) => {
    process.stderr.write(`Server error: ${err.message}\n`);
    process.exit(1);
  });
}

if (require.main === module) start();

module.exports = { createApp };
