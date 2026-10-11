import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePerformanceGoals1790090778257 implements MigrationInterface {
    name = 'CreatePerformanceGoals1790090778257'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."performance_goals_status_enum" AS ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "performance_goals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "description" text, "target" text, "weight" numeric(5,2) NOT NULL, "progress" integer NOT NULL DEFAULT '0', "status" "public"."performance_goals_status_enum" NOT NULL DEFAULT 'NOT_STARTED', "start_date" date NOT NULL, "end_date" date NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "employee_id" uuid NOT NULL, "cycle_id" uuid NOT NULL, CONSTRAINT "PK_b0283438f51c6f5e5fc7c150c2e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "performance_goals" ADD CONSTRAINT "FK_21820c3875e17139d86235bfc1c" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "performance_goals" ADD CONSTRAINT "FK_0c0d24a7b6c47c920aca0d7bcc7" FOREIGN KEY ("cycle_id") REFERENCES "performance_cycles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "performance_goals" DROP CONSTRAINT "FK_0c0d24a7b6c47c920aca0d7bcc7"`);
        await queryRunner.query(`ALTER TABLE "performance_goals" DROP CONSTRAINT "FK_21820c3875e17139d86235bfc1c"`);
        await queryRunner.query(`DROP TABLE "performance_goals"`);
        await queryRunner.query(`DROP TYPE "public"."performance_goals_status_enum"`);
    }

}
