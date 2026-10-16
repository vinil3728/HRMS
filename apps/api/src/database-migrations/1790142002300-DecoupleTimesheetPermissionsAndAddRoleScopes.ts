import { MigrationInterface, QueryRunner } from 'typeorm';

export class DecoupleTimesheetPermissionsAndAddRoleScopes1790142002300 implements MigrationInterface {
  name = 'DecoupleTimesheetPermissionsAndAddRoleScopes1790142002300';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Obtain Timesheet module ID
    const timesheetModuleRes = await queryRunner.query(`
      SELECT "id" FROM "modules" WHERE "code" = 'TIMESHEETS' OR "code" = 'TIMESHEET' OR "name" = 'Timesheets' LIMIT 1;
    `);
    const timesheetModuleId = timesheetModuleRes && timesheetModuleRes.length > 0 ? timesheetModuleRes[0].id : null;

    // 2. Define generic action-based Timesheet permissions and their supported scopes
    const genericTimesheetPermissions = [
      {
        code: 'TIMESHEET_VIEW',
        name: 'View Timesheets',
        description: 'View daily timesheet records and work logs',
        allowedScopes: "ARRAY['SELF', 'TEAM', 'ORG']::text[]",
        scopes: 'SELF',
      },
      {
        code: 'TIMESHEET_CREATE',
        name: 'Create Timesheet',
        description: 'Log new work hours and timesheet entries',
        allowedScopes: "ARRAY['SELF', 'TEAM', 'ORG']::text[]",
        scopes: 'SELF',
      },
      {
        code: 'TIMESHEET_UPDATE',
        name: 'Update Timesheet',
        description: 'Edit draft timesheet entries and logged hours',
        allowedScopes: "ARRAY['SELF', 'TEAM', 'ORG']::text[]",
        scopes: 'SELF',
      },
      {
        code: 'TIMESHEET_DELETE',
        name: 'Delete Timesheet',
        description: 'Remove draft timesheet records',
        allowedScopes: "ARRAY['SELF', 'TEAM', 'ORG']::text[]",
        scopes: 'SELF',
      },
      {
        code: 'TIMESHEET_SUBMIT',
        name: 'Submit Timesheet',
        description: 'Submit draft timesheets for review and approval',
        allowedScopes: "ARRAY['SELF', 'TEAM', 'ORG']::text[]",
        scopes: 'SELF',
      },
      {
        code: 'TIMESHEET_APPROVE',
        name: 'Approve Timesheet',
        description: 'Approve submitted timesheets for team or organization members',
        allowedScopes: "ARRAY['TEAM', 'ORG']::text[]",
        scopes: 'ORGANIZATION',
      },
      {
        code: 'TIMESHEET_REJECT',
        name: 'Reject Timesheet',
        description: 'Reject submitted timesheets with explanatory notes',
        allowedScopes: "ARRAY['TEAM', 'ORG']::text[]",
        scopes: 'ORGANIZATION',
      },
      {
        code: 'TIMESHEET_SUMMARY_VIEW',
        name: 'View Timesheet Summary',
        description: 'View aggregated timesheet hour metrics and approval stats',
        allowedScopes: "ARRAY['SELF', 'TEAM', 'ORG']::text[]",
        scopes: 'SELF',
      },
    ];

    for (const p of genericTimesheetPermissions) {
      await queryRunner.query(`
        INSERT INTO "permissions" ("id", "code", "name", "description", "module_id", "scopes", "allowed_scopes", "is_active", "is_deleted", "created_at", "updated_at")
        VALUES (
          uuid_generate_v4(),
          '${p.code}',
          '${p.name}',
          '${p.description}',
          ${timesheetModuleId ? `'${timesheetModuleId}'` : 'NULL'},
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
            "allowed_scopes" = EXCLUDED."allowed_scopes",
            "module_id" = COALESCE(EXCLUDED."module_id", "permissions"."module_id"),
            "is_active" = true,
            "is_deleted" = false,
            "updated_at" = now();
      `);
    }

    // 3. Migrate any roles having TIMESHEET_TEAM_VIEW or TIMESHEET_ALL_VIEW into TIMESHEET_VIEW
    await queryRunner.query(`
      -- Ensure roles with TIMESHEET_TEAM_VIEW have TEAM scope in TIMESHEET_VIEW
      INSERT INTO "role_permissions" ("id", "role_id", "permission_id", "scopes", "created_at")
      SELECT uuid_generate_v4(), rp."role_id", (SELECT "id" FROM "permissions" WHERE "code" = 'TIMESHEET_VIEW' LIMIT 1), ARRAY['SELF', 'TEAM']::text[], now()
      FROM "role_permissions" rp
      JOIN "permissions" p ON p."id" = rp."permission_id"
      WHERE p."code" = 'TIMESHEET_TEAM_VIEW'
      ON CONFLICT ("role_id", "permission_id") DO UPDATE
      SET "scopes" = array_cat("role_permissions"."scopes", ARRAY['TEAM']::text[]);

      -- Ensure roles with TIMESHEET_ALL_VIEW have ORG scope in TIMESHEET_VIEW
      INSERT INTO "role_permissions" ("id", "role_id", "permission_id", "scopes", "created_at")
      SELECT uuid_generate_v4(), rp."role_id", (SELECT "id" FROM "permissions" WHERE "code" = 'TIMESHEET_VIEW' LIMIT 1), ARRAY['SELF', 'TEAM', 'ORG']::text[], now()
      FROM "role_permissions" rp
      JOIN "permissions" p ON p."id" = rp."permission_id"
      WHERE p."code" = 'TIMESHEET_ALL_VIEW'
      ON CONFLICT ("role_id", "permission_id") DO UPDATE
      SET "scopes" = array_cat("role_permissions"."scopes", ARRAY['ORG']::text[]);
    `);

