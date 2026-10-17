import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

import { Department } from '../../departments/entities/department.entity';
import { Designation } from '../../designations/entities/designation.entity';

import { EmployeeProfileDetails } from './employee-profile-details.entity';
import { EmployeeIdentityDetails } from './employee-identity-details.entity';
import { EmployeeBankDetails } from './employee-bank-details.entity';

@Entity('employees')
export class Employee {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ 
        name: 'employee_code', 
        unique: true, 
        default: () => 
            "'EMP-' || LPAD(nextval('employee_code_seq')::text, 3, '0')", 
    })
    employeeCode!: string;

    @Column({
        name: 'first_name',
    })
    firstName!: string;

    @Column({
        name: 'last_name',
    })
    lastName!: string;

    @Column({
        unique: true,
    })
    email!: string;

    @Column()
    phone!: string;

    @Column({
        name: 'date_of_joining',
        type: 'date',
    })
    dateOfJoining!: Date;

    @Column()
    status!: string;

    @ManyToOne(
        () => Department,
        {
            nullable: false,
            onDelete: 'RESTRICT',
        },
    )
    @JoinColumn({
        name: 'department_id',
    })
    department!: Department;

    @ManyToOne(
        () => Designation,
        (designation) => designation.employees,
        {
            nullable: false,
            onDelete: 'RESTRICT',
        },
    )
    @JoinColumn({
        name: 'designation_id',
    })
    designation!: Designation;

    @ManyToOne(
        () => Employee,
        {
            nullable: true,
            onDelete: 'SET NULL',
        },
    )
    @JoinColumn({
        name: 'manager_id',
    })
    manager!: Employee | null;

    @OneToMany(
        () => Employee,
        (employee) => employee.manager,
    )
    directReports!: Employee[];

    @OneToOne(
        () => EmployeeProfileDetails,
        (profileDetails) =>
            profileDetails.employee,
    )
    profileDetails!: EmployeeProfileDetails | null;

    @OneToOne(
        () => EmployeeIdentityDetails,
        (identityDetails) =>
            identityDetails.employee,
    )
    identityDetails!: EmployeeIdentityDetails | null;

    @OneToOne(
        () => EmployeeBankDetails,
        (bankDetails) =>
            bankDetails.employee,
    )
    bankDetails!: EmployeeBankDetails | null;

    @CreateDateColumn({
        name: 'created_at',
    })
    createdAt!: Date;

    @UpdateDateColumn({
        name: 'updated_at',
    })
    updatedAt!: Date;
}
