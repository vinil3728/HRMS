import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

export enum PerformanceCycleStatus {
    DRAFT = 'DRAFT',
    OPEN = 'OPEN',
    CLOSED = 'CLOSED',
}

@Entity('performance_cycles')
export class PerformanceCycle {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ unique: true })
    name!: string;

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

    @Column({
        type: 'enum',
        enum: PerformanceCycleStatus,
        default: PerformanceCycleStatus.DRAFT,
    })
    status!: PerformanceCycleStatus;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}