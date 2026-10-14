"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { useAuth } from "@/lib/auth/AuthContext";
import { Category } from "@/types";
import { KeyRound } from "lucide-react";
import Link from "next/link";

interface AppShellProps {
  children: React.ReactNode;
  categories?: Category[];
  onAddCategory?: () => void;
  activeCategorySlug?: string;
  onSelectCategory?: (slug: string) => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  categories = [],
  onAddCategory,
  activeCategorySlug,
  onSelectCategory,
}) => {
  const { user, loading: authLoading, isConfigured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 animate-pulse flex items-center justify-center shadow-md shadow-blue-500/20">
            <div className="w-3.5 h-3.5 rounded-sm bg-white" />
          </div>
          <span className="text-xs text-slate-500 font-semibold tracking-wide uppercase">
            Loading Daymark...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row text-text-primary">
      {/* Desktop Sidebar */}
      <Sidebar
        categories={categories}
        onAddCategory={onAddCategory}
        activeCategorySlug={activeCategorySlug}
        onSelectCategory={onSelectCategory}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* Banner if Firebase is not yet configured in .env.local */}
        {!isConfigured && (
          <div className="bg-blue-50/80 border-b border-blue-200/80 px-4 py-2.5 flex items-center justify-between text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 shrink-0 text-blue-600" />
              <span>
                Private workspace active. You can create an account or sign in to save your personal tasks and habits.
              </span>
            </div>
            <Link
              href="/login"
              className="text-blue-700 underline hover:text-blue-950 font-semibold shrink-0 ml-3"
            >
              Account / Sign In
            </Link>
          </div>
        )}

        <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
};
