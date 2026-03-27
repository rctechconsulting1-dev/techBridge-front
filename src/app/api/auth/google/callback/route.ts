import { NextRequest, NextResponse } from 'next/server';
import { GoogleOAuthManager } from '@/lib/google-oauth';
import { getApiBaseUrl, getAppBaseUrl } from '@/lib/api';

async function fetchGoogleAccountId(accessToken: string): Promise<string | null> {
    try {
        const res = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return null;
        const data = await res.json();
        const accountName: string | undefined = data.accounts?.[0]?.name;
        if (!accountName) return null;
        return accountName.replace('accounts/', '');
    } catch {
        return null;
    }
}

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const oauthError = searchParams.get('error');
    const baseUrl = getAppBaseUrl();
    const redirectBase = `${baseUrl}/google-business`;

    if (oauthError) {
        return NextResponse.redirect(`${redirectBase}?error=${encodeURIComponent(oauthError)}`);
    }
    if (!code) {
        return NextResponse.redirect(`${redirectBase}?error=no_code`);
    }

    try {
        const tokens = await GoogleOAuthManager.exchangeCodeForTokens(code);
        if (tokens.access_token) {
            const googleAccountId = await fetchGoogleAccountId(tokens.access_token);
            const apiUrl = getApiBaseUrl();
            const authToken = req.cookies.get('auth_token')?.value;
            await fetch(`${apiUrl}/agency-google-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
                body: JSON.stringify({
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token ?? null,
                    googleAccountId: googleAccountId ?? null,
                    expiresAt: tokens.expiry_date
                        ? new Date(tokens.expiry_date).toISOString()
                        : new Date(Date.now() + 3600 * 1000).toISOString(),
                }),
            });
        }
        return NextResponse.redirect(`${redirectBase}?success=connected`);
    } catch (err) {
        console.error('Error in Google OAuth callback:', err);
        return NextResponse.redirect(`${redirectBase}?error=callback_failed`);
    }
}
