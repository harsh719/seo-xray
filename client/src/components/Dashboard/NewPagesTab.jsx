import React from 'react';
import DataTable from '../shared/DataTable';
import { StatCard, SectionHeader } from '../shared/StatusCards';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { FilePlus, TrendingUp, FileText, Tag } from 'lucide-react';

const INTENT_COLORS = {
  transactional: '#10b981',
  commercial: '#f59e0b',
  informational: '#3377ff',
  navigational: '#8b5cf6',
};

export default function NewPagesTab({ data }) {
  if (!data || !data.opportunities?.length) {
    return <div className="text-center text-slate-500 py-20">No new page opportunities found</div>;
  }

  const { opportunities, summary } = data;

  const intentData = Object.entries(summary.byIntent || {}).map(([name, value]) => ({ name, value }));
  const pageTypeData = Object.entries(summary.byPageType || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const columns = [
    { key: 'keyword', label: 'Keyword', render: (v) => <span className="font-medium text-white">{v}</span> },
    { key: 'search_volume', label: 'SV', align: 'right', render: (v) => v?.toLocaleString() },
    { key: 'keyword_difficulty', label: 'KD', align: 'right', render: (v) => (
      <span className={v < 30 ? 'text-emerald-400' : v < 60 ? 'text-amber-400' : 'text-rose-400'}>{v}</span>
    )},
    { key: 'cpc', label: 'CPC', align: 'right', render: (v) => v ? `$${v.toFixed(2)}` : '—' },
    { key: 'intent', label: 'Intent', render: (v) => (
      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
        v === 'transactional' ? 'bg-emerald-500/20 text-emerald-400' :
        v === 'commercial' ? 'bg-amber-500/20 text-amber-400' :
        v === 'informational' ? 'bg-brand-500/20 text-brand-400' :
        'bg-purple-500/20 text-purple-400'
      }`}>{v}</span>
    )},
    { key: 'suggested_page_type', label: 'Page Type', render: (v) => <span className="text-xs">{v}</span> },
    { key: 'source', label: 'Source', render: (v) => (
      <span className="text-xs text-slate-500">{v === 'competitor_gap' ? 'Gap' : 'Related'}</span>
    )},
    { key: 'priority_score', label: 'Priority', align: 'right', render: (v) => (
      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
        v >= 60 ? 'bg-emerald-500/20 text-emerald-400' :
        v >= 30 ? 'bg-amber-500/20 text-amber-400' :
        'bg-slate-500/20 text-slate-400'
      }`}>{v}</span>
    )},
  ];

  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Opportunities" value={summary.totalOpportunities.toLocaleString()} icon={FilePlus} color="brand" />
        <StatCard label="Total Search Volume" value={summary.totalSearchVolume.toLocaleString()} icon={TrendingUp} color="emerald" />
        <StatCard label="Page Types" value={Object.keys(summary.byPageType || {}).length} icon={FileText} color="amber" />
        <StatCard label="Intent Types" value={Object.keys(summary.byIntent || {}).length} icon={Tag} color="brand" />
      </div>

      {/* Page Type Cards + Intent Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Page Type Summary */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <SectionHeader title="By Page Type" />
          <div className="space-y-2">
            {pageTypeData.map(([type, count]) => (
              <div key={type} className="flex items-center justify-between px-3 py-2 bg-slate-800/30 rounded-lg">
                <span className="text-sm text-slate-300">{type}</span>
                <span className="text-sm font-medium text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Intent Distribution */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <SectionHeader title="Intent Distribution" />
          <div className="h-48">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={intentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={2}>
                  {intentData.map((entry, i) => (
                    <Cell key={i} fill={INTENT_COLORS[entry.name] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {intentData.map(entry => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: INTENT_COLORS[entry.name] || '#64748b' }} />
                {entry.name} ({entry.value})
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full Table */}
      <DataTable columns={columns} data={opportunities} defaultSort={{ key: 'priority_score', dir: 'desc' }} />
    </div>
  );
}
