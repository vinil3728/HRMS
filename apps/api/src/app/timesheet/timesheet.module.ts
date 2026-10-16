import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../../auth/auth.module';

import { Employee } from '../employees/entities/employee.entity';

import { TimesheetController } from './controllers/timesheet.controller';
import { TimesheetOverviewController } from './controllers/timesheet-overview.controller';
import { Timesheet } from './entities/timesheet.entity';
import { TimesheetService } from './services/timesheet.service';
import { PermissionsModule } from '../permissions/permissions.module';
import { RolePermission } from '../permissions/entities/role-permission.entity';
import { User } from '../../auth/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Timesheet,
      Employee,
      RolePermission,
      User,
    ]),
    AuthModule,
    PermissionsModule,
  ],
  controllers: [
    TimesheetController,
    TimesheetOverviewController,
  ],
  providers: [
    TimesheetService,
  ],
  exports: [
    TimesheetService,
  ],
})
export class TimesheetModule {}
