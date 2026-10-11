import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('salary_structures')
export class SalaryStructure {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => Employee, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'employee_id' })
    employee!: Employee;

    @Column({
        type: 'decimal',
        precision: 12,
        scale: 2,
    })
    ctc!: number;

    @Column({
        name: 'basic_salary',
        type: 'decimal',
        precision: 12,
        scale: 2,
    })
    basicSalary!: number;

    @Column({
        type: 'decimal',
        precision: 12,
        scale: 2,
    })
    hra!: number;

    @Column({
        name: 'conveyance_allowance',
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
    })
    conveyanceAllowance!: number;

    @Column({
        name: 'medical_allowance',
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
    })
    medicalAllowance!: number;

    @Column({
        name: 'special_allowance',
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
    })
    specialAllowance!: number;

    @Column({
        name: 'provident_fund',
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
    })
    providentFund!: number;

    @Column({
        name: 'professional_tax',
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
    })
    professionalTax!: number;

    @Column({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
    })
    tds!: number;

    @Column({
        name: 'gross_salary',
        type: 'decimal',
        precision: 12,
        scale: 2,
    })
    grossSalary!: number;

    @Column({
        name: 'total_deductions',
        type: 'decimal',
        precision: 12,
        scale: 2,
    })
    totalDeductions!: number;

    @Column({
        name: 'net_salary',
        type: 'decimal',
        precision: 12,
        scale: 2,
    })
    netSalary!: number;

    @Column({
        name: 'effective_from',
        type: 'date',
        default: () => 'CURRENT_DATE',
    })
    effectiveFrom!: Date;

    @Column({
        name: 'is_active',
        type: 'boolean',
        default: true,
    })
    isActive!: boolean;

    @CreateDateColumn({
        name: 'created_at',
        type: 'timestamptz',
    })
    createdAt!: Date;

    @UpdateDateColumn({
        name: 'updated_at',
        type: 'timestamptz',
    })
    updatedAt!: Date;
}
