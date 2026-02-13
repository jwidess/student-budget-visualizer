import type { BudgetConfig } from '@/engine/types';
import { generateId } from '@/lib/utils';
import { format, addDays } from 'date-fns';

// Helper: get next Friday
function nextFriday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (5 - day + 7) % 7 || 7;
  return format(addDays(d, diff), 'yyyy-MM-dd');
}

export interface BudgetTemplate {
  name: string;
  description: string;
  config: BudgetConfig;
}

export const budgetTemplates: BudgetTemplate[] = [
  {
    name: 'Student - 20 Hours/Week',
    description: 'Part-time student with modest income and typical expenses',
    config: {
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
      oneTimeIncomes: [
        {
          id: generateId(),
          label: 'Financial Aid Refund',
          amount: 2500,
          date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        },
      ],
      recurringExpenses: [
        {
          id: generateId(),
          label: 'Rent',
          amount: 600,
          dayOfMonth: 1,
        },
        {
          id: generateId(),
          label: 'Phone Bill',
          amount: 50,
          dayOfMonth: 15,
        },
      ],
      oneTimeExpenses: [
        {
          id: generateId(),
          label: 'Textbooks',
          amount: 400,
          date: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
        },
      ],
      foodBudget: {
        enabled: true,
        weekdayBreakfast: 3,
        weekdayLunch: 8,
        weekdayDinner: 12,
        weekdaySnacks: 2,
        weekendDailyTotal: 30,
      },
      transportConfig: {
        enabled: true,
        autoEnabled: false,
        autoWeekdayMiles: 0,
        autoWeekendMiles: 0,
        autoMpg: 30,
        autoFuelCostPerGallon: 3.50,
        publicEnabled: true,
        publicWeeklyCost: 25,
      },
    },
  },
  {
    name: 'Full-time - 40 Hours/Week',
    description: 'Full-time worker with standard living expenses',
    config: {
      initialBalance: 3000,
      projectionMonths: 12,
      recurringIncomes: [
        {
          id: generateId(),
          label: 'Full-time Job',
          hoursPerWeek: 40,
          hourlyRate: 22,
          frequency: 'biweekly',
          startDate: nextFriday(),
        },
      ],
      oneTimeIncomes: [
        {
          id: generateId(),
          label: 'Tax Refund',
          amount: 1800,
          date: format(addDays(new Date(), 60), 'yyyy-MM-dd'),
        },
      ],
      recurringExpenses: [
        {
          id: generateId(),
          label: 'Rent',
          amount: 1200,
          dayOfMonth: 1,
        },
        {
          id: generateId(),
          label: 'Utilities',
          amount: 150,
          dayOfMonth: 5,
        },
        {
          id: generateId(),
          label: 'Phone',
          amount: 75,
          dayOfMonth: 15,
        },
        {
          id: generateId(),
          label: 'Internet',
          amount: 60,
          dayOfMonth: 20,
        },
      ],
      oneTimeExpenses: [
        {
          id: generateId(),
          label: 'New Laptop',
          amount: 1200,
          date: format(addDays(new Date(), 45), 'yyyy-MM-dd'),
        },
      ],
      foodBudget: {
        enabled: true,
        weekdayBreakfast: 5,
        weekdayLunch: 12,
        weekdayDinner: 15,
        weekdaySnacks: 5,
        weekendDailyTotal: 50,
      },
      transportConfig: {
        enabled: true,
        autoEnabled: true,
        autoWeekdayMiles: 30,
        autoWeekendMiles: 50,
        autoMpg: 28,
        autoFuelCostPerGallon: 3.50,
        publicEnabled: false,
        publicWeeklyCost: 0,
      },
    },
  },
  {
    name: 'Minimal Budget',
    description: 'Bare-bones budget with minimal income and expenses',
    config: {
      initialBalance: 500,
      projectionMonths: 6,
      recurringIncomes: [
        {
          id: generateId(),
          label: 'Gig Work',
          hoursPerWeek: 15,
          hourlyRate: 18,
          frequency: 'weekly',
          startDate: nextFriday(),
        },
      ],
      oneTimeIncomes: [],
      recurringExpenses: [
        {
          id: generateId(),
          label: 'Rent (shared)',
          amount: 450,
          dayOfMonth: 1,
        },
      ],
      oneTimeExpenses: [],
      foodBudget: {
        enabled: true,
        weekdayBreakfast: 2,
        weekdayLunch: 5,
        weekdayDinner: 8,
        weekdaySnacks: 1,
        weekendDailyTotal: 20,
      },
      transportConfig: {
        enabled: true,
        autoEnabled: false,
        autoWeekdayMiles: 0,
        autoWeekendMiles: 0,
        autoMpg: 30,
        autoFuelCostPerGallon: 3.50,
        publicEnabled: true,
        publicWeeklyCost: 15,
      },
    },
  },
  {
    name: 'High Earner',
    description: 'Professional with higher income and lifestyle expenses',
    config: {
      initialBalance: 8000,
      projectionMonths: 12,
      recurringIncomes: [
        {
          id: generateId(),
          label: 'Software Engineer',
          hoursPerWeek: 40,
          hourlyRate: 55,
          frequency: 'biweekly',
          startDate: nextFriday(),
        },
      ],
      oneTimeIncomes: [
        {
          id: generateId(),
          label: 'Bonus',
          amount: 5000,
          date: format(addDays(new Date(), 90), 'yyyy-MM-dd'),
        },
      ],
      recurringExpenses: [
        {
          id: generateId(),
          label: 'Rent',
          amount: 2200,
          dayOfMonth: 1,
        },
        {
          id: generateId(),
          label: 'Utilities',
          amount: 200,
          dayOfMonth: 5,
        },
        {
          id: generateId(),
          label: 'Internet & Streaming',
          amount: 120,
          dayOfMonth: 10,
        },
        {
          id: generateId(),
          label: 'Gym Membership',
          amount: 80,
          dayOfMonth: 1,
        },
        {
          id: generateId(),
          label: 'Car Payment',
          amount: 450,
          dayOfMonth: 15,
        },
        {
          id: generateId(),
          label: 'Insurance',
          amount: 180,
          dayOfMonth: 1,
        },
      ],
      oneTimeExpenses: [
        {
          id: generateId(),
          label: 'Vacation',
          amount: 3000,
          date: format(addDays(new Date(), 120), 'yyyy-MM-dd'),
        },
      ],
      foodBudget: {
        enabled: true,
        weekdayBreakfast: 8,
        weekdayLunch: 18,
        weekdayDinner: 25,
        weekdaySnacks: 8,
        weekendDailyTotal: 75,
      },
      transportConfig: {
        enabled: true,
        autoEnabled: true,
        autoWeekdayMiles: 40,
        autoWeekendMiles: 60,
        autoMpg: 25,
        autoFuelCostPerGallon: 3.75,
        publicEnabled: false,
        publicWeeklyCost: 0,
      },
    },
  },
];
