import { IsNotEmpty, IsString } from 'class-validator';

export class RejectLoanDto {
  @IsString()
  @IsNotEmpty()
  rejectionReason!: string;
}
