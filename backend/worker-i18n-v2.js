/**
 * NetPulse Cloudflare Worker - 多语言版本 v2
 * 修复：
 * 1. trending 话题按语言分别缓存
 * 2. 增强 Tavily API 错误处理（处理 525 SSL 错误）
 */

// 缓存结构 - 按语言分别缓存
let trendingCacheZh = null;
let trendingCacheEn = null;
const CACHE_TTL = 3600 * 1000; // 1 hour

// Tavily API Key 轮询索引
let tavilyKeyIndex = 0;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

// ============================================
// 多语言 Prompt 模板
// ============================================
const PROMPTS = {
  zh: {
    role: "你是一位资深的科技记者和历史学家。",
    task: (query) => `任务：基于提供的【参考资料】，研究并分析用户的查询："${query}"。`,
    format: `【输出要求】：
严格遵循以下格式。不要使用 Markdown 标题符号 (#)。所有内容使用简体中文。

[TITLE] 
(简短标题)

[SUMMARY] 
(摘要，最多3句话)

[IMPACT] 
(3-4个主要影响，列表形式)

[HISTORY] 
(与历史事件对比)`,
    noResult: "未生成分析结果。",
    trendingPrompt: (context) => `基于以下新闻标题：
${context}

提炼4个热门话题标题。要求：
- 每个标题8-12个汉字
- 简洁明了，让人一看就懂主题
- 使用简体中文
- 仅输出4个标题，每行一个，不要编号或标点`
  },
  en: {
    role: "You are a veteran tech journalist and historian.",
    task: (query) => `Task: Based on the provided [Reference Material], research and analyze the user's query: "${query}".`,
    format: `[Output Requirements]:
Strictly follow the format below. Do not use Markdown headings (#). All content must be in English.

[TITLE] 
(A concise title)

[SUMMARY] 
(A summary of max 3 sentences)

[IMPACT] 
(3-4 key impacts in a list format)

[HISTORY] 
(Comparison with historical events)`,
    noResult: "No analysis result generated.",
    trendingPrompt: (context) => `Based on these news titles:
${context}

Extract 4 trending topic titles. Requirements:
- 4-6 words each
- Clear and meaningful, easy to understand
- English only
- Output ONLY 4 titles, one per line, no numbering or punctuation`
  }
};

// 默认热门话题（按语言）
const DEFAULT_TOPICS = {
  zh: ["最新科技趋势", "AI模型更新", "网络安全", "全球互联网"],
  en: ["Latest Tech Trends", "AI Model Updates", "Cybersecurity", "Global Internet"]
};

// ============================================
// Tavily API Key 轮询管理
// ============================================
function getTavilyKeys(env) {
  const keys = [];
  
  // 支持 TAVILY_API_KEY_1, TAVILY_API_KEY_2, ... 格式
  for (let i = 1; i <= 10; i++) {
    const key = env[`TAVILY_API_KEY_${i}`];
    if (key) {
      keys.push(key);
    }
  }
  
  // 如果没有配置多个 key，回退到单个 key
  if (keys.length === 0) {
    const singleKey = env.VITE_TAVILY_API_KEY || env.TAVILY_API_KEY;
    if (singleKey) {
      keys.push(singleKey);
    }
  }
  
  return keys;
}

function getNextTavilyKey(env) {
  const keys = getTavilyKeys(env);
  if (keys.length === 0) {
    return null;
  }
  
  // Round-Robin 轮询
  const key = keys[tavilyKeyIndex % keys.length];
  tavilyKeyIndex = (tavilyKeyIndex + 1) % keys.length;
  
  console.log(`[Tavily] Using key index: ${(tavilyKeyIndex === 0 ? keys.length : tavilyKeyIndex) - 1} of ${keys.length}`);
  return key;
}

// ============================================
// 安全的 fetch 包装函数（处理 SSL 错误）
// ============================================
async function safeFetch(url, options, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, options);
      
      // 检查响应是否为有效的 JSON（防止 525 等错误返回的文本）
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await response.text();
        // 如果响应包含错误代码，抛出异常
        if (text.includes("error code:") || response.status >= 500) {
          throw new Error(`HTTP ${response.status}: ${text.substring(0, 100)}`);
        }
      }
      
      return response;
    } catch (error) {
      console.error(`[safeFetch] Attempt ${i + 1} failed:`, error.message);
      if (i === retries) {
        throw error;
      }
      // 等待一小段时间后重试
      await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
    }
  }
}