    // 4. Permanently delete deprecated scope-baked timesheet permissions
    await queryRunner.query(`
      DELETE FROM "role_permissions"
      WHERE "permission_id" IN (
        SELECT "id" FROM "permissions"
        WHERE "code" IN ('TIMESHEET_TEAM_VIEW', 'TIMESHEET_ALL_VIEW')
      );

      DELETE FROM "permissions"
      WHERE "code" IN ('TIMESHEET_TEAM_VIEW', 'TIMESHEET_ALL_VIEW');
    `);

    // 5. Assign generic timesheet permissions to standard roles with accurate scopes:
    // (a) Administrator: ALL timesheet permissions with full allowed scopes
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("id", "role_id", "permission_id", "scopes", "created_at")
      SELECT uuid_generate_v4(), r."id", p."id", p."allowed_scopes", now()
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE (r."code" = 'ADMIN' OR r."name" = 'Administrator')
        AND p."code" LIKE 'TIMESHEET_%'
        AND p."is_active" = true
      ON CONFLICT ("role_id", "permission_id") DO UPDATE
      SET "scopes" = EXCLUDED."scopes";
    `);

    // (b) HR: Full org-level access to timesheet operations
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("id", "role_id", "permission_id", "scopes", "created_at")
      SELECT uuid_generate_v4(), r."id", p."id", p."allowed_scopes", now()
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE (r."code" = 'HR' OR r."name" = 'HR')
        AND p."code" LIKE 'TIMESHEET_%'
        AND p."is_active" = true
      ON CONFLICT ("role_id", "permission_id") DO UPDATE
      SET "scopes" = EXCLUDED."scopes";
    `);

    // (c) Manager: Team & Self access for view, summary; Team access for approve/reject; Self for create/update/submit/delete
    const managerAssignments = [
      { code: 'TIMESHEET_VIEW', scopes: "ARRAY['SELF', 'TEAM']::text[]" },
      { code: 'TIMESHEET_CREATE', scopes: "ARRAY['SELF']::text[]" },
      { code: 'TIMESHEET_UPDATE', scopes: "ARRAY['SELF']::text[]" },
      { code: 'TIMESHEET_DELETE', scopes: "ARRAY['SELF']::text[]" },
      { code: 'TIMESHEET_SUBMIT', scopes: "ARRAY['SELF']::text[]" },
      { code: 'TIMESHEET_APPROVE', scopes: "ARRAY['TEAM']::text[]" },
      { code: 'TIMESHEET_REJECT', scopes: "ARRAY['TEAM']::text[]" },
      { code: 'TIMESHEET_SUMMARY_VIEW', scopes: "ARRAY['SELF', 'TEAM']::text[]" },
    ];

    for (const a of managerAssignments) {
      await queryRunner.query(`
        INSERT INTO "role_permissions" ("id", "role_id", "permission_id", "scopes", "created_at")
        SELECT uuid_generate_v4(), r."id", p."id", ${a.scopes}, now()
        FROM "roles" r
        JOIN "permissions" p ON p."code" = '${a.code}'
        WHERE (r."code" = 'MANAGER' OR r."name" = 'Manager')
          AND p."is_active" = true
        ON CONFLICT ("role_id", "permission_id") DO UPDATE
        SET "scopes" = EXCLUDED."scopes";
      `);
    }

    // (d) Employee: Self access for view, create, update, delete, submit, summary
    const employeeAssignments = [
      { code: 'TIMESHEET_VIEW', scopes: "ARRAY['SELF']::text[]" },
      { code: 'TIMESHEET_CREATE', scopes: "ARRAY['SELF']::text[]" },
      { code: 'TIMESHEET_UPDATE', scopes: "ARRAY['SELF']::text[]" },
      { code: 'TIMESHEET_DELETE', scopes: "ARRAY['SELF']::text[]" },
      { code: 'TIMESHEET_SUBMIT', scopes: "ARRAY['SELF']::text[]" },
      { code: 'TIMESHEET_SUMMARY_VIEW', scopes: "ARRAY['SELF']::text[]" },
    ];

    for (const a of employeeAssignments) {
      await queryRunner.query(`
        INSERT INTO "role_permissions" ("id", "role_id", "permission_id", "scopes", "created_at")
        SELECT uuid_generate_v4(), r."id", p."id", ${a.scopes}, now()
        FROM "roles" r
        JOIN "permissions" p ON p."code" = '${a.code}'
        WHERE (r."code" = 'EMPLOYEE' OR r."name" = 'Employee')
          AND p."is_active" = true
        ON CONFLICT ("role_id", "permission_id") DO UPDATE
        SET "scopes" = EXCLUDED."scopes";
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-insert legacy permissions if rolled back
    await queryRunner.query(`
      INSERT INTO "permissions" ("id", "code", "name", "description", "scopes", "allowed_scopes", "is_active", "is_deleted", "created_at", "updated_at")
      VALUES 
        (uuid_generate_v4(), 'TIMESHEET_TEAM_VIEW', 'View Team Timesheets', 'View team timesheets', 'TEAM', ARRAY['SELF', 'TEAM']::text[], true, false, now(), now()),
        (uuid_generate_v4(), 'TIMESHEET_ALL_VIEW', 'View All Timesheets', 'View all timesheets', 'ORGANIZATION', ARRAY['ORG']::text[], true, false, now(), now())
      ON CONFLICT ("code") DO NOTHING;
    `);
  }
}
