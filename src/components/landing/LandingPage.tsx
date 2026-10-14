"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Calendar,
  Shield,
  Flame,
  Zap,
  BarChart3,
  Clock,
  Lock,
  Check,
  Layers,
  ChevronRight,
  TrendingUp,
  Target,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export const LandingPage: React.FC = () => {
  // Demo interactive state on the landing preview
  const [demoTasks, setDemoTasks] = useState([
    { id: 1, title: "Plan top 3 critical priorities for today", done: true, priority: "high", time: "09:00 AM" },
    { id: 2, title: "45-minute deep focus sprint: Client deliverable", done: true, priority: "high", time: "10:30 AM" },
    { id: 3, title: "Daily mindfulness & 20 min reading session", done: false, priority: "medium", time: "02:00 PM" },
    { id: 4, title: "Review tomorrow's carry-forward decisions", done: false, priority: "low", time: "05:30 PM" },
  ]);

  const toggleDemoTask = (id: number) => {
    setDemoTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const completedCount = demoTasks.filter((t) => t.done).length;
  const progressPercent = Math.round((completedCount / demoTasks.length) * 100);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-700 flex flex-col">
      {/* 1. Header / Navbar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/20 group-hover:scale-105 transition-transform">
              <div className="w-3.5 h-3.5 rounded-sm bg-white" />
            </div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">
              Daymark
            </span>
          </Link>

          {/* Navigation links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">
              Features
            </a>
            <a href="#workflow" className="hover:text-blue-600 transition-colors">
              How It Works
            </a>
            <a href="#habits" className="hover:text-blue-600 transition-colors">
              Habits & Routines
            </a>
            <a href="#security" className="hover:text-blue-600 transition-colors">
              Privacy & Security
            </a>
          </nav>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-semibold text-slate-700 hover:text-blue-600 px-3 py-2 transition-colors"
            >
              Sign In
            </Link>
            <Link href="/login">
              <Button
                variant="primary"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm rounded-lg px-4"
              >
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-16 sm:pt-24 pb-16 px-4 sm:px-6 max-w-6xl mx-auto w-full text-center">
        {/* Glow ambient background effect */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[300px] bg-blue-400/10 blur-[100px] -z-10 rounded-full pointer-events-none" />

        {/* Hero Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold mb-6 shadow-xs animate-fade-in">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
          <span>The Calm, High-Performance Productivity Workspace</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-[1.12]">
          Master your daily focus.{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            Build lasting habits.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-5 text-base sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Daymark replaces messy, overwhelming to-do lists with a structured day-by-day system. Organize daily work sprints, automate recurring habits, and protect your focus.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Link href="/login" className="w-full sm:w-auto">
            <Button
              variant="primary"
              size="lg"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-7 h-12 shadow-md shadow-blue-600/20 text-base rounded-xl"
            >
              <span>Create Your Free Account</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>

          <Link href="/login" className="w-full sm:w-auto">
            <Button
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto bg-white text-slate-800 hover:bg-slate-50 border-slate-200 font-semibold px-6 h-12 rounded-xl"
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
          </Link>
        </div>

        <p className="mt-3.5 text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-blue-600" />
          <span>Sign in required to create and manage personal tasks. Zero credit card needed.</span>
        </p>

        {/* 3. Interactive Live Workspace Preview */}
        <div className="mt-14 max-w-4xl mx-auto text-left">
          <div className="relative rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-7 shadow-2xl shadow-blue-600/10 overflow-hidden">
            {/* Top Bar of Mock App */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                  DM
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900">Today&apos;s Focus</h3>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      Live Preview
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click any task checkbox below to experience the Daymark feel
                  </p>
                </div>
              </div>

              {/* Progress pill */}
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2">
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Progress
                  </div>
                  <div className="text-xs font-bold text-slate-800">
                    {completedCount} of {demoTasks.length} Completed
                  </div>
                </div>
                <div className="text-lg font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                  {progressPercent}%
                </div>
              </div>
            </div>

            {/* Interactive Tasks Preview List */}
            <div className="mt-5 space-y-2.5">
              {demoTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleDemoTask(task.id)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                    task.done
                      ? "bg-slate-50/70 border-slate-200 text-slate-400 opacity-80"
                      : "bg-white border-slate-200/90 text-slate-800 hover:border-blue-300 hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                        task.done
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {task.done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <span
                      className={`text-sm font-medium truncate ${
                        task.done ? "line-through text-slate-400" : "text-slate-800"
                      }`}
                    >
                      {task.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded border ${
                        task.priority === "high"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : task.priority === "medium"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
                      {task.priority}
                    </span>
                    <span className="text-xs text-slate-400 hidden sm:inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {task.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Overlay Footer inside preview */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Want to save and schedule your real tasks?</span>
              </span>
              <Link
                href="/login"
                className="font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
              >
                <span>Sign in to unlock full workspace</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. "What is Daymark?" Section (The Platform Story) */}
      <section id="features" className="py-20 bg-white border-y border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              Why Daymark?
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-3">
              Built specifically to end to-do list fatigue
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-3">
              Most productivity apps fail because they become endless dumps of guilt. Daymark is designed around daily clarity, intentional focus, and clean habit execution.
            </p>
          </div>

          {/* 4 Feature Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pillar 1 */}
            <div className="p-6 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:shadow-lg hover:shadow-blue-500/5 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Daily Focus Only</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                See only what matters today. Eliminate the stress of 100-item backlogs and focus on getting your primary agenda done.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:shadow-lg hover:shadow-blue-500/5 transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                <Flame className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Automated Habits</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                Create habit templates that schedule themselves every morning, on weekdays, or custom intervals. Never rebuild your routine.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:shadow-lg hover:shadow-blue-500/5 transition-all">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4">
                <Zap className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Smart Carry-Forward</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                Didn&apos;t finish a task yesterday? A gentle morning prompt lets you carry it over or archive it with zero emotional baggage.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="p-6 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:shadow-lg hover:shadow-blue-500/5 transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Clear Trend Reports</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                Visual completion trendlines and rate donuts give you honest historical insights into your genuine output.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. "How It Works" 3-Step Section */}
      <section id="workflow" className="py-20 max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div className="text-center max-w-xl mx-auto mb-16">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            Simple 3-Step Flow
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-3">
            How your day transforms with Daymark
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs relative">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center mb-4">
              1
            </div>
            <h4 className="text-lg font-bold text-slate-900">Sign in securely</h4>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              Authenticate via Google or Email to unlock your private, isolated database in Cloud Firestore.
            </p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs relative">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center mb-4">
              2
            </div>
            <h4 className="text-lg font-bold text-slate-900">Set today&apos;s targets</h4>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              Add your high and medium priorities. Habits and routine items appear automatically each morning.
            </p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs relative">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center mb-4">
              3
            </div>
            <h4 className="text-lg font-bold text-slate-900">Execute & Track</h4>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              Mark tasks off smoothly. Watch completion rates rise and carry over any remaining items without stress.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Security and Privacy Callout */}
      <section id="security" className="py-16 bg-blue-50/60 border-y border-blue-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-md shadow-blue-600/20">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Private, Authenticated Cloud Storage
          </h2>
          <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Every user&apos;s workspace is strictly isolated through Firebase Authentication and security rules. Your tasks, habits, and progress reports can only be viewed and updated by you.
          </p>
        </div>
      </section>

      {/* 7. Final Action Callout Banner */}
      <section className="py-20 px-4 sm:px-6 max-w-5xl mx-auto w-full">
        <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-8 sm:p-14 text-center shadow-xl shadow-blue-600/20 space-y-6">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight max-w-2xl mx-auto leading-tight">
            Ready to experience effortless daily productivity?
          </h2>
          <p className="text-blue-100 text-sm sm:text-base max-w-lg mx-auto">
            Create your account now and start scheduling your priorities in the clean White & Blue workspace.
          </p>
          <div className="pt-2">
            <Link href="/login">
              <Button
                variant="secondary"
                size="lg"
                className="bg-white text-blue-700 hover:bg-blue-50 font-bold px-8 h-12 rounded-xl text-base shadow-lg"
              >
                <span>Get Started — It&apos;s Free</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              D
            </div>
            <span className="font-bold text-slate-800">Daymark</span>
            <span>— Personal Productivity Tracker</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-blue-600 transition-colors">
              Sign In
            </Link>
            <Link href="/login" className="hover:text-blue-600 transition-colors">
              Create Account
            </Link>
            <span>&copy; 2026 Daymark. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
