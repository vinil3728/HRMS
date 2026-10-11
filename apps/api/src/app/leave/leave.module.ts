import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EmployeesModule } from '../employees/employees.module';
import { AuthModule } from '../../auth/auth.module';
import { Leave } from './entities/leave.entity';
import { LeaveBalance } from './entities/leave-balance.entity';
import { Employee } from '../employees/entities/employee.entity';
import { LeaveController } from './controllers/leave.controller';
import { LeaveService } from './services/leave.service';
import { PermissionsModule } from '../permissions/permissions.module';

import { LeaveBalanceController } from './controllers/leave-balance.controller';
import { LeaveBalanceService } from './services/leave-balance.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Leave,
      LeaveBalance,
      Employee,
    ]),

    EmployeesModule,
    AuthModule,
    PermissionsModule
  ],

  controllers: [
    LeaveController,
    LeaveBalanceController,
  ],

  providers: [
    LeaveService,
    LeaveBalanceService,
  ],

  exports: [
    LeaveService,
    LeaveBalanceService,
  ],
})
export class LeaveModule {}

