import { IsNotEmpty, IsString } from 'class-validator';

export class RejectRegularizationDto {
    @IsNotEmpty()
    @IsString()
    rejectionReason!: string;
}
