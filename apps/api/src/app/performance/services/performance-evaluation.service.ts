import {
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
    PerformanceCycle,
    PerformanceCycleStatus,
} from '../entities/performance-cycle.entity';

import { PerformanceEvaluation } from '../entities/performance-evaluation.entity';

import { PerformanceEvaluationType } from '../enums/performance-evaluation-type.enum';

import { PerformanceEvaluationStatus } from '../enums/performance-evaluation-status.enum';

import { CreatePerformanceEvaluationDto } from '../dto/create-performance-evaluation.dto';
import { UpdatePerformanceEvaluationDto } from '../dto/update-performance-evaluation.dto';

import { PerformanceCycleService } from './performance-cycle.service';
import { PerformanceGoalService } from './performance-goal.service';

import { EmployeeService } from '../../employees/services/employee.service';
import { RolePermission } from '../../permissions/entities/role-permission.entity';
import { Permission } from '../../permissions/enums/permission.enum';

@Injectable()
export class PerformanceEvaluationService {
    constructor(
        @InjectRepository(PerformanceEvaluation)
        private readonly evaluationRepository: Repository<PerformanceEvaluation>,

        private readonly employeeService: EmployeeService,

        private readonly performanceCycleService: PerformanceCycleService,

        private readonly performanceGoalService: PerformanceGoalService,

        @InjectRepository(RolePermission)
        private readonly rolePermissionRepository: Repository<RolePermission>,
    ) {}

    async create(
        employeeId: string,
        cycleId: string,
        goalId: string,
        dto: CreatePerformanceEvaluationDto,
    ): Promise<PerformanceEvaluation> {
        const employee =
            await this.employeeService.findOne(
                employeeId,
            );

        const cycle =
            await this.performanceCycleService.findOne(
                cycleId,
            );

        this.validateCycle(cycle);

        const goal =
            await this.performanceGoalService.findOne(
                employeeId,
                cycleId,
                goalId,
            );

        const existing =
            await this.evaluationRepository.findOne({
                where: {
                    goal: {
                        id: goalId,
                    },
                    evaluationType:
                        dto.evaluationType,
                },
            });

        if (existing) {
            throw new ConflictException(
                `${dto.evaluationType} evaluation already exists for this goal`,
            );
        }

        const evaluation =
            this.evaluationRepository.create({
                employee,
                cycle,
                goal,
                evaluationType:
                    dto.evaluationType,
                status:
                    PerformanceEvaluationStatus.DRAFT,
                rating:
                    dto.rating ?? null,
                comments:
                    dto.comments ?? null,
            });

        return this.evaluationRepository.save(
            evaluation,
        );
    }

    async findAll(
        employeeId: string,
        cycleId: string,
        goalId: string,
    ): Promise<PerformanceEvaluation[]> {
        await this.performanceGoalService.findOne(
            employeeId,
            cycleId,
            goalId,
        );

        return this.evaluationRepository.find({
            where: {
                employee: {
                    id: employeeId,
                },
                cycle: {
                    id: cycleId,
                },
                goal: {
                    id: goalId,
                },
            },
            relations: {
                employee: true,
                cycle: true,
                goal: true,
            },
            order: {
                createdAt: 'ASC',
            },
        });
    }

    async findOne(
        employeeId: string,
        cycleId: string,
        goalId: string,
        evaluationId: string,
    ): Promise<PerformanceEvaluation> {
        const evaluation =
            await this.evaluationRepository.findOne({
                where: {
                    id: evaluationId,
                    employee: {
                        id: employeeId,
                    },
                    cycle: {
                        id: cycleId,
                    },
                    goal: {
                        id: goalId,
                    },
                },
                relations: {
                    employee: true,
                    cycle: true,
                    goal: true,
                },
            });

        if (!evaluation) {
            throw new NotFoundException(
                'Performance evaluation not found',
            );
        }

        return evaluation;
    }

    async update(
        employeeId: string,
        cycleId: string,
        goalId: string,
        evaluationId: string,
        dto: UpdatePerformanceEvaluationDto,
        currentUser: {
            employeeId: string;
            role: string;
        },
    ): Promise<PerformanceEvaluation> {
        const evaluation =
            await this.findOne(
                employeeId,
                cycleId,
                goalId,
                evaluationId,
            );

        this.validateCycle(
            evaluation.cycle,
        );

        if (
            evaluation.status !==
            PerformanceEvaluationStatus.DRAFT
        ) {
            throw new ConflictException(
                'Submitted evaluation cannot be updated',
            );
        }

        await this.validateUpdateAccess(
            evaluation,
            currentUser,
        );

        if (dto.rating !== undefined) {
            evaluation.rating = dto.rating;
        }

        if (dto.comments !== undefined) {
            evaluation.comments =
                dto.comments;
        }

        return this.evaluationRepository.save(
            evaluation,
        );
    }

