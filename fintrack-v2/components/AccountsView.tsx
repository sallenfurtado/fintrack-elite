import React from 'react';
import { Wallet, Building2, PiggyBank, Plus, Pencil, Trash2, Eye, EyeOff, AlignJustify, CalendarRange, ListFilter, Filter, FileText } from 'lucide-react';
import { formatCurrency } from '../utils/financeUtils';
import TransactionList from './TransactionList';
import { Transaction, Account, Category, CostCenter, AccountType } from '../types';

interface AccountsViewProps {
  transactions: Transaction[];
  searchFilteredTransactions: Transaction[];
  accounts: Account[];
  stats: any;
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string | null) => void;
  setEditingAccount: (account: Account | null) => void;
  setIsAccountFormOpen: (isOpen: boolean) => void;
  deleteAccount: (id: string) => void;
  setCleanupTargetId: (id: string) => void;
  setIsCleanupModalOpen: (isOpen: boolean) => void;
  showBalanceLines: boolean;
  setShowBalanceLines: (show: boolean) => void;
  viewMode: 'list' | 'month' | 'statement';
  setViewMode: (mode: 'list' | 'month' | 'statement') => void;
  categories: Category[];
  costCenters: CostCenter[];
  deleteTransaction: (id: string) => void;
  handleEditTransaction: (tx: Transaction) => void;
  onOpenFilter: () => void;
  hasActiveFilters: boolean;
}

