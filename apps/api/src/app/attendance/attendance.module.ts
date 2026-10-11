import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Employee } from '../employees/entities/employee.entity';

import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

import { EmployeesModule } from '../employees/employees.module';
import { AuthModule } from '../../auth/auth.module';
import { Attendance } from './entities/attendance.entity';
import { AttendanceRegularization } from './entities/attendance-regularization.entity';
import { PermissionsModule } from '../permissions/permissions.module';
import { AttendanceRegularizationController } from './attendance-regularization.controller';
import { AttendanceRegularizationService } from './attendance-regularization.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Attendance,
      AttendanceRegularization,
      Employee,
    ]),

    EmployeesModule,
    AuthModule,
    PermissionsModule
  ],

  controllers: [
    AttendanceController,
    AttendanceRegularizationController,
  ],

  providers: [
    AttendanceService,
    AttendanceRegularizationService,
  ],

  exports: [
    AttendanceService,
    AttendanceRegularizationService,
  ],
})
export class AttendanceModule {}
