/**
 * Converts existing markdown checklists into the JSON format used by the app.
 *
 * Usage: npx tsx scripts/convert-checklists.ts
 *
 * Reads the markdown files from the parent directory and outputs JSON to assets/data/checklists/
 */

import * as fs from 'fs';
import * as path from 'path';

interface CodeExample {
  title: string;
  language: string;
  bad?: { code: string; explanation: string };
  good?: { code: string; explanation: string };
}

interface BaseContent {
  whatItMeans: string;
  whyItMatters: string;
  howToVerify: string;
  exampleComment: string;
  codeExamples: CodeExample[];
  keyTakeaway: string;
  references: string[];
}

interface ChecklistItem {
  id: string;
  text: string;
  severity: 'blocker' | 'major' | 'minor' | 'nit';
  tags: string[];
  baseContent: BaseContent;
}

interface ChecklistSubsection {
  id: string;
  title: string;
  items: ChecklistItem[];
}

interface ChecklistSection {
  id: string;
  title: string;
  subsections?: ChecklistSubsection[];
  items?: ChecklistItem[];
}

interface ChecklistMeta {
  id: string;
  mode: 'review' | 'polish';
  title: string;
  shortTitle: string;
  description: string;
  icon: string;
  totalItems: number;
  version: string;
}

interface Checklist {
  meta: ChecklistMeta;
  sections: ChecklistSection[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);
}

function emptyBaseContent(): BaseContent {
  return {
    whatItMeans: '',
    whyItMatters: '',
    howToVerify: '',
    exampleComment: '',
    codeExamples: [],
    keyTakeaway: '',
    references: [],
  };
}

function inferSeverity(text: string, sectionTitle: string): 'blocker' | 'major' | 'minor' | 'nit' {
  const lowerText = text.toLowerCase();
  const lowerSection = sectionTitle.toLowerCase();

  // Blocker indicators
  if (
    lowerText.includes('security') ||
    lowerText.includes('vulnerability') ||
    lowerText.includes('injection') ||
    lowerText.includes('secret') ||
    lowerText.includes('password') ||
    lowerText.includes('race condition') ||
    lowerText.includes('deadlock') ||
    lowerText.includes('memory leak') ||
    lowerText.includes('data loss') ||
    lowerSection.includes('security')
  ) {
    return 'blocker';
  }

  // Major indicators
  if (
    lowerText.includes('error handling') ||
    lowerText.includes('exception') ||
    lowerText.includes('test') ||
    lowerText.includes('backward compatible') ||
    lowerText.includes('thread') ||
    lowerText.includes('concurrent') ||
    lowerText.includes('synchronized') ||
    lowerText.includes('goroutine') ||
    lowerSection.includes('error') ||
    lowerSection.includes('concurrency') ||
    lowerSection.includes('testing')
  ) {
    return 'major';
  }

  // Nit indicators
  if (
    lowerText.includes('naming') ||
    lowerText.includes('comment') ||
    lowerText.includes('readability') ||
    lowerText.includes('javadoc') ||
    lowerText.includes('godoc') ||
    lowerText.includes('jsdoc') ||
    lowerText.includes('readme') ||
    lowerSection.includes('documentation') ||
    lowerSection.includes('style')
  ) {
    return 'nit';
  }

  return 'minor';
}

