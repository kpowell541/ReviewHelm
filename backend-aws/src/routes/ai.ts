import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { requireAuth } from '../auth/middleware';
import { requireTier } from '../subscription/middleware';
import { tutor } from '../ai/service';
import { aiTutorSchema } from '../ai/schema';

export function createAiRouter() {
  const app = new Hono();

  app.use('*', requireAuth);
  app.use('*', requireTier('premium'));

  app.post('/tutor', async (c) => {
    const parsed = aiTutorSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      throw new HTTPException(400, { message: JSON.stringify(parsed.error.flatten()) });
    }

    return c.json(await tutor(c.get('principal'), parsed.data));
  });

  return app;
}
