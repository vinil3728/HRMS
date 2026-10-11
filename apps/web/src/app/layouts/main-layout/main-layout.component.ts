import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { NAVIGATION_CONFIG } from '../../core/config/navigation.config';
import { AppNotification } from '../../core/models/notification.model';
import { AuthService } from '../../core/services/auth.service';
import { LayoutService } from '../../core/services/layout.service';
import { NotificationService } from '../../core/services/notification.service';
import { RbacService } from '../../core/services/rbac.service';
import { AvatarComponent } from '../../shared/ui/avatar/avatar.component';
import { BadgeComponent } from '../../shared/ui/badge/badge.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { Permission } from '../../core/models/permission.model';

import { AttendanceService } from '../../features/attendance/services/attendance.service';

@Component({
  selector: 'app-main-layout',
  imports: [
    CommonModule,
    RouterModule,
    IconComponent,
    AvatarComponent,
    BadgeComponent,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly rbacService = inject(RbacService);
  readonly layoutService = inject(LayoutService);
  readonly notifService = inject(NotificationService);
  readonly attendanceService = inject(AttendanceService);

  readonly Permission = Permission;
  private readonly router = inject(Router);

  readonly isUserDropdownOpen = signal<boolean>(false);
  readonly isNotificationDropdownOpen = signal<boolean>(false);
  readonly notificationFilter = signal<'ALL' | 'UNREAD'>('ALL');
  readonly attendanceFeedback = signal<string | null>(null);

  readonly todayAttendance = this.attendanceService.todayRecord;
  readonly isPunching = this.attendanceService.isCheckingInOut;

  readonly canPunchAttendance = computed(() => {
    const user = this.authService.currentUser();
    if (!user?.employeeId) return false;
    return (
      this.rbacService.hasPermission(Permission.ATTENDANCE_CHECK_IN) ||
      this.rbacService.hasPermission(Permission.ATTENDANCE_VIEW) ||
      this.rbacService.hasPermission(Permission.ATTENDANCE_CREATE)
    );
  });

  readonly unreadCount = this.notifService.unreadCount;
  readonly isLoadingNotifications = this.notifService.isLoading;

  readonly displayUserName = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return 'User';
    return user.username;
  });

  readonly displayUserRole = computed(() => {
    const user = this.authService.currentUser();
    return user?.employee?.designation?.name || user?.role || 'Team Member';
  });

  readonly filteredNavSections = computed(() => {
    return NAVIGATION_CONFIG.map((section) => ({
      title: section.title,
      items: section.items.filter((item) => {
        if (!item.permission) return true;
        return this.rbacService.hasPermission(item.permission);
      }),
    })).filter((section) => section.items.length > 0);
  });

  readonly filteredNotifications = computed<AppNotification[]>(() => {
    const all = this.notifService.notifications();
    if (this.notificationFilter() === 'UNREAD') {
      return all.filter((n) => !n.read);
    }
    return all;
  });

  ngOnInit(): void {
    this.notifService.loadNotifications();
    const empId = this.authService.currentUser()?.employeeId;
    if (empId) {
      this.attendanceService.loadTodayAttendance(empId);
    }
  }

  quickCheckIn(): void {
    const empId = this.authService.currentUser()?.employeeId;
    if (!empId || this.isPunching()) return;
    this.attendanceService.checkIn(empId).subscribe({
      next: () => {
        this.showAttendanceFeedback('Checked in successfully!');
      },
      error: (err) => {
        this.showAttendanceFeedback(err?.error?.message || 'Check-in failed');
      },
    });
  }

  quickCheckOut(): void {
    const empId = this.authService.currentUser()?.employeeId;
    if (!empId || this.isPunching()) return;
    this.attendanceService.checkOut(empId).subscribe({
      next: () => {
        this.showAttendanceFeedback('Checked out successfully!');
      },
      error: (err) => {
        this.showAttendanceFeedback(err?.error?.message || 'Check-out failed');
      },
    });
  }

  private showAttendanceFeedback(msg: string): void {
    this.attendanceFeedback.set(msg);
    setTimeout(() => {
      if (this.attendanceFeedback() === msg) {
        this.attendanceFeedback.set(null);
      }
    }, 4000);
  }

  formatTime(val: string | null | undefined): string {
    if (!val) return '';
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
    return val;
  }

  toggleNotificationDropdown(): void {
    const next = !this.isNotificationDropdownOpen();
    this.isNotificationDropdownOpen.set(next);
    if (next) {
      this.isUserDropdownOpen.set(false);
      this.notifService.loadNotifications();
    }
  }

  setNotificationFilter(filter: 'ALL' | 'UNREAD'): void {
    this.notificationFilter.set(filter);
  }

  markAllAsRead(): void {
    this.notifService.markAllAsRead();
  }

  onNotificationClick(notif: AppNotification): void {
    this.notifService.markAsRead(notif.id);
    this.isNotificationDropdownOpen.set(false);
    this.router.navigate([notif.route]);
  }

  toggleUserDropdown(): void {
    const next = !this.isUserDropdownOpen();
    this.isUserDropdownOpen.set(next);
    if (next) {
      this.isNotificationDropdownOpen.set(false);
    }
  }

  goToMyProfile(): void {
    this.isUserDropdownOpen.set(false);
    this.router.navigate(['/my-profile']);
  }

  goToSettings(): void {
    this.isUserDropdownOpen.set(false);
    this.isNotificationDropdownOpen.set(false);
    this.router.navigate(['/settings']);
  }

  goToChangePassword(): void {
    this.isUserDropdownOpen.set(false);
    this.router.navigate(['/my-profile'], { queryParams: { tab: 'security' } });
  }

  onSignOut(): void {
    this.isUserDropdownOpen.set(false);
    this.isNotificationDropdownOpen.set(false);
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/auth/login']);
      },
    });
  }
}
