import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';

export interface RequestOptions {
  headers?: HttpHeaders | { [header: string]: string | string[] };
  params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> };
  responseType?: 'json';
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = API_CONFIG.baseUrl;

  private formatUrl(endpoint: string): string {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}${cleanEndpoint}`;
  }

  get<T>(endpoint: string, options?: RequestOptions): Observable<T> {
    return this.http.get<T>(this.formatUrl(endpoint), options);
  }

  post<T>(endpoint: string, body: unknown, options?: RequestOptions): Observable<T> {
    return this.http.post<T>(this.formatUrl(endpoint), body, options);
  }

  put<T>(endpoint: string, body: unknown, options?: RequestOptions): Observable<T> {
    return this.http.put<T>(this.formatUrl(endpoint), body, options);
  }

  patch<T>(endpoint: string, body: unknown, options?: RequestOptions): Observable<T> {
    return this.http.patch<T>(this.formatUrl(endpoint), body, options);
  }

  delete<T>(endpoint: string, options?: RequestOptions): Observable<T> {
    return this.http.delete<T>(this.formatUrl(endpoint), options);
  }

  getBlob(endpoint: string): Observable<Blob> {
    return this.http.get(this.formatUrl(endpoint), { responseType: 'blob' });
  }
}
