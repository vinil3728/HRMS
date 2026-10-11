import {
    MigrationInterface,
    QueryRunner,
} from 'typeorm';

export class AddEmployeeProfileDetails1790142000400
    implements MigrationInterface
{
    name =
        'AddEmployeeProfileDetails1790142000400';

    public async up(
        queryRunner: QueryRunner,
    ): Promise<void> {
        // =========================================================
        // 1. Create employee_profile_details table
        // =========================================================

        await queryRunner.query(`
            CREATE TABLE "employee_profile_details" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),

                "employee_id" uuid NOT NULL,

                "date_of_birth" date,

                "gender" character varying(50),

                "marital_status" character varying(50),

                "blood_group" character varying(20),

                "nationality" character varying(100),

                "personal_email" character varying(255),

                "alternate_phone" character varying(30),

                "address_line_1" character varying(255),

                "address_line_2" character varying(255),

                "city" character varying(100),

                "state" character varying(100),

                "country" character varying(100),

                "postal_code" character varying(20),

                "emergency_contact_name" character varying(150),

                "emergency_contact_relationship" character varying(100),

                "emergency_contact_phone" character varying(30),

                "created_at" TIMESTAMP NOT NULL DEFAULT now(),

                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),

                CONSTRAINT "PK_employee_profile_details_id"
                    PRIMARY KEY ("id"),

                CONSTRAINT "UQ_employee_profile_details_employee"
                    UNIQUE ("employee_id"),

                CONSTRAINT "FK_employee_profile_details_employee"
                    FOREIGN KEY ("employee_id")
                    REFERENCES "employees"("id")
                    ON DELETE CASCADE
                    ON UPDATE NO ACTION
            )
        `);
    }

    public async down(
        queryRunner: QueryRunner,
    ): Promise<void> {
        // =========================================================
        // Remove employee_profile_details table
        // =========================================================

        await queryRunner.query(`
            DROP TABLE "employee_profile_details"
        `);
    }
}
