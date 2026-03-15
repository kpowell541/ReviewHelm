import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { requireAuth } from '../auth/middleware';
import { getCurrentUser, getPreferences, updatePreferences } from '../me/service';
import { updatePreferencesSchema } from '../me/schema';

export function createMeRouter() {
  const app = new Hono();

  app.use('*', requireAuth);

  app.get('/', async (c) => {
    const principal = c.get('principal');
    return c.json(await getCurrentUser(principal));
  });

  app.get('/preferences', async (c) => {
    const principal = c.get('principal');
    return c.json(await getPreferences(principal));
  });

  app.patch('/preferences', async (c) => {
    const principal = c.get('principal');
    const body = await c.req.json();
    const parsed = updatePreferencesSchema.safeParse(body);
    if (!parsed.success) {
      throw new HTTPException(400, {
        message: JSON.stringify(parsed.error.flatten()),
      });
    }

    return c.json(await updatePreferences(principal, parsed.data));
  });

  return app;
}
