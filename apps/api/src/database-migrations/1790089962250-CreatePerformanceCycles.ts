import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePerformanceCycles1790089962250 implements MigrationInterface {
    name = 'CreatePerformanceCycles1790089962250'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."performance_cycles_status_enum" AS ENUM('DRAFT', 'OPEN', 'CLOSED')`);
        await queryRunner.query(`CREATE TABLE "performance_cycles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "start_date" date NOT NULL, "end_date" date NOT NULL, "status" "public"."performance_cycles_status_enum" NOT NULL DEFAULT 'DRAFT', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_eb18abc6a15021a6571a421b3f3" UNIQUE ("name"), CONSTRAINT "PK_399ac4b3f00cb66c2802c9be882" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "performance_cycles"`);
        await queryRunner.query(`DROP TYPE "public"."performance_cycles_status_enum"`);
    }

}
