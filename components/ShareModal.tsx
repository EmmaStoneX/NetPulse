import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Share2, Copy, Check, AlertCircle, Eye } from 'lucide-react';
import { AnalysisResult } from '../types';
import { ShareOptions, createShareData, generateShareUrl } from '../utils/shareUtils';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisResult: AnalysisResult;
  query: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  analysisResult,
  query,
}) => {
  const { t } = useTranslation();
  
  // Share options state
  const [includeQuery, setIncludeQuery] = useState(true);
  const [customTitle, setCustomTitle] = useState('');
  const [includeSources, setIncludeSources] = useState(true);
  
  // UI state
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedUrl, setGeneratedUrl] = useState('');

  // Generate share URL when options change
  const generateUrl = useCallback(async () => {
    const options: ShareOptions = {
      includeQuery,
      customTitle: customTitle.trim() || undefined,
      includeSources,
    };
    
    const shareData = createShareData(analysisResult, query, options);
    const url = await generateShareUrl(shareData);
    
    if (url) {
      setGeneratedUrl(url);
      setErrorMessage('');
    } else {
      setGeneratedUrl('');
      setErrorMessage(t('share.rateLimitError'));
    }
  }, [includeQuery, customTitle, includeSources, analysisResult, query, t]);

  // Update URL when options change
  useEffect(() => {
    if (isOpen) {
      generateUrl();
    }
  }, [isOpen, generateUrl]);

  // Handle copy to clipboard
  const handleCopy = async () => {
    if (!generatedUrl) {
      setErrorMessage(t('share.generateError'));
      setCopyStatus('error');
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopyStatus('success');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      try {
        const textArea = document.createElement('textarea');
        textArea.value = generatedUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopyStatus('success');
        setTimeout(() => setCopyStatus('idle'), 2000);
      } catch {
        setCopyStatus('error');
        setErrorMessage(t('share.copyError'));
        setTimeout(() => setCopyStatus('idle'), 2000);
      }
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Preview display title
  const previewTitle = customTitle.trim() || (includeQuery ? query : t('share.sharedAnalysis'));

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f172a]/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div 
        className="w-full max-w-md glass-panel rounded-2xl border border-slate-700/50 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-400" />
            <h2 id="share-modal-title" className="text-lg font-bold text-white">
              {t('share.modalTitle')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
            aria-label={t('share.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Include Query Toggle */}
          <div className="flex items-center justify-between">
            <label htmlFor="include-query" className="text-sm text-slate-300">
              {t('share.includeQuery')}
            </label>
            <button
              id="include-query"
              role="switch"
              aria-checked={includeQuery}
              onClick={() => setIncludeQuery(!includeQuery)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                includeQuery ? 'bg-blue-500' : 'bg-slate-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  includeQuery ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Include Sources Toggle */}
          <div className="flex items-center justify-between">
            <label htmlFor="include-sources" className="text-sm text-slate-300">
              {t('share.includeSources')}
            </label>
            <button
              id="include-sources"
              role="switch"
              aria-checked={includeSources}
              onClick={() => setIncludeSources(!includeSources)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                includeSources ? 'bg-blue-500' : 'bg-slate-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  includeSources ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Custom Title Input */}
          <div className="space-y-2">
            <label htmlFor="custom-title" className="text-sm text-slate-300">
              {t('share.customTitle')}
            </label>
            <input
              id="custom-title"
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder={t('share.customTitlePlaceholder')}
              maxLength={100}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-colors"
            />
          </div>

          {/* Preview Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Eye className="w-4 h-4" />
              <span>{t('share.preview')}</span>
            </div>
            <div className="p-3 bg-slate-800/30 border-l-2 border-blue-500/50 rounded-r-lg">
              <p className="text-xs text-slate-500 mb-1">{t('share.previewLabel')}</p>
              <p className="text-sm text-white font-medium truncate">{previewTitle}</p>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                {analysisResult.parsed.summary.substring(0, 100)}...
              </p>
              {includeSources && analysisResult.sources.length > 0 && (
                <p className="text-xs text-slate-500 mt-2">
                  {t('share.sourcesCount', { count: analysisResult.sources.length })}
                </p>
              )}
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700/50">
          <button
            onClick={handleCopy}
            disabled={!generatedUrl || copyStatus === 'success'}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
              copyStatus === 'success'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : copyStatus === 'error'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {copyStatus === 'success' ? (
              <>
                <Check className="w-4 h-4" />
                {t('share.copied')}
              </>
            ) : copyStatus === 'error' ? (
              <>
                <AlertCircle className="w-4 h-4" />
                {t('share.copyFailed')}
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                {t('share.copyLink')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
