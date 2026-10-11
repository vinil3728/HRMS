import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDepartmentToDesignations1790142001200
  implements MigrationInterface
{
  name = 'AddDepartmentToDesignations1790142001200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add department_id column to designations table
    await queryRunner.query(`
      ALTER TABLE "designations"
      ADD COLUMN "department_id" uuid NULL
    `);

    // 2. Add foreign key constraint pointing to departments(id)
    await queryRunner.query(`
      ALTER TABLE "designations"
      ADD CONSTRAINT "FK_designations_department"
      FOREIGN KEY ("department_id")
      REFERENCES "departments"("id")
      ON DELETE SET NULL
    `);

    // 3. Create index on department_id
    await queryRunner.query(`
      CREATE INDEX "IDX_designations_department_id"
      ON "designations" ("department_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "IDX_designations_department_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "designations"
      DROP CONSTRAINT "FK_designations_department"
    `);

    await queryRunner.query(`
      ALTER TABLE "designations"
      DROP COLUMN "department_id"
    `);
  }
}
