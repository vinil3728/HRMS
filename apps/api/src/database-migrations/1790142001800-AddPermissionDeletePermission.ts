import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPermissionDeletePermission1790142001800
  implements MigrationInterface
{
  name = 'AddPermissionDeletePermission1790142001800';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Seed PERMISSION_DELETE permission under ROLES_PERMISSIONS module
    await queryRunner.query(`
      INSERT INTO "permissions" ("code", "name", "description", "module_id", "is_active", "is_deleted")
      SELECT
        'PERMISSION_DELETE',
        'Delete Permission',
        'Delete system permissions',
        m."id",
        true,
        false
      FROM "modules" m
      WHERE m."code" = 'ROLES_PERMISSIONS' OR m."name" = 'Roles & Permissions' OR m."name" = 'Permissions'
      ORDER BY m."created_at" ASC
      LIMIT 1
      ON CONFLICT ("code") DO NOTHING;
    `);

    // 2. Assign PERMISSION_DELETE to ADMIN role
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id"
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r."code" = 'ADMIN'
      AND p."code" = 'PERMISSION_DELETE'
      ON CONFLICT ("role_id", "permission_id") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role_permissions"
      WHERE "permission_id" IN (
        SELECT "id" FROM "permissions" WHERE "code" = 'PERMISSION_DELETE'
      )
    `);

    await queryRunner.query(`
      DELETE FROM "permissions" WHERE "code" = 'PERMISSION_DELETE'
    `);
  }
}
