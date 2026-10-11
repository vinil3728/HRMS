import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBranchesAndDepartmentsRelation1790142001300
  implements MigrationInterface
{
  name = 'CreateBranchesAndDepartmentsRelation1790142001300';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create branches table
    await queryRunner.query(`
      CREATE TABLE "branches" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "code" character varying NOT NULL,
        "email" character varying,
        "phone" character varying,
        "address" text,
        "city" character varying,
        "state" character varying,
        "country" character varying NOT NULL DEFAULT 'India',
        "postal_code" character varying,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_branches_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_branches_name" UNIQUE ("name"),
        CONSTRAINT "UQ_branches_code" UNIQUE ("code")
      )
    `);

    // 2. Add branch_id to departments table
    await queryRunner.query(`
      ALTER TABLE "departments"
      ADD COLUMN "branch_id" uuid NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "departments"
      ADD CONSTRAINT "FK_departments_branch"
      FOREIGN KEY ("branch_id")
      REFERENCES "branches"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_departments_branch_id"
      ON "departments" ("branch_id")
    `);

    // 3. Seed Permissions for Branches
    await queryRunner.query(`
      INSERT INTO "permissions" ("code", "name", "description", "module")
      VALUES
        ('BRANCH_VIEW', 'View Branches', 'View company branch offices, locations and subordinate departments', 'Organization'),
        ('BRANCH_CREATE', 'Create Branch', 'Create new company branch office location', 'Organization'),
        ('BRANCH_UPDATE', 'Update Branch', 'Update branch office details, configuration and active status', 'Organization'),
        ('BRANCH_DELETE', 'Delete Branch', 'Deactivate or delete company branch office location', 'Organization')
      ON CONFLICT ("code") DO NOTHING
    `);

    // 4. Grant Branch Permissions to HR and Admin roles
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id"
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r."code" IN ('ADMIN', 'HR')
        AND p."code" IN ('BRANCH_VIEW', 'BRANCH_CREATE', 'BRANCH_UPDATE', 'BRANCH_DELETE')
      ON CONFLICT DO NOTHING
    `);

    // 5. Seed initial starter branches
    await queryRunner.query(`
      INSERT INTO "branches" ("name", "code", "city", "state", "country", "address", "email", "phone")
      VALUES 
        ('Head Office Bengaluru', 'HQ-BLR', 'Bengaluru', 'Karnataka', 'India', 'Prestige Tech Park, Outer Ring Road', 'hq.blr@iprotechs.com', '+918023456789'),
        ('Tech Center Hyderabad', 'TC-HYD', 'Hyderabad', 'Telangana', 'India', 'Hitec City, Madhapur', 'hyd.office@iprotechs.com', '+914023456789')
      ON CONFLICT ("code") DO NOTHING
    `);

    // 6. Link pre-existing departments to the Head Office branch
    await queryRunner.query(`
      UPDATE "departments"
      SET "branch_id" = (SELECT "id" FROM "branches" WHERE "code" = 'HQ-BLR' LIMIT 1)
      WHERE "branch_id" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role_permissions"
      WHERE "permission_id" IN (
        SELECT "id" FROM "permissions"
        WHERE "code" IN ('BRANCH_VIEW', 'BRANCH_CREATE', 'BRANCH_UPDATE', 'BRANCH_DELETE')
      )
    `);

    await queryRunner.query(`
      DELETE FROM "permissions"
      WHERE "code" IN ('BRANCH_VIEW', 'BRANCH_CREATE', 'BRANCH_UPDATE', 'BRANCH_DELETE')
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_departments_branch_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "departments"
      DROP CONSTRAINT IF EXISTS "FK_departments_branch"
    `);

    await queryRunner.query(`
      ALTER TABLE "departments"
      DROP COLUMN IF EXISTS "branch_id"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "branches"
    `);
  }
}
