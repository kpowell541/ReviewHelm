import type { Checklist } from './types';
import {
  CHECKLIST_IDS,
  getChecklistMap,
  setCachedChecklists,
  initializeChecklistCache,
} from './checklistLoader';
import type { ChecklistId, ChecklistMap } from './checklistLoader';

const CHECKLIST_ALLOWLIST_HOSTS = (
  process.env.EXPO_PUBLIC_CHECKLIST_ALLOWLIST_HOSTS ??
  'raw.githubusercontent.com'
)
  .split(',')
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean);

const MAX_CHECKLIST_PAYLOAD_BYTES = Math.max(
  1,
  Number(process.env.EXPO_PUBLIC_CHECKLIST_MAX_PAYLOAD_BYTES) || 131072,
);

function checklistFilename(id: ChecklistId): string {
  return `${id}.json`;
}

export interface ChecklistSyncConfig {
  owner: string;
  repo: string;
  branch: string;
}

export interface ChecklistSyncResult {
  updated: boolean;
  latestVersion: string;
  changedIds: string[];
}

function defaultSyncConfig(): ChecklistSyncConfig {
  return {
    owner: process.env.EXPO_PUBLIC_CHECKLIST_OWNER ?? 'kpowell541',
    repo: process.env.EXPO_PUBLIC_CHECKLIST_REPO ?? 'ReviewHelm',
    branch: process.env.EXPO_PUBLIC_CHECKLIST_BRANCH ?? 'main',
  };
}

function getRawUrl(
  config: ChecklistSyncConfig,
  filename: string,
): string {
  return `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/assets/data/checklists/${filename}`;
}

function validateRawChecklistUrl(url: string, expectedFilename: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid checklist URL: ${url}`);
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Checklist URLs must use https.');
  }
  if (!CHECKLIST_ALLOWLIST_HOSTS.includes(parsed.hostname.toLowerCase())) {
    throw new Error(`Checklist host not allowed: ${parsed.hostname}`);
  }
  if (!parsed.pathname.endsWith(`/assets/data/checklists/${expectedFilename}`)) {
    throw new Error(`Checklist URL path not allowed for file: ${expectedFilename}`);
  }

  return parsed;
}

function isValidChecklistPayload(value: unknown): value is Checklist {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const payload = value as Record<string, unknown>;
  const meta = payload.meta;
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return false;
  if (typeof (meta as Record<string, unknown>).version !== 'string') return false;
  return true;
}

function latestVersionOf(checklists: ChecklistMap): string {
  return Object.values(checklists)
    .map((checklist) => checklist.meta.version)
    .sort()
    .slice(-1)[0];
}

export async function syncChecklistsFromGithub(
  config: ChecklistSyncConfig = defaultSyncConfig(),
): Promise<ChecklistSyncResult> {
  await initializeChecklistCache();
  const current = getChecklistMap() as ChecklistMap;

  const entries = await Promise.all(
    CHECKLIST_IDS.map(async (id) => {
      const filename = checklistFilename(id);
      const rawUrl = getRawUrl(config, filename);
      const parsed = validateRawChecklistUrl(rawUrl, filename);
      const response = await fetch(parsed.toString());
      if (!response.ok) {
        throw new Error(`Failed to fetch ${id} checklist (${response.status})`);
      }
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        const declared = Number(contentLength);
        if (Number.isFinite(declared) && declared > MAX_CHECKLIST_PAYLOAD_BYTES) {
          throw new Error(`Checklist ${id} payload is too large`);
        }
      }
      const raw = await response.text();
      if (raw.length > MAX_CHECKLIST_PAYLOAD_BYTES) {
        throw new Error(`Checklist ${id} payload is too large`);
      }
      const data: unknown = JSON.parse(raw);
      if (!isValidChecklistPayload(data)) {
        throw new Error(`Checklist ${id} payload is invalid`);
      }
      return [id, data] as const;
    }),
  );

  const fetched = Object.fromEntries(entries) as ChecklistMap;
  const changedIds = (CHECKLIST_IDS as readonly ChecklistId[]).filter(
    (id) => fetched[id].meta.version !== current[id].meta.version,
  );

  if (changedIds.length > 0) {
    await setCachedChecklists(fetched);
  }

  return {
    updated: changedIds.length > 0,
    latestVersion: latestVersionOf(fetched),
    changedIds,
  };
}
