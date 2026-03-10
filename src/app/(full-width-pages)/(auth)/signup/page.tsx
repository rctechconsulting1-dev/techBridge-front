import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up | RC Tech Bridge",
  description: "Create your RC Tech Bridge account.",
};

export default function SignUp() {
  return <SignUpForm />;
}
