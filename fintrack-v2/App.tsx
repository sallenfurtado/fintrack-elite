import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Toaster, toast } from 'sonner';
import { useFinanceStore } from './store';
import { Account, CreditCard, Transaction, RuleAllocation } from './types';
import { addMonths, formatCurrency } from './utils/financeUtils';

// Hooks
import { useNotifications } from './hooks/useNotifications';
import { useFilters } from './hooks/useFilters';
import { useDashboardStats } from './hooks/useDashboardStats';

// Context
import { ThemeProvider } from './context/ThemeContext';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import CardsView from './components/CardsView';
import AccountsView from './components/AccountsView';
import BudgetView from './components/BudgetView';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import TransactionForm from './components/TransactionForm';
import AccountForm from './components/AccountForm';
import CreditCardForm from './components/CreditCardForm';
import ReconciliationModal from './components/ReconciliationModal';
import ConfirmModal from './components/ConfirmModal';
import TrashModal from './components/TrashModal';
import FilterPanel from './components/FilterPanel';

// Services
import { getFinancialInsights, predictBalance } from './services/geminiService';

// ─── Cleanup Modal (inline, lightweight) ─────────────────────────────────────
const CleanupModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  onConfirm: (start: string, end: string) => void;
}> = ({ isOpen, onClose, targetId, onConfirm }) => {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 p-6">
        <h3 className="text-lg font-black text-slate-800 dark:text-white mb-4">Limpar Dados por Período</h3>
        <div className="space-y-3 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Data inicial</label>
            <input type="date" value={start} onChange={e => setStart(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Data final</label>
            <input type="date" value={end} onChange={e => setEnd(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-sm">Cancelar</button>
          <button
            onClick={() => { if (start && end) { onConfirm(start, end); onClose(); } else toast.error('Selecione as datas.'); }}
            className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm transition-colors"
          >
            Limpar
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main App ────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const store = useFinanceStore();
  const {
    accounts, creditCards, categories, transactions, costCenters, supplierRules, budgets,
    deletedTransactions,
    addTransaction, updateTransaction, reconcileBatch, deleteTransaction,
    addAccount, updateAccount, deleteAccount,
    addCreditCard, updateCreditCard, deleteCreditCard, deleteAllCreditCards,
    addCostCenter, updateCostCenter, deleteCostCenter,
    addSupplierRule, updateSupplierRule, deleteSupplierRule,
    clearSupplierRules, reorderSupplierRules, applyRulesToHistory,
    addCategory, updateCategory, deleteCategory,
    setBudget, deleteBudget,
    resetDatabase, clearDataByDateRange,
    restoreTransaction, emptyTrash,
  } = store;

  // ── UI State ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'month' | 'statement'>('month');

  // ── Modal State ─────────────────────────────────────────────────────────────
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAccountFormOpen, setIsAccountFormOpen] = useState(false);
  const [isCardFormOpen, setIsCardFormOpen] = useState(false);
  const [isReconModalOpen, setIsReconModalOpen] = useState(false);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);
  const [cleanupTargetId, setCleanupTargetId] = useState('all');

  // ── Editing State ────────────────────────────────────────────────────────────
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // ── Confirm Modal ────────────────────────────────────────────────────────────
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false, title: '', message: '', onConfirm: () => {}, isDangerous: false,
  });

  // ── Notifications ────────────────────────────────────────────────────────────
  const notificationRef = useRef<HTMLDivElement>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const { notifications, hasUnread, markAllRead } = useNotifications(creditCards);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Filters ──────────────────────────────────────────────────────────────────
  const {
    searchQuery, setSearchQuery,
    selectedMonthFilter, setSelectedMonthFilter,
    advancedFilters, setAdvancedFilters,
    showBalanceLines, setShowBalanceLines,
    hasActiveFilters,
    filtered: searchFilteredTransactions,
    resetFilters,
  } = useFilters(transactions);

  // ── Dashboard Stats ───────────────────────────────────────────────────────────
  const stats = useDashboardStats(transactions, accounts, creditCards);

  // ── Chart Filtered Transactions ───────────────────────────────────────────────
  const chartFilteredTransactions = useMemo(() => {
    if (!hasActiveFilters && !searchQuery.trim() && !selectedMonthFilter) return transactions;
    return searchFilteredTransactions;
  }, [transactions, hasActiveFilters, searchQuery, selectedMonthFilter, searchFilteredTransactions]);

  // ── AI State ──────────────────────────────────────────────────────────────────
  const [insights, setInsights] = useState<any[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);

  useEffect(() => {
    if (transactions.length < 3) return;
    const isFiltered = hasActiveFilters || !!selectedMonthFilter;
    const summaryData = { ...stats, transactionCount: searchFilteredTransactions.length };
    const recentTx = searchFilteredTransactions.slice(0, 10);

    setLoadingInsights(true);
    getFinancialInsights(summaryData, recentTx, isFiltered)
      .then(setInsights)
      .finally(() => setLoadingInsights(false));
  }, [searchFilteredTransactions, selectedMonthFilter, hasActiveFilters]);

  useEffect(() => {
    if (transactions.length < 5) return;
    const isFiltered = hasActiveFilters || !!selectedMonthFilter;
    setLoadingPredictions(true);
    predictBalance(searchFilteredTransactions, stats.totalCash, isFiltered)
      .then(setPredictions)
      .finally(() => setLoadingPredictions(false));
  }, [searchFilteredTransactions, stats.totalCash]);

  // ── Reset on tab change ───────────────────────────────────────────────────────
  useEffect(() => {
    setSelectedCardId(null);
    setSelectedAccountId(null);
  }, [activeTab]);

  // ── Transaction Balances ──────────────────────────────────────────────────────
  const transactionBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let running = stats.totalCash;
    sorted.forEach(t => {
      balances[t.id] = running;
      if (!t.is_balance_line) running -= t.amount;
    });
    return balances;
  }, [transactions, stats.totalCash]);

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleEditTransaction = useCallback((tx: Transaction) => {
    setEditingTransaction(tx);
    setIsFormOpen(true);
  }, []);

  const handleDeleteAllCards = useCallback(() => {
    setConfirmModal({
      isOpen: true,
      title: 'Limpar Todos os Cartões',
      message: 'Tem certeza que deseja excluir TODOS os cartões e suas transações? Esta ação é irreversível.',
      onConfirm: deleteAllCreditCards,
      isDangerous: true,
    });
  }, [deleteAllCreditCards]);

  const handleResetDatabase = useCallback(() => {
    setConfirmModal({
      isOpen: true,
      title: 'Resetar Banco de Dados',
      message: 'Todos os seus dados financeiros serão apagados permanentemente. Não há como desfazer.',
      onConfirm: resetDatabase,
      isDangerous: true,
    });
  }, [resetDatabase]);

  const handleFinishRecon = useCallback((newItems: any[], mergedItems: any[]) => {
    reconcileBatch(newItems, mergedItems);
    setIsReconModalOpen(false);
  }, [reconcileBatch]);

  const getReconSource = useCallback(() => {
    if (activeTab === 'cards' && selectedCardId) {
      const c = creditCards.find(c => c.id === selectedCardId);
      if (c) return { type: 'CREDIT' as const, id: c.id, name: c.name, closingDay: c.closing_day };
    }
    if (activeTab === 'accounts' && selectedAccountId) {
      const a = accounts.find(a => a.id === selectedAccountId);
      if (a) return { type: 'ACCOUNT' as const, id: a.id, name: a.name };
    }
    return null;
  }, [activeTab, selectedCardId, selectedAccountId, creditCards, accounts]);

  const exportTransactions = useCallback(() => {
    const headers = ['Data', 'Descrição', 'Valor', 'Categoria', 'Status'];
    const rows = searchFilteredTransactions.map(t => {
      const cat = categories.find(c => c.id === t.category_id);
      return [t.date, `"${t.description}"`, t.amount.toFixed(2), cat?.name || 'Sem Categoria', t.status];
    });
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })),
      download: `fintrack_${new Date().toISOString().slice(0, 10)}.csv`,
      style: 'display:none',
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [searchFilteredTransactions, categories]);

  // Supplier rule helpers (used by SettingsView callbacks)
  const handleCreateRule = useCallback((rule: Omit<typeof supplierRules[0], 'id'>) => {
    addSupplierRule(rule);
  }, [addSupplierRule]);

  const handleEditRule = useCallback((id: string, rule: Partial<typeof supplierRules[0]>) => {
    updateSupplierRule(id, rule);
  }, [updateSupplierRule]);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <ThemeProvider>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors">
        <Toaster position="top-right" richColors />

        <Sidebar
          isMobileSidebarOpen={isMobileSidebarOpen}
          setIsMobileSidebarOpen={setIsMobileSidebarOpen}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <Header
            activeTab={activeTab}
            setIsMobileSidebarOpen={setIsMobileSidebarOpen}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setEditingTransaction={setEditingTransaction}
            setIsFormOpen={setIsFormOpen}
            selectedCardId={selectedCardId}
            selectedAccountId={selectedAccountId}
            setIsReconModalOpen={setIsReconModalOpen}
            notificationRef={notificationRef}
            showNotifications={showNotifications}
            setShowNotifications={setShowNotifications}
            notifications={notifications}
            hasUnread={hasUnread}
            onMarkAllRead={markAllRead}
          />

          <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scroll">
            <div className="max-w-7xl mx-auto">

              {activeTab === 'dashboard' && (
                <Dashboard
                  stats={stats}
                  creditCards={creditCards}
                  chartFilteredTransactions={chartFilteredTransactions}
                  selectedMonthFilter={selectedMonthFilter}
                  setSelectedMonthFilter={setSelectedMonthFilter}
                  insights={insights}
                  predictions={predictions}
                  searchFilteredTransactions={searchFilteredTransactions}
                  showBalanceLines={showBalanceLines}
                  setShowBalanceLines={setShowBalanceLines}
                  exportTransactions={exportTransactions}
                  categories={categories}
                  costCenters={costCenters}
                  deleteTransaction={deleteTransaction}
                  handleEditTransaction={handleEditTransaction}
                  transactionBalances={transactionBalances}
                  onOpenFilter={() => setIsFilterPanelOpen(true)}
                  hasActiveFilters={hasActiveFilters}
                  searchQuery={searchQuery}
                  loadingInsights={loadingInsights}
                  loadingPredictions={loadingPredictions}
                />
              )}

              {activeTab === 'cards' && (
                <CardsView
                  searchFilteredTransactions={searchFilteredTransactions}
                  creditCards={creditCards}
                  stats={stats}
                  selectedCardId={selectedCardId}
                  setSelectedCardId={setSelectedCardId}
                  setEditingCard={setEditingCard}
                  setIsCardFormOpen={setIsCardFormOpen}
                  deleteCreditCard={deleteCreditCard}
                  handleDeleteAllCards={handleDeleteAllCards}
                  setCleanupTargetId={setCleanupTargetId}
                  setIsCleanupModalOpen={setIsCleanupModalOpen}
                  showBalanceLines={showBalanceLines}
                  setShowBalanceLines={setShowBalanceLines}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  categories={categories}
                  costCenters={costCenters}
                  deleteTransaction={deleteTransaction}
                  handleEditTransaction={handleEditTransaction}
                  onOpenFilter={() => setIsFilterPanelOpen(true)}
                  hasActiveFilters={hasActiveFilters}
                />
              )}

              {activeTab === 'accounts' && (
                <AccountsView
                  transactions={transactions}
                  searchFilteredTransactions={searchFilteredTransactions}
                  accounts={accounts}
                  stats={stats}
                  selectedAccountId={selectedAccountId}
                  setSelectedAccountId={setSelectedAccountId}
                  setEditingAccount={setEditingAccount}
                  setIsAccountFormOpen={setIsAccountFormOpen}
                  deleteAccount={deleteAccount}
                  setCleanupTargetId={setCleanupTargetId}
                  setIsCleanupModalOpen={setIsCleanupModalOpen}
                  showBalanceLines={showBalanceLines}
                  setShowBalanceLines={setShowBalanceLines}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  categories={categories}
                  costCenters={costCenters}
                  deleteTransaction={deleteTransaction}
                  handleEditTransaction={handleEditTransaction}
                  onOpenFilter={() => setIsFilterPanelOpen(true)}
                  hasActiveFilters={hasActiveFilters}
                />
              )}

              {activeTab === 'budgets' && (
                <BudgetView
                  budgets={budgets}
                  categories={categories}
                  transactions={transactions}
                  setBudget={setBudget}
                  deleteBudget={deleteBudget}
                />
              )}

              {activeTab === 'reports' && (
                <ReportsView
                  transactions={transactions}
                  categories={categories}
                  costCenters={costCenters}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsView
                  transactions={transactions}
                  categories={categories}
                  costCenters={costCenters}
                  supplierRules={supplierRules}
                  deleteCategory={deleteCategory}
                  deleteCostCenter={deleteCostCenter}
                  deleteSupplierRule={deleteSupplierRule}
                  clearSupplierRules={clearSupplierRules}
                  reorderSupplierRules={reorderSupplierRules}
                  applyRulesToHistory={applyRulesToHistory}
                  addCategory={addCategory}
                  updateCategory={updateCategory}
                  addCostCenter={addCostCenter}
                  updateCostCenter={updateCostCenter}
                  handleCreateRule={handleCreateRule}
                  handleEditRule={handleEditRule}
                  setIsTrashModalOpen={setIsTrashModalOpen}
                  handleResetDatabase={handleResetDatabase}
                />
              )}

            </div>
          </div>
        </main>

        {/* ── Modals ──────────────────────────────────────────────────────────── */}
        <TransactionForm
          isOpen={isFormOpen}
          onClose={() => { setIsFormOpen(false); setEditingTransaction(null); }}
          categories={categories}
          accounts={accounts}
          creditCards={creditCards}
          costCenters={costCenters}
          onSubmit={data => {
            if (editingTransaction) updateTransaction(editingTransaction.id, data);
            else addTransaction(data);
            setIsFormOpen(false);
            setEditingTransaction(null);
          }}
          initialContext={activeTab === 'cards' ? 'credit' : activeTab === 'accounts' ? 'account' : 'general'}
          initialSourceId={activeTab === 'cards' ? selectedCardId : activeTab === 'accounts' ? selectedAccountId : null}
          initialData={editingTransaction}
        />

        <AccountForm
          isOpen={isAccountFormOpen}
          onClose={() => { setIsAccountFormOpen(false); setEditingAccount(null); }}
          onSubmit={addAccount}
          onUpdate={updateAccount}
          initialData={editingAccount}
        />

        <CreditCardForm
          isOpen={isCardFormOpen}
          onClose={() => { setIsCardFormOpen(false); setEditingCard(null); }}
          onSubmit={addCreditCard}
          onUpdate={updateCreditCard}
          initialData={editingCard}
        />

        <ReconciliationModal
          isOpen={isReconModalOpen}
          onClose={() => setIsReconModalOpen(false)}
          source={getReconSource()}
          categories={categories}
          costCenters={costCenters}
          supplierRules={supplierRules}
          existingTransactions={transactions}
          onFinish={handleFinishRecon}
          addCategory={addCategory}
        />

        <FilterPanel
          isOpen={isFilterPanelOpen}
          onClose={() => setIsFilterPanelOpen(false)}
          filters={advancedFilters}
          onFiltersChange={setAdvancedFilters}
          categories={categories}
          costCenters={costCenters}
          onReset={resetFilters}
        />

        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(prev => ({ ...prev, isOpen: false })); }}
          onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          isDangerous={confirmModal.isDangerous}
        />

        <CleanupModal
          isOpen={isCleanupModalOpen}
          onClose={() => setIsCleanupModalOpen(false)}
          targetId={cleanupTargetId}
          onConfirm={(start, end) => {
            const isCard = creditCards.some(c => c.id === cleanupTargetId);
            const isAccount = accounts.some(a => a.id === cleanupTargetId);
            clearDataByDateRange(
              start, end,
              isAccount ? cleanupTargetId : undefined,
              isCard ? cleanupTargetId : undefined,
            );
          }}
        />

        <TrashModal
          isOpen={isTrashModalOpen}
          onClose={() => setIsTrashModalOpen(false)}
          deletedTransactions={deletedTransactions}
          categories={categories}
          onRestore={restoreTransaction}
          onEmptyTrash={emptyTrash}
        />
      </div>
    </ThemeProvider>
  );
};

export default App;
