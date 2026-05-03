import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { formatCurrency } from '../utils/financeUtils';
import { Transaction, Category, TransactionType, CostCenter } from '../types';

interface ReportsViewProps {
  transactions: Transaction[];
  categories: Category[];
  costCenters: CostCenter[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700">
        <p className="font-bold text-slate-800 dark:text-white mb-1">{label || payload[0].name}</p>
        <p className="text-sm font-medium" style={{ color: payload[0].payload.color || payload[0].fill }}>
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

const ReportsView: React.FC<ReportsViewProps> = ({ transactions, categories, costCenters }) => {
  // Calculate data for charts
  const expensesByCategory = categories
    .filter(c => c.type === TransactionType.EXPENSE)
    .map(c => {
      const total = transactions
        .filter(t => !t.is_balance_line && t.category_id === c.id && t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      return { name: c.name, value: total, color: c.color_hex };
    })
    .filter(c => c.value > 0)
    .sort((a, b) => b.value - a.value);

  const incomeByCategory = categories
    .filter(c => c.type === TransactionType.INCOME)
    .map(c => {
      const total = transactions
        .filter(t => !t.is_balance_line && t.category_id === c.id && t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);
      return { name: c.name, value: total, color: c.color_hex };
    })
    .filter(c => c.value > 0)
    .sort((a, b) => b.value - a.value);

  const totalExpenses = expensesByCategory.reduce((sum, item) => sum + item.value, 0);
  const totalIncome = incomeByCategory.reduce((sum, item) => sum + item.value, 0);

  // Define a color palette for cost centers
  const COST_CENTER_COLORS = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
    '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#6366f1'
  ];

  // Calculate expenses by cost center
  const expensesByCostCenter = costCenters.map((cc, index) => {
    let total = 0;
    transactions.forEach(t => {
      if (t.is_balance_line || t.amount >= 0) return;
      
      if (t.allocations && t.allocations.length > 0) {
        const alloc = t.allocations.find(a => a.cost_center_id === cc.id);
        if (alloc) {
          total += Math.abs(alloc.amount);
        }
      } else if (t.cost_center_id === cc.id) {
        total += Math.abs(t.amount);
      }
    });
    
    // Use the assigned color_hex, or pick from the palette based on index
    const color = cc.color_hex || COST_CENTER_COLORS[index % COST_CENTER_COLORS.length];
    
    return { name: cc.name, value: total, color };
  })
  .filter(cc => cc.value > 0)
  .sort((a, b) => b.value - a.value);

  // Calculate unallocated expenses
  let unallocatedTotal = 0;
  transactions.forEach(t => {
    if (t.is_balance_line || t.amount >= 0) return;
    if (!t.allocations?.length && !t.cost_center_id) {
      unallocatedTotal += Math.abs(t.amount);
    }
  });

  if (unallocatedTotal > 0) {
    expensesByCostCenter.push({ name: 'Sem Centro de Custo', value: unallocatedTotal, color: '#94a3b8' });
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Expenses Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col">
          <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2">Despesas por Categoria</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Distribuição dos seus gastos</p>
          {expensesByCategory.length > 0 ? (
            <div className="h-80 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={6}
                  >
                    {expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 500 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-slate-400 text-sm italic bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
              Nenhum dado de despesa para exibir.
            </div>
          )}
        </div>

        {/* Income Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col">
          <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2">Receitas por Categoria</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Origem dos seus ganhos</p>
          {incomeByCategory.length > 0 ? (
            <div className="h-80 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={incomeByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={6}
                  >
                    {incomeByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 500 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-slate-400 text-sm italic bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
              Nenhum dado de receita para exibir.
            </div>
          )}
        </div>
      </div>

      {/* Cost Center Chart - Full Width Bar Chart */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
        <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2">Despesas por Centro de Custo</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Análise detalhada por área ou projeto</p>
        {expensesByCostCenter.length > 0 ? (
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={expensesByCostCenter}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" tickFormatter={(value) => `R$ ${value}`} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" width={150} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} fontWeight={500} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={32}>
                  {expensesByCostCenter.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center text-slate-400 text-sm italic bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
            Nenhum dado de despesa para exibir.
          </div>
        )}
      </div>

      {/* Summary Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Summary Table */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50/50">
            <h3 className="text-lg font-black text-slate-800 dark:text-white">Resumo por Categoria</h3>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white dark:bg-slate-800 text-slate-400 text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                  <th className="p-4 font-bold">Categoria</th>
                  <th className="p-4 font-bold">Tipo</th>
                  <th className="p-4 font-bold text-right">Valor Total</th>
                  <th className="p-4 font-bold text-right">%</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {expensesByCategory.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 dark:bg-slate-700/50/80 transition-colors">
                    <td className="p-4 font-bold text-slate-700 flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></div>
                      {item.name}
                    </td>
                    <td className="p-4 text-rose-500 font-medium text-xs">Despesa</td>
                    <td className="p-4 text-right font-black text-slate-800 dark:text-white">{formatCurrency(item.value)}</td>
                    <td className="p-4 text-right text-slate-400 font-medium">{((item.value / totalExpenses) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
                {incomeByCategory.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 dark:bg-slate-700/50/80 transition-colors">
                    <td className="p-4 font-bold text-slate-700 flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></div>
                      {item.name}
                    </td>
                    <td className="p-4 text-emerald-500 font-medium text-xs">Receita</td>
                    <td className="p-4 text-right font-black text-slate-800 dark:text-white">{formatCurrency(item.value)}</td>
                    <td className="p-4 text-right text-slate-400 font-medium">{((item.value / totalIncome) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cost Center Summary Table */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50/50">
            <h3 className="text-lg font-black text-slate-800 dark:text-white">Resumo por Centro de Custo</h3>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white dark:bg-slate-800 text-slate-400 text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                  <th className="p-4 font-bold">Centro de Custo</th>
                  <th className="p-4 font-bold text-right">Valor Total</th>
                  <th className="p-4 font-bold text-right">%</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {expensesByCostCenter.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 dark:bg-slate-700/50/80 transition-colors">
                    <td className="p-4 font-bold text-slate-700 flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></div>
                      {item.name}
                    </td>
                    <td className="p-4 text-right font-black text-slate-800 dark:text-white">{formatCurrency(item.value)}</td>
                    <td className="p-4 text-right text-slate-400 font-medium">{((item.value / totalExpenses) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsView;
