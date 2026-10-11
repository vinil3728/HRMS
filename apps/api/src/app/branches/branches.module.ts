import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Branch } from './entities/branch.entity';
import { Department } from '../departments/entities/department.entity';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';

import { AuthModule } from '../../auth/auth.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Branch, Department]),
    AuthModule,
    PermissionsModule,
  ],
  controllers: [BranchesController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}
