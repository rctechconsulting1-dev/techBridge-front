import { NextRequest, NextResponse } from 'next/server';
import { GoogleOAuthManager } from '@/lib/google-oauth';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const tenantId = body.tenantId ?? null;
        // Encode tenantId in state so the callback can pass x-tenant-id to the backend
        const state = Buffer.from(JSON.stringify({ purpose: 'agency', tenantId })).toString('base64');
        const authUrl = GoogleOAuthManager.generateAuthUrl(state);
        return NextResponse.json({ authUrl });
    } catch (error) {
        console.error('Error generating Google OAuth URL:', error);
        return NextResponse.json({ error: 'Failed to generate OAuth URL' }, { status: 500 });
    }
}
