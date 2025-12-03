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

// Standard CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // In production, change this to your specific domain if needed
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);

    // 1. Handle CORS Preflight (OPTIONS)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    // 2. API Route: POST /api/analyze
    if (url.pathname === "/api/analyze" && request.method === "POST") {
      try {
        // --- Security Check: Environment Variables ---
        const geminiKey = env.VITE_GEMINI_API_KEY;
        const tavilyKey = env.VITE_TAVILY_API_KEY;
        const missingKeys: string[] = [];
        if (!geminiKey) missingKeys.push("VITE_GEMINI_API_KEY");
        if (!tavilyKey) missingKeys.push("VITE_TAVILY_API_KEY");

        if (missingKeys.length > 0) {
          // Configuration errors are safe to return to the admin/dev
          return new Response(JSON.stringify({ 
            error: `Server-side configuration error: Missing API Keys (${missingKeys.join(", ")}).` 
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const reqBody: any = await request.json();
        const query = reqBody.query;

        if (!query) {
          return new Response(JSON.stringify({ error: "Missing query parameter" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
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
          // Log specific error internally
          console.error(`Tavily API Error: ${tavilyResponse.status} ${tavilyResponse.statusText}`);
          throw new Error("Failed to fetch search results.");
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
          // Log the raw error from the proxy internally for debugging
          const errText = await geminiResponse.text();
          console.error(`Gemini Proxy Error (${geminiResponse.status}): ${errText}`);
          
          // Throw a sanitized error to the user
          throw new Error("AI Analysis Service Unavailable. Please try again later.");
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
          // Success Response with CORS
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

      } catch (error: any) {
        // --- Security: Error Sanitization ---
        // 1. Log the full details to Cloudflare Worker Logs (visible to Admin)
        console.error("Worker Error:", error);

        // 2. Return a generic error message to the client to avoid leaking proxy URLs or internal logic
        // Use the error message ONLY if it's a known safe error (like "Missing query"), otherwise generic.
        const safeMessage = error.message === "Failed to fetch search results." 
          ? "Search service unavailable." 
          : "An internal server error occurred during analysis.";

        return new Response(JSON.stringify({ error: safeMessage }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // Default: Serve Static Assets (The React App)
    // Cloudflare Workers with Assets configuration automatically provide env.ASSETS
    return env.ASSETS.fetch(request);
  }
};