import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn,
} from 'typeorm';

import { PerformanceCycle } from './performance-cycle.entity';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('performance_summaries')
@Unique(
    'UQ_performance_summary_employee_cycle',
    ['employee', 'cycle'],
)
export class PerformanceSummary {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => Employee, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'employee_id' })
    employee!: Employee;

    @ManyToOne(() => PerformanceCycle, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'cycle_id' })
    cycle!: PerformanceCycle;

    @Column({
        name: 'final_rating',
        type: 'decimal',
        precision: 3,
        scale: 2,
        nullable: true,
    })
    finalRating!: number | null;

    @Column({
        type: 'text',
        nullable: true,
    })
    comments!: string | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}