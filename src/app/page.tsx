"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { TaskRow } from "@/components/tasks/TaskRow";
import { TaskForm } from "@/components/tasks/TaskForm";
import { CarryForwardDialog } from "@/components/tasks/CarryForwardDialog";
import { ProgressSummary } from "@/components/tasks/ProgressSummary";
import { CategoryPill } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { TaskRowSkeleton } from "@/components/ui/LoadingSkeleton";
import { useAuth } from "@/lib/auth/AuthContext";
import { TaskItem, Category, TaskTemplate } from "@/types";
import { getLocalDateString, formatDisplayDate, getPreviousLocalDateString } from "@/lib/dates";
import {
  getTasksForDate,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskStatus,
  cancelTask,
  updateTaskTargetProgress,
} from "@/lib/tasks/taskService";
import { getCategories, createCategory } from "@/lib/categories/categoryService";
import { getTemplates, generateDailyInstances } from "@/lib/habits/habitService";
import {
  getCarryForwardDecision,
  getEligiblePendingTasks,
  processCarryForwardDecision,
} from "@/lib/tasks/carryForwardService";
import {
  Plus,
  CheckCircle,
  Flame,
  ArrowRight,
  Sparkles,
  Calendar,
  ShieldCheck,
  Zap,
  FolderPlus,
  LogIn,
} from "lucide-react";
import Link from "next/link";
import { LandingPage } from "@/components/landing/LandingPage";
import { PushNotificationBanner } from "@/components/notifications/PushNotificationBanner";

