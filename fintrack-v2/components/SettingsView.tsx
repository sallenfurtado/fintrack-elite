import React, { useState } from 'react';
import { Tags, Plus, X, Trash2, BookOpen, Briefcase, CheckSquare, Square, AlertTriangle, RotateCcw, AlertCircle, Edit2, ArrowUp, ArrowDown } from 'lucide-react';
import { Category, CostCenter, SupplierRule, TransactionType, Transaction } from '../types';
import { ICON_MAP } from '../constants';
import { cleanSupplierName } from '../utils/financeUtils';

interface SettingsViewProps {
  transactions?: Transaction[];
  categories: Category[];
  costCenters: CostCenter[];
  supplierRules: SupplierRule[];
  deleteCategory: (id: string) => void;
  deleteCostCenter: (id: string) => void;
  deleteSupplierRule: (id: string) => void;
  clearSupplierRules: () => void;
  reorderSupplierRules: (startIndex: number, endIndex: number) => void;
  applyRulesToHistory: () => void;
  addCategory: (category: Omit<Category, 'id'> & { id?: string }) => string;
  updateCategory: (id: string, data: Partial<Category>) => void;
  addCostCenter: (costCenter: Omit<CostCenter, 'id'>) => void;
  updateCostCenter: (id: string, data: Partial<CostCenter>) => void;
  handleCreateRule: (suggestedPattern?: string, suggestedCleanName?: string) => void;
  handleEditRule: (rule: SupplierRule) => void;
  setIsTrashModalOpen: (isOpen: boolean) => void;
  handleResetDatabase: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  transactions = [],
  categories,
  costCenters,
  supplierRules,
  deleteCategory,
  deleteCostCenter,
  deleteSupplierRule,
  clearSupplierRules,
  reorderSupplierRules,
  applyRulesToHistory,
  addCategory,
  updateCategory,
  addCostCenter,
  updateCostCenter,
  handleCreateRule,
  handleEditRule,
  setIsTrashModalOpen,
  handleResetDatabase
}) => {
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('HelpCircle');
  const [newCatColor, setNewCatColor] = useState('#94a3b8');
  const [newCatType, setNewCatType] = useState<TransactionType>(TransactionType.EXPENSE);

  const [editingCostCenterId, setEditingCostCenterId] = useState<string | null>(null);
  const [newCostCenterName, setNewCostCenterName] = useState('');
  const [newCostCenterCode, setNewCostCenterCode] = useState('');
  const [newCostCenterGroup, setNewCostCenterGroup] = useState('');
  const [ccEnabledCredit, setCcEnabledCredit] = useState(true);
  const [ccEnabledAccounts, setCcEnabledAccounts] = useState(true);

  const [categoryError, setCategoryError] = useState('');
  const [costCenterError, setCostCenterError] = useState('');

  const ruleSuggestions = React.useMemo(() => {
    if (!transactions) return [];
    
    const descCounts: Record<string, number> = {};
    transactions.forEach(t => {
      const upperDesc = t.description.toUpperCase();
      
      const matchesRule = supplierRules.some(r => upperDesc.includes(r.pattern.toUpperCase()));
      if (!matchesRule) {
        const cleanDesc = cleanSupplierName(t.description);
        if (cleanDesc) {
          descCounts[cleanDesc] = (descCounts[cleanDesc] || 0) + 1;
        }
      }
    });
    
    return Object.entries(descCounts)
      .filter(([_, count]) => count > 1) // At least 2 occurrences
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([desc, count]) => ({ pattern: desc, count }));
  }, [transactions, supplierRules]);

  const handleOpenAddCategory = () => {
    setEditingCategoryId(null);
    setNewCatName('');
    setNewCatIcon('HelpCircle');
    setNewCatColor('#94a3b8');
    setNewCatType(TransactionType.EXPENSE);
    setCategoryError('');
    setIsAddingCategory(true);
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setNewCatName(cat.name);
    setNewCatIcon(cat.icon_key);
    setNewCatColor(cat.color_hex);
    setNewCatType(cat.type);
    setCategoryError('');
    setIsAddingCategory(true);
  };

  const handleSaveCategory = () => {
    if (!newCatName.trim()) return;
    
    const isDuplicate = categories.some(c => c.name.toLowerCase() === newCatName.trim().toLowerCase() && c.id !== editingCategoryId);
    if (isDuplicate) {
      setCategoryError('Já existe uma categoria com este nome.');
      return;
    }
    setCategoryError('');
    
    if (editingCategoryId) {
      updateCategory(editingCategoryId, {
        name: newCatName,
        icon_key: newCatIcon,
        color_hex: newCatColor,
        type: newCatType
      });
    } else {
      addCategory({
        name: newCatName,
        icon_key: newCatIcon,
        color_hex: newCatColor,
        type: newCatType
      });
    }
    
    setNewCatName('');
    setNewCatIcon('HelpCircle');
    setNewCatColor('#94a3b8');
    setIsAddingCategory(false);
    setEditingCategoryId(null);
  };

  const handleEditCostCenter = (cc: CostCenter) => {
    setEditingCostCenterId(cc.id);
    setNewCostCenterName(cc.name);
    setNewCostCenterCode(cc.code || '');
    setNewCostCenterGroup(cc.group || '');
    setCcEnabledCredit(cc.enabled_for_credit);
    setCcEnabledAccounts(cc.enabled_for_accounts);
    setCostCenterError('');
  };

  const handleSaveCostCenter = () => {
    if (!newCostCenterName.trim()) return;
    
    const isDuplicate = costCenters.some(c => c.name.toLowerCase() === newCostCenterName.trim().toLowerCase() && c.id !== editingCostCenterId);
    if (isDuplicate) {
      setCostCenterError('Já existe um centro de custo com este nome.');
      return;
    }
    setCostCenterError('');
    
    if (editingCostCenterId) {
      updateCostCenter(editingCostCenterId, {
        name: newCostCenterName,
        code: newCostCenterCode.trim() || undefined,
        group: newCostCenterGroup.trim() || undefined,
        enabled_for_credit: ccEnabledCredit,
        enabled_for_accounts: ccEnabledAccounts
      });
    } else {
      // Pick a random color from a predefined palette
      const COST_CENTER_COLORS = [
        '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
        '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#6366f1'
      ];
      const randomColor = COST_CENTER_COLORS[Math.floor(Math.random() * COST_CENTER_COLORS.length)];

      addCostCenter({
        name: newCostCenterName,
        code: newCostCenterCode.trim() || undefined,
        group: newCostCenterGroup.trim() || undefined,
        enabled_for_credit: ccEnabledCredit,
        enabled_for_accounts: ccEnabledAccounts,
        color_hex: randomColor
      });
    }
    
    setNewCostCenterName('');
    setNewCostCenterCode('');
    setNewCostCenterGroup('');
    setEditingCostCenterId(null);
    setCcEnabledCredit(true);
    setCcEnabledAccounts(true);
  };

  const handleCancelCostCenter = () => {
    setNewCostCenterName('');
    setNewCostCenterCode('');
    setNewCostCenterGroup('');
    setEditingCostCenterId(null);
    setCcEnabledCredit(true);
    setCcEnabledAccounts(true);
  };

  const [activeTab, setActiveTab] = useState<'categories' | 'costCenters' | 'rules' | 'advanced'>('categories');

  return (
    <div className="space-y-6">
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl overflow-x-auto custom-scroll">
        <button 
          onClick={() => setActiveTab('categories')}
          className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'categories' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 hover:bg-slate-200/50'}`}
        >
          Categorias
        </button>
        <button 
          onClick={() => setActiveTab('costCenters')}
          className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'costCenters' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 hover:bg-slate-200/50'}`}
        >
          Centros de Custo
        </button>
        <button 
          onClick={() => setActiveTab('rules')}
          className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'rules' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 hover:bg-slate-200/50'}`}
        >
          Regras
        </button>
        <button 
          onClick={() => setActiveTab('advanced')}
          className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'advanced' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 hover:bg-slate-200/50'}`}
        >
          Avançado
        </button>
      </div>

      <div className="space-y-8">
        {/* Categories */}
        {activeTab === 'categories' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-50 text-pink-600 rounded-xl"><Tags size={20} /></div>
                <div><h3 className="text-lg font-bold text-slate-800 dark:text-white">Categorias</h3><p className="text-sm text-slate-500 dark:text-slate-400">Gerencie as categorias das suas transações.</p></div>
             </div>
             {!isAddingCategory && (
                <button 
                    onClick={handleOpenAddCategory}
                    className="flex items-center gap-2 px-4 py-2 btn-tactile-dark text-sm font-bold rounded-xl"
                >
                    <Plus size={16} /> Nova Categoria
                </button>
             )}
         </div>
         <div className={`grid grid-cols-1 ${isAddingCategory ? 'md:grid-cols-2' : ''} gap-8 transition-all`}>
             <div className="space-y-3">
                 <h4 className="text-xs font-bold uppercase text-slate-400">Categorias Existentes</h4>
                 <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scroll">
                     {categories.map(c => (
                         <div key={c.id} className="flex justify-between items-center p-3 border border-slate-100 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:bg-slate-700/50 group">
                             <div className="flex items-center gap-3">
                                 <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.color_hex }}></div>
                                 <span className="text-sm font-bold text-slate-700">{c.name}</span>
                                 <div className="text-slate-400">{ICON_MAP[c.icon_key] || ICON_MAP['HelpCircle']}</div>
                             </div>
                             <div className="flex items-center gap-2">
                                 <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${c.type === TransactionType.EXPENSE ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                     {c.type === TransactionType.EXPENSE ? 'Despesa' : 'Receita'}
                                 </span>
                                 <button onClick={() => handleEditCategory(c)} className="text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={14} /></button>
                                 <button onClick={() => deleteCategory(c.id)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
             
             {isAddingCategory && (
                 <div className="bg-slate-50 dark:bg-slate-700/50 p-5 rounded-xl space-y-4 h-fit border border-slate-100 dark:border-slate-700 relative animate-in fade-in slide-in-from-right-4 duration-300">
                     <button 
                        onClick={() => setIsAddingCategory(false)}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                     >
                        <X size={16} />
                     </button>
                     <h4 className="text-xs font-bold uppercase text-slate-400">{editingCategoryId ? 'Editar Categoria' : 'Nova Categoria'}</h4>
                     <div className="space-y-2">
                         <input 
                           type="text" 
                           placeholder="Nome da Categoria"
                           value={newCatName}
                           onChange={e => {
                             setNewCatName(e.target.value);
                             if (categoryError) setCategoryError('');
                           }}
                           className={`w-full px-3 py-2 bg-white dark:bg-slate-800 border ${categoryError ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 focus:ring-blue-500'} rounded-xl text-sm focus:outline-none focus:ring-2`}
                         />
                         {categoryError && <p className="text-xs text-rose-500 font-bold">{categoryError}</p>}
                         <div className="grid grid-cols-2 gap-2">
                            {/* ICON GRID SELECTOR */}
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Ícone</label>
                                <div className="grid grid-cols-8 gap-2 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 h-32 overflow-y-auto">
                                    {Object.keys(ICON_MAP).map(key => (
                                        <button
                                            key={key}
                                            onClick={() => setNewCatIcon(key)}
                                            className={`p-1.5 rounded-xl flex items-center justify-center transition-all ${newCatIcon === key ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500' : 'text-slate-400 hover:bg-slate-50 dark:bg-slate-700/50 hover:text-slate-600'}`}
                                            title={key}
                                        >
                                            {React.cloneElement(ICON_MAP[key] as React.ReactElement<any>, { size: 16 })}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <input 
                               type="color"
                               value={newCatColor}
                               onChange={e => setNewCatColor(e.target.value)}
                               className="w-full h-[38px] p-1 bg-white dark:bg-slate-800 border border-slate-200 rounded-xl cursor-pointer col-span-2"
                            />
                         </div>
                         <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200">
                            <button type="button" onClick={() => setNewCatType(TransactionType.EXPENSE)} className={`flex-1 py-1 text-xs font-bold rounded-lg ${newCatType === TransactionType.EXPENSE ? 'bg-rose-50 text-rose-600' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-700/50'}`}>Despesa</button>
                            <button type="button" onClick={() => setNewCatType(TransactionType.INCOME)} className={`flex-1 py-1 text-xs font-bold rounded-lg ${newCatType === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-700/50'}`}>Receita</button>
                         </div>
                     </div>
                     <button onClick={handleSaveCategory} className="w-full py-2 btn-tactile-primary rounded-xl text-sm font-bold">{editingCategoryId ? 'Salvar Alterações' : 'Adicionar Categoria'}</button>
                 </div>
             )}
         </div>
        </div>
        )}

       {/* Supplier Rules - REDESIGNED */}
       {activeTab === 'rules' && (
       <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
             <div className="flex items-center gap-3">
               <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><BookOpen size={20} /></div>
               <div>
                 <h3 className="text-lg font-bold text-slate-800 dark:text-white">Mapeamento de Fornecedores</h3>
                 <p className="text-sm text-slate-500 dark:text-slate-400">Selecione um fornecedor detectado ou regra ativa para configurar.</p>
               </div>
             </div>
             <button 
               onClick={() => handleCreateRule()}
               className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
             >
               <Plus size={16} /> Nova Regra
             </button>
          </div>
          
          {ruleSuggestions.length > 0 && (
            <div className="mb-6 space-y-3 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
              <h4 className="text-xs font-bold uppercase text-indigo-400 flex items-center gap-2">
                <BookOpen size={14} /> Sugestões Inteligentes
              </h4>
              <div className="flex flex-wrap gap-2">
                {ruleSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleCreateRule(suggestion.pattern, suggestion.pattern)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-200 rounded-xl hover:border-indigo-400 hover:shadow-sm transition-all text-left group"
                  >
                    <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-700">{suggestion.pattern}</span>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-xl">{suggestion.count}x</span>
                    <Plus size={14} className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
             <div className="flex justify-between items-center">
                 <h4 className="text-xs font-bold uppercase text-slate-400">Regras Ativas ({supplierRules.length})</h4>
                 {supplierRules.length > 0 && (
                     <div className="flex items-center gap-3">
                         <button onClick={applyRulesToHistory} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors">Aplicar ao Histórico</button>
                         <button onClick={clearSupplierRules} className="text-xs font-bold text-rose-500 hover:text-rose-600 px-2 py-1.5 rounded-xl hover:bg-rose-50 transition-colors">Limpar Todas</button>
                     </div>
                 )}
             </div>
             
             {supplierRules.length === 0 ? (
                 <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 italic text-sm">
                     Nenhuma regra configurada. Importe faturas para que a IA detecte fornecedores automaticamente.
                 </div>
             ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {supplierRules.map((rule, index) => (
                         <div key={rule.id} className="p-4 border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all group bg-white">
                             <div className="flex justify-between items-start mb-2">
                                 <div className="flex items-center gap-2 max-w-[70%]">
                                     <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                                         <button 
                                             onClick={() => index > 0 && reorderSupplierRules(index, index - 1)}
                                             disabled={index === 0}
                                             className={`p-0.5 rounded ${index === 0 ? 'text-slate-200' : 'text-slate-400 hover:bg-slate-100 hover:text-indigo-600'}`}
                                         >
                                             <ArrowUp size={12} />
                                         </button>
                                         <button 
                                             onClick={() => index < supplierRules.length - 1 && reorderSupplierRules(index, index + 1)}
                                             disabled={index === supplierRules.length - 1}
                                             className={`p-0.5 rounded ${index === supplierRules.length - 1 ? 'text-slate-200' : 'text-slate-400 hover:bg-slate-100 hover:text-indigo-600'}`}
                                         >
                                             <ArrowDown size={12} />
                                         </button>
                                     </div>
                                     <h5 className="font-bold text-slate-800 dark:text-white truncate" title={rule.clean_name}>{rule.clean_name}</h5>
                                 </div>
                                 <div className="flex items-center gap-1">
                                     <button onClick={() => handleEditRule(rule)} className="text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={14} /></button>
                                     <button onClick={() => deleteSupplierRule(rule.id)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                                 </div>
                             </div>
                             <p className="text-[10px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-700/50 p-1 rounded mb-3 truncate" title={rule.pattern}>Padrão: {rule.pattern}</p>
                             
                             <div className="space-y-2">
                                 <div className="flex items-center gap-2 text-xs">
                                     <span className="text-slate-500 dark:text-slate-400 w-16">Categoria:</span>
                                     <span className="font-bold text-slate-700 truncate">{categories.find(c => c.id === rule.default_category_id)?.name || <span className="text-amber-500 italic">Não definida</span>}</span>
                                 </div>
                                 <div className="flex items-center gap-2 text-xs">
                                     <span className="text-slate-500 dark:text-slate-400 w-16">C. Custo:</span>
                                     <span className="font-bold text-slate-700 truncate">{costCenters.find(c => c.id === rule.default_cost_center_id)?.name || <span className="text-slate-400 italic">Nenhum</span>}</span>
                                 </div>
                             </div>
                         </div>
                     ))}
                 </div>
             )}
          </div>
       </div>
       )}

       {/* Cost Centers */}
       {activeTab === 'costCenters' && (
       <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Briefcase size={20} /></div><div><h3 className="text-lg font-bold text-slate-800 dark:text-white">Centros de Custo</h3><p className="text-sm text-slate-500 dark:text-slate-400">Organize suas despesas por projetos ou departamentos.</p></div></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-3">
                 <h4 className="text-xs font-bold uppercase text-slate-400">Centros Cadastrados</h4>
                 {costCenters.length === 0 ? (
                     <p className="text-sm text-slate-400 italic">Nenhum centro de custo cadastrado.</p>
                 ) : (
                     costCenters.map(cc => (
                         <div key={cc.id} className="flex justify-between items-center p-3 border border-slate-100 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:bg-slate-700/50 group">
                             <div>
                                 <p className="font-bold text-slate-800 dark:text-white text-sm">{cc.name}</p>
                                 <div className="flex items-center gap-2">
                                     <p className="text-xs text-slate-400">{cc.code}</p>
                                     {cc.group && <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">{cc.group}</span>}
                                 </div>
                             </div>
                             <div className="flex items-center gap-3">
                                 <div className="flex gap-1">
                                     {cc.enabled_for_credit && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">Crédito</span>}
                                     {cc.enabled_for_accounts && <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold">Contas</span>}
                                 </div>
                                 <button onClick={() => handleEditCostCenter(cc)} className="text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={16} /></button>
                                 <button onClick={() => deleteCostCenter(cc.id)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                             </div>
                         </div>
                     ))
                 )}
             </div>
             
             <div className="bg-slate-50 dark:bg-slate-700/50 p-5 rounded-xl space-y-4 h-fit relative">
                 {editingCostCenterId && (
                     <button 
                        onClick={handleCancelCostCenter}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                     >
                        <X size={16} />
                     </button>
                 )}
                 <h4 className="text-xs font-bold uppercase text-slate-400">{editingCostCenterId ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}</h4>
                 <div className="space-y-2">
                     <input type="text" placeholder="Nome" value={newCostCenterName} onChange={e => { setNewCostCenterName(e.target.value); if (costCenterError) setCostCenterError(''); }} className={`w-full px-3 py-2 bg-white dark:bg-slate-800 border ${costCenterError ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 focus:ring-blue-500'} rounded-xl text-sm focus:outline-none focus:ring-2`} />
                     {costCenterError && <p className="text-xs text-rose-500 font-bold">{costCenterError}</p>}
                     <input type="text" placeholder="Código" value={newCostCenterCode} onChange={e => setNewCostCenterCode(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                     <input type="text" placeholder="Grupo (Hierarquia)" value={newCostCenterGroup} onChange={e => setNewCostCenterGroup(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                 </div>
                 <div className="space-y-2">
                     <div onClick={() => setCcEnabledCredit(!ccEnabledCredit)} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                         {ccEnabledCredit ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} className="text-slate-300" />} Habilitar para Crédito
                     </div>
                     <div onClick={() => setCcEnabledAccounts(!ccEnabledAccounts)} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                         {ccEnabledAccounts ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} className="text-slate-300" />} Habilitar para Contas
                     </div>
                 </div>
                 <button onClick={handleSaveCostCenter} className="w-full py-2 btn-tactile-primary rounded-xl text-sm font-bold">{editingCostCenterId ? 'Salvar Alterações' : 'Adicionar Centro'}</button>
             </div>
          </div>
       </div>
       )}

       {/* Danger Zone */}
       {activeTab === 'advanced' && (
       <div className="bg-rose-50 rounded-2xl border border-rose-100 p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-rose-100 text-rose-600 rounded-xl"><AlertTriangle size={20} /></div>
             <div>
               <h3 className="text-lg font-bold text-rose-900">Zona de Perigo</h3>
               <p className="text-sm text-rose-700">Ações irreversíveis para o seu aplicativo.</p>
             </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-rose-100 flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
             <div>
               <h4 className="text-sm font-bold text-slate-800 dark:text-white">Lixeira</h4>
               <p className="text-xs text-slate-500 dark:text-slate-400">Itens excluídos recentemente podem ser restaurados ou excluídos permanentemente.</p>
             </div>
             <button onClick={() => setIsTrashModalOpen(true)} className="flex items-center gap-2 px-4 py-2 btn-tactile-white text-rose-600 text-sm font-bold rounded-xl whitespace-nowrap">
               <Trash2 size={16} /> Abrir Lixeira
             </button>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-rose-100 flex flex-col md:flex-row justify-between items-center gap-4">
             <div>
               <h4 className="text-sm font-bold text-slate-800 dark:text-white">Resetar Aplicativo</h4>
               <p className="text-xs text-slate-500 dark:text-slate-400">Apaga todos os dados, incluindo transações, contas e cartões.</p>
             </div>
             <button onClick={handleResetDatabase} className="flex items-center gap-2 px-4 py-2 btn-tactile-danger text-sm font-bold rounded-xl whitespace-nowrap">
               <RotateCcw size={16} /> Resetar Tudo
             </button>
          </div>
       </div>
       )}
      </div>
    </div>
  );
};

export default SettingsView;
