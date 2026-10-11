import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateEmployeeDocuments1790067709865 implements MigrationInterface {
    name = 'CreateEmployeeDocuments1790067709865'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "FK_employees_department"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "FK_employees_designation"`);
        await queryRunner.query(`CREATE TABLE "employee_documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "document_type" character varying NOT NULL, "file_name" character varying NOT NULL, "file_path" character varying NOT NULL, "mime_type" character varying NOT NULL, "file_size" bigint NOT NULL, "uploaded_at" TIMESTAMP NOT NULL DEFAULT now(), "employee_id" uuid NOT NULL, CONSTRAINT "PK_c19b36f5e604e261fb430293b68" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "FK_678a3540f843823784b0fe4a4f2" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "FK_2de5d6e4fb3345f18bc467017f0" FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employee_documents" ADD CONSTRAINT "FK_7fce49bcbfe15a73953b2809944" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employee_documents" DROP CONSTRAINT "FK_7fce49bcbfe15a73953b2809944"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "FK_2de5d6e4fb3345f18bc467017f0"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "FK_678a3540f843823784b0fe4a4f2"`);
        await queryRunner.query(`DROP TABLE "employee_documents"`);
        await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "FK_employees_designation" FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "FK_employees_department" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

}
