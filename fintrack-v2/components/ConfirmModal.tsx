import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDangerous = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className={`p-6 ${isDangerous ? 'bg-rose-50' : 'bg-slate-50'} border-b ${isDangerous ? 'border-rose-100' : 'border-slate-100'} flex justify-between items-center`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isDangerous ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
              <AlertTriangle size={20} />
            </div>
            <h3 className={`text-lg font-bold ${isDangerous ? 'text-rose-900' : 'text-slate-900'}`}>{title}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-slate-600 text-sm leading-relaxed">{message}</p>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 btn-tactile-white rounded-xl text-sm font-bold"
          >
            {cancelText}
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 font-bold text-sm rounded-xl ${
              isDangerous 
                ? 'btn-tactile-danger' 
                : 'btn-tactile-primary'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
