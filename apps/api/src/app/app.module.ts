import { Module } from '@nestjs/common';

import {
  ConfigModule,
  ConfigService,
} from '@nestjs/config';

import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from '../auth/auth.module';

import { EmployeesModule } from './employees/employees.module';
import { DepartmentsModule } from './departments/departments.module';
import { DesignationsModule } from './designations/designations.module';
import { EmployeeDocumentsModule } from './employee-documents/employee-documents.module';
import { AttendanceModule } from './attendance/attendance.module';
import { LeaveModule } from './leave/leave.module';
import { ReimbursementsModule } from './reimbursements/reimbursements.module';
import { PerformanceModule } from './performance/performance.module';
import { PoliciesModule } from './policies/policies.module';
import { PermissionsModule } from './permissions/permissions.module';
import { TimesheetModule } from './timesheet/timesheet.module';
import { PayrollModule } from './payroll/payroll.module';
import { HolidaysModule } from './holidays/holidays.module';
import { BranchesModule } from './branches/branches.module';
import { LoansModule } from './loans/loans.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],

      useFactory: (
        configService: ConfigService,
      ) => ({
        type: 'postgres',

        host: configService.get<string>(
          'DB_HOST',
        ),

        port: configService.get<number>(
          'DB_PORT',
        ),

        username: configService.get<string>(
          'DB_USERNAME',
        ),

        password: configService.get<string>(
          'DB_PASSWORD',
        ),

        database: configService.get<string>(
          'DB_NAME',
        ),

        autoLoadEntities: true,

        synchronize: false,
      }),
    }),

    AuthModule,
    EmployeesModule,
    DepartmentsModule,
    DesignationsModule,
    EmployeeDocumentsModule,
    AttendanceModule,
    LeaveModule,
    ReimbursementsModule,
    PerformanceModule,
    PoliciesModule,
    PermissionsModule,
    TimesheetModule,
    PayrollModule,
    HolidaysModule,
    BranchesModule,
    LoansModule,
  ],

  controllers: [
    AppController,
  ],

  providers: [
    AppService,
  ],
})
export class AppModule {}

