import React from 'react';
import { exportToCSV, ExportPeriod } from '../utils/exportCSV';
import { Download } from 'lucide-react';
import { Transaction, Category } from '../types';
import { cn } from '../lib/utils';

interface ExportDataProps {
  transactions: Transaction[];
  categories: Category[];
}

const PERIODS: { label: string; value: ExportPeriod }[] = [
  { label: 'Mese corrente', value: 'current_month' },
  { label: 'Ultimi 3 mesi', value: 'last_3_months' },
  { label: 'Anno corrente', value: 'current_year' },
  { label: 'Tutti i dati', value: 'all' },
];

const ExportData = ({ transactions, categories }: ExportDataProps) => {
  const handleExport = (period: ExportPeriod) => {
    exportToCSV({ transactions, categories, period });
  };

  return (
    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
      <h3 className="text-sm font-semibold text-slate-800 mb-3">Esporta i tuoi dati</h3>
      <div className="grid grid-cols-2 gap-2">
        {PERIODS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => handleExport(value)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200',
              'bg-white text-slate-700 text-xs font-semibold',
              'active:scale-95 transition-all'
            )}
          >
            <Download size={14} className="text-emerald-500 shrink-0" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ExportData;