    async submit(
        employeeId: string,
        cycleId: string,
        goalId: string,
        evaluationId: string,
        currentUser?: {
            employeeId: string;
            role: string;
        },
    ): Promise<PerformanceEvaluation> {
        const evaluation =
            await this.findOne(
                employeeId,
                cycleId,
                goalId,
                evaluationId,
            );

        this.validateCycle(
            evaluation.cycle,
        );

        if (
            evaluation.status !==
            PerformanceEvaluationStatus.DRAFT
        ) {
            throw new ConflictException(
                'Evaluation has already been submitted',
            );
        }

        if (currentUser) {
            await this.validateUpdateAccess(
                evaluation,
                currentUser,
            );
        }

        if (evaluation.rating === null) {
            throw new ConflictException(
                'Rating is required before submitting evaluation',
            );
        }

        if (
            !evaluation.comments ||
            !evaluation.comments.trim()
        ) {
            throw new ConflictException(
                'Comments are required before submitting evaluation',
            );
        }

        evaluation.status =
            PerformanceEvaluationStatus.SUBMITTED;

        return this.evaluationRepository.save(
            evaluation,
        );
    }

    private async hasOrgWideEmployeeScope(
        roleName?: string,
    ): Promise<boolean> {
        if (!roleName) {
            return false;
        }
        const count =
            await this.rolePermissionRepository
                .createQueryBuilder('rolePermission')
                .innerJoin('rolePermission.role', 'role')
                .innerJoin('rolePermission.permission', 'permission')
                .where('role.name = :roleName', { roleName })
                .andWhere('role.is_active = true')
                .andWhere('permission.is_active = true')
                .andWhere('permission.code = :code', {
                    code: Permission.EMPLOYEE_VIEW,
                })
                .getCount();
        return count > 0;
    }

    async validateEvaluationAccess(
        currentUser: {
            employeeId: string;
            role: string;
        },
        employeeId: string,
        evaluationType: PerformanceEvaluationType,
    ): Promise<void> {
        /*
         * SELF evaluation:
         *
         * Any user can create a SELF evaluation only
         * for their own employee record (unless they
         * hold org-wide employee scope).
         */
        if (
            evaluationType ===
            PerformanceEvaluationType.SELF
        ) {
            if (
                currentUser.employeeId ===
                employeeId
            ) {
                return;
            }

            if (
                await this.hasOrgWideEmployeeScope(
                    currentUser.role,
                )
            ) {
                return;
            }

            throw new ForbiddenException(
                'You can only create SELF evaluations for yourself',
            );
        }

        /*
         * MANAGER evaluation:
         *
         * The employee must directly report to
         * the current user's employee record, or the
         * current user must hold org-wide employee scope.
         */
        if (
            evaluationType ===
            PerformanceEvaluationType.MANAGER
        ) {
            if (
                await this.hasOrgWideEmployeeScope(
                    currentUser.role,
                )
            ) {
                return;
            }

            const employee =
                await this.employeeService.findOne(
                    employeeId,
                );

            if (
                employee.manager?.id !==
                currentUser.employeeId
            ) {
                throw new ForbiddenException(
                    'You can only create MANAGER evaluations for your direct reports',
                );
            }

            return;
        }

        throw new ForbiddenException(
            'You do not have permission to create this evaluation',
        );
    }

    private async validateUpdateAccess(
        evaluation: PerformanceEvaluation,
        currentUser: {
            employeeId: string;
            role: string;
        },
    ): Promise<void> {
        /*
         * SELF evaluation:
         *
         * Only the employee who owns the evaluation
         * (or a user with org-wide employee scope) can update/submit it.
         */
        if (
            evaluation.evaluationType ===
            PerformanceEvaluationType.SELF
        ) {
            if (
                evaluation.employee.id ===
                currentUser.employeeId
            ) {
                return;
            }

            if (
                await this.hasOrgWideEmployeeScope(
                    currentUser.role,
                )
            ) {
                return;
            }

            throw new ForbiddenException(
                'You can only update your own SELF evaluation',
            );
        }

        /*
         * MANAGER evaluation:
         *
         * Only the manager of the employee (or a user
         * with org-wide employee scope) can update/submit
         * the manager evaluation.
         */
        if (
            evaluation.evaluationType ===
            PerformanceEvaluationType.MANAGER
        ) {
            if (
                await this.hasOrgWideEmployeeScope(
                    currentUser.role,
                )
            ) {
                return;
            }

            const employee =
                await this.employeeService.findOne(
                    evaluation.employee.id,
                );

            if (
                employee.manager?.id !==
                currentUser.employeeId
            ) {
                throw new ForbiddenException(
                    'You can only update MANAGER evaluations of your direct reports',
                );
            }

            return;
        }

        throw new ForbiddenException(
            'You do not have permission to update this evaluation',
        );
    }

    private validateCycle(
        cycle: PerformanceCycle,
    ): void {
        if (
            cycle.status ===
            PerformanceCycleStatus.CLOSED
        ) {
            throw new ConflictException(
                'Closed performance cycle cannot be modified',
            );
        }
    }
}