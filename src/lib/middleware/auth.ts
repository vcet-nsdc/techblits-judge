import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth';
import { JWTPayload } from '@/types/competition';

export function verifyToken(token?: string): JWTPayload | null {
  if (!token) return null;
  return AuthService.verifyToken(token);
}

export function extractTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  const cookieToken = request.cookies.get('accessToken')?.value;
  
  return authHeader?.replace('Bearer ', '') || cookieToken || null;
}

export function requireAuth(handler: (request: NextRequest, user: JWTPayload) => Promise<Response>) {
  return async (request: NextRequest) => {
    const token = extractTokenFromRequest(request);
    const user = verifyToken(token ?? undefined);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return handler(request, user);
  };
}

export function requireRole(role: 'judge' | 'admin') {
  return (handler: (request: NextRequest, user: JWTPayload) => Promise<Response>) => {
    return requireAuth(async (request: NextRequest, user: JWTPayload) => {
      if (user.role !== role) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return handler(request, user);
    });
  };
}
