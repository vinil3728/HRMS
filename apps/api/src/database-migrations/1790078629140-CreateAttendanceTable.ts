import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAttendanceTable1790078629140 implements MigrationInterface {
    name = 'CreateAttendanceTable1790078629140'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."attendance_status_enum" AS ENUM('PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY', 'WEEK_OFF')`);
        await queryRunner.query(`CREATE TABLE "attendance" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "attendance_date" date NOT NULL, "check_in" TIMESTAMP, "check_out" TIMESTAMP, "status" "public"."attendance_status_enum" NOT NULL, "working_hours" numeric(5,2), "remarks" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "employee_id" uuid NOT NULL, CONSTRAINT "UQ_attendance_employee_date" UNIQUE ("employee_id", "attendance_date"), CONSTRAINT "PK_ee0ffe42c1f1a01e72b725c0cb2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "attendance" ADD CONSTRAINT "FK_2be2f615d3c20d620c6485d5463" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "attendance" DROP CONSTRAINT "FK_2be2f615d3c20d620c6485d5463"`);
        await queryRunner.query(`DROP TABLE "attendance"`);
        await queryRunner.query(`DROP TYPE "public"."attendance_status_enum"`);
    }

}
