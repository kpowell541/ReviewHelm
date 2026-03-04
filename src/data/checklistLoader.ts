import type { Checklist, StackId } from './types';

// Bundled checklists — imported statically, always available offline
import javaProtobufData from '../../assets/data/checklists/java-protobuf.json';
import jsTsReactNodeData from '../../assets/data/checklists/js-ts-react-node.json';
import goData from '../../assets/data/checklists/go.json';
import polishMyPrData from '../../assets/data/checklists/polish-my-pr.json';

const bundledChecklists: Record<string, Checklist> = {
  'java-protobuf': javaProtobufData as unknown as Checklist,
  'js-ts-react-node': jsTsReactNodeData as unknown as Checklist,
  'go': goData as unknown as Checklist,
  'polish-my-pr': polishMyPrData as unknown as Checklist,
};

export function getChecklist(id: string): Checklist {
  const checklist = bundledChecklists[id];
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
  return ['java-protobuf', 'js-ts-react-node', 'go'].map(
    (id) => bundledChecklists[id]
  );
}

export function getAllChecklists(): Checklist[] {
  return Object.values(bundledChecklists);
}
