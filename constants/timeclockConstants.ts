export type EmployeeClockStatus = 'clocked_in' | 'clocked_out' | 'on_break';

export const getStatusColor = (status: EmployeeClockStatus): string => {
  const colors: Record<EmployeeClockStatus, string> = {
    clocked_in: '#10B981',
    clocked_out: '#6B7280',
    on_break: '#F59E0B',
  };
  return colors[status] || '#6B7280';
};

export const getStatusLabel = (status: EmployeeClockStatus): string => {
  const labels: Record<EmployeeClockStatus, string> = {
    clocked_in: 'Clocked In',
    clocked_out: 'Clocked Out',
    on_break: 'On Break',
  };
  return labels[status] || status;
};

export const getStatusIcon = (status: EmployeeClockStatus): string => {
  const icons: Record<EmployeeClockStatus, string> = {
    clocked_in: 'CheckCircle',
    clocked_out: 'XCircle',
    on_break: 'Coffee',
  };
  return icons[status] || 'Circle';
};

export type ClockMethod = 'qr_code' | 'employee_number' | 'facial_recognition' | 'badge' | 'manual';

export const CLOCK_METHOD_LABELS: Record<ClockMethod, string> = {
  qr_code: 'QR Code',
  employee_number: 'Employee Number',
  facial_recognition: 'Facial Recognition',
  badge: 'Badge Scan',
  manual: 'Manual Entry',
};
