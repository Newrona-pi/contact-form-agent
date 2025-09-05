import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RunStore {
  currentRunId: string | null;
  setCurrentRunId: (id: string | null) => void;
  clearCurrentRunId: () => void;
  _hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useRunStore = create<RunStore>()(
  persist(
    (set) => ({
      currentRunId: null,
      setCurrentRunId: (id) => set({ currentRunId: id }),
      clearCurrentRunId: () => set({ currentRunId: null }),
      _hasHydrated: false,
      setHasHydrated: (hasHydrated) => set({ _hasHydrated: hasHydrated }),
    }),
    {
      name: 'run-store',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
