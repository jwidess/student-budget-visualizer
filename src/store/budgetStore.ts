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

  resetAll: () => void;
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
    },
  ],
  oneTimeIncomes: [],
  recurringExpenses: [
    {
      id: generateId(),
      label: 'Rent',
      amount: 800,
      dayOfMonth: 1,
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

      setInitialBalance: (amount) => set({ initialBalance: amount }),
      setProjectionMonths: (months) => set({ projectionMonths: months }),

      // ── Recurring Income ──
      addRecurringIncome: () =>
        set((state) => ({
          recurringIncomes: [
            ...state.recurringIncomes,
            {
              id: generateId(),
              label: 'New Income',
              hoursPerWeek: 20,
              hourlyRate: 15,
              frequency: 'biweekly' as const,
              startDate: nextFriday(),
            },
          ],
        })),
      updateRecurringIncome: (id, data) =>
        set((state) => ({
          recurringIncomes: state.recurringIncomes.map((i) =>
            i.id === id ? { ...i, ...data } : i
          ),
        })),
      removeRecurringIncome: (id) =>
        set((state) => ({
          recurringIncomes: state.recurringIncomes.filter((i) => i.id !== id),
        })),

      // ── One-Time Income ──
      addOneTimeIncome: () =>
        set((state) => ({
          oneTimeIncomes: [
            ...state.oneTimeIncomes,
            {
              id: generateId(),
              label: 'Tax Refund',
              amount: 500,
              date: format(new Date(), 'yyyy-MM-dd'),
            },
          ],
        })),
      updateOneTimeIncome: (id, data) =>
        set((state) => ({
          oneTimeIncomes: state.oneTimeIncomes.map((i) =>
            i.id === id ? { ...i, ...data } : i
          ),
        })),
      removeOneTimeIncome: (id) =>
        set((state) => ({
          oneTimeIncomes: state.oneTimeIncomes.filter((i) => i.id !== id),
        })),

      // ── Recurring Expense ──
      addRecurringExpense: () =>
        set((state) => ({
          recurringExpenses: [
            ...state.recurringExpenses,
            {
              id: generateId(),
              label: 'New Expense',
              amount: 100,
              dayOfMonth: 1,
            },
          ],
        })),
      updateRecurringExpense: (id, data) =>
        set((state) => ({
          recurringExpenses: state.recurringExpenses.map((e) =>
            e.id === id ? { ...e, ...data } : e
          ),
        })),
      removeRecurringExpense: (id) =>
        set((state) => ({
          recurringExpenses: state.recurringExpenses.filter((e) => e.id !== id),
        })),

      // ── One-Time Expense ──
      addOneTimeExpense: () =>
        set((state) => ({
          oneTimeExpenses: [
            ...state.oneTimeExpenses,
            {
              id: generateId(),
              label: 'New Expense',
              amount: 500,
              date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
            },
          ],
        })),
      updateOneTimeExpense: (id, data) =>
        set((state) => ({
          oneTimeExpenses: state.oneTimeExpenses.map((e) =>
            e.id === id ? { ...e, ...data } : e
          ),
        })),
      removeOneTimeExpense: (id) =>
        set((state) => ({
          oneTimeExpenses: state.oneTimeExpenses.filter((e) => e.id !== id),
        })),

      // ── Reorder helpers ──
      reorderRecurringIncomes: (from, to) =>
        set((state) => {
          const arr = [...state.recurringIncomes];
          const [item] = arr.splice(from, 1) as [typeof arr[0]];
          arr.splice(to, 0, item);
          return { recurringIncomes: arr };
        }),
      reorderOneTimeIncomes: (from, to) =>
        set((state) => {
          const arr = [...state.oneTimeIncomes];
          const [item] = arr.splice(from, 1) as [typeof arr[0]];
          arr.splice(to, 0, item);
          return { oneTimeIncomes: arr };
        }),
      reorderRecurringExpenses: (from, to) =>
        set((state) => {
          const arr = [...state.recurringExpenses];
          const [item] = arr.splice(from, 1) as [typeof arr[0]];
          arr.splice(to, 0, item);
          return { recurringExpenses: arr };
        }),
      reorderOneTimeExpenses: (from, to) =>
        set((state) => {
          const arr = [...state.oneTimeExpenses];
          const [item] = arr.splice(from, 1) as [typeof arr[0]];
          arr.splice(to, 0, item);
          return { oneTimeExpenses: arr };
        }),

      // ── Food Budget ──
      updateFoodBudget: (data) =>
        set((state) => ({
          foodBudget: { ...state.foodBudget, ...data },
        })),

      // ── Transport ──
      updateTransportConfig: (data) =>
        set((state) => ({
          transportConfig: { ...state.transportConfig, ...data },
        })),

      resetAll: () => set(defaultConfig),
    }),
    {
      name: 'student-budget-data',
    }
  )
);
