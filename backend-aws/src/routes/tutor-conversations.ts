import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { requireAuth } from '../auth/middleware';
import { requireTier } from '../subscription/middleware';
import {
  bulkUpsertTutorConversations,
  deleteTutorConversation,
  listTutorConversations,
  upsertTutorConversation,
} from '../tutor-conversations/service';
import { bulkTutorConversationsSchema, tutorConversationSchema } from '../tutor-conversations/schema';

export function createTutorConversationsRouter() {
  const app = new Hono();

  app.use('*', requireAuth);
  app.use('*', requireTier('premium'));

  app.get('/', async (c) => c.json(await listTutorConversations(c.get('principal'))));

  app.put('/:itemId', async (c) => {
    const parsed = tutorConversationSchema.safeParse({
      ...(await c.req.json()),
      itemId: c.req.param('itemId'),
    });
    if (!parsed.success) {
      throw new HTTPException(400, { message: JSON.stringify(parsed.error.flatten()) });
    }
    return c.json(await upsertTutorConversation(c.get('principal'), parsed.data));
  });

  app.put('/', async (c) => {
    const parsed = bulkTutorConversationsSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      throw new HTTPException(400, { message: JSON.stringify(parsed.error.flatten()) });
    }
    return c.json(await bulkUpsertTutorConversations(c.get('principal'), parsed.data.conversations));
  });

  app.delete('/:itemId', async (c) => {
    await deleteTutorConversation(c.get('principal'), c.req.param('itemId'));
    return c.body(null, 204);
  });

  return app;
}
