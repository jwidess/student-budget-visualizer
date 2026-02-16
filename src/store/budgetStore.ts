import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  BudgetConfig,
  RecurringIncome,
  OneTimeIncome,
  RecurringExpense,
  OneTimeExpense,
  FoodBudget,
  TransportConfig,
} from '@/engine/types';
import { generateId } from '@/lib/utils';
import { format, addDays } from 'date-fns';

// Default: first paycheck is next Friday
function nextFriday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (5 - day + 7) % 7 || 7;
  return format(addDays(d, diff), 'yyyy-MM-dd');
}

// Validation helper for importing configs
export function validateBudgetConfig(json: string): { success: boolean; error?: string } {
  try {
    const parsed = JSON.parse(json);
    // Validate required top-level fields
    if (
      typeof parsed.initialBalance !== 'number' ||
      typeof parsed.projectionMonths !== 'number' ||
      !Array.isArray(parsed.recurringIncomes) ||
      !Array.isArray(parsed.oneTimeIncomes) ||
      !Array.isArray(parsed.recurringExpenses) ||
      !Array.isArray(parsed.oneTimeExpenses) ||
      typeof parsed.foodBudget !== 'object' ||
      typeof parsed.transportConfig !== 'object'
    ) {
      return { success: false, error: 'Invalid file format. Missing or invalid fields.' };
    }
    return { success: true };
  } catch {
    return { success: false, error: 'Invalid JSON file. Could not parse the data.' };
  }
}

interface BudgetActions {
  setInitialBalance: (amount: number) => void;
  setProjectionMonths: (months: number) => void;

  addRecurringIncome: () => void;
  updateRecurringIncome: (id: string, data: Partial<RecurringIncome>) => void;
  removeRecurringIncome: (id: string) => void;

  addOneTimeIncome: () => void;
  updateOneTimeIncome: (id: string, data: Partial<OneTimeIncome>) => void;
  removeOneTimeIncome: (id: string) => void;

  addRecurringExpense: () => void;
  updateRecurringExpense: (id: string, data: Partial<RecurringExpense>) => void;
  removeRecurringExpense: (id: string) => void;

  addOneTimeExpense: () => void;
  updateOneTimeExpense: (id: string, data: Partial<OneTimeExpense>) => void;
  removeOneTimeExpense: (id: string) => void;

  reorderRecurringIncomes: (fromIndex: number, toIndex: number) => void;
  reorderOneTimeIncomes: (fromIndex: number, toIndex: number) => void;
  reorderRecurringExpenses: (fromIndex: number, toIndex: number) => void;
  reorderOneTimeExpenses: (fromIndex: number, toIndex: number) => void;

  updateFoodBudget: (data: Partial<FoodBudget>) => void;
  updateTransportConfig: (data: Partial<TransportConfig>) => void;

  applyTemplate: (config: BudgetConfig) => void;
  exportConfig: () => string;
  importConfig: (json: string) => { success: boolean; error?: string };
  resetAll: () => void;
  hasUserEdits: boolean;
}

type BudgetStore = BudgetConfig & BudgetActions;

const defaultConfig: BudgetConfig = {
  initialBalance: 1000,
  projectionMonths: 12,
  recurringIncomes: [
    {
      id: generateId(),
      label: 'Part-time Job',
      hoursPerWeek: 20,
      hourlyRate: 15,
      frequency: 'biweekly',
      startDate: nextFriday(),
      enabled: true,
    },
  ],
  oneTimeIncomes: [],
  recurringExpenses: [
    {
      id: generateId(),
      label: 'Rent',
      amount: 800,
      dayOfMonth: 1,
      enabled: true,
    },
  ],
  oneTimeExpenses: [],
  foodBudget: {
    enabled: true,
    weekdayBreakfast: 3,
    weekdayLunch: 8,
    weekdayDinner: 12,
    weekdaySnacks: 2,
    weekendDailyTotal: 25,
  },
  transportConfig: {
    enabled: true,
    autoEnabled: true,
    autoWeekdayMiles: 20,
    autoWeekendMiles: 10,
    autoMpg: 30,
    autoFuelCostPerGallon: 3.50,
    publicEnabled: false,
    publicWeeklyCost: 0,
  },
};

