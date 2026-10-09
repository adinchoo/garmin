import { create } from 'zustand';

type ActiveView = 'home' | 'activities' | 'trends' | 'nutrition' | 'coach' | 'profile';

type AppState = {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  selectedActivityId: string | null;
  setSelectedActivityId: (id: string | null) => void;
  filters: {
    type: 'All' | 'Run' | 'Ride' | 'Swim' | 'Strength' | 'Hike' | 'Recovery';
    search: string;
  };
  setFilters: (next: Partial<AppState['filters']>) => void;
};

export const useAppStore = create<AppState>((set) => ({
  activeView: 'home',
  selectedActivityId: null,
  filters: {
    type: 'All',
    search: '',
  },
  setActiveView: (view) => set({ activeView: view }),
  setSelectedActivityId: (id) => set({ selectedActivityId: id }),
  setFilters: (next) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...next,
      },
    })),
}));
