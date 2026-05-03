import React from 'react';
import { CreditCard as CardIcon } from 'lucide-react';
import { CreditCard } from '../types';
import { formatCurrency, getDaysUntil, addMonths } from '../utils/financeUtils';

interface CreditCardWidgetProps {
  card: CreditCard;
  currentBill: number;
}

const CreditCardWidget: React.FC<CreditCardWidgetProps> = ({ card, currentBill }) => {
  const usagePercent = Math.min((currentBill / card.limit_amount) * 100, 100);

  const barColor =
    usagePercent < 30 ? 'bg-emerald-500' :
    usagePercent < 70 ? 'bg-amber-500' : 'bg-rose-500';

  const statusText =
    usagePercent > 80 ? 'Uso Alto' : 'Saudável';

  const statusColor =
    usagePercent > 80
      ? 'text-rose-600 dark:text-rose-400'
      : 'text-emerald-600 dark:text-emerald-400';

  const now = new Date();
  let closingDate = new Date(now.getFullYear(), now.getMonth(), card.closing_day);
  if (now > closingDate) closingDate = addMonths(closingDate, 1);
  const daysUntilClose = getDaysUntil(closingDate);

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 group hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-3">
          <div className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300">
            <CardIcon size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white">{card.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Ciclo: {card.closing_day} – {card.due_day}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-end mb-1.5">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {formatCurrency(currentBill)}
            </span>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
              de {formatCurrency(card.limit_amount)}
            </span>
          </div>
          <div className="h-2 w-full bg-slate-100 dark:bg-slate-600 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${barColor}`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>

        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl">
          <div className="text-xs">
            <p className="text-slate-400 dark:text-slate-500 font-medium">Fecha em</p>
            <p className="font-bold text-slate-800 dark:text-white">{daysUntilClose} dias</p>
          </div>
          <div className="text-right">
            <p className="text-slate-400 dark:text-slate-500 font-medium">Status</p>
            <p className={`font-bold uppercase tracking-wider text-[10px] ${statusColor}`}>
              {statusText}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditCardWidget;
