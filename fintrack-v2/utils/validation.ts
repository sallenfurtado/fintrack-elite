import { z } from 'zod';
import { TransactionType, AccountType } from '../types';

export const transactionSchema = z.object({
  id: z.string().min(1, "ID é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.number().refine(val => !isNaN(val), "Valor deve ser um número válido"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
  category_id: z.string().optional(),
  account_id: z.string().optional(),
  card_id: z.string().optional(),
  cost_center_id: z.string().optional(),
  invoice_date: z.string().optional(),
  installment_id: z.string().optional(),
  installment_number: z.number().optional(),
  installment_total: z.number().optional(),
  is_balance_line: z.boolean().optional(),
  allocations: z.array(z.object({
    cost_center_id: z.string(),
    amount: z.number()
  })).optional()
}).refine(data => data.account_id || data.card_id, {
  message: "A transação deve estar vinculada a uma conta ou cartão",
  path: ["account_id"]
});

export const accountSchema = z.object({
  id: z.string().min(1, "ID é obrigatório"),
  name: z.string().min(1, "Nome da conta é obrigatório"),
  type: z.nativeEnum(AccountType),
  current_balance: z.number().refine(val => !isNaN(val), "Saldo deve ser um número válido"),
  is_archived: z.boolean().optional().default(false)
});

export const creditCardSchema = z.object({
  id: z.string().min(1, "ID é obrigatório"),
  name: z.string().min(1, "Nome do cartão é obrigatório"),
  closing_day: z.number().min(1).max(31, "Dia de fechamento deve ser entre 1 e 31"),
  due_day: z.number().min(1).max(31, "Dia de vencimento deve ser entre 1 e 31"),
  limit_amount: z.number().min(0, "Limite deve ser maior ou igual a zero")
});

export const supplierRuleSchema = z.object({
  id: z.string().min(1, "ID é obrigatório"),
  pattern: z.string().min(1, "Padrão de busca é obrigatório"),
  clean_name: z.string().min(1, "Nome limpo é obrigatório"),
  default_category_id: z.string().optional(),
  default_cost_center_id: z.string().optional(),
  allocations: z.array(z.object({
    cost_center_id: z.string(),
    percentage: z.number().min(0).max(100)
  })).optional()
});

export type ValidatedTransaction = z.infer<typeof transactionSchema>;
export type ValidatedAccount = z.infer<typeof accountSchema>;
export type ValidatedCreditCard = z.infer<typeof creditCardSchema>;
export type ValidatedSupplierRule = z.infer<typeof supplierRuleSchema>;

export const safeValidateTransaction = (data: unknown) => transactionSchema.safeParse(data);
export const safeValidateAccount = (data: unknown) => accountSchema.safeParse(data);
export const safeValidateCreditCard = (data: unknown) => creditCardSchema.safeParse(data);
export const safeValidateSupplierRule = (data: unknown) => supplierRuleSchema.safeParse(data);
