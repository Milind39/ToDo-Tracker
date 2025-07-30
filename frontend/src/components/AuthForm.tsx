"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Props = {
  type: "login" | "register";
  isAdminLogin?: boolean;
};

export default function AuthForm({ type, isAdminLogin = false }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const waitForProfile = async (userId: string, retries = 10, delay = 500) => {
    for (let i = 0; i < retries; i++) {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (data) return true;
      await new Promise((r) => setTimeout(r, delay));
    }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // 🚫 Prevent registration on admin login
    if (isAdminLogin && type === "register") {
      setError("Registration not allowed on admin login.");
      setLoading(false);
      return;
    }

    let result;

    if (type === "login") {
      result = await supabase.auth.signInWithPassword({ email, password });
    } else {
      result = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
    }

    const { error: authError, data } = result;
    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    const user = data?.user;
    if (!user) {
      setError("User not returned after authentication.");
      return;
    }

    if (type === "register") {
      const profileReady = await waitForProfile(user.id);
      if (!profileReady) {
        setError("Profile not created in time. Please try logging in again.");
        return;
      }
    }

    // ✅ Redirect after login
    // ✅ Check if profile exists and fetch role
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profileData) {
      setError("Failed to fetch user profile.");
      return;
    }

    const role = profileData.role;

    if (role === "admin" && !isAdminLogin) {
      setError("Admin users must log in via the /admin page.");
      await supabase.auth.signOut(); // optional, prevent token reuse
      return;
    }

    if (role !== "admin" && isAdminLogin) {
      setError("You are not authorized to access the admin panel.");
      await supabase.auth.signOut();
      return;
    }

    // ✅ Passed all checks — redirect appropriately
    router.push(role === "admin" ? "/admin-dashboard" : "/");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-100 px-4">
      <div className="flex flex-col md:flex-row bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Left Panel */}
        <div className="md:w-1/2 bg-blue-600 text-white flex flex-col justify-center p-8">
          <h1 className="text-3xl font-bold mb-4">
            {isAdminLogin ? "Admin Login" : "Welcome to ToDo-Track"}
          </h1>

          <p className="text-lg">
            {isAdminLogin
              ? "Please login with your admin account."
              : "Organize your tasks, track app usage, and boost productivity."}
          </p>

          {isAdminLogin ? (
            <>
              <p className="mt-2 text-sm text-blue-100">
                Access the admin dashboard to monitor user tasks, manage
                productivity, and oversee time tracking performance.
              </p>
              <p className="mt-2 text-sm text-blue-100">
                Only authorized admin accounts are allowed beyond this point.
                Ensure your credentials are valid.
              </p>
              <p className="mt-2 text-sm text-blue-100 italic">
                Need help? Contact the system administrator.
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-blue-100">
              {type === "login"
                ? "Please login to continue managing your tasks."
                : "Register now to get started on your productivity journey!"}
            </p>
          )}
        </div>

        {/* Right Panel */}
        <form
          onSubmit={handleSubmit}
          className="md:w-1/2 w-full p-8 bg-white flex flex-col justify-center"
        >
          <h2 className="text-2xl font-bold mb-6 text-gray-800 capitalize">
            {isAdminLogin
              ? "Admin Login"
              : type === "login"
              ? "Login to your account"
              : "Create an account"}
          </h2>

          {!isAdminLogin && type === "register" && (
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-3 border mb-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border mb-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border mb-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded text-white font-semibold ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading
              ? type === "login"
                ? "Logging in..."
                : "Registering..."
              : type === "login"
              ? "Login"
              : "Register"}
          </button>

          {!isAdminLogin && (
            <p className="text-sm text-center mt-4">
              {type === "login" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <a href="/register" className="text-blue-600 hover:underline">
                    Create one
                  </a>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <a href="/login" className="text-blue-600 hover:underline">
                    Login instead
                  </a>
                </>
              )}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
