import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReceiptToReimbursements1790093354298 implements MigrationInterface {
    name = 'AddReceiptToReimbursements1790093354298'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reimbursements" ADD "receipt_file_name" character varying`);
        await queryRunner.query(`ALTER TABLE "reimbursements" ADD "receipt_file_path" character varying`);
        await queryRunner.query(`ALTER TABLE "reimbursements" ADD "receipt_mime_type" character varying`);
        await queryRunner.query(`ALTER TABLE "reimbursements" ADD "receipt_file_size" bigint`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reimbursements" DROP COLUMN "receipt_file_size"`);
        await queryRunner.query(`ALTER TABLE "reimbursements" DROP COLUMN "receipt_mime_type"`);
        await queryRunner.query(`ALTER TABLE "reimbursements" DROP COLUMN "receipt_file_path"`);
        await queryRunner.query(`ALTER TABLE "reimbursements" DROP COLUMN "receipt_file_name"`);
    }

}
