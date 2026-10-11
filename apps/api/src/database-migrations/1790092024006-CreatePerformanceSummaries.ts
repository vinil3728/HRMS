import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePerformanceSummaries1790092024006 implements MigrationInterface {
    name = 'CreatePerformanceSummaries1790092024006'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "performance_summaries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "final_rating" numeric(3,2), "comments" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "employee_id" uuid NOT NULL, "cycle_id" uuid NOT NULL, CONSTRAINT "UQ_performance_summary_employee_cycle" UNIQUE ("employee_id", "cycle_id"), CONSTRAINT "PK_820a5a2d89066f4e8f5d1719b45" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "performance_summaries" ADD CONSTRAINT "FK_64e5fba0a0abfcbd767d9550c0e" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "performance_summaries" ADD CONSTRAINT "FK_deb379fa2107f49293f93162c93" FOREIGN KEY ("cycle_id") REFERENCES "performance_cycles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "performance_summaries" DROP CONSTRAINT "FK_deb379fa2107f49293f93162c93"`);
        await queryRunner.query(`ALTER TABLE "performance_summaries" DROP CONSTRAINT "FK_64e5fba0a0abfcbd767d9550c0e"`);
        await queryRunner.query(`DROP TABLE "performance_summaries"`);
    }

}
