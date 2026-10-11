import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAttendanceFlags1790080794589 implements MigrationInterface {
    name = 'AddAttendanceFlags1790080794589'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "attendance" ADD "is_late" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "attendance" ADD "is_early_checkout" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "attendance" DROP COLUMN "is_early_checkout"`);
        await queryRunner.query(`ALTER TABLE "attendance" DROP COLUMN "is_late"`);
    }

}
