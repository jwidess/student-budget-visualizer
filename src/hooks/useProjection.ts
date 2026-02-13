import { useMemo } from 'react';
import { useBudgetStore } from '@/store/budgetStore';
import { useShallow } from 'zustand/react/shallow';
import { runProjection, findDangerDate, findLowestBalance } from '@/engine/projection';
import type { BudgetConfig } from '@/engine/types';

export function useProjection() {
  const config: BudgetConfig = useBudgetStore(
    useShallow((state) => ({
      initialBalance: state.initialBalance,
      projectionMonths: state.projectionMonths,
      recurringIncomes: state.recurringIncomes,
      oneTimeIncomes: state.oneTimeIncomes,
      recurringExpenses: state.recurringExpenses,
      oneTimeExpenses: state.oneTimeExpenses,
      foodBudget: state.foodBudget,
      transportConfig: state.transportConfig,
    }))
  );

  const snapshots = useMemo(() => runProjection(config), [config]);
  const dangerDate = useMemo(() => findDangerDate(snapshots), [snapshots]);
  const lowestPoint = useMemo(() => findLowestBalance(snapshots), [snapshots]);

  const totalIncome = useMemo(
    () => snapshots.reduce((sum, s) => sum + s.incomeToday, 0),
    [snapshots]
  );
  const totalExpenses = useMemo(
    () => snapshots.reduce((sum, s) => sum + s.expensesToday, 0),
    [snapshots]
  );

  return { snapshots, dangerDate, lowestPoint, totalIncome, totalExpenses };
}
