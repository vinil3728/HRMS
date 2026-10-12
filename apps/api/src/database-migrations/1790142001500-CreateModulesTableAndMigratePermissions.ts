import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateModulesTableAndMigratePermissions1790142001500
  implements MigrationInterface
{
  name = 'CreateModulesTableAndMigratePermissions1790142001500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // =========================================================
    // 1. Create modules table
    // =========================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "modules" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "code" character varying NOT NULL,
        "name" character varying NOT NULL,
        "description" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_modules_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_modules_code" UNIQUE ("code"),
        CONSTRAINT "UQ_modules_name" UNIQUE ("name")
      )
    `);

    // =========================================================
    // 2. Insert distinct modules from existing permissions
    // =========================================================
    await queryRunner.query(`
      INSERT INTO "modules" ("code", "name", "description")
      SELECT
        UPPER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM("module"), '[^a-zA-Z0-9]+', '_', 'g'), '^_+|_+$', '', 'g')) AS "code",
        TRIM("module") AS "name",
        'System module for ' || TRIM("module") AS "description"
      FROM "permissions"
      WHERE "module" IS NOT NULL AND TRIM("module") <> ''
      GROUP BY TRIM("module")
      ON CONFLICT ("name") DO NOTHING
    `);

    // Ensure dedicated 'MODULES' module exists
    await queryRunner.query(`
      INSERT INTO "modules" ("code", "name", "description")
      VALUES ('MODULES', 'Modules', 'System modules and dynamic capability registration')
      ON CONFLICT ("name") DO NOTHING
    `);

    // =========================================================
    // 3. Add module_id foreign key column to permissions
    // =========================================================
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'permissions' AND column_name = 'module_id'
        ) THEN
          ALTER TABLE "permissions" ADD COLUMN "module_id" uuid;
        END IF;
      END $$;
    `);

    // Populate module_id based on matching module name
    await queryRunner.query(`
      UPDATE "permissions" p
      SET "module_id" = m."id"
      FROM "modules" m
      WHERE TRIM(p."module") = m."name"
    `);

    // Fallback for any unmatched permission records to 'MODULES' or 'ROLES_PERMISSIONS'
    await queryRunner.query(`
      UPDATE "permissions"
      SET "module_id" = (SELECT "id" FROM "modules" WHERE "code" = 'ROLES_PERMISSIONS' LIMIT 1)
      WHERE "module_id" IS NULL
    `);

    // Enforce NOT NULL on module_id
    await queryRunner.query(`
      ALTER TABLE "permissions" ALTER COLUMN "module_id" SET NOT NULL
    `);

    // Enforce Foreign Key Constraint ON DELETE RESTRICT
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_permissions_module_id'
        ) THEN
          ALTER TABLE "permissions"
          ADD CONSTRAINT "FK_permissions_module_id"
          FOREIGN KEY ("module_id")
          REFERENCES "modules"("id")
          ON DELETE RESTRICT;
        END IF;
      END $$;
    `);

    // Drop NOT NULL from legacy module column before seeding
    await queryRunner.query(`
      ALTER TABLE "permissions" ALTER COLUMN "module" DROP NOT NULL
    `);

    // =========================================================
    // 4. Seed new module management permissions
    // =========================================================
    await queryRunner.query(`
      INSERT INTO "permissions" ("code", "name", "description", "module_id", "module")
      VALUES
        ('MODULE_VIEW', 'View Modules', 'View functional system modules and permission associations', (SELECT "id" FROM "modules" WHERE "code" = 'MODULES' LIMIT 1), 'Modules'),
        ('MODULE_CREATE', 'Create Module', 'Register new functional system modules', (SELECT "id" FROM "modules" WHERE "code" = 'MODULES' LIMIT 1), 'Modules'),
        ('MODULE_UPDATE', 'Update Module', 'Update functional system module details', (SELECT "id" FROM "modules" WHERE "code" = 'MODULES' LIMIT 1), 'Modules'),
        ('MODULE_DELETE', 'Delete Module', 'Delete unassigned functional system modules', (SELECT "id" FROM "modules" WHERE "code" = 'MODULES' LIMIT 1), 'Modules')
      ON CONFLICT ("code") DO NOTHING
    `);

    // Grant module permissions to ADMIN role
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id"
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r."code" = 'ADMIN'
      AND p."code" IN ('MODULE_VIEW', 'MODULE_CREATE', 'MODULE_UPDATE', 'MODULE_DELETE')
      ON CONFLICT ("role_id", "permission_id") DO NOTHING
    `);

    // =========================================================
    // 5. Safely drop legacy module varchar column from permissions
    // =========================================================
    await queryRunner.query(`
      ALTER TABLE "permissions" DROP COLUMN IF EXISTS "module"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back legacy module column
    await queryRunner.query(`
      ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "module" character varying(100)
    `);

    // Repopulate legacy column from modules table
    await queryRunner.query(`
      UPDATE "permissions" p
      SET "module" = m."name"
      FROM "modules" m
      WHERE p."module_id" = m."id"
    `);

    // Remove seeded module permissions
    await queryRunner.query(`
      DELETE FROM "role_permissions"
      WHERE "permission_id" IN (
        SELECT "id" FROM "permissions" WHERE "code" IN ('MODULE_VIEW', 'MODULE_CREATE', 'MODULE_UPDATE', 'MODULE_DELETE')
      )
    `);

    await queryRunner.query(`
      DELETE FROM "permissions"
      WHERE "code" IN ('MODULE_VIEW', 'MODULE_CREATE', 'MODULE_UPDATE', 'MODULE_DELETE')
    `);

    // Drop foreign key and column
    await queryRunner.query(`
      ALTER TABLE "permissions" DROP CONSTRAINT IF EXISTS "FK_permissions_module_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "permissions" DROP COLUMN IF EXISTS "module_id"
    `);

    // Drop modules table
    await queryRunner.query(`
      DROP TABLE IF EXISTS "modules"
    `);
  }
}
