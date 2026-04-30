import React, { useState } from 'react';
import DataTable from '../shared/DataTable';
import { StatCard, SectionHeader } from '../shared/StatusCards';
import { Target, Zap, TrendingUp, BarChart3 } from 'lucide-react';

export default function StrikingDistanceTab({ data }) {
  const [view, setView] = useState('table'); // 'table' | 'grouped'

  if (!data || !data.keywords?.length) {
    return <div className="text-center text-slate-500 py-20">No striking distance keywords found</div>;
  }

  const { keywords, quickWins, groupedByUrl, summary } = data;

  const columns = [
    { key: 'keyword', label: 'Keyword', render: (v) => <span className="font-medium text-white">{v}</span> },
    { key: 'rank_group', label: 'Rank', align: 'right' },
    { key: 'search_volume', label: 'SV', align: 'right', render: (v) => v?.toLocaleString() },
    { key: 'keyword_difficulty', label: 'KD', align: 'right', render: (v) => (
      <span className={v < 30 ? 'text-emerald-400' : v < 60 ? 'text-amber-400' : 'text-rose-400'}>{v}</span>
    )},
    { key: 'cpc', label: 'CPC', align: 'right', render: (v) => v ? `$${v.toFixed(2)}` : '—' },
    { key: 'etv', label: 'ETV', align: 'right', render: (v) => v?.toLocaleString() },
    { key: 'ops_score', label: 'OPS', align: 'right', render: (v) => (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        v >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
        v >= 40 ? 'bg-amber-500/20 text-amber-400' :
        'bg-slate-500/20 text-slate-400'
      }`}>{v}</span>
    )},
    { key: 'ranking_url', label: 'Ranking URL', render: (v) => (
      <span className="text-xs text-slate-500 max-w-[200px] truncate block">{v || '—'}</span>
    )},
    { key: 'has_ai_overview', label: 'AIO', align: 'right', render: (v) => v ? '✓' : '—' },
  ];

  const groupedArr = Object.values(groupedByUrl || {}).sort((a, b) => b.totalSV - a.totalSV);

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Keywords" value={summary.totalKeywords.toLocaleString()} icon={Target} color="brand" />
        <StatCard label="Total Search Volume" value={summary.totalSearchVolume.toLocaleString()} icon={BarChart3} color="emerald" />
        <StatCard label="Avg. Rank" value={summary.avgRank} icon={TrendingUp} color="amber" />
        <StatCard label="Quick Wins" value={quickWins.length} icon={Zap} color="emerald" sub="Top OPS score keywords" />
      </div>

      {/* Quick Wins */}
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6">
        <SectionHeader title="Quick Wins" description="Top 20 keywords by Optimization Priority Score" />
        <DataTable
          columns={columns}
          data={quickWins.slice(0, 20)}
          defaultSort={{ key: 'ops_score', dir: 'desc' }}
          pageSize={20}
          selectable
          exportFilename="striking-distance-quick-wins.csv"
        />
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setView('table')}
          className={`px-3 py-1.5 text-sm rounded-lg transition ${view === 'table' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
        >
          Table View
        </button>
        <button
          onClick={() => setView('grouped')}
          className={`px-3 py-1.5 text-sm rounded-lg transition ${view === 'grouped' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
        >
          Grouped by URL
        </button>
      </div>

      {/* Main Data */}
      {view === 'table' ? (
        <DataTable
          columns={columns}
          data={keywords}
          defaultSort={{ key: 'ops_score', dir: 'desc' }}
          selectable
          regexFilter
          exportFilename="striking-distance-keywords.csv"
        />
      ) : (
        <div className="space-y-3">
          {groupedArr.map(group => (
            <details key={group.url} className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden group">
              <summary className="px-5 py-4 cursor-pointer hover:bg-slate-800/30 transition flex items-center justify-between">
                <div>
                  <span className="text-sm text-white font-medium">{group.url || 'Unknown'}</span>
                  <span className="ml-3 text-xs text-slate-500">{group.keywords.length} keywords</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span>SV: {group.totalSV.toLocaleString()}</span>
                  <span>ETV: {group.totalETV.toLocaleString()}</span>
                  <span>Avg Rank: {group.avgRank}</span>
                </div>
              </summary>
              <div className="px-5 pb-4">
                <DataTable
                  columns={columns}
                  data={group.keywords}
                  defaultSort={{ key: 'ops_score', dir: 'desc' }}
                  pageSize={50}
                  selectable
                  exportFilename={`striking-${group.url?.replace(/[^a-z0-9]/gi, '-') || 'unknown'}.csv`}
                />
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
