
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Employee } from './entities/employee.entity';
import { EmployeeProfileDetails } from './entities/employee-profile-details.entity';
import { EmployeeIdentityDetails } from './entities/employee-identity-details.entity';
import { EmployeeBankDetails } from './entities/employee-bank-details.entity';
import { RolePermission } from '../permissions/entities/role-permission.entity';

import { EmployeeController } from './controllers/employee.controller';
import { EmployeeProfileDetailsController } from './controllers/employee-profile-details.controller';
import { EmployeeIdentityDetailsController } from './controllers/employee-identity-details.controller';
import { EmployeeBankDetailsController } from './controllers/employee-bank-details.controller';

import { EmployeeService } from './services/employee.service';
import { EmployeeProfileDetailsService } from './services/employee-profile-details.service';
import { EmployeeIdentityDetailsService } from './services/employee-identity-details.service';
import { EmployeeBankDetailsService } from './services/employee-bank-details.service';

import { DepartmentsModule } from '../departments/departments.module';
import { DesignationsModule } from '../designations/designations.module';
import { AuthModule } from '../../auth/auth.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Employee,
            EmployeeProfileDetails,
            EmployeeIdentityDetails,
            EmployeeBankDetails,
            RolePermission,
        ]),

        AuthModule,
        DepartmentsModule,
        DesignationsModule,
        PermissionsModule,
    ],

    controllers: [
        EmployeeController,
        EmployeeProfileDetailsController,
        EmployeeIdentityDetailsController,
        EmployeeBankDetailsController,
    ],

    providers: [
        EmployeeService,
        EmployeeProfileDetailsService,
        EmployeeIdentityDetailsService,
        EmployeeBankDetailsService,
    ],

    exports: [
        EmployeeService,
        EmployeeProfileDetailsService,
        EmployeeIdentityDetailsService,
        EmployeeBankDetailsService,
    ],
})
export class EmployeesModule {}
