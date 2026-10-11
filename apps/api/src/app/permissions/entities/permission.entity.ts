import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

import { RolePermission } from './role-permission.entity';

@Entity('permissions')
export class PermissionEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({
        type: 'varchar',
        unique: true,
    })
    code!: string;

    @Column({
        unique: true,
    })
    name!: string;

    @Column({
        type: 'text',
        nullable: true,
    })
    description!: string | null;

    @Column({
        type: 'varchar',
        length: 100,
    })
    module!: string;

    @Column({
        name: 'is_active',
        default: true,
    })
    isActive!: boolean;

    @OneToMany(
        () => RolePermission,
        (rolePermission) => rolePermission.permission,
    )
    rolePermissions!: RolePermission[];

    @CreateDateColumn({
        name: 'created_at',
    })
    createdAt!: Date;

    @UpdateDateColumn({
        name: 'updated_at',
    })
    updatedAt!: Date;
}