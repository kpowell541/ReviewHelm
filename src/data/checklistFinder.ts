import type { ChecklistItem } from './types';
import { getSectionItems } from './types';
import { getAllChecklists } from './checklistLoader';

export interface FoundItem {
  item: ChecklistItem;
  stackId: string;
  stackTitle: string;
  sectionTitle: string;
}

/**
 * Find a checklist item by its ID across all loaded checklists.
 * Item IDs are globally unique (e.g. "go.error-handling.check-error-returns").
 */
export function findItemById(itemId: string): FoundItem | null {
  for (const checklist of getAllChecklists()) {
    for (const section of checklist.sections) {
      for (const item of getSectionItems(section)) {
        if (item.id === itemId) {
          return {
            item,
            stackId: checklist.meta.id,
            stackTitle: checklist.meta.title,
            sectionTitle: section.title,
          };
        }
      }
    }
  }
  return null;
}
