"use client";

import AuthForm from "@/components/AuthForm";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
      <AuthForm type="login" />
      <Link href="/register" className="text-sm text-blue-600 hover:underline">
        or Create a new Account!
      </Link>
    </div>
  );
}
