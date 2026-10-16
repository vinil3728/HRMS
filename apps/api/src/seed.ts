import { Client } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from potential root or app-level .env locations
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'hrms',
};

async function runSeed() {
  console.log('===============================================================');
  console.log('       HRMS COMPREHENSIVE 2-YEAR DATABASE SEED SCRIPT          ');
  console.log('===============================================================');
  console.log(`Connecting to database "${DB_CONFIG.database}" at ${DB_CONFIG.host}:${DB_CONFIG.port}...`);

  const client = new Client(DB_CONFIG);

  try {
    await client.connect();
    console.log('Connected successfully.');

    await client.query('BEGIN');

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Verify Essential Configuration Data (DO NOT DELETE)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\nStep 1: Verifying essential configuration data...');
    const rolesRes = await client.query('SELECT id, code, name FROM roles WHERE is_deleted = false');
    const roleMap: Record<string, string> = {};
    rolesRes.rows.forEach(r => (roleMap[r.code] = r.id));

    if (!roleMap['ADMIN'] || !roleMap['HR'] || !roleMap['MANAGER'] || !roleMap['EMPLOYEE']) {
      throw new Error(
        `Missing required core roles in roles table! Found: ${Object.keys(roleMap).join(', ')}. ` +
        'Essential configuration (roles, permissions, role_permissions, modules) must exist.'
      );
    }
    console.log(`Found ${rolesRes.rows.length} roles (ADMIN, HR, MANAGER, EMPLOYEE verified).`);

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Reset All Operational / Business Data (Preserve Roles & Config)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\nStep 2: Resetting all non-configuration data...');
    const tablesToReset = [
      'policy_acknowledgements',
      'policies',
      'reimbursements',
      'loan_repayments',
      'company_loans',
      'performance_evaluations',
      'performance_summaries',
      'performance_goals',
      'performance_cycles',
      'payslips',
      'payroll_runs',
      'salary_structures',
      'attendance_regularizations',
      'attendance',
      'timesheets',
      'leaves',
      'leave_balances',
      'company_holidays',
      'employee_documents',
      'employee_bank_details',
      'employee_identity_details',
      'employee_profile_details',
      'refresh_tokens',
      'users',
      'employees',
      'designations',
      'departments',
      'branches'
    ];

    for (const table of tablesToReset) {
      await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE;`);
    }

    // Reset employee code auto-increment sequence
    await client.query('ALTER SEQUENCE IF EXISTS employee_code_seq RESTART WITH 1;');
    console.log('All business data tables truncated and employee_code_seq reset to 1.');

    // ──────────────────────────────────────────────────────────────────────────
    // 3. Seed Branches
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\nStep 3: Seeding Branches...');
    const branchRes = await client.query(`
      INSERT INTO branches (name, code, email, phone, address, city, state, country, postal_code, is_active)
      VALUES
        ('Bengaluru Headquarters', 'BLR-HQ', 'blr.hq@hrms.com', '+91 80 4123 4567', '100 Feet Road, Indiranagar', 'Bengaluru', 'Karnataka', 'India', '560038', true),
        ('Hyderabad Technology Center', 'HYD-TC', 'hyd.office@hrms.com', '+91 40 6789 0123', 'Mindspace Cyberabad, Hitec City', 'Hyderabad', 'Telangana', 'India', '500081', true),
        ('Mumbai Regional Office', 'MUM-RO', 'mum.office@hrms.com', '+91 22 2654 9870', 'G-Block, Bandra Kurla Complex', 'Mumbai', 'Maharashtra', 'India', '400051', true)
      RETURNING id, code;
    `);
    const branchMap: Record<string, string> = {};
    branchRes.rows.forEach(b => (branchMap[b.code] = b.id));
    console.log(`Inserted ${branchRes.rows.length} branches.`);

    // ──────────────────────────────────────────────────────────────────────────
    // 4. Seed Departments
    // ──────────────────────────────────────────────────────────────────────────
    console.log('Step 4: Seeding Departments...');
    const deptRes = await client.query(`
      INSERT INTO departments (name, code, branch_id, "isActive")
      VALUES
        ('Executive Leadership', 'EXEC', '${branchMap['BLR-HQ']}', true),
        ('Human Resources', 'HR', '${branchMap['BLR-HQ']}', true),
        ('Software Engineering', 'ENG', '${branchMap['BLR-HQ']}', true),
        ('Quality Engineering', 'QA', '${branchMap['HYD-TC']}', true),
        ('Finance & Payroll', 'FIN', '${branchMap['MUM-RO']}', true),
        ('Product & Design', 'PROD', '${branchMap['BLR-HQ']}', true)
      RETURNING id, code;
    `);
    const deptMap: Record<string, string> = {};
    deptRes.rows.forEach(d => (deptMap[d.code] = d.id));
    console.log(`Inserted ${deptRes.rows.length} departments.`);

    // ──────────────────────────────────────────────────────────────────────────
    // 5. Seed Designations
    // ──────────────────────────────────────────────────────────────────────────
    console.log('Step 5: Seeding Designations...');
    const desigRes = await client.query(`
      INSERT INTO designations (name, code, department_id, "isActive")
      VALUES
        ('Chief Executive Officer', 'CEO', '${deptMap['EXEC']}', true),
        ('HR Director', 'HRD', '${deptMap['HR']}', true),
        ('Human Resources Manager', 'HRM', '${deptMap['HR']}', true),
        ('HR Executive', 'HRE', '${deptMap['HR']}', true),
        ('Engineering Manager', 'EM', '${deptMap['ENG']}', true),
        ('Lead Software Engineer', 'LSE', '${deptMap['ENG']}', true),
        ('Senior Software Engineer', 'SSE', '${deptMap['ENG']}', true),
        ('Software Engineer', 'SE', '${deptMap['ENG']}', true),
        ('QA Manager', 'QAM', '${deptMap['QA']}', true),
        ('Senior QA Automation Engineer', 'SQA', '${deptMap['QA']}', true),
        ('QA Automation Engineer', 'QAE', '${deptMap['QA']}', true),
        ('Finance & Payroll Manager', 'FM', '${deptMap['FIN']}', true),
        ('Senior Payroll Specialist', 'PSA', '${deptMap['FIN']}', true),
        ('Lead Product Manager', 'PM', '${deptMap['PROD']}', true),
        ('Senior UI/UX Designer', 'UXD', '${deptMap['PROD']}', true)
      RETURNING id, code;
    `);
    const desigMap: Record<string, string> = {};
    desigRes.rows.forEach(d => (desigMap[d.code] = d.id));
    console.log(`Inserted ${desigRes.rows.length} designations.`);

    // ──────────────────────────────────────────────────────────────────────────
    // 6. Seed Employees (Hierarchical)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('Step 6: Seeding Hierarchical Employees...');
    // Level 1: CEO / Admin
    const emp1 = (
      await client.query(`
        INSERT INTO employees (first_name, last_name, email, phone, date_of_joining, status, department_id, designation_id, manager_id)
        VALUES ('Vikramaditya', 'Rao', 'admin@hrms.com', '+91 98800 11001', '2024-01-15', 'ACTIVE', '${deptMap['EXEC']}', '${desigMap['CEO']}', NULL)
        RETURNING id, employee_code;
      `)
    ).rows[0];

    // Level 2: Managers (Direct reports to Vikramaditya)
    const emp2 = (
      await client.query(`
        INSERT INTO employees (first_name, last_name, email, phone, date_of_joining, status, department_id, designation_id, manager_id)
        VALUES ('Priya', 'Sharma', 'priya.hr@hrms.com', '+91 98800 22002', '2024-02-01', 'ACTIVE', '${deptMap['HR']}', '${desigMap['HRM']}', '${emp1.id}')
        RETURNING id, employee_code;
      `)
    ).rows[0];

    const emp3 = (
      await client.query(`
        INSERT INTO employees (first_name, last_name, email, phone, date_of_joining, status, department_id, designation_id, manager_id)
        VALUES ('Arjun', 'Verma', 'arjun.mgr@hrms.com', '+91 98800 33003', '2024-03-01', 'ACTIVE', '${deptMap['ENG']}', '${desigMap['EM']}', '${emp1.id}')
        RETURNING id, employee_code;
      `)
    ).rows[0];

    const emp4 = (
      await client.query(`
        INSERT INTO employees (first_name, last_name, email, phone, date_of_joining, status, department_id, designation_id, manager_id)
        VALUES ('Deepa', 'Nair', 'deepa.mgr@hrms.com', '+91 98800 44004', '2024-03-15', 'ACTIVE', '${deptMap['QA']}', '${desigMap['QAM']}', '${emp1.id}')
        RETURNING id, employee_code;
      `)
    ).rows[0];

    const emp9 = (
      await client.query(`
        INSERT INTO employees (first_name, last_name, email, phone, date_of_joining, status, department_id, designation_id, manager_id)
        VALUES ('Manoj', 'Deshmukh', 'manoj.fin@hrms.com', '+91 98800 99009', '2024-05-10', 'ACTIVE', '${deptMap['FIN']}', '${desigMap['PSA']}', '${emp1.id}')
        RETURNING id, employee_code;
      `)
    ).rows[0];

    const emp10 = (
      await client.query(`
        INSERT INTO employees (first_name, last_name, email, phone, date_of_joining, status, department_id, designation_id, manager_id)
        VALUES ('Neha', 'Gupta', 'neha.ui@hrms.com', '+91 98800 10010', '2024-08-01', 'ACTIVE', '${deptMap['PROD']}', '${desigMap['UXD']}', '${emp1.id}')
        RETURNING id, employee_code;
      `)
    ).rows[0];

    // Level 3: Individual Contributors
    // Under Arjun Verma (Engineering)
    const emp5 = (
      await client.query(`
        INSERT INTO employees (first_name, last_name, email, phone, date_of_joining, status, department_id, designation_id, manager_id)
        VALUES ('Rohit', 'Patel', 'rohit.dev@hrms.com', '+91 98800 55005', '2024-06-01', 'ACTIVE', '${deptMap['ENG']}', '${desigMap['SSE']}', '${emp3.id}')
        RETURNING id, employee_code;
      `)
    ).rows[0];

    const emp6 = (
      await client.query(`
        INSERT INTO employees (first_name, last_name, email, phone, date_of_joining, status, department_id, designation_id, manager_id)
        VALUES ('Ananya', 'Iyer', 'ananya.dev@hrms.com', '+91 98800 66006', '2024-09-01', 'ACTIVE', '${deptMap['ENG']}', '${desigMap['SE']}', '${emp3.id}')
        RETURNING id, employee_code;
      `)
    ).rows[0];

    // Under Deepa Nair (QA)
    const emp7 = (
      await client.query(`
        INSERT INTO employees (first_name, last_name, email, phone, date_of_joining, status, department_id, designation_id, manager_id)
        VALUES ('Karthik', 'Reddy', 'karthik.qa@hrms.com', '+91 98800 77007', '2024-07-15', 'ACTIVE', '${deptMap['QA']}', '${desigMap['QAE']}', '${emp4.id}')
        RETURNING id, employee_code;
      `)
    ).rows[0];

    // Under Priya Sharma (HR)
    const emp8 = (
      await client.query(`
        INSERT INTO employees (first_name, last_name, email, phone, date_of_joining, status, department_id, designation_id, manager_id)
        VALUES ('Sneha', 'Kulkarni', 'sneha.hr@hrms.com', '+91 98800 88008', '2024-10-01', 'ACTIVE', '${deptMap['HR']}', '${desigMap['HRE']}', '${emp2.id}')
        RETURNING id, employee_code;
      `)
    ).rows[0];

    const allEmps = [emp1, emp2, emp3, emp4, emp5, emp6, emp7, emp8, emp9, emp10];
    console.log(`Inserted ${allEmps.length} employees with manager reporting hierarchy.`);

    // ──────────────────────────────────────────────────────────────────────────
    // 7. Seed Employee Profile Details, Identity, and Bank Details
    // ──────────────────────────────────────────────────────────────────────────
    console.log('Step 7: Seeding Employee Profile, Identity, and Bank Details...');
    const bloodGroups = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A+'];
    const genders = ['MALE', 'FEMALE', 'MALE', 'FEMALE', 'MALE', 'FEMALE', 'MALE', 'FEMALE', 'MALE', 'FEMALE'];
    const marital = ['MARRIED', 'MARRIED', 'MARRIED', 'SINGLE', 'SINGLE', 'SINGLE', 'MARRIED', 'SINGLE', 'MARRIED', 'SINGLE'];
    const usernames = ['admin', 'priya.hr', 'arjun.mgr', 'deepa.mgr', 'rohit.dev', 'ananya.dev', 'karthik.qa', 'sneha.hr', 'manoj.fin', 'neha.ui'];

    for (let i = 0; i < allEmps.length; i++) {
      const emp = allEmps[i];
      const yob = 1985 + (i * 2);
      const dob = `${yob}-0${(i % 9) + 1}-15`;

      // Profile details
      await client.query(`
        INSERT INTO employee_profile_details
          (employee_id, date_of_birth, gender, marital_status, blood_group, nationality, personal_email, alternate_phone, address_line_1, city, state, country, postal_code, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone)
        VALUES
          ('${emp.id}', '${dob}', '${genders[i]}', '${marital[i]}', '${bloodGroups[i % bloodGroups.length]}', 'Indian',
           'personal.${usernames[i]}@example.com', '+91 98800 8000${i}', 'Flat ${101 + i}, Prestige Towers', 'Bengaluru', 'Karnataka', 'India', '560038',
           'Emergency Contact ${i + 1}', 'Spouse', '+91 98800 9000${i}');
      `);

      // Identity details
      const aadhaar = `9876543210${(i * 11) % 90 + 10}`.slice(0, 12);
      const pan = `ABCDE${1000 + i}F`;
      await client.query(`
        INSERT INTO employee_identity_details (employee_id, aadhaar_number, pan_number)
        VALUES ('${emp.id}', '${aadhaar}', '${pan}');
      `);

      // Bank details
      const accNum = `91234567890${10 + i}`;
      await client.query(`
        INSERT INTO employee_bank_details (employee_id, account_holder_name, account_number, ifsc_code, bank_name, branch_name)
        VALUES ('${emp.id}', 'Employee ${i + 1}', '${accNum}', 'HDFC0001234', 'HDFC Bank Ltd', 'Indiranagar Branch');
      `);
    }
    console.log('Profile, identity, and bank records created for all employees.');

    // ──────────────────────────────────────────────────────────────────────────
    // 8. Seed Users & Password Hashes
    // ──────────────────────────────────────────────────────────────────────────
    console.log('Step 8: Seeding Users with Password Hashes...');
    const defaultPassword = 'Password@123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const userConfigs = [
      { empId: emp1.id, username: 'admin', roleId: roleMap['ADMIN'] },
      { empId: emp2.id, username: 'priya.hr', roleId: roleMap['HR'] },
      { empId: emp3.id, username: 'arjun.mgr', roleId: roleMap['MANAGER'] },
      { empId: emp4.id, username: 'deepa.mgr', roleId: roleMap['MANAGER'] },
      { empId: emp5.id, username: 'rohit.dev', roleId: roleMap['EMPLOYEE'] },
      { empId: emp6.id, username: 'ananya.dev', roleId: roleMap['EMPLOYEE'] },
      { empId: emp7.id, username: 'karthik.qa', roleId: roleMap['EMPLOYEE'] },
      { empId: emp8.id, username: 'sneha.hr', roleId: roleMap['EMPLOYEE'] },
      { empId: emp9.id, username: 'manoj.fin', roleId: roleMap['EMPLOYEE'] },
      { empId: emp10.id, username: 'neha.ui', roleId: roleMap['EMPLOYEE'] },
    ];

    for (const u of userConfigs) {
      await client.query(`
        INSERT INTO users (employee_id, role_id, username, password_hash, is_active)
        VALUES ('${u.empId}', '${u.roleId}', '${u.username}', '${passwordHash}', true);
      `);
    }
    console.log(`Created ${userConfigs.length} user accounts with standard password "${defaultPassword}".`);

    // ──────────────────────────────────────────────────────────────────────────
    // 9. Seed Company Holidays (2025 & 2026)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('Step 9: Seeding Company Holidays (2025 & 2026)...');
    const holidays = [
      // 2025
      { name: 'Republic Day', date: '2025-01-26', day: 'Sunday', type: 'GAZETTED', desc: 'National Holiday' },
      { name: 'Holi', date: '2025-03-14', day: 'Friday', type: 'GAZETTED', desc: 'Festival of Colors' },
      { name: 'Good Friday', date: '2025-04-18', day: 'Friday', type: 'GAZETTED', desc: 'Christian Observance' },
      { name: 'May Day', date: '2025-05-01', day: 'Thursday', type: 'COMPANY', desc: 'International Workers Day' },
      { name: 'Independence Day', date: '2025-08-15', day: 'Friday', type: 'GAZETTED', desc: 'Indian Independence Day' },
      { name: 'Gandhi Jayanti', date: '2025-10-02', day: 'Thursday', type: 'GAZETTED', desc: 'Mahatma Gandhi Birthday' },
      { name: 'Dussehra', date: '2025-10-21', day: 'Tuesday', type: 'GAZETTED', desc: 'Vijayadashami' },
      { name: 'Diwali', date: '2025-11-10', day: 'Monday', type: 'GAZETTED', desc: 'Festival of Lights' },
      { name: 'Christmas Day', date: '2025-12-25', day: 'Thursday', type: 'GAZETTED', desc: 'Christmas Celebration' },

      // 2026
      { name: 'New Year Day', date: '2026-01-01', day: 'Thursday', type: 'COMPANY', desc: 'New Calendar Year' },
      { name: 'Republic Day', date: '2026-01-26', day: 'Monday', type: 'GAZETTED', desc: 'Republic Day Celebration' },
      { name: 'Maha Shivaratri', date: '2026-02-15', day: 'Sunday', type: 'RESTRICTED', desc: 'Maha Shivaratri' },
      { name: 'Holi', date: '2026-03-03', day: 'Tuesday', type: 'GAZETTED', desc: 'Spring Festival' },
      { name: 'Good Friday', date: '2026-04-03', day: 'Friday', type: 'GAZETTED', desc: 'Good Friday' },
      { name: 'Labour Day', date: '2026-05-01', day: 'Friday', type: 'COMPANY', desc: 'May Day' },
      { name: 'Independence Day', date: '2026-08-15', day: 'Saturday', type: 'GAZETTED', desc: '79th Independence Day' },
      { name: 'Gandhi Jayanti', date: '2026-10-02', day: 'Friday', type: 'GAZETTED', desc: 'National Holiday' },
      { name: 'Dussehra', date: '2026-10-20', day: 'Tuesday', type: 'GAZETTED', desc: 'Dussehra Celebration' },
      { name: 'Diwali', date: '2026-10-31', day: 'Saturday', type: 'GAZETTED', desc: 'Deepavali' },
      { name: 'Christmas Day', date: '2026-12-25', day: 'Friday', type: 'GAZETTED', desc: 'Christmas Day' },
    ];

    for (const h of holidays) {
      await client.query(`
        INSERT INTO company_holidays (name, date, day_of_week, type, description, is_active)
        VALUES ('${h.name}', '${h.date}', '${h.day}', '${h.type}', '${h.desc}', true);
      `);
    }
    console.log(`Inserted ${holidays.length} holidays across 2025 & 2026.`);

    // ──────────────────────────────────────────────────────────────────────────
    // 10. Seed Leave Balances & Leave Applications (2025 & 2026)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('Step 10: Seeding Leave Balances & Leave Applications...');
    const leaveTypes = ['CASUAL', 'SICK', 'EARNED', 'MATERNITY', 'PATERNITY', 'OTHER'];
    const years = [2025, 2026];

    for (const emp of allEmps) {
      for (const yr of years) {
        for (const lt of leaveTypes) {
          let total = 0;
          if (lt === 'CASUAL') total = 12;
          else if (lt === 'SICK') total = 10;
          else if (lt === 'EARNED') total = 15;
          else if (lt === 'OTHER') total = 5;

          const used = yr === 2025 ? (lt === 'CASUAL' ? 5 : lt === 'SICK' ? 3 : lt === 'EARNED' ? 6 : 0) : (lt === 'CASUAL' ? 3 : lt === 'SICK' ? 1 : lt === 'EARNED' ? 2 : 0);
          const available = total - used;

          await client.query(`
            INSERT INTO leave_balances (employee_id, leave_type, year, total_days, used_days, available_days)
            VALUES ('${emp.id}', '${lt}', ${yr}, ${total}, ${used}, ${available});
          `);
        }
      }
    }

    // Insert historical approved leaves (2025)
    await client.query(`
      INSERT INTO leaves (employee_id, leave_type, start_date, end_date, number_of_days, is_half_day, status, reason, rejection_reason)
      VALUES
        ('${emp5.id}', 'CASUAL', '2025-04-10', '2025-04-11', 2, false, 'APPROVED', 'Attending cousin wedding in Ahmedabad', NULL),
        ('${emp5.id}', 'EARNED', '2025-07-21', '2025-07-25', 5, false, 'APPROVED', 'Annual family vacation', NULL),
        ('${emp6.id}', 'SICK', '2025-05-12', '2025-05-13', 2, false, 'APPROVED', 'Viral fever and rest', NULL),
        ('${emp7.id}', 'CASUAL', '2025-08-18', '2025-08-19', 2, false, 'APPROVED', 'Personal family event', NULL),
        ('${emp8.id}', 'CASUAL', '2025-09-08', '2025-09-09', 2, false, 'APPROVED', 'Festival celebration', NULL),
        ('${emp9.id}', 'EARNED', '2025-11-17', '2025-11-21', 5, false, 'APPROVED', 'Year-end vacation', NULL);
    `);

    // Insert 2026 leaves: Approved, Pending, Rejected, Cancelled
    await client.query(`
      INSERT INTO leaves (employee_id, leave_type, start_date, end_date, number_of_days, is_half_day, status, reason, rejection_reason)
      VALUES
        -- 2026 Approved
        ('${emp5.id}', 'CASUAL', '2026-02-12', '2026-02-13', 2, false, 'APPROVED', 'Family gathering', NULL),
        ('${emp6.id}', 'EARNED', '2026-05-18', '2026-05-20', 3, false, 'APPROVED', 'House shifting and relocation', NULL),
        ('${emp7.id}', 'CASUAL', '2026-06-25', '2026-06-26', 2, false, 'APPROVED', 'Personal business', NULL),

        -- 2026 PENDING (Active leaves ready for Manager/HR approval!)
        ('${emp5.id}', 'CASUAL', '2026-10-22', '2026-10-23', 2, false, 'PENDING', 'Extended Diwali festive break with family', NULL),
        ('${emp6.id}', 'SICK', '2026-10-19', '2026-10-20', 2, false, 'PENDING', 'Medical checkup and prescribed bed rest', NULL),
        ('${emp7.id}', 'EARNED', '2026-11-04', '2026-11-06', 3, false, 'PENDING', 'Annual pilgrimage with parents', NULL),
        ('${emp8.id}', 'CASUAL', '2026-10-27', '2026-10-27', 1, true, 'PENDING', 'Half-day afternoon for government document renewal', NULL),
        ('${emp10.id}', 'OTHER', '2026-10-28', '2026-10-29', 2, false, 'PENDING', 'Special leave for design symposium attendance', NULL),

        -- 2026 REJECTED
        ('${emp5.id}', 'EARNED', '2026-08-03', '2026-08-07', 5, false, 'REJECTED', 'Vacation during sprint release', 'Cannot approve 5 days during critical Q3 client milestone delivery'),

        -- 2026 CANCELLED
        ('${emp6.id}', 'CASUAL', '2026-09-14', '2026-09-15', 2, false, 'CANCELLED', 'Trip planned was called off', NULL);
    `);
    console.log('Leave balances and applications created for 2025 & 2026.');

    // ──────────────────────────────────────────────────────────────────────────
    // 11. Seed Timesheets (2025 & 2026 across Projects and Statuses)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('Step 11: Seeding Timesheets (2025 & 2026)...');
    const projects = [
      'HRMS Core Platform',
      'Fintech Payment Gateway',
      'Client Portal Mobile App',
      'Cloud Infrastructure AWS',
      'Automated Test Suite'
    ];

    // Seed 2025 historical approved timesheets (a sample of weeks)
    const timesheetValues2025: string[] = [];
    const sampleDates2025 = [
      '2025-03-03', '2025-03-04', '2025-03-05', '2025-03-06', '2025-03-07',
      '2025-06-09', '2025-06-10', '2025-06-11', '2025-06-12', '2025-06-13',
      '2025-09-15', '2025-09-16', '2025-09-17', '2025-09-18', '2025-09-19',
      '2025-11-24', '2025-11-25', '2025-11-26', '2025-11-27', '2025-11-28',
    ];

    for (const dt of sampleDates2025) {
      timesheetValues2025.push(`('${emp5.id}', '${dt}', '${projects[0]}', 'Implemented RBAC permission guards and database migration scripts', 8.0, 'APPROVED', NULL, '${dt} 18:30:00', '${dt} 19:15:00', '${emp3.id}')`);
      timesheetValues2025.push(`('${emp6.id}', '${dt}', '${projects[1]}', 'Integrated payment webhooks and asynchronous retry mechanisms', 8.5, 'APPROVED', NULL, '${dt} 18:30:00', '${dt} 19:15:00', '${emp3.id}')`);
      timesheetValues2025.push(`('${emp7.id}', '${dt}', '${projects[4]}', 'Developed Playwright E2E test suites for employee onboarding flows', 8.0, 'APPROVED', NULL, '${dt} 18:30:00', '${dt} 19:15:00', '${emp4.id}')`);
    }
    await client.query(`
      INSERT INTO timesheets (employee_id, work_date, project, description, hours, status, rejection_reason, submitted_at, reviewed_at, reviewed_by)
      VALUES ${timesheetValues2025.join(',\n')};
    `);

    // Seed 2026 timesheets: Approved past, Submitted (ready for manager review), Draft (today), Rejected
    const sampleDates2026Approved = [
      '2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07',
      '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11',
    ];
    const timesheetValues2026: string[] = [];
    for (const dt of sampleDates2026Approved) {
      timesheetValues2026.push(`('${emp5.id}', '${dt}', '${projects[0]}', 'Refactored backend attendance controllers with NestJS filters', 8.0, 'APPROVED', NULL, '${dt} 18:00:00', '${dt} 19:00:00', '${emp3.id}')`);
      timesheetValues2026.push(`('${emp6.id}', '${dt}', '${projects[2]}', 'Designed responsive leave summary cards and mobile viewport support', 7.5, 'APPROVED', NULL, '${dt} 18:00:00', '${dt} 19:00:00', '${emp3.id}')`);
      timesheetValues2026.push(`('${emp7.id}', '${dt}', '${projects[4]}', 'Cross-browser testing on Chromium, Firefox, and WebKit', 8.0, 'APPROVED', NULL, '${dt} 18:00:00', '${dt} 19:00:00', '${emp4.id}')`);
    }

    // Active SUBMITTED timesheets (ready for manager approval in UI test!)
    timesheetValues2026.push(`('${emp5.id}', '2026-10-12', '${projects[0]}', 'Implemented batch leave balance allocation modal and API backend', 8.5, 'SUBMITTED', NULL, '2026-10-12 18:45:00', NULL, NULL)`);
    timesheetValues2026.push(`('${emp5.id}', '2026-10-13', '${projects[0]}', 'Added PermissionScope enum and integrated into scope-access guard', 8.0, 'SUBMITTED', NULL, '2026-10-13 18:30:00', NULL, NULL)`);
    timesheetValues2026.push(`('${emp6.id}', '2026-10-12', '${projects[1]}', 'Refactored frontend timesheet component signals and layout', 8.0, 'SUBMITTED', NULL, '2026-10-12 18:15:00', NULL, NULL)`);
    timesheetValues2026.push(`('${emp6.id}', '2026-10-13', '${projects[1]}', 'Optimized leave overview table pagination with employee filter', 8.0, 'SUBMITTED', NULL, '2026-10-13 18:15:00', NULL, NULL)`);
    timesheetValues2026.push(`('${emp7.id}', '2026-10-12', '${projects[4]}', 'Verified scoped timesheet query tests and edge case coverage', 8.0, 'SUBMITTED', NULL, '2026-10-12 18:20:00', NULL, NULL)`);

    // Active DRAFT timesheets (for employee editing / submission testing)
    timesheetValues2026.push(`('${emp5.id}', '2026-10-15', '${projects[3]}', 'Drafting cloud migration plan for database read replicas', 4.0, 'DRAFT', NULL, NULL, NULL, NULL)`);
    timesheetValues2026.push(`('${emp6.id}', '2026-10-15', '${projects[0]}', 'Working on UI badge variants and design token unification', 5.5, 'DRAFT', NULL, NULL, NULL, NULL)`);

    // REJECTED timesheets
    timesheetValues2026.push(`('${emp5.id}', '2026-10-09', '${projects[1]}', 'Investigated database slow queries without linking Jira ticket', 8.0, 'REJECTED', 'Please link the corresponding Jira ticket and specify target tables', '2026-10-09 18:00:00', '2026-10-10 10:30:00', '${emp3.id}')`);

    await client.query(`
      INSERT INTO timesheets (employee_id, work_date, project, description, hours, status, rejection_reason, submitted_at, reviewed_at, reviewed_by)
      VALUES ${timesheetValues2026.join(',\n')};
    `);
    console.log('Timesheets for 2025 and 2026 inserted across DRAFT, SUBMITTED, APPROVED, and REJECTED states.');

    // ──────────────────────────────────────────────────────────────────────────
    // 12. Seed Attendance Records (2025 & 2026)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('Step 12: Seeding Daily Attendance Records...');
    const attendanceDates = [
      // 2025 samples
      '2025-05-05', '2025-05-06', '2025-05-07', '2025-05-08', '2025-05-09',
      '2025-10-06', '2025-10-07', '2025-10-08', '2025-10-09', '2025-10-10',
      // 2026 recent month
      '2026-10-01', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08',
      '2026-10-09', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15'
    ];

    const attValues: string[] = [];
    for (const dt of attendanceDates) {
      for (let i = 0; i < allEmps.length; i++) {
        const emp = allEmps[i];
        const isLate = (i % 3 === 0 && dt.endsWith('05')) || (i === 1 && dt.endsWith('12'));
        const checkIn = isLate ? `${dt} 10:18:00` : `${dt} 09:12:00`;
        const checkOut = `${dt} 18:18:00`;
        const hrs = isLate ? 8.0 : 8.6;
        attValues.push(`('${emp.id}', '${dt}', '${checkIn}', '${checkOut}', 'PRESENT', ${hrs}, ${isLate}, false, 'Biometric badge entry')`);
      }
    }

    await client.query(`
      INSERT INTO attendance (employee_id, attendance_date, check_in, check_out, status, working_hours, is_late, is_early_checkout, remarks)
      VALUES ${attValues.join(',\n')};
    `);

    // Seed Attendance Regularizations
    await client.query(`
      INSERT INTO attendance_regularizations (employee_id, attendance_date, requested_check_in, requested_check_out, reason, status, decision_notes, actioned_by_id, actioned_at)
      VALUES
        ('${emp5.id}', '2026-10-05', '2026-10-05 09:15:00', '2026-10-05 18:30:00', 'Card reader hardware error at gate 2', 'APPROVED', 'Verified with security logs', '${emp3.id}', '2026-10-06 10:00:00'),
        ('${emp6.id}', '2026-10-12', '2026-10-12 09:20:00', '2026-10-12 18:40:00', 'Forgot to punch out due to production deployment', 'PENDING', NULL, NULL, NULL),
        ('${emp7.id}', '2026-10-08', '2026-10-08 09:10:00', '2026-10-08 18:15:00', 'Network outage during evening swipe', 'PENDING', NULL, NULL, NULL);
    `);
    console.log(`Inserted ${attValues.length} attendance records and regularizations.`);

    // ──────────────────────────────────────────────────────────────────────────
    // 13. Seed Salary Structures, Payroll Runs & Payslips (2025 & 2026)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('Step 13: Seeding Salary Structures, Payroll Runs & Payslips...');
    // Create salary structures for all employees
    const salaryConfigs = [
      { empId: emp1.id, ctc: 3600000, basic: 150000, hra: 75000, conv: 5000, med: 5000, spec: 65000, pf: 18000, pt: 200, tds: 30000 },
      { empId: emp2.id, ctc: 2400000, basic: 100000, hra: 50000, conv: 4000, med: 4000, spec: 42000, pf: 12000, pt: 200, tds: 18000 },
      { empId: emp3.id, ctc: 2600000, basic: 110000, hra: 55000, conv: 4000, med: 4000, spec: 43666, pf: 13200, pt: 200, tds: 20000 },
      { empId: emp4.id, ctc: 2200000, basic: 90000,  hra: 45000, conv: 4000, med: 4000, spec: 40333, pf: 10800, pt: 200, tds: 15000 },
      { empId: emp5.id, ctc: 1800000, basic: 75000,  hra: 37500, conv: 3000, med: 3000, spec: 31500, pf: 9000,  pt: 200, tds: 10000 },
      { empId: emp6.id, ctc: 1200000, basic: 50000,  hra: 25000, conv: 3000, med: 3000, spec: 19000, pf: 6000,  pt: 200, tds: 5000  },
      { empId: emp7.id, ctc: 1300000, basic: 55000,  hra: 27500, conv: 3000, med: 3000, spec: 19833, pf: 6600,  pt: 200, tds: 6000  },
      { empId: emp8.id, ctc: 900000,  basic: 37500,  hra: 18750, conv: 2500, med: 2500, spec: 13750, pf: 4500,  pt: 200, tds: 3000  },
      { empId: emp9.id, ctc: 1400000, basic: 58000,  hra: 29000, conv: 3000, med: 3000, spec: 23666, pf: 6960,  pt: 200, tds: 7000  },
      { empId: emp10.id, ctc: 1500000, basic: 62500, hra: 31250, conv: 3000, med: 3000, spec: 25250, pf: 7500,  pt: 200, tds: 8000  },
    ];

    for (const sc of salaryConfigs) {
      const gross = sc.basic + sc.hra + sc.conv + sc.med + sc.spec;
      const deductions = sc.pf + sc.pt + sc.tds;
      const net = gross - deductions;

      await client.query(`
        INSERT INTO salary_structures
          (employee_id, ctc, basic_salary, hra, conveyance_allowance, medical_allowance, special_allowance, provident_fund, professional_tax, tds, gross_salary, total_deductions, net_salary, effective_from, is_active)
        VALUES
          ('${sc.empId}', ${sc.ctc}, ${sc.basic}, ${sc.hra}, ${sc.conv}, ${sc.med}, ${sc.spec}, ${sc.pf}, ${sc.pt}, ${sc.tds}, ${gross}, ${deductions}, ${net}, '2024-01-01', true);
      `);
    }

    // Seed Payroll Runs: 2025 (all 12 months) + 2026 (Jan through Sep) + Oct in Draft
    const payrollRunsToCreate = [
      // 2025: Q1 to Q4
      { m: 1, y: 2025, status: 'PAID' }, { m: 2, y: 2025, status: 'PAID' }, { m: 3, y: 2025, status: 'PAID' },
      { m: 4, y: 2025, status: 'PAID' }, { m: 5, y: 2025, status: 'PAID' }, { m: 6, y: 2025, status: 'PAID' },
      { m: 7, y: 2025, status: 'PAID' }, { m: 8, y: 2025, status: 'PAID' }, { m: 9, y: 2025, status: 'PAID' },
      { m: 10, y: 2025, status: 'PAID' }, { m: 11, y: 2025, status: 'PAID' }, { m: 12, y: 2025, status: 'PAID' },
      // 2026
      { m: 1, y: 2026, status: 'PAID' }, { m: 2, y: 2026, status: 'PAID' }, { m: 3, y: 2026, status: 'PAID' },
      { m: 4, y: 2026, status: 'PAID' }, { m: 5, y: 2026, status: 'PAID' }, { m: 6, y: 2026, status: 'PAID' },
      { m: 7, y: 2026, status: 'PAID' }, { m: 8, y: 2026, status: 'PAID' }, { m: 9, y: 2026, status: 'PAID' },
      { m: 10, y: 2026, status: 'DRAFT' },
    ];

    let totalPayslipsCount = 0;
    for (const pr of payrollRunsToCreate) {
      const lastDay = pr.m === 2 ? 28 : (pr.m === 4 || pr.m === 6 || pr.m === 9 || pr.m === 11 ? 30 : 31);
      const runDate = `${pr.y}-${String(pr.m).padStart(2, '0')}-28`;
      const paidAt = pr.status === 'PAID' ? `'${pr.y}-${String(pr.m).padStart(2, '0')}-${lastDay} 18:00:00'` : 'NULL';
      const ref = pr.status === 'PAID' ? `'PAY-${pr.y}-${String(pr.m).padStart(2, '0')}'` : 'NULL';

      const insertedRun = (
        await client.query(`
          INSERT INTO payroll_runs (month, year, run_date, status, total_employees, total_gross_pay, total_deductions, total_net_pay, processed_by, approved_by, paid_at, payment_reference)
          VALUES (${pr.m}, ${pr.y}, '${runDate}', '${pr.status}', 10, 850000.00, 150000.00, 700000.00, 'manoj.fin@hrms.com', 'admin@hrms.com', ${paidAt}, ${ref})
          RETURNING id;
        `)
      ).rows[0];

      // Insert payslips for this run
      const payslipValues: string[] = [];
      const periodStart = `${pr.y}-${String(pr.m).padStart(2, '0')}-01`;
      const periodEnd = `${pr.y}-${String(pr.m).padStart(2, '0')}-28`;

      for (const sc of salaryConfigs) {
        const gross = sc.basic + sc.hra + sc.conv + sc.med + sc.spec;
        const deductions = sc.pf + sc.pt + sc.tds;
        const net = gross - deductions;
        const pStatus = pr.status === 'PAID' ? 'PAID' : 'DRAFT';

        payslipValues.push(`(
          '${insertedRun.id}', '${sc.empId}', ${pr.m}, ${pr.y}, '${periodStart}', '${periodEnd}', '${runDate}',
          30, 30, 0,
          ${sc.basic}, ${sc.hra}, ${sc.conv}, ${sc.med}, ${sc.spec}, 0, 0, 0, ${gross},
          ${sc.pf}, ${sc.pt}, ${sc.tds}, 0, 0, ${deductions}, ${net},
          '${pStatus}', 'BANK_TRANSFER'
        )`);
        totalPayslipsCount++;
      }

      await client.query(`
        INSERT INTO payslips (
          payroll_run_id, employee_id, month, year, pay_period_start, pay_period_end, pay_date,
          working_days, paid_days, loss_of_pay_days,
          basic_salary, hra, conveyance, medical_allowance, special_allowance, bonus, overtime_pay, reimbursements, gross_earnings,
          provident_fund, professional_tax, tds, loss_of_pay_deduction, other_deductions, total_deductions, net_pay,
          status, payment_mode
        ) VALUES ${payslipValues.join(',\n')};
      `);
    }
    console.log(`Inserted ${payrollRunsToCreate.length} payroll runs and ${totalPayslipsCount} payslips.`);

    // ──────────────────────────────────────────────────────────────────────────
    // 14. Seed Performance Cycles, Goals, Evaluations & Summaries
    // ──────────────────────────────────────────────────────────────────────────
    console.log('Step 14: Seeding Performance Management Cycles & Goals...');
    const cycle2025 = (
      await client.query(`
        INSERT INTO performance_cycles (name, start_date, end_date, status)
        VALUES ('2025 Annual Performance Appraisal', '2025-01-01', '2025-12-31', 'CLOSED')
        RETURNING id;
      `)
    ).rows[0];

    const cycle2026 = (
      await client.query(`
        INSERT INTO performance_cycles (name, start_date, end_date, status)
        VALUES ('2026 H2 Ongoing Review Cycle', '2026-06-01', '2026-12-31', 'OPEN')
        RETURNING id;
      `)
    ).rows[0];

    // Seed goals for engineering employees in 2026 cycle
    const goal1 = (
      await client.query(`
        INSERT INTO performance_goals (employee_id, cycle_id, title, description, target, weight, progress, status, start_date, end_date)
        VALUES ('${emp5.id}', '${cycle2026.id}', 'Complete HRMS Scope-Based Access Redesign', 'Refactor backend guards and frontend signals for Self, Team, and Org scopes', 'Zero defect release', 40.0, 95, 'IN_PROGRESS', '2026-06-01', '2026-12-31')
        RETURNING id;
      `)
    ).rows[0];

    const goal2 = (
      await client.query(`
        INSERT INTO performance_goals (employee_id, cycle_id, title, description, target, weight, progress, status, start_date, end_date)
        VALUES ('${emp5.id}', '${cycle2026.id}', 'API Gateway Performance Optimization', 'Ensure 99.9% uptime and <120ms P99 latency across all endpoints', '<120ms P99', 30.0, 85, 'IN_PROGRESS', '2026-06-01', '2026-12-31')
        RETURNING id;
      `)
    ).rows[0];

    const goal3 = (
      await client.query(`
        INSERT INTO performance_goals (employee_id, cycle_id, title, description, target, weight, progress, status, start_date, end_date)
        VALUES ('${emp6.id}', '${cycle2026.id}', 'Batch Leave Balance Allocation Implementation', 'Implement dynamic quota grid and multi-leave allocation form', 'Shipped in Q4', 50.0, 90, 'IN_PROGRESS', '2026-06-01', '2026-12-31')
        RETURNING id;
      `)
    ).rows[0];

    // Seed evaluations (ratings are integer 1-5)
    await client.query(`
      INSERT INTO performance_evaluations (employee_id, cycle_id, goal_id, evaluation_type, status, rating, comments)
      VALUES
        ('${emp5.id}', '${cycle2026.id}', '${goal1.id}', 'SELF', 'SUBMITTED', 5, 'Completed robust scope access architecture and migration tests.'),
        ('${emp5.id}', '${cycle2026.id}', '${goal1.id}', 'MANAGER', 'SUBMITTED', 5, 'Outstanding architectural execution and zero regression.'),
        ('${emp6.id}', '${cycle2026.id}', '${goal3.id}', 'SELF', 'SUBMITTED', 4, 'Successfully deployed batch quota allocation UI and API.');
    `);

    // 2025 Summaries (Closed Cycle)
    await client.query(`
      INSERT INTO performance_summaries (employee_id, cycle_id, final_rating, comments)
      VALUES
        ('${emp5.id}', '${cycle2025.id}', 4.60, 'Exceeded expectations in core deliverables and mentored junior team members.'),
        ('${emp6.id}', '${cycle2025.id}', 4.20, 'Strong performance in feature turnaround and UI consistency.'),
        ('${emp7.id}', '${cycle2025.id}', 4.40, 'Built comprehensive automated testing pipeline.');
    `);
    console.log('Performance cycles, goals, evaluations, and summaries created.');

    // ──────────────────────────────────────────────────────────────────────────
    // 15. Seed Company Loans & Repayments
    // ──────────────────────────────────────────────────────────────────────────
    console.log('Step 15: Seeding Company Loans & Repayments...');
    // Active loan for Rohit Patel
    const loan1 = (
      await client.query(`
        INSERT INTO company_loans (
          employee_id, loan_type, amount, approved_amount, tenure_months, purpose, status,
          approved_by_id, approved_at, disbursed_at, disbursed_by_id, disbursement_reference,
          repayment_mode, salary_deduction_amount, monthly_installment, total_repaid, remaining_balance, repayment_start_date
        )
        VALUES (
          '${emp5.id}', 'PERSONAL', 120000.00, 120000.00, 12, 'Emergency home renovation', 'ACTIVE',
          '${emp1.id}', '2026-03-01 10:00:00', '2026-03-05 11:30:00', '${emp1.id}', 'DISB-2026-001',
          'SALARY_DEDUCTION', 10000.00, 10000.00, 70000.00, 50000.00, '2026-03-01'
        )
        RETURNING id;
      `)
    ).rows[0];

    // Generate 12 repayment installments (March 2026 to February 2027)
    for (let m = 1; m <= 12; m++) {
      const monthNum = (2 + m) % 12 || 12;
      const yearNum = m <= 10 ? 2026 : 2027;
      const dueDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-28`;
      const isPaid = m <= 7; // Months 1-7 paid (Mar-Sep 2026)
      const status = isPaid ? 'PAID' : 'PENDING';
      const paidAmt = isPaid ? 10000.00 : 0.00;
      const paidAt = isPaid ? `'${dueDate} 18:00:00'` : 'NULL';

      await client.query(`
        INSERT INTO loan_repayments (loan_id, installment_number, due_date, amount_due, amount_paid, payment_mode, status, paid_at)
        VALUES ('${loan1.id}', ${m}, '${dueDate}', 10000.00, ${paidAmt}, 'SALARY_DEDUCTION', '${status}', ${paidAt});
      `);
    }

    // Fully repaid loan in 2025 for Arjun Verma
    const loan2 = (
      await client.query(`
        INSERT INTO company_loans (
          employee_id, loan_type, amount, approved_amount, tenure_months, purpose, status,
          approved_by_id, approved_at, disbursed_at, disbursed_by_id, disbursement_reference,
          repayment_mode, salary_deduction_amount, monthly_installment, total_repaid, remaining_balance, repayment_start_date
        )
        VALUES (
          '${emp3.id}', 'PERSONAL', 80000.00, 80000.00, 6, 'High-end developer workstation setup', 'FULLY_REPAID',
          '${emp1.id}', '2025-01-10 10:00:00', '2025-01-15 11:00:00', '${emp1.id}', 'DISB-2025-001',
          'SALARY_DEDUCTION', 13333.33, 13333.33, 80000.00, 0.00, '2025-02-01'
        )
        RETURNING id;
      `)
    ).rows[0];

    for (let m = 1; m <= 6; m++) {
      const dueDate = `2025-0${m + 1}-28`;
      await client.query(`
        INSERT INTO loan_repayments (loan_id, installment_number, due_date, amount_due, amount_paid, payment_mode, status, paid_at)
        VALUES ('${loan2.id}', ${m}, '${dueDate}', 13333.33, 13333.33, 'SALARY_DEDUCTION', 'PAID', '${dueDate} 18:00:00');
      `);
    }
    console.log('Company loans and repayment installment schedules seeded.');

    // ──────────────────────────────────────────────────────────────────────────
    // 16. Seed Policies & Policy Acknowledgements
    // ──────────────────────────────────────────────────────────────────────────
    console.log('Step 16: Seeding Policies & Acknowledgements...');
    const pol1 = (
      await client.query(`
        INSERT INTO policies (title, code, content, version, status, effective_date)
        VALUES
          ('Code of Business Conduct & Ethics', 'POL-ETH-001', 'Employees are expected to act with integrity, professionalism, and adhere to strict confidentiality.', 'v2.1', 'PUBLISHED', '2024-01-01')
        RETURNING id;
      `)
    ).rows[0];

    const pol2 = (
      await client.query(`
        INSERT INTO policies (title, code, content, version, status, effective_date)
        VALUES
          ('Information Security & Acceptable Use', 'POL-SEC-002', 'Guidelines regarding data classification, device encryption, zero-trust access, and password hygiene.', 'v3.0', 'PUBLISHED', '2024-01-01')
        RETURNING id;
      `)
    ).rows[0];

    const pol3 = (
      await client.query(`
        INSERT INTO policies (title, code, content, version, status, effective_date)
        VALUES
          ('Hybrid & Remote Work Policy', 'POL-REM-003', 'Procedures governing flexible hours, office attendance minimums, and ergonomic reimbursement allowances.', 'v1.5', 'PUBLISHED', '2024-06-01')
        RETURNING id;
      `)
    ).rows[0];

    // Acknowledgements
    for (const emp of allEmps) {
      await client.query(`
        INSERT INTO policy_acknowledgements (employee_id, policy_id, acknowledged_at)
        VALUES
          ('${emp.id}', '${pol1.id}', '2025-01-20 10:30:00'),
          ('${emp.id}', '${pol2.id}', '2025-01-20 10:35:00');
      `);
    }
    console.log('Company policies and employee acknowledgements created.');

    // ──────────────────────────────────────────────────────────────────────────
    // 17. Seed Reimbursements
    // ──────────────────────────────────────────────────────────────────────────
    console.log('Step 17: Seeding Reimbursements (2025 & 2026)...');
    await client.query(`
      INSERT INTO reimbursements (employee_id, expense_date, category, description, amount, currency, status)
      VALUES
        -- 2025 Paid
        ('${emp5.id}', '2025-04-15', 'Travel', 'Client onsite visit flight and local cab transport', 8500.00, 'INR', 'PAID'),
        ('${emp6.id}', '2025-07-10', 'Certification', 'AWS Certified Solutions Architect examination fee', 12500.00, 'INR', 'PAID'),
        ('${emp7.id}', '2025-10-18', 'Broadband', 'Quarterly home office high-speed internet stipend', 3000.00, 'INR', 'PAID'),

        -- 2026 Approved / Submitted / Paid
        ('${emp5.id}', '2026-08-20', 'Hardware', 'Ergonomic keyboard and monitor riser for work desk', 4500.00, 'INR', 'PAID'),
        ('${emp6.id}', '2026-10-05', 'Client Dinner', 'Team dinner with prospective enterprise client stakeholders', 6200.00, 'INR', 'APPROVED'),
        ('${emp7.id}', '2026-10-12', 'Training', 'Advanced Cypress & Playwright enterprise testing workshop', 7500.00, 'INR', 'SUBMITTED'),
        ('${emp10.id}', '2026-10-14', 'Software', 'Annual Figma Professional design team license renewal', 15000.00, 'INR', 'SUBMITTED');
    `);
    console.log('Reimbursements inserted across 2025 & 2026.');

    await client.query('COMMIT');
    console.log('\n===============================================================');
    console.log('          DATABASE SEEDING COMPLETED SUCCESSFULLY!             ');
    console.log('===============================================================');

    console.log('\n---------------------------------------------------------------');
    console.log('               SEEDED USER LOGIN CREDENTIALS                   ');
    console.log('---------------------------------------------------------------');
    console.log('Default password for ALL seeded users:  Password@123\n');
    console.log('| Role     | Username     | Name             | Dept / Designation           |');
    console.log('|----------|--------------|------------------|------------------------------|');
    console.log('| ADMIN    | admin        | Vikramaditya Rao | Executive / CEO              |');
    console.log('| HR       | priya.hr     | Priya Sharma     | HR / HR Manager              |');
    console.log('| MANAGER  | arjun.mgr    | Arjun Verma      | Engineering / Eng Manager    |');
    console.log('| MANAGER  | deepa.mgr    | Deepa Nair       | QA / QA Manager              |');
    console.log('| EMPLOYEE | rohit.dev    | Rohit Patel      | Engineering / Senior SSE     |');
    console.log('| EMPLOYEE | ananya.dev   | Ananya Iyer      | Engineering / Software Eng   |');
    console.log('| EMPLOYEE | karthik.qa   | Karthik Reddy    | QA / QA Automation Eng       |');
    console.log('| EMPLOYEE | sneha.hr     | Sneha Kulkarni   | HR / HR Executive            |');
    console.log('| EMPLOYEE | manoj.fin    | Manoj Deshmukh   | Finance / Payroll Specialist |');
    console.log('| EMPLOYEE | neha.ui      | Neha Gupta       | Product / UI/UX Designer     |');
    console.log('---------------------------------------------------------------\n');
    console.log('Scope Hierarchy Guide for Pair Testing:');
    console.log('  * arjun.mgr: Manages rohit.dev and ananya.dev (Team scope displays only these 2).');
    console.log('  * deepa.mgr: Manages karthik.qa (Team scope displays only karthik.qa).');
    console.log('  * priya.hr & admin: Org scope displays all 10 employees across all departments.');
    console.log('  * rohit.dev, ananya.dev, karthik.qa: Self scope displays their personal records.\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\nERROR: Database seeding failed and transaction was rolled back!');
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSeed();
