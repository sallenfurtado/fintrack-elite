
import React from 'react';
import { 
  Home, Wallet, CreditCard, ShoppingBag, 
  Coffee, Car, Heart, Plus, TrendingUp, 
  TrendingDown, Settings, HelpCircle, 
  ArrowUpRight, ArrowDownLeft, Calendar,
  PieChart, LayoutDashboard, Search
} from 'lucide-react';
import { Category, TransactionType } from './types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Moradia', icon_key: 'Home', color_hex: '#3b82f6', type: TransactionType.EXPENSE },
  { id: 'cat-2', name: 'Alimentação', icon_key: 'Coffee', color_hex: '#f59e0b', type: TransactionType.EXPENSE },
  { id: 'cat-3', name: 'Transporte', icon_key: 'Car', color_hex: '#10b981', type: TransactionType.EXPENSE },
  { id: 'cat-4', name: 'Salário', icon_key: 'TrendingUp', color_hex: '#8b5cf6', type: TransactionType.INCOME },
  { id: 'cat-5', name: 'Compras', icon_key: 'ShoppingBag', color_hex: '#ec4899', type: TransactionType.EXPENSE },
  { id: 'cat-6', name: 'Saúde', icon_key: 'Heart', color_hex: '#ef4444', type: TransactionType.EXPENSE },
];

export const ICON_MAP: Record<string, React.ReactNode> = {
  Home: <Home size={18} />,
  Wallet: <Wallet size={18} />,
  CreditCard: <CreditCard size={18} />,
  ShoppingBag: <ShoppingBag size={18} />,
  Coffee: <Coffee size={18} />,
  Car: <Car size={18} />,
  Heart: <Heart size={18} />,
  TrendingUp: <TrendingUp size={18} />,
  TrendingDown: <TrendingDown size={18} />,
  Calendar: <Calendar size={18} />,
  Settings: <Settings size={18} />,
  LayoutDashboard: <LayoutDashboard size={18} />,
  Search: <Search size={18} />,
  ArrowUpRight: <ArrowUpRight size={18} />,
  ArrowDownLeft: <ArrowDownLeft size={18} />,
};
