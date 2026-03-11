import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Checklist, ChecklistSection, StackId } from './types';
import { getSectionItems } from './types';
import { getStackInfo } from './checklistRegistry';

import javaProtobufData from '../../assets/data/checklists/java-protobuf.json';
import jsTsReactNodeData from '../../assets/data/checklists/js-ts-react-node.json';
import goData from '../../assets/data/checklists/go.json';
import terraformHclData from '../../assets/data/checklists/terraform-hcl.json';
import polishMyPrData from '../../assets/data/checklists/polish-my-pr.json';
import swiftObjcData from '../../assets/data/checklists/swift-objc.json';
import reactData from '../../assets/data/checklists/react.json';
import nodejsData from '../../assets/data/checklists/nodejs.json';
import protobufData from '../../assets/data/checklists/protobuf.json';
import pythonData from '../../assets/data/checklists/python.json';
import rubyData from '../../assets/data/checklists/ruby.json';
import luaData from '../../assets/data/checklists/lua.json';
import cLangData from '../../assets/data/checklists/c-lang.json';
import dataFormatsData from '../../assets/data/checklists/data-formats.json';
import postgresqlData from '../../assets/data/checklists/postgresql.json';
import graphqlData from '../../assets/data/checklists/graphql.json';
import restApiData from '../../assets/data/checklists/rest-api.json';
import rustData from '../../assets/data/checklists/rust.json';
import csharpDotnetData from '../../assets/data/checklists/csharp-dotnet.json';
import kotlinAndroidData from '../../assets/data/checklists/kotlin-android.json';
import securityData from '../../assets/data/checklists/security.json';
import dartFlutterData from '../../assets/data/checklists/dart-flutter.json';
import phpData from '../../assets/data/checklists/php.json';
import vueData from '../../assets/data/checklists/vue.json';
import angularData from '../../assets/data/checklists/angular.json';
import cppData from '../../assets/data/checklists/cpp.json';
import shellData from '../../assets/data/checklists/shell.json';
import sqlMigrationsData from '../../assets/data/checklists/sql-migrations.json';
import nextjsData from '../../assets/data/checklists/nextjs.json';
import djangoData from '../../assets/data/checklists/django.json';
import springBootData from '../../assets/data/checklists/spring-boot.json';
import elixirPhoenixData from '../../assets/data/checklists/elixir-phoenix.json';
import scalaData from '../../assets/data/checklists/scala.json';
import dockerK8sData from '../../assets/data/checklists/docker-k8s.json';
import cicdData from '../../assets/data/checklists/cicd.json';
import codeReviewMetaData from '../../assets/data/checklists/code-review-meta.json';
import typescriptData from '../../assets/data/checklists/typescript.json';
import cssStylingData from '../../assets/data/checklists/css-styling.json';
import rLangData from '../../assets/data/checklists/r-lang.json';
import nosqlData from '../../assets/data/checklists/nosql.json';
import packageBundlerData from '../../assets/data/checklists/package-bundler.json';
import bddTestingData from '../../assets/data/checklists/bdd-testing.json';
import unitTestingData from '../../assets/data/checklists/unit-testing.json';
import e2eTestingData from '../../assets/data/checklists/e2e-testing.json';
import apiTestingData from '../../assets/data/checklists/api-testing.json';
import performanceTestingData from '../../assets/data/checklists/performance-testing.json';
import mobileTestingData from '../../assets/data/checklists/mobile-testing.json';

export const CHECKLIST_IDS = [
  'java-protobuf',
  'js-ts-react-node',
  'go',
  'terraform-hcl',
  'swift-objc',
  'react',
  'nodejs',
  'protobuf',
  'python',
  'ruby',
  'lua',
  'c-lang',
  'data-formats',
  'postgresql',
  'graphql',
  'rest-api',
  'rust',
  'csharp-dotnet',
  'kotlin-android',
  'security',
  'dart-flutter',
  'php',
  'vue',
  'angular',
  'cpp',
  'shell',
  'sql-migrations',
  'nextjs',
  'django',
  'spring-boot',
  'elixir-phoenix',
  'scala',
  'docker-k8s',
  'cicd',
  'code-review-meta',
  'typescript',
  'css-styling',
  'r-lang',
  'nosql',
  'package-bundler',
  'bdd-testing',
  'unit-testing',
  'e2e-testing',
  'api-testing',
  'performance-testing',
  'mobile-testing',
  'polish-my-pr',
] as const;

