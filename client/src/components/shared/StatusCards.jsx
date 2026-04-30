import React from 'react';

export function StatCard({ label, value, sub, icon: Icon, color = 'brand' }) {
  const colorClasses = {
    brand: 'from-brand-500/20 to-brand-600/5 border-brand-500/20',
    emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20',
    amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/20',
    rose: 'from-rose-500/20 to-rose-600/5 border-rose-500/20',
    slate: 'from-slate-500/20 to-slate-600/5 border-slate-500/20',
  };

  const iconColors = {
    brand: 'text-brand-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    rose: 'text-rose-400',
    slate: 'text-slate-400',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-5`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</span>
        {Icon && <Icon className={`w-4 h-4 ${iconColors[color]}`} />}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

export function SectionHeader({ title, description }) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
    </div>
  );
}