// ============================================
// 主入口
// ============================================
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 1. 处理 CORS 预检请求
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    
    // 2. API 路由: POST /api/analyze
    if (url.pathname === "/api/analyze" && request.method === "POST") {
      return handleAnalyze(request, env);
    }
    
    // 3. API 路由: GET /api/trending
    if (url.pathname === "/api/trending" && request.method === "GET") {
      return handleTrending(request, env);
    }
    
    // 4. API 路由: POST /api/share - 存储分享数据
    if (url.pathname === "/api/share" && request.method === "POST") {
      return handleShareCreate(request, env);
    }
    
    // 5. API 路由: GET /api/share/:id - 获取分享数据
    if (url.pathname.startsWith("/api/share/") && request.method === "GET") {
      const shareId = url.pathname.replace("/api/share/", "");
      return handleShareGet(shareId, env);
    }
    
    // 6. 静态资源（默认）
    try {
      const response = await env.ASSETS.fetch(request);
      if (response.status === 404 && url.pathname.endsWith("favicon.ico")) {
        return new Response(null, { status: 404 });
      }
      return response;
    } catch (e) {
      return new Response("Not Found", { status: 404 });
    }
  }
};

// ============================================
// 分析接口处理函数
// ============================================
async function handleAnalyze(request, env) {
  try {
    const geminiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY;
    const tavilyKey = getNextTavilyKey(env);
    
    if (!geminiKey || !tavilyKey) {
      const missing = [];
      if (!geminiKey) missing.push("GEMINI_API_KEY");
      if (!tavilyKey) missing.push("TAVILY_API_KEY");
      return new Response(JSON.stringify({
        error: `Server-side configuration error: Missing keys (${missing.join(", ")})`
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    
    // 解析请求体，获取 query, mode, lang
    const reqBody = await request.json();
    const query = reqBody.query;
    const mode = reqBody.mode || "deep";
    const lang = reqBody.lang === 'en' ? 'en' : 'zh';
    
    if (!query) {
      return new Response(JSON.stringify({ error: "Missing query parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // 模型选择
    const modelId = mode === "fast" ? "gemini-2.5-flash" : "gemini-3-pro-preview";
    
    // --- Step 1: 调用 Tavily 搜索 API ---
    let searchResults = [];
    try {
      const tavilyResponse = await safeFetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: tavilyKey,
          query,
          search_depth: "basic",
          include_answer: false,
          max_results: mode === "fast" ? 4 : 6
        })
      });
      
      if (tavilyResponse.ok) {
        const tavilyData = await tavilyResponse.json();
        searchResults = tavilyData.results || [];
      } else {
        console.error("[Analyze] Tavily request failed with status:", tavilyResponse.status);
      }
    } catch (tavilyError) {
      console.error("[Analyze] Tavily API error:", tavilyError.message);
      // 继续执行，使用空的搜索结果
    }
    
    // 构建上下文字符串
    const contextString = searchResults.length > 0 
      ? searchResults.map(
          (r, index) => `Source ${index + 1}:
Title: ${r.title}
URL: ${r.url}
Content: ${r.content}`
        ).join("\n\n")
      : "No search results available. Please provide analysis based on your knowledge.";
    
    // --- Step 2: 根据语言选择 Prompt 模板 ---
    const promptTemplate = PROMPTS[lang];
    const prompt = `
${promptTemplate.role}
${promptTemplate.task(query)}

【参考资料】(Reference Material):
${contextString}

${promptTemplate.format}
`;
    
    // --- Step 3: 调用 Gemini API ---
    const proxyBaseUrl = "https://api.zxvmax.com";
    const geminiUrl = `${proxyBaseUrl}/v1/chat/completions`;
    
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${geminiKey}`
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: "user", content: prompt }],
        stream: false
      })
    });
    
    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error(`Gemini Proxy Error (${modelId}): ${errText}`);
      throw new Error(`AI Analysis unavailable (${modelId}).`);
    }
    
    const geminiData = await geminiResponse.json();
    const text = geminiData.choices?.[0]?.message?.content || promptTemplate.noResult;
    
    // 构建来源列表
    const sources = searchResults.map((r) => ({
      uri: r.url,
      title: r.title
    }));
    
    return new Response(JSON.stringify({ rawText: text, sources }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error("Worker Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}

// ============================================
// 热门话题接口处理函数 (修复：按语言分别缓存 + 增强错误处理)
// ============================================
async function handleTrending(request, env) {
  const url = new URL(request.url);
  const lang = url.searchParams.get('lang') === 'en' ? 'en' : 'zh';
  
  try {
    const now = Date.now();
    
    // 根据语言选择对应的缓存
    const cache = lang === 'zh' ? trendingCacheZh : trendingCacheEn;
    
    // 检查缓存是否有效
    if (cache && now - cache.timestamp < CACHE_TTL) {
      console.log(`[Trending] Returning cached topics for lang=${lang}`);
      return new Response(JSON.stringify({ topics: cache.topics }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    console.log(`[Trending] Fetching fresh topics for lang=${lang}`);
    
    const geminiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY;
    const tavilyKey = getNextTavilyKey(env);
    
    if (!geminiKey || !tavilyKey) {
      console.error("[Trending] Missing API keys");
      return new Response(JSON.stringify({ topics: DEFAULT_TOPICS[lang] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // 获取科技新闻 - 使用 safeFetch 处理可能的 SSL 错误
    let newsContext = "";
    try {
      const tavilyResponse = await safeFetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: tavilyKey,
          query: "important tech news today",
          topic: "news",
          days: 1,
          max_results: 5
        })
      }, 1); // 只重试 1 次
      
      if (tavilyResponse.ok) {
        const tavilyData = await tavilyResponse.json();
        const results = tavilyData.results || [];
        newsContext = results.map((r) => r.title).join("\n");
      }
    } catch (tavilyError) {
      console.error("[Trending] Tavily API error:", tavilyError.message);
      // 如果 Tavily 失败，直接返回默认话题
      return new Response(JSON.stringify({ topics: DEFAULT_TOPICS[lang] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // 如果没有获取到新闻，返回默认话题
    if (!newsContext) {
      console.log("[Trending] No news context, returning defaults");
      return new Response(JSON.stringify({ topics: DEFAULT_TOPICS[lang] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // 根据语言生成话题
    const proxyBaseUrl = "https://api.zxvmax.com";
    const promptTemplate = PROMPTS[lang];
    
    const geminiResponse = await fetch(`${proxyBaseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${geminiKey}`
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [{
          role: "user",
          content: promptTemplate.trendingPrompt(newsContext)
        }],
        stream: false
      })
    });
    
    if (!geminiResponse.ok) {
      console.error("[Trending] Gemini request failed");
      return new Response(JSON.stringify({ topics: DEFAULT_TOPICS[lang] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    const geminiData = await geminiResponse.json();
    const content = geminiData.choices?.[0]?.message?.content || "";
    const topics = content.split("\n").map((t) => t.trim()).filter((t) => t.length > 0).slice(0, 4);
    
    if (topics.length > 0) {
      // 根据语言更新对应的缓存
      const newCache = { topics, timestamp: now };
      if (lang === 'zh') {
        trendingCacheZh = newCache;
      } else {
        trendingCacheEn = newCache;
      }
      console.log(`[Trending] Cached ${topics.length} topics for lang=${lang}`);
    } else {
      return new Response(JSON.stringify({ topics: DEFAULT_TOPICS[lang] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    return new Response(JSON.stringify({ topics }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error("[Trending] Error:", error);
    return new Response(JSON.stringify({ topics: DEFAULT_TOPICS[lang] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}


// ============================================
// 分享功能 - 创建分享链接
// ============================================
async function handleShareCreate(request, env) {
  try {
    // 检查 KV 绑定
    if (!env.SHARE_DATA) {
      return new Response(JSON.stringify({ error: "Share service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    const data = await request.json();
    
    // 验证必需字段
    if (!data.analysisResult || !data.shareOptions) {
      return new Response(JSON.stringify({ error: "Invalid share data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // 生成短 ID (8 字符)
    const shareId = generateShortId();
    
    // 添加元数据
    const shareData = {
      ...data,
      id: shareId,
      createdAt: Date.now()
    };
    
    // 存储到 KV，设置 30 天过期
    await env.SHARE_DATA.put(shareId, JSON.stringify(shareData), {
      expirationTtl: 30 * 24 * 60 * 60 // 30 days in seconds
    });
    
    return new Response(JSON.stringify({ 
      id: shareId,
      expiresIn: "30 days"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error("[Share Create] Error:", error);
    return new Response(JSON.stringify({ error: "Failed to create share link" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}

// ============================================
// 分享功能 - 获取分享数据
// ============================================
async function handleShareGet(shareId, env) {
  try {
    // 检查 KV 绑定
    if (!env.SHARE_DATA) {
      return new Response(JSON.stringify({ error: "Share service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // 验证 ID 格式
    if (!shareId || shareId.length !== 8 || !/^[a-zA-Z0-9]+$/.test(shareId)) {
      return new Response(JSON.stringify({ error: "Invalid share ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // 从 KV 获取数据
    const data = await env.SHARE_DATA.get(shareId);
    
    if (!data) {
      return new Response(JSON.stringify({ error: "Share not found or expired" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    return new Response(data, {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error("[Share Get] Error:", error);
    return new Response(JSON.stringify({ error: "Failed to retrieve share data" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}

// ============================================
// 生成短 ID (8 字符，URL 安全)
// ============================================
function generateShortId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  const randomValues = new Uint8Array(8);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < 8; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}
