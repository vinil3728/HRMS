import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceRegularization } from './entities/attendance-regularization.entity';
import { Attendance } from './entities/attendance.entity';
import { AttendanceStatus } from './enums/attendance-status.enum';
import { RegularizationStatus } from './enums/regularization-status.enum';
import { CreateRegularizationDto } from './dto/create-regularization.dto';
import { RegularizationQueryDto } from './dto/regularization-query.dto';
import { EmployeeService } from '../employees/services/employee.service';

@Injectable()
export class AttendanceRegularizationService {
    constructor(
        @InjectRepository(AttendanceRegularization)
        private readonly regularizationRepo: Repository<AttendanceRegularization>,

        @InjectRepository(Attendance)
        private readonly attendanceRepo: Repository<Attendance>,

        private readonly employeeService: EmployeeService,
    ) {}

    private parseDateTime(dateStr: string, timeOrDateTime?: string): Date | null {
        if (!timeOrDateTime) return null;
        if (timeOrDateTime.includes('T')) {
            return new Date(timeOrDateTime);
        }
        // Format is HH:mm or HH:mm:ss
        return new Date(`${dateStr}T${timeOrDateTime.length === 5 ? timeOrDateTime + ':00' : timeOrDateTime}`);
    }

    async create(
        employeeId: string,
        dto: CreateRegularizationDto,
    ): Promise<AttendanceRegularization> {
        const employee = await this.employeeService.findOne(employeeId);

        const existingPending = await this.regularizationRepo.findOne({
            where: {
                employee: { id: employeeId },
                attendanceDate: dto.attendanceDate,
                status: RegularizationStatus.PENDING,
            },
        });

        if (existingPending) {
            throw new ConflictException(
                'A pending regularization request already exists for this date',
            );
        }

        const requestedCheckIn = this.parseDateTime(
            dto.attendanceDate,
            dto.requestedCheckIn,
        );
        const requestedCheckOut = this.parseDateTime(
            dto.attendanceDate,
            dto.requestedCheckOut,
        );

        const reg = this.regularizationRepo.create({
            employee,
            attendanceDate: dto.attendanceDate,
            requestedCheckIn,
            requestedCheckOut,
            reason: dto.reason,
            status: RegularizationStatus.PENDING,
        });

        return this.regularizationRepo.save(reg);
    }

    async findAll(
        employeeId: string,
        query: RegularizationQueryDto,
    ): Promise<{ data: AttendanceRegularization[]; total: number; page: number; limit: number; totalPages: number }> {
        const qb = this.regularizationRepo
            .createQueryBuilder('reg')
            .leftJoinAndSelect('reg.employee', 'employee')
            .leftJoinAndSelect('reg.actionedBy', 'actionedBy')
            .where('reg.employee_id = :employeeId', { employeeId });

        if (query.status) {
            qb.andWhere('reg.status = :status', { status: query.status });
        }

        if (query.fromDate) {
            qb.andWhere('reg.attendance_date >= :fromDate', { fromDate: query.fromDate });
        }

        if (query.toDate) {
            qb.andWhere('reg.attendance_date <= :toDate', { toDate: query.toDate });
        }

        qb.orderBy('reg.attendance_date', 'DESC');

        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;

        qb.skip(skip).take(limit);

        const [data, total] = await qb.getManyAndCount();

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
        };
    }

    async findOne(employeeId: string, id: string): Promise<AttendanceRegularization> {
        const reg = await this.regularizationRepo.findOne({
            where: { id, employee: { id: employeeId } },
            relations: { employee: true, actionedBy: true },
        });

        if (!reg) {
            throw new NotFoundException(`Regularization request ${id} not found`);
        }

        return reg;
    }

    async cancel(employeeId: string, id: string): Promise<AttendanceRegularization> {
        const reg = await this.findOne(employeeId, id);

        if (reg.status !== RegularizationStatus.PENDING) {
            throw new BadRequestException('Only pending regularization requests can be cancelled');
        }

        reg.status = RegularizationStatus.CANCELLED;
        return this.regularizationRepo.save(reg);
    }

    async approve(
        employeeId: string,
        id: string,
        approverEmployeeId?: string,
        decisionNotes?: string,
    ): Promise<AttendanceRegularization> {
        const reg = await this.findOne(employeeId, id);

        if (reg.status !== RegularizationStatus.PENDING) {
            throw new BadRequestException('Only pending regularization requests can be approved');
        }

        let approver = null;
        if (approverEmployeeId) {
            approver = await this.employeeService.findOne(approverEmployeeId).catch(() => null);
        }

        reg.status = RegularizationStatus.APPROVED;
        reg.actionedBy = approver;
        reg.actionedAt = new Date();
        reg.decisionNotes = decisionNotes || 'Approved by supervisor';

        const savedReg = await this.regularizationRepo.save(reg);

        // Update or create corresponding Attendance record
        let attendance = await this.attendanceRepo.findOne({
            where: {
                employee: { id: employeeId },
                attendanceDate: new Date(reg.attendanceDate),
            },
        });

        const checkIn = reg.requestedCheckIn || attendance?.checkIn || null;
        const checkOut = reg.requestedCheckOut || attendance?.checkOut || null;

        let workingHours: number | null = null;
        if (checkIn && checkOut) {
            const inTime = new Date(checkIn).getTime();
            const outTime = new Date(checkOut).getTime();
            if (outTime > inTime) {
                const diffMs = outTime - inTime;
                workingHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
            }
        }

        let status = AttendanceStatus.PRESENT;
        if (workingHours !== null && workingHours < 5) {
            status = AttendanceStatus.HALF_DAY;
        }

        const employee = await this.employeeService.findOne(employeeId);

        if (attendance) {
            attendance.checkIn = checkIn;
            attendance.checkOut = checkOut;
            attendance.workingHours = workingHours;
            attendance.status = status;
            attendance.isLate = false;
            attendance.isEarlyCheckout = false;
            attendance.remarks = `Regularized: ${reg.reason}`;
            await this.attendanceRepo.save(attendance);
        } else {
            attendance = this.attendanceRepo.create({
                employee,
                attendanceDate: new Date(reg.attendanceDate),
                checkIn,
                checkOut,
                workingHours,
                status,
                isLate: false,
                isEarlyCheckout: false,
                remarks: `Regularized: ${reg.reason}`,
            });
            await this.attendanceRepo.save(attendance);
        }

        return savedReg;
    }

    async reject(
        employeeId: string,
        id: string,
        rejectionReason: string,
        approverEmployeeId?: string,
    ): Promise<AttendanceRegularization> {
        const reg = await this.findOne(employeeId, id);

        if (reg.status !== RegularizationStatus.PENDING) {
            throw new BadRequestException('Only pending regularization requests can be rejected');
        }

        let approver = null;
        if (approverEmployeeId) {
            approver = await this.employeeService.findOne(approverEmployeeId).catch(() => null);
        }

        reg.status = RegularizationStatus.REJECTED;
        reg.rejectionReason = rejectionReason;
        reg.actionedBy = approver;
        reg.actionedAt = new Date();

        return this.regularizationRepo.save(reg);
    }
}
