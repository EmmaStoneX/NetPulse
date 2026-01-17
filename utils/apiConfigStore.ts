import { APIConfig, DEFAULT_API_CONFIG } from '../types/apiConfig';

const STORAGE_KEY = 'netpulse_api_config';

export const apiConfigStore = {
  // 获取配置
  get(): APIConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_API_CONFIG, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed to load API config:', e);
    }
    return DEFAULT_API_CONFIG;
  },

  // 保存配置
  save(config: APIConfig): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  },

  // 清除配置
  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  },

  // 检查是否有有效的自定义配置
  hasCustomConfig(): boolean {
    const config = this.get();
    return config.enabled && !!config.searchApiKey && !!config.llmApiKey;
  },
};
