import { Hono } from 'hono';
import { requireAdmin } from '../auth/middleware';
import { getAdminCostOverview } from '../admin/costs/service';

export function createAdminCostsRouter() {
  const app = new Hono();

  app.use('*', requireAdmin);

  app.get('/overview', async (c) => {
    return c.json(await getAdminCostOverview());
  });

  return app;
}
