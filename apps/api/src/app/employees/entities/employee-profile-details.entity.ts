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

@Entity('employee_profile_details')
export class EmployeeProfileDetails {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @OneToOne(
        () => Employee,
        (employee) => employee.profileDetails,
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
        name: 'date_of_birth',
        type: 'date',
        nullable: true,
    })
    dateOfBirth!: Date | null;

    @Column({
        nullable: true,
    })
    gender!: string | null;

    @Column({
        name: 'marital_status',
        nullable: true,
    })
    maritalStatus!: string | null;

    @Column({
        name: 'blood_group',
        nullable: true,
    })
    bloodGroup!: string | null;

    @Column({
        nullable: true,
    })
    nationality!: string | null;

    @Column({
        name: 'personal_email',
        nullable: true,
    })
    personalEmail!: string | null;

    @Column({
        name: 'alternate_phone',
        nullable: true,
    })
    alternatePhone!: string | null;

    @Column({
        name: 'address_line_1',
        nullable: true,
    })
    addressLine1!: string | null;

    @Column({
        name: 'address_line_2',
        nullable: true,
    })
    addressLine2!: string | null;

    @Column({
        nullable: true,
    })
    city!: string | null;

    @Column({
        nullable: true,
    })
    state!: string | null;

    @Column({
        nullable: true,
    })
    country!: string | null;

    @Column({
        name: 'postal_code',
        nullable: true,
    })
    postalCode!: string | null;

    @Column({
        name: 'emergency_contact_name',
        nullable: true,
    })
    emergencyContactName!: string | null;

    @Column({
        name: 'emergency_contact_relationship',
        nullable: true,
    })
    emergencyContactRelationship!: string | null;

    @Column({
        name: 'emergency_contact_phone',
        nullable: true,
    })
    emergencyContactPhone!: string | null;

    @CreateDateColumn({
        name: 'created_at',
    })
    createdAt!: Date;

    @UpdateDateColumn({
        name: 'updated_at',
    })
    updatedAt!: Date;
}
