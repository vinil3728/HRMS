import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Attendance } from './entities/attendance.entity';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { AttendanceResponseDto } from './dto/attendance-response.dto';
import { AttendanceSummaryResponseDto } from './dto/attendance-summary-response.dto';
import { AttendanceStatus } from './enums/attendance-status.enum';

import { formatInTimeZone } from 'date-fns-tz';
import { EmployeeService } from '../employees/services/employee.service';

@Injectable()
export class AttendanceService {
  private readonly expectedCheckInHour = 9;
  private readonly expectedCheckInMinute = 30;

  private readonly expectedCheckOutHour = 18;
  private readonly expectedCheckOutMinute = 30;

  private readonly INDIA_TIMEZONE = 'Asia/Kolkata';

  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,

    private readonly employeeService: EmployeeService,
  ) {}

  async create(
    employeeId: string,
    dto: CreateAttendanceDto,
  ): Promise<Attendance> {
    const employee =
      await this.employeeService.findOne(employeeId);

    const existing =
      await this.attendanceRepository.findOne({
        where: {
          employee: { id: employeeId },
          attendanceDate: new Date(dto.attendanceDate),
        },
      });

    if (existing) {
      throw new ConflictException(
        'Attendance already exists for this employee on this date',
      );
    }

    const checkIn = dto.checkIn
      ? new Date(dto.checkIn)
      : null;

    const checkOut = dto.checkOut
      ? new Date(dto.checkOut)
      : null;

    const workingHours =
      this.calculateWorkingHours(
        checkIn,
        checkOut,
      );

    const attendance =
      this.attendanceRepository.create({
        employee,
        attendanceDate: new Date(
          dto.attendanceDate,
        ),
        checkIn,
        checkOut,
        status: dto.status,
        workingHours,
        remarks: dto.remarks ?? null,
      });

    return this.attendanceRepository.save(
      attendance,
    );
  }

  async findAll(
    employeeId: string,
    query: AttendanceQueryDto,
  ): Promise<AttendanceResponseDto> {
    await this.employeeService.findOne(employeeId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const queryBuilder =
      this.attendanceRepository
        .createQueryBuilder('attendance')
        .leftJoinAndSelect(
          'attendance.employee',
          'employee',
        )
        .where(
          'employee.id = :employeeId',
          {
            employeeId,
          },
        );

    if (query.fromDate) {
      queryBuilder.andWhere(
        'attendance.attendance_date >= :fromDate',
        {
          fromDate: query.fromDate,
        },
      );
    }

    if (query.toDate) {
      queryBuilder.andWhere(
        'attendance.attendance_date <= :toDate',
        {
          toDate: query.toDate,
        },
      );
    }

    if (query.status) {
      queryBuilder.andWhere(
        'attendance.status = :status',
        {
          status: query.status,
        },
      );
    }

    queryBuilder
      .orderBy(
        'attendance.attendance_date',
        'DESC',
      )
      .skip(skip)
      .take(limit);

    const [attendance, total] =
      await queryBuilder.getManyAndCount();

    return {
      data: attendance,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(
    employeeId: string,
    attendanceId: string,
  ): Promise<Attendance> {
    const attendance =
      await this.attendanceRepository.findOne({
        where: {
          id: attendanceId,
          employee: {
            id: employeeId,
          },
        },
        relations: {
          employee: true,
        },
      });

    if (!attendance) {
      throw new NotFoundException(
        'Attendance record not found',
      );
    }

    return attendance;
  }

  async update(
    employeeId: string,
    attendanceId: string,
    dto: UpdateAttendanceDto,
  ): Promise<Attendance> {
    const attendance =
      await this.findOne(
        employeeId,
        attendanceId,
      );

    if (dto.attendanceDate) {
      const newDate =
        new Date(dto.attendanceDate);

      const duplicate =
        await this.attendanceRepository.findOne({
          where: {
            employee: {
              id: employeeId,
            },
            attendanceDate: newDate,
          },
        });

      if (
        duplicate &&
        duplicate.id !== attendanceId
      ) {
        throw new ConflictException(
          'Attendance already exists for this employee on this date',
        );
      }

      attendance.attendanceDate = newDate;
    }

    if (dto.checkIn !== undefined) {
      attendance.checkIn = dto.checkIn
        ? new Date(dto.checkIn)
        : null;
    }

    if (dto.checkOut !== undefined) {
      attendance.checkOut = dto.checkOut
        ? new Date(dto.checkOut)
        : null;
    }

    if (dto.status !== undefined) {
      attendance.status = dto.status;
    }

    if (dto.remarks !== undefined) {
      attendance.remarks = dto.remarks;
    }

    attendance.workingHours =
      this.calculateWorkingHours(
        attendance.checkIn,
        attendance.checkOut,
      );

    return this.attendanceRepository.save(
      attendance,
    );
  }

  async remove(
    employeeId: string,
    attendanceId: string,
  ): Promise<{ message: string }> {
    const attendance =
      await this.findOne(
        employeeId,
        attendanceId,
      );

    await this.attendanceRepository.remove(
      attendance,
    );

    return {
      message: 'Attendance deleted successfully',
    };
  }

  private calculateWorkingHours(
    checkIn: Date | null,
    checkOut: Date | null,
  ): number | null {
    if (!checkIn || !checkOut) {
      return null;
    }

    const milliseconds =
      checkOut.getTime() - checkIn.getTime();

    if (milliseconds <= 0) {
      throw new ConflictException(
        'Check-out time must be after check-in time',
      );
    }

    const hours =
      milliseconds / (1000 * 60 * 60);

    return Number(hours.toFixed(2));
  }

  async getMonthlySummary(
    employeeId: string,
    month: string,
  ): Promise<AttendanceSummaryResponseDto> {
    await this.employeeService.findOne(employeeId);

    if (
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)
    ) {
      throw new BadRequestException(
        'Month must be in YYYY-MM format',
      );
    }

    const [year, monthNumber] =
      month.split('-').map(Number);

    const startDate = new Date(
      Date.UTC(
        year,
        monthNumber - 1,
        1,
      ),
    );

    const endDate = new Date(
      Date.UTC(
        year,
        monthNumber,
        1,
      ),
    );

    const records =
      await this.attendanceRepository
        .createQueryBuilder('attendance')
        .where(
          'attendance.employee_id = :employeeId',
          {
            employeeId,
          },
        )
        .andWhere(
          'attendance.attendance_date >= :startDate',
          {
            startDate:
              startDate
                .toISOString()
                .slice(0, 10),
          },
        )
        .andWhere(
          'attendance.attendance_date < :endDate',
          {
            endDate:
              endDate
                .toISOString()
                .slice(0, 10),
          },
        )
        .getMany();

    const summary = {
      present: 0,
      absent: 0,
      halfDay: 0,
      leave: 0,
      holiday: 0,
      weekOff: 0,
      totalWorkingHours: 0,
    };

    for (const record of records) {
      switch (record.status) {
        case AttendanceStatus.PRESENT:
          summary.present++;
          break;

        case AttendanceStatus.ABSENT:
          summary.absent++;
          break;

        case AttendanceStatus.HALF_DAY:
          summary.halfDay++;
          break;

        case AttendanceStatus.LEAVE:
          summary.leave++;
          break;

        case AttendanceStatus.HOLIDAY:
          summary.holiday++;
          break;

        case AttendanceStatus.WEEK_OFF:
          summary.weekOff++;
          break;
      }

      if (record.workingHours) {
        summary.totalWorkingHours +=
          Number(record.workingHours);
      }
    }

    return {
      month,
      totalDays: records.length,
      present: summary.present,
      absent: summary.absent,
      halfDay: summary.halfDay,
      leave: summary.leave,
      holiday: summary.holiday,
      weekOff: summary.weekOff,
      totalWorkingHours: Number(
        summary.totalWorkingHours.toFixed(2),
      ),
    };
  }

  async checkIn(
    employeeId: string,
  ): Promise<Attendance> {
    const employee =
      await this.employeeService.findOne(
        employeeId,
      );

    const now = new Date();
    const today =
      this.getCurrentIndiaDate();

    const existing =
      await this.attendanceRepository.findOne({
        where: {
          employee: {
            id: employeeId,
          },
          attendanceDate: new Date(today),
        },
      });

    if (existing) {
      throw new ConflictException(
        'Attendance already exists for today',
      );
    }

    const attendance =
      this.attendanceRepository.create({
        employee,
        attendanceDate: new Date(today),
        checkIn: now,
        checkOut: null,
        status: AttendanceStatus.PRESENT,
        workingHours: null,
        remarks: null,
        isLate: this.isLate(now),
        isEarlyCheckout: false,
      });

    return this.attendanceRepository.save(
      attendance,
    );
  }

  async checkOut(
    employeeId: string,
  ): Promise<Attendance> {
    await this.employeeService.findOne(
      employeeId,
    );

    const now = new Date();
    const today =
      this.getCurrentIndiaDate();

    const attendance =
      await this.attendanceRepository.findOne({
        where: {
          employee: {
            id: employeeId,
          },
          attendanceDate: new Date(today),
        },
      });

    if (!attendance) {
      throw new NotFoundException(
        'No attendance record found for today. Please check in first',
      );
    }

    if (!attendance.checkIn) {
      throw new ConflictException(
        'Employee has not checked in today',
      );
    }

    if (attendance.checkOut) {
      throw new ConflictException(
        'Employee has already checked out today',
      );
    }

    attendance.checkOut = now;

    attendance.isEarlyCheckout =
      this.isEarlyCheckout(now);

    attendance.workingHours =
      this.calculateWorkingHours(
        attendance.checkIn,
        attendance.checkOut,
      );

    return this.attendanceRepository.save(
      attendance,
    );
  }

  private getCurrentIndiaDate(): string {
    return formatInTimeZone(
      new Date(),
      this.INDIA_TIMEZONE,
      'yyyy-MM-dd',
    );
  }

  private isLate(checkIn: Date): boolean {
    const hour = Number(
      formatInTimeZone(
        checkIn,
        this.INDIA_TIMEZONE,
        'HH',
      ),
    );

    const minute = Number(
      formatInTimeZone(
        checkIn,
        this.INDIA_TIMEZONE,
        'mm',
      ),
    );

    return (
      hour > this.expectedCheckInHour ||
      (
        hour === this.expectedCheckInHour &&
        minute > this.expectedCheckInMinute
      )
    );
  }

  private isEarlyCheckout(
    checkOut: Date,
  ): boolean {
    const hour = Number(
      formatInTimeZone(
        checkOut,
        this.INDIA_TIMEZONE,
        'HH',
      ),
    );

    const minute = Number(
      formatInTimeZone(
        checkOut,
        this.INDIA_TIMEZONE,
        'mm',
      ),
    );

    return (
      hour < this.expectedCheckOutHour ||
      (
        hour === this.expectedCheckOutHour &&
        minute < this.expectedCheckOutMinute
      )
    );
  }
}

