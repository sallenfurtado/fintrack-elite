import React from 'react';
import { Landmark, Trash2, Pencil, Plus, Eye, EyeOff, AlignJustify, CalendarRange, ListFilter, Filter } from 'lucide-react';
import { formatCurrency } from '../utils/financeUtils';
import CreditCardWidget from './CreditCardWidget';
import TransactionList from './TransactionList';
import { Transaction, CreditCard, Category, CostCenter } from '../types';

interface CardsViewProps {
  searchFilteredTransactions: Transaction[];
  creditCards: CreditCard[];
  stats: any;
  selectedCardId: string | null;
  setSelectedCardId: (id: string | null) => void;
  setEditingCard: (card: CreditCard | null) => void;
  setIsCardFormOpen: (isOpen: boolean) => void;
  deleteCreditCard: (id: string) => void;
  handleDeleteAllCards: () => void;
  setCleanupTargetId: (id: string) => void;
  setIsCleanupModalOpen: (isOpen: boolean) => void;
  showBalanceLines: boolean;
  setShowBalanceLines: (show: boolean) => void;
  viewMode: 'list' | 'month' | 'statement';
  setViewMode: (mode: 'list' | 'month' | 'statement') => void;
  categories: Category[];
  costCenters: CostCenter[];
  deleteTransaction: (id: string) => void;
  handleEditTransaction: (tx: Transaction) => void;
  onOpenFilter: () => void;
  hasActiveFilters: boolean;
}

const CardsView: React.FC<CardsViewProps> = ({
  searchFilteredTransactions,
  creditCards,
  stats,
  selectedCardId,
  setSelectedCardId,
  setEditingCard,
  setIsCardFormOpen,
  deleteCreditCard,
  handleDeleteAllCards,
  setCleanupTargetId,
  setIsCleanupModalOpen,
  showBalanceLines,
  setShowBalanceLines,
  viewMode,
  setViewMode,
  categories,
  costCenters,
  deleteTransaction,
  handleEditTransaction,
  onOpenFilter,
  hasActiveFilters
}) => {
  const filteredTransactions = searchFilteredTransactions.filter(t => selectedCardId ? t.card_id === selectedCardId : t.card_id !== undefined);
  const selectedCard = selectedCardId ? creditCards.find(c => c.id === selectedCardId) : null;
  const selectedCardName = selectedCard ? selectedCard.name : 'Visão Geral';

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Limite Total Global</p>
            <p className="text-3xl font-black mb-4">{formatCurrency(stats.totalCreditLimit)}</p>
            <div className="flex gap-4">
              <div><p className="text-[10px] text-slate-400 uppercase">Utilizado</p><p className="text-sm font-bold text-rose-400">{formatCurrency(stats.totalCreditBill)}</p></div>
              <div><p className="text-[10px] text-slate-400 uppercase">Disponível</p><p className="text-sm font-bold text-emerald-400">{formatCurrency(stats.availableCredit)}</p></div>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4"><Landmark size={120} /></div>
        </div>
        <div className="md:col-span-2 space-y-4">
           <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-800 dark:text-white">Meus Cartões</h3>
              {creditCards.length > 0 && (
                <button 
                  onClick={handleDeleteAllCards}
                  className="flex items-center gap-1.5 px-3 py-1.5 btn-tactile-danger text-xs font-bold rounded-xl"
                >
                  <Trash2 size={14} /> Limpar Todos
                </button>
              )}
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
             {stats.creditLiabilityPerCard.map(({ card, bill }: any) => (
               <div key={card.id} onClick={() => setSelectedCardId(selectedCardId === card.id ? null : card.id)} className={`relative cursor-pointer transition-all duration-300 transform group rounded-2xl overflow-hidden ${selectedCardId === card.id ? 'ring-2 ring-blue-500 scale-[1.02] shadow-xl' : 'hover:scale-[1.01] hover:shadow-md'}`}>
                 <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={(e) => { e.stopPropagation(); setEditingCard(card); setIsCardFormOpen(true); }} className="p-1.5 bg-white dark:bg-slate-800 shadow-sm rounded-full text-slate-500 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50"><Pencil size={14} /></button>
                   <button onClick={(e) => { e.stopPropagation(); if (window.confirm('Excluir este cartão?')) deleteCreditCard(card.id); }} className="p-1.5 bg-white dark:bg-slate-800 shadow-sm rounded-full text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50"><Trash2 size={14} /></button>
                 </div>
                 <CreditCardWidget card={card} currentBill={bill} />
               </div>
             ))}
             <div onClick={() => { setEditingCard(null); setIsCardFormOpen(true); }} className="border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6 text-slate-400 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50 transition-all cursor-pointer min-h-[160px]"><Plus size={32} className="mb-2" /><span className="text-sm font-bold">Adicionar Cartão</span></div>
           </div>
        </div>
      </div>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div><h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">{selectedCardId ? `Fatura: ${selectedCardName}` : 'Todas as Faturas'}</h2><p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{selectedCardId ? 'Listando apenas despesas deste cartão.' : 'Consolidado de todas as transações de crédito.'}</p></div>
           <div className="flex flex-wrap items-center gap-2">
             <button 
               onClick={() => {
                 setCleanupTargetId(selectedCardId || 'all');
                 setIsCleanupModalOpen(true);
               }}
               className="flex items-center gap-1.5 px-3 py-1.5 btn-tactile-danger text-xs font-bold rounded-xl"
               title="Limpar dados por período"
             >
               <Trash2 size={14} /> Limpar Dados
             </button>
             <button 
               onClick={() => setShowBalanceLines(!showBalanceLines)}
               className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all rounded-xl ${showBalanceLines ? 'bg-slate-800 text-white hover:bg-slate-700' : 'btn-tactile-white text-slate-500 dark:text-slate-400'}`}
               title="Ocultar/Exibir linhas de saldo"
             >
               {showBalanceLines ? <Eye size={14} /> : <EyeOff size={14} />}
             </button>
             <div className="flex bg-slate-100 p-1 rounded-xl">
               <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}><AlignJustify size={16} /></button>
               <button onClick={() => setViewMode('month')} className={`p-1.5 rounded-xl transition-all ${viewMode === 'month' ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}><CalendarRange size={16} /></button>
             </div>
             <button 
               onClick={onOpenFilter}
               className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all rounded-xl ${hasActiveFilters ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200' : 'btn-tactile-white text-slate-500 dark:text-slate-400'}`}
             >
               <Filter size={14} />Filtrar
               {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-white dark:bg-slate-800 ml-1 animate-pulse"></span>}
             </button>
             {selectedCardId && <button onClick={() => setSelectedCardId(null)} className="px-3 py-1.5 btn-tactile-white text-xs font-bold flex items-center gap-2"><ListFilter size={14} />Limpar Filtro</button>}
           </div>
        </div>
        <TransactionList transactions={filteredTransactions} categories={categories} costCenters={costCenters} onDelete={deleteTransaction} onEdit={handleEditTransaction} viewMode={viewMode === 'month' ? 'tabs' : 'list'} />
      </div>
    </div>
  );
};

export default CardsView;
