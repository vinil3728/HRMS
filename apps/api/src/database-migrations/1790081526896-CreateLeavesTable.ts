import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLeavesTable1790081526896 implements MigrationInterface {
    name = 'CreateLeavesTable1790081526896'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."leaves_leave_type_enum" AS ENUM('CASUAL', 'SICK', 'EARNED', 'UNPAID', 'MATERNITY', 'PATERNITY', 'OTHER')`);
        await queryRunner.query(`CREATE TYPE "public"."leaves_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "leaves" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "leave_type" "public"."leaves_leave_type_enum" NOT NULL, "start_date" date NOT NULL, "end_date" date NOT NULL, "number_of_days" numeric(5,1) NOT NULL, "status" "public"."leaves_status_enum" NOT NULL DEFAULT 'PENDING', "reason" text, "rejection_reason" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "employee_id" uuid NOT NULL, CONSTRAINT "PK_4153ec7270da3d07efd2e11e2a7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "leaves" ADD CONSTRAINT "FK_29d5827b1f3a86dc19288ec69a5" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "leaves" DROP CONSTRAINT "FK_29d5827b1f3a86dc19288ec69a5"`);
        await queryRunner.query(`DROP TABLE "leaves"`);
        await queryRunner.query(`DROP TYPE "public"."leaves_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."leaves_leave_type_enum"`);
    }

}
