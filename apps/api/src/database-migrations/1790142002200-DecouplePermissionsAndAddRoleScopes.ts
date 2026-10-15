import { MigrationInterface, QueryRunner } from 'typeorm';

export class DecouplePermissionsAndAddRoleScopes1790142002200 implements MigrationInterface {
  name = 'DecouplePermissionsAndAddRoleScopes1790142002200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add allowed_scopes to permissions table
    await queryRunner.query(`
      ALTER TABLE "permissions"
      ADD COLUMN IF NOT EXISTS "allowed_scopes" text[] DEFAULT ARRAY['SELF', 'TEAM', 'ORG']::text[];
    `);

    // 2. Add scopes to role_permissions table
    await queryRunner.query(`
      ALTER TABLE "role_permissions"
      ADD COLUMN IF NOT EXISTS "scopes" text[] DEFAULT ARRAY['SELF']::text[];
    `);

    // 3. Obtain Leave Management module ID
    const leaveModuleRes = await queryRunner.query(`
      SELECT "id" FROM "modules" WHERE "code" = 'LEAVE' OR "name" = 'Leave Management' LIMIT 1;
    `);
    const leaveModuleId = leaveModuleRes && leaveModuleRes.length > 0 ? leaveModuleRes[0].id : null;

    // 4. Define generic action-based Leave Management permissions and their supported scopes
    const genericLeavePermissions = [
      {
        code: 'LEAVE_VIEW',
        name: 'View Leaves',
        description: 'View leave requests and records',
        allowedScopes: "ARRAY['SELF', 'TEAM', 'ORG']::text[]",
        scopes: 'SELF',
      },
      {
        code: 'LEAVE_CREATE',
        name: 'Apply for Leave',
        description: 'Submit new leave applications',
        allowedScopes: "ARRAY['SELF', 'TEAM', 'ORG']::text[]",
        scopes: 'SELF',
      },
      {
        code: 'LEAVE_UPDATE',
        name: 'Update Leave Request',
        description: 'Update pending leave request details',
        allowedScopes: "ARRAY['SELF', 'TEAM', 'ORG']::text[]",
        scopes: 'SELF',
      },
      {
        code: 'LEAVE_DELETE',
        name: 'Delete Leave Request',
        description: 'Permanently remove draft or cancelled leave requests',
        allowedScopes: "ARRAY['SELF', 'TEAM', 'ORG']::text[]",
        scopes: 'SELF',
      },
      {
        code: 'LEAVE_CANCEL',
        name: 'Cancel Leave Request',
        description: 'Cancel own or managed leave requests',
        allowedScopes: "ARRAY['SELF', 'TEAM', 'ORG']::text[]",
        scopes: 'SELF',
      },
      {
        code: 'LEAVE_APPROVE',
        name: 'Approve Leaves',
        description: 'Approve submitted employee leave applications',
        allowedScopes: "ARRAY['TEAM', 'ORG']::text[]",
        scopes: 'ORGANIZATION',
      },
      {
        code: 'LEAVE_REJECT',
        name: 'Reject Leaves',
        description: 'Reject submitted employee leave applications',
        allowedScopes: "ARRAY['TEAM', 'ORG']::text[]",
        scopes: 'ORGANIZATION',
      },
      {
        code: 'LEAVE_SUMMARY_VIEW',
        name: 'View Leave Summary',
        description: 'View annualized leave statistics and summary charts',
        allowedScopes: "ARRAY['SELF', 'TEAM', 'ORG']::text[]",
        scopes: 'SELF',
      },
      {
        code: 'LEAVE_BALANCE_VIEW',
        name: 'View Leave Balance',
        description: 'View employee leave balance quotas and allocations',
        allowedScopes: "ARRAY['SELF', 'TEAM', 'ORG']::text[]",
        scopes: 'SELF',
      },
      {
        code: 'LEAVE_BALANCE_ADJUST',
        name: 'Adjust Leave Balance',
        description: 'Credit, debit, or manually adjust employee leave quotas and balances',
        allowedScopes: "ARRAY['TEAM', 'ORG']::text[]",
        scopes: 'ORGANIZATION',
      },
      {
        code: 'LEAVE_BALANCE_CREATE',
        name: 'Create Leave Balance',
        description: 'Initialize annual leave quota records for employees',
        allowedScopes: "ARRAY['TEAM', 'ORG']::text[]",
        scopes: 'ORGANIZATION',
      },
    ];

