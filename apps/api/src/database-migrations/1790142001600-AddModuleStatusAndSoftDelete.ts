import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddModuleStatusAndSoftDelete1790142001600
  implements MigrationInterface
{
  name = 'AddModuleStatusAndSoftDelete1790142001600';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add is_active and is_deleted columns to modules
    await queryRunner.query(`
      ALTER TABLE "modules"
      ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "is_deleted" boolean NOT NULL DEFAULT false;
    `);

    // 2. Convert unique constraints to partial unique indexes for soft delete support
    await queryRunner.query(`
      ALTER TABLE "modules" DROP CONSTRAINT IF EXISTS "UQ_modules_code";
      ALTER TABLE "modules" DROP CONSTRAINT IF EXISTS "UQ_modules_name";
      DROP INDEX IF EXISTS "UQ_modules_code_active";
      DROP INDEX IF EXISTS "UQ_modules_name_active";
      CREATE UNIQUE INDEX "UQ_modules_code_active" ON "modules" ("code") WHERE ("is_deleted" = false);
      CREATE UNIQUE INDEX "UQ_modules_name_active" ON "modules" ("name") WHERE ("is_deleted" = false);
    `);

    // 3. Seed MODULE_ACTIVATE and MODULE_DEACTIVATE permissions
    await queryRunner.query(`
      INSERT INTO "permissions" ("code", "name", "description", "module_id", "is_active")
      VALUES
        ('MODULE_ACTIVATE', 'Activate Module', 'Activate functional system module and its associated permissions', (SELECT "id" FROM "modules" WHERE "code" = 'MODULES' LIMIT 1), true),
        ('MODULE_DEACTIVATE', 'Deactivate Module', 'Deactivate functional system module and its associated permissions', (SELECT "id" FROM "modules" WHERE "code" = 'MODULES' LIMIT 1), true)
      ON CONFLICT ("code") DO NOTHING;
    `);

    // 4. Assign new permissions to ADMIN role
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id"
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r."code" = 'ADMIN'
      AND p."code" IN ('MODULE_ACTIVATE', 'MODULE_DEACTIVATE')
      ON CONFLICT ("role_id", "permission_id") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove role permissions and permissions
    await queryRunner.query(`
      DELETE FROM "role_permissions"
      WHERE "permission_id" IN (
        SELECT "id" FROM "permissions" WHERE "code" IN ('MODULE_ACTIVATE', 'MODULE_DEACTIVATE')
      );
      DELETE FROM "permissions"
      WHERE "code" IN ('MODULE_ACTIVATE', 'MODULE_DEACTIVATE');
    `);

    // Revert unique indexes to constraints
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_modules_code_active";
      DROP INDEX IF EXISTS "UQ_modules_name_active";
      ALTER TABLE "modules" ADD CONSTRAINT "UQ_modules_code" UNIQUE ("code");
      ALTER TABLE "modules" ADD CONSTRAINT "UQ_modules_name" UNIQUE ("name");
    `);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE "modules"
      DROP COLUMN IF EXISTS "is_active",
      DROP COLUMN IF EXISTS "is_deleted";
    `);
  }
}
