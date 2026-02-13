import { useProjection } from '@/hooks/useProjection';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AlertTriangle, TrendingDown, TrendingUp, DollarSign } from 'lucide-react';

export function SummaryCards() {
  const { lowestPoint, totalIncome, totalExpenses } = useProjection();

  const cards = [
    {
      label: 'Total Projected Income',
      value: formatCurrency(totalIncome),
      icon: TrendingUp,
      color: 'text-green-600',
    },
    {
      label: 'Total Projected Expenses',
      value: formatCurrency(totalExpenses),
      icon: TrendingDown,
      color: 'text-red-500',
    },
    {
      label: 'Net',
      value: formatCurrency(totalIncome - totalExpenses),
      icon: DollarSign,
      color: totalIncome - totalExpenses >= 0 ? 'text-green-600' : 'text-red-500',
    },
    {
      label: 'Lowest Balance',
      value: lowestPoint ? formatCurrency(lowestPoint.balance) : '—',
      subtitle: lowestPoint
        ? formatDate(new Date(lowestPoint.date + 'T00:00:00'))
        : undefined,
      icon: AlertTriangle,
      color: lowestPoint && lowestPoint.balance < 0 ? 'text-red-500' : 'text-yellow-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border bg-card p-4 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">
              {card.label}
            </span>
            <card.icon className={`w-4 h-4 ${card.color}`} />
          </div>
          <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
          {card.subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export function WarningBanner() {
  const { dangerDate, lowestPoint } = useProjection();

  if (!dangerDate) return null;

  const deficit = lowestPoint ? Math.abs(lowestPoint.balance) : 0;

  return (
    <div className="flex items-center gap-2 rounded-md bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-800 px-3 py-1.5 text-xs text-red-700 dark:text-red-300 animate-in fade-in duration-300">
      <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
      <span>
        <strong>Balance goes negative</strong> on{' '}
        <strong>{formatDate(new Date(dangerDate.date + 'T00:00:00'))}</strong>
        {deficit > 0 && (
          <>
            {' · Lowest: '}
            <strong>{formatCurrency(-deficit)}</strong>
          </>
        )}
      </span>
    </div>
  );
}
