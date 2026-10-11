import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';

import { AuthService } from './auth.service';

import { BootstrapAdminDto } from './dto/bootstrap-admin.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';

import { Permissions } from '../app/permissions/decorators/permissions.decorator';
import { Permission } from '../app/permissions/enums/permission.enum';
import { PermissionGuard } from '../app/permissions/guards/permission.guard';
import {
    AuthenticatedRequest,
    JwtAuthGuard,
} from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
    ) {}

    @Post('bootstrap-admin')
    bootstrapAdmin(
        @Body() dto: BootstrapAdminDto,
    ) {
        return this.authService.bootstrapAdmin(
            dto,
        );
    }

    @Post('login')
    login(
        @Body() dto: LoginDto,
    ) {
        return this.authService.login(dto);
    }

    @Post('refresh')
    refresh(
        @Body() dto: RefreshTokenDto,
    ) {
        return this.authService.refresh(
            dto.refreshToken,
        );
    }

    @Post('logout')
    logout(
        @Body() dto: LogoutDto,
    ) {
        return this.authService.logout(
            dto.refreshToken,
        );
    }

    @Post('change-password')
    @UseGuards(JwtAuthGuard)
    changePassword(
        @CurrentUser() user: AuthenticatedRequest['user'],
        @Body() dto: ChangePasswordDto,
    ) {
        return this.authService.changePassword(
            user.userId,
            dto,
        );
    }

    @Post('users')
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
    )
    @Permissions(Permission.USER_ACCOUNT_CREATE)
    createUser(
        @Body() dto: CreateUserDto,
    ) {
        return this.authService.createUser(
            dto,
        );
    }

    @Get('users')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @Permissions(Permission.USER_ACCOUNT_VIEW)
    findAll() {
        return this.authService.findAll();
    }

    @Get('users/:id')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @Permissions(Permission.USER_ACCOUNT_VIEW)
    findOne(@Param('id') id: string) {
        return this.authService.findUserById(id);
    }

    @Patch('users/:id')
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
    )
    @Permissions(Permission.USER_ACCOUNT_UPDATE)
    updateUser(
        @Param('id') id: string,
        @Body() dto: UpdateUserDto,
    ) {
        return this.authService.updateUser(
            id,
            dto,
        );
    }

    @Patch('users/:id/activate')
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
    )
    @Permissions(Permission.USER_ACCOUNT_ACTIVATE)
    activateUser(@Param('id') id: string) {
        return this.authService.activateUser(id);
    }

    @Patch('users/:id/deactivate')
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
    )
    @Permissions(Permission.USER_ACCOUNT_DEACTIVATE)
    deactivateUser(@Param('id') id: string) {
        return this.authService.deactivateUser(id);
    }
}