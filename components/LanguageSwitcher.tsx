import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';
import { cn } from '../utils/cn';

export const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const changeLanguage = (lng: 'zh' | 'en') => {
    i18n.changeLanguage(lng);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLang = i18n.language?.startsWith('zh') ? 'zh' : 'en';
  const currentLangText = currentLang === 'zh' ? t('languageSwitcher.zh') : t('languageSwitcher.en');

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 text-sm font-medium transition-colors",
          "text-muted-foreground hover:text-foreground",
          "px-2 py-1.5 rounded-md hover:bg-secondary/50"
        )}
        aria-label="Switch language"
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">{currentLangText}</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", isOpen && 'rotate-180')} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-28 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden animate-fade-in">
          <button 
            onClick={() => changeLanguage('zh')} 
            className={cn(
              "block w-full text-left px-4 py-2.5 text-sm transition-colors",
              currentLang === 'zh' 
                ? 'bg-primary/20 text-primary' 
                : 'text-foreground hover:bg-secondary'
            )}
          >
            中文
          </button>
          <button 
            onClick={() => changeLanguage('en')} 
            className={cn(
              "block w-full text-left px-4 py-2.5 text-sm transition-colors",
              currentLang === 'en' 
                ? 'bg-primary/20 text-primary' 
                : 'text-foreground hover:bg-secondary'
            )}
          >
            English
          </button>
        </div>
      )}
    </div>
  );
};
