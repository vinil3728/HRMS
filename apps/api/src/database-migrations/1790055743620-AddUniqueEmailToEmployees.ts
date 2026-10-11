import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueEmailToEmployees1790055743620 implements MigrationInterface {
    name = 'AddUniqueEmailToEmployees1790055743620'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "UQ_765bc1ac8967533a04c74a9f6af" UNIQUE ("email")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "UQ_765bc1ac8967533a04c74a9f6af"`);
    }

}
