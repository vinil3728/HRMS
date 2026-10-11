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
import { PerformanceGoal } from './performance-goal.entity';

import { PerformanceEvaluationType } from '../enums/performance-evaluation-type.enum';
import { PerformanceEvaluationStatus } from '../enums/performance-evaluation-status.enum';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('performance_evaluations')
@Unique(
    'UQ_performance_evaluation_goal_type',
    ['goal', 'evaluationType'],
)
export class PerformanceEvaluation {
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

    @ManyToOne(() => PerformanceGoal, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'goal_id' })
    goal!: PerformanceGoal;

    @Column({
        name: 'evaluation_type',
        type: 'enum',
        enum: PerformanceEvaluationType,
    })
    evaluationType!: PerformanceEvaluationType;

    @Column({
        type: 'enum',
        enum: PerformanceEvaluationStatus,
        default: PerformanceEvaluationStatus.DRAFT,
    })
    status!: PerformanceEvaluationStatus;

    @Column({
        type: 'int',
        nullable: true,
    })
    rating!: number | null;

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