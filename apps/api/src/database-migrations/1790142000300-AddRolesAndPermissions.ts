import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRolesAndPermissions1790142000300
    implements MigrationInterface
{
    name = 'AddRolesAndPermissions1790142000300';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // =========================================================
        // 1. Create roles table
        // =========================================================

        await queryRunner.query(`
            CREATE TABLE "roles" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "name" character varying NOT NULL,
                "code" character varying NOT NULL,
                "description" text,
                "is_system_role" boolean NOT NULL DEFAULT false,
                "is_active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_roles_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_roles_name" UNIQUE ("name"),
                CONSTRAINT "UQ_roles_code" UNIQUE ("code")
            )
        `);

        // =========================================================
        // 2. Create permissions table
        // =========================================================

        await queryRunner.query(`
            CREATE TABLE "permissions" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "code" character varying NOT NULL,
                "name" character varying NOT NULL,
                "description" text,
                "module" character varying(100) NOT NULL,
                "is_active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_permissions_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_permissions_code" UNIQUE ("code"),
                CONSTRAINT "UQ_permissions_name" UNIQUE ("name")
            )
        `);

        // =========================================================
        // 3. Create role_permissions table
        // =========================================================

        await queryRunner.query(`
            CREATE TABLE "role_permissions" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "role_id" uuid NOT NULL,
                "permission_id" uuid NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_role_permissions_id"
                    PRIMARY KEY ("id"),
                CONSTRAINT "UQ_role_permissions_role_permission"
                    UNIQUE ("role_id", "permission_id"),
                CONSTRAINT "FK_role_permissions_role"
                    FOREIGN KEY ("role_id")
                    REFERENCES "roles"("id")
                    ON DELETE CASCADE
                    ON UPDATE NO ACTION,
                CONSTRAINT "FK_role_permissions_permission"
                    FOREIGN KEY ("permission_id")
                    REFERENCES "permissions"("id")
                    ON DELETE CASCADE
                    ON UPDATE NO ACTION
            )
        `);

        // =========================================================
        // 4. Add role_id to users
        //
        // Keep it nullable temporarily because existing users
        // still have the old role column.
        // =========================================================

        await queryRunner.query(`
            ALTER TABLE "users"
            ADD "role_id" uuid
        `);

        // =========================================================
        // 5. Seed system roles
        // =========================================================

        await queryRunner.query(`
            INSERT INTO "roles"
                ("name", "code", "description", "is_system_role")
            VALUES
                (
                    'Administrator',
                    'ADMIN',
                    'Full system access',
                    true
                ),
                (
                    'HR',
                    'HR',
                    'Human resources management access',
                    true
                ),
                (
                    'Manager',
                    'MANAGER',
                    'Manager and direct-report access',
                    true
                ),
                (
                    'Employee',
                    'EMPLOYEE',
                    'Employee self-service access',
                    true
                )
        `);

        // =========================================================
        // 6. Seed permissions
        //
        // Permission codes are VARCHAR intentionally.
        // This allows future permissions to be created through
        // the UI without changing TypeScript or database enums.
        // =========================================================

        await queryRunner.query(`
            INSERT INTO "permissions"
                ("code", "name", "description", "module")
            VALUES

                -- Employees
                (
                    'EMPLOYEE_VIEW',
                    'View Employees',
                    'View employee information',
                    'Employees'
                ),
                (
                    'EMPLOYEE_CREATE',
                    'Create Employee',
                    'Create new employees',
                    'Employees'
                ),
                (
                    'EMPLOYEE_UPDATE',
                    'Update Employee',
                    'Update employee information',
                    'Employees'
                ),
                (
                    'EMPLOYEE_STATUS_UPDATE',
                    'Update Employee Status',
                    'Activate or deactivate employees',
                    'Employees'
                ),

                -- Departments
                (
                    'DPT_VIEW',
                    'View Departments',
                    'View departments',
                    'Departments'
                ),
                (
                    'DPT_CREATE',
                    'Create Department',
                    'Create departments',
                    'Departments'
                ),
                (
                    'DPT_UPDATE',
                    'Update Department',
                    'Update departments',
                    'Departments'
                ),

                -- Designations
                (
                    'DSG_VIEW',
                    'View Designations',
                    'View designations',
                    'Designations'
                ),
                (
                    'DSG_CREATE',
                    'Create Designation',
                    'Create designations',
                    'Designations'
                ),
                (
                    'DSG_UPDATE',
                    'Update Designation',
                    'Update designations',
                    'Designations'
                ),

                -- Attendance
                (
                    'ATTENDANCE_VIEW',
                    'View Attendance',
                    'View attendance records',
                    'Attendance'
                ),
                (
                    'ATTENDANCE_CREATE',
                    'Create Attendance',
                    'Create attendance records',
                    'Attendance'
                ),
                (
                    'ATTENDANCE_UPDATE',
                    'Update Attendance',
                    'Update attendance records',
                    'Attendance'
                ),
                (
                    'ATTENDANCE_DELETE',
                    'Delete Attendance',
                    'Delete attendance records',
                    'Attendance'
                ),
                (
                    'ATTENDANCE_CHECK_IN',
                    'Check In',
                    'Record employee check-in',
                    'Attendance'
                ),
                (
                    'ATTENDANCE_CHECK_OUT',
                    'Check Out',
                    'Record employee check-out',
                    'Attendance'
                ),
                (
                    'ATTENDANCE_SUMMARY_VIEW',
                    'View Attendance Summary',
                    'View attendance summary',
                    'Attendance'
                ),

                -- Employee Documents
                (
                    'EMPLOYEE_DOCUMENT_VIEW',
                    'View Employee Documents',
                    'View employee documents',
                    'Employee Documents'
                ),
                (
                    'EMPLOYEE_DOCUMENT_CREATE',
                    'Create Employee Document',
                    'Create employee documents',
                    'Employee Documents'
                ),
                (
                    'EMPLOYEE_DOCUMENT_UPDATE',
                    'Update Employee Document',
                    'Update employee documents',
                    'Employee Documents'
                ),
                (
                    'EMPLOYEE_DOCUMENT_DELETE',
                    'Delete Employee Document',
                    'Delete employee documents',
                    'Employee Documents'
                ),
                (
                    'EMPLOYEE_DOCUMENT_UPLOAD',
                    'Upload Employee Document',
                    'Upload employee documents',
                    'Employee Documents'
                ),
                (
                    'EMPLOYEE_DOCUMENT_DOWNLOAD',
                    'Download Employee Document',
                    'Download employee documents',
                    'Employee Documents'
                ),

                -- Leave
                (
                    'LEAVE_VIEW',
                    'View Leave',
                    'View leave requests',
                    'Leave'
                ),
                (
                    'LEAVE_CREATE',
                    'Create Leave',
                    'Create leave requests',
                    'Leave'
                ),
                (
                    'LEAVE_UPDATE',
                    'Update Leave',
                    'Update leave requests',
                    'Leave'
                ),
                (
                    'LEAVE_DELETE',
                    'Delete Leave',
                    'Delete leave requests',
                    'Leave'
                ),
                (
                    'LEAVE_APPROVE',
                    'Approve Leave',
                    'Approve leave requests',
                    'Leave'
                ),
                (
                    'LEAVE_REJECT',
                    'Reject Leave',
                    'Reject leave requests',
                    'Leave'
                ),
                (
                    'LEAVE_SUMMARY_VIEW',
                    'View Leave Summary',
                    'View leave summary',
                    'Leave'
                ),

                -- Leave Balances
                (
                    'LEAVE_BALANCE_VIEW',
                    'View Leave Balance',
                    'View employee leave balances',
                    'Leave Balances'
                ),
                (
                    'LEAVE_BALANCE_CREATE',
                    'Create Leave Balance',
                    'Create employee leave balances',
                    'Leave Balances'
                ),

                -- Performance Cycles
                (
                    'PERFORMANCE_CYCLE_VIEW',
                    'View Performance Cycles',
                    'View performance cycles',
                    'Performance'
                ),
                (
                    'PERFORMANCE_CYCLE_CREATE',
                    'Create Performance Cycle',
                    'Create performance cycles',
                    'Performance'
                ),
                (
                    'PERFORMANCE_CYCLE_UPDATE',
                    'Update Performance Cycle',
                    'Update performance cycles',
                    'Performance'
                ),
                (
                    'PERFORMANCE_CYCLE_DELETE',
                    'Delete Performance Cycle',
                    'Delete performance cycles',
                    'Performance'
                ),

                -- Performance Goals
                (
                    'PERFORMANCE_GOAL_VIEW',
                    'View Performance Goals',
                    'View performance goals',
                    'Performance'
                ),
                (
                    'PERFORMANCE_GOAL_CREATE',
                    'Create Performance Goal',
                    'Create performance goals',
                    'Performance'
                ),
                (
                    'PERFORMANCE_GOAL_UPDATE',
                    'Update Performance Goal',
                    'Update performance goals',
                    'Performance'
                ),
                (
                    'PERFORMANCE_GOAL_DELETE',
                    'Delete Performance Goal',
                    'Delete performance goals',
                    'Performance'
                ),

                -- Performance Evaluations
                (
                    'PERFORMANCE_EVALUATION_VIEW',
                    'View Performance Evaluations',
                    'View performance evaluations',
                    'Performance'
                ),
                (
                    'PERFORMANCE_EVALUATION_CREATE',
                    'Create Performance Evaluation',
                    'Create performance evaluations',
                    'Performance'
                ),
                (
                    'PERFORMANCE_EVALUATION_UPDATE',
                    'Update Performance Evaluation',
                    'Update performance evaluations',
                    'Performance'
                ),
                (
                    'PERFORMANCE_EVALUATION_SUBMIT',
                    'Submit Performance Evaluation',
                    'Submit performance evaluations',
                    'Performance'
                ),

                -- Performance Summary
                (
                    'PERFORMANCE_SUMMARY_VIEW',
                    'View Performance Summary',
                    'View performance summaries',
                    'Performance'
                ),
                (
                    'PERFORMANCE_SUMMARY_FINALIZE',
                    'Finalize Performance Summary',
                    'Finalize performance summaries',
                    'Performance'
                ),

                -- Policies
                (
                    'POLICY_VIEW',
                    'View Policies',
                    'View policies',
                    'Policies'
                ),
                (
                    'POLICY_CREATE',
                    'Create Policy',
                    'Create policies',
                    'Policies'
                ),
                (
                    'POLICY_UPDATE',
                    'Update Policy',
                    'Update policies',
                    'Policies'
                ),
                (
                    'POLICY_DELETE',
                    'Delete Policy',
                    'Delete policies',
                    'Policies'
                ),
                (
                    'POLICY_PUBLISH',
                    'Publish Policy',
                    'Publish policies',
                    'Policies'
                ),
                (
                    'POLICY_ARCHIVE',
                    'Archive Policy',
                    'Archive policies',
                    'Policies'
                ),

                -- Policy Acknowledgements
                (
                    'POLICY_ACKNOWLEDGEMENT_VIEW',
                    'View Policy Acknowledgements',
                    'View employee policy acknowledgements',
                    'Policy Acknowledgements'
                ),
                (
                    'POLICY_ACKNOWLEDGEMENT_CREATE',
                    'Create Policy Acknowledgement',
                    'Acknowledge policies',
                    'Policy Acknowledgements'
                ),
                (
                    'POLICY_ACKNOWLEDGEMENT_STATUS_VIEW',
                    'View Policy Acknowledgement Status',
                    'View policy acknowledgement status',
                    'Policy Acknowledgements'
                ),
                (
                    'POLICY_ACKNOWLEDGEMENT_POLICY_VIEW',
                    'View Policy Acknowledgements By Policy',
                    'View acknowledgements for a policy',
                    'Policy Acknowledgements'
                ),

                -- Reimbursements
                (
                    'REIMBURSEMENT_VIEW',
                    'View Reimbursements',
                    'View reimbursement requests',
                    'Reimbursements'
                ),
                (
                    'REIMBURSEMENT_CREATE',
                    'Create Reimbursement',
                    'Create reimbursement requests',
                    'Reimbursements'
                ),
                (
                    'REIMBURSEMENT_UPDATE',
                    'Update Reimbursement',
                    'Update reimbursement requests',
                    'Reimbursements'
                ),
                (
                    'REIMBURSEMENT_DELETE',
                    'Delete Reimbursement',
                    'Delete reimbursement requests',
                    'Reimbursements'
                ),
                (
                    'REIMBURSEMENT_SUBMIT',
                    'Submit Reimbursement',
                    'Submit reimbursement requests',
                    'Reimbursements'
                ),
                (
                    'REIMBURSEMENT_RECEIPT_UPLOAD',
                    'Upload Reimbursement Receipt',
                    'Upload reimbursement receipts',
                    'Reimbursements'
                ),
                (
                    'REIMBURSEMENT_APPROVE',
                    'Approve Reimbursement',
                    'Approve reimbursement requests',
                    'Reimbursements'
                ),
                (
                    'REIMBURSEMENT_REJECT',
                    'Reject Reimbursement',
                    'Reject reimbursement requests',
                    'Reimbursements'
                ),
                (
                    'REIMBURSEMENT_PAY',
                    'Pay Reimbursement',
                    'Mark reimbursements as paid',
                    'Reimbursements'
                )
        `);

        // =========================================================
        // 7. Migrate existing users from old role column
        //    to the new role_id column.
        // =========================================================

        await queryRunner.query(`
            UPDATE "users" u
            SET "role_id" = r."id"
            FROM "roles" r
            WHERE r."code" = u."role"::text
        `);

        // =========================================================
        // 8. Make role_id mandatory
        // =========================================================

        await queryRunner.query(`
            ALTER TABLE "users"
            ALTER COLUMN "role_id" SET NOT NULL
        `);

        // =========================================================
        // 9. Add foreign key from users → roles
        // =========================================================

        await queryRunner.query(`
            ALTER TABLE "users"
            ADD CONSTRAINT "FK_users_role"
            FOREIGN KEY ("role_id")
            REFERENCES "roles"("id")
            ON DELETE RESTRICT
            ON UPDATE NO ACTION
        `);

        // =========================================================
        // 10. Remove old role column
        // =========================================================

        await queryRunner.query(`
            ALTER TABLE "users"
            DROP COLUMN "role"
        `);

        // =========================================================
        // 11. Remove old PostgreSQL enum type
        // =========================================================

        await queryRunner.query(`
            DROP TYPE IF EXISTS "users_role_enum"
        `);

        // =========================================================
        // 12. ADMIN gets every permission
        // =========================================================

        await queryRunner.query(`
            INSERT INTO "role_permissions"
                ("role_id", "permission_id")
            SELECT
                r."id",
                p."id"
            FROM "roles" r
            CROSS JOIN "permissions" p
            WHERE r."code" = 'ADMIN'
        `);

        // =========================================================
        // 13. HR permissions
        // =========================================================

        await queryRunner.query(`
            INSERT INTO "role_permissions"
                ("role_id", "permission_id")
            SELECT
                r."id",
                p."id"
            FROM "roles" r
            CROSS JOIN "permissions" p
            WHERE r."code" = 'HR'
        `);

        // =========================================================
        // 14. MANAGER permissions
        // =========================================================

        await queryRunner.query(`
            INSERT INTO "role_permissions"
                ("role_id", "permission_id")
            SELECT
                r."id",
                p."id"
            FROM "roles" r
            CROSS JOIN "permissions" p
            WHERE r."code" = 'MANAGER'
            AND p."code" IN (
                'EMPLOYEE_VIEW',

                'DPT_VIEW',
                'DSG_VIEW',

                'ATTENDANCE_VIEW',
                'ATTENDANCE_CREATE',
                'ATTENDANCE_CHECK_IN',
                'ATTENDANCE_CHECK_OUT',
                'ATTENDANCE_SUMMARY_VIEW',

                'EMPLOYEE_DOCUMENT_VIEW',
                'EMPLOYEE_DOCUMENT_DOWNLOAD',

                'LEAVE_VIEW',
                'LEAVE_CREATE',
                'LEAVE_UPDATE',
                'LEAVE_DELETE',
                'LEAVE_APPROVE',
                'LEAVE_REJECT',
                'LEAVE_SUMMARY_VIEW',

                'LEAVE_BALANCE_VIEW',

                'PERFORMANCE_CYCLE_VIEW',

                'PERFORMANCE_GOAL_VIEW',
                'PERFORMANCE_GOAL_CREATE',
                'PERFORMANCE_GOAL_UPDATE',
                'PERFORMANCE_GOAL_DELETE',

                'PERFORMANCE_EVALUATION_VIEW',
                'PERFORMANCE_EVALUATION_CREATE',
                'PERFORMANCE_EVALUATION_UPDATE',
                'PERFORMANCE_EVALUATION_SUBMIT',

                'PERFORMANCE_SUMMARY_VIEW',

                'POLICY_VIEW',
                'POLICY_ACKNOWLEDGEMENT_VIEW',
                'POLICY_ACKNOWLEDGEMENT_CREATE',
                'POLICY_ACKNOWLEDGEMENT_STATUS_VIEW',

                'REIMBURSEMENT_VIEW',
                'REIMBURSEMENT_CREATE',
                'REIMBURSEMENT_UPDATE',
                'REIMBURSEMENT_DELETE',
                'REIMBURSEMENT_SUBMIT',
                'REIMBURSEMENT_RECEIPT_UPLOAD',
                'REIMBURSEMENT_APPROVE',
                'REIMBURSEMENT_REJECT'
            )
        `);

        // =========================================================
        // 15. EMPLOYEE permissions
        // =========================================================

        await queryRunner.query(`
            INSERT INTO "role_permissions"
                ("role_id", "permission_id")
            SELECT
                r."id",
                p."id"
            FROM "roles" r
            CROSS JOIN "permissions" p
            WHERE r."code" = 'EMPLOYEE'
            AND p."code" IN (
                'EMPLOYEE_VIEW',

                'DPT_VIEW',
                'DSG_VIEW',

                'ATTENDANCE_VIEW',
                'ATTENDANCE_CREATE',
                'ATTENDANCE_CHECK_IN',
                'ATTENDANCE_CHECK_OUT',
                'ATTENDANCE_SUMMARY_VIEW',

                'EMPLOYEE_DOCUMENT_VIEW',
                'EMPLOYEE_DOCUMENT_UPLOAD',
                'EMPLOYEE_DOCUMENT_DOWNLOAD',

                'LEAVE_VIEW',
                'LEAVE_CREATE',
                'LEAVE_UPDATE',
                'LEAVE_DELETE',
                'LEAVE_SUMMARY_VIEW',

                'LEAVE_BALANCE_VIEW',

                'PERFORMANCE_CYCLE_VIEW',

                'PERFORMANCE_GOAL_VIEW',
                'PERFORMANCE_GOAL_CREATE',
                'PERFORMANCE_GOAL_UPDATE',

                'PERFORMANCE_EVALUATION_VIEW',
                'PERFORMANCE_EVALUATION_CREATE',
                'PERFORMANCE_EVALUATION_UPDATE',
                'PERFORMANCE_EVALUATION_SUBMIT',

                'PERFORMANCE_SUMMARY_VIEW',

                'POLICY_VIEW',
                'POLICY_ACKNOWLEDGEMENT_VIEW',
                'POLICY_ACKNOWLEDGEMENT_CREATE',
                'POLICY_ACKNOWLEDGEMENT_STATUS_VIEW',

                'REIMBURSEMENT_VIEW',
                'REIMBURSEMENT_CREATE',
                'REIMBURSEMENT_UPDATE',
                'REIMBURSEMENT_DELETE',
                'REIMBURSEMENT_SUBMIT',
                'REIMBURSEMENT_RECEIPT_UPLOAD'
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // =========================================================
        // Restore the old role enum column
        // =========================================================

        await queryRunner.query(`
            CREATE TYPE "users_role_enum"
            AS ENUM (
                'EMPLOYEE',
                'MANAGER',
                'HR',
                'ADMIN'
            )
        `);

        await queryRunner.query(`
            ALTER TABLE "users"
            ADD "role" "users_role_enum"
        `);

        await queryRunner.query(`
            UPDATE "users" u
            SET "role" = r."code"::"users_role_enum"
            FROM "roles" r
            WHERE r."id" = u."role_id"
        `);

        await queryRunner.query(`
            ALTER TABLE "users"
            ALTER COLUMN "role" SET NOT NULL
        `);

        // Remove FK
        await queryRunner.query(`
            ALTER TABLE "users"
            DROP CONSTRAINT "FK_users_role"
        `);

        // Remove role_id
        await queryRunner.query(`
            ALTER TABLE "users"
            DROP COLUMN "role_id"
        `);

        // Remove RBAC tables
        await queryRunner.query(`
            DROP TABLE "role_permissions"
        `);

        await queryRunner.query(`
            DROP TABLE "permissions"
        `);

        await queryRunner.query(`
            DROP TABLE "roles"
        `);
    }
}