    for (const p of genericLeavePermissions) {
      await queryRunner.query(`
        INSERT INTO "permissions" ("id", "code", "name", "description", "module_id", "scopes", "allowed_scopes", "is_active", "is_deleted", "created_at", "updated_at")
        VALUES (
          uuid_generate_v4(),
          '${p.code}',
          '${p.name}',
          '${p.description}',
          ${leaveModuleId ? `'${leaveModuleId}'` : 'NULL'},
          '${p.scopes}',
          ${p.allowedScopes},
          true,
          false,
          now(),
          now()
        )
        ON CONFLICT ("code") DO UPDATE
        SET "name" = EXCLUDED."name",
            "description" = EXCLUDED."description",
            "module_id" = COALESCE("permissions"."module_id", EXCLUDED."module_id"),
            "scopes" = EXCLUDED."scopes",
            "allowed_scopes" = EXCLUDED."allowed_scopes",
            "is_active" = true,
            "is_deleted" = false;
      `);
    }

    // 5. Update allowed_scopes for other non-leave permissions based on existing scopes column
    await queryRunner.query(`
      UPDATE "permissions"
      SET "allowed_scopes" = ARRAY['ORG']::text[]
      WHERE "code" NOT LIKE 'LEAVE_%'
        AND ("scopes" = 'GLOBAL' OR "scopes" = 'ORGANIZATION');

      UPDATE "permissions"
      SET "allowed_scopes" = ARRAY['SELF', 'TEAM']::text[]
      WHERE "code" NOT LIKE 'LEAVE_%'
        AND "scopes" = 'TEAM';

      UPDATE "permissions"
      SET "allowed_scopes" = ARRAY['SELF']::text[]
      WHERE "code" NOT LIKE 'LEAVE_%'
        AND "scopes" = 'SELF';
    `);

    // 6. Permanently delete deprecated scope-baked leave permissions
    await queryRunner.query(`
      DELETE FROM "role_permissions"
      WHERE "permission_id" IN (
        SELECT "id" FROM "permissions"
        WHERE "code" IN (
          'MANAGE_TEAM_LEAVES',
          'APPROVE_TEAM_LEAVES',
          'REJECT_TEAM_LEAVES',
          'MANAGE_TEAM_LEAVE_SUMMARY',
          'APPROVE_ALL_LEAVES',
          'REJECT_ALL_LEAVES',
          'MANAGE_ALL_LEAVES',
          'MANAGE_ALL_LEAVE_SUMMARY',
          'TEAM_LEAVE_BALANCE_VIEW',
          'TEAM_LEAVE_BALANCE_ADJUST',
          'ALL_LEAVE_BALANCE_VIEW',
          'ALL_LEAVE_BALANCE_ADJUST',
          'LEAVE_TEAM_VIEW'
        )
      );

      DELETE FROM "permissions"
      WHERE "code" IN (
        'MANAGE_TEAM_LEAVES',
        'APPROVE_TEAM_LEAVES',
        'REJECT_TEAM_LEAVES',
        'MANAGE_TEAM_LEAVE_SUMMARY',
        'APPROVE_ALL_LEAVES',
        'REJECT_ALL_LEAVES',
        'MANAGE_ALL_LEAVES',
        'MANAGE_ALL_LEAVE_SUMMARY',
        'TEAM_LEAVE_BALANCE_VIEW',
        'TEAM_LEAVE_BALANCE_ADJUST',
        'ALL_LEAVE_BALANCE_VIEW',
        'ALL_LEAVE_BALANCE_ADJUST',
        'LEAVE_TEAM_VIEW'
      );
    `);

    // 7. Ensure role_permissions.scopes is backfilled for existing records
    await queryRunner.query(`
      UPDATE "role_permissions" rp
      SET "scopes" = p."allowed_scopes"
      FROM "permissions" p
      WHERE rp."permission_id" = p."id"
        AND (rp."scopes" IS NULL OR rp."scopes" = '{}' OR rp."scopes" = ARRAY['SELF']::text[]);
    `);

