import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { CompanyLoan } from './entities/company-loan.entity';
import { LoanRepayment } from './entities/loan-repayment.entity';
import { Employee } from '../employees/entities/employee.entity';
import { AuthModule } from '../../auth/auth.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompanyLoan, LoanRepayment, Employee]),
    AuthModule,
    PermissionsModule,
  ],
  controllers: [LoansController],
  providers: [LoansService],
  exports: [LoansService],
})
export class LoansModule {}
