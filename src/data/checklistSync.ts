import type { Checklist } from './types';
import {
  getChecklistMap,
  setCachedChecklists,
  initializeChecklistCache,
} from './checklistLoader';

const CHECKLIST_FILES = {
  'java-protobuf': 'java-protobuf.json',
  'js-ts-react-node': 'js-ts-react-node.json',
  go: 'go.json',
  'terraform-hcl': 'terraform-hcl.json',
  'swift-objc': 'swift-objc.json',
  'web-devops-config': 'web-devops-config.json',
  python: 'python.json',
  ruby: 'ruby.json',
  lua: 'lua.json',
  'c-lang': 'c-lang.json',
  'polish-my-pr': 'polish-my-pr.json',
} as const;

type ChecklistMap = Record<keyof typeof CHECKLIST_FILES, Checklist>;

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
    Object.entries(CHECKLIST_FILES).map(async ([id, filename]) => {
      const response = await fetch(getRawUrl(config, filename));
      if (!response.ok) {
        throw new Error(`Failed to fetch ${id} checklist (${response.status})`);
      }
      const data = (await response.json()) as Checklist;
      return [id, data] as const;
    }),
  );

  const fetched = Object.fromEntries(entries) as ChecklistMap;
  const changedIds = (Object.keys(CHECKLIST_FILES) as Array<keyof ChecklistMap>).filter(
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
