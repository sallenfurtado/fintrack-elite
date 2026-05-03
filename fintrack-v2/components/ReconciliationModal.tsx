import React, { useState, useEffect } from 'react';
import { X, Sparkles, FileText, AlertCircle, Calendar, Check, Trash2, HelpCircle } from 'lucide-react';
import { Category, CostCenter, SupplierRule, Transaction } from '../types';
import { parseInvoiceData, parseStatementData } from '../services/geminiService';
import { checkTransactionMatch, formatCurrency, formatDate, cleanSupplierName } from '../utils/financeUtils';

interface ReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: { type: 'CREDIT' | 'ACCOUNT'; id: string; name: string; closingDay?: number } | null;
  categories: Category[];
  costCenters: CostCenter[];
  supplierRules: SupplierRule[];
  existingTransactions: Transaction[];
  onFinish: (newItems: any[], mergedItems: any[]) => void;
  addCategory: (category: Omit<Category, 'id'> & { id?: string }) => string;
}

const ReconciliationModal: React.FC<ReconciliationModalProps> = ({
  isOpen, onClose, source, categories, costCenters, supplierRules, existingTransactions, onFinish, addCategory
}) => {
  const [step, setStep] = useState<'INPUT' | 'REVIEW'>('INPUT');
  const [rawText, setRawText] = useState('');
  const [competence, setCompetence] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const [progress, setProgress] = useState(0);
  const [newCategoryPrompt, setNewCategoryPrompt] = useState<{ index: number, type: 'INCOME' | 'EXPENSE' } | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep('INPUT');
      setRawText('');
      setParsedItems([]);
      setError(null);
      setProgress(0);
      setCompetence(new Date().toISOString().slice(0, 7));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isCredit = source?.type === 'CREDIT';

  const handleProcess = async () => {
    if (!rawText.trim()) return;
    setIsLoading(true);
    setError(null);
    setProgress(20);

    // Simulate progress while waiting for AI
    const progressInterval = setInterval(() => {
      setProgress(p => {
        if (p < 85) return p + 5;
        return p;
      });
    }, 1500);

    try {
      // 1. Parse Data
      let items: any[] = [];
      if (isCredit) {
        items = await parseInvoiceData(rawText);
      } else {
        items = await parseStatementData(rawText);
      }
      
      clearInterval(progressInterval);
      setProgress(90);

      if (!items || items.length === 0) {
        throw new Error("Nenhuma transação encontrada.");
      }

      // 2. Process Items (Match & Rules)
      const processedItems = items.map((item: any, index: number) => {
        // Normalize
        const amount = typeof item.amount === 'string' ? parseFloat(item.amount) : (item.amount || 0);
        const description = item.description || 'Sem descrição';
        const date = item.date || new Date().toISOString().slice(0, 10);

        // Apply Rules for Category/Name
        let cleanDesc = cleanSupplierName(description) || description;
        let categoryId = '';
        let costCenterId = '';
        let ruleAllocations: any[] = [];
        
        // Find matching rule
        let rule = undefined;
        if (!item.is_balance_line) {
          rule = supplierRules.find(r => 
            description.toLowerCase().includes(r.pattern.toLowerCase())
          );
        }

        if (rule) {
          cleanDesc = rule.clean_name; // Use clean name if rule exists, else keep original
          categoryId = rule.default_category_id;
          costCenterId = rule.default_cost_center_id || '';
          
          if (rule.allocations && rule.allocations.length > 0) {
             // Calculate absolute amounts based on the transaction amount and percentages
             ruleAllocations = rule.allocations.map(ra => ({
                 cost_center_id: ra.cost_center_id,
                 amount: (amount * ra.percentage) / 100
             }));
             // Clear single cost center to favor allocations
             costCenterId = '';
          }
        }

        // Check for Duplicates/Matches in DB
        // We need to pass the source ID to checkTransactionMatch
        const tempItem = { ...item, amount, description: cleanDesc, source: { type: source?.type, id: source?.id }, is_balance_line: item.is_balance_line || false };
        
        // Find match in existing transactions
        const match = existingTransactions.find(t => checkTransactionMatch(tempItem, t));

        return {
          _id: `temp-${index}`,
          original_description: description,
          description: cleanDesc,
          date,
          amount: amount,
          category_id: categoryId,
          cost_center_id: costCenterId,
          allocations: ruleAllocations.length > 0 ? ruleAllocations : undefined,
          match_id: match ? match.id : null,
          is_new: !match,
          installments: 1, // Default
          source: { type: source?.type, id: source?.id },
          // Invoice date calculation for credit cards: use competence as anchor
          invoice_date: isCredit ? `${competence}-01` : date,
          is_balance_line: item.is_balance_line || false
        };
      });

      const sortedItems = processedItems.sort((a, b) => {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      });
      setParsedItems(sortedItems);
      setProgress(100);
      setTimeout(() => setStep('REVIEW'), 500);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
    }
  };

  const handleFinish = () => {
    const newItems = parsedItems.filter(i => i.is_new);
    const mergedItems = parsedItems
      .filter(i => !i.is_new && i.match_id)
      .map(i => ({
         id: i.match_id,
         updates: {
             status: 'RECONCILED',
         }
      }));
    
    onFinish(newItems, mergedItems);
    onClose();
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...parsedItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setParsedItems(newItems);
  };

  const handleCategoryChange = (index: number, value: string, amount: number) => {
    if (value === 'NEW') {
      setNewCategoryPrompt({ index, type: amount < 0 ? 'EXPENSE' : 'INCOME' });
      setNewCategoryName('');
    } else {
      updateItem(index, 'category_id', value);
    }
  };

  const handleCreateCategory = () => {
    if (!newCategoryPrompt || !newCategoryName.trim()) return;
    
    const newCategoryId = crypto.randomUUID();
    addCategory({
      id: newCategoryId,
      name: newCategoryName.trim(),
      type: newCategoryPrompt.type,
      color: '#6366f1', // Default indigo
      icon: 'Tags'
    });
    
    updateItem(newCategoryPrompt.index, 'category_id', newCategoryId);
    setNewCategoryPrompt(null);
    setNewCategoryName('');
  };

  const toggleStatus = (index: number) => {
      const newItems = [...parsedItems];
      newItems[index] = { ...newItems[index], is_new: !newItems[index].is_new, match_id: null };
      setParsedItems(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = [...parsedItems];
    newItems.splice(index, 1);
    setParsedItems(newItems);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <style>{`
        .custom-scroll {
          overflow-y: hidden;
        }
        .custom-scroll:hover {
          overflow-y: auto;
        }
        .custom-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
      `}</style>
      <div className={`bg-white rounded-3xl w-full ${step === 'INPUT' ? 'max-w-xl' : 'max-w-6xl h-[90vh]'} flex flex-col overflow-hidden shadow-2xl transition-all duration-300`}>
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Conciliar {isCredit ? 'Fatura' : 'Extrato'}: {source?.name}</h2>
              <p className="text-xs text-slate-500 font-medium">IA + {isCredit ? 'Projeção de Parcelas' : 'Categorização'} + Detecção de Duplicidade</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden p-6 bg-slate-50/50 flex flex-col">
          {step === 'INPUT' ? (
            <div className="space-y-4 flex-1 flex flex-col">
              {isCredit && (
               <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2 shrink-0">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                     <Calendar size={14} /> Competência da Fatura
                  </label>
                  <div className="flex gap-2 items-center">
                    <input 
                        type="month" 
                        value={competence}
                        onChange={(e) => setCompetence(e.target.value)}
                        className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="text-[10px] text-slate-400 max-w-[200px] leading-tight">
                        Selecione o mês/ano de vencimento desta fatura para alinhar as projeções.
                    </div>
                  </div>
               </div>
              )}

              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-3 items-start shrink-0">
                <FileText className="text-blue-600 mt-1 shrink-0" size={18} />
                <p className="text-xs text-blue-800 leading-relaxed font-medium">
                  {isCredit 
                    ? "Cole os dados brutos da fatura. O sistema detectará lançamentos parcelados e projetará faturas futuras."
                    : "Cole os dados do extrato bancário. O sistema identificará entradas e saídas e tentará categorizar automaticamente."
                  }
                </p>
              </div>
              
              <textarea
                placeholder={isCredit ? "Cole o texto da fatura aqui..." : "Cole o texto do extrato bancário aqui..."}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="w-full min-h-[150px] flex-1 p-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono resize-none shadow-sm custom-scroll"
              />
              
              {isLoading && (
                  <div className="space-y-1 shrink-0">
                      <div className="flex justify-between text-xs font-bold text-slate-500">
                          <span>Analisando com IA...</span>
                          <span>{progress}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div 
                             className="h-full bg-blue-600 transition-all duration-300 ease-out"
                             style={{ width: `${progress}%` }}
                          />
                      </div>
                  </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-rose-600 bg-rose-50 p-3 rounded-xl text-xs font-bold border border-rose-100 shrink-0">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              
              <button 
                  onClick={handleProcess}
                  disabled={isLoading || !rawText.trim()}
                  className="w-full py-4 btn-tactile-dark text-sm font-bold rounded-xl mt-auto shrink-0 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0"
              >
                  {isLoading ? 'Processando...' : 'Processar Texto'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
                <div className="flex-1 overflow-auto custom-scroll -mx-6 px-6">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-400 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 rounded-tl-xl">Status</th>
                                <th className="px-4 py-3">Data</th>
                                <th className="px-4 py-3">Descrição Detectada</th>
                                <th className="px-4 py-3">Categoria</th>
                                <th className="px-4 py-3">Centro de Custo</th>
                                <th className="px-4 py-3 text-right">Valor</th>
                                <th className="px-4 py-3 text-right rounded-tr-xl">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {parsedItems.map((item, idx) => (
                                <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3">
                                        {item.is_balance_line ? (
                                            <span className="px-2 py-1 rounded text-[10px] font-bold uppercase border bg-blue-50 text-blue-600 border-blue-100">
                                                Saldo
                                            </span>
                                        ) : (
                                            <button 
                                                onClick={() => toggleStatus(idx)}
                                                className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${item.is_new ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}
                                            >
                                                {item.is_new ? 'Novo' : 'Mesclar'}
                                            </button>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-xs font-medium text-slate-600 whitespace-nowrap">
                                        {formatDate(item.date, 'dd/MM')}
                                    </td>
                                    <td className="px-4 py-3">
                                        <input 
                                            type="text" 
                                            value={item.description}
                                            onChange={(e) => updateItem(idx, 'description', e.target.value)}
                                            className="w-full bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none text-sm font-bold text-slate-800"
                                        />
                                        <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[200px]">{item.original_description}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        {item.is_balance_line ? (
                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">N/A (Saldo)</span>
                                        ) : (
                                            <select
                                                value={item.category_id}
                                                onChange={(e) => handleCategoryChange(idx, e.target.value, item.amount)}
                                                className={`text-xs p-1.5 rounded border ${!item.category_id ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-700'}`}
                                            >
                                                <option value="">Selecione...</option>
                                                {categories.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                                <option value="NEW" className="font-bold text-indigo-600">+ Nova Categoria...</option>
                                            </select>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {item.is_balance_line ? (
                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">N/A</span>
                                        ) : item.allocations ? (
                                             <div className="flex items-center gap-1 text-slate-500 text-xs font-medium" title="Definido por Regra">
                                                <Sparkles size={12} className="text-indigo-500" /> Regra
                                             </div>
                                        ) : (
                                            <select
                                                value={item.cost_center_id}
                                                onChange={(e) => updateItem(idx, 'cost_center_id', e.target.value)}
                                                className="text-xs p-1.5 rounded border border-slate-200 bg-white text-slate-700"
                                            >
                                                <option value="">Geral</option>
                                                {costCenters.map(cc => (
                                                    <option key={cc.id} value={cc.id}>{cc.name}</option>
                                                ))}
                                            </select>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {item.is_balance_line ? (
                                            <span className={`text-sm font-bold px-2 py-1 rounded ${item.amount < 0 ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {formatCurrency(item.amount)}
                                            </span>
                                        ) : (
                                            <span className={`text-sm font-bold ${item.amount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                {formatCurrency(item.amount)}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button 
                                            onClick={() => removeItem(idx)}
                                            className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-200 flex justify-between items-center shrink-0">
                    <div className="flex gap-4 text-sm font-medium text-slate-500">
                        <p>Novos: <span className="font-bold text-emerald-600">{parsedItems.filter(i => i.is_new).length}</span></p>
                        <p>Mesclados: <span className="font-bold text-amber-600">{parsedItems.filter(i => !i.is_new).length}</span></p>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setStep('INPUT')}
                            className="px-6 py-3 btn-tactile-white rounded-xl text-sm font-bold"
                        >
                            Voltar
                        </button>
                        <button 
                            onClick={handleFinish}
                            className="px-8 py-3 btn-tactile-dark rounded-xl text-sm font-bold flex items-center gap-2"
                        >
                            <Check size={18} /> Confirmar Lançamentos
                        </button>
                    </div>
                </div>
            </div>
          )}
        </div>
      </div>

      {newCategoryPrompt && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Nova Categoria</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Nome da Categoria</label>
                <input 
                  type="text" 
                  autoFocus
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleCreateCategory();
                    if (e.key === 'Escape') setNewCategoryPrompt(null);
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Alimentação"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => setNewCategoryPrompt(null)}
                  className="flex-1 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCreateCategory}
                  disabled={!newCategoryName.trim()}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  Criar e Selecionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReconciliationModal;