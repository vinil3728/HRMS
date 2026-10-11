import { HttpErrorResponse, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  return next(req).pipe(
    catchError((error: unknown) => {
      let errorMessage = 'An unexpected error occurred';

      if (error instanceof HttpErrorResponse) {
        if (error.error?.message) {
          if (Array.isArray(error.error.message)) {
            errorMessage = error.error.message.join(', ');
          } else {
            errorMessage = error.error.message;
          }
        } else if (error.status === 0) {
          errorMessage = 'Unable to connect to the server. Please check your network or server status.';
        } else if (error.status === 403) {
          errorMessage = 'You do not have permission to perform this action.';
        } else if (error.status === 404) {
          errorMessage = 'The requested resource was not found.';
        } else if (error.status >= 500) {
          errorMessage = 'Internal server error. Please try again later.';
        }
      }

      // We re-throw with an enriched Error object containing friendly message
      const enrichedError = new Error(errorMessage);
      (enrichedError as unknown as { raw: unknown }).raw = error;
      return throwError(() => enrichedError);
    })
  );
};
