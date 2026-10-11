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

@Entity('employee_identity_details')
export class EmployeeIdentityDetails {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @OneToOne(
        () => Employee,
        (employee) => employee.identityDetails,
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
        name: 'aadhaar_number',
        type: 'varchar',
        length: 12,
        nullable: true,
    })
    aadhaarNumber!: string | null;

    @Column({
        name: 'pan_number',
        type: 'varchar',
        length: 10,
        nullable: true,
    })
    panNumber!: string | null;

    @CreateDateColumn({
        name: 'created_at',
    })
    createdAt!: Date;

    @UpdateDateColumn({
        name: 'updated_at',
    })
    updatedAt!: Date;
}