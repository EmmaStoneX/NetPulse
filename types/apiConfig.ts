// 搜索服务提供商
export type SearchProvider = 'tavily' | 'exa';

// 大模型服务提供商
export type LLMProvider = 'gemini' | 'deepseek' | 'openai' | 'claude';

// API 配置接口
export interface APIConfig {
  // 搜索配置
  searchProvider: SearchProvider;
  searchApiKey: string;

  // LLM 配置
  llmProvider: LLMProvider;
  llmApiKey: string;
  llmEndpoint: string; // 自定义端点，支持中转站
  llmModel: string; // 自定义模型名称

  // 是否启用自定义配置
  enabled: boolean;
}

// 默认配置
export const DEFAULT_API_CONFIG: APIConfig = {
  searchProvider: 'tavily',
  searchApiKey: '',
  llmProvider: 'gemini',
  llmApiKey: '',
  llmEndpoint: '', // 空表示使用官方端点
  llmModel: '', // 空表示使用默认模型
  enabled: false,
};

// 搜索提供商信息
export interface SearchProviderInfo {
  name: string;
  endpoint: string;
  docsUrl: string;
}

// LLM 提供商信息
export interface LLMProviderInfo {
  name: string;
  endpoint: string;
  models: { fast: string; deep: string };
  docsUrl: string;
}

// 各提供商的 API 端点和模型信息
export const PROVIDER_INFO = {
  search: {
    tavily: {
      name: 'Tavily',
      endpoint: 'https://api.tavily.com/search',
      docsUrl: 'https://tavily.com',
    },
    exa: {
      name: 'Exa',
      endpoint: 'https://api.exa.ai/search',
      docsUrl: 'https://exa.ai',
    },
  } as Record<SearchProvider, SearchProviderInfo>,
  llm: {
    gemini: {
      name: 'Google Gemini',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta',
      models: { fast: 'gemini-1.5-flash', deep: 'gemini-1.5-pro' },
      docsUrl: 'https://ai.google.dev',
    },
    deepseek: {
      name: 'DeepSeek',
      endpoint: 'https://api.deepseek.com/v1',
      models: { fast: 'deepseek-chat', deep: 'deepseek-chat' },
      docsUrl: 'https://platform.deepseek.com',
    },
    openai: {
      name: 'OpenAI',
      endpoint: 'https://api.openai.com/v1',
      models: { fast: 'gpt-4o-mini', deep: 'gpt-4o' },
      docsUrl: 'https://platform.openai.com',
    },
    claude: {
      name: 'Anthropic Claude',
      endpoint: 'https://api.anthropic.com/v1',
      models: { fast: 'claude-3-haiku-20240307', deep: 'claude-3-5-sonnet-20241022' },
      docsUrl: 'https://console.anthropic.com',
    },
  } as Record<LLMProvider, LLMProviderInfo>,
};
