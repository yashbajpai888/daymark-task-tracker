"use client";



import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { CompletionDonut } from "@/components/reports/CompletionDonut";
import { TrendChart, TrendDataPoint } from "@/components/reports/TrendChart";
import { useAuth } from "@/lib/auth/AuthContext";
import { TaskItem, Category } from "@/types";
import {
  getLocalDateString,
  parseLocalDateString,
  formatShortDate,
} from "@/lib/dates";
import { getTasksForRange } from "@/lib/tasks/taskService";
import { getCategories } from "@/lib/categories/categoryService";
import { subDays, format } from "date-fns";
import { Info } from "lucide-react";

export default function ReportsPage() {
  const { user, profile } = useAuth();
  const timeZone = profile?.timeZone || "Asia/Kolkata";
  const uid = user?.uid || "local_user";

  const [todayStr, setTodayStr] = useState<string>("");
  const [rangeDays, setRangeDays] = useState<7 | 14 | 30>(7);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReportData(currentDay: string) {
      if (!currentDay) return;
      setLoading(true);
      try {
        const todayDate = parseLocalDateString(currentDay);
        const startDateStr = format(subDays(todayDate, rangeDays - 1), "yyyy-MM-dd");

        const [rangeTasks, cats] = await Promise.all([
          getTasksForRange(uid, startDateStr, currentDay),
          getCategories(uid),
        ]);

        setTasks(rangeTasks);
        setCategories(cats);
      } catch (err) {
        console.error("Error loading reports data:", err);
      } finally {
        setLoading(false);
      }
    }

    const today = getLocalDateString(timeZone);
    setTodayStr(today);
    loadReportData(today);
  }, [uid, rangeDays, timeZone]);

  // Aggregate Metrics
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const todoCount = tasks.filter((t) => t.status === "todo").length;
  const cancelledCount = tasks.filter((t) => t.status === "cancelled").length;
  const eligibleTotal = completedCount + todoCount;
  const overallRate = eligibleTotal > 0 ? Math.round((completedCount / eligibleTotal) * 100) : null;

  // Build daily trend points
  const trendData: TrendDataPoint[] = [];
  if (todayStr) {
    const todayDate = parseLocalDateString(todayStr);
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = subDays(todayDate, i);
      const dateStr = format(d, "yyyy-MM-dd");
      const dayTasks = tasks.filter((t) => t.date === dateStr);

      const dayCompleted = dayTasks.filter((t) => t.status === "completed").length;
      const dayTodo = dayTasks.filter((t) => t.status === "todo").length;
      const dayEligible = dayCompleted + dayTodo;
      const dayRate = dayEligible > 0 ? Math.round((dayCompleted / dayEligible) * 100) : null;

      trendData.push({
        date: dateStr,
        label: formatShortDate(dateStr),
        rate: dayRate,
        completed: dayCompleted,
        total: dayEligible,
      });
    }
  }

  // Aggregate Category Breakdown
  const categoryStats = categories.map((cat) => {
    const catTasks = tasks.filter(
      (t) => t.categoryId === cat.id || t.categoryId === cat.slug
    );
    const catCompleted = catTasks.filter((t) => t.status === "completed").length;
    const catTodo = catTasks.filter((t) => t.status === "todo").length;
    const catEligible = catCompleted + catTodo;
    const catRate = catEligible > 0 ? Math.round((catCompleted / catEligible) * 100) : null;

    return {
      id: cat.id || cat.slug,
      name: cat.name,
      total: catEligible,
      completed: catCompleted,
      rate: catRate,
    };
  });

  return (
    <AppShell categories={categories}>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Historical completion trends and category consistency."
        actions={
          <div className="flex items-center gap-1 sm:gap-1.5 bg-surface p-1 rounded-lg border border-border w-full sm:w-auto justify-center">
            {([7, 14, 30] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setRangeDays(days)}
                className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-colors text-center ${
                  rangeDays === days
                    ? "bg-surface-elevated text-accent border border-border font-bold"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Last {days} Days
              </button>
            ))}
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="p-3.5 sm:p-4 rounded-xl border border-border bg-surface">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
            Eligible Tasks
          </span>
          <div className="text-xl sm:text-2xl font-bold text-text-primary mt-1">{eligibleTotal}</div>
          <span className="text-[11px] text-text-secondary mt-1 block">Scheduled work</span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl border border-border bg-surface">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
            Completed
          </span>
          <div className="text-xl sm:text-2xl font-bold text-accent mt-1">{completedCount}</div>
          <span className="text-[11px] text-text-secondary mt-1 block">Finished items</span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl border border-border bg-surface">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
            Completion Rate
          </span>
          <div className="text-xl sm:text-2xl font-bold text-text-primary mt-1">
            {overallRate !== null ? `${overallRate}%` : "—"}
          </div>
          <span className="text-[11px] text-text-secondary mt-1 block truncate">
            {overallRate !== null ? "Average completion" : "No tasks scheduled"}
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl border border-border bg-surface">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
            Cancelled
          </span>
          <div className="text-xl sm:text-2xl font-bold text-danger mt-1">{cancelledCount}</div>
          <span className="text-[11px] text-text-secondary mt-1 block">Excluded from rate</span>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-1 min-w-0">
          <div className="mb-2">
            <h3 className="text-sm font-semibold text-text-primary">Completion Share</h3>
            <p className="text-xs text-text-secondary">Completed vs pending tasks</p>
          </div>
          <CompletionDonut completed={completedCount} todo={todoCount} cancelled={cancelledCount} />
        </div>

        <div className="lg:col-span-2 min-w-0">
          <TrendChart data={trendData} />
        </div>
      </div>

      {/* Category Performance Breakdown */}
      <div className="p-4 sm:p-5 rounded-xl border border-border bg-surface mb-8">
        <h3 className="text-base font-semibold text-text-primary mb-1">
          Category Completion Breakdown
        </h3>
        <p className="text-xs text-text-secondary mb-4">
          Breakdown of recorded tasks by workspace category over the last {rangeDays} days.
        </p>

        <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
          <table className="w-full min-w-[380px] text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border text-xs text-text-secondary">
                <th className="pb-3 font-semibold">Category</th>
                <th className="pb-3 font-semibold text-center">Tasks</th>
                <th className="pb-3 font-semibold text-center">Completed</th>
                <th className="pb-3 font-semibold text-right">Completion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {categoryStats.map((cat) => (
                <tr key={cat.id} className="hover:bg-surface-elevated/30">
                  <td className="py-3 font-medium text-text-primary">{cat.name}</td>
                  <td className="py-3 text-center text-text-secondary">{cat.total}</td>
                  <td className="py-3 text-center text-accent">{cat.completed}</td>
                  <td className="py-3 text-right font-semibold text-text-primary">
                    {cat.rate !== null ? `${cat.rate}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ethical note */}
      <div className="p-4 rounded-xl border border-border bg-surface-elevated/20 flex items-start gap-3 text-xs text-text-secondary">
        <Info className="w-4 h-4 shrink-0 text-info mt-0.5" />
        <p>
          Completion rates measure recorded tasks, not personal worth or productivity quality. Cancelled tasks are excluded from calculations, and days with no scheduled tasks display as “No tasks scheduled” rather than 0%.
        </p>
      </div>
    </AppShell>
  );
}
