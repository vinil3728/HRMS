import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateReimbursements1790092644337 implements MigrationInterface {
    name = 'CreateReimbursements1790092644337'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."reimbursements_status_enum" AS ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "reimbursements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "expense_date" date NOT NULL, "category" character varying NOT NULL, "description" text NOT NULL, "amount" numeric(12,2) NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'INR', "status" "public"."reimbursements_status_enum" NOT NULL DEFAULT 'DRAFT', "rejection_reason" text, "paid_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "employee_id" uuid NOT NULL, CONSTRAINT "PK_a9d2790031ddf939dcd33b72a1a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "reimbursements" ADD CONSTRAINT "FK_c1b3a510ae5e9e426c25bb4b298" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reimbursements" DROP CONSTRAINT "FK_c1b3a510ae5e9e426c25bb4b298"`);
        await queryRunner.query(`DROP TABLE "reimbursements"`);
        await queryRunner.query(`DROP TYPE "public"."reimbursements_status_enum"`);
    }

}
