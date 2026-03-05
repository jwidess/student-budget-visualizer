import {
  addDays,
  addMonths,
  subMonths,
  differenceInCalendarDays,
  getDate,
  isWeekend,
  parseISO,
  startOfDay,
  format,
} from 'date-fns';
import type { BudgetConfig, DailySnapshot, DailyEvent, RecurringIncome } from './types';

/**
 * Calculate gross pay for a single paycheck based on income config.
 */
function paycheckAmount(income: RecurringIncome): number {
  switch (income.frequency) {
    case 'weekly':
      return income.hoursPerWeek * income.hourlyRate;
    case 'biweekly':
      return income.hoursPerWeek * income.hourlyRate * 2;
    case 'monthly':
      return income.hoursPerWeek * income.hourlyRate * (52 / 12);
    default:
      return 0;
  }
}

/**
 * Check if a given date is a regular payday for a recurring income.
 * Does NOT check the endDate boundary, callers handle that separately
 * so partial paycheck logic can emit on the endDate itself.
 */
function isRegularPayday(date: Date, income: RecurringIncome): boolean {
  const anchor = startOfDay(parseISO(income.startDate));
  const current = startOfDay(date);
  const daysDiff = differenceInCalendarDays(current, anchor);

  if (daysDiff < 0) return false;

  switch (income.frequency) {
    case 'weekly':
      return daysDiff % 7 === 0;
    case 'biweekly':
      return daysDiff % 14 === 0;
    case 'monthly':
      return getDate(current) === getDate(anchor);
    default:
      return false;
  }
}

/**
 * Check if a given date is a regular payday and within the incomes date range.
 */
function isPayday(date: Date, income: RecurringIncome): boolean {
  if (income.endDate) {
    const endDate = startOfDay(parseISO(income.endDate));
    if (startOfDay(date) > endDate) return false;
  }
  return isRegularPayday(date, income);
}

/**
 * Calculate a pro-rated partial paycheck amount for an end date
 * that doesn't fall on a regular payday.
 * Returns 0 if the end date IS a regular payday (no partial needed).
 */
function partialPaycheckAmount(income: RecurringIncome): number {
  if (!income.endDate) return 0;
  const endDate = startOfDay(parseISO(income.endDate));

  // If the end date is a regular payday, no partial needed
  if (isRegularPayday(endDate, income)) return 0;

  const fullAmount = paycheckAmount(income);

  switch (income.frequency) {
    case 'weekly': {
      // Find how many days into the current week period
      const anchor = startOfDay(parseISO(income.startDate));
      const daysDiff = differenceInCalendarDays(endDate, anchor);
      if (daysDiff < 0) return 0;
      const daysIntoPeriod = daysDiff % 7;
      return (daysIntoPeriod / 7) * fullAmount;
    }
    case 'biweekly': {
      const anchor = startOfDay(parseISO(income.startDate));
      const daysDiff = differenceInCalendarDays(endDate, anchor);
      if (daysDiff < 0) return 0;
      const daysIntoPeriod = daysDiff % 14;
      return (daysIntoPeriod / 14) * fullAmount;
    }
    case 'monthly': {
      // Find the previous payday and next payday to get period length
      const anchorDay = getDate(parseISO(income.startDate));
      const endMonth = endDate;

      // Previous payday: same day-of-month in the current or prior month
      let prevPayday: Date;
      if (getDate(endMonth) >= anchorDay) {
        prevPayday = new Date(endMonth.getFullYear(), endMonth.getMonth(), anchorDay);
      } else {
        const prevMonth = subMonths(endMonth, 1);
        prevPayday = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), anchorDay);
      }
      // Next payday
      const nextPayday = addMonths(prevPayday, 1);

      const periodLength = differenceInCalendarDays(nextPayday, prevPayday);
      const daysIntoPeriod = differenceInCalendarDays(endDate, prevPayday);

      if (periodLength <= 0 || daysIntoPeriod <= 0) return 0;
      return (daysIntoPeriod / periodLength) * fullAmount;
    }
    default:
      return 0;
  }
}

/**
 * Run the day-by-day budget projection.
 * Returns an array of daily snapshots from today through the projection horizon.
 */
