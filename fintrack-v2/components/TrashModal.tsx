import React from 'react';
import { Trash2, X, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/financeUtils';
import { Transaction } from '../types';

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  deletedTransactions: Transaction[];
  onRestore: (id: string) => void;
  onEmptyTrash: () => void;
  setConfirmModal: (modal: {
    isOpen: boolean;
    title: string;
    message: string;
    isDangerous?: boolean;
    onConfirm: () => void;
  }) => void;
}

const TrashModal: React.FC<TrashModalProps> = ({
  isOpen,
  onClose,
  deletedTransactions,
  onRestore,
  onEmptyTrash,
  setConfirmModal
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-200 text-slate-600 rounded-xl">
              <Trash2 size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">Lixeira</h2>
              <p className="text-xs font-bold text-slate-500">{deletedTransactions?.length || 0} itens apagados</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {(!deletedTransactions || deletedTransactions.length === 0) ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center p-4 bg-slate-50 rounded-full text-slate-400 mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Lixeira Vazia</h3>
              <p className="text-slate-500 mt-1 text-sm">Nenhuma transação foi apagada recentemente.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deletedTransactions.map(t => (
                <div key={t.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${t.amount < 0 ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                      {t.amount < 0 ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm line-clamp-1">{t.description}</p>
                      <p className="text-xs text-slate-500">{formatDate(t.date, 'dd/MM/yyyy')} • {t.account_id ? 'Conta' : 'Cartão'}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                    <span className={`font-bold ${t.amount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {formatCurrency(t.amount)}
                    </span>
                    <button
                      onClick={() => onRestore(t.id)}
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors shrink-0"
                    >
                      Restaurar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
          <button
            onClick={onClose}
            className="py-2.5 px-6 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
          >
            Fechar
          </button>
          {deletedTransactions && deletedTransactions.length > 0 && (
            <button
              onClick={() => {
                setConfirmModal({
                  isOpen: true,
                  title: 'Esvaziar Lixeira',
                  message: 'Tem certeza que deseja apagar permanentemente todas as transações da lixeira? Esta ação não pode ser desfeita.',
                  isDangerous: true,
                  onConfirm: () => {
                    onEmptyTrash();
                    onClose();
                  }
                });
              }}
              className="py-2.5 px-6 btn-tactile-danger rounded-xl text-sm font-bold flex items-center gap-2"
            >
              <Trash2 size={16} /> Esvaziar Lixeira
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrashModal;
