import React, { useState, useEffect } from 'react';
import { X, Calendar, CreditCard as CardIcon, AlertCircle } from 'lucide-react';
import { CreditCard } from '../types';

interface CreditCardFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<CreditCard, 'id'>) => void;
  onUpdate: (id: string, data: Partial<CreditCard>) => void;
  initialData?: CreditCard | null;
}

const CreditCardForm: React.FC<CreditCardFormProps> = ({ isOpen, onClose, onSubmit, onUpdate, initialData }) => {
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setLimit(initialData.limit_amount.toString());
      setClosingDay(initialData.closing_day.toString());
      setDueDay(initialData.due_day.toString());
    } else {
      setName('');
      setLimit('');
      setClosingDay('');
      setDueDay('');
    }
    setErrors({});
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Nome do cartão é obrigatório';
    
    // Validation for decimal values
    if (!limit || parseFloat(limit) <= 0) {
      newErrors.limit = 'Informe um limite válido (ex: 1000.50)';
    }
    
    const closing = parseInt(closingDay);
    if (!closingDay || closing < 1 || closing > 31) newErrors.closingDay = 'Dia inválido (1-31)';
    
    const due = parseInt(dueDay);
    if (!dueDay || due < 1 || due > 31) newErrors.dueDay = 'Dia inválido (1-31)';

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

    const numericLimit = parseFloat(limit) || 0;
    const numericClose = parseInt(closingDay) || 1;
    const numericDue = parseInt(dueDay) || 10;

    if (initialData) {
      onUpdate(initialData.id, { 
        name, 
        limit_amount: numericLimit,
        closing_day: numericClose,
        due_day: numericDue
      });
    } else {
      onSubmit({ 
        name, 
        limit_amount: numericLimit,
        closing_day: numericClose,
        due_day: numericDue
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">
            {initialData ? 'Editar Cartão' : 'Adicionar Cartão'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-all active:scale-90">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Nome do Cartão</label>
            <div className="relative">
              <CardIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Ex: Visa Infinite"
                value={name}
                onChange={(e) => { setName(e.target.value); clearError('name'); }}
                className={`w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 transition-all ${errors.name ? 'border-rose-300 focus:ring-rose-200 bg-rose-50' : 'border-slate-200 focus:ring-blue-500'}`}
              />
            </div>
            {errors.name && <p className="text-rose-500 text-xs font-semibold flex items-center gap-1 mt-1"><AlertCircle size={12}/> {errors.name}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Limite Total</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
              <input
                type="number"
                step="0.01"
                placeholder="R$ 0,00"
                value={limit}
                onChange={(e) => { setLimit(e.target.value); clearError('limit'); }}
                className={`w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 font-bold transition-all ${errors.limit ? 'border-rose-300 focus:ring-rose-200 bg-rose-50' : 'border-slate-200 focus:ring-blue-500'}`}
              />
            </div>
            {errors.limit && <p className="text-rose-500 text-xs font-semibold flex items-center gap-1 mt-1"><AlertCircle size={12}/> {errors.limit}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Dia Fechamento</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Ex: 5"
                  value={closingDay}
                  onChange={(e) => { setClosingDay(e.target.value); clearError('closingDay'); }}
                  className={`w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 transition-all ${errors.closingDay ? 'border-rose-300 focus:ring-rose-200 bg-rose-50' : 'border-slate-200 focus:ring-blue-500'}`}
                />
              </div>
              {errors.closingDay && <p className="text-rose-500 text-xs font-semibold mt-1">{errors.closingDay}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Dia Vencimento</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Ex: 10"
                  value={dueDay}
                  onChange={(e) => { setDueDay(e.target.value); clearError('dueDay'); }}
                  className={`w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 transition-all ${errors.dueDay ? 'border-rose-300 focus:ring-rose-200 bg-rose-50' : 'border-slate-200 focus:ring-blue-500'}`}
                />
              </div>
              {errors.dueDay && <p className="text-rose-500 text-xs font-semibold mt-1">{errors.dueDay}</p>}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 btn-tactile-dark text-sm font-bold rounded-xl mt-4"
          >
            {initialData ? 'Salvar Alterações' : 'Adicionar Cartão'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreditCardForm;