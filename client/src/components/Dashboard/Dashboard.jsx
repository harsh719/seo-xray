import React from 'react';
import useAuditStore from '../../store/audit-store';
import OverviewTab from './OverviewTab';
import StrikingDistanceTab from './StrikingDistanceTab';
import NewPagesTab from './NewPagesTab';
import AEOTab from './AEOTab';
import ContentGapTab from './ContentGapTab';
import StrengthsTab from './StrengthsTab';
import { LayoutDashboard, Target, FilePlus, Bot, Layers, Trophy, Filter } from 'lucide-react';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'striking', label: 'Striking Distance', icon: Target },
  { id: 'newpages', label: 'New Pages', icon: FilePlus },
  { id: 'aeo', label: 'AEO/GEO', icon: Bot },
  { id: 'contentgap', label: 'Content Gap', icon: Layers },
  { id: 'strengths', label: 'Strengths', icon: Trophy },
];

const BOFU_TYPE_LABELS = {
  listicles: 'Listicles',
  comparisons: 'Comparisons',
  alternatives: 'Alternatives',
  pricing: 'Pricing',
  product_tool: 'Product/Tool',
  solution: 'Solution',
  competitor: 'Competitor',
};

export default function Dashboard() {
  const activeTab = useAuditStore(s => s.activeTab);
  const setActiveTab = useAuditStore(s => s.setActiveTab);
  const results = useAuditStore(s => s.results);
  const bofuEnabled = useAuditStore(s => s.bofuEnabled);
  const bofuSelectedTypes = useAuditStore(s => s.bofuSelectedTypes);
  const bofuCustomPatterns = useAuditStore(s => s.bofuCustomPatterns);

  if (!results) {
    return <div className="text-center text-slate-400 py-20">No results available</div>;
  }

  // Check bofuConfig from results config or from store
  const bofuActive = bofuEnabled || results.overview?.bofuActive;

  return (
    <div>
      {/* BofU Badge */}
      {bofuActive && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <Filter className="w-4 h-4 text-amber-400" />
          <span className="text-sm text-amber-300 font-medium">BofU Filter Active</span>
          <span className="text-xs text-amber-400/60 ml-1">
            {bofuSelectedTypes.map(t => BOFU_TYPE_LABELS[t] || t).join(', ')}
            {bofuCustomPatterns && bofuCustomPatterns.trim() ? `, ${bofuCustomPatterns}` : ''}
          </span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-1 border-b border-slate-800">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-t-lg transition-all ${
                isActive
                  ? 'text-brand-400 border-b-2 border-brand-400 bg-brand-500/5'
                  : 'text-slate-500 hover:text-slate-300 border-b-2 border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <OverviewTab data={results} />}
        {activeTab === 'striking' && <StrikingDistanceTab data={results.module1} />}
        {activeTab === 'newpages' && <NewPagesTab data={results.module2} />}
        {activeTab === 'aeo' && <AEOTab data={results.module3} />}
        {activeTab === 'contentgap' && <ContentGapTab data={results.module4} />}
        {activeTab === 'strengths' && <StrengthsTab data={results.module5} />}
      </div>
    </div>
  );
}
