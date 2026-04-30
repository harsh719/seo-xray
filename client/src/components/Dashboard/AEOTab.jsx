import React from 'react';
import DataTable from '../shared/DataTable';
import { StatCard, SectionHeader } from '../shared/StatusCards';
import { Bot, AlertTriangle, CheckCircle2, Eye } from 'lucide-react';

export default function AEOTab({ data }) {
  if (!data) {
    return <div className="text-center text-slate-500 py-20">No AEO/GEO data available</div>;
  }

  const { gaps = [], serpResults = [], aioWins = [], summary = {} } = data;

  const gapColumns = [
    { key: 'keyword', label: 'Keyword', render: (v) => <span className="font-medium text-white">{v}</span> },
    { key: 'search_volume', label: 'SV', align: 'right', render: (v) => v?.toLocaleString() },
    { key: 'has_ai_overview', label: 'AIO', render: (v) => v ? <span className="text-amber-400">Yes</span> : '—' },
    { key: 'client_in_ai_overview', label: 'Client in AIO', render: (v) => v ? <span className="text-emerald-400">Yes</span> : <span className="text-rose-400">No</span> },
    { key: 'competitors_in_ai_overview', label: 'Competitors in AIO', render: (v) => (
      <span className="text-xs text-slate-400">{Array.isArray(v) ? v.join(', ') : '—'}</span>
    )},
    { key: 'opportunity_type', label: 'Type', render: (v) => (
      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
        v === 'aeo_gap' ? 'bg-rose-500/20 text-rose-400' :
        v === 'featured_snippet' ? 'bg-amber-500/20 text-amber-400' :
        'bg-brand-500/20 text-brand-400'
      }`}>{v?.replace(/_/g, ' ')}</span>
    )},
    { key: 'priority', label: 'Priority', render: (v) => (
      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
        v === 'high' ? 'bg-rose-500/20 text-rose-400' :
        v === 'medium' ? 'bg-amber-500/20 text-amber-400' :
        'bg-slate-500/20 text-slate-400'
      }`}>{v}</span>
    )},
    { key: 'recommendation', label: 'Recommendation', render: (v) => (
      <span className="text-xs text-slate-400 max-w-[300px] block truncate" title={v}>{v || '—'}</span>
    )},
  ];

  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="AEO Gaps" value={summary.totalAEOGaps || 0} icon={AlertTriangle} color="rose" />
        <StatCard label="Client AIO Keywords" value={summary.clientAIOKeywords || 0} icon={CheckCircle2} color="emerald" />
        <StatCard label="SERP Features Analyzed" value={summary.serpFeaturesAnalyzed || 0} icon={Eye} color="brand" />
        <StatCard label="High Priority" value={summary.highPriorityGaps || 0} icon={Bot} color="amber" />
      </div>

      {/* AIO Coverage Comparison */}
      {summary.competitorAIOCoverage && Object.keys(summary.competitorAIOCoverage).length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <SectionHeader title="AI Overview Coverage" description="Number of keywords with AI Overview citations per domain" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-brand-500/10 border border-brand-500/20 rounded-lg px-4 py-3">
              <div className="text-xs text-slate-400">Client</div>
              <div className="text-xl font-bold text-white mt-1">{summary.clientAIOKeywords || 0}</div>
            </div>
            {Object.entries(summary.competitorAIOCoverage).map(([domain, count]) => (
              <div key={domain} className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3">
                <div className="text-xs text-slate-400 truncate">{domain}</div>
                <div className="text-xl font-bold text-white mt-1">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gap Table */}
      <div>
        <SectionHeader title="AEO Gap Opportunities" description="Keywords where competitors appear in AI Overviews but you don't" />
        <DataTable columns={gapColumns} data={gaps} defaultSort={{ key: 'search_volume', dir: 'desc' }} />
      </div>
    </div>
  );
}
