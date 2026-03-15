import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { requireAuth } from '../auth/middleware';
import { requireTier } from '../subscription/middleware';
import {
  activateCommentProfile,
  createCommentProfile,
  deleteCommentProfile,
  listCommentProfiles,
  updateCommentProfile,
} from '../comment-profiles/service';
import { createCommentProfileSchema, updateCommentProfileSchema } from '../comment-profiles/schema';

export function createCommentProfilesRouter() {
  const app = new Hono();

  app.use('*', requireAuth);
  app.use('*', requireTier('starter'));

  app.get('/', async (c) => c.json(await listCommentProfiles(c.get('principal'))));

  app.post('/', async (c) => {
    const parsed = createCommentProfileSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      throw new HTTPException(400, { message: JSON.stringify(parsed.error.flatten()) });
    }

    return c.json(await createCommentProfile(c.get('principal'), parsed.data), 201);
  });

  app.patch('/:profileId', async (c) => {
    const parsed = updateCommentProfileSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      throw new HTTPException(400, { message: JSON.stringify(parsed.error.flatten()) });
    }

    return c.json(await updateCommentProfile(c.get('principal'), c.req.param('profileId'), parsed.data));
  });

  app.delete('/:profileId', async (c) => {
    await deleteCommentProfile(c.get('principal'), c.req.param('profileId'));
    return c.body(null, 204);
  });

  app.post('/:profileId/activate', async (c) => {
    return c.json(await activateCommentProfile(c.get('principal'), c.req.param('profileId')));
  });

  return app;
}
