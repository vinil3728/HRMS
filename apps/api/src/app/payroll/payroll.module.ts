import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../../auth/auth.module';
import { Employee } from '../employees/entities/employee.entity';
import { RolePermission } from '../permissions/entities/role-permission.entity';
import { PermissionsModule } from '../permissions/permissions.module';
import { PayrollController } from './controllers/payroll.controller';
import { PayrollRun } from './entities/payroll-run.entity';
import { Payslip } from './entities/payslip.entity';
import { SalaryStructure } from './entities/salary-structure.entity';
import { PayrollService } from './services/payroll.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            SalaryStructure,
            PayrollRun,
            Payslip,
            Employee,
            RolePermission,
        ]),
        AuthModule,
        PermissionsModule,
    ],
    controllers: [PayrollController],
    providers: [PayrollService],
    exports: [PayrollService],
})
export class PayrollModule {}
