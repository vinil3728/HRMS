export class AttendanceSummaryResponseDto {
    readonly month!: string;
    readonly totalDays!: number;
    readonly present!: number;
    readonly absent!: number;
    readonly halfDay!: number;
    readonly leave!: number;
    readonly holiday!: number;
    readonly weekOff!: number;
    readonly totalWorkingHours!: number;
}