import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('employee_documents')
export class EmployeeDocument {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => Employee, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'employee_id' })
    employee!: Employee;

    @Column({ name: 'document_type' })
    documentType!: string;

    @Column({ name: 'file_name' })
    fileName!: string;

    @Column({ name: 'file_path' })
    filePath!: string;

    @Column({ name: 'mime_type' })
    mimeType!: string;

    @Column({ name: 'file_size', type: 'bigint' })
    fileSize!: number;

    @CreateDateColumn({ name: 'uploaded_at' })
    uploadedAt!: Date;
}