import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

import { PolicyStatus } from '../enums/policy-status.enum';

@Entity('policies')
export class Policy {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({
        unique: true,
    })
    title!: string;

    @Column({
        unique: true,
    })
    code!: string;

    @Column({
        type: 'text',
    })
    content!: string;

    @Column({
        type: 'varchar',
        nullable: true,
    })
    version!: string | null;

    @Column({
        type: 'enum',
        enum: PolicyStatus,
        default: PolicyStatus.DRAFT,
    })
    status!: PolicyStatus;

    @Column({
        name: 'effective_date',
        type: 'date',
        nullable: true,
    })
    effectiveDate!: Date | null;

    @CreateDateColumn({
        name: 'created_at',
    })
    createdAt!: Date;

    @UpdateDateColumn({
        name: 'updated_at',
    })
    updatedAt!: Date;
}