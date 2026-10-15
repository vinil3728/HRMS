import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import {
    AuthenticatedRequest,
    JwtAuthGuard,
} from '../../../auth/guards/jwt-auth.guard';
import { ScopeAccessGuard } from '../../../auth/guards/scope-access.guard';
import {
    AnyPermissions,
    Permissions,
} from '../../permissions/decorators/permissions.decorator';
import { Permission } from '../../permissions/enums/permission.enum';
import { PermissionGuard } from '../../permissions/guards/permission.guard';

import { CreatePayrollRunDto } from '../dto/create-payroll-run.dto';
import { CreatePayslipDto } from '../dto/create-payslip.dto';
import { CreateSalaryStructureDto } from '../dto/create-salary-structure.dto';
import { MarkPaidDto } from '../dto/mark-paid.dto';
import { PayrollQueryDto } from '../dto/payroll-query.dto';
import { RejectPayslipDto } from '../dto/reject-payslip.dto';
import { UpdatePayslipDto } from '../dto/update-payslip.dto';
import { PayrollService } from '../services/payroll.service';

@Controller('payroll')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PayrollController {
    constructor(private readonly payrollService: PayrollService) {}

    // =========================================================
    // Summary
    // =========================================================
    @Get('summary')
    @AnyPermissions(
        Permission.PAYROLL_SUMMARY_VIEW,
        Permission.PAYROLL_PROCESS,
        Permission.PAYROLL_CREATE,
        Permission.PAYROLL_UPDATE,
        Permission.PAYROLL_APPROVE,
    )
    getSummary(
        @Query('month') month?: string,
        @Query('year') year?: string,
    ) {
        return this.payrollService.getSummary(
            month ? parseInt(month, 10) : undefined,
            year ? parseInt(year, 10) : undefined,
        );
    }

    // =========================================================
    // Payroll Runs (Batch Cycles)
    // =========================================================
    @Get('runs')
    @AnyPermissions(
        Permission.PAYROLL_SUMMARY_VIEW,
        Permission.PAYROLL_PROCESS,
        Permission.PAYROLL_CREATE,
        Permission.PAYROLL_UPDATE,
        Permission.PAYROLL_APPROVE,
    )
    getPayrollRuns(@Query('year') year?: string) {
        return this.payrollService.getPayrollRuns(
            year ? parseInt(year, 10) : undefined,
        );
    }

    @Get('runs/:id')
    @AnyPermissions(
        Permission.PAYROLL_SUMMARY_VIEW,
        Permission.PAYROLL_PROCESS,
        Permission.PAYROLL_CREATE,
        Permission.PAYROLL_UPDATE,
        Permission.PAYROLL_APPROVE,
    )
    getPayrollRunById(@Param('id') id: string) {
        return this.payrollService.getPayrollRunById(id);
    }

    @Post('runs')
    @Permissions(Permission.PAYROLL_PROCESS)
    createPayrollRun(
        @Body() dto: CreatePayrollRunDto,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.payrollService.createPayrollRun(
            dto,
            req.user?.username || 'system',
        );
    }

    @Post('runs/:id/approve')
    @Permissions(Permission.PAYROLL_APPROVE)
    approvePayrollRun(
        @Param('id') id: string,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.payrollService.approvePayrollRun(
            id,
            req.user?.username || 'system',
        );
    }

    @Post('runs/:id/pay')
    @Permissions(Permission.PAYROLL_APPROVE)
    markPayrollRunPaid(
        @Param('id') id: string,
        @Body() dto: MarkPaidDto,
    ) {
        return this.payrollService.markPayrollRunPaid(id, dto);
    }

    @Delete('runs/:id')
    @Permissions(Permission.PAYROLL_DELETE)
    deletePayrollRun(@Param('id') id: string) {
        return this.payrollService.deletePayrollRun(id);
    }

    // =========================================================
    // Payslips
    // =========================================================
    @Get('payslips')
    @Permissions(Permission.PAYROLL_VIEW)
    getPayslips(
        @Query() query: PayrollQueryDto,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.payrollService.getPayslips(
            query,
            req.user?.userId,
            req.user?.employeeId,
        );
    }

    @Get('payslips/:id')
    @Permissions(Permission.PAYROLL_VIEW)
    getPayslipById(
        @Param('id') id: string,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.payrollService.getPayslipByIdForUser(
            id,
            req.user?.userId,
            req.user?.employeeId,
        );
    }

    @Post('payslips')
    @Permissions(Permission.PAYROLL_CREATE)
    createPayslip(@Body() dto: CreatePayslipDto) {
        return this.payrollService.createPayslip(dto);
    }

    @Patch('payslips/:id')
    @Permissions(Permission.PAYROLL_UPDATE)
    updatePayslip(
        @Param('id') id: string,
        @Body() dto: UpdatePayslipDto,
    ) {
        return this.payrollService.updatePayslip(id, dto);
    }

    @Post('payslips/:id/approve')
    @Permissions(Permission.PAYROLL_APPROVE)
    approvePayslip(@Param('id') id: string) {
        return this.payrollService.approvePayslip(id);
    }

    @Post('payslips/:id/reject')
    @Permissions(Permission.PAYROLL_REJECT)
    rejectPayslip(
        @Param('id') id: string,
        @Body() dto: RejectPayslipDto,
    ) {
        return this.payrollService.rejectPayslip(id, dto.reason);
    }

    @Post('payslips/:id/pay')
    @Permissions(Permission.PAYROLL_APPROVE)
    markPayslipPaid(
        @Param('id') id: string,
        @Body() dto: MarkPaidDto,
    ) {
        return this.payrollService.markPayslipPaid(id, dto);
    }

    @Delete('payslips/:id')
    @Permissions(Permission.PAYROLL_DELETE)
    deletePayslip(@Param('id') id: string) {
        return this.payrollService.deletePayslip(id);
    }

    // =========================================================
    // Salary Structures
    // =========================================================
    @Get('salary-structures')
    @AnyPermissions(
        Permission.PAYROLL_SUMMARY_VIEW,
        Permission.PAYROLL_PROCESS,
        Permission.PAYROLL_CREATE,
        Permission.PAYROLL_UPDATE,
        Permission.PAYROLL_APPROVE,
    )
    getSalaryStructures() {
        return this.payrollService.getSalaryStructures();
    }

    @Get('salary-structures/employee/:employeeId')
    @UseGuards(JwtAuthGuard, PermissionGuard, ScopeAccessGuard)
    @Permissions(Permission.PAYROLL_VIEW)
    getSalaryStructureByEmployee(
        @Param('employeeId') employeeId: string,
    ) {
        return this.payrollService.getSalaryStructureByEmployee(employeeId);
    }

    @Post('salary-structures')
    @AnyPermissions(Permission.PAYROLL_CREATE, Permission.PAYROLL_UPDATE)
    createOrUpdateSalaryStructure(
        @Body() dto: CreateSalaryStructureDto,
    ) {
        return this.payrollService.createOrUpdateSalaryStructure(dto);
    }
}
