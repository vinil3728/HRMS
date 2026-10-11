import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';
import { RegularizationStatus } from '../enums/regularization-status.enum';

@Entity('attendance_regularizations')
export class AttendanceRegularization {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => Employee, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'employee_id' })
    employee!: Employee;

    @Index('IDX_att_reg_employee_date')
    @Column({ name: 'attendance_date', type: 'date' })
    attendanceDate!: string;

    @Column({ name: 'requested_check_in', type: 'timestamp', nullable: true })
    requestedCheckIn!: Date | null;

    @Column({ name: 'requested_check_out', type: 'timestamp', nullable: true })
    requestedCheckOut!: Date | null;

    @Column({ type: 'text' })
    reason!: string;

    @Index('IDX_att_reg_status')
    @Column({
        type: 'varchar',
        default: RegularizationStatus.PENDING,
    })
    status!: RegularizationStatus;

    @Column({ name: 'rejection_reason', type: 'text', nullable: true })
    rejectionReason!: string | null;

    @Column({ name: 'decision_notes', type: 'text', nullable: true })
    decisionNotes!: string | null;

    @ManyToOne(() => Employee, {
        nullable: true,
        onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'actioned_by_id' })
    actionedBy!: Employee | null;

    @Column({ name: 'actioned_at', type: 'timestamp', nullable: true })
    actionedAt!: Date | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}
