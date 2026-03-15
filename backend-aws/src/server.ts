import { serve } from '@hono/node-server';
import { getEnv } from './config/env';
import { createApp } from './app';

const env = getEnv();
const app = createApp();

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(
      JSON.stringify({
        level: 'info',
        message: 'server.started',
        time: new Date().toISOString(),
        port: info.port,
        apiBasePath: env.API_BASE_PATH,
      }),
    );
  },
);
