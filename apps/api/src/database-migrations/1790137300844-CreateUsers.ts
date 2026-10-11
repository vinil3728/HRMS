import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUsers1790137300844 implements MigrationInterface {
    name = 'CreateUsers1790137300844'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "policy_acknowledgements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "acknowledged_at" TIMESTAMP NOT NULL DEFAULT now(), "employee_id" uuid NOT NULL, "policy_id" uuid NOT NULL, CONSTRAINT "UQ_policy_acknowledgement_employee_policy" UNIQUE ("employee_id", "policy_id"), CONSTRAINT "PK_621989181149ad611307d3e98aa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('EMPLOYEE', 'MANAGER', 'HR', 'ADMIN')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, "password_hash" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'EMPLOYEE', "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "employee_id" uuid NOT NULL, CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "REL_9760615d88ed518196bb79ea03" UNIQUE ("employee_id"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "policy_acknowledgements" ADD CONSTRAINT "FK_091ef3870354771300ee2103774" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "policy_acknowledgements" ADD CONSTRAINT "FK_a97260fdbc74e6787068eb2dcf3" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_9760615d88ed518196bb79ea03d" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_9760615d88ed518196bb79ea03d"`);
        await queryRunner.query(`ALTER TABLE "policy_acknowledgements" DROP CONSTRAINT "FK_a97260fdbc74e6787068eb2dcf3"`);
        await queryRunner.query(`ALTER TABLE "policy_acknowledgements" DROP CONSTRAINT "FK_091ef3870354771300ee2103774"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP TABLE "policy_acknowledgements"`);
    }

}
