import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WeComBotService, createWeComBotService } from './wecomBotService';
import type { NewsItem, ResearchResult } from '../types/scheduledNews';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('WeComBotService', () => {
  const webhookUrl = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key';
  const baseUrl = 'https://netpulse.example.com';
  let service: WeComBotService;

  beforeEach(() => {
    mockFetch.mockReset();
    vi.useFakeTimers();
    service = new WeComBotService(webhookUrl);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error when webhookUrl is empty', () => {
      expect(() => new WeComBotService('')).toThrow('webhookUrl is required');
    });

    it('should create instance with valid webhookUrl', () => {
      const svc = createWeComBotService(webhookUrl);
      expect(svc).toBeInstanceOf(WeComBotService);
    });
  });

  describe('Message Formatting', () => {
    const mockNews: NewsItem[] = [
      {
        id: 'news-1',
        title: 'AI Breakthrough in 2024',
        source: 'TechNews',
        url: 'https://example.com/ai-news',
        summary: 'A major breakthrough in artificial intelligence research.',
        domain: 'ai',
        publishedAt: '2024-01-15T08:00:00Z',
        collectedAt: Date.now(),
      },
      {
        id: 'news-2',
        title: 'Cloud Computing Trends',
        source: 'CloudDaily',
        url: 'https://example.com/cloud-news',
        summary: 'New trends in cloud computing infrastructure.',
        domain: 'cloud',
        publishedAt: '2024-01-15T09:00:00Z',
        collectedAt: Date.now(),
      },
    ];

    const mockResearchResult: ResearchResult = {
      id: 'result-1',
      newsId: 'news-1',
      newsTitle: 'AI Breakthrough in 2024',
      analysis: {
        title: 'AI Analysis',
        summary: 'This is a comprehensive analysis of the AI breakthrough.',
        keyPoints: ['Point 1', 'Point 2', 'Point 3', 'Point 4'],
        implications: ['Implication 1'],
        relatedContext: 'Related context here',
        potentialImpact: 'This could significantly impact the industry.',
      },
      sources: [{ uri: 'https://source.com', title: 'Source' }],
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };

    it('should format news digest with grouped domains', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      await service.sendNewsDigest(mockNews, '2024-01-15', baseUrl);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const content = callBody.markdown.content;

      expect(content).toContain('NetPulse 每日新闻摘要');
      expect(content).toContain('2024-01-15');
      expect(content).toContain('共 2 条新闻');
      expect(content).toContain('【人工智能】');
      expect(content).toContain('【云计算】');
      expect(content).toContain('AI Breakthrough in 2024');
      expect(content).toContain('/news/select?date=2024-01-15');
    });

    it('should format empty news as no-news notification', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      await service.sendNewsDigest([], '2024-01-15', baseUrl);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.markdown.content).toContain('今日暂无符合您关注领域的新闻更新');
    });

    it('should format research result with key points limited to 3', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      await service.sendResearchResult(mockResearchResult, baseUrl);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const content = callBody.markdown.content;

      expect(content).toContain('NetPulse 研究完成');
      expect(content).toContain('AI Breakthrough in 2024');
      expect(content).toContain('Point 1');
      expect(content).toContain('Point 2');
      expect(content).toContain('Point 3');
      expect(content).not.toContain('Point 4'); // Only first 3 points
      expect(content).toContain('/research/result-1');
    });

    it('should truncate long text in messages', async () => {
      const longSummaryNews: NewsItem[] = [{
        ...mockNews[0],
        summary: 'A'.repeat(200),
      }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      await service.sendNewsDigest(longSummaryNews, '2024-01-15', baseUrl);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const content = callBody.markdown.content;

      // Summary should be truncated to ~80 chars + "..."
      expect(content).toContain('...');
      expect(content).not.toContain('A'.repeat(200));
    });
  });

  describe('Retry Logic', () => {
    it('should succeed on first attempt without retry', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      const result = await service.sendNoNewsNotification('2024-01-15');

      expect(result.success).toBe(true);
      expect(result.retryCount).toBe(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on WeCom API error and succeed', async () => {
      // First attempt fails
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ errcode: 45009, errmsg: 'rate limit' }),
      });
      // Second attempt succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      const resultPromise = service.sendNoNewsNotification('2024-01-15');
      
      // Advance timer for first retry delay (1000ms)
      await vi.advanceTimersByTimeAsync(1000);
      
      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.retryCount).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on network error and succeed', async () => {
      // First attempt network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      // Second attempt succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      const resultPromise = service.sendError('Test error');
      
      await vi.advanceTimersByTimeAsync(1000);
      
      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.retryCount).toBe(1);
    });

    it('should fail after max retries (3 attempts)', async () => {
      // All attempts fail
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ errcode: 45009, errmsg: 'rate limit' }),
      });

      const resultPromise = service.sendNoNewsNotification('2024-01-15');
      
      // Advance through all retry delays: 1000ms, 2000ms
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);
      
      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.retryCount).toBe(3);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff delays', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ errcode: 45009, errmsg: 'error' }),
      });

      const resultPromise = service.sendNoNewsNotification('2024-01-15');

      // First retry after 1000ms (1s * 2^0)
      expect(mockFetch).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1000);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Second retry after 2000ms (1s * 2^1)
      await vi.advanceTimersByTimeAsync(2000);
      expect(mockFetch).toHaveBeenCalledTimes(3);

      await resultPromise;
    });
  });

  describe('Message Structure', () => {
    it('should send correct markdown message format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      await service.sendError('Test message');

      expect(mockFetch).toHaveBeenCalledWith(
        webhookUrl,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.msgtype).toBe('markdown');
      expect(body.markdown.content).toContain('Test message');
    });
  });
});
