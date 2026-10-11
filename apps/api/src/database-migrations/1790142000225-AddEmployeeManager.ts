import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmployeeManager1790142000225 implements MigrationInterface {
    name = 'AddEmployeeManager1790142000225'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" ADD "manager_id" uuid`);
        await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "FK_bcdf921072a19dd2758a628c5c0" FOREIGN KEY ("manager_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "FK_bcdf921072a19dd2758a628c5c0"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "manager_id"`);
    }

}
