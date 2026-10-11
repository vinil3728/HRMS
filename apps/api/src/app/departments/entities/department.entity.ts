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
import { Designation } from '../../designations/entities/designation.entity';
import { Branch } from '../../branches/entities/branch.entity';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column({ unique: true })
  code!: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId?: string | null;

  @ManyToOne(() => Branch, (branch) => branch.departments, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch | null;

  @OneToMany(() => Designation, (designation) => designation.department)
  designations?: Designation[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}