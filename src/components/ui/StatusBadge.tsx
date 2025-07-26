import { getStatusColor } from '../../utils/status';
import { RepairTransfer } from '../../types';

interface StatusBadgeProps {
  status: RepairTransfer['status'];
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
        status
      )} ${className}`}
    >
      {status}
    </span>
  );
}