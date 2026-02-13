// ── Frequency types ──
export type PayFrequency = 'weekly' | 'biweekly' | 'monthly';

// ── Income ──
export interface RecurringIncome {
  id: string;
  label: string;
  hoursPerWeek: number;
  hourlyRate: number;
  frequency: PayFrequency;
  /** Anchor date for biweekly pay – the date of a known paycheck */
  startDate: string; // ISO date string
}

export interface OneTimeIncome {
  id: string;
  label: string;
  amount: number;
  date: string; // ISO date string
}

// ── Expenses ──
export interface RecurringExpense {
  id: string;
  label: string;
  amount: number;
  /** Day of the month this expense is due (1-28) */
  dayOfMonth: number;
}

export interface OneTimeExpense {
  id: string;
  label: string;
  amount: number;
  date: string; // ISO date string
}

// ── Food Budget ──
export interface FoodBudget {
  /** Whether food budget tracking is enabled */
  enabled: boolean;
  /** Weekday meal costs */
  weekdayBreakfast: number;
  weekdayLunch: number;
  weekdayDinner: number;
  weekdaySnacks: number;
  /** Flat weekend daily food cost */
  weekendDailyTotal: number;
}

// ── Transport / Commute ──
export interface TransportConfig {
  /** Whether transport cost tracking is enabled */
  enabled: boolean;
  /** Auto transit */
  autoEnabled: boolean;
  autoWeekdayMiles: number;
  autoWeekendMiles: number;
  autoMpg: number;
  autoFuelCostPerGallon: number;
  /** Public transit */
  publicEnabled: boolean;
  publicWeeklyCost: number;
}

// ── Projection output ──
export interface DailySnapshot {
  date: string; // ISO date string
  balance: number;
  incomeToday: number;
  expensesToday: number;
  events: string[]; // labels of what happened today
}

// ── Top-level budget configuration ──
export interface BudgetConfig {
  initialBalance: number;
  recurringIncomes: RecurringIncome[];
  oneTimeIncomes: OneTimeIncome[];
  recurringExpenses: RecurringExpense[];
  oneTimeExpenses: OneTimeExpense[];
  foodBudget: FoodBudget;
  transportConfig: TransportConfig;
  projectionMonths: number; // how many months to project
}
