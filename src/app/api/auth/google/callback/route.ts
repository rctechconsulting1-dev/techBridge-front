import { NextRequest, NextResponse } from 'next/server';
import { GoogleOAuthManager } from '@/lib/google-oauth';
import { getAppBaseUrl } from '@/lib/api';

async function fetchGoogleAccountInfo(accessToken: string): Promise<{ accountId: string | null; email: string | null }> {
    try {
        // Get GMB account ID
        const accountRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        let accountId: string | null = null;
        if (accountRes.ok) {
            const data = await accountRes.json();
            const accountName: string | undefined = data.accounts?.[0]?.name;
            if (accountName) accountId = accountName.replace('accounts/', '');
        }

        // Get the authenticated user's email
        const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        let email: string | null = null;
        if (userinfoRes.ok) {
            const info = await userinfoRes.json();
            email = info.email ?? null;
        }

        return { accountId, email };
    } catch {
        return { accountId: null, email: null };
    }
}

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const oauthError = searchParams.get('error');
    const rawState = searchParams.get('state') ?? '';
    const baseUrl = getAppBaseUrl();
    const redirectBase = `${baseUrl}/google-business`;

    if (oauthError) {
        return NextResponse.redirect(`${redirectBase}?error=${encodeURIComponent(oauthError)}`);
    }
    if (!code) {
        return NextResponse.redirect(`${redirectBase}?error=no_code`);
    }

    // Decode tenantId from state (encoded by connect/route.ts)
    let tenantId: string | null = null;
    try {
        const decoded = JSON.parse(Buffer.from(rawState, 'base64').toString());
        if (decoded.purpose === 'agency') tenantId = decoded.tenantId ? String(decoded.tenantId) : null;
    } catch {
        // Old format (plain 'agency' string) — no tenantId available
    }

    try {
        const tokens = await GoogleOAuthManager.exchangeCodeForTokens(code);
        if (tokens.access_token) {
            const { accountId: googleAccountId, email: agencyEmail } = await fetchGoogleAccountInfo(tokens.access_token);
            // Store token data in a short-lived httpOnly cookie so the client can pick it up
            // and POST to the backend with its own auth headers (token is in localStorage, not cookies).
            const pendingData = Buffer.from(JSON.stringify({
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token ?? null,
                googleAccountId: googleAccountId ?? null,
                agencyEmail: agencyEmail ?? null,
                tenantId: tenantId ?? null,
                expiresAt: tokens.expiry_date
                    ? new Date(tokens.expiry_date).toISOString()
                    : new Date(Date.now() + 3600 * 1000).toISOString(),
            })).toString('base64');
            const res = NextResponse.redirect(`${redirectBase}?success=connected`);
            res.cookies.set('_google_oauth_pending', pendingData, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 5, // 5 minutes — client must claim immediately
                path: '/',
            });
            return res;
        }
        return NextResponse.redirect(`${redirectBase}?success=connected`);
    } catch (err) {
        console.error('Error in Google OAuth callback:', err);
        return NextResponse.redirect(`${redirectBase}?error=callback_failed`);
    }
}
