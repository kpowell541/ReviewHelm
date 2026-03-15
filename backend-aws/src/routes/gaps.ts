import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { requireAuth } from '../auth/middleware';
import { requireTier } from '../subscription/middleware';
import { getConfidence, getGaps, getLearnQueue, putConfidence } from '../gaps/service';
import { gapsQuerySchema, putConfidenceSchema } from '../gaps/schema';

export function createGapsRouter() {
  const app = new Hono();

  app.use('*', requireAuth);
  app.use('*', requireTier('advanced'));

  app.get('/', async (c) => {
    const parsed = gapsQuerySchema.safeParse({
      stackId: c.req.query('stackId'),
      limit: c.req.query('limit'),
    });
    if (!parsed.success) {
      throw new HTTPException(400, { message: JSON.stringify(parsed.error.flatten()) });
    }
    return c.json(await getGaps(c.get('principal'), parsed.data));
  });

  app.get('/confidence', async (c) => c.json(await getConfidence(c.get('principal'))));

  app.put('/confidence', async (c) => {
    const parsed = putConfidenceSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      throw new HTTPException(400, { message: JSON.stringify(parsed.error.flatten()) });
    }
    await putConfidence(c.get('principal'), parsed.data.histories);
    return c.json({ ok: true });
  });

  return app;
}

export function createLearnRouter() {
  const app = new Hono();

  app.use('*', requireAuth);
  app.use('*', requireTier('advanced'));

  app.get('/queue', async (c) => {
    const parsed = gapsQuerySchema.safeParse({
      stackId: c.req.query('stackId'),
      limit: c.req.query('limit'),
    });
    if (!parsed.success) {
      throw new HTTPException(400, { message: JSON.stringify(parsed.error.flatten()) });
    }
    return c.json(await getLearnQueue(c.get('principal'), parsed.data));
  });

  return app;
}