export const CHECKLIST_CACHE_KEY = 'reviewhelm:checklists:cache:v1';

export type ChecklistId = (typeof CHECKLIST_IDS)[number];
export type ChecklistMap = Record<ChecklistId, Checklist>;

const bundledChecklists: ChecklistMap = {
  'java-protobuf': javaProtobufData as unknown as Checklist,
  'js-ts-react-node': jsTsReactNodeData as unknown as Checklist,
  go: goData as unknown as Checklist,
  'terraform-hcl': terraformHclData as unknown as Checklist,
  'swift-objc': swiftObjcData as unknown as Checklist,
  react: reactData as unknown as Checklist,
  nodejs: nodejsData as unknown as Checklist,
  protobuf: protobufData as unknown as Checklist,
  python: pythonData as unknown as Checklist,
  ruby: rubyData as unknown as Checklist,
  lua: luaData as unknown as Checklist,
  'c-lang': cLangData as unknown as Checklist,
  'data-formats': dataFormatsData as unknown as Checklist,
  postgresql: postgresqlData as unknown as Checklist,
  graphql: graphqlData as unknown as Checklist,
  'rest-api': restApiData as unknown as Checklist,
  rust: rustData as unknown as Checklist,
  'csharp-dotnet': csharpDotnetData as unknown as Checklist,
  'kotlin-android': kotlinAndroidData as unknown as Checklist,
  security: securityData as unknown as Checklist,
  'dart-flutter': dartFlutterData as unknown as Checklist,
  php: phpData as unknown as Checklist,
  vue: vueData as unknown as Checklist,
  angular: angularData as unknown as Checklist,
  cpp: cppData as unknown as Checklist,
  shell: shellData as unknown as Checklist,
  'sql-migrations': sqlMigrationsData as unknown as Checklist,
  nextjs: nextjsData as unknown as Checklist,
  django: djangoData as unknown as Checklist,
  'spring-boot': springBootData as unknown as Checklist,
  'elixir-phoenix': elixirPhoenixData as unknown as Checklist,
  scala: scalaData as unknown as Checklist,
  'docker-k8s': dockerK8sData as unknown as Checklist,
  cicd: cicdData as unknown as Checklist,
  'code-review-meta': codeReviewMetaData as unknown as Checklist,
  typescript: typescriptData as unknown as Checklist,
  'css-styling': cssStylingData as unknown as Checklist,
  'r-lang': rLangData as unknown as Checklist,
  nosql: nosqlData as unknown as Checklist,
  'package-bundler': packageBundlerData as unknown as Checklist,
  'bdd-testing': bddTestingData as unknown as Checklist,
  'unit-testing': unitTestingData as unknown as Checklist,
  'e2e-testing': e2eTestingData as unknown as Checklist,
  'api-testing': apiTestingData as unknown as Checklist,
  'performance-testing': performanceTestingData as unknown as Checklist,
  'mobile-testing': mobileTestingData as unknown as Checklist,
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
  return [
    'java-protobuf',
    'js-ts-react-node',
    'go',
    'terraform-hcl',
    'swift-objc',
    'react',
    'nodejs',
    'protobuf',
    'python',
    'ruby',
    'lua',
    'c-lang',
    'data-formats',
    'postgresql',
    'graphql',
    'rest-api',
    'rust',
    'csharp-dotnet',
    'kotlin-android',
    'security',
    'dart-flutter',
    'php',
    'vue',
    'angular',
    'cpp',
    'shell',
    'sql-migrations',
    'nextjs',
    'django',
    'spring-boot',
    'elixir-phoenix',
    'scala',
    'docker-k8s',
    'cicd',
    'code-review-meta',
    'typescript',
    'css-styling',
    'r-lang',
    'nosql',
    'package-bundler',
    'bdd-testing',
    'unit-testing',
    'e2e-testing',
    'api-testing',
    'performance-testing',
    'mobile-testing',
  ].map((id) => getChecklist(id));
}