export const useBudgetStore = create<BudgetStore>()(
  persist(
    (set) => ({
      ...defaultConfig,
      hasUserEdits: false,

      setInitialBalance: (amount) => set({ initialBalance: amount, hasUserEdits: true }),
      setProjectionMonths: (months) => set({ projectionMonths: months, hasUserEdits: true }),

      // ── Recurring Income ──
      addRecurringIncome: () =>
        set((state) => ({
          hasUserEdits: true,
          recurringIncomes: [
            ...state.recurringIncomes,
            {
              id: generateId(),
              label: 'New Income',
              hoursPerWeek: 20,
              hourlyRate: 15,
              frequency: 'biweekly' as const,
              startDate: nextFriday(),
              enabled: true,
            },
          ],
        })),
      updateRecurringIncome: (id, data) =>
        set((state) => ({
          hasUserEdits: true,
          recurringIncomes: state.recurringIncomes.map((i) =>
            i.id === id ? { ...i, ...data } : i
          ),
        })),
      removeRecurringIncome: (id) =>
        set((state) => ({
          hasUserEdits: true,
          recurringIncomes: state.recurringIncomes.filter((i) => i.id !== id),
        })),

      // ── One-Time Income ──
      addOneTimeIncome: () =>
        set((state) => ({
          hasUserEdits: true,
          oneTimeIncomes: [
            ...state.oneTimeIncomes,
            {
              id: generateId(),
              label: 'Tax Refund',
              amount: 500,
              date: format(new Date(), 'yyyy-MM-dd'),
              enabled: true,
            },
          ],
        })),
      updateOneTimeIncome: (id, data) =>
        set((state) => ({
          hasUserEdits: true,
          oneTimeIncomes: state.oneTimeIncomes.map((i) =>
            i.id === id ? { ...i, ...data } : i
          ),
        })),
      removeOneTimeIncome: (id) =>
        set((state) => ({
          hasUserEdits: true,
          oneTimeIncomes: state.oneTimeIncomes.filter((i) => i.id !== id),
        })),

      // ── Recurring Expense ──
      addRecurringExpense: () =>
        set((state) => ({
          hasUserEdits: true,
          recurringExpenses: [
            ...state.recurringExpenses,
            {
              id: generateId(),
              label: 'New Expense',
              amount: 100,
              dayOfMonth: 1,
              enabled: true,
            },
          ],
        })),
      updateRecurringExpense: (id, data) =>
        set((state) => ({
          hasUserEdits: true,
          recurringExpenses: state.recurringExpenses.map((e) =>
            e.id === id ? { ...e, ...data } : e
          ),
        })),
      removeRecurringExpense: (id) =>
        set((state) => ({
          hasUserEdits: true,
          recurringExpenses: state.recurringExpenses.filter((e) => e.id !== id),
        })),

      // ── One-Time Expense ──
      addOneTimeExpense: () =>
        set((state) => ({
          hasUserEdits: true,
          oneTimeExpenses: [
            ...state.oneTimeExpenses,
            {
              id: generateId(),
              label: 'New Expense',
              amount: 500,
              date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
              enabled: true,
            },
          ],
        })),
      updateOneTimeExpense: (id, data) =>
        set((state) => ({
          hasUserEdits: true,
          oneTimeExpenses: state.oneTimeExpenses.map((e) =>
            e.id === id ? { ...e, ...data } : e
          ),
        })),
      removeOneTimeExpense: (id) =>
        set((state) => ({
          hasUserEdits: true,
          oneTimeExpenses: state.oneTimeExpenses.filter((e) => e.id !== id),
        })),

      // ── Reorder helpers ──
      reorderRecurringIncomes: (from, to) =>
        set((state) => {
          const arr = [...state.recurringIncomes];
          const [item] = arr.splice(from, 1) as [typeof arr[0]];
          arr.splice(to, 0, item);
          return { hasUserEdits: true, recurringIncomes: arr };
        }),
      reorderOneTimeIncomes: (from, to) =>
        set((state) => {
          const arr = [...state.oneTimeIncomes];
          const [item] = arr.splice(from, 1) as [typeof arr[0]];
          arr.splice(to, 0, item);
          return { hasUserEdits: true, oneTimeIncomes: arr };
        }),
      reorderRecurringExpenses: (from, to) =>
        set((state) => {
          const arr = [...state.recurringExpenses];
          const [item] = arr.splice(from, 1) as [typeof arr[0]];
          arr.splice(to, 0, item);
          return { hasUserEdits: true, recurringExpenses: arr };
        }),
      reorderOneTimeExpenses: (from, to) =>
        set((state) => {
          const arr = [...state.oneTimeExpenses];
          const [item] = arr.splice(from, 1) as [typeof arr[0]];
          arr.splice(to, 0, item);
          return { hasUserEdits: true, oneTimeExpenses: arr };
        }),

      // ── Food Budget ──
      updateFoodBudget: (data) =>
        set((state) => ({
          hasUserEdits: true,
          foodBudget: { ...state.foodBudget, ...data },
        })),

      // ── Transport ──
      updateTransportConfig: (data) =>
        set((state) => ({
          hasUserEdits: true,
          transportConfig: { ...state.transportConfig, ...data },
        })),
      applyTemplate: (config) => set({ ...config, hasUserEdits: false }),

      exportConfig: () => {
        const state = useBudgetStore.getState();
        const config: BudgetConfig = {
          initialBalance: state.initialBalance,
          projectionMonths: state.projectionMonths,
          recurringIncomes: state.recurringIncomes,
          oneTimeIncomes: state.oneTimeIncomes,
          recurringExpenses: state.recurringExpenses,
          oneTimeExpenses: state.oneTimeExpenses,
          foodBudget: state.foodBudget,
          transportConfig: state.transportConfig,
        };
        return JSON.stringify(config, null, 2);
      },

      importConfig: (json: string) => {
        const validation = validateBudgetConfig(json);
        if (!validation.success) {
          return validation;
        }
        const parsed = JSON.parse(json);
        const config: BudgetConfig = {
          initialBalance: parsed.initialBalance,
          projectionMonths: parsed.projectionMonths,
          recurringIncomes: parsed.recurringIncomes,
          oneTimeIncomes: parsed.oneTimeIncomes,
          recurringExpenses: parsed.recurringExpenses,
          oneTimeExpenses: parsed.oneTimeExpenses,
          foodBudget: parsed.foodBudget,
          transportConfig: parsed.transportConfig,
        };
        set({ ...config, hasUserEdits: true });
        return { success: true };
      },
      
      resetAll: () => set({ ...defaultConfig, hasUserEdits: false }),
    }),
    {
      name: 'student-budget-data',
    }
  )
);
