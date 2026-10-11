import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePerformanceEvaluations1790091487334 implements MigrationInterface {
    name = 'CreatePerformanceEvaluations1790091487334'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."performance_evaluations_evaluation_type_enum" AS ENUM('SELF', 'MANAGER')`);
        await queryRunner.query(`CREATE TYPE "public"."performance_evaluations_status_enum" AS ENUM('DRAFT', 'SUBMITTED')`);
        await queryRunner.query(`CREATE TABLE "performance_evaluations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "evaluation_type" "public"."performance_evaluations_evaluation_type_enum" NOT NULL, "status" "public"."performance_evaluations_status_enum" NOT NULL DEFAULT 'DRAFT', "rating" integer, "comments" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "employee_id" uuid NOT NULL, "cycle_id" uuid NOT NULL, "goal_id" uuid NOT NULL, CONSTRAINT "UQ_performance_evaluation_goal_type" UNIQUE ("goal_id", "evaluation_type"), CONSTRAINT "PK_aa5ff53349b99197cde4194bda1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "performance_evaluations" ADD CONSTRAINT "FK_b294b035e1f53d8bd54a4e43ca2" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "performance_evaluations" ADD CONSTRAINT "FK_d2feed712c2b5f552e9e7151354" FOREIGN KEY ("cycle_id") REFERENCES "performance_cycles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "performance_evaluations" ADD CONSTRAINT "FK_2ce3036d4f28de26a6a39613e0a" FOREIGN KEY ("goal_id") REFERENCES "performance_goals"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "performance_evaluations" DROP CONSTRAINT "FK_2ce3036d4f28de26a6a39613e0a"`);
        await queryRunner.query(`ALTER TABLE "performance_evaluations" DROP CONSTRAINT "FK_d2feed712c2b5f552e9e7151354"`);
        await queryRunner.query(`ALTER TABLE "performance_evaluations" DROP CONSTRAINT "FK_b294b035e1f53d8bd54a4e43ca2"`);
        await queryRunner.query(`DROP TABLE "performance_evaluations"`);
        await queryRunner.query(`DROP TYPE "public"."performance_evaluations_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."performance_evaluations_evaluation_type_enum"`);
    }

}
