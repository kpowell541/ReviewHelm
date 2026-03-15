import { Hono } from 'hono';

export function createRootRouter() {
  const app = new Hono();

  app.get('/', (c) =>
    c.json({
      ok: true,
      service: 'reviewhelm-api-aws',
      status: 'live',
      version: c.get('env').APP_VERSION,
      time: new Date().toISOString(),
      requestId: c.get('requestId'),
    }),
  );

  return app;
}
