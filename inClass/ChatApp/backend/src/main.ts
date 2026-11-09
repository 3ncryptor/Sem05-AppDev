import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { requestLogger } from './common/request-logger.middleware';
import { LoggingExceptionFilter } from './common/logging-exception.filter';
import { BufferedLogger } from './common/buffered-logger';
import { requestContextMiddleware } from './common/request-context';

async function bootstrap() {
  // Console logger that also keeps recent lines for GET /debug/logs
  const app = await NestFactory.create(AppModule, { bodyParser: false, logger: new BufferedLogger() });

  // Log every request to the console (registered first so it also sees body-parser errors)
  app.use(requestLogger);

  // Files are capped at 10 MB decoded; base64 adds ~33%, so the JSON body may reach ~14 MB
  app.use(json({ limit: '15mb' }));
  app.use(urlencoded({ extended: true, limit: '15mb' }));

  // Tag every log line written while handling a request with its X-Request-Id
  app.use(requestContextMiddleware);

  // Record why requests fail (shown on the request's log line); stack traces for 5xx
  app.useGlobalFilters(new LoggingExceptionFilter(app.get(HttpAdapterHost).httpAdapter));

  // Global validation pipe — transforms payloads to DTO instances
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger / OpenAPI 3.0 configuration
  const config = new DocumentBuilder()
    .setTitle('Chat App API')
    .setDescription(
      'NestJS Chat Backend — Users, Conversations, and Messages with cursor-based pagination.\n\n' +
      '**Authentication**: All endpoints require an `Authorization` header in the format:\n\n' +
      '`Authorization: Basic <username>:<password>`\n\n' +
      'The `username` acts as the unique user identifier. ' +
      'The `password` is used for authentication. ' +
      'If no user exists with that username, one is created automatically.',
    )
    .setVersion('1.0')
    .addBasicAuth(
      {
        type: 'http',
        scheme: 'basic',
        description: 'Format: Basic <username>:<password>',
      },
      'basic-auth',
    )
    .addTag('users', 'User profile operations')
    .addTag('conversations', 'Conversation management')
    .addTag('messages', 'Message CRUD and pagination')
    .addTag('files', 'Image and file upload (base64) and download')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`Application running on http://localhost:${port}`);
  logger.log(`Swagger UI available at http://localhost:${port}/docs`);
  logger.log(`Inspector server logs: ${process.env.DEBUG_LOGS === 'true' ? 'on (GET /debug/logs)' : 'off'}`);
}
bootstrap();
