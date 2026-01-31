import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Menu, X, Settings, Github, Sun, Moon, Languages } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { SettingsPanel } from './SettingsPanel';
import { UserMenu } from './UserMenu';
import { UsageIndicator } from './UsageIndicator';
import { cn } from '../utils/cn';
import { trackSettingsOpened, trackGitHubClicked } from '../utils/analytics';

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
    document.documentElement.classList.toggle('dark', shouldBeDark);
  }, []);

  // 切换主题
  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.documentElement.classList.toggle('dark', newIsDark);
    localStorage.setItem('netpulse_theme', newIsDark ? 'dark' : 'light');
  };

  // 关闭移动端菜单
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <header className={cn(
      "w-full py-4 md:py-6 px-4 md:px-8 flex items-center justify-between",
      "border-b border-border/50 bg-background/80 backdrop-blur-md",
      "sticky top-0 z-50 transition-colors duration-300"
    )}>
      {/* Logo 区域 */}
      <div className="flex items-center gap-3">
        <div className="p-1.5 bg-primary rounded-lg shadow-lg shadow-primary/20 flex-shrink-0">
          <Activity className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
        </div>

        <div className="flex items-center gap-3">
          <h1 className="text-lg md:text-lg font-bold tracking-tight text-foreground leading-none">
            NetPulse
          </h1>

          {/* 桌面端显示分隔符和副标题 */}
          <div className="hidden md:flex items-center gap-3">
            <span className="h-4 w-[1.5px] bg-foreground/30 block rounded-full"></span>
            <span className="text-base font-bold tracking-wide text-foreground/80 pt-0.5 leading-none">
              {t('header.subtitle')}
            </span>
          </div>

          {/* 状态指示器 */}
          {isLoading && (
            <span className="relative flex h-1.5 w-1.5 md:h-2 md:w-2 ml-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 md:h-2 md:w-2 bg-green-500"></span>
            </span>
          )}
        </div>
      </div>

      {/* 桌面端：状态信息和功能区 */}
      <div className="hidden md:flex items-center gap-1">
        <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground mr-4">
          <span>{t('header.realTimeAnalysis')}</span>
          <span>{t('header.searchEnabled')}</span>
        </div>

        <UsageIndicator />

        {/* 图标功能区容器 */}
        <div className="flex items-center gap-1 p-1 bg-secondary/30 rounded-full border border-border/50 backdrop-blur-sm ml-2">
          <LanguageSwitcher />
          <div className="w-px h-4 bg-border mx-1" />
          <button
            onClick={toggleTheme}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-background/80"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <a
            href="https://github.com/EmmaStoneX/NetPulse/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackGitHubClicked()}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-background/80"
            aria-label="GitHub Repository"
          >
            <Github className="w-4 h-4" />
          </a>
          <button
            onClick={() => {
              trackSettingsOpened();
              setIsSettingsOpen(true);
            }}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-background/80"
            aria-label={t('settings.title')}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        <div className="ml-2">
          <UserMenu />
        </div>
      </div>

      {/* 移动端：精简图标 - 只保留 GitHub 仓库链接、登录按钮和汉堡菜单 */}
      <div className="flex md:hidden items-center gap-1">
        {/* 使用次数指示器 */}
        <UsageIndicator />

        {/* GitHub 仓库链接 */}
        <a
          href="https://github.com/EmmaStoneX/NetPulse/"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackGitHubClicked()}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary/50"
          aria-label="GitHub Repository"
        >
          <Github className="w-5 h-5" />
        </a>

        {/* 用户菜单/登录按钮 */}
        <UserMenu />

        {/* 汉堡菜单按钮 */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary/50"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* 移动端：展开菜单 - 包含语言、主题、设置 */}
      {isMobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-background/95 backdrop-blur-md border-b border-border md:hidden animate-fade-in">
          <div className="px-4 py-4 space-y-1">
            {/* 状态信息 */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <div className="relative flex items-center justify-center">
                <span className={cn("w-2 h-2 rounded-full bg-green-500", isLoading && "animate-pulse")} />
                {isLoading && <span className="absolute w-4 h-4 rounded-full bg-green-500/30 animate-ping" />}
              </div>
              <span>{t('header.realTimeAnalysis')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span>{t('header.searchEnabled')}</span>
            </div>

            <div className="h-px bg-border/50 my-2" />

            {/* 语言切换 */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3 text-sm text-foreground">
                <Languages className="w-4 h-4 text-muted-foreground" />
                <span>{t('languageSwitcher.zh') === '中文' ? '语言' : 'Language'}</span>
              </div>
              <LanguageSwitcher />
            </div>

            {/* 主题切换 */}
            <button
              onClick={() => {
                toggleTheme();
                closeMobileMenu();
              }}
              className="w-full flex items-center justify-between py-2 text-sm text-foreground"
            >
              <div className="flex items-center gap-3">
                {isDark ? <Sun className="w-4 h-4 text-muted-foreground" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
                <span>{isDark ? (t('languageSwitcher.zh') === '中文' ? '浅色模式' : 'Light Mode') : (t('languageSwitcher.zh') === '中文' ? '深色模式' : 'Dark Mode')}</span>
              </div>
            </button>

            {/* 设置 */}
            <button
              onClick={() => {
                trackSettingsOpened();
                setIsSettingsOpen(true);
                closeMobileMenu();
              }}
              className="w-full flex items-center gap-3 py-2 text-sm text-foreground"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
              <span>{t('settings.title')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Settings Panel Modal */}
      {isSettingsOpen && <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />}
    </header>
  );
};
