"use client";

import AuthForm from "@/components/AuthForm";

export default function AdminLoginPage() {
  return <AuthForm type="login" isAdminLogin={true} />;
}
