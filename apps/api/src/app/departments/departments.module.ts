import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../../auth/auth.module';
import { Department } from './entities/department.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Designation } from '../designations/entities/designation.entity';
import { Employee } from '../employees/entities/employee.entity';
import { DepartmentController } from './department.controller';
import { DepartmentService } from './department.service';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Department,
      Branch,
      Designation,
      Employee,
    ]),

    AuthModule,
    PermissionsModule
  ],

  controllers: [
    DepartmentController,
  ],

  providers: [
    DepartmentService,
  ],

  exports: [
    DepartmentService,
  ],
})
export class DepartmentsModule {}
