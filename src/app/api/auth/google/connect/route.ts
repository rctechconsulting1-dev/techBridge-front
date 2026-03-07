import { NextRequest, NextResponse } from 'next/server';
import { GoogleOAuthManager } from '@/lib/google-oauth';

export async function POST(_req: NextRequest) {
    try {
        const loginHint = process.env.GOOGLE_LOGIN_HINT || 'rctechconsulting1@gmail.com';
        const authUrl = GoogleOAuthManager.generateAuthUrl('agency', loginHint);
        return NextResponse.json({ authUrl });
    } catch (error) {
        console.error('Error generating Google OAuth URL:', error);
        return NextResponse.json({ error: 'Failed to generate OAuth URL' }, { status: 500 });
    }
}
