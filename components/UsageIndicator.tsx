import React from 'react';
import { useTranslation } from 'react-i18next';
import { Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUsageLimit } from '../contexts/UsageLimitContext';
import { cn } from '../utils/cn';

export const UsageIndicator: React.FC = () => {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const { usage, isLoading } = useUsageLimit();

  // Don't show for authenticated users (unlimited)
  if (auth.isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary/30">
        <div className="w-3 h-3 rounded-full bg-muted-foreground/30 animate-pulse" />
        <div className="w-8 h-3 rounded bg-muted-foreground/30 animate-pulse" />
      </div>
    );
  }

  const isLow = usage.remaining <= 2 && usage.remaining > 0;
  const isEmpty = usage.remaining <= 0;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        "border transition-colors",
        isEmpty && "bg-destructive/10 border-destructive/30 text-destructive",
        isLow && !isEmpty && "bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400",
        !isLow && !isEmpty && "bg-secondary/30 border-border/50 text-muted-foreground"
      )}
      title={t('auth.usageTooltip', { remaining: usage.remaining, total: usage.total })}
    >
      <Zap className={cn(
        "w-3 h-3",
        isEmpty && "text-destructive",
        isLow && !isEmpty && "text-yellow-600 dark:text-yellow-400"
      )} />
      <span>
        {usage.remaining}/{usage.total}
      </span>
    </div>
  );
};
