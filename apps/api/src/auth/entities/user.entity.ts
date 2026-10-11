import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

import { Employee } from '../../app/employees/entities/employee.entity';
import { Role } from '../../app/permissions/entities/role.entity';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @OneToOne(() => Employee, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({
        name: 'employee_id',
    })
    employee!: Employee;

    @ManyToOne(
        () => Role,
        (role) => role.users,
        {
            nullable: false,
            onDelete: 'RESTRICT',
        },
    )
    @JoinColumn({
        name: 'role_id',
    })
    role!: Role;

    @Column({
        unique: true,
    })
    username!: string;

    @Column({
        name: 'password_hash',
    })
    passwordHash!: string;

    @Column({
        name: 'is_active',
        default: true,
    })
    isActive!: boolean;

    @CreateDateColumn({
        name: 'created_at',
    })
    createdAt!: Date;

    @UpdateDateColumn({
        name: 'updated_at',
    })
    updatedAt!: Date;
}