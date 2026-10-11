import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { API_CONFIG } from '../config/api.config';
import { AppNotification } from '../models/notification.model';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

interface RawLeave {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: string;
  rejectionReason?: string;
  updatedAt?: string;
  createdAt?: string;
}

interface RawLeaveResponse {
  data: RawLeave[];
}

interface RawReimbursement {
  id: string;
  category: string;
  amount: number | string;
  status: string;
  rejectionReason?: string;
  updatedAt?: string;
  createdAt?: string;
}

interface RawTimesheet {
  id: string;
  weekStartDate: string;
  totalHours: number | string;
  status: string;
  rejectionReason?: string;
  updatedAt?: string;
  createdAt?: string;
}

interface RawPolicy {
  id: string;
  title: string;
  status: string;
  publishedAt?: string;
  createdAt?: string;
}

interface RawPolicyAck {
  policy: { id: string };
}

interface RawCycle {
  id: string;
  name: string;
  status: string;
  startDate?: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly api = inject(ApiService);
  private readonly authService = inject(AuthService);

  readonly notifications = signal<AppNotification[]>([]);
  readonly isLoading = signal<boolean>(false);

  readonly unreadCount = computed<number>(
    () => this.notifications().filter((n) => !n.read).length
  );

  private getReadIds(userId: string): Set<string> {
    try {
      const raw = localStorage.getItem(`hrms_read_notifications_${userId}`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  }

  private saveReadIds(userId: string, ids: Set<string>): void {
    try {
      localStorage.setItem(
        `hrms_read_notifications_${userId}`,
        JSON.stringify([...ids])
      );
    } catch {
      // Storage unavailable or quota exceeded
    }
  }

  loadNotifications(): void {
    const user = this.authService.currentUser();
    const employeeId = user?.employeeId;
    const userId = user?.id || 'guest';

    if (!employeeId) {
      this.notifications.set([]);
      return;
    }

    this.isLoading.set(true);
    const readIds = this.getReadIds(userId);

    forkJoin({
      leaves: this.api
        .get<RawLeaveResponse>(API_CONFIG.endpoints.leaves.base(employeeId))
        .pipe(catchError(() => of({ data: [] as RawLeave[] }))),
      reimbursements: this.api
        .get<RawReimbursement[]>(
          API_CONFIG.endpoints.reimbursements.base(employeeId)
        )
        .pipe(catchError(() => of([] as RawReimbursement[]))),
      timesheets: this.api
        .get<RawTimesheet[]>(API_CONFIG.endpoints.timesheets.base(employeeId))
        .pipe(catchError(() => of([] as RawTimesheet[]))),
      policies: this.api
        .get<RawPolicy[]>(API_CONFIG.endpoints.policies.base)
        .pipe(catchError(() => of([] as RawPolicy[]))),
      policyAcks: this.api
        .get<RawPolicyAck[]>(
          API_CONFIG.endpoints.policies.acknowledgements.employee(employeeId)
        )
        .pipe(catchError(() => of([] as RawPolicyAck[]))),
      cycles: this.api
        .get<RawCycle[]>(API_CONFIG.endpoints.performance.cycles)
        .pipe(catchError(() => of([] as RawCycle[]))),
    }).subscribe({
      next: ({ leaves, reimbursements, timesheets, policies, policyAcks, cycles }) => {
        const list: AppNotification[] = [];
        const ackedPolicyIds = new Set(
          (policyAcks || []).map((a) => a.policy?.id).filter(Boolean)
        );

        // 1. Leaves
        const leaveItems = Array.isArray(leaves) ? leaves : leaves?.data || [];
        for (const l of leaveItems) {
          const rawDate = new Date(l.updatedAt || l.createdAt || Date.now());
          if (l.status === 'APPROVED') {
            const notifId = `leave-approved-${l.id}`;
            list.push({
              id: notifId,
              type: 'LEAVE',
              title: 'Leave Approved',
              message: `Your ${l.leaveType} leave (${l.startDate} to ${l.endDate}) was approved.`,
              timestamp: this.formatRelativeTime(rawDate),
              rawDate,
              read: readIds.has(notifId),
              route: '/leaves',
              icon: 'check-circle',
              variant: 'success',
            });
          } else if (l.status === 'REJECTED') {
            const notifId = `leave-rejected-${l.id}`;
            list.push({
              id: notifId,
              type: 'LEAVE',
              title: 'Leave Rejected',
              message: `Your ${l.leaveType} leave was rejected${l.rejectionReason ? ': ' + l.rejectionReason : '.'}`,
              timestamp: this.formatRelativeTime(rawDate),
              rawDate,
              read: readIds.has(notifId),
              route: '/leaves',
              icon: 'alert-circle',
              variant: 'error',
            });
          }
        }

        // 2. Reimbursements
        for (const r of reimbursements || []) {
          const rawDate = new Date(r.updatedAt || r.createdAt || Date.now());
          if (r.status === 'APPROVED') {
            const notifId = `claim-approved-${r.id}`;
            list.push({
              id: notifId,
              type: 'REIMBURSEMENT',
              title: 'Claim Approved',
              message: `Your ₹${Number(r.amount).toLocaleString('en-IN')} ${r.category} claim was approved.`,
              timestamp: this.formatRelativeTime(rawDate),
              rawDate,
              read: readIds.has(notifId),
              route: '/reimbursements',
              icon: 'receipt',
              variant: 'info',
            });
          } else if (r.status === 'PAID') {
            const notifId = `claim-paid-${r.id}`;
            list.push({
              id: notifId,
              type: 'REIMBURSEMENT',
              title: 'Claim Reimbursed',
              message: `Your ₹${Number(r.amount).toLocaleString('en-IN')} claim has been reimbursed.`,
              timestamp: this.formatRelativeTime(rawDate),
              rawDate,
              read: readIds.has(notifId),
              route: '/reimbursements',
              icon: 'dollar',
              variant: 'success',
            });
          } else if (r.status === 'REJECTED') {
            const notifId = `claim-rejected-${r.id}`;
            list.push({
              id: notifId,
              type: 'REIMBURSEMENT',
              title: 'Claim Rejected',
              message: `Your ₹${Number(r.amount).toLocaleString('en-IN')} claim was rejected${r.rejectionReason ? ': ' + r.rejectionReason : '.'}`,
              timestamp: this.formatRelativeTime(rawDate),
              rawDate,
              read: readIds.has(notifId),
              route: '/reimbursements',
              icon: 'alert-circle',
              variant: 'error',
            });
          }
        }

        // 3. Timesheets
        for (const t of timesheets || []) {
          const rawDate = new Date(t.updatedAt || t.createdAt || Date.now());
          if (t.status === 'APPROVED') {
            const notifId = `timesheet-approved-${t.id}`;
            list.push({
              id: notifId,
              type: 'TIMESHEET',
              title: 'Timesheet Approved',
              message: `Your timesheet for week ${t.weekStartDate} (${t.totalHours} hrs) was approved.`,
              timestamp: this.formatRelativeTime(rawDate),
              rawDate,
              read: readIds.has(notifId),
              route: '/timesheets',
              icon: 'clock',
              variant: 'success',
            });
          } else if (t.status === 'REJECTED') {
            const notifId = `timesheet-rejected-${t.id}`;
            list.push({
              id: notifId,
              type: 'TIMESHEET',
              title: 'Timesheet Rejected',
              message: `Your timesheet for week ${t.weekStartDate} was rejected${t.rejectionReason ? ': ' + t.rejectionReason : '.'}`,
              timestamp: this.formatRelativeTime(rawDate),
              rawDate,
              read: readIds.has(notifId),
              route: '/timesheets',
              icon: 'alert-circle',
              variant: 'error',
            });
          }
        }

        // 4. Policies Awaiting Acknowledgment
        for (const p of policies || []) {
          if (p.status === 'PUBLISHED' && !ackedPolicyIds.has(p.id)) {
            const notifId = `policy-unacked-${p.id}`;
            const rawDate = new Date(p.publishedAt || p.createdAt || Date.now());
            list.push({
              id: notifId,
              type: 'POLICY',
              title: 'Policy Acknowledgment Required',
              message: `New company policy "${p.title}" requires your acknowledgment.`,
              timestamp: this.formatRelativeTime(rawDate),
              rawDate,
              read: readIds.has(notifId),
              route: '/policies',
              icon: 'file-text',
              variant: 'warning',
            });
          }
        }

        // 5. Active Appraisal Cycles
        for (const c of cycles || []) {
          if (c.status === 'OPEN') {
            const notifId = `cycle-open-${c.id}`;
            const rawDate = new Date(c.startDate || Date.now());
            list.push({
              id: notifId,
              type: 'PERFORMANCE',
              title: 'Appraisal Cycle Active',
              message: `Appraisal cycle "${c.name}" is open for goals and self-evaluations.`,
              timestamp: this.formatRelativeTime(rawDate),
              rawDate,
              read: readIds.has(notifId),
              route: '/performance',
              icon: 'target',
              variant: 'info',
            });
          }
        }

        // Sort: unread first, then newest date
        list.sort((a, b) => {
          if (a.read !== b.read) return a.read ? 1 : -1;
          return b.rawDate.getTime() - a.rawDate.getTime();
        });

        this.notifications.set(list);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  markAsRead(notificationId: string): void {
    const user = this.authService.currentUser();
    const userId = user?.id || 'guest';
    const readIds = this.getReadIds(userId);
    readIds.add(notificationId);
    this.saveReadIds(userId, readIds);

    this.notifications.update((list) =>
      list.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  }

  markAllAsRead(): void {
    const user = this.authService.currentUser();
    const userId = user?.id || 'guest';
    const readIds = this.getReadIds(userId);

    const current = this.notifications();
    for (const n of current) {
      readIds.add(n.id);
    }
    this.saveReadIds(userId, readIds);

    this.notifications.update((list) =>
      list.map((n) => ({ ...n, read: true }))
    );
  }

  private formatRelativeTime(date: Date): string {
    if (isNaN(date.getTime())) return 'Recently';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'Just now';
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
