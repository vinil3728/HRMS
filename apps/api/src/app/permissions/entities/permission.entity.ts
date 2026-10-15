import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

import { RolePermission } from './role-permission.entity';
import { ModuleEntity } from '../../modules/entities/module.entity';

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
        name: 'module_id',
        type: 'uuid',
    })
    moduleId!: string;

    @ManyToOne(
        () => ModuleEntity,
        (module) => module.permissions,
        {
            onDelete: 'RESTRICT',
        },
    )
    @JoinColumn({ name: 'module_id' })
    module!: ModuleEntity;

    @Column({
        name: 'is_active',
        default: true,
    })
    isActive!: boolean;

    @Column({
        name: 'is_deleted',
        type: 'boolean',
        default: false,
    })
    isDeleted!: boolean;

    @Column({
        name: 'scopes',
        type: 'varchar',
        length: 50,
        default: 'SELF',
    })
    scopes!: string;

    @Column({
        name: 'allowed_scopes',
        type: 'text',
        array: true,
        default: () => "ARRAY['SELF', 'TEAM', 'ORG']::text[]",
    })
    allowedScopes!: string[];

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