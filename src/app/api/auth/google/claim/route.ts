import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/google/claim
 *
 * Reads the _google_oauth_pending httpOnly cookie set by the OAuth callback,
 * returns the token data as JSON so the client can POST it to the backend
 * with its own auth headers (auth token lives in localStorage, not cookies).
 * Clears the cookie immediately after reading.
 */
export async function GET(req: NextRequest) {
    const raw = req.cookies.get('_google_oauth_pending')?.value;
    if (!raw) {
        return NextResponse.json({ error: 'No pending OAuth data' }, { status: 404 });
    }

    let data: Record<string, unknown>;
    try {
        data = JSON.parse(Buffer.from(raw, 'base64').toString());
    } catch {
        return NextResponse.json({ error: 'Invalid OAuth data' }, { status: 400 });
    }

    const res = NextResponse.json({ ok: true, data });
    // Clear the cookie — one-time use
    res.cookies.set('_google_oauth_pending', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
    });
    return res;
}
