
import React, { useState, useEffect } from 'react';
import { X, Building2, Wallet, PiggyBank, AlertCircle } from 'lucide-react';
import { Account, AccountType } from '../types';

interface AccountFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Account, 'id' | 'is_archived'>) => void;
  onUpdate: (id: string, data: Partial<Account>) => void;
  initialData?: Account | null;
}

const AccountForm: React.FC<AccountFormProps> = ({ isOpen, onClose, onSubmit, onUpdate, initialData }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>(AccountType.CHECKING);
  const [balance, setBalance] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setType(initialData.type);
      setBalance(initialData.current_balance.toString());
    } else {
      setName('');
      setType(AccountType.CHECKING);
      setBalance('');
    }
    setErrors({});
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'O nome da conta é obrigatório';
    if (!balance.trim()) newErrors.balance = 'O saldo atual é obrigatório';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    const numericBalance = parseFloat(balance) || 0;
    
    if (initialData) {
      onUpdate(initialData.id, { name, type, current_balance: numericBalance });
    } else {
      onSubmit({ name, type, current_balance: numericBalance });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            {initialData ? 'Editar Conta' : 'Nova Conta'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 transition-all active:scale-90">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Nome da Conta</label>
            <input
              type="text"
              placeholder="Ex: Nubank, Carteira..."
              value={name}
              onChange={(e) => { setName(e.target.value); clearError('name'); }}
              className={`w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border rounded-xl focus:outline-none focus:ring-2 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 ${errors.name ? 'border-rose-300 focus:ring-rose-200 bg-rose-50 dark:bg-rose-900/20 dark:text-white' : 'border-slate-200 dark:border-slate-600 focus:ring-blue-500'}`}
            />
            {errors.name && <p className="text-rose-500 text-xs font-semibold flex items-center gap-1 mt-1"><AlertCircle size={12}/> {errors.name}</p>}
          </div>

          <div className="space-y-1">
             <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Tipo</label>
             <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setType(AccountType.CHECKING)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all active:scale-95 ${
                    type === AccountType.CHECKING ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Building2 size={20} className="mb-1" />
                  <span className="text-[10px] font-bold">Corrente</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType(AccountType.WALLET)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all active:scale-95 ${
                    type === AccountType.WALLET ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Wallet size={20} className="mb-1" />
                  <span className="text-[10px] font-bold">Carteira</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType(AccountType.SAVINGS)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all active:scale-95 ${
                    type === AccountType.SAVINGS ? 'bg-amber-50 border-amber-500 text-amber-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <PiggyBank size={20} className="mb-1" />
                  <span className="text-[10px] font-bold">Poupança</span>
                </button>
             </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Saldo Atual</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={balance}
                onChange={(e) => { setBalance(e.target.value); clearError('balance'); }}
                className={`w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-700 border rounded-xl focus:outline-none focus:ring-2 text-slate-900 dark:text-white placeholder:text-slate-400 font-bold transition-all ${errors.balance ? 'border-rose-300 focus:ring-rose-200 bg-rose-50 dark:bg-rose-900/20 dark:text-white' : 'border-slate-200 dark:border-slate-600 focus:ring-blue-500'}`}
              />
            </div>
            {errors.balance && <p className="text-rose-500 text-xs font-semibold flex items-center gap-1 mt-1"><AlertCircle size={12}/> {errors.balance}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-3 btn-tactile-dark text-sm font-bold rounded-xl mt-4"
          >
            {initialData ? 'Salvar Alterações' : 'Criar Conta'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AccountForm;
