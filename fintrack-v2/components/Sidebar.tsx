import React from 'react';
import { LayoutDashboard, CreditCard as CardIcon, Wallet, PieChart, Settings, Sparkles, Target } from 'lucide-react';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`
      w-full flex items-center py-3 rounded-xl transition-all duration-200 group relative
      justify-start px-4 active:scale-95
      lg:justify-center lg:px-0
      lg:group-hover/sidebar:justify-start lg:group-hover/sidebar:px-4
      ${active
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900'
        : 'text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400'}
    `}
  >
    <div className={`transition-transform duration-200 shrink-0 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
      {icon}
    </div>
    <div className={`
      overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out
      w-auto opacity-100 ml-4
      lg:w-0 lg:opacity-0 lg:ml-0
      lg:group-hover/sidebar:w-40 lg:group-hover/sidebar:opacity-100 lg:group-hover/sidebar:ml-4
    `}>
      <span className="font-bold text-sm block text-left">{label}</span>
    </div>
  </button>
);

interface SidebarProps {
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (isOpen: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const NAV_ITEMS = [
  { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
  { id: 'cards', icon: <CardIcon size={20} />, label: 'Cartões' },
  { id: 'accounts', icon: <Wallet size={20} />, label: 'Contas' },
  { id: 'budgets', icon: <Target size={20} />, label: 'Orçamento' },
  { id: 'reports', icon: <PieChart size={20} />, label: 'Relatórios' },
  { id: 'settings', icon: <Settings size={20} />, label: 'Ajustes' },
];

const Sidebar: React.FC<SidebarProps> = ({ isMobileSidebarOpen, setIsMobileSidebarOpen, activeTab, setActiveTab }) => {
  const navigate = (tab: string) => {
    setActiveTab(tab);
    setIsMobileSidebarOpen(false);
  };

  return (
    <>
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
        transform transition-all duration-300 ease-in-out flex flex-col group/sidebar
        w-64 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        lg:w-20 lg:hover:w-64
      `}>
        <div className="p-6 flex items-center gap-3 justify-center lg:justify-start lg:pl-5 overflow-hidden whitespace-nowrap">
          <div className="w-8 h-8 bg-slate-900 dark:bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0">
            <Sparkles size={18} />
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white transition-opacity duration-300 lg:opacity-0 lg:w-0 lg:group-hover/sidebar:opacity-100 lg:group-hover/sidebar:w-auto">
            FinTrack
          </span>
        </div>

        <nav className="flex-1 px-4 space-y-2 py-4">
          {NAV_ITEMS.map(item => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              onClick={() => navigate(item.id)}
            />
          ))}
        </nav>

        <div className="px-4 pb-6 text-center overflow-hidden">
          <p className="text-[10px] text-slate-400 dark:text-slate-600 lg:opacity-0 lg:group-hover/sidebar:opacity-100 transition-opacity">
            FinTrack Elite v2.0
          </p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
