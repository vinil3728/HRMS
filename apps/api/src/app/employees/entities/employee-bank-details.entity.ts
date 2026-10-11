import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

import { Employee } from './employee.entity';

@Entity('employee_bank_details')
export class EmployeeBankDetails {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @OneToOne(
        () => Employee,
        (employee) => employee.bankDetails,
        {
            nullable: false,
            onDelete: 'CASCADE',
        },
    )
    @JoinColumn({
        name: 'employee_id',
    })
    employee!: Employee;

    @Column({
        name: 'account_holder_name',
        type: 'varchar',
        length: 150,
    })
    accountHolderName!: string;

    @Column({
        name: 'account_number',
        type: 'varchar',
        length: 30,
    })
    accountNumber!: string;

    @Column({
        name: 'ifsc_code',
        type: 'varchar',
        length: 11,
    })
    ifscCode!: string;

    @Column({
        name: 'bank_name',
        type: 'varchar',
        length: 150,
    })
    bankName!: string;

    @Column({
        name: 'branch_name',
        type: 'varchar',
        length: 150,
    })
    branchName!: string;

    @CreateDateColumn({
        name: 'created_at',
    })
    createdAt!: Date;

    @UpdateDateColumn({
        name: 'updated_at',
    })
    updatedAt!: Date;
}
