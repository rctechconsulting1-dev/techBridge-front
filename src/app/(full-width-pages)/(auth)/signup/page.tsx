import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up | RD TechBridge",
  description: "Create your RD TechBridge account.",
};

export default function SignUp() {
  return <SignUpForm />;
}
