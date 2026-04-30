import React, { useState, useEffect } from 'react';
import useAuditStore from '../../store/audit-store';
import { Globe, Plus, Trash2, KeyRound, ChevronDown, ChevronUp, CheckCircle2, XCircle, Loader2, DollarSign, Play, Filter } from 'lucide-react';

export default function InputPanel() {
  const store = useAuditStore();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validating, setValidating] = useState(false);

  const canStart = store.clientUrl &&
    store.competitors.some(Boolean) &&
    store.login &&
    store.password &&
    store.credentialsValid === true;

  const handleValidate = async () => {
    setValidating(true);
    await store.validateCredentials();
    setValidating(false);
    if (store.credentialsValid) {
      store.fetchLocations();
      store.updateCostEstimate();
    }
  };

  useEffect(() => {
    store.updateCostEstimate();
  }, [store.competitors.filter(Boolean).length, store.crawlPages, store.serpDepth]);

  const commonLocations = [
    { code: 2840, name: 'United States' },
    { code: 2826, name: 'United Kingdom' },
    { code: 2356, name: 'India' },
    { code: 2124, name: 'Canada' },
    { code: 2036, name: 'Australia' },
    { code: 2276, name: 'Germany' },
    { code: 2250, name: 'France' },
    { code: 2724, name: 'Spain' },
    { code: 2076, name: 'Brazil' },
    { code: 2528, name: 'Netherlands' },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-white mb-3">Run SEO Audit</h2>
        <p className="text-slate-400 text-lg">
          Analyze any website against competitors using DataForSEO
        </p>
      </div>

      <div className="space-y-6">
        {/* Client URL */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Client Website</label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={store.clientUrl}
              onChange={e => store.setField('clientUrl', e.target.value)}
              placeholder="example.com"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-10 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
            />
          </div>
        </div>

        {/* Competitor URLs */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Competitor Websites <span className="text-slate-500">(1-5)</span>
          </label>
          <div className="space-y-2">
            {store.competitors.map((comp, i) => (
              <div key={i} className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-600 font-mono">{i + 1}.</span>
                  <input
                    type="text"
                    value={comp}
                    onChange={e => store.updateCompetitor(i, e.target.value)}
                    placeholder="competitor.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition text-sm"
                  />
                </div>
                {store.competitors.length > 1 && (
                  <button
                    onClick={() => store.removeCompetitor(i)}
                    className="p-2.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {store.competitors.length < 5 && (
            <button
              onClick={store.addCompetitor}
              className="mt-2 flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 transition"
            >
              <Plus className="w-4 h-4" /> Add Competitor
            </button>
          )}
        </div>

        {/* Location & Language */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Location</label>
            <select
              value={store.locationCode}
              onChange={e => {
                const loc = commonLocations.find(l => l.code === parseInt(e.target.value));
                store.setField('locationCode', parseInt(e.target.value));
                if (loc) store.setField('locationName', loc.name);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition appearance-none"
            >
              {commonLocations.map(loc => (
                <option key={loc.code} value={loc.code}>{loc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Language</label>
            <select
              value={store.language}
              onChange={e => store.setField('language', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition appearance-none"
            >
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
              <option>German</option>
              <option>Portuguese</option>
              <option>Hindi</option>
              <option>Dutch</option>
              <option>Italian</option>
              <option>Japanese</option>
              <option>Korean</option>
            </select>
          </div>
        </div>

        {/* Credentials */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <KeyRound className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-300">DataForSEO Credentials</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={store.login}
              onChange={e => { store.setField('login', e.target.value); store.setField('credentialsValid', null); }}
              placeholder="Login"
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition text-sm"
            />
            <input
              type="password"
              value={store.password}
              onChange={e => { store.setField('password', e.target.value); store.setField('credentialsValid', null); }}
              placeholder="Password"
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition text-sm"
            />
          </div>
          <button
            onClick={handleValidate}
            disabled={!store.login || !store.password || validating}
            className="mt-3 flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 disabled:text-slate-600 disabled:cursor-not-allowed transition"
          >
            {validating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Validating...</>
            ) : store.credentialsValid === true ? (
              <><CheckCircle2 className="w-4 h-4 text-emerald-400" /> <span className="text-emerald-400">Credentials valid</span></>
            ) : store.credentialsValid === false ? (
              <><XCircle className="w-4 h-4 text-rose-400" /> <span className="text-rose-400">Invalid credentials</span></>
            ) : (
              'Validate Credentials'
            )}
          </button>
        </div>

        {/* Advanced Options */}
        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between px-5 py-3 text-sm text-slate-400 hover:text-slate-300 transition"
          >
            Advanced Options
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showAdvanced && (
            <div className="px-5 pb-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Max Crawl Pages</label>
                  <input
                    type="number"
                    value={store.crawlPages}
                    onChange={e => store.setField('crawlPages', parseInt(e.target.value) || 500)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">SERP Depth</label>
                  <input
                    type="number"
                    value={store.serpDepth}
                    onChange={e => store.setField('serpDepth', parseInt(e.target.value) || 20)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Min Search Volume</label>
                  <input
                    type="number"
                    value={store.minSearchVolume}
                    onChange={e => store.setField('minSearchVolume', parseInt(e.target.value) || 100)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BofU Keyword Focus */}
        <BofuFilterSection store={store} />

        {/* Cost Estimate + Start */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <DollarSign className="w-4 h-4" />
            Estimated cost: <span className="text-white font-medium">
              {store.estimatedCost !== null ? `~$${store.estimatedCost.toFixed(2)}` : '—'}
            </span>
          </div>
          <button
            onClick={store.startAudit}
            disabled={!canStart}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium px-6 py-3 rounded-lg transition disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            Run Full Audit
          </button>
        </div>

        {store.error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4 text-rose-300 text-sm">
            {store.error}
          </div>
        )}
      </div>
    </div>
  );
}

const BOFU_TYPES = [
  { id: 'listicles', label: 'Listicles', patterns: 'best, top' },
  { id: 'comparisons', label: 'Comparisons', patterns: 'vs, versus, compared, comparison' },
  { id: 'alternatives', label: 'Alternatives', patterns: 'alternative, alternatives to' },
  { id: 'pricing', label: 'Pricing', patterns: 'pricing, cost, plans' },
  { id: 'product_tool', label: 'Product / Tool', patterns: 'tool, software, platform, app, builder' },
  { id: 'solution', label: 'Solution Pages', patterns: 'solution, for, use case' },
  { id: 'competitor', label: 'Competitor', patterns: 'use custom patterns below' },
];

const ALL_TYPE_IDS = BOFU_TYPES.map(t => t.id);

function BofuFilterSection({ store }) {
  const allSelected = ALL_TYPE_IDS.every(id => store.bofuSelectedTypes.includes(id));

  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${
      store.bofuEnabled ? 'border-amber-500/30 bg-amber-500/5' : 'border-slate-800'
    }`}>
      {/* Toggle Header */}
      <button
        onClick={() => store.setField('bofuEnabled', !store.bofuEnabled)}
        className="w-full flex items-center justify-between px-5 py-3.5"
      >
        <div className="flex items-center gap-2.5">
          <Filter className={`w-4 h-4 ${store.bofuEnabled ? 'text-amber-400' : 'text-slate-500'}`} />
          <div className="text-left">
            <span className={`text-sm font-medium ${store.bofuEnabled ? 'text-amber-300' : 'text-slate-400'}`}>
              BofU Keyword Focus
            </span>
            <p className="text-xs text-slate-500 mt-0.5">
              Filter audit to only show bottom-of-funnel / commercial keywords
            </p>
          </div>
        </div>
        <div className={`w-10 h-5.5 rounded-full flex items-center transition-colors px-0.5 ${
          store.bofuEnabled ? 'bg-amber-500' : 'bg-slate-700'
        }`}>
          <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
            store.bofuEnabled ? 'translate-x-5' : 'translate-x-0'
          }`} />
        </div>
      </button>

      {/* Expanded Options */}
      {store.bofuEnabled && (
        <div className="px-5 pb-5 space-y-4">
          {/* Select All / Deselect All */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => store.setBofuAllTypes(allSelected ? [] : ALL_TYPE_IDS)}
              className="text-xs text-amber-400 hover:text-amber-300 transition"
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-xs text-slate-600">
              {store.bofuSelectedTypes.length} of {BOFU_TYPES.length} selected
            </span>
          </div>

          {/* Category Checkboxes */}
          <div className="grid grid-cols-2 gap-2">
            {BOFU_TYPES.map(type => {
              const checked = store.bofuSelectedTypes.includes(type.id);
              return (
                <label
                  key={type.id}
                  className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition ${
                    checked ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-slate-800/50 border border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => store.toggleBofuType(type.id)}
                    className="mt-0.5 accent-amber-500"
                  />
                  <div>
                    <span className={`text-sm ${checked ? 'text-amber-300' : 'text-slate-300'}`}>{type.label}</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">{type.patterns}</p>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Custom Patterns */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Custom keyword patterns (comma-separated)</label>
            <input
              type="text"
              value={store.bofuCustomPatterns}
              onChange={e => store.setField('bofuCustomPatterns', e.target.value)}
              placeholder="e.g., form builder, crm, email marketing"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}
