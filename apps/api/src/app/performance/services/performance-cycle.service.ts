import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
    PerformanceCycle,
    PerformanceCycleStatus,
} from '../entities/performance-cycle.entity';

import { CreatePerformanceCycleDto } from '../dto/create-performance-cycle.dto';
import { UpdatePerformanceCycleDto } from '../dto/update-performance-cycle.dto';

@Injectable()
export class PerformanceCycleService {
    constructor(
        @InjectRepository(PerformanceCycle)
        private readonly performanceCycleRepository: Repository<PerformanceCycle>,
    ) { }

    async create(
        dto: CreatePerformanceCycleDto,
    ): Promise<PerformanceCycle> {
        const startDate = this.parseDate(dto.startDate);
        const endDate = this.parseDate(dto.endDate);

        this.validateDateRange(startDate, endDate);

        const existing =
            await this.performanceCycleRepository.findOne({
                where: {
                    name: dto.name,
                },
            });

        if (existing) {
            throw new ConflictException(
                'Performance cycle with this name already exists',
            );
        }

        const cycle =
            this.performanceCycleRepository.create({
                name: dto.name,
                startDate,
                endDate,
                status: PerformanceCycleStatus.DRAFT,
            });

        return this.performanceCycleRepository.save(cycle);
    }

    async findAll(): Promise<PerformanceCycle[]> {
        return this.performanceCycleRepository.find({
            order: {
                startDate: 'DESC',
            },
        });
    }

    async findOne(
        cycleId: string,
    ): Promise<PerformanceCycle> {
        const cycle =
            await this.performanceCycleRepository.findOne({
                where: {
                    id: cycleId,
                },
            });

        if (!cycle) {
            throw new NotFoundException(
                'Performance cycle not found',
            );
        }

        return cycle;
    }

    async update(
        cycleId: string,
        dto: UpdatePerformanceCycleDto,
    ): Promise<PerformanceCycle> {
        const cycle = await this.findOne(cycleId);

        if (cycle.status === PerformanceCycleStatus.CLOSED) {
            throw new ConflictException(
                'Closed performance cycle cannot be updated',
            );
        }

        const startDate = dto.startDate
            ? this.parseDate(dto.startDate)
            : cycle.startDate;

        const endDate = dto.endDate
            ? this.parseDate(dto.endDate)
            : cycle.endDate;

        this.validateDateRange(startDate, endDate);

        if (dto.name && dto.name !== cycle.name) {
            const existing =
                await this.performanceCycleRepository.findOne({
                    where: {
                        name: dto.name,
                    },
                });

            if (existing) {
                throw new ConflictException(
                    'Performance cycle with this name already exists',
                );
            }

            cycle.name = dto.name;
        }

        cycle.startDate = startDate;
        cycle.endDate = endDate;

        if (dto.status !== undefined) {
            cycle.status = dto.status;
        }

        return this.performanceCycleRepository.save(cycle);
    }

    async remove(
        cycleId: string,
    ): Promise<void> {
        const cycle = await this.findOne(cycleId);

        if (cycle.status !== PerformanceCycleStatus.DRAFT) {
            throw new ConflictException(
                'Only draft performance cycles can be deleted',
            );
        }

        await this.performanceCycleRepository.remove(cycle);
    }

    private validateDateRange(
        startDate: Date,
        endDate: Date,
    ): void {
        if (endDate < startDate) {
            throw new BadRequestException(
                'End date cannot be before start date',
            );
        }
    }

    private parseDate(value: string): Date {
        const date = new Date(`${value}T00:00:00`);

        if (Number.isNaN(date.getTime())) {
            throw new BadRequestException(
                'Invalid date',
            );
        }

        return date;
    }
}