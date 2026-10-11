import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    Unique
} from 'typeorm';

import { AttendanceStatus } from '../enums/attendance-status.enum';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('attendance')
@Unique('UQ_attendance_employee_date', ['employee', 'attendanceDate'])
export class Attendance {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => Employee, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'employee_id' })
    employee!: Employee;

    @Column({ name: 'attendance_date', type: 'date' })
    attendanceDate!: Date;

    @Column({ name: 'check_in', type: 'timestamp', nullable: true })
    checkIn!: Date | null;

    @Column({ name: 'check_out', type: 'timestamp', nullable: true })
    checkOut!: Date | null;

    @Column({
        type: 'enum',
        enum: AttendanceStatus,
    })
    status!: AttendanceStatus;

    @Column({
        name: 'working_hours',
        type: 'decimal',
        precision: 5,
        scale: 2,
        nullable: true,
    })
    workingHours!: number | null;

    @Column({
        name: 'is_late',
        default: false,
    })
    isLate!: boolean;

    @Column({
        name: 'is_early_checkout',
        default: false,
    })
    isEarlyCheckout!: boolean;

    @Column({ type: 'text', nullable: true })
    remarks!: string | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}