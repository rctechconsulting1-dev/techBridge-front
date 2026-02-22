"use client";

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

function AuthCallbackHandlerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/admin';

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const user = await apiClient.getSession();
        
        if (!user) {
          console.log('No session found in callback');
          router.push('/signin');
          return;
        }

        console.log('Session found in callback:', user);
        
        // Redirect to destination
        router.push(next);
      } catch (error) {
        console.error('Callback handler error:', error);
        router.push('/signin?error=callback_error');
      }
    };

    handleAuthCallback();
  }, [router, next]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing sign-in...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackHandler() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackHandlerContent />
    </Suspense>
  );
}
