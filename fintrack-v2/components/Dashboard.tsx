import React from 'react';
import { Wallet, ArrowUpCircle, ArrowDownCircle, CreditCard as CardIcon, BrainCircuit, Sparkles, TrendingUp, Eye, EyeOff, Download, Filter } from 'lucide-react';
import { formatCurrency } from '../utils/financeUtils';
import MonthlyFlowChart from './MonthlyFlowChart';
import TransactionList from './TransactionList';
import CreditCardWidget from './CreditCardWidget';
import SummaryCard from './SummaryCard';
import { Transaction, CreditCard, Category, CostCenter } from '../types';

interface DashboardProps {
  stats: {
    totalCash: number;
    currentMonthIncome: number;
    currentMonthExpenses: number;
    totalCreditBill: number;
    creditLiabilityPerCard: { card: CreditCard; bill: number }[];
  };
  creditCards: CreditCard[];
  chartFilteredTransactions: Transaction[];
  selectedMonthFilter: string | null;
  setSelectedMonthFilter: (month: string | null) => void;
  insights: any[];
  predictions: any[];
  searchFilteredTransactions: Transaction[];
  showBalanceLines: boolean;
  setShowBalanceLines: (show: boolean) => void;
  exportTransactions: () => void;
  categories: Category[];
  costCenters: CostCenter[];
  deleteTransaction: (id: string, mode?: 'ONLY' | 'FUTURE' | 'ALL') => void;
  handleEditTransaction: (tx: Transaction) => void;
  transactionBalances: Record<string, number>;
  onOpenFilter: () => void;
  hasActiveFilters: boolean;
  searchQuery: string;
  loadingInsights?: boolean;
  loadingPredictions?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({
  stats,
  creditCards,
  chartFilteredTransactions,
  selectedMonthFilter,
  setSelectedMonthFilter,
  insights,
  predictions,
  searchFilteredTransactions,
  showBalanceLines,
  setShowBalanceLines,
  exportTransactions,
  categories,
  costCenters,
  deleteTransaction,
  handleEditTransaction,
  transactionBalances,
  onOpenFilter,
  hasActiveFilters,
  searchQuery,
  loadingInsights,
  loadingPredictions,
}) => {
  const isFiltered = hasActiveFilters || !!selectedMonthFilter || searchQuery.trim() !== '';

  const displayIncome = isFiltered
    ? searchFilteredTransactions.filter(t => !t.is_balance_line && t.amount > 0).reduce((s, t) => s + t.amount, 0)
    : stats.currentMonthIncome;

  const displayExpenses = isFiltered
    ? searchFilteredTransactions.filter(t => !t.is_balance_line && t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
    : stats.currentMonthExpenses;

  const netResult = displayIncome - displayExpenses;

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <SummaryCard
          label={isFiltered ? 'Resultado Líquido' : 'Saldo Disponível'}
          value={formatCurrency(isFiltered ? netResult : stats.totalCash)}
          icon={<Wallet className="text-emerald-500" size={20} />}
          trend={isFiltered ? 'Receitas - Despesas' : undefined}
        />
        <SummaryCard
          label={isFiltered ? 'Receitas (Filtro)' : 'Receita Mensal'}
          value={formatCurrency(displayIncome)}
          icon={<ArrowUpCircle className="text-blue-500" size={20} />}
          trendPositive
        />
        <SummaryCard
          label={isFiltered ? 'Despesas (Filtro)' : 'Despesas Mensais'}
          value={formatCurrency(displayExpenses)}
          icon={<ArrowDownCircle className="text-rose-500" size={20} />}
          trendPositive={false}
        />
        <SummaryCard
          label="Fatura de Cartão"
          value={formatCurrency(stats.totalCreditBill)}
          icon={<CardIcon className="text-amber-500" size={20} />}
          trend={`${creditCards.length} cartões ativos`}
        />
      </div>

      {/* Chart */}
      <div className="mb-10">
        <MonthlyFlowChart
          transactions={chartFilteredTransactions}
          onMonthClick={setSelectedMonthFilter}
          selectedMonth={selectedMonthFilter}
        />
      </div>

      {/* AI Insights */}
      {(loadingInsights || insights.length > 0) && (
        <div className="mb-10">
          {loadingInsights ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 animate-pulse h-24" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {insights.map((insight, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border flex gap-3 items-start ${
                    insight.severity === 'HIGH'
                      ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                      : insight.severity === 'MEDIUM'
                      ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                      : 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 text-blue-800 dark:text-blue-300'
                  }`}
                >
                  <BrainCircuit size={18} className="mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider mb-0.5">{insight.title}</h4>
                    <p className="text-xs font-medium leading-tight opacity-90">{insight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Predictions */}
      {(loadingPredictions || predictions.length > 0) && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-indigo-500" size={20} />
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Previsão de Saldo (IA)</h3>
          </div>
          {loadingPredictions ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 h-32 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {predictions.map((pred, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{pred.month}</span>
                    <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      <TrendingUp size={14} />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-slate-800 dark:text-white mb-2">{formatCurrency(pred.predictedBalance)}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed italic">"{pred.explanation}"</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transactions + Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
              Atividade Recente
              <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 dark:text-slate-400 px-2 py-0.5 rounded-full">
                {searchFilteredTransactions.length}
              </span>
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowBalanceLines(!showBalanceLines)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all rounded-xl ${
                  showBalanceLines
                    ? 'bg-slate-800 dark:bg-slate-600 text-white'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                }`}
              >
                {showBalanceLines ? <Eye size={14} /> : <EyeOff size={14} />}
                {showBalanceLines ? 'Saldos: Visível' : 'Saldos: Oculto'}
              </button>
              <button
                onClick={exportTransactions}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Download size={14} /> Exportar
              </button>
              <button
                onClick={onOpenFilter}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all rounded-xl ${
                  hasActiveFilters
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-blue-900'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                }`}
              >
                <Filter size={14} /> Filtrar
                {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-white ml-1 animate-pulse" />}
              </button>
            </div>
          </div>
          <TransactionList
            transactions={searchFilteredTransactions}
            categories={categories}
            costCenters={costCenters}
            onDelete={deleteTransaction}
            onEdit={handleEditTransaction}
            transactionBalances={transactionBalances}
          />
        </div>

        <div className="space-y-8">
          <h2 className="text-xl font-black text-slate-800 dark:text-white">Ciclos do Cartão</h2>
          <div className="grid grid-cols-1 gap-6">
            {stats.creditLiabilityPerCard.slice(0, 3).map(({ card, bill }) => (
              <CreditCardWidget key={card.id} card={card} currentBill={bill} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
