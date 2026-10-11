import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

import { PerformanceCycle } from './performance-cycle.entity';
import { PerformanceGoalStatus } from '../enums/performance-goal-status.enum';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('performance_goals')
export class PerformanceGoal {
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

    @Column()
    title!: string;

    @Column({
        type: 'text',
        nullable: true,
    })
    description!: string | null;

    @Column({
        type: 'text',
        nullable: true,
    })
    target!: string | null;

    @Column({
        type: 'decimal',
        precision: 5,
        scale: 2,
    })
    weight!: number;

    @Column({
        type: 'int',
        default: 0,
    })
    progress!: number;

    @Column({
        type: 'enum',
        enum: PerformanceGoalStatus,
        default: PerformanceGoalStatus.NOT_STARTED,
    })
    status!: PerformanceGoalStatus;

    @Column({
        name: 'start_date',
        type: 'date',
    })
    startDate!: Date;

    @Column({
        name: 'end_date',
        type: 'date',
    })
    endDate!: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}