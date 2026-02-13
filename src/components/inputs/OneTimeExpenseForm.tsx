import { useBudgetStore } from '@/store/budgetStore';
import { Plus, Trash2 } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { EditableLabel } from './EditableLabel';
import { DebouncedNumberInput } from './DebouncedNumberInput';
import { SortableItem } from './SortableItem';
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

export function OneTimeExpenseForm() {
  const {
    oneTimeExpenses,
    addOneTimeExpense,
    updateOneTimeExpense,
    removeOneTimeExpense,
    reorderOneTimeExpenses,
    projectionMonths,
  } = useBudgetStore();

  const minDate = format(new Date(), 'yyyy-MM-dd');
  const maxDate = format(addMonths(new Date(), projectionMonths), 'yyyy-MM-dd');

  const isDateOutOfRange = (dateStr: string) => {
    return dateStr < minDate || dateStr > maxDate;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = oneTimeExpenses.findIndex((e) => e.id === active.id);
      const newIndex = oneTimeExpenses.findIndex((e) => e.id === over.id);
      reorderOneTimeExpenses(oldIndex, newIndex);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">One-Time Expenses</h3>
        <button
          onClick={addOneTimeExpense}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/80 hover:shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>

      {oneTimeExpenses.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No one-time expenses. Add items like tuition, a new laptop, etc.
        </p>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={oneTimeExpenses.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          {oneTimeExpenses.map((expense) => {
            const isOutOfRange = isDateOutOfRange(expense.date);
            return (
            <SortableItem key={expense.id} id={expense.id} className={isOutOfRange ? 'border-2 border-red-500 bg-orange-100' : ''}>
              <div className="flex items-center gap-2">
                <EditableLabel
                  value={expense.label}
                  onChange={(val) =>
                    updateOneTimeExpense(expense.id, { label: val })
                  }
                  placeholder="Description"
                  className="flex-1"
                />
                <button
                  onClick={() => removeOneTimeExpense(expense.id)}
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
                      updateOneTimeExpense(expense.id, { amount: val })
                    }
                    min={0}
                    step="100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={expense.date}
                    onChange={(e) =>
                      updateOneTimeExpense(expense.id, { date: e.target.value })
                    }
                    min={minDate}
                    max={maxDate}
                    className="w-full rounded-md border border-input bg-background px-1 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </SortableItem>
            );
          })}
        </SortableContext>
      </DndContext>
    </div>
  );
}
