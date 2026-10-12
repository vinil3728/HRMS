import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsDeletedToRoles1790142001900
  implements MigrationInterface
{
  name = 'AddIsDeletedToRoles1790142001900';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add is_deleted column to roles table
    await queryRunner.query(`
      ALTER TABLE "roles"
      ADD COLUMN IF NOT EXISTS "is_deleted" boolean NOT NULL DEFAULT false;
    `);

    // 2. Seed ROLE_DELETE permission under ROLES_PERMISSIONS module
    await queryRunner.query(`
      INSERT INTO "permissions" ("code", "name", "description", "module_id", "is_active", "is_deleted")
      SELECT
        'ROLE_DELETE',
        'Delete Role',
        'Soft delete custom roles',
        m."id",
        true,
        false
      FROM "modules" m
      WHERE m."code" = 'ROLES_PERMISSIONS' OR m."name" = 'Roles & Permissions' OR m."name" = 'Permissions'
      ORDER BY m."created_at" ASC
      LIMIT 1
      ON CONFLICT ("code") DO NOTHING;
    `);

    // 3. Assign ROLE_DELETE to ADMIN role
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id"
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r."code" = 'ADMIN'
      AND p."code" = 'ROLE_DELETE'
      ON CONFLICT ("role_id", "permission_id") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role_permissions"
      WHERE "permission_id" IN (
        SELECT "id" FROM "permissions" WHERE "code" = 'ROLE_DELETE'
      );
    `);

    await queryRunner.query(`
      DELETE FROM "permissions" WHERE "code" = 'ROLE_DELETE';
    `);

    await queryRunner.query(`
      ALTER TABLE "roles"
      DROP COLUMN IF EXISTS "is_deleted";
    `);
  }
}
