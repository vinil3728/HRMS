import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAttendanceRegularization1790142001000
    implements MigrationInterface
{
    name = 'CreateAttendanceRegularization1790142001000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create attendance_regularizations table
        await queryRunner.query(`
            CREATE TABLE "attendance_regularizations" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "employee_id" uuid NOT NULL,
                "attendance_date" date NOT NULL,
                "requested_check_in" TIMESTAMP,
                "requested_check_out" TIMESTAMP,
                "reason" text NOT NULL,
                "status" character varying NOT NULL DEFAULT 'PENDING',
                "rejection_reason" text,
                "decision_notes" text,
                "actioned_by_id" uuid,
                "actioned_at" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_attendance_regularizations_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_attendance_regularizations_employee"
                    FOREIGN KEY ("employee_id")
                    REFERENCES "employees"("id")
                    ON DELETE CASCADE
                    ON UPDATE NO ACTION,
                CONSTRAINT "FK_attendance_regularizations_actioned_by"
                    FOREIGN KEY ("actioned_by_id")
                    REFERENCES "employees"("id")
                    ON DELETE SET NULL
                    ON UPDATE NO ACTION
            )
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_att_reg_employee_date"
            ON "attendance_regularizations" ("employee_id", "attendance_date")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_att_reg_status"
            ON "attendance_regularizations" ("status")
        `);

        // 2. Insert permissions into permissions table
        await queryRunner.query(`
            INSERT INTO "permissions"
                ("code", "name", "description", "module")
            VALUES
                (
                    'ATTENDANCE_REGULARIZATION_VIEW',
                    'View Regularization Requests',
                    'View attendance regularization and missed punch requests',
                    'Attendance'
                ),
                (
                    'ATTENDANCE_REGULARIZATION_CREATE',
                    'Create Regularization Request',
                    'Apply for attendance regularization or missed punch correction',
                    'Attendance'
                ),
                (
                    'ATTENDANCE_REGULARIZATION_APPROVE',
                    'Approve Regularization Request',
                    'Approve employee attendance regularization requests',
                    'Attendance'
                ),
                (
                    'ATTENDANCE_REGULARIZATION_REJECT',
                    'Reject Regularization Request',
                    'Reject employee attendance regularization requests',
                    'Attendance'
                ),
                (
                    'ATTENDANCE_REGULARIZATION_CANCEL',
                    'Cancel Regularization Request',
                    'Cancel own pending attendance regularization request',
                    'Attendance'
                )
            ON CONFLICT ("code") DO NOTHING
        `);

        // 3. Grant to ADMIN and HR (all 5)
        await queryRunner.query(`
            INSERT INTO "role_permissions" ("role_id", "permission_id")
            SELECT r."id", p."id"
            FROM "roles" r
            CROSS JOIN "permissions" p
            WHERE r."code" IN ('ADMIN', 'HR')
            AND p."code" IN (
                'ATTENDANCE_REGULARIZATION_VIEW',
                'ATTENDANCE_REGULARIZATION_CREATE',
                'ATTENDANCE_REGULARIZATION_APPROVE',
                'ATTENDANCE_REGULARIZATION_REJECT',
                'ATTENDANCE_REGULARIZATION_CANCEL'
            )
            ON CONFLICT DO NOTHING
        `);

        // 4. Grant to MANAGER (all 5)
        await queryRunner.query(`
            INSERT INTO "role_permissions" ("role_id", "permission_id")
            SELECT r."id", p."id"
            FROM "roles" r
            CROSS JOIN "permissions" p
            WHERE r."code" = 'MANAGER'
            AND p."code" IN (
                'ATTENDANCE_REGULARIZATION_VIEW',
                'ATTENDANCE_REGULARIZATION_CREATE',
                'ATTENDANCE_REGULARIZATION_APPROVE',
                'ATTENDANCE_REGULARIZATION_REJECT',
                'ATTENDANCE_REGULARIZATION_CANCEL'
            )
            ON CONFLICT DO NOTHING
        `);

        // 5. Grant to EMPLOYEE (VIEW, CREATE, CANCEL)
        await queryRunner.query(`
            INSERT INTO "role_permissions" ("role_id", "permission_id")
            SELECT r."id", p."id"
            FROM "roles" r
            CROSS JOIN "permissions" p
            WHERE r."code" = 'EMPLOYEE'
            AND p."code" IN (
                'ATTENDANCE_REGULARIZATION_VIEW',
                'ATTENDANCE_REGULARIZATION_CREATE',
                'ATTENDANCE_REGULARIZATION_CANCEL'
            )
            ON CONFLICT DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_att_reg_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_att_reg_employee_date"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "attendance_regularizations"`);
        await queryRunner.query(`
            DELETE FROM "permissions"
            WHERE "code" IN (
                'ATTENDANCE_REGULARIZATION_VIEW',
                'ATTENDANCE_REGULARIZATION_CREATE',
                'ATTENDANCE_REGULARIZATION_APPROVE',
                'ATTENDANCE_REGULARIZATION_REJECT',
                'ATTENDANCE_REGULARIZATION_CANCEL'
            )
        `);
    }
}
