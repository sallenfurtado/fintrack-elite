import { useState, useEffect } from 'react';
import {
  Transaction, Account, CreditCard, Category,
  TransactionStatus, AccountType, TransactionType,
  CostCenter, CostCenterAllocation, SupplierRule, Budget
} from './types';
import { DEFAULT_CATEGORIES } from './constants';
import { calculateInvoiceDate, addMonths, extractInstallmentInfo } from './utils/financeUtils';
import { safeValidateTransaction, safeValidateAccount, safeValidateCreditCard, safeValidateSupplierRule } from './utils/validation';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

const STORAGE_KEY = 'fintrack_elite_db';

interface Database {
  accounts: Account[];
  creditCards: CreditCard[];
  categories: Category[];
  costCenters: CostCenter[];
  supplierRules: SupplierRule[];
  transactions: Transaction[];
  deletedTransactions: Transaction[];
  budgets: Budget[];
}

const INITIAL_DB: Database = {
  accounts: [
    { id: 'acc-1', name: 'Conta Principal', type: AccountType.CHECKING, current_balance: 5000, is_archived: false },
    { id: 'acc-2', name: 'Carteira', type: AccountType.WALLET, current_balance: 250, is_archived: false },
  ],
  creditCards: [
    { id: 'card-1', name: 'Visa Platinum', closing_day: 5, due_day: 15, limit_amount: 3000 },
    { id: 'card-2', name: 'Mastercard Gold', closing_day: 20, due_day: 30, limit_amount: 1500 },
  ],
  categories: DEFAULT_CATEGORIES,
  costCenters: [],
  supplierRules: [],
  transactions: [],
  deletedTransactions: [],
  budgets: [],
};

function loadDb(): Database {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return INITIAL_DB;
    const parsed = JSON.parse(saved) as Database;
    // Migrate: ensure budgets field exists
    return { ...INITIAL_DB, ...parsed, budgets: parsed.budgets ?? [] };
  } catch {
    return INITIAL_DB;
  }
}

