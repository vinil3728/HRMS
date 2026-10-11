import {
    MigrationInterface,
    QueryRunner,
} from 'typeorm';

export class AddEmployeeBankDetails1790142000600
    implements MigrationInterface
{
    name =
        'AddEmployeeBankDetails1790142000600';

    public async up(
        queryRunner: QueryRunner,
    ): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "employee_bank_details" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),

                "employee_id" uuid NOT NULL,

                "account_holder_name"
                    character varying(150) NOT NULL,

                "account_number"
                    character varying(30) NOT NULL,

                "ifsc_code"
                    character varying(11) NOT NULL,

                "bank_name"
                    character varying(150) NOT NULL,

                "branch_name"
                    character varying(150) NOT NULL,

                "created_at"
                    TIMESTAMP NOT NULL DEFAULT now(),

                "updated_at"
                    TIMESTAMP NOT NULL DEFAULT now(),

                CONSTRAINT "PK_employee_bank_details_id"
                    PRIMARY KEY ("id"),

                CONSTRAINT "UQ_employee_bank_details_employee"
                    UNIQUE ("employee_id"),

                CONSTRAINT "FK_employee_bank_details_employee"
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
            DROP TABLE "employee_bank_details"
        `);
    }
}
