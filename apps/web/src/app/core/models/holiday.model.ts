export type HolidayType = 'GAZETTED' | 'RESTRICTED' | 'COMPANY';

export interface CompanyHoliday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  type: HolidayType;
  description: string;
}

export interface UpcomingHoliday extends CompanyHoliday {
  daysUntil: number;
  isToday: boolean;
}

export interface CreateHolidayDto {
  name: string;
  date: string;
  dayOfWeek?: string;
  type: HolidayType;
  description?: string;
}

export interface UpdateHolidayDto {
  name?: string;
  date?: string;
  dayOfWeek?: string;
  type?: HolidayType;
  description?: string;
}

