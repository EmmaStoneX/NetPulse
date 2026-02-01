import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, TrendingUp, ArrowRight, Zap, BrainCircuit } from 'lucide-react';
import { AnalysisMode } from '../types';
import { getTrendingTopics } from '../services/geminiService';
import { cn } from '../utils/cn';
import { trackSearchInitiated, trackModeSelected, trackTrendingTopicClicked } from '../utils/analytics';

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

// 热门话题缓存 key
const TRENDING_CACHE_KEY = 'netpulse_trending_topics';
const TRENDING_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 小时缓存
const TRENDING_LAST_SUCCESS_KEY = 'netpulse_trending_last_success'; // 最后一次成功加载的话题

// 从 localStorage 获取缓存的话题
const getCachedTopics = (lang: string): string[] | null => {
  try {
    const cached = localStorage.getItem(TRENDING_CACHE_KEY);
    if (!cached) return null;
    
    const { topics, timestamp, language } = JSON.parse(cached);
    const isExpired = Date.now() - timestamp > TRENDING_CACHE_TTL;
    const isSameLang = language === lang;
    
    if (!isExpired && isSameLang && topics?.length > 0) {
      return topics;
    }
    return null;
  } catch {
    return null;
  }
};

// 获取最后一次成功加载的话题（作为 fallback）
const getLastSuccessTopics = (lang: string): string[] | null => {
  try {
    const cached = localStorage.getItem(TRENDING_LAST_SUCCESS_KEY);
    if (!cached) return null;
    
    const { topics, language } = JSON.parse(cached);
    // 只检查语言匹配，不检查过期（作为 fallback 永久有效）
    if (language === lang && topics?.length > 0) {
      return topics;
    }
    return null;
  } catch {
    return null;
  }
};

// 缓存话题到 localStorage
const setCachedTopics = (topics: string[], lang: string) => {
  try {
    const data = JSON.stringify({
      topics,
      timestamp: Date.now(),
      language: lang
    });
    localStorage.setItem(TRENDING_CACHE_KEY, data);
    // 同时保存为最后一次成功加载的话题
    localStorage.setItem(TRENDING_LAST_SUCCESS_KEY, JSON.stringify({
      topics,
      language: lang
    }));
  } catch {
    // 忽略存储错误
  }
};

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading }) => {
  const { t, i18n } = useTranslation();
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<AnalysisMode>('deep');
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);

  // Typewriter effect state
  const [currentPlaceholder, setCurrentPlaceholder] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Get typewriter placeholders from translation
  const typewriterTexts = t('searchBar.typewriterPlaceholders', { returnObjects: true }) as string[];
  const hasTypewriterTexts = Array.isArray(typewriterTexts) && typewriterTexts.length > 0;

  useEffect(() => {
    if (!hasTypewriterTexts || isFocused || input) {
      setIsTyping(false);
      return;
    }

    let currentIndex = 0;
    let currentText = '';
    let isDeleting = false;
    let loopNum = 0;
    let typingSpeed = 100;

    const handleType = () => {
      const i = loopNum % typewriterTexts.length;
      const fullText = typewriterTexts[i];

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

    let timer = setTimeout(handleType, typingSpeed);

    return () => clearTimeout(timer);
  }, [hasTypewriterTexts, isFocused, input, i18n.language]); // Re-run when language changes

  // 获取当前语言的默认话题
  const getDefaultTopics = useCallback((lang: string) => {
    return lang.startsWith('zh') ? DEFAULT_TOPICS_ZH : DEFAULT_TOPICS_EN;
  }, []);

  // 获取热门话题（带请求取消和本地缓存）
  const fetchTrendingTopics = useCallback(async (lang: string, signal?: AbortSignal) => {
    const langCode = lang.startsWith('zh') ? 'zh' : 'en';
    
    // 1. 先尝试从缓存获取（24小时有效）
    const cachedTopics = getCachedTopics(langCode);
    if (cachedTopics) {
      console.log(`[SearchBar] Using cached topics for lang=${langCode}`);
      setTrendingTopics(cachedTopics);
      setIsLoadingTopics(false);
      return;
    }
    
    // 2. 缓存过期，尝试获取最后一次成功加载的话题作为初始显示
    const lastSuccessTopics = getLastSuccessTopics(langCode);
    if (lastSuccessTopics) {
      console.log(`[SearchBar] Using last success topics for lang=${langCode}`);
      setTrendingTopics(lastSuccessTopics);
    } else {
      // 3. 没有任何缓存，使用默认话题
      setTrendingTopics(getDefaultTopics(lang));
    }
    
    // 4. 后台请求新话题
    setIsLoadingTopics(true);

    try {
      console.log(`[SearchBar] Fetching trending topics for lang=${langCode}`);
      const topics = await getTrendingTopics(langCode);

      // 检查请求是否已被取消
      if (signal?.aborted) {
        console.log(`[SearchBar] Request for lang=${langCode} was aborted`);
        return;
      }

      if (topics && topics.length > 0) {
        console.log(`[SearchBar] Got ${topics.length} topics:`, topics);
        setTrendingTopics(topics);
        // 缓存到 localStorage（同时更新 lastSuccess）
        setCachedTopics(topics, langCode);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log(`[SearchBar] Request for lang=${langCode} was aborted`);
        return;
      }
      console.error('[SearchBar] Failed to fetch trending topics:', error);
      // 请求失败时保持当前显示的话题（lastSuccess 或 default）
    } finally {
      if (!signal?.aborted) {
        setIsLoadingTopics(false);
      }
    }
  }, [getDefaultTopics]);

  // 监听语言变化（使用 AbortController 取消旧请求）
  useEffect(() => {
    const currentLang = i18n.language || 'zh';
    console.log(`[SearchBar] Language changed to: ${currentLang}`);

    const abortController = new AbortController();
    fetchTrendingTopics(currentLang, abortController.signal);

    return () => {
      // 组件卸载或语言再次变化时，取消之前的请求
      abortController.abort();
    };
  }, [i18n.language, fetchTrendingTopics]);

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

      {/* 热门话题 */}
      <div className="mt-6 flex flex-wrap justify-center gap-2 px-2 max-w-3xl mx-auto">
        <span className="text-xs md:text-sm text-muted-foreground py-1">{t('searchBar.trendingTopics')}</span>
        {trendingTopics.map((topic, idx) => (
          <button
            key={`${i18n.language}-${topic}-${idx}`}
            onClick={() => {
              trackSearchInitiated({
                mode,
                queryLength: topic.length,
                source: 'trending',
              });
              trackTrendingTopicClicked(idx);
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
            <TrendingUp className="w-3 h-3 md:w-3.5 md:h-3.5 text-primary" />
            <span className="truncate max-w-[120px] md:max-w-none">{topic}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
