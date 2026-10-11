import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, of, tap, throwError } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { AuthResponse, LoginRequest, StoredSession } from '../models/auth.model';
import { User } from '../models/user.model';

const STORAGE_KEY = 'treasurex_session';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly currentUser = signal<User | null>(this.loadStoredUser());
  readonly accessToken = signal<string | null>(this.loadStoredAccessToken());
  readonly refreshToken = signal<string | null>(this.loadStoredRefreshToken());

  readonly isAuthenticated = computed(() => !!this.accessToken() && !!this.currentUser());
  readonly userRole = computed(() => this.currentUser()?.role ?? null);
  readonly userPermissions = computed(() => this.currentUser()?.permissions ?? []);

  private loadSession(): StoredSession | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return null;
      return JSON.parse(data) as StoredSession;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  private loadStoredUser(): User | null {
    return this.loadSession()?.user ?? null;
  }

  private loadStoredAccessToken(): string | null {
    return this.loadSession()?.accessToken ?? null;
  }

  private loadStoredRefreshToken(): string | null {
    return this.loadSession()?.refreshToken ?? null;
  }

  private persistSession(authResponse: AuthResponse): void {
    const expiresAt = Date.now() + authResponse.expiresIn * 1000;
    const session: StoredSession = {
      accessToken: authResponse.accessToken,
      refreshToken: authResponse.refreshToken,
      user: authResponse.user,
      expiresAt,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));

    this.accessToken.set(session.accessToken);
    this.refreshToken.set(session.refreshToken);
    this.currentUser.set(session.user);
  }

  private clearSession(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.accessToken.set(null);
    this.refreshToken.set(null);
    this.currentUser.set(null);
  }

  getAccessToken(): string | null {
    return this.accessToken();
  }

  getRefreshToken(): string | null {
    return this.refreshToken();
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.auth.login}`;
    return this.http.post<AuthResponse>(url, credentials).pipe(
      tap((response) => {
        this.persistSession(response);
      })
    );
  }

  refreshTokenCall(): Observable<AuthResponse> {
    const refresh = this.getRefreshToken();
    if (!refresh) {
      this.clearSession();
      return throwError(() => new Error('No refresh token available'));
    }

    const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.auth.refresh}`;
    return this.http.post<AuthResponse>(url, { refreshToken: refresh }).pipe(
      tap((response) => {
        this.persistSession(response);
      }),
      catchError((error) => {
        this.clearSession();
        this.router.navigate(['/auth/login']);
        return throwError(() => error);
      })
    );
  }

  logout(): Observable<unknown> {
    const refresh = this.getRefreshToken();
    const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.auth.logout}`;

    const finalize = () => {
      this.clearSession();
      this.router.navigate(['/auth/login']);
    };

    if (!refresh) {
      finalize();
      return of(null);
    }

    return this.http.post(url, { refreshToken: refresh }).pipe(
      tap(() => finalize()),
      catchError(() => {
        finalize();
        return of(null);
      })
    );
  }

  changePassword(
    currentPassword: string,
    newPassword: string
  ): Observable<{ message: string }> {
    const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.auth.changePassword}`;
    return this.http.post<{ message: string }>(url, {
      currentPassword,
      newPassword,
    });
  }
}
