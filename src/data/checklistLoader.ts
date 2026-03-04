import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Checklist, StackId } from './types';

import javaProtobufData from '../../assets/data/checklists/java-protobuf.json';
import jsTsReactNodeData from '../../assets/data/checklists/js-ts-react-node.json';
import goData from '../../assets/data/checklists/go.json';
import polishMyPrData from '../../assets/data/checklists/polish-my-pr.json';

const CHECKLIST_IDS = [
  'java-protobuf',
  'js-ts-react-node',
  'go',
  'polish-my-pr',
] as const;

export const CHECKLIST_CACHE_KEY = 'reviewhelm:checklists:cache:v1';

type ChecklistId = (typeof CHECKLIST_IDS)[number];
type ChecklistMap = Record<ChecklistId, Checklist>;

const bundledChecklists: ChecklistMap = {
  'java-protobuf': javaProtobufData as unknown as Checklist,
  'js-ts-react-node': jsTsReactNodeData as unknown as Checklist,
  go: goData as unknown as Checklist,
  'polish-my-pr': polishMyPrData as unknown as Checklist,
};

let loadedChecklists: ChecklistMap = { ...bundledChecklists };
let cacheHydrated = false;
let hydrationPromise: Promise<void> | null = null;

function isChecklistMap(value: unknown): value is ChecklistMap {
  if (!value || typeof value !== 'object') return false;
  const map = value as Record<string, unknown>;
  return CHECKLIST_IDS.every((id) => {
    const checklist = map[id] as Checklist | undefined;
    return Boolean(checklist?.meta?.id && Array.isArray(checklist?.sections));
  });
}

async function hydrateChecklistCache(): Promise<void> {
  if (cacheHydrated) return;
  try {
    const raw = await AsyncStorage.getItem(CHECKLIST_CACHE_KEY);
    if (!raw) {
      cacheHydrated = true;
      return;
    }
    const parsed = JSON.parse(raw);
    if (isChecklistMap(parsed)) {
      loadedChecklists = parsed;
    }
  } catch {
    // Fall back to bundled checklists when cached content is invalid.
  } finally {
    cacheHydrated = true;
  }
}

export async function initializeChecklistCache(): Promise<void> {
  if (!hydrationPromise) {
    hydrationPromise = hydrateChecklistCache();
  }
  await hydrationPromise;
}

void initializeChecklistCache();

export function areChecklistsHydrated(): boolean {
  return cacheHydrated;
}

export async function setCachedChecklists(
  nextChecklists: ChecklistMap,
): Promise<void> {
  loadedChecklists = nextChecklists;
  await AsyncStorage.setItem(
    CHECKLIST_CACHE_KEY,
    JSON.stringify(nextChecklists),
  );
}

export async function clearChecklistCache(): Promise<void> {
  loadedChecklists = { ...bundledChecklists };
  await AsyncStorage.removeItem(CHECKLIST_CACHE_KEY);
}

export function getChecklist(id: string): Checklist {
  const checklist = loadedChecklists[id as ChecklistId];
  if (!checklist) {
    throw new Error(`Checklist not found: ${id}`);
  }
  return checklist;
}

export function getReviewChecklist(stackId: StackId): Checklist {
  return getChecklist(stackId);
}

export function getPolishChecklist(): Checklist {
  return getChecklist('polish-my-pr');
}

export function getAllReviewChecklists(): Checklist[] {
  return ['java-protobuf', 'js-ts-react-node', 'go'].map((id) =>
    getChecklist(id),
  );
}

export function getAllChecklists(): Checklist[] {
  return CHECKLIST_IDS.map((id) => getChecklist(id));
}

export function getChecklistMap(): ChecklistMap {
  return { ...loadedChecklists };
}
