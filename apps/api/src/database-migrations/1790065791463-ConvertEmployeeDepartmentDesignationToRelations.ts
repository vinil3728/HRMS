import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertEmployeeDepartmentDesignationToRelations1790065791463
  implements MigrationInterface
{
  name =
    'ConvertEmployeeDepartmentDesignationToRelations1790065791463';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create departments table
    await queryRunner.query(`
      CREATE TABLE "departments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "code" character varying NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_departments_name" UNIQUE ("name"),
        CONSTRAINT "UQ_departments_code" UNIQUE ("code"),
        CONSTRAINT "PK_departments" PRIMARY KEY ("id")
      )
    `);

    // 2. Create designations table
    await queryRunner.query(`
      CREATE TABLE "designations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "code" character varying NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_designations_name" UNIQUE ("name"),
        CONSTRAINT "UQ_designations_code" UNIQUE ("code"),
        CONSTRAINT "PK_designations" PRIMARY KEY ("id")
      )
    `);

    // 3. Insert default master records
    await queryRunner.query(`
      INSERT INTO "departments" ("name", "code")
      VALUES ('GENERAL', 'GEN')
    `);

    await queryRunner.query(`
      INSERT INTO "designations" ("name", "code")
      VALUES ('EMPLOYEE', 'EMP')
    `);

    // 4. Add new FK columns as nullable temporarily
    await queryRunner.query(`
      ALTER TABLE "employees"
      ADD "department_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "employees"
      ADD "designation_id" uuid
    `);

    // 5. Map existing employees to the default records
    await queryRunner.query(`
      UPDATE "employees"
      SET "department_id" = (
        SELECT "id"
        FROM "departments"
        WHERE "code" = 'GEN'
      )
    `);

    await queryRunner.query(`
      UPDATE "employees"
      SET "designation_id" = (
        SELECT "id"
        FROM "designations"
        WHERE "code" = 'EMP'
      )
    `);

    // 6. Make the new FK columns NOT NULL
    await queryRunner.query(`
      ALTER TABLE "employees"
      ALTER COLUMN "department_id" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "employees"
      ALTER COLUMN "designation_id" SET NOT NULL
    `);

    // 7. Remove old string columns
    await queryRunner.query(`
      ALTER TABLE "employees"
      DROP COLUMN "department"
    `);

    await queryRunner.query(`
      ALTER TABLE "employees"
      DROP COLUMN "designation"
    `);

    // 8. Add foreign keys
    await queryRunner.query(`
      ALTER TABLE "employees"
      ADD CONSTRAINT "FK_employees_department"
      FOREIGN KEY ("department_id")
      REFERENCES "departments"("id")
      ON DELETE RESTRICT
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "employees"
      ADD CONSTRAINT "FK_employees_designation"
      FOREIGN KEY ("designation_id")
      REFERENCES "designations"("id")
      ON DELETE RESTRICT
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign keys
    await queryRunner.query(`
      ALTER TABLE "employees"
      DROP CONSTRAINT "FK_employees_designation"
    `);

    await queryRunner.query(`
      ALTER TABLE "employees"
      DROP CONSTRAINT "FK_employees_department"
    `);

    // Add old columns back
    await queryRunner.query(`
      ALTER TABLE "employees"
      ADD "department" character varying
    `);

    await queryRunner.query(`
      ALTER TABLE "employees"
      ADD "designation" character varying
    `);

    // Restore values from master tables
    await queryRunner.query(`
      UPDATE "employees"
      SET "department" = (
        SELECT "name"
        FROM "departments"
        WHERE "departments"."id" = "employees"."department_id"
      )
    `);

    await queryRunner.query(`
      UPDATE "employees"
      SET "designation" = (
        SELECT "name"
        FROM "designations"
        WHERE "designations"."id" = "employees"."designation_id"
      )
    `);

    // Make old columns NOT NULL again
    await queryRunner.query(`
      ALTER TABLE "employees"
      ALTER COLUMN "department" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "employees"
      ALTER COLUMN "designation" SET NOT NULL
    `);

    // Remove FK columns
    await queryRunner.query(`
      ALTER TABLE "employees"
      DROP COLUMN "department_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "employees"
      DROP COLUMN "designation_id"
    `);

    // Remove master tables
    await queryRunner.query(`
      DROP TABLE "designations"
    `);

    await queryRunner.query(`
      DROP TABLE "departments"
    `);
  }
}