import { GoogleGenAI } from "@google/genai";
import { AnalysisResult, SearchSource } from "../types";

/**
 * HELPER: Syncs environment variables from Vite env and localStorage to process.env.
 * This ensures that keys injected via console (localStorage) AFTER page load are picked up immediately.
 */
const syncEnv = () => {
  // 1. Explicitly access Vite env vars so build tool replaces them
  const viteGemini = import.meta.env.VITE_GEMINI_API_KEY;
  const viteTavily = import.meta.env.VITE_TAVILY_API_KEY;

  // 2. Access LocalStorage (Developer Override)
  const lsGemini = typeof window !== 'undefined' ? localStorage.getItem('VITE_GEMINI_API_KEY') : null;
  const lsTavily = typeof window !== 'undefined' ? localStorage.getItem('VITE_TAVILY_API_KEY') : null;

  // 3. Update process.env (Polyfill)
  // Ensure global process object exists via window to bypass Vite replacement
  if (!(window as any).process) {
    (window as any).process = { env: {} };
  } else if (!(window as any).process.env) {
    (window as any).process.env = {};
  }

  // Priority: LocalStorage > Vite Env
  // Using (window as any).process ensures we are writing to the runtime object, not a build-time replacement stub
  (window as any).process.env.API_KEY = lsGemini || viteGemini || '';
  (window as any).process.env.VITE_TAVILY_API_KEY = lsTavily || viteTavily || '';
};

/**
 * Perform a search using Tavily API
 */
const searchTavily = async (query: string): Promise<{ results: any[] }> => {
  // Sync keys immediately before use
  syncEnv();

  // Access via window to bypass Vite replacement
  const apiKey = (window as any).process.env.VITE_TAVILY_API_KEY;

  if (!apiKey) {
    throw new Error("未配置 Tavily API Key。请在 Cloudflare 环境变量中配置 VITE_TAVILY_API_KEY，或在控制台使用 localStorage.setItem('VITE_TAVILY_API_KEY', 'key') 注入。");
  }

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: apiKey,
      query: query,
      search_depth: "basic",
      include_answer: false,
      max_results: 6, 
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily Search failed: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Parses the structured text response from Gemini into a usable object.
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

export const analyzeEvent = async (query: string): Promise<AnalysisResult> => {
  const modelId = "gemini-2.5-flash"; 
  
  // Sync keys immediately before use
  syncEnv();

  // Pre-check for API Key to give a better error message
  // Access via window to bypass Vite replacement
  const apiKey = (window as any).process.env.API_KEY;

  if (!apiKey) {
    throw new Error("未配置 Gemini API Key。请在 Cloudflare 环境变量中配置 VITE_GEMINI_API_KEY，或在控制台使用 localStorage.setItem('VITE_GEMINI_API_KEY', 'key') 注入。");
  }

  // Initialize client with the retrieved key
  const ai = new GoogleGenAI({ apiKey: apiKey });

  try {
    // Step 1: Search Tavily for context
    const searchResponse = await searchTavily(query);
    const searchResults = searchResponse.results || [];

    // Format search results for the prompt
    const contextString = searchResults.map((r: any, index: number) => 
      `Source ${index + 1}:\nTitle: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`
    ).join("\n\n");

    // Step 2: Construct the Prompt with Context
    const prompt = `
    你是一位资深的科技记者和历史学家。
    
    任务：基于提供的【参考资料】，研究并分析用户的查询："${query}"。
    如果查询比较宽泛，请聚焦于资料中最重大的事件。
    
    【参考资料】：
    ${contextString}
    
    【输出要求】：
    你必须严格遵循以下文本格式，使用确切的英文标签（如 [TITLE]）。不要在标签前加 Markdown 标题符号 (#)。
    **所有生成的内容必须使用简体中文。**
    
    [TITLE] 
    (简短有力的事件标题)
    
    [SUMMARY] 
    (简洁、引人入胜的事件摘要。最多3句话。)
    
    [IMPACT] 
    (列出3-4个主要后果或影响。使用无序列表。)
    
    [HISTORY] 
    (将此事件与类似的历史事件进行比较。解释相似之处和不同之处。例如，“这让人想起了2016年的Dyn攻击，因为……”)
    `;

    // Step 3: Call Gemini (without internal tools, just text generation)
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });

    const text = response.text || "未生成分析结果。";
    
    // Map Tavily results to our SearchSource type for the UI
    const sources: SearchSource[] = searchResults.map((r: any) => ({
      uri: r.url,
      title: r.title
    }));

    return {
      rawText: text,
      parsed: parseResponse(text),
      sources: sources,
    };

  } catch (error) {
    console.error("Error analyzing event:", error);
    throw error;
  }
};