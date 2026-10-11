import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  CompanyHoliday,
  CreateHolidayDto,
  UpcomingHoliday,
  UpdateHolidayDto,
} from '../models/holiday.model';

@Injectable({
  providedIn: 'root',
})
export class HolidayService {
  private readonly api = inject(ApiService);

  /**
   * Fetch company holidays from the database with optional year and type filters.
   */
  getHolidays(year?: number, type?: string): Observable<CompanyHoliday[]> {
    let params = new HttpParams();
    if (year) {
      params = params.set('year', year.toString());
    }
    if (type && type !== 'ALL') {
      params = params.set('type', type);
    }
    return this.api.get<CompanyHoliday[]>('holidays', { params });
  }

  /**
   * Fetch a single company holiday by ID.
   */
  getHolidayById(id: string): Observable<CompanyHoliday> {
    return this.api.get<CompanyHoliday>(`holidays/${id}`);
  }

  /**
   * Create a new company holiday (Requires HOLIDAY_CREATE).
   */
  createHoliday(dto: CreateHolidayDto): Observable<CompanyHoliday> {
    return this.api.post<CompanyHoliday>('holidays', dto);
  }

  /**
   * Update an existing company holiday (Requires HOLIDAY_UPDATE).
   */
  updateHoliday(id: string, dto: UpdateHolidayDto): Observable<CompanyHoliday> {
    return this.api.patch<CompanyHoliday>(`holidays/${id}`, dto);
  }

  /**
   * Delete a company holiday (Requires HOLIDAY_DELETE).
   */
  deleteHoliday(id: string): Observable<{ success: boolean; message: string }> {
    return this.api.delete<{ success: boolean; message: string }>(`holidays/${id}`);
  }

  /**
   * Compute upcoming holidays dynamically from the database.
   */
  getUpcomingHolidays(limit: number = 4): Observable<UpcomingHoliday[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().substring(0, 10);
    const currentYear = today.getFullYear();

    return this.getHolidays(currentYear).pipe(
      map((holidays) => {
        const upcoming: UpcomingHoliday[] = [];

        for (const h of holidays) {
          if (h.date >= todayStr) {
            const hDate = new Date(`${h.date}T00:00:00`);
            const diffMs = hDate.getTime() - today.getTime();
            const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24));

            upcoming.push({
              ...h,
              daysUntil,
              isToday: daysUntil === 0,
            });
          }
        }

        upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
        return upcoming.slice(0, limit);
      })
    );
  }
}
