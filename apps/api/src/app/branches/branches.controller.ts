import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Permissions, AnyPermissions } from '../permissions/decorators/permissions.decorator';
import { Permission } from '../permissions/enums/permission.enum';
import { PermissionGuard } from '../permissions/guards/permission.guard';

@Controller('branches')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @Permissions(Permission.BRANCH_CREATE)
  create(@Body() dto: CreateBranchDto) {
    return this.branchesService.create(dto);
  }

  @Get()
  @Permissions(Permission.BRANCH_VIEW)
  findAll(
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    const activeBool =
      isActive === undefined ? undefined : isActive === 'true';
    return this.branchesService.findAll(search, activeBool);
  }

  @Get(':id')
  @Permissions(Permission.BRANCH_VIEW)
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.branchesService.findOne(id);
  }

  @Patch(':id')
  @Permissions(Permission.BRANCH_EDIT)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branchesService.update(id, dto);
  }

  @Patch(':id/status')
  @AnyPermissions(Permission.BRANCH_ACTIVATE, Permission.BRANCH_DEACTIVATE)
  toggleStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.branchesService.toggleStatus(id, isActive);
  }

  @Delete(':id')
  @Permissions(Permission.BRANCH_DELETE)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.branchesService.remove(id);
  }
}
