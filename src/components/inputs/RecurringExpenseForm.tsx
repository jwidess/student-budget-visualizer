import { useCallback } from 'react';
import { useBudgetStore } from '@/store/budgetStore';
import { Plus, Trash2 } from 'lucide-react';
import { EditableLabel } from './EditableLabel';
import { DebouncedNumberInput } from './DebouncedNumberInput';
import { SortableItem } from './SortableItem';
import { Tooltip } from '@/components/Tooltip';
import { useHoverHighlightStore } from '@/store/hoverHighlightStore';
import { format, addMonths, addDays, startOfDay, differenceInCalendarDays, getDate } from 'date-fns';
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

export function RecurringExpenseForm() {
  const {
    recurringExpenses,
    addRecurringExpense,
    updateRecurringExpense,
    removeRecurringExpense,
    reorderRecurringExpenses,
    projectionMonths,
  } = useBudgetStore();

  const setHighlight = useHoverHighlightStore((s) => s.setHighlight);
  const clearHighlight = useHoverHighlightStore((s) => s.clearHighlight);

  /** Compute all dates a recurring expense fires on within the projection range. */
  const computeExpenseDates = useCallback((dayOfMonth: number): string[] => {
    const today = startOfDay(new Date());
    const end = startOfDay(addMonths(today, projectionMonths));
    const totalDays = differenceInCalendarDays(end, today);
    const dates: string[] = [];
    for (let i = 0; i <= totalDays; i++) {
      const d = addDays(today, i);
      if (getDate(d) === dayOfMonth) dates.push(format(d, 'yyyy-MM-dd'));
    }
    return dates;
  }, [projectionMonths]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = recurringExpenses.findIndex((e) => e.id === active.id);
      const newIndex = recurringExpenses.findIndex((e) => e.id === over.id);
      reorderRecurringExpenses(oldIndex, newIndex);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Monthly Expenses</h3>
        <button
          onClick={addRecurringExpense}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/80 hover:shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>

      {recurringExpenses.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No recurring expenses added yet.
        </p>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={recurringExpenses.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          {recurringExpenses.map((expense) => (
            <SortableItem key={expense.id} id={expense.id} enabled={expense.enabled !== false} onToggleEnabled={() => updateRecurringExpense(expense.id, { enabled: expense.enabled === false })}
              onMouseEnter={() => setHighlight({ itemId: expense.id, type: 'expense', dates: computeExpenseDates(expense.dayOfMonth) })}
              onMouseLeave={clearHighlight}
            >
              <div className="flex items-center gap-2">
                <EditableLabel
                  value={expense.label}
                  onChange={(val) => updateRecurringExpense(expense.id, { label: val })}
                  placeholder="Expense name"
                  className="flex-1"
                />
                <button
                  onClick={() => removeRecurringExpense(expense.id)}
                  className="text-muted-foreground hover:text-destructive hover:bg-red-100 rounded-md transition-all p-1 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    Amount ($)
                  </label>
                  <DebouncedNumberInput
                    value={expense.amount}
                    onChange={(val) =>
                      updateRecurringExpense(expense.id, { amount: val })
                    }
                    min={0}
                    step="10"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    Day (1-28)
                    <Tooltip content="Day of the month when this expense is due" />
                  </label>
                  <DebouncedNumberInput
                    value={expense.dayOfMonth}
                    onChange={(val) =>
                      updateRecurringExpense(expense.id, { dayOfMonth: val })
                    }
                    min={1}
                    max={28}
                  />
                </div>
              </div>
            </SortableItem>
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