export function useFinanceStore() {
  const [db, setDb] = useState<Database>(loadDb);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }, [db]);

  // ─── Transactions ────────────────────────────────────────────────────────────

  const addTransaction = (data: {
    date: string;
    description: string;
    amount: number;
    category_id: string;
    allocations?: CostCenterAllocation[];
    source: { type: 'CASH' | 'CREDIT'; id: string };
    installments?: number;
  }) => {
    const { date, description, amount, category_id, allocations, source, installments = 1 } = data;
    const installmentGroupId = installments > 1 ? uuidv4() : undefined;
    const installmentAmount = amount / installments;
    const allocationRatios = allocations?.map(a => ({
      cost_center_id: a.cost_center_id,
      ratio: a.amount / amount,
    }));
    const newTransactions: Transaction[] = [];

    for (let i = 0; i < installments; i++) {
      const transDate = addMonths(new Date(date), i);
      let invoiceDate = transDate.toISOString().split('T')[0];

      if (source.type === 'CREDIT') {
        const card = db.creditCards.find(c => c.id === source.id);
        if (card) {
          invoiceDate = calculateInvoiceDate(transDate, card.closing_day).toISOString().split('T')[0];
        }
      }

      const installmentAllocations = allocationRatios?.map(r => ({
        cost_center_id: r.cost_center_id,
        amount: r.ratio * installmentAmount,
      }));

      const newTx: Transaction = {
        id: uuidv4(),
        account_id: source.type === 'CASH' ? source.id : undefined,
        card_id: source.type === 'CREDIT' ? source.id : undefined,
        category_id,
        allocations: installmentAllocations,
        description,
        original_description: description,
        amount: installmentAmount,
        date: transDate.toISOString().split('T')[0],
        invoice_date: invoiceDate,
        installment_id: installmentGroupId,
        installment_number: installments > 1 ? i + 1 : undefined,
        installment_total: installments > 1 ? installments : undefined,
        status: TransactionStatus.PENDING,
      };

      const validation = safeValidateTransaction(newTx);
      if (validation.success) {
        newTransactions.push(newTx);
      } else {
        console.error('Invalid transaction data:', validation.error);
        toast.error(`Erro ao adicionar transação: ${validation.error.issues[0].message}`);
      }
    }

    if (newTransactions.length === 0) return;

    setDb(prev => ({
      ...prev,
      transactions: [...prev.transactions, ...newTransactions],
      accounts: source.type === 'CASH'
        ? prev.accounts.map(acc =>
            acc.id === source.id ? { ...acc, current_balance: acc.current_balance + amount } : acc
          )
        : prev.accounts,
    }));

    toast.success(installments > 1
      ? `${installments} parcelas adicionadas com sucesso!`
      : 'Transação adicionada com sucesso!');
  };

  const updateTransaction = (id: string, data: Partial<Transaction>) => {
    setDb(prev => {
      const original = prev.transactions.find(t => t.id === id);
      if (!original) return prev;

      const updatedTransactions = prev.transactions.map(t => {
        if (t.id !== id) return t;
        const updatedTx = { ...t, ...data };
        const validation = safeValidateTransaction(updatedTx);
        if (!validation.success) {
          toast.error(`Erro ao atualizar: ${validation.error.issues[0].message}`);
          return t;
        }
        return updatedTx;
      });

      let updatedAccounts = prev.accounts;
      if (original.account_id && data.amount !== undefined && data.amount !== original.amount) {
        const diff = data.amount - original.amount;
        updatedAccounts = prev.accounts.map(acc =>
          acc.id === original.account_id ? { ...acc, current_balance: acc.current_balance + diff } : acc
        );
      }

      toast.success('Transação atualizada com sucesso!');
      return { ...prev, transactions: updatedTransactions, accounts: updatedAccounts };
    });
  };

  const reconcileBatch = (
    newItems: any[],
    mergedItems: { id: string; updates: Partial<Transaction> }[]
  ) => {
    const createdTransactions: Transaction[] = [];
    const newSupplierRules: SupplierRule[] = [];
    let errorCount = 0;

    newItems.forEach(item => {
      const installmentInfo = extractInstallmentInfo(item.description);
      const potentialSupplierName = installmentInfo ? installmentInfo.cleanDescription : item.description;
      const cleanPattern = potentialSupplierName.trim();

      const ruleExists =
        db.supplierRules?.some(r => r.pattern.toLowerCase() === cleanPattern.toLowerCase()) ||
        newSupplierRules.some(r => r.pattern.toLowerCase() === cleanPattern.toLowerCase());

      if (!ruleExists && cleanPattern.length > 2) {
        newSupplierRules.push({
          id: uuidv4(),
          pattern: cleanPattern,
          clean_name: cleanPattern,
          default_category_id: '',
        });
      }

      const isCredit = item.source.type === 'CREDIT';
      let startInstallment = 1;
      let installmentsToCreate = 1;
      let groupId: string | undefined;

      if (installmentInfo && isCredit) {
        startInstallment = installmentInfo.current;
        installmentsToCreate = installmentInfo.total - startInstallment + 1;
        groupId = uuidv4();
      } else if (!installmentInfo && item.installments > 1) {
        installmentsToCreate = item.installments;
        groupId = uuidv4();
      }

      for (let i = 0; i < installmentsToCreate; i++) {
        const currentInstallmentNum = startInstallment + i;
        const baseInvoiceDate = new Date(item.invoice_date + 'T12:00:00');
        const projectedInvoiceDate = addMonths(baseInvoiceDate, i).toISOString().split('T')[0];
        const projectedPurchaseDate = addMonths(new Date(item.date + 'T12:00:00'), i).toISOString().split('T')[0];

        let allocations: CostCenterAllocation[] | undefined;
        if (item.allocations?.length > 0) {
          allocations = item.allocations;
        } else if (item.cost_center_id) {
          allocations = [{ cost_center_id: item.cost_center_id, amount: item.amount }];
        }

        const newTx: Transaction = {
          id: uuidv4(),
          account_id: !isCredit ? item.source.id : undefined,
          card_id: isCredit ? item.source.id : undefined,
          category_id: item.category_id,
          allocations,
          description: installmentInfo
            ? item.description.replace(`${installmentInfo.current}/${installmentInfo.total}`, `${currentInstallmentNum}/${installmentInfo.total}`)
            : item.description,
          original_description: item.original_description || item.description,
          amount: item.amount,
          date: projectedPurchaseDate,
          invoice_date: projectedInvoiceDate,
          installment_id: groupId,
          installment_number: groupId ? currentInstallmentNum : undefined,
          installment_total: groupId ? (installmentInfo?.total || installmentsToCreate) : undefined,
          status: i === 0 ? TransactionStatus.RECONCILED : TransactionStatus.PENDING,
          is_balance_line: item.is_balance_line || false,
        };

        const validation = safeValidateTransaction(newTx);
        if (validation.success) createdTransactions.push(newTx);
        else errorCount++;
      }
    });

    const updatedTransactions = db.transactions.map(t => {
      const mergeOp = mergedItems.find(m => m.id === t.id);
      return mergeOp ? { ...t, ...mergeOp.updates, status: TransactionStatus.RECONCILED } : t;
    });

    setDb(prev => ({
      ...prev,
      transactions: [...updatedTransactions, ...createdTransactions],
      supplierRules: [...(prev.supplierRules || []), ...newSupplierRules],
      accounts: prev.accounts.map(acc => {
        const change = newItems
          .filter(item => item.source.type === 'CASH' && item.source.id === acc.id && !item.is_balance_line)
          .reduce((sum, item) => sum + item.amount, 0);
        return change !== 0 ? { ...acc, current_balance: acc.current_balance + change } : acc;
      }),
    }));

    if (errorCount > 0) toast.error(`${errorCount} transações falharam na validação.`);
    toast.success(`${createdTransactions.length + mergedItems.length} transações processadas com sucesso!`);
  };

  const deleteTransaction = (id: string, mode: 'ONLY' | 'FUTURE' | 'ALL' = 'ONLY') => {
    const target = db.transactions.find(t => t.id === id);
    if (!target) return;

    const filterFn: (t: Transaction) => boolean =
      mode === 'ONLY' || !target.installment_id
        ? t => t.id !== id
        : mode === 'FUTURE'
        ? t => !(t.installment_id === target.installment_id && (t.installment_number ?? 0) >= (target.installment_number ?? 0))
        : t => t.installment_id !== target.installment_id;

    setDb(prev => {
      const remaining = prev.transactions.filter(filterFn);
      const removed = prev.transactions.filter(t => !filterFn(t));
      toast.success('Transação(ões) movida(s) para a lixeira!');
      return { ...prev, transactions: remaining, deletedTransactions: [...prev.deletedTransactions, ...removed] };
    });
  };

  const restoreTransaction = (id: string) => {
    setDb(prev => {
      const target = prev.deletedTransactions?.find(t => t.id === id);
      if (!target) return prev;
      let newAccounts = prev.accounts;
      if (target.account_id && !target.is_balance_line) {
        newAccounts = prev.accounts.map(acc =>
          acc.id === target.account_id ? { ...acc, current_balance: acc.current_balance + target.amount } : acc
        );
      }
      return {
        ...prev,
        transactions: [...prev.transactions, target],
        deletedTransactions: prev.deletedTransactions.filter(t => t.id !== id),
        accounts: newAccounts,
      };
    });
  };

  const emptyTrash = () => setDb(prev => ({ ...prev, deletedTransactions: [] }));

  // ─── Accounts ───────────────────────────────────────────────────────────────

  const addAccount = (account: Omit<Account, 'id'>) => {
    const newAccount = { ...account, id: uuidv4(), is_archived: false };
    const validation = safeValidateAccount(newAccount);
    if (!validation.success) { toast.error(`Erro: ${validation.error.issues[0].message}`); return; }
    setDb(prev => ({ ...prev, accounts: [...prev.accounts, newAccount] }));
    toast.success('Conta adicionada com sucesso!');
  };

  const updateAccount = (id: string, data: Partial<Account>) => {
    setDb(prev => {
      const original = prev.accounts.find(a => a.id === id);
      if (!original) return prev;
      const updated = { ...original, ...data };
      const validation = safeValidateAccount(updated);
      if (!validation.success) { toast.error(`Erro: ${validation.error.issues[0].message}`); return prev; }
      toast.success('Conta atualizada com sucesso!');
      return { ...prev, accounts: prev.accounts.map(a => a.id === id ? updated : a) };
    });
  };

  const deleteAccount = (id: string) => {
    setDb(prev => {
      const removed = prev.transactions.filter(t => t.account_id === id);
      toast.success('Conta excluída com sucesso!');
      return {
        ...prev,
        accounts: prev.accounts.filter(a => a.id !== id),
        transactions: prev.transactions.filter(t => t.account_id !== id),
        deletedTransactions: [...prev.deletedTransactions, ...removed],
      };
    });
  };

  // ─── Credit Cards ────────────────────────────────────────────────────────────

  const addCreditCard = (card: Omit<CreditCard, 'id'>) => {
    const newCard = { ...card, id: uuidv4() };
    const validation = safeValidateCreditCard(newCard);
    if (!validation.success) { toast.error(`Erro: ${validation.error.issues[0].message}`); return; }
    setDb(prev => ({ ...prev, creditCards: [...prev.creditCards, newCard] }));
    toast.success('Cartão adicionado com sucesso!');
  };

  const updateCreditCard = (id: string, data: Partial<CreditCard>) => {
    setDb(prev => {
      const original = prev.creditCards.find(c => c.id === id);
      if (!original) return prev;
      const updated = { ...original, ...data };
      const validation = safeValidateCreditCard(updated);
      if (!validation.success) { toast.error(`Erro: ${validation.error.issues[0].message}`); return prev; }
      toast.success('Cartão atualizado com sucesso!');
      return { ...prev, creditCards: prev.creditCards.map(c => c.id === id ? updated : c) };
    });
  };

  const deleteCreditCard = (id: string) => {
    setDb(prev => {
      const removed = prev.transactions.filter(t => t.card_id === id);
      toast.success('Cartão excluído com sucesso!');
      return {
        ...prev,
        creditCards: prev.creditCards.filter(c => c.id !== id),
        transactions: prev.transactions.filter(t => t.card_id !== id),
        deletedTransactions: [...prev.deletedTransactions, ...removed],
      };
    });
  };

  const deleteAllCreditCards = () => {
    setDb(prev => {
      const removed = prev.transactions.filter(t => !!t.card_id);
      toast.success('Todos os cartões foram excluídos!');
      return {
        ...prev,
        creditCards: [],
        transactions: prev.transactions.filter(t => !t.card_id),
        deletedTransactions: [...prev.deletedTransactions, ...removed],
      };
    });
  };

  // ─── Categories ──────────────────────────────────────────────────────────────

  const addCategory = (category: Omit<Category, 'id'> & { id?: string }) => {
    const newId = category.id || uuidv4();
    setDb(prev => ({ ...prev, categories: [...prev.categories, { ...category, id: newId }] }));
    toast.success('Categoria adicionada!');
    return newId;
  };

  const updateCategory = (id: string, data: Partial<Category>) => {
    setDb(prev => ({ ...prev, categories: prev.categories.map(c => c.id === id ? { ...c, ...data } : c) }));
    toast.success('Categoria atualizada!');
  };

  const deleteCategory = (id: string) => {
    setDb(prev => ({ ...prev, categories: prev.categories.filter(c => c.id !== id) }));
  };

  // ─── Cost Centers ─────────────────────────────────────────────────────────────

  const addCostCenter = (costCenter: Omit<CostCenter, 'id'>) => {
    setDb(prev => ({ ...prev, costCenters: [...(prev.costCenters || []), { ...costCenter, id: uuidv4() }] }));
  };

  const updateCostCenter = (id: string, data: Partial<CostCenter>) => {
    setDb(prev => ({ ...prev, costCenters: prev.costCenters.map(cc => cc.id === id ? { ...cc, ...data } : cc) }));
    toast.success('Centro de custo atualizado!');
  };

  const deleteCostCenter = (id: string) => {
    setDb(prev => ({ ...prev, costCenters: prev.costCenters.filter(cc => cc.id !== id) }));
  };

  // ─── Supplier Rules ──────────────────────────────────────────────────────────

  const addSupplierRule = (rule: Omit<SupplierRule, 'id'>) => {
    const newRule = { ...rule, id: uuidv4() };
    const validation = safeValidateSupplierRule(newRule);
    if (!validation.success) { toast.error(`Erro: ${validation.error.issues[0].message}`); return; }
    setDb(prev => ({ ...prev, supplierRules: [...(prev.supplierRules || []), newRule] }));
    toast.success('Regra adicionada!');
  };

  const updateSupplierRule = (id: string, data: Partial<SupplierRule>) => {
    setDb(prev => {
      const original = prev.supplierRules?.find(r => r.id === id);
      if (!original) return prev;
      const updated = { ...original, ...data };
      const validation = safeValidateSupplierRule(updated);
      if (!validation.success) { toast.error(`Erro: ${validation.error.issues[0].message}`); return prev; }
      toast.success('Regra atualizada!');
      return { ...prev, supplierRules: prev.supplierRules.map(r => r.id === id ? updated : r) };
    });
  };

  const deleteSupplierRule = (id: string) => {
    setDb(prev => ({ ...prev, supplierRules: prev.supplierRules?.filter(r => r.id !== id) || [] }));
    toast.success('Regra excluída!');
  };

  const clearSupplierRules = () => setDb(prev => ({ ...prev, supplierRules: [] }));

  const reorderSupplierRules = (startIndex: number, endIndex: number) => {
    setDb(prev => {
      const result = [...(prev.supplierRules || [])];
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return { ...prev, supplierRules: result };
    });
  };

  const applyRulesToHistory = () => {
    setDb(prev => {
      const rules = prev.supplierRules || [];
      if (rules.length === 0) { toast.info('Nenhuma regra configurada.'); return prev; }

      let updatedCount = 0;
      const updatedTransactions = prev.transactions.map(t => {
        if (t.is_balance_line) return t;
        let matched = false;
        let newDesc = t.description;
        let newCategoryId = t.category_id;
        let newAllocations = t.allocations;
        let newCostCenterId = t.cost_center_id;

        for (const rule of rules) {
          const searchDesc = t.original_description || t.description;
          if (searchDesc.toLowerCase().includes(rule.pattern.toLowerCase()) || t.description.toLowerCase() === rule.clean_name.toLowerCase()) {
            newDesc = rule.clean_name || t.description;
            if (rule.default_category_id) newCategoryId = rule.default_category_id;
            if (rule.allocations?.length) {
              newAllocations = rule.allocations.map(a => ({ cost_center_id: a.cost_center_id, amount: (a.percentage / 100) * t.amount }));
              newCostCenterId = undefined;
            } else if (rule.default_cost_center_id) {
              newCostCenterId = rule.default_cost_center_id;
              newAllocations = undefined;
            }
            matched = true;
            break;
          }
        }

        if (matched && (newCategoryId !== t.category_id || newDesc !== t.description || JSON.stringify(newAllocations) !== JSON.stringify(t.allocations))) {
          updatedCount++;
          return { ...t, category_id: newCategoryId, description: newDesc, allocations: newAllocations, cost_center_id: newCostCenterId };
        }
        return t;
      });

      if (updatedCount > 0) {
        toast.success(`${updatedCount} transações atualizadas com as regras!`);
        return { ...prev, transactions: updatedTransactions };
      }
      toast.info('Nenhuma transação precisou ser atualizada.');
      return prev;
    });
  };

  // ─── Budgets ──────────────────────────────────────────────────────────────────

  const setBudget = (budget: Omit<Budget, 'id'>) => {
    setDb(prev => {
      const existing = prev.budgets.find(
        b => b.category_id === budget.category_id && b.month === budget.month
      );
      if (existing) {
        return {
          ...prev,
          budgets: prev.budgets.map(b => b.id === existing.id ? { ...b, limit_amount: budget.limit_amount } : b),
        };
      }
      return { ...prev, budgets: [...prev.budgets, { ...budget, id: uuidv4() }] };
    });
    toast.success('Meta de orçamento salva!');
  };

  const deleteBudget = (id: string) => {
    setDb(prev => ({ ...prev, budgets: prev.budgets.filter(b => b.id !== id) }));
  };

  // ─── Misc ─────────────────────────────────────────────────────────────────────

  const clearDataByDateRange = (startDate: string, endDate: string, accountId?: string, cardId?: string) => {
    setDb(prev => {
      const remaining = prev.transactions.filter(t => {
        if (t.date < startDate || t.date > endDate) return true;
        if (accountId && t.account_id === accountId) return false;
        if (cardId && t.card_id === cardId) return false;
        if (!accountId && !cardId) return false;
        return true;
      });
      const removed = prev.transactions.filter(t => !remaining.includes(t));
      const newAccounts = prev.accounts.map(acc => {
        const accTxs = remaining.filter(t => t.account_id === acc.id && !t.is_balance_line);
        return { ...acc, current_balance: accTxs.reduce((s, t) => s + t.amount, 0) };
      });
      return { ...prev, transactions: remaining, accounts: newAccounts, deletedTransactions: [...prev.deletedTransactions, ...removed] };
    });
  };

  const resetDatabase = () => {
    setDb(INITIAL_DB);
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  return {
    ...db,
    // Transactions
    addTransaction, updateTransaction, reconcileBatch, deleteTransaction,
    restoreTransaction, emptyTrash,
    // Accounts
    addAccount, updateAccount, deleteAccount,
    // Credit Cards
    addCreditCard, updateCreditCard, deleteCreditCard, deleteAllCreditCards,
    // Categories
    addCategory, updateCategory, deleteCategory,
    // Cost Centers
    addCostCenter, updateCostCenter, deleteCostCenter,
    // Supplier Rules
    addSupplierRule, updateSupplierRule, deleteSupplierRule,
    clearSupplierRules, reorderSupplierRules, applyRulesToHistory,
    // Budgets
    setBudget, deleteBudget,
    // Misc
    clearDataByDateRange, resetDatabase,
  };
}
