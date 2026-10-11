import { IsNotEmpty, IsString } from 'class-validator';

export class RejectReimbursementDto {
    @IsString()
    @IsNotEmpty()
    rejectionReason!: string;
}