import {
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
} from 'typeorm';

import { Role } from './role.entity';
import { PermissionEntity } from './permission.entity';

@Entity('role_permissions')
@Unique(
    'UQ_ROLE_PERMISSION',
    ['role', 'permission'],
)
export class RolePermission {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(
        () => Role,
        (role) => role.rolePermissions,
        {
            nullable: false,
            onDelete: 'CASCADE',
        },
    )
    @JoinColumn({
        name: 'role_id',
    })
    role!: Role;

    @ManyToOne(
        () => PermissionEntity,
        (permission) => permission.rolePermissions,
        {
            nullable: false,
            onDelete: 'CASCADE',
        },
    )
    @JoinColumn({
        name: 'permission_id',
    })
    permission!: PermissionEntity;

    @CreateDateColumn({
        name: 'created_at',
    })
    createdAt!: Date;
}