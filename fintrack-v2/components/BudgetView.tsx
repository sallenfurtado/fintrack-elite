import React, { useState, useMemo } from 'react';
import { Target, Plus, Trash2, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { Budget, Category, Transaction, TransactionType } from '../types';
import { formatCurrency } from '../utils/financeUtils';
import { ICON_MAP } from '../constants';

interface BudgetViewProps {
  budgets: Budget[];
  categories: Category[];
  transactions: Transaction[];
  setBudget: (b: Omit<Budget, 'id'>) => void;
  deleteBudget: (id: string) => void;
}

interface BudgetProgress {
  budget: Budget;
  category: Category;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'OK' | 'WARNING' | 'OVER';
}

function getStatusColor(status: BudgetProgress['status']) {
  switch (status) {
    case 'OVER': return { bar: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', badge: 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' };
    case 'WARNING': return { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' };
    default: return { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' };
  }
}

const BudgetView: React.FC<BudgetViewProps> = ({ budgets, categories, transactions, setBudget, deleteBudget }) => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const expenseCategories = categories.filter(c => c.type === TransactionType.EXPENSE);

  const progress = useMemo<BudgetProgress[]>(() => {
    const currentBudgets = budgets.filter(b => b.month === currentMonth || b.month === 'RECURRING');

    return currentBudgets.map(budget => {
      const category = categories.find(c => c.id === budget.category_id);
      if (!category) return null;

      const spent = transactions
        .filter(t => t.category_id === budget.category_id && t.date?.startsWith(currentMonth) && t.amount < 0 && !t.is_balance_line)
        .reduce((s, t) => s + Math.abs(t.amount), 0);

      const percentage = budget.limit_amount > 0 ? Math.min((spent / budget.limit_amount) * 100, 100) : 0;
      const remaining = budget.limit_amount - spent;
      const status: BudgetProgress['status'] = percentage >= 100 ? 'OVER' : percentage >= 80 ? 'WARNING' : 'OK';

      return { budget, category, spent, remaining, percentage, status };
    }).filter(Boolean) as BudgetProgress[];
  }, [budgets, categories, transactions, currentMonth]);

  const totalBudgeted = progress.reduce((s, p) => s + p.budget.limit_amount, 0);
  const totalSpent = progress.reduce((s, p) => s + p.spent, 0);
  const overBudgetCount = progress.filter(p => p.status === 'OVER').length;

  const handleAdd = () => {
    if (!newCategoryId || !newLimit || isNaN(Number(newLimit)) || Number(newLimit) <= 0) return;
    setBudget({ category_id: newCategoryId, limit_amount: Number(newLimit), month: 'RECURRING' });
    setNewCategoryId('');
    setNewLimit('');
    setIsAdding(false);
  };

  const usedCategoryIds = new Set(budgets.map(b => b.category_id));
  const availableCategories = expenseCategories.filter(c => !usedCategoryIds.has(c.id));

  return (
    <div className="space-y-8">
      {/* Header + Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Total Orçado</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(totalBudgeted)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Gasto até agora</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(totalSpent)}</p>
        </div>
        <div className={`rounded-2xl p-6 border shadow-sm ${
          overBudgetCount > 0
            ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800'
            : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800'
        }`}>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Status</p>
          <p className={`text-2xl font-black ${overBudgetCount > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
            {overBudgetCount > 0 ? `${overBudgetCount} acima do limite` : 'Dentro do orçamento'}
          </p>
        </div>
      </div>

      {/* Budget list */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Target className="text-blue-500" size={20} />
            <h2 className="text-lg font-black text-slate-800 dark:text-white">Metas Mensais</h2>
            <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">recorrente</span>
          </div>
          {availableCategories.length > 0 && (
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors"
            >
              <Plus size={16} /> Nova meta
            </button>
          )}
        </div>

        {/* Add form */}
        {isAdding && (
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-40">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Categoria</label>
                <select
                  value={newCategoryId}
                  onChange={e => setNewCategoryId(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecionar...</option>
                  {availableCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="w-40">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Limite mensal (R$)</label>
                <input
                  type="number"
                  value={newLimit}
                  onChange={e => setNewLimit(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors"
              >
                Salvar
              </button>
              <button
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 text-sm font-bold rounded-xl transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {progress.length === 0 ? (
          <div className="p-16 text-center">
            <div className="inline-flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-700 rounded-full text-slate-400 mb-4">
              <Target size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Nenhuma meta definida</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-xs mx-auto">
              Defina limites de gasto por categoria e acompanhe se está dentro do orçamento.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {progress.map(p => {
              const colors = getStatusColor(p.status);
              const icon = ICON_MAP[p.category.icon_key];
              return (
                <div key={p.budget.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${p.category.color_hex}22` }}>
                        <span style={{ color: p.category.color_hex }}>{icon}</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-white">{p.category.name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Gasto {formatCurrency(p.spent)} de {formatCurrency(p.budget.limit_amount)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${colors.badge}`}>
                        {p.status === 'OVER' ? <AlertTriangle size={12} /> : p.status === 'WARNING' ? <TrendingDown size={12} /> : <CheckCircle size={12} />}
                        {p.percentage.toFixed(0)}%
                      </span>
                      <button
                        onClick={() => deleteBudget(p.budget.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 bg-slate-100 dark:bg-slate-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                      style={{ width: `${p.percentage}%` }}
                    />
                  </div>

                  <div className="flex justify-between mt-2">
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {p.status === 'OVER'
                        ? `R$ ${formatCurrency(Math.abs(p.remaining))} acima do limite`
                        : `Restam ${formatCurrency(p.remaining)}`}
                    </span>
                    <span className={`text-xs font-bold ${colors.text}`}>
                      {p.status === 'OVER' ? 'Acima do limite!' : p.status === 'WARNING' ? 'Atenção: próximo do limite' : 'Dentro do orçamento'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetView;
