import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import { Request } from 'express';

import { AuthService } from '../auth.service';

export interface AuthenticatedRequest
    extends Request {
    user: {
        userId: string;
        employeeId: string;
        roleId: string;
        role: string;
        username: string;
    };
}

@Injectable()
export class JwtAuthGuard
    implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly authService: AuthService,
    ) {}

    async canActivate(
        context: ExecutionContext,
    ): Promise<boolean> {
        const request =
            context
                .switchToHttp()
                .getRequest<AuthenticatedRequest>();

        const authorization =
            request.headers.authorization;

        if (!authorization) {
            throw new UnauthorizedException(
                'Authorization token is required',
            );
        }

        const [type, token] =
            authorization.split(' ');

        if (
            type !== 'Bearer' ||
            !token
        ) {
            throw new UnauthorizedException(
                'Invalid authorization header',
            );
        }

        try {
            const payload =
                await this.jwtService.verifyAsync(
                    token,
                );

            const user =
                await this.authService.findById(
                    payload.sub,
                );

            request.user = {
                userId: user.id,
                employeeId: user.employee.id,
                roleId: user.role.id,
                role: user.role.code,
                username: user.username,
            };

            return true;
        } catch {
            throw new UnauthorizedException(
                'Invalid or expired token',
            );
        }
    }
}