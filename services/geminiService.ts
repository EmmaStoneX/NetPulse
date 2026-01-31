import { AnalysisResult, AnalysisMode } from "../types";
import i18n from "../i18n";
import { apiConfigStore } from "../utils/apiConfigStore";
import { analyzeWithCustomKeys } from "./directApiService";

/**
 * Parses the structured text response into a usable object.
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
 * 获取当前语言代码
 */
const getCurrentLang = (): 'zh' | 'en' => {
  const lang = i18n.language;
  return lang?.startsWith('zh') ? 'zh' : 'en';
};

export const analyzeEvent = async (query: string, mode: AnalysisMode, authToken?: string | null): Promise<AnalysisResult> => {
  try {
    // Check if user has custom API configuration enabled
    if (apiConfigStore.hasCustomConfig()) {
      const config = apiConfigStore.get();
      return await analyzeWithCustomKeys(query, mode, config);
    }

    // Use default backend proxy mode
    const lang = getCurrentLang();
    
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
    
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers,
      body: JSON.stringify({ query, mode, lang }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    const data = await response.json();
    const parsedData = parseResponse(data.rawText);

    return {
      rawText: data.rawText,
      parsed: parsedData,
      sources: data.sources || [],
    };

  } catch (error: any) {
    console.error("Error analyzing event:", error);
    throw error;
  }
};

export const getTrendingTopics = async (lang?: string): Promise<string[]> => {
  try {
    const currentLang = lang || getCurrentLang();
    const response = await fetch(`/api/trending?lang=${currentLang}`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.topics || [];
  } catch (error) {
    console.warn("Failed to fetch trending topics:", error);
    return [];
  }
};
