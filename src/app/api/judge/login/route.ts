import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { connectDB } from '@/lib/mongodb';

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1)
});

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    // Rate limiting: 5 attempts per minute per email
    const rateLimit = checkRateLimit(`login:${email}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.', resetIn: rateLimit.resetIn },
        { status: 429 }
      );
    }

    const result = await AuthService.authenticateJudge(email, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    // Set HTTP-only cookie for refresh token
    const response = NextResponse.json({
      judge: result.judge,
      token: result.token
    });

    if (result.refreshToken) {
      response.cookies.set('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 // 7 days
      });
    }

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
