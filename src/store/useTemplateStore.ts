import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { persistStorage } from '../storage/secureStorage';
import { v4 as uuidv4 } from 'uuid';
import type { SessionTemplate, StackId } from '../data/types';

interface TemplateState {
  templates: Record<string, SessionTemplate>;
  saveTemplate: (
    name: string,
    stackIds: StackId[],
    selectedSections?: string[],
  ) => string;
  deleteTemplate: (id: string) => void;
  getTemplates: () => SessionTemplate[];
}

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set, get) => ({
      templates: {},

      saveTemplate: (name, stackIds, selectedSections) => {
        const id = uuidv4();
        const template: SessionTemplate = {
          id,
          name,
          stackIds,
          selectedSections,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          templates: { ...state.templates, [id]: template },
        }));
        return id;
      },

      deleteTemplate: (id) => {
        set((state) => {
          const { [id]: _, ...rest } = state.templates;
          return { templates: rest };
        });
      },

      getTemplates: () => {
        return Object.values(get().templates).sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      },
    }),
    {
      name: 'template-storage',
      storage: createJSONStorage(() => persistStorage),
    },
  ),
);
