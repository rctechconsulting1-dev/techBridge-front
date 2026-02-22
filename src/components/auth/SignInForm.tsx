"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { useRouter, useSearchParams } from "next/navigation";

export default function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextDest = searchParams.get('next') || '/admin';
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    // Check for existing session on component mount
    const checkSession = async () => {
      const user = await apiClient.getSession();
      if (user) {
        // If already authenticated, go straight to destination
        router.push(nextDest);
      }
    };

    checkSession();
  }, [router, nextDest]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      await apiClient.signIn(email, password);
      router.push(nextDest);
    } catch (err) {
      const error = err as { message?: string };
      setError(error?.message || "Sign in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);

    try {
      // Redirect to backend Google OAuth endpoint
      const redirectUrl = `${window.location.origin}/auth/callback`;
      window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google?redirect_uri=${encodeURIComponent(redirectUrl)}&next=${encodeURIComponent(nextDest)}`;
    } catch (err) {
      const error = err as { message?: string };
      setError(error?.message || "Google sign-in failed. Please try again.");
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="w-full max-w-md sm:pt-10 mx-auto mb-5">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-[#CD7F32] dark:text-gray-400 dark:hover:text-[#CD7F32]"
        >
          <ChevronLeftIcon />
          Back to dashboard
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            {/* Brand Logo */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <span className="text-3xl font-bold text-[#CD7F32]">R</span>
                  <div className="w-8 h-0.5 bg-[#C41E3A] rounded-full"></div>
                  <span className="text-3xl font-bold text-[#CD7F32]">C</span>
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-[#CD7F32] font-bold text-base tracking-wide">TECH</span>
                  <span className="text-[#C41E3A] font-bold text-base tracking-wide -mt-1">BRIDGE</span>
                </div>
              </div>
            </div>
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md text-center">
              Admin Sign In
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Enter your credentials to access the admin dashboard
            </p>
          </div>
          <div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5">
              <button
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="inline-flex items-center justify-center gap-3 py-3 text-sm font-normal text-gray-700 transition-colors bg-gray-100 rounded-lg px-7 hover:bg-[#CD7F32]/10 hover:text-[#CD7F32] hover:border-[#CD7F32]/20 border border-transparent dark:bg-white/5 dark:text-white/90 dark:hover:bg-[#CD7F32]/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGoogleLoading ? (
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M18.7511 10.1944C18.7511 9.47495 18.6915 8.94995 18.5626 8.40552H10.1797V11.6527H15.1003C15.0011 12.4597 14.4654 13.675 13.2749 14.4916L13.2582 14.6003L15.9087 16.6126L16.0924 16.6305C17.7788 15.1041 18.7511 12.8583 18.7511 10.1944Z"
                      fill="#4285F4"
                    />
                    <path
                      d="M10.1788 18.75C12.5895 18.75 14.6133 17.9722 16.0915 16.6305L13.274 14.4916C12.5201 15.0068 11.5081 15.3666 10.1788 15.3666C7.81773 15.3666 5.81379 13.8402 5.09944 11.7305L4.99473 11.7392L2.23868 13.8295L2.20264 13.9277C3.67087 16.786 6.68674 18.75 10.1788 18.75Z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.10014 11.7305C4.91165 11.186 4.80257 10.6027 4.80257 9.99992C4.80257 9.3971 4.91165 8.81379 5.09022 8.26935L5.08523 8.1534L2.29464 6.02954L2.20333 6.0721C1.5982 7.25823 1.25098 8.5902 1.25098 9.99992C1.25098 11.4096 1.5982 12.7415 2.20333 13.9277L5.10014 11.7305Z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M10.1789 4.63331C11.8554 4.63331 12.9864 5.34303 13.6312 5.93612L16.1511 3.525C14.6035 2.11528 12.5895 1.25 10.1789 1.25C6.68676 1.25 3.67088 3.21387 2.20264 6.07218L5.08953 8.26943C5.81381 6.15972 7.81776 4.63331 10.1789 4.63331Z"
                      fill="#EB4335"
                    />
                  </svg>
                )}
                {isGoogleLoading ? "Signing in..." : "Sign in with Google"}
              </button>
              <button className="inline-flex items-center justify-center gap-3 py-3 text-sm font-normal text-gray-700 transition-colors bg-gray-100 rounded-lg px-7 hover:bg-[#CD7F32]/10 hover:text-[#CD7F32] hover:border-[#CD7F32]/20 border border-transparent dark:bg-white/5 dark:text-white/90 dark:hover:bg-[#CD7F32]/10">
                <svg
                  width="21"
                  className="fill-current"
                  height="20"
                  viewBox="0 0 21 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M15.6705 1.875H18.4272L12.4047 8.75833L19.4897 18.125H13.9422L9.59717 12.4442L4.62554 18.125H1.86721L8.30887 10.7625L1.51221 1.875H7.20054L11.128 7.0675L15.6705 1.875ZM14.703 16.475H16.2305L6.37054 3.43833H4.73137L14.703 16.475Z" />
                </svg>
                Sign in with X
              </button>
            </div>
            <div className="relative py-3 sm:py-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="p-2 text-gray-400 bg-white dark:bg-gray-900 sm:px-5 sm:py-2">
                  Or
                </span>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-4 p-3 text-sm text-[#C41E3A] bg-[#C41E3A]/5 border border-[#C41E3A]/20 rounded-lg dark:bg-[#C41E3A]/10 dark:border-[#C41E3A]/30">
                  {error}
                </div>
              )}
              <div className="space-y-6">
                <div>
                  <Label>
                    Email <span className="text-[#C41E3A]">*</span>{" "}
                  </Label>
                  <Input placeholder="info@gmail.com" type="email" name="email" autoComplete="email" />
                </div>
                <div>
                  <Label>
                    Password <span className="text-[#C41E3A]">*</span>{" "}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      name="password"
                      autoComplete="current-password"
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={isChecked} onChange={setIsChecked} />
                    <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                      Keep me logged in
                    </span>
                  </div>
                  <Link
                    href="/reset-password"
                    className="text-sm text-[#CD7F32] hover:text-[#8B4513] transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div>
                  <Button 
                    className="w-full bg-[#CD7F32] hover:bg-[#8B4513] disabled:bg-[#CD7F32]/50 border-0 shadow-sm" 
                    size="sm" 
                    type="submit" 
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign in"}
                  </Button>
                </div>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                Don&apos;t have an account? {""}
                <Link
                  href="/signup"
                  className="text-[#CD7F32] hover:text-[#8B4513] transition-colors font-medium"
                >
                  Sign Up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
