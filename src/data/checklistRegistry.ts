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
  {
    id: 'terraform-hcl',
    title: 'Terraform (HCL)',
    shortTitle: 'Terraform',
    description: 'Terraform infrastructure as code in HCL',
    icon: '🏗️',
    color: '#7a52c6',
  },
  {
    id: 'swift-objc',
    title: 'Swift & Objective-C',
    shortTitle: 'Swift/ObjC',
    description: 'iOS/macOS apps with Swift and Objective-C',
    icon: '🍎',
    color: '#f97316',
  },
  {
    id: 'web-devops-config',
    title: 'HTML/CSS, Shell, Docker & Config',
    shortTitle: 'Web/DevOps',
    description: 'HTML, CSS, Shell scripts, Dockerfiles, Groovy, XSLT',
    icon: '🐳',
    color: '#0ea5e9',
  },
  {
    id: 'python',
    title: 'Python',
    shortTitle: 'Python',
    description: 'Python applications, libraries, and Django/Flask projects',
    icon: '🐍',
    color: '#fbbf24',
  },
  {
    id: 'ruby',
    title: 'Ruby & Rails',
    shortTitle: 'Ruby',
    description: 'Ruby applications and Ruby on Rails projects',
    icon: '💎',
    color: '#ef4444',
  },
  {
    id: 'lua',
    title: 'Lua',
    shortTitle: 'Lua',
    description: 'Lua scripts, game engines, and embedded applications',
    icon: '🌙',
    color: '#6366f1',
  },
  {
    id: 'c-lang',
    title: 'C',
    shortTitle: 'C',
    description: 'Systems programming, embedded, and native libraries in C',
    icon: '⚙️',
    color: '#64748b',
  },
  {
    id: 'data-formats',
    title: 'JSON, YAML, XML & Config',
    shortTitle: 'Data Formats',
    description: 'JSON, YAML, XML, TOML, and other data/config file formats',
    icon: '📄',
    color: '#f59e0b',
  },
  {
    id: 'postgresql',
    title: 'PostgreSQL',
    shortTitle: 'PostgreSQL',
    description: 'Database migrations, schema design, and query review',
    icon: '🐘',
    color: '#336791',
  },
  {
    id: 'graphql',
    title: 'GraphQL',
    shortTitle: 'GraphQL',
    description: 'GraphQL schema design, resolvers, and API review',
    icon: '◈',
    color: '#e10098',
  },
  {
    id: 'rest-api',
    title: 'REST API',
    shortTitle: 'REST API',
    description: 'REST API design, HTTP semantics, and endpoint review',
    icon: '🔌',
    color: '#10b981',
  },
];

export function getStackInfo(stackId: StackId): StackInfo {
  const stack = STACKS.find((s) => s.id === stackId);
  if (!stack) {
    throw new Error(`Stack not found: ${stackId}`);
  }
  return stack;
}
