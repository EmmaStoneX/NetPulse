import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Github, LogOut, ChevronDown, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';

export const UserMenu: React.FC = () => {
  const { t } = useTranslation();
  const { auth, login, logout, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  if (isLoading) {
    return (
      <div className="w-8 h-8 rounded-full bg-secondary/50 animate-pulse" />
    );
  }

  // Not authenticated - show login button
  if (!auth.isAuthenticated) {
    return (
      <button
        onClick={login}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full",
          "bg-secondary/50 hover:bg-secondary/80 border border-border/50",
          "text-sm font-medium text-foreground transition-colors"
        )}
      >
        <Github className="w-4 h-4" />
        <span className="hidden sm:inline">{t('auth.loginWithGitHub')}</span>
      </button>
    );
  }

  // Authenticated - show user avatar with dropdown
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 p-1 rounded-full",
          "hover:bg-secondary/50 transition-colors",
          isOpen && "bg-secondary/50"
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {auth.user?.avatar_url ? (
          <img
            src={auth.user.avatar_url}
            alt={auth.user.login}
            className="w-8 h-8 rounded-full border border-border/50"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <User className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
        <ChevronDown className={cn(
          "w-4 h-4 text-muted-foreground transition-transform hidden sm:block",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className={cn(
          "absolute right-0 mt-2 w-48 py-1 z-50",
          "bg-background/95 backdrop-blur-md rounded-lg shadow-lg",
          "border border-border/50 animate-fade-in"
        )}>
          {/* User info */}
          <div className="px-4 py-2 border-b border-border/50">
            <p className="text-sm font-medium text-foreground truncate">
              {auth.user?.login}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('auth.loggedIn')}
            </p>
          </div>

          {/* Logout button */}
          <button
            onClick={() => {
              logout();
              setIsOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-2 px-4 py-2",
              "text-sm text-foreground hover:bg-secondary/50 transition-colors"
            )}
          >
            <LogOut className="w-4 h-4" />
            {t('auth.logout')}
          </button>
        </div>
      )}
    </div>
  );
};
