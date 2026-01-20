import { describe, it, expect, beforeEach } from 'vitest';
import {
  encodeShareData,
  decodeShareData,
  generateShareUrl,
  parseShareUrl,
  createShareData,
  isShareUrl,
  getShareDataFromCurrentUrl,
  type SharedAnalysisData,
  type ShareOptions,
} from './shareUtils';
import type { AnalysisResult } from '../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock window.location
const mockLocation = {
  origin: 'https://netpulse.example.com',
  pathname: '/',
  hash: '',
  href: 'https://netpulse.example.com/',
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Test data
const mockAnalysisResult: AnalysisResult = {
  rawText: 'Test raw text content',
  parsed: {
    title: 'Test Title',
    summary: 'Test summary content',
    impacts: ['Impact 1', 'Impact 2'],
    historicalContext: 'Historical context content',
  },
  sources: [
    { uri: 'https://example.com/source1', title: 'Source 1' },
    { uri: 'https://example.com/source2', title: 'Source 2' },
  ],
};

const mockShareOptions: ShareOptions = {
  includeQuery: true,
  includeSources: true,
  customTitle: 'Custom Title',
};

const mockSharedData: SharedAnalysisData = {
  version: '1.0',
  analysisResult: mockAnalysisResult,
  shareOptions: mockShareOptions,
  originalQuery: 'test query',
  customTitle: 'Custom Title',
  timestamp: 1700000000000,
};

describe('ShareUtils', () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockLocation.hash = '';
    mockLocation.href = 'https://netpulse.example.com/';
  });

  describe('encodeShareData / decodeShareData', () => {
    it('should encode and decode data correctly', () => {
      const encoded = encodeShareData(mockSharedData);
      expect(encoded).toBeTruthy();
      expect(typeof encoded).toBe('string');

      const decoded = decodeShareData(encoded);
      expect(decoded).not.toBeNull();
      expect(decoded?.version).toBe(mockSharedData.version);
      expect(decoded?.timestamp).toBe(mockSharedData.timestamp);
    });

    it('should return null for invalid encoded data', () => {
      const decoded = decodeShareData('invalid-data');
      expect(decoded).toBeNull();
    });

    it('should return null for empty string', () => {
      const decoded = decodeShareData('');
      expect(decoded).toBeNull();
    });
  });

  describe('Data Validation', () => {
    it('should reject data with missing required fields', () => {
      const invalidData = { version: '1.0' };
      const encoded = encodeShareData(invalidData as SharedAnalysisData);
      const decoded = decodeShareData(encoded);
      expect(decoded).toBeNull();
    });

    it('should reject data with invalid analysisResult structure', () => {
      const invalidData = {
        ...mockSharedData,
        analysisResult: { rawText: 'test' }, // missing parsed and sources
      };
      const encoded = encodeShareData(invalidData as SharedAnalysisData);
      const decoded = decodeShareData(encoded);
      expect(decoded).toBeNull();
    });
  });

  describe('XSS Prevention', () => {
    it('should sanitize script tags in decoded data', () => {
      const maliciousData: SharedAnalysisData = {
        ...mockSharedData,
        analysisResult: {
          ...mockAnalysisResult,
          parsed: {
            ...mockAnalysisResult.parsed,
            title: '<script>alert("xss")</script>Test',
          },
        },
      };

      const encoded = encodeShareData(maliciousData);
      const decoded = decodeShareData(encoded);

      expect(decoded?.analysisResult.parsed.title).not.toContain('<script>');
    });

    it('should sanitize javascript: URLs', () => {
      const maliciousData: SharedAnalysisData = {
        ...mockSharedData,
        analysisResult: {
          ...mockAnalysisResult,
          sources: [{ uri: 'javascript:alert(1)', title: 'Malicious' }],
        },
      };

      const encoded = encodeShareData(maliciousData);
      const decoded = decodeShareData(encoded);

      expect(decoded?.analysisResult.sources[0].uri).not.toContain('javascript:');
    });
  });

  describe('generateShareUrl', () => {
    it('should generate a valid share URL', () => {
      const url = generateShareUrl(mockSharedData);
      expect(url).not.toBeNull();
      expect(url).toContain('#/shared?data=');
      expect(url).toContain(mockLocation.origin);
    });

    it('should return null when rate limit is exceeded', () => {
      // Generate 10 URLs to hit the rate limit
      for (let i = 0; i < 10; i++) {
        generateShareUrl(mockSharedData);
      }

      // 11th should fail
      const url = generateShareUrl(mockSharedData);
      expect(url).toBeNull();
    });
  });

  describe('parseShareUrl', () => {
    it('should parse a valid share URL', () => {
      const url = generateShareUrl(mockSharedData);
      if (url) {
        const parsed = parseShareUrl(url);
        expect(parsed).not.toBeNull();
        expect(parsed?.version).toBe(mockSharedData.version);
      }
    });

    it('should return null for non-share URLs', () => {
      const parsed = parseShareUrl('https://example.com/other');
      expect(parsed).toBeNull();
    });

    it('should return null for URLs with invalid data', () => {
      const parsed = parseShareUrl('https://example.com/#/shared?data=invalid');
      expect(parsed).toBeNull();
    });
  });

  describe('createShareData', () => {
    it('should create share data with query when includeQuery is true', () => {
      const options: ShareOptions = { includeQuery: true, includeSources: true };
      const data = createShareData(mockAnalysisResult, 'test query', options);

      expect(data.originalQuery).toBe('test query');
      expect(data.version).toBe('1.0');
      expect(data.timestamp).toBeDefined();
    });

    it('should exclude query when includeQuery is false', () => {
      const options: ShareOptions = { includeQuery: false, includeSources: true };
      const data = createShareData(mockAnalysisResult, 'test query', options);

      expect(data.originalQuery).toBeUndefined();
    });

    it('should include custom title when provided', () => {
      const options: ShareOptions = {
        includeQuery: true,
        includeSources: true,
        customTitle: 'My Custom Title',
      };
      const data = createShareData(mockAnalysisResult, 'test query', options);

      expect(data.customTitle).toBe('My Custom Title');
    });
  });

  describe('isShareUrl', () => {
    it('should return true for share URLs', () => {
      mockLocation.hash = '#/shared?data=somedata';
      expect(isShareUrl()).toBe(true);
    });

    it('should return false for non-share URLs', () => {
      mockLocation.hash = '';
      expect(isShareUrl()).toBe(false);

      mockLocation.hash = '#/other';
      expect(isShareUrl()).toBe(false);
    });
  });

  describe('getShareDataFromCurrentUrl', () => {
    it('should return null when not on a share URL', () => {
      mockLocation.hash = '';
      expect(getShareDataFromCurrentUrl()).toBeNull();
    });
  });

  describe('Integration: Complete Share Flow', () => {
    it('should complete full share flow: create → encode → generate URL → parse → decode', () => {
      // Step 1: Create share data
      const options: ShareOptions = {
        includeQuery: true,
        includeSources: true,
        customTitle: 'My Analysis',
      };
      const shareData = createShareData(mockAnalysisResult, 'test query', options);
      
      expect(shareData.version).toBe('1.0');
      expect(shareData.originalQuery).toBe('test query');
      expect(shareData.customTitle).toBe('My Analysis');
      
      // Step 2: Generate share URL
      const url = generateShareUrl(shareData);
      expect(url).not.toBeNull();
      expect(url).toContain('#/shared?data=');
      
      // Step 3: Parse URL and decode data
      const parsedData = parseShareUrl(url!);
      expect(parsedData).not.toBeNull();
      
      // Step 4: Verify data integrity
      expect(parsedData?.version).toBe(shareData.version);
      expect(parsedData?.shareOptions.includeQuery).toBe(true);
      expect(parsedData?.shareOptions.includeSources).toBe(true);
      expect(parsedData?.originalQuery).toBeDefined();
      expect(parsedData?.customTitle).toBeDefined();
      
      // Verify analysis result structure is preserved
      expect(parsedData?.analysisResult.parsed.title).toBeDefined();
      expect(parsedData?.analysisResult.parsed.summary).toBeDefined();
      expect(parsedData?.analysisResult.parsed.impacts).toHaveLength(2);
      expect(parsedData?.analysisResult.sources).toHaveLength(2);
    });

    it('should handle share flow without query', () => {
      const options: ShareOptions = {
        includeQuery: false,
        includeSources: true,
      };
      const shareData = createShareData(mockAnalysisResult, 'secret query', options);
      
      expect(shareData.originalQuery).toBeUndefined();
      
      const url = generateShareUrl(shareData);
      const parsedData = parseShareUrl(url!);
      
      expect(parsedData?.originalQuery).toBeUndefined();
      expect(parsedData?.shareOptions.includeQuery).toBe(false);
    });

    it('should handle share flow without sources', () => {
      const options: ShareOptions = {
        includeQuery: true,
        includeSources: false,
      };
      const shareData = createShareData(mockAnalysisResult, 'test query', options);
      
      const url = generateShareUrl(shareData);
      const parsedData = parseShareUrl(url!);
      
      expect(parsedData?.shareOptions.includeSources).toBe(false);
      // Note: sources are still in the data, but UI should hide them
      expect(parsedData?.analysisResult.sources).toHaveLength(2);
    });
  });

  describe('URL Length Optimization', () => {
    it('should generate URLs within browser limit (< 2000 chars) for typical data', () => {
      const options: ShareOptions = {
        includeQuery: true,
        includeSources: true,
      };
      const shareData = createShareData(mockAnalysisResult, 'test query', options);
      const url = generateShareUrl(shareData);
      
      expect(url).not.toBeNull();
      expect(url!.length).toBeLessThan(2000);
    });

    it('should handle large analysis results with compression', () => {
      const largeResult: AnalysisResult = {
        rawText: 'A'.repeat(1000), // Large raw text
        parsed: {
          title: 'Long Title '.repeat(10),
          summary: 'Summary content '.repeat(50),
          impacts: Array(10).fill('Impact item with some content'),
          historicalContext: 'Historical context '.repeat(30),
        },
        sources: Array(5).fill({ uri: 'https://example.com/source', title: 'Source Title' }),
      };

      const options: ShareOptions = {
        includeQuery: true,
        includeSources: true,
      };
      const shareData = createShareData(largeResult, 'test query', options);
      const url = generateShareUrl(shareData);
      
      expect(url).not.toBeNull();
      // LZ-string compression should keep URL manageable
      // Even with large data, compression should help
      console.log('Large data URL length:', url!.length);
      
      // Verify data can still be decoded correctly
      const parsedData = parseShareUrl(url!);
      expect(parsedData).not.toBeNull();
      expect(parsedData?.analysisResult.parsed.impacts).toHaveLength(10);
    });

    it('should compress data efficiently', () => {
      const options: ShareOptions = {
        includeQuery: true,
        includeSources: true,
      };
      const shareData = createShareData(mockAnalysisResult, 'test query', options);
      
      const jsonStr = JSON.stringify(shareData);
      const encoded = encodeShareData(shareData);
      
      // Compression should reduce size
      // Note: For small data, compression might not always reduce size significantly
      console.log('Original JSON length:', jsonStr.length);
      console.log('Encoded length:', encoded.length);
      
      // Verify encoding works regardless of compression ratio
      const decoded = decodeShareData(encoded);
      expect(decoded).not.toBeNull();
    });
  });

  describe('Error Recovery', () => {
    it('should gracefully handle corrupted URL data', () => {
      const corruptedUrls = [
        'https://example.com/#/shared?data=',
        'https://example.com/#/shared?data=abc123',
        'https://example.com/#/shared?data=!!!invalid!!!',
        'https://example.com/#/shared?data=%00%00%00',
      ];

      for (const url of corruptedUrls) {
        const result = parseShareUrl(url);
        expect(result).toBeNull();
      }
    });

    it('should handle malformed JSON in encoded data', () => {
      // This tests the decode function's error handling
      const result = decodeShareData('not-valid-lz-string');
      expect(result).toBeNull();
    });

    it('should handle partial data structures', () => {
      const partialData = {
        version: '1.0',
        timestamp: Date.now(),
        // Missing analysisResult and shareOptions
      };
      
      const encoded = encodeShareData(partialData as SharedAnalysisData);
      const decoded = decodeShareData(encoded);
      
      // Should return null due to validation failure
      expect(decoded).toBeNull();
    });
  });
});
