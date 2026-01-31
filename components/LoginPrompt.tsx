import React from 'react';
import { useTranslation } from 'react-i18next';
import { Github, X, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';

interface LoginPromptProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginPrompt: React.FC<LoginPromptProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { login } = useAuth();

  if (!isOpen) return null;

  const handleLogin = () => {
    login();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={cn(
        "relative w-full max-w-md p-6 rounded-2xl",
        "bg-background/95 backdrop-blur-md border border-border/50",
        "shadow-2xl animate-fade-in"
      )}>
        {/* Close button */}
        <button
          onClick={onClose}
          className={cn(
            "absolute top-4 right-4 p-1.5 rounded-full",
            "text-muted-foreground hover:text-foreground",
            "hover:bg-secondary/50 transition-colors"
          )}
          aria-label={t('share.close')}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="p-4 rounded-full bg-primary/10 border border-primary/20">
            <Lock className="w-8 h-8 text-primary" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-center text-foreground mb-2">
          {t('auth.limitReachedTitle')}
        </h2>

        {/* Description */}
        <p className="text-center text-muted-foreground mb-6">
          {t('auth.limitReachedDesc')}
        </p>

        {/* Login button */}
        <button
          onClick={handleLogin}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3 px-4",
            "bg-foreground text-background rounded-lg",
            "font-medium hover:opacity-90 transition-opacity"
          )}
        >
          <Github className="w-5 h-5" />
          {t('auth.loginWithGitHub')}
        </button>

        {/* Additional info */}
        <p className="text-xs text-center text-muted-foreground mt-4">
          {t('auth.loginBenefit')}
        </p>
      </div>
    </div>
  );
};
