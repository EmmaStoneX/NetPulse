import { SearchProvider, LLMProvider, APIConfig, PROVIDER_INFO } from '../types/apiConfig';
import { AnalysisResult, AnalysisMode, SearchSource } from '../types';
import i18n from '../i18n';

// ============================================
// Search Result Interface
// ============================================

export interface SearchResult {
  title: string;
  url: string;
  content: string;
}

// ============================================
// Search Service Adapters
// ============================================

interface SearchAdapter {
  search(query: string, apiKey: string, maxResults: number): Promise<SearchResult[]>;
  testConnection(apiKey: string): Promise<boolean>;
}

// Tavily Search Adapter
const tavilyAdapter: SearchAdapter = {
  async search(query: string, apiKey: string, maxResults: number): Promise<SearchResult[]> {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        max_results: maxResults,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Tavily API error: ${response.status}`);
    }

    const data = await response.json();
    return (data.results || []).map((r: any) => ({
      title: r.title || '',
      url: r.url || '',
      content: r.content || '',
    }));
  },

  async testConnection(apiKey: string): Promise<boolean> {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: 'test',
        search_depth: 'basic',
        max_results: 1,
      }),
    });
    return response.ok;
  },
};


// Exa Search Adapter - 使用后端代理解决 CORS 问题
const exaAdapter: SearchAdapter = {
  async search(query: string, apiKey: string, maxResults: number): Promise<SearchResult[]> {
    const response = await fetch('/api/proxy/exa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey,
        endpoint: 'search',
        payload: {
          query,
          numResults: maxResults,
          contents: { text: true },
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Exa API error: ${response.status}`);
    }

    const data = await response.json();
    return (data.results || []).map((r: any) => ({
      title: r.title || '',
      url: r.url || '',
      content: r.text || '',
    }));
  },

  async testConnection(apiKey: string): Promise<boolean> {
    const response = await fetch('/api/proxy/exa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey,
        endpoint: 'search',
        payload: {
          query: 'test',
          numResults: 1,
          contents: { text: true },
        },
      }),
    });
    return response.ok;
  },
};

// Search Adapter Registry
const searchAdapters: Record<SearchProvider, SearchAdapter> = {
  tavily: tavilyAdapter,
  exa: exaAdapter,
};

// Get search adapter by provider
export const getSearchAdapter = (provider: SearchProvider): SearchAdapter => {
  return searchAdapters[provider];
};

// Test search connection
export const testSearchConnection = async (provider: SearchProvider, apiKey: string): Promise<boolean> => {
  const adapter = getSearchAdapter(provider);
  return adapter.testConnection(apiKey);
};


// ============================================
// LLM Service Adapters
// ============================================

interface LLMAdapter {
  chat(prompt: string, apiKey: string, model: string, endpoint?: string): Promise<string>;
  testConnection(apiKey: string, model: string, endpoint?: string): Promise<boolean>;
}

