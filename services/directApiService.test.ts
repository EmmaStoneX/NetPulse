import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getSearchAdapter,
  getLLMAdapter,
  testSearchConnection,
  testLLMConnection,
  analyzeWithCustomKeys,
} from './directApiService';
import { APIConfig, PROVIDER_INFO } from '../types/apiConfig';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock i18n
vi.mock('../i18n', () => ({
  default: {
    language: 'en',
  },
}));

describe('directApiService', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Search Adapters', () => {
    describe('Tavily Adapter', () => {
      it('should return search results from Tavily API', async () => {
        const mockResponse = {
          results: [
            { title: 'Result 1', url: 'https://example.com/1', content: 'Content 1' },
            { title: 'Result 2', url: 'https://example.com/2', content: 'Content 2' },
          ],
        };
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const adapter = getSearchAdapter('tavily');
        const results = await adapter.search('test query', 'api-key', 5);

        expect(results).toHaveLength(2);
        expect(results[0].title).toBe('Result 1');
        expect(results[0].url).toBe('https://example.com/1');
        expect(mockFetch).toHaveBeenCalledWith('https://api.tavily.com/search', expect.any(Object));
      });

      it('should throw error on Tavily API failure', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ message: 'Invalid API key' }),
        });

        const adapter = getSearchAdapter('tavily');
        await expect(adapter.search('test', 'bad-key', 5)).rejects.toThrow('Invalid API key');
      });
    });

    describe('Exa Adapter', () => {
      it('should return search results from Exa API', async () => {
        const mockResponse = {
          results: [
            { title: 'Exa Result', url: 'https://exa.ai/result', text: 'Exa content' },
          ],
        };
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const adapter = getSearchAdapter('exa');
        const results = await adapter.search('test query', 'exa-key', 5);

        expect(results).toHaveLength(1);
        expect(results[0].title).toBe('Exa Result');
        expect(results[0].content).toBe('Exa content');
        expect(mockFetch).toHaveBeenCalledWith('https://api.exa.ai/search', expect.objectContaining({
          headers: expect.objectContaining({ 'x-api-key': 'exa-key' }),
        }));
      });
    });

    describe('testSearchConnection', () => {
      it('should return true on successful connection', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

        const result = await testSearchConnection('tavily', 'valid-key');
        expect(result).toBe(true);
      });

      it('should return false on failed connection', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false });

        const result = await testSearchConnection('tavily', 'invalid-key');
        expect(result).toBe(false);
      });
    });
  });

  describe('LLM Adapters', () => {
    describe('Gemini Adapter', () => {
      it('should return response from Gemini API', async () => {
        const mockResponse = {
          candidates: [{ content: { parts: [{ text: 'Gemini response' }] } }],
        };
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const adapter = getLLMAdapter('gemini');
        const result = await adapter.chat('Hello', 'gemini-key', 'gemini-2.0-flash');

        expect(result).toBe('Gemini response');
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('generativelanguage.googleapis.com'),
          expect.any(Object)
        );
      });
    });

    describe('OpenAI Compatible Adapter (DeepSeek)', () => {
      it('should return response from DeepSeek API', async () => {
        const mockResponse = {
          choices: [{ message: { content: 'DeepSeek response' } }],
        };
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const adapter = getLLMAdapter('deepseek');
        const result = await adapter.chat('Hello', 'deepseek-key', 'deepseek-chat');

        expect(result).toBe('DeepSeek response');
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('api.deepseek.com'),
          expect.objectContaining({
            headers: expect.objectContaining({ Authorization: 'Bearer deepseek-key' }),
          })
        );
      });
    });

    describe('Claude Adapter', () => {
      it('should return response from Claude API', async () => {
        const mockResponse = {
          content: [{ text: 'Claude response' }],
        };
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const adapter = getLLMAdapter('claude');
        const result = await adapter.chat('Hello', 'claude-key', 'claude-3-5-sonnet-20241022');

        expect(result).toBe('Claude response');
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('api.anthropic.com'),
          expect.objectContaining({
            headers: expect.objectContaining({ 'x-api-key': 'claude-key' }),
          })
        );
      });
    });

    describe('testLLMConnection', () => {
      it('should return true on successful Gemini connection', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

        const result = await testLLMConnection('gemini', 'valid-key', 'gemini-2.0-flash');
        expect(result).toBe(true);
      });

      it('should return false on failed connection', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false });

        const result = await testLLMConnection('openai', 'invalid-key', 'gpt-4');
        expect(result).toBe(false);
      });

      it('should use default model when not specified', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

        await testLLMConnection('deepseek', 'key');
        
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringContaining(PROVIDER_INFO.llm.deepseek.models.fast),
          })
        );
      });
    });
  });

  describe('analyzeWithCustomKeys', () => {
    const mockConfig: APIConfig = {
      enabled: true,
      searchProvider: 'tavily',
      searchApiKey: 'search-key',
      llmProvider: 'gemini',
      llmApiKey: 'llm-key',
      llmEndpoint: '',
      llmModel: '',
    };

    it('should complete full analysis flow', async () => {
      // Mock search response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          results: [
            { title: 'Source 1', url: 'https://source1.com', content: 'Content about the topic' },
          ],
        }),
      });

      // Mock LLM response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{
                text: `[TITLE]
Test Event Title

[SUMMARY]
This is a summary of the event.

[IMPACT]
- Impact 1
- Impact 2

[HISTORY]
Historical context here.`,
              }],
            },
          }],
        }),
      });

      const result = await analyzeWithCustomKeys('test query', 'fast', mockConfig);

      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].uri).toBe('https://source1.com');
      expect(result.parsed.title).toBe('Test Event Title');
      expect(result.parsed.summary).toBe('This is a summary of the event.');
      expect(result.parsed.impacts).toHaveLength(2);
      expect(result.parsed.historicalContext).toBe('Historical context here.');
    });

    it('should use deep mode settings for deep analysis', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{ content: { parts: [{ text: '[TITLE]\nTitle\n[SUMMARY]\nSummary\n[IMPACT]\n- Impact\n[HISTORY]\nHistory' }] } }],
        }),
      });

      await analyzeWithCustomKeys('test', 'deep', mockConfig);

      // Deep mode should request 10 results
      expect(mockFetch).toHaveBeenNthCalledWith(1, expect.any(String), expect.objectContaining({
        body: expect.stringContaining('"max_results":10'),
      }));
    });

    it('should use custom model when specified', async () => {
      const configWithCustomModel: APIConfig = {
        ...mockConfig,
        llmModel: 'custom-model-name',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{ content: { parts: [{ text: '[TITLE]\nT\n[SUMMARY]\nS\n[IMPACT]\n-I\n[HISTORY]\nH' }] } }],
        }),
      });

      await analyzeWithCustomKeys('test', 'fast', configWithCustomModel);

      expect(mockFetch).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('custom-model-name'),
        expect.any(Object)
      );
    });
  });
});