export function runProjection(config: BudgetConfig): DailySnapshot[] {
  const today = startOfDay(new Date());
  const endDate = startOfDay(addMonths(today, config.projectionMonths));
  const totalDays = differenceInCalendarDays(endDate, today);

  const snapshots: DailySnapshot[] = [];
  let balance = config.initialBalance;

  for (let i = 0; i <= totalDays; i++) {
    const date = addDays(today, i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dom = getDate(date);
    const weekend = isWeekend(date);

    let incomeToday = 0;
    let expensesToday = 0;
    const events: DailyEvent[] = [];

    // ── Food budget ──
    if (config.foodBudget.enabled) {
      if (weekend) {
        expensesToday += config.foodBudget.weekendDailyTotal;
      } else {
        expensesToday +=
          config.foodBudget.weekdayBreakfast +
          config.foodBudget.weekdayLunch +
          config.foodBudget.weekdayDinner +
          config.foodBudget.weekdaySnacks;
      }
    }

    // ── Transport costs ──
    if (config.transportConfig.enabled) {
      if (config.transportConfig.autoEnabled && config.transportConfig.autoMpg > 0) {
        const miles = weekend
          ? config.transportConfig.autoWeekendMiles
          : config.transportConfig.autoWeekdayMiles;
        const gallons = miles / config.transportConfig.autoMpg;
        expensesToday += gallons * config.transportConfig.autoFuelCostPerGallon;
      }
      if (config.transportConfig.publicEnabled) {
        // Spread weekly cost evenly across 7 days
        expensesToday += config.transportConfig.publicWeeklyCost / 7;
      }
    }

    // ── Recurring income ──
    for (const income of config.recurringIncomes) {
      if (income.enabled === false) continue;
      if (isPayday(date, income)) {
        const amount = paycheckAmount(income);
        incomeToday += amount;
        events.push({ label: `${income.label} paycheck`, amount, type: 'income' });
      }
      // Emit a pro-rated partial paycheck on the end date if not a regular payday
      if (income.endDate && dateStr === income.endDate && !isRegularPayday(date, income)) {
        const amount = partialPaycheckAmount(income);
        if (amount > 0) {
          incomeToday += amount;
          events.push({ label: `${income.label} paycheck (partial)`, amount: Math.round(amount * 100) / 100, type: 'income' });
        }
      }
    }

    // ── One-time income ──
    for (const oti of config.oneTimeIncomes) {
      if (oti.enabled === false) continue;
      if (oti.date === dateStr) {
        incomeToday += oti.amount;
        events.push({ label: oti.label, amount: oti.amount, type: 'income', isOneTime: true });
      }
    }

    // ── Recurring expenses ──
    for (const expense of config.recurringExpenses) {
      if (expense.enabled === false) continue;
      if (dom === expense.dayOfMonth) {
        expensesToday += expense.amount;
        events.push({ label: expense.label, amount: expense.amount, type: 'expense' });
      }
    }

    // ── One-time expenses ──
    for (const ote of config.oneTimeExpenses) {
      if (ote.enabled === false) continue;
      if (ote.date === dateStr) {
        expensesToday += ote.amount;
        events.push({ label: ote.label, amount: ote.amount, type: 'expense', isOneTime: true });
      }
    }

    balance = balance + incomeToday - expensesToday;

    snapshots.push({
      date: dateStr,
      balance: Math.round(balance * 100) / 100,
      incomeToday: Math.round(incomeToday * 100) / 100,
      expensesToday: Math.round(expensesToday * 100) / 100,
      events,
    });
  }

  return snapshots;
}

/**
 * Find the first date the balance goes negative, if any.
 */
export function findDangerDate(
  snapshots: DailySnapshot[]
): DailySnapshot | null {
  return snapshots.find((s) => s.balance < 0) ?? null;
}

/**
 * Find the lowest balance point.
 */
export function findLowestBalance(snapshots: DailySnapshot[]): DailySnapshot | null {
  if (snapshots.length === 0) return null;
  return snapshots.reduce((min, s) => (s.balance < min.balance ? s : min));
}
