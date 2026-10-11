import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDepartmentDesignationToEmployees1790056645975
  implements MigrationInterface
{
  name = 'AddDepartmentDesignationToEmployees1790056645975';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'employees',
      new TableColumn({
        name: 'department',
        type: 'character varying',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'employees',
      new TableColumn({
        name: 'designation',
        type: 'character varying',
        isNullable: true,
      }),
    );

    await queryRunner.query(`
      UPDATE employees
      SET department = 'GENERAL',
          designation = 'EMPLOYEE'
      WHERE department IS NULL
         OR designation IS NULL
    `);

    await queryRunner.changeColumn(
      'employees',
      'department',
      new TableColumn({
        name: 'department',
        type: 'character varying',
        isNullable: false,
      }),
    );

    await queryRunner.changeColumn(
      'employees',
      'designation',
      new TableColumn({
        name: 'designation',
        type: 'character varying',
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('employees', 'designation');
    await queryRunner.dropColumn('employees', 'department');
  }
}