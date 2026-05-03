import React, { useMemo, useState } from 'react';
import { 
  ComposedChart, 
  Bar, 
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  Cell,
  ReferenceLine
} from 'recharts';
import { Download, Target } from 'lucide-react';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/financeUtils';

interface MonthlyFlowChartProps {
  transactions: Transaction[];
  onMonthClick?: (monthKey: string | null) => void;
  selectedMonth?: string | null;
}

const MonthlyFlowChart: React.FC<MonthlyFlowChartProps> = ({ transactions, onMonthClick, selectedMonth }) => {
  const [period, setPeriod] = useState<6 | 12 | 24>(12);
  const [savingsGoal, setSavingsGoal] = useState<number>(2000); // Default goal

  const data = useMemo(() => {
    const now = new Date();
    const months = [];
    
    // Calculate period
    for (let i = period - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = d.toISOString().slice(0, 7); // YYYY-MM
      const monthLabel = d.toLocaleString('pt-BR', { month: 'short' }) + '/' + d.getFullYear().toString().slice(-2);
      
      months.push({
        key: monthKey,
        label: monthLabel,
        income: 0,
        expense: 0,
        net: 0,
        accumulated: 0
      });
    }
    
    // Fill data
    transactions.forEach(t => {
      if (t.is_balance_line) return;
      const tMonth = t.date.slice(0, 7);
      const monthData = months.find(m => m.key === tMonth);
      if (monthData) {
        if (t.amount > 0) {
          monthData.income += t.amount;
        } else {
          monthData.expense += Math.abs(t.amount);
        }
      }
    });

    // Calculate net and accumulated
    let runningTotal = 0;
    months.forEach(m => {
      m.net = m.income - m.expense;
      runningTotal += m.net;
      m.accumulated = runningTotal;
    });
    
    return months;
  }, [transactions, period]);

  const handleChartClick = (state: any) => {
    if (state && state.activePayload && state.activePayload.length > 0) {
      const monthKey = state.activePayload[0].payload.key;
      if (onMonthClick) {
        onMonthClick(selectedMonth === monthKey ? null : monthKey);
      }
    }
  };

  const exportToCSV = () => {
    const headers = ['Mês', 'Receitas', 'Despesas', 'Líquido', 'Acumulado'];
    const rows = data.map(m => [
      m.label,
      m.income.toFixed(2),
      m.expense.toFixed(2),
      m.net.toFixed(2),
      m.accumulated.toFixed(2)
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `fluxo_mensal_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-[450px] w-full bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Fluxo Mensal</h3>
          <p className="text-sm text-slate-500">Receitas, despesas e saldo acumulado</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <Target size={14} className="text-indigo-500" />
            <input 
              type="number" 
              value={savingsGoal}
              onChange={(e) => setSavingsGoal(Number(e.target.value))}
              className="w-16 bg-transparent text-xs font-bold focus:outline-none"
              title="Meta de Economia Mensal"
            />
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl">
            {[6, 12, 24].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p as any)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all active:scale-95 ${
                  period === p 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {p}M
              </button>
            ))}
          </div>

          <button 
            onClick={exportToCSV}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all active:scale-90"
            title="Exportar CSV"
          >
            <Download size={18} />
          </button>
        </div>
      </div>
      
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            onClick={handleChartClick}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="label" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
              dy={10}
            />
            <YAxis 
              yAxisId="left"
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
              tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
              tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
              hide={period > 12}
            />
            <Tooltip 
              cursor={{ fill: '#f8fafc' }}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white p-4 rounded-xl shadow-xl border border-slate-100">
                      <p className="font-bold text-slate-800 mb-3">{label}</p>
                      {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-6 mb-1.5">
                          <span className="text-xs font-medium text-slate-500 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                            {entry.name}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {formatCurrency(entry.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend 
              verticalAlign="top" 
              align="right" 
              iconType="circle"
              iconSize={6}
              wrapperStyle={{ paddingBottom: '20px', fontSize: '11px', fontWeight: 600 }}
            />
            <ReferenceLine 
              yAxisId="left"
              y={savingsGoal} 
              label={{ value: 'Meta', position: 'right', fill: '#6366f1', fontSize: 10, fontWeight: 'bold' }} 
              stroke="#6366f1" 
              strokeDasharray="3 3" 
            />
            <Bar 
              yAxisId="left"
              name="Receitas" 
              dataKey="income" 
              fill="#10b981" 
              radius={[4, 4, 0, 0]} 
              barSize={period === 24 ? 8 : 16}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-income-${index}`} 
                  fill={selectedMonth && entry.key !== selectedMonth ? '#10b98140' : '#10b981'} 
                />
              ))}
            </Bar>
            <Bar 
              yAxisId="left"
              name="Despesas" 
              dataKey="expense" 
              fill="#ef4444" 
              radius={[4, 4, 0, 0]} 
              barSize={period === 24 ? 8 : 16}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-expense-${index}`} 
                  fill={selectedMonth && entry.key !== selectedMonth ? '#ef444440' : '#ef4444'} 
                />
              ))}
            </Bar>
            <Line
              yAxisId="left"
              type="monotone"
              name="Saldo Acumulado"
              dataKey="accumulated"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 2, fill: '#6366f1' }}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {selectedMonth && (
        <div className="mt-2 flex justify-center">
          <button 
            onClick={() => onMonthClick && onMonthClick(null)}
            className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full hover:bg-blue-100 transition-all active:scale-95"
          >
            Filtrando por {data.find(d => d.key === selectedMonth)?.label} • Limpar
          </button>
        </div>
      )}
    </div>
  );
};

export default MonthlyFlowChart;
