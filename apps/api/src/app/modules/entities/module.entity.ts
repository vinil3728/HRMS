import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { PermissionEntity } from '../../permissions/entities/permission.entity';

@Entity('modules')
export class ModuleEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({
        type: 'varchar',
    })
    code!: string;

    @Column({
        type: 'varchar',
    })
    name!: string;

    @Column({
        type: 'text',
        nullable: true,
    })
    description!: string | null;

    @Column({
        name: 'is_active',
        type: 'boolean',
        default: true,
    })
    isActive!: boolean;

    @Column({
        name: 'is_deleted',
        type: 'boolean',
        default: false,
    })
    isDeleted!: boolean;

    @OneToMany(
        () => PermissionEntity,
        (permission) => permission.module,
    )
    permissions!: PermissionEntity[];

    @CreateDateColumn({
        name: 'created_at',
    })
    createdAt!: Date;

    @UpdateDateColumn({
        name: 'updated_at',
    })
    updatedAt!: Date;

    permissionCount?: number;
}