export function getAllChecklists(): Checklist[] {
  return CHECKLIST_IDS.map((id) => getChecklist(id));
}

export function getChecklistMap(): ChecklistMap {
  return { ...loadedChecklists };
}

/**
 * Maps security section IDs to the stack categories they're relevant for.
 * Stacks not listed get a sensible default set based on their nature.
 */
const SECURITY_RELEVANCE: Record<string, StackId[]> = {
  // Auth sections: relevant for stacks that handle user-facing logic or APIs
  'security.authentication': [
    'js-ts-react-node', 'python', 'ruby', 'go', 'java-protobuf', 'csharp-dotnet',
    'kotlin-android', 'swift-objc', 'dart-flutter', 'php', 'vue', 'angular',
    'nextjs', 'django', 'spring-boot', 'elixir-phoenix', 'scala', 'rust',
    'rest-api', 'graphql',
  ],
  'security.authorization': [
    'js-ts-react-node', 'python', 'ruby', 'go', 'java-protobuf', 'csharp-dotnet',
    'kotlin-android', 'swift-objc', 'dart-flutter', 'php', 'vue', 'angular',
    'nextjs', 'django', 'spring-boot', 'elixir-phoenix', 'scala', 'rust',
    'rest-api', 'graphql',
  ],
  // Injection: relevant for anything that processes user input or queries
  'security.injection': [
    'js-ts-react-node', 'python', 'ruby', 'go', 'java-protobuf', 'csharp-dotnet',
    'php', 'vue', 'angular', 'nextjs', 'django', 'spring-boot', 'elixir-phoenix',
    'scala', 'rust', 'rest-api', 'graphql', 'postgresql', 'sql-migrations',
    'nosql', 'shell', 'data-formats', 'typescript', 'cpp', 'c-lang', 'lua',
  ],
  // Secrets: relevant for almost everything except pure config/styling
  'security.secrets': [
    'js-ts-react-node', 'python', 'ruby', 'go', 'java-protobuf', 'csharp-dotnet',
    'kotlin-android', 'swift-objc', 'dart-flutter', 'php', 'vue', 'angular',
    'nextjs', 'django', 'spring-boot', 'elixir-phoenix', 'scala', 'rust',
    'rest-api', 'graphql', 'docker-k8s', 'cicd', 'terraform-hcl',
    'react',
    'nodejs',
    'protobuf', 'shell', 'data-formats',
  ],
  // Data protection: relevant for stacks that handle user data
  'security.data-protection': [
    'js-ts-react-node', 'python', 'ruby', 'go', 'java-protobuf', 'csharp-dotnet',
    'kotlin-android', 'swift-objc', 'dart-flutter', 'php', 'vue', 'angular',
    'nextjs', 'django', 'spring-boot', 'elixir-phoenix', 'scala', 'rust',
    'rest-api', 'graphql', 'postgresql', 'sql-migrations', 'nosql',
  ],
  // Input validation: relevant for code that processes input
  'security.input-validation': [
    'js-ts-react-node', 'python', 'ruby', 'go', 'java-protobuf', 'csharp-dotnet',
    'php', 'vue', 'angular', 'nextjs', 'django', 'spring-boot', 'elixir-phoenix',
    'scala', 'rust', 'rest-api', 'graphql', 'data-formats', 'typescript',
    'cpp', 'c-lang',
  ],
  // Dependencies: relevant for stacks with package managers
  'security.dependencies': [
    'js-ts-react-node', 'python', 'ruby', 'go', 'java-protobuf', 'csharp-dotnet',
    'kotlin-android', 'swift-objc', 'dart-flutter', 'php', 'vue', 'angular',
    'nextjs', 'django', 'spring-boot', 'elixir-phoenix', 'scala', 'rust',
    'cpp', 'package-bundler', 'r-lang',
  ],
  // Error handling: relevant for application code
  'security.error-handling': [
    'js-ts-react-node', 'python', 'ruby', 'go', 'java-protobuf', 'csharp-dotnet',
    'kotlin-android', 'swift-objc', 'dart-flutter', 'php', 'vue', 'angular',
    'nextjs', 'django', 'spring-boot', 'elixir-phoenix', 'scala', 'rust',
    'rest-api', 'graphql', 'typescript', 'cpp', 'c-lang', 'lua',
  ],
  // Infrastructure: relevant for infra/deployment stacks
  'security.infrastructure': [
    'js-ts-react-node', 'nextjs', 'django', 'spring-boot', 'elixir-phoenix',
    'docker-k8s', 'cicd', 'terraform-hcl', 'nodejs', 'rest-api',
    'graphql',
  ],
};

