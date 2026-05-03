import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Transaction, Category, Account, CreditCard, TransactionType, CostCenter } from '../types';
import { ICON_MAP } from '../constants';
import { formatCurrency, formatDate } from '../utils/financeUtils';
import { Trash2, CreditCard as CardIcon, Wallet, Info, Calendar, Briefcase, Pencil, ChevronDown } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  costCenters?: CostCenter[];
  onDelete: (id: string) => void;
  onEdit?: (transaction: Transaction) => void;
  viewMode?: 'list' | 'tabs' | 'continuous' | 'statement';
  currentBalance?: number;
  transactionBalances?: Record<string, number>;
  variant?: 'default' | 'extrato';
}

const TransactionList: React.FC<TransactionListProps> = ({ 
  transactions, 
  categories, 
  costCenters = [], 
  onDelete, 
  onEdit, 
  viewMode = 'list', 
  currentBalance, 
  transactionBalances: externalTransactionBalances,
  variant = 'default'
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(50);
  const [displayMonthsLimit, setDisplayMonthsLimit] = useState(3);

  useEffect(() => {
    setDisplayLimit(50);
    setDisplayMonthsLimit(3);
  }, [transactions, viewMode, selectedMonth]);

  // Group transactions by Invoice Date YYYY-MM (for tabs) or Date YYYY-MM (for continuous)
  const grouped = React.useMemo(() => {
    if (viewMode === 'list') return {};
    const g: Record<string, Transaction[]> = {};
    (transactions || []).forEach(t => {
       const key = viewMode === 'continuous' ? (t.date || '').slice(0, 7) : (t.invoice_date || t.date || '').slice(0, 7); // YYYY-MM
       if (!g[key]) g[key] = [];
       g[key].push(t);
    });
    return g;
  }, [transactions, viewMode]);

  const sortedMonthKeys = React.useMemo(() => {
     return Object.keys(grouped).sort();
  }, [grouped]);

  // Set default selected month to the first available one or current month
  useEffect(() => {
    if (viewMode === 'tabs' && sortedMonthKeys.length > 0 && !selectedMonth) {
       // Try to find current month, else first
       const current = new Date().toISOString().slice(0, 7);
       if (sortedMonthKeys.includes(current)) {
           setSelectedMonth(current);
       } else {
           setSelectedMonth(sortedMonthKeys[0]);
       }
    }
  }, [viewMode, sortedMonthKeys, selectedMonth]);


  // Calculate running balances for all transactions
  const transactionBalances = React.useMemo(() => {
    if (externalTransactionBalances) return externalTransactionBalances;
    const balances: Record<string, number> = {};
    const sortedAll = [...(transactions || [])].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    
    let currentBal = currentBalance !== undefined ? currentBalance : 0;
    
    sortedAll.forEach(t => {
      balances[t.id] = currentBal;
      if (!t.is_balance_line) {
        currentBal -= (t.amount || 0);
      }
    });
    
    return balances;
  }, [transactions, currentBalance, externalTransactionBalances]);

  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-100 dark:border-slate-700">
        <div className="inline-flex items-center justify-center p-4 bg-slate-50 rounded-full text-slate-400 mb-4">
          <Info size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Nenhuma transação ainda</h3>
        <p className="text-slate-500 max-w-xs mx-auto mt-1">Comece a controlar suas despesas e parcelas hoje.</p>
      </div>
    );
  }

  const showInstallments = (transactions || []).some(t => t.card_id || t.installment_id);

  // Render function for the table body to ensure consistency across views
  const renderTableRows = (items: Transaction[], limit?: number, onShowMore?: () => void) => {
      const sortedItems = [...items].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      const visibleItems = limit ? sortedItems.slice(0, limit) : sortedItems;
      const hasMore = limit ? limit < sortedItems.length : false;
      
      const isExtrato = variant === 'extrato';

      return (
        <>
        <AnimatePresence mode="popLayout">
          {visibleItems.map((t, index) => {
              const category = categories.find(c => c.id === t.category_id);
              const isExpense = t.amount < 0;
              
              // Determine cost center info
              const hasAllocations = t.allocations && t.allocations.length > 0;
              const isMulti = hasAllocations && t.allocations!.length > 1;
              
              let costCenterName = '-';
              if (!isMulti) {
                  const ccId = hasAllocations ? t.allocations![0].cost_center_id : t.cost_center_id;
                  if (ccId) {
                      const cc = costCenters.find(c => c.id === ccId);
                      costCenterName = cc?.name || 'Desconhecido';
                  }
              }

              const isBalanceLine = t.is_balance_line || t.description.toUpperCase().includes('SALDO');
              const rowBg = isExtrato 
                ? (isBalanceLine ? 'bg-slate-100/80' : (index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'))
                : (t.is_balance_line ? 'bg-slate-50/50' : 'hover:bg-slate-50');
              
              return (
                <motion.tr 
                  key={t.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
                  className={`transition-colors group ${rowBg} ${!isExtrato ? 'hover:bg-slate-50' : ''}`}
                >
                    {/* Data */}
                    <td className={`px-6 py-4 align-top ${isExtrato ? 'border-b border-slate-100' : ''}`}>
                        <div className={`text-xs font-bold text-slate-600 mt-1 ${isExtrato ? 'text-slate-500' : ''}`}>
                            {formatDate(t.date, isExtrato ? 'dd/MM/yyyy' : 'dd/MM')}
                        </div>
                    </td>

                    {/* Transação */}
                    <td className={`px-6 py-4 align-top ${isExtrato ? 'border-b border-slate-100' : ''}`}>
                        <div className="flex items-center gap-3">
                            {!isExtrato && (
                              <div className="text-slate-400 mt-0.5">
                                  {t.is_balance_line ? <Wallet size={16} className="text-slate-400 dark:text-slate-500" /> : ICON_MAP[category?.icon_key || 'HelpCircle']}
                              </div>
                            )}
                            <span className={`text-sm font-bold line-clamp-1 mt-1 ${isExtrato ? 'uppercase text-slate-700' : (t.is_balance_line ? 'text-slate-600 uppercase tracking-wider text-xs' : 'text-slate-800')}`}>
                                {t.description}
                            </span>
                        </div>
                    </td>

                    {/* Parcela */}
                    {!isExtrato && showInstallments && (
                      <td className="px-6 py-4 align-top">
                          {t.installment_id ? (
                              <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded text-[10px] font-bold inline-block mt-0.5">
                                  {t.installment_number}/{t.installment_total}
                              </span>
                          ) : (
                              <span className="text-slate-300 text-xs mt-1 inline-block">-</span>
                          )}
                      </td>
                    )}

                    {/* Categoria */}
                    {!isExtrato && (
                      <td className="px-6 py-4 align-top">
                          {t.is_balance_line ? (
                              <span className="text-slate-300 text-xs mt-1 inline-block">-</span>
                          ) : (
                              <span 
                                  className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white whitespace-nowrap inline-block mt-0.5"
                                  style={{ backgroundColor: category?.color_hex || '#94a3b8' }}
                              >
                                  {category?.name || 'Sem categoria'}
                              </span>
                          )}
                      </td>
                    )}

                    {/* Centro de Custo */}
                    {!isExtrato && (
                      <td className="px-6 py-4 align-top">
                          {t.is_balance_line ? (
                              <span className="text-slate-300 text-xs mt-1 inline-block">-</span>
                          ) : isMulti ? (
                              <div className="flex items-center gap-1 text-slate-500 mt-1" title="Centros de Custo definidos">
                                  <Briefcase size={14} />
                                  <span className="text-[10px] font-bold">Multi ({t.allocations!.length})</span>
                              </div>
                          ) : costCenterName !== '-' ? (
                              <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded whitespace-nowrap inline-block mt-0.5">
                                  {costCenterName}
                              </span>
                          ) : (
                              <span className="text-slate-300 text-xs mt-1 inline-block">-</span>
                          )}
                      </td>
                    )}

                    {/* Valor */}
                    <td className={`px-6 py-4 text-right align-top ${isExtrato ? 'border-b border-slate-100' : ''}`}>
                        {t.is_balance_line ? (
                            <div className={`text-sm font-bold mt-1 ${isExtrato ? 'text-transparent' : 'text-slate-300'}`}>
                                -
                            </div>
                        ) : (
                            <div className={`text-sm font-bold mt-1 ${isExpense ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {formatCurrency(t.amount)}
                            </div>
                        )}
                        {/* Allocation Breakdown - ONLY if Multi */}
                        {!isExtrato && !t.is_balance_line && isMulti && (
                          <div className="flex flex-col items-end mt-1.5 gap-1">
                            {t.allocations!.map((alloc, index) => {
                               const cc = costCenters.find(c => c.id === alloc.cost_center_id);
                               return (
                                 <div key={index} className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5">
                                   <span className="opacity-75">{cc?.name || 'Geral'}:</span>
                                   <span className={alloc.amount < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                                     {formatCurrency(alloc.amount)}
                                   </span>
                                 </div>
                               )
                            })}
                          </div>
                        )}
                    </td>

                    {/* Saldo */}
                    {currentBalance !== undefined && (
                        <td className={`px-6 py-4 text-right align-top ${isExtrato ? 'border-b border-slate-100' : ''}`}>
                            {t.is_balance_line ? (
                                <div className={`text-sm font-black mt-1 ${isExtrato ? 'text-slate-700' : 'text-slate-800'}`}>
                                    {formatCurrency(t.amount)}
                                </div>
                            ) : (
                                <div className={`text-sm font-bold mt-1 ${transactionBalances[t.id] < 0 ? 'text-rose-600' : (isExtrato ? 'text-slate-600' : 'text-slate-600')}`}>
                                    {formatCurrency(transactionBalances[t.id])}
                                </div>
                            )}
                        </td>
                    )}

                    {/* Detalhes / Ação */}
                    <td className={`px-6 py-4 text-right align-top ${isExtrato ? 'border-b border-slate-100' : ''}`}>
                        {isExtrato ? (
                          <div className="flex items-center justify-end mt-1">
                            {!t.is_balance_line && (
                              <button className="text-rose-400 hover:text-rose-600 transition-colors">
                                <Info size={18} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                              {!t.is_balance_line && onEdit && (
                                  <button 
                                      onClick={() => onEdit(t)}
                                      className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-90"
                                      title="Editar"
                                  >
                                      <Pencil size={16} />
                                  </button>
                              )}
                              <button 
                                  onClick={() => onDelete(t.id)}
                                  className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all active:scale-90"
                                  title="Excluir"
                              >
                                  <Trash2 size={16} />
                              </button>
                          </div>
                        )}
                    </td>
                </motion.tr>
              );
          })}
        </AnimatePresence>
        {hasMore && onShowMore && (
          <tr>
            <td colSpan={10} className="p-6 text-center bg-slate-50/30">
              <button 
                onClick={onShowMore} 
                className="px-6 py-2.5 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-xl transition-all shadow-sm"
              >
                Carregar mais transações...
              </button>
            </td>
          </tr>
        )}
        </>
      );
  };

  const TableHeader = () => {
    const isExtrato = variant === 'extrato';
    
    return (
      <thead className={`${isExtrato ? 'bg-slate-100/50' : 'bg-slate-50'} text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100`}>
        <tr>
            <th className="px-6 py-4 w-24 text-left">{isExtrato ? 'data' : 'Data'}</th>
            <th className="px-6 py-4 text-left">{isExtrato ? 'lançamentos' : 'Lançamento'}</th>
            {!isExtrato && showInstallments && <th className="px-6 py-4 text-left">Parcela</th>}
            {!isExtrato && <th className="px-6 py-4 text-left">Categoria</th>}
            {!isExtrato && <th className="px-6 py-4 text-left">Centro de Custo</th>}
            <th className="px-6 py-4 text-right">{isExtrato ? 'valor (R$)' : 'Valor'}</th>
            {currentBalance !== undefined && <th className="px-6 py-4 text-right">{isExtrato ? 'saldo (R$)' : 'Saldo'}</th>}
            <th className="px-6 py-4 text-right">{isExtrato ? 'detalhes' : 'Ação'}</th>
        </tr>
      </thead>
    );
  };

  if (viewMode === 'statement') {
    // Sort oldest to newest for statement
    const sortedAsc = [...(transactions || [])].sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
    
    const statementRows: any[] = [];
    
    if (sortedAsc.length > 0) {
      const firstTx = sortedAsc[0];
      const firstTxBalance = transactionBalances ? transactionBalances[firstTx.id] : 0;
      const initialBalance = firstTx.is_balance_line ? firstTxBalance : firstTxBalance - (firstTx.amount || 0);
      
      statementRows.push({
        type: 'saldo_anterior',
        id: 'saldo_anterior',
        date: firstTx.date,
        description: 'SALDO ANTERIOR',
        balance: initialBalance
      });
    }

    let currentDay = '';
    let lastBalanceOfDay = 0;
    
    sortedAsc.forEach((t, index) => {
      const txDay = (t.date || '').slice(0, 10);
      const txBalance = transactionBalances ? transactionBalances[t.id] : 0;
      
      if (currentDay && txDay !== currentDay) {
        statementRows.push({
          type: 'saldo_dia',
          id: `saldo_dia_${currentDay}`,
          date: currentDay,
          description: 'SALDO TOTAL DISPONÍVEL DIA',
          balance: lastBalanceOfDay
        });
      }
      
      currentDay = txDay;
      lastBalanceOfDay = txBalance;
      
      statementRows.push({
        type: 'transaction',
        data: t,
        balance: txBalance,
        txIndex: index
      });
      
      if (index === sortedAsc.length - 1) {
        statementRows.push({
          type: 'saldo_dia',
          id: `saldo_dia_${currentDay}`,
          date: currentDay,
          description: 'SALDO TOTAL DISPONÍVEL DIA',
          balance: txBalance
        });
      }
    });

    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 dark:border-slate-700">
              <tr>
                  <th className="px-6 py-4 w-24 text-left">data</th>
                  <th className="px-6 py-4 text-left">lançamentos</th>
                  <th className="px-6 py-4 text-right">valor (R$)</th>
                  <th className="px-6 py-4 text-right">saldo (R$)</th>
                  <th className="px-6 py-4 text-center">detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {statementRows.map((row, index) => {
                const isBalanceRow = row.type === 'saldo_anterior' || row.type === 'saldo_dia';
                const rowBg = isBalanceRow ? 'bg-slate-100/60' : (row.txIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/40');
                
                if (isBalanceRow) {
                  return (
                    <tr key={row.id} className={`${rowBg} border-y border-slate-100`}>
                      <td className="px-6 py-3 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{formatDate(row.date, 'dd/MM/yyyy')}</td>
                      <td className="px-6 py-3 text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                        {row.description}
                        <Info size={12} className="text-blue-400" />
                      </td>
                      <td className="px-6 py-3 text-right"></td>
                      <td className="px-6 py-3 text-sm font-bold text-slate-800 text-right">{formatCurrency(row.balance)}</td>
                      <td className="px-6 py-3"></td>
                    </tr>
                  );
                }

                const t = row.data;
                const isExpense = t.amount < 0;
                return (
                  <tr key={t.id} className={`group ${rowBg} hover:bg-slate-50 transition-colors`}>
                    <td className="px-6 py-3 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{formatDate(t.date, 'dd/MM/yyyy')}</td>
                    <td className="px-6 py-3 text-xs text-slate-700 uppercase">{t.description}</td>
                    <td className={`px-6 py-3 text-sm text-right font-medium ${isExpense ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="px-6 py-3 text-right"></td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                         <button className="text-rose-400 hover:text-rose-600 transition-colors group-hover:hidden">
                           <ChevronDown size={18} />
                         </button>
                         <div className="hidden group-hover:flex items-center gap-1">
                           {onEdit && (
                               <button onClick={() => onEdit(t)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors"><Pencil size={14} /></button>
                           )}
                           <button onClick={() => onDelete(t.id)} className="p-1 text-slate-400 hover:text-rose-600 transition-colors"><Trash2 size={14} /></button>
                         </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {statementRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">Nenhum lançamento encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (viewMode === 'tabs') {
    const transactionsInMonth = selectedMonth ? (grouped[selectedMonth] || []) : [];
    const total = transactionsInMonth.reduce((sum, t) => sum + (t.is_balance_line ? 0 : (t.amount || 0)), 0);

    return (
      <div className="space-y-6">
         {/* Month Tabs - Visual Simplified */}
         <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {sortedMonthKeys.map(monthKey => {
                const [year, month] = monthKey.split('-');
                const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
                const isSelected = selectedMonth === monthKey;
                
                return (
                    <button
                        key={monthKey}
                        onClick={() => setSelectedMonth(monthKey)}
                        className={`flex items-center justify-center min-w-[120px] px-6 py-4 rounded-2xl border transition-all ${
                            isSelected 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100 scale-105' 
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        <span className="text-sm font-black capitalize">
                            {formatDate(dateObj, 'MMMM')}
                        </span>
                    </button>
                )
            })}
         </div>

         {/* Selected Month Content */}
         {selectedMonth && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in duration-300">
                 <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                       <Calendar size={18} className="text-slate-400 dark:text-slate-500" />
                       <h3 className="font-bold text-slate-800 capitalize">
                           {formatDate(new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]) - 1, 1), 'MMMM yyyy')}
                       </h3>
                    </div>
                    <div className={`font-black ${total < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                       {formatCurrency(total)}
                    </div>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                        <TableHeader />
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                            {transactionsInMonth.length > 0 ? (
                                renderTableRows(transactionsInMonth, displayLimit, () => setDisplayLimit(l => l + 50))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-400 dark:text-slate-500">Nenhum lançamento neste mês.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                 </div>
            </div>
         )}
      </div>
    );
  }

  if (viewMode === 'continuous') {
    // Sort month keys descending for continuous view (newest first)
    const descendingMonthKeys = [...sortedMonthKeys].reverse();
    
    // Calculate running balances
    // We need to calculate the balance at the start of each month.
    // Since we are showing transactions for a specific account (or all accounts),
    // and we only have the *current* balance of the accounts, we have to work backwards.
    // However, a simpler approach for a transaction list is just to show the net flow (which we already do)
    // and if we want to show "Saldo Inicial" and "Saldo Final", we need to know the current total balance
    // and subtract the transactions to find historical balances.
    
    // Let's assume the user wants to see the balance progression.
    // We will calculate a running balance from the oldest to the newest transaction.
    // But since we are displaying newest to oldest, we'll calculate it and store it in a map.
    
    // For a true "Saldo Inicial" and "Saldo Final", we need the current balance of the filtered account(s).
    // Since we don't have the current balance passed as a prop, we will calculate a "Saldo Acumulado" 
    // based purely on the transactions shown, starting from 0 for the oldest transaction.
    // Alternatively, we can just show the total income and total expense for the month.
    
    // Let's calculate the running balance starting from the current balance and working backwards.
    // The current balance is the balance AFTER all transactions in the descendingMonthKeys have been applied.
    // So, if we iterate from newest to oldest, the final balance of the newest month is the current balance.
    // The initial balance of the newest month is (final balance - month total).
    // This initial balance becomes the final balance of the previous (older) month.
    
    let currentBal = currentBalance !== undefined ? currentBalance : 0;
    const monthlyBalances: Record<string, { initial: number, final: number }> = {};
    
    // Iterate from newest to oldest month
    descendingMonthKeys.forEach(monthKey => {
        const transactionsInMonth = grouped[monthKey] || [];
        const monthTotal = transactionsInMonth.reduce((sum, t) => sum + (t.is_balance_line ? 0 : (t.amount || 0)), 0);
        
        monthlyBalances[monthKey] = {
            initial: currentBal - monthTotal,
            final: currentBal
        };
        
        currentBal -= monthTotal;
    });

    const visibleMonths = descendingMonthKeys.slice(0, displayMonthsLimit);
    const hasMoreMonths = displayMonthsLimit < descendingMonthKeys.length;

    return (
      <div className="space-y-8">
        {visibleMonths.map(monthKey => {
          const transactionsInMonth = grouped[monthKey] || [];
          const total = transactionsInMonth.reduce((sum, t) => sum + (t.is_balance_line ? 0 : (t.amount || 0)), 0);
          const [year, month] = monthKey.split('-');
          const balances = monthlyBalances[monthKey];
          
          return (
            <div key={monthKey} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                 <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-2">
                       <Calendar size={18} className="text-slate-400 dark:text-slate-500" />
                       <h3 className="font-bold text-slate-800 capitalize">
                           {formatDate(new Date(parseInt(year), parseInt(month) - 1, 1), 'MMMM yyyy')}
                       </h3>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Saldo Inicial</span>
                            <span className={`font-bold ${balances.initial < 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                                {formatCurrency(balances.initial)}
                            </span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Movimentação</span>
                            <span className={`font-black ${total < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {total > 0 ? '+' : ''}{formatCurrency(total)}
                            </span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Saldo Final</span>
                            <span className={`font-bold ${balances.final < 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                                {formatCurrency(balances.final)}
                            </span>
                        </div>
                    </div>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                        <TableHeader />
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                            {transactionsInMonth.length > 0 ? (
                                renderTableRows(transactionsInMonth)
                            ) : (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-400 dark:text-slate-500">Nenhum lançamento neste mês.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                 </div>
            </div>
          );
        })}
        {hasMoreMonths && (
          <div className="text-center pt-2 pb-6">
            <button 
              onClick={() => setDisplayMonthsLimit(l => l + 3)} 
              className="px-6 py-3 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-bold rounded-xl transition-all shadow-sm"
            >
              Carregar meses anteriores...
            </button>
          </div>
        )}
      </div>
    );
  }

  // Default List View (Recent Activity)
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <TableHeader />
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
            {renderTableRows(transactions, displayLimit, () => setDisplayLimit(l => l + 50))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionList;