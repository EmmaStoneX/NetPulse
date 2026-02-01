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

// ============================================
// CORS 配置 - 限制允许的来源
// ============================================
const ALLOWED_ORIGINS = [
  'https://netpulse.zxvmax.com',
  'http://localhost:5173',  // 本地开发
  'http://localhost:4173',  // 本地预览
];

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true"
  };
}

// 兼容旧代码的静态 headers（用于不需要动态 origin 的场景）
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://netpulse.zxvmax.com",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
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

// 默认热门话题（按语言）- 统一管理，前端不再维护
const DEFAULT_TOPICS = {
  zh: [
    "最近的互联网大瘫痪",
    "最新 AI 模型发布的影响",
    "本周网络安全漏洞",
    "社交媒体新规"
  ],
  en: [
    "Recent Internet Outages",
    "Latest AI Model Releases",
    "This Week's Cybersecurity Vulnerabilities",
    "New Social Media Regulations"
  ]
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
// Gemini API 调用（带重试和指数退避）
// ============================================
async function callGeminiWithRetry(url, options, maxRetries = 2) {
  const baseDelay = 1000; // 1秒基础延迟
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.ok) {
        return response;
      }
      
      // 获取错误信息
      const errText = await response.text();
      
      // 429 (Rate Limit) 或 503 (Service Unavailable) 或 500+ 错误可以重试
      const isRetryable = response.status === 429 || response.status >= 500;
      
      if (!isRetryable || attempt === maxRetries) {
        console.error(`[Gemini] Request failed (status ${response.status}): ${errText.substring(0, 200)}`);
        throw new Error(`Gemini API error (${response.status}): ${errText.substring(0, 100)}`);
      }
      
      // 指数退避等待
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`[Gemini] Attempt ${attempt + 1} failed with status ${response.status}, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // 网络错误也重试
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`[Gemini] Attempt ${attempt + 1} failed: ${error.message}, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
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
      return new Response(null, { headers: getCorsHeaders(request) });
    }

    // 2. API 路由: POST /api/analyze
    if (url.pathname === "/api/analyze" && request.method === "POST") {
      return handleAnalyze(request, env, ctx);
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

    // 6. API 路由: POST /api/proxy/exa - Exa API 代理 (解决 CORS 问题)
    if (url.pathname === "/api/proxy/exa" && request.method === "POST") {
      return handleExaProxy(request, env);
    }

    // 7. 认证相关路由
    if (url.pathname === "/api/auth/github" && request.method === "GET") {
      return handleAuthGitHub(request, env);
    }
    if (url.pathname === "/api/auth/callback" && request.method === "GET") {
      return handleAuthCallback(request, env);
    }
    if (url.pathname === "/api/auth/user" && request.method === "GET") {
      return handleAuthUser(request, env);
    }
    if (url.pathname === "/api/usage" && request.method === "GET") {
      return handleUsage(request, env);
    }

    // 8. 静态页面路由重写 (无扩展名 -> .html)
    const staticPages = ['/about', '/privacy', '/terms'];
    if (staticPages.includes(url.pathname)) {
      const newUrl = new URL(request.url);
      newUrl.pathname = url.pathname + '.html';
      return env.ASSETS.fetch(new Request(newUrl, request));
    }

    // 9. 静态资源（默认）
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
// Exa API 代理处理函数 (解决 CORS 问题)
// ============================================
async function handleExaProxy(request, env) {
  try {
    const body = await request.json();
    const { apiKey, endpoint, payload } = body;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const exaEndpoint = endpoint || 'search';
    const exaUrl = `https://api.exa.ai/${exaEndpoint}`;

    const response = await fetch(exaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(payload || { query: 'test', numResults: 1, contents: { text: true } }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({
        error: data.message || `Exa API error: ${response.status}`,
        status: response.status
      }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("[Exa Proxy] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Exa proxy failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}

// ============================================
// 分析接口处理函数
// ============================================
async function handleAnalyze(request, env, ctx) {
  let reqBody = null;
  try {
    // === 使用限制检查 ===
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    let isAuthenticated = false;
    
    // 检查是否是登录用户
    if (token) {
      const userData = await env.AUTH_TOKENS.get(`token:${token}`, 'json');
      if (userData && userData.expires_at > Date.now()) {
        isAuthenticated = true;
      }
    }
    
    // 访客用户检查使用限制（基于 IP + 指纹）
    if (!isAuthenticated) {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const fingerprint = generateRequestFingerprint(request);
      const date = new Date().toISOString().split('T')[0];
      
      // 使用 IP + 指纹组合作为限流 key
      const ipKey = `ip:${ip}:${date}`;
      const fpKey = `fp:${fingerprint}:${date}`;
      
      // 获取两种限制的使用情况
      const [ipUsage, fpUsage] = await Promise.all([
        env.USAGE_LIMIT.get(ipKey, 'json'),
        env.USAGE_LIMIT.get(fpKey, 'json')
      ]);
      
      const ipCount = ipUsage?.count || 0;
      const fpCount = fpUsage?.count || 0;
      
      // 取两者中较大的值作为实际使用次数（防止绕过）
      const actualCount = Math.max(ipCount, fpCount);
      
      if (actualCount >= 5) {
        return new Response(JSON.stringify({
          error: 'Usage limit exceeded. Please login with GitHub for unlimited access.',
          code: 'LIMIT_EXCEEDED',
          remaining: 0
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // 同时增加 IP 和指纹的使用次数
      const newCount = actualCount + 1;
      await Promise.all([
        env.USAGE_LIMIT.put(ipKey, JSON.stringify({ count: newCount }), { expirationTtl: 86400 }),
        env.USAGE_LIMIT.put(fpKey, JSON.stringify({ count: newCount }), { expirationTtl: 86400 })
      ]);
    }
    // === 使用限制检查结束 ===

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
    reqBody = await request.json();
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

    // --- Step 3: 调用 Gemini API (带重试) ---
    const proxyBaseUrl = env.GEMINI_PROXY_URL || "https://generativelanguage.googleapis.com";
    const geminiUrl = `${proxyBaseUrl}/v1/chat/completions`;
    const startTime = Date.now();

    const geminiResponse = await callGeminiWithRetry(geminiUrl, {
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
    }, 2); // 最多重试 2 次

    const geminiData = await geminiResponse.json();
    const text = geminiData.choices?.[0]?.message?.content || promptTemplate.noResult;
    const duration = Date.now() - startTime;

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
      // 根据语言使用不同的搜索关键词，确保聚焦科技领域
      const searchQuery = lang === 'zh'
        ? "AI人工智能 科技新闻 技术突破 互联网 最新"
        : "AI artificial intelligence technology news breakthrough latest";

      const tavilyResponse = await safeFetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: tavilyKey,
          query: searchQuery,
          topic: "news",
          days: 3,
          max_results: 10
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
    const proxyBaseUrl = env.GEMINI_PROXY_URL || "https://generativelanguage.googleapis.com";
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

// ============================================
// GitHub OAuth 配置
// ============================================
const GITHUB_CLIENT_ID = 'Ov23libyQSlyiV3tUwMk';
const GITHUB_REDIRECT_URI = 'https://netpulse.zxvmax.com/api/auth/callback';
const GITHUB_SCOPE = 'read:user';

// ============================================
// 生成请求指纹（用于速率限制）
// 基于多个请求特征生成，即使更换 IP 也能识别同一用户
// ============================================
function generateRequestFingerprint(request) {
  const components = [
    // User-Agent（浏览器和操作系统信息）
    request.headers.get('User-Agent') || '',
    // Accept-Language（语言偏好）
    request.headers.get('Accept-Language') || '',
    // Accept-Encoding（支持的编码）
    request.headers.get('Accept-Encoding') || '',
    // Sec-CH-UA（浏览器品牌信息）
    request.headers.get('Sec-CH-UA') || '',
    // Sec-CH-UA-Platform（操作系统）
    request.headers.get('Sec-CH-UA-Platform') || '',
    // Sec-CH-UA-Mobile（是否移动设备）
    request.headers.get('Sec-CH-UA-Mobile') || '',
  ];
  
  // 将所有组件连接并生成简单哈希
  const combined = components.join('|');
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // 转换为正数的十六进制字符串
  return Math.abs(hash).toString(16);
}

// ============================================
// 生成安全随机 Token
// ============================================
function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(32);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < 32; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

// ============================================
// 认证: 重定向到 GitHub OAuth
// ============================================
async function handleAuthGitHub(request, env) {
  try {
    // 检查 KV 绑定
    if (!env.AUTH_TOKENS) {
      console.error('[Auth] AUTH_TOKENS KV not configured');
      return new Response(JSON.stringify({ error: 'Auth service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const state = generateToken();
    
    // 存储 state 用于验证回调 (5分钟过期)
    await env.AUTH_TOKENS.put(`state:${state}`, 'valid', { expirationTtl: 300 });
    
    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.set('client_id', GITHUB_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', GITHUB_REDIRECT_URI);
    authUrl.searchParams.set('scope', GITHUB_SCOPE);
    authUrl.searchParams.set('state', state);
    
    return Response.redirect(authUrl.toString(), 302);
  } catch (error) {
    console.error('[Auth GitHub] Error:', error);
    return new Response(JSON.stringify({ error: 'Auth initialization failed: ' + error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// ============================================
// 认证: GitHub OAuth 回调处理
// ============================================
async function handleAuthCallback(request, env) {
  // 获取基础 URL 用于重定向
  const requestUrl = new URL(request.url);
  const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
  
  try {
    // 检查 KV 绑定
    if (!env.AUTH_TOKENS) {
      console.error('[Auth Callback] AUTH_TOKENS KV not configured');
      return Response.redirect(`${baseUrl}/#/auth?error=service_not_configured`, 302);
    }
    
    const code = requestUrl.searchParams.get('code');
    const state = requestUrl.searchParams.get('state');
    const error = requestUrl.searchParams.get('error');
    
    // 处理用户拒绝授权
    if (error) {
      return Response.redirect(`${baseUrl}/#/auth?error=access_denied`, 302);
    }
    
    if (!code || !state) {
      return Response.redirect(`${baseUrl}/#/auth?error=invalid_request`, 302);
    }
    
    // 验证 state
    const storedState = await env.AUTH_TOKENS.get(`state:${state}`);
    if (!storedState) {
      return Response.redirect(`${baseUrl}/#/auth?error=invalid_state`, 302);
    }
    
    // 删除已使用的 state
    await env.AUTH_TOKENS.delete(`state:${state}`);
    
    // 用 code 换取 access_token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code: code
      })
    });
    
    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      console.error('[Auth] Token exchange failed:', tokenData.error);
      return Response.redirect(`${baseUrl}/#/auth?error=token_exchange_failed`, 302);
    }
    
    const accessToken = tokenData.access_token;
    
    // 获取 GitHub 用户信息
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'NetPulse'
      }
    });
    
    if (!userResponse.ok) {
      console.error('[Auth] Failed to get user info');
      return Response.redirect(`${baseUrl}/#/auth?error=user_fetch_failed`, 302);
    }
    
    const userData = await userResponse.json();
    
    // 生成内部 token
    const internalToken = generateToken();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24小时
    
    // 存储 token 信息到 KV
    await env.AUTH_TOKENS.put(`token:${internalToken}`, JSON.stringify({
      github_id: userData.id,
      login: userData.login,
      avatar_url: userData.avatar_url,
      created_at: Date.now(),
      expires_at: expiresAt
    }), { expirationTtl: 86400 }); // 24小时过期
    
    // 重定向到前端，带上 token
    return Response.redirect(`${baseUrl}/#/auth?token=${internalToken}`, 302);
    
  } catch (error) {
    console.error('[Auth] Callback error:', error);
    return Response.redirect(`${baseUrl}/#/auth?error=server_error`, 302);
  }
}

// ============================================
// 认证: 获取当前用户信息
// ============================================
async function handleAuthUser(request, env) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return new Response(JSON.stringify({ error: 'No token provided' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    if (!env.AUTH_TOKENS) {
      return new Response(JSON.stringify({ error: 'Auth service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const userData = await env.AUTH_TOKENS.get(`token:${token}`, 'json');
    
    if (!userData) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    if (userData.expires_at < Date.now()) {
      await env.AUTH_TOKENS.delete(`token:${token}`);
      return new Response(JSON.stringify({ error: 'Token expired' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      user: {
        id: userData.github_id,
        login: userData.login,
        avatar_url: userData.avatar_url
      },
      expires_at: userData.expires_at
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[Auth User] Error:', error);
    return new Response(JSON.stringify({ error: 'Auth check failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// ============================================
// 使用量: 获取当前 IP 的使用情况
// ============================================
async function handleUsage(request, env) {
  try {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const fingerprint = generateRequestFingerprint(request);
    const date = new Date().toISOString().split('T')[0];
    const ipKey = `ip:${ip}:${date}`;
    const fpKey = `fp:${fingerprint}:${date}`;
    
    // 检查是否是登录用户
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (token && env.AUTH_TOKENS) {
      const userData = await env.AUTH_TOKENS.get(`token:${token}`, 'json');
      if (userData && userData.expires_at > Date.now()) {
        // 登录用户无限制
        return new Response(JSON.stringify({
          remaining: -1, // -1 表示无限制
          total: -1,
          isAuthenticated: true,
          resetTime: null
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // 访客用户
    if (!env.USAGE_LIMIT) {
      // 如果 KV 未配置，返回默认值
      return new Response(JSON.stringify({
        remaining: 5,
        total: 5,
        isAuthenticated: false,
        resetTime: null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // 获取 IP 和指纹的使用情况，取较大值
    const [ipUsage, fpUsage] = await Promise.all([
      env.USAGE_LIMIT.get(ipKey, 'json'),
      env.USAGE_LIMIT.get(fpKey, 'json')
    ]);
    
    const ipCount = ipUsage?.count || 0;
    const fpCount = fpUsage?.count || 0;
    const actualCount = Math.max(ipCount, fpCount);
    const remaining = Math.max(0, 5 - actualCount);
    
    // 计算重置时间 (明天 0 点)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    return new Response(JSON.stringify({
      remaining: remaining,
      total: 5,
      isAuthenticated: false,
      resetTime: tomorrow.toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[Usage] Error:', error);
    return new Response(JSON.stringify({
      remaining: 5,
      total: 5,
      isAuthenticated: false,
      resetTime: null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
