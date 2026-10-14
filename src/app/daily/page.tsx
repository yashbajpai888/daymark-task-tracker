"use client";



import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { DateStrip } from "@/components/tasks/DateStrip";
import { TaskRow } from "@/components/tasks/TaskRow";
import { TaskForm } from "@/components/tasks/TaskForm";
import { CarryForwardDialog } from "@/components/tasks/CarryForwardDialog";
import { ProgressSummary } from "@/components/tasks/ProgressSummary";
import { CategoryPill } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { TaskRowSkeleton } from "@/components/ui/LoadingSkeleton";
import { useAuth } from "@/lib/auth/AuthContext";
import { TaskItem, Category } from "@/types";
import { getLocalDateString, getPreviousLocalDateString } from "@/lib/dates";
import {
  getTasksForDate,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskStatus,
  cancelTask,
  updateTaskTargetProgress,
} from "@/lib/tasks/taskService";
import { getCategories } from "@/lib/categories/categoryService";
import {
  getEligiblePendingTasks,
  processCarryForwardDecision,
} from "@/lib/tasks/carryForwardService";
import { Plus, CheckSquare, Sparkles } from "lucide-react";

export default function DailyPage() {
  const { user, profile } = useAuth();
  const timeZone = profile?.timeZone || "Asia/Kolkata";
  const uid = user?.uid || "local_user";

  const [currentDate, setCurrentDate] = useState<string>("");
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);

  // Modal states
  const [taskFormOpen, setTaskFormOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [carryForwardOpen, setCarryForwardOpen] = useState<boolean>(false);
  const [eligibleCfTasks, setEligibleCfTasks] = useState<TaskItem[]>([]);

  const loadData = async (date: string) => {
    if (!date) return;
    setLoading(true);
    try {
      const [cats, dayTasks] = await Promise.all([
        getCategories(uid),
        getTasksForDate(uid, date),
      ]);
      setCategories(cats);
      setTasks(dayTasks);

      // Check eligible pending tasks from previous date
      const prevDate = getPreviousLocalDateString(timeZone, date);
      const eligible = await getEligiblePendingTasks(uid, prevDate, date);
      setEligibleCfTasks(eligible);
    } catch (err) {
      console.error("Error loading daily tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const today = getLocalDateString(timeZone);
    const dateToLoad = currentDate || today;
    if (!currentDate) {
      setCurrentDate(today);
    }
    loadData(dateToLoad);
  }, [uid, currentDate, timeZone]);

  const handleToggleTask = async (task: TaskItem) => {
    try {
      const newStatus = await toggleTaskStatus(uid, task.id, task.status);
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      console.error("Error toggling task:", err);
    }
  };

  const handleCancelTask = async (taskId: string) => {
    try {
      await cancelTask(uid, taskId);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: "cancelled" } : t))
      );
    } catch (err) {
      console.error("Error cancelling task:", err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(uid, taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  const handleCreateOrUpdateTask = async (
    data: Omit<TaskItem, "id" | "createdAt" | "updatedAt">
  ) => {
    if (editingTask) {
      await updateTask(uid, editingTask.id, data);
    } else {
      await createTask(uid, data);
    }
    await loadData(currentDate);
    setEditingTask(null);
  };

  const handleCarryForwardDecision = async (
    decision: "accepted" | "declined",
    selectedTaskIds: string[]
  ) => {
    const prevDate = getPreviousLocalDateString(timeZone, currentDate);
    await processCarryForwardDecision({
      uid,
      sourceDate: prevDate,
      destinationDate: currentDate,
      timeZone,
      decision,
      selectedTaskIds,
    });
    await loadData(currentDate);
  };

  const filteredTasks = tasks.filter((t) => {
    if (selectedCategorySlug === "all") return true;
    return t.categoryId === selectedCategorySlug;
  });

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const eligibleTasks = tasks.filter((t) => t.status !== "cancelled");

  return (
    <AppShell categories={categories}>
      <PageHeader
        title="Daily Tasks"
        subtitle="Review, manage, and complete tasks for any calendar date."
        actions={
          <div className="flex items-center gap-2">
            {eligibleCfTasks.length > 0 && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => setCarryForwardOpen(true)}
              >
                <Sparkles className="w-4 h-4 text-warning" />
                <span className="hidden sm:inline">Carry Forward ({eligibleCfTasks.length})</span>
              </Button>
            )}
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setEditingTask(null);
                setTaskFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              <span>Add Task</span>
            </Button>
          </div>
        }
      />

      {/* Date Navigation Strip */}
      {currentDate && (
        <DateStrip
          currentDate={currentDate}
          onSelectDate={(newDate) => setCurrentDate(newDate)}
          timeZone={timeZone}
        />
      )}

      {/* Progress Summary for Selected Date */}
      <div className="mb-6">
        <ProgressSummary
          completed={completedCount}
          total={eligibleTasks.length}
        />
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
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

      {/* Tasks List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            <TaskRowSkeleton />
            <TaskRowSkeleton />
          </div>
        ) : filteredTasks.length === 0 ? (
          <EmptyState
            icon={<CheckSquare className="w-8 h-8 text-accent/60" />}
            title="No tasks scheduled for this date"
            description="Use the button above to add a task, or carry forward unfinished tasks from yesterday."
            actionLabel="Add Task"
            onAction={() => {
              setEditingTask(null);
              setTaskFormOpen(true);
            }}
          />
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
                    loadData(currentDate)
                  );
                }}
              />
            );
          })
        )}
      </div>

      {/* Task Form Modal */}
      {currentDate && (
        <TaskForm
          open={taskFormOpen}
          onClose={() => {
            setTaskFormOpen(false);
            setEditingTask(null);
          }}
          onSubmit={handleCreateOrUpdateTask}
          initialTask={editingTask}
          defaultDate={currentDate}
          categories={categories}
        />
      )}

      {/* Carry Forward Modal */}
      {currentDate && (
        <CarryForwardDialog
          open={carryForwardOpen}
          onClose={() => setCarryForwardOpen(false)}
          sourceDate={getPreviousLocalDateString(timeZone, currentDate)}
          destinationDate={currentDate}
          eligibleTasks={eligibleCfTasks}
          onDecide={handleCarryForwardDecision}
        />
      )}
    </AppShell>
  );
}
