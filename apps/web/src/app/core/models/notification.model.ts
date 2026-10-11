import { IconName } from '../../shared/ui/icon/icon.component';

export type NotificationType =
  | 'LEAVE'
  | 'REIMBURSEMENT'
  | 'TIMESHEET'
  | 'POLICY'
  | 'PERFORMANCE';

export type NotificationVariant = 'info' | 'success' | 'warning' | 'error';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  rawDate: Date;
  read: boolean;
  route: string;
  icon: IconName;
  variant: NotificationVariant;
}
