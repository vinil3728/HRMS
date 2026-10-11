import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCompanyLoansAndRepayments1790142001400
  implements MigrationInterface
{
  name = 'CreateCompanyLoansAndRepayments1790142001400';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create company_loans table
    await queryRunner.query(`
      CREATE TABLE "company_loans" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "employee_id" uuid NOT NULL,
        "loan_type" character varying NOT NULL DEFAULT 'PERSONAL',
        "amount" numeric(12, 2) NOT NULL,
        "approved_amount" numeric(12, 2) NULL,
        "tenure_months" integer NOT NULL DEFAULT 6,
        "purpose" text NOT NULL,
        "status" character varying NOT NULL DEFAULT 'PENDING',
        "approved_by_id" uuid NULL,
        "approved_at" TIMESTAMP NULL,
        "rejection_reason" text NULL,
        "disbursed_at" TIMESTAMP NULL,
        "disbursed_by_id" uuid NULL,
        "disbursement_receipt_url" text NULL,
        "disbursement_reference" character varying NULL,
        "repayment_mode" character varying NULL,
        "cash_amount" numeric(12, 2) NOT NULL DEFAULT 0.00,
        "salary_deduction_amount" numeric(12, 2) NOT NULL DEFAULT 0.00,
        "monthly_installment" numeric(12, 2) NOT NULL DEFAULT 0.00,
        "total_repaid" numeric(12, 2) NOT NULL DEFAULT 0.00,
        "remaining_balance" numeric(12, 2) NOT NULL DEFAULT 0.00,
        "repayment_start_date" date NULL,
        "notes" text NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_company_loans_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_company_loans_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_company_loans_approved_by" FOREIGN KEY ("approved_by_id") REFERENCES "employees"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_company_loans_disbursed_by" FOREIGN KEY ("disbursed_by_id") REFERENCES "employees"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_company_loans_employee_id" ON "company_loans" ("employee_id");
      CREATE INDEX "IDX_company_loans_status" ON "company_loans" ("status");
    `);

    // 2. Create loan_repayments table
    await queryRunner.query(`
      CREATE TABLE "loan_repayments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "loan_id" uuid NOT NULL,
        "installment_number" integer NOT NULL,
        "due_date" date NOT NULL,
        "amount_due" numeric(12, 2) NOT NULL,
        "amount_paid" numeric(12, 2) NOT NULL DEFAULT 0.00,
        "payment_mode" character varying NOT NULL DEFAULT 'SALARY_DEDUCTION',
        "status" character varying NOT NULL DEFAULT 'PENDING',
        "paid_at" TIMESTAMP NULL,
        "receipt_url" text NULL,
        "payroll_run_id" uuid NULL,
        "notes" text NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_loan_repayments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_loan_repayments_loan" FOREIGN KEY ("loan_id") REFERENCES "company_loans"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_loan_repayments_loan_id" ON "loan_repayments" ("loan_id");
      CREATE INDEX "IDX_loan_repayments_status" ON "loan_repayments" ("status");
    `);

    // 3. Seed Permissions for Loans
    await queryRunner.query(`
      INSERT INTO "permissions" ("code", "name", "description", "module")
      VALUES
        ('LOAN_VIEW_OWN', 'View Own Loans', 'View personal loan applications, schedules, balance and receipts', 'Loans'),
        ('LOAN_APPLY', 'Apply for Loan', 'Submit new company loan application', 'Loans'),
        ('LOAN_VIEW_ALL', 'View All Loans', 'View complete company-wide loan requests and ledger', 'Loans'),
        ('LOAN_APPROVE', 'Approve Loan', 'Approve employee loan application amount and tenure', 'Loans'),
        ('LOAN_REJECT', 'Reject Loan', 'Reject employee loan application with remarks', 'Loans'),
        ('LOAN_DISBURSE', 'Disburse Loan', 'Mark loan disbursed/paid with disbursement receipt', 'Loans'),
        ('LOAN_CONFIGURE_REPAYMENT', 'Configure Loan Repayment', 'Configure repayment options, split ratios (cash/salary) and initiate schedule', 'Loans'),
        ('LOAN_MANAGE_PAYMENT', 'Manage Loan Repayment', 'Record cash/bank repayments, upload receipts and update balances', 'Loans')
      ON CONFLICT ("code") DO NOTHING
    `);

    // 4. Grant Permissions: Employee self-service to all roles
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id"
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r."code" IN ('ADMIN', 'HR', 'MANAGER', 'EMPLOYEE')
        AND p."code" IN ('LOAN_VIEW_OWN', 'LOAN_APPLY')
      ON CONFLICT DO NOTHING
    `);

    // 5. Grant HR & Admin full management permissions
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id"
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r."code" IN ('ADMIN', 'HR')
        AND p."code" IN ('LOAN_VIEW_ALL', 'LOAN_APPROVE', 'LOAN_REJECT', 'LOAN_DISBURSE', 'LOAN_CONFIGURE_REPAYMENT', 'LOAN_MANAGE_PAYMENT')
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role_permissions"
      WHERE "permission_id" IN (
        SELECT "id" FROM "permissions"
        WHERE "code" IN (
          'LOAN_VIEW_OWN', 'LOAN_APPLY', 'LOAN_VIEW_ALL', 'LOAN_APPROVE',
          'LOAN_REJECT', 'LOAN_DISBURSE', 'LOAN_CONFIGURE_REPAYMENT', 'LOAN_MANAGE_PAYMENT'
        )
      )
    `);

    await queryRunner.query(`
      DELETE FROM "permissions"
      WHERE "code" IN (
        'LOAN_VIEW_OWN', 'LOAN_APPLY', 'LOAN_VIEW_ALL', 'LOAN_APPROVE',
        'LOAN_REJECT', 'LOAN_DISBURSE', 'LOAN_CONFIGURE_REPAYMENT', 'LOAN_MANAGE_PAYMENT'
      )
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "loan_repayments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "company_loans"`);
  }
}
