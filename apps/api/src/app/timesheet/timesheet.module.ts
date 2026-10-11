import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../../auth/auth.module';

import { Employee } from '../employees/entities/employee.entity';

import { TimesheetController } from './controllers/timesheet.controller';
import { Timesheet } from './entities/timesheet.entity';
import { TimesheetService } from './services/timesheet.service';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Timesheet,
      Employee,
    ]),
    AuthModule,
    PermissionsModule,
  ],
  controllers: [
    TimesheetController,
  ],
  providers: [
    TimesheetService,
  ],
  exports: [
    TimesheetService,
  ],
})
export class TimesheetModule {}
