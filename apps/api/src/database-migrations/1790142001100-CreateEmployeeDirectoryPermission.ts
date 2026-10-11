import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmployeeDirectoryPermission1790142001100
    implements MigrationInterface
{
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Seed the EMPLOYEE_DIRECTORY_VIEW permission
        await queryRunner.query(`
            INSERT INTO "permissions" ("code", "name", "description", "module")
            VALUES (
                'EMPLOYEE_DIRECTORY_VIEW',
                'View Employee Directory',
                'Browse coworker directory, search colleagues, and view work contact details',
                'Employees'
            )
            ON CONFLICT ("code") DO NOTHING
        `);

        // 2. Grant EMPLOYEE_DIRECTORY_VIEW to all active roles so everyone can browse coworkers by default
        await queryRunner.query(`
            INSERT INTO "role_permissions" ("role_id", "permission_id")
            SELECT r."id", p."id"
            FROM "roles" r
            CROSS JOIN "permissions" p
            WHERE p."code" = 'EMPLOYEE_DIRECTORY_VIEW'
            ON CONFLICT DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM "role_permissions"
            WHERE "permission_id" IN (
                SELECT "id" FROM "permissions" WHERE "code" = 'EMPLOYEE_DIRECTORY_VIEW'
            )
        `);

        await queryRunner.query(`
            DELETE FROM "permissions"
            WHERE "code" = 'EMPLOYEE_DIRECTORY_VIEW'
        `);
    }
}
