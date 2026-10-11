import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Policy } from '../policies/entities/policy.entity';
import { PolicyAcknowledgement } from '../policies/entities/policy-acknowledgement.entity';
import { RolePermission } from '../permissions/entities/role-permission.entity';

import { PolicyController } from '../policies/controllers/policy.controller';
import { PolicyAcknowledgementController } from '../policies/controllers/policy-acknowledgement.controller';

import { PolicyService } from '../policies/services/policy.service';
import { PolicyAcknowledgementService } from '../policies/services/policy-acknowledgement.service';

import { EmployeesModule } from '../employees/employees.module';
import { AuthModule } from '../../auth/auth.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Policy,
      PolicyAcknowledgement,
      RolePermission,
    ]),

    EmployeesModule,
    AuthModule,
    PermissionsModule
  ],

  controllers: [
    PolicyController,
    PolicyAcknowledgementController,
  ],

  providers: [
    PolicyService,
    PolicyAcknowledgementService,
  ],

  exports: [
    PolicyService,
    PolicyAcknowledgementService,
  ],
})
export class PoliciesModule {}
