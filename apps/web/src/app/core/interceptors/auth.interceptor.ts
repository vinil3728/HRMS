import { HttpErrorResponse, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

function addToken(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  // Skip adding token for auth login or refresh requests
  const isAuthEndpoint = req.url.includes('/auth/login') || req.url.includes('/auth/refresh');

  let authReq = req;
  if (token && !isAuthEndpoint) {
    authReq = addToken(req, token);
  }

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !isAuthEndpoint) {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return authService.refreshTokenCall().pipe(
            switchMap((response) => {
              isRefreshing = false;
              refreshTokenSubject.next(response.accessToken);
              return next(addToken(req, response.accessToken));
            }),
            catchError((refreshError) => {
              isRefreshing = false;
              refreshTokenSubject.next(null);
              return throwError(() => refreshError);
            })
          );
        } else {
          // Wait for token refresh to complete then replay
          return refreshTokenSubject.pipe(
            filter((newToken): newToken is string => newToken !== null),
            take(1),
            switchMap((newToken) => next(addToken(req, newToken)))
          );
        }
      }

      return throwError(() => error);
    })
  );
};
