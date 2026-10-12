import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

import { RolePermission } from './role-permission.entity';
import { User } from '../../../auth/entities/user.entity';

@Entity('roles')
export class Role {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({
        unique: true,
    })
    name!: string;

    @Column({
        unique: true,
    })
    code!: string;

    @Column({
        type: 'text',
        nullable: true,
    })
    description!: string | null;

    @Column({
        name: 'is_system_role',
        default: false,
    })
    isSystemRole!: boolean;

    @Column({
        name: 'is_active',
        default: true,
    })
    isActive!: boolean;

    @Column({
        name: 'is_deleted',
        default: false,
    })
    isDeleted!: boolean;

    @OneToMany(
        () => RolePermission,
        (rolePermission) => rolePermission.role,
    )
    rolePermissions!: RolePermission[];

    @OneToMany(
        () => User,
        (user) => user.role,
    )
    users!: User[];

    @CreateDateColumn({
        name: 'created_at',
    })
    createdAt!: Date;

    @UpdateDateColumn({
        name: 'updated_at',
    })
    updatedAt!: Date;
}