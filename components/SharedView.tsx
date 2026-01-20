import React from 'react';
import { useTranslation } from 'react-i18next';
import { Share2, Sparkles } from 'lucide-react';
import { ResultView } from './ResultView';
import { SharedAnalysisData } from '../utils/shareUtils';
import { cn } from '../utils/cn';

interface SharedViewProps {
  sharedData: SharedAnalysisData;
  onStartNewAnalysis: () => void;
}

export const SharedView: React.FC<SharedViewProps> = ({
  sharedData,
  onStartNewAnalysis,
}) => {
  const { t } = useTranslation();
  
  const { analysisResult, shareOptions, originalQuery, customTitle } = sharedData;
  
  const displayTitle = customTitle || (shareOptions.includeQuery && originalQuery) 
    ? (customTitle || originalQuery) 
    : t('share.sharedAnalysis');

  const displayResult = shareOptions.includeSources 
    ? analysisResult 
    : { ...analysisResult, sources: [] };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/5 blur-[120px]" />
      </div>

      {/* Header with shared indicator */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Shared Analysis Badge */}
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
                <Share2 className="w-3.5 h-3.5" />
                <span>{t('sharedView.badge')}</span>
              </div>
            </div>
            
            {/* Start New Analysis Button */}
            <button
              onClick={onStartNewAnalysis}
              className="flex items-center gap-2 px-3 py-2 text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary/50"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">{t('sharedView.startNew')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Query/Title Display */}
      <div className="container mx-auto px-4 sm:px-6 pt-6">
        <div className="max-w-4xl mx-auto mb-6">
          <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border">
            <p className="text-xs text-muted-foreground mb-1">{t('sharedView.queryLabel')}</p>
            <p className="text-lg md:text-xl font-medium text-foreground">{displayTitle}</p>
          </div>
        </div>
      </div>

      {/* Result Content */}
      <main className="relative container mx-auto px-4 sm:px-6 py-2">
        <ResultView data={displayResult} />
      </main>

      {/* Call to Action */}
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card/80 backdrop-blur-md rounded-2xl p-6 md:p-8 text-center border border-border">
            <Sparkles className="w-8 h-8 text-primary mx-auto mb-4" />
            <h3 className="text-lg md:text-xl font-bold text-foreground mb-2">
              {t('sharedView.ctaTitle')}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              {t('sharedView.ctaDescription')}
            </p>
            <button
              onClick={onStartNewAnalysis}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              {t('sharedView.startNewButton')}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className={cn(
        "w-full py-3 md:py-4 text-center relative z-10",
        "border-t border-border/50 bg-background/80 backdrop-blur-md"
      )}>
        <div className="flex flex-col items-center gap-2 md:gap-3">
          <p className="text-[10px] md:text-xs text-muted-foreground/60 font-medium">
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </footer>
    </div>
  );
};
