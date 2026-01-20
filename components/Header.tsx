import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Menu, X, Settings, Github, Sun, Moon } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { SettingsPanel } from './SettingsPanel';
import { cn } from '../utils/cn';

interface HeaderProps {
  isLoading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ isLoading = false }) => {
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  // 初始化主题
  useEffect(() => {
    const savedTheme = localStorage.getItem('netpulse_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme ? savedTheme === 'dark' : prefersDark;
    setIsDark(shouldBeDark);
    document.body.classList.toggle('dark', shouldBeDark);
  }, []);

  // 切换主题
  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.body.classList.toggle('dark', newIsDark);
    localStorage.setItem('netpulse_theme', newIsDark ? 'dark' : 'light');
  };

  return (
    <header className={cn(
      "w-full py-4 md:py-6 px-4 md:px-8 flex items-center justify-between",
      "border-b border-border/50 bg-background/80 backdrop-blur-md",
      "sticky top-0 z-50 transition-colors duration-300"
    )}>
      {/* Logo 区域 */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary rounded-lg shadow-lg shadow-primary/20">
          <Activity className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">{t('header.title')}</h1>
          <p className="text-[10px] md:text-xs text-muted-foreground font-mono uppercase tracking-widest">{t('header.subtitle')}</p>
        </div>
      </div>

      {/* 桌面端：状态信息和语言切换 */}
      <div className="hidden md:flex items-center gap-3">
        <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
          <span>{t('header.realTimeAnalysis')}</span>
          {/* 绿色呼吸灯指示器 */}
          <div className="relative flex items-center justify-center">
            <span 
              className={cn(
                "w-2 h-2 rounded-full bg-green-500",
                isLoading && "animate-pulse"
              )}
            />
            {isLoading && (
              <span className="absolute w-4 h-4 rounded-full bg-green-500/30 animate-ping" />
            )}
          </div>
          <span>{t('header.searchEnabled')}</span>
        </div>
        <div className="w-px h-5 bg-border" />
        <LanguageSwitcher />
        <div className="flex items-center -ml-1">
          {/* 主题切换按钮 */}
          <button
            onClick={toggleTheme}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <a
            href="https://github.com/EmmaStoneX/NetPulse/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="GitHub"
          >
            <Github className="w-5 h-5" />
          </a>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={t('settings.title')}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 移动端：汉堡菜单按钮 */}
      <div className="flex md:hidden items-center gap-2">
        {/* 移动端呼吸灯 */}
        <div className="relative flex items-center justify-center mr-1">
          <span 
            className={cn(
              "w-2 h-2 rounded-full bg-green-500",
              isLoading && "animate-pulse"
            )}
          />
          {isLoading && (
            <span className="absolute w-4 h-4 rounded-full bg-green-500/30 animate-ping" />
          )}
        </div>
        <LanguageSwitcher />
        <div className="flex items-center">
          {/* 移动端主题切换 */}
          <button
            onClick={toggleTheme}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <a
            href="https://github.com/EmmaStoneX/NetPulse/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="GitHub"
          >
            <Github className="w-5 h-5" />
          </a>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={t('settings.title')}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* 移动端：展开菜单 */}
      {isMobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-background/95 backdrop-blur-md border-b border-border md:hidden animate-fade-in">
          <div className="px-4 py-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="relative flex items-center justify-center">
                <span 
                  className={cn(
                    "w-2 h-2 rounded-full bg-green-500",
                    isLoading && "animate-pulse"
                  )}
                />
                {isLoading && (
                  <span className="absolute w-4 h-4 rounded-full bg-green-500/30 animate-ping" />
                )}
              </div>
              <span>{t('header.realTimeAnalysis')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span>{t('header.searchEnabled')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel Modal */}
      {isSettingsOpen && <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />}
    </header>
  );
};
