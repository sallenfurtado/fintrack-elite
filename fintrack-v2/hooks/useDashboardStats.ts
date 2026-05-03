import { useMemo } from 'react';
import { Transaction, Account, CreditCard } from '../types';

export function useDashboardStats(
  transactions: Transaction[],
  accounts: Account[],
  creditCards: CreditCard[]
) {
  return useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const activeAccounts = accounts.filter(a => !a.is_archived);
    const totalCash = activeAccounts.reduce((s, a) => s + a.current_balance, 0);

    const monthTx = transactions.filter(
      t => !t.is_balance_line && t.date?.startsWith(currentMonth)
    );
    const currentMonthIncome = monthTx.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const currentMonthExpenses = monthTx.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

    const creditLiabilityPerCard = creditCards.map(card => {
      const cardTx = transactions.filter(
        t => t.card_id === card.id && !t.is_balance_line && t.invoice_date?.startsWith(currentMonth)
      );
      const bill = cardTx.reduce((s, t) => s + Math.abs(t.amount), 0);
      return { card, bill };
    });

    const totalCreditBill = creditLiabilityPerCard.reduce((s, { bill }) => s + bill, 0);

    return {
      totalCash,
      currentMonthIncome,
      currentMonthExpenses,
      totalCreditBill,
      creditLiabilityPerCard,
    };
  }, [transactions, accounts, creditCards]);
}
