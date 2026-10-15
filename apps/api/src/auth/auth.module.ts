import {
    Module,
    forwardRef,
} from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';

import { AuthService } from './auth.service';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ScopeAccessGuard } from './guards/scope-access.guard';

import { User } from './entities/user.entity';

import { RefreshToken } from './entities/refresh-token.entity';

import { Employee } from '../app/employees/entities/employee.entity';

import { Department } from '../app/departments/entities/department.entity';

import { Designation } from '../app/designations/entities/designation.entity';

import { Role } from '../app/permissions/entities/role.entity';
import { RolePermission } from '../app/permissions/entities/role-permission.entity';

import { PermissionsModule } from '../app/permissions/permissions.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            User,
            RefreshToken,
            Employee,
            Department,
            Designation,
            Role,
            RolePermission,
        ]),

        JwtModule.register({
            secret:
                process.env['JWT_SECRET'] ??
                'change-this-secret',
        }),

        forwardRef(
            () => PermissionsModule,
        ),
    ],

    controllers: [
        AuthController,
    ],

    providers: [
        AuthService,
        JwtAuthGuard,
        ScopeAccessGuard,
    ],

    exports: [
        AuthService,
        JwtModule,
        JwtAuthGuard,
        ScopeAccessGuard,
    ],
})
export class AuthModule {}
