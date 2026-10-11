import { IsNotEmpty, IsString } from 'class-validator';

export class RejectPayslipDto {
    @IsString()
    @IsNotEmpty()
    reason!: string;
}
