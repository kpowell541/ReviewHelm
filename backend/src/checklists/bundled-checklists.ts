import cLangData from '../../../assets/data/checklists/c-lang.json';
import goData from '../../../assets/data/checklists/go.json';
import javaData from '../../../assets/data/checklists/java-protobuf.json';
import jsTsData from '../../../assets/data/checklists/js-ts-react-node.json';
import luaData from '../../../assets/data/checklists/lua.json';
import polishData from '../../../assets/data/checklists/polish-my-pr.json';
import pythonData from '../../../assets/data/checklists/python.json';
import rubyData from '../../../assets/data/checklists/ruby.json';
import swiftObjcData from '../../../assets/data/checklists/swift-objc.json';
import terraformData from '../../../assets/data/checklists/terraform-hcl.json';
import webDevopsData from '../../../assets/data/checklists/web-devops-config.json';

export type ChecklistMode = 'review' | 'polish';
export type Severity = 'blocker' | 'major' | 'minor' | 'nit';
export type StackId =
  | 'java-protobuf'
  | 'js-ts-react-node'
  | 'go'
  | 'terraform-hcl'
  | 'swift-objc'
  | 'web-devops-config'
  | 'python'
  | 'ruby'
  | 'lua'
  | 'c-lang';

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
  'java-protobuf': javaData,
  'js-ts-react-node': jsTsData,
  go: goData,
  'terraform-hcl': terraformData,
  'swift-objc': swiftObjcData,
  'web-devops-config': webDevopsData,
  python: pythonData,
  ruby: rubyData,
  lua: luaData,
  'c-lang': cLangData,
  'polish-my-pr': polishData,
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