/**
 * Returns the names of security sections relevant to the given stacks.
 * Used to display a reminder banner in the checklist UI.
 */
export function getRelevantSecuritySections(stackIds?: StackId[]): string[] {
  const securityChecklist = getChecklist('security');
  let relevantSections = securityChecklist.sections;
  if (stackIds && stackIds.length > 0) {
    relevantSections = securityChecklist.sections.filter((s) => {
      const relevantStacks = SECURITY_RELEVANCE[s.id];
      if (!relevantStacks) return true;
      return stackIds.some((id) => relevantStacks.includes(id));
    });
  }
  return relevantSections.map((s) => s.title);
}

/**
 * Append code review meta checklist sections to any checklist if not already present.
 * Code review meta is auto-included in every review and polish session.
 */
export function withCodeReviewMeta(checklist: Checklist): Checklist {
  const metaChecklist = getChecklist('code-review-meta');
  const hasMetaSections = checklist.sections.some((s) =>
    s.id.startsWith('code-review-meta.'),
  );
  if (hasMetaSections) return checklist;

  const metaItems = metaChecklist.sections.reduce(
    (sum, s) => sum + getSectionItems(s).length,
    0,
  );

  return {
    ...checklist,
    meta: {
      ...checklist.meta,
      totalItems: checklist.meta.totalItems + metaItems,
    },
    sections: [
      ...checklist.sections,
      ...metaChecklist.sections.map((s) => ({
        ...s,
        title: `[Review Meta] ${s.title}`,
      })),
    ],
  };
}

/**
 * Filter a checklist to only include the given sections.
 * Returns the full checklist if selectedSections is undefined or empty.
 */
export function filterSections(
  checklist: Checklist,
  selectedSections?: string[],
): Checklist {
  if (!selectedSections || selectedSections.length === 0) return checklist;
  const filtered = checklist.sections.filter((s) =>
    selectedSections.includes(s.id),
  );
  const totalItems = filtered.reduce(
    (sum, s) => sum + getSectionItems(s).length,
    0,
  );
  return {
    ...checklist,
    meta: { ...checklist.meta, totalItems },
    sections: filtered,
  };
}

/**
 * Merge multiple stack checklists into a single combined checklist.
 * Section titles are prefixed with [StackShortTitle] for clarity.
 * Optionally filter to specific sections via selectedSections.
 */
export function getMergedChecklist(
  stackIds: StackId[],
  selectedSections?: string[],
): Checklist {
  const checklists = stackIds.map((id) => getChecklist(id));

  const mergedSections: ChecklistSection[] = [];
  let totalItems = 0;

  for (const checklist of checklists) {
    const stackInfo = getStackInfo(checklist.meta.id as StackId);
    for (const section of checklist.sections) {
      if (
        selectedSections &&
        selectedSections.length > 0 &&
        !selectedSections.includes(section.id)
      ) {
        continue;
      }
      mergedSections.push({
        ...section,
        title: `[${stackInfo.shortTitle}] ${section.title}`,
      });
      totalItems += getSectionItems(section).length;
    }
  }

  const first = checklists[0];
  return {
    meta: {
      id: stackIds.join('+'),
      mode: 'review',
      title: checklists.map((c) => c.meta.shortTitle).join(' + '),
      shortTitle: checklists.map((c) => c.meta.shortTitle).join('+'),
      description: `Combined: ${checklists.map((c) => c.meta.title).join(', ')}`,
      icon: first.meta.icon,
      totalItems,
      version: first.meta.version,
    },
    sections: mergedSections,
  };
}
