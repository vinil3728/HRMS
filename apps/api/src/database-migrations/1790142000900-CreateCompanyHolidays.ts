import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCompanyHolidays1790142000900 implements MigrationInterface {
    name = 'CreateCompanyHolidays1790142000900';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create company_holidays table
        await queryRunner.query(`
            CREATE TABLE "company_holidays" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "name" character varying NOT NULL,
                "date" date NOT NULL,
                "day_of_week" character varying NOT NULL,
                "type" character varying NOT NULL DEFAULT 'GAZETTED',
                "description" text,
                "is_active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_company_holidays_id" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_company_holidays_date" ON "company_holidays" ("date")
        `);

        // 2. Seed holiday permissions into permissions table
        await queryRunner.query(`
            INSERT INTO "permissions"
                ("code", "name", "description", "module")
            VALUES
                (
                    'HOLIDAY_VIEW',
                    'View Holidays',
                    'View company holiday calendar and upcoming holidays',
                    'Holidays'
                ),
                (
                    'HOLIDAY_CREATE',
                    'Create Holiday',
                    'Add new holidays to the company calendar',
                    'Holidays'
                ),
                (
                    'HOLIDAY_UPDATE',
                    'Update Holiday',
                    'Modify existing company holidays',
                    'Holidays'
                ),
                (
                    'HOLIDAY_DELETE',
                    'Delete Holiday',
                    'Remove holidays from company calendar',
                    'Holidays'
                )
            ON CONFLICT ("code") DO NOTHING
        `);

        // 3. Grant holiday permissions to ADMIN and HR
        await queryRunner.query(`
            INSERT INTO "role_permissions" ("role_id", "permission_id")
            SELECT r."id", p."id"
            FROM "roles" r
            CROSS JOIN "permissions" p
            WHERE r."code" IN ('ADMIN', 'HR')
            AND p."code" IN ('HOLIDAY_VIEW', 'HOLIDAY_CREATE', 'HOLIDAY_UPDATE', 'HOLIDAY_DELETE')
            ON CONFLICT DO NOTHING
        `);

        // 4. Grant HOLIDAY_VIEW to MANAGER and EMPLOYEE
        await queryRunner.query(`
            INSERT INTO "role_permissions" ("role_id", "permission_id")
            SELECT r."id", p."id"
            FROM "roles" r
            CROSS JOIN "permissions" p
            WHERE r."code" IN ('MANAGER', 'EMPLOYEE')
            AND p."code" = 'HOLIDAY_VIEW'
            ON CONFLICT DO NOTHING
        `);

        // 5. Seed initial 2026 holidays into company_holidays table
        await queryRunner.query(`
            INSERT INTO "company_holidays"
                ("name", "date", "day_of_week", "type", "description")
            VALUES
                ('New Year''s Day', '2026-01-01', 'Thursday', 'COMPANY', 'First day of the calendar year.'),
                ('Republic Day', '2026-01-26', 'Monday', 'GAZETTED', 'Honoring the date on which the Constitution of India came into effect.'),
                ('Maha Shivratri', '2026-02-17', 'Tuesday', 'RESTRICTED', 'Hindu festival celebrated in honor of Lord Shiva.'),
                ('Holi', '2026-03-04', 'Wednesday', 'GAZETTED', 'Festival of colors, love, and the arrival of spring.'),
                ('Id-ul-Fitr', '2026-03-21', 'Saturday', 'GAZETTED', 'Islamic festival marking the end of Ramadan.'),
                ('Good Friday', '2026-04-03', 'Friday', 'GAZETTED', 'Christian holiday commemorating the crucifixion of Jesus.'),
                ('Dr. B.R. Ambedkar Jayanti', '2026-04-14', 'Tuesday', 'GAZETTED', 'Commemorating the birthday of Dr. Babasaheb Ambedkar.'),
                ('Labour Day / May Day', '2026-05-01', 'Friday', 'COMPANY', 'International Workers Day honoring the labor movement.'),
                ('Bakrid / Eid al-Adha', '2026-05-28', 'Thursday', 'GAZETTED', 'Feast of Sacrifice celebrated in Islam.'),
                ('Independence Day', '2026-08-15', 'Saturday', 'GAZETTED', 'National holiday commemorating independence from British rule.'),
                ('Janmashtami', '2026-09-04', 'Friday', 'RESTRICTED', 'Annual Hindu festival that celebrates the birth of Krishna.'),
                ('Mahatma Gandhi Jayanti', '2026-10-02', 'Friday', 'GAZETTED', 'Commemorating the birthday of Mohandas Karamchand Gandhi.'),
                ('Dussehra (Vijayadashami)', '2026-10-20', 'Tuesday', 'GAZETTED', 'Celebrating the victory of good over evil.'),
                ('Diwali (Deepavali)', '2026-11-08', 'Sunday', 'GAZETTED', 'Festival of lights symbolizing the victory of light over darkness.'),
                ('Guru Nanak Jayanti', '2026-11-24', 'Tuesday', 'GAZETTED', 'Celebrates the birth of the first Sikh Guru, Guru Nanak.'),
                ('Christmas Day', '2026-12-25', 'Friday', 'GAZETTED', 'Annual festival commemorating the birth of Jesus Christ.')
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_holidays_date"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "company_holidays"`);
        await queryRunner.query(`
            DELETE FROM "permissions"
            WHERE "code" IN ('HOLIDAY_VIEW', 'HOLIDAY_CREATE', 'HOLIDAY_UPDATE', 'HOLIDAY_DELETE')
        `);
    }
}
