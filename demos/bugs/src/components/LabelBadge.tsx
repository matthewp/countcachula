import { Label } from '../types';

interface LabelBadgeProps {
  label: Label;
  onRemove?: () => void;
}

export function LabelBadge({ label, onRemove }: LabelBadgeProps) {
  return (
    <span
      class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: label.color }}
    >
      {label.name}
      {onRemove && (
        <button
          onClick={onRemove}
          class="hover:opacity-75 ml-1"
          aria-label={`Remove ${label.name} label`}
        >
          ×
        </button>
      )}
    </span>
  );
}
