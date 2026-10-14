import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { HolidayService } from './holiday.service';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { Permissions } from '../permissions/decorators/permissions.decorator';
import { Permission } from '../permissions/enums/permission.enum';

@Controller('holidays')
@UseGuards(JwtAuthGuard)
export class HolidayController {
    constructor(private readonly holidayService: HolidayService) {}

    @Get()
    @UseGuards(PermissionGuard)
    @Permissions(Permission.HOLIDAY_VIEW)
    findAll(
        @Query('year') year?: string,
        @Query('type') type?: string,
    ) {
        const parsedYear = year ? parseInt(year, 10) : undefined;
        return this.holidayService.findAll(parsedYear, type);
    }

    @Get(':id')
    @UseGuards(PermissionGuard)
    @Permissions(Permission.HOLIDAY_VIEW)
    findOne(@Param('id', new ParseUUIDPipe()) id: string) {
        return this.holidayService.findOne(id);
    }

    @Post()
    @UseGuards(PermissionGuard)
    @Permissions(Permission.HOLIDAY_CREATE)
    create(@Body() dto: CreateHolidayDto) {
        return this.holidayService.create(dto);
    }

    @Patch(':id')
    @UseGuards(PermissionGuard)
    @Permissions(Permission.HOLIDAY_EDIT)
    update(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() dto: UpdateHolidayDto,
    ) {
        return this.holidayService.update(id, dto);
    }

    @Delete(':id')
    @UseGuards(PermissionGuard)
    @Permissions(Permission.HOLIDAY_DELETE)
    remove(@Param('id', new ParseUUIDPipe()) id: string) {
        return this.holidayService.remove(id);
    }
}
