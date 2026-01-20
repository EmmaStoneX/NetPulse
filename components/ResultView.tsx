import React from 'react';
import { useTranslation } from 'react-i18next';
import { AnalysisResult } from '../types';
import { ExternalLink, History, Zap, Globe } from 'lucide-react';
import { cn } from '../utils/cn';

interface ResultViewProps {
  data: AnalysisResult;
}

// Helper to render markdown (bold) and handle paragraphs
const MarkdownText: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  
  const lines = text.split('\n').filter(line => line.trim() !== '');

  return (
    <div className="space-y-4">
      {lines.map((line, lineIdx) => {
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={lineIdx} className="leading-relaxed text-muted-foreground">
            {parts.map((part, partIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={partIdx} className="text-foreground font-bold">{part.slice(2, -2)}</strong>;
              }
              return <span key={partIdx}>{part}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
};

export const ResultView: React.FC<ResultViewProps> = ({ data }) => {
  const { t } = useTranslation();
  const { parsed, sources } = data;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 md:space-y-12 animate-fade-in pb-12 px-2 sm:px-0">
      
      {/* 1. Hero Section: Title & Summary */}
      <div className={cn(
        "rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-10 relative overflow-hidden",
        "bg-card/80 backdrop-blur-md border border-border",
        "dark:border-t dark:border-t-primary/30"
      )}>
        <div className="absolute -top-10 -right-10 p-12 opacity-[0.05] pointer-events-none hidden md:block">
          <Globe className="w-80 h-80 text-primary" />
        </div>
        
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4 md:mb-6">
            <div className="inline-flex items-center gap-2 px-2 md:px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] md:text-xs font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-primary animate-pulse" />
              {t('result.analysisComplete')}
            </div>
            <span className="text-[10px] md:text-xs text-muted-foreground font-mono">{new Date().toLocaleDateString()}</span>
          </div>
          
          <h2 className="text-2xl md:text-3xl lg:text-5xl font-bold text-foreground mb-4 md:mb-6 leading-tight tracking-tight">
            <MarkdownText text={parsed.title || t('result.eventAnalysis')} />
          </h2>
          
          <div className="text-base md:text-lg lg:text-xl text-muted-foreground leading-relaxed border-l-2 border-primary/50 pl-4 md:pl-6">
            <MarkdownText text={parsed.summary} />
          </div>
        </div>
      </div>

      {/* 2. Core Impact Section */}
      <section className="space-y-4 md:space-y-6">
        <div className="flex items-center gap-2 md:gap-3 px-2">
          <div className="p-1.5 md:p-2 bg-amber-500/10 rounded-lg text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Zap className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">{t('result.coreImpact')}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 lg:gap-6">
          {parsed.impacts.map((impact, index) => (
            <div 
              key={index} 
              className={cn(
                "p-4 md:p-6 rounded-xl md:rounded-2xl transition-all duration-300 group",
                "bg-card/80 backdrop-blur-md border border-border",
                "hover:bg-secondary/50 hover:border-amber-500/30"
              )}
            >
              <div className="flex items-start gap-2 md:gap-3">
                <span className={cn(
                  "flex-shrink-0 w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center",
                  "text-[10px] md:text-xs font-mono mt-0.5 transition-colors",
                  "bg-secondary text-muted-foreground border border-border",
                  "group-hover:border-amber-500/50 group-hover:text-amber-500"
                )}>
                  {index + 1}
                </span>
                <div className="text-sm md:text-base">
                  <MarkdownText text={impact} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Historical Context Section */}
      <section className="space-y-4 md:space-y-6">
        <div className="flex items-center gap-2 md:gap-3 px-2">
          <div className="p-1.5 md:p-2 bg-purple-500/10 rounded-lg text-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <History className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">{t('result.historicalEchoes')}</h3>
        </div>

        <div className={cn(
          "p-5 md:p-8 rounded-2xl md:rounded-3xl",
          "bg-card/80 backdrop-blur-md border border-purple-500/20",
          "bg-gradient-to-br from-card/80 to-purple-500/5"
        )}>
           <div className="prose prose-invert max-w-none text-sm md:text-base">
             <MarkdownText text={parsed.historicalContext} />
           </div>
           <div className="mt-6 md:mt-8 flex items-center gap-2 text-purple-500 text-xs md:text-sm font-medium opacity-80">
             <History className="w-3.5 h-3.5 md:w-4 md:h-4" />
             <span>{t('result.historyRhymes')}</span>
           </div>
        </div>
      </section>

      {/* 4. Sources Section */}
      {sources.length > 0 && (
        <div className="pt-6 md:pt-8 border-t border-border">
          <h4 className="text-xs md:text-sm font-semibold text-muted-foreground mb-3 md:mb-4 uppercase tracking-wider px-2">
            {t('result.references')}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
            {sources.map((source, idx) => (
              <a
                key={idx}
                href={source.uri}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "group flex items-center justify-between p-2.5 md:p-3 rounded-lg md:rounded-xl transition-all duration-200",
                  "bg-secondary/50 border border-border",
                  "hover:border-muted-foreground/30 hover:bg-secondary"
                )}
              >
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                  <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-secondary flex items-center justify-center text-[9px] md:text-[10px] text-muted-foreground font-mono border border-border">
                    {idx + 1}
                  </div>
                  <span className="truncate text-xs md:text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    {source.title}
                  </span>
                </div>
                <ExternalLink className="w-3 h-3 text-muted-foreground/50 group-hover:text-muted-foreground flex-shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
