import LZString from 'lz-string';
import type { AnalysisResult } from '../types';

// 分享数据版本号，用于向后兼容
const SHARE_DATA_VERSION = '1.0';

// 速率限制配置
const RATE_LIMIT_MAX = 10; // 每分钟最多生成次数
const RATE_LIMIT_WINDOW = 60 * 1000; // 1分钟窗口

export interface ShareOptions {
  includeQuery: boolean;
  customTitle?: string;
  includeSources: boolean;
}

export interface SharedAnalysisData {
  version: string;
  analysisResult: AnalysisResult;
  shareOptions: ShareOptions;
  originalQuery?: string;
  customTitle?: string;
  timestamp: number;
}

// XSS 危险模式
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /data:/gi,
];

/**
 * 清理字符串，防止 XSS 攻击
 */
function sanitizeString(str: string): string {
  if (typeof str !== 'string') return '';
  
  let sanitized = str;
  for (const pattern of XSS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }
  
  // HTML 实体编码关键字符
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  
  return sanitized;
}


/**
 * 清理分析结果数据
 */
function sanitizeAnalysisResult(result: AnalysisResult): AnalysisResult {
  return {
    rawText: sanitizeString(result.rawText),
    parsed: {
      title: sanitizeString(result.parsed.title),
      summary: sanitizeString(result.parsed.summary),
      impacts: result.parsed.impacts.map(sanitizeString),
      historicalContext: sanitizeString(result.parsed.historicalContext),
    },
    sources: result.sources.map(source => ({
      uri: sanitizeString(source.uri),
      title: sanitizeString(source.title),
    })),
  };
}

/**
 * 验证分享数据结构是否有效
 */
function validateShareData(data: unknown): data is SharedAnalysisData {
  if (!data || typeof data !== 'object') return false;
  
  const d = data as Record<string, unknown>;
  
  // 验证必需字段
  if (typeof d.version !== 'string') return false;
  if (typeof d.timestamp !== 'number') return false;
  if (!d.analysisResult || typeof d.analysisResult !== 'object') return false;
  if (!d.shareOptions || typeof d.shareOptions !== 'object') return false;
  
  // 验证 analysisResult 结构
  const result = d.analysisResult as Record<string, unknown>;
  if (typeof result.rawText !== 'string') return false;
  if (!result.parsed || typeof result.parsed !== 'object') return false;
  if (!Array.isArray(result.sources)) return false;
  
  // 验证 parsed 结构
  const parsed = result.parsed as Record<string, unknown>;
  if (typeof parsed.title !== 'string') return false;
  if (typeof parsed.summary !== 'string') return false;
  if (!Array.isArray(parsed.impacts)) return false;
  if (typeof parsed.historicalContext !== 'string') return false;
  
  // 验证 shareOptions 结构
  const options = d.shareOptions as Record<string, unknown>;
  if (typeof options.includeQuery !== 'boolean') return false;
  if (typeof options.includeSources !== 'boolean') return false;
  
  return true;
}

/**
 * 检查速率限制
 */
function checkRateLimit(): boolean {
  const now = Date.now();
  const storageKey = 'netpulse_share_rate_limit';
  
  try {
    const stored = localStorage.getItem(storageKey);
    let history: number[] = stored ? JSON.parse(stored) : [];
    
    // 过滤掉过期的记录
    history = history.filter(time => now - time < RATE_LIMIT_WINDOW);
    
    if (history.length >= RATE_LIMIT_MAX) {
      return false;
    }
    
    // 添加当前时间
    history.push(now);
    localStorage.setItem(storageKey, JSON.stringify(history));
    
    return true;
  } catch {
    // localStorage 不可用时，允许操作
    return true;
  }
}


/**
 * 编码分享数据为 URL 安全的字符串
 */
export function encodeShareData(data: SharedAnalysisData): string {
  const jsonStr = JSON.stringify(data);
  // 使用 LZ-string 压缩并转为 URL 安全的 base64
  const compressed = LZString.compressToEncodedURIComponent(jsonStr);
  return compressed;
}

/**
 * 解码分享数据
 */
