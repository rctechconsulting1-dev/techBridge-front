import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Admin Sign In | RD Tech Bridge - Admin Dashboard",
  description:
    "Sign in to RD Tech Bridge admin dashboard to manage your business technology solutions",
};

// Using useSearchParams in a client component requires a Suspense boundary
export const dynamic = "force-dynamic";

export default function SignIn() {
  return (
    <Suspense fallback={<div />}>
      <SignInForm />
    </Suspense>
  );
}
