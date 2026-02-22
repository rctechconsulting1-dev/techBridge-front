"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { ChevronLeftIcon } from "@/icons";
import Link from "next/link";
import { useState } from "react";
import { apiClient } from "@/lib/api-client";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await apiClient.resetPassword(email);
      setSuccess(true);
      setEmail("");
    } catch (err) {
      const apiError = err as { message?: string };
      setError(apiError?.message || "Failed to send reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="w-full max-w-md sm:pt-10 mx-auto mb-5">
        <Link
          href="/signin"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-[#CD7F32] dark:text-gray-400 dark:hover:text-[#CD7F32]"
        >
          <ChevronLeftIcon />
          Back to Sign In
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-md dark:text-white/90">
              Reset Your Password
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          {success ? (
            <div className="p-4 mb-6 rounded-lg bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Check your email for a password reset link. It may take a few minutes to arrive.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-4 p-3 text-sm text-[#C41E3A] bg-[#C41E3A]/5 border border-[#C41E3A]/20 rounded-lg dark:bg-[#C41E3A]/10 dark:border-[#C41E3A]/30">
                  {error}
                </div>
              )}

              <div className="mb-6">
                <Label>
                  Email Address <span className="text-[#C41E3A]">*</span>
                </Label>
                <Input
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || !email}
                className="w-full bg-[#CD7F32] hover:bg-[#8B4513] disabled:bg-[#CD7F32]/50 border-0 shadow-sm"
                size="sm"
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          )}

          <div className="mt-8">
            <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400">
              Remember your password?{" "}
              <Link
                href="/signin"
                className="text-[#CD7F32] hover:text-[#8B4513] transition-colors font-medium"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
