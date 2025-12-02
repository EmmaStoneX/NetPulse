import { GoogleGenAI } from "@google/genai";
import { AnalysisResult, SearchSource } from "../types";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Parses the structured text response from Gemini into a usable object.
 * We use specific delimiters in the prompt to make this parsing robust
 * without relying on JSON mode (which is incompatible with Search Grounding).
 */
const parseResponse = (text: string): { title: string; summary: string; impacts: string[]; historicalContext: string } => {
  const sections = {
    title: '',
    summary: '',
    impacts: [] as string[],
    historicalContext: '',
  };

  // Simple regex-like parsing based on the requested format
  const titleMatch = text.match(/\[TITLE\]\s*(.*?)\s*(?=\[SUMMARY\]|$)/s);
  const summaryMatch = text.match(/\[SUMMARY\]\s*(.*?)\s*(?=\[IMPACT\]|$)/s);
  const impactMatch = text.match(/\[IMPACT\]\s*(.*?)\s*(?=\[HISTORY\]|$)/s);
  const historyMatch = text.match(/\[HISTORY\]\s*(.*?)\s*(?=$)/s);

  if (titleMatch) sections.title = titleMatch[1].trim();
  if (summaryMatch) sections.summary = summaryMatch[1].trim();
  
  if (impactMatch) {
    // Split by newlines and remove bullet points
    const rawImpacts = impactMatch[1].split('\n').map(line => line.trim()).filter(line => line.length > 0);
    sections.impacts = rawImpacts.map(line => line.replace(/^[-*•]\s*/, ''));
  }

  if (historyMatch) sections.historicalContext = historyMatch[1].trim();

  return sections;
};

export const analyzeEvent = async (query: string): Promise<AnalysisResult> => {
  const modelId = "gemini-2.5-flash"; // Good balance of speed and reasoning for this task

  // We need to enforce a structure in the prompt because we can't use responseMimeType: 'application/json' 
  // simultaneously with tools: [{ googleSearch: {} }]
  const prompt = `
    你是一位资深的科技记者和历史学家。
    
    任务：研究并分析以下事件查询："${query}"。
    如果查询比较宽泛（例如“最近发生了什么”、“互联网新闻”），请确定过去48小时内最重大的单一互联网/科技事件。
    
    请使用 Google Search 查找最新详情。
    
    输出格式：
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

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "未生成分析结果。";
    
    // Extract grounding chunks (sources)
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: SearchSource[] = chunks
      .map((chunk: any) => chunk.web ? { uri: chunk.web.uri, title: chunk.web.title } : null)
      .filter((item: any) => item !== null) as SearchSource[];

    // Deduplicate sources based on URI
    const uniqueSources = Array.from(new Map(sources.map(s => [s.uri, s])).values());

    return {
      rawText: text,
      parsed: parseResponse(text),
      sources: uniqueSources,
    };

  } catch (error) {
    console.error("Error analyzing event:", error);
    throw error;
  }
};