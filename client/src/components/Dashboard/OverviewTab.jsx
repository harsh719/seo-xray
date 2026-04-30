import React from 'react';
import { StatCard, SectionHeader } from '../shared/StatusCards';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Target, FilePlus, Bot, Layers, Trophy, TrendingUp, Globe, Link2 } from 'lucide-react';

const CHART_COLORS = ['#3377ff', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

export default function OverviewTab({ data }) {
  if (!data) return <Empty />;

  const overview = data.overview || {};
  const m1 = data.module1 || {};
  const m2 = data.module2 || {};
  const m3 = data.module3 || {};
  const m4 = data.module4 || {};
  const m5 = data.module5 || {};

  const rankDist = overview.rankDistribution || {};
  const rankDistData = Object.entries(rankDist).map(([range, count]) => ({ range, count }));

  const domainOverview = overview.domainOverview || {};

  return (
    <div className="space-y-8">
      {/* Domain Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Keywords (1-30)"
          value={overview.totalKeywords?.toLocaleString() || '0'}
          icon={Globe}
          color="brand"
        />
        <StatCard
          label="Domain Rank"
          value={m5.summary?.domain_rank || domainOverview?.rank || '—'}
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          label="Referring Domains"
          value={m5.summary?.referring_domains?.toLocaleString() || '—'}
          icon={Link2}
          color="amber"
        />
        <StatCard
          label="Est. Organic Traffic"
          value={m5.summary?.total_organic_traffic?.toLocaleString() || '—'}
          icon={TrendingUp}
          color="brand"
        />
      </div>

      {/* Rank Distribution Chart */}
      {rankDistData.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <SectionHeader title="Ranking Distribution" description="Keywords by SERP position range" />
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={rankDistData}>
                <XAxis dataKey="range" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#fff' }}
                  cursor={{ fill: 'rgba(51,119,255,0.1)' }}
                />
                <Bar dataKey="count" fill="#3377ff" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Module Summaries */}
      <SectionHeader title="Opportunities Found" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ModuleCard
          icon={Target}
          title="Striking Distance"
          count={m1.summary?.totalKeywords || 0}
          description={`${m1.quickWins?.length || 0} quick wins identified`}
          sub={`Total SV: ${m1.summary?.totalSearchVolume?.toLocaleString() || 0}`}
          color="brand"
        />
        <ModuleCard
          icon={FilePlus}
          title="New Page Opportunities"
          count={m2.summary?.totalOpportunities || 0}
          description={`Total SV: ${m2.summary?.totalSearchVolume?.toLocaleString() || 0}`}
          sub={`From ${Object.keys(m2.summary?.bySource || {}).length} sources`}
          color="emerald"
        />
        <ModuleCard
          icon={Bot}
          title="AEO/GEO Gaps"
          count={m3.summary?.totalAEOGaps || 0}
          description={`Client in ${m3.summary?.clientAIOKeywords || 0} AI Overviews`}
          sub={`${m3.summary?.highPriorityGaps || 0} high priority`}
          color="amber"
        />
        <ModuleCard
          icon={Layers}
          title="Content Gaps"
          count={m4.summary?.totalGaps || 0}
          description={`${m4.summary?.pageTypeMissing || 0} missing page types`}
          sub={`${m4.summary?.highPriority || 0} high priority`}
          color="rose"
        />
        <ModuleCard
          icon={Trophy}
          title="Top-10 Keywords"
          count={m5.summary?.total_top10_keywords || 0}
          description={`${m5.summary?.featured_snippets_held || 0} featured snippets`}
          sub={`${m5.summary?.ai_overview_citations || 0} AI Overview citations`}
          color="emerald"
        />
        <ModuleCard
          icon={Link2}
          title="Competitive Moat"
          count={m5.summary?.competitive_advantage_keywords || 0}
          description="Keywords only you rank for"
          sub="Unique competitive advantages"
          color="brand"
        />
      </div>
    </div>
  );
}

function ModuleCard({ icon: Icon, title, count, description, sub, color }) {
  const bgColors = {
    brand: 'bg-brand-500/10 border-brand-500/20',
    emerald: 'bg-emerald-500/10 border-emerald-500/20',
    amber: 'bg-amber-500/10 border-amber-500/20',
    rose: 'bg-rose-500/10 border-rose-500/20',
  };
  const iconColors = {
    brand: 'text-brand-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    rose: 'text-rose-400',
  };

  return (
    <div className={`${bgColors[color]} border rounded-xl p-5`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${iconColors[color]}`} />
        <span className="text-sm font-medium text-slate-300">{title}</span>
      </div>
      <div className="text-3xl font-bold text-white mb-1">{count.toLocaleString()}</div>
      <p className="text-xs text-slate-400">{description}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function Empty() {
  return <div className="text-center text-slate-500 py-20">No overview data available</div>;
}
