import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyHoliday, HolidayType } from './entities/company-holiday.entity';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';

@Injectable()
export class HolidayService {
    constructor(
        @InjectRepository(CompanyHoliday)
        private readonly holidayRepository: Repository<CompanyHoliday>,
    ) {}

    private computeDayOfWeek(dateStr: string): string {
        const date = new Date(`${dateStr}T12:00:00Z`);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            timeZone: 'UTC',
        });
    }

    async findAll(year?: number, type?: string): Promise<CompanyHoliday[]> {
        const query = this.holidayRepository
            .createQueryBuilder('holiday')
            .where('holiday.isActive = :isActive', { isActive: true });

        if (year) {
            query.andWhere(
                `holiday.date >= :startDate AND holiday.date <= :endDate`,
                {
                    startDate: `${year}-01-01`,
                    endDate: `${year}-12-31`,
                },
            );
        }

        if (type && type !== 'ALL') {
            query.andWhere('holiday.type = :type', { type });
        }

        query.orderBy('holiday.date', 'ASC');

        return query.getMany();
    }

    async findOne(id: string): Promise<CompanyHoliday> {
        const holiday = await this.holidayRepository.findOne({
            where: { id },
        });

        if (!holiday) {
            throw new NotFoundException(`Company holiday with ID ${id} not found`);
        }

        return holiday;
    }

    async create(dto: CreateHolidayDto): Promise<CompanyHoliday> {
        const dayOfWeek = dto.dayOfWeek || this.computeDayOfWeek(dto.date);

        const holiday = this.holidayRepository.create({
            name: dto.name,
            date: dto.date,
            dayOfWeek,
            type: dto.type,
            description: dto.description || null,
            isActive: dto.isActive !== undefined ? dto.isActive : true,
        });

        return this.holidayRepository.save(holiday);
    }

    async update(id: string, dto: UpdateHolidayDto): Promise<CompanyHoliday> {
        const holiday = await this.findOne(id);

        if (dto.name !== undefined) holiday.name = dto.name;
        if (dto.type !== undefined) holiday.type = dto.type;
        if (dto.description !== undefined) holiday.description = dto.description;
        if (dto.isActive !== undefined) holiday.isActive = dto.isActive;

        if (dto.date !== undefined) {
            holiday.date = dto.date;
            holiday.dayOfWeek = dto.dayOfWeek || this.computeDayOfWeek(dto.date);
        } else if (dto.dayOfWeek !== undefined) {
            holiday.dayOfWeek = dto.dayOfWeek;
        }

        return this.holidayRepository.save(holiday);
    }

    async remove(id: string): Promise<{ success: boolean; message: string }> {
        const holiday = await this.findOne(id);
        await this.holidayRepository.remove(holiday);
        return { success: true, message: `Holiday ${holiday.name} removed successfully` };
    }
}
