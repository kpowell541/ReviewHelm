import angularData from './data/angular.json';
import apiTestingData from './data/api-testing.json';
import bddTestingData from './data/bdd-testing.json';
import cLangData from './data/c-lang.json';
import cicdData from './data/cicd.json';
import codeReviewMetaData from './data/code-review-meta.json';
import cppData from './data/cpp.json';
import csharpDotnetData from './data/csharp-dotnet.json';
import cssStylingData from './data/css-styling.json';
import dartFlutterData from './data/dart-flutter.json';
import dataFormatsData from './data/data-formats.json';
import djangoData from './data/django.json';
import dockerK8sData from './data/docker-k8s.json';
import e2eTestingData from './data/e2e-testing.json';
import elixirPhoenixData from './data/elixir-phoenix.json';
import goData from './data/go.json';
import graphqlData from './data/graphql.json';
import javaData from './data/java-protobuf.json';
import jsTsData from './data/js-ts-react-node.json';
import kotlinAndroidData from './data/kotlin-android.json';
import luaData from './data/lua.json';
import mobileTestingData from './data/mobile-testing.json';
import nextjsData from './data/nextjs.json';
import nosqlData from './data/nosql.json';
import packageBundlerData from './data/package-bundler.json';
import performanceTestingData from './data/performance-testing.json';
import phpData from './data/php.json';
import polishData from './data/polish-my-pr.json';
import postgresqlData from './data/postgresql.json';
import pythonData from './data/python.json';
import rLangData from './data/r-lang.json';
import restApiData from './data/rest-api.json';
import rubyData from './data/ruby.json';
import rustData from './data/rust.json';
import scalaData from './data/scala.json';
import securityData from './data/security.json';
import shellData from './data/shell.json';
import springBootData from './data/spring-boot.json';
import sqlMigrationsData from './data/sql-migrations.json';
import swiftObjcData from './data/swift-objc.json';
import terraformData from './data/terraform-hcl.json';
import typescriptData from './data/typescript.json';
import unitTestingData from './data/unit-testing.json';
import vueData from './data/vue.json';
import nodejsData from './data/nodejs.json';
import protobufData from './data/protobuf.json';
import reactData from './data/react.json';

export type ChecklistMode = 'review' | 'polish';
export type Severity = 'blocker' | 'major' | 'minor' | 'nit';
export type StackId =
  | 'angular'
  | 'api-testing'
  | 'bdd-testing'
  | 'c-lang'
  | 'cicd'
  | 'code-review-meta'
  | 'cpp'
  | 'csharp-dotnet'
  | 'css-styling'
  | 'dart-flutter'
  | 'data-formats'
  | 'django'
  | 'docker-k8s'
  | 'e2e-testing'
  | 'elixir-phoenix'
  | 'go'
  | 'graphql'
  | 'java-protobuf'
  | 'js-ts-react-node'
  | 'kotlin-android'
  | 'lua'
  | 'mobile-testing'
  | 'nextjs'
  | 'nodejs'
  | 'nosql'
  | 'package-bundler'
  | 'performance-testing'
  | 'php'
  | 'postgresql'
  | 'protobuf'
  | 'python'
  | 'r-lang'
  | 'react'
  | 'rest-api'
  | 'ruby'
  | 'rust'
  | 'scala'
  | 'security'
  | 'shell'
  | 'spring-boot'
  | 'sql-migrations'
  | 'swift-objc'
  | 'terraform-hcl'
  | 'typescript'
  | 'unit-testing'
  | 'vue';

export interface ChecklistItemShape {
  id: string;
  text: string;
  severity: string;
}

interface ChecklistSubsectionShape {
  id: string;
  title: string;
  items: ChecklistItemShape[];
}

interface ChecklistSectionShape {
  id: string;
  title: string;
  items?: ChecklistItemShape[];
  subsections?: ChecklistSubsectionShape[];
}

export interface ChecklistShape {
  meta: {
    id: string;
    mode: string;
    title: string;
    shortTitle: string;
    description: string;
    icon: string;
    totalItems: number;
    version: string;
  };
  sections: ChecklistSectionShape[];
}

const BUNDLED = {
  angular: angularData,
  'api-testing': apiTestingData,
  'bdd-testing': bddTestingData,
  'c-lang': cLangData,
  cicd: cicdData,
  'code-review-meta': codeReviewMetaData,
  cpp: cppData,
  'csharp-dotnet': csharpDotnetData,
  'css-styling': cssStylingData,
  'dart-flutter': dartFlutterData,
  'data-formats': dataFormatsData,
  django: djangoData,
  'docker-k8s': dockerK8sData,
  'e2e-testing': e2eTestingData,
  'elixir-phoenix': elixirPhoenixData,
  go: goData,
  graphql: graphqlData,
  'java-protobuf': javaData,
  'js-ts-react-node': jsTsData,
  'kotlin-android': kotlinAndroidData,
  lua: luaData,
  'mobile-testing': mobileTestingData,
  nextjs: nextjsData,
  nosql: nosqlData,
  'package-bundler': packageBundlerData,
  'performance-testing': performanceTestingData,
  php: phpData,
  'polish-my-pr': polishData,
  postgresql: postgresqlData,
  python: pythonData,
  'r-lang': rLangData,
  'rest-api': restApiData,
  ruby: rubyData,
  rust: rustData,
  scala: scalaData,
  security: securityData,
  shell: shellData,
  'spring-boot': springBootData,
  'sql-migrations': sqlMigrationsData,
  'swift-objc': swiftObjcData,
  'terraform-hcl': terraformData,
  typescript: typescriptData,
  'unit-testing': unitTestingData,
  vue: vueData,
  nodejs: nodejsData,
  protobuf: protobufData,
  react: reactData,
} as const satisfies Record<string, ChecklistShape>;

export type ChecklistId = keyof typeof BUNDLED;

export function getBundledChecklistIds(): ChecklistId[] {
  return Object.keys(BUNDLED) as ChecklistId[];
}

export function getBundledChecklistById(id: string): ChecklistShape | null {
  const checklist = BUNDLED[id as ChecklistId];
  return checklist ? structuredClone(checklist) : null;
}

export function getBundledChecklists(): ChecklistShape[] {
  return getBundledChecklistIds().map((id) => structuredClone(BUNDLED[id]));
}

export function getChecklistItemIndex(checklist: ChecklistShape): Record<
  string,
  { itemId: string; text: string; severity: Severity; sectionId: string }
> {
  const index: Record<
    string,
    { itemId: string; text: string; severity: Severity; sectionId: string }
  > = {};
  for (const section of checklist.sections) {
    for (const item of section.items ?? []) {
      index[item.id] = {
        itemId: item.id,
        text: item.text,
        severity: isSeverity(item.severity) ? item.severity : 'minor',
        sectionId: section.id,
      };
    }
    for (const subsection of section.subsections ?? []) {
      for (const item of subsection.items ?? []) {
        index[item.id] = {
          itemId: item.id,
          text: item.text,
          severity: isSeverity(item.severity) ? item.severity : 'minor',
          sectionId: subsection.id || section.id,
        };
      }
    }
  }
  return index;
}

export function getChecklistBySession(mode: ChecklistMode, stackId?: string | null) {
  if (mode === 'polish') {
    return getBundledChecklistById('polish-my-pr');
  }
  if (!stackId) {
    return null;
  }
  return getBundledChecklistById(stackId);
}

function isSeverity(value: string): value is Severity {
  return value === 'blocker' || value === 'major' || value === 'minor' || value === 'nit';
}
