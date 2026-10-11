import { Injectable } from '@angular/core';
import { Payslip } from '../models/payroll.model';

@Injectable({
  providedIn: 'root',
})
export class PayslipPdfService {
  private readonly monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  getMonthName(monthNum: number): string {
    return this.monthNames[monthNum - 1] || `Month ${monthNum}`;
  }

  formatCurrency(amount?: number | string | null): string {
    const num = Number(amount || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(num);
  }

  formatNumber(amount?: number | string | null): string {
    const num = Number(amount || 0);
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }

  amountToWords(amount?: number | string | null): string {
    const num = Math.round(Number(amount || 0));
    if (!num || isNaN(num) || num <= 0) return 'Zero Rupees Only';

    const a = [
      '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ',
      'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ',
      'Seventeen ', 'Eighteen ', 'Nineteen ',
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (n: number): string => {
      if (n === 0) return '';
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : ' ');
      if (n < 1000) return inWords(Math.floor(n / 100)) + 'Hundred ' + inWords(n % 100);
      if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + inWords(n % 1000);
      if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + inWords(n % 100000);
      return inWords(Math.floor(n / 10000000)) + 'Crore ' + inWords(n % 10000000);
    };

    return inWords(num).trim() + ' Rupees Only';
  }

  generatePayslipHtml(slip: Payslip): string {
    const month = this.getMonthName(slip.month);
    const year = slip.year;
    const emp = slip.employee;
    const fullName = emp ? `${emp.firstName} ${emp.lastName}`.trim() : 'Employee';
    const empCode = emp?.employeeCode || 'N/A';
    const dept = emp?.department?.name || 'General';
    const desig = emp?.designation?.name || 'Team Member';
    const bankName = emp?.bankDetails?.bankName || 'HDFC Bank Ltd.';
    const accountNum = emp?.bankDetails?.accountNumber
      ? '•••• •••• ' + emp.bankDetails.accountNumber.slice(-4)
      : '•••• •••• 1234';
    const ifsc = emp?.bankDetails?.ifscCode || 'HDFC0001234';
    const pan = 'ABCDE1234F';
    const paymentMode = slip.paymentMode || 'BANK_TRANSFER';

    const basic = Number(slip.basicSalary || 0);
    const hra = Number(slip.hra || 0);
    const conveyance = Number(slip.conveyance || 0);
    const medical = Number(slip.medicalAllowance || 0);
    const special = Number(slip.specialAllowance || 0);
    const overtime = Number(slip.overtimePay || 0);
    const bonus = Number(slip.bonus || 0);
    const reimbursements = Number(slip.reimbursements || 0);
    const gross = Number(slip.grossEarnings || basic + hra + conveyance + medical + special + overtime + bonus + reimbursements);

    const pf = Number(slip.providentFund || 0);
    const pt = Number(slip.professionalTax || 0);
    const tds = Number(slip.tds || 0);
    const lop = Number(slip.lossOfPayDeduction || 0);
    const otherDed = Number(slip.otherDeductions || 0);
    const totalDeductions = Number(slip.totalDeductions || pf + pt + tds + lop + otherDed);

    const netPay = Number(slip.netPay || gross - totalDeductions);
    const netWords = this.amountToWords(netPay);
    const generationDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Payslip - ${fullName} (${month} ${year})</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 10px;
      font-size: 12px;
      line-height: 1.45;
    }
    .payslip-wrapper {
      max-width: 800px;
      margin: 0 auto;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 24px;
      background: #ffffff;
    }
    /* Brand Header */
    .brand-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 16px;
    }
    .brand-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-badge {
      width: 44px;
      height: 44px;
      background: #0f172a;
      color: #ffffff;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 18px;
      letter-spacing: 0.05em;
    }
    .company-name {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    .company-address {
      font-size: 11px;
      color: #64748b;
    }
    .brand-right {
      text-align: right;
    }
    .payslip-badge {
      display: inline-block;
      background: #f1f5f9;
      color: #0f172a;
      padding: 4px 10px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }
    .status-pill {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      background: #dcfce7;
      color: #15803d;
    }
    .status-pill.pending {
      background: #fef3c7;
      color: #b45309;
    }
    /* Info Grid */
    .info-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 16px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 32px;
      row-gap: 6px;
      font-size: 11.5px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px dashed #e2e8f0;
      padding: 3px 0;
    }
    .info-label {
      color: #64748b;
      font-weight: 500;
    }
    .info-val {
      color: #0f172a;
      font-weight: 600;
    }
    /* Attendance Ribbon */
    .attendance-ribbon {
      display: flex;
      justify-content: space-around;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 16px;
      text-align: center;
    }
    .att-item-label {
      font-size: 10px;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 600;
      display: block;
    }
    .att-item-val {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }
    /* Salary Table Grid */
    .salary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    .salary-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
      font-size: 11.5px;
    }
    .salary-table th {
      background: #0f172a;
      color: #ffffff;
      padding: 8px 12px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .salary-table th.text-right {
      text-align: right;
    }
    .salary-table td {
      padding: 6px 12px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    .salary-table td.text-right {
      text-align: right;
      font-weight: 600;
      color: #0f172a;
    }
    .salary-table tr.total-row {
      background: #f8fafc;
      font-weight: 700;
      border-top: 2px solid #cbd5e1;
    }
    .salary-table tr.total-row td {
      color: #0f172a;
      padding: 8px 12px;
    }
    /* Net Pay Box */
    .net-pay-box {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .net-pay-left .net-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #94a3b8;
      font-weight: 600;
    }
    .net-pay-left .net-words {
      font-size: 12px;
      color: #e2e8f0;
      font-weight: 500;
      margin-top: 4px;
    }
    .net-pay-right {
      text-align: right;
    }
    .net-pay-amount {
      font-size: 24px;
      font-weight: 800;
      color: #38bdf8;
      letter-spacing: -0.02em;
    }
    /* Footer & Disclaimer */
    .payslip-footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 10px;
      color: #64748b;
    }
    .footer-left {
      max-width: 480px;
      line-height: 1.5;
    }
    .footer-right {
      text-align: right;
    }
    .signatory-line {
      width: 140px;
      border-top: 1px solid #94a3b8;
      margin-bottom: 4px;
      margin-left: auto;
    }
    .signatory-label {
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #334155;
    }
  </style>
</head>
<body>
  <div class="payslip-wrapper">
    <!-- Brand Header -->
    <div class="brand-header">
      <div class="brand-left">
        <div class="logo-badge">TX</div>
        <div>
          <h1 class="company-name">TreasureX FinServ Ltd.</h1>
          <p class="company-address">Financial District, Gachibowli, Hyderabad, Telangana 500032</p>
        </div>
      </div>
      <div class="brand-right">
        <div class="payslip-badge">PAYSLIP - ${month} ${year}</div>
        <div>
          <span class="status-pill ${slip.status === 'PAID' ? '' : 'pending'}">${slip.status}</span>
        </div>
      </div>
    </div>

    <!-- Employee Information -->
    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Employee Name:</span>
        <span class="info-val">${fullName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Bank Name:</span>
        <span class="info-val">${bankName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Employee Code:</span>
        <span class="info-val">${empCode}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Account No:</span>
        <span class="info-val">${accountNum}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Department:</span>
        <span class="info-val">${dept}</span>
      </div>
      <div class="info-row">
        <span class="info-label">IFSC Code:</span>
        <span class="info-val">${ifsc}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Designation:</span>
        <span class="info-val">${desig}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Payment Mode:</span>
        <span class="info-val">${paymentMode}</span>
      </div>
    </div>

    <!-- Attendance Ribbon -->
    <div class="attendance-ribbon">
      <div>
        <span class="att-item-label">Total Days</span>
        <span class="att-item-val">${slip.workingDays || 30}</span>
      </div>
      <div>
        <span class="att-item-label">Paid Days</span>
        <span class="att-item-val" style="color: #15803d;">${slip.paidDays || 30}</span>
      </div>
      <div>
        <span class="att-item-label">Loss of Pay</span>
        <span class="att-item-val" style="color: #b91c1c;">${slip.lossOfPayDays || 0}</span>
      </div>
    </div>

    <!-- Earnings & Deductions Tables -->
    <div class="salary-grid">
      <!-- Earnings Table -->
      <table class="salary-table">
        <thead>
          <tr>
            <th>EARNINGS</th>
            <th class="text-right">AMOUNT (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Basic Salary</td>
            <td class="text-right">${this.formatNumber(basic)}</td>
          </tr>
          <tr>
            <td>House Rent Allowance (HRA)</td>
            <td class="text-right">${this.formatNumber(hra)}</td>
          </tr>
          <tr>
            <td>Conveyance Allowance</td>
            <td class="text-right">${this.formatNumber(conveyance)}</td>
          </tr>
          <tr>
            <td>Medical Allowance</td>
            <td class="text-right">${this.formatNumber(medical)}</td>
          </tr>
          <tr>
            <td>Special Allowance</td>
            <td class="text-right">${this.formatNumber(special)}</td>
          </tr>
          ${overtime > 0 ? `
          <tr>
            <td>Overtime Allowance</td>
            <td class="text-right">${this.formatNumber(overtime)}</td>
          </tr>` : ''}
          ${bonus > 0 ? `
          <tr>
            <td>Incentives & Bonus</td>
            <td class="text-right">${this.formatNumber(bonus)}</td>
          </tr>` : ''}
          ${reimbursements > 0 ? `
          <tr>
            <td>Approved Reimbursements</td>
            <td class="text-right">${this.formatNumber(reimbursements)}</td>
          </tr>` : ''}
          <tr class="total-row">
            <td>GROSS EARNINGS</td>
            <td class="text-right">${this.formatNumber(gross)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Deductions Table -->
      <table class="salary-table">
        <thead>
          <tr>
            <th>DEDUCTIONS</th>
            <th class="text-right">AMOUNT (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Provident Fund (PF)</td>
            <td class="text-right">${this.formatNumber(pf)}</td>
          </tr>
          <tr>
            <td>Professional Tax (PT)</td>
            <td class="text-right">${this.formatNumber(pt)}</td>
          </tr>
          <tr>
            <td>Income Tax / TDS</td>
            <td class="text-right">${this.formatNumber(tds)}</td>
          </tr>
          ${lop > 0 ? `
          <tr>
            <td>Loss of Pay (LOP) Deduction</td>
            <td class="text-right">${this.formatNumber(lop)}</td>
          </tr>` : ''}
          ${otherDed > 0 ? `
          <tr>
            <td>Other Deductions</td>
            <td class="text-right">${this.formatNumber(otherDed)}</td>
          </tr>` : ''}
          <tr class="total-row">
            <td>TOTAL DEDUCTIONS</td>
            <td class="text-right">${this.formatNumber(totalDeductions)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Net Pay Highlight -->
    <div class="net-pay-box">
      <div class="net-pay-left">
        <div class="net-label">NET TAKE-HOME SALARY</div>
        <div class="net-words">${netWords}</div>
      </div>
      <div class="net-pay-right">
        <div class="net-pay-amount">${this.formatCurrency(netPay)}</div>
      </div>
    </div>

    <!-- Footer Sign-off -->
    <div class="payslip-footer">
      <div class="footer-left">
        <p><strong>Note:</strong> This is a computer-generated salary slip and does not require a physical signature.</p>
        <p>Generated on: ${generationDate} | System ID: ${slip.id || 'N/A'}</p>
      </div>
      <div class="footer-right">
        <div class="signatory-line"></div>
        <div class="signatory-label">Authorized Signatory</div>
      </div>
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.print();
      }, 250);
    });
  </script>
</body>
</html>`;
  }

  printPayslip(slip: Payslip): void {
    const htmlContent = this.generatePayslipHtml(slip);

    // Create an invisible iframe to print without disturbing the main window
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 350);
    } else {
      // Fallback: open popup window
      const printWindow = window.open('', '_blank', 'width=840,height=900');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
      }
    }
  }
}
