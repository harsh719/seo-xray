import React, { useState, useMemo } from 'react';
import DataTable, { exportToCSV } from '../shared/DataTable';
import { StatCard, SectionHeader } from '../shared/StatusCards';
import { Layers, AlertTriangle, FileText, TrendingUp, Download, ChevronDown, ChevronRight, CheckSquare, Square } from 'lucide-react';

export default function ContentGapTab({ data }) {
  const [expandedGaps, setExpandedGaps] = useState(new Set());
  const [selectedGaps, setSelectedGaps] = useState(new Set());

  if (!data) {
    return <div className="text-center text-slate-500 py-20">No content gap data available</div>;
  }

  const { gaps = [], matrix = {}, summary = {} } = data;

  const domains = gaps.length > 0
    ? [...new Set(gaps.map(g => g.competitor_domain))]
    : [];

  const toggleExpand = (i) => {
    setExpandedGaps(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const toggleSelect = (i) => {
    setSelectedGaps(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedGaps.size === gaps.length) {
      setSelectedGaps(new Set());
    } else {
      setSelectedGaps(new Set(gaps.map((_, i) => i)));
    }
  };

  const handleExportGaps = () => {
    const exportGaps = selectedGaps.size > 0
      ? gaps.filter((_, i) => selectedGaps.has(i))
      : gaps;

    // Flatten gaps with their keywords for CSV
    const rows = [];
    for (const gap of exportGaps) {
      if (gap.target_keywords?.length > 0) {
        for (const kw of gap.target_keywords) {
          rows.push({
            page_type: gap.page_type,
            gap_type: gap.gap_type,
            competitor_domain: gap.competitor_domain,
            competitor_url: gap.competitor_url,
            competitor_page_title: gap.competitor_page_title,
            estimated_traffic: gap.estimated_traffic,
            priority: gap.priority,
            keyword: kw.keyword,
            keyword_sv: kw.search_volume,
            keyword_kd: kw.difficulty,
          });
        }
      } else {
        rows.push({
          page_type: gap.page_type,
          gap_type: gap.gap_type,
          competitor_domain: gap.competitor_domain,
          competitor_url: gap.competitor_url,
          competitor_page_title: gap.competitor_page_title,
          estimated_traffic: gap.estimated_traffic,
          priority: gap.priority,
          keyword: '',
          keyword_sv: '',
          keyword_kd: '',
        });
      }
    }

    const cols = [
      { key: 'page_type', label: 'Page Type' },
      { key: 'gap_type', label: 'Gap Type' },
      { key: 'competitor_domain', label: 'Competitor' },
      { key: 'competitor_url', label: 'Competitor URL' },
      { key: 'competitor_page_title', label: 'Page Title' },
      { key: 'estimated_traffic', label: 'Est. Traffic' },
      { key: 'priority', label: 'Priority' },
      { key: 'keyword', label: 'Target Keyword' },
      { key: 'keyword_sv', label: 'Keyword SV' },
      { key: 'keyword_kd', label: 'Keyword KD' },
    ];
    exportToCSV(cols, rows, 'content-gap-analysis.csv');
  };

  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Gaps" value={summary.totalGaps || 0} icon={Layers} color="brand" />
        <StatCard label="Missing Page Types" value={summary.pageTypeMissing || 0} icon={AlertTriangle} color="rose" />
        <StatCard label="Topic Gaps" value={summary.topicGaps || 0} icon={FileText} color="amber" />
        <StatCard label="High Priority" value={summary.highPriority || 0} icon={TrendingUp} color="emerald" />
      </div>

      {/* Comparison Matrix */}
      {Object.keys(matrix).length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 overflow-x-auto">
          <SectionHeader title="Page Type Comparison Matrix" description="Number of pages per type across domains" />
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-2 text-slate-400 font-medium">Page Type</th>
                <th className="text-right px-4 py-2 text-brand-400 font-medium">Client</th>
                {domains.map(d => (
                  <th key={d} className="text-right px-4 py-2 text-slate-400 font-medium truncate max-w-[100px]">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(matrix).map(([pageType, counts]) => {
                const clientCount = counts.client || 0;
                const hasGap = clientCount === 0 && Object.values(counts).some((v, i) => i > 0 && v > 0);
                return (
                  <tr key={pageType} className={`border-b border-slate-800/50 ${hasGap ? 'bg-rose-500/5' : ''}`}>
                    <td className="px-4 py-2.5 text-slate-300 capitalize">{pageType.replace(/_/g, ' ')}</td>
                    <td className={`px-4 py-2.5 text-right font-mono ${clientCount === 0 ? 'text-rose-400' : 'text-white'}`}>
                      {clientCount}
                    </td>
                    {domains.map(d => (
                      <td key={d} className="px-4 py-2.5 text-right font-mono text-slate-400">
                        {counts[d] || 0}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Gap Details with Keywords */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <SectionHeader title="Gap Details" description="Specific gaps with competitor pages and target keywords" />
          <div className="flex items-center gap-3">
            {selectedGaps.size > 0 && (
              <span className="text-xs text-brand-400">{selectedGaps.size} selected</span>
            )}
            <button
              onClick={selectAll}
              className="text-xs text-slate-400 hover:text-white transition"
            >
              {selectedGaps.size === gaps.length ? 'Deselect All' : 'Select All'}
            </button>
            <button
              onClick={handleExportGaps}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-500 rounded-lg transition"
            >
              <Download className="w-3.5 h-3.5" />
              {selectedGaps.size > 0 ? `Export ${selectedGaps.size}` : 'Export All CSV'}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {gaps.map((gap, i) => {
            const isExpanded = expandedGaps.has(i);
            const isSelected = selectedGaps.has(i);
            const hasKeywords = gap.target_keywords?.length > 0;

            return (
              <div
                key={i}
                className={`border rounded-xl overflow-hidden transition-colors ${
                  isSelected ? 'border-brand-500/40 bg-brand-500/5' : 'border-slate-800 bg-slate-900/50'
                }`}
              >
                {/* Gap Header */}
                <div className="flex items-center gap-3 px-5 py-4">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(i); }}
                    className="text-slate-400 hover:text-white shrink-0"
                  >
                    {isSelected ? <CheckSquare className="w-4 h-4 text-brand-400" /> : <Square className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => toggleExpand(i)}
                    className="flex-1 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-white capitalize text-sm">{gap.page_type?.replace(/_/g, ' ')}</span>
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            gap.gap_type === 'page_type_missing' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>{gap.gap_type === 'page_type_missing' ? 'Missing Type' : 'Topic Gap'}</span>
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            gap.priority === 'high' ? 'bg-rose-500/20 text-rose-400' :
                            gap.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-slate-500/20 text-slate-400'
                          }`}>{gap.priority}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 truncate">{gap.competitor_domain} — {gap.competitor_page_title || gap.competitor_url}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400 shrink-0 ml-4">
                      <span>Traffic: {gap.estimated_traffic?.toLocaleString() || 0}</span>
                      <span>KW Vol: {gap.total_keyword_volume?.toLocaleString() || 0}</span>
                      {hasKeywords && <span className="text-brand-400">{gap.target_keywords.length} keywords</span>}
                    </div>
                  </button>
                </div>

                {/* Expanded: Keywords */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-slate-800/50">
                    <div className="mt-4 mb-3">
                      <p className="text-xs text-slate-400 mb-1">Competitor URL: <a href={gap.competitor_url?.startsWith('http') ? gap.competitor_url : `https://${gap.competitor_url}`} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">{gap.competitor_url}</a></p>
                      <p className="text-xs text-slate-500">{gap.recommendation}</p>
                    </div>
                    {hasKeywords ? (
                      <div>
                        <h4 className="text-sm font-medium text-slate-300 mb-2">Target Keywords (competitors rank for these)</h4>
                        <div className="overflow-x-auto rounded-lg border border-slate-700">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-slate-800/50">
                                <th className="text-left px-4 py-2 text-slate-400 font-medium">Keyword</th>
                                <th className="text-right px-4 py-2 text-slate-400 font-medium">Search Volume</th>
                                <th className="text-right px-4 py-2 text-slate-400 font-medium">Difficulty</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/30">
                              {gap.target_keywords.map((kw, j) => (
                                <tr key={j} className="hover:bg-slate-800/20">
                                  <td className="px-4 py-2 text-white font-medium">{kw.keyword}</td>
                                  <td className="px-4 py-2 text-right font-mono text-slate-300">{kw.search_volume?.toLocaleString()}</td>
                                  <td className="px-4 py-2 text-right font-mono">
                                    <span className={kw.difficulty < 30 ? 'text-emerald-400' : kw.difficulty < 60 ? 'text-amber-400' : 'text-rose-400'}>
                                      {kw.difficulty}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No keyword data available for this gap</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
