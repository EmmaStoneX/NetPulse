import React from 'react';
import { useTranslation } from 'react-i18next';
import { Flame, RefreshCw } from 'lucide-react';
import { useTrending, TrendingTopic } from '../hooks/useTrending';
import { cn } from '../utils/cn';

interface TrendingSectionProps {
  onTopicClick: (topic: TrendingTopic) => void;
  disabled?: boolean;
}

export const TrendingSection: React.FC<TrendingSectionProps> = ({
  onTopicClick,
  disabled = false
}) => {
  const { t, i18n } = useTranslation();
  const { categories, isLoading, error, refresh } = useTrending();
  
  const isZh = i18n.language?.startsWith('zh');
  const techCategory = categories.find(c => c.id === 'tech');
  const topics = techCategory?.topics || [];

  // 骨架屏
  if (isLoading && topics.length === 0) {
    return (
      <div className="mt-6 w-full max-w-3xl mx-auto px-2">
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-4 h-4 bg-muted rounded animate-pulse" />
          <div className="w-24 h-4 bg-muted rounded animate-pulse" />
        </div>
        {/* 桌面端双列骨架 */}
        <div className="hidden sm:grid sm:grid-cols-2 gap-x-6 gap-y-1">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-9 bg-muted/30 rounded animate-pulse" />
          ))}
        </div>
        {/* 移动端单列骨架 */}
        <div className="sm:hidden space-y-1">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-10 bg-muted/30 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (topics.length === 0 && !isLoading) {
    return null;
  }

  // 分成两列（桌面端）
  const leftColumn = topics.filter((_, i) => i % 2 === 0);
  const rightColumn = topics.filter((_, i) => i % 2 === 1);

  return (
    <div className="mt-6 w-full max-w-3xl mx-auto px-2">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-medium text-foreground">
            {isZh ? 'AI科技热搜' : 'AI & Tech'}
          </span>
          <span className="text-[10px] text-muted-foreground">
            via Hacker News
          </span>
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          className="p-1 rounded hover:bg-secondary/50 transition-colors"
          title={t('trending.refresh')}
        >
          <RefreshCw className={cn(
            "w-3.5 h-3.5 text-muted-foreground",
            isLoading && "animate-spin"
          )} />
        </button>
      </div>

      {/* 桌面端：双列布局 */}
      <div className="hidden sm:grid sm:grid-cols-2 gap-x-8">
        <div className="space-y-0.5">
          {leftColumn.map((topic) => (
            <TrendingItem
              key={topic.id}
              topic={topic}
              rank={topics.indexOf(topic) + 1}
              onClick={() => onTopicClick(topic)}
              disabled={disabled || isLoading}
            />
          ))}
        </div>
        <div className="space-y-0.5">
          {rightColumn.map((topic) => (
            <TrendingItem
              key={topic.id}
              topic={topic}
              rank={topics.indexOf(topic) + 1}
              onClick={() => onTopicClick(topic)}
              disabled={disabled || isLoading}
            />
          ))}
        </div>
      </div>

      {/* 移动端：单列布局 */}
      <div className="sm:hidden space-y-0.5">
        {topics.map((topic, idx) => (
          <TrendingItem
            key={topic.id}
            topic={topic}
            rank={idx + 1}
            onClick={() => onTopicClick(topic)}
            disabled={disabled || isLoading}
            mobile
          />
        ))}
      </div>

      {error && (
        <p className="mt-2 text-xs text-muted-foreground text-center">
          {t('trending.loadError')}
        </p>
      )}
    </div>
  );
};

// 单个热搜项 - 参考微博热搜样式
const TrendingItem: React.FC<{
  topic: TrendingTopic;
  rank: number;
  onClick: () => void;
  disabled: boolean;
  mobile?: boolean;
}> = ({ topic, rank, onClick, disabled, mobile }) => {
  const rankColors = ['text-red-500', 'text-orange-500', 'text-amber-500'];
  const rankColor = rank <= 3 ? rankColors[rank - 1] : 'text-muted-foreground';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={topic.title}
      className={cn(
        "w-full flex items-center gap-2 py-2 px-2 rounded-lg text-left",
        "hover:bg-secondary/50 transition-colors group",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        mobile && "py-2.5"
      )}
    >
      <span className={cn(
        "text-xs font-bold min-w-[1rem] text-center",
        rankColor
      )}>
        {rank}
      </span>
      <span 
        className={cn(
          "flex-1 text-sm text-foreground/80 group-hover:text-foreground truncate",
          mobile && "text-[13px]"
        )}
        title={topic.title}
      >
        {topic.title}
      </span>
    </button>
  );
};
