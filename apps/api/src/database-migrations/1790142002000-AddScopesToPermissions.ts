import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScopesToPermissions1790142002000 implements MigrationInterface {
  name = 'AddScopesToPermissions1790142002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add scopes column to permissions table with default 'SELF'
    await queryRunner.query(`
      ALTER TABLE "permissions"
      ADD COLUMN IF NOT EXISTS "scopes" varchar(50) NOT NULL DEFAULT 'SELF';
    `);

    // 2. Populate GLOBAL scope for system-wide configuration permissions
    await queryRunner.query(`
      UPDATE "permissions"
      SET "scopes" = 'GLOBAL'
      WHERE "code" LIKE 'ROLE_%'
         OR "code" LIKE 'USER_%'
         OR "code" LIKE 'MODULE_%'
         OR "code" LIKE 'PERMISSION_%'
         OR "code" LIKE 'BRANCH_%'
         OR "code" LIKE 'DEPARTMENT_%'
         OR "code" LIKE 'DESIGNATION_%'
         OR "code" LIKE 'HOLIDAY_%'
         OR "code" LIKE 'POLICY_%';
    `);

    // 3. Populate ORGANIZATION scope for org-wide management permissions
    await queryRunner.query(`
      UPDATE "permissions"
      SET "scopes" = 'ORGANIZATION'
      WHERE ("code" LIKE '%_ALL_%'
         OR "code" LIKE 'MANAGE_ALL_%'
         OR "code" LIKE 'APPROVE_ALL_%'
         OR "code" LIKE 'REJECT_ALL_%'
         OR "code" LIKE 'ALL_%'
         OR ("code" LIKE 'PAYROLL_%' AND "code" != 'PAYROLL_VIEW')
         OR ("code" LIKE 'PERFORMANCE_CYCLE_%' AND "code" != 'PERFORMANCE_CYCLE_VIEW')
         OR "code" IN (
           'EMPLOYEE_CREATE',
           'EMPLOYEE_UPDATE',
           'EMPLOYEE_STATUS_UPDATE',
           'LEAVE_BALANCE_CREATE',
           'REIMBURSEMENT_PAY',
           'PERFORMANCE_SUMMARY_FINALIZE',
           'SETTINGS_HR_VIEW',
           'SETTINGS_ORG_VIEW',
           'LOAN_APPROVE',
           'LOAN_CONFIGURE_REPAYMENT',
           'LOAN_DISBURSE',
           'LOAN_MANAGE_PAYMENT',
           'LOAN_REJECT',
           'LOAN_VIEW_ALL',
           'MANAGE_ORG_REGULARIZATION_REQUESTS'
         ))
        AND "code" NOT IN ('PAYROLL_VIEW', 'PERFORMANCE_CYCLE_VIEW', 'EMPLOYEE_DIRECTORY_VIEW');
    `);

    await queryRunner.query(`
      UPDATE "permissions"
      SET "scopes" = 'SELF'
      WHERE "code" IN ('PAYROLL_VIEW', 'EMPLOYEE_DIRECTORY_VIEW');

      UPDATE "permissions"
      SET "scopes" = 'GLOBAL'
      WHERE "code" = 'PERFORMANCE_CYCLE_VIEW';
    `);

    // 4. Populate TEAM scope for manager/team management permissions
    await queryRunner.query(`
      UPDATE "permissions"
      SET "scopes" = 'TEAM'
      WHERE "code" LIKE '%_TEAM_%'
         OR "code" LIKE '%TEAM_LEAVE%'
         OR "code" LIKE 'APPROVE_TEAM_%'
         OR "code" LIKE 'REJECT_TEAM_%'
         OR "code" IN (
           'TIMESHEET_APPROVE',
           'TIMESHEET_REJECT',
           'REIMBURSEMENT_APPROVE',
           'REIMBURSEMENT_REJECT',
           'ATTENDANCE_REGULARIZATION_APPROVE',
           'ATTENDANCE_REGULARIZATION_REJECT',
           'SETTINGS_MANAGER_VIEW'
         );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "permissions"
      DROP COLUMN IF EXISTS "scopes";
    `);
  }
}
