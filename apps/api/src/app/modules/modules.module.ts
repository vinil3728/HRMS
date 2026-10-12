import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ModuleEntity } from './entities/module.entity';
import { PermissionEntity } from '../permissions/entities/permission.entity';
import { RolePermission } from '../permissions/entities/role-permission.entity';
import { ModulesController } from './modules.controller';
import { ModulesService } from './modules.service';

import { AuthModule } from '../../auth/auth.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            ModuleEntity,
            PermissionEntity,
            RolePermission,
        ]),

        forwardRef(() => AuthModule),
        forwardRef(() => PermissionsModule),
    ],
    controllers: [ModulesController],
    providers: [ModulesService],
    exports: [ModulesService],
})
export class ModulesModule {}
