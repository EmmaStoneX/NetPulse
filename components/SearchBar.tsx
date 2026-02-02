import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ArrowRight, Zap, BrainCircuit } from 'lucide-react';
import { AnalysisMode } from '../types';
import { cn } from '../utils/cn';
import { trackSearchInitiated, trackModeSelected, trackHNTrendingClicked } from '../utils/analytics';
import { TrendingSection } from './TrendingSection';
import { TrendingTopic } from '../hooks/useTrending';

interface SearchBarProps {
  onSearch: (query: string, mode: AnalysisMode) => void;
  isLoading: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading }) => {
  const { t, i18n } = useTranslation();
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<AnalysisMode>('deep');

  // Typewriter effect state
  const [currentPlaceholder, setCurrentPlaceholder] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Get typewriter placeholders from translation - use ref to avoid re-renders
  const typewriterTexts = t('searchBar.typewriterPlaceholders', { returnObjects: true }) as string[];
  const hasTypewriterTexts = Array.isArray(typewriterTexts) && typewriterTexts.length > 0;
  const typewriterTextsRef = useRef<string[]>(typewriterTexts);
  
  // Update ref when language changes
  useEffect(() => {
    typewriterTextsRef.current = typewriterTexts;
  }, [i18n.language]);

  useEffect(() => {
    if (!hasTypewriterTexts || isFocused || input) {
      setIsTyping(false);
      return;
    }

    let currentText = '';
    let isDeleting = false;
    let loopNum = 0;
    let typingSpeed = 100;
    let timer: ReturnType<typeof setTimeout>;

    const handleType = () => {
      const texts = typewriterTextsRef.current;
      const i = loopNum % texts.length;
      const fullText = texts[i];

      if (isDeleting) {
        currentText = fullText.substring(0, currentText.length - 1);
        typingSpeed = 50;
      } else {
        currentText = fullText.substring(0, currentText.length + 1);
        typingSpeed = 100;
      }

      setCurrentPlaceholder(currentText);
      setIsTyping(true);

      if (!isDeleting && currentText === fullText) {
        typingSpeed = 2000; // Pause at end
        isDeleting = true;
      } else if (isDeleting && currentText === '') {
        isDeleting = false;
        loopNum++;
        typingSpeed = 500; // Pause before next word
      }

      timer = setTimeout(handleType, typingSpeed);
    };

    timer = setTimeout(handleType, typingSpeed);

    return () => clearTimeout(timer);
  }, [hasTypewriterTexts, isFocused, input, i18n.language]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      trackSearchInitiated({
        mode,
        queryLength: input.trim().length,
        source: 'input',
      });
      onSearch(input, mode);
    }
  };

  // 处理 HN 热搜话题点击
  const handleHNTopicClick = (topic: TrendingTopic) => {
    trackSearchInitiated({
      mode,
      queryLength: topic.title.length,
      source: 'trending',
    });
    trackHNTrendingClicked(topic.id, topic.title);
    setInput(topic.title);
    onSearch(topic.title, mode);
  };

  const isZh = i18n.language?.startsWith('zh');

  return (
    <div className="w-full max-w-5xl mx-auto text-center">
      <h2 className={cn(
        "text-xl sm:text-3xl md:text-5xl font-bold mb-6 md:mb-8 tracking-tight px-2 text-foreground md:leading-relaxed",
        isZh && 'whitespace-nowrap'
      )}>
        <span className={isZh ? '' : 'block sm:inline mb-2 sm:mb-0'}>{t('searchBar.heroTitle1')}</span>{' '}
        <span className="gradient-text whitespace-nowrap">{t('searchBar.heroTitle2')}</span>
      </h2>
      <p className={cn(
        "text-muted-foreground mb-6 md:mb-8 text-sm sm:text-base md:text-lg px-4 max-w-3xl mx-auto",
        isZh ? 'whitespace-nowrap' : 'md:whitespace-nowrap'
      )}>
        {t('searchBar.heroDescription')}
      </p>

      {/* 模式切换 */}
      <div className="flex justify-center mb-6">
        <div className="bg-card/80 border border-border p-1 rounded-xl inline-flex items-center gap-1">
          <button
            onClick={() => {
              trackModeSelected('fast');
              setMode('fast');
            }}
            className={cn(
              "flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all",
              mode === 'fast'
                ? 'bg-amber-500/20 text-amber-500 dark:text-amber-400 shadow-sm border border-amber-500/20'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Zap className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="whitespace-nowrap">{t('searchBar.fastMode')}</span>
          </button>
          <button
            onClick={() => {
              trackModeSelected('deep');
              setMode('deep');
            }}
            className={cn(
              "flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all",
              mode === 'deep'
                ? 'bg-primary/20 text-primary shadow-sm border border-primary/20'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <BrainCircuit className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="whitespace-nowrap">{t('searchBar.deepMode')}</span>
          </button>
        </div>
      </div>

      {/* 搜索框 */}
      <form onSubmit={handleSubmit} className="relative group px-2 sm:px-0 max-w-3xl mx-auto">
        <div className={cn(
          "absolute inset-0 bg-gradient-to-r rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-500",
          mode === 'fast' ? 'from-amber-500 to-orange-600' : 'from-primary to-accent'
        )} />
        <div className="relative flex items-center bg-card border border-border rounded-2xl p-1.5 md:p-2 shadow-xl">
          <Search className="ml-2 md:ml-4 w-5 h-5 md:w-6 md:h-6 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isTyping ? currentPlaceholder : (mode === 'fast' ? t('searchBar.placeholderFast') : t('searchBar.placeholderDeep'))}
            className="flex-1 min-w-0 bg-transparent border-none outline-none text-foreground px-2 md:px-4 py-2 md:py-3 text-sm md:text-lg placeholder:text-muted-foreground"
            disabled={isLoading}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={cn(
              "text-white px-3 md:px-6 py-2 md:py-3 rounded-xl font-medium transition-all flex items-center gap-1.5 md:gap-2",
              "disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0 min-w-fit text-sm md:text-base",
              mode === 'fast' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-primary hover:bg-primary/90'
            )}
          >
            {isLoading ? (
              <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span className="hidden sm:inline">{t('searchBar.analyzeButton')}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Hacker News 实时热搜 */}
      <TrendingSection
        onTopicClick={handleHNTopicClick}
        disabled={isLoading}
      />
    </div>
  );
};
