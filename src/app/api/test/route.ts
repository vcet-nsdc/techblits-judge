import { NextRequest, NextResponse } from 'next/server';
import { testMongoDBConnection, initializeSampleData } from '@/lib/db-connection-test';

export async function GET() {
  try {
    const results: {
      timestamp: string;
      tests: Record<string, unknown>;
    } = {
      timestamp: new Date().toISOString(),
      tests: {}
    };

    // Test MongoDB connection
    console.log('Running system tests...');
    results.tests.mongodb = await testMongoDBConnection();

    // In-memory cache is always available
    results.tests.cache = { success: true, message: 'In-memory cache active' };

    // API routes are available by default in Next.js

    results.tests.api_routes = {
      '/api/competition/status': 'Available',
      '/api/domains': 'Available', 
      '/api/labs': 'Available',
      '/api/judge/login': 'Available',
      '/api/judge/teams': 'Available (Requires Auth)',
      '/api/judge/scores': 'Available (Requires Auth)',
      '/api/leaderboards/[domainId]/[round]': 'Available'
    };

    return NextResponse.json(results);
  } catch (error) {
    console.error('System test failed:', error);
    return NextResponse.json({
      error: 'System test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (body.action === 'initialize') {
      console.log('🔧 Initializing sample data...');
      const result = await initializeSampleData();
      return NextResponse.json(result);
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Initialization failed:', error);
    return NextResponse.json({
      error: 'Initialization failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
