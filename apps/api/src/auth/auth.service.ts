import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import {
    InjectDataSource,
    InjectRepository,
} from '@nestjs/typeorm';

import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import {
    DataSource,
    Repository,
} from 'typeorm';

import { BootstrapAdminDto } from './dto/bootstrap-admin.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';

import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';

import { Employee } from '../app/employees/entities/employee.entity';

import { Department } from '../app/departments/entities/department.entity';
import { Designation } from '../app/designations/entities/designation.entity';

import { Role } from '../app/permissions/entities/role.entity';
import { RolePermission } from '../app/permissions/entities/role-permission.entity';

@Injectable()
export class AuthService {
    private readonly accessTokenExpiresIn = 900;

    private readonly refreshTokenExpiresIn =
        7 * 24 * 60 * 60;

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,

        @InjectRepository(Employee)
        private readonly employeeRepository: Repository<Employee>,

        @InjectRepository(Role)
        private readonly roleRepository: Repository<Role>,

        @InjectRepository(RolePermission)
        private readonly rolePermissionRepository: Repository<RolePermission>,

        @InjectRepository(RefreshToken)
        private readonly refreshTokenRepository: Repository<RefreshToken>,

        @InjectRepository(Department)
        private readonly departmentRepository: Repository<Department>,

        @InjectRepository(Designation)
        private readonly designationRepository: Repository<Designation>,

        @InjectDataSource()
        private readonly dataSource: DataSource,

