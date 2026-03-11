import { NextRequest, NextResponse } from 'next/server';
import { clearAllServerCaches, clearCachePattern, cacheBusters } from '@/lib/cache-clear';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pattern, bustBrowser } = body;

    let result;

    if (pattern) {
      // Clear specific pattern
      result = await clearCachePattern(pattern);
    } else {
      // Clear all caches
      result = await clearAllServerCaches();
    }

    // Add cache-busting headers to prevent browser caching
    const headers = {
      ...cacheBusters.getHeaders(),
      'Content-Type': 'application/json'
    };

    // If browser cache busting requested, add busting info
    const response = {
      ...result,
      cacheBust: bustBrowser ? {
        timestamp: cacheBusters.getTimestamp(),
        version: cacheBusters.getVersion()
      } : undefined,
      message: bustBrowser 
        ? 'Server and browser cache cleared successfully' 
        : 'Server cache cleared successfully'
    };

    return NextResponse.json(response, { headers });
  } catch (error) {
    console.error('Cache clear failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to clear cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500,
      headers: cacheBusters.getHeaders()
    });
  }
}

export async function GET() {
  // Return cache status and busting info
  const headers = cacheBusters.getHeaders();
  
  return NextResponse.json({
    message: 'Cache clear endpoint available',
    methods: {
      POST: {
        description: 'Clear server cache',
        options: {
          pattern: 'string - optional pattern to clear specific cache items',
          bustBrowser: 'boolean - optional flag to include browser cache busting info'
        }
      }
    },
    cacheBust: {
      timestamp: cacheBusters.getTimestamp(),
      version: cacheBusters.getVersion()
    }
  }, { headers });
}
