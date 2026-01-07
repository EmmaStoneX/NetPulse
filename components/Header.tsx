import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Menu, X } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';

interface HeaderProps {
  isLoading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ isLoading = false }) => {
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="w-full py-4 md:py-6 px-4 md:px-8 flex items-center justify-between border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
      {/* Logo 区域 */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
          <Activity className="w-5 h-5 md:w-6 md:h-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-100">{t('header.title')}</h1>
          <p className="text-[10px] md:text-xs text-slate-400 font-mono uppercase tracking-widest">{t('header.subtitle')}</p>
        </div>
      </div>

      {/* 桌面端：状态信息和语言切换 */}
      <div className="hidden md:flex items-center gap-4">
        <div className="flex items-center gap-4 text-sm font-medium text-slate-400">
          <span>{t('header.realTimeAnalysis')}</span>
          {/* 绿色呼吸灯指示器 */}
          <div className="relative flex items-center justify-center">
            <span 
              className={`w-2 h-2 rounded-full bg-green-500 ${
                isLoading ? 'animate-pulse' : ''
              }`}
            ></span>
            {isLoading && (
              <span className="absolute w-4 h-4 rounded-full bg-green-500/30 animate-ping"></span>
            )}
          </div>
          <span>{t('header.searchEnabled')}</span>
        </div>
        <div className="w-px h-6 bg-slate-700"></div>
        <LanguageSwitcher />
      </div>

      {/* 移动端：汉堡菜单按钮 */}
      <div className="flex md:hidden items-center gap-2">
        {/* 移动端呼吸灯 */}
        <div className="relative flex items-center justify-center mr-1">
          <span 
            className={`w-2 h-2 rounded-full bg-green-500 ${
              isLoading ? 'animate-pulse' : ''
            }`}
          ></span>
          {isLoading && (
            <span className="absolute w-4 h-4 rounded-full bg-green-500/30 animate-ping"></span>
          )}
        </div>
        <LanguageSwitcher />
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-400 hover:text-white transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* 移动端：展开菜单 */}
      {isMobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 md:hidden animate-in slide-in-from-top duration-200">
          <div className="px-4 py-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className="relative flex items-center justify-center">
                <span 
                  className={`w-2 h-2 rounded-full bg-green-500 ${
                    isLoading ? 'animate-pulse' : ''
                  }`}
                ></span>
                {isLoading && (
                  <span className="absolute w-4 h-4 rounded-full bg-green-500/30 animate-ping"></span>
                )}
              </div>
              <span>{t('header.realTimeAnalysis')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>{t('header.searchEnabled')}</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