        private readonly jwtService: JwtService,
    ) { }

    async bootstrapAdmin(
        dto: BootstrapAdminDto,
    ) {
        /*
         * Bootstrap is allowed only once.
         */
        const userCount =
            await this.userRepository.count();

        if (userCount > 0) {
            throw new ConflictException(
                'Admin bootstrap is already completed',
            );
        }

        /*
         * ADMIN role must already exist.
         */
        const adminRole =
            await this.roleRepository.findOne({
                where: {
                    code: 'ADMIN',
                    isActive: true,
                },
            });

        if (!adminRole) {
            throw new NotFoundException(
                'ADMIN role is not configured',
            );
        }

        /*
         * Department, Designation, Employee and User
         * are created in one transaction.
         */
        return this.dataSource.transaction(
            async (manager) => {
                /*
                 * -------------------------------------------------
                 * 1. Check Department
                 * -------------------------------------------------
                 */
                const existingDepartment =
                    await manager.findOne(
                        Department,
                        {
                            where: [
                                {
                                    name: dto.departmentName,
                                },
                                {
                                    code: dto.departmentCode,
                                },
                            ],
                        },
                    );

                if (existingDepartment) {
                    throw new ConflictException(
                        'Department name or code already exists',
                    );
                }

                /*
                 * -------------------------------------------------
                 * 2. Create Department
                 * -------------------------------------------------
                 */
                const department =
                    manager.create(
                        Department,
                        {
                            name: dto.departmentName,
                            code: dto.departmentCode,
                            isActive: true,
                        },
                    );

                const savedDepartment =
                    await manager.save(
                        Department,
                        department,
                    );

                /*
                 * -------------------------------------------------
                 * 3. Check Designation
                 * -------------------------------------------------
                 */
                const existingDesignation =
                    await manager.findOne(
                        Designation,
                        {
                            where: [
                                {
                                    name: dto.designationName,
                                },
                                {
                                    code: dto.designationCode,
                                },
                            ],
                        },
                    );

                if (existingDesignation) {
                    throw new ConflictException(
                        'Designation name or code already exists',
                    );
                }

                /*
                 * -------------------------------------------------
                 * 4. Create Designation
                 * -------------------------------------------------
                 */
                const designation =
                    manager.create(
                        Designation,
                        {
                            name: dto.designationName,
                            code: dto.designationCode,
                            isActive: true,
                        },
                    );

                const savedDesignation =
                    await manager.save(
                        Designation,
                        designation,
                    );

                /*
                 * -------------------------------------------------
                 * 5. Check Employee email
                 *
                 * Employee code is generated automatically
                 * by PostgreSQL.
                 * -------------------------------------------------
                 */
                const existingEmployee =
                    await manager.findOne(
                        Employee,
                        {
                            where: {
                                email: dto.email,
                            },
                        },
                    );

                if (existingEmployee) {
                    throw new ConflictException(
                        'Employee email already exists',
                    );
                }

                /*
                 * -------------------------------------------------
                 * 6. Create Employee
                 *
                 * employeeCode is generated by PostgreSQL.
                 * -------------------------------------------------
                 */
                const employee =
                    manager.create(
                        Employee,
                        {
                            firstName:
                                dto.firstName,

                            lastName:
                                dto.lastName,

                            email:
                                dto.email,

                            phone:
                                dto.phone,

                            dateOfJoining:
                                new Date(
                                    dto.dateOfJoining,
                                ),

                            status:
                                dto.status,

                            department:
                                savedDepartment,

                            designation:
                                savedDesignation,

                            manager:
                                null,
                        },
                    );

                const savedEmployee =
                    await manager.save(
                        Employee,
                        employee,
                    );

                /*
                 * -------------------------------------------------
                 * 7. Check Username
                 * -------------------------------------------------
                 */
                const existingUsername =
                    await manager.findOne(
                        User,
                        {
                            where: {
                                username:
                                    dto.username,
                            },
                        },
                    );

                if (existingUsername) {
                    throw new ConflictException(
                        'Username already exists',
                    );
                }

                /*
                 * -------------------------------------------------
                 * 8. Hash Password
                 * -------------------------------------------------
                 */
                const passwordHash =
                    await bcrypt.hash(
                        dto.password,
                        12,
                    );

                /*
                 * -------------------------------------------------
                 * 9. Create ADMIN User
                 * -------------------------------------------------
                 */
                const user =
                    manager.create(
                        User,
                        {
                            employee:
                                savedEmployee,

                            username:
                                dto.username,

                            passwordHash,

                            role:
                                adminRole,

                            isActive:
                                true,
                        },
                    );

                const savedUser =
                    await manager.save(
                        User,
                        user,
                    );

                /*
                 * -------------------------------------------------
                 * 10. Return Bootstrap Result
                 * -------------------------------------------------
                 */
                return {
                    message:
                        'Admin bootstrap completed successfully',

                    user: {
                        id:
                            savedUser.id,

                        username:
                            savedUser.username,

                        role:
                            adminRole.code,

                        roleId:
                            adminRole.id,

                        employeeId:
                            savedEmployee.id,
                    },

                    employee: {
                        id:
                            savedEmployee.id,

                        employeeCode:
                            savedEmployee.employeeCode,

                        firstName:
                            savedEmployee.firstName,

                        lastName:
                            savedEmployee.lastName,

                        email:
                            savedEmployee.email,
                    },

                    department: {
                        id:
                            savedDepartment.id,

                        name:
                            savedDepartment.name,

                        code:
                            savedDepartment.code,
                    },

                    designation: {
                        id:
                            savedDesignation.id,

                        name:
                            savedDesignation.name,

                        code:
                            savedDesignation.code,
                    },
                };
            },
        );
    }

    async createUser(
        dto: CreateUserDto,
    ) {
        const employee =
            await this.employeeRepository.findOne({
                where: {
                    id: dto.employeeId,
                },
            });

        if (!employee) {
            throw new NotFoundException(
                'Employee not found',
            );
        }

        const role =
            await this.roleRepository.findOne({
                where: {
                    id: dto.roleId,
                    isActive: true,
                },
            });

        if (!role) {
            throw new NotFoundException(
                'Role not found or inactive',
            );
        }

        const existingUser =
            await this.userRepository.findOne({
                where: {
                    username: dto.username,
                },
            });

        if (existingUser) {
            throw new ConflictException(
                'Username already exists',
            );
        }

        const employeeUser =
            await this.userRepository.findOne({
                where: {
                    employee: {
                        id: dto.employeeId,
                    },
                },
            });

        if (employeeUser) {
            throw new ConflictException(
                'This employee already has a user account',
            );
        }

        const passwordHash =
            await bcrypt.hash(
                dto.password,
                12,
            );

        const user =
            this.userRepository.create({
                employee,
                username: dto.username,
                passwordHash,
                role,
                isActive: true,
            });

        const savedUser =
            await this.userRepository.save(user);

        return {
            id: savedUser.id,
            username: savedUser.username,
            role: role.code,
            roleId: role.id,
            employeeId: employee.id,
        };
    }

    async login(
        dto: LoginDto,
    ) {
        const user =
            await this.userRepository.findOne({
                where: {
                    username: dto.username,
                },
                relations: {
                    employee: {
                        department: true,
                        designation: true,
                    },
                    role: true,
                },
            });

        if (!user) {
            throw new UnauthorizedException(
                'Invalid username or password',
            );
        }

        if (!user.isActive) {
            throw new UnauthorizedException(
                'User account is inactive',
            );
        }

        if (
            !user.role ||
            !user.role.isActive
        ) {
            throw new UnauthorizedException(
                'User role is inactive or unavailable',
            );
        }

        const passwordMatches =
            await bcrypt.compare(
                dto.password,
                user.passwordHash,
            );

        if (!passwordMatches) {
            throw new UnauthorizedException(
                'Invalid username or password',
            );
        }

        /*
         * Load permissions assigned to the user's role.
         */
        const permissions =
            await this.getUserPermissions(
                user.role.id,
            );

        const accessToken =
            await this.createAccessToken(user);

        const refreshToken =
            await this.createRefreshToken(user);

        return {
            accessToken,
            refreshToken,
            tokenType: 'Bearer',

            expiresIn:
                this.accessTokenExpiresIn,

            refreshExpiresIn:
                this.refreshTokenExpiresIn,

            user: {
                id:
                    user.id,

                username:
                    user.username,

                employeeId:
                    user.employee.id,

                employee: user.employee
                    ? {
                          id: user.employee.id,
                          employeeCode: user.employee.employeeCode,
                          firstName: user.employee.firstName,
                          lastName: user.employee.lastName,
                          email: user.employee.email,
                          status: user.employee.status,
                          department: user.employee.department
                              ? {
                                    id: user.employee.department.id,
                                    name: user.employee.department.name,
                                    code: user.employee.department.code,
                                }
                              : null,
                          designation: user.employee.designation
                              ? {
                                    id: user.employee.designation.id,
                                    name: user.employee.designation.name,
                                    code: user.employee.designation.code,
                                }
                              : null,
                      }
                    : undefined,

                roleId:
                    user.role.id,

                role:
                    user.role.code,

                permissions,
            },
        };
    }

    async refresh(
        refreshToken: string,
    ) {
        const tokenHash =
            this.hashRefreshToken(
                refreshToken,
            );

        const storedToken =
            await this.refreshTokenRepository.findOne({
                where: {
                    tokenHash,
                },
                relations: {
                    user: {
                        employee: {
                            department: true,
                            designation: true,
                        },
                        role: true,
                    },
                },
            });

        if (!storedToken) {
            throw new UnauthorizedException(
                'Invalid refresh token',
            );
        }

        if (storedToken.revokedAt) {
            throw new UnauthorizedException(
                'Refresh token has been revoked',
            );
        }

        if (
            storedToken.expiresAt.getTime() <=
            Date.now()
        ) {
            storedToken.revokedAt =
                new Date();

            await this.refreshTokenRepository.save(
                storedToken,
            );

            throw new UnauthorizedException(
                'Refresh token has expired',
            );
        }

        const user =
            storedToken.user;

        if (!user || !user.isActive) {
            throw new UnauthorizedException(
                'User account is inactive',
            );
        }

        if (
            !user.role ||
            !user.role.isActive
        ) {
            throw new UnauthorizedException(
                'User role is inactive or unavailable',
            );
        }

        /*
         * Load latest permissions from DB.
         *
         * This is important because permissions can be
         * changed from the RBAC UI without changing the
         * user's stored tokens.
         */
        const permissions =
            await this.getUserPermissions(
                user.role.id,
            );

        storedToken.revokedAt =
            new Date();

        await this.refreshTokenRepository.save(
            storedToken,
        );

        const newAccessToken =
            await this.createAccessToken(user);

        const newRefreshToken =
            await this.createRefreshToken(user);

        return {
            accessToken:
                newAccessToken,

            refreshToken:
                newRefreshToken,

            tokenType: 'Bearer',

            expiresIn:
                this.accessTokenExpiresIn,

            refreshExpiresIn:
                this.refreshTokenExpiresIn,

            user: {
                id:
                    user.id,

                username:
                    user.username,

                employeeId:
                    user.employee.id,

                employee: user.employee
                    ? {
                          id: user.employee.id,
                          employeeCode: user.employee.employeeCode,
                          firstName: user.employee.firstName,
                          lastName: user.employee.lastName,
                          email: user.employee.email,
                          status: user.employee.status,
                          department: user.employee.department
                              ? {
                                    id: user.employee.department.id,
                                    name: user.employee.department.name,
                                    code: user.employee.department.code,
                                }
                              : null,
                          designation: user.employee.designation
                              ? {
                                    id: user.employee.designation.id,
                                    name: user.employee.designation.name,
                                    code: user.employee.designation.code,
                                }
                              : null,
                      }
                    : undefined,

                roleId:
                    user.role.id,

                role:
                    user.role.code,

                permissions,
            },
        };
    }

    async logout(
        refreshToken: string,
    ) {
        const tokenHash =
            this.hashRefreshToken(
                refreshToken,
            );

        const storedToken =
            await this.refreshTokenRepository.findOne({
                where: {
                    tokenHash,
                },
            });

        if (
            storedToken &&
            !storedToken.revokedAt
        ) {
            storedToken.revokedAt =
                new Date();

            await this.refreshTokenRepository.save(
                storedToken,
            );
        }

        return {
            message:
                'Logged out successfully',
        };
    }

    async findById(
        userId: string,
    ) {
        const user =
            await this.userRepository.findOne({
                where: {
                    id: userId,
                },
                relations: {
                    employee: true,
                    role: true,
                },
            });

        if (!user || !user.isActive) {
            throw new UnauthorizedException(
                'User is not available',
            );
        }

        if (
            !user.role ||
            !user.role.isActive
        ) {
            throw new UnauthorizedException(
                'User role is inactive or unavailable',
            );
        }

        return user;
    }

    async findAll(): Promise<Omit<User, 'passwordHash'>[]> {
        const users = await this.userRepository.find({
            relations: {
                employee: {
                    department: true,
                    designation: true,
                },
                role: true,
            },
            order: {
                username: 'ASC',
            },
        });

        return users.map((u) => {
            const { passwordHash: _, ...rest } = u;
            return rest as Omit<User, 'passwordHash'>;
        });
    }

    async findUserById(id: string): Promise<Omit<User, 'passwordHash'>> {
        const user = await this.userRepository.findOne({
            where: { id },
            relations: {
                employee: {
                    department: true,
                    designation: true,
                },
                role: true,
            },
        });

        if (!user) {
            throw new NotFoundException(`User with id "${id}" not found`);
        }

        const { passwordHash: _, ...rest } = user;
        return rest as Omit<User, 'passwordHash'>;
    }

    async updateUser(
        id: string,
        dto: UpdateUserDto,
    ): Promise<Omit<User, 'passwordHash'>> {
        const user = await this.userRepository.findOne({
            where: { id },
            relations: {
                employee: true,
                role: true,
            },
        });

        if (!user) {
            throw new NotFoundException(`User with id "${id}" not found`);
        }

        if (dto.username && dto.username !== user.username) {
            const existing = await this.userRepository.findOne({
                where: { username: dto.username },
            });
            if (existing && existing.id !== id) {
                throw new ConflictException('Username already exists');
            }
            user.username = dto.username;
        }

        if (dto.roleId && (!user.role || dto.roleId !== user.role.id)) {
            const role = await this.roleRepository.findOne({
                where: { id: dto.roleId, isActive: true },
            });
            if (!role) {
                throw new NotFoundException('Role not found or inactive');
            }
            user.role = role;
        }

        if (dto.password) {
            user.passwordHash = await bcrypt.hash(dto.password, 12);
        }

        await this.userRepository.save(user);
        return this.findUserById(id);
    }

    async activateUser(id: string): Promise<Omit<User, 'passwordHash'>> {
        const user = await this.userRepository.findOne({
            where: { id },
        });

        if (!user) {
            throw new NotFoundException(`User with id "${id}" not found`);
        }

        user.isActive = true;
        await this.userRepository.save(user);
        return this.findUserById(id);
    }

    async deactivateUser(id: string): Promise<Omit<User, 'passwordHash'>> {
        const user = await this.userRepository.findOne({
            where: { id },
        });

        if (!user) {
            throw new NotFoundException(`User with id "${id}" not found`);
        }

        user.isActive = false;
        await this.userRepository.save(user);
        return this.findUserById(id);
    }

    async changePassword(
        userId: string,
        dto: ChangePasswordDto,
    ): Promise<{ message: string }> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!user || !user.isActive) {
            throw new NotFoundException('User account not found or inactive');
        }

        const isCurrentValid = await bcrypt.compare(
            dto.currentPassword,
            user.passwordHash,
        );

        if (!isCurrentValid) {
            throw new BadRequestException('Current password is incorrect');
        }

        if (dto.currentPassword === dto.newPassword) {
            throw new BadRequestException(
                'New password must be different from your current password',
            );
        }

        user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
        await this.userRepository.save(user);

        return {
            message: 'Password updated successfully',
        };
    }

    /*
     * ---------------------------------------------------------
     * Get permissions assigned to a role
     * ---------------------------------------------------------
     *
     * Permissions are loaded from:
     *
     * roles
     *    ↓
     * role_permissions
     *    ↓
     * permissions
     *
     * Only active roles and active permissions are returned.
     */
    private async getUserPermissions(
        roleId: string,
    ): Promise<string[]> {
        const rolePermissions =
            await this.rolePermissionRepository
                .createQueryBuilder('rolePermission')
                .innerJoinAndSelect(
                    'rolePermission.permission',
                    'permission',
                )
                .innerJoin(
                    'rolePermission.role',
                    'role',
                )
                .where(
                    'rolePermission.role_id = :roleId',
                    {
                        roleId,
                    },
                )
                .andWhere(
                    'role.is_active = true',
                )
                .andWhere(
                    'permission.is_active = true',
                )
                .orderBy(
                    'permission.module',
                    'ASC',
                )
                .addOrderBy(
                    'permission.code',
                    'ASC',
                )
                .getMany();

        return rolePermissions.map(
            (rolePermission) =>
                rolePermission.permission.code,
        );
    }

    private async createAccessToken(
        user: User,
    ): Promise<string> {
        const payload = {
            sub:
                user.id,

            employeeId:
                user.employee.id,

            roleId:
                user.role.id,

            role:
                user.role.code,

            username:
                user.username,
        };

        return this.jwtService.signAsync(
            payload,
            {
                expiresIn:
                    this.accessTokenExpiresIn,
            },
        );
    }

    private async createRefreshToken(
        user: User,
    ): Promise<string> {
        const refreshToken =
            crypto
                .randomBytes(64)
                .toString('hex');

        const tokenHash =
            this.hashRefreshToken(
                refreshToken,
            );

        const expiresAt =
            new Date(
                Date.now() +
                this.refreshTokenExpiresIn *
                1000,
            );

        const entity =
            this.refreshTokenRepository.create({
                user,
                tokenHash,
                expiresAt,
                revokedAt: null,
            });

        await this.refreshTokenRepository.save(
            entity,
        );

        return refreshToken;
    }

    private hashRefreshToken(
        refreshToken: string,
    ): string {
        return crypto
            .createHash('sha256')
            .update(refreshToken)
            .digest('hex');
    }
}