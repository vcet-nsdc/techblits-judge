// Cache clearing utilities for browser and server cache

import { cacheService } from './cache';
import { competitionCacheService } from './competition-cache';

export interface CacheClearResult {
  success: boolean;
  clearedItems: string[];
  errors?: string[];
}

/**
 * Clear all in-memory caches
 */
export async function clearAllServerCaches(): Promise<CacheClearResult> {
  const clearedItems: string[] = [];
  const errors: string[] = [];

  try {
    // Clear main cache service
    await cacheService.invalidateAll();
    clearedItems.push('Main cache service');
  } catch (error) {
    errors.push(`Failed to clear main cache: ${error}`);
  }

  try {
    // Clear competition cache
    await competitionCacheService.invalidateAll();
    clearedItems.push('Competition cache');
  } catch (error) {
    errors.push(`Failed to clear competition cache: ${error}`);
  }

  return {
    success: errors.length === 0,
    clearedItems,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Clear specific cache patterns
 */
export function clearCachePattern(pattern: string): CacheClearResult {
  const clearedItems: string[] = [];
  const errors: string[] = [];

  try {
    cacheService.invalidatePattern(pattern);
    clearedItems.push(`Cache pattern: ${pattern}`);
  } catch (error) {
    errors.push(`Failed to clear pattern ${pattern}: ${error}`);
  }

  return {
    success: errors.length === 0,
    clearedItems,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Browser cache busting utilities
 */
export const cacheBusters = {
  /**
   * Generate a cache-busting timestamp
   */
  getTimestamp: () => Date.now().toString(),
  
  /**
   * Generate a cache-busting version string
   */
  getVersion: () => `v${Date.now()}`,
  
  /**
   * Add cache-busting query parameter to URLs
   */
  addBustParam: (url: string, bust?: string) => {
    const separator = url.includes('?') ? '&' : '?';
    const bustValue = bust || cacheBusters.getTimestamp();
    return `${url}${separator}_t=${bustValue}`;
  },
  
  /**
   * Generate cache-busting headers for API responses
   */
  getHeaders: () => ({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-Cache-Bust': cacheBusters.getTimestamp()
  })
};

/**
 * Force browser cache invalidation for specific resources
 */
export function invalidateBrowserCache(resources: string[]): CacheClearResult {
  const clearedItems: string[] = [];
  const errors: string[] = [];

  resources.forEach(resource => {
    try {
      // This will be used by frontend to force cache invalidation
      const bustedUrl = cacheBusters.addBustParam(resource);
      clearedItems.push(bustedUrl);
    } catch (error) {
      errors.push(`Failed to bust cache for ${resource}: ${error}`);
    }
  });

  return {
    success: errors.length === 0,
    clearedItems,
    errors: errors.length > 0 ? errors : undefined
  };
}
