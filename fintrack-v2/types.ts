export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'BRL';

export enum AccountType {
  CHECKING = 'CHECKING',
  WALLET = 'WALLET',
  SAVINGS = 'SAVINGS'
}

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  CLEARED = 'CLEARED',
  RECONCILED = 'RECONCILED'
}

export interface User {
  id: string;
  email: string;
  currency_code: CurrencyCode;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  current_balance: number;
  is_archived: boolean;
}

export interface CreditCard {
  id: string;
  name: string;
  closing_day: number;
  due_day: number;
  limit_amount: number;
}

export interface Category {
  id: string;
  name: string;
  icon_key: string;
  color_hex: string;
  type: TransactionType;
}

export interface CostCenter {
  id: string;
  name: string;
  code?: string;
  group?: string;
  enabled_for_credit: boolean;
  enabled_for_accounts: boolean;
  color_hex?: string;
}

export interface RuleAllocation {
  cost_center_id: string;
  percentage: number;
}

export interface SupplierRule {
  id: string;
  pattern: string;
  clean_name: string;
  default_category_id: string;
  default_cost_center_id?: string;
  allocations?: RuleAllocation[];
}

export interface CostCenterAllocation {
  cost_center_id: string;
  amount: number;
}

export interface Transaction {
  id: string;
  account_id?: string;
  card_id?: string;
  category_id?: string;
  cost_center_id?: string;
  allocations?: CostCenterAllocation[];
  description: string;
  original_description?: string;
  amount: number;
  date: string;
  invoice_date: string;
  installment_id?: string;
  installment_number?: number;
  installment_total?: number;
  status: TransactionStatus;
  is_balance_line?: boolean;
}

/** New: Monthly budget goal per category */
export interface Budget {
  id: string;
  category_id: string;
  limit_amount: number;
  month: string; // YYYY-MM, or 'RECURRING' for every month
}

export interface DashboardSummary {
  cash_balance: number;
  credit_liability: {
    current_invoice_total: number;
    cards: {
      id: string;
      name: string;
      status: 'OPEN' | 'CLOSED';
      closing_date: string;
      current_bill: number;
      limit: number;
    }[];
  };
  monthly_flow: {
    income: number;
    expense: number;
  };
}
