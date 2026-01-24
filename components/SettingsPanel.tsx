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
import { cn } from '../utils/cn';
import { trackCustomApiKeySaved } from '../utils/analytics';

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
  const [showWarning, setShowWarning] = useState(false);

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
    // 追踪自定义 API Key 配置保存
    trackCustomApiKeySaved({
      searchProvider: config.searchProvider,
      llmProvider: config.llmProvider,
      enabled: config.enabled,
    });
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
    if (config.llmProvider === 'custom' && !config.llmEndpoint) {
      setLLMTestResult({ status: 'error', message: t('settings.customEndpointRequired') });
      return;
    }
    setLLMTestResult({ status: 'testing' });
    try {
      const model = config.llmModelFast || (config.llmProvider !== 'custom' ? PROVIDER_INFO.llm[config.llmProvider].models.fast : 'gpt-3.5-turbo');
      const endpoint = config.llmEndpoint || undefined;
      const success = await testLLMConnection(config.llmProvider, config.llmApiKey, model, endpoint);
      setLLMTestResult({
        status: success ? 'success' : 'error',
        message: success ? t('settings.testSuccess') : t('settings.testFailed')
      });
    } catch (error) {
      setLLMTestResult({ status: 'error', message: error instanceof Error ? error.message : t('settings.testFailed') });
    }
  };

  const handleToggleEnabled = () => {
    if (!config.enabled) {
      setShowWarning(true);
    } else {
      updateConfig({ enabled: false });
    }
  };

  const handleConfirmEnable = () => {
    setShowWarning(false);
    updateConfig({ enabled: true });
  };

  const handleCancelEnable = () => {
    setShowWarning(false);
  };

  if (!isOpen) return null;

  const searchProviders: SearchProvider[] = ['tavily', 'exa'];
  const llmProviders: LLMProvider[] = ['gemini', 'deepseek', 'openai', 'claude', 'custom'];
  const isCustomLLM = config.llmProvider === 'custom';

  const renderTestIcon = (result: TestResult) => {
    if (result.status === 'testing') return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
    if (result.status === 'success') return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
    if (result.status === 'error') return <XCircle className="w-3.5 h-3.5 text-destructive" />;
    return null;
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      {/* Warning Dialog */}
      {showWarning && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <div className="w-full max-w-sm bg-card rounded-xl border border-amber-500/30 shadow-2xl p-5 animate-fade-in">
            <div className="flex items-center gap-2 text-amber-500 mb-3">
              <span className="text-xl">⚠️</span>
              <h3 className="font-bold">{t('settings.warningTitle')}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{t('settings.warningMessage')}</p>
            <div className="flex gap-2">
              <button
                onClick={handleCancelEnable}
                className="flex-1 px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-secondary/50 transition-colors"
              >
                {t('settings.warningCancel')}
              </button>
              <button
                onClick={handleConfirmEnable}
                className="flex-1 px-4 py-2 text-sm rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium transition-colors"
              >
                {t('settings.warningConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
      <div
        className="w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <h2 id="settings-modal-title" className="text-lg font-bold text-foreground">{t('settings.title')}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors" aria-label={t('settings.close')}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 space-y-4">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="enable-custom" className="text-sm font-medium text-foreground">{t('settings.enableCustom')}</label>
              <p className="text-xs text-muted-foreground mt-0.5">{t('settings.enableCustomDesc')}</p>
            </div>
            <button
              id="enable-custom"
              role="switch"
              aria-checked={config.enabled}
              onClick={handleToggleEnabled}
              className={cn(
                "relative w-11 h-6 rounded-full transition-colors",
                config.enabled ? 'bg-primary' : 'bg-secondary'
              )}
            >
              <span className={cn(
                "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform",
                config.enabled ? 'translate-x-5' : 'translate-x-0'
              )} />
            </button>
          </div>

          {/* Search Service */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">{t('settings.searchProvider')}</label>
              <select
                value={config.searchProvider}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateConfig({ searchProvider: e.target.value as SearchProvider })}
                className="px-2 py-1 bg-secondary/50 border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary/50"
              >
                {searchProviders.map((p) => <option key={p} value={p}>{PROVIDER_INFO.search[p].name}</option>)}
              </select>
            </div>

            {/* Search API Key with Test Button */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showSearchKey ? 'text' : 'password'}
                  value={config.searchApiKey}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig({ searchApiKey: e.target.value })}
                  placeholder={t('settings.apiKeyPlaceholder')}
                  className="w-full px-3 py-2 pr-10 bg-secondary/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
                <button
                  type="button"
                  onClick={() => setShowSearchKey(!showSearchKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                >
                  {showSearchKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={handleTestSearch}
                disabled={searchTestResult.status === 'testing' || !config.searchApiKey}
                className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-border text-muted-foreground hover:bg-secondary/50 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {renderTestIcon(searchTestResult) || <span>⚡</span>}
                {t('settings.test')}
              </button>
              <a href={PROVIDER_INFO.search[config.searchProvider].docsUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-muted-foreground hover:text-primary">
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* LLM Service */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">{t('settings.llmProvider')}</label>
              <select
                value={config.llmProvider}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateConfig({ llmProvider: e.target.value as LLMProvider, llmEndpoint: '', llmModelFast: '', llmModelDeep: '' })}
                className="px-2 py-1 bg-secondary/50 border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary/50"
              >
                {llmProviders.map((p) => <option key={p} value={p}>{PROVIDER_INFO.llm[p].name}</option>)}
              </select>
            </div>

            {/* LLM API Key with Test Button */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showLLMKey ? 'text' : 'password'}
                  value={config.llmApiKey}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig({ llmApiKey: e.target.value })}
                  placeholder={t('settings.apiKeyPlaceholder')}
                  className="w-full px-3 py-2 pr-10 bg-secondary/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
                <button
                  type="button"
                  onClick={() => setShowLLMKey(!showLLMKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                >
                  {showLLMKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={handleTestLLM}
                disabled={llmTestResult.status === 'testing' || !config.llmApiKey}
                className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-border text-muted-foreground hover:bg-secondary/50 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {renderTestIcon(llmTestResult) || <span>⚡</span>}
                {t('settings.test')}
              </button>
              {!isCustomLLM && (
                <a href={PROVIDER_INFO.llm[config.llmProvider].docsUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-muted-foreground hover:text-primary">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>

            {/* Custom Endpoint */}
            {(isCustomLLM || config.llmEndpoint) && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t('settings.customEndpoint')}{isCustomLLM ? ' *' : ''}</label>
                <input
                  type="text"
                  value={config.llmEndpoint}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig({ llmEndpoint: e.target.value })}
                  placeholder={isCustomLLM ? t('settings.customEndpointPlaceholder') : PROVIDER_INFO.llm[config.llmProvider].endpoint}
                  className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
              </div>
            )}
            {!isCustomLLM && !config.llmEndpoint && (
              <button
                type="button"
                onClick={() => updateConfig({ llmEndpoint: ' ' })}
                className="text-xs text-primary hover:text-primary/80"
              >
                + {t('settings.customEndpoint')}
              </button>
            )}

            {/* Model Configuration */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t('settings.modelFast')}</label>
                <input
                  type="text"
                  value={config.llmModelFast}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig({ llmModelFast: e.target.value })}
                  placeholder={!isCustomLLM ? PROVIDER_INFO.llm[config.llmProvider].models.fast : t('settings.modelPlaceholder')}
                  className="w-full px-2 py-1.5 bg-secondary/50 border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t('settings.modelDeep')}</label>
                <input
                  type="text"
                  value={config.llmModelDeep}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig({ llmModelDeep: e.target.value })}
                  placeholder={!isCustomLLM ? PROVIDER_INFO.llm[config.llmProvider].models.deep : t('settings.modelPlaceholder')}
                  className="w-full px-2 py-1.5 bg-secondary/50 border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>
            {!isCustomLLM && (
              <p className="text-xs text-muted-foreground/60">{t('settings.customEndpointHint')}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-border flex gap-2 sm:gap-3">
          <button onClick={handleClear} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-destructive hover:bg-destructive/10 border border-destructive/30 transition-colors">
            <Trash2 className="w-4 h-4" />
            {t('settings.clear')}
          </button>
          <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-primary hover:bg-primary/90 text-primary-foreground transition-colors">
            <Save className="w-4 h-4" />
            {t('settings.save')}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
