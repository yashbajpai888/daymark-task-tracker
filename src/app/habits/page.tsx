"use client";



import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { HabitRow } from "@/components/habits/HabitRow";
import { HabitTemplateForm } from "@/components/habits/HabitTemplateForm";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth/AuthContext";
import { TaskTemplate, Category } from "@/types";
import { getLocalDateString } from "@/lib/dates";
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  generateDailyInstances,
} from "@/lib/habits/habitService";
import { getCategories } from "@/lib/categories/categoryService";
import { Plus, Flame, RefreshCw, Sparkles } from "lucide-react";

export default function HabitsPage() {
  const { user, profile } = useAuth();
  const timeZone = profile?.timeZone || "Asia/Kolkata";
  const uid = user?.uid || "local_user";

  const [todayStr, setTodayStr] = useState<string>("");
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genFeedback, setGenFeedback] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tpls, cats] = await Promise.all([
        getTemplates(uid),
        getCategories(uid),
      ]);
      setTemplates(tpls);
      setCategories(cats);
    } catch (err) {
      console.error("Error loading habits:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const today = getLocalDateString(timeZone);
    setTodayStr(today);
    loadData();
  }, [uid, timeZone]);

  const handleToggleActive = async (template: TaskTemplate) => {
    try {
      await updateTemplate(uid, template.id, { isActive: !template.isActive });
      setTemplates((prev) =>
        prev.map((t) => (t.id === template.id ? { ...t, isActive: !t.isActive } : t))
      );
    } catch (err) {
      console.error("Error toggling habit template active status:", err);
    }
  };

  const handleDelete = async (templateId: string) => {
    try {
      await deleteTemplate(uid, templateId);
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    } catch (err) {
      console.error("Error deleting habit template:", err);
    }
  };

  const handleSaveTemplate = async (
    data: Omit<TaskTemplate, "id" | "createdAt" | "updatedAt">
  ) => {
    if (editingTemplate) {
      await updateTemplate(uid, editingTemplate.id, data);
    } else {
      await createTemplate(uid, data);
    }
    await loadData();
    setEditingTemplate(null);
  };

  const handleTriggerGeneration = async () => {
    try {
      setGenerating(true);
      const res = await generateDailyInstances(uid, todayStr, timeZone);
      setGenFeedback(
        res.createdCount > 0
          ? `Generated ${res.createdCount} new task instance(s) for today.`
          : "All active habit instances are already up to date for today."
      );
      setTimeout(() => setGenFeedback(null), 4000);
    } catch (err) {
      console.error("Error triggering instance generation:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleAddStarterHabit = async (preset: {
    title: string;
    type: "daily" | "selected-weekdays";
    target?: { value: number; unit: string };
  }) => {
    const habitCat = categories.find((c) => c.slug === "habits") || categories[0];
    await createTemplate(uid, {
      title: preset.title,
      categoryId: habitCat?.id || habitCat?.slug || "habits",
      priority: "medium",
      recurrence: {
        type: preset.type,
        weekdays: preset.type === "selected-weekdays" ? [1, 2, 3, 4, 5] : undefined,
        startDate: todayStr,
        timeZone,
      },
      target: preset.target,
      isHabit: true,
      isActive: true,
    });
    await loadData();
  };

  const activeTemplates = templates.filter((t) => t.isActive);
  const pausedTemplates = templates.filter((t) => !t.isActive);

  return (
    <AppShell categories={categories}>
      <PageHeader
        title="Recurring Habits"
        subtitle="Build consistency with automated daily schedules and measurable targets."
        actions={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="secondary"
              size="md"
              loading={generating}
              onClick={handleTriggerGeneration}
              title="Ensure all scheduled habit instances exist for today"
              className="flex-1 sm:flex-initial text-xs sm:text-sm justify-center"
            >
              <RefreshCw className="w-4 h-4 mr-1.5 shrink-0" />
              <span className="hidden sm:inline">Generate for Today</span>
              <span className="sm:hidden">Sync Today</span>
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setEditingTemplate(null);
                setFormOpen(true);
              }}
              className="flex-1 sm:flex-initial text-xs sm:text-sm justify-center"
            >
              <Plus className="w-4 h-4 mr-1 shrink-0" />
              <span>New Habit</span>
            </Button>
          </div>
        }
      />

      {genFeedback && (
        <div className="mb-4 p-3 rounded-lg border border-accent/30 bg-accent/10 text-accent text-xs font-medium">
          {genFeedback}
        </div>
      )}

      {/* Quick Starter Suggestions if no habits exist */}
      {templates.length === 0 && !loading && (
        <div className="mb-6 p-5 rounded-xl border border-border bg-surface-elevated/40">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">
              Quick Suggestions (Optional)
            </span>
          </div>
          <p className="text-xs text-text-secondary mb-4">
            Click to add recommended habit templates with preconfigured recurrence:
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                handleAddStarterHabit({
                  title: "Hydration (Water Intake)",
                  type: "daily",
                  target: { value: 8, unit: "glasses" },
                })
              }
            >
              + 8 Glasses Water (Daily)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                handleAddStarterHabit({
                  title: "Workout / Gym",
                  type: "selected-weekdays",
                })
              }
            >
              + Gym Session (Mon–Fri)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                handleAddStarterHabit({
                  title: "Reading (20 mins)",
                  type: "daily",
                  target: { value: 20, unit: "pages" },
                })
              }
            >
              + Read 20 Pages (Daily)
            </Button>
          </div>
        </div>
      )}

      {/* Active Habits Section */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Active Habits ({activeTemplates.length})
          </span>
        </div>

        {activeTemplates.length === 0 ? (
          <EmptyState
            icon={<Flame className="w-8 h-8 text-accent/60" />}
            title="No active habits"
            description="Create recurring habits that automatically generate daily tasks on your schedule."
            actionLabel="Create Habit"
            onAction={() => {
              setEditingTemplate(null);
              setFormOpen(true);
            }}
          />
        ) : (
          <div className="space-y-2.5">
            {activeTemplates.map((tpl) => {
              const cat = categories.find((c) => c.id === tpl.categoryId || c.slug === tpl.categoryId);
              return (
                <HabitRow
                  key={tpl.id}
                  template={tpl}
                  category={cat}
                  onToggleActive={handleToggleActive}
                  onEdit={(t) => {
                    setEditingTemplate(t);
                    setFormOpen(true);
                  }}
                  onDelete={handleDelete}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Paused Habits Section */}
      {pausedTemplates.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Paused Habits ({pausedTemplates.length})
            </span>
          </div>

          <div className="space-y-2.5">
            {pausedTemplates.map((tpl) => {
              const cat = categories.find((c) => c.id === tpl.categoryId || c.slug === tpl.categoryId);
              return (
                <HabitRow
                  key={tpl.id}
                  template={tpl}
                  category={cat}
                  onToggleActive={handleToggleActive}
                  onEdit={(t) => {
                    setEditingTemplate(t);
                    setFormOpen(true);
                  }}
                  onDelete={handleDelete}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Habit Template Modal */}
      {todayStr && (
        <HabitTemplateForm
          open={formOpen}
          onClose={() => {
            setFormOpen(false);
            setEditingTemplate(null);
          }}
          onSubmit={handleSaveTemplate}
          initialTemplate={editingTemplate}
          categories={categories}
          defaultDate={todayStr}
        />
      )}
    </AppShell>
  );
}
