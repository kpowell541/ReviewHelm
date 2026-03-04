import type { ChecklistMeta, StackId } from './types';

export interface StackInfo {
  id: StackId;
  title: string;
  shortTitle: string;
  description: string;
  icon: string;
  color: string;
}

export const STACKS: StackInfo[] = [
  {
    id: 'java-protobuf',
    title: 'Java/Kotlin + Protobuf',
    shortTitle: 'Java/Kotlin',
    description: 'Monorepo with Java, Kotlin, and Protobuf',
    icon: '☕',
    color: '#ff8c42',
  },
  {
    id: 'js-ts-react-node',
    title: 'JS/TS + React + Node',
    shortTitle: 'JS/TS',
    description: 'JavaScript, TypeScript, React frontend, Node backend',
    icon: '⚛️',
    color: '#54a0ff',
  },
  {
    id: 'go',
    title: 'Go',
    shortTitle: 'Go',
    description: 'Go services and libraries',
    icon: '🐹',
    color: '#00b894',
  },
];

export function getStackInfo(stackId: StackId): StackInfo {
  const stack = STACKS.find((s) => s.id === stackId);
  if (!stack) {
    throw new Error(`Stack not found: ${stackId}`);
  }
  return stack;
}
