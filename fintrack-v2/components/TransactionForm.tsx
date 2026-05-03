import React, { useState, useEffect } from 'react';
import { X, Calculator, AlertCircle, Briefcase, Plus, Trash2, RefreshCw, Split, Save, CalendarRange } from 'lucide-react';
import { Category, Account, CreditCard, TransactionType, CostCenter, CostCenterAllocation, Transaction } from '../types';
import { formatCurrency, formatDate } from '../utils/financeUtils';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  accounts: Account[];
  creditCards: CreditCard[];
  costCenters?: CostCenter[];
  onSubmit: (data: any) => void;
  initialContext?: 'general' | 'account' | 'credit';
  initialSourceId?: string | null;
  initialData?: Transaction | null;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  isOpen, onClose, categories, accounts, creditCards, costCenters = [], onSubmit,
  initialContext = 'general', initialSourceId, initialData
}) => {
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CREDIT'>('CASH');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  
  // Single/Simple Cost Center State (for quick edit)
  const [simpleCostCenterId, setSimpleCostCenterId] = useState('');

  // Multi Cost Center State (Advanced)
  const [allocations, setAllocations] = useState<{costCenterId: string, amount: string}[]>([]);

  const [sourceId, setSourceId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Installment State
  const [installments, setInstallments] = useState(1); // For Generator (New)
  const [currentInstallment, setCurrentInstallment] = useState(1); // For Metadata (Edit)
  const [totalInstallments, setTotalInstallments] = useState(1); // For Metadata (Edit)

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Edit Mode
        const isExpense = initialData.amount < 0;
        setType(isExpense ? TransactionType.EXPENSE : TransactionType.INCOME);
        setAmount(Math.abs(initialData.amount).toString());
        setDescription(initialData.description);
        setCategoryId(initialData.category_id);
        setDate(initialData.date);
        
        // Determine Source
        if (initialData.card_id) {
            setPaymentMethod('CREDIT');
            setSourceId(initialData.card_id);
            setInstallments(1); // Not used in edit generator
            setCurrentInstallment(initialData.installment_number || 1);
            setTotalInstallments(initialData.installment_total || 1);
        } else if (initialData.account_id) {
            setPaymentMethod('CASH');
            setSourceId(initialData.account_id);
            setInstallments(1);
        }

        // Allocations & Cost Center
        if (initialData.allocations && initialData.allocations.length > 0) {
            // Populate allocations list
            setAllocations(initialData.allocations.map(a => ({
                costCenterId: a.cost_center_id,
                amount: Math.abs(a.amount).toString()
            })));
            
            // If there's only one allocation, sync it with the simple dropdown
            if (initialData.allocations.length === 1) {
                setSimpleCostCenterId(initialData.allocations[0].cost_center_id);
            } else {
                setSimpleCostCenterId(''); // Multi or complex
            }
        } else {
            setAllocations([]);
            setSimpleCostCenterId(initialData.cost_center_id || ''); // Fallback legacy
        }

      } else {
        // Create Mode
        if (initialContext === 'credit') {
          setPaymentMethod('CREDIT');
          if (initialSourceId) setSourceId(initialSourceId);
        } else if (initialContext === 'account') {
          setPaymentMethod('CASH');
          if (initialSourceId) setSourceId(initialSourceId);
        } else {
          // Reset defaults for general context
          setPaymentMethod('CASH');
          setSourceId('');
        }
        
        // Reset other fields
        setAmount('');
        setDescription('');
        setCategoryId('');
        setSimpleCostCenterId('');
        setAllocations([]);
        setInstallments(1);
        setCurrentInstallment(1);
        setTotalInstallments(1);
        // Default to Expense for safety
        setType(TransactionType.EXPENSE);
      }
      setErrors({});
    }
  }, [isOpen, initialContext, initialSourceId, initialData]);

  // Helper to calculate current installment value
  const getInstallmentValue = () => {
    const total = parseFloat(amount) || 0;
    // When editing, the amount IS the transaction value (no division needed)
    const count = initialData ? 1 : (installments || 1);
    return total / count;
  };

  // derived state for UI logic
  const isMultiAllocation = allocations.length > 1;

  // Auto-distribute when amount changes (keeping allocations in sync)
  useEffect(() => {
    if (allocations.length > 0 && amount) {
        const totalNew = parseFloat(amount);
        const currentSum = allocations.reduce((s, a) => s + (parseFloat(a.amount)||0), 0);
        
        // If amount changed significantly, rebalance
        if (Math.abs(currentSum - totalNew) > 0.01) {
             distributeEqually(allocations);
        }
    }
  }, [amount]);

  // Handle Cost Center Selection
  const handleCostCenterSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      if (val === 'split_action') {
          // Enter Multi Mode
          setSimpleCostCenterId('');
          const total = getInstallmentValue();
          const part = (total / 2).toFixed(2);
          const remainder = (total - parseFloat(part)).toFixed(2);
          
          // Use current simple ID if present as first entry
          const first = simpleCostCenterId || (allocations[0]?.costCenterId) || '';

          setAllocations([
              { costCenterId: first, amount: part },
              { costCenterId: '', amount: remainder }
          ]);
      } else {
          setSimpleCostCenterId(val);
          if (val) {
             const total = getInstallmentValue();
             setAllocations([{ costCenterId: val, amount: total.toFixed(2) }]);
          } else {
             // General / None
             setAllocations([]);
          }
      }
  };

  const distributeEqually = (currentAllocations: typeof allocations) => {
      const count = currentAllocations.length;
      if (count === 0) return;
      
      const valPerCC = getInstallmentValue() / count;
      const formattedVal = valPerCC.toFixed(2);
      
      // Handle rounding error on last item
      const totalAllocated = parseFloat(formattedVal) * count;
      const diff = getInstallmentValue() - totalAllocated;

      const newAllocations = currentAllocations.map((a, idx) => ({
          ...a,
          amount: (idx === count - 1) ? (parseFloat(formattedVal) + diff).toFixed(2) : formattedVal
      }));
      setAllocations(newAllocations);
  };

  const handleAddAllocation = () => {
    const newList = [...allocations, { costCenterId: '', amount: '' }];
    setAllocations(newList);
    setTimeout(() => distributeEqually(newList), 0);
  };

  const handleRemoveAllocation = (index: number) => {
    const newList = [...allocations];
    newList.splice(index, 1);
    setAllocations(newList);
    if (newList.length === 1) {
        // Revert to simple mode if only 1 left? 
        // Or keep multi mode for consistency until user chooses to exit?
        // Let's keep multi mode to avoid UI jumping, unless empty.
    }
    setTimeout(() => distributeEqually(newList), 0);
  };

  const handleAllocationChange = (index: number, field: 'costCenterId' | 'amount', value: string) => {
    const newAllocations = [...allocations];
    newAllocations[index] = { ...newAllocations[index], [field]: value };
    setAllocations(newAllocations);
  };

  if (!isOpen) return null;

  // Filter available cost centers based on payment method permissions
  const availableCostCenters = costCenters.filter(cc => {
    if (paymentMethod === 'CREDIT') return cc.enabled_for_credit;
    return cc.enabled_for_accounts;
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const totalAmount = parseFloat(amount) || 0;

    if (totalAmount <= 0) newErrors.amount = "Informe um valor válido";
    if (!description.trim()) newErrors.description = "Informe uma descrição";
    if (!categoryId) newErrors.categoryId = "Selecione uma categoria";
    
    // Only validate source if creating new
    if (!initialData && !sourceId) newErrors.sourceId = "Selecione a origem";
    if (!date) newErrors.date = "Informe a data";

    // Validate allocations if split
    if (allocations.length > 1) {
         const sum = allocations.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
         if (Math.abs(sum - totalAmount) > 0.05) {
             newErrors.allocations = `Soma (${formatCurrency(sum)}) difere do total (${formatCurrency(totalAmount)})`;
         }
         if (allocations.some(a => !a.costCenterId)) {
             newErrors.allocations = "Selecione todos os centros de custo";
         }
    }

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

    const numericAmount = parseFloat(amount);
    const finalAmount = type === TransactionType.EXPENSE ? -Math.abs(numericAmount) : Math.abs(numericAmount);
    
    // Prepare Allocations
    let finalAllocations: CostCenterAllocation[] | undefined = undefined;
    
    if (allocations.length > 0) {
        finalAllocations = allocations.map(a => {
            const allocAmount = parseFloat(a.amount);
            // If creating new with installments, multiplier logic applies in store, 
            // but here we just pass the ratio-base amount (store handles installments)
            // Actually store expects allocation.amount to be the TOTAL amount for that cost center in the transaction context
            // If installments > 1 (New), the Store splits this amount.
            return {
                cost_center_id: a.costCenterId,
                amount: type === TransactionType.EXPENSE ? -Math.abs(allocAmount) : Math.abs(allocAmount)
            };
        });
    }

    onSubmit({
      date,
      description,
      amount: finalAmount,
      category_id: categoryId,
      allocations: finalAllocations,
      source: { type: paymentMethod, id: sourceId },
      installments: (paymentMethod === 'CREDIT' && !initialData) ? installments : 1,
      // Metadata fields for editing existing credit transactions
      installment_number: (initialData && paymentMethod === 'CREDIT') ? currentInstallment : undefined,
      installment_total: (initialData && paymentMethod === 'CREDIT') ? totalInstallments : undefined,
    });
    
    onClose();
  };

  const lastInstallmentDate = new Date(new Date(date).setMonth(new Date(date).getMonth() + installments - 1));
  const installmentValue = getInstallmentValue();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 text-white rounded-xl">
              <Plus size={20} />
            </div>
            <h2 className="text-xl font-black text-slate-800">
              {initialData 
                ? 'Editar Lançamento'
                : (initialContext === 'credit' ? 'Lançamento no Cartão' : initialContext === 'account' ? 'Movimento Bancário' : 'Nova Transação')
              }
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-all active:scale-90">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scroll">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* TYPE BADGE */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Lançamento</label>
                {initialData ? (
                  <div className={`w-full py-3 rounded-2xl text-center font-bold text-sm ${type === TransactionType.EXPENSE ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {type === TransactionType.EXPENSE ? 'Despesa' : 'Receita'}
                  </div>
                ) : (
                  <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setType(TransactionType.EXPENSE)}
                      className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all active:scale-95 ${type === TransactionType.EXPENSE ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Despesa
                    </button>
                    <button
                      type="button"
                      onClick={() => setType(TransactionType.INCOME)}
                      className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all active:scale-95 ${type === TransactionType.INCOME ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Receita
                    </button>
                  </div>
                )}
              </div>

              {/* VALUE */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xl">R$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0,00"
                    value={amount !== '' ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(amount) || 0) : ''}
                    onChange={(e) => { 
                      const digits = e.target.value.replace(/\D/g, '');
                      if (!digits) {
                        setAmount('');
                      } else {
                        setAmount((parseInt(digits, 10) / 100).toString());
                      }
                      clearError('amount'); 
                    }}
                    className={`w-full pl-14 pr-6 py-4 bg-slate-50 border rounded-2xl focus:outline-none focus:ring-2 text-3xl font-black transition-all ${errors.amount ? 'border-rose-300 focus:ring-rose-200 bg-rose-50' : 'border-slate-200 focus:ring-slate-900 focus:border-transparent'}`}
                  />
                </div>
                {errors.amount && <p className="text-rose-500 text-[10px] font-bold flex items-center gap-1 mt-1 uppercase tracking-wider"><AlertCircle size={12}/> {errors.amount}</p>}
              </div>

              {/* DESCRIPTION */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Supermercado, Aluguel..."
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); clearError('description'); }}
                  className={`w-full px-5 py-4 bg-slate-50 border rounded-2xl font-bold text-slate-700 focus:outline-none focus:ring-2 transition-all ${errors.description ? 'border-rose-300 focus:ring-rose-200 bg-rose-50' : 'border-slate-200 focus:ring-slate-900'}`}
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => { setDate(e.target.value); clearError('date'); }}
                    className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 transition-all ${errors.date ? 'border-rose-300 focus:ring-rose-200 bg-rose-50' : 'border-slate-200 focus:ring-slate-900'}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</label>
                  <select
                    value={categoryId}
                    onChange={(e) => { setCategoryId(e.target.value); clearError('categoryId'); }}
                    className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 transition-all ${errors.categoryId ? 'border-rose-300 focus:ring-rose-200 bg-rose-50' : 'border-slate-200 focus:ring-slate-900'}`}
                  >
                    <option value="">Selecione</option>
                    {categories.filter(c => c.type === type).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Centro de Custo</label>
                <select
                  value={isMultiAllocation ? 'multi_active' : simpleCostCenterId}
                  onChange={handleCostCenterSelect}
                  className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all ${isMultiAllocation ? 'text-indigo-600 border-indigo-200 bg-indigo-50' : 'border-slate-200'}`}
                >
                  {isMultiAllocation && <option value="multi_active">Múltiplos Centros...</option>}
                  <option value="">Geral (Sem Rateio)</option>
                  {(() => {
                    const grouped = availableCostCenters.reduce((acc, cc) => {
                      const group = cc.group || 'Outros';
                      if (!acc[group]) acc[group] = [];
                      acc[group].push(cc);
                      return acc;
                    }, {} as Record<string, typeof availableCostCenters>);
                    
                    return Object.entries(grouped).map(([group, ccs]) => (
                      <optgroup key={group} label={group}>
                        {(ccs as typeof availableCostCenters).map(cc => (
                          <option key={cc.id} value={cc.id}>{cc.name}</option>
                        ))}
                      </optgroup>
                    ));
                  })()}
                  <option value="split_action" className="font-bold text-indigo-600 bg-slate-100">↳ Dividir Valor (Rateio)...</option>
                </select>
              </div>

              {/* ORIGIN (Hidden in Edit Mode) */}
              {!initialData && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Origem de Pagamento</label>
                    {initialContext === 'general' && (
                      <div className="flex bg-slate-100 p-1 rounded-xl mb-3">
                        <button
                          type="button"
                          onClick={() => { setPaymentMethod('CASH'); setSourceId(''); clearError('sourceId'); }}
                          className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 ${paymentMethod === 'CASH' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                        >
                          Dinheiro/Débito
                        </button>
                        <button
                          type="button"
                          onClick={() => { setPaymentMethod('CREDIT'); setSourceId(''); clearError('sourceId'); }}
                          className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 ${paymentMethod === 'CREDIT' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                        >
                          Cartão de Crédito
                        </button>
                      </div>
                    )}
                    
                    <select
                      value={sourceId}
                      onChange={(e) => { setSourceId(e.target.value); clearError('sourceId'); }}
                      disabled={!!initialSourceId}
                      className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 transition-all ${errors.sourceId ? 'border-rose-300 focus:ring-rose-200 bg-rose-50' : 'border-slate-200 focus:ring-slate-900'} ${!!initialSourceId ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      <option value="">Selecione a conta/cartão</option>
                      {paymentMethod === 'CASH' 
                        ? accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)
                        : creditCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                      }
                    </select>
                    {errors.sourceId && <p className="text-rose-500 text-[10px] font-bold mt-1 uppercase tracking-wider">{errors.sourceId}</p>}
                  </div>
              )}
            </div>
          </div>
          
          {/* ALLOCATION EDITOR (If Multi) */}
          {isMultiAllocation && (
             <div className="bg-indigo-50/50 p-5 rounded-3xl border border-indigo-100 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Split size={16} className="text-indigo-600" />
                      <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Divisão de Custos (Rateio)</span>
                    </div>
                    <span className="text-[10px] font-black text-indigo-600 bg-white px-2 py-1 rounded-xl border border-indigo-100">Restante: {formatCurrency(getInstallmentValue() - allocations.reduce((s,a)=>s+(parseFloat(a.amount)||0),0))}</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[200px] overflow-y-auto pr-2 custom-scroll">
                    {allocations.map((alloc, idx) => (
                        <div key={idx} className="flex gap-2 bg-white p-2 rounded-2xl border border-indigo-50 shadow-sm">
                            <select 
                            value={alloc.costCenterId}
                            onChange={(e) => handleAllocationChange(idx, 'costCenterId', e.target.value)}
                            className="flex-1 text-xs font-bold p-2 rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Selecione...</option>
                                {(() => {
                                  const grouped = availableCostCenters.reduce((acc, cc) => {
                                    const group = cc.group || 'Outros';
                                    if (!acc[group]) acc[group] = [];
                                    acc[group].push(cc);
                                    return acc;
                                  }, {} as Record<string, typeof availableCostCenters>);
                                  
                                  return Object.entries(grouped).map(([group, ccs]) => (
                                    <optgroup key={group} label={group}>
                                      {(ccs as typeof availableCostCenters).map(cc => (
                                        <option key={cc.id} value={cc.id}>{cc.name}</option>
                                      ))}
                                    </optgroup>
                                  ));
                                })()}
                            </select>
                            <input 
                            type="text"
                            inputMode="numeric"
                            value={alloc.amount !== '' ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(alloc.amount) || 0) : ''}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, '');
                              const newValue = digits ? (parseInt(digits, 10) / 100).toString() : '';
                              handleAllocationChange(idx, 'amount', newValue);
                            }}
                            className="w-24 text-right text-xs font-black p-2 rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button type="button" onClick={() => handleRemoveAllocation(idx)} className="text-slate-300 hover:text-rose-500 p-1 transition-all active:scale-90"><Trash2 size={16}/></button>
                        </div>
                    ))}
                </div>

                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={handleAddAllocation} className="flex-1 py-2.5 btn-tactile-white border-indigo-100 text-[10px] font-black uppercase tracking-widest text-indigo-600 rounded-xl flex items-center justify-center gap-2"><Plus size={14}/> Adicionar</button>
                    <button type="button" onClick={() => distributeEqually(allocations)} className="flex-1 py-2.5 btn-tactile-white border-indigo-100 text-[10px] font-black uppercase tracking-widest text-indigo-600 rounded-xl flex items-center justify-center gap-2"><RefreshCw size={14}/> Rebalancear</button>
                </div>
                {errors.allocations && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-wider">{errors.allocations}</p>}
             </div>
          )}

          {/* INSTALLMENTS - GENERATOR (NEW) */}
          {!initialData && paymentMethod === 'CREDIT' && (
            <div className="p-6 bg-slate-900 rounded-3xl space-y-4 shadow-xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <CalendarRange size={18} className="text-slate-400" />
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Número de Parcelas</label>
                </div>
                <input
                  type="number"
                  min="1"
                  max="48"
                  value={installments}
                  onChange={(e) => setInstallments(parseInt(e.target.value) || 1)}
                  className="w-20 px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-center text-lg font-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {installments > 1 && amount && (
                <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                  <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                    <Calculator size={20} />
                  </div>
                  <div>
                    <p className="text-lg font-black text-white">{formatCurrency(installmentValue)}<span className="text-xs text-slate-500 font-bold ml-1">/mês</span></p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Até {formatDate(lastInstallmentDate, 'MMMM yyyy')}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* INSTALLMENTS - METADATA (EDIT) */}
          {initialData && paymentMethod === 'CREDIT' && (
            <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Parcela Atual</label>
                    <input
                        type="number"
                        min="1"
                        value={currentInstallment}
                        onChange={(e) => setCurrentInstallment(parseInt(e.target.value) || 1)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-2xl font-black text-center text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Parcelas</label>
                    <input
                        type="number"
                        min="1"
                        value={totalInstallments}
                        onChange={(e) => setTotalInstallments(parseInt(e.target.value) || 1)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-2xl font-black text-center text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 text-center mt-4 font-black uppercase tracking-widest">
                    Editando apenas a identificação desta parcela.
                </p>
            </div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              className="w-full py-5 btn-tactile-dark text-sm font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-3"
            >
              <Save size={20} />
              {initialData ? 'Salvar Alterações' : (initialContext === 'general' ? 'Criar Transação' : 'Confirmar Lançamento')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;