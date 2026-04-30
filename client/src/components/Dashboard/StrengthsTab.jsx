import React, { useState, useMemo } from 'react';
import DataTable from '../shared/DataTable';
import { StatCard, SectionHeader } from '../shared/StatusCards';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Trophy, TrendingUp, Link2, Shield, Star, Bot, Globe, ChevronDown, ChevronRight } from 'lucide-react';

const FUNNEL_COLORS = {
  bofu: '#10b981',
  mofu: '#f59e0b',
  tofu: '#3b82f6',
};

const FUNNEL_LABELS = {
  bofu: 'BofU',
  mofu: 'MoFu',
  tofu: 'ToFu',
};

function FunnelBadge({ stage }) {
  const colors = {
    bofu: 'bg-emerald-500/20 text-emerald-400',
    mofu: 'bg-amber-500/20 text-amber-400',
    tofu: 'bg-blue-500/20 text-blue-400',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${colors[stage] || 'bg-slate-500/20 text-slate-400'}`}>
      {FUNNEL_LABELS[stage] || stage}
    </span>
  );
}

export default function StrengthsTab({ data }) {
  const [keywordFunnelFilter, setKeywordFunnelFilter] = useState('all');
  const [pageFunnelFilter, setPageFunnelFilter] = useState('all');
  const [expandedPages, setExpandedPages] = useState(new Set());

  if (!data) {
    return <div className="text-center text-slate-500 py-20">No strengths data available</div>;
  }

  const { summary = {}, top_keywords = [], top_pages = [], competitive_moat = [], serp_feature_wins = [], domain_comparison = [], technical_strengths = [] } = data;

  const funnelDist = summary.funnel_distribution || {};
  const funnelData = Object.entries(funnelDist)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name: FUNNEL_LABELS[name] || name, value, fill: FUNNEL_COLORS[name] }));

  const filteredKeywords = useMemo(() => {
    if (keywordFunnelFilter === 'all') return top_keywords;
    return top_keywords.filter(kw => kw.funnel_stage === keywordFunnelFilter);
  }, [top_keywords, keywordFunnelFilter]);

  const filteredPages = useMemo(() => {
    if (pageFunnelFilter === 'all') return top_pages;
    return top_pages.filter(p => p.funnel_stage === pageFunnelFilter);
  }, [top_pages, pageFunnelFilter]);

  const togglePage = (url) => {
    setExpandedPages(prev => {
      const next = new Set(prev);
      next.has(url) ? next.delete(url) : next.add(url);
      return next;
    });
  };

  const keywordColumns = [
    { key: 'keyword', label: 'Keyword', render: (v, row) => (
      <span className={`font-medium ${row.is_position_1 ? 'text-amber-300' : 'text-white'}`}>{v}</span>
    )},
    { key: 'funnel_stage', label: 'Funnel', render: (v) => <FunnelBadge stage={v} /> },
    { key: 'rank', label: 'Rank', align: 'right', render: (v) => (
      <span className={v === 1 ? 'text-amber-400 font-bold' : ''}>{v}</span>
    )},
    { key: 'search_volume', label: 'SV', align: 'right', render: (v) => v?.toLocaleString() },
    { key: 'etv', label: 'ETV', align: 'right', render: (v) => v?.toLocaleString() },
    { key: 'cpc', label: 'CPC', align: 'right', render: (v) => v ? `$${v.toFixed(2)}` : '—' },
    { key: 'has_ai_overview_citation', label: 'AIO', render: (v) => v ? <span className="text-emerald-400">Yes</span> : '—' },
    { key: 'sis_score', label: 'SIS', align: 'right', render: (v) => (
      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
        v >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
        v >= 40 ? 'bg-amber-500/20 text-amber-400' :
        'bg-slate-500/20 text-slate-400'
      }`}>{v}</span>
    )},
    { key: 'ranking_url', label: 'URL', render: (v) => (
      <span className="text-xs text-slate-500 max-w-[180px] truncate block">{v || '—'}</span>
    )},
  ];

  const pageTrafficData = filteredPages.slice(0, 10).map(p => ({
    url: (p.url || '').split('/').pop() || p.url?.substring(0, 30) || 'Home',
    traffic: p.estimated_traffic || 0,
  }));

  const FunnelFilter = ({ value, onChange }) => (
    <div className="flex items-center gap-1">
      {['all', 'bofu', 'mofu', 'tofu'].map(f => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={`px-2.5 py-1 text-xs rounded-lg transition ${
            value === f
              ? f === 'all' ? 'bg-brand-600 text-white' :
                f === 'bofu' ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40' :
                f === 'mofu' ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40' :
                'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/40'
              : 'text-slate-500 hover:text-white hover:bg-slate-800'
          }`}
        >
          {f === 'all' ? 'All' : FUNNEL_LABELS[f]}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Top-10 Keywords" value={summary.total_top10_keywords?.toLocaleString() || 0} icon={Trophy} color="emerald" />
        <StatCard label="Organic Traffic" value={summary.total_organic_traffic?.toLocaleString() || 0} icon={TrendingUp} color="brand" />
        <StatCard label="Featured Snippets" value={summary.featured_snippets_held || 0} icon={Star} color="amber" />
        <StatCard label="AI Overview Citations" value={summary.ai_overview_citations || 0} icon={Bot} color="emerald" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Domain Rank" value={summary.domain_rank || '—'} icon={Globe} color="brand" />
        <StatCard label="Referring Domains" value={summary.referring_domains?.toLocaleString() || '—'} icon={Link2} color="amber" />
        <StatCard label="Competitive Moat" value={summary.competitive_advantage_keywords?.toLocaleString() || 0} icon={Shield} color="emerald" sub="Keywords only you rank for" />
      </div>

      {/* Funnel Distribution */}
      {funnelData.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <SectionHeader title="Keyword Funnel Distribution" description="Keywords categorized by funnel stage" />
          <div className="flex items-center gap-8">
            <div className="h-40 w-40">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={funnelData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35} paddingAngle={3}>
                    {funnelData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2">
              {funnelData.map(entry => (
                <div key={entry.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.fill }} />
                  <span className="text-sm text-slate-300">{entry.name}</span>
                  <span className="text-sm font-medium text-white">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top Keywords with Funnel Filter */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <SectionHeader title="Top Performing Keywords" description="Rank 1-10 keywords sorted by Strength Impact Score" />
          <FunnelFilter value={keywordFunnelFilter} onChange={setKeywordFunnelFilter} />
        </div>
        <DataTable
          columns={keywordColumns}
          data={filteredKeywords}
          defaultSort={{ key: 'sis_score', dir: 'desc' }}
          selectable
          exportFilename="strengths-keywords.csv"
        />
      </div>

      {/* Top Pages by Traffic with Funnel Filter + Expansion */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <SectionHeader title="Top Pages by Traffic" description="Click a page to see its ranking keywords" />
          <FunnelFilter value={pageFunnelFilter} onChange={setPageFunnelFilter} />
        </div>

        {pageTrafficData.length > 0 && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-4">
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={pageTrafficData} layout="vertical" margin={{ left: 100 }}>
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="url" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#fff' }} />
                  <Bar dataKey="traffic" fill="#10b981" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Expandable Page List */}
        <div className="space-y-2">
          {filteredPages.map((page) => {
            const isExpanded = expandedPages.has(page.url);
            const hasKeywords = page.keywords?.length > 0;

            return (
              <div key={page.url} className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/50">
                <button
                  onClick={() => togglePage(page.url)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/30 transition text-left"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white font-medium truncate">{page.url || 'Home'}</span>
                        <FunnelBadge stage={page.funnel_stage} />
                        <span className="text-xs text-slate-500 capitalize">{page.page_type?.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400 shrink-0 ml-4">
                    <span>Traffic: {page.estimated_traffic?.toLocaleString()}</span>
                    <span>KWs: {page.ranking_keywords_count}</span>
                    <span>Avg Pos: {page.avg_position}</span>
                    <span>{page.traffic_share_pct}%</span>
                    {hasKeywords && <span className="text-brand-400">{page.keywords.length} mapped</span>}
                  </div>
                </button>

                {isExpanded && hasKeywords && (
                  <div className="px-5 pb-4 border-t border-slate-800/50">
                    <div className="overflow-x-auto rounded-lg border border-slate-700 mt-3">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-800/50">
                            <th className="text-left px-4 py-2 text-slate-400 font-medium">Keyword</th>
                            <th className="text-left px-4 py-2 text-slate-400 font-medium">Funnel</th>
                            <th className="text-right px-4 py-2 text-slate-400 font-medium">Rank</th>
                            <th className="text-right px-4 py-2 text-slate-400 font-medium">SV</th>
                            <th className="text-right px-4 py-2 text-slate-400 font-medium">ETV</th>
                            <th className="text-right px-4 py-2 text-slate-400 font-medium">CPC</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/30">
                          {page.keywords.map((kw, j) => (
                            <tr key={j} className="hover:bg-slate-800/20">
                              <td className="px-4 py-2 text-white font-medium">{kw.keyword}</td>
                              <td className="px-4 py-2"><FunnelBadge stage={kw.funnel_stage} /></td>
                              <td className="px-4 py-2 text-right font-mono text-slate-300">{kw.rank}</td>
                              <td className="px-4 py-2 text-right font-mono text-slate-300">{kw.search_volume?.toLocaleString()}</td>
                              <td className="px-4 py-2 text-right font-mono text-slate-300">{kw.etv?.toLocaleString()}</td>
                              <td className="px-4 py-2 text-right font-mono text-slate-300">{kw.cpc ? `$${kw.cpc.toFixed(2)}` : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {isExpanded && !hasKeywords && (
                  <div className="px-5 pb-4 border-t border-slate-800/50">
                    <p className="text-xs text-slate-500 italic mt-3">No keyword data mapped to this page</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Domain Authority Comparison */}
      {domain_comparison.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 overflow-x-auto">
          <SectionHeader title="Domain Authority Comparison" />
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-2 text-slate-400">Domain</th>
                <th className="text-right px-4 py-2 text-slate-400">Domain Rank</th>
                <th className="text-right px-4 py-2 text-slate-400">Referring Domains</th>
                <th className="text-right px-4 py-2 text-slate-400">Total Backlinks</th>
                <th className="text-right px-4 py-2 text-slate-400">Dofollow %</th>
              </tr>
            </thead>
            <tbody>
              {domain_comparison.map(row => (
                <tr key={row.domain} className={`border-b border-slate-800/50 ${row.is_client ? 'bg-brand-500/5' : ''}`}>
                  <td className="px-4 py-2.5">
                    <span className={`${row.is_client ? 'text-brand-400 font-medium' : 'text-slate-300'}`}>
                      {row.domain} {row.is_client && '(You)'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-300">{row.domain_rank || '—'}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-300">{row.referring_domains?.toLocaleString() || '—'}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-300">{row.total_backlinks?.toLocaleString() || '—'}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-300">{row.dofollow_pct || '—'}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Competitive Moat */}
      {competitive_moat.length > 0 && (
        <div>
          <SectionHeader title="Competitive Moat" description="Keywords you rank for but competitors don't" />
          <DataTable
            columns={[
              { key: 'keyword', label: 'Keyword', render: (v) => <span className="font-medium text-white">{v}</span> },
              { key: 'search_volume', label: 'SV', align: 'right', render: (v) => v?.toLocaleString() },
              { key: 'rank', label: 'Rank', align: 'right' },
              { key: 'competitors_not_ranking', label: 'Competitors Missing', render: (v) => (
                <span className="text-xs text-slate-400">{Array.isArray(v) ? v.join(', ') : '—'}</span>
              )},
            ]}
            data={competitive_moat}
            defaultSort={{ key: 'search_volume', dir: 'desc' }}
            selectable
            exportFilename="competitive-moat.csv"
          />
        </div>
      )}

      {/* Technical Health */}
      {technical_strengths.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <SectionHeader title="Technical Health" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {technical_strengths.map(ts => (
              <div key={ts.metric} className="flex items-center justify-between px-4 py-3 bg-slate-800/30 rounded-lg">
                <div>
                  <span className="text-sm text-slate-300">{ts.metric}</span>
                  <span className="text-xs text-slate-500 ml-2">{ts.benchmark}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{ts.value}</span>
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    ts.status === 'strong' ? 'bg-emerald-400' :
                    ts.status === 'good' ? 'bg-amber-400' :
                    'bg-rose-400'
                  }`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
