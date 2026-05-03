import React from 'react';

interface SummaryCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  trendPositive?: boolean;
  onClick?: () => void;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, icon, trend, trendPositive, onClick }) => (
  <div
    onClick={onClick}
    className={`
      bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700
      flex flex-col justify-between h-full transition-all hover:shadow-md active:scale-[0.98]
      ${onClick ? 'cursor-pointer' : ''}
    `}
  >
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">{icon}</div>
      {trend && (
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
          trendPositive === false
            ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
            : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
        }`}>
          {trend}
        </span>
      )}
    </div>
    <div>
      <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <h3 className="text-2xl font-black text-slate-900 dark:text-white">{value}</h3>
    </div>
  </div>
);

export default SummaryCard;
