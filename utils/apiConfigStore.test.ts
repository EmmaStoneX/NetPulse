import { describe, it, expect, beforeEach } from 'vitest';
import { apiConfigStore } from './apiConfigStore';
import { DEFAULT_API_CONFIG, APIConfig } from '../types/apiConfig';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('apiConfigStore', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('get', () => {
    it('should return default config when no config is stored', () => {
      const config = apiConfigStore.get();
      expect(config).toEqual(DEFAULT_API_CONFIG);
    });

    it('should return stored config merged with defaults', () => {
      const customConfig: Partial<APIConfig> = {
        enabled: true,
        searchApiKey: 'test-search-key',
        llmApiKey: 'test-llm-key',
      };
      localStorageMock.setItem('netpulse_api_config', JSON.stringify(customConfig));

      const config = apiConfigStore.get();
      expect(config.enabled).toBe(true);
      expect(config.searchApiKey).toBe('test-search-key');
      expect(config.llmApiKey).toBe('test-llm-key');
      // Should have default values for unset fields
      expect(config.searchProvider).toBe(DEFAULT_API_CONFIG.searchProvider);
      expect(config.llmProvider).toBe(DEFAULT_API_CONFIG.llmProvider);
    });

    it('should return default config when stored data is invalid JSON', () => {
      localStorageMock.setItem('netpulse_api_config', 'invalid-json');
      const config = apiConfigStore.get();
      expect(config).toEqual(DEFAULT_API_CONFIG);
    });
  });

  describe('save', () => {
    it('should save config to localStorage', () => {
      const config: APIConfig = {
        ...DEFAULT_API_CONFIG,
        enabled: true,
        searchApiKey: 'my-search-key',
        llmApiKey: 'my-llm-key',
      };

      apiConfigStore.save(config);

      const stored = localStorageMock.getItem('netpulse_api_config');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.enabled).toBe(true);
      expect(parsed.searchApiKey).toBe('my-search-key');
      expect(parsed.llmApiKey).toBe('my-llm-key');
    });
  });

  describe('clear', () => {
    it('should remove config from localStorage', () => {
      localStorageMock.setItem('netpulse_api_config', JSON.stringify({ enabled: true }));
      
      apiConfigStore.clear();

      expect(localStorageMock.getItem('netpulse_api_config')).toBeNull();
    });
  });

  describe('hasCustomConfig', () => {
    it('should return false when config is not enabled', () => {
      const config: APIConfig = {
        ...DEFAULT_API_CONFIG,
        enabled: false,
        searchApiKey: 'key1',
        llmApiKey: 'key2',
      };
      apiConfigStore.save(config);

      expect(apiConfigStore.hasCustomConfig()).toBe(false);
    });

    it('should return false when search API key is missing', () => {
      const config: APIConfig = {
        ...DEFAULT_API_CONFIG,
        enabled: true,
        searchApiKey: '',
        llmApiKey: 'key2',
      };
      apiConfigStore.save(config);

      expect(apiConfigStore.hasCustomConfig()).toBe(false);
    });

    it('should return false when LLM API key is missing', () => {
      const config: APIConfig = {
        ...DEFAULT_API_CONFIG,
        enabled: true,
        searchApiKey: 'key1',
        llmApiKey: '',
      };
      apiConfigStore.save(config);

      expect(apiConfigStore.hasCustomConfig()).toBe(false);
    });

    it('should return true when enabled and both API keys are set', () => {
      const config: APIConfig = {
        ...DEFAULT_API_CONFIG,
        enabled: true,
        searchApiKey: 'key1',
        llmApiKey: 'key2',
      };
      apiConfigStore.save(config);

      expect(apiConfigStore.hasCustomConfig()).toBe(true);
    });
  });

  describe('Integration: save and get', () => {
    it('should correctly save and retrieve full config', () => {
      const config: APIConfig = {
        enabled: true,
        searchProvider: 'exa',
        searchApiKey: 'exa-api-key',
        llmProvider: 'openai',
        llmApiKey: 'openai-api-key',
        llmEndpoint: 'https://custom.endpoint.com/v1',
        llmModel: 'gpt-4-turbo',
      };

      apiConfigStore.save(config);
      const retrieved = apiConfigStore.get();

      expect(retrieved).toEqual(config);
    });
  });
});
