import React, { useState, useEffect } from 'react';
import { X, Filter, RefreshCcw, Bookmark, Save, Trash2 } from 'lucide-react';
import { Category, CostCenter } from '../types';

export interface AdvancedFilters {
  type: 'ALL' | 'INCOME' | 'EXPENSE';
  categories: string[];
  costCenters: string[];
  minAmount: number | null;
  maxAmount: number | null;
}

interface SavedFilter {
  id: string;
  name: string;
  filters: AdvancedFilters;
}

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: AdvancedFilters;
  setFilters: React.Dispatch<React.SetStateAction<AdvancedFilters>>;
  categories: Category[];
  costCenters: CostCenter[];
}

const FilterPanel: React.FC<FilterPanelProps> = ({ isOpen, onClose, filters, setFilters, categories, costCenters }) => {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [newFilterName, setNewFilterName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loaded = localStorage.getItem('savedFilters');
    if (loaded) {
      try {
        setSavedFilters(JSON.parse(loaded));
      } catch (e) {
        console.error('Failed to parse saved filters', e);
      }
    }
  }, []);

  const saveFilters = () => {
    if (!newFilterName.trim()) return;
    
    const newSavedFilter: SavedFilter = {
      id: Date.now().toString(),
      name: newFilterName.trim(),
      filters: { ...filters }
    };
    
    const updated = [...savedFilters, newSavedFilter];
    setSavedFilters(updated);
    localStorage.setItem('savedFilters', JSON.stringify(updated));
    setNewFilterName('');
    setIsSaving(false);
  };

  const deleteSavedFilter = (id: string) => {
    const updated = savedFilters.filter(f => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem('savedFilters', JSON.stringify(updated));
  };

  const applySavedFilter = (savedFilter: SavedFilter) => {
    setFilters(savedFilter.filters);
  };

  if (!isOpen) return null;

  const handleReset = () => {
    setFilters({
      type: 'ALL',
      categories: [],
      costCenters: [],
      minAmount: null,
      maxAmount: null
    });
  };

  const toggleCategory = (categoryId: string) => {
    setFilters(prev => {
      const isSelected = prev.categories.includes(categoryId);
      if (isSelected) {
        return { ...prev, categories: prev.categories.filter(id => id !== categoryId) };
      } else {
        return { ...prev, categories: [...prev.categories, categoryId] };
      }
    });
  };

  const toggleCostCenter = (costCenterId: string) => {
    setFilters(prev => {
      const isSelected = prev.costCenters.includes(costCenterId);
      if (isSelected) {
        return { ...prev, costCenters: prev.costCenters.filter(id => id !== costCenterId) };
      } else {
        return { ...prev, costCenters: [...prev.costCenters, costCenterId] };
      }
    });
  };

  const hasActiveFilters = filters.type !== 'ALL' || filters.categories.length > 0 || filters.costCenters.length > 0 || filters.minAmount !== null || filters.maxAmount !== null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Filter size={20} />
            </div>
            <h2 className="text-xl font-black text-slate-800">Filtros Avançados</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Filtros Salvos */}
          {savedFilters.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Bookmark size={14} className="text-blue-500" /> Filtros Salvos
              </h3>
              <div className="flex flex-wrap gap-2">
                {savedFilters.map(sf => (
                  <div key={sf.id} className="flex items-center bg-blue-50 border border-blue-100 rounded-xl overflow-hidden">
                    <button
                      onClick={() => applySavedFilter(sf)}
                      className="px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      {sf.name}
                    </button>
                    <button
                      onClick={() => deleteSavedFilter(sf.id)}
                      className="px-2 py-1.5 text-blue-400 hover:text-rose-500 hover:bg-blue-100 transition-colors border-l border-blue-100"
                      title="Excluir filtro salvo"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tipo de Transação */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Tipo de Transação</h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setFilters({ ...filters, type: 'ALL' })}
                className={`py-2 px-3 rounded-xl text-sm font-bold transition-all ${filters.type === 'ALL' ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
              >
                Todas
              </button>
              <button
                onClick={() => setFilters({ ...filters, type: 'INCOME' })}
                className={`py-2 px-3 rounded-xl text-sm font-bold transition-all ${filters.type === 'INCOME' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
              >
                Receitas
              </button>
              <button
                onClick={() => setFilters({ ...filters, type: 'EXPENSE' })}
                className={`py-2 px-3 rounded-xl text-sm font-bold transition-all ${filters.type === 'EXPENSE' ? 'bg-rose-600 text-white shadow-md shadow-rose-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
              >
                Despesas
              </button>
            </div>
          </div>

          {/* Categorias */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Categorias</h3>
              {filters.categories.length > 0 && (
                <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {filters.categories.length} selecionadas
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => {
                const isSelected = filters.categories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      isSelected 
                        ? 'bg-blue-50 border-blue-200 text-blue-700' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Centros de Custo */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Centros de Custo</h3>
              {filters.costCenters.length > 0 && (
                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                  {filters.costCenters.length} selecionados
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {costCenters.map(cc => {
                const isSelected = filters.costCenters.includes(cc.id);
                return (
                  <button
                    key={cc.id}
                    onClick={() => toggleCostCenter(cc.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      isSelected 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {cc.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Valores */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Valor (R$)</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-500 mb-1 block">Mínimo</label>
                <input 
                  type="number" 
                  placeholder="0,00"
                  value={filters.minAmount || ''}
                  onChange={(e) => setFilters({ ...filters, minAmount: e.target.value ? Number(e.target.value) : null })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-500 mb-1 block">Máximo</label>
                <input 
                  type="number" 
                  placeholder="0,00"
                  value={filters.maxAmount || ''}
                  onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value ? Number(e.target.value) : null })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Salvar Filtro */}
          {hasActiveFilters && (
            <div className="pt-6 border-t border-slate-100">
              {isSaving ? (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Nome do Filtro</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Ex: Despesas Altas"
                      value={newFilterName}
                      onChange={(e) => setNewFilterName(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      autoFocus
                    />
                    <button 
                      onClick={saveFilters}
                      disabled={!newFilterName.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all"
                    >
                      Salvar
                    </button>
                    <button 
                      onClick={() => { setIsSaving(false); setNewFilterName(''); }}
                      className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setIsSaving(true)}
                  className="w-full py-3 border-2 border-dashed border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={16} /> Salvar Filtro Atual
                </button>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
          <button 
            onClick={handleReset}
            className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCcw size={16} /> Limpar
          </button>
          <button 
            onClick={onClose}
            className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
          >
            Aplicar Filtros
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
