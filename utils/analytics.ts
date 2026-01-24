/**
 * Umami Analytics 埋点工具
 * 用于追踪用户行为事件
 */

// 声明 umami 全局对象类型
declare global {
    interface Window {
        umami?: {
            track: (eventName: string, eventData?: Record<string, unknown>) => void;
        };
    }
}

/**
 * 追踪自定义事件
 * @param eventName 事件名称
 * @param eventData 事件数据（可选）
 */
export function trackEvent(eventName: string, eventData?: Record<string, unknown>): void {
    try {
        if (typeof window !== 'undefined' && window.umami) {
            window.umami.track(eventName, eventData);
            console.log(`[Analytics] Tracked: ${eventName}`, eventData);
        }
    } catch (error) {
        console.warn('[Analytics] Failed to track event:', error);
    }
}

// ========================
// 预定义的事件追踪函数
// ========================

/**
 * 追踪分析请求发起
 */
export function trackSearchInitiated(data: {
    mode: 'fast' | 'deep';
    queryLength: number;
    source: 'input' | 'trending';
}): void {
    trackEvent('search_initiated', data);
}

/**
 * 追踪分析模式切换
 */
export function trackModeSelected(mode: 'fast' | 'deep'): void {
    trackEvent('mode_selected', { mode });
}

/**
 * 追踪分析完成
 */
export function trackAnalysisCompleted(data: {
    mode: 'fast' | 'deep';
    success: boolean;
    duration?: number;
}): void {
    trackEvent('analysis_completed', data);
}

/**
 * 追踪分享按钮点击
 */
export function trackShareClicked(): void {
    trackEvent('share_clicked');
}

/**
 * 追踪分享链接创建成功
 */
export function trackShareCreated(expirationDays: number): void {
    trackEvent('share_created', { expirationDays });
}

/**
 * 追踪设置面板打开
 */
export function trackSettingsOpened(): void {
    trackEvent('settings_opened');
}

/**
 * 追踪自定义 API Key 配置保存
 */
export function trackCustomApiKeySaved(data: {
    searchProvider: string;
    llmProvider: string;
    enabled: boolean;
}): void {
    trackEvent('custom_api_key_saved', data);
}

/**
 * 追踪语言切换
 */
export function trackLanguageSwitched(data: {
    from: string;
    to: string;
}): void {
    trackEvent('language_switched', data);
}

/**
 * 追踪热门话题点击
 */
export function trackTrendingTopicClicked(topicIndex: number): void {
    trackEvent('trending_topic_clicked', { topicIndex });
}

/**
 * 追踪共享链接访问
 */
export function trackSharedViewAccessed(): void {
    trackEvent('shared_view_accessed');
}
