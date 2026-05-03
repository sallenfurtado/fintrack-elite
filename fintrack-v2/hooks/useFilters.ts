import { useMemo, useState } from 'react';
import { Transaction } from '../types';

export interface AdvancedFilters {
  type: 'ALL' | 'INCOME' | 'EXPENSE';
  categories: string[];
  costCenters: string[];
  minAmount: number | null;
  maxAmount: number | null;
}

const DEFAULT_FILTERS: AdvancedFilters = {
  type: 'ALL',
  categories: [],
  costCenters: [],
  minAmount: null,
  maxAmount: null,
};

export function useFilters(transactions: Transaction[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(DEFAULT_FILTERS);
  const [showBalanceLines, setShowBalanceLines] = useState(false);

  const hasActiveFilters = useMemo(
    () =>
      advancedFilters.type !== 'ALL' ||
      advancedFilters.categories.length > 0 ||
      advancedFilters.costCenters.length > 0 ||
      advancedFilters.minAmount !== null ||
      advancedFilters.maxAmount !== null ||
      !!selectedMonthFilter,
    [advancedFilters, selectedMonthFilter]
  );

  const filtered = useMemo(() => {
    let result = transactions;

    if (!showBalanceLines) result = result.filter(t => !t.is_balance_line);

    if (selectedMonthFilter) {
      result = result.filter(t => t.invoice_date?.startsWith(selectedMonthFilter) || t.date?.startsWith(selectedMonthFilter));
    }

    if (advancedFilters.type !== 'ALL') {
      result = result.filter(t =>
        advancedFilters.type === 'INCOME' ? t.amount > 0 : t.amount < 0
      );
    }

    if (advancedFilters.categories.length > 0) {
      result = result.filter(t => t.category_id && advancedFilters.categories.includes(t.category_id));
    }

    if (advancedFilters.costCenters.length > 0) {
      result = result.filter(t => {
        if (t.allocations?.some(a => advancedFilters.costCenters.includes(a.cost_center_id))) return true;
        if (t.cost_center_id && advancedFilters.costCenters.includes(t.cost_center_id)) return true;
        return false;
      });
    }

    if (advancedFilters.minAmount !== null) {
      result = result.filter(t => Math.abs(t.amount) >= advancedFilters.minAmount!);
    }
    if (advancedFilters.maxAmount !== null) {
      result = result.filter(t => Math.abs(t.amount) <= advancedFilters.maxAmount!);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.description?.toLowerCase().includes(q) ||
        String(Math.abs(t.amount)).includes(q)
      );
    }

    return result;
  }, [transactions, showBalanceLines, selectedMonthFilter, advancedFilters, searchQuery]);

  const resetFilters = () => {
    setAdvancedFilters(DEFAULT_FILTERS);
    setSelectedMonthFilter(null);
    setSearchQuery('');
  };

  return {
    searchQuery, setSearchQuery,
    selectedMonthFilter, setSelectedMonthFilter,
    advancedFilters, setAdvancedFilters,
    showBalanceLines, setShowBalanceLines,
    hasActiveFilters,
    filtered,
    resetFilters,
  };
}
