"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import Link from "next/link";
import { Eye, EyeOff, Sparkles, CheckCircle2, ShieldCheck, UserCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, isConfigured } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        if (!displayName.trim()) {
          throw new Error("Please enter your name.");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters long.");
        }
        await signUpWithEmail(email, password, displayName);
        setSuccess("Account created successfully! Redirecting...");
      } else {
        await signInWithEmail(email, password);
        setSuccess("Signed in successfully! Redirecting...");
      }
      setTimeout(() => {
        router.push("/");
      }, 500);
    } catch (err: any) {
      let msg = err?.message || "Authentication failed. Please verify your credentials.";
      if (msg.includes("auth/email-already-in-use")) {
        msg = "An account with this email already exists. Please sign in instead.";
      } else if (msg.includes("auth/weak-password")) {
        msg = "Password is too weak. Please use at least 6 characters.";
      } else if (msg.includes("auth/invalid-credential") || msg.includes("auth/user-not-found") || msg.includes("auth/wrong-password")) {
        msg = "Invalid email or password. Please verify your credentials.";
      } else if (msg.includes("auth/operation-not-allowed")) {
        msg = "Email/Password sign-in is not yet enabled in your Firebase Console. Please go to Firebase Console > Authentication > Sign-in method and enable 'Email/Password'.";
      } else if (msg.includes("auth/network-request-failed")) {
        msg = "Network error. Please check your internet connection.";
      } else if (msg.includes("auth/too-many-requests")) {
        msg = "Access temporarily blocked due to many failed attempts. Please try again later or reset password.";
      }
      setError(msg);
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithEmail("demo@daymark.app", "demopassword123");
      setSuccess("Welcome to Daymark! Redirecting...");
      setTimeout(() => {
        router.push("/");
      }, 400);
    } catch (err: any) {
      setError(err?.message || "Failed to start demo session.");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      router.push("/");
    } catch (err: any) {
      let msg = err?.message || "Google sign-in failed.";
      if (msg.includes("auth/popup-closed-by-user")) {
        msg = "Sign-in popup was closed before completing.";
      } else if (msg.includes("auth/operation-not-allowed")) {
        msg = "Google sign-in is not yet enabled in your Firebase Console. Please enable 'Google' under Authentication > Sign-in method.";
      }
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xl shadow-blue-500/5 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-3 shadow-md shadow-blue-600/20">
            <div className="w-4 h-4 rounded-sm bg-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Daymark</h1>
          <p className="text-xs text-slate-500">
            {mode === "signup"
              ? "Create your personal productivity workspace"
              : "Welcome back! Sign in to continue"}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === "signin"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === "signup"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Feedback Banners */}
        {error && (
          <FeedbackBanner
            type="error"
            title="Authentication Error"
            message={error}
            onDismiss={() => setError(null)}
          />
        )}

        {success && (
          <FeedbackBanner
            type="success"
            title="Success"
            message={success}
          />
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <Input
                label="Full Name"
                placeholder="e.g. Alex Rivera"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          )}

          <div>
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              hint={mode === "signup" ? "Must be at least 6 characters" : undefined}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600 focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold mt-2"
            loading={loading}
          >
            {mode === "signup" ? (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Create Free Account</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                <span>Sign In</span>
              </span>
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center text-xs">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <span className="relative bg-white px-3 text-slate-400">or</span>
        </div>

        {/* Quick Demo Button */}
        <div className="space-y-2.5">
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="w-full border-blue-200 text-blue-700 hover:bg-blue-50/50"
            onClick={handleDemoSignIn}
            disabled={loading}
          >
            <Sparkles className="w-4 h-4 mr-2 text-blue-600" />
            <span>Instant Demo Session</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="md"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </Button>
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Private, encrypted, and secure</span>
        </div>
      </div>
    </div>
  );
}
