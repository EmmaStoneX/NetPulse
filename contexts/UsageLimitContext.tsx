import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';

// Types
export interface UsageLimitState {
  remaining: number;
  total: number;
  isLimited: boolean;
  resetTime: string;
}

interface UsageLimitContextValue {
  usage: UsageLimitState;
  refreshUsage: () => Promise<void>;
  decrementUsage: () => void;
  isLoading: boolean;
}

// Constants
const USAGE_API_ENDPOINT = '/api/usage';
const DEFAULT_TOTAL = 5;

// Initial state
const initialUsageState: UsageLimitState = {
  remaining: DEFAULT_TOTAL,
  total: DEFAULT_TOTAL,
  isLimited: false,
  resetTime: '',
};

// Context
const UsageLimitContext = createContext<UsageLimitContextValue | undefined>(undefined);

// Provider component
interface UsageLimitProviderProps {
  children: ReactNode;
}

export function UsageLimitProvider({ children }: UsageLimitProviderProps) {
  const { auth } = useAuth();
  const [usage, setUsage] = useState<UsageLimitState>(initialUsageState);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch usage from API
  const refreshUsage = useCallback(async () => {
    // Authenticated users have unlimited usage
    if (auth.isAuthenticated) {
      setUsage({
        remaining: Infinity,
        total: Infinity,
        isLimited: false,
        resetTime: '',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(USAGE_API_ENDPOINT);
      if (response.ok) {
        const data = await response.json();
        setUsage({
          remaining: data.remaining ?? DEFAULT_TOTAL - (data.count ?? 0),
          total: data.total ?? DEFAULT_TOTAL,
          isLimited: (data.remaining ?? DEFAULT_TOTAL - (data.count ?? 0)) <= 0,
          resetTime: data.resetTime ?? '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch usage:', error);
    } finally {
      setIsLoading(false);
    }
  }, [auth.isAuthenticated]);

  // Decrement usage locally (optimistic update)
  const decrementUsage = useCallback(() => {
    if (auth.isAuthenticated) return;
    
    setUsage(prev => {
      const newRemaining = Math.max(0, prev.remaining - 1);
      return {
        ...prev,
        remaining: newRemaining,
        isLimited: newRemaining <= 0,
      };
    });
  }, [auth.isAuthenticated]);

  // Refresh usage when auth state changes
  useEffect(() => {
    refreshUsage();
  }, [auth.isAuthenticated, refreshUsage]);

  const value: UsageLimitContextValue = {
    usage,
    refreshUsage,
    decrementUsage,
    isLoading,
  };

  return (
    <UsageLimitContext.Provider value={value}>
      {children}
    </UsageLimitContext.Provider>
  );
}

// Hook
export function useUsageLimit(): UsageLimitContextValue {
  const context = useContext(UsageLimitContext);
  if (context === undefined) {
    throw new Error('useUsageLimit must be used within a UsageLimitProvider');
  }
  return context;
}

export default UsageLimitContext;
