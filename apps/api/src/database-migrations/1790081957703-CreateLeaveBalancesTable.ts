import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLeaveBalancesTable1790081957703 implements MigrationInterface {
    name = 'CreateLeaveBalancesTable1790081957703'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."leave_balances_leave_type_enum" AS ENUM('CASUAL', 'SICK', 'EARNED', 'UNPAID', 'MATERNITY', 'PATERNITY', 'OTHER')`);
        await queryRunner.query(`CREATE TABLE "leave_balances" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "leave_type" "public"."leave_balances_leave_type_enum" NOT NULL, "year" integer NOT NULL, "total_days" numeric(5,1) NOT NULL DEFAULT '0', "used_days" numeric(5,1) NOT NULL DEFAULT '0', "available_days" numeric(5,1) NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "employee_id" uuid NOT NULL, CONSTRAINT "UQ_leave_balance_employee_type_year" UNIQUE ("employee_id", "leave_type", "year"), CONSTRAINT "PK_a1d90dff48fb2bfd23a7163d077" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "leave_balances" ADD CONSTRAINT "FK_2f8aebce74941a2e2168e94ba68" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "leave_balances" DROP CONSTRAINT "FK_2f8aebce74941a2e2168e94ba68"`);
        await queryRunner.query(`DROP TABLE "leave_balances"`);
        await queryRunner.query(`DROP TYPE "public"."leave_balances_leave_type_enum"`);
    }

}