export default function HomePage() {
  const { user, profile, loading: authLoading } = useAuth();
  const timeZone = profile?.timeZone || "Asia/Kolkata";
  const uid = user?.uid || "";

  const [todayStr, setTodayStr] = useState<string>("");
  const [yesterdayStr, setYesterdayStr] = useState<string>("");
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // Modals state
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [carryForwardOpen, setCarryForwardOpen] = useState(false);
  const [eligibleCfTasks, setEligibleCfTasks] = useState<TaskItem[]>([]);
  const [greetingTime, setGreetingTime] = useState<string>("Welcome");

  const userName =
    profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "";
  const userInitials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "DM";

  const loadData = async (targetToday: string, targetYesterday: string) => {
    if (!targetToday) return;
    setLoading(true);
    try {
      // 1. Run idempotent daily instance generation for today
      await generateDailyInstances(uid, targetToday, timeZone);

      // 2. Fetch categories & templates
      const [cats, tpls] = await Promise.all([
        getCategories(uid),
        getTemplates(uid),
      ]);
      setCategories(cats);
      setTemplates(tpls);

      // 3. Fetch today's tasks
      const todayTasks = await getTasksForDate(uid, targetToday);
      setTasks(todayTasks);

      // 4. Check Carry-Forward eligibility
      const decision = await getCarryForwardDecision(uid, targetToday);
      if (!decision) {
        const eligible = await getEligiblePendingTasks(uid, targetYesterday, targetToday);
        if (eligible.length > 0) {
          setEligibleCfTasks(eligible);
          setCarryForwardOpen(true);
        }
      }
    } catch (err) {
      console.error("Error loading home dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const hour = new Date().getHours();
    setGreetingTime(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
    const today = getLocalDateString(timeZone);
    const yesterday = getPreviousLocalDateString(timeZone, today);
    setTodayStr(today);
    setYesterdayStr(yesterday);
    if (user && uid) {
      loadData(today, yesterday);
    } else {
      setLoading(false);
    }
  }, [user, uid, timeZone]);

  const handleToggleTask = async (task: TaskItem) => {
    await toggleTaskStatus(uid, task.id, task.status);
    const updated = await getTasksForDate(uid, todayStr);
    setTasks(updated);
  };

  const handleCancelTask = async (taskId: string) => {
    await cancelTask(uid, taskId);
    const updated = await getTasksForDate(uid, todayStr);
    setTasks(updated);
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(uid, taskId);
    const updated = await getTasksForDate(uid, todayStr);
    setTasks(updated);
    const eligible = await getEligiblePendingTasks(uid, yesterdayStr, todayStr);
    setEligibleCfTasks(eligible);
  };

  const handleCreateOrUpdateTask = async (taskData: {
    title: string;
    description?: string;
    date: string;
    priority: "low" | "medium" | "high";
    categoryId?: string;
    dueTime?: string;
    target?: { value: number; unit: string; progress: number };
    subtasks?: { id: string; title: string; isCompleted: boolean }[];
  }) => {
    if (editingTask) {
      await updateTask(uid, editingTask.id, {
        ...taskData,
        updatedAt: Date.now(),
      });
    } else {
      await createTask(uid, {
        ...taskData,
        timeZone,
        status: "todo",
        origin: "manual",
      });
    }
    const updated = await getTasksForDate(uid, todayStr);
    setTasks(updated);
    setTaskFormOpen(false);
    setEditingTask(null);
  };

  const handleQuickAddTemplate = async (templateTitle: string, priority: "low" | "medium" | "high") => {
    if (!todayStr) return;
    await createTask(uid, {
      title: templateTitle,
      date: todayStr,
      timeZone,
      status: "todo",
      priority,
      origin: "manual",
    });
    const updated = await getTasksForDate(uid, todayStr);
    setTasks(updated);
  };

  const handleCarryForwardDecision = async (
    decision: "accepted" | "declined",
    selectedTaskIds: string[]
  ) => {
    await processCarryForwardDecision({
      uid,
      sourceDate: yesterdayStr,
      destinationDate: todayStr,
      timeZone,
      decision,
      selectedTaskIds,
    });
    const updated = await getTasksForDate(uid, todayStr);
    setTasks(updated);
  };

  const filteredTasks = tasks.filter((t) => {
    if (selectedCategorySlug === "all") return true;
    return t.categoryId === selectedCategorySlug;
  });

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const eligibleTasks = tasks.filter((t) => t.status !== "cancelled");
  const activeHabitsCount = templates.filter((t) => t.isActive).length;

  const highPriorityCount = tasks.filter((t) => t.priority === "high" && t.status === "todo").length;
  const mediumPriorityCount = tasks.filter((t) => t.priority === "medium" && t.status === "todo").length;

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

  // Unauthenticated visitors see the platform landing page
  if (!user) {
    return <LandingPage />;
  }

  return (
    <AppShell
      categories={categories}
      activeCategorySlug={selectedCategorySlug}
      onSelectCategory={(slug) => setSelectedCategorySlug(slug)}
      onAddCategory={() => {
        const name = prompt("Enter category name:");
        if (name?.trim()) {
          createCategory(uid, {
            name: name.trim(),
            slug: name.trim().toLowerCase().replace(/\s+/g, "-"),
            kind: "custom",
            sortOrder: categories.length,
            isArchived: false,
          }).then(() => loadData(todayStr, yesterdayStr));
        }
      }}
    >
      {/* 1. Personalized User Hero Banner */}
      {/* 1. Personalized User Hero Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 mb-6 shadow-sm shadow-blue-500/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
            {/* Avatar */}
            {profile?.photoURL || (user as any)?.photoURL ? (
              <img
                src={profile?.photoURL || (user as any)?.photoURL}
                alt={userName || "User"}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-cover border-2 border-blue-500 shadow-xs shrink-0"
              />
            ) : (
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-blue-600 text-white font-bold text-sm sm:text-base flex items-center justify-center shrink-0 shadow-md shadow-blue-600/20">
                {userInitials}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                  {user ? `${greetingTime}, ${userName || "User"}!` : "Welcome to Daymark!"}
                </h1>
                {user ? (
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                    <ShieldCheck className="w-3 h-3 text-blue-600" />
                    <span>Personal</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                    <span>Guest</span>
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{todayStr ? formatDisplayDate(todayStr) : "Loading today's schedule..."}</span>
                {user?.email && <span className="text-slate-400 hidden xs:inline">• {user.email}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 w-full sm:w-auto">
            {!user && (
              <Link href="/login" className="flex-1 sm:flex-initial">
                <Button
                  variant="secondary"
                  size="md"
                  className="w-full sm:w-auto border-blue-200 text-blue-700 hover:bg-blue-50/50 justify-center"
                >
                  <LogIn className="w-4 h-4 mr-1.5" />
                  <span>Sign In</span>
                </Button>
              </Link>
            )}

            <Button
              variant="primary"
              size="md"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold justify-center"
              onClick={() => {
                setEditingTask(null);
                setTaskFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              <span>Add Task</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Push Notification Banner */}
      <PushNotificationBanner />

      {/* 2. Top Summary Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Daily Completion Progress */}
        <div className="lg:col-span-2">
          <ProgressSummary completed={completedCount} total={eligibleTasks.length} />
        </div>

        {/* Priority & Habits Insights */}
        <div className="p-4 sm:p-5 rounded-xl border border-slate-200/90 bg-white shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Daily Focus
              </span>
              <Flame className="w-4 h-4 text-blue-600" />
            </div>

            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">High Priority Todo:</span>
                <span className="font-semibold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 text-[11px]">
                  {highPriorityCount}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Medium Priority Todo:</span>
                <span className="font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[11px]">
                  {mediumPriorityCount}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Active Habits:</span>
                <span className="font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[11px]">
                  {activeHabitsCount}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/habits"
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline mt-4 pt-3 border-t border-slate-100"
          >
            <span>Configure Habit Routines</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 3. Category Filter Tabs */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
        <div className="flex items-center gap-2 shrink-0">
          <CategoryPill
            name="All Tasks"
            active={selectedCategorySlug === "all"}
            onClick={() => setSelectedCategorySlug("all")}
          />
          {categories.map((c) => (
            <CategoryPill
              key={c.id || c.slug}
              name={c.name}
              accent={c.accentKey || "neutral"}
              active={selectedCategorySlug === (c.id || c.slug)}
              onClick={() => setSelectedCategorySlug(c.id || c.slug)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            const name = prompt("Enter new category name:");
            if (name?.trim()) {
              createCategory(uid, {
                name: name.trim(),
                slug: name.trim().toLowerCase().replace(/\s+/g, "-"),
                kind: "custom",
                sortOrder: categories.length,
                isArchived: false,
              }).then(() => loadData(todayStr, yesterdayStr));
            }
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>New Category</span>
        </button>
      </div>

      {/* 4. Task List Section */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            <TaskRowSkeleton />
            <TaskRowSkeleton />
            <TaskRowSkeleton />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">No tasks for today yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Your schedule is clean. Create a custom task or start your day with a recommended focus item below.
              </p>
            </div>

            {/* Quick Starter Templates */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleQuickAddTemplate("Plan top 3 daily priorities", "high")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 text-slate-700 transition-colors"
              >
                <Zap className="w-3 h-3 text-amber-500" />
                <span>+ Plan top 3 priorities</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickAddTemplate("45-min Deep work focus sprint", "medium")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 text-slate-700 transition-colors"
              >
                <Zap className="w-3 h-3 text-blue-500" />
                <span>+ 45-min Deep work block</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickAddTemplate("Review daily progress & wrap up", "low")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 text-slate-700 transition-colors"
              >
                <Zap className="w-3 h-3 text-emerald-500" />
                <span>+ Evening review</span>
              </button>
            </div>

            <div>
              <Button
                variant="primary"
                size="md"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold mt-2"
                onClick={() => {
                  setEditingTask(null);
                  setTaskFormOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                <span>Create Custom Task</span>
              </Button>
            </div>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const cat = categories.find(
              (c) => c.id === task.categoryId || c.slug === task.categoryId
            );
            return (
              <TaskRow
                key={task.id}
                task={task}
                category={cat}
                onToggleStatus={handleToggleTask}
                onCancelTask={handleCancelTask}
                onDeleteTask={handleDeleteTask}
                onEditTask={(t) => {
                  setEditingTask(t);
                  setTaskFormOpen(true);
                }}
                onUpdateTargetProgress={(taskId, progress) => {
                  updateTaskTargetProgress(uid, taskId, progress).then(() =>
                    loadData(todayStr, yesterdayStr)
                  );
                }}
              />
            );
          })
        )}
      </div>

      {/* Task Form Modal */}
      {todayStr && (
        <TaskForm
          open={taskFormOpen}
          onClose={() => {
            setTaskFormOpen(false);
            setEditingTask(null);
          }}
          onSubmit={handleCreateOrUpdateTask}
          initialTask={editingTask}
          defaultDate={todayStr}
          categories={categories}
        />
      )}

      {/* Carry Forward Prompt */}
      {todayStr && (
        <CarryForwardDialog
          open={carryForwardOpen}
          onClose={() => setCarryForwardOpen(false)}
          sourceDate={yesterdayStr}
          destinationDate={todayStr}
          eligibleTasks={eligibleCfTasks}
          onDecide={handleCarryForwardDecision}
          onDeleteTask={async (taskId) => {
            await deleteTask(uid, taskId);
            const eligible = await getEligiblePendingTasks(uid, yesterdayStr, todayStr);
            setEligibleCfTasks(eligible);
            if (eligible.length === 0) {
              setCarryForwardOpen(false);
            }
          }}
        />
      )}
    </AppShell>
  );
}
