import { useState, useEffect, useCallback } from 'react';

export interface TrendingTopic {
  id: number;
  title: string;
  url?: string;
  score: number;
  source: 'hackernews' | 'reddit' | 'github';
}

export interface TrendingCategory {
  id: string;
  name: string;
  nameEn: string;
  topics: TrendingTopic[];
}

interface TrendingResponse {
  success: boolean;
  data?: {
    categories: TrendingCategory[];
    updatedAt: string;
    cachedUntil: string;
  };
  fromCache?: boolean;
  stale?: boolean;
  error?: string;
}

// 本地缓存 key
const LOCAL_CACHE_KEY = 'netpulse_hn_trending';
const LOCAL_CACHE_TTL = 60 * 60 * 1000; // 1小时

function getLocalCache(): TrendingCategory[] | null {
  try {
    const cached = localStorage.getItem(LOCAL_CACHE_KEY);
    if (!cached) return null;
    
    const { categories, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < LOCAL_CACHE_TTL && categories?.length > 0) {
      return categories;
    }
    return null;
  } catch {
    return null;
  }
}

function setLocalCache(categories: TrendingCategory[]) {
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify({
      categories,
      timestamp: Date.now()
    }));
  } catch {
    // ignore
  }
}

export function useTrending() {
  const [categories, setCategories] = useState<TrendingCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrending = useCallback(async (signal?: AbortSignal) => {
    // 先尝试本地缓存
    const localCached = getLocalCache();
    if (localCached) {
      setCategories(localCached);
      setIsLoading(false);
    }

    try {
      const response = await fetch('/api/trending/hn', { signal });
      
      if (signal?.aborted) return;
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data: TrendingResponse = await response.json();
      
      if (data.success && data.data?.categories) {
        setCategories(data.data.categories);
        setLocalCache(data.data.categories);
        setError(null);
      } else {
        throw new Error(data.error || 'Invalid response');
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      
      console.error('[useTrending] Error:', err);
      setError((err as Error).message);
      
      // 如果没有本地缓存，保持空数组
      if (!localCached) {
        setCategories([]);
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchTrending(controller.signal);
    
    return () => controller.abort();
  }, [fetchTrending]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setError(null);
    fetchTrending();
  }, [fetchTrending]);

  return { categories, isLoading, error, refresh };
}
