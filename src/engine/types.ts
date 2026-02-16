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
  /** Optional end date for recurring income (e.g., for summer jobs or internships) */
  endDate?: string; // ISO date string
  /** Whether this income is included in the projection (default: true) */
  enabled?: boolean;
}

export interface OneTimeIncome {
  id: string;
  label: string;
  amount: number;
  date: string; // ISO date string
  /** Whether this income is included in the projection (default: true) */
  enabled?: boolean;
}

// ── Expenses ──
export interface RecurringExpense {
  id: string;
  label: string;
  amount: number;
  /** Day of the month this expense is due (1-28) */
  dayOfMonth: number;
  /** Whether this expense is included in the projection (default: true) */
  enabled?: boolean;
}

export interface OneTimeExpense {
  id: string;
  label: string;
  amount: number;
  date: string; // ISO date string
  /** Whether this expense is included in the projection (default: true) */
  enabled?: boolean;
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
export interface DailyEvent {
  label: string;
  amount: number;
  type: 'income' | 'expense';
  /** Whether this is a one-time (non-recurring) event */
  isOneTime?: boolean;
}

export interface DailySnapshot {
  date: string; // ISO date string
  balance: number;
  incomeToday: number;
  expensesToday: number;
  events: DailyEvent[]; // structured events that happened today
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
