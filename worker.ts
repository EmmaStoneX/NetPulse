
interface Env {
  VITE_GEMINI_API_KEY: string;
  VITE_TAVILY_API_KEY: string;
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);

    // API Route: POST /api/analyze
    if (url.pathname === "/api/analyze" && request.method === "POST") {
      try {
        const geminiKey = env.VITE_GEMINI_API_KEY;
        const tavilyKey = env.VITE_TAVILY_API_KEY;

        // Robust check for missing keys with detailed error message
        const missingKeys: string[] = [];
        if (!geminiKey) missingKeys.push("VITE_GEMINI_API_KEY");
        if (!tavilyKey) missingKeys.push("VITE_TAVILY_API_KEY");

        if (missingKeys.length > 0) {
          return new Response(JSON.stringify({ 
            error: `Server-side configuration error: Missing API Keys (${missingKeys.join(", ")}). Please check Cloudflare Worker Settings -> Variables.` 
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }

        const reqBody: any = await request.json();
        const query = reqBody.query;

        if (!query) {
          return new Response(JSON.stringify({ error: "Missing query parameter" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        // --- Step 1: Search Tavily ---
        const tavilyResponse = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: tavilyKey,
            query: query,
            search_depth: "basic",
            include_answer: false,
            max_results: 6,
          }),
        });

        if (!tavilyResponse.ok) {
          throw new Error(`Tavily Search failed: ${tavilyResponse.statusText}`);
        }

        const tavilyData: any = await tavilyResponse.json();
        const searchResults = tavilyData.results || [];

        // --- Step 2: Construct Prompt ---
        const contextString = searchResults.map((r: TavilySearchResult, index: number) => 
          `Source ${index + 1}:\nTitle: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`
        ).join("\n\n");

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

        // --- Step 3: Call Gemini Proxy (OpenAI Format) ---
        // Securely call the external API from the server side.
        const proxyBaseUrl = "https://0rzz.ggff.net";
        const geminiUrl = `${proxyBaseUrl}/v1/chat/completions`;

        const geminiResponse = await fetch(geminiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${geminiKey}` // Secure server-side key injection
          },
          body: JSON.stringify({
            model: "gemini-3-pro-preview",
            messages: [{ role: "user", content: prompt }],
            stream: false
          })
        });

        if (!geminiResponse.ok) {
          const errText = await geminiResponse.text();
          throw new Error(`Gemini API Error: ${geminiResponse.status} - ${errText}`);
        }

        const geminiData: any = await geminiResponse.json();
        const text = geminiData.choices?.[0]?.message?.content || "未生成分析结果。";

        // --- Step 4: Return Combined Result ---
        const sources = searchResults.map((r: TavilySearchResult) => ({
          uri: r.url,
          title: r.title
        }));

        return new Response(JSON.stringify({
          rawText: text,
          sources: sources
        }), {
          headers: { "Content-Type": "application/json" }
        });

      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // Default: Serve Static Assets (The React App)
    // Cloudflare Workers with Assets configuration automatically provide env.ASSETS
    return env.ASSETS.fetch(request);
  }
};
