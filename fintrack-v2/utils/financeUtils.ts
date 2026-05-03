
import { Transaction } from '../types';

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== day) {
    d.setDate(0);
  }
  return d;
}

/**
 * Calculates the invoice date for a credit card transaction.
 * The invoice date is the date the bill closes.
 */
export function calculateInvoiceDate(transactionDate: Date, closingDay: number): Date {
  const tDate = new Date(transactionDate);
  // Create date for closing day of the same month/year as transaction
  const currentMonthClosing = new Date(tDate.getFullYear(), tDate.getMonth(), closingDay);
  
  // If transaction date is after the closing day of the current month,
  // it goes to the NEXT month's invoice.
  // We compare timestamps/values
  if (tDate > currentMonthClosing) {
    return addMonths(currentMonthClosing, 1);
  }
  
  return currentMonthClosing;
}

export function formatCurrency(amount: number, currency: string = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function formatDate(date: Date | string, formatStr: string = 'dd MMM, yyyy'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Custom simple formatter to replace date-fns format
  if (formatStr === 'yyyy-MM-dd') {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } else if (formatStr === 'dd MMM, yyyy') {
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('pt-BR', { month: 'short' });
    const year = d.getFullYear();
    return `${day} ${month}, ${year}`;
  } else if (formatStr === 'dd MMM') {
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('pt-BR', { month: 'short' });
    return `${day} ${month}`;
  } else if (formatStr === 'MMM yyyy') {
    const month = d.toLocaleString('pt-BR', { month: 'short' });
    const year = d.getFullYear();
    return `${month} ${year}`;
  } else if (formatStr === 'MMMM yyyy') {
    const month = d.toLocaleString('pt-BR', { month: 'long' });
    const year = d.getFullYear();
    return `${month} ${year}`;
  } else if (formatStr === 'MMMM') {
    return d.toLocaleString('pt-BR', { month: 'long' });
  } else if (formatStr === 'dd/MM/yyyy') {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } else if (formatStr === 'dd/MM') {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  }
  return d.toLocaleDateString('pt-BR');
}

export function getDaysUntil(date: Date): number {
  const now = new Date();
  const target = new Date(date);
  // Reset hours to compare dates only
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function cleanSupplierName(description: string): string | null {
  const upperDesc = description.toUpperCase();
  
  // 1. Ignore balance lines
  if (upperDesc.includes('SALDO') || upperDesc === 'SDO' || upperDesc.includes('SDO ANTERIOR')) {
    return null;
  }

  // 2. Find date patterns like DD/MM (e.g., 15/04) or MMM/AA (e.g., JAN/24, FEV/23)
  // Also match variations with spaces like DD / MM
  const datePatternRegex = /(\d{2}\s*\/\s*\d{2}|[A-Z]{3}\s*\/\s*\d{2})/g;
  const match = datePatternRegex.exec(upperDesc);
  
  let cleanDesc = upperDesc;
  if (match) {
    // Take everything before the date pattern
    cleanDesc = upperDesc.substring(0, match.index);
  } else {
    // If no date pattern, try to remove trailing numbers (like CNPJ or PIX keys)
    // This removes long sequences of numbers at the end
    cleanDesc = cleanDesc.replace(/\s+\d{4,}$/, '');
  }

  // Clean up extra spaces and special characters at the end
  cleanDesc = cleanDesc.replace(/[-*\/]+$/, '').trim();
  
  // Remove multiple spaces
  cleanDesc = cleanDesc.replace(/\s{2,}/g, ' ');

  if (cleanDesc.length < 3) {
    return null;
  }

  return cleanDesc;
}

/**
 * Parses description to find installment patterns like "02/10" or "05/12".
 * Returns the current installment, total installments, and the clean name.
 */
export function extractInstallmentInfo(description: string): { current: number; total: number; cleanDescription: string } | null {
  // Regex to match "XX/YY" or "XX / YY" at the end of the string
  const regex = /\s+(\d{1,2})\s*\/\s*(\d{1,2})\s*$/;
  const match = description.match(regex);

  if (match) {
    const current = parseInt(match[1], 10);
    const total = parseInt(match[2], 10);
    
    // Remove the installment part from the description to get the clean name
    const cleanDescription = description.replace(regex, '').trim();

    if (!isNaN(current) && !isNaN(total) && total > 0) {
      return { current, total, cleanDescription };
    }
  }

  return null;
}

/**
 * Checks if a statement item matches an existing database transaction.
 * Logic: Same card, Same amount (approx), similar date (same month/year), same installment index (if applicable).
 */
export function checkTransactionMatch(statementItem: any, dbTransaction: Transaction): boolean {
  // 1. Check Source (Card or Account)
  if (statementItem.source.type === 'CREDIT') {
    if (dbTransaction.card_id !== statementItem.source.id) return false;
  } else {
    if (dbTransaction.account_id !== statementItem.source.id) return false;
  }

  if (statementItem.is_balance_line) {
    if (!dbTransaction.is_balance_line) return false;
    // For balance lines, amount and date must match exactly
    if (statementItem.amount !== dbTransaction.amount) return false;
    if (statementItem.date !== dbTransaction.date) return false;
    return true;
  } else if (dbTransaction.is_balance_line) {
    return false;
  }

  // 2. Check Amount (allow small difference for currency conversion issues if any, e.g. 0.05)
  // Statement amounts are usually negative for expenses, db is negative.
  const stmtAmount = statementItem.amount; 
  const dbAmount = dbTransaction.amount;
  if (Math.abs(stmtAmount - dbAmount) > 0.05) return false;

  // 3. Check Installments
  const stmtInstallment = extractInstallmentInfo(statementItem.description);
  
  if (stmtInstallment && dbTransaction.installment_number) {
    // If both have installment info, they MUST match indices
    if (stmtInstallment.current !== dbTransaction.installment_number) return false;
    if (stmtInstallment.total !== dbTransaction.installment_total) return false;
  } else if (stmtInstallment || dbTransaction.installment_number) {
    // If one has installment info but the other doesn't (and descriptions match), it might be a match 
    // where one didn't capture the pattern, but usually we want strict matching for safety.
    // However, if the user manually added "Store X" (1/10) and statement says "Store X 01/10", it's a match.
    // Let's rely on date/description if installment info is partial.
  }

  // 4. Check Date (Same Month and Year is usually enough for credit card matching, 
  // as the exact date might vary by a day due to processing time)
  const stmtDate = new Date(statementItem.date);
  const dbDate = new Date(dbTransaction.date);
  
  const sameMonth = stmtDate.getMonth() === dbDate.getMonth();
  const sameYear = stmtDate.getFullYear() === dbDate.getFullYear();

  if (!sameMonth || !sameYear) return false;

  // 5. Description Fuzzy Match (Optional but helpful)
  // Simple check: does one contain the other?
  const d1 = statementItem.description.toLowerCase();
  const d2 = dbTransaction.description.toLowerCase();
  
  // If we have strict installment match, we can be looser on name.
  if (stmtInstallment && dbTransaction.installment_number) {
      return true; // High confidence match based on Amount + Installment Index + Month
  }

  // If no installments, we need closer name match
  if (d1.includes(d2) || d2.includes(d1)) return true;

  return false;
}
