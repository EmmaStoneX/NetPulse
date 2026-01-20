import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Sparkles, ArrowRight, Zap, BrainCircuit } from 'lucide-react';
import { AnalysisMode } from '../types';
import { getTrendingTopics } from '../services/geminiService';
import { cn } from '../utils/cn';

interface SearchBarProps {
  onSearch: (query: string, mode: AnalysisMode) => void;
  isLoading: boolean;
}

// 默认热门话题（根据语言）
const DEFAULT_TOPICS_ZH = [
  "最近的互联网大瘫痪",
  "最新 AI 模型发布的影响",
  "本周网络安全漏洞",
  "社交媒体新规"
];

const DEFAULT_TOPICS_EN = [
  "Recent Internet Outages",
  "Latest AI Model Releases",
  "This Week's Cybersecurity Vulnerabilities",
  "New Social Media Regulations"
];

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading }) => {
  const { t, i18n } = useTranslation();
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<AnalysisMode>('deep');
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);

  // 获取当前语言的默认话题
  const getDefaultTopics = useCallback((lang: string) => {
    return lang.startsWith('zh') ? DEFAULT_TOPICS_ZH : DEFAULT_TOPICS_EN;
  }, []);

  // 获取热门话题
  const fetchTrendingTopics = useCallback(async (lang: string) => {
    setIsLoadingTopics(true);
    const langCode = lang.startsWith('zh') ? 'zh' : 'en';
    
    setTrendingTopics(getDefaultTopics(lang));
    
    try {
      console.log(`[SearchBar] Fetching trending topics for lang=${langCode}`);
      const topics = await getTrendingTopics(langCode);
      if (topics && topics.length > 0) {
        console.log(`[SearchBar] Got ${topics.length} topics:`, topics);
        setTrendingTopics(topics);
      }
    } catch (error) {
      console.error('[SearchBar] Failed to fetch trending topics:', error);
    } finally {
      setIsLoadingTopics(false);
    }
  }, [getDefaultTopics]);

  // 监听语言变化
  useEffect(() => {
    const currentLang = i18n.language || 'zh';
    console.log(`[SearchBar] Language changed to: ${currentLang}`);
    fetchTrendingTopics(currentLang);
  }, [i18n.language, fetchTrendingTopics]);

  // 监听 i18n 语言变化事件
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      console.log(`[SearchBar] i18n languageChanged event: ${lng}`);
      fetchTrendingTopics(lng);
    };

    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [i18n, fetchTrendingTopics]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) onSearch(input, mode);
  };

  const isZh = i18n.language?.startsWith('zh');

  return (
    <div className="w-full max-w-3xl mx-auto text-center">
      <h2 className={cn(
        "text-xl sm:text-3xl md:text-5xl font-bold mb-4 md:mb-6 tracking-tight px-2 text-foreground",
        isZh && 'whitespace-nowrap'
      )}>
        <span className={isZh ? '' : 'block sm:inline'}>{t('searchBar.heroTitle1')}</span>{' '}
        <span className="gradient-text whitespace-nowrap">{t('searchBar.heroTitle2')}</span>
      </h2>
      <p className={cn(
        "text-muted-foreground mb-6 md:mb-8 text-sm sm:text-base md:text-lg px-4",
        isZh ? 'whitespace-nowrap' : 'md:whitespace-nowrap'
      )}>
        {t('searchBar.heroDescription')}
      </p>

      {/* 模式切换 */}
      <div className="flex justify-center mb-6">
        <div className="bg-card/80 border border-border p-1 rounded-xl inline-flex items-center gap-1">
          <button
            onClick={() => setMode('fast')}
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
            onClick={() => setMode('deep')}
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
      <form onSubmit={handleSubmit} className="relative group px-2 sm:px-0">
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
            placeholder={mode === 'fast' ? t('searchBar.placeholderFast') : t('searchBar.placeholderDeep')}
            className="flex-1 min-w-0 bg-transparent border-none outline-none text-foreground px-2 md:px-4 py-2 md:py-3 text-sm md:text-lg placeholder:text-muted-foreground"
            disabled={isLoading}
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

      {/* 热门话题 */}
      <div className="mt-6 flex flex-wrap justify-center gap-2 px-2">
        <span className="text-xs md:text-sm text-muted-foreground py-1">{t('searchBar.trendingTopics')}</span>
        {trendingTopics.map((topic, idx) => (
          <button
            key={`${i18n.language}-${topic}-${idx}`}
            onClick={() => {
              setInput(topic);
              onSearch(topic, mode);
            }}
            disabled={isLoading || isLoadingTopics}
            className={cn(
              "text-xs md:text-sm px-2 md:px-3 py-1 rounded-full",
              "bg-secondary/50 hover:bg-secondary border border-border",
              "text-secondary-foreground transition-colors flex items-center gap-1 md:gap-1.5"
            )}
          >
            <Sparkles className="w-2.5 h-2.5 md:w-3 md:h-3 text-yellow-500" />
            <span className="truncate max-w-[120px] md:max-w-none">{topic}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
