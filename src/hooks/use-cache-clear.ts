import { useState, useCallback } from 'react';

export interface CacheClearOptions {
  pattern?: string;
  bustBrowser?: boolean;
}

export interface CacheClearResult {
  success: boolean;
  clearedItems: string[];
  cacheBust?: {
    timestamp: string;
    version: string;
  };
  message: string;
  errors?: string[];
}

export function useCacheClear() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearCache = useCallback(async (options: CacheClearOptions = {}): Promise<CacheClearResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/cache/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify(options)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to clear cache');
      }

      const result = await response.json();

      // If browser cache busting was requested, reload resources
      if (options.bustBrowser && result.cacheBust) {
        // Force reload of static resources
        const links = document.querySelectorAll('link[rel="stylesheet"], script[src]');
        links.forEach(link => {
          const element = link as HTMLLinkElement | HTMLScriptElement;
          const href = element.getAttribute('href') || element.getAttribute('src');
          if (href && !href.includes('?_t=')) {
            const newHref = `${href}${href.includes('?') ? '&' : '?'}_t=${result.cacheBust.timestamp}`;
            if (element instanceof HTMLLinkElement) {
              element.href = newHref;
            } else if (element instanceof HTMLScriptElement) {
              element.src = newHref;
            }
          }
        });

        // Clear service worker cache if available
        if ('caches' in window) {
          try {
            const cacheNames = await caches.keys();
            await Promise.all(
              cacheNames.map(cacheName => caches.delete(cacheName))
            );
          } catch (e) {
            console.warn('Failed to clear service worker cache:', e);
          }
        }

        // Optional: Force page reload after a short delay
        setTimeout(() => {
          if (confirm('Cache cleared successfully! Reload the page to ensure all changes take effect?')) {
            window.location.reload();
          }
        }, 1000);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Cache clear error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearAllCache = useCallback(() => {
    return clearCache({ bustBrowser: true });
  }, [clearCache]);

  const clearPattern = useCallback((pattern: string) => {
    return clearCache({ pattern, bustBrowser: false });
  }, [clearCache]);

  return {
    clearCache,
    clearAllCache,
    clearPattern,
    isLoading,
    error
  };
}

/**
 * Utility function to force browser cache reload for specific resources
 */
export function forceResourceReload(resources: string[] = []) {
  const timestamp = Date.now().toString();
  
  // Force reload images
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    const src = img.src;
    if (src && !src.includes('?_t=')) {
      img.src = `${src}?_t=${timestamp}`;
    }
  });

  // Force reload specific resources if provided
  resources.forEach(resource => {
    const elements = document.querySelectorAll(`[href="${resource}"], [src="${resource}"]`);
    elements.forEach(element => {
      const isLink = element instanceof HTMLLinkElement;
      const isScript = element instanceof HTMLScriptElement;
      const isImg = element instanceof HTMLImageElement;
      
      if (isLink) {
        element.href = `${resource}?_t=${timestamp}`;
      } else if (isScript) {
        element.src = `${resource}?_t=${timestamp}`;
      } else if (isImg) {
        element.src = `${resource}?_t=${timestamp}`;
      }
    });
  });
}

/**
 * Force hard reload of the page (bypasses all caches)
 */
export function forceHardReload() {
  // Clear all possible caches
  if ('caches' in window) {
    caches.keys().then(cacheNames => {
      return Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
    });
  }

  // Force reload with cache busting
  const url = new URL(window.location.href);
  url.searchParams.set('_t', Date.now().toString());
  window.location.href = url.toString();
}
