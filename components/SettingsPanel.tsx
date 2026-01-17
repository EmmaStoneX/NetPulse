import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Settings, Eye, EyeOff, Trash2, Save, ExternalLink, Loader2, CheckCircle, XCircle } from 'lucide-react';
import {
  APIConfig,
  DEFAULT_API_CONFIG,
  SearchProvider,
  LLMProvider,
  PROVIDER_INFO,
} from '../types/apiConfig';
import { apiConfigStore } from '../utils/apiConfigStore';
import { testSearchConnection, testLLMConnection } from '../services/directApiService';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

interface TestResult {
  status: TestStatus;
  message?: string;
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState<APIConfig>(DEFAULT_API_CONFIG);
  const [showSearchKey, setShowSearchKey] = useState(false);
  const [showLLMKey, setShowLLMKey] = useState(false);
  const [searchTestResult, setSearchTestResult] = useState<TestResult>({ status: 'idle' });
  const [llmTestResult, setLLMTestResult] = useState<TestResult>({ status: 'idle' });

  useEffect(() => {
    if (isOpen) {
      setConfig(apiConfigStore.get());
      setSearchTestResult({ status: 'idle' });
      setLLMTestResult({ status: 'idle' });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleSave = () => {
    apiConfigStore.save(config);
    onClose();
  };

  const handleClear = () => {
    apiConfigStore.clear();
    setConfig(DEFAULT_API_CONFIG);
  };

  const updateConfig = (updates: Partial<APIConfig>) => {
    setConfig((prev: APIConfig) => ({ ...prev, ...updates }));
    if ('searchProvider' in updates || 'searchApiKey' in updates) {
      setSearchTestResult({ status: 'idle' });
    }
    if ('llmProvider' in updates || 'llmApiKey' in updates || 'llmEndpoint' in updates) {
      setLLMTestResult({ status: 'idle' });
    }
  };

  const handleTestSearch = async () => {
    if (!config.searchApiKey) {
      setSearchTestResult({ status: 'error', message: t('settings.testNoKey') });
      return;
    }
    setSearchTestResult({ status: 'testing' });
    try {
      const success = await testSearchConnection(config.searchProvider, config.searchApiKey);
      setSearchTestResult({
        status: success ? 'success' : 'error',
        message: success ? t('settings.testSuccess') : t('settings.testFailed')
      });
    } catch (error) {
      setSearchTestResult({ status: 'error', message: error instanceof Error ? error.message : t('settings.testFailed') });
    }
  };

  const handleTestLLM = async () => {
    if (!config.llmApiKey) {
      setLLMTestResult({ status: 'error', message: t('settings.testNoKey') });
      return;
    }
    setLLMTestResult({ status: 'testing' });
    try {
      const model = config.llmModel || PROVIDER_INFO.llm[config.llmProvider].models.fast;
      const success = await testLLMConnection(config.llmProvider, config.llmApiKey, model, config.llmEndpoint || undefined);
      setLLMTestResult({
        status: success ? 'success' : 'error',
        message: success ? t('settings.testSuccess') : t('settings.testFailed')
      });
    } catch (error) {
      setLLMTestResult({ status: 'error', message: error instanceof Error ? error.message : t('settings.testFailed') });
    }
  };

  if (!isOpen) return null;

  const searchProviders: SearchProvider[] = ['tavily', 'exa'];
  const llmProviders: LLMProvider[] = ['gemini', 'deepseek', 'openai', 'claude'];

  // 渲染测试结果
  const renderTestResult = (result: TestResult) => {
    if (result.status === 'success') {
      return <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle className="w-3.5 h-3.5" />{result.message}</span>;
    }
    if (result.status === 'error') {
      return <span className="flex items-center gap-1 text-xs text-red-400"><XCircle className="w-3.5 h-3.5" />{result.message}</span>;
    }
    return null;
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div
        className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            <h2 id="settings-modal-title" className="text-lg font-bold text-white">
              {t('settings.title')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
            aria-label={t('settings.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 space-y-4 sm:space-y-5">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="enable-custom" className="text-sm font-medium text-white">
                {t('settings.enableCustom')}
              </label>
              <p className="text-xs text-slate-400 mt-0.5">{t('settings.enableCustomDesc')}</p>
            </div>
            <button
              id="enable-custom"
              role="switch"
              aria-checked={config.enabled}
              onClick={() => updateConfig({ enabled: !config.enabled })}
              className={`relative w-11 h-6 rounded-full transition-colors ${config.enabled ? 'bg-blue-500' : 'bg-slate-600'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${config.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Search Service */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white">{t('settings.searchProvider')}</label>
              <select
                value={config.searchProvider}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateConfig({ searchProvider: e.target.value as SearchProvider })}
                className="px-2 py-1 bg-slate-800/50 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500/50"
              >
                {searchProviders.map((p) => <option key={p} value={p}>{PROVIDER_INFO.search[p].name}</option>)}
              </select>
            </div>
            
            {/* Search API Key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400">API Key</label>
                <a
                  href={PROVIDER_INFO.search[config.searchProvider].docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  {t('settings.getDocs')}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="relative">
                <input
                  type={showSearchKey ? 'text' : 'password'}
                  value={config.searchApiKey}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig({ searchApiKey: e.target.value })}
                  placeholder={t('settings.apiKeyPlaceholder')}
                  className="w-full px-3 py-2 pr-10 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowSearchKey(!showSearchKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                  aria-label={showSearchKey ? t('settings.hideKey') : t('settings.showKey')}
                >
                  {showSearchKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Test Search */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestSearch}
                disabled={searchTestResult.status === 'testing' || !config.searchApiKey}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {searchTestResult.status === 'testing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>⚡</span>}
                {t('settings.testConnection')}
              </button>
              {renderTestResult(searchTestResult)}
            </div>
          </div>

          {/* LLM Service */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white">{t('settings.llmProvider')}</label>
              <select
                value={config.llmProvider}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateConfig({ llmProvider: e.target.value as LLMProvider })}
                className="px-2 py-1 bg-slate-800/50 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500/50"
              >
                {llmProviders.map((p) => <option key={p} value={p}>{PROVIDER_INFO.llm[p].name}</option>)}
              </select>
            </div>

            {/* LLM API Key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400">API Key</label>
                <a
                  href={PROVIDER_INFO.llm[config.llmProvider].docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  {t('settings.getDocs')}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="relative">
                <input
                  type={showLLMKey ? 'text' : 'password'}
                  value={config.llmApiKey}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig({ llmApiKey: e.target.value })}
                  placeholder={t('settings.apiKeyPlaceholder')}
                  className="w-full px-3 py-2 pr-10 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowLLMKey(!showLLMKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                  aria-label={showLLMKey ? t('settings.hideKey') : t('settings.showKey')}
                >
                  {showLLMKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Custom Endpoint */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">{t('settings.customEndpoint')}</label>
              <input
                type="text"
                value={config.llmEndpoint}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig({ llmEndpoint: e.target.value })}
                placeholder={PROVIDER_INFO.llm[config.llmProvider].endpoint}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
              />
              <p className="text-xs text-slate-500">{t('settings.customEndpointHint')}</p>
            </div>

            {/* Test LLM */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestLLM}
                disabled={llmTestResult.status === 'testing' || !config.llmApiKey}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {llmTestResult.status === 'testing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>⚡</span>}
                {t('settings.testConnection')}
              </button>
              {renderTestResult(llmTestResult)}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-700/50 flex gap-2 sm:gap-3">
          <button
            onClick={handleClear}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-red-400 hover:bg-red-500/10 border border-red-500/30 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {t('settings.clear')}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors"
          >
            <Save className="w-4 h-4" />
            {t('settings.save')}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
