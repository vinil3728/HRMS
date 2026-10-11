import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePolicies1790094036294 implements MigrationInterface {
    name = 'CreatePolicies1790094036294'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."policies_status_enum" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED')`);
        await queryRunner.query(`CREATE TABLE "policies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "code" character varying NOT NULL, "content" text NOT NULL, "version" character varying, "status" "public"."policies_status_enum" NOT NULL DEFAULT 'DRAFT', "effective_date" date, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_15cd6246497f7b690db89777446" UNIQUE ("title"), CONSTRAINT "UQ_3c259f680659c66b13087cc85ae" UNIQUE ("code"), CONSTRAINT "PK_603e09f183df0108d8695c57e28" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "policies"`);
        await queryRunner.query(`DROP TYPE "public"."policies_status_enum"`);
    }

}
