import { NextRequest, NextResponse } from 'next/server';
import { getApiBaseUrl } from '@/lib/api';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const state = requestUrl.searchParams.get('state');
  const next = requestUrl.searchParams.get('next') ?? '/admin';

  if (code && state) {
    try {
      // Exchange the authorization code for tokens via the backend API
      const apiUrl = getApiBaseUrl();
      const response = await fetch(`${apiUrl}/auth/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state }),
      });

      if (!response.ok) {
        throw new Error('Failed to exchange code for session');
      }

      const data = await response.json();
      const redirectUrl = new URL(next, request.url);
      
      // Set auth token via cookie by returning headers
      const res = NextResponse.redirect(redirectUrl);
      if (data.token) {
        res.cookies.set('auth_token', data.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });
        res.cookies.set('auth_token_client', data.token, {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 5,
          path: '/',
        });
      }
      return res;
    } catch (error) {
      console.error('Error exchanging code for session:', error);
      return NextResponse.redirect(new URL('/auth/auth-code-error', request.url));
    }
  }

  // If no code, redirect to signin
  return NextResponse.redirect(new URL('/signin', request.url));
}

