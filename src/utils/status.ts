import { RepairTransfer } from '../types';

export const STATUS_COLORS = {
  'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Received': 'bg-blue-100 text-blue-800 border-blue-200',
  'In Repair': 'bg-purple-100 text-purple-800 border-purple-200',
  'Done': 'bg-green-100 text-green-800 border-green-200',
  'Returned': 'bg-gray-100 text-gray-800 border-gray-200'
};

export const STATUS_ORDER = ['Pending', 'Received', 'In Repair', 'Done', 'Returned'] as const;

export const getStatusColor = (status: RepairTransfer['status']) => {
  return STATUS_COLORS[status] || 'bg-gray-100 text-gray-800 border-gray-200';
};

export const getNextStatus = (currentStatus: RepairTransfer['status']): RepairTransfer['status'] | null => {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  if (currentIndex === -1 || currentIndex === STATUS_ORDER.length - 1) {
    return null;
  }
  return STATUS_ORDER[currentIndex + 1];
};

export const canUpdateStatus = (userRole: string, currentStatus: RepairTransfer['status']) => {
  // HQ Staff can only create transfers (Pending status)
  if (userRole === 'HQ Staff') {
    return false;
  }
  
  // Technicians can update all statuses except create new ones
  if (userRole === 'Technician') {
    return currentStatus !== 'Pending';
  }
  
  // Admin can update any status
  if (userRole === 'Admin') {
    return true;
  }
  
  return false;
};

export const formatCurrency = (amount: number | undefined) => {
  if (!amount) return 'RM 0.00';
  return `RM ${amount.toFixed(2)}`;
};

export const formatDate = (dateString: string | undefined) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-MY');
};

export const formatDateTime = (dateString: string | undefined) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('en-MY');
};