import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorLeavePermissionsAndSchema1790142002100 implements MigrationInterface {
  name = 'RefactorLeavePermissionsAndSchema1790142002100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add half-day columns to leaves table
    await queryRunner.query(`
      ALTER TABLE "leaves"
      ADD COLUMN IF NOT EXISTS "is_half_day" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "half_day_session" varchar(20) NULL;
    `);

    // 2. Add performance index on leaves table
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_leaves_employee_status_dates"
      ON "leaves" ("employee_id", "status", "start_date", "end_date");
    `);

    // 3. Obtain the Leave Management module ID
    const leaveModuleRes = await queryRunner.query(`
      SELECT "id" FROM "modules" WHERE "code" = 'LEAVE' OR "name" = 'Leave Management' LIMIT 1;
    `);
    const leaveModuleId = leaveModuleRes && leaveModuleRes.length > 0 ? leaveModuleRes[0].id : null;

    // 4. Insert modular permissions: LEAVE_APPROVE, LEAVE_REJECT, LEAVE_BALANCE_ADJUST
    const modularPerms = [
      {
        code: 'LEAVE_APPROVE',
        name: 'Approve Leaves',
        description: 'Approve submitted employee leave applications',
        scopes: 'ORGANIZATION',
      },
      {
        code: 'LEAVE_REJECT',
        name: 'Reject Leaves',
        description: 'Reject submitted employee leave applications',
        scopes: 'ORGANIZATION',
      },
      {
        code: 'LEAVE_BALANCE_ADJUST',
        name: 'Adjust Leave Balance',
        description: 'Credit, debit, or manually adjust employee leave quotas and balances',
        scopes: 'ORGANIZATION',
      },
    ];

    for (const p of modularPerms) {
      await queryRunner.query(`
        INSERT INTO "permissions" ("id", "code", "name", "description", "module_id", "scopes", "is_active", "is_deleted", "created_at", "updated_at")
        VALUES (uuid_generate_v4(), '${p.code}', '${p.name}', '${p.description}', ${leaveModuleId ? `'${leaveModuleId}'` : 'NULL'}, '${p.scopes}', true, false, now(), now())
        ON CONFLICT ("code") DO UPDATE
        SET "name" = EXCLUDED."name",
            "description" = EXCLUDED."description",
            "module_id" = COALESCE("permissions"."module_id", EXCLUDED."module_id"),
            "scopes" = EXCLUDED."scopes",
            "is_active" = true,
            "is_deleted" = false;
      `);
    }

    // 5. Ensure all existing leave permissions have proper module_id
    if (leaveModuleId) {
      await queryRunner.query(`
        UPDATE "permissions"
        SET "module_id" = '${leaveModuleId}'
        WHERE ("code" LIKE '%LEAVE%' OR "code" IN ('APPROVE_ALL_LEAVES', 'APPROVE_TEAM_LEAVES', 'REJECT_ALL_LEAVES', 'REJECT_TEAM_LEAVES'))
          AND "module_id" IS NULL;
      `);
    }

    // 6. Role assignments:
    // (a) Grant ALL leave permissions to Administrator
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id"
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r."name" = 'Administrator'
        AND (p."code" LIKE '%LEAVE%' OR p."code" IN ('APPROVE_ALL_LEAVES', 'APPROVE_TEAM_LEAVES', 'REJECT_ALL_LEAVES', 'REJECT_TEAM_LEAVES'))
      ON CONFLICT ("role_id", "permission_id") DO NOTHING;
    `);

    // (b) Grant modular permissions to HR
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id"
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r."name" = 'HR'
        AND p."code" IN ('LEAVE_APPROVE', 'LEAVE_REJECT', 'LEAVE_BALANCE_ADJUST')
      ON CONFLICT ("role_id", "permission_id") DO NOTHING;
    `);

    // (c) Grant modular permissions to Manager
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id"
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r."name" = 'Manager'
        AND p."code" IN ('LEAVE_APPROVE', 'LEAVE_REJECT', 'LEAVE_BALANCE_ADJUST')
      ON CONFLICT ("role_id", "permission_id") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_leaves_employee_status_dates";
      ALTER TABLE "leaves"
      DROP COLUMN IF EXISTS "is_half_day",
      DROP COLUMN IF EXISTS "half_day_session";
    `);
  }
}
