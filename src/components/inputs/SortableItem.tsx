import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff } from 'lucide-react';
import { useHoverHighlightStore } from '@/store/hoverHighlightStore';

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  /** Whether the item is enabled in the projection (default: true) */
  enabled?: boolean;
  /** Called when the user toggles the enabled state */
  onToggleEnabled?: () => void;
  /** Called when mouse enters this item (for chart highlight) */
  onMouseEnter?: () => void;
  /** Called when mouse leaves this item (for chart highlight) */
  onMouseLeave?: () => void;
}

export function SortableItem({ id, children, className = '', enabled = true, onToggleEnabled, onMouseEnter, onMouseLeave }: SortableItemProps) {
  const highlightId = useHoverHighlightStore((s) => s.highlight?.itemId);
  const isHighlighted = highlightId === id;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(
      transform ? { ...transform, x: 0 } : null
    ),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`rounded-lg border border-input p-4 space-y-3 bg-card transition-shadow duration-150 ${
        isDragging ? 'opacity-50 shadow-lg ring-2 ring-primary/30' : ''
      } ${!enabled ? 'sortable-item-disabled' : ''} ${
        isHighlighted ? 'ring-2 ring-amber-400 shadow-md shadow-amber-100' : ''
      } ${className}`}
    >
      <div className="flex items-start gap-1">
        {/* Grip handle + enable/disable toggle stacked vertically */}
        <div className="flex flex-col items-center gap-1 mt-1">
          <button
            type="button"
            className="cursor-grab touch-none rounded text-muted-foreground/50 hover:text-muted-foreground transition-colors active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4" />
          </button>
          {onToggleEnabled && (
            <button
              type="button"
              onClick={onToggleEnabled}
              className={`rounded p-0.5 transition-colors cursor-pointer ${
                enabled
                  ? 'text-muted-foreground/50 hover:text-muted-foreground'
                  : 'text-amber-500 hover:text-amber-600'
              }`}
              title={enabled ? 'Disable (exclude from projection)' : 'Enable (include in projection)'}
            >
              {enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          )}
        </div>
        <div className={`flex-1 min-w-0 ${!enabled ? 'pointer-events-none' : ''}`}>{children}</div>
      </div>
    </div>
  );
}
