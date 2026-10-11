import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Reimbursement } from '../reimbursements/entities/reimbursement.entity';
import { Employee } from '../employees/entities/employee.entity';

import { ReimbursementController } from './reimbursement.controller';
import { ReimbursementService } from './reimbursement.service';

import { EmployeesModule } from '../employees/employees.module';
import { AuthModule } from '../../auth/auth.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Reimbursement,
      Employee,
    ]),

    EmployeesModule,
    AuthModule,
    PermissionsModule
  ],

  controllers: [
    ReimbursementController,
  ],

  providers: [
    ReimbursementService,
  ],

  exports: [
    ReimbursementService,
  ],
})
export class ReimbursementsModule {}
