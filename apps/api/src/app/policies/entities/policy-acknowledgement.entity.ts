import {
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
} from 'typeorm';

import { Policy } from './policy.entity';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('policy_acknowledgements')
@Unique(
    'UQ_policy_acknowledgement_employee_policy',
    ['employee', 'policy'],
)
export class PolicyAcknowledgement {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => Employee, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'employee_id' })
    employee!: Employee;

    @ManyToOne(() => Policy, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'policy_id' })
    policy!: Policy;

    @CreateDateColumn({
        name: 'acknowledged_at',
    })
    acknowledgedAt!: Date;
}