export function decodeShareData(encodedData: string): SharedAnalysisData | null {
  try {
    // 解压缩
    const jsonStr = LZString.decompressFromEncodedURIComponent(encodedData);
    if (!jsonStr) return null;
    
    // 解析 JSON
    const data = JSON.parse(jsonStr);
    
    // 验证数据结构
    if (!validateShareData(data)) return null;
    
    // 清理数据防止 XSS
    const sanitizedData: SharedAnalysisData = {
      version: data.version,
      timestamp: data.timestamp,
      analysisResult: sanitizeAnalysisResult(data.analysisResult),
      shareOptions: {
        includeQuery: data.shareOptions.includeQuery,
        includeSources: data.shareOptions.includeSources,
        customTitle: data.shareOptions.customTitle 
          ? sanitizeString(data.shareOptions.customTitle) 
          : undefined,
      },
      originalQuery: data.originalQuery 
        ? sanitizeString(data.originalQuery) 
        : undefined,
      customTitle: data.customTitle 
        ? sanitizeString(data.customTitle) 
        : undefined,
    };
    
    return sanitizedData;
  } catch {
    return null;
  }
}

/**
 * 生成分享链接（使用后端 KV 存储）
 */
export async function generateShareUrl(data: SharedAnalysisData): Promise<string | null> {
  // 检查速率限制
  if (!checkRateLimit()) {
    return null;
  }
  
  try {
    const response = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      console.error('Failed to create share link:', response.status);
      return null;
    }
    
    const result = await response.json();
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#/s/${result.id}`;
  } catch (error) {
    console.error('Error creating share link:', error);
    // 降级到本地编码方式
    const encoded = encodeShareData(data);
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#/shared?data=${encoded}`;
  }
}

/**
 * 从 URL 解析分享数据
 */
export function parseShareUrl(url: string): SharedAnalysisData | null {
  try {
    // 新格式: #/s/:id (短链接)
    const shortMatch = url.match(/#\/s\/([a-zA-Z0-9]{8})/);
    if (shortMatch) {
      // 短链接需要异步获取，这里返回 null，由调用方使用 fetchShareData
      return null;
    }
    
    // 旧格式: #/shared?data=xxx (兼容)
    const hashIndex = url.indexOf('#/shared?data=');
    if (hashIndex === -1) return null;
    
    const encodedData = url.substring(hashIndex + '#/shared?data='.length);
    if (!encodedData) return null;
    
    return decodeShareData(encodedData);
  } catch {
    return null;
  }
}

/**
 * 从后端获取分享数据
 */
export async function fetchShareData(shareId: string): Promise<SharedAnalysisData | null> {
  try {
    const response = await fetch(`/api/share/${shareId}`);
    
    if (!response.ok) {
      console.error('Failed to fetch share data:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    // 验证数据结构
    if (!validateShareData(data)) {
      return null;
    }
    
    // 清理数据防止 XSS
    return {
      version: data.version,
      timestamp: data.timestamp,
      analysisResult: sanitizeAnalysisResult(data.analysisResult),
      shareOptions: {
        includeQuery: data.shareOptions.includeQuery,
        includeSources: data.shareOptions.includeSources,
        customTitle: data.shareOptions.customTitle 
          ? sanitizeString(data.shareOptions.customTitle) 
          : undefined,
      },
      originalQuery: data.originalQuery 
        ? sanitizeString(data.originalQuery) 
        : undefined,
      customTitle: data.customTitle 
        ? sanitizeString(data.customTitle) 
        : undefined,
    };
  } catch (error) {
    console.error('Error fetching share data:', error);
    return null;
  }
}

/**
 * 创建分享数据对象
 */
export function createShareData(
  analysisResult: AnalysisResult,
  originalQuery: string,
  options: ShareOptions
): SharedAnalysisData {
  return {
    version: SHARE_DATA_VERSION,
    analysisResult,
    shareOptions: options,
    originalQuery: options.includeQuery ? originalQuery : undefined,
    customTitle: options.customTitle,
    timestamp: Date.now(),
  };
}

/**
 * 检查当前 URL 是否为分享链接
 */
export function isShareUrl(): boolean {
  const hash = window.location.hash;
  return hash.startsWith('#/shared?data=') || /^#\/s\/[a-zA-Z0-9]{8}$/.test(hash);
}

/**
 * 获取短链接 ID（如果是短链接格式）
 */
export function getShortShareId(): string | null {
  const match = window.location.hash.match(/^#\/s\/([a-zA-Z0-9]{8})$/);
  return match ? match[1] : null;
}

/**
 * 获取当前 URL 中的分享数据
 */
export function getShareDataFromCurrentUrl(): SharedAnalysisData | null {
  if (!isShareUrl()) return null;
  return parseShareUrl(window.location.href);
}
