import {
    MigrationInterface,
    QueryRunner,
} from 'typeorm';

export class AddEmployeeIdentityDetails1790142000500
    implements MigrationInterface
{
    name =
        'AddEmployeeIdentityDetails1790142000500';

    public async up(
        queryRunner: QueryRunner,
    ): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "employee_identity_details" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),

                "employee_id" uuid NOT NULL,

                "aadhaar_number" character varying(12),

                "pan_number" character varying(10),

                "created_at" TIMESTAMP NOT NULL DEFAULT now(),

                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),

                CONSTRAINT "PK_employee_identity_details_id"
                    PRIMARY KEY ("id"),

                CONSTRAINT "UQ_employee_identity_details_employee"
                    UNIQUE ("employee_id"),

                CONSTRAINT "FK_employee_identity_details_employee"
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
        await queryRunner.query(`
            DROP TABLE "employee_identity_details"
        `);
    }
}