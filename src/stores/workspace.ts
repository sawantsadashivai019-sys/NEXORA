import { create } from 'zustand'

interface WorkspaceStore {
  activePanels: string[];
  togglePanel: (panelId: string) => void;
  isPanelOpen: (panelId: string) => boolean;
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  activePanels: ['chat', 'sources', 'notes', 'podcast', 'mindmap'],
  togglePanel: (panelId: string) => {
    const { activePanels } = get()
    if (activePanels.includes(panelId)) {
      const next = activePanels.filter(p => p !== panelId)
      set({ activePanels: next })
      localStorage.setItem('intelligent-notebook-active-panels', JSON.stringify(next))
    } else {
      const next = [...activePanels, panelId]
      set({ activePanels: next })
      localStorage.setItem('intelligent-notebook-active-panels', JSON.stringify(next))
    }
  },
  isPanelOpen: (panelId: string) => {
    return get().activePanels.includes(panelId)
  }
}))

// Initialize from localStorage if present
const saved = localStorage.getItem('intelligent-notebook-active-panels')
if (saved) {
  try {
    const parsed = JSON.parse(saved)
    if (Array.isArray(parsed)) {
      useWorkspaceStore.setState({ activePanels: parsed })
    }
  } catch (e) {
    // ignore
  }
}