// OpenAI Compatible Adapter (for OpenAI, DeepSeek, and custom endpoints)
const createOpenAICompatibleAdapter = (defaultEndpoint: string): LLMAdapter => ({
  async chat(prompt: string, apiKey: string, model: string, endpoint?: string): Promise<string> {
    const baseUrl = endpoint || defaultEndpoint;
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `LLM API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  },

  async testConnection(apiKey: string, model: string, endpoint?: string): Promise<boolean> {
    const baseUrl = endpoint || defaultEndpoint;
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      }),
    });
    return response.ok;
  },
});

// Gemini Adapter (using Google's native API format)
const geminiAdapter: LLMAdapter = {
  async chat(prompt: string, apiKey: string, model: string, endpoint?: string): Promise<string> {
    const baseUrl = endpoint || PROVIDER_INFO.llm.gemini.endpoint;
    const url = `${baseUrl}/models/${model}:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  },

  async testConnection(apiKey: string, model: string, endpoint?: string): Promise<boolean> {
    const baseUrl = endpoint || PROVIDER_INFO.llm.gemini.endpoint;
    const url = `${baseUrl}/models/${model}:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Hi' }] }],
        generationConfig: { maxOutputTokens: 5 },
      }),
    });
    return response.ok;
  },
};


// Claude Adapter (using Anthropic's native API format)
const claudeAdapter: LLMAdapter = {
  async chat(prompt: string, apiKey: string, model: string, endpoint?: string): Promise<string> {
    const baseUrl = endpoint || PROVIDER_INFO.llm.claude.endpoint;
    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Claude API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || '';
  },

  async testConnection(apiKey: string, model: string, endpoint?: string): Promise<boolean> {
    const baseUrl = endpoint || PROVIDER_INFO.llm.claude.endpoint;
    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 5,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    });
    return response.ok;
  },
};

// LLM Adapter Registry
const llmAdapters: Record<LLMProvider, LLMAdapter> = {
  gemini: geminiAdapter,
  deepseek: createOpenAICompatibleAdapter(PROVIDER_INFO.llm.deepseek.endpoint),
  openai: createOpenAICompatibleAdapter(PROVIDER_INFO.llm.openai.endpoint),
  claude: claudeAdapter,
  custom: createOpenAICompatibleAdapter(''), // Will use endpoint from config
};

// Get LLM adapter by provider
export const getLLMAdapter = (provider: LLMProvider): LLMAdapter => {
  return llmAdapters[provider];
};

// Test LLM connection
export const testLLMConnection = async (
  provider: LLMProvider,
  apiKey: string,
  model?: string,
  endpoint?: string
): Promise<boolean> => {
  const adapter = getLLMAdapter(provider);
  const defaultModel = PROVIDER_INFO.llm[provider].models.fast;
  return adapter.testConnection(apiKey, model || defaultModel, endpoint);
};


// ============================================
// Unified Analysis Service
// ============================================

/**
 * Get current language code
 */
const getCurrentLang = (): 'zh' | 'en' => {
  const lang = i18n.language;
  return lang?.startsWith('zh') ? 'zh' : 'en';
};

/**
 * Parse the structured text response into a usable object
 */
const parseResponse = (text: string): { title: string; summary: string; impacts: string[]; historicalContext: string } => {
  const sections = {
    title: '',
    summary: '',
    impacts: [] as string[],
    historicalContext: '',
  };

  const titleMatch = text.match(/\[TITLE\]\s*(.*?)\s*(?=\[SUMMARY\]|$)/s);
  const summaryMatch = text.match(/\[SUMMARY\]\s*(.*?)\s*(?=\[IMPACT\]|$)/s);
  const impactMatch = text.match(/\[IMPACT\]\s*(.*?)\s*(?=\[HISTORY\]|$)/s);
  const historyMatch = text.match(/\[HISTORY\]\s*(.*?)\s*(?=$)/s);

  if (titleMatch) sections.title = titleMatch[1].trim();
  if (summaryMatch) sections.summary = summaryMatch[1].trim();
  
  if (impactMatch) {
    const rawImpacts = impactMatch[1].split('\n').map(line => line.trim()).filter(line => line.length > 0);
    sections.impacts = rawImpacts.map(line => line.replace(/^[-*•]\s*/, ''));
  }

  if (historyMatch) sections.historicalContext = historyMatch[1].trim();

  return sections;
};

/**
 * Build the analysis prompt
 */
const buildPrompt = (query: string, searchResults: SearchResult[], lang: 'zh' | 'en'): string => {
  const context = searchResults
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.content}`)
    .join('\n\n');

  const langInstruction = lang === 'zh' 
    ? '请用中文回答。' 
    : 'Please respond in English.';

  return `${langInstruction}

Based on the following search results about "${query}", provide a comprehensive analysis.

Search Results:
${context}

Please structure your response EXACTLY as follows:
[TITLE]
A concise, descriptive title for this event/topic

[SUMMARY]
A comprehensive summary of the event/topic (2-3 paragraphs)

[IMPACT]
- Impact point 1
- Impact point 2
- Impact point 3
(List 3-5 key impacts or implications)

[HISTORY]
Historical context and background information relevant to this event/topic`;
};

/**
 * Analyze event using custom API keys
 */
export const analyzeWithCustomKeys = async (
  query: string,
  mode: AnalysisMode,
  config: APIConfig
): Promise<AnalysisResult> => {
  const lang = getCurrentLang();
  const maxResults = mode === 'deep' ? 10 : 5;

  // Step 1: Search using the configured search provider
  const searchAdapter = getSearchAdapter(config.searchProvider);
  const searchResults = await searchAdapter.search(query, config.searchApiKey, maxResults);

  // Convert search results to sources format
  const sources: SearchSource[] = searchResults.map(r => ({
    uri: r.url,
    title: r.title,
  }));

  // Step 2: Build prompt with search results
  const prompt = buildPrompt(query, searchResults, lang);

  // Step 3: Get LLM response using the configured LLM provider
  const llmAdapter = getLLMAdapter(config.llmProvider);
  const modelKey = mode === 'deep' ? 'deep' : 'fast';
  const model = (mode === 'deep' ? config.llmModelDeep : config.llmModelFast) || 
    (config.llmProvider !== 'custom' ? PROVIDER_INFO.llm[config.llmProvider].models[modelKey] : 'gpt-3.5-turbo');
  const endpoint = config.llmEndpoint || undefined;

  const rawText = await llmAdapter.chat(prompt, config.llmApiKey, model, endpoint);

  // Step 4: Parse the response
  const parsed = parseResponse(rawText);

  return {
    rawText,
    parsed,
    sources,
  };
};
