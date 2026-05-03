import React from 'react';
import { Menu, Search, X, Plus, Sparkles, Bell, Clock, CalendarDays, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { AppNotification } from '../hooks/useNotifications';

const TAB_LABELS: Record<string, string> = {
  dashboard: 'Visão Geral',
  cards: 'Cartões de Crédito',
  accounts: 'Contas Bancárias',
  budgets: 'Metas de Orçamento',
  reports: 'Relatórios',
  settings: 'Configurações',
};

interface HeaderProps {
  activeTab: string;
  setIsMobileSidebarOpen: (isOpen: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setEditingTransaction: (tx: any) => void;
  setIsFormOpen: (isOpen: boolean) => void;
  selectedCardId: string | null;
  selectedAccountId: string | null;
  setIsReconModalOpen: (isOpen: boolean) => void;
  notificationRef: React.RefObject<HTMLDivElement>;
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
  notifications: AppNotification[];
  hasUnread: boolean;
  onMarkAllRead: () => void;
}

const Header: React.FC<HeaderProps> = ({
  activeTab,
  setIsMobileSidebarOpen,
  searchQuery,
  setSearchQuery,
  setEditingTransaction,
  setIsFormOpen,
  selectedCardId,
  selectedAccountId,
  setIsReconModalOpen,
  notificationRef,
  showNotifications,
  setShowNotifications,
  notifications,
  hasUnread,
  onMarkAllRead,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const showReconcile = (activeTab === 'cards' && selectedCardId) || (activeTab === 'accounts' && selectedAccountId);

  return (
    <header className="min-h-16 h-auto md:h-16 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between px-6 py-4 md:py-0 shrink-0 gap-4 transition-colors">
      <div className="flex items-center gap-4 w-full md:w-auto">
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="lg:hidden p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-lg font-bold text-slate-800 dark:text-white capitalize truncate">
          {TAB_LABELS[activeTab] ?? activeTab}
        </h1>
      </div>

      {/* Search bar */}
      <div className="flex-1 max-w-md w-full md:mx-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Buscar transação, categoria ou valor..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-700 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
        {/* New transaction */}
        <button
          onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }}
          className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-[0_4px_0_0_#1e40af] hover:shadow-[0_2px_0_0_#1e40af] active:shadow-none active:translate-y-1 transition-all"
        >
          <Plus size={16} /> Novo Lançamento
        </button>

        {/* Reconcile button */}
        {showReconcile && (
          <button
            onClick={() => setIsReconModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl whitespace-nowrap shadow-[0_4px_0_0_#1e40af] hover:shadow-[0_2px_0_0_#1e40af] active:shadow-none active:translate-y-1 transition-all"
          >
            <Sparkles size={14} /> Conciliar {activeTab === 'cards' ? 'Fatura' : 'Extrato'}
          </button>
        )}

        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
          title={isDark ? 'Modo claro' : 'Modo escuro'}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => {
              if (!showNotifications && hasUnread) onMarkAllRead();
              setShowNotifications(!showNotifications);
            }}
            className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl relative transition-colors"
          >
            <Bell size={20} />
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Notificações</span>
                <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 rounded text-[10px] font-bold">{notifications.length}</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">Nenhuma notificação nova.</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors">
                      <div className="flex gap-3">
                        <div className={`p-2 rounded-full h-fit ${n.type === 'CLOSING' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-500' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-500'}`}>
                          {n.type === 'CLOSING' ? <Clock size={16} /> : <CalendarDays size={16} />}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 dark:text-white">{n.title}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{n.description}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center text-xs font-bold ring-2 ring-slate-100 dark:ring-slate-700 hidden sm:flex">
          FT
        </div>
      </div>
    </header>
  );
};

export default Header;
