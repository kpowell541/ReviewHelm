import { randomUUID } from 'node:crypto';

export function getRequestIdHeader(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : randomUUID();
}
