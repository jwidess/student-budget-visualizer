import { useBudgetStore } from '@/store/budgetStore';
import { DebouncedNumberInput } from './DebouncedNumberInput';
import { formatCurrency } from '@/lib/utils';

export function FoodBudgetForm() {
  const { foodBudget, updateFoodBudget } = useBudgetStore();

  const weekdayDaily =
    foodBudget.weekdayBreakfast +
    foodBudget.weekdayLunch +
    foodBudget.weekdayDinner +
    foodBudget.weekdaySnacks;

  // ~4.35 weeks/month, 5 weekdays + 2 weekend days
  const estimatedMonthly =
    weekdayDaily * (52 * 5 / 12) +
    foodBudget.weekendDailyTotal * (52 * 2 / 12);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pt-1">
        <h3 className="text-sm font-semibold">Food Budget</h3>
        <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={foodBudget.enabled}
            onChange={(e) => updateFoodBudget({ enabled: e.target.checked })}
            className="rounded border-input cursor-pointer"
          />
          Enabled
        </label>
      </div>

      {!foodBudget.enabled && (
        <p className="text-sm text-muted-foreground italic">
          Food budget tracking is disabled. Enable it to include daily food costs in your projection.
        </p>
      )}

      {/* Always show content, but grey out when disabled */}
      <div className={!foodBudget.enabled ? 'opacity-50 pointer-events-none' : ''}>
        {/* Weekday costs */}
        <div className="pt-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Weekday Costs (Mon–Fri)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Breakfast ($)
                </label>
                <DebouncedNumberInput
                  value={foodBudget.weekdayBreakfast}
                  onChange={(val) => updateFoodBudget({ weekdayBreakfast: val })}
                  min={0}
                  step="0.50"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Lunch ($)
                </label>
                <DebouncedNumberInput
                  value={foodBudget.weekdayLunch}
                  onChange={(val) => updateFoodBudget({ weekdayLunch: val })}
                  min={0}
                  step="0.50"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Dinner ($)
                </label>
                <DebouncedNumberInput
                  value={foodBudget.weekdayDinner}
                  onChange={(val) => updateFoodBudget({ weekdayDinner: val })}
                  min={0}
                  step="0.50"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Snacks ($)
                </label>
                <DebouncedNumberInput
                  value={foodBudget.weekdaySnacks}
                  onChange={(val) => updateFoodBudget({ weekdaySnacks: val })}
                  min={0}
                  step="0.50"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Weekday daily total: {formatCurrency(weekdayDaily)}
            </p>
          </div>

          {/* Weekend costs */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 mt-4">
              Weekend Costs (Sat–Sun)
            </p>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Total per day ($)
              </label>
              <DebouncedNumberInput
                value={foodBudget.weekendDailyTotal}
                onChange={(val) => updateFoodBudget({ weekendDailyTotal: val })}
                min={0}
                step="1"
              />
            </div>
          </div>

        {/* Summary */}
        <div className="rounded-md bg-muted/50 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Estimated monthly food cost
          </p>
          <p className="text-sm font-bold mt-0.5">
            ≈ {formatCurrency(Math.round(estimatedMonthly))}
          </p>
        </div>
      </div>
    </div>
  );
}