function inferTags(text: string, sectionTitle: string, subsectionTitle: string | undefined): string[] {
  const tags: string[] = [];
  const combined = `${text} ${sectionTitle} ${subsectionTitle || ''}`.toLowerCase();

  const tagMap: Record<string, string[]> = {
    'error-handling': ['error', 'exception', 'catch', 'throw', 'panic', 'recover'],
    'concurrency': ['thread', 'goroutine', 'async', 'concurrent', 'mutex', 'channel', 'lock', 'race'],
    'testing': ['test', 'mock', 'assert', 'benchmark', 'fuzz'],
    'security': ['security', 'auth', 'token', 'secret', 'password', 'xss', 'injection', 'csrf', 'tls'],
    'performance': ['performance', 'cache', 'index', 'pool', 'memory', 'allocation', 'optimize', 'lazy'],
    'api-design': ['api', 'endpoint', 'rest', 'grpc', 'rpc', 'route', 'handler'],
    'types': ['type', 'generic', 'interface', 'enum', 'union', 'optional'],
    'naming': ['name', 'naming', 'convention', 'prefix', 'suffix'],
    'null-safety': ['null', 'optional', 'nil', 'undefined', 'nullable'],
    'resource-management': ['resource', 'close', 'cleanup', 'defer', 'dispose', 'connection'],
    'code-quality': ['dead code', 'todo', 'fixme', 'comment', 'readability'],
    'protobuf': ['proto', 'protobuf', 'field', 'schema', 'wire', 'message'],
    'react': ['react', 'component', 'hook', 'render', 'jsx', 'state', 'prop', 'effect'],
    'node': ['node', 'express', 'middleware', 'route'],
    'accessibility': ['accessible', 'aria', 'a11y', 'keyboard', 'screen reader', 'semantic'],
    'documentation': ['doc', 'readme', 'comment', 'changelog', 'javadoc', 'godoc', 'jsdoc'],
  };

  for (const [tag, keywords] of Object.entries(tagMap)) {
    if (keywords.some((kw) => combined.includes(kw))) {
      tags.push(tag);
    }
  }

  if (tags.length === 0) {
    tags.push('general');
  }

  return tags;
}

