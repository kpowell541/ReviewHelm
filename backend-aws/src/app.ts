import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { contextMiddleware } from './middleware/context';
import { createHealthRouter } from './routes/health';
import { createMeRouter } from './routes/me';
import { createRootRouter } from './routes/root';
import { createCommentProfilesRouter } from './routes/comment-profiles';
import { createGapsRouter, createLearnRouter } from './routes/gaps';
import { createAiRouter } from './routes/ai';
import { createAdminCostsRouter } from './routes/admin-costs';
import { createSessionsRouter } from './routes/sessions';
import { createSubscriptionRouter } from './routes/subscription';
import { createTrackedPrsRouter } from './routes/tracked-prs';
import { createUsageRouter } from './routes/usage';
import { createTutorConversationsRouter } from './routes/tutor-conversations';
import './types/context';

export function createApp() {
  const app = new Hono();

  app.use('*', contextMiddleware);
  app.route('/', createRootRouter());
  app.route('/api/v1', createHealthRouter());
  app.route('/api/v1/admin/costs', createAdminCostsRouter());
  app.route('/api/v1/ai', createAiRouter());
  app.route('/api/v1/comment-profiles', createCommentProfilesRouter());
  app.route('/api/v1/gaps', createGapsRouter());
  app.route('/api/v1/learn', createLearnRouter());
  app.route('/api/v1/me', createMeRouter());
  app.route('/api/v1/sessions', createSessionsRouter());
  app.route('/api/v1/subscription', createSubscriptionRouter());
  app.route('/api/v1/tracked-prs', createTrackedPrsRouter());
  app.route('/api/v1/tutor-conversations', createTutorConversationsRouter());
  app.route('/api/v1/usage', createUsageRouter());

  app.onError((error, c) => {
    const logger = c.get('logger');
    const requestId = c.get('requestId');
    const isHttpError = error instanceof HTTPException;
    const status = isHttpError ? error.status : 500;

    logger.error('request.error', {
      requestId,
      method: c.req.method,
      path: c.req.path,
      status,
      error: error.message,
      stack: error.stack,
    });

    return c.json(
      {
        ok: false,
        error: status >= 500 ? 'Internal Server Error' : error.message,
        requestId,
      },
      status,
    );
  });

  app.notFound((c) =>
    c.json(
      {
        ok: false,
        error: 'Not Found',
        requestId: c.get('requestId'),
      },
      404,
    ),
  );

  return app;
}
