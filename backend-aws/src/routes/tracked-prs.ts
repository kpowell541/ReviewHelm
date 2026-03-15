import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { requireAuth } from '../auth/middleware';
import { requireTier } from '../subscription/middleware';
import {
  deleteTrackedPr,
  getTrackedPr,
  listTrackedPrs,
  upsertTrackedPr,
} from '../tracked-prs/service';
import { upsertTrackedPrSchema } from '../tracked-prs/schema';

export function createTrackedPrsRouter() {
  const app = new Hono();

  app.use('*', requireAuth);
  app.use('*', requireTier('starter'));

  app.get('/', async (c) => c.json(await listTrackedPrs(c.get('principal'))));

  app.get('/:prId', async (c) => c.json(await getTrackedPr(c.get('principal'), c.req.param('prId'))));

  app.put('/:prId', async (c) => {
    const body = await c.req.json();
    const parsed = upsertTrackedPrSchema.safeParse({
      ...body,
      id: c.req.param('prId'),
    });
    if (!parsed.success) {
      throw new HTTPException(400, { message: JSON.stringify(parsed.error.flatten()) });
    }

    return c.json(await upsertTrackedPr(c.get('principal'), parsed.data));
  });

  app.delete('/:prId', async (c) => {
    await deleteTrackedPr(c.get('principal'), c.req.param('prId'));
    return c.body(null, 204);
  });

  return app;
}
