import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Share2, Copy, Check, AlertCircle, Eye } from 'lucide-react';
import { AnalysisResult } from '../types';
import { ShareOptions, createShareData, generateShareUrl } from '../utils/shareUtils';
import { cn } from '../utils/cn';

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
  
  const [includeQuery, setIncludeQuery] = useState(true);
  const [customTitle, setCustomTitle] = useState('');
  const [includeSources, setIncludeSources] = useState(true);
  
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedUrl, setGeneratedUrl] = useState('');

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

  useEffect(() => {
    if (isOpen) {
      generateUrl();
    }
  }, [isOpen, generateUrl]);

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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
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
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const previewTitle = customTitle.trim() || (includeQuery ? query : t('share.sharedAnalysis'));

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div 
        className="w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            <h2 id="share-modal-title" className="text-lg font-bold text-foreground">
              {t('share.modalTitle')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            aria-label={t('share.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Include Query Toggle */}
          <div className="flex items-center justify-between">
            <label htmlFor="include-query" className="text-sm text-foreground">
              {t('share.includeQuery')}
            </label>
            <button
              id="include-query"
              role="switch"
              aria-checked={includeQuery}
              onClick={() => setIncludeQuery(!includeQuery)}
              className={cn(
                "relative w-11 h-6 rounded-full transition-colors",
                includeQuery ? 'bg-primary' : 'bg-secondary'
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform",
                  includeQuery ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          {/* Include Sources Toggle */}
          <div className="flex items-center justify-between">
            <label htmlFor="include-sources" className="text-sm text-foreground">
              {t('share.includeSources')}
            </label>
            <button
              id="include-sources"
              role="switch"
              aria-checked={includeSources}
              onClick={() => setIncludeSources(!includeSources)}
              className={cn(
                "relative w-11 h-6 rounded-full transition-colors",
                includeSources ? 'bg-primary' : 'bg-secondary'
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform",
                  includeSources ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          {/* Custom Title Input */}
          <div className="space-y-2">
            <label htmlFor="custom-title" className="text-sm text-foreground">
              {t('share.customTitle')}
            </label>
            <input
              id="custom-title"
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder={t('share.customTitlePlaceholder')}
              maxLength={100}
              className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
            />
          </div>

          {/* Preview Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="w-4 h-4" />
              <span>{t('share.preview')}</span>
            </div>
            <div className="p-3 bg-secondary/30 border-l-2 border-primary/50 rounded-r-lg">
              <p className="text-xs text-muted-foreground mb-1">{t('share.previewLabel')}</p>
              <p className="text-sm text-foreground font-medium truncate">{previewTitle}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {analysisResult.parsed.summary.substring(0, 100)}...
              </p>
              {includeSources && analysisResult.sources.length > 0 && (
                <p className="text-xs text-muted-foreground/60 mt-2">
                  {t('share.sourcesCount', { count: analysisResult.sources.length })}
                </p>
              )}
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <button
            onClick={handleCopy}
            disabled={!generatedUrl || copyStatus === 'success'}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              copyStatus === 'success'
                ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                : copyStatus === 'error'
                ? 'bg-destructive/20 text-destructive border border-destructive/30'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
            )}
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
