import { Hono } from 'hono';
import { requireAuth } from '../auth/middleware';
import { getCreditBalance, getTierInfo } from '../subscription/service';

export function createSubscriptionRouter() {
  const app = new Hono();

  app.use('*', requireAuth);

  app.get('/tier', async (c) => {
    const principal = c.get('principal');
    return c.json(await getTierInfo(principal));
  });

  app.get('/credits', async (c) => {
    const principal = c.get('principal');
    return c.json(await getCreditBalance(principal));
  });

  return app;
}
