import { create } from 'zustand';
import * as api from '../utils/api';

const useAuditStore = create((set, get) => ({
  // UI state
  step: 'input', // 'input' | 'progress' | 'dashboard'
  activeTab: 'overview',

  // Input state
  clientUrl: '',
  competitors: ['', '', ''],
  login: '',
  password: '',
  language: 'English',
  locationCode: 2840,
  locationName: 'United States',
  crawlPages: 500,
  serpDepth: 20,
  minSearchVolume: 100,
  credentialsValid: null,
  estimatedCost: null,
  locations: [],

  // BofU filter state
  bofuEnabled: false,
  bofuSelectedTypes: [],
  bofuCustomPatterns: '',

  // Audit state
  auditId: null,
  auditStatus: null,
  progress: 0,
  currentStep: '',
  logs: [],
  error: null,

  // Results
  results: null,

  // Polling
  _pollInterval: null,

  // Actions
  setField: (field, value) => set({ [field]: value }),

  addCompetitor: () => set(state => ({
    competitors: state.competitors.length < 5 ? [...state.competitors, ''] : state.competitors,
  })),

  removeCompetitor: (index) => set(state => ({
    competitors: state.competitors.filter((_, i) => i !== index),
  })),

  updateCompetitor: (index, value) => set(state => ({
    competitors: state.competitors.map((c, i) => i === index ? value : c),
  })),

  toggleBofuType: (type) => set(state => ({
    bofuSelectedTypes: state.bofuSelectedTypes.includes(type)
      ? state.bofuSelectedTypes.filter(t => t !== type)
      : [...state.bofuSelectedTypes, type],
  })),

  setBofuAllTypes: (types) => set({ bofuSelectedTypes: types }),

  validateCredentials: async () => {
    const { login, password } = get();
    try {
      const result = await api.validateCredentials(login, password);
      set({ credentialsValid: result.valid });
      return result;
    } catch (err) {
      set({ credentialsValid: false });
      return { valid: false, message: err.message };
    }
  },

  fetchLocations: async () => {
    const { login, password } = get();
    try {
      const locations = await api.fetchLocations(login, password);
      set({ locations: Array.isArray(locations) ? locations : [] });
    } catch {
      set({ locations: [] });
    }
  },

  updateCostEstimate: async () => {
    const { competitors, crawlPages, serpDepth } = get();
    try {
      const result = await api.estimateCost({
        competitorCount: competitors.filter(Boolean).length,
        crawlPages,
        serpDepth,
      });
      set({ estimatedCost: result.estimatedCost });
    } catch {
      // ignore
    }
  },

  startAudit: async () => {
    const state = get();
    try {
      set({ step: 'progress', error: null, progress: 0, logs: [] });
      const result = await api.startAudit({
        clientUrl: state.clientUrl,
        competitors: state.competitors.filter(Boolean),
        login: state.login,
        password: state.password,
        language: state.language,
        locationCode: state.locationCode,
        crawlPages: state.crawlPages,
        serpDepth: state.serpDepth,
        minSearchVolume: state.minSearchVolume,
        bofuConfig: {
          enabled: state.bofuEnabled,
          selectedTypes: state.bofuSelectedTypes,
          customPatterns: state.bofuCustomPatterns
            .split(',').map(s => s.trim()).filter(Boolean),
        },
      });

      set({ auditId: result.auditId, auditStatus: 'running' });

      // Start polling
      const interval = setInterval(async () => {
        try {
          const status = await api.getAuditStatus(result.auditId);
          set({
            progress: status.progress,
            currentStep: status.currentStep,
            logs: status.logs || [],
            auditStatus: status.status,
            error: status.error,
          });

          if (status.status === 'completed') {
            clearInterval(interval);
            const results = await api.getAuditResults(result.auditId);
            set({ results: results.results, step: 'dashboard' });
          } else if (status.status === 'error') {
            clearInterval(interval);
            set({ error: status.error });
          }
        } catch {
          // polling error, continue
        }
      }, 2000);

      set({ _pollInterval: interval });
    } catch (err) {
      set({ error: err.message, step: 'input' });
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  resetAudit: () => {
    const { _pollInterval } = get();
    if (_pollInterval) clearInterval(_pollInterval);
    set({
      step: 'input',
      auditId: null,
      auditStatus: null,
      progress: 0,
      currentStep: '',
      logs: [],
      error: null,
      results: null,
      activeTab: 'overview',
    });
  },
}));

export default useAuditStore;
