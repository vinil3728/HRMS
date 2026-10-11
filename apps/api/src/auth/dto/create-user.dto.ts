import {
    IsNotEmpty,
    IsString,
    IsUUID,
    MinLength,
} from 'class-validator';

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    @IsUUID()
    employeeId!: string;

    @IsString()
    @IsNotEmpty()
    username!: string;

    @IsString()
    @MinLength(8)
    password!: string;

    @IsUUID()
    roleId!: string;
}