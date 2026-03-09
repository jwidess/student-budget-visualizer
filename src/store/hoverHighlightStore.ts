import { create } from 'zustand';

export interface HoverHighlight {
  /** ID of the budget item being hovered */
  itemId: string;
  /** Whether the item produces income or an expense */
  type: 'income' | 'expense';
  /** ISO date strings to highlight on the chart */
  dates: string[];
}

interface HoverHighlightStore {
  highlight: HoverHighlight | null;
  setHighlight: (h: HoverHighlight) => void;
  clearHighlight: () => void;
}

export const useHoverHighlightStore = create<HoverHighlightStore>((set) => ({
  highlight: null,
  setHighlight: (h) => set({ highlight: h }),
  clearHighlight: () => set({ highlight: null }),
}));
