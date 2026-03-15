import { Hono } from 'hono';
import { requireAuth } from '../auth/middleware';
import { getSessionUsage } from '../usage/service';

export function createUsageRouter() {
  const app = new Hono();

  app.use('*', requireAuth);

  app.get('/sessions/:sessionId', async (c) => {
    return c.json(await getSessionUsage(c.get('principal'), c.req.param('sessionId')));
  });

  return app;
}