const AccountsView: React.FC<AccountsViewProps> = ({
  transactions,
  searchFilteredTransactions,
  accounts,
  stats,
  selectedAccountId,
  setSelectedAccountId,
  setEditingAccount,
  setIsAccountFormOpen,
  deleteAccount,
  setCleanupTargetId,
  setIsCleanupModalOpen,
  showBalanceLines,
  setShowBalanceLines,
  viewMode,
  setViewMode,
  categories,
  costCenters,
  deleteTransaction,
  handleEditTransaction,
  onOpenFilter,
  hasActiveFilters
}) => {
  const filteredTransactions = searchFilteredTransactions.filter(t => selectedAccountId ? t.account_id === selectedAccountId : t.account_id !== undefined);
  const selectedAccount = selectedAccountId ? accounts.find(a => a.id === selectedAccountId) : null;
  const selectedAccountName = selectedAccount ? selectedAccount.name : 'Todas as Contas';

    // Calculate running balances for all transactions in the selected context
    const transactionBalances = React.useMemo(() => {
      const balances: Record<string, number> = {};
      const contextTransactions = transactions.filter(t => selectedAccountId ? t.account_id === selectedAccountId : t.account_id !== undefined);
      const sortedAll = [...contextTransactions].sort((a, b) => {
        const timeDiff = new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
        // If same date, ensure balance lines are processed FIRST (newest), so they anchor the end-of-day balance
        if (timeDiff === 0) {
            if (a.is_balance_line && !b.is_balance_line) return -1;
            if (!a.is_balance_line && b.is_balance_line) return 1;
        }
        return timeDiff;
      });
      
      let currentBal = selectedAccount ? selectedAccount.current_balance : stats.totalCash;
      
      sortedAll.forEach(t => {
        if (t.is_balance_line) {
            // Anchor to the actual imported balance
            currentBal = t.amount || 0;
            balances[t.id] = currentBal;
        } else {
            balances[t.id] = currentBal;
            currentBal -= (t.amount || 0);
        }
      });
      
      return balances;
    }, [transactions, selectedAccountId, selectedAccount, stats.totalCash]);

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Saldo Total em Contas</p>
            <p className="text-3xl font-black mb-4">{formatCurrency(stats.totalCash)}</p>
            <div className="flex gap-4">
               <div><p className="text-[10px] text-slate-400 uppercase">Receita (Mês)</p><p className="text-sm font-bold text-emerald-400">{formatCurrency(stats.currentMonthIncome)}</p></div>
               <div><p className="text-[10px] text-slate-400 uppercase">Despesa (Mês)</p><p className="text-sm font-bold text-rose-400">{formatCurrency(stats.currentMonthExpenses)}</p></div>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4"><Wallet size={120} /></div>
        </div>

        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
           {accounts.map(acc => (
             <div key={acc.id} onClick={() => setSelectedAccountId(selectedAccountId === acc.id ? null : acc.id)} className={`relative cursor-pointer transition-all duration-300 transform group rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-5 shadow-sm hover:shadow-md ${selectedAccountId === acc.id ? 'ring-2 ring-blue-500 scale-[1.02] shadow-xl' : 'hover:scale-[1.01]'}`}>
               <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={(e) => { e.stopPropagation(); setEditingAccount(acc); setIsAccountFormOpen(true); }} className="p-1.5 bg-white dark:bg-slate-800 shadow-sm rounded-full text-slate-500 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50"><Pencil size={14} /></button>
                 <button onClick={(e) => { e.stopPropagation(); if (window.confirm('Excluir esta conta?')) deleteAccount(acc.id); }} className="p-1.5 bg-white dark:bg-slate-800 shadow-sm rounded-full text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50"><Trash2 size={14} /></button>
               </div>
               
               <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-3">
                      <div className={`p-2.5 rounded-xl ${acc.type === AccountType.CHECKING ? 'bg-blue-50 text-blue-600' : acc.type === AccountType.WALLET ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          {acc.type === AccountType.CHECKING ? <Building2 size={20} /> : acc.type === AccountType.WALLET ? <Wallet size={20} /> : <PiggyBank size={20} />}
                      </div>
                      <div>
                          <h3 className="font-bold text-slate-800 dark:text-white">{acc.name}</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{acc.type === AccountType.CHECKING ? 'Conta Corrente' : acc.type === AccountType.WALLET ? 'Carteira' : 'Poupança'}</p>
                      </div>
                  </div>
               </div>
               <div>
                  <span className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(acc.current_balance)}</span>
               </div>
             </div>
           ))}
           <div onClick={() => { setEditingAccount(null); setIsAccountFormOpen(true); }} className="border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6 text-slate-400 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50 transition-all cursor-pointer min-h-[140px]"><Plus size={32} className="mb-2" /><span className="text-sm font-bold">Adicionar Conta</span></div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div><h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">{selectedAccountId ? `Extrato: ${selectedAccountName}` : 'Movimentação Geral'}</h2><p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{selectedAccountId ? 'Listando movimentações desta conta.' : 'Consolidado de todas as contas.'}</p></div>
           <div className="flex flex-wrap items-center gap-2">
             <button 
               onClick={() => {
                 setCleanupTargetId(selectedAccountId || 'all');
                 setIsCleanupModalOpen(true);
               }}
               className="flex items-center gap-1.5 px-3 py-1.5 btn-tactile-danger text-xs font-bold rounded-xl"
               title="Limpar dados por período"
             >
               <Trash2 size={14} /> Limpar Dados
             </button>
             <button 
               onClick={() => setShowBalanceLines(!showBalanceLines)}
               className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all rounded-xl ${showBalanceLines ? 'bg-slate-800 text-white hover:bg-slate-700' : 'btn-tactile-white text-slate-500 dark:text-slate-400'}`}
               title="Ocultar/Exibir linhas de saldo"
             >
               {showBalanceLines ? <Eye size={14} /> : <EyeOff size={14} />}
             </button>
             <div className="flex bg-slate-100 p-1 rounded-xl">
               <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`} title="Lista Simples"><AlignJustify size={16} /></button>
               <button onClick={() => setViewMode('month')} className={`p-1.5 rounded-xl transition-all ${viewMode === 'month' ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`} title="Visão Mensal"><CalendarRange size={16} /></button>
               <button onClick={() => setViewMode('statement')} className={`p-1.5 rounded-xl transition-all ${viewMode === 'statement' ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`} title="Visão Extrato Bancário"><FileText size={16} /></button>
             </div>
             <button 
               onClick={onOpenFilter}
               className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all rounded-xl ${hasActiveFilters ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200' : 'btn-tactile-white text-slate-500 dark:text-slate-400'}`}
             >
               <Filter size={14} />Filtrar
               {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-white dark:bg-slate-800 ml-1 animate-pulse"></span>}
             </button>
             {selectedAccountId && <button onClick={() => setSelectedAccountId(null)} className="px-3 py-1.5 btn-tactile-white text-xs font-bold flex items-center gap-2"><ListFilter size={14} />Limpar Filtro</button>}
           </div>
        </div>
        <TransactionList 
          transactions={showBalanceLines ? filteredTransactions : filteredTransactions.filter(t => !t.is_balance_line)} 
          categories={categories} 
          costCenters={costCenters} 
          onDelete={deleteTransaction} 
          onEdit={handleEditTransaction} 
          viewMode={viewMode === 'month' ? 'tabs' : viewMode === 'statement' ? 'statement' : 'list'} 
          currentBalance={selectedAccount ? selectedAccount.current_balance : stats.totalCash}
          transactionBalances={transactionBalances}
        />
      </div>
    </div>
  );
};

export default AccountsView;
