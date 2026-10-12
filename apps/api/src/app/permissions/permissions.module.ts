import {
    forwardRef,
    Module,
} from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import { PermissionController } from './controllers/permission.controller';
import { RoleController } from './controllers/role.controller';

import { PermissionEntity } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { Role } from './entities/role.entity';
import { ModuleEntity } from '../modules/entities/module.entity';

import { PermissionGuard } from './guards/permission.guard';

import { PermissionService } from './services/permission.service';
import { RoleService } from './services/role.service';

import { AuthModule } from '../../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Role,
            PermissionEntity,
            RolePermission,
            ModuleEntity,
        ]),

        forwardRef(() => AuthModule),
    ],

    controllers: [
        RoleController,
        PermissionController,
    ],

    providers: [
        PermissionService,
        RoleService,
        PermissionGuard,
    ],

    exports: [
        TypeOrmModule,
        PermissionService,
        RoleService,
        PermissionGuard,
    ],
})
export class PermissionsModule {}
