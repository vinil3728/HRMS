import {
    MigrationInterface,
    QueryRunner,
} from 'typeorm';

export class AddEmployeeCodeSequence1790142000800
    implements MigrationInterface
{
    name =
        'AddEmployeeCodeSequence1790142000800';

    public async up(
        queryRunner: QueryRunner,
    ): Promise<void> {
        /*
         * Create PostgreSQL sequence.
         */
        await queryRunner.query(`
            CREATE SEQUENCE IF NOT EXISTS employee_code_seq
            START WITH 1
            INCREMENT BY 1
            MINVALUE 1
            NO MAXVALUE
            CACHE 1
        `);

        /*
         * Set the default employee-code generator.
         *
         * 1  -> EMP-001
         * 2  -> EMP-002
         * 10 -> EMP-010
         * 100 -> EMP-100
         * 1000 -> EMP-1000
         */
        await queryRunner.query(`
            ALTER TABLE "employees"
            ALTER COLUMN "employee_code"
            SET DEFAULT (
                'EMP-' ||
                LPAD(
                    nextval('employee_code_seq')::text,
                    3,
                    '0'
                )
            )
        `);
    }

    public async down(
        queryRunner: QueryRunner,
    ): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "employees"
            ALTER COLUMN "employee_code"
            DROP DEFAULT
        `);

        await queryRunner.query(`
            DROP SEQUENCE IF EXISTS employee_code_seq
        `);
    }
}
