import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsDeletedToPermissions1790142001700
  implements MigrationInterface
{
  name = 'AddIsDeletedToPermissions1790142001700';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add is_deleted column to permissions table
    await queryRunner.query(`
      ALTER TABLE "permissions"
      ADD COLUMN IF NOT EXISTS "is_deleted" boolean NOT NULL DEFAULT false;
    `);

    // 2. Synchronize is_deleted and is_active for any permissions whose module is already deleted
    await queryRunner.query(`
      UPDATE "permissions" p
      SET "is_deleted" = true, "is_active" = false
      FROM "modules" m
      WHERE p."module_id" = m."id" AND m."is_deleted" = true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "permissions"
      DROP COLUMN IF EXISTS "is_deleted";
    `);
  }
}
