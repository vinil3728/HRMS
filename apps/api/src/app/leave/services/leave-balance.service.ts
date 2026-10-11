import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LeaveBalance } from '../entities/leave-balance.entity';
import { CreateLeaveBalanceDto } from '../dto/create-leave-balance.dto';
import { Employee } from '../../employees/entities/employee.entity';

@Injectable()
export class LeaveBalanceService {
    constructor(
        @InjectRepository(LeaveBalance)
        private readonly leaveBalanceRepository: Repository<LeaveBalance>,

        @InjectRepository(Employee)
        private readonly employeeRepository: Repository<Employee>,
    ) { }

    async create(
        employeeId: string,
        dto: CreateLeaveBalanceDto,
    ): Promise<LeaveBalance> {
        const employee = await this.employeeRepository.findOne({
            where: { id: employeeId },
        });

        if (!employee) {
            throw new NotFoundException('Employee not found');
        }

        const existing = await this.leaveBalanceRepository.findOne({
            where: {
                employee: { id: employeeId },
                leaveType: dto.leaveType,
                year: dto.year,
            },
        });

        if (existing) {
            throw new ConflictException(
                'Leave balance already exists for this employee, leave type and year',
            );
        }

        const balance = this.leaveBalanceRepository.create({
            employee,
            leaveType: dto.leaveType,
            year: dto.year,
            totalDays: dto.totalDays,
            usedDays: 0,
            availableDays: dto.totalDays,
        });

        return this.leaveBalanceRepository.save(balance);
    }

    async findAll(
        employeeId: string,
        year?: number,
    ): Promise<LeaveBalance[]> {
        const employee = await this.employeeRepository.findOne({
            where: { id: employeeId },
        });

        if (!employee) {
            throw new NotFoundException('Employee not found');
        }

        const query = this.leaveBalanceRepository
            .createQueryBuilder('balance')
            .leftJoinAndSelect('balance.employee', 'employee')
            .where('employee.id = :employeeId', {
                employeeId,
            });

        if (year !== undefined) {
            query.andWhere('balance.year = :year', {
                year,
            });
        }

        return query
            .orderBy('balance.leave_type', 'ASC')
            .getMany();
    }

    async findOne(
        employeeId: string,
        balanceId: string,
    ): Promise<LeaveBalance> {
        const balance = await this.leaveBalanceRepository.findOne({
            where: {
                id: balanceId,
                employee: { id: employeeId },
            },
            relations: {
                employee: true,
            },
        });

        if (!balance) {
            throw new NotFoundException('Leave balance not found');
        }

        return balance;
    }
}

