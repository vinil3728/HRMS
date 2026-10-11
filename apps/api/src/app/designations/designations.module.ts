import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Designation } from '../designations/entities/designation.entity';
import { Department } from '../departments/entities/department.entity';
import { DesignationController } from './designation.controller';
import { DesignationService } from '../designations/designation.service';
import { AuthModule } from '../../auth/auth.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Designation,
      Department,
    ]),

    AuthModule,
    PermissionsModule,
  ],

  controllers: [
    DesignationController,
  ],

  providers: [
    DesignationService,
  ],

  exports: [
    DesignationService,
  ],
})
export class DesignationsModule {}
