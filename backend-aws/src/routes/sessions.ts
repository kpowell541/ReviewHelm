import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { requireAuth } from '../auth/middleware';
import {
  completeSession,
  createSession,
  deleteSession,
  getSessionById,
  getSessionSummary,
  listSessions,
  patchItemResponse,
  patchSessionNotes,
  updateSession,
} from '../sessions/service';
import {
  completeSessionSchema,
  createSessionSchema,
  listSessionsQuerySchema,
  patchItemResponseSchema,
  patchSessionNotesSchema,
  updateSessionSchema,
} from '../sessions/schema';

function parseOrThrow<T>(parsed: { success: true; data: T } | { success: false; error: unknown }): T {
  if (parsed.success) return parsed.data;
  throw new HTTPException(400, { message: JSON.stringify((parsed as { error: { toString: () => string } }).error) });
}

export function createSessionsRouter() {
  const app = new Hono();

  app.use('*', requireAuth);

  app.post('/', async (c) => {
    const body = parseOrThrow(createSessionSchema.safeParse(await c.req.json()));
    return c.json(await createSession(c.get('principal'), body), 201);
  });

  app.get('/', async (c) => {
    const query = parseOrThrow(
      listSessionsQuerySchema.safeParse({
        mode: c.req.query('mode'),
        stackId: c.req.query('stackId'),
        status: c.req.query('status'),
        limit: c.req.query('limit'),
        cursor: c.req.query('cursor'),
      }),
    );
    return c.json(await listSessions(c.get('principal'), query));
  });

  app.get('/:sessionId', async (c) => c.json(await getSessionById(c.get('principal'), c.req.param('sessionId'))));

  app.patch('/:sessionId', async (c) => {
    const body = parseOrThrow(updateSessionSchema.safeParse(await c.req.json()));
    return c.json(await updateSession(c.get('principal'), c.req.param('sessionId'), body));
  });

  app.delete('/:sessionId', async (c) => {
    await deleteSession(c.get('principal'), c.req.param('sessionId'));
    return c.body(null, 204);
  });

  app.patch('/:sessionId/items/:itemId', async (c) => {
    const body = parseOrThrow(patchItemResponseSchema.safeParse(await c.req.json()));
    return c.json(await patchItemResponse(c.get('principal'), c.req.param('sessionId'), c.req.param('itemId'), body));
  });

  app.patch('/:sessionId/notes', async (c) => {
    const body = parseOrThrow(patchSessionNotesSchema.safeParse(await c.req.json()));
    return c.json(await patchSessionNotes(c.get('principal'), c.req.param('sessionId'), body.sessionNotes));
  });

  app.post('/:sessionId/complete', async (c) => {
    const body = parseOrThrow(completeSessionSchema.safeParse(await c.req.json()));
    return c.json(await completeSession(c.get('principal'), c.req.param('sessionId'), body));
  });

  app.get('/:sessionId/summary', async (c) => {
    return c.json(await getSessionSummary(c.get('principal'), c.req.param('sessionId')));
  });

  return app;
}
