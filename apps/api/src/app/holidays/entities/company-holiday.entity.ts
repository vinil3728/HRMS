import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

export enum HolidayType {
    GAZETTED = 'GAZETTED',
    RESTRICTED = 'RESTRICTED',
    COMPANY = 'COMPANY',
}

@Entity('company_holidays')
export class CompanyHoliday {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar' })
    name: string;

    @Index('IDX_company_holidays_date')
    @Column({ type: 'date' })
    date: string;

    @Column({ name: 'day_of_week', type: 'varchar' })
    dayOfWeek: string;

    @Column({
        type: 'varchar',
        default: HolidayType.GAZETTED,
    })
    type: HolidayType;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
