import { useCallback, useEffect, useState } from 'react';
import { useBudgetStore } from '@/store/budgetStore';
import { Plus, Trash2, X } from 'lucide-react';
import type { PayFrequency, RecurringIncome } from '@/engine/types';
import { format, addMonths, addDays, parseISO, differenceInCalendarDays, getDate, startOfDay } from 'date-fns';
import { EditableLabel } from './EditableLabel';
import { DebouncedNumberInput } from './DebouncedNumberInput';
import { SortableItem } from './SortableItem';
import { Tooltip } from '@/components/Tooltip';
import { useHoverHighlightStore } from '@/store/hoverHighlightStore';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

export function IncomeForm() {
  const {
    recurringIncomes,
    addRecurringIncome,
    updateRecurringIncome,
    removeRecurringIncome,
    reorderRecurringIncomes,
    projectionMonths,
  } = useBudgetStore();

  const setHighlight = useHoverHighlightStore((s) => s.setHighlight);
  const clearHighlight = useHoverHighlightStore((s) => s.clearHighlight);

  // Track which income row is being hovered so highlight stays live when fields change
  const [hoveredIncomeId, setHoveredIncomeId] = useState<string | null>(null);

  const maxDate = format(addMonths(new Date(), projectionMonths), 'yyyy-MM-dd');
  const minDate = format(new Date(), 'yyyy-MM-dd');

  /** Compute all pay dates within the projection range for a recurring income. */
  const computePayDates = useCallback((income: RecurringIncome): string[] => {
    const today = startOfDay(new Date());
    const end = startOfDay(addMonths(today, projectionMonths));
    const anchor = startOfDay(parseISO(income.startDate));
    const incEnd = income.endDate ? startOfDay(parseISO(income.endDate)) : end;
    const lastDate = incEnd < end ? incEnd : end;
    const dates: string[] = [];

    const totalDays = differenceInCalendarDays(lastDate, today);
    for (let i = 0; i <= totalDays; i++) {
      const d = addDays(today, i);
      const diff = differenceInCalendarDays(d, anchor);
      if (diff < 0) continue;
      let hit = false;
      switch (income.frequency) {
        case 'weekly':   hit = diff % 7 === 0; break;
        case 'biweekly': hit = diff % 14 === 0; break;
        case 'monthly':  hit = getDate(d) === getDate(anchor); break;
      }
      if (hit) dates.push(format(d, 'yyyy-MM-dd'));
    }

    // Add endDate if it falls mid-cycle (produces a partial paycheck)
    if (income.endDate) {
      const endDateObj = startOfDay(parseISO(income.endDate));
      if (endDateObj <= end) {
        const diffFromAnchor = differenceInCalendarDays(endDateObj, anchor);
        let isRegularPayday = false;
        switch (income.frequency) {
          case 'weekly':   isRegularPayday = diffFromAnchor >= 0 && diffFromAnchor % 7 === 0; break;
          case 'biweekly': isRegularPayday = diffFromAnchor >= 0 && diffFromAnchor % 14 === 0; break;
          case 'monthly':  isRegularPayday = getDate(endDateObj) === getDate(anchor); break;
        }
        if (!isRegularPayday) {
          dates.push(income.endDate);
        }
      }
    }

    return dates;
  }, [projectionMonths]);

  // Reactively update highlight when income data changes while the row is hovered
  useEffect(() => {
    if (!hoveredIncomeId) return;
    const income = recurringIncomes.find((i) => i.id === hoveredIncomeId);
    if (!income) return;
    setHighlight({ itemId: income.id, type: 'income', dates: computePayDates(income) });
  }, [hoveredIncomeId, recurringIncomes, computePayDates, setHighlight]);

  // Out-of-range: start date beyond projection OR end date entirely in the past
  const isIncomeOutOfRange = (startDate: string, endDate?: string) => {
    if (startDate > maxDate) return true;
    if (endDate && endDate < minDate) return true;
    return false;
  };

  // Calculate number of full paychecks between start and end dates
  const countPaychecks = (startDateStr: string, endDateStr: string | undefined, frequency: PayFrequency): { full: number; hasPartial: boolean } => {
    if (!endDateStr) return { full: -1, hasPartial: false };
    
    const startDate = parseISO(startDateStr);
    const endDate = parseISO(endDateStr);
    const daysDiff = differenceInCalendarDays(endDate, startDate);

    if (daysDiff < 0) return { full: 0, hasPartial: false };

    switch (frequency) {
      case 'weekly': {
        const full = Math.floor(daysDiff / 7) + 1;
        const hasPartial = daysDiff % 7 !== 0;
        return { full, hasPartial };
      }
      case 'biweekly': {
        const full = Math.floor(daysDiff / 14) + 1;
        const hasPartial = daysDiff % 14 !== 0;
        return { full, hasPartial };
      }
      case 'monthly': {
        const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                       (endDate.getMonth() - startDate.getMonth());
        const full = months + 1;
        const hasPartial = endDate.getDate() !== startDate.getDate();
        return { full, hasPartial };
      }
      default:
        return { full: 0, hasPartial: false };
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = recurringIncomes.findIndex((i) => i.id === active.id);
      const newIndex = recurringIncomes.findIndex((i) => i.id === over.id);
      reorderRecurringIncomes(oldIndex, newIndex);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Recurring Income</h3>
        <button
          onClick={addRecurringIncome}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/80 hover:shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>

      {recurringIncomes.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No recurring income added yet.
        </p>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={recurringIncomes.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {recurringIncomes.map((income) => {
            const isOutOfRange = isIncomeOutOfRange(income.startDate, income.endDate);
            return (
            <SortableItem key={income.id} id={income.id} enabled={income.enabled !== false} onToggleEnabled={() => updateRecurringIncome(income.id, { enabled: income.enabled === false })} className={isOutOfRange ? 'border-2 border-red-500 bg-orange-100' : ''}
              onMouseEnter={() => setHoveredIncomeId(income.id)}
              onMouseLeave={() => { setHoveredIncomeId(null); clearHighlight(); }}
            >
              <div className="flex items-center gap-2">
                <EditableLabel
                  value={income.label}
                  onChange={(val) => updateRecurringIncome(income.id, { label: val })}
                  placeholder="Income label"
                  className="flex-1"
                />
                <button
                  onClick={() => removeRecurringIncome(income.id)}
                  className="text-muted-foreground hover:text-destructive hover:bg-red-100 rounded-md transition-all p-1 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    Hours/week
                  </label>
                  <DebouncedNumberInput
                    value={income.hoursPerWeek}
                    onChange={(val) => updateRecurringIncome(income.id, { hoursPerWeek: val })}
                    min={0}
                    step="1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    Hourly rate ($)
                  </label>
                  <DebouncedNumberInput
                    value={income.hourlyRate}
                    onChange={(val) => updateRecurringIncome(income.id, { hourlyRate: val })}
                    min={0}
                    step="0.50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    Pay frequency
                  </label>
                  <select
                    value={income.frequency}
                    onChange={(e) =>
                      updateRecurringIncome(income.id, { frequency: e.target.value as PayFrequency, endDate: undefined })
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    Pay date anchor
                    <Tooltip content="Enter a known past or upcoming paycheck date to anchor the pay schedule. For a current job, your most recent pay date works. For a future job, enter the expected first paycheck date." />
                  </label>
                  <input
                    type="date"
                    value={income.startDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      const updates: Partial<typeof income> = { startDate: newStart };
                      // Clear end date if it would be before the new start date
                      if (income.endDate && newStart > income.endDate) {
                        updates.endDate = undefined;
                      }
                      updateRecurringIncome(income.id, updates);
                    }}
                    className="w-full rounded-md border border-input bg-background px-1 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    End date (optional)
                    <Tooltip content="The last day of this job. If it doesn't fall on a regular payday, a partial paycheck will be calculated automatically." />
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={income.endDate || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        updateRecurringIncome(income.id, { endDate: value || undefined });
                      }}
                      min={income.startDate}
                      className={`w-full rounded-md border border-input bg-background px-1 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${income.endDate ? 'pr-7' : ''}`}
                    />
                    {income.endDate && (
                      <button
                        type="button"
                        onClick={() => updateRecurringIncome(income.id, { endDate: undefined })}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors z-10"
                        title="Clear end date"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {income.endDate && (() => {
                    const { full, hasPartial } = countPaychecks(income.startDate, income.endDate, income.frequency);
                    return (
                      <p className="text-xs text-muted-foreground mt-1">
                        {full} paycheck{full !== 1 ? 's' : ''}{hasPartial ? ' + partial' : ''} included
                      </p>
                    );
                  })()}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                ≈ ${(income.hoursPerWeek * income.hourlyRate * (income.frequency === 'biweekly' ? 2 : income.frequency === 'monthly' ? 52 / 12 : 1)).toFixed(0)}{' '}
                per {income.frequency === 'biweekly' ? '2 weeks' : income.frequency}
              </p>
            </SortableItem>
            );
          })}
        </SortableContext>
      </DndContext>
    </div>
  );
}
