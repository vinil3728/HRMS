import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyHoliday } from './entities/company-holiday.entity';
import { HolidayController } from './holiday.controller';
import { HolidayService } from './holiday.service';
import { AuthModule } from '../../auth/auth.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([CompanyHoliday]),
        AuthModule,
        PermissionsModule,
    ],
    controllers: [HolidayController],
    providers: [HolidayService],
    exports: [HolidayService],
})
export class HolidaysModule {}