    // 8. Assign generic leave permissions to standard roles with accurate scopes:
    // (a) Administrator: ALL leave permissions with full allowed scopes
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("id", "role_id", "permission_id", "scopes", "created_at")
      SELECT uuid_generate_v4(), r."id", p."id", p."allowed_scopes", now()
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE (r."code" = 'ADMIN' OR r."name" = 'Administrator')
        AND p."code" LIKE 'LEAVE_%'
        AND p."is_active" = true
      ON CONFLICT ("role_id", "permission_id") DO UPDATE
      SET "scopes" = EXCLUDED."scopes";
    `);

    // (b) HR: Full org-level access to leave operations
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("id", "role_id", "permission_id", "scopes", "created_at")
      SELECT uuid_generate_v4(), r."id", p."id", p."allowed_scopes", now()
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE (r."code" = 'HR' OR r."name" = 'HR')
        AND p."code" LIKE 'LEAVE_%'
        AND p."is_active" = true
      ON CONFLICT ("role_id", "permission_id") DO UPDATE
      SET "scopes" = EXCLUDED."scopes";
    `);

    // (c) Manager: Team & Self access for view, summary, balance; Team access for approve/reject; Self for apply/cancel
    const managerAssignments = [
      { code: 'LEAVE_VIEW', scopes: "ARRAY['SELF', 'TEAM']::text[]" },
      { code: 'LEAVE_CREATE', scopes: "ARRAY['SELF']::text[]" },
      { code: 'LEAVE_UPDATE', scopes: "ARRAY['SELF']::text[]" },
      { code: 'LEAVE_CANCEL', scopes: "ARRAY['SELF']::text[]" },
      { code: 'LEAVE_APPROVE', scopes: "ARRAY['TEAM']::text[]" },
      { code: 'LEAVE_REJECT', scopes: "ARRAY['TEAM']::text[]" },
      { code: 'LEAVE_SUMMARY_VIEW', scopes: "ARRAY['SELF', 'TEAM']::text[]" },
      { code: 'LEAVE_BALANCE_VIEW', scopes: "ARRAY['SELF', 'TEAM']::text[]" },
    ];

    for (const a of managerAssignments) {
      await queryRunner.query(`
        INSERT INTO "role_permissions" ("id", "role_id", "permission_id", "scopes", "created_at")
        SELECT uuid_generate_v4(), r."id", p."id", ${a.scopes}, now()
        FROM "roles" r
        CROSS JOIN "permissions" p
        WHERE (r."code" = 'MANAGER' OR r."name" = 'Manager')
          AND p."code" = '${a.code}'
        ON CONFLICT ("role_id", "permission_id") DO UPDATE
        SET "scopes" = EXCLUDED."scopes";
      `);
    }

    // (d) Employee: Self-only access for view, apply, update, cancel, summary, balance
    const employeeAssignments = [
      { code: 'LEAVE_VIEW', scopes: "ARRAY['SELF']::text[]" },
      { code: 'LEAVE_CREATE', scopes: "ARRAY['SELF']::text[]" },
      { code: 'LEAVE_UPDATE', scopes: "ARRAY['SELF']::text[]" },
      { code: 'LEAVE_CANCEL', scopes: "ARRAY['SELF']::text[]" },
      { code: 'LEAVE_SUMMARY_VIEW', scopes: "ARRAY['SELF']::text[]" },
      { code: 'LEAVE_BALANCE_VIEW', scopes: "ARRAY['SELF']::text[]" },
    ];

    for (const a of employeeAssignments) {
      await queryRunner.query(`
        INSERT INTO "role_permissions" ("id", "role_id", "permission_id", "scopes", "created_at")
        SELECT uuid_generate_v4(), r."id", p."id", ${a.scopes}, now()
        FROM "roles" r
        CROSS JOIN "permissions" p
        WHERE (r."code" = 'EMPLOYEE' OR r."name" = 'Employee')
          AND p."code" = '${a.code}'
        ON CONFLICT ("role_id", "permission_id") DO UPDATE
        SET "scopes" = EXCLUDED."scopes";
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "role_permissions" DROP COLUMN IF EXISTS "scopes";
      ALTER TABLE "permissions" DROP COLUMN IF EXISTS "allowed_scopes";
    `);
  }
}
