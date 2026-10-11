import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EmployeesModule } from '../employees/employees.module';
import { AuthModule } from '../../auth/auth.module';
import { Employee } from '../employees/entities/employee.entity';
import { EmployeeDocument } from './entities/employee-document.entity';
import { EmployeeDocumentController } from './employee-document.controller';
import { EmployeeDocumentService } from './employee-document.service';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Employee,
      EmployeeDocument,
    ]),

    EmployeesModule,
    AuthModule,
    PermissionsModule
  ],

  controllers: [
    EmployeeDocumentController,
  ],

  providers: [
    EmployeeDocumentService,
  ],

  exports: [
    EmployeeDocumentService,
  ],
})
export class EmployeeDocumentsModule {}