function parseMarkdownChecklist(
  markdown: string,
  stackId: string
): ChecklistSection[] {
  const lines = markdown.split('\n');
  const sections: ChecklistSection[] = [];

  let currentSection: ChecklistSection | null = null;
  let currentSubsection: ChecklistSubsection | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Match section header: ## 1. Section Name or ## Section Name
    const sectionMatch = trimmed.match(/^##\s+(?:\d+\.\s+)?(.+)$/);
    if (sectionMatch && !trimmed.startsWith('###')) {
      // Save previous section
      if (currentSection) {
        if (currentSubsection) {
          if (!currentSection.subsections) currentSection.subsections = [];
          currentSection.subsections.push(currentSubsection);
          currentSubsection = null;
        }
        sections.push(currentSection);
      }
      const title = sectionMatch[1].trim();
      currentSection = {
        id: `${stackId}.${slugify(title)}`,
        title,
      };
      continue;
    }

    // Match subsection header: ### Subsection Name
    const subsectionMatch = trimmed.match(/^###\s+(.+)$/);
    if (subsectionMatch && currentSection) {
      // Save previous subsection
      if (currentSubsection) {
        if (!currentSection.subsections) currentSection.subsections = [];
        currentSection.subsections.push(currentSubsection);
      }
      const title = subsectionMatch[1].trim();
      currentSubsection = {
        id: `${currentSection.id}.${slugify(title)}`,
        title,
        items: [],
      };
      continue;
    }

    // Match checklist item: - [ ] Item text
    const itemMatch = trimmed.match(/^-\s+\[[ x]\]\s+(.+)$/);
    if (itemMatch && currentSection) {
      const text = itemMatch[1].trim();
      const sectionTitle = currentSection.title;
      const subsectionTitle = currentSubsection?.title;
      const parentId = currentSubsection?.id || currentSection.id;
      const itemId = `${parentId}.${slugify(text)}`;

      const item: ChecklistItem = {
        id: itemId,
        text,
        severity: inferSeverity(text, `${sectionTitle} ${subsectionTitle || ''}`),
        tags: inferTags(text, sectionTitle, subsectionTitle),
        baseContent: emptyBaseContent(),
      };

      if (currentSubsection) {
        currentSubsection.items.push(item);
      } else {
        if (!currentSection.items) currentSection.items = [];
        currentSection.items.push(item);
      }
    }
  }

  // Save last section/subsection
  if (currentSection) {
    if (currentSubsection) {
      if (!currentSection.subsections) currentSection.subsections = [];
      currentSection.subsections.push(currentSubsection);
    }
    sections.push(currentSection);
  }

  return sections;
}

function countItems(sections: ChecklistSection[]): number {
  let count = 0;
  for (const section of sections) {
    if (section.items) count += section.items.length;
    if (section.subsections) {
      for (const sub of section.subsections) {
        count += sub.items.length;
      }
    }
  }
  return count;
}

interface ConversionConfig {
  inputFile: string;
  stackId: string;
  meta: Omit<ChecklistMeta, 'totalItems' | 'version'>;
}

const configs: ConversionConfig[] = [
  {
    inputFile: '../../java-protobuf-review-checklist.md',
    stackId: 'java-protobuf',
    meta: {
      id: 'java-protobuf',
      mode: 'review',
      title: 'Java/Kotlin + Protobuf Monorepo',
      shortTitle: 'Java/Kotlin',
      description: 'Review checklist for Java, Kotlin, and Protobuf monorepo projects',
      icon: '☕',
    },
  },
  {
    inputFile: '../../js-ts-react-node-review-checklist.md',
    stackId: 'js-ts-react-node',
    meta: {
      id: 'js-ts-react-node',
      mode: 'review',
      title: 'JavaScript/TypeScript + React + Node',
      shortTitle: 'JS/TS',
      description: 'Review checklist for JS/TS projects with React and Node.js',
      icon: '⚛️',
    },
  },
  {
    inputFile: '../../go-review-checklist.md',
    stackId: 'go',
    meta: {
      id: 'go',
      mode: 'review',
      title: 'Go',
      shortTitle: 'Go',
      description: 'Review checklist for Go services and libraries',
      icon: '🐹',
    },
  },
];

const outputDir = path.join(__dirname, '..', 'assets', 'data', 'checklists');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

for (const config of configs) {
  const inputPath = path.resolve(__dirname, config.inputFile);

  if (!fs.existsSync(inputPath)) {
    console.error(`File not found: ${inputPath}`);
    continue;
  }

  const markdown = fs.readFileSync(inputPath, 'utf-8');
  const sections = parseMarkdownChecklist(markdown, config.stackId);
  const totalItems = countItems(sections);

  const checklist: Checklist = {
    meta: {
      ...config.meta,
      totalItems,
      version: '1.0.0',
    },
    sections,
  };

  const outputPath = path.join(outputDir, `${config.stackId}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(checklist, null, 2));
  console.log(`✅ ${config.meta.title}: ${totalItems} items → ${outputPath}`);
}

// Generate the "Polish My PR" checklist directly (no markdown source)
const polishChecklist: Checklist = {
  meta: {
    id: 'polish-my-pr',
    mode: 'polish',
    title: 'Polish My PR',
    shortTitle: 'Polish',
    description: 'Prepare your PR for a smooth review and easy merge',
    icon: '✨',
    totalItems: 0, // will be updated
    version: '1.0.0',
  },
  sections: [
    {
      id: 'polish.pr-description',
      title: 'PR Description & Context',
      items: [
        { id: 'polish.pr-description.clear-title', text: 'Title is concise, descriptive, and follows team conventions (not "fix stuff" or "updates")', severity: 'major', tags: ['documentation', 'code-quality'], baseContent: emptyBaseContent() },
        { id: 'polish.pr-description.what-and-why', text: 'Description explains WHAT changed and WHY (not just HOW)', severity: 'blocker', tags: ['documentation', 'code-quality'], baseContent: emptyBaseContent() },
        { id: 'polish.pr-description.ticket-link', text: 'Link to ticket/issue is included', severity: 'major', tags: ['documentation'], baseContent: emptyBaseContent() },
        { id: 'polish.pr-description.screenshots', text: 'Screenshots or recordings included for UI changes', severity: 'major', tags: ['documentation'], baseContent: emptyBaseContent() },
        { id: 'polish.pr-description.impact-assessment', text: 'Impact and risk assessment stated for non-trivial changes', severity: 'minor', tags: ['documentation', 'code-quality'], baseContent: emptyBaseContent() },
        { id: 'polish.pr-description.breaking-changes', text: 'Breaking changes are called out prominently', severity: 'blocker', tags: ['documentation', 'api-design'], baseContent: emptyBaseContent() },
        { id: 'polish.pr-description.deployment-notes', text: 'Migration or deployment notes included if applicable', severity: 'major', tags: ['documentation'], baseContent: emptyBaseContent() },
      ],
    },
    {
      id: 'polish.scope-size',
      title: 'Scope & Size',
      items: [
        { id: 'polish.scope-size.single-change', text: 'PR is focused on a single logical change', severity: 'major', tags: ['code-quality'], baseContent: emptyBaseContent() },
        { id: 'polish.scope-size.no-unrelated', text: 'No unrelated changes bundled in (drive-by fixes, formatting-only diffs)', severity: 'minor', tags: ['code-quality'], baseContent: emptyBaseContent() },
        { id: 'polish.scope-size.reasonable-size', text: 'PR is reasonably sized (ideally under ~400 lines of meaningful changes)', severity: 'major', tags: ['code-quality'], baseContent: emptyBaseContent() },
        { id: 'polish.scope-size.stacked-prs', text: 'Large features are broken into stacked/sequenced PRs with clear ordering', severity: 'minor', tags: ['code-quality'], baseContent: emptyBaseContent() },
        { id: 'polish.scope-size.refactor-separate', text: 'Refactoring is separated from behavior changes', severity: 'major', tags: ['code-quality'], baseContent: emptyBaseContent() },
      ],
    },
    {
      id: 'polish.commit-hygiene',
      title: 'Commit Hygiene',
      items: [
        { id: 'polish.commit-hygiene.atomic-commits', text: 'Commits are atomic — each builds and passes tests independently', severity: 'minor', tags: ['code-quality'], baseContent: emptyBaseContent() },
        { id: 'polish.commit-hygiene.descriptive-messages', text: 'Commit messages are descriptive and follow team conventions', severity: 'minor', tags: ['code-quality', 'documentation'], baseContent: emptyBaseContent() },
        { id: 'polish.commit-hygiene.no-wip', text: 'No "WIP", "fixup", "squash me" commits left in', severity: 'major', tags: ['code-quality'], baseContent: emptyBaseContent() },
        { id: 'polish.commit-hygiene.clean-history', text: 'Interactive rebase used to clean up history before requesting review', severity: 'nit', tags: ['code-quality'], baseContent: emptyBaseContent() },
      ],
    },
    {
      id: 'polish.self-review',
      title: 'Self-Review',
      items: [
        { id: 'polish.self-review.read-diff', text: 'I have read my own diff line by line in the GitHub UI', severity: 'blocker', tags: ['code-quality'], baseContent: emptyBaseContent() },
        { id: 'polish.self-review.run-locally', text: 'I have run the code locally and verified it works', severity: 'blocker', tags: ['testing'], baseContent: emptyBaseContent() },
        { id: 'polish.self-review.no-debug-code', text: 'Removed all debug statements (console.log, fmt.Println, System.out.println, print())', severity: 'major', tags: ['code-quality'], baseContent: emptyBaseContent() },
        { id: 'polish.self-review.no-commented-code', text: 'No commented-out code left in — deleted, not commented', severity: 'minor', tags: ['code-quality'], baseContent: emptyBaseContent() },
        { id: 'polish.self-review.no-accidental-files', text: 'No accidental file inclusions (.env, IDE configs, large binaries, node_modules)', severity: 'blocker', tags: ['security', 'code-quality'], baseContent: emptyBaseContent() },
        { id: 'polish.self-review.no-secrets', text: 'No secrets or credentials committed (API keys, passwords, tokens)', severity: 'blocker', tags: ['security'], baseContent: emptyBaseContent() },
        { id: 'polish.self-review.no-typos', text: 'Checked for typos in code, comments, and strings', severity: 'nit', tags: ['code-quality'], baseContent: emptyBaseContent() },
      ],
    },
    {
      id: 'polish.test-coverage',
      title: 'Test Coverage',
      items: [
        { id: 'polish.test-coverage.new-tests', text: 'New code has corresponding unit tests', severity: 'blocker', tags: ['testing'], baseContent: emptyBaseContent() },
        { id: 'polish.test-coverage.existing-pass', text: 'All existing tests still pass', severity: 'blocker', tags: ['testing'], baseContent: emptyBaseContent() },
        { id: 'polish.test-coverage.edge-cases', text: 'Edge cases are covered (empty inputs, null, error paths, boundary values)', severity: 'major', tags: ['testing'], baseContent: emptyBaseContent() },
        { id: 'polish.test-coverage.test-names', text: 'Test names are descriptive and document expected behavior', severity: 'minor', tags: ['testing', 'documentation'], baseContent: emptyBaseContent() },
        { id: 'polish.test-coverage.no-flaky', text: 'No flaky tests introduced (no timing dependencies, no ordering reliance)', severity: 'major', tags: ['testing'], baseContent: emptyBaseContent() },
        { id: 'polish.test-coverage.integration', text: 'Integration tests added for cross-module or API changes', severity: 'major', tags: ['testing'], baseContent: emptyBaseContent() },
      ],
    },
    {
      id: 'polish.documentation',
      title: 'Documentation',
      items: [
        { id: 'polish.documentation.api-docs', text: 'Public API changes have updated documentation', severity: 'major', tags: ['documentation', 'api-design'], baseContent: emptyBaseContent() },
        { id: 'polish.documentation.readme', text: 'README updated if setup or usage changed', severity: 'minor', tags: ['documentation'], baseContent: emptyBaseContent() },
        { id: 'polish.documentation.inline-comments', text: 'Inline comments added for non-obvious or complex logic', severity: 'minor', tags: ['documentation', 'code-quality'], baseContent: emptyBaseContent() },
        { id: 'polish.documentation.changelog', text: 'Changelog updated if project maintains one', severity: 'nit', tags: ['documentation'], baseContent: emptyBaseContent() },
      ],
    },
    {
      id: 'polish.reviewer-experience',
      title: 'Reviewer Experience',
      items: [
        { id: 'polish.reviewer-experience.right-reviewers', text: 'Assigned appropriate reviewers (domain experts, CODEOWNERS)', severity: 'major', tags: ['code-quality'], baseContent: emptyBaseContent() },
        { id: 'polish.reviewer-experience.helpful-comments', text: 'Added helpful inline comments on complex sections of the diff', severity: 'minor', tags: ['documentation'], baseContent: emptyBaseContent() },
        { id: 'polish.reviewer-experience.testing-instructions', text: 'Provided testing instructions or reproduction steps', severity: 'major', tags: ['documentation', 'testing'], baseContent: emptyBaseContent() },
        { id: 'polish.reviewer-experience.labels', text: 'Labeled the PR appropriately (size, area, priority)', severity: 'nit', tags: ['code-quality'], baseContent: emptyBaseContent() },
        { id: 'polish.reviewer-experience.draft-status', text: 'Set draft status if not ready for final review', severity: 'minor', tags: ['code-quality'], baseContent: emptyBaseContent() },
      ],
    },
    {
      id: 'polish.ci-cd',
      title: 'CI/CD & Integration',
      items: [
        { id: 'polish.ci-cd.pipeline-passes', text: 'CI pipeline passes (lint, build, tests)', severity: 'blocker', tags: ['testing', 'code-quality'], baseContent: emptyBaseContent() },
        { id: 'polish.ci-cd.no-new-warnings', text: 'No new lint warnings or compiler warnings introduced', severity: 'minor', tags: ['code-quality'], baseContent: emptyBaseContent() },
        { id: 'polish.ci-cd.deps-locked', text: 'Dependencies are locked/pinned (lockfile updated)', severity: 'major', tags: ['code-quality'], baseContent: emptyBaseContent() },
        { id: 'polish.ci-cd.migrations-reversible', text: 'Database migrations are reversible and tested', severity: 'blocker', tags: ['code-quality'], baseContent: emptyBaseContent() },
        { id: 'polish.ci-cd.feature-flags', text: 'Feature flags in place for risky changes that need gradual rollout', severity: 'major', tags: ['code-quality'], baseContent: emptyBaseContent() },
      ],
    },
  ],
};

polishChecklist.meta.totalItems = countItems(polishChecklist.sections);

const polishOutputPath = path.join(outputDir, 'polish-my-pr.json');
fs.writeFileSync(polishOutputPath, JSON.stringify(polishChecklist, null, 2));
console.log(`✅ Polish My PR: ${polishChecklist.meta.totalItems} items → ${polishOutputPath}`);

console.log('\n🎉 All checklists converted successfully!');
