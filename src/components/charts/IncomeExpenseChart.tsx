import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useProjection } from '@/hooks/useProjection';
import { useChartFadeTransition } from '@/hooks/useChartFadeTransition';
import { formatCurrency } from '@/lib/utils';
import { CHART_COLORS } from '@/lib/constants';

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

function aggregateMonthly(
  snapshots: { date: string; incomeToday: number; expensesToday: number }[]
): MonthlyData[] {
  const map = new Map<string, { income: number; expenses: number }>();

  for (const s of snapshots) {
    const monthKey = s.date.slice(0, 7); // "2026-03"
    const existing = map.get(monthKey) ?? { income: 0, expenses: 0 };
    existing.income += s.incomeToday;
    existing.expenses += s.expensesToday;
    map.set(monthKey, existing);
  }

  return Array.from(map.entries()).map(([month, data]) => {
    const date = new Date(month + '-01T00:00:00');
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return {
      month: `${monthName} '${year}`,
      income: Math.round(data.income),
      expenses: Math.round(data.expenses),
      net: Math.round(data.income - data.expenses),
    };
  });
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-gray-200 p-3 shadow-lg" style={{ opacity: 1, backgroundColor: 'white' }}>
      <p className="text-sm font-medium mb-1 text-gray-900">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

export function IncomeExpenseChart() {
  const { snapshots } = useProjection();
  const data = useMemo(() => aggregateMonthly(snapshots), [snapshots]);

  const { chartKey, fading } = useChartFadeTransition(data.length);

  return (
    <div className="w-full">
      <h2 className="text-lg font-semibold mb-4">Monthly Income vs Expenses</h2>
      <div
        className="transition-opacity duration-150 ease-in-out"
        style={{ opacity: fading ? 0 : 1 }}
      >
      <ResponsiveContainer key={chartKey} width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="month" fontSize={12} />
          <YAxis tickFormatter={(v: number) => formatCurrency(v)} fontSize={12} width={80} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="income" name="Income" fill={CHART_COLORS.positive} radius={[4, 4, 0, 0]} />
          <Bar dataKey="expenses" name="Expenses" fill={CHART_COLORS.negative} